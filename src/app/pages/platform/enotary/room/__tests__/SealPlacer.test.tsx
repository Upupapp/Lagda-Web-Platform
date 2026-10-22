// Where the notary puts the notarial block (127): one block with their seal and signature, every page of the document
// shown in full, pressed where it should go, drawn at the size it will be printed; or a page of its own at the end.

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
import type { BlockFacts } from "../NotarialBlockPreview";
import { blockBox, defaultBlockPoint } from "../notarial-block";

const FACTS: BlockFacts = {
  notaryName: "Aiyana Yasmin A. Cruz", firm: "Del Rosario & Del Rosario", commissionLine: "Commission No. 2026-0147 · until 31 Dec 2027 · Roll No. 58214",
  actLabel: "ACKNOWLEDGMENT", dateLabel: "22 OCT 2026", sealName: "Aiyana Yasmin A. Cruz", signature: null,
};

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 520 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 100, top: 50, width: 500, height: 707, right: 600, bottom: 757, x: 100, y: 50, toJSON: () => ({}) });
});

function Harness({ hasSignature = true, start = {} }: { hasSignature?: boolean; start?: Placements }) {
  const [value, setValue] = useState<Placements>(start);
  return (
    <MemoryRouter>
      <SealPlacer sessionId="ens_1" hasSignature={hasSignature} value={value} onChange={setValue} facts={FACTS} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </MemoryRouter>
  );
}

const value = () => JSON.parse(screen.getByTestId("value").textContent ?? "{}") as Placements;
const widthOf = (element: HTMLElement) => Number.parseFloat(element.style.width);

describe("placing the notarial block", () => {
  it("shows every page, the block across the foot of the last page until placed, and puts it where a page is pressed", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(await screen.findAllByTestId("placer-page")).toHaveLength(3);
    expect(screen.getByTestId("status-block")).toHaveTextContent("Across the foot of the last page");
    expect(screen.getByTestId("marker-block-usual")).toHaveTextContent("Default place");
    await user.pointer({ target: screen.getByTestId("placer-surface-1"), keys: "[MouseLeft]", coords: { clientX: 350, clientY: 403.5 } });
    expect(value()).toEqual({ block: { page: 1, x: 0.5, y: 0.5 } });
    expect(screen.getByTestId("marker-block")).toBeInTheDocument();
    expect(screen.queryByTestId("marker-block-usual")).toBeNull();
    expect(screen.getByTestId("status-block")).toHaveTextContent("Page 1, in the middle");
    await user.pointer({ target: screen.getByTestId("placer-surface-1"), keys: "[MouseLeft]", coords: { clientX: 600, clientY: 757 } });
    expect(value()).toEqual({ block: { page: 1, x: 1, y: 1 } });
    expect(screen.getByTestId("status-block")).toHaveTextContent("Page 1, at the foot");
  });

  it("draws the block at its printed size, 523 points across between the margins, on any page", async () => {
    render(<Harness start={{ block: { page: 3, x: 0.5, y: 0.5 } }} />);
    await screen.findAllByTestId("placer-page");
    // The landscape third page is 842 points shown 500 pixels wide: the block keeps its 523 points.
    expect(widthOf(screen.getByTestId("block-preview"))).toBeCloseTo(523.3 * (500 / 842), 0);
    expect(screen.getByTestId("block-preview")).toHaveTextContent("Atty. Aiyana Yasmin A. Cruz");
    expect(screen.getByTestId("block-preview")).toHaveTextContent("Notarized through LAGDA eNotary");
    expect(screen.getByTestId("block-preview")).toHaveTextContent("ACKNOWLEDGMENT · 22 OCT 2026");
    expect(screen.getByTestId("block-preview")).toHaveTextContent("DR");
    // The same measures as the server's: kept inside the margins and clear of the footer.
    expect(blockBox({ x: 1, y: 1 }, 595.28, 841.89)).toMatchObject({ left: expect.closeTo(36.26, 1) as number, width: expect.closeTo(523.28, 1) as number });
    expect(defaultBlockPoint(595.28, 841.89).y).toBeCloseTo((841.89 - 52 - (127 * 595.28 / 794) / 2) / 841.89, 5);
  });

  it("moves with the arrow keys, goes back to the default place with Delete or the button", async () => {
    const user = userEvent.setup();
    render(<Harness start={{ block: { page: 1, x: 0.5, y: 0.5 } }} />);
    await screen.findAllByTestId("placer-page");
    screen.getByTestId("marker-block").focus();
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(value()).toEqual({ block: { page: 1, x: 0.52, y: 0.52 } });
    await user.keyboard("{Delete}");
    expect(screen.getByTestId("value")).toHaveTextContent("{}");
    await user.pointer({ target: screen.getByTestId("placer-surface-2"), keys: "[MouseLeft]", coords: { clientX: 300, clientY: 300 } });
    expect(value().block?.page).toBe(2);
    await user.click(screen.getByTestId("block-default"));
    expect(screen.getByTestId("value")).toHaveTextContent("{}");
    expect(screen.getByTestId("block-default")).toBeDisabled();
  });

  it("puts the block on a page of its own at the end, keeping its place for when the option is turned off", async () => {
    const user = userEvent.setup();
    render(<Harness start={{ block: { page: 2, x: 0.5, y: 0.7 } }} />);
    await screen.findAllByTestId("placer-page");
    await user.click(screen.getByTestId("block-own-page"));
    expect(value()).toEqual({ block: { page: 2, x: 0.5, y: 0.7 }, blockOwnPage: true });
    expect(screen.getByTestId("status-block")).toHaveTextContent("On a page of its own at the end");
    expect(screen.getByTestId("placer-added-caption")).toHaveTextContent("Page 4, added: the notarial block");
    expect(screen.getByTestId("added-block")).toBeInTheDocument();
    expect(screen.queryByTestId("marker-block")).toBeNull();
    // The client's pages take no block while it has a page of its own.
    await user.pointer({ target: screen.getByTestId("placer-surface-1"), keys: "[MouseLeft]", coords: { clientX: 350, clientY: 403.5 } });
    expect(value()).toEqual({ block: { page: 2, x: 0.5, y: 0.7 }, blockOwnPage: true });
    await user.click(screen.getByTestId("block-own-page"));
    expect(value()).toEqual({ block: { page: 2, x: 0.5, y: 0.7 } });
    expect(screen.queryByTestId("placer-added-page")).toBeNull();
  });

  it("starts a session saved before the block from its seal's page and height, and drops the seal's place once moved", async () => {
    const user = userEvent.setup();
    render(<Harness hasSignature={false} start={{ seal: { page: 2, x: 0.8, y: 0.84 }, signature: { page: 2, x: 0.3, y: 0.86 } }} />);
    await screen.findAllByTestId("placer-page");
    expect(screen.getByTestId("status-block")).toHaveTextContent("Page 2, at the foot");
    expect(screen.getByRole("link", { name: "Add my signature" })).toHaveAttribute("href", "/app/enotary/seal");
    screen.getByTestId("marker-block").focus();
    await user.keyboard("{ArrowUp}");
    expect(value()).toEqual({ block: { page: 2, x: 0.5, y: 0.82 } });
  });
});
