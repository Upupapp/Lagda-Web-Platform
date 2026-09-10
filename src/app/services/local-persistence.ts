// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY pre-backend persistence scaffolding.
// ─────────────────────────────────────────────────────────────────────────────
//
// WHY THIS EXISTS: there is no backend/session-cache yet. Without this, every
// browser refresh silently threw away an in-progress sign-in, onboarding
// wizard, or document preparation draft — indistinguishable from data loss to
// the person using it. This module is the ONE place that reads/writes
// browser storage for that purpose, so the whole layer can be deleted in one
// move once a real backend session/draft API exists.
//
// TO REMOVE THIS LAYER LATER:
//   1. Delete this file.
//   2. In PlatformContext.tsx, PrepareContext.tsx, OnboardingContext.tsx:
//      remove the `readJSON(...)` hydration call in each provider's mount
//      effect, and the `writeJSON`/`removeKey` calls in their persist effects
//      and reset/signOut/discard paths. Each call site is tagged
//      `// LOCAL_PERSISTENCE` so they are grep-able:
//      `grep -rn LOCAL_PERSISTENCE src/app`.
//   3. Delete this file's entry from session-lifecycle registrations if any
//      remain.
// Nothing outside those three providers should ever import this module
// directly — keeping every call site enumerable is the point.
//
// SCOPE: this intentionally mirrors what the codebase already treated as
// safe-to-hold-in-memory (PrepFile metadata — never raw File objects/bytes;
// mock user/session fields; onboarding draft fields). It does not change
// WHAT is held, only WHERE — memory only, to memory + localStorage. No new
// category of data (passwords, tokens, file contents) is introduced.

const NAMESPACE = "lagda:local:v1:";

export const PERSISTENCE_KEYS = {
  platformSession: `${NAMESPACE}platform-session`,
  onboardingState: `${NAMESPACE}onboarding-state`,
  prepareDraft: `${NAMESPACE}prepare-draft`,
  documentsStore: `${NAMESPACE}documents-store`,
} as const;

export type PersistenceKey = (typeof PERSISTENCE_KEYS)[keyof typeof PERSISTENCE_KEYS];

function storageAvailable(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** Reads and JSON-parses a key. Returns null on any failure — corrupt JSON,
 *  a schema from an older version, or storage being unavailable must never
 *  crash the app; the caller falls back to a fresh/empty state. */
export function readJSON<T>(key: PersistenceKey): T | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Writes a value, JSON-stringified. Silently no-ops on failure (private
 *  browsing, storage quota, storage disabled) — persistence is a convenience
 *  here, not a guarantee, so a write failure must not break the feature. */
export function writeJSON<T>(key: PersistenceKey, value: T): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignored — see comment above.
  }
}

export function removeKey(key: PersistenceKey): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignored — see comment above.
  }
}

/** Clears every key this layer owns. Used on sign-out so the next visitor
 *  (or the same one signing into a different account) never inherits a
 *  previous session's persisted state from the same browser. */
export function clearAllLocalPersistence(): void {
  Object.values(PERSISTENCE_KEYS).forEach(removeKey);
}
