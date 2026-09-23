// Translates between the field-placement editor's FieldDefinition and the
// backend's PreparationField. Both use identically-normalized 0–1 rects, so
// coordinates pass through untouched — the only real work here is the field
// TYPE boundary: the editor supports 13 types, the backend only 9 (see
// BackendFieldType in real/preparation.service.ts). A field of an
// unsupported type is never sent to the backend and never silently dropped
// either — see isBackendFieldType() and its callers in FieldsPage.tsx.

import type { FieldDefinition, FieldType } from "../../models/field-editor";
import type { BackendFieldType, BackendPreparationField, BackendPreparationFieldInput } from "../real/preparation.service";

const BACKEND_FIELD_TYPES = new Set<FieldType>([
  "signature", "initials", "date-signed", "text",
  "checkbox", "full-name", "email", "title", "company",
]);

export function isBackendFieldType(type: FieldType): type is BackendFieldType {
  return BACKEND_FIELD_TYPES.has(type);
}

/**
 * Real recipient id required — a field assigned to a not-yet-persisted
 * local participant id cannot be saved to the backend (it would reference a
 * recipient the backend has never heard of); the caller filters those out
 * before calling this (see FieldsPage.tsx's saveToBackend()).
 *
 * `pageNumberOf` resolves the editor's opaque EditorPageId to the backend's
 * plain 1-based page number — sourced from the actual EditorPage records
 * the caller already has (each already carries its own `pageNumber`),
 * rather than this module guessing at the id's string shape.
 */
export function toBackendFieldInput(
  field: FieldDefinition,
  pageNumberOf: (pageId: string) => number | null,
): BackendPreparationFieldInput | null {
  const pageNumber = pageNumberOf(field.pageId);
  if (pageNumber === null) return null;
  return {
    ...(field.id.startsWith("bf_") ? { fieldId: field.id.slice(3) } : {}),
    type: field.type as BackendFieldType,
    pageNumber,
    rect: { x: field.rect.x, y: field.rect.y, width: field.rect.width, height: field.rect.height },
    required: field.required,
    label: field.label,
    layer: field.layer,
    // EXACTLY ONE. A static value means nobody signs this field — sending
    // both is refused by the backend's completeness CHECK (062), and sending
    // neither leaves a field no one can fill.
    ...(field.staticValue !== undefined && field.staticValue !== null
      ? { staticValue: field.staticValue, recipientId: null }
      : { recipientId: field.participantId }),
  };
}

/** Reverse direction — used when loading real fields into the editor for a
 *  specific document/page set. `fieldId` is prefixed with "bf_" (backend
 *  field) so it can never collide with the editor's own locally-generated
 *  ids and is recognizable as already-real on the next save. */
export function fromBackendField(
  field: BackendPreparationField,
  documentId: string,
  pageIdForNumber: (pageNumber: number) => string | null,
): FieldDefinition | null {
  const pageId = pageIdForNumber(field.pageNumber);
  if (!pageId) return null;
  return {
    id: `bf_${field.fieldId}`,
    type: field.type,
    documentId,
    pageId,
    rect: { x: field.rect.x, y: field.rect.y, width: field.rect.width, height: field.rect.height },
    participantId: field.recipientId,
    staticValue: field.staticValue,
    label: field.label,
    required: field.required,
    layer: field.layer,
    demonstrationOnly: false,
  };
}
