// Mock workspace administration service.
// Frontend-only demonstration. All mutations are session-local (reset on reload).
// Follows the SESSION_MUTATIONS pattern used by contacts.service.ts.

import type {
  WorkspaceId,
  WorkspaceMemberId,
  WorkspaceInvitationId,
  WorkspaceTeamId,
  WorkspaceRoleId,
  WorkspaceAdminDetail,
  WorkspaceMember,
  WorkspaceMemberSummary,
  WorkspaceInvitation,
  WorkspaceTeam,
  WorkspaceTeamSummary,
  WorkspaceRole,
  WorkspaceRoleSummary,
  WorkspaceActivityEvent,
  WorkspaceAttentionItem,
  WorkspaceSettings,
  EffectivePermissionSet,
  WorkspaceMemberQuery,
  WorkspaceActivityQuery,
  WorkspacePermission,
  WorkspaceInviteInput,
  WorkspaceTeamCreateInput,
  WorkspaceRoleCreateInput,
} from "../../models/workspace-admin";
import { SYSTEM_ROLE_PERMISSIONS } from "../../models/workspace-admin";
import {
  MOCK_WORKSPACE_ADMIN,
  OTHER_WORKSPACES,
  FIXTURE_MEMBERS,
  FIXTURE_INVITATIONS,
  FIXTURE_TEAMS,
  FIXTURE_ROLES,
  FIXTURE_ACTIVITY,
  FIXTURE_ATTENTION_ITEMS,
  FIXTURE_WORKSPACE_SETTINGS,
  ROLE_MEMBER,
} from "../../data/mock/workspace-admin";

// ── Session mutation stores (reset on reload) ─────────────────────────────────

const SESSION_MEMBERS     = new Map<WorkspaceMemberId, WorkspaceMember>();
const SESSION_INVITATIONS = new Map<WorkspaceInvitationId, WorkspaceInvitation>();
const SESSION_TEAMS       = new Map<WorkspaceTeamId, WorkspaceTeam>();
const SESSION_ROLES       = new Map<WorkspaceRoleId, WorkspaceRole>();
const SESSION_ACTIVITY    = new Map<string, WorkspaceActivityEvent>();
const SESSION_SETTINGS    = { value: { ...FIXTURE_WORKSPACE_SETTINGS } };

let activitySeq = 100;
let teamSeq     = 10;
let roleSeq     = 10;
let invSeq      = 10;

function nowIso() { return new Date().toISOString(); }
function uid(prefix: string) { return `${prefix}_${Date.now()}_${Math.floor(Math.random()*9999)}`; }

function resolveMembers(): WorkspaceMember[] {
  const base = FIXTURE_MEMBERS.filter(m => !SESSION_MEMBERS.has(m.id));
  return [...base, ...Array.from(SESSION_MEMBERS.values())];
}

function resolveInvitations(): WorkspaceInvitation[] {
  const base = FIXTURE_INVITATIONS.filter(i => !SESSION_INVITATIONS.has(i.id));
  return [...base, ...Array.from(SESSION_INVITATIONS.values())];
}

function resolveTeams(): WorkspaceTeam[] {
  const base = FIXTURE_TEAMS.filter(t => !SESSION_TEAMS.has(t.id));
  return [...base, ...Array.from(SESSION_TEAMS.values())];
}

function resolveRoles(): WorkspaceRole[] {
  const base = FIXTURE_ROLES.filter(r => !SESSION_ROLES.has(r.id));
  return [...base, ...Array.from(SESSION_ROLES.values())];
}

function resolveActivity(): WorkspaceActivityEvent[] {
  const base = FIXTURE_ACTIVITY.filter(a => !SESSION_ACTIVITY.has(a.id));
  const sess = Array.from(SESSION_ACTIVITY.values());
  return [...sess, ...base].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function appendActivity(event: Omit<WorkspaceActivityEvent, "id" | "demonstrationOnly">) {
  const id = `act_sess_${++activitySeq}`;
  SESSION_ACTIVITY.set(id, { ...event, id, demonstrationOnly: true });
}

function delay(ms = 180) { return new Promise<void>(res => setTimeout(res, ms)); }

// ── Service ───────────────────────────────────────────────────────────────────

export const mockWorkspaceAdminService = {

  // ── Workspace overview ──────────────────────────────────────────────────────

  async getWorkspace(): Promise<{ workspace: WorkspaceAdminDetail; attentionItems: WorkspaceAttentionItem[] }> {
    await delay();
    const members  = resolveMembers();
    const invites  = resolveInvitations();
    const teams    = resolveTeams();
    const roles    = resolveRoles();
    return {
      workspace: {
        ...MOCK_WORKSPACE_ADMIN,
        memberCount:        members.filter(m => m.status !== "deactivated").length,
        activeMembers:      members.filter(m => m.status === "active").length,
        suspendedMembers:   members.filter(m => m.status === "suspended").length,
        pendingInvitations: invites.filter(i => i.status === "pending").length,
        teamCount:          teams.filter(t => t.status === "active").length,
        customRoleCount:    roles.filter(r => r.type === "custom" && r.status === "active").length,
      },
      attentionItems: FIXTURE_ATTENTION_ITEMS,
    };
  },

  async listWorkspaces(): Promise<WorkspaceAdminDetail[]> {
    await delay();
    return [MOCK_WORKSPACE_ADMIN, ...OTHER_WORKSPACES];
  },

  // ── Members ─────────────────────────────────────────────────────────────────

  async listMembers(query: WorkspaceMemberQuery = {}): Promise<WorkspaceMemberSummary[]> {
    await delay();
    let list = resolveMembers();

    if (query.status && query.status !== "all") {
      list = list.filter(m => m.status === query.status);
    }
    if (query.roleId && query.roleId !== "all") {
      list = list.filter(m => m.roleId === query.roleId);
    }
    if (query.teamId && query.teamId !== "all") {
      list = list.filter(m => m.teamIds.includes(query.teamId as WorkspaceTeamId));
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      list = list.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    }

    const sort = query.sort ?? "name";
    const dir  = query.dir  ?? "asc";
    list.sort((a, b) => {
      let va: string, vb: string;
      if (sort === "email")      { va = a.email;         vb = b.email; }
      else if (sort === "role")  { va = a.roleName;      vb = b.roleName; }
      else if (sort === "status"){ va = a.status;        vb = b.status; }
      else if (sort === "joinedAt") { va = a.joinedAt;   vb = b.joinedAt; }
      else if (sort === "lastActive") { va = a.lastActiveAt ?? ""; vb = b.lastActiveAt ?? ""; }
      else                       { va = a.displayName;   vb = b.displayName; }
      return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return list.map(m => ({
      id: m.id, displayName: m.displayName, email: m.email,
      avatarInitials: m.avatarInitials, status: m.status,
      roleId: m.roleId, roleName: m.roleName,
      isOwner: m.isOwner, joinedAt: m.joinedAt, lastActiveAt: m.lastActiveAt,
      demonstrationOnly: true,
    }));
  },

  async getMember(id: WorkspaceMemberId): Promise<WorkspaceMember | null> {
    await delay();
    return SESSION_MEMBERS.get(id) ?? FIXTURE_MEMBERS.find(m => m.id === id) ?? null;
  },

  async updateMemberRole(memberId: WorkspaceMemberId, roleId: WorkspaceRoleId, roleName: string): Promise<void> {
    await delay();
    const base = SESSION_MEMBERS.get(memberId) ?? FIXTURE_MEMBERS.find(m => m.id === memberId);
    if (!base) return;
    SESSION_MEMBERS.set(memberId, { ...base, roleId, roleName });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "member-role-changed",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: memberId, targetName: base.displayName,
      metadata: { from: base.roleName, to: roleName },
      occurredAt: nowIso(),
    });
  },

  async updateMemberTeams(memberId: WorkspaceMemberId, teamIds: WorkspaceTeamId[]): Promise<void> {
    await delay();
    const base = SESSION_MEMBERS.get(memberId) ?? FIXTURE_MEMBERS.find(m => m.id === memberId);
    if (!base) return;
    SESSION_MEMBERS.set(memberId, { ...base, teamIds });
  },

  async suspendMember(memberId: WorkspaceMemberId, reason: string): Promise<void> {
    await delay();
    const base = SESSION_MEMBERS.get(memberId) ?? FIXTURE_MEMBERS.find(m => m.id === memberId);
    if (!base) return;
    SESSION_MEMBERS.set(memberId, { ...base, status: "suspended", suspendedAt: nowIso(), suspendedReason: reason });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "member-suspended",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: memberId, targetName: base.displayName,
      metadata: { reason },
      occurredAt: nowIso(),
    });
  },

  async reactivateMember(memberId: WorkspaceMemberId): Promise<void> {
    await delay();
    const base = SESSION_MEMBERS.get(memberId) ?? FIXTURE_MEMBERS.find(m => m.id === memberId);
    if (!base) return;
    SESSION_MEMBERS.set(memberId, { ...base, status: "active", suspendedAt: undefined, suspendedReason: undefined, deactivatedAt: undefined });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "member-reactivated",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: memberId, targetName: base.displayName,
      occurredAt: nowIso(),
    });
  },

  async deactivateMember(memberId: WorkspaceMemberId): Promise<void> {
    await delay();
    const base = SESSION_MEMBERS.get(memberId) ?? FIXTURE_MEMBERS.find(m => m.id === memberId);
    if (!base) return;
    SESSION_MEMBERS.set(memberId, { ...base, status: "deactivated", deactivatedAt: nowIso() });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "member-deactivated",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: memberId, targetName: base.displayName,
      occurredAt: nowIso(),
    });
  },

  async removeMember(memberId: WorkspaceMemberId): Promise<void> {
    await delay();
    const base = SESSION_MEMBERS.get(memberId) ?? FIXTURE_MEMBERS.find(m => m.id === memberId);
    if (base) {
      appendActivity({
        workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "member-removed",
        actorId: "usr_mls_001", actorName: "Ana Reyes",
        targetId: memberId, targetName: base.displayName,
        occurredAt: nowIso(),
      });
    }
    SESSION_MEMBERS.set(memberId, { ...(base ?? FIXTURE_MEMBERS[0]), status: "deactivated", deactivatedAt: nowIso() });
  },

  resolveEffectivePermissions(member: WorkspaceMember): EffectivePermissionSet {
    const roles = resolveRoles();
    const role  = roles.find(r => r.id === member.roleId);
    const perms: WorkspacePermission[] = role?.permissions ?? [];
    return {
      memberId: member.id, roleId: member.roleId,
      roleName: member.roleName, permissions: perms,
      resolvedAt: nowIso(),
    };
  },

  // ── Invitations ─────────────────────────────────────────────────────────────

  async listInvitations(): Promise<WorkspaceInvitation[]> {
    await delay();
    return resolveInvitations().sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  },

  async sendInvitation(input: WorkspaceInviteInput): Promise<WorkspaceInvitation> {
    await delay();
    const roles = resolveRoles();
    const role  = roles.find(r => r.id === input.roleId);
    const id    = `inv_sess_${++invSeq}` as WorkspaceInvitationId;
    const now   = nowIso();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inv: WorkspaceInvitation = {
      id, workspaceId: MOCK_WORKSPACE_ADMIN.id,
      email: input.email, roleId: input.roleId,
      roleName: role?.name ?? "Member",
      status: "pending", sentAt: now, expiresAt: expires,
      invitedByName: "Ana Reyes",
      demonstrationOnly: true,
    };
    SESSION_INVITATIONS.set(id, inv);
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "invitation-sent",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: input.email,
      metadata: { role: inv.roleName },
      occurredAt: now,
    });
    return inv;
  },

  async resendInvitation(id: WorkspaceInvitationId): Promise<void> {
    await delay();
    const base = SESSION_INVITATIONS.get(id) ?? FIXTURE_INVITATIONS.find(i => i.id === id);
    if (!base) return;
    const now = nowIso();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    SESSION_INVITATIONS.set(id, { ...base, status: "pending", sentAt: now, expiresAt: expires });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "invitation-resent",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: base.email,
      occurredAt: now,
    });
  },

  async revokeInvitation(id: WorkspaceInvitationId): Promise<void> {
    await delay();
    const base = SESSION_INVITATIONS.get(id) ?? FIXTURE_INVITATIONS.find(i => i.id === id);
    if (!base) return;
    const now = nowIso();
    SESSION_INVITATIONS.set(id, { ...base, status: "revoked", revokedAt: now });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "invitation-revoked",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: base.email,
      occurredAt: now,
    });
  },

  // ── Teams ────────────────────────────────────────────────────────────────────

  async listTeams(includeArchived = false): Promise<WorkspaceTeamSummary[]> {
    await delay();
    let list = resolveTeams();
    if (!includeArchived) list = list.filter(t => t.status === "active");
    return list.map(t => ({
      id: t.id, name: t.name, description: t.description,
      status: t.status, memberCount: t.memberIds.length,
      demonstrationOnly: true,
    }));
  },

  async getTeam(id: WorkspaceTeamId): Promise<{ team: WorkspaceTeam; members: WorkspaceMemberSummary[] } | null> {
    await delay();
    const team = SESSION_TEAMS.get(id) ?? FIXTURE_TEAMS.find(t => t.id === id);
    if (!team) return null;
    const allMembers = resolveMembers();
    const members = team.memberIds
      .map(mid => allMembers.find(m => m.id === mid))
      .filter((m): m is WorkspaceMember => !!m)
      .map(m => ({
        id: m.id, displayName: m.displayName, email: m.email,
        avatarInitials: m.avatarInitials, status: m.status,
        roleId: m.roleId, roleName: m.roleName,
        isOwner: m.isOwner, joinedAt: m.joinedAt, lastActiveAt: m.lastActiveAt,
        demonstrationOnly: true as const,
      }));
    return { team, members };
  },

  async createTeam(input: WorkspaceTeamCreateInput): Promise<WorkspaceTeam> {
    await delay();
    const id  = `team_sess_${++teamSeq}` as WorkspaceTeamId;
    const now = nowIso();
    const team: WorkspaceTeam = {
      id, workspaceId: MOCK_WORKSPACE_ADMIN.id,
      name: input.name, description: input.description,
      status: "active", memberIds: [], memberCount: 0,
      createdAt: now, createdByName: "Ana Reyes",
      demonstrationOnly: true,
    };
    SESSION_TEAMS.set(id, team);
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "team-created",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: input.name,
      occurredAt: now,
    });
    return team;
  },

  async updateTeam(id: WorkspaceTeamId, input: Partial<WorkspaceTeamCreateInput>): Promise<void> {
    await delay();
    const base = SESSION_TEAMS.get(id) ?? FIXTURE_TEAMS.find(t => t.id === id);
    if (!base) return;
    SESSION_TEAMS.set(id, { ...base, ...input });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "team-updated",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: input.name ?? base.name,
      occurredAt: nowIso(),
    });
  },

  async addTeamMembers(teamId: WorkspaceTeamId, memberIds: WorkspaceMemberId[]): Promise<void> {
    await delay();
    const base = SESSION_TEAMS.get(teamId) ?? FIXTURE_TEAMS.find(t => t.id === teamId);
    if (!base) return;
    const merged = Array.from(new Set([...base.memberIds, ...memberIds]));
    SESSION_TEAMS.set(teamId, { ...base, memberIds: merged, memberCount: merged.length });
    for (const mid of memberIds) {
      const m = resolveMembers().find(x => x.id === mid);
      if (!m) continue;
      const newTeamIds = Array.from(new Set([...m.teamIds, teamId]));
      SESSION_MEMBERS.set(mid, { ...m, teamIds: newTeamIds });
      appendActivity({
        workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "team-member-added",
        actorId: "usr_mls_001", actorName: "Ana Reyes",
        targetId: teamId, targetName: base.name,
        metadata: { member: m.displayName },
        occurredAt: nowIso(),
      });
    }
  },

  async removeTeamMembers(teamId: WorkspaceTeamId, memberIds: WorkspaceMemberId[]): Promise<void> {
    await delay();
    const base = SESSION_TEAMS.get(teamId) ?? FIXTURE_TEAMS.find(t => t.id === teamId);
    if (!base) return;
    const filtered = base.memberIds.filter(id => !memberIds.includes(id));
    SESSION_TEAMS.set(teamId, { ...base, memberIds: filtered, memberCount: filtered.length });
    for (const mid of memberIds) {
      const m = resolveMembers().find(x => x.id === mid);
      if (!m) continue;
      SESSION_MEMBERS.set(mid, { ...m, teamIds: m.teamIds.filter(t => t !== teamId) });
      appendActivity({
        workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "team-member-removed",
        actorId: "usr_mls_001", actorName: "Ana Reyes",
        targetId: teamId, targetName: base.name,
        metadata: { member: m.displayName },
        occurredAt: nowIso(),
      });
    }
  },

  async archiveTeam(id: WorkspaceTeamId): Promise<void> {
    await delay();
    const base = SESSION_TEAMS.get(id) ?? FIXTURE_TEAMS.find(t => t.id === id);
    if (!base) return;
    SESSION_TEAMS.set(id, { ...base, status: "archived", archivedAt: nowIso() });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "team-archived",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: base.name, occurredAt: nowIso(),
    });
  },

  async restoreTeam(id: WorkspaceTeamId): Promise<void> {
    await delay();
    const base = SESSION_TEAMS.get(id) ?? FIXTURE_TEAMS.find(t => t.id === id);
    if (!base) return;
    SESSION_TEAMS.set(id, { ...base, status: "active", archivedAt: undefined });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "team-restored",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: base.name, occurredAt: nowIso(),
    });
  },

  // ── Roles ────────────────────────────────────────────────────────────────────

  async listRoles(includeArchived = false): Promise<WorkspaceRoleSummary[]> {
    await delay();
    let list = resolveRoles();
    if (!includeArchived) list = list.filter(r => r.status === "active");
    return list.map(r => ({
      id: r.id, name: r.name, type: r.type,
      status: r.status, memberCount: r.memberCount,
      isOwnerRole: r.isOwnerRole, demonstrationOnly: true,
    }));
  },

  async getRole(id: WorkspaceRoleId): Promise<WorkspaceRole | null> {
    await delay();
    return SESSION_ROLES.get(id) ?? FIXTURE_ROLES.find(r => r.id === id) ?? null;
  },

  async createRole(input: WorkspaceRoleCreateInput): Promise<WorkspaceRole> {
    await delay();
    const id  = `role_c_sess_${++roleSeq}` as WorkspaceRoleId;
    const now = nowIso();
    const role: WorkspaceRole = {
      id, workspaceId: MOCK_WORKSPACE_ADMIN.id,
      name: input.name, description: input.description,
      type: "custom", status: "active",
      permissions: input.permissions,
      memberCount: 0, isOwnerRole: false, isEditable: true,
      createdAt: now, demonstrationOnly: true,
    };
    SESSION_ROLES.set(id, role);
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "role-created",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: input.name, occurredAt: now,
    });
    return role;
  },

  async updateRole(id: WorkspaceRoleId, input: Partial<WorkspaceRoleCreateInput>): Promise<void> {
    await delay();
    const base = SESSION_ROLES.get(id) ?? FIXTURE_ROLES.find(r => r.id === id);
    if (!base || !base.isEditable) return;
    SESSION_ROLES.set(id, { ...base, ...input });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "role-updated",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: input.name ?? base.name, occurredAt: nowIso(),
    });
  },

  async archiveRole(id: WorkspaceRoleId): Promise<void> {
    await delay();
    const base = SESSION_ROLES.get(id) ?? FIXTURE_ROLES.find(r => r.id === id);
    if (!base || !base.isEditable) return;
    SESSION_ROLES.set(id, { ...base, status: "archived", archivedAt: nowIso() });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "role-archived",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: base.name, occurredAt: nowIso(),
    });
  },

  async restoreRole(id: WorkspaceRoleId): Promise<void> {
    await delay();
    const base = SESSION_ROLES.get(id) ?? FIXTURE_ROLES.find(r => r.id === id);
    if (!base) return;
    SESSION_ROLES.set(id, { ...base, status: "active", archivedAt: undefined });
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "role-restored",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      targetId: id, targetName: base.name, occurredAt: nowIso(),
    });
  },

  // ── Activity ─────────────────────────────────────────────────────────────────

  async listActivity(query: WorkspaceActivityQuery = {}): Promise<WorkspaceActivityEvent[]> {
    await delay();
    let list = resolveActivity();

    if (query.search) {
      const q = query.search.toLowerCase();
      list = list.filter(e =>
        e.actorName.toLowerCase().includes(q) ||
        (e.targetName ?? "").toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q)
      );
    }
    if (query.eventType && query.eventType !== "all") {
      list = list.filter(e => e.eventType === query.eventType);
    }
    if (query.actorId && query.actorId !== "all") {
      list = list.filter(e => e.actorId === query.actorId);
    }
    if (query.dateFrom) {
      list = list.filter(e => e.occurredAt >= query.dateFrom!);
    }
    if (query.dateTo) {
      list = list.filter(e => e.occurredAt <= query.dateTo!);
    }
    return list;
  },

  // ── Settings ─────────────────────────────────────────────────────────────────

  async getSettings(): Promise<WorkspaceSettings> {
    await delay();
    return { ...SESSION_SETTINGS.value };
  },

  async updateSettings(input: Partial<WorkspaceSettings>): Promise<void> {
    await delay();
    SESSION_SETTINGS.value = { ...SESSION_SETTINGS.value, ...input };
    appendActivity({
      workspaceId: MOCK_WORKSPACE_ADMIN.id, eventType: "workspace-settings-updated",
      actorId: "usr_mls_001", actorName: "Ana Reyes",
      occurredAt: nowIso(),
    });
  },
};
