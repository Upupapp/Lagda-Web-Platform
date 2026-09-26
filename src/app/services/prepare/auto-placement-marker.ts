// "Has first-arrival auto-placement already run for this draft?"
//
// Persisted, not an in-memory ref: the Place Fields page unmounts every time
// the sender visits another step, and a ref would let the placer run again
// on return — re-adding a block the sender had just deleted. Capped so the
// list cannot grow without bound across many drafts in one browser.

import { readJSON, writeJSON, PERSISTENCE_KEYS } from "../local-persistence";

const LIMIT = 200;

function load(): string[] {
  const raw = readJSON<unknown>(PERSISTENCE_KEYS.prepareAutoPlacement);
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

export function hasAutoPlaced(draftId: string): boolean {
  return load().includes(draftId);
}

export function markAutoPlaced(draftId: string): void {
  const ids = load();
  if (ids.includes(draftId)) return;
  writeJSON(PERSISTENCE_KEYS.prepareAutoPlacement, [...ids, draftId].slice(-LIMIT));
}
