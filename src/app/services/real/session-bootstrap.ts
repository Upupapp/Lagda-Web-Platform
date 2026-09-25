// Normalizes real /me + /workspaces responses into PlatformContext's shape.
//
// AUTHORITY BOUNDARY (P1): the backend's workspace list (`GET /workspaces`)
// is the only thing that proves which workspaces this user may access — see
// workspace-bootstrap.ts for the active-workspace selection this feeds into.
// This file does not decide access; it only reshapes an already-authorized
// response for the UI models.
//
// KNOWN GAP: Lagda-Backend has no billing/subscription domain yet, so
// `subscription` stays a neutral, clearly-non-authoritative placeholder
// (never claims an active paid plan). Deferred to its own future phase.
import type {
  UserSummary, PlatformWorkspace, SubscriptionSummary, NotificationSummary, PlatformRole,
} from "../../models";
import type { MeProfile } from "./auth.service";
import { API_BASE_URL } from "../backend-flag";
import type { RealWorkspaceSummary, BackendWorkspaceRole } from "./workspace.service";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + (last ?? "")).toUpperCase();
}

// A small fixed palette, picked deterministically from the workspace id, so
// several real workspaces in the switcher are visually distinguishable
// without the backend needing to know anything about color.
const ACCENT_PALETTE = ["#0078D4", "#0891B2", "#7C3AED", "#C2410C", "#15803D", "#BE185D"];
function accentColorFor(workspaceId: string): string {
  let hash = 0;
  for (let i = 0; i < workspaceId.length; i++) hash = (hash * 31 + workspaceId.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length] ?? ACCENT_PALETTE[0]!;
}

// The backend's WorkspaceRole enum has one value ("member") with no direct
// PlatformRole equivalent — everything else maps 1:1. "member" is mapped to
// the frontend's most-restrictive role ("viewer") rather than guessed at
// more generously: understating a real permission fails safe (a control
// stays hidden), overstating one would not.
export function mapWorkspaceRole(role: BackendWorkspaceRole): PlatformRole {
  if (role === "member") return "viewer";
  return role;
}

export function buildRealUser(me: MeProfile): UserSummary {
  const displayName = me.profile.displayName || me.profile.fullName || me.email;
  const fullName = me.profile.fullName ?? displayName;
  return {
    id: me.userId, email: me.email, displayName, role: "owner",
    fullName,
    ...(me.profile.jobTitle ? { jobTitle: me.profile.jobTitle } : {}),
    ...(me.profile.department ? { department: me.profile.department } : {}),
    // The backend defaults the sender name to the full name; mirror that so
    // "what recipients see" is never blank.
    preferredSenderName: me.profile.preferredSenderName ?? fullName,
    // `?v=` is the digest: a new photo is a different URL, so the browser
    // never shows a cached old one. Same origin (the /api proxy), so the
    // session cookie authorizes it.
    ...(me.avatar === null || me.avatar === undefined || API_BASE_URL === null
      ? {}
      : { avatarUrl: `${API_BASE_URL}/me/avatar?v=${encodeURIComponent(me.avatar.version)}` }),
  };
}

// Cosmetic-only fields (plan, memberCount) are placeholders — no billing or
// membership-count domain exists backend-side yet (see file header and
// OD deferral in the P1 report). workspaceId/name/role are real.
export function normalizeWorkspace(ws: RealWorkspaceSummary): PlatformWorkspace {
  return {
    id: ws.workspaceId,
    name: ws.name,
    slug: ws.workspaceId,
    plan: "personal",
    type: "team",
    role: mapWorkspaceRole(ws.role),
    memberCount: 1,
    initials: initialsFrom(ws.name),
    accentColor: accentColorFor(ws.workspaceId),
  };
}

// No billing domain backend-side yet — a neutral placeholder rather than a
// fabricated "active" plan, so nothing claims a paid state that was never
// purchased.
export function placeholderSubscription(): SubscriptionSummary {
  return {
    plan: "personal",
    cycle: "monthly",
    status: "trialing",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    sendingRequestsUsed: 0,
    sendingRequestsLimit: null,
    storageUsedBytes: 0,
    storageLimitBytes: null,
  };
}

export function placeholderNotifications(): NotificationSummary[] {
  return [];
}
