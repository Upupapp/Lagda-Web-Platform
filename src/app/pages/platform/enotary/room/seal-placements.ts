// Where the notary has put the seal and the signature, kept while they move between the video session and the page where
// they are placed, so neither page has to be open for the other to know. It lives in this tab's memory only: nothing is
// stored in the browser or sent to the server until the act is recorded, and reloading the tab forgets it.

import type { Placements } from "./SealPlacer";

const kept = new Map<string, Placements>();

export function readPlacements(sessionId: string): Placements {
  const found = kept.get(sessionId);
  return found === undefined ? {} : { ...found };
}

export function writePlacements(sessionId: string, value: Placements): void {
  if (value.seal === undefined && value.signature === undefined) kept.delete(sessionId);
  else kept.set(sessionId, { ...value });
}
