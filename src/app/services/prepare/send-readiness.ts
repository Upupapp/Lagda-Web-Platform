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
  // Any blocker sending the visitor to Fields is, by definition, something
  // the Validation panel explains and (usually) has a one-click fix for —
  // selecting a field alone opens Field Properties instead, which has no
  // idea why that field was flagged. Force the Validation panel open so the
  // actual fix is what's on screen, not something the visitor has to know
  // to go find.
  if (action.route.startsWith("/app/prepare/fields")) {
    params.set("showValidation", "1");
  }
  const query = params.toString();
  return query ? `${action.route}?${query}` : action.route;
}

/** Roles that must hold a field before the server will send. */
const NEEDS_A_FIELD: readonly string[] = ["signer", "reviewer", "acknowledgment-recipient"];

/** Required, acting participants who hold no field at all. */
export function participantsMissingAField(
  draft: Pick<PreparationDraft, "participants">,
  fields: readonly Pick<FieldDefinition, "participantId">[],
): { id: string; name: string }[] {
  const holders = new Set(fields.map(f => f.participantId).filter((id): id is string => typeof id === "string"));
  return draft.participants
    .filter(p => p.isRequired && NEEDS_A_FIELD.includes(p.role) && !holders.has(p.id))
    .map(p => ({ id: p.id, name: p.name }));
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
    // The server's own rule (assessSnapshotReadiness): every REQUIRED
    // participant who acts must hold at least one field. Approvers are the
    // exception (they approve without one); viewers and copy recipients never
    // act. Without this check the send was refused with "not ready to send"
    // and nothing on screen said who was missing a field.
    // The first step must hold someone who ACTS. The server opens the next
    // step when the current one's people finish; a first step of only copy
    // recipients or viewers has nobody to finish, so nothing would ever open.
    // (`?? []`: a draft saved before routing existed has none to read.)
    const firstStep = [...((draft.routing as PreparationDraft["routing"] | undefined)?.groups ?? [])]
      .filter(g => g.participantIds.length > 0)
      .sort((x, y) => x.stepNumber - y.stepNumber)[0];
    if (firstStep && !firstStep.participantIds.some(id => {
      const person = draft.participants.find(p => p.id === id);
      return person !== undefined && person.role !== "carbon-copy" && person.role !== "viewer";
    })) {
      blockers.push({
        message: "The first step has only copy recipients or viewers, so nobody would start the document. Put a signer, approver, reviewer or acknowledgment recipient in the first step.",
        action: { label: "Change the order", route: "/app/prepare/routing" },
      });
    }
    const withoutField = participantsMissingAField(draft, fields);
    for (const person of withoutField) {
      blockers.push({
        message: `${person.name} has no field on the document. Each signer, reviewer and acknowledgment recipient needs at least one.`,
        action: { label: "Place a field", route: "/app/prepare/fields", participantId: person.id },
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

/**
 * One of the server's reasons for refusing a send, with the PERSON named.
 *
 * The server says which recipient by position (`recipients[6]`) and never by
 * name. The draft holds the same people in the same order, so the position is
 * turned back into a name here; anything unrecognised is shown as it came.
 */
export function describeSendDetail(
  detail: { field?: string; message: string },
  participants: readonly { name: string }[],
): string {
  const at = /^(recipients|fields)\[(\d+)\]$/.exec(detail.field ?? "");
  if (!at) return detail.message;
  const index = Number(at[2]);
  if (at[1] === "recipients") {
    const name = participants[index]?.name;
    return name ? `${name}: ${detail.message}` : detail.message;
  }
  return `Field ${String(index + 1)}: ${detail.message}`;
}
