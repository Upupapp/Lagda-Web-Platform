// The Manage sections, in banner order, and which of them a person may use.
//
// The gates are the ones the overview hub has always used to decide which
// links to show — moved here so the banners and the hub cannot disagree.
// They decide only what is SHOWN; every page still checks for itself, and
// the backend re-checks every action.

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Users, UserPlus, Link2, Mail, Network, ShieldCheck, Files, History, SlidersHorizontal,
} from "lucide-react";
import type { WorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";

export const WORKSPACE_ROOT = "/app/workspace";

export type WorkspaceSectionKey =
  | "overview" | "members" | "join-requests" | "join-links" | "invitations"
  | "teams" | "roles" | "documents" | "activity" | "settings";

/** Which banner figure a section carries, if any. */
export type BannerCountKey = "members" | "joinRequests" | "invitations" | "joinLinks";

export interface WorkspaceSection {
  key: WorkspaceSectionKey;
  /** The banner's label. Short enough for a 70px card. */
  label: string;
  /** What the section is for, in the words the hub used. Shown as a tooltip. */
  hint: string;
  path: string;
  icon: LucideIcon;
  countKey?: BannerCountKey;
  /** A non-zero count here is something waiting on the viewer, not just a total. */
  attention?: boolean;
  allowed: (access: WorkspaceAccess) => boolean;
}

const always = () => true;

export const WORKSPACE_SECTIONS: readonly WorkspaceSection[] = [
  { key: "overview", label: "Overview", hint: "What needs attention, and your access", path: WORKSPACE_ROOT, icon: LayoutDashboard, allowed: always },
  { key: "members", label: "Members", hint: "Who is in this workspace", path: `${WORKSPACE_ROOT}/members`, icon: Users, countKey: "members",
    allowed: a => a.can("membership.view") },
  { key: "join-requests", label: "Join requests", hint: "People waiting for you to approve or decline them", path: `${WORKSPACE_ROOT}/join-requests`, icon: UserPlus,
    countKey: "joinRequests", attention: true, allowed: a => a.can("membership.role.change") },
  { key: "join-links", label: "Join links", hint: "Single-use links that let someone ask to join", path: `${WORKSPACE_ROOT}/join-links`, icon: Link2,
    countKey: "joinLinks", allowed: a => a.can("invitation.view") },
  { key: "invitations", label: "Invitations", hint: "People invited by email who have not joined yet", path: `${WORKSPACE_ROOT}/invitations`, icon: Mail,
    countKey: "invitations", allowed: a => a.can("invitation.view") },
  { key: "teams", label: "Teams", hint: "Departments, offices and other groups of members", path: `${WORKSPACE_ROOT}/teams`, icon: Network,
    allowed: a => a.can("unit.view") },
  { key: "roles", label: "Roles", hint: "Who can do what", path: `${WORKSPACE_ROOT}/roles`, icon: ShieldCheck, allowed: always },
  { key: "documents", label: "Documents", hint: "All workspace documents", path: `${WORKSPACE_ROOT}/documents`, icon: Files,
    allowed: a => a.can("document.view") && a.can("membership.role.change") },
  { key: "activity", label: "Activity", hint: "A record of changes to members, links, teams and settings", path: `${WORKSPACE_ROOT}/activity`, icon: History,
    allowed: a => a.can("activity.view") },
  { key: "settings", label: "Settings", hint: "The workspace's name and sign-in policy", path: `${WORKSPACE_ROOT}/settings`, icon: SlidersHorizontal,
    allowed: a => a.can("workspace.update") },
];

/** The section a Manage path belongs to. Detail pages belong to their list's section. */
export function sectionKeyForPath(pathname: string): WorkspaceSectionKey | null {
  if (pathname !== WORKSPACE_ROOT && !pathname.startsWith(`${WORKSPACE_ROOT}/`)) return null;
  const first = pathname.slice(WORKSPACE_ROOT.length).split("/").filter(Boolean)[0];
  if (first === undefined) return "overview";
  return WORKSPACE_SECTIONS.find(s => s.key === first)?.key ?? null;
}

/** True on a detail page (a member, a team, a role) rather than a section's own page. */
export function isSectionDetailPath(pathname: string): boolean {
  if (!pathname.startsWith(`${WORKSPACE_ROOT}/`)) return false;
  return pathname.slice(WORKSPACE_ROOT.length).split("/").filter(Boolean).length > 1;
}

/**
 * The banners this person sees. The section they are on is always kept, so
 * following a direct link never leaves the row with nothing selected.
 */
export function visibleSections(access: WorkspaceAccess, current: WorkspaceSectionKey | null): WorkspaceSection[] {
  return WORKSPACE_SECTIONS.filter(s => s.key === current || s.allowed(access));
}
