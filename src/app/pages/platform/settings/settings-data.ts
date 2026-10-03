// One switch between the real backend and the demo build, for the settings
// sections wired in this revamp. Each page asks this module, never both
// services, so "is this section live?" is decided in one place.
//
// With a backend (USE_REAL_BACKEND) every call goes to Lagda-Backend. Without
// one — the demo build — the same calls answer from memory, reset on reload,
// and the pages say so.

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "../../../services/live/use-live-refresh";
import { SETTINGS_TTL_MS } from "../../../services/live/live-query";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import {
  realSecuritySettingsService, PASSWORD_MIN_LENGTH,
  type AccountSession, type MfaSummary, type PasswordChangeResult,
} from "../../../services/real/security-settings.service";
import {
  realNotificationPreferencesService, DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferenceKey, type NotificationPreferences,
} from "../../../services/real/notification-preferences.service";
import {
  realWorkspaceUsageService, normalizeWorkspaceUsage, type WorkspaceUsage,
} from "../../../services/real/workspace-usage.service";
import {
  realAccountSettingsService, type AccountPreferences, type PreferencesUpdate,
} from "../../../services/real/account-settings.service";
import { mockSecuritySettingsService } from "../../../services/mock/settings.service";

export const IS_LIVE = USE_REAL_BACKEND;

const wait = (ms: number) => new Promise<void>(r => { setTimeout(r, ms); });

// ── Security ───────────────────────────────────────────────────────────────

const DEMO_MFA: MfaSummary = { enabled: false, factor: null, recoveryCodesRemaining: null };

export const securityData = {
  async changePassword(current: string, next: string): Promise<PasswordChangeResult> {
    if (USE_REAL_BACKEND) return realSecuritySettingsService.changePassword(current, next);
    await wait(300);
    if (next.length < PASSWORD_MIN_LENGTH) return { ok: false, field: "new", message: "That password is too short." };
    return { ok: true, otherSessionsRevoked: 0 };
  },

  async listSessions(): Promise<AccountSession[]> {
    if (USE_REAL_BACKEND) return realSecuritySettingsService.listSessions();
    const list = await mockSecuritySettingsService.listActiveSessions();
    return list.filter(s => s.status === "active").map(s => {
      const last = Date.parse(s.lastActive);
      return {
        sessionId: s.id, createdAt: last - 3 * 86_400_000, lastSeenAt: last,
        expiresAt: last + 27 * 86_400_000, isCurrent: s.isCurrent, label: s.deviceLabel,
      };
    });
  },

  async revokeSession(sessionId: string): Promise<{ revoked: number; signedOut: boolean }> {
    if (USE_REAL_BACKEND) return realSecuritySettingsService.revokeSession(sessionId);
    await mockSecuritySettingsService.revokeSessionDemonstration(sessionId as never);
    return { revoked: 1, signedOut: false };
  },

  async revokeOtherSessions(): Promise<{ revoked: number; signedOut: boolean }> {
    if (USE_REAL_BACKEND) return realSecuritySettingsService.revokeOtherSessions();
    const r = await mockSecuritySettingsService.revokeOtherSessionsDemonstration();
    return { revoked: r.count, signedOut: false };
  },

  async getMfa(): Promise<MfaSummary> {
    if (USE_REAL_BACKEND) return realSecuritySettingsService.getMfaSummary();
    await wait(120);
    return DEMO_MFA;
  },
};

export interface SecuritySummary {
  mfa: MfaSummary | null;
  sessions: AccountSession[] | null;
  error: boolean;
}

/** MFA status and the session list, for the overview pages. */
export function useSecuritySummary(): SecuritySummary & { reload: () => void } {
  const [state, setState] = useState<SecuritySummary>({ mfa: null, sessions: null, error: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.all([securityData.getMfa(), securityData.listSessions()])
      .then(([mfa, sessions]) => { if (!cancelled) setState({ mfa, sessions, error: false }); })
      .catch(() => { if (!cancelled) setState(s => ({ ...s, error: true })); });
    return () => { cancelled = true; };
  }, [tick]);
  const reload = useCallback(() => { setTick(t => t + 1); }, []);
  return { ...state, reload };
}

// ── Notification preferences ───────────────────────────────────────────────

let demoNotifications: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };

export const notificationPreferencesData = {
  async get(): Promise<NotificationPreferences> {
    if (USE_REAL_BACKEND) return realNotificationPreferencesService.get();
    await wait(150);
    return { ...demoNotifications };
  },
  async set(key: NotificationPreferenceKey, value: boolean): Promise<NotificationPreferences | null> {
    if (USE_REAL_BACKEND) return realNotificationPreferencesService.set(key, value);
    await wait(200);
    demoNotifications = { ...demoNotifications, [key]: value, updatedAt: Date.now() };
    return { ...demoNotifications };
  },
};

// ── Preferences ────────────────────────────────────────────────────────────

export type PreferenceValues = Required<{ [K in keyof AccountPreferences]-?: NonNullable<AccountPreferences[K]> }>;

export const PREFERENCE_DEFAULTS: PreferenceValues = {
  timezone: "Asia/Manila", locale: "en-PH", language: "en",
  dateFormat: "MM/DD/YYYY", timeFormat: "12h", numberFormat: "comma-dot",
  appearance: "system", density: "comfortable", documentListView: "table",
};

/** Fills the fields the backend left null with the product's defaults. */
export function withPreferenceDefaults(p: Partial<AccountPreferences> | null | undefined): PreferenceValues {
  const out = { ...PREFERENCE_DEFAULTS } as Record<string, unknown>;
  if (p) for (const [k, v] of Object.entries(p)) if (v !== null && v !== undefined) out[k] = v;
  return out as PreferenceValues;
}

let demoPreferences: PreferenceValues = { ...PREFERENCE_DEFAULTS };

export const preferencesData = {
  async get(): Promise<PreferenceValues> {
    if (USE_REAL_BACKEND) return withPreferenceDefaults((await realAccountSettingsService.getAccount()).preferences);
    await wait(150);
    return { ...demoPreferences };
  },
  async save(update: PreferencesUpdate): Promise<PreferenceValues> {
    if (USE_REAL_BACKEND) {
      const stored = await realAccountSettingsService.savePreferences(update);
      if (stored) return withPreferenceDefaults(stored);
      return withPreferenceDefaults((await realAccountSettingsService.getAccount()).preferences);
    }
    await wait(200);
    demoPreferences = { ...demoPreferences, ...(update as Partial<PreferenceValues>) };
    return { ...demoPreferences };
  },
};

// ── Usage ──────────────────────────────────────────────────────────────────

/** The demo build's sample figures — a small, plausible workspace. */
function demoUsage(): WorkspaceUsage {
  return normalizeWorkspaceUsage({
    documents: { total: 48, uploadedThisMonth: 9 },
    signingRequests: { sentThisMonth: 12, sentTotal: 61, inProgress: 4, completedThisMonth: 8, completedTotal: 52 },
    members: 6, templates: 7, contacts: 42, verificationsThisMonth: 14, storageBytes: 186_000_000,
  });
}

export const usageData = {
  async get(workspaceId: string | null): Promise<WorkspaceUsage> {
    if (USE_REAL_BACKEND && workspaceId !== null) return realWorkspaceUsageService.get(workspaceId);
    await wait(180);
    return demoUsage();
  },
};

export function useWorkspaceUsage(workspaceId: string | null): { usage: WorkspaceUsage | null; error: boolean; reload: () => void } {
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    usageData.get(workspaceId)
      .then(u => { if (!cancelled) setUsage(u); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [workspaceId, tick]);
  const reload = useCallback(() => { setTick(t => t + 1); }, []);
  // LIVE: once a minute, and at once after a document is sent (the figures
  // on screen stay until the new ones land).
  useLiveRefresh(reload, { enabled: workspaceId !== null, every: SETTINGS_TTL_MS, topics: ["documents"] });
  return { usage, error, reload };
}

// ── Formatting ─────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${String(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1000;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i] ?? "TB"}`;
}

export function formatDate(ms: number, withTime = false): string {
  return new Date(ms).toLocaleString("en-PH", withTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${String(min)} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${String(h)} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${String(d)} day${d === 1 ? "" : "s"} ago`;
  return formatDate(ms);
}
