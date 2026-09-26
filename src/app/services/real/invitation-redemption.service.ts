// The invitee's side of an emailed workspace invitation — Lagda-Backend's
// packages/api/src/workspaces/invitation-routes.ts.
//
//   POST /invitations/preview  { token }  public
//     200 { workspaceName, role, inviteeEmail, expiresAt }
//     404 invalid_or_expired_invitation
//   POST /invitations/accept   { token }  signed in + CSRF
//     200 { workspaceId, workspaceName, role, joined, pending }
//     403 invitation_account_mismatch · 404 as above
//   POST /invitations/decline  { token }  signed in + CSRF
//
// Since 078 accepting never adds anyone straight away: it files a join
// request (`pending: true`) that an owner or administrator approves.
// `joined: true` survives only for a membership that already existed.
//
// The emailed link is `/invitations/accept?token=<token>`; the token only
// ever travels in a request body.

import { apiRequest, ApiError } from "../api-client";

export interface InvitationPreview {
  workspaceName: string;
  role: string;
  inviteeEmail: string;
  expiresAt: number;
}

export type InvitationPreviewResult =
  | { kind: "ok"; invitation: InvitationPreview }
  | { kind: "invalid" }
  | { kind: "error" };

export type InvitationAcceptResult =
  | { kind: "pending"; workspaceName: string }
  | { kind: "joined"; workspaceName: string }
  | { kind: "already-member"; workspaceName: string }
  | { kind: "invalid" }
  | { kind: "mismatch" }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

export async function previewInvitation(token: string): Promise<InvitationPreviewResult> {
  try {
    const invitation = await apiRequest<InvitationPreview>("/invitations/preview", { method: "POST", body: { token } });
    return { kind: "ok", invitation };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400 || err.status === 410 || err.status === 422)) {
      return { kind: "invalid" };
    }
    return { kind: "error" };
  }
}

export async function acceptInvitation(token: string): Promise<InvitationAcceptResult> {
  try {
    const result = await apiRequest<{
      workspaceId: string; workspaceName: string; role: string; joined: boolean; pending?: boolean;
    }>("/invitations/accept", { method: "POST", body: { token } });
    if (result.pending === true) return { kind: "pending", workspaceName: result.workspaceName };
    if (result.joined) return { kind: "joined", workspaceName: result.workspaceName };
    return { kind: "already-member", workspaceName: result.workspaceName };
  } catch (err) {
    if (!(err instanceof ApiError)) return { kind: "error", message: "We couldn't accept this invitation. Please try again." };
    if (err.status === 401) return { kind: "signed-out" };
    if (err.body?.code === "invitation_account_mismatch") return { kind: "mismatch" };
    if (err.status === 404 || err.status === 410) return { kind: "invalid" };
    return { kind: "error", message: err.body?.message ?? "We couldn't accept this invitation. Please try again." };
  }
}

export async function declineInvitation(token: string): Promise<void> {
  await apiRequest<{ declined: true }>("/invitations/decline", { method: "POST", body: { token } });
}
