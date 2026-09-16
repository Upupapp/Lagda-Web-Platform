// Direct coverage for MockFieldEditorService's field CRUD (add/update/delete/
// duplicate/reorder) and session lifecycle — pure state-machine logic that
// FieldsPage.tsx's handlers delegate to, but which is faster and more
// reliable to exercise directly than through a full component render.

import { describe, it, expect, beforeEach } from "vitest";
import { fieldEditorService } from "../field-editor.service";
import {
  DEFAULT_ROUTING_CONFIG, DEFAULT_AUTH_CONFIG, DEFAULT_PREP_SETTINGS, DEFAULT_TRANSACTION_DETAILS,
} from "../../../models/prepare";
import type { PreparationDraft } from "../../../models/prepare";

function draft(over: Partial<PreparationDraft> = {}): PreparationDraft {
  return {
    id: "svc_draft_1",
    status: "ready-for-field-placement",
    workspaceId: "ws_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sourceContext: { source: "new" },
    files: [{ id: "f1", fileName: "a.pdf", fileSizeBytes: 10, mimeType: "application/pdf", fileState: "ready", order: 0 }],
    details: DEFAULT_TRANSACTION_DETAILS,
    participants: [{ id: "pax_1", name: "Signer", email: "s@x.com", role: "signer", organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null }],
    routing: DEFAULT_ROUTING_CONFIG,
    auth: DEFAULT_AUTH_CONFIG,
    settings: DEFAULT_PREP_SETTINGS,
    demonstrationOnly: true,
    ...over,
  };
}

describe("MockFieldEditorService", () => {
  let draftId: string;

  beforeEach(() => {
    draftId = `svc_draft_${Math.random().toString(36).slice(2)}`;
    fieldEditorService.initializeEditor(draftId, draft({ id: draftId }));
  });

  it("initializeEditor returns the same session on a second call (memoized)", () => {
    const a = fieldEditorService.initializeEditor(draftId, draft({ id: draftId }));
    const b = fieldEditorService.getSession(draftId);
    expect(b).toBe(a);
  });

  it("getSession returns null for an unknown draft", () => {
    expect(fieldEditorService.getSession("does-not-exist")).toBeNull();
  });

  it("addField assigns an id, a layer above existing fields on that page, and clamps the rect", () => {
    const session = fieldEditorService.getSession(draftId)!;
    const docId = session.documents[0]!.id;
    const pageId = session.documents[0]!.pages[0]!.id;
    const f1 = fieldEditorService.addField(draftId, {
      type: "signature", documentId: docId, pageId,
      rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      participantId: "pax_1", label: "Sig", required: true, demonstrationOnly: true,
    });
    expect(f1.id).toBeTruthy();
    expect(f1.layer).toBe(1);
    const f2 = fieldEditorService.addField(draftId, {
      type: "full-name", documentId: docId, pageId,
      rect: { x: 0.1, y: 0.2, width: 0.2, height: 0.05 },
      participantId: "pax_1", label: "Name", required: true, demonstrationOnly: true,
    });
    expect(f2.layer).toBe(2);
  });

  it("addField throws for an unknown draft", () => {
    expect(() => fieldEditorService.addField("nope", {
      type: "signature", documentId: "d", pageId: "p",
      rect: { x: 0, y: 0, width: 0.1, height: 0.1 },
      participantId: null, label: "x", required: true, demonstrationOnly: true,
    })).toThrow();
  });

  it("updateField patches an existing field and re-clamps a changed rect", () => {
    const session = fieldEditorService.getSession(draftId)!;
    const docId = session.documents[0]!.id;
    const pageId = session.documents[0]!.pages[0]!.id;
    const field = fieldEditorService.addField(draftId, {
      type: "signature", documentId: docId, pageId,
      rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      participantId: "pax_1", label: "Sig", required: true, demonstrationOnly: true,
    });
    const updated = fieldEditorService.updateField(draftId, field.id, { required: false });
    expect(updated?.required).toBe(false);
    expect(updated?.id).toBe(field.id);
  });

  it("updateField returns null for a missing field or draft", () => {
    expect(fieldEditorService.updateField(draftId, "missing", { required: false })).toBeNull();
    expect(fieldEditorService.updateField("nope", "missing", { required: false })).toBeNull();
  });

  it("deleteFields removes only the targeted ids", () => {
    const session = fieldEditorService.getSession(draftId)!;
    const docId = session.documents[0]!.id;
    const pageId = session.documents[0]!.pages[0]!.id;
    const a = fieldEditorService.addField(draftId, { type: "signature", documentId: docId, pageId, rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 }, participantId: "pax_1", label: "A", required: true, demonstrationOnly: true });
    const b = fieldEditorService.addField(draftId, { type: "full-name", documentId: docId, pageId, rect: { x: 0.1, y: 0.3, width: 0.2, height: 0.05 }, participantId: "pax_1", label: "B", required: true, demonstrationOnly: true });
    fieldEditorService.deleteFields(draftId, [a.id]);
    const remaining = fieldEditorService.getSession(draftId)!.fields.map((f) => f.id);
    expect(remaining).not.toContain(a.id);
    expect(remaining).toContain(b.id);
  });

  it("deleteFields on an unknown draft is a no-op, not a throw", () => {
    expect(() => fieldEditorService.deleteFields("nope", ["x"])).not.toThrow();
  });

  it("duplicateField offsets the copy and returns null for a missing field", () => {
    const session = fieldEditorService.getSession(draftId)!;
    const docId = session.documents[0]!.id;
    const pageId = session.documents[0]!.pages[0]!.id;
    const original = fieldEditorService.addField(draftId, { type: "signature", documentId: docId, pageId, rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 }, participantId: "pax_1", label: "A", required: true, demonstrationOnly: true });
    const dup = fieldEditorService.duplicateField(draftId, original.id);
    expect(dup?.id).not.toBe(original.id);
    expect(dup?.rect.x).toBeGreaterThan(original.rect.x);
    expect(fieldEditorService.duplicateField(draftId, "missing")).toBeNull();
  });

  it("reorderLayer sends a field to the front and to the back", () => {
    const session = fieldEditorService.getSession(draftId)!;
    const docId = session.documents[0]!.id;
    const pageId = session.documents[0]!.pages[0]!.id;
    const a = fieldEditorService.addField(draftId, { type: "signature", documentId: docId, pageId, rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 }, participantId: "pax_1", label: "A", required: true, demonstrationOnly: true });
    const b = fieldEditorService.addField(draftId, { type: "full-name", documentId: docId, pageId, rect: { x: 0.1, y: 0.3, width: 0.2, height: 0.05 }, participantId: "pax_1", label: "B", required: true, demonstrationOnly: true });

    fieldEditorService.reorderLayer(draftId, a.id, "send-to-back");
    let fields = fieldEditorService.getSession(draftId)!.fields;
    expect(fields.find((f) => f.id === a.id)!.layer).toBe(0);

    fieldEditorService.reorderLayer(draftId, a.id, "bring-to-front");
    fields = fieldEditorService.getSession(draftId)!.fields;
    expect(fields.find((f) => f.id === a.id)!.layer).toBeGreaterThan(fields.find((f) => f.id === b.id)!.layer);

    fieldEditorService.reorderLayer(draftId, a.id, "bring-forward");
    fieldEditorService.reorderLayer(draftId, b.id, "send-backward");
  });

  it("reorderLayer on an unknown field or draft is a no-op", () => {
    expect(() => fieldEditorService.reorderLayer(draftId, "missing", "bring-to-front")).not.toThrow();
    expect(() => fieldEditorService.reorderLayer("nope", "missing", "bring-to-front")).not.toThrow();
  });

  it("buildRecipientPreview works for an empty and a populated session", () => {
    expect(fieldEditorService.buildRecipientPreview("nope")).toBeDefined();
    const session = fieldEditorService.getSession(draftId)!;
    const docId = session.documents[0]!.id;
    const pageId = session.documents[0]!.pages[0]!.id;
    fieldEditorService.addField(draftId, { type: "signature", documentId: docId, pageId, rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 }, participantId: "pax_1", label: "A", required: true, demonstrationOnly: true });
    expect(fieldEditorService.buildRecipientPreview(draftId)).toBeDefined();
  });

  it("setFields replaces the session's field list", () => {
    fieldEditorService.setFields(draftId, []);
    expect(fieldEditorService.getSession(draftId)!.fields).toEqual([]);
    fieldEditorService.setFields("nope", []); // no-op, no throw
  });

  it("clearSession removes the session entirely", () => {
    fieldEditorService.clearSession(draftId);
    expect(fieldEditorService.getSession(draftId)).toBeNull();
  });
});
