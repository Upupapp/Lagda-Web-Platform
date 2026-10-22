// 128. The device's position and the checks just before the act: what the browser says, in the words the server takes,
// and the act waiting for both parties' fresh checks within the Philippines.

import { describe, it, expect, vi, beforeEach } from "vitest";

const requestLocationRecheck = vi.fn();
const checkLocation = vi.fn();
const get = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: {
    requestLocationRecheck: (...args: unknown[]) => requestLocationRecheck(...args) as unknown,
    checkLocation: (...args: unknown[]) => checkLocation(...args) as unknown,
    get: (...args: unknown[]) => get(...args) as unknown,
  },
}));

import { LocationProblem, checkedSince, confirmLocationsForAct, readDevicePosition } from "../device-location";
import type { PartyLocation } from "../../../../../services/real/enotary-sessions.service";

const ASKED = "2026-10-22T09:30:00.000Z";
const party = (over: Partial<PartyLocation> = {}): PartyLocation => ({
  outcome: "within", reason: null, place: "Naga City, Camarines Sur", accuracyM: 18, at: "2026-10-22T09:30:05.000Z",
  words: "Within the Philippines: Naga City, Camarines Sur", ...over,
});
const sessionWith = (location: Record<string, unknown>) => ({ id: "ens_1", location: { required: true, client: null, notary: null, recheckRequestedAt: ASKED, block: null, actLine: null, ...location } });

beforeEach(() => {
  requestLocationRecheck.mockReset(); checkLocation.mockReset(); get.mockReset();
  requestLocationRecheck.mockResolvedValue(sessionWith({}));
});

const geolocation = (answer: (ok: PositionCallback, fail: PositionErrorCallback) => void) =>
  ({ getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) => { answer(ok, fail); } }) as unknown as Geolocation;

describe("the device's position", () => {
  it("gives the position, or says why it gave none in the words the server takes", async () => {
    await expect(readDevicePosition(geolocation(ok => { ok({ coords: { latitude: 13.62, longitude: 123.19, accuracy: 18 } } as GeolocationPosition); })))
      .resolves.toEqual({ latitude: 13.62, longitude: 123.19, accuracy: 18 });
    for (const [code, refused] of [[1, "denied"], [2, "unavailable"], [3, "timeout"]] as const) {
      await expect(readDevicePosition(geolocation((_ok, fail) => { fail({ code } as GeolocationPositionError); }))).resolves.toEqual({ refused });
    }
    await expect(readDevicePosition(undefined)).resolves.toEqual({ refused: "unsupported" });
  });

  it("counts a check only from the moment it was asked for", () => {
    expect(checkedSince(party(), ASKED)).not.toBeNull();
    expect(checkedSince(party({ at: "2026-10-22T09:29:59.000Z" }), ASKED)).toBeNull();
    expect(checkedSince(null, ASKED)).toBeNull();
  });
});

describe("the checks just before the act", () => {
  const read = () => Promise.resolve({ latitude: 14.52, longitude: 121.05, accuracy: 35 });

  it("asks both devices again, checks this one, and waits for the client's fresh check", async () => {
    checkLocation.mockResolvedValue(sessionWith({ notary: party({ place: "Taguig City, Metro Manila" }) }));
    get.mockResolvedValueOnce(sessionWith({ client: party({ at: "2026-10-22T09:20:00.000Z" }) }))
      .mockResolvedValueOnce(sessionWith({ client: party() }));
    await expect(confirmLocationsForAct("ens_1", { read, everyMs: 1 })).resolves.toMatchObject({ id: "ens_1" });
    expect(requestLocationRecheck).toHaveBeenCalledWith("ens_1");
    expect(checkLocation).toHaveBeenCalledWith("ens_1", { latitude: 14.52, longitude: 121.05, accuracy: 35 });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("stops when the notary's own check does not pass", async () => {
    checkLocation.mockResolvedValue(sessionWith({ notary: party({ outcome: "connection", reason: "vpn", words: "A VPN is in use" }) }));
    await expect(confirmLocationsForAct("ens_1", { read })).rejects.toThrow(new LocationProblem("Your location check did not pass (a VPN is in use). Every party must be in the Philippines for the act."));
    expect(get).not.toHaveBeenCalled();
  });

  it("stops when the client's fresh check does not pass, or their device does not answer in time", async () => {
    checkLocation.mockResolvedValue(sessionWith({ notary: party() }));
    get.mockResolvedValue(sessionWith({ client: party({ outcome: "outside", reason: "abroad", words: "Outside the Philippines" }) }));
    await expect(confirmLocationsForAct("ens_1", { read, everyMs: 1 })).rejects.toThrow(/The client's location check did not pass \(outside the Philippines\)/);
    get.mockResolvedValue(sessionWith({ client: null }));
    await expect(confirmLocationsForAct("ens_1", { read, everyMs: 1, waitMs: 5 })).rejects.toThrow(/did not answer the location check/);
  });
});
