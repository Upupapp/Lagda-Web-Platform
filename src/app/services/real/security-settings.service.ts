// Real account-security service — password, sessions and the MFA summary.
//
// Talks to Lagda-Backend's account routes (packages/api/src/account/
// account-routes.ts):
//
//   POST /me/password          { currentPassword, newPassword }
//                              → 200 { status: "changed", otherSessionsRevoked }
//                              → 401 INVALID_CREDENTIALS  (current password wrong)
//                              → 422 INVALID_PASSWORD     (too short / too long)
//   GET  /me/sessions          → { sessions: [{ sessionId, createdAt, lastSeenAt,
//                                               expiresAt, isCurrent }] } (epoch ms)
//   POST /me/sessions/revoke   { sessionId? } — absent means "every other session"
//                              → { revoked, signedOut }
//                              → 404 SESSION_NOT_FOUND
//   GET  /me                   → security: { mfaEnabled, mfaFactor, recoveryCodesRemaining }
//
// The backend records no device, browser, IP or location for a session, so
// none is shown. Sign-in history is not recorded at all yet.

import { apiRequest, ApiError } from "../api-client";
import type { MeProfile } from "./auth.service";

export interface AccountSession {
  readonly sessionId: string;
  readonly createdAt: number;
  readonly lastSeenAt: number;
  readonly expiresAt: number;
  readonly isCurrent: boolean;
  /** Demo build only: the fictional device name. Never set in real mode. */
  readonly label?: string;
}

export interface MfaSummary {
  readonly enabled: boolean;
  readonly factor: "TOTP" | null;
  readonly recoveryCodesRemaining: number | null;
}

export type PasswordChangeResult =
  | { readonly ok: true; readonly otherSessionsRevoked: number }
  | { readonly ok: false; readonly field: "current" | "new" | null; readonly message: string };

export const PASSWORD_MIN_LENGTH = 8;

class RealSecuritySettingsService {
  async changePassword(currentPassword: string, newPassword: string): Promise<PasswordChangeResult> {
    try {
      const result = await apiRequest<{ status: "changed"; otherSessionsRevoked: number }>("/me/password", {
        method: "POST", body: { currentPassword, newPassword },
      });
      return { ok: true, otherSessionsRevoked: typeof result.otherSessionsRevoked === "number" ? result.otherSessionsRevoked : 0 };
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body?.code === "INVALID_CREDENTIALS" || err.status === 401) {
          return { ok: false, field: "current", message: err.body?.message ?? "That password is incorrect." };
        }
        if (err.body?.code === "INVALID_PASSWORD" || err.status === 422) {
          return { ok: false, field: "new", message: err.body?.message ?? "That password cannot be used." };
        }
        return { ok: false, field: null, message: err.message };
      }
      return { ok: false, field: null, message: "Your password could not be changed. Please try again." };
    }
  }

  async listSessions(): Promise<AccountSession[]> {
    const result = await apiRequest<{ sessions: AccountSession[] }>("/me/sessions");
    return Array.isArray(result.sessions) ? result.sessions : [];
  }

  /** Revokes one of your own sessions. */
  async revokeSession(sessionId: string): Promise<{ revoked: number; signedOut: boolean }> {
    return apiRequest("/me/sessions/revoke", { method: "POST", body: { sessionId } });
  }

  /** Signs out every session except this one. */
  async revokeOtherSessions(): Promise<{ revoked: number; signedOut: boolean }> {
    return apiRequest("/me/sessions/revoke", { method: "POST", body: {} });
  }

  async getMfaSummary(): Promise<MfaSummary> {
    const me = await apiRequest<MeProfile>("/me");
    return {
      enabled: me.security?.mfaEnabled === true,
      factor: me.security?.mfaFactor ?? null,
      recoveryCodesRemaining: typeof me.security?.recoveryCodesRemaining === "number" ? me.security.recoveryCodesRemaining : null,
    };
  }
}

export const realSecuritySettingsService = new RealSecuritySettingsService();
