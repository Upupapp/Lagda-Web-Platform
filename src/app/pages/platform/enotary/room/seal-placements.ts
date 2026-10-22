// Where the notary has put the notarial block (127; before it, the seal and the signature). The place is saved with the
// session on the server (so it survives a reload, another device, and a session called off and opened again); this tab
// also keeps the last place it saved, so the video session shows it at once when the notary comes back from the page where
// they place it, before the session's next read arrives.

import type { PagePoint, Session } from "../../../../services/real/enotary-sessions.service";
import type { Placements } from "./SealPlacer";

const kept = new Map<string, Placements>();

const isEmpty = (value: Placements): boolean =>
  value.block === undefined && value.blockOwnPage !== true && value.seal === undefined && value.signature === undefined;

export function readPlacements(sessionId: string): Placements {
  const found = kept.get(sessionId);
  return found === undefined ? {} : { ...found };
}

export function writePlacements(sessionId: string, value: Placements): void {
  if (isEmpty(value)) kept.delete(sessionId);
  else kept.set(sessionId, { ...value });
}

/** The place as the session holds it (the notary's view), or this tab's when the server has none to say. */
export function placementsOf(session: Session): Placements {
  const saved = session.placements ?? null;
  if (saved === null) return readPlacements(session.id);
  const block = saved.block ?? undefined;
  const seal = saved.seal ?? undefined;
  const signature = saved.signature ?? undefined;
  return {
    ...(block === undefined ? {} : { block }), ...(saved.blockOwnPage === true ? { blockOwnPage: true } : {}),
    ...(seal === undefined ? {} : { seal }), ...(signature === undefined ? {} : { signature }),
  };
}

/** Where a point sits on its page, in words: "lower right", "top left", "middle". */
export function whereOnPage(point: PagePoint): string {
  const row = point.y < 0.34 ? "top" : point.y > 0.66 ? "lower" : "middle";
  const column = point.x < 0.34 ? "left" : point.x > 0.66 ? "right" : "centre";
  if (row === "middle" && column === "centre") return "middle";
  return row === "middle" ? `middle ${column}` : column === "centre" ? `${row} centre` : `${row} ${column}`;
}
