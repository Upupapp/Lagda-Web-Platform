// Tracks which real backend documents have completed at least one successful
// push, per collection ("participants" | "fields"). This is the fix for
// "authoritative empty state" vs "never synced": a GET returning an empty
// list is only trustworthy once we know a push has actually happened for
// that document — otherwise a brand-new real document's empty recipient/
// field list would wipe out local edits nobody has pushed yet.
//
// Persisted to localStorage (not just an in-memory ref) so the marker
// survives a refresh — the exact moment this reconciliation matters most.

import { readJSON, writeJSON, PERSISTENCE_KEYS } from "../local-persistence";

type SyncCollection = "participants" | "fields";

interface SyncMarkers {
  participants: string[]; // backend documentIds
  fields: string[];       // backend documentIds
}

function load(): SyncMarkers {
  return readJSON<SyncMarkers>(PERSISTENCE_KEYS.prepareSyncMarkers) ?? { participants: [], fields: [] };
}

export function isDocumentSynced(collection: SyncCollection, documentId: string): boolean {
  return load()[collection].includes(documentId);
}

export function markDocumentSynced(collection: SyncCollection, documentId: string): void {
  const markers = load();
  if (markers[collection].includes(documentId)) return;
  markers[collection] = [...markers[collection], documentId];
  writeJSON(PERSISTENCE_KEYS.prepareSyncMarkers, markers);
}
