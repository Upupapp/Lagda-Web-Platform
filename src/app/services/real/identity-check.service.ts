// The sender's side of the optional identity check ("ID and face
// verification"): whether this workspace can ask for it, who must pass it on
// a document, how each participant of a sent request stands, and the waiver.
//
// Workspace realm only (apiRequest: session cookie, CSRF on writes). The
// participant's own attempt is in signing-access.service.ts, on the recipient
// client, and never here.
//
// ── The feature may be off ─────────────────────────────────────────────────
//
// Only `GET …/identity-check` always exists. Every other route is registered
// only where the check is switched on, so a 404 from them means "feature
// off" and is answered with `null`: nothing to show, never an error to show.

import { apiRequest, ApiError } from "../api-client";
import type { IdentityCheckMode, IdentityNameMatch } from "../../models/identity-check";

export interface IdentityCheckAvailability {
  available: boolean;
  /** `test`: every check is simulated. Null when not available. */
  mode: IdentityCheckMode | null;
  minimumPlan: "business";
  planAllows: boolean;
  idTypes: string[];
  /**
   * `hosted`: the participant is taken to the identity verification partner's
   * page. Absent from an older server, which means `inline`.
   */
  flow?: "inline" | "hosted";
}

export interface IdentityRequirement {
  /** Lower-cased by the server. Compare without regard to case. */
  email: string;
  requiredAt: string;
  waivedAt: string | null;
}

/**
 * `name-mismatch`: the check was passed, but the name read from the ID is not
 * the name on the document. The participant is held until the sender decides.
 */
export type SenderIdentityCheckStatus =
  | "not-required" | "pending" | "passed" | "locked" | "waived" | "name-mismatch";

export interface RecipientIdentityCheck {
  recipientId: string;
  email: string;
  /** A live requirement applies right now. False once waived. */
  required: boolean;
  status: SenderIdentityCheckStatus;
  mode: IdentityCheckMode | null;
  lastOutcome: "passed" | "failed" | null;
  failedAttempts: number;
  verifiedAt: string | null;
  /** The kind of ID presented. `passport` and `other-id` come from the hosted flow. */
  idType: string | null;
  waivedAt: string | null;
  // ── The name on the ID. All absent from an older server: nothing is said. ──
  /** The full name read from the ID. Shown to the sender only. */
  verifiedName?: string | null;
  /** How that name compares with the one on the document. */
  nameMatch?: IdentityNameMatch | null;
  /** What differs, from a closed vocabulary. An unknown value still reads. */
  nameDifferences?: string[];
  /** The name the participant is signing under on this request. */
  documentName?: string;
}

/**
 * What the sender decides about a name that does not match: the document's
 * name stays, and they say why it is the same person. The name on a sent
 * request cannot be changed, so there is no "use the ID's name": signing
 * under that name means sending the document again with it.
 */
export interface IdentityNameResolution {
  readonly action: "accept";
  readonly reason: string;
}

export const IDENTITY_NAME_REASON_MAX = 500;

export interface IdentityCheckWaived {
  recipientId: string;
  status: "waived";
  waivedAt: string;
  /** 110. What became of telling the participant. Absent from an older server. */
  participantNotice?: ParticipantNotice;
}

/**
 * 110. What became of telling a participant they may continue, after a
 * lighter method was allowed or their name accepted: told, told before,
 * nothing waiting on them, or their link has ended (send a new one). Null:
 * this call told nobody.
 */
export type ParticipantNotice = "sent" | "already-sent" | "not-waiting" | "link-lapsed" | null;

export const IDENTITY_CHECK_WAIVE_REASON_MAX = 500;

const OFF: IdentityCheckAvailability = {
  available: false, mode: null, minimumPlan: "business", planAllows: false, idTypes: [],
};

const ws = (workspaceId: string) => `/workspaces/${encodeURIComponent(workspaceId)}`;

function isStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

class RealIdentityCheckService {
  /**
   * Whether this workspace can ask for the check. A member who prepares
   * nothing is refused (403); for them, as for a server that does not know
   * the route, the answer is simply "not available".
   */
  async availability(workspaceId: string): Promise<IdentityCheckAvailability> {
    try {
      return await apiRequest<IdentityCheckAvailability>(`${ws(workspaceId)}/identity-check`);
    } catch (error) {
      if (isStatus(error, 403) || isStatus(error, 404)) return OFF;
      throw error;
    }
  }

  /** Who must pass the check on this document. `null`: the feature is off. */
  async requirements(workspaceId: string, documentId: string): Promise<IdentityRequirement[] | null> {
    try {
      const result = await apiRequest<{ items: IdentityRequirement[] }>(
        `${ws(workspaceId)}/documents/${encodeURIComponent(documentId)}/identity-requirements`);
      return result.items;
    } catch (error) {
      if (isStatus(error, 404)) return null;
      throw error;
    }
  }

  /** Makes the set exactly `emails`. `[]` clears it. Returns the set as saved. */
  async replaceRequirements(
    workspaceId: string, documentId: string, emails: readonly string[],
  ): Promise<IdentityRequirement[]> {
    const result = await apiRequest<{ items: IdentityRequirement[] }>(
      `${ws(workspaceId)}/documents/${encodeURIComponent(documentId)}/identity-requirements`,
      { method: "PUT", body: { emails: [...emails] } },
    );
    return result.items;
  }

  /** How each participant of a sent request stands. `null`: the feature is off. */
  async checks(workspaceId: string, signingRequestId: string): Promise<RecipientIdentityCheck[] | null> {
    try {
      const result = await apiRequest<{ items: RecipientIdentityCheck[] }>(
        `${ws(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}/identity-checks`);
      return result.items;
    } catch (error) {
      if (isStatus(error, 404)) return null;
      throw error;
    }
  }

  /** Lets one participant continue with their secure link alone. Idempotent. */
  async waive(
    workspaceId: string, signingRequestId: string, recipientId: string, reason?: string,
  ): Promise<IdentityCheckWaived> {
    const trimmed = reason?.trim() ?? "";
    return apiRequest<IdentityCheckWaived>(
      `${ws(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}`
      + `/recipients/${encodeURIComponent(recipientId)}/identity-check/waive`,
      // The body must be an object even when there is no reason to give.
      { method: "POST", body: trimmed === "" ? {} : { reason: trimmed.slice(0, IDENTITY_CHECK_WAIVE_REASON_MAX) } },
    );
  }

  /**
   * Accepts a name that does not match as the same person. Answers with the
   * participant's check as it now stands; accepting again once accepted
   * answers the same way. Refused with 422 `identity_requirement_invalid`
   * (`details` naming `reason`: `required` or `too-long`), 409
   * `identity_name_not_pending`, or 404 for a member who may not decide.
   */
  async resolveName(
    workspaceId: string, signingRequestId: string, recipientId: string, resolution: IdentityNameResolution,
  ): Promise<RecipientIdentityCheck & { participantNotice?: ParticipantNotice }> {
    return apiRequest<RecipientIdentityCheck & { participantNotice?: ParticipantNotice }>(
      `${ws(workspaceId)}/signing-requests/${encodeURIComponent(signingRequestId)}`
      + `/recipients/${encodeURIComponent(recipientId)}/identity-check/name-resolution`,
      {
        method: "POST",
        body: { action: "accept", reason: resolution.reason.trim().slice(0, IDENTITY_NAME_REASON_MAX) },
      },
    );
  }
}

export const realIdentityCheckService = new RealIdentityCheckService();

const DETAIL_WORDING: Readonly<Record<string, (email: string) => string>> = {
  "malformed": email => `${email} is not an email address.`,
  "not-a-participant": email =>
    `${email} is not saved as a participant of this document yet. Check the Participants step, then try again.`,
  "role-cannot-act": email =>
    `${email} only views or receives a copy, so they cannot be asked for ID and face verification.`,
};

/**
 * Why saving the set failed, in plain words. `emails` is what was sent, so a
 * detail naming `emails[2]` can be said as the address it means.
 */
export function describeIdentityRequirementError(error: unknown, emails: readonly string[] = []): string {
  if (!(error instanceof ApiError)) return "Your change could not be saved. Try again.";
  if (error.status === 0) return "Your change could not be saved. Check your connection and try again.";
  const code = error.body?.code;
  if (code === "identity_requirement_invalid") {
    const lines = (error.body?.details ?? []).map(detail => {
      const index = /^emails\[(\d+)\]$/.exec(detail.field ?? "")?.[1];
      const email = index === undefined ? undefined : emails[Number(index)];
      const wording = DETAIL_WORDING[detail.code];
      return wording !== undefined && email !== undefined ? wording(email) : detail.message;
    }).filter(line => line !== "");
    if (lines.length > 0) return [...new Set(lines)].join(" ");
  }
  if (code === "plan_required") return "ID and face verification is available on the Business plan.";
  if (code === "identity_check_unavailable") return "ID and face verification is not available for this workspace.";
  if (code === "identity_requirement_not_editable") {
    return "Signing of this document has ended, so who must pass the check can no longer be changed.";
  }
  if (error.status === 404) return "ID and face verification is not available right now.";
  if (error.status === 403) return "You do not have permission to change this.";
  return error.body?.message ?? "Your change could not be saved. Try again.";
}

/** Why the waiver failed, in plain words. */
export function describeIdentityWaiveError(error: unknown): string {
  if (!(error instanceof ApiError)) return "That could not be done. Try again.";
  if (error.status === 0) return "That could not be done. Check your connection and try again.";
  if (error.body?.code === "identity_check_not_required") {
    return "No identity check is required of this participant any more.";
  }
  if (error.status === 404) return "This is not available right now.";
  if (error.status === 403) return "You do not have permission to do this.";
  return error.body?.message ?? "That could not be done. Try again.";
}

export const IDENTITY_NAME_CORRECTION_UNAVAILABLE =
  "The name cannot be changed on a document that has already been sent. "
  + "Accept it as the same person, or send the document to someone else.";

/**
 * What is wrong with the reason, said beside its field. `null` when the
 * refusal is not about the reason.
 */
export function identityNameReasonError(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null;
  if (error.body?.code !== "identity_requirement_invalid") return null;
  const about = (error.body.details ?? []).filter(detail => detail.field === "reason");
  if (about.some(detail => detail.code === "too-long")) {
    return `The reason is too long (${String(IDENTITY_NAME_REASON_MAX)} characters at most).`;
  }
  return about.some(detail => detail.code === "required") ? "Give a reason." : null;
}

/** Why the sender's decision about the name failed, in plain words. */
export function describeIdentityNameResolutionError(error: unknown): string {
  if (!(error instanceof ApiError)) return "That could not be done. Try again.";
  if (error.status === 0) return "That could not be done. Check your connection and try again.";
  const code = error.body?.code;
  // Not asked for by anything on screen any more; said plainly if it ever comes.
  if (code === "identity_name_correction_unavailable") return IDENTITY_NAME_CORRECTION_UNAVAILABLE;
  if (code === "identity_name_not_pending") {
    return "This name is no longer waiting for a decision. It may already have been decided.";
  }
  const reason = identityNameReasonError(error);
  if (reason !== null) return reason;
  // A member who may not decide is answered as if the document were not there.
  if (error.status === 404 || error.status === 403) {
    return "You do not have permission to do this, or the document is no longer available.";
  }
  if (error.status === 422) return "That could not be done. Check the reason and try again.";
  return error.body?.message ?? "That could not be done. Try again.";
}
