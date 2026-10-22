// 128. The room's location card: why the check is made and who sees what, the device's position shared on a press (or
// by itself once allowed), what the check found and what to do when it did not pass, and where the other party stands.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const checkLocation = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: { checkLocation: (...args: unknown[]) => checkLocation(...args) as unknown },
}));

import { LocationPanel } from "../LocationPanel";
import { holdWords, remedyFor } from "../location-check";
import type { PartyLocation, Session, SessionLocation } from "../../../../../services/real/enotary-sessions.service";

const within = (place: string, at = "2026-10-22T09:28:40.000Z"): PartyLocation => ({ outcome: "within", reason: null, place, accuracyM: 18, at, words: `Within the Philippines: ${place}` });
const failed = (outcome: PartyLocation["outcome"], reason: PartyLocation["reason"], words: string): PartyLocation => ({ outcome, reason, place: null, accuracyM: null, at: "2026-10-22T09:28:40.000Z", words });
const session = (role: "client" | "notary", location: Partial<SessionLocation> = {}, status: Session["status"] = "live"): Session => ({
  id: "ens_1", invitationId: "eni_1", role, status, notaryName: "Aiyana Cruz", clientName: "Rosa Villanueva",
  location: { required: true, client: null, notary: null, recheckRequestedAt: null, block: null, actLine: null, ...location },
} as unknown as Session);

let permission: PermissionState = "prompt";
let position: (ok: PositionCallback, fail: PositionErrorCallback) => void;
beforeEach(() => {
  checkLocation.mockReset();
  permission = "prompt";
  position = ok => { ok({ coords: { latitude: 13.62, longitude: 123.19, accuracy: 18 } } as GeolocationPosition); };
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) => { position(ok, fail); } } });
  Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: () => Promise.resolve({ state: permission }) } });
});
afterEach(() => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
  Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
});

const show = (s: Session, onChanged = vi.fn()) => { render(<MemoryRouter><LocationPanel session={s} onChanged={onChanged} /></MemoryRouter>); return onChanged; };

describe("the location card", () => {
  it("is not shown where the server checks no locations, or once the session is over", () => {
    const { container } = render(<MemoryRouter><LocationPanel session={{ ...session("client"), location: { required: false } } as Session} onChanged={vi.fn()} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
    show(session("client", {}, "notarized"));
    expect(screen.queryByTestId("location-panel")).toBeNull();
  });

  it("says why, who sees what, and that it is kept; shares the position on a press and shows what the check found", async () => {
    const user = userEvent.setup();
    const answered = session("client", { client: within("Naga City, Camarines Sur") });
    checkLocation.mockResolvedValue(answered);
    const onChanged = show(session("client"));
    expect(screen.getByTestId("location-notice")).toHaveTextContent("A.M. No. 24-10-14-SC");
    expect(screen.getByTestId("location-notice")).toHaveTextContent("Only Atty. Aiyana Cruz sees where you are: your city or municipality and province.");
    expect(screen.getByTestId("location-notice")).toHaveTextContent("kept with the notarial record");
    expect(screen.getByTestId("location-mine")).toHaveTextContent("You have not shared your location yet.");
    await user.click(screen.getByRole("button", { name: "Share my location" }));
    await waitFor(() => { expect(checkLocation).toHaveBeenCalledWith("ens_1", { latitude: 13.62, longitude: 123.19, accuracy: 18 }); });
    expect(onChanged).toHaveBeenCalledWith(answered);
  });

  it("shows a passed check with its accuracy and time, and the other party's place", () => {
    show(session("notary", { notary: within("Taguig City, Metro Manila"), client: within("Naga City, Camarines Sur") }));
    expect(screen.getByTestId("location-mine")).toHaveTextContent("Within the Philippines: Taguig City, Metro Manila");
    expect(screen.getByTestId("location-mine")).toHaveTextContent("±18 m");
    expect(screen.getByTestId("location-theirs")).toHaveTextContent("Rosa Villanueva: within the Philippines: Naga City, Camarines Sur");
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
  });

  it("says how to allow a refused location, and sends the refusal when the browser says no", async () => {
    const user = userEvent.setup();
    position = (_ok, fail) => { fail({ code: 1 } as GeolocationPositionError); };
    checkLocation.mockResolvedValue(session("client", { client: failed("refused", "denied", "Location not shared") }));
    show(session("client"));
    await user.click(screen.getByRole("button", { name: "Share my location" }));
    await waitFor(() => { expect(checkLocation).toHaveBeenCalledWith("ens_1", { refused: "denied" }); });
  });

  it("tells the party what to do for each failed check, and the other party why the session waits", () => {
    show(session("client", { client: failed("refused", "denied", "Location not shared") }));
    expect(screen.getByTestId("location-remedy")).toHaveTextContent("Allow it, then press Check again");
    expect(screen.getByTestId("location-how")).toHaveTextContent("lock or settings icon");
    expect(remedyFor(failed("connection", "vpn", "A VPN is in use"))).toMatch(/Turn off any VPN/);
    expect(remedyFor(failed("outside", "at_sea", "x"))).toMatch(/Join from land/);
    expect(remedyFor(failed("connection", "connection_abroad", "x"))).toMatch(/data roaming on a foreign SIM/);
    expect(remedyFor({ ...failed("imprecise", null, "x"), accuracyM: 30_000 })).toMatch(/within 30 km/);
  });

  it("tells the notary when the client refused, and both parties why the session is on hold", () => {
    show(session("notary", { notary: within("Taguig City, Metro Manila"), client: failed("refused", "denied", "Location not shared") }));
    expect(screen.getByTestId("location-theirs")).toHaveTextContent("Rosa Villanueva’s location check did not pass: location not shared. Their screen shows them how to allow it");
    const s = session("notary");
    expect(holdWords("client_location_missing", s)).toBe("Waiting for Rosa Villanueva to share their location: every party must be in the Philippines during the notarization.");
    expect(holdWords("notary_location_failed", s)).toMatch(/your location check did not pass/);
    expect(holdWords("notary_location_missing", session("client"))).toMatch(/Waiting for Atty. Aiyana Cruz/);
  });

  it("checks by itself on entering the room when the browser already allows it", async () => {
    permission = "granted";
    checkLocation.mockResolvedValue(session("client", { client: within("Naga City, Camarines Sur") }));
    show(session("client"));
    await waitFor(() => { expect(checkLocation).toHaveBeenCalledTimes(1); });
  });

  it("answers the notary's request to check again by itself, once, on the client's device", async () => {
    permission = "granted";
    const asked = session("client", { client: within("Naga City, Camarines Sur", "2026-10-22T09:20:00.000Z"), recheckRequestedAt: "2026-10-22T09:30:00.000Z" });
    checkLocation.mockResolvedValue(session("client", { client: within("Naga City, Camarines Sur", "2026-10-22T09:30:04.000Z") }));
    show(asked);
    expect(screen.getByTestId("location-asked")).toHaveTextContent("Atty. Aiyana Cruz asked to check your location again before recording the act.");
    await waitFor(() => { expect(checkLocation).toHaveBeenCalledTimes(1); });
    // The notary's own device is checked by the act itself, not by this card.
    checkLocation.mockClear();
    show(session("notary", { notary: within("Taguig City, Metro Manila", "2026-10-22T09:20:00.000Z"), recheckRequestedAt: "2026-10-22T09:30:00.000Z" }));
    await new Promise(resolve => { setTimeout(resolve, 20); });
    expect(checkLocation).not.toHaveBeenCalled();
  });
});
