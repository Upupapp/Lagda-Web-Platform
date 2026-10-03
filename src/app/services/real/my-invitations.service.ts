// The signed-in person's RECEIVED workspace invitations (Invitations section).
//
//   GET  /me/invitations?status=pending|declined|accepted
//   POST /me/invitations/:id/accept           files a join request an owner or
//                                              administrator then approves
//   POST /me/invitations/:id/decline          { reason } — required, 1–500
//   POST /me/invitations/:id/withdraw-decline back to pending (409 once the
//                                              invitation expired or was revoked)
//
// These are addressed to the account's verified email address, not to a
// workspace, so nothing here is scoped by the current workspace. Accepting
// does NOT make the person a member on its own: it asks to join, and the
// workspace's owner or an administrator approves that request.
//
// Like document sharing there is no fixture twin: an invitation names a real
// person, so without a backend there is nothing honest to demonstrate.

import { API_BASE_URL, USE_REAL_BACKEND } from "../backend-flag";
import { apiRequest, ApiError } from "../api-client";
import { changes } from "../live/topics";
import { changesNavCounts } from "../nav-counts-signal";
import { REAL_ROLE_LABELS, type BackendWorkspaceRole } from "./workspace-admin.service";

// ── Wire types ────────────────────────────────────────────────────────────

export type MyInvitationStatus = "pending" | "declined" | "accepted";

export interface MyInvitationBranding {
  readonly displayName: string;
  readonly primaryColor: string | null;
  readonly logo: { readonly version: string; readonly url: string } | null;
}

export interface MyInvitation {
  readonly invitationId: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly role: string;
  readonly invitedBy: { readonly displayName: string } | null;
  readonly status: MyInvitationStatus;
  /** ISO date-time or epoch milliseconds — both are accepted. */
  readonly createdAt: string | number;
  readonly expiresAt: string | number | null;
  readonly declinedAt: string | number | null;
  readonly declineReason: string | null;
  readonly branding: MyInvitationBranding | null;
}

/** POST /me/invitations/:id/accept (the same shape as the emailed-link accept). */
export interface MyInvitationAcceptResult {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly role: string;
  /** False when the membership already existed. */
  readonly joined: boolean;
  /** True when accepting filed a join request awaiting an owner's approval. */
  readonly pending: boolean;
}

export const MY_INVITATION_STATUSES: readonly MyInvitationStatus[] = ["pending", "declined", "accepted"];
export const DECLINE_REASON_MIN = 1;
export const DECLINE_REASON_MAX = 500;

/** What accepting does, said the moment it is done. */
export const ACCEPTED_NOTICE = "Request sent — the workspace owner will approve your access.";

// ── Paths ─────────────────────────────────────────────────────────────────

const enc = encodeURIComponent;
const mine = (id: string) => `/me/invitations/${enc(id)}`;

export function myInvitationsAvailable(): boolean {
  return USE_REAL_BACKEND;
}

/** Where the Invitations section lives; `status` uses the wire values. */
export const INVITATIONS_PATH = "/app/invitations";
export function invitationsPath(status?: MyInvitationStatus, invitationId?: string): string {
  const params = new URLSearchParams();
  if (status !== undefined) params.set("status", status);
  if (invitationId !== undefined) params.set("invitation", invitationId);
  const query = params.toString();
  return query === "" ? INVITATIONS_PATH : `${INVITATIONS_PATH}?${query}`;
}

/** Manage → Invitations, where an INVITER sees the invitations they sent. */
/** The workspace's own invitations: Invitations › Sent. */
export const SENT_INVITATIONS_PATH = "/app/invitations?view=sent";
export const sentInvitationPath = (invitationId: string) => `${SENT_INVITATIONS_PATH}&invitation=${enc(invitationId)}`;

/** A notice link that opens an invitation directly (the bell goes straight there). */
export function isInvitationsLink(path: string | null): path is string {
  if (path === null) return false;
  return [INVITATIONS_PATH, SENT_INVITATIONS_PATH].some(base => path === base || path.startsWith(`${base}?`));
}

/** The absolute URL of the inviting workspace's logo (relative on the wire). */
export function invitationLogoUrl(item: MyInvitation): string | null {
  const logo = item.branding?.logo ?? null;
  if (logo === null || logo.url === "") return null;
  if (/^https?:\/\//i.test(logo.url)) return logo.url;
  if (API_BASE_URL === null) return null;
  return `${API_BASE_URL}${logo.url.startsWith("/") ? "" : "/"}${logo.url}`;
}

/** "Sender", "Template Administrator", "New Comer" — never the raw enum. */
export function invitationRoleLabel(role: string): string {
  const known = REAL_ROLE_LABELS[role as BackendWorkspaceRole] as string | undefined;
  if (known !== undefined) return known;
  const words = role.replace(/[_-]+/g, " ").trim();
  return words === "" ? "Member" : words.replace(/\b\w/g, c => c.toUpperCase());
}

export function isInvitationExpired(item: MyInvitation, now: number = Date.now()): boolean {
  if (item.expiresAt === null) return false;
  const at = new Date(item.expiresAt).getTime();
  return !Number.isNaN(at) && at <= now;
}

// ── Calls ─────────────────────────────────────────────────────────────────

export const myInvitationsService = {
  async list(status: MyInvitationStatus): Promise<MyInvitation[]> {
    const result = await apiRequest<{ items: MyInvitation[] }>(`/me/invitations?status=${enc(status)}`);
    return result.items;
  },

  /** `pending: true` — a join request now waits for the owner (the usual case). */
  accept(id: string): Promise<MyInvitationAcceptResult> {
    return changes("invitations", changesNavCounts(apiRequest<MyInvitationAcceptResult>(`${mine(id)}/accept`, { method: "POST" })));
  },

  decline(id: string, reason: string): Promise<MyInvitation> {
    return changes("invitations", changesNavCounts(apiRequest<MyInvitation>(`${mine(id)}/decline`, { method: "POST", body: { reason: reason.trim() } })));
  },

  withdrawDecline(id: string): Promise<MyInvitation> {
    return changes("invitations", changesNavCounts(apiRequest<MyInvitation>(`${mine(id)}/withdraw-decline`, { method: "POST" })));
  },
};

// ── Friendly errors ───────────────────────────────────────────────────────

export type InvitationOperation = "load" | "accept" | "decline" | "withdraw";

/** A sentence a person can act on, keyed on the backend's stable codes. */
export function invitationErrorMessage(error: unknown, operation: InvitationOperation): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  const code = error.body?.code;
  if (error.status === 0) return "We couldn't reach LAGDA. Check your connection and try again.";
  if (error.status === 401) return "Your session has ended. Sign in again to continue.";
  if (code === "account_email_unverified") {
    return "Confirm your account's email address first. Invitations are matched to a verified email address.";
  }
  if (error.status === 404) return "This invitation is no longer available. Refresh to see your current invitations.";
  if (error.status === 409) {
    return operation === "withdraw"
      ? "This invitation can no longer be reopened — it has expired or was withdrawn by the workspace."
      : "This invitation was changed in the meantime — it may have expired or been withdrawn. Refresh to see its current status.";
  }
  if (error.status === 422 || error.status === 400 || code === "validation_failed") {
    return operation === "decline"
      ? `Enter a reason between ${String(DECLINE_REASON_MIN)} and ${String(DECLINE_REASON_MAX)} characters.`
      : "That didn't work. Please try again.";
  }
  if (error.status === 403) return "You can't do that for this invitation.";
  if (error.status === 429) return "Too many attempts. Please wait a few minutes before trying again.";
  if (operation === "load") return "Couldn't load your invitations. Try again in a moment.";
  return "Something went wrong. Please try again.";
}

export function formatInvitationDate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function toIsoOrNull(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
