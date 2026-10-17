// Shared safe-return-path handling for the public → auth → authenticated
// continuation boundary. This is the single choke point that decides what
// counts as a valid `?returnTo=` destination, so it must stay conservative:
// only internal /app paths are ever honored, everything else falls back to
// the default dashboard. Centralizing this also means SignIn, VerifyEmail,
// and PlatformLayout no longer each carry a slightly different open-redirect
// guard.

export const DEFAULT_RETURN_PATH = "/app/dashboard";

// The credential pages a signed-out visitor is sent away from and must come
// back to (078): a join link (`/join/<token>`), an emailed workspace
// invitation (`/invitations/accept?token=<token>`) and a notary invitation
// (below). Matched exactly — one
// token of URL-safe characters, nothing after it — so neither can carry an
// open redirect.
const JOIN_RETURN = /^\/join\/[A-Za-z0-9._~-]{6,512}$/;
const INVITATION_RETURN = /^\/invitations\/accept\?token=[A-Za-z0-9._~-]{6,512}$/;

// The link a client gives a notary (`/enotary/invite/<secret>`, notary on-ramp).
// The secret is exactly 43 base64url characters (32 random bytes), so nothing
// shorter, longer or with a further segment can ride on it.
export const NOTARY_INVITE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const NOTARY_INVITE_RETURN = /^\/enotary\/invite\/[A-Za-z0-9_-]{43}$/;

/** The address of a notary invitation, or null where the token is not one. */
export function notaryInvitePath(token: string): string | null {
  return NOTARY_INVITE_TOKEN.test(token) ? `/enotary/invite/${token}` : null;
}

/** Whether a path is one of the credential pages above. */
export function isCredentialReturnPath(path: string): boolean {
  return JOIN_RETURN.test(path) || INVITATION_RETURN.test(path) || NOTARY_INVITE_RETURN.test(path);
}

// The static Notary Directory (config/enotary-directory), the one way back
// that is not a page of this app: its own address, optionally with the notary
// a visitor chose (`?select=<id>`, lowercase letters, digits and hyphens).
// Matched exactly, so nothing else outside /app can ride on it.
const DIRECTORY_RETURN = /^\/enotary-directory\/(?:\?select=[a-z0-9-]{1,80})?$/;

/**
 * Whether a (sanitized) return path is a static page outside the React
 * router, which must be reached with a full page load. Only the Notary
 * Directory is.
 */
export function isFullLoadReturnPath(path: string): boolean {
  return DIRECTORY_RETURN.test(path);
}

/**
 * Continues to a sanitized return path: a full page load for the static
 * Notary Directory, the router's own navigation for everything else.
 */
export function continueToReturnPath(
  path: string,
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => unknown,
  options?: { replace?: boolean; state?: unknown },
): void {
  if (isFullLoadReturnPath(path)) {
    window.location.assign(path);
    return;
  }
  void navigate(path, options);
}

/** Validates a `returnTo`/`redirect` query value. Only /app paths (and the
 *  two credential pages and the Notary Directory above) are safe. */
export function sanitizeAppReturnTo(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_RETURN_PATH;
  try {
    const decoded = decodeURIComponent(raw);
    if (isCredentialReturnPath(decoded)) return decoded;
    if (isFullLoadReturnPath(decoded)) return decoded;
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
/**
 * Set while a DELIBERATE sign-out is in flight.
 *
 * Signing out flips the session to "unauthenticated" while the person is
 * still on an /app page, and the route guards answer that the way they answer
 * an expired session: by sending them to sign-in with `returnTo` set to the
 * page they were on. That ran before the sign-out flow's own navigation, so a
 * sign-out from the Password page ended on /sign-in?returnTo=…/password, and
 * whoever signed in next in that tab, on ANY account, was dropped on that page.
 *
 * `returnTo` is for someone who did not choose to leave: an expired session,
 * or a signed-out visitor opening a deep link. A short window, not a flag to
 * clear: nothing has to remember to reset it, and a sign-in minutes later is
 * unaffected.
 */
let deliberateSignOutUntil = 0;
export function noteDeliberateSignOut(now: number = Date.now()): void {
  deliberateSignOutUntil = now + 15_000;
}

export function buildSignInUrl(pathname: string, now: number = Date.now()): string {
  if (now < deliberateSignOutUntil) return "/sign-in";
  const safe = pathname.startsWith("/app") ? pathname : DEFAULT_RETURN_PATH;
  return `/sign-in?returnTo=${encodeURIComponent(safe)}`;
}
