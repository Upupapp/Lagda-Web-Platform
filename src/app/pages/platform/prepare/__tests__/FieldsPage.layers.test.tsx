/* eslint-disable testing-library/no-node-access -- stacking and badge geometry are DOM facts; they have no accessible-role equivalent. */
// Place Fields on a phone and on a desktop: the stacking of the canvas under
// the properties sheet, the "?" status badges and their note, and the
// editor's own Help button.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const prepare = {
  draft: {
    id: "d_layers",
    details: { title: "Layers", description: "", folderId: null, tagIds: [] },
    files: [{ id: "f1", fileName: "contract.pdf", fileSizeBytes: 1000, mimeType: "application/pdf", fileState: "ready", order: 0 }],
    participants: [
      { id: "pax_s", name: "Ana Signer", email: "a@x.com", role: "signer" },
      { id: "pax_r", name: "Cara Reviewer", email: "c@x.com", role: "reviewer" },
    ],
    routing: { mode: "sequential", groups: [] },
    auth: { defaultMethod: "none", perParticipant: {} },
    settings: {},
  },
  setStep: vi.fn(),
  setFieldsSnapshot: vi.fn(),
};
vi.mock("../../../../context/PrepareContext", () => ({ usePrepare: () => prepare }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));
// No backendDocumentId on the file: the placeholder page, no network.
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));

import { FieldsPage } from "../FieldsPage";
import { Z } from "../../../../utils/z-index";
import { FieldStatusBadge, fieldBadgeStatus, autoOpenBubbleFor } from "../../../../components/prepare/FieldStatusBadge";
import type { FieldDefinition } from "../../../../models/field-editor";

function setWidth(px: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: px });
}
function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/prepare/fields"]}>
      <FieldsPage />
    </MemoryRouter>,
  );
}
const badgeFor = (fieldId: string) =>
  document.querySelector<HTMLButtonElement>(`[data-field-badge="${fieldId}"]`)!;

const originalWidth = window.innerWidth;
beforeEach(() => {
  window.localStorage.clear();
  // jsdom has neither; the editor uses both on a real device.
  Object.assign(HTMLElement.prototype, { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn(), scrollBy: vi.fn() });
});
afterEach(() => { setWidth(originalWidth); });

describe("the canvas never paints over the properties sheet (phone)", () => {
  it("isolates the canvas below the sheet, with the selected field and its handles inside it", async () => {
    setWidth(390);
    const user = userEvent.setup();
    renderPage();
    // Auto-placement gave the signer a block; select it.
    // Placed on the last page; "Show" goes there.
    await user.click(within(await screen.findByTestId("placement-notice")).getByRole("button", { name: "Show" }));
    const field = document.querySelector<HTMLElement>("[data-field-id]")!;
    await user.pointer({ keys: "[MouseLeft]", target: field });
    await user.click(await screen.findByRole("button", { name: /show properties for the selected field/i }));

    const sheet = await screen.findByRole("dialog", { name: "Field properties" });
    const scroller = screen.getByTestId("fields-canvas-scroller");

    // The canvas is its own stacking context at the ladder's editorCanvas…
    expect(scroller.style.zIndex).toBe(String(Z.editorCanvas));
    expect(scroller.style.position).toBe("relative");
    expect(scroller.getAttribute("style")).toContain("isolation: isolate");
    // …the selected field, its handles and badge all live INSIDE it…
    const selected = scroller.querySelector<HTMLElement>(`[data-field-id="${field.dataset.fieldId!}"]`)!;
    expect(selected).not.toBeNull();
    expect(Number(selected.style.zIndex)).toBeGreaterThan(Z.drawer); // would win if not isolated
    expect(scroller.contains(badgeFor(field.dataset.fieldId!))).toBe(true);
    // …and the sheet is outside it, above it on the ladder.
    expect(scroller.contains(sheet)).toBe(false);
    expect(Number(sheet.style.zIndex)).toBe(Z.drawer);
    expect(Z.drawer).toBeGreaterThan(Z.editorCanvas);
    expect(Z.drawer).toBeGreaterThan(Z.editorControls);

    // The Help button steps aside while the sheet is open.
    expect(screen.queryByRole("button", { name: /open the place fields guide/i })).toBeNull();
  });
});

describe("the question-mark badges", () => {
  it("are green when assigned, red when not, and the red note assigns in place", async () => {
    setWidth(1366);
    const user = userEvent.setup();
    renderPage();
    // Placed on the last page; "Show" goes there.
    await user.click(within(await screen.findByTestId("placement-notice")).getByRole("button", { name: "Show" }));
    const placed = [...document.querySelectorAll<HTMLElement>("[data-field-badge]")];
    expect(placed).toHaveLength(2);
    for (const b of placed) expect(b.dataset.status).toBe("ok");
    // No note opens for green fields.
    expect(document.querySelector("[data-field-bubble]")).toBeNull();

    // An unassigned Signature via the keyboard dialog — it is selected and red.
    await user.click(screen.getByRole("button", { name: /add field using keyboard placement/i }));
    await user.click(screen.getByRole("button", { name: /^place field$/i }));
    const red = [...document.querySelectorAll<HTMLElement>("[data-field-badge]")].find(b => b.dataset.status !== "ok")!;
    expect(red.dataset.status).toBe("unassigned");
    const redId = red.dataset.fieldBadge!;

    // Only ONE note, and it is the selected red field's.
    const bubbles = document.querySelectorAll("[data-field-bubble]");
    expect(bubbles).toHaveLength(1);
    const bubble = bubbles[0] as HTMLElement;
    expect(bubble.dataset.fieldBubble).toBe(redId);
    expect(bubble).toHaveTextContent("Signature — Not assigned yet");
    expect(bubble.style.zIndex).not.toBe("");

    const options = within(bubble).getAllByRole("option");
    expect(options.map(o => o.textContent)).toEqual(["Ana Signersigner", "Cara Reviewerreviewer"]);
    await user.click(options[0]!);
    await waitFor(() => { expect(badgeFor(redId).dataset.status).toBe("ok"); });
    expect(document.querySelector("[data-field-bubble]")).toBeNull();

    // A green note says who and what for.
    await user.click(badgeFor(redId));
    expect(document.querySelector(`[data-field-bubble="${redId}"]`)).toHaveTextContent("Signature for Ana Signer");
  });

  it("sits wholly outside a tiny field, and centred on a normal field's corner", async () => {
    setWidth(1366);
    const user = userEvent.setup();
    renderPage();
    // Placed on the last page; "Show" goes there.
    await user.click(within(await screen.findByTestId("placement-notice")).getByRole("button", { name: "Show" }));
    const b = document.querySelector<HTMLElement>("[data-field-badge]")!;
    expect(b.style.transform).toBe("translate(-50%, -50%)");
    expect(b.style.width).toBe("24px");
  });
});

describe("the editor's own Help", () => {
  it("opens as a side panel on a desktop, closes on Escape and returns focus", async () => {
    setWidth(1366);
    const user = userEvent.setup();
    renderPage();
    const fab = screen.getByRole("button", { name: /open the place fields guide/i });
    await user.click(fab);
    const panel = screen.getByTestId("fields-help-panel");
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(panel.style.top).toBe("0px");
    expect(document.activeElement).toBe(within(panel).getByRole("button", { name: "Close guide" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("fields-help-panel")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /open the place fields guide/i }));
  });

  it("is a bottom sheet on a phone and closes on tap outside", async () => {
    setWidth(390);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /open the place fields guide/i }));
    const panel = screen.getByTestId("fields-help-panel");
    expect(panel.style.bottom).toBe("0px");
    expect(panel.style.left).toBe("0px");
    await user.click(screen.getByTestId("fields-help-scrim"));
    expect(screen.queryByTestId("fields-help-panel")).toBeNull();
  });
});

describe("badge rules", () => {
  const people = [{ id: "s", role: "signer" as const }, { id: "r", role: "reviewer" as const }];
  const f = (id: string, participantId: string | null, type: FieldDefinition["type"] = "signature") =>
    ({ id, type, participantId, staticValue: null });

  it("red for unassigned or an ineligible/removed participant; green otherwise", () => {
    expect(fieldBadgeStatus(f("a", "s"), people)).toBe("ok");
    expect(fieldBadgeStatus(f("a", null), people)).toBe("unassigned");
    expect(fieldBadgeStatus(f("a", "s", "review-block"), people)).toBe("ineligible");
    expect(fieldBadgeStatus(f("a", "gone"), people)).toBe("ineligible");
    expect(fieldBadgeStatus(f("a", null, "sender-text"), people)).toBe("ok");
  });

  it("auto-opens only the selected field if red, else the first red one — one at most", () => {
    const fields = [f("ok1", "s"), f("red1", null), f("red2", null)];
    expect(autoOpenBubbleFor(fields, null, people, new Set())).toBe("red1");
    expect(autoOpenBubbleFor(fields, "red2", people, new Set())).toBe("red2");
    expect(autoOpenBubbleFor(fields, "ok1", people, new Set())).toBeNull();
    expect(autoOpenBubbleFor(fields, null, people, new Set(["red1"]))).toBe("red2");
  });

  it("moves wholly outside a tiny field so it never covers it", () => {
    const props = {
      status: "ok" as const, identity: null, participants: [], open: false,
      onToggle: vi.fn(), onClose: vi.fn(), onAssign: vi.fn(), layoutTick: 0, zBadge: 6, zBubble: 7,
      field: {
        id: "cb", type: "checkbox" as const, documentId: "d", pageId: "p", participantId: null,
        rect: { x: 0.2, y: 0.2, width: 0.04, height: 0.028 }, label: "Checkbox", required: false, layer: 1, demonstrationOnly: true,
      },
    };
    const { rerender } = render(<FieldStatusBadge {...props} fieldPx={{ width: 24, height: 24 }} />);
    expect(badgeFor("cb").style.transform).toBe("translate(-2px, calc(-100% + 2px))");
    rerender(<FieldStatusBadge {...props} fieldPx={{ width: 200, height: 60 }} />);
    expect(badgeFor("cb").style.transform).toBe("translate(-50%, -50%)");
  });
});
