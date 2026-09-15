// Bounded readiness calculation for "can this preparation legitimately
// become a real signing request yet". Pure/no side effects, not wired into
// any Send action — there is no Send yet (see LAGDA_P1_5 mission §12). This
// exists so the eventual P2 Send workstream has one authoritative place to
// ask the question, instead of re-deriving these rules ad hoc at the call
// site of a network call that cannot be undone.

import type { FieldDefinition } from "../../models/field-editor";
import type { PreparationDraft } from "../../models/prepare";
import { isRealRecipientId } from "./participant-sync";
import { isBackendFieldType } from "./field-sync";

export interface SendReadinessResult {
  ready: boolean;
  blockers: string[];
}

export interface SendReadinessInput {
  draft: PreparationDraft;
  /** Whether more than one file in this draft has reached real backend
   *  upload — see PrepareContext's hasMultiDocumentSigningGap(). */
  multiDocumentSigningGap: boolean;
  /** Most recent participant/routing sync failure, if any. */
  syncError: string | null;
  /** Current field-editor field set for this draft's document(s), if the
   *  field editor has been visited this session. Omit if unknown — an
   *  unknown field state is treated as not-yet-ready, not silently OK. */
  fields: FieldDefinition[] | null;
}

export function computeSendReadiness(input: SendReadinessInput): SendReadinessResult {
  const { draft, multiDocumentSigningGap, syncError, fields } = input;
  const blockers: string[] = [];

  const realFiles = draft.files.filter((f) => f.backendDocumentId);
  if (realFiles.length === 0) {
    blockers.push("No document in this preparation has reached real backend upload yet.");
  }
  if (multiDocumentSigningGap) {
    blockers.push(
      "MULTI-DOCUMENT SIGNING MODEL BACKEND GAP — this preparation has more than one real document; " +
      "the backend has no shared-participant abstraction across documents, so a single accurate signing " +
      "request cannot yet be constructed for all of them together.",
    );
  }

  if (draft.participants.length === 0) {
    blockers.push("No participants have been added.");
  } else if (draft.participants.some((p) => !isRealRecipientId(p.id))) {
    blockers.push("One or more participants have not finished syncing to the backend.");
  }

  if (syncError) {
    blockers.push(`Unresolved participant/routing sync error: ${syncError}`);
  }

  // Authentication: only the default "no extra auth, unique link" method
  // (`none`) has a real backend-enforced counterpart today (see the P1.5
  // capability matrix) — every other method is a frontend-only preference
  // that nothing server-side would actually enforce.
  if (draft.auth.defaultMethod !== "none") {
    blockers.push(
      `Default authentication method "${draft.auth.defaultMethod}" has no backend enforcement yet; ` +
      `only "none" (secure invitation link) can be honored by a real send.`,
    );
  }
  for (const [participantId, methodId] of Object.entries(draft.auth.perParticipant)) {
    if (methodId !== "none") {
      blockers.push(
        `Participant ${participantId} has an authentication override ("${methodId}") that has no backend enforcement yet.`,
      );
    }
  }

  // Fields: unknown state (editor never visited this session) or any field
  // of a type the backend can't store both mean "not actually verified as
  // persisted" — never assumed ready by omission.
  if (fields === null) {
    blockers.push("Field placement has not been loaded/verified this session.");
  } else {
    const unsupported = fields.filter((f) => !isBackendFieldType(f.type));
    if (unsupported.length > 0) {
      blockers.push(
        `${unsupported.length} placed field(s) use a type with no backend representation ` +
        `(multiline-text, radio-group, acknowledgment, or sender-text) and will not be part of a real send.`,
      );
    }
    if (fields.some((f) => !f.id.startsWith("bf_"))) {
      blockers.push("Field placement has local, unsaved edits — save before sending.");
    }
  }

  return { ready: blockers.length === 0, blockers };
}
