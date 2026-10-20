// Where the notary drops the seal and the signature: every page of the document shown in full, pressed where each should go.

import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../../../components/pdf/DocumentPageSurface", () => ({
  useRealDocument: () => ({ status: "ready", doc: {}, pageCount: 3, pageSizes: [{ width: 595, height: 842 }, { width: 595, height: 842 }, { width: 842, height: 595 }] }),
  DocumentPageSurface: () => <canvas data-testid="page-canvas" />,
}));
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: { document: () => Promise.resolve(new Blob(["%PDF-1.7"])) },
}));

import { SealPlacer, type Placements } from "../SealPlacer";

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 520 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 100, top: 50, width: 500, height: 707, right: 600, bottom: 757, x: 100, y: 50, toJSON: () => ({}) });
});

function Harness({ hasSignature, start = {} }: { hasSignature: boolean; start?: Placements }) {
  const [value, setValue] = useState<Placements>(start);
  return (
    <MemoryRouter>
      <SealPlacer sessionId="ens_1" hasSignature={hasSignature} value={value} onChange={setValue} notaryName="Aiyana Cruz" />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </MemoryRouter>
  );
}

const value = () => JSON.parse(screen.getByTestId("value").textContent ?? "{}") as Placements;

describe("placing the seal and the signature", () => {
  it("shows every page of the document, and puts the seal where a page is pressed, as fractions of that page", async () => {
    const user = userEvent.setup();
    render(<Harness hasSignature />);
    expect(await screen.findAllByTestId("placer-page")).toHaveLength(3);
    expect(screen.getByTestId("status-seal")).toHaveTextContent("The usual place");
    await user.pointer({ target: screen.getByTestId("placer-surface-1"), keys: "[MouseLeft]", coords: { clientX: 350, clientY: 403.5 } });
    expect(value()).toEqual({ seal: { page: 1, x: 0.5, y: 0.5 } });
    expect(screen.getByTestId("marker-seal")).toBeInTheDocument();
    expect(screen.getByTestId("status-seal")).toHaveTextContent("Page 1");
    await user.pointer({ target: screen.getByTestId("placer-surface-1"), keys: "[MouseLeft]", coords: { clientX: 600, clientY: 757 } });
    expect(value()).toEqual({ seal: { page: 1, x: 1, y: 1 } });
  });

  it("places the signature on another page, and keeps the seal where it was", async () => {
    const user = userEvent.setup();
    render(<Harness hasSignature start={{ seal: { page: 1, x: 0.8, y: 0.84 } }} />);
    await screen.findAllByTestId("placer-page");
    await user.click(screen.getByTestId("place-signature"));
    await user.pointer({ target: screen.getByTestId("placer-surface-2"), keys: "[MouseLeft]", coords: { clientX: 200, clientY: 100 } });
    const placed = value();
    expect(placed.seal).toEqual({ page: 1, x: 0.8, y: 0.84 });
    expect(placed.signature?.page).toBe(2);
    expect(placed.signature?.x).toBeCloseTo(0.2, 3);
    expect(placed.signature?.y).toBeCloseTo(0.0707, 3);
    expect(screen.getByTestId("placer-summary")).toHaveTextContent("Seal: page 1. Signature: page 2.");
  });

  it("moves with the arrow keys, removes one, goes back to the usual places, and cannot place a signature that was not saved", async () => {
    const user = userEvent.setup();
    render(<Harness hasSignature={false} start={{ seal: { page: 1, x: 0.5, y: 0.5 } }} />);
    await screen.findAllByTestId("placer-page");
    expect(screen.getByTestId("place-signature")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Add my signature" })).toHaveAttribute("href", "/app/enotary/seal");
    screen.getByTestId("marker-seal").focus();
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(value()).toEqual({ seal: { page: 1, x: 0.52, y: 0.52 } });
    await user.click(screen.getByRole("button", { name: /Remove the seal/ }));
    expect(screen.getByTestId("value")).toHaveTextContent("{}");
    await user.pointer({ target: screen.getByTestId("placer-surface-3"), keys: "[MouseLeft]", coords: { clientX: 300, clientY: 300 } });
    expect(value().seal?.page).toBe(3);
    await user.click(screen.getByRole("button", { name: /Use the usual places/ }));
    expect(screen.getByTestId("value")).toHaveTextContent("{}");
    expect(screen.getByTestId("placer-summary")).toHaveTextContent("Seal: the usual place.");
  });
});
