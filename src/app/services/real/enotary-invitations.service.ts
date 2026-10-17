// Notary on-ramp, phase 1: a client asks a listed notary to take a request, and
// the notary opens the invitation, proves who they are, and accepts or
// declines. It ends there: no video, no payment, no document.
//
// Workspace realm (apiRequest), about the PERSON: every route is under `/me`,
// except the one public lookup the notary's landing page makes before signing in.
//
// ── The feature may be off ─────────────────────────────────────────────────
//
// Both switches are off by default and a switched-off server answers 404 on
// every route here. `list` and `desk` answer `null` for that, so navigation
// and the directory can ask without ever showing an error.
//
// All API access for this feature is in this file and notary-applications.service.ts,
// so a change of path or shape is made in one place.

import { apiRequest, ApiError } from "../api-client";

export type InvitationStatus = "awaiting" | "claimed" | "accepted" | "declined" | "expired" | "revoked";

export interface InvitationNotary {
  directoryId: string;
  name: string;
  firm: string;
  city: string;
  province: string;
  /** The server already has an email for this notary: the client may not add one. */
  emailOnRecord: boolean;
  /** The notary has a verified, approved account: they are told in LAGDA. */
  accountKnown: boolean;
}

export interface InvitationTimelineEntry {
  at: string;
  code: string;
  text: string;
}

export interface Invitation {
  id: string;
  status: InvitationStatus;
  notary: InvitationNotary;
  notaryEmail: string | null;
  /** The secret link. Null once the invitation is no longer awaiting. */
  link: string | null;
  createdAt: string;
  expiresAt: string;
  /** Counted by the server when it answered; the page counts down from it. */
  secondsLeft: number;
  claimedAt: string | null;
  decidedAt: string | null;
  timeline: InvitationTimelineEntry[];
}

/** An invitation can still be acted on (revoked, or waiting for the notary). */
export function invitationIsOpen(status: InvitationStatus): boolean {
  return status === "awaiting" || status === "claimed";
}

export type PublicLookupState = "open" | "expired" | "revoked" | "used" | "unknown";

export interface PublicLookup {
  state: PublicLookupState;
  /** Only when the state is open. */
  notaryName?: string;
  expiresAt?: string;
}

export type NotaryApplicationStatus = "none" | "draft" | "submitted" | "approved" | "rejected" | "withdrawn" | "expired";

export interface ClaimResult {
  invitation: Invitation;
  notary: { applicationStatus: NotaryApplicationStatus; canAccept: boolean };
}

export interface DeskRequest {
  id: string;
  status: InvitationStatus;
  client: { name: string; identityVerified: boolean };
  receivedAt: string;
  expiresAt: string;
  secondsLeft: number;
  decidedAt: string | null;
}

export interface NotaryDesk {
  applicationStatus: NotaryApplicationStatus;
  canAccept: boolean;
  requests: DeskRequest[];
}

/** The error code the server gave, or "" for anything that is not a structured refusal. */
export function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.body?.code ?? "" : "";
}

export function errorStatus(error: unknown): number {
  return error instanceof ApiError ? error.status : -1;
}

/** Reads one string from the extra properties a refusal may carry. */
function extra(error: unknown, key: string): string | null {
  if (!(error instanceof ApiError) || error.body === undefined) return null;
  const bag = error.body as unknown as Record<string, unknown>;
  const direct = bag[key];
  if (typeof direct === "string" && direct !== "") return direct;
  const detail = error.body.details?.find(item => item.field === key);
  return detail !== undefined && detail.message !== "" ? detail.message : null;
}

/** The id the server returns with 409 `enotary_invitation_open`, when it does. */
export function existingInvitationId(error: unknown): string | null {
  return extra(error, "invitationId") ?? extra(error, "id");
}

/** The lookup state a refused claim carries (`enotary_invitation_unavailable`), when it does. */
export function refusedState(error: unknown): PublicLookupState | null {
  const state = extra(error, "state");
  return state === "open" || state === "expired" || state === "revoked" || state === "used" || state === "unknown"
    ? state : null;
}

async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (errorStatus(error) === 404 && errorCode(error) !== "enotary_notary_not_listed") return null;
    throw error;
  }
}

class RealEnotaryInvitationsService {
  /** The client's invitations, newest first. `null`: the feature is not offered. */
  async list(): Promise<Invitation[] | null> {
    const answer = await orNull(apiRequest<{ invitations: Invitation[] }>("/me/enotary/invitations"));
    return answer === null ? null : answer.invitations;
  }

  async get(id: string): Promise<Invitation | null> {
    const answer = await orNull(apiRequest<{ invitation: Invitation } | Invitation>(`/me/enotary/invitations/${encodeURIComponent(id)}`));
    if (answer === null) return null;
    return "invitation" in answer ? answer.invitation : answer;
  }

  /**
   * Asks a listed notary. 403 `client_identity_required`, 404
   * `enotary_notary_not_listed`, 409 `enotary_invitation_open` |
   * `enotary_invitation_limit`, 422 `notary_email_not_allowed`.
   */
  async create(directoryId: string, notaryEmail?: string): Promise<Invitation> {
    const body: { directoryId: string; notaryEmail?: string } = { directoryId };
    if (notaryEmail !== undefined && notaryEmail.trim() !== "") body.notaryEmail = notaryEmail.trim();
    const answer = await apiRequest<{ invitation: Invitation }>("/me/enotary/invitations", { method: "POST", body });
    return answer.invitation;
  }

  async revoke(id: string): Promise<Invitation> {
    const answer = await apiRequest<{ invitation: Invitation } | Invitation>(
      `/me/enotary/invitations/${encodeURIComponent(id)}/revoke`, { method: "POST" });
    return "invitation" in answer ? answer.invitation : answer;
  }

  /** A NEW invitation with a new link; the old one stays as history. */
  async renew(id: string): Promise<Invitation> {
    const answer = await apiRequest<{ invitation: Invitation }>(
      `/me/enotary/invitations/${encodeURIComponent(id)}/renew`, { method: "POST" });
    return answer.invitation;
  }

  async setNotaryEmail(id: string, email: string): Promise<Invitation> {
    const answer = await apiRequest<{ invitation: Invitation } | Invitation>(
      `/me/enotary/invitations/${encodeURIComponent(id)}/notary-email`, { method: "PUT", body: { email: email.trim() } });
    return "invitation" in answer ? answer.invitation : answer;
  }

  /** Public, no session. Anything the server does not recognise is `unknown`. */
  async lookup(token: string): Promise<PublicLookup> {
    return apiRequest<PublicLookup>(`/public/enotary/invitations/lookup?token=${encodeURIComponent(token)}`);
  }

  /**
   * The notary opens an invitation. 404 | 410 `enotary_invitation_unavailable`,
   * 409 `identity_required` | `notary_name_mismatch`.
   */
  async claim(token: string): Promise<ClaimResult> {
    return apiRequest<ClaimResult>("/me/enotary/invitations/claim", { method: "POST", body: { token } });
  }

  /** The notary's desk. `null`: the feature is not offered. */
  async desk(): Promise<NotaryDesk | null> {
    return orNull(apiRequest<NotaryDesk>("/me/notary/desk"));
  }

  /** 409 `notary_not_approved` | `enotary_invitation_unavailable`. */
  async accept(id: string): Promise<void> {
    await apiRequest<unknown>(`/me/notary/requests/${encodeURIComponent(id)}/accept`, { method: "POST", body: {} });
  }

  async decline(id: string, reason?: string): Promise<void> {
    const body: { reason?: string } = {};
    if (reason !== undefined && reason.trim() !== "") body.reason = reason.trim().slice(0, 120);
    await apiRequest<unknown>(`/me/notary/requests/${encodeURIComponent(id)}/decline`, { method: "POST", body });
  }
}

export const realEnotaryInvitationsService = new RealEnotaryInvitationsService();

/** Why a client's action failed, in plain words. */
export function describeInvitationError(error: unknown): string {
  const code = errorCode(error);
  const status = errorStatus(error);
  if (status === 0) return "Could not reach the server. Check your connection and try again.";
  if (status === 401) return "Your session has ended. Sign in again to continue.";
  if (status === 429) return "Too many tries in a short time. Wait a minute, then try again.";
  if (code === "client_identity_required") return "Verify your identity first. Your request is sent once your account shows as verified.";
  if (code === "enotary_notary_not_listed") return "That notary is not listed in the Notary Directory.";
  if (code === "enotary_invitation_open") return "You already have an open request for this notary.";
  if (code === "enotary_invitation_limit") return "You already have 3 open requests. Revoke one, or wait for it to end, then try again.";
  if (code === "notary_email_not_allowed") return "LAGDA already has a way to reach this notary, so an email address is not needed.";
  if (code === "enotary_invitation_unavailable") return "This request has already ended.";
  if (status === 422 || status === 400) return "That email address was not accepted. Check it and try again.";
  return "That could not be done right now. Please try again.";
}
