// A signing link lives fourteen days and is never renewed on its own. Whether
// one has ended is read from its end instant against this clock, the same way
// a deadline is. Kept apart from the service so it has no network behind it.

import type { Signatory } from "./signing-request.service";

/** True when the person is being waited on and their signing link has ended. */
export function signingLinkLapsed(signatory: Pick<Signatory, "state" | "linkExpiresAt">, now: number = Date.now()): boolean {
  if (signatory.state !== "active" || signatory.linkExpiresAt == null) return false;
  const at = Date.parse(signatory.linkExpiresAt);
  return !Number.isNaN(at) && at <= now;
}
