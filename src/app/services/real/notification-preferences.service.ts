// Personal email-notification preferences.
//
//   GET   /me/notification-preferences → NotificationPreferences
//   PATCH /me/notification-preferences { <key>: boolean } → NotificationPreferences
//
// Five switches, each an email the person may turn off. Emails that carry a
// code, a link someone must use, or a signed copy are not on this list: they
// are always sent (see ALWAYS_ON_EMAILS in the Notifications page).

import { apiRequest } from "../api-client";

export const NOTIFICATION_PREFERENCE_KEYS = [
  "signerActivity", "requestCompleted", "actionReminders", "workspaceRequests", "invitations",
] as const;

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number];

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean> & {
  /** Epoch ms of the last change, or null when the defaults were never changed. */
  readonly updatedAt: number | null;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  signerActivity: true, requestCompleted: true, actionReminders: true,
  workspaceRequests: true, invitations: true, updatedAt: null,
};

/** Reads whatever the server sent into the known shape; unknown keys are dropped. */
export function normalizeNotificationPreferences(raw: unknown): NotificationPreferences {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const out: Record<string, boolean | number | null> = {};
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    out[key] = typeof source[key] === "boolean" ? source[key] : DEFAULT_NOTIFICATION_PREFERENCES[key];
  }
  out.updatedAt = typeof source.updatedAt === "number" ? source.updatedAt : null;
  return out as NotificationPreferences;
}

class RealNotificationPreferencesService {
  async get(): Promise<NotificationPreferences> {
    return normalizeNotificationPreferences(await apiRequest<unknown>("/me/notification-preferences"));
  }

  async set(key: NotificationPreferenceKey, value: boolean): Promise<NotificationPreferences | null> {
    const result = await apiRequest<unknown>("/me/notification-preferences", {
      method: "PATCH", body: { [key]: value },
    });
    // A 204 or an unexpected body still means the write succeeded; the page
    // keeps its optimistic value then.
    return result === undefined || result === null ? null : normalizeNotificationPreferences(result);
  }
}

export const realNotificationPreferencesService = new RealNotificationPreferencesService();
