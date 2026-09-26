// Workspace administration context (Command 23).
// useReducer-based state for workspace admin pages.
// Frontend-only. No real backend. Pattern mirrors ContactContext.tsx.

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type {
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
  WorkspaceMemberQuery,
  WorkspaceActivityQuery,
  WorkspaceInviteInput,
  WorkspaceTeamCreateInput,
  WorkspaceRoleCreateInput,
} from "../models/workspace-admin";
import { mockWorkspaceAdminService } from "../services/mock/workspace-admin.service";
// Real members and invitations (074). Everything else in this context stays
// mock-backed — see the real service's own header for exactly why.
import {
  realWorkspaceAdminService, type BackendWorkspaceRole,
} from "../services/real/workspace-admin.service";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { getDemoMemberAccess } from "../services/real/workspace-join.service";
import { usePlatform } from "./PlatformContext";

// ── State ─────────────────────────────────────────────────────────────────────

interface WorkspaceAdminState {
  // Overview
  workspace:       WorkspaceAdminDetail | null;
  attentionItems:  WorkspaceAttentionItem[];
  overviewLoading: boolean;
  overviewError:   string | null;

  // Members
  members:        WorkspaceMemberSummary[];
  memberQuery:    WorkspaceMemberQuery;
  membersLoading: boolean;
  membersError:   string | null;
  activeMember:   WorkspaceMember | null;
  memberLoading:  boolean;
  memberError:    string | null;

  // Invitations
  invitations:       WorkspaceInvitation[];
  invitationsLoading: boolean;
  invitationsError:  string | null;

  // Teams
  teams:        WorkspaceTeamSummary[];
  teamsLoading: boolean;
  teamsError:   string | null;
  activeTeam:   { team: WorkspaceTeam; members: WorkspaceMemberSummary[] } | null;
  teamLoading:  boolean;
  teamError:    string | null;

  // Roles
  roles:        WorkspaceRoleSummary[];
  rolesLoading: boolean;
  rolesError:   string | null;
  activeRole:   WorkspaceRole | null;
  roleLoading:  boolean;
  roleError:    string | null;

  // Activity
  activity:        WorkspaceActivityEvent[];
  activityQuery:   WorkspaceActivityQuery;
  activityLoading: boolean;
  activityError:   string | null;

  // Settings
  settings:        WorkspaceSettings | null;
  settingsLoading: boolean;
  settingsError:   string | null;

  // Action in-flight
  actionLoading: boolean;
  actionError:   string | null;
}

const INITIAL: WorkspaceAdminState = {
  workspace: null, attentionItems: [], overviewLoading: false, overviewError: null,
  members: [], memberQuery: {}, membersLoading: false, membersError: null,
  activeMember: null, memberLoading: false, memberError: null,
  invitations: [], invitationsLoading: false, invitationsError: null,
  teams: [], teamsLoading: false, teamsError: null,
  activeTeam: null, teamLoading: false, teamError: null,
  roles: [], rolesLoading: false, rolesError: null,
  activeRole: null, roleLoading: false, roleError: null,
  activity: [], activityQuery: {}, activityLoading: false, activityError: null,
  settings: null, settingsLoading: false, settingsError: null,
  actionLoading: false, actionError: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "OVERVIEW_LOADING" }
  | { type: "OVERVIEW_LOADED"; workspace: WorkspaceAdminDetail; attentionItems: WorkspaceAttentionItem[] }
  | { type: "OVERVIEW_ERROR"; error: string }
  | { type: "MEMBERS_LOADING"; query: WorkspaceMemberQuery }
  | { type: "MEMBERS_LOADED"; members: WorkspaceMemberSummary[] }
  | { type: "MEMBERS_ERROR"; error: string }
  | { type: "MEMBER_LOADING" }
  | { type: "MEMBER_LOADED"; member: WorkspaceMember }
  | { type: "MEMBER_ERROR"; error: string }
  | { type: "MEMBER_CLEAR" }
  | { type: "INVITATIONS_LOADING" }
  | { type: "INVITATIONS_LOADED"; invitations: WorkspaceInvitation[] }
  | { type: "INVITATIONS_ERROR"; error: string }
  | { type: "TEAMS_LOADING" }
  | { type: "TEAMS_LOADED"; teams: WorkspaceTeamSummary[] }
  | { type: "TEAMS_ERROR"; error: string }
  | { type: "TEAM_LOADING" }
  | { type: "TEAM_LOADED"; team: WorkspaceTeam; members: WorkspaceMemberSummary[] }
  | { type: "TEAM_ERROR"; error: string }
  | { type: "TEAM_CLEAR" }
  | { type: "ROLES_LOADING" }
  | { type: "ROLES_LOADED"; roles: WorkspaceRoleSummary[] }
  | { type: "ROLES_ERROR"; error: string }
  | { type: "ROLE_LOADING" }
  | { type: "ROLE_LOADED"; role: WorkspaceRole }
  | { type: "ROLE_ERROR"; error: string }
  | { type: "ROLE_CLEAR" }
  | { type: "ACTIVITY_LOADING"; query: WorkspaceActivityQuery }
  | { type: "ACTIVITY_LOADED"; activity: WorkspaceActivityEvent[] }
  | { type: "ACTIVITY_ERROR"; error: string }
  | { type: "SETTINGS_LOADING" }
  | { type: "SETTINGS_LOADED"; settings: WorkspaceSettings }
  | { type: "SETTINGS_ERROR"; error: string }
  | { type: "ACTION_LOADING" }
  | { type: "ACTION_DONE" }
  | { type: "ACTION_ERROR"; error: string };

function reducer(state: WorkspaceAdminState, action: Action): WorkspaceAdminState {
  switch (action.type) {
    case "OVERVIEW_LOADING": return { ...state, overviewLoading: true, overviewError: null };
    case "OVERVIEW_LOADED":  return { ...state, overviewLoading: false, workspace: action.workspace, attentionItems: action.attentionItems };
    case "OVERVIEW_ERROR":   return { ...state, overviewLoading: false, overviewError: action.error };

    case "MEMBERS_LOADING": return { ...state, membersLoading: true, membersError: null, memberQuery: action.query };
    case "MEMBERS_LOADED":  return { ...state, membersLoading: false, members: action.members };
    case "MEMBERS_ERROR":   return { ...state, membersLoading: false, membersError: action.error };
    case "MEMBER_LOADING":  return { ...state, memberLoading: true, memberError: null };
    case "MEMBER_LOADED":   return { ...state, memberLoading: false, activeMember: action.member };
    case "MEMBER_ERROR":    return { ...state, memberLoading: false, memberError: action.error };
    case "MEMBER_CLEAR":    return { ...state, activeMember: null, memberError: null };

    case "INVITATIONS_LOADING": return { ...state, invitationsLoading: true, invitationsError: null };
    case "INVITATIONS_LOADED":  return { ...state, invitationsLoading: false, invitations: action.invitations };
    case "INVITATIONS_ERROR":   return { ...state, invitationsLoading: false, invitationsError: action.error };

    case "TEAMS_LOADING": return { ...state, teamsLoading: true, teamsError: null };
    case "TEAMS_LOADED":  return { ...state, teamsLoading: false, teams: action.teams };
    case "TEAMS_ERROR":   return { ...state, teamsLoading: false, teamsError: action.error };
    case "TEAM_LOADING":  return { ...state, teamLoading: true, teamError: null };
    case "TEAM_LOADED":   return { ...state, teamLoading: false, activeTeam: { team: action.team, members: action.members } };
    case "TEAM_ERROR":    return { ...state, teamLoading: false, teamError: action.error };
    case "TEAM_CLEAR":    return { ...state, activeTeam: null, teamError: null };

    case "ROLES_LOADING": return { ...state, rolesLoading: true, rolesError: null };
    case "ROLES_LOADED":  return { ...state, rolesLoading: false, roles: action.roles };
    case "ROLES_ERROR":   return { ...state, rolesLoading: false, rolesError: action.error };
    case "ROLE_LOADING":  return { ...state, roleLoading: true, roleError: null };
    case "ROLE_LOADED":   return { ...state, roleLoading: false, activeRole: action.role };
    case "ROLE_ERROR":    return { ...state, roleLoading: false, roleError: action.error };
    case "ROLE_CLEAR":    return { ...state, activeRole: null, roleError: null };

    case "ACTIVITY_LOADING": return { ...state, activityLoading: true, activityError: null, activityQuery: action.query };
    case "ACTIVITY_LOADED":  return { ...state, activityLoading: false, activity: action.activity };
    case "ACTIVITY_ERROR":   return { ...state, activityLoading: false, activityError: action.error };

    case "SETTINGS_LOADING": return { ...state, settingsLoading: true, settingsError: null };
    case "SETTINGS_LOADED":  return { ...state, settingsLoading: false, settings: action.settings };
    case "SETTINGS_ERROR":   return { ...state, settingsLoading: false, settingsError: action.error };

    case "ACTION_LOADING": return { ...state, actionLoading: true, actionError: null };
    case "ACTION_DONE":    return { ...state, actionLoading: false };
    case "ACTION_ERROR":   return { ...state, actionLoading: false, actionError: action.error };

    default: return state;
  }
}

// ── Context value interface ───────────────────────────────────────────────────

interface WorkspaceAdminContextValue {
  state: WorkspaceAdminState;

  // Overview
  asyncLoadOverview: () => Promise<void>;

  // Members
  asyncLoadMembers:       (query?: WorkspaceMemberQuery) => Promise<void>;
  asyncLoadMember:        (id: WorkspaceMemberId) => Promise<void>;
  asyncSuspendMember:     (id: WorkspaceMemberId, reason: string) => Promise<void>;
  asyncReactivateMember:  (id: WorkspaceMemberId) => Promise<void>;
  asyncDeactivateMember:  (id: WorkspaceMemberId) => Promise<void>;
  asyncRemoveMember:      (id: WorkspaceMemberId) => Promise<void>;
  asyncUpdateMemberRole:  (id: WorkspaceMemberId, roleId: WorkspaceRoleId, roleName: string) => Promise<void>;
  asyncUpdateMemberTeams: (id: WorkspaceMemberId, teamIds: WorkspaceTeamId[]) => Promise<void>;
  clearActiveMember:      () => void;

  // Invitations
  asyncLoadInvitations:   () => Promise<void>;
  /** Resolves true when the invitation was sent. */
  asyncSendInvitation:    (input: WorkspaceInviteInput) => Promise<boolean>;
  asyncResendInvitation:  (id: WorkspaceInvitationId) => Promise<void>;
  asyncRevokeInvitation:  (id: WorkspaceInvitationId) => Promise<void>;

  // Teams
  asyncLoadTeams:         (includeArchived?: boolean) => Promise<void>;
  asyncLoadTeam:          (id: WorkspaceTeamId) => Promise<void>;
  asyncCreateTeam:        (input: WorkspaceTeamCreateInput) => Promise<void>;
  asyncUpdateTeam:        (id: WorkspaceTeamId, input: Partial<WorkspaceTeamCreateInput>) => Promise<void>;
  asyncAddTeamMembers:    (teamId: WorkspaceTeamId, memberIds: WorkspaceMemberId[]) => Promise<void>;
  asyncRemoveTeamMembers: (teamId: WorkspaceTeamId, memberIds: WorkspaceMemberId[]) => Promise<void>;
  asyncArchiveTeam:       (id: WorkspaceTeamId) => Promise<void>;
  asyncRestoreTeam:       (id: WorkspaceTeamId) => Promise<void>;
  clearActiveTeam:        () => void;

  // Roles
  asyncLoadRoles:    (includeArchived?: boolean) => Promise<void>;
  asyncLoadRole:     (id: WorkspaceRoleId) => Promise<void>;
  asyncCreateRole:   (input: WorkspaceRoleCreateInput) => Promise<void>;
  asyncUpdateRole:   (id: WorkspaceRoleId, input: Partial<WorkspaceRoleCreateInput>) => Promise<void>;
  asyncArchiveRole:  (id: WorkspaceRoleId) => Promise<void>;
  asyncRestoreRole:  (id: WorkspaceRoleId) => Promise<void>;
  clearActiveRole:   () => void;

  // Activity
  asyncLoadActivity: (query?: WorkspaceActivityQuery) => Promise<void>;

  // Settings
  asyncLoadSettings:   () => Promise<void>;
  asyncUpdateSettings: (input: Partial<WorkspaceSettings>) => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

/**
 * Mirrors `mockWorkspaceAdminService.listMembers`'s filter/sort exactly —
 * the REAL API has none of its own (an unpaginated roster, same reasoning
 * as the backend's own "list is bounded by headcount" comment), and
 * `MembersPage` trusts `state.members` to already be the filtered, sorted
 * result whichever service produced it.
 */
function filterAndSortMembers(
  all: WorkspaceMemberSummary[], query: WorkspaceMemberQuery,
): WorkspaceMemberSummary[] {
  let list = all;
  if (query.status && query.status !== "all") list = list.filter(m => m.status === query.status);
  if (query.roleId && query.roleId !== "all") list = list.filter(m => m.roleId === query.roleId);
  // No `teamId` filter: a real member carries no team assignment in this
  // batch (see the real service's header) — the filter matches nothing.
  if (query.search) {
    const q = query.search.toLowerCase();
    list = list.filter(m =>
      m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }

  const sort = query.sort ?? "name";
  const dir = query.dir ?? "asc";
  return [...list].sort((a, b) => {
    const va = sort === "email" ? a.email
      : sort === "role" ? a.roleName
      : sort === "status" ? a.status
      : sort === "joinedAt" ? a.joinedAt
      : sort === "lastActive" ? (a.lastActiveAt ?? "")
      : a.displayName;
    const vb = sort === "email" ? b.email
      : sort === "role" ? b.roleName
      : sort === "status" ? b.status
      : sort === "joinedAt" ? b.joinedAt
      : sort === "lastActive" ? (b.lastActiveAt ?? "")
      : b.displayName;
    return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}

const WorkspaceAdminContext = createContext<WorkspaceAdminContextValue | null>(null);

export function WorkspaceAdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const platform = usePlatform();
  // Real members/invitations need a real workspace id. Absent (still
  // bootstrapping, or the demo has none) falls back to the mock path below,
  // which needs no id at all.
  const workspaceId = platform.currentWorkspace?.id;
  const isReal = USE_REAL_BACKEND && workspaceId !== undefined;

  const asyncLoadOverview = useCallback(async () => {
    dispatch({ type: "OVERVIEW_LOADING" });
    try {
      const { workspace, attentionItems } = await mockWorkspaceAdminService.getWorkspace();
      dispatch({ type: "OVERVIEW_LOADED", workspace, attentionItems });
    } catch { dispatch({ type: "OVERVIEW_ERROR", error: "Failed to load workspace overview." }); }
  }, []);

  const asyncLoadMembers = useCallback(async (query: WorkspaceMemberQuery = {}) => {
    dispatch({ type: "MEMBERS_LOADING", query });
    try {
      if (isReal) {
        const all = await realWorkspaceAdminService.listMembers(workspaceId);
        // The real service has no server-side filter/sort — the roster is
        // bounded by headcount, same reasoning the backend's own "no
        // pagination" comment gives. Applied here so the SAME query object
        // the mock path honours still narrows what the page shows.
        dispatch({ type: "MEMBERS_LOADED", members: filterAndSortMembers(all, query) });
        return;
      }
      const members = await mockWorkspaceAdminService.listMembers(query);
      // Demo build: a title or privileges granted from the Members page
      // (078) live in the join service's stand-in — overlay them here.
      dispatch({
        type: "MEMBERS_LOADED",
        members: members.map(m => {
          const access = getDemoMemberAccess(m.id);
          return access ? { ...m, ...access } : m;
        }),
      });
    } catch { dispatch({ type: "MEMBERS_ERROR", error: "Failed to load members." }); }
  }, [isReal, workspaceId]);

  const asyncLoadMember = useCallback(async (id: WorkspaceMemberId) => {
    dispatch({ type: "MEMBER_LOADING" });
    try {
      if (isReal) {
        // No single-member GET on the real API; the roster is small enough
        // that a list-and-find costs nothing a dedicated route would save.
        const all = await realWorkspaceAdminService.listMembers(workspaceId);
        const member = all.find(m => m.id === id);
        if (!member) { dispatch({ type: "MEMBER_ERROR", error: "Member not found." }); return; }
        // Team membership is read and changed on the Member page itself
        // (organization units, keyed by userId) — not through `teamIds`.
        dispatch({ type: "MEMBER_LOADED", member: { ...member, workspaceId: workspaceId as never, userId: member.userId ?? "", teamIds: [], demonstrationOnly: false } });
        return;
      }
      const member = await mockWorkspaceAdminService.getMember(id);
      if (!member) { dispatch({ type: "MEMBER_ERROR", error: "Member not found." }); return; }
      dispatch({ type: "MEMBER_LOADED", member });
    } catch { dispatch({ type: "MEMBER_ERROR", error: "Failed to load member." }); }
  }, [isReal, workspaceId]);

  const asyncSuspendMember = useCallback(async (id: WorkspaceMemberId, reason: string) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.suspendMember(id, reason);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to suspend member." }); }
  }, []);

  const asyncReactivateMember = useCallback(async (id: WorkspaceMemberId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.reactivateMember(id);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to reactivate member." }); }
  }, []);

  const asyncDeactivateMember = useCallback(async (id: WorkspaceMemberId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.deactivateMember(id);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to deactivate member." }); }
  }, []);

  const asyncRemoveMember = useCallback(async (id: WorkspaceMemberId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      if (isReal) {
        await realWorkspaceAdminService.removeMember(workspaceId, id);
      } else {
        await mockWorkspaceAdminService.removeMember(id);
      }
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to remove member." }); }
  }, [isReal, workspaceId]);

  const asyncUpdateMemberRole = useCallback(async (id: WorkspaceMemberId, roleId: WorkspaceRoleId, roleName: string) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      if (isReal) {
        await realWorkspaceAdminService.changeMemberRole(
          workspaceId, id, roleId as unknown as BackendWorkspaceRole);
      } else {
        await mockWorkspaceAdminService.updateMemberRole(id, roleId, roleName);
      }
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to update role." }); }
  }, [isReal, workspaceId]);

  const asyncUpdateMemberTeams = useCallback(async (id: WorkspaceMemberId, teamIds: WorkspaceTeamId[]) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.updateMemberTeams(id, teamIds);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to update teams." }); }
  }, []);

  const asyncLoadInvitations = useCallback(async () => {
    dispatch({ type: "INVITATIONS_LOADING" });
    try {
      const invitations = isReal
        ? await realWorkspaceAdminService.listInvitations(workspaceId)
        : await mockWorkspaceAdminService.listInvitations();
      dispatch({ type: "INVITATIONS_LOADED", invitations });
    } catch { dispatch({ type: "INVITATIONS_ERROR", error: "Failed to load invitations." }); }
  }, [isReal, workspaceId]);

  const asyncSendInvitation = useCallback(async (input: WorkspaceInviteInput): Promise<boolean> => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      if (isReal) {
        // Required by the backend, not optional — a lost response must not
        // re-invite the same address on retry. One key per logical send.
        await realWorkspaceAdminService.sendInvitation(workspaceId, input, crypto.randomUUID());
      } else {
        await mockWorkspaceAdminService.sendInvitation(input);
      }
      dispatch({ type: "ACTION_DONE" });
      return true;
    } catch {
      dispatch({ type: "ACTION_ERROR", error: "Failed to send invitation." });
      return false;
    }
  }, [isReal, workspaceId]);

  const asyncResendInvitation = useCallback(async (id: WorkspaceInvitationId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      if (isReal) {
        await realWorkspaceAdminService.resendInvitation(workspaceId, id, crypto.randomUUID());
      } else {
        await mockWorkspaceAdminService.resendInvitation(id);
      }
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to resend invitation." }); }
  }, [isReal, workspaceId]);

  const asyncRevokeInvitation = useCallback(async (id: WorkspaceInvitationId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      if (isReal) {
        await realWorkspaceAdminService.revokeInvitation(workspaceId, id);
      } else {
        await mockWorkspaceAdminService.revokeInvitation(id);
      }
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to revoke invitation." }); }
  }, [isReal, workspaceId]);

  const asyncLoadTeams = useCallback(async (includeArchived = false) => {
    dispatch({ type: "TEAMS_LOADING" });
    try {
      const teams = await mockWorkspaceAdminService.listTeams(includeArchived);
      dispatch({ type: "TEAMS_LOADED", teams });
    } catch { dispatch({ type: "TEAMS_ERROR", error: "Failed to load teams." }); }
  }, []);

  const asyncLoadTeam = useCallback(async (id: WorkspaceTeamId) => {
    dispatch({ type: "TEAM_LOADING" });
    try {
      const result = await mockWorkspaceAdminService.getTeam(id);
      if (!result) { dispatch({ type: "TEAM_ERROR", error: "Team not found." }); return; }
      dispatch({ type: "TEAM_LOADED", team: result.team, members: result.members });
    } catch { dispatch({ type: "TEAM_ERROR", error: "Failed to load team." }); }
  }, []);

  const asyncCreateTeam = useCallback(async (input: WorkspaceTeamCreateInput) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.createTeam(input);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to create team." }); }
  }, []);

  const asyncUpdateTeam = useCallback(async (id: WorkspaceTeamId, input: Partial<WorkspaceTeamCreateInput>) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.updateTeam(id, input);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to update team." }); }
  }, []);

  const asyncAddTeamMembers = useCallback(async (teamId: WorkspaceTeamId, memberIds: WorkspaceMemberId[]) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.addTeamMembers(teamId, memberIds);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to add team members." }); }
  }, []);

  const asyncRemoveTeamMembers = useCallback(async (teamId: WorkspaceTeamId, memberIds: WorkspaceMemberId[]) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.removeTeamMembers(teamId, memberIds);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to remove team members." }); }
  }, []);

  const asyncArchiveTeam = useCallback(async (id: WorkspaceTeamId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.archiveTeam(id);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to archive team." }); }
  }, []);

  const asyncRestoreTeam = useCallback(async (id: WorkspaceTeamId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.restoreTeam(id);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to restore team." }); }
  }, []);

  const asyncLoadRoles = useCallback(async (includeArchived = false) => {
    dispatch({ type: "ROLES_LOADING" });
    try {
      const roles = await mockWorkspaceAdminService.listRoles(includeArchived);
      dispatch({ type: "ROLES_LOADED", roles });
    } catch { dispatch({ type: "ROLES_ERROR", error: "Failed to load roles." }); }
  }, []);

  const asyncLoadRole = useCallback(async (id: WorkspaceRoleId) => {
    dispatch({ type: "ROLE_LOADING" });
    try {
      const role = await mockWorkspaceAdminService.getRole(id);
      if (!role) { dispatch({ type: "ROLE_ERROR", error: "Role not found." }); return; }
      dispatch({ type: "ROLE_LOADED", role });
    } catch { dispatch({ type: "ROLE_ERROR", error: "Failed to load role." }); }
  }, []);

  const asyncCreateRole = useCallback(async (input: WorkspaceRoleCreateInput) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.createRole(input);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to create role." }); }
  }, []);

  const asyncUpdateRole = useCallback(async (id: WorkspaceRoleId, input: Partial<WorkspaceRoleCreateInput>) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.updateRole(id, input);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to update role." }); }
  }, []);

  const asyncArchiveRole = useCallback(async (id: WorkspaceRoleId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.archiveRole(id);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to archive role." }); }
  }, []);

  const asyncRestoreRole = useCallback(async (id: WorkspaceRoleId) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.restoreRole(id);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to restore role." }); }
  }, []);

  const asyncLoadActivity = useCallback(async (query: WorkspaceActivityQuery = {}) => {
    dispatch({ type: "ACTIVITY_LOADING", query });
    try {
      const activity = await mockWorkspaceAdminService.listActivity(query);
      dispatch({ type: "ACTIVITY_LOADED", activity });
    } catch { dispatch({ type: "ACTIVITY_ERROR", error: "Failed to load activity." }); }
  }, []);

  const asyncLoadSettings = useCallback(async () => {
    dispatch({ type: "SETTINGS_LOADING" });
    try {
      const settings = await mockWorkspaceAdminService.getSettings();
      dispatch({ type: "SETTINGS_LOADED", settings });
    } catch { dispatch({ type: "SETTINGS_ERROR", error: "Failed to load settings." }); }
  }, []);

  const asyncUpdateSettings = useCallback(async (input: Partial<WorkspaceSettings>) => {
    dispatch({ type: "ACTION_LOADING" });
    try {
      await mockWorkspaceAdminService.updateSettings(input);
      dispatch({ type: "ACTION_DONE" });
    } catch { dispatch({ type: "ACTION_ERROR", error: "Failed to update settings." }); }
  }, []);

  const value: WorkspaceAdminContextValue = {
    state,
    asyncLoadOverview,
    asyncLoadMembers, asyncLoadMember, asyncSuspendMember, asyncReactivateMember,
    asyncDeactivateMember, asyncRemoveMember, asyncUpdateMemberRole, asyncUpdateMemberTeams,
    clearActiveMember: useCallback(() => dispatch({ type: "MEMBER_CLEAR" }), []),
    asyncLoadInvitations, asyncSendInvitation, asyncResendInvitation, asyncRevokeInvitation,
    asyncLoadTeams, asyncLoadTeam, asyncCreateTeam, asyncUpdateTeam,
    asyncAddTeamMembers, asyncRemoveTeamMembers, asyncArchiveTeam, asyncRestoreTeam,
    clearActiveTeam: useCallback(() => dispatch({ type: "TEAM_CLEAR" }), []),
    asyncLoadRoles, asyncLoadRole, asyncCreateRole, asyncUpdateRole, asyncArchiveRole, asyncRestoreRole,
    clearActiveRole: useCallback(() => dispatch({ type: "ROLE_CLEAR" }), []),
    asyncLoadActivity,
    asyncLoadSettings, asyncUpdateSettings,
  };

  return (
    <WorkspaceAdminContext.Provider value={value}>
      {children}
    </WorkspaceAdminContext.Provider>
  );
}

export function useWorkspaceAdmin(): WorkspaceAdminContextValue {
  const ctx = useContext(WorkspaceAdminContext);
  if (!ctx) throw new Error("useWorkspaceAdmin must be used inside <WorkspaceAdminProvider>");
  return ctx;
}
