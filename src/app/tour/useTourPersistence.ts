// localStorage-backed, versioned persistence for the Product Tour.
// Every access is wrapped in try/catch — private browsing / disabled storage
// must never crash the app, it should just behave as "not started".

import type { TourPersistedState, TourStatus } from "./types";

const STORAGE_KEY = "lagda.productTour.v1";
const TOUR_ID = "authenticated-platform";
const TOUR_VERSION = 1;

function defaultState(): TourPersistedState {
  return { tourId: TOUR_ID, tourVersion: TOUR_VERSION, status: "not_started" };
}

export function readTourState(): TourPersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

export function writeTourState(state: TourPersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore — private browsing / storage disabled. Tour still works for the
    // current page load, it just won't remember status across reloads.
  }
}

export { TOUR_ID, TOUR_VERSION };
