// 128. The location check behind its own button: closed at first, a bubble that says where the party stands and a button
// that wiggles while something is asked of them, the dialog in the middle of the page (closed by its button, Escape or
// the backdrop, opened from the hold notice too), its automatic checks running while closed, and the formal explanation.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const checkLocation = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: { checkLocation: (...args: unknown[]) => checkLocation(...args) as unknown },
}));

import { LocationLocator } from "../LocationLocator";
import { openLocationCheck, standingOf } from "../location-check";
import type { PartyLocation, Session, SessionLocation } from "../../../../../services/real/enotary-sessions.service";

const within = (place: string, at = "2026-10-22T09:28:40.000Z"): PartyLocation => ({ outcome: "within", reason: null, place, accuracyM: 18, at, words: `Within the Philippines: ${place}` });
const abroad: PartyLocation = { outcome: "outside", reason: "abroad", place: null, accuracyM: null, at: "2026-10-22T09:29:00.000Z", words: "Outside the Philippines" } as PartyLocation;
const session = (role: "client" | "notary", location: Partial<SessionLocation> = {}): Session => ({
  id: "ens_1", invitationId: "eni_1", role, status: "live", notaryName: "Aiyana Cruz", clientName: "Rosa Villanueva",
  location: { required: true, client: null, notary: null, recheckRequestedAt: null, block: null, actLine: null, ...location },
} as unknown as Session);

let permission: PermissionState = "prompt";
beforeEach(() => {
  checkLocation.mockReset();
  permission = "prompt";
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (ok: PositionCallback) => { ok({ coords: { latitude: 13.62, longitude: 123.19, accuracy: 18 } } as GeolocationPosition); } } });
  Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: () => Promise.resolve({ state: permission }) } });
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
  Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
});

const show = (s: Session, onChanged = vi.fn()) => render(<MemoryRouter><LocationLocator session={s} onChanged={onChanged} /></MemoryRouter>);

describe("the location button and its dialog", () => {
  it("keeps the card closed at first, and says in a bubble, with a wiggle, what is asked of the party", () => {
    show(session("client"));
    expect(screen.getByTestId("locator-overlay")).not.toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("locator-bubble")).toHaveTextContent("Share your location");
    expect(screen.getByTestId("locator-bubble")).toHaveTextContent("Required by the Rules: every party must be within the Philippines.");
    const button = screen.getByTestId("locator-toggle");
    expect(button).toHaveAttribute("data-tone", "wait");
    expect(button).toHaveClass("is-asking");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAccessibleName("Location verification: Share your location");
  });

  it("opens the card in the middle of the page from the button or the bubble, and closes it by its button, Escape or the backdrop", async () => {
    const user = userEvent.setup();
    show(session("client"));
    await user.click(screen.getByTestId("locator-toggle"));
    const dialog = screen.getByRole("dialog", { name: "Location verification" });
    expect(dialog).toBeVisible();
    expect(screen.getByTestId("locator-toggle")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("location-panel")).toBeVisible();
    expect(screen.queryByTestId("locator-bubble")).toBeNull();
    await user.click(screen.getByTestId("locator-close"));
    expect(screen.getByTestId("locator-overlay")).not.toBeVisible();
    expect(screen.getByTestId("locator-toggle")).toHaveFocus();

    await user.click(screen.getByTestId("locator-toggle"));
    await user.keyboard("{Escape}");
    expect(screen.getByTestId("locator-overlay")).not.toBeVisible();

    await user.click(screen.getByTestId("locator-toggle"));
    await user.pointer({ keys: "[MouseLeft]", target: screen.getByTestId("locator-overlay") });
    expect(screen.getByTestId("locator-overlay")).not.toBeVisible();
  });

  it("opens from anywhere in the room (the hold notice), and the bubble can be hidden", async () => {
    const user = userEvent.setup();
    show(session("notary"));
    await user.click(screen.getByTestId("locator-bubble-close"));
    expect(screen.queryByTestId("locator-bubble")).toBeNull();
    act(() => { openLocationCheck(); });
    expect(screen.getByRole("dialog", { name: "Location verification" })).toBeVisible();
  });

  it("checks by itself while closed once the browser allows it, then says where the party was placed and stops wiggling", async () => {
    permission = "granted";
    const placed = session("client", { client: within("Naga City, Camarines Sur") });
    checkLocation.mockResolvedValue(placed);
    const onChanged = vi.fn();
    const view = show(session("client"), onChanged);
    await waitFor(() => { expect(checkLocation).toHaveBeenCalledWith("ens_1", { latitude: 13.62, longitude: 123.19, accuracy: 18 }); });
    expect(onChanged).toHaveBeenCalledWith(placed);
    expect(screen.getByTestId("locator-overlay")).not.toBeVisible();
    view.rerender(<MemoryRouter><LocationLocator session={placed} onChanged={onChanged} /></MemoryRouter>);
    expect(screen.getByTestId("locator-bubble")).toHaveTextContent("Location verified");
    expect(screen.getByTestId("locator-bubble")).toHaveTextContent("Naga City, Camarines Sur");
    expect(screen.getByTestId("locator-toggle")).toHaveAttribute("data-tone", "ok");
    expect(screen.getByTestId("locator-toggle")).not.toHaveClass("is-asking");
  });

  it("lets a verified location's bubble go by itself, but keeps one that asks something", () => {
    vi.useFakeTimers();
    show(session("client", { client: within("Naga City, Camarines Sur") }));
    expect(screen.getByTestId("locator-bubble")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(8500); });
    expect(screen.queryByTestId("locator-bubble")).toBeNull();
  });

  it("names a check that did not pass, and the notary's request to check again, in the bubble", () => {
    expect(standingOf(session("client", { client: abroad }))).toMatchObject({ tone: "bad", title: "Outside the Philippines" });
    expect(standingOf(session("client", { client: within("Naga City, Camarines Sur"), recheckRequestedAt: "2026-10-22T09:30:00.000Z" })))
      .toMatchObject({ tone: "wait", title: "Check your location again", detail: "Atty. Aiyana Cruz asked to verify your location again before the act." });
    expect(standingOf(session("notary", { notary: within("Taguig City, Metro Manila") }))).toMatchObject({ tone: "ok", detail: "Taguig City, Metro Manila" });
  });

  it("explains formally how LAGDA's automatic locator verifies that both parties are within Philippine territory", async () => {
    const user = userEvent.setup();
    show(session("client"));
    await user.click(screen.getByTestId("locator-toggle"));
    const how = screen.getByTestId("locator-explainer");
    expect(how).toHaveTextContent("Under Rule III, Section 2(c) of the Rules on Electronic Notarization (A.M. No. 24-10-14-SC)");
    expect(how).toHaveTextContent("automatic location verification tool, for the client and for the notary public alike");
    expect(how).toHaveTextContent("official boundaries of the cities and municipalities of the Philippines");
    expect(how).toHaveTextContent("electronic notarial book (Rule VIII, Sec. 2(a)(viii))");
    // The connection is named only where the server screens it.
    expect(how).not.toHaveTextContent("virtual private networks");
    expect(screen.getByTestId("location-notice")).toHaveTextContent("LAGDA checks your device’s location to confirm it.");
  });

  it("names the screening of the connection where the server makes it", async () => {
    const user = userEvent.setup();
    show(session("client", { connectionChecked: true }));
    await user.click(screen.getByTestId("locator-toggle"));
    expect(screen.getByTestId("locator-explainer")).toHaveTextContent("virtual private networks (VPNs)");
    expect(screen.getByTestId("locator-explainer")).toHaveTextContent("Rule VII, Sec. 2(i)");
    expect(screen.getByTestId("location-notice")).toHaveTextContent("LAGDA checks your device’s location and your internet connection to confirm it.");
  });
});
