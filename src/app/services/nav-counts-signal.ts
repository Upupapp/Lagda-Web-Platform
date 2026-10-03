// "Something waiting on this account just changed" — the side panel's counts
// (Documents, Shared Documents, Contacts, Invitations) re-read at once instead
// of at their next heartbeat. Raised by the services that change those things
// (signing, sharing, access requests, contact requests, invitations) after
// each call, whether it succeeded or not — a failed call can still mean the
// thing was already done elsewhere. Other open tabs of the app hear it too.
//
// The `counts` topic of the live layer (services/live/topics.ts), kept under
// its old names for the services that raise it.

import { announce, changes, onTopic } from "./live/topics";

/** Tells this tab's counts, and the other tabs', to re-read now. */
export function announceNavCountsChanged(): void {
  announce("counts");
}

export function onNavCountsChanged(listener: () => void): () => void {
  return onTopic("counts", listener);
}

/** Runs `call`, then announces the change (also when it fails). */
export function changesNavCounts<T>(call: Promise<T>): Promise<T> {
  return changes("counts", call);
}
