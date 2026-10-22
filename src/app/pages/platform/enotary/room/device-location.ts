// 128. This device's position, for the location check of Rule III of the Rules on Electronic Notarization
// (A.M. No. 24-10-14-SC): every party must be in the Philippines, which the notary ascertains through the facility's
// geolocation. The browser is asked only after the room has said why, and the position goes to LAGDA's server, which
// places it on the map of the Philippines, checks the connection, and keeps it with the notarial record. The other
// party sees only the city or municipality and the province.

import {
  realEnotarySessionsService, type LocationInput, type PartyLocation, type Session,
} from "../../../../services/real/enotary-sessions.service";

/** How long the browser may take to find the position. */
export const POSITION_TIMEOUT_MS = 20_000;
/** How long the act waits for the client's device to check again, and how often it looks. */
export const CLIENT_CHECK_WAIT_MS = 45_000;
export const CLIENT_CHECK_EVERY_MS = 2_000;

/** A location check that stops the act, in words for the notary. */
export class LocationProblem extends Error {}

/** This device's position, or why it gave none. Never rejects. */
export function readDevicePosition(geolocation: Geolocation | undefined = typeof navigator === "undefined" ? undefined : navigator.geolocation): Promise<LocationInput> {
  if (geolocation === undefined || geolocation === null || typeof geolocation.getCurrentPosition !== "function") {
    return Promise.resolve({ refused: "unsupported" });
  }
  return new Promise(resolve => {
    geolocation.getCurrentPosition(
      position => { resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }); },
      error => { resolve({ refused: error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable" }); },
      { enableHighAccuracy: true, timeout: POSITION_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}

/** Whether the browser already lets this site read the location: then a check needs no question. */
export async function locationPermission(): Promise<PermissionState | "unknown"> {
  try {
    const permissions = typeof navigator === "undefined" ? undefined : navigator.permissions;
    if (permissions === undefined || typeof permissions.query !== "function") return "unknown";
    return (await permissions.query({ name: "geolocation" as PermissionName })).state;
  } catch {
    return "unknown";
  }
}

const at = (iso: string | null | undefined): number => (iso === null || iso === undefined ? Number.NaN : Date.parse(iso));
const lower = (words: string): string => `${words.charAt(0).toLowerCase()}${words.slice(1)}`;

/** The latest check of a party, if it is no older than `since` (the server's time, as an ISO string). */
export function checkedSince(party: PartyLocation | null | undefined, since: string | null | undefined): PartyLocation | null {
  if (party === null || party === undefined) return null;
  return at(party.at) >= at(since) ? party : null;
}

const pause = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms); });

/**
 * Just before the act: both devices check again. The notary asks (the client's room sees it and checks at once), this
 * device checks, and the act waits for the client's fresh check. Resolves when both are within the Philippines; throws a
 * LocationProblem saying why not.
 */
export async function confirmLocationsForAct(sessionId: string, options: { waitMs?: number; everyMs?: number; read?: () => Promise<LocationInput> } = {}): Promise<Session> {
  const asked = await realEnotarySessionsService.requestLocationRecheck(sessionId);
  const since = asked.location?.recheckRequestedAt ?? null;
  const mine = await realEnotarySessionsService.checkLocation(sessionId, await (options.read ?? readDevicePosition)());
  const notary = mine.location?.notary ?? null;
  if (notary === null || notary.outcome !== "within") {
    throw new LocationProblem(`Your location check did not pass (${lower(notary?.words ?? "no result")}). Every party must be in the Philippines for the act.`);
  }
  const deadline = Date.now() + (options.waitMs ?? CLIENT_CHECK_WAIT_MS);
  for (;;) {
    const now = await realEnotarySessionsService.get(sessionId);
    const client = checkedSince(now.location?.client, since);
    if (client !== null) {
      if (client.outcome !== "within") throw new LocationProblem(`The client's location check did not pass (${lower(client.words)}). The act waits until it does.`);
      return now;
    }
    if (Date.now() >= deadline) {
      throw new LocationProblem("The client's device did not answer the location check. Ask the client to keep the room open and allow their location, then try again.");
    }
    await pause(options.everyMs ?? CLIENT_CHECK_EVERY_MS);
  }
}
