// Real authentication service — talks to Lagda-Backend's /auth and /me
// routes. Session is a cookie (httpOnly, set by the backend); the client
// never touches a token directly (see api-client.ts).
//
// Verification links are path-segment tokens (`/verify-email/<code>`, not a
// query param — see Lagda-Backend/packages/application/src/notifications/
// links.ts's comment on why), so VerifyEmail.tsx reads the code from the
// route param, not from search params, when it's driven by a real email link.

import { apiRequest } from "../api-client";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  organization?: string;
  intendedUse?: string;
  consent: true;
}

/** Present only in Firebase-provider mode — see Lagda-Backend's
 *  RegisterResponseSchema/ResendVerificationResponseSchema. Absent (the
 *  default) means the backend's own delivery pipeline handles verification
 *  email, same as before this migration. */
export interface FirebaseVerificationHandoff {
  provider: "firebase";
  customToken: string;
  challengeId: string;
}

export interface RegisterResult {
  userId: string;
  email: string;
  emailVerified: boolean;
  nextAction: "verify-email";
  verificationHandoff?: FirebaseVerificationHandoff;
}

export type SignInResult =
  | { status: "authenticated"; userId: string; email: string; displayName: string; emailVerified: true }
  | { status: "mfa-required"; factor: "TOTP" };

export interface MeProfile {
  userId: string;
  email: string;
  emailVerified: boolean;
  profile: {
    fullName: string | null;
    displayName: string;
    jobTitle: string | null;
    department: string | null;
    preferredSenderName: string | null;
  };
  createdAt: string;
}

class RealAuthService {
  async register(input: RegisterInput): Promise<RegisterResult> {
    return apiRequest<RegisterResult>("/auth/register", { method: "POST", body: input });
  }

  async signIn(email: string, password: string): Promise<SignInResult> {
    return apiRequest<SignInResult>("/auth/sessions", { method: "POST", body: { email, password } });
  }

  // The code is the raw path-segment token from the emailed verification
  // link (or, for a bootstrap/manual flow, typed by the user).
  async verifyEmail(code: string): Promise<{ verified: boolean; nextAction: "sign-in" | "none" }> {
    return apiRequest("/auth/email-verifications", { method: "POST", body: { code } });
  }

  async resendVerification(email: string): Promise<{ verificationHandoff?: FirebaseVerificationHandoff }> {
    return apiRequest("/auth/email-verifications/resend", { method: "POST", body: { email } });
  }

  // POST /auth/email-verifications/firebase-finalize — Firebase-provider
  // mode only. Binds a completed Firebase action back to the LAGDA account
  // it was issued for; see Lagda-Backend's finalizeExternalEmailVerification.
  async finalizeFirebaseVerification(challengeId: string): Promise<{ verified: boolean; nextAction: "sign-in" | "none" }> {
    return apiRequest("/auth/email-verifications/firebase-finalize", {
      method: "POST", body: { challengeId },
    });
  }

  async submitMfaChallenge(
    code: string,
  ): Promise<{ status: "authenticated"; userId: string; recoveryCodesRemaining?: number }> {
    return apiRequest("/auth/mfa/verifications", { method: "POST", body: { code } });
  }

  async requestPasswordReset(email: string): Promise<void> {
    await apiRequest("/auth/password-resets", { method: "POST", body: { email } });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ passwordReset: boolean; nextAction: "sign-in" }> {
    return apiRequest("/auth/password-resets/complete", { method: "POST", body: { token, newPassword } });
  }

  async me(): Promise<MeProfile> {
    return apiRequest<MeProfile>("/me");
  }

  // POST /auth/sessions/current — the dedicated sign-out route (see
  // Lagda-Backend's identity-routes.ts IDENTITY_PATHS.signOut). Server-side
  // session revocation plus clearing both the session and CSRF cookies;
  // 204 on success, and safe to call with no session at all (still 204).
  async signOut(): Promise<void> {
    await apiRequest("/auth/sessions/current", { method: "POST" });
  }

  // ── MFA enrollment (turning MFA on, separate from the sign-in challenge) ──

  async beginMfaEnrolment(): Promise<{ provisioningUri: string; secret: string }> {
    return apiRequest("/auth/mfa/enrolments", { method: "POST" });
  }

  async confirmMfaEnrolment(code: string): Promise<{ status: "enabled"; recoveryCodes: string[] }> {
    return apiRequest("/auth/mfa/enrolments/confirm", { method: "POST", body: { code } });
  }

  async disableMfa(password: string): Promise<{ status: "disabled" }> {
    return apiRequest("/auth/mfa/enrolments/current", { method: "POST", body: { password } });
  }
}

export const realAuthService = new RealAuthService();
