// Platform session context — central state for the authenticated customer platform.
// Wraps the entire app in main.tsx so both auth and platform routes can access it.
// All data is mock/frontend-only. No real tokens, passwords, or API keys stored here.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type {
  UserSummary,
  PlatformWorkspace,
  PlatformSessionStatus,
  PlatformRole,
  PlatformPermission,
  PlatformFlags,
  NotificationSummary,
  SubscriptionSummary,
} from "../models";
import { ROLE_PERMISSIONS } from "../models";
import {
  MOCK_CURRENT_USER,
  MOCK_WORKSPACES,
  MOCK_CURRENT_WORKSPACE,
  MOCK_SUBSCRIPTION,
} from "../data/mock/workspaces";
import { MOCK_NOTIFICATIONS } from "../data/mock";
import { ACTIVE_LAUNCH_PROFILE, resolveCapability, buildCapabilityContext } from "../config/capability-resolver";
import type { LaunchProfileId, CapabilityResolution, ProductCapabilityId } from "../models/product-capability";
import { runSignOutCleanup, runWorkspaceSwitchCleanup } from "../services/session-lifecycle";
import { readJSON, writeJSON, removeKey, PERSISTENCE_KEYS } from "../services/local-persistence";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { realAuthService } from "../services/real/auth.service";
import { realWorkspaceService } from "../services/real/workspace.service";
import {
  buildRealUser, normalizeWorkspace, placeholderSubscription, placeholderNotifications,
} from "../services/real/session-bootstrap";
import { ApiError } from "../services/api-client";

// Whether the currently-loaded accessible-workspace list has produced a
// usable active workspace yet. Distinct from `sessionStatus`: identity
// (who you are) and workspace access (what you may act as) are proven by
// two different backend calls, and conflating them either flashes protected
// content before access is confirmed, or bounces a genuinely-authenticated
// zero-workspace account back to sign-in as if it weren't signed in at all.

const PROFILE_CHANNEL = "lagda-profile";

/**
 * Tells every OTHER open tab that this account's profile changed, so each
 * re-reads it. The tab that saved refreshes itself directly.
 */
export function announceProfileChanged(): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(PROFILE_CHANNEL);
    channel.postMessage("changed");
    channel.close();
  } catch { /* a browser without it simply updates on the next load */ }
}
export type WorkspaceStatus = "initializing" | "ready" | "empty" | "error";

export type RefreshSessionResult =
  | { status: "authenticated"; workspaceStatus: WorkspaceStatus }
  | { status: "unauthenticated" };

// ── Platform flags (default all active for demo) ──────────────────────────────

export const DEFAULT_PLATFORM_FLAGS: PlatformFlags = {
  dashboardEnabled:           true,
  documentsEnabled:           true,
  prepareFlowEnabled:         true,
  templatesEnabled:           true,
  contactsEnabled:            true,
  verificationEnabled:        true,
  notificationsEnabled:       true,
  teamEnabled:                true,
  billingEnabled:             true,
  integrationsEnabled:        true,
  apiEnabled:                 true,
  webhooksEnabled:            true,
  reportsEnabled:             true,
  // Automation is Enterprise Preview — off in the default launch profile, on in
  // the enterprise-preview and development profiles.
  //
  // This MUST be derived from the active profile rather than hardcoded false.
  // The `workflow-automation` capability declares `featureRequirements:
  // ["automationEnabled"]`, and the resolver checks feature flags AFTER the
  // profile allowlist. With the flag pinned false, Workflow Automation resolved
  // `unavailable-feature` in every profile including enterprise-preview — the
  // whole module was unreachable everywhere, which is exactly the failure the
  // capability system exists to prevent.
  automationEnabled:          ACTIVE_LAUNCH_PROFILE !== "launch-default",
  developmentPlaceholdersEnabled: true,

  // ── Demonstration-only surfaces, off in production ──────────────────────
  //
  // Both of these are reachable, look finished, and do nothing. They are
  // gated the same way `automationEnabled` is — derived from the active
  // profile rather than hardcoded — so they stay available in development
  // and enterprise-preview builds where demonstrating them is the point.
  //
  // My Actions (/app/inbox): twelve hardcoded fixtures with NO user matching
  // of any kind — `listAssignments` never reads the session, so every signed-in
  // user sees the same assignments addressed to the same fictional people,
  // under a footer claiming the opposite. Its "Sign Document" button links to
  // /sign/<fixture id>, and with a real backend that ID is submitted to the
  // signing-access bootstrap as though it were an access token, which returns
  // 422. That is observed in production, not theorised.
  recipientInboxEnabled:      ACTIVE_LAUNCH_PROFILE !== "launch-default",
};

// ── Context shape ─────────────────────────────────────────────────────────────

export interface PlatformContextValue {
  sessionStatus:      PlatformSessionStatus;
  workspaceStatus:    WorkspaceStatus;
  user:               UserSummary | null;
  workspaces:         PlatformWorkspace[];
  currentWorkspace:   PlatformWorkspace | null;
  subscription:       SubscriptionSummary | null;
  role:               PlatformRole | null;
  notifications:      NotificationSummary[];
  unreadCount:        number;
  flags:              PlatformFlags;

  // Launch profile + capability resolution
  activeLaunchProfile: LaunchProfileId;
  resolveCapability: (id: ProductCapabilityId | string) => CapabilityResolution;

  // Actions
  signIn: (
    user: UserSummary,
    workspaces: PlatformWorkspace[],
    currentWorkspace: PlatformWorkspace,
    subscription: SubscriptionSummary,
    notifications: NotificationSummary[],
  ) => void;
  /**
   * Real-backend only: re-derives identity + accessible workspaces from the
   * backend (GET /me, then GET /workspaces) and applies the result to this
   * context. Called once at app boot, and again by SignIn/MfaChallenge right
   * after a real sign-in succeeds — one code path for "how do we know who's
   * signed in and what they can access," instead of every call site building
   * its own copy. Returns whether a session was established.
   */
  refreshSessionFromBackend: () => Promise<RefreshSessionResult>;
  /** Real-backend only: POST /workspaces, then makes the result active. */
  createWorkspace: (name: string) => Promise<{ ok: true; workspace: PlatformWorkspace } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  switchWorkspace:            (workspaceId: string) => void;
  /**
   * Applies a rename the backend has ALREADY confirmed (PATCH
   * /workspaces/:id succeeded) to the session's workspace list, so the
   * sidebar and switcher show the new name without a full refresh.
   */
  applyWorkspaceRename:       (workspaceId: string, name: string) => void;
  markNotificationRead:       (id: string) => void;
  markAllNotificationsRead:   () => void;
  expireSession:              () => void;
  hasPermission:              (p: PlatformPermission) => boolean;
  hasFlag:                    (f: keyof PlatformFlags) => boolean;
}

// LOCAL_PERSISTENCE — a preference only, never authority (see
// PERSISTENCE_KEYS.activeWorkspaceId's own comment). Reconciled against a
// fresh GET /workspaces on every read; a value that isn't in that real list
// is discarded rather than trusted.
function readActiveWorkspaceIdPreference(): string | null {
  return readJSON<string>(PERSISTENCE_KEYS.activeWorkspaceId);
}
function writeActiveWorkspaceIdPreference(id: string): void {
  writeJSON(PERSISTENCE_KEYS.activeWorkspaceId, id);
}

/** Picks the active workspace from a REAL, already-authorized list. Never
 *  invents one: an empty list returns null, full stop. */
function selectActiveWorkspace(list: PlatformWorkspace[]): PlatformWorkspace | null {
  const first = list[0];
  if (!first) return null;
  const preferred = readActiveWorkspaceIdPreference();
  const match = preferred ? list.find((w) => w.id === preferred) : undefined;
  return match ?? first;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

// LOCAL_PERSISTENCE — see services/local-persistence.ts for removal notes.
interface PersistedPlatformSession {
  user:             UserSummary;
  workspaces:       PlatformWorkspace[];
  currentWorkspace: PlatformWorkspace;
  subscription:     SubscriptionSummary | null;
  role:             PlatformRole | null;
  notifications:    NotificationSummary[];
}

// LOCAL_PERSISTENCE — structural guard: readJSON() only protects against
// corrupt JSON, not a well-formed object saved by an earlier app version
// that no longer matches this shape. Trusting that blindly can hand `null`
// into fields the rest of the app assumes are always populated once
// "authenticated" — validate before restoring instead of crashing later.
function isUsablePlatformSession(v: unknown): v is PersistedPlatformSession {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    !!s.user && typeof (s.user as Record<string, unknown>).id === "string" &&
    Array.isArray(s.workspaces) &&
    !!s.currentWorkspace && typeof (s.currentWorkspace as Record<string, unknown>).id === "string" &&
    Array.isArray(s.notifications)
  );
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [sessionStatus, setSessionStatus] = useState<PlatformSessionStatus>("initializing");
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>("initializing");
  const [user, setUser] = useState<UserSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<PlatformWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<PlatformWorkspace | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [flags] = useState<PlatformFlags>(DEFAULT_PLATFORM_FLAGS);

  // Idempotency-Key lifecycle for createWorkspace — see that callback. One
  // key represents ONE logical "create this workspace" attempt, not one HTTP
  // call: reused across a retry of the SAME attempt (same name), replaced
  // the moment the name changes (a materially different operation) or the
  // previous attempt confirmed success. A ref, not state — it must survive
  // across retries without itself triggering a re-render.
  const pendingWorkspaceCreateRef = useRef<{ key: string; name: string } | null>(null);

  // BACKEND-AUTHORITATIVE session + workspace bootstrap (USE_REAL_BACKEND
  // only). Two entirely separate backend facts, fetched in sequence and
  // applied together: GET /me proves WHO is signed in (the httpOnly session
  // cookie is the only thing that proves that at all — nothing local ever
  // substitutes for it), and GET /workspaces proves WHAT they may access —
  // see WorkspaceStatus's own comment on why these stay distinct rather than
  // collapsing into `sessionStatus`. PlatformLayout blocks rendering
  // `/app/*` until sessionStatus leaves "initializing", so there is no flash
  // of protected content, and no flash of the wrong workspace's data either
  // (workspaceStatus only leaves "initializing" in the same pass).
  //
  // Shared with SignIn.tsx/MfaChallenge.tsx via context — one place builds
  // "authenticated identity + real workspace list", not three.
  const refreshSessionFromBackend = useCallback(async (): Promise<RefreshSessionResult> => {
    try {
      const me = await realAuthService.me();
      const nextUser = buildRealUser(me);

      let list;
      try {
        list = await realWorkspaceService.list();
      } catch {
        // Identity is proven; workspace access could not be determined right
        // now (network/server error) — a RECOVERABLE state, distinct from
        // "this account genuinely has none" (see WorkspaceStatus).
        setUser(nextUser);
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setRole(null);
        setWorkspaceStatus("error");
        setSessionStatus("authenticated");
        return { status: "authenticated", workspaceStatus: "error" };
      }

      const normalized = list.map(normalizeWorkspace);
      setUser(nextUser);
      setWorkspaces(normalized);
      let resultingStatus: WorkspaceStatus;
      if (normalized.length === 0) {
        setCurrentWorkspace(null);
        setRole(null);
        resultingStatus = "empty";
      } else {
        const active = selectActiveWorkspace(normalized);
        setCurrentWorkspace(active);
        setRole(active?.role ?? null);
        if (active) writeActiveWorkspaceIdPreference(active.id);
        resultingStatus = "ready";
      }
      setWorkspaceStatus(resultingStatus);
      setSubscription(placeholderSubscription());
      setNotifications(placeholderNotifications());
      setSessionStatus("authenticated");
      return { status: "authenticated", workspaceStatus: resultingStatus };
    } catch {
      // Any failure (401 unauthenticated, network error, etc.) means no
      // provable session — never authenticate on an assumption.
      setSessionStatus("unauthenticated");
      return { status: "unauthenticated" };
    }
  }, []);

  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    void refreshSessionFromBackend();
    // Deliberately runs once on mount only — refreshSessionFromBackend is
    // otherwise invoked explicitly (post sign-in/MFA), not on every
    // re-render of whatever identity it closes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Another tab saved the profile (name, sender name, photo): re-read it
  // here too, so every open tab shows the same person — not just the one
  // the save happened in.
  useEffect(() => {
    if (!USE_REAL_BACKEND || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(PROFILE_CHANNEL);
    channel.onmessage = () => { void refreshSessionFromBackend(); };
    return () => { channel.close(); };
  }, [refreshSessionFromBackend]);

  // LOCAL_PERSISTENCE — mock-backend only. Restores a session saved before a
  // refresh, in place of the normal "resolves to unauthenticated"
  // initialization window below. Never runs when the backend is real: the
  // effect above is that build's only source of truth.
  useEffect(() => {
    if (USE_REAL_BACKEND) return;
    let saved: PersistedPlatformSession | null = null;
    try {
      const raw = readJSON<PersistedPlatformSession>(PERSISTENCE_KEYS.platformSession);
      if (isUsablePlatformSession(raw)) saved = raw;
    } catch {
      saved = null;
    }
    if (!saved) {
      removeKey(PERSISTENCE_KEYS.platformSession); // drop whatever unusable value was there
      return;
    }
    setUser(saved.user);
    setWorkspaces(saved.workspaces);
    setCurrentWorkspace(saved.currentWorkspace);
    setSubscription(saved.subscription);
    setRole(saved.role);
    setNotifications(saved.notifications);
    setWorkspaceStatus("ready");
    setSessionStatus("authenticated");
  }, []);

  // Brief initialization window (mock backend only) — resolves to
  // unauthenticated if nothing restores a session. The real-backend effect
  // above sets its own terminal status directly instead, as soon as /me
  // resolves either way.
  useEffect(() => {
    if (USE_REAL_BACKEND) return;
    const t = setTimeout(() => {
      setSessionStatus((s) => s === "initializing" ? "unauthenticated" : s);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  // LOCAL_PERSISTENCE — mock-backend only. Real-time write-through so a
  // refresh mid-session (or mid workspace-switch, mid notification-read,
  // etc.) never silently drops back to signed-out. Only writes once actually
  // authenticated. Skipped entirely for a real backend: session authority
  // lives server-side, and re-deriving from /me on every load is what keeps
  // a stale local copy from ever being trusted.
  useEffect(() => {
    if (USE_REAL_BACKEND) return;
    if (sessionStatus !== "authenticated" || !user || !currentWorkspace) return;
    const snapshot: PersistedPlatformSession = {
      user, workspaces, currentWorkspace, subscription, role, notifications,
    };
    writeJSON(PERSISTENCE_KEYS.platformSession, snapshot);
  }, [sessionStatus, user, workspaces, currentWorkspace, subscription, role, notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const signIn = useCallback((
    u: UserSummary,
    ws: PlatformWorkspace[],
    cw: PlatformWorkspace,
    sub: SubscriptionSummary,
    notifs: NotificationSummary[],
  ) => {
    setUser(u);
    setWorkspaces(ws);
    setCurrentWorkspace(cw);
    setSubscription(sub);
    setNotifications(notifs);
    setRole(cw.role);
    setWorkspaceStatus("ready");
    setSessionStatus("authenticated");
  }, []);

  const createWorkspace = useCallback(async (
    name: string,
  ): Promise<{ ok: true; workspace: PlatformWorkspace } | { ok: false; error: string }> => {
    // Same name as the last (unfinished) attempt → this is a RETRY of that
    // same logical creation, so the same key travels with it: if the first
    // request's response was lost rather than genuinely failed, the backend
    // recognizes the key and returns the workspace it already created
    // instead of minting a second tenant with the same name. A different
    // name means the visitor changed their mind about what they're
    // creating — a new key, deliberately, since reusing the old one would
    // make the backend's dedup key the name of a DIFFERENT operation.
    const pending = pendingWorkspaceCreateRef.current;
    const idempotencyKey = pending && pending.name === name ? pending.key : crypto.randomUUID();
    pendingWorkspaceCreateRef.current = { key: idempotencyKey, name };

    try {
      const created = await realWorkspaceService.create(name, idempotencyKey);
      const ws = normalizeWorkspace({
        workspaceId: created.workspaceId, name: created.name,
        role: created.role, joinedAt: created.createdAt, createdAt: created.createdAt,
      });
      setWorkspaces((prev) => [...prev, ws]);
      setCurrentWorkspace(ws);
      setRole(ws.role);
      setWorkspaceStatus("ready");
      writeActiveWorkspaceIdPreference(ws.id);
      // Confirmed success — this logical attempt is over. The NEXT call to
      // createWorkspace (a different account, or this one creating a
      // second workspace later) must never reuse this key.
      pendingWorkspaceCreateRef.current = null;
      return { ok: true, workspace: ws };
    } catch (err) {
      // Left in place deliberately: a retry of this exact attempt (same
      // name) reuses idempotencyKey above. Only a name change or a
      // confirmed success ever clears it.
      return {
        ok: false,
        error: err instanceof ApiError
          ? err.message
          : "Something went wrong creating your workspace. Please try again.",
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (USE_REAL_BACKEND) {
      try {
        // Server-side revocation — see auth.service.ts. The backend's own
        // route clears the session/CSRF cookies itself and is safe to call
        // even if the session already lapsed (still resolves), so frontend
        // state is cleared unconditionally below regardless of outcome —
        // matching the backend's own "clear locally either way" stance on a
        // revocation call that fails outright (INV-257).
        await realAuthService.signOut();
      } catch {
        // Network failure, etc. — fall through and clear local state anyway;
        // nothing here should leave the UI claiming to still be signed in.
      }
      // The active-workspace preference is meaningless without the session
      // it was chosen under — a different account signing in next on this
      // browser should never inherit it.
      removeKey(PERSISTENCE_KEYS.activeWorkspaceId);
    }
    // Every feature that holds session state registers its own cleanup in
    // services/session-lifecycle. The shell deliberately does not name them:
    // importing eight feature services here put them, and every fixture they
    // reach, in the entry chunk for all visitors on all pages.
    runSignOutCleanup();
    removeKey(PERSISTENCE_KEYS.platformSession); // LOCAL_PERSISTENCE — mock-backend session only
    setSessionStatus("unauthenticated");
    setWorkspaceStatus("initializing");
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setSubscription(null);
    setNotifications([]);
    setRole(null);
  }, []);

  const switchWorkspace = useCallback((workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;
    runWorkspaceSwitchCleanup(ws.id);
    setCurrentWorkspace(ws);
    setRole(ws.role);
    // Switching only ever selects among workspaces THIS session already
    // fetched from the backend as accessible — it grants nothing new, so no
    // additional server round-trip is needed here, only remembering the
    // choice.
    if (USE_REAL_BACKEND) writeActiveWorkspaceIdPreference(ws.id);
    // In production: re-fetch documents, notifications, etc. for the new workspace.
    // For demo, keep existing notifications.
  }, [workspaces]);

  const applyWorkspaceRename = useCallback((workspaceId: string, name: string) => {
    const rename = (w: PlatformWorkspace): PlatformWorkspace => {
      if (w.id !== workspaceId) return w;
      const parts = name.trim().split(/\s+/).filter(Boolean);
      const initials = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
      return { ...w, name, initials: initials || w.initials };
    };
    setWorkspaces((list) => list.map(rename));
    setCurrentWorkspace((cw) => (cw ? rename(cw) : cw));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((ns) => ns.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
  }, []);

  const expireSession = useCallback(() => {
    removeKey(PERSISTENCE_KEYS.platformSession); // LOCAL_PERSISTENCE — don't resurrect on refresh
    setSessionStatus("expired");
  }, []);

  const hasPermission = useCallback((p: PlatformPermission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(p) ?? false;
  }, [role]);

  const hasFlag = useCallback((f: keyof PlatformFlags): boolean => {
    return flags[f];
  }, [flags]);

  const resolveCapabilityFn = useCallback((id: ProductCapabilityId | string): CapabilityResolution => {
    const ctx = buildCapabilityContext(
      ACTIVE_LAUNCH_PROFILE,
      role ? (ROLE_PERMISSIONS[role] ?? []) : [],
      flags as unknown as Record<string, boolean>,
    );
    return resolveCapability(id, ctx);
  }, [role, flags]);

  return (
    <PlatformContext.Provider value={{
      sessionStatus, workspaceStatus, user, workspaces, currentWorkspace, subscription, role,
      notifications, unreadCount, flags,
      activeLaunchProfile: ACTIVE_LAUNCH_PROFILE,
      resolveCapability: resolveCapabilityFn,
      signIn, refreshSessionFromBackend, createWorkspace, signOut, switchWorkspace, applyWorkspaceRename,
      markNotificationRead, markAllNotificationsRead,
      expireSession, hasPermission, hasFlag,
    }}>
      {children}
    </PlatformContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside <PlatformProvider>");
  return ctx;
}

export function usePermission(permission: PlatformPermission): boolean {
  const { hasPermission } = usePlatform();
  return hasPermission(permission);
}

export function usePlatformFlag(flag: keyof PlatformFlags): boolean {
  const { hasFlag } = usePlatform();
  return hasFlag(flag);
}

export function useCapability(id: ProductCapabilityId | string): CapabilityResolution {
  const { resolveCapability: resolve } = usePlatform();
  return resolve(id);
}

// Mock sign-in helper — loads demo data into context.
// Called from SignIn.tsx after mock form validation succeeds.
export function createMockSignInPayload() {
  return {
    user: MOCK_CURRENT_USER,
    workspaces: MOCK_WORKSPACES,
    currentWorkspace: MOCK_CURRENT_WORKSPACE,
    subscription: MOCK_SUBSCRIPTION,
    notifications: [...MOCK_NOTIFICATIONS],
  };
}
