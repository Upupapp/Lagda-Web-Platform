// Firebase Web client config — VERIFICATION-ONLY. See firebase-verification.ts's
// header for why this must never become the app's authentication system.
//
// CLIENT configuration only (a Firebase Web API key is not a secret the way a
// server credential is — it identifies the project, not a bearer of
// privilege; Firebase's real access control is server-side rules/Admin SDK).
// Never put Firebase Admin/service-account values here or anywhere the
// frontend bundle can see them — those live only in Lagda-Backend's own
// environment (see packages/firebase-admin's config module).

export interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
}

function readConfig(): FirebaseWebConfig | null {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim();
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim();
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim();
  const appId = (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim();

  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}

/** Null when Firebase Web config is absent — callers must fall back rather
 *  than throw, same shape as USE_REAL_BACKEND's own absence handling. */
export const FIREBASE_WEB_CONFIG: FirebaseWebConfig | null = readConfig();
