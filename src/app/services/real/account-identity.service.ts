// "Verify my identity": a person verifying their own LAGDA account, once,
// with a valid ID and a face check. Their account then shows as verified, and
// later checks need only a quick face check.
//
// Workspace realm (apiRequest: session cookie, CSRF on writes), but about the
// PERSON, not a workspace: every route is under `/me`.
//
// ── The feature may be off ─────────────────────────────────────────────────
//
// The routes exist only where account verification is offered. A 404 from
// any of them means "not offered here" and is answered with `null`: nothing
// to show, never an error to show.
//
// ── Where the result comes from ────────────────────────────────────────────
//
// The partner cannot always tell the server it has finished (a server on a
// developer's machine cannot be reached from outside). `refresh` is what
// asks the partner now and brings the account up to date, so a page that is
// waiting for a result calls it, and never depends on being told.

import { apiRequest, ApiError } from "../api-client";
import type { IdentityCheckKind } from "../../models/identity-check";

export type AccountIdentityStatus = "unverified" | "pending" | "verified" | "expired";

/** How the name read from the ID compares with the name on the profile. */
export type AccountNameMatch = "match" | "close" | "mismatch";

export interface AccountIdentity {
  /** Whether account verification is offered to this account at all. */
  available: boolean;
  status: AccountIdentityStatus;
  /** The full name read from the ID. The person's own, shown only to them. */
  verifiedName: string | null;
  verifiedAt: string | null;
  validUntil: string | null;
  /** A person at the partner is looking at it; the answer comes later. */
  pendingReview: boolean;
  /** Later checks can be a quick face check instead of the ID. */
  canUseFaceCheck: boolean;
  nameMatchesProfile: AccountNameMatch | null;
  /**
   * The last visit ended without a pass. Stays `declined` until a new visit
   * is opened or a verification stands, so on its own it does not say WHICH
   * visit: see the stale-decline guard in `useProviderSession`.
   */
  lastOutcome?: "declined" | null;
}

/** A visit to the identity verification partner's page. `url` is theirs. */
export interface ProviderSession {
  url: string;
  expiresAt: string;
  /** What this visit asks for. Absent: the full check. */
  kind?: IdentityCheckKind;
}

function isStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

/** A 404 is "not offered here", answered with null. Anything else is thrown. */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (isStatus(error, 404)) return null;
    throw error;
  }
}

class RealAccountIdentityService {
  /** Where this account stands. `null`: account verification is not offered. */
  async read(): Promise<AccountIdentity | null> {
    return orNull(apiRequest<AccountIdentity>("/me/identity"));
  }

  /**
   * Opens a visit to the partner's page. The body is the person's agreement
   * and nothing else. Refused with 409 `identity_check_unavailable`, 429 or
   * 401; a 404 is thrown too, since a visit that cannot be opened is not
   * "nothing to show".
   */
  async startSession(): Promise<ProviderSession> {
    return apiRequest<ProviderSession>("/me/identity/session", { method: "POST", body: { consent: true } });
  }

  /**
   * Asks the partner where the check stands and brings the account up to
   * date with the answer.
   *
   * NO body, on purpose: the client then sends no JSON content type either,
   * and the server answers 400 to a JSON content type with nothing after it.
   */
  async refresh(): Promise<AccountIdentity> {
    return apiRequest<AccountIdentity>("/me/identity/session/refresh", { method: "POST" });
  }

  /** Removes the verification. The account no longer shows as verified. */
  async remove(): Promise<void> {
    await apiRequest<undefined>("/me/identity", { method: "DELETE" });
  }
}

export const realAccountIdentityService = new RealAccountIdentityService();

/** Why removing the verification failed, in plain words. */
export function describeAccountIdentityError(error: unknown): string {
  if (!(error instanceof ApiError)) return "That could not be done. Try again.";
  if (error.status === 0) return "Could not reach the server. Check your connection and try again.";
  if (error.status === 401) return "Your session has ended. Sign in again to continue.";
  if (error.status === 429) return "Too many tries in a short time. Wait a minute, then try again.";
  if (error.status === 404) return "Identity verification is not available on this account yet.";
  return "That could not be done right now. Please try again.";
}
