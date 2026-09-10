// localStorage-backed, versioned persistence for the Product Tour.
// Every access is wrapped in try/catch — private browsing / disabled storage
// must never crash the app, it should just behave as "not started".
//
// Scoped per account (by user.id): a single shared browser used by more than
// one account must not let account A's "already seen it" leak onto account
// B's genuinely first sign-in — the tour is meant to trigger "only if new
// user", which only holds if each account tracks its own status.

import type { TourPersistedState, TourStatus } from "./types";

const STORAGE_PREFIX = "lagda.productTour.v1";
const TOUR_ID = "authenticated-platform";
const TOUR_VERSION = 1;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`;
}

function defaultState(): TourPersistedState {
  return { tourId: TOUR_ID, tourVersion: TOUR_VERSION, status: "not_started" };
}

export function readTourState(userId: string): TourPersistedState {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<TourPersistedState>;
    if (
      !parsed ||
      parsed.tourId !== TOUR_ID ||
      parsed.tourVersion !== TOUR_VERSION ||
      typeof parsed.status !== "string"
    ) {
      // Unknown/older shape — treat as a fresh tour rather than guessing.
      return defaultState();
    }
    return {
      tourId: TOUR_ID,
      tourVersion: TOUR_VERSION,
      status: parsed.status as TourStatus,
      lastStepId: parsed.lastStepId,
      completedAt: parsed.completedAt,
      skippedAt: parsed.skippedAt,
    };
  } catch {
    return defaultState();
  }
}

export function writeTourState(userId: string, state: TourPersistedState): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Ignore — private browsing / storage disabled. Tour still works for the
    // current page load, it just won't remember status across reloads.
  }
}

export { TOUR_ID, TOUR_VERSION };
