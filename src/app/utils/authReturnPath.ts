// Shared safe-return-path handling for the public → auth → authenticated
// continuation boundary. This is the single choke point that decides what
// counts as a valid `?returnTo=` destination, so it must stay conservative:
// only internal /app paths are ever honored, everything else falls back to
// the default dashboard. Centralizing this also means SignIn, VerifyEmail,
// and PlatformLayout no longer each carry a slightly different open-redirect
// guard.

export const DEFAULT_RETURN_PATH = "/app/dashboard";

/** Validates a `returnTo`/`redirect` query value. Only /app paths are safe. */
export function sanitizeAppReturnTo(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_RETURN_PATH;
  try {
    const decoded = decodeURIComponent(raw);
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
