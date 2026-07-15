// Mock field-editor service.
// Frontend-only: no network requests, no PDF parsing, no real uploads.
// All state lives in memory and is cleared when discarded.

import type {
  FieldId,
  FieldDefinition,
  EditorDocument,
  FieldPlacementValidation,
  FieldValidationIssue,
  ParticipantFieldCoverage,
} from "../../models/field-editor";
import {
  makeFieldId,
  detectOverlap,
  isNearPageEdge,
  isRoleEligibleForField,
  clampRect,
  buildRecipientFlowPreview,
} from "../../models/field-editor";
import type { PreparationDraft, PrepParticipantRole } from "../../models/prepare";
import { PREP_ROLE_IS_BLOCKING } from "../../models/prepare";
import {
  buildEditorDocuments,
  buildDemoFields,
  buildMultiFileFields,
} from "../../data/mock/field-editor";
import type { RecipientFlowPreview } from "../../models/field-editor";

interface EditorSession {
  documents: EditorDocument[];
  fields:    FieldDefinition[];
}

class MockFieldEditorService {
  private sessions = new Map<string, EditorSession>();

  // ── Session lifecycle ────────────────────────────────────────────────────────

  initializeEditor(draftId: string, draft: PreparationDraft): EditorSession {
    if (this.sessions.has(draftId)) {
      return this.sessions.get(draftId)!;
    }

    const documents = buildEditorDocuments(draft.files);
    const paxSlice  = draft.participants.map(p => ({ id: p.id, name: p.name, role: p.role }));

    // Pre-populate fields for multi-file drafts or drafts with ≥2 participants
    let fields: FieldDefinition[] = [];
    if (documents.length >= 2 && paxSlice.length >= 1) {
      fields = buildMultiFileFields(documents, paxSlice);
    } else if (paxSlice.length >= 1 && documents.length >= 1) {
      fields = buildDemoFields(documents, paxSlice);
    }

    const session: EditorSession = { documents, fields };
    this.sessions.set(draftId, session);
    return session;
  }

  getSession(draftId: string): EditorSession | null {
    return this.sessions.get(draftId) ?? null;
  }

  clearSession(draftId: string): void {
    this.sessions.delete(draftId);
  }

  // ── Field CRUD ───────────────────────────────────────────────────────────────

  addField(draftId: string, field: Omit<FieldDefinition, "id" | "layer">): FieldDefinition {
    const session = this.sessions.get(draftId);
    if (!session) throw new Error("No editor session for draft " + draftId);

    const existingOnPage = session.fields.filter(
      f => f.documentId === field.documentId && f.pageId === field.pageId,
    );
    const maxLayer = existingOnPage.reduce((m, f) => Math.max(m, f.layer), 0);

    const complete: FieldDefinition = {
      ...field,
      id:    makeFieldId(),
      layer: maxLayer + 1,
      rect:  clampRect(field.rect, field.type),
      demonstrationOnly: true,
    };
    session.fields = [...session.fields, complete];
    return complete;
  }

  updateField(draftId: string, fieldId: FieldId, patch: Partial<FieldDefinition>): FieldDefinition | null {
    const session = this.sessions.get(draftId);
    if (!session) return null;
    const idx = session.fields.findIndex(f => f.id === fieldId);
    if (idx === -1) return null;
    const updated = { ...session.fields[idx]!, ...patch, id: fieldId, demonstrationOnly: true as const };
    if (patch.rect) updated.rect = clampRect(patch.rect, updated.type);
    session.fields = session.fields.map((f, i) => i === idx ? updated : f);
    return updated;
  }

  deleteFields(draftId: string, fieldIds: FieldId[]): void {
    const session = this.sessions.get(draftId);
    if (!session) return;
    const idSet = new Set(fieldIds);
    session.fields = session.fields.filter(f => !idSet.has(f.id));
  }

  duplicateField(draftId: string, fieldId: FieldId): FieldDefinition | null {
    const session = this.sessions.get(draftId);
    if (!session) return null;
    const original = session.fields.find(f => f.id === fieldId);
    if (!original) return null;

    const offset  = 0.03;
    const newRect = clampRect({
      ...original.rect,
      x: Math.min(1 - original.rect.width,  original.rect.x + offset),
      y: Math.min(1 - original.rect.height, original.rect.y + offset),
    }, original.type);

    const duplicate: FieldDefinition = {
      ...original,
      id:    makeFieldId(),
      rect:  newRect,
      layer: original.layer + 1,
    };
    session.fields = [...session.fields, duplicate];
    return duplicate;
  }

  reorderLayer(draftId: string, fieldId: FieldId, action: "bring-forward" | "send-backward" | "bring-to-front" | "send-to-back"): void {
    const session = this.sessions.get(draftId);
    if (!session) return;
    const field = session.fields.find(f => f.id === fieldId);
    if (!field) return;

    const pageFields = session.fields.filter(
      f => f.documentId === field.documentId && f.pageId === field.pageId,
    );
    const sorted     = [...pageFields].sort((a, b) => a.layer - b.layer);
    const myIdx      = sorted.findIndex(f => f.id === fieldId);

    const newLayers = new Map<FieldId, number>();
    sorted.forEach((f, i) => newLayers.set(f.id, i + 1));

    if (action === "bring-to-front") newLayers.set(fieldId, sorted.length + 10);
    if (action === "send-to-back")   newLayers.set(fieldId, 0);
    if (action === "bring-forward" && myIdx < sorted.length - 1) {
      const next = sorted[myIdx + 1]!;
      newLayers.set(fieldId,  (newLayers.get(next.id) ?? myIdx + 2));
      newLayers.set(next.id,  (newLayers.get(fieldId) ?? myIdx + 1) - 1);
    }
    if (action === "send-backward" && myIdx > 0) {
      const prev = sorted[myIdx - 1]!;
      newLayers.set(fieldId, (newLayers.get(prev.id) ?? myIdx));
      newLayers.set(prev.id, (newLayers.get(fieldId) ?? myIdx + 1) + 1);
    }

    session.fields = session.fields.map(f => {
      const newLayer = newLayers.get(f.id);
      return newLayer !== undefined ? { ...f, layer: newLayer } : f;
    });
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  // fieldsOverride allows the context to pass its own in-memory fields
  // without needing to sync them back to the service first.

  validateFieldPlacement(
    draftId:        string,
    draft:          PreparationDraft,
    fieldsOverride?: FieldDefinition[],
  ): FieldPlacementValidation {
    const session = this.sessions.get(draftId);
    const fields  = fieldsOverride ?? session?.fields ?? [];
    const docs    = session?.documents ?? [];

    const errors:   FieldValidationIssue[] = [];
    const warnings: FieldValidationIssue[] = [];
    let   issueIdx = 0;
    const id = () => `fv_${issueIdx++}`;

    // No documents
    if (docs.length === 0) {
      errors.push({ id: id(), severity: "error", code: "NO_DOCUMENTS",
        message: "No documents available. Return to the Documents step to add a file.",
        suggestion: "Return to Documents step." });
    }

    // Unassigned fields
    const nonSenderFields = fields.filter(f => f.type !== "sender-text");
    const unassigned      = nonSenderFields.filter(f => f.participantId === null);
    unassigned.forEach(f => {
      errors.push({ id: id(), severity: "error", code: "UNASSIGNED_FIELD",
        message: `The "${f.label}" field (${f.type}) is not assigned to a participant.`,
        fieldId: f.id,
        suggestion: "Open field properties and select a participant." });
    });

    // Fields outside page bounds (shouldn't happen with clamping, but validate)
    fields.forEach(f => {
      if (f.rect.x < 0 || f.rect.y < 0 || f.rect.x + f.rect.width > 1 || f.rect.y + f.rect.height > 1) {
        errors.push({ id: id(), severity: "error", code: "FIELD_OUT_OF_BOUNDS",
          message: `The "${f.label}" field is outside the page boundary.`,
          fieldId: f.id, suggestion: "Drag the field onto the page." });
      }
    });

    // Incompatible role assignments
    fields.forEach(f => {
      if (!f.participantId || f.type === "sender-text") return;
      const pax = draft.participants.find(p => p.id === f.participantId);
      if (!pax) {
        errors.push({ id: id(), severity: "error", code: "UNKNOWN_PARTICIPANT",
          message: `Field "${f.label}" is assigned to a participant that no longer exists.`,
          fieldId: f.id, participantId: f.participantId,
          suggestion: "Reassign or delete this field." });
        return;
      }
      if (!isRoleEligibleForField(pax.role, f.type)) {
        errors.push({ id: id(), severity: "error", code: "INCOMPATIBLE_ROLE",
          message: `A "${f.type}" field cannot be assigned to a ${pax.role} (${pax.name}).`,
          fieldId: f.id, participantId: f.participantId,
          suggestion: `Remove this field or change ${pax.name}'s role.` });
      }
      // Blocking roles that should not receive required fields: viewer, carbon-copy
      if ((pax.role === "viewer" || pax.role === "carbon-copy") && f.required) {
        errors.push({ id: id(), severity: "error", code: "BLOCKING_FIELD_ON_NON_BLOCKING_ROLE",
          message: `${pax.name} (${pax.role}) cannot have required editable fields.`,
          fieldId: f.id, participantId: f.participantId,
          suggestion: `Make the field optional or remove it from ${pax.name}.` });
      }
    });

    // Participant coverage
    const coverageMap = new Map<string, ParticipantFieldCoverage>();
    draft.participants.forEach((pax, i) => {
      const paxFields    = fields.filter(f => f.participantId === pax.id);
      const hasSignature = paxFields.some(f => f.type === "signature");
      const issues:      FieldValidationIssue[] = [];

      if (pax.role === "signer" && !hasSignature) {
        const issue: FieldValidationIssue = {
          id: id(), severity: "error", code: "SIGNER_MISSING_SIGNATURE",
          message: `${pax.name} (Signer) has no Signature field. Add at least one Signature field assigned to them.`,
          participantId: pax.id,
          suggestion: "Add a Signature field from the palette and assign it to this participant.",
        };
        issues.push(issue);
        errors.push(issue);
      }

      if (pax.role === "acknowledgment-recipient") {
        const hasAck = paxFields.some(f => f.type === "acknowledgment" || f.type === "checkbox");
        if (!hasAck) {
          const issue: FieldValidationIssue = {
            id: id(), severity: "warning", code: "ACK_RECIPIENT_MISSING_ACK_FIELD",
            message: `${pax.name} (Acknowledgment Recipient) has no Acknowledgment or Checkbox field.`,
            participantId: pax.id,
            suggestion: "Add an Acknowledgment field for this participant.",
          };
          issues.push(issue);
          warnings.push(issue);
        }
      }

      const isBlocking = PREP_ROLE_IS_BLOCKING[pax.role];
      coverageMap.set(pax.id, {
        participantId:      pax.id,
        name:               pax.name,
        role:               pax.role as PrepParticipantRole,
        fieldCount:         paxFields.length,
        requiredFieldCount: paxFields.filter(f => f.required).length,
        hasSignature,
        issues,
        isSatisfied:        !isBlocking || issues.filter(i => i.severity === "error").length === 0,
      });
    });

    // Overlap warnings (only for same-page fields)
    const pageGroups = new Map<string, FieldDefinition[]>();
    fields.forEach(f => {
      const key = `${f.documentId}__${f.pageId}`;
      const arr  = pageGroups.get(key) ?? [];
      arr.push(f);
      pageGroups.set(key, arr);
    });
    pageGroups.forEach(pageFields => {
      for (let i = 0; i < pageFields.length; i++) {
        for (let j = i + 1; j < pageFields.length; j++) {
          const a = pageFields[i]!;
          const b = pageFields[j]!;
          if (detectOverlap(a.rect, b.rect)) {
            warnings.push({ id: id(), severity: "warning", code: "FIELD_OVERLAP",
              message: `"${a.label}" and "${b.label}" overlap significantly on the same page.`,
              fieldId: a.id,
              suggestion: "Move one field to avoid overlap." });
          }
        }
      }
    });

    // Safe-margin warnings
    fields.forEach(f => {
      if (f.type === "sender-text") return;
      if (isNearPageEdge(f.rect)) {
        warnings.push({ id: id(), severity: "warning", code: "NEAR_PAGE_EDGE",
          message: `"${f.label}" is very close to a page edge. It may not print or display correctly in all viewers.`,
          fieldId: f.id,
          suggestion: "Move the field further from the page edge." });
      }
    });

    // Document with no fields warning
    docs.forEach(doc => {
      const docFields = fields.filter(f => f.documentId === doc.id && f.type !== "sender-text");
      if (docFields.length === 0) {
        warnings.push({ id: id(), severity: "warning", code: "DOCUMENT_NO_PARTICIPANT_FIELDS",
          message: `"${doc.displayName}" has no participant fields. Add at least one participant field.`,
          documentId: doc.id,
          suggestion: "Navigate to this document and add participant fields." });
      }
    });

    const isValid       = errors.length === 0;
    const readyToContinue = isValid;

    return {
      isValid,
      readyToContinue,
      errors,
      warnings,
      participantCoverage: Array.from(coverageMap.values()),
      totalFieldCount:     fields.length,
      unassignedCount:     unassigned.length,
      documentIds:         docs.map(d => d.id),
    };
  }

  // ── Recipient-flow preview ───────────────────────────────────────────────────

  buildRecipientPreview(draftId: string): RecipientFlowPreview {
    const session = this.sessions.get(draftId);
    return buildRecipientFlowPreview(
      session?.documents ?? [],
      session?.fields    ?? [],
    );
  }

  // ── Sync fields back (used when context updates fields externally) ────────────

  setFields(draftId: string, fields: FieldDefinition[]): void {
    const session = this.sessions.get(draftId);
    if (session) session.fields = fields;
  }
}

export const fieldEditorService = new MockFieldEditorService();
