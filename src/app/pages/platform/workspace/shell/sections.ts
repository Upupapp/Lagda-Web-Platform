// The Workspace parts, their tabs, and which of them a person may use.
//
// The workspace is three parts — Overview, People & Teams and Activity log —
// plus Workspace settings, which sits behind the gear at the top right of the
// header and is the only part with a row of tabs (defined below, and only
// here).
//
// People & Teams replaced two parts and six tabs (People: Members, Invite
// people, Requests; Organisation: Teams, Organization units, Roles). Teams and
// organization units were the same records, so they are one tree; inviting
// and requests moved to the Invite people panel (Invitations, and a button on
// People & Teams); Roles & permissions moved behind the gear. The old paths
// redirect, so every bookmark still lands somewhere sensible.
//
// The gates decide only what is SHOWN; every page still checks for itself,
// and the backend re-checks every action. They are the gates the pages had
// before the reorganisation: nothing new is hidden or revealed.

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Network, ShieldCheck, History,
  SlidersHorizontal, Palette, CreditCard, BarChart3, Puzzle,
} from "lucide-react";
import type { WorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { isCapabilityInActiveProfile } from "../../../../config/capability-resolver";

export const WORKSPACE_ROOT = "/app/workspace";
export const WORKSPACE_SETTINGS_ROOT = `${WORKSPACE_ROOT}/settings`;

export type WorkspacePartKey = "overview" | "people" | "activity";

/** Where a tab lives: Workspace settings behind the gear. */
export type WorkspaceTabGroup = "settings";

export type WorkspaceTabKey =
  | "general" | "branding" | "billing" | "usage" | "roles" | "integrations";

/** Which figure a part or tab carries, if any. */
export type BannerCountKey = "members" | "joinRequests" | "invitations" | "joinLinks";

export interface WorkspaceTab {
  key: WorkspaceTabKey;
  group: WorkspaceTabGroup;
  label: string;
  /** What the tab is for. Shown as a tooltip. */
  hint: string;
  path: string;
  icon: LucideIcon;
  /**
   * The path segments (after /app/workspace, or after /app/workspace/settings
   * for the settings tabs) that belong to this tab. Detail pages belong to
   * their list's tab.
   */
  segments: readonly string[];
  countKey?: BannerCountKey;
  /** A non-zero count here is something waiting on the viewer, not just a total. */
  attention?: boolean;
  /** Shown only when this capability is in the active launch profile. */
  capability?: string;
  allowed: (access: WorkspaceAccess) => boolean;
}

export interface WorkspacePart {
  key: WorkspacePartKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Set on parts that are a single page; parts with tabs open their first visible tab. */
  path?: string;
  allowed?: (access: WorkspaceAccess) => boolean;
}

const always = () => true;
const w = (rest: string) => `${WORKSPACE_ROOT}/${rest}`;
const ws = (rest: string) => rest === "" ? WORKSPACE_SETTINGS_ROOT : `${WORKSPACE_SETTINGS_ROOT}/${rest}`;

export const WORKSPACE_PARTS: readonly WorkspacePart[] = [
  { key: "overview", label: "Overview", hint: "What needs attention, and your access", icon: LayoutDashboard, path: WORKSPACE_ROOT },
  { key: "people", label: "People & Teams", hint: "Your teams and the people in them", icon: Network,
    path: w("people"), allowed: a => a.can("unit.view") || a.can("membership.view") },
  { key: "activity", label: "Activity log", hint: "A record of changes to members, links, teams and settings", icon: History,
    path: w("activity"), allowed: a => a.can("activity.view") },
];

export const WORKSPACE_TABS: readonly WorkspaceTab[] = [
  // Workspace settings (the gear)
  { key: "general", group: "settings", label: "General", hint: "The workspace's name and sign-in policy", path: ws(""), icon: SlidersHorizontal,
    segments: [""], allowed: a => a.can("workspace.update") },
  { key: "branding", group: "settings", label: "Branding", hint: "Logo, colour and sender display", path: ws("branding"), icon: Palette,
    segments: ["branding"], allowed: always },
  { key: "billing", group: "settings", label: "Billing & Plan", hint: "Your plan, sample pricing and invoices", path: ws("billing"), icon: CreditCard,
    segments: ["billing"], allowed: always },
  { key: "usage", group: "settings", label: "Usage", hint: "Signing requests, documents and storage this month", path: ws("usage"), icon: BarChart3,
    segments: ["usage"], allowed: always },
  { key: "roles", group: "settings", label: "Roles & permissions", hint: "The seven roles and what each may do", path: ws("roles"), icon: ShieldCheck,
    segments: ["roles"], allowed: always },
  // Post-launch; its route is capability-guarded, so the tab is not shown
  // where the page would be a dead end.
  { key: "integrations", group: "settings", label: "Integrations", hint: "Connected apps — coming soon", path: ws("integrations"), icon: Puzzle,
    segments: ["integrations"], capability: "integrations", allowed: always },
];

/** People & Teams, and the old paths that now redirect to it. */
const PEOPLE_SEGMENTS: readonly string[] = ["people", "members", "teams", "organization", "invitations", "join-links", "join-requests", "invite"];

export interface WorkspaceLocation {
  /** The part the path is in; "settings" behind the gear; null outside the workspace. */
  part: WorkspacePartKey | "settings" | null;
  tab: WorkspaceTabKey | null;
  /** True on a detail page (a member, a team, a role, an invoice) rather than a tab's own page. */
  detail: boolean;
}

function segmentsOf(pathname: string): string[] | null {
  if (pathname !== WORKSPACE_ROOT && !pathname.startsWith(`${WORKSPACE_ROOT}/`)) return null;
  return pathname.slice(WORKSPACE_ROOT.length).split("/").filter(Boolean);
}

/** Where a workspace path sits: its part, its tab, and whether it is a detail page. */
export function locateWorkspacePath(pathname: string): WorkspaceLocation {
  const parts = segmentsOf(pathname);
  if (parts === null) return { part: null, tab: null, detail: false };
  const [first, second] = parts;
  if (first === undefined) return { part: "overview", tab: null, detail: false };
  if (first === "settings") {
    const tab = WORKSPACE_TABS.find(t => t.group === "settings" && t.segments.includes(second ?? ""));
    return { part: "settings", tab: tab?.key ?? null, detail: parts.length > 2 };
  }
  if (first === "activity") return { part: "activity", tab: null, detail: parts.length > 1 };
  if (PEOPLE_SEGMENTS.includes(first)) return { part: "people", tab: null, detail: parts.length > 1 };
  // Roles moved behind the gear; the old path redirects there.
  if (first === "roles") return { part: "settings", tab: "roles", detail: parts.length > 1 };
  return { part: null, tab: null, detail: false };
}

/** A stable key for "which page of the workspace is this", used to re-read the counts on arrival. */
export function sectionKeyForPath(pathname: string): string | null {
  const { part, tab } = locateWorkspacePath(pathname);
  return part === null ? null : tab ?? part;
}

function tabVisible(tab: WorkspaceTab, access: WorkspaceAccess): boolean {
  if (tab.capability && !isCapabilityInActiveProfile(tab.capability)) return false;
  return tab.allowed(access);
}

/**
 * The tabs of one group this person sees. The tab they are on is always
 * kept, so following a direct link never leaves the row with nothing selected.
 */
export function visibleTabs(group: WorkspaceTabGroup, access: WorkspaceAccess, current: WorkspaceTabKey | null): WorkspaceTab[] {
  return WORKSPACE_TABS.filter(t => t.group === group && (t.key === current || tabVisible(t, access)));
}

export interface VisiblePart extends WorkspacePart {
  /** Where the part opens: its own page, or its first visible tab. */
  path: string;
  tabs: WorkspaceTab[];
}

/** The parts this person sees, each with the tabs they may open. The current part is always kept. */
export function visibleParts(access: WorkspaceAccess, location: WorkspaceLocation): VisiblePart[] {
  const out: VisiblePart[] = [];
  for (const part of WORKSPACE_PARTS) {
    const current = location.part === part.key;
    if (part.path !== undefined) {
      if (current || (part.allowed ?? always)(access)) out.push({ ...part, path: part.path, tabs: [] });
      continue;
    }
    const tabs = visibleTabs("settings", access, current ? location.tab : null);
    const first = tabs[0];
    if (first) out.push({ ...part, path: first.path, tabs });
  }
  return out;
}

/** Where the gear opens: General for those who may change it, otherwise the first settings tab they may see. */
export function workspaceSettingsEntry(access: WorkspaceAccess): string {
  return visibleTabs("settings", access, null)[0]?.path ?? ws("branding");
}
