// Pure logic behind the Fields-page Validation panel's one-click fixes and
// its real-backend issue list. Extracted from FieldsPage's component closures
// so the actual decision-making — where a field moves, which participant it
// gets, which fields the backend can't store — is unit-testable pure logic
// rather than untestable UI handlers. FieldsPage calls these and then applies
// the result via the field editor (moveField/updateField/deleteFields).

import type { FieldDefinition, FieldType, NormalizedRect, FieldValidationIssue } from "../../models/field-editor";
import { FIELD_ELIGIBLE_ROLES, SAFE_MARGIN } from "../../models/field-editor";
import type { PrepParticipant, PrepParticipantRole } from "../../models/prepare";
import { isBackendFieldType } from "./field-sync";

/** Clamp a rect fully back onto the page (0–1 on both axes). Deterministic —
 *  never guesses a new position, only stops it extending past the bounds. */
export function clampRectOntoPage(rect: NormalizedRect): NormalizedRect {
  const width = Math.min(1, rect.width);
  const height = Math.min(1, rect.height);
  return {
    width,
    height,
    x: Math.min(Math.max(0, rect.x), 1 - width),
    y: Math.min(Math.max(0, rect.y), 1 - height),
  };
}

/** Push a rect back inside the same safe margin isNearPageEdge() checks, so
 *  the near-edge warning is guaranteed to clear (not merely nudged). */
export function pushInsideSafeMargin(rect: NormalizedRect): NormalizedRect {
  const maxX = 1 - SAFE_MARGIN - rect.width;
  const maxY = 1 - SAFE_MARGIN - rect.height;
  return {
    ...rect,
    x: Math.min(Math.max(SAFE_MARGIN, rect.x), Math.max(SAFE_MARGIN, maxX)),
    y: Math.min(Math.max(SAFE_MARGIN, rect.y), Math.max(SAFE_MARGIN, maxY)),
  };
}

/** Nudge a rect down by a fixed offset to clear a same-position overlap,
 *  clamped so it can never be pushed off the bottom of the page. */
export function nudgeOffOverlap(rect: NormalizedRect, offset = 0.07): NormalizedRect {
  const maxY = Math.max(0, 1 - rect.height);
  const nextY = rect.y + offset > maxY ? Math.max(0, rect.y - offset) : rect.y + offset;
  return { ...rect, y: nextY };
}

/** The participants a field of this type may be assigned to. */
export function eligibleParticipants(
  fieldType: FieldType,
  participants: readonly { id: string; role: PrepParticipantRole }[],
): { id: string; role: PrepParticipantRole }[] {
  return participants.filter((p) => FIELD_ELIGIBLE_ROLES[fieldType].includes(p.role));
}

/** Resolve an assignment auto-fix: assign to the single eligible participant
 *  when exactly one exists, otherwise clear it (null). Never guesses among
 *  several — a null result becomes an ordinary "unassigned" field the visitor
 *  then resolves deliberately. Returns `undefined` to mean "no change" (the
 *  caller already had a valid single-eligible assignment or the field is
 *  gone), so callers can distinguish "clear it" (null) from "leave it". */
export function resolveAssignment(
  fieldType: FieldType,
  participants: readonly { id: string; role: PrepParticipantRole }[],
): string | null {
  return preferredAssignee(fieldType, participants);
}

/**
 * The one participant a new or fixed field should go to, or null to leave it
 * for the sender to choose.
 *
 * Exactly one eligible participant: that one. Otherwise, for a SIGNATURE,
 * exactly one SIGNER — a signature is primarily a signer's field, and
 * letting approvers hold one too must not stop the everyday "one signer, one
 * approver" document from auto-assigning its signature the way it always has.
 * Never a guess among several.
 */
export function preferredAssignee(
  fieldType: FieldType,
  participants: readonly { id: string; role: PrepParticipantRole }[],
): string | null {
  const eligible = eligibleParticipants(fieldType, participants);
  if (eligible.length === 1) return eligible[0]!.id;
  if (fieldType === "signature" || fieldType === "signature-block") {
    const signers = eligible.filter((p) => p.role === "signer");
    if (signers.length === 1) return signers[0]!.id;
  }
  return null;
}

/** Real-backend field issues the placement validator itself doesn't check:
 *  a field of a type the backend can't store, and locally-unsaved edits.
 *  Mirrors computeSendReadiness's field checks so the Fields panel and the
 *  Review banner agree. Returns [] when not in real-backend mode is the
 *  caller's decision — this is pure and always computes them. */
export function computeBackendFieldIssues(fields: readonly FieldDefinition[]): FieldValidationIssue[] {
  const issues: FieldValidationIssue[] = [];
  for (const f of fields) {
    if (!isBackendFieldType(f.type)) {
      issues.push({
        id: `backend_unsupported_${f.id}`,
        severity: "error",
        code: "UNSUPPORTED_BACKEND_TYPE",
        message: `The "${f.label}" field (${f.type}) can't be saved to the server — this field type isn't supported for a real send.`,
        fieldId: f.id,
        suggestion: "Remove this field, or replace it with a supported type (Signature, Signature over Name, Reviewed over Name, Approved over Name, Initials, Full Name, Date Signed, Text, Checkbox, Email, Title, or Company).",
      });
    }
  }
  if (fields.some((f) => !f.id.startsWith("bf_"))) {
    issues.push({
      id: "backend_unsaved",
      severity: "error",
      code: "UNSAVED_EDITS",
      message: "Field placement has local, unsaved changes.",
      suggestion: "Save now, or press Continue — both save your current placement to the server.",
    });
  }
  return issues;
}

/** Which participant a full participant record set resolves to for an
 *  assignment fix — convenience over the id-only overload, used by the panel
 *  which has the full PrepParticipant[]. */
export function resolveAssignmentFor(
  fieldType: FieldType,
  participants: readonly PrepParticipant[],
): string | null {
  return resolveAssignment(fieldType, participants.map((p) => ({ id: p.id, role: p.role })));
}
