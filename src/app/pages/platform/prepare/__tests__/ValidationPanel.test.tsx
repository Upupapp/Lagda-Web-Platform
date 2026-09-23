// Behaviour coverage for the Fields Validation panel — that each issue's
// action button invokes the right editor operation (assign, move, remove,
// save, filter, navigate). The decision maths is unit-tested in
// field-autofix.test.ts; this proves the panel is wired to it.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldDefinition, FieldValidationIssue, FieldPlacementValidation } from "../../../../models/field-editor";

const mockNavigate = vi.fn();
vi.mock("react-router", async (orig) => ({
  ...(await orig<typeof import("react-router")>()),
  useNavigate: () => mockNavigate,
}));

const editor = {
  validation: null as FieldPlacementValidation | null,
  runValidation: vi.fn(),
  setDocument: vi.fn(),
  setPage: vi.fn(),
  selectFields: vi.fn(),
  updateField: vi.fn(),
  moveField: vi.fn(),
  deleteFields: vi.fn(),
  setParticipantFilter: vi.fn(),
  addField: vi.fn((partial: Omit<FieldDefinition, "id" | "layer">) => ({
    ...partial, id: "new_1", layer: 9,
  })),
  currentDocumentId: "d1" as string | null,
  currentPageId: "p1" as string | null,
  fields: [] as FieldDefinition[],
};
vi.mock("../../../../context/FieldEditorContext", () => ({
  useFieldEditor: () => editor,
  FieldEditorProvider: ({ children }: { children: unknown }) => children,
}));

const prepare = { draft: { participants: [{ id: "rcp_1", role: "signer" }] } };
vi.mock("../../../../context/PrepareContext", () => ({
  usePrepare: () => prepare,
}));

// Forced explicitly, not left to the ambient VITE_API_BASE_URL (set only in
// a gitignored local .env, absent in CI) — this test targets the panel's
// real-backend issue list (computeBackendFieldIssues), which only runs
// under USE_REAL_BACKEND. Passed locally by accident, failed in CI.
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));

import { ValidationPanel } from "../FieldsPage";

function field(over: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    id: "bf_1", type: "signature", documentId: "d1", pageId: "p1",
    rect: { x: 0.4, y: 0.4, width: 0.2, height: 0.05 }, participantId: "rcp_1",
    label: "Signature", required: true, layer: 1, demonstrationOnly: false, ...over,
  };
}

function issue(over: Partial<FieldValidationIssue>): FieldValidationIssue {
  return { id: "i", severity: "error", code: "X", message: "m", ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  editor.fields = [field(), field({ id: "local_ml", type: "multiline-text", participantId: null })];
  editor.validation = {
    isValid: false,
    readyToContinue: false,
    errors: [
      issue({ id: "e_un", code: "UNASSIGNED_FIELD", fieldId: "bf_1" }),
      issue({ id: "e_oob", code: "FIELD_OUT_OF_BOUNDS", fieldId: "bf_1" }),
      issue({ id: "e_uk", code: "UNKNOWN_PARTICIPANT", fieldId: "bf_1" }),
      issue({ id: "e_bl", code: "BLOCKING_FIELD_ON_NON_BLOCKING_ROLE", fieldId: "bf_1" }),
      issue({ id: "e_nd", code: "NO_DOCUMENTS" }),
      issue({ id: "e_sig", code: "SIGNER_MISSING_SIGNATURE", participantId: "rcp_1" }),
    ],
    warnings: [
      issue({ id: "w_ov", severity: "warning", code: "FIELD_OVERLAP", fieldId: "bf_1" }),
      issue({ id: "w_edge", severity: "warning", code: "NEAR_PAGE_EDGE", fieldId: "bf_1" }),
    ],
    participantCoverage: [],
    totalFieldCount: 2,
    unassignedCount: 1,
    documentIds: ["d1"],
  };
});

describe("ValidationPanel action wiring", () => {
  it("renders the merged error count including backend issues", () => {
    render(<ValidationPanel onSaveNow={vi.fn().mockResolvedValue(true)} saving={false} />);
    // 6 placement errors + 2 backend issues (unsupported type + unsaved).
    expect(screen.getByText(/8 errors to resolve/i)).toBeInTheDocument();
  });

  it("wires every action button to the right editor operation", async () => {
    const onSaveNow = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(<ValidationPanel onSaveNow={onSaveNow} saving={false} />);

    // Click every button in the panel; each issue's handler should fire.
    for (const btn of screen.getAllByRole("button")) {
      await user.click(btn);
    }

    expect(editor.updateField).toHaveBeenCalled();          // unassigned / unknown / blocking fixes
    expect(editor.moveField).toHaveBeenCalled();            // out-of-bounds / overlap / near-edge
    expect(editor.deleteFields).toHaveBeenCalledWith(["local_ml"]); // remove unsupported
    expect(editor.setParticipantFilter).toHaveBeenCalledWith("rcp_1"); // show-their-fields
    expect(onSaveNow).toHaveBeenCalled();                   // save now
    expect(mockNavigate).toHaveBeenCalledWith("/app/prepare/upload"); // NO_DOCUMENTS
  });

  it("re-runs validation when it is null", () => {
    editor.validation = null;
    render(<ValidationPanel onSaveNow={vi.fn()} saving={false} />);
    expect(editor.runValidation).toHaveBeenCalled();
  });
});

describe("missing-signature auto-fix", () => {
  it("creates a Signature field for that participant, centred on the current page", async () => {
    const user = userEvent.setup();
    render(<ValidationPanel onSaveNow={vi.fn().mockResolvedValue(true)} saving={false} />);

    await user.click(screen.getByRole("button", { name: /auto-fix/i }));

    expect(editor.addField).toHaveBeenCalledTimes(1);
    const created = editor.addField.mock.calls[0]![0];
    expect(created.type).toBe("signature");
    expect(created.participantId).toBe("rcp_1");
    expect(created.documentId).toBe("d1");
    expect(created.pageId).toBe("p1");
    // Centred, whatever the type's default size happens to be.
    expect(created.rect.x + created.rect.width / 2).toBeCloseTo(0.5, 5);
    expect(created.rect.y + created.rect.height / 2).toBeCloseTo(0.5, 5);
    // Created selected, so positioning it is the next thing that happens.
    expect(editor.selectFields).toHaveBeenCalledWith(["new_1"]);
  });

  it("does NOT offer 'Show their fields' when the participant has none", () => {
    // The defect this replaced: it was the only action offered, and it
    // revealed an empty list.
    editor.fields = [field({ id: "local_ml", type: "multiline-text", participantId: null })];
    render(<ValidationPanel onSaveNow={vi.fn().mockResolvedValue(true)} saving={false} />);

    expect(screen.getByRole("button", { name: /auto-fix/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show their fields/i })).not.toBeInTheDocument();
  });
});
