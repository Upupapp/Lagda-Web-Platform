// Shared safe-return-path handling for the public → auth → authenticated
// continuation boundary. This is the single choke point that decides what
// counts as a valid `?returnTo=` destination, so it must stay conservative:
// only internal /app paths are ever honored, everything else falls back to
// the default dashboard. Centralizing this also means SignIn, VerifyEmail,
// and PlatformLayout no longer each carry a slightly different open-redirect
// guard.

export const DEFAULT_RETURN_PATH = "/app/dashboard";

// The two credential pages a signed-out visitor is sent away from and must
// come back to (078): a join link (`/join/<token>`) and an emailed workspace
// invitation (`/invitations/accept?token=<token>`). Matched exactly — one
// token of URL-safe characters, nothing after it — so neither can carry an
// open redirect.
const JOIN_RETURN = /^\/join\/[A-Za-z0-9._~-]{6,512}$/;
const INVITATION_RETURN = /^\/invitations\/accept\?token=[A-Za-z0-9._~-]{6,512}$/;

/** Whether a path is one of the credential pages above. */
export function isCredentialReturnPath(path: string): boolean {
  return JOIN_RETURN.test(path) || INVITATION_RETURN.test(path);
}

/** Validates a `returnTo`/`redirect` query value. Only /app paths (and the
 *  two credential pages above) are safe. */
export function sanitizeAppReturnTo(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_RETURN_PATH;
  try {
    const decoded = decodeURIComponent(raw);
    if (isCredentialReturnPath(decoded)) return decoded;
    return decoded.startsWith("/app") ? decoded : DEFAULT_RETURN_PATH;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}

/**
 * Validates a `returnTo` value that may point into onboarding (used by
 * VerifyEmail, which sits between account creation and the onboarding
 * wizard) in addition to /app paths.
 */
export function sanitizeOnboardingReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/onboarding/profile";
  if (raw.startsWith("/onboarding") || raw.startsWith("/app")) return raw;
  return "/onboarding/profile";
}

/** Builds the sign-in URL used to send an unauthenticated/expired visitor
 *  back through auth without losing where they were headed. */
export function buildSignInUrl(pathname: string): string {
  const safe = pathname.startsWith("/app") ? pathname : DEFAULT_RETURN_PATH;
  return `/sign-in?returnTo=${encodeURIComponent(safe)}`;
}
