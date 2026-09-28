// The number of PENDING workspace invitations addressed to the signed-in
// account — the bubble on the Invitations navigation row.
//
// One shared store, not one poll per component: the desktop sidebar and the
// mobile drawer can both be mounted at once, and each asking the backend
// every minute would double the traffic for the same number. The first
// subscriber starts the poll (every 60 seconds and whenever the window
// regains focus); the last one to unmount stops it.
//
// The Invitations page publishes the count itself after it loads or acts, so
// the bubble is right the moment an invitation is accepted or rejected
// rather than up to a minute later.
//
// Failure is silent and keeps the last good number: an unverified email
// (403), a network blip or a signed-out tab must never put an error in the
// navigation rail.

import { useEffect, useSyncExternalStore } from "react";
import { myInvitationsAvailable, myInvitationsService } from "../services/real/my-invitations.service";

export const INVITATION_POLL_MS = 60_000;

let count = 0;
const listeners = new Set<() => void>();
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let inflight: Promise<void> | null = null;
/** Bumped by every publish, so a slower poll never overwrites a newer number. */
let generation = 0;

function emit() { for (const l of listeners) l(); }

export function getPendingInvitationCount(): number { return count; }

/** Sets the number directly (the Invitations page knows it after loading). */
export function publishPendingInvitationCount(next: number): void {
  generation += 1;
  if (next === count) return;
  count = Math.max(0, next);
  emit();
}

/** Asks the backend now. Resolves once the number is current. */
export function refreshPendingInvitationCount(): Promise<void> {
  if (!myInvitationsAvailable()) return Promise.resolve();
  if (inflight) return inflight;
  const started = generation;
  inflight = myInvitationsService.list("pending")
    .then(items => { if (generation === started) publishPendingInvitationCount(items.length); })
    .catch(() => { /* keep the last good number */ })
    .finally(() => { inflight = null; });
  return inflight;
}

function onFocus() { void refreshPendingInvitationCount(); }
function onVisibility() { if (document.visibilityState === "visible") void refreshPendingInvitationCount(); }

function start() {
  if (!myInvitationsAvailable() || typeof window === "undefined") return;
  void refreshPendingInvitationCount();
  timer = setInterval(() => { void refreshPendingInvitationCount(); }, INVITATION_POLL_MS);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
}

function stop() {
  if (timer !== null) clearInterval(timer);
  timer = null;
  if (typeof window === "undefined") return;
  window.removeEventListener("focus", onFocus);
  document.removeEventListener("visibilitychange", onVisibility);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** For tests: forget the number and any poll in progress. */
export function resetPendingInvitationCount(): void {
  stop();
  subscribers = 0;
  count = 0;
  generation = 0;
  inflight = null;
  listeners.clear();
}

/**
 * The live pending count. `poll: false` only reads it (the page that already
 * loads the list publishes it itself).
 */
export function usePendingInvitationCount({ poll = true }: { poll?: boolean } = {}): number {
  useEffect(() => {
    if (!poll) return;
    subscribers += 1;
    if (subscribers === 1) start();
    return () => {
      subscribers -= 1;
      if (subscribers === 0) stop();
    };
  }, [poll]);
  return useSyncExternalStore(subscribe, getPendingInvitationCount, getPendingInvitationCount);
}
