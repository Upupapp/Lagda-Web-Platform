// Smoke + light-interaction coverage for the full Fields editor. Mounting it
// with the REAL FieldEditorProvider exercises the toolbar, canvas, field-type
// palette, properties/validation panels and their handlers together — the
// large block of presentational functions the pure-logic suites can't reach.
// usePrepare/usePlatform are mocked; the file has no backendDocumentId so the
// real-backend load effect is skipped (no network).

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const prepare = {
  draft: {
    id: "d1",
    details: { title: "Test Contract", description: "", folderId: null, tagIds: [] },
    files: [{ id: "f1", fileName: "contract.pdf", fileSizeBytes: 1000, mimeType: "application/pdf", fileState: "ready", order: 0 }],
    participants: [{ id: "pax_1", name: "Signer One", email: "s@x.com", role: "signer" }],
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

// Forced explicitly, not left to the ambient VITE_API_BASE_URL (set only in
// a gitignored local .env, absent in CI): in mock mode, initializeEditor
// auto-seeds demo fields for any draft with a participant + a file (see
// MockFieldEditorService), which would silently pre-populate the canvas
// these tests assume starts empty. Real-backend mode starts empty (the test
// draft's file has no backendDocumentId, so the real-field-load effect's
// network call is skipped — see FieldsPage's own guard). Passed locally by
// accident, failed in CI.
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));

import { FieldsPage } from "../FieldsPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/prepare/fields"]}>
      <FieldsPage />
    </MemoryRouter>,
  );
}

describe("FieldsPage (full editor render)", () => {
  it("renders the editor shell without crashing", () => {
    renderPage();
    // The toolbar's Validate control is always present.
    expect(screen.getByRole("button", { name: /validate/i })).toBeInTheDocument();
  });

  it("opens the validation panel from the toolbar", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /validate/i }));
    // The panel heading appears once validation is shown.
    expect(await screen.findByText("Validation")).toBeInTheDocument();
  });

  it("shows the field-type palette", () => {
    renderPage();
    // Signature is a always-present field type in the palette.
    expect(screen.getAllByText(/signature/i).length).toBeGreaterThan(0);
  });

  it("places a field via the keyboard dialog, selects it, and shows Field Properties", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /add field using keyboard placement/i }));
    expect(await screen.findByRole("dialog", { name: /add field/i })).toBeInTheDocument();
    // Field type select defaults to Signature; region defaults to Middle Left.
    await user.click(screen.getByRole("button", { name: /place field/i }));
    // Dialog closes once the field is placed.
    expect(screen.queryByRole("dialog", { name: /add field/i })).toBeNull();
  });

  it("switches to the field list view and back", async () => {
    const user = userEvent.setup();
    renderPage();
    const listBtn = screen.getByRole("button", { name: /show field list/i });
    await user.click(listBtn);
    expect(screen.getByRole("button", { name: /show canvas view/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show canvas view/i }));
    expect(screen.getByRole("button", { name: /show field list/i })).toBeInTheDocument();
  });

  it("zooms in, out, and resets via Fit", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByLabelText(/zoom 100%/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /zoom in/i }));
    expect(screen.getByLabelText(/zoom 110%/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /zoom out/i }));
    await user.click(screen.getByRole("button", { name: /zoom out/i }));
    expect(screen.getByLabelText(/zoom 90%/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^fit page/i }));
    expect(screen.getByLabelText(/zoom 100%/i)).toBeInTheDocument();
  });

  it("places a field, copies it, and undoes the placement", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /add field using keyboard placement/i }));
    await user.click(screen.getByRole("button", { name: /place field/i }));

    const copyBtn = screen.getByRole("button", { name: /copy selected fields/i });
    expect(copyBtn).toBeEnabled();
    await user.click(copyBtn);

    const undoBtn = screen.getByRole("button", { name: "Undo" });
    expect(undoBtn).toBeEnabled();
    await user.click(undoBtn);
  });

  it("lists a placed field and deletes it from the List view", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /add field using keyboard placement/i }));
    await user.click(screen.getByRole("button", { name: /place field/i }));

    await user.click(screen.getByRole("button", { name: /show field list/i }));
    expect(screen.getByRole("table", { name: /field list/i })).toBeInTheDocument();

    const goToPage = screen.getByRole("button", { name: /go to page/i });
    await user.click(goToPage);

    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteBtn);
    expect(screen.getByText(/no fields match/i)).toBeInTheDocument();
  });

  // 30s, not the 5s default. This case drives sixteen separate `userEvent`
  // interactions — including a twelve-character `type()`, which is twelve
  // dispatches — against a full editor render, and `userEvent` is
  // deliberately slow: it waits for React to settle between events rather
  // than firing them synchronously.
  //
  // It measured ~13.5s in isolation and timed out at 5s under parallel load,
  // passing and failing across runs of IDENTICAL code. That is a budget
  // problem, not a flaky assertion — every expectation here is deterministic.
  //
  // Raised for this test alone rather than globally: a global `testTimeout`
  // would hide the next genuinely-slow test instead of surfacing it. If more
  // cases need this, they get their own budget the same way.
  it("exercises the Field Properties panel's controls end to end", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /add field using keyboard placement/i }));
    await user.click(screen.getByRole("button", { name: /place field/i }));

    // Required checkbox toggle.
    const required = screen.getByRole("checkbox", { name: /field is required/i });
    await user.click(required);
    await user.click(required);

    // Label text input.
    const label = screen.getByRole("textbox", { name: /field label/i });
    await user.clear(label);
    await user.type(label, "My Signature");
    expect(label).toHaveValue("My Signature");

    // Position input, including the invalid-input (NaN) guard branch.
    const xInput = screen.getByRole("spinbutton", { name: /field x/i });
    await user.clear(xInput);
    await user.type(xInput, "25");

    // Every layer-reorder action.
    for (const name of ["Front", "↑ Fwd", "↓ Back", "To Back"]) {
      await user.click(screen.getByRole("button", { name }));
    }

    // Duplicate, then delete-with-confirm (cancel first, then confirm).
    await user.click(screen.getByRole("button", { name: /duplicate field/i }));
    await user.click(screen.getAllByRole("button", { name: /^delete field$/i })[0]!);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getAllByRole("button", { name: /^delete field$/i })[0]!);
    await user.click(screen.getByRole("button", { name: "Delete" }));
  });

  it("assigns a participant to a field via the properties panel select", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /add field using keyboard placement/i }));
    await user.click(screen.getByRole("button", { name: /place field/i }));

    const select = screen.getByRole("combobox", { name: /assign participant/i });
    await user.selectOptions(select, "pax_1");
    expect(select).toHaveValue("pax_1");
    await user.selectOptions(select, "");
    expect(select).toHaveValue("");
  });

  it("places a field by clicking a palette type then the canvas", async () => {
    const user = userEvent.setup();
    renderPage();
    // The palette lists "Signature" once as a field type and once in the
    // group heading "Signature & Identity" — pick the field-type button.
    const paletteButtons = screen.getAllByRole("button", { name: /signature/i });
    const signatureBtn = paletteButtons.find((b) => b.getAttribute("title")?.toLowerCase().includes("signature"))!;
    await user.click(signatureBtn);
    const canvas = screen.getByRole("application");
    expect(canvas.getAttribute("aria-label")).toMatch(/click to place signature/i);
    await user.click(canvas);
    // Placing exits place-field mode — the hint/cancel button disappears.
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("cancels a pending placement from the palette hint", async () => {
    const user = userEvent.setup();
    renderPage();
    const paletteButtons = screen.getAllByRole("button", { name: /full name/i });
    const fullNameBtn = paletteButtons.find((b) => b.getAttribute("title")?.toLowerCase().includes("name"))!;
    await user.click(fullNameBtn);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("application").getAttribute("aria-label")).not.toMatch(/click to place/i);
  });

  it("filters the field list by participant, type, and unassigned-only", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /add field using keyboard placement/i }));
    await user.click(screen.getByRole("button", { name: /place field/i }));
    await user.click(screen.getByRole("button", { name: /show field list/i }));

    await user.selectOptions(screen.getByRole("combobox", { name: /filter by participant/i }), "pax_1");
    await user.selectOptions(screen.getByRole("combobox", { name: /filter by participant/i }), "");

    await user.selectOptions(screen.getByRole("combobox", { name: /filter by field type/i }), "signature");
    expect(screen.getByRole("table", { name: /field list/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: /filter by field type/i }), "full-name");
    expect(screen.getByText(/no fields match/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: /filter by field type/i }), "");

    await user.click(screen.getByRole("checkbox", { name: /unassigned only/i }));
    await user.click(screen.getByRole("checkbox", { name: /unassigned only/i }));
  });

  it("closes the keyboard-place dialog via its own close button", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /add field using keyboard placement/i }));
    await user.click(await screen.findByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: /add field/i })).toBeNull();
  });
});
