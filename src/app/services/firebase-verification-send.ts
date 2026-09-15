// Shared helper: given a Firebase-provider handoff from register/resend,
// drive the actual Firebase email send. Used by CreateAccount.tsx (the
// first send, immediately after register) and VerifyEmail.tsx ("Resend
// email"). Kept out of both pages so the continueUrl construction rule
// lives in exactly one place.

import { sendFirebaseVerificationEmail } from "./firebase-verification";
import type { FirebaseVerificationHandoff } from "./real/auth.service";

/**
 * Builds the URL Firebase's own verification email will link to. Always a
 * same-origin, hardcoded path — never built from user input — so this can
 * never become an open redirect (mission §14/§23). `returnTo` is appended
 * as LAGDA's own query param, read (and re-sanitized) by
 * FirebaseVerificationAction.tsx, exactly like /verify-email's existing
 * returnTo handling.
 */
function buildContinueUrl(challengeId: string, returnTo: string): string {
  const url = new URL("/firebase-auth/action", window.location.origin);
  // The LAGDA-side binding context — an opaque id, not a bearer secret (see
  // Lagda-Backend's finalizeExternalEmailVerification comment on why: it
  // proves nothing by itself, only together with Firebase's own
  // independently-confirmed emailVerified state).
  url.searchParams.set("challengeId", challengeId);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

/**
 * Fire-and-forget from the caller's perspective in the sense that a failure
 * here must never be presented as "registration/resend failed" (mission
 * §8) — the LAGDA account or challenge rotation already succeeded by the
 * time this runs. Callers surface `sent: false` as a soft, retryable
 * notice (same wording style as the existing "Resend email" affordance),
 * never a hard error.
 */
export async function driveFirebaseVerificationSend(
  handoff: FirebaseVerificationHandoff,
  returnTo: string,
): Promise<{ sent: boolean }> {
  const result = await sendFirebaseVerificationEmail(
    handoff.customToken, buildContinueUrl(handoff.challengeId, returnTo),
  );
  return { sent: result.outcome === "sent" };
}
