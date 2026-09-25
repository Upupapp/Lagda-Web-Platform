// Real workspace administration — talks to Lagda-Backend's members and
// invitations routes.
//
// Deliberately narrow: MEMBERS and INVITATIONS only, because those are the
// two surfaces the backend fully supports today (list, change role, remove;
// list, send, resend, revoke). Teams, roles, workspace settings, the
// overview and the activity log stay on `mockWorkspaceAdminService` — the
// backend has either no equivalent (activity log, custom roles, per-member
// suspend/deactivate) or a DIFFERENT real feature already covering the same
// ground under a different name (teams ~ the real "organization units" at
// Settings → Organization, wired separately). Widening this service to those
// is future work, not a shortcut taken here.
//
// Every method maps the wire shape onto the SAME `WorkspaceMemberSummary` /
// `WorkspaceInvitation` models the mock service returns, so
// `WorkspaceAdminContext` can call either one without its callers knowing
// which. `demonstrationOnly: false` on every row this service returns.
import { apiRequest } from "../api-client";
import type {
  WorkspaceMemberSummary, WorkspaceMemberId,
  WorkspaceInvitation, WorkspaceInvitationId, WorkspaceInvitationStatus,
  WorkspaceRoleId, WorkspaceInviteInput,
} from "../../models/workspace-admin";
import { initialsOf } from "../../components/platform/UserAvatar";

// Mirrors the backend's WorkspaceRole enum exactly (see
// real/workspace.service.ts's own copy of this list, kept for the SAME
// reason: one closed vocabulary the wire actually speaks, not a frontend
// invention). `member` is the one value with no separate frontend concept —
// every other value maps to itself as a role id.
export type BackendWorkspaceRole =
  | "owner" | "member" | "administrator" | "template_administrator"
  | "sender" | "reviewer" | "auditor";

/** The seven real roles, in the order they read best in a picker. */
export const REAL_WORKSPACE_ROLES: readonly BackendWorkspaceRole[] = [
  "owner", "administrator", "template_administrator", "sender",
  "reviewer", "auditor", "member",
];

export const REAL_ROLE_LABELS: Record<BackendWorkspaceRole, string> = {
  owner: "Owner",
  administrator: "Administrator",
  template_administrator: "Template Administrator",
  sender: "Sender",
  reviewer: "Reviewer",
  auditor: "Auditor",
  member: "Member",
};

/** A role a caller may ASSIGN. Ownership transfers by its own, separate
 *  mechanism nowhere in this surface — assigning "owner" here is refused by
 *  the backend, so it is left off the picker rather than offered and denied. */
export const ASSIGNABLE_ROLES: readonly BackendWorkspaceRole[] =
  REAL_WORKSPACE_ROLES.filter(role => role !== "owner");

interface WireMember {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string;
  role: BackendWorkspaceRole;
  joinedAt: number;
  isCurrentUser: boolean;
}

interface WireInvitation {
  invitationId: string;
  email: string;
  role: BackendWorkspaceRole;
  state: string;
  createdAt: number;
  expiresAt: number;
}

const iso = (ms: number): string => new Date(ms).toISOString();

function toSummary(member: WireMember): WorkspaceMemberSummary {
  return {
    id: member.membershipId as WorkspaceMemberId,
    displayName: member.displayName,
    email: member.email,
    avatarInitials: initialsOf(member.displayName),
    // The real backend has no suspend/deactivate concept (074's own
    // exploration confirmed it): a membership exists or it does not, and a
    // real row is therefore always "active". The status FILTER on the
    // Members page keeps working — the other two options simply match
    // nothing, which is the honest answer, not a bug.
    status: "active",
    roleId: member.role as WorkspaceRoleId,
    roleName: REAL_ROLE_LABELS[member.role],
    isOwner: member.role === "owner",
    joinedAt: iso(member.joinedAt),
    demonstrationOnly: false,
  };
}

function toInvitation(invitation: WireInvitation): WorkspaceInvitation {
  return {
    id: invitation.invitationId as WorkspaceInvitationId,
    // The caller already knows which workspace it asked about; the field
    // exists on the model for the mock service's own convenience and is not
    // read by either page this service feeds.
    workspaceId: "" as never,
    email: invitation.email,
    roleId: invitation.role as WorkspaceRoleId,
    roleName: REAL_ROLE_LABELS[invitation.role],
    status: invitation.state as WorkspaceInvitationStatus,
    sentAt: iso(invitation.createdAt),
    expiresAt: iso(invitation.expiresAt),
    // Not exposed by the backend's InvitationSummary — see its own comment:
    // "Never present: ... the inviter's account details." A real invitation
    // simply does not say who sent it, on purpose (S-class PII minimisation
    // on a row every member with invitation:view can list).
    invitedByName: "",
    demonstrationOnly: false,
  };
}

class RealWorkspaceAdminService {
  async listMembers(workspaceId: string): Promise<WorkspaceMemberSummary[]> {
    const result = await apiRequest<{ members: WireMember[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/members`);
    return result.members.map(toSummary);
  }

  async changeMemberRole(
    workspaceId: string, membershipId: string, role: BackendWorkspaceRole,
  ): Promise<WorkspaceMemberSummary> {
    const member = await apiRequest<WireMember>(
      `/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(membershipId)}/role`,
      { method: "PATCH", body: { role } },
    );
    return toSummary(member);
  }

  async removeMember(workspaceId: string, membershipId: string): Promise<void> {
    await apiRequest<{ membershipId: string; removed: true }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(membershipId)}`,
      { method: "DELETE" },
    );
  }

  async listInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    const result = await apiRequest<{ invitations: WireInvitation[] }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/invitations`);
    return result.invitations.map(toInvitation);
  }

  async sendInvitation(
    workspaceId: string, input: WorkspaceInviteInput, idempotencyKey: string,
  ): Promise<WorkspaceInvitation> {
    const invitation = await apiRequest<WireInvitation>(
      `/workspaces/${encodeURIComponent(workspaceId)}/invitations`,
      {
        method: "POST",
        body: { email: input.email, role: input.roleId },
        headers: { "Idempotency-Key": idempotencyKey },
      },
    );
    return toInvitation(invitation);
  }

  async resendInvitation(
    workspaceId: string, invitationId: string, idempotencyKey: string,
  ): Promise<WorkspaceInvitation> {
    const invitation = await apiRequest<WireInvitation>(
      `/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
      { method: "POST", body: {}, headers: { "Idempotency-Key": idempotencyKey } },
    );
    return toInvitation(invitation);
  }

  async revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
    await apiRequest<{ invitationId: string; state: string }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}/revoke`,
      { method: "POST", body: {} },
    );
  }
}

export const realWorkspaceAdminService = new RealWorkspaceAdminService();
