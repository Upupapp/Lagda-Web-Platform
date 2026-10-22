// 128. The location check of a session, apart from the card that shows it: whether it is wanted, the party's own check
// (run on a press, by itself on entering the room once the browser allows it, and on the client's device when the notary
// asks both to check again), and the words for what a failed check asks of a party and why the session waits.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeSessionError, realEnotarySessionsService, type LocationBlock, type PartyLocation, type Session,
} from "../../../../services/real/enotary-sessions.service";
import { checkedSince, locationPermission, readDevicePosition } from "./device-location";

/** Whether this session asks for the parties' locations now. */
export const locationWanted = (s: Session): boolean =>
  s.location?.required === true && (s.status === "preparing" || s.status === "live");

/** The check of `s` for this party: run it, and run it by itself on entering the room and when the notary asks again. */
export function useLocationCheck(s: Session, onChanged: (next: Session) => void): { check: () => Promise<void>; checking: boolean; problem: string | null } {
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const allowed = useRef(false);
  const busy = useRef(false);
  const wanted = locationWanted(s);
  const mine = s.location?.[s.role] ?? null;

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setChecking(true);
    setProblem(null);
    try {
      const input = await readDevicePosition();
      if (!("refused" in input)) allowed.current = true;
      changed.current(await realEnotarySessionsService.checkLocation(s.id, input));
    } catch (error) {
      setProblem(describeSessionError(error));
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }, [s.id]);

  // On entering the room: a browser that already allows this site checks without asking.
  const unchecked = wanted && mine === null;
  useEffect(() => {
    if (!unchecked) return;
    let alive = true;
    void locationPermission().then(state => { if (alive && state === "granted") void check(); });
    return () => { alive = false; };
  }, [unchecked, check]);

  // The notary asked both devices to check again: the client's checks once for each request.
  const recheck = s.location?.recheckRequestedAt ?? null;
  const answered = useRef<string | null>(null);
  const stale = wanted && s.role === "client" && recheck !== null && checkedSince(mine, recheck) === null;
  useEffect(() => {
    if (!stale || recheck === null || answered.current === recheck) return;
    answered.current = recheck;
    let alive = true;
    void locationPermission().then(state => { if (alive && (state === "granted" || allowed.current)) void check(); });
    return () => { alive = false; };
  }, [stale, recheck, check]);

  return { check, checking, problem };
}

/** What a party should do when their check did not pass, in words for them. */
export function remedyFor(party: PartyLocation): string {
  switch (party.reason) {
    case "abroad": return "Under the Rules, every party must be in the Philippines during the notarization. The session cannot go on from where you are.";
    case "at_sea": return "Your position is at sea, not on land. Join from land in the Philippines, then check again.";
    case "vpn": case "proxy": case "tor": case "hosting":
      return "Turn off any VPN, proxy or private relay (or switch from an office or cloud network to your mobile data or home Wi-Fi), then check again.";
    case "connection_abroad": return "Your internet connection comes from outside the Philippines, for example data roaming on a foreign SIM. Use Wi-Fi or a Philippine mobile network, then check again.";
    case "check_failed": return "The connection could not be checked just now. Check again in a moment.";
    case "denied": return "Your browser did not share your location. Allow it, then press Check again:";
    case "timeout": case "unavailable": return "Your device could not find its position. Turn on Location (GPS), move near a window, then check again.";
    case "unsupported": return "This browser cannot share a location. Open the room in an up-to-date Chrome, Safari, Edge or Firefox.";
    default: return party.outcome === "imprecise"
      ? `Your position is not precise enough to place you${party.accuracyM === null ? "" : ` (within ${String(Math.round(party.accuracyM / 1000))} km)`}. Turn on precise location or GPS, then check again.`
      : "Check again.";
  }
}

/** Why the session waits on the location check, in words for one party. */
export function holdWords(block: LocationBlock, s: Session): string {
  const mine = block.startsWith(s.role);
  const other = s.role === "client" ? `Atty. ${s.notaryName}` : s.clientName;
  if (block.endsWith("missing")) {
    return mine ? "Share your location to go on: every party must be in the Philippines during the notarization."
      : `Waiting for ${other} to share their location: every party must be in the Philippines during the notarization.`;
  }
  return mine ? "The session is on hold: your location check did not pass. See Your location below."
    : `The session is on hold: the location check of ${other} did not pass. They see on their screen what to do.`;
}
