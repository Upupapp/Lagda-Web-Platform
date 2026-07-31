// C13 — Mock authentication service.
// Deterministic by email address — no random outcomes.
// Never logs passwords, OTP codes, tokens, or sensitive values.
// Replace with RealAuthService at backend integration time.

import type {
  AuthResult, AuthScenarioResult, PendingAuthUser, MockInvitation,
} from "../../models/auth";
import { delay } from "./delay";

// ── Deterministic sign-in scenarios (by email) ────────────────────────────────
// These are development fixtures — never render passwords in production UI.

const SCENARIO_MAP: Record<string, () => AuthScenarioResult> = {
  "ana.reyes@example.com": () => ({
    success: true, scenario: "standard",
    user: { email: "ana.reyes@example.com", displayName: "Ana Reyes", authStatus: "authenticated" },
  }),
  "mfa.user@example.com": () => ({
    success: true, scenario: "mfa-challenge",
    user: { email: "mfa.user@example.com", displayName: "MFA User", authStatus: "mfa-required" },
  }),
  "new.user@example.com": () => ({
    success: true, scenario: "email-verification",
    user: { email: "new.user@example.com", displayName: "New User", authStatus: "email-verification-required" },
  }),
  "locked.user@example.com": () => ({
    success: true, scenario: "locked",
    user: { email: "locked.user@example.com", displayName: "Locked User", authStatus: "locked" },
  }),
};

// ── Mock invitation fixture ───────────────────────────────────────────────────

const MOCK_INVITATION_KEYS = ["valid", "expired", "revoked", "accepted", "mismatch"] as const;
type MockInvitationKey = typeof MOCK_INVITATION_KEYS[number];

function parseInvitationKey(raw: string): MockInvitationKey {
  // Unknown UI state params fall back to the valid invitation fixture.
  return (MOCK_INVITATION_KEYS as readonly string[]).includes(raw) ? (raw as MockInvitationKey) : "valid";
}

const MOCK_INVITATIONS: Record<MockInvitationKey, MockInvitation> = {
  valid: {
    id: "inv_mls_demo_001",
    workspaceName: "Mabini Legal Solutions",
    invitedBy: "Marco Santos",
    role: "Sender",
    invitedEmail: "invited.user@example.com",
    expiresAt: "2026-08-15",
    status: "valid",
  },
  expired: {
    id: "inv_mls_demo_002",
    workspaceName: "Mabini Legal Solutions",
    invitedBy: "Marco Santos",
    role: "Reviewer",
    invitedEmail: "invited.user@example.com",
    expiresAt: "2026-06-01",
    status: "expired",
  },
  revoked: {
    id: "inv_mls_demo_003",
    workspaceName: "Mabini Legal Solutions",
    invitedBy: "Marco Santos",
    role: "Viewer",
    invitedEmail: "invited.user@example.com",
    expiresAt: "2026-08-15",
    status: "revoked",
  },
  accepted: {
    id: "inv_mls_demo_004",
    workspaceName: "Northbridge Business Services",
    invitedBy: "Isabel Cruz",
    role: "Sender",
    invitedEmail: "invited.user@example.com",
    expiresAt: "2026-08-15",
    status: "accepted",
  },
  mismatch: {
    id: "inv_mls_demo_005",
    workspaceName: "Harborline Properties",
    invitedBy: "Ricardo Buenaventura",
    role: "Reviewer",
    invitedEmail: "different@example.com",
    expiresAt: "2026-08-15",
    status: "mismatch",
  },
};

// ── Mock fictional MFA setup data (clearly non-functional) ────────────────────

export const DEMO_MFA_SETUP_KEY = "DEMO-ONLY-NOT-A-REAL-KEY-LAGDA-2026";
export const DEMO_MFA_ACCOUNT  = "demo@lagda.io (DEMONSTRATION ONLY)";

// ── Mock recovery codes (clearly fictional) ───────────────────────────────────
// These are nonfunctional demonstration values.

export const DEMO_RECOVERY_CODES = [
  "DEMO-A1B2-C3D4",
  "DEMO-E5F6-G7H8",
  "DEMO-I9J0-K1L2",
  "DEMO-M3N4-O5P6",
  "DEMO-Q7R8-S9T0",
  "DEMO-U1V2-W3X4",
  "DEMO-Y5Z6-A7B8",
  "DEMO-C9D0-E1F2",
];

// ── Service class ─────────────────────────────────────────────────────────────

class MockAuthService {
  // Sign in — deterministic by email.
  // Password is accepted only for length validation (≥6 chars) — NEVER logged.
  async signIn(email: string, _password: string): Promise<AuthResult> {
    await delay(600);
    const normalized = email.trim().toLowerCase();

    // Trigger invalid credentials for known error test email
    if (normalized === "error@example.com" || normalized === "wrong@example.com") {
      return { success: false, errorCode: "invalid-credentials", errorMessage: "The email or password is incorrect." };
    }

    // Look up scenario
    const factory = SCENARIO_MAP[normalized];
    if (factory) return factory();

    // Default: onboarding required (new user demo scenario)
    const localPart = normalized.split("@")[0] ?? normalized;
    return {
      success: true, scenario: "onboarding",
      user: {
        email: normalized,
        displayName: localPart.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        authStatus: "onboarding-required",
      },
    };
  }

  // Email verification.
  // Code "VERIFY" → success; "EXPIRED" → expired; anything else → invalid.
  async verifyEmail(code: string): Promise<{ success: boolean; errorCode?: "invalid" | "expired" | "locked" }> {
    await delay(500);
    const upper = code.trim().toUpperCase();
    if (upper === "VERIFY") return { success: true };
    if (upper === "EXPIRED") return { success: false, errorCode: "expired" };
    if (upper === "LOCKED") return { success: false, errorCode: "locked" };
    return { success: false, errorCode: "invalid" };
  }

  // Resend verification — always succeeds in demo (no real email sent).
  async resendVerification(_email: string): Promise<void> {
    await delay(400);
    // No-op — never sends real email.
  }

  // MFA challenge.
  // "123456" → success; "000000" → locked; anything else → invalid.
  async submitMfaChallenge(code: string): Promise<{ success: boolean; errorCode?: "invalid" | "locked" }> {
    await delay(500);
    const trimmed = code.trim();
    if (trimmed === "123456") return { success: true };
    if (trimmed === "000000") return { success: false, errorCode: "locked" };
    return { success: false, errorCode: "invalid" };
  }

  // MFA setup confirmation.
  // Any 6-digit code where first digit is 1 → success (demo).
  async confirmMfaSetup(code: string): Promise<{ success: boolean; errorCode?: "invalid" }> {
    await delay(500);
    const trimmed = code.trim();
    if (/^\d{6}$/.test(trimmed) && trimmed[0] === "1") return { success: true };
    return { success: false, errorCode: "invalid" };
  }

  // Password reset request — always neutral response (privacy-preserving).
  // Email is NOT logged.
  async requestPasswordReset(_email: string): Promise<void> {
    await delay(700);
    // Neutral response — never reveals whether an account exists.
  }

  // Reset password — demo only.
  // linkState "valid" → success; anything else already handled in UI from URL param.
  async resetPassword(_newPassword: string): Promise<{ success: boolean }> {
    await delay(600);
    // Password is NOT logged. Only used for UI demonstration.
    return { success: true };
  }

  // Get invitation by UI state param (not a real token).
  async getInvitation(invParam: string): Promise<MockInvitation> {
    await delay(500);
    return MOCK_INVITATIONS[parseInvitationKey(invParam)];
  }

  // Accept invitation — demonstration only.
  async acceptInvitation(_invId: string): Promise<{ success: boolean }> {
    await delay(600);
    return { success: true };
  }

  // Decline invitation — demonstration only.
  async declineInvitation(_invId: string): Promise<{ success: boolean }> {
    await delay(400);
    return { success: true };
  }
}

// Singleton export. Replace with RealAuthService at backend integration time.
export const mockAuthService = new MockAuthService();
