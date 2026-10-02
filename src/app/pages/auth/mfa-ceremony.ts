// When a two-step sign-in can no longer be finished.
//
// The server ends the attempt (and clears its cookie) when it expires, when
// there is none, or after too many wrong codes. No code can work after that:
// the visitor has to enter the password again. Shared by the authenticator
// page and the recovery-code page so both stop offering a form that cannot
// succeed.

import { ApiError } from "../../services/api-client";

const ENDED = new Set(["PRE_AUTH_REQUIRED", "PRE_AUTH_EXPIRED", "MFA_ATTEMPTS_EXHAUSTED"]);

export function mfaCeremonyEnded(error: unknown): boolean {
  return error instanceof ApiError && error.body !== undefined && ENDED.has(error.body.code);
}
