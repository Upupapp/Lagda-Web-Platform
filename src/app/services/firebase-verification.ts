// Firebase Web Auth — VERIFICATION ONLY.
//
// CRITICAL BOUNDARY (P2 Firebase email-verification migration): this module
// exists to do exactly two things — sign in with a short-lived, backend-
// issued custom token just long enough to call sendEmailVerification(), and
// later apply a Firebase email-action code on the /firebase-auth/action
// page. It must NEVER become this app's authentication/session system.
//
//   - Real sign-in, session, and every authenticated request still go
//     through PlatformContext / realAuthService / the LAGDA session cookie.
//   - The Firebase custom token is NEVER persisted (no localStorage, no
//     logging) — it lives only in the call stack of the function that uses
//     it, then the Firebase session it created is signed out immediately.
//   - A DEDICATED, NAMED Firebase app instance ("lagda-verification"), never
//     the default app, so nothing else in the codebase could accidentally
//     pick up a Firebase Auth session by calling getAuth() with no app name.
//
// Server-side, LAGDA's own database remains the sole authority for whether
// an account is verified and allowed into the application — see
// Lagda-Backend's finalizeExternalEmailVerification, which re-checks
// Firebase's state itself rather than trusting anything this module reports.

import {
  initializeApp, getApps, type FirebaseApp,
} from "firebase/app";
import {
  getAuth, signInWithCustomToken, sendEmailVerification as firebaseSendEmailVerification,
  signOut, applyActionCode, type Auth,
} from "firebase/auth";
import { FIREBASE_WEB_CONFIG } from "./firebase-config";

const APP_NAME = "lagda-verification";

function getVerificationApp(): FirebaseApp | null {
  if (FIREBASE_WEB_CONFIG === null) return null;
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;
  return initializeApp(FIREBASE_WEB_CONFIG, APP_NAME);
}

function getVerificationAuth(): Auth | null {
  const app = getVerificationApp();
  return app === null ? null : getAuth(app);
}

export type FirebaseVerificationSendResult =
  | { outcome: "sent" }
  | { outcome: "unavailable" }
  | { outcome: "failed"; message: string };

/**
 * Signs in with the backend-issued custom token, sends the verification
 * email through Firebase's own infrastructure, then immediately signs back
 * out — the Firebase session this creates has no further purpose and is
 * never allowed to persist across a page load.
 *
 * `continueUrl` becomes the target of the link Firebase emails, appended
 * with Firebase's own mode/oobCode/apiKey/lang params — it MUST already be
 * a LAGDA-sanitized, allow-listed URL (see authReturnPath.ts) before it
 * reaches here; this function does not itself validate it.
 */
export async function sendFirebaseVerificationEmail(
  customToken: string,
  continueUrl: string,
): Promise<FirebaseVerificationSendResult> {
  const auth = getVerificationAuth();
  if (auth === null) return { outcome: "unavailable" };

  try {
    const credential = await signInWithCustomToken(auth, customToken);
    try {
      await firebaseSendEmailVerification(credential.user, { url: continueUrl });
      return { outcome: "sent" };
    } finally {
      // Always sign out, success or failure — this Firebase session must
      // never outlive the single call it existed for.
      await signOut(auth);
    }
  } catch {
    // Never surface Firebase's internal exception text to the UI (mission
    // §13/§23) — the caller shows a generic, truthful retry message.
    return { outcome: "failed", message: "Could not send the verification email. Please try again." };
  }
}

export type FirebaseActionApplyResult = "applied" | "invalid" | "unavailable";

/** Consumes the code — Firebase's own server marks its user verified. LAGDA's
 *  own account state is a SEPARATE, subsequent server-side call (the
 *  finalize endpoint) — this function alone never grants app access. */
export async function applyFirebaseVerificationAction(oobCode: string): Promise<FirebaseActionApplyResult> {
  const auth = getVerificationAuth();
  if (auth === null) return "unavailable";
  try {
    await applyActionCode(auth, oobCode);
    return "applied";
  } catch {
    return "invalid";
  }
}
