// Where the notary drops the seal and the signature: a page of the document, pressed where each should go.

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
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 500 });
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
  it("puts the seal where the page is pressed, as fractions of the page, and moves it when pressed again", async () => {
    const user = userEvent.setup();
    render(<Harness hasSignature />);
    expect(await screen.findByTestId("placer-page")).toHaveTextContent("Page 1 of 3");
    await user.pointer({ target: screen.getByTestId("placer-surface"), keys: "[MouseLeft]", coords: { clientX: 350, clientY: 403.5 } });
    expect(value()).toEqual({ seal: { page: 1, x: 0.5, y: 0.5 } });
    expect(screen.getByTestId("marker-seal")).toBeInTheDocument();
    await user.pointer({ target: screen.getByTestId("placer-surface"), keys: "[MouseLeft]", coords: { clientX: 600, clientY: 757 } });
    expect(value()).toEqual({ seal: { page: 1, x: 1, y: 1 } });
  });

  it("places the signature on another page, once a signature is saved, and keeps the seal where it was", async () => {
    const user = userEvent.setup();
    render(<Harness hasSignature start={{ seal: { page: 1, x: 0.8, y: 0.84 } }} />);
    await screen.findByTestId("placer-page");
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByTestId("placer-page")).toHaveTextContent("Page 2 of 3");
    await user.click(screen.getByTestId("place-signature"));
    await user.pointer({ target: screen.getByTestId("placer-surface"), keys: "[MouseLeft]", coords: { clientX: 200, clientY: 100 } });
    const placed = value();
    expect(placed.seal).toEqual({ page: 1, x: 0.8, y: 0.84 });
    expect(placed.signature?.page).toBe(2);
    expect(placed.signature?.x).toBeCloseTo(0.2, 3);
    expect(placed.signature?.y).toBeCloseTo(0.0707, 3);
    expect(screen.getByTestId("placer-summary")).toHaveTextContent("Seal: page 1. Signature: page 2.");
  });

  it("moves with the arrow keys, goes back to the usual place, and cannot place a signature that was not saved", async () => {
    const user = userEvent.setup();
    render(<Harness hasSignature={false} start={{ seal: { page: 1, x: 0.5, y: 0.5 } }} />);
    await screen.findByTestId("placer-page");
    expect(screen.getByTestId("place-signature")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Add my signature" })).toHaveAttribute("href", "/app/enotary/seal");
    screen.getByTestId("placer-surface").focus();
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(value()).toEqual({ seal: { page: 1, x: 0.52, y: 0.52 } });
    await user.click(screen.getByRole("button", { name: /Use the usual place/ }));
    expect(screen.getByTestId("value")).toHaveTextContent("{}");
    expect(screen.getByTestId("placer-summary")).toHaveTextContent("Seal: the usual place.");
  });
});
