// "Reviewed over Name" (review-block) and "Approved over Name"
// (approval-block): the model, the backend mapping, validation, and the
// recipient's read-only rendering. Plus the stale-session fix in the mock
// editor service that rebuilt nothing when a draft's file changed.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../backend-flag", () => ({ USE_REAL_BACKEND: true }));
const page = {
  getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }),
  render: () => ({ promise: Promise.resolve(), cancel: () => undefined }),
};
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(page), destroy: () => Promise.resolve() }),
  }),
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "worker.js" }));

import { isBackendFieldType, placeableFieldTypeGroups, toBackendFieldInput, fromBackendField } from "../field-sync";
import { preferredAssignee } from "../field-autofix";
import {
  FIELD_ELIGIBLE_ROLES, FIELD_SIZE_CONSTRAINTS, FIELD_TYPE_GROUPS, FIELD_TYPE_LABELS,
  FIELD_TYPE_DESCRIPTIONS, FIELD_TYPE_ICONS, FIELD_PLAN_TIER, fieldRequiredPolicy, isServerStampedType,
  type FieldDefinition,
} from "../../../models/field-editor";
import { fieldEditorService } from "../../mock/field-editor.service";
import {
  DEFAULT_ROUTING_CONFIG, DEFAULT_AUTH_CONFIG, DEFAULT_PREP_SETTINGS, DEFAULT_TRANSACTION_DETAILS,
  type PreparationDraft,
} from "../../../models/prepare";
import { PositionedSigningSurface } from "../../../components/recipient/PositionedSigningSurface";
import type { CeremonyField } from "../../real/signing-access.service";

describe("the two new field types in the editor model", () => {
  it("are labelled, described, sized like a signature block and placed beside it", () => {
    expect(FIELD_TYPE_LABELS["review-block"]).toBe("Reviewed over Name");
    expect(FIELD_TYPE_LABELS["approval-block"]).toBe("Approved over Name");
    expect(FIELD_TYPE_DESCRIPTIONS["review-block"])
      .toBe("Stamped 'Reviewed' with the date when the reviewer completes, with their name printed beneath");
    expect(FIELD_TYPE_DESCRIPTIONS["approval-block"])
      .toBe("Stamped 'Approved' (or 'Skipped') with the date, name beneath");
    expect(FIELD_TYPE_ICONS["review-block"]).toBeTruthy();
    expect(FIELD_TYPE_ICONS["approval-block"]).toBeTruthy();
    expect(FIELD_PLAN_TIER["review-block"]).toBe("all");
    expect(FIELD_SIZE_CONSTRAINTS["review-block"]).toEqual(FIELD_SIZE_CONSTRAINTS["signature-block"]);
    expect(FIELD_SIZE_CONSTRAINTS["approval-block"]).toEqual(FIELD_SIZE_CONSTRAINTS["signature-block"]);
    const identity = FIELD_TYPE_GROUPS.find(g => g.label === "Signature & Identity")!;
    const at = identity.types.indexOf("signature-block");
    expect(identity.types.slice(at, at + 3)).toEqual(["signature-block", "review-block", "approval-block"]);
  });

  it("are for exactly one role each, with fixed required-ness", () => {
    expect(FIELD_ELIGIBLE_ROLES["review-block"]).toEqual(["reviewer"]);
    expect(FIELD_ELIGIBLE_ROLES["approval-block"]).toEqual(["approver"]);
    expect(fieldRequiredPolicy("review-block")).toBe("always");
    expect(fieldRequiredPolicy("approval-block")).toBe("never");
    expect(fieldRequiredPolicy("signature-block")).toBe("choice");
    expect(isServerStampedType("review-block")).toBe(true);
    expect(isServerStampedType("approval-block")).toBe(true);
    expect(isServerStampedType("signature-block")).toBe(false);
  });

  it("auto-assign to the only reviewer / approver", () => {
    const people = [
      { id: "s", role: "signer" as const }, { id: "r", role: "reviewer" as const }, { id: "a", role: "approver" as const },
    ];
    expect(preferredAssignee("review-block", people)).toBe("r");
    expect(preferredAssignee("approval-block", people)).toBe("a");
  });
});

describe("the real-backend mapping", () => {
  it("offers and persists both ids exactly as the backend names them", () => {
    expect(isBackendFieldType("review-block")).toBe(true);
    expect(isBackendFieldType("approval-block")).toBe(true);
    const identity = placeableFieldTypeGroups(FIELD_TYPE_GROUPS, true).find(g => g.label === "Signature & Identity");
    expect(identity?.types).toEqual(expect.arrayContaining(["review-block", "approval-block"]));
  });

  it("round-trips through the preparation wire format", () => {
    const f: FieldDefinition = {
      id: "bf_42", type: "review-block", documentId: "d", pageId: "p2",
      rect: { x: 0.1, y: 0.8, width: 0.336, height: 0.095 }, participantId: "rcp_r",
      label: "Reviewed over Name", required: true, layer: 3, demonstrationOnly: false,
    };
    const input = toBackendFieldInput(f, () => 2)!;
    expect(input).toMatchObject({ fieldId: "42", type: "review-block", pageNumber: 2, recipientId: "rcp_r", required: true });
    const back = fromBackendField(
      { fieldId: "42", type: "approval-block", pageNumber: 2, rect: f.rect, required: false,
        label: "Approved over Name", layer: 3, recipientId: "rcp_a", staticValue: null },
      "d", () => "p2",
    )!;
    expect(back.type).toBe("approval-block");
    expect(back.participantId).toBe("rcp_a");
  });
});

function draft(over: Partial<PreparationDraft> = {}): PreparationDraft {
  return {
    id: "stamp_draft",
    status: "ready-for-field-placement",
    workspaceId: "ws_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sourceContext: { source: "new" },
    files: [{ id: "f1", fileName: "a.pdf", fileSizeBytes: 10, mimeType: "application/pdf", fileState: "ready", order: 0 }],
    details: DEFAULT_TRANSACTION_DETAILS,
    participants: [
      { id: "rev", name: "Rita Reviewer", email: "r@x.com", role: "reviewer", organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null },
    ],
    routing: DEFAULT_ROUTING_CONFIG,
    auth: DEFAULT_AUTH_CONFIG,
    settings: DEFAULT_PREP_SETTINGS,
    demonstrationOnly: true,
    ...over,
  };
}

describe("validation", () => {
  it("warns (does not block) when a reviewer has no Reviewed over Name, and clears once they do", () => {
    const d = draft({ id: `v_${Math.random()}` });
    const session = fieldEditorService.initializeEditor(d.id, d);
    const before = fieldEditorService.validateFieldPlacement(d.id, d, []);
    const issue = before.warnings.find(w => w.code === "REVIEWER_MISSING_REVIEW_BLOCK");
    expect(issue?.participantId).toBe("rev");
    expect(before.errors.some(e => e.code === "REVIEWER_MISSING_REVIEW_BLOCK")).toBe(false);

    const doc = session.documents[0]!;
    const after = fieldEditorService.validateFieldPlacement(d.id, d, [{
      id: "x", type: "review-block", documentId: doc.id, pageId: doc.pages[0]!.id,
      rect: { x: 0.2, y: 0.7, width: 0.336, height: 0.095 }, participantId: "rev",
      label: "Reviewed over Name", required: true, layer: 1, demonstrationOnly: true,
    }]);
    expect(after.warnings.some(w => w.code === "REVIEWER_MISSING_REVIEW_BLOCK")).toBe(false);
    expect(after.errors.some(e => e.code === "INCOMPATIBLE_ROLE")).toBe(false);
  });

  it("refuses a review block on a signer", () => {
    const d = draft({ id: `v_${Math.random()}`, participants: [
      { id: "sig", name: "Sam", email: "s@x.com", role: "signer", organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null },
    ] as PreparationDraft["participants"] });
    const session = fieldEditorService.initializeEditor(d.id, d);
    const doc = session.documents[0]!;
    const v = fieldEditorService.validateFieldPlacement(d.id, d, [{
      id: "x", type: "review-block", documentId: doc.id, pageId: doc.pages[0]!.id,
      rect: { x: 0.2, y: 0.7, width: 0.336, height: 0.095 }, participantId: "sig",
      label: "Reviewed over Name", required: true, layer: 1, demonstrationOnly: true,
    }]);
    expect(v.errors.some(e => e.code === "INCOMPATIBLE_ROLE")).toBe(true);
  });
});

describe("the editor session follows the draft's files (stale-document root cause)", () => {
  it("rebuilds documents when a file is replaced, keeping fields on surviving pages", () => {
    const id = `s_${Math.random()}`;
    const d1 = draft({ id });
    const s1 = fieldEditorService.initializeEditor(id, d1);
    expect(s1.documents.map(d => d.displayName)).toEqual(["a.pdf"]);
    // Same call, same files: still memoised.
    expect(fieldEditorService.initializeEditor(id, d1)).toBe(s1);

    // Swapped for a different upload.
    const d2 = draft({ id, files: [{ id: "f9", fileName: "b.pdf", fileSizeBytes: 20, mimeType: "application/pdf", fileState: "ready", order: 0 }] });
    const s2 = fieldEditorService.initializeEditor(id, d2);
    expect(s2).not.toBe(s1);
    expect(s2.documents.map(d => d.displayName)).toEqual(["b.pdf"]);
    expect(s2.documents[0]!.prepFileId).toBe("f9");

    // New bytes behind the same PrepFile (artifact changed).
    const d3 = draft({ id, files: [{ ...d2.files[0]!, backendDocumentId: "doc", backendArtifactId: "art_2" }] });
    expect(fieldEditorService.initializeEditor(id, d3)).not.toBe(s2);
  });
});

describe("on the recipient's signing surface", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 595 });
  });
  const stamp = (type: string, valueAuthority: CeremonyField["valueAuthority"]): CeremonyField => ({
    fieldId: `f_${type}`, type, pageNumber: 1, x: 0.1, y: 0.7, width: 0.34, height: 0.1,
    required: type === "review-block", label: type, layer: 0,
    valueAuthority, valueKind: "server", maxLength: null,
  });
  const loadBlob = () => Promise.resolve({
    type: "application/pdf",
    arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
  } as unknown as Blob);

  it("are read-only notes — nothing to fill, and never counted as outstanding", async () => {
    render(
      <PositionedSigningSurface
        loadBlob={loadBlob}
        // Even reported as RECIPIENT_SUPPLIED, a stamp is never the recipient's to fill.
        fields={[stamp("review-block", "RECIPIENT_SUPPLIED"), stamp("approval-block", "SERVER_DERIVED")]}
        signerName="Rita Reviewer"
        signature={null} initials={null} textValues={{}}
        onSignature={vi.fn()} onInitials={vi.fn()} onTextValue={vi.fn()}
      />,
    );
    expect(await screen.findByText("Filled in when you complete")).toBeInTheDocument();
    expect(screen.getByText("Stamped with your approval")).toBeInTheDocument();
    expect(screen.getAllByText("Rita Reviewer").length).toBeGreaterThan(0);
    expect(screen.getByText("All your fields are complete")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add your/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
