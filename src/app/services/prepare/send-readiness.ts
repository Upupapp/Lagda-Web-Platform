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

// A blocker may point the sender at the exact step (and, for field-level
// issues, the exact field(s)) that need attention — so the "not ready to
// send" banner can offer a real fix-it link instead of just naming the
// problem. Action-less blockers (e.g. an architectural gap with no UI fix)
// simply render as plain text.
export interface SendReadinessAction {
  label: string;
  route: string;
  fieldIds?: string[];
  participantId?: string;
  groupId?: string;
}

export interface SendReadinessBlocker {
  message: string;
  action?: SendReadinessAction;
}

export interface SendReadinessResult {
  ready: boolean;
  blockers: SendReadinessBlocker[];
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

// Turns a blocker's action into the actual URL to navigate to — the one
// place this querystring shape (focusFieldIds / highlightParticipantId) is
// assembled, so ConfirmationPage's banner and the cross-step Help panel
// (PreparationHelpFab) never drift into building it two different ways.
export function buildActionUrl(action: SendReadinessAction): string {
  const params = new URLSearchParams();
  if (action.fieldIds && action.fieldIds.length > 0) {
    params.set("focusFieldIds", action.fieldIds.join(","));
  }
  if (action.participantId) {
    params.set("highlightParticipantId", action.participantId);
  }
  if (action.groupId) {
    params.set("highlightGroupId", action.groupId);
  }
  const query = params.toString();
  return query ? `${action.route}?${query}` : action.route;
}

export function computeSendReadiness(input: SendReadinessInput): SendReadinessResult {
  const { draft, multiDocumentSigningGap, syncError, fields } = input;
  const blockers: SendReadinessBlocker[] = [];

  const realFiles = draft.files.filter((f) => f.backendDocumentId);
  if (realFiles.length === 0) {
    blockers.push({
      message: "No document in this preparation has reached real backend upload yet.",
      action: { label: "Go to Upload", route: "/app/prepare/upload" },
    });
  }
  if (multiDocumentSigningGap) {
    blockers.push({
      message:
        "MULTI-DOCUMENT SIGNING MODEL BACKEND GAP — this preparation has more than one real document; " +
        "the backend has no shared-participant abstraction across documents, so a single accurate signing " +
        "request cannot yet be constructed for all of them together.",
      action: { label: "Manage documents", route: "/app/prepare/upload" },
    });
  }

  if (draft.participants.length === 0) {
    blockers.push({
      message: "No participants have been added.",
      action: { label: "Add participants", route: "/app/prepare/participants" },
    });
  } else if (draft.participants.some((p) => !isRealRecipientId(p.id))) {
    blockers.push({
      message: "One or more participants have not finished syncing to the backend.",
      action: { label: "Review participants", route: "/app/prepare/participants" },
    });
  }

  if (syncError) {
    blockers.push({
      message: `Unresolved participant/routing sync error: ${syncError}`,
      action: { label: "Review participants", route: "/app/prepare/participants" },
    });
  }

  // Authentication: only the default "no extra auth, unique link" method
  // (`none`) has a real backend-enforced counterpart today (see the P1.5
  // capability matrix) — every other method is a frontend-only preference
  // that nothing server-side would actually enforce.
  if (draft.auth.defaultMethod !== "none") {
    blockers.push({
      message:
        `Default authentication method "${draft.auth.defaultMethod}" has no backend enforcement yet; ` +
        `only "none" (secure invitation link) can be honored by a real send.`,
      action: { label: "Change authentication", route: "/app/prepare/authentication" },
    });
  }
  for (const [participantId, methodId] of Object.entries(draft.auth.perParticipant)) {
    if (methodId !== "none") {
      blockers.push({
        message: `Participant ${participantId} has an authentication override ("${methodId}") that has no backend enforcement yet.`,
        action: { label: "Change authentication", route: "/app/prepare/authentication", participantId },
      });
    }
  }

  // Fields: unknown state (editor never visited this session) or any field
  // of a type the backend can't store both mean "not actually verified as
  // persisted" — never assumed ready by omission.
  if (fields === null) {
    blockers.push({
      message: "Field placement has not been loaded/verified this session.",
      action: { label: "Go to field placement", route: "/app/prepare/fields" },
    });
  } else {
    const unsupported = fields.filter((f) => !isBackendFieldType(f.type));
    if (unsupported.length > 0) {
      blockers.push({
        message:
          `${unsupported.length} placed field(s) use a type with no backend representation ` +
          `(multiline-text, radio-group, acknowledgment, or sender-text) and will not be part of a real send.`,
        action: {
          label: "Fix these fields",
          route: "/app/prepare/fields",
          fieldIds: unsupported.map((f) => f.id),
        },
      });
    }
    if (fields.some((f) => !f.id.startsWith("bf_"))) {
      blockers.push({
        message: "Field placement has local, unsaved edits — save before sending.",
        action: { label: "Go to field placement", route: "/app/prepare/fields" },
      });
    }
  }

  return { ready: blockers.length === 0, blockers };
}
