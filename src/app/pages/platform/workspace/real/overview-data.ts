// The Manage figures a real workspace can show: its name, the caller's own
// membership, and the counts behind the overview and the section banners.
//
// One loader, two readers. The workspace shell loads these once for its
// header and banner counts and shares them with the Overview section through
// context, so opening the overview never repeats the same six requests. The
// overview still loads for itself when it is rendered outside the shell.
//
// Every count is asked for only when the person's role may read it: a call
// the backend would refuse with its hidden 404 is never made.

import { useEffect, useState } from "react";
import type { WorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { realWorkspaceService } from "../../../../services/real/workspace.service";
import { realWorkspaceAdminService } from "../../../../services/real/workspace-admin.service";
import { realOrganizationService } from "../../../../services/real/organization.service";
import { listJoinRequests, listJoinTickets, type JoinRequest } from "../../../../services/real/workspace-join.service";
import type { WorkspaceMemberSummary, WorkspaceInvitation } from "../../../../models/workspace-admin";

/** A number that failed to load reads "—", never a made-up zero. `null` is still loading. */
export type Count = number | null | "error";

export interface OverviewData {
  name: string | null;
  createdAt: number | null;
  me: WorkspaceMemberSummary | null;
  members: Count;
  pendingRequests: JoinRequest[] | null | "error";
  invitations: WorkspaceInvitation[] | null | "error";
  activeLinks: Count;
  teams: Count;
}

export const EMPTY_OVERVIEW: OverviewData = {
  name: null, createdAt: null, me: null, members: null, pendingRequests: null,
  invitations: null, activeLinks: null, teams: null,
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

export interface OverviewGates {
  members: boolean;
  manageMembers: boolean;
  invitations: boolean;
  teams: boolean;
}

export function overviewGates(access: WorkspaceAccess): OverviewGates {
  return {
    members: access.can("membership.view"),
    manageMembers: access.can("membership.role.change"),
    invitations: access.can("invitation.view"),
    teams: access.can("unit.view"),
  };
}

/**
 * Loads the figures. `enabled: false` makes no request at all (the overview
 * inside the shell reads the shell's copy instead). Changing `refreshKey`
 * re-reads in place: the previous figures stay on screen until the new ones
 * land, so a banner count never blinks back to "…".
 */
export function useRealOverviewData(
  workspaceId: string, gates: OverviewGates, enabled: boolean, refreshKey: string | number = 0,
): OverviewData {
  const [data, setData] = useState<OverviewData>(EMPTY_OVERVIEW);
  const { members, manageMembers, invitations, teams } = gates;

  useEffect(() => {
    if (!enabled) return;
    const signal = { cancelled: false };
    const set = (patch: Partial<OverviewData>) => { if (!signal.cancelled) setData(d => ({ ...d, ...patch })); };
    realWorkspaceService.get(workspaceId)
      .then(ws => { set({ name: ws.name, createdAt: ws.createdAt }); })
      .catch(() => { /* the session's name stands in */ });
    if (members) {
      realWorkspaceAdminService.listMembers(workspaceId)
        .then(list => { set({ members: list.length, me: list.find(m => m.isCurrentUser) ?? null }); })
        .catch(() => { set({ members: "error" }); });
    }
    if (manageMembers) {
      listJoinRequests(workspaceId, "pending")
        .then(list => { set({ pendingRequests: list.filter(r => r.state === "pending").sort((a, b) => a.createdAt - b.createdAt) }); })
        .catch(() => { set({ pendingRequests: "error" }); });
    }
    if (invitations) {
      realWorkspaceAdminService.listInvitations(workspaceId)
        .then(list => { set({ invitations: list }); })
        .catch(() => { set({ invitations: "error" }); });
      listJoinTickets(workspaceId)
        .then(list => { set({ activeLinks: list.filter(t => t.state === "sent" && t.usedAt === null && t.request === null).length }); })
        .catch(() => { set({ activeLinks: "error" }); });
    }
    if (teams) {
      realOrganizationService.listUnits(workspaceId)
        .then(list => { set({ teams: list.filter(u => u.archivedAt === null).length }); })
        .catch(() => { set({ teams: "error" }); });
    }
    return () => { signal.cancelled = true; };
  }, [enabled, workspaceId, members, manageMembers, invitations, teams, refreshKey]);

  return data;
}

export function pendingInvitationsOf(data: OverviewData): WorkspaceInvitation[] {
  return Array.isArray(data.invitations) ? data.invitations.filter(i => i.status === "pending") : [];
}

export function pendingRequestsOf(data: OverviewData): JoinRequest[] {
  return Array.isArray(data.pendingRequests) ? data.pendingRequests : [];
}

/** The four figures the section banners carry. */
export interface BannerCounts {
  members: Count;
  joinRequests: Count;
  invitations: Count;
  joinLinks: Count;
}

export function bannerCountsOf(data: OverviewData): BannerCounts {
  return {
    members: data.members,
    joinRequests: data.pendingRequests === null ? null
      : data.pendingRequests === "error" ? "error" : pendingRequestsOf(data).length,
    invitations: data.invitations === null ? null
      : data.invitations === "error" ? "error" : pendingInvitationsOf(data).length,
    joinLinks: data.activeLinks,
  };
}
