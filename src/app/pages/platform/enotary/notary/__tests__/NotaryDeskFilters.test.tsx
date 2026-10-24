/* eslint-disable testing-library/prefer-user-event, testing-library/no-unnecessary-act -- these files run on a held clock (fake timers), where userEvent waits on timers; fireEvent does not. */
// 131. The desk's filters and the way a notice leads to one request: the four counts (Closed among them) show one group
// at a time, the search finds a client or a reference, `?request=` shows that request alone, and a client's "asks to
// continue" notice opens the called-off session again by itself and takes the notary to the room.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const desk = vi.fn();
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: { desk: (...a: unknown[]) => desk(...a) as unknown },
}));
const lookup = vi.fn();
const reopen = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: new Proxy({}, {
    get: (_t, name: string) => (...args: unknown[]) => (name === "lookup" ? lookup(...args) : name === "reopen" ? reopen(...args) : Promise.resolve(null)) as unknown,
  }),
}));

import { NotaryDeskPage, NotaryRequestPage, deskMatches, deskShowOf } from "../NotaryDeskPage";
import type { DeskRequest, NotaryDesk } from "../../../../../services/real/enotary-invitations.service";

const request = (over: Partial<DeskRequest> = {}): DeskRequest => ({
  id: "eni_1", status: "claimed", client: { name: "Ben Lim", identityVerified: true },
  receivedAt: "2026-10-17T01:00:00.000Z", expiresAt: "2026-10-19T01:00:00.000Z", secondsLeft: 2 * 24 * 3600, decidedAt: null, ...over,
});
const REQUESTS: DeskRequest[] = [
  request({ id: "eni_wait", reference: "EN-2026-000011" }),
  request({ id: "eni_done", status: "accepted", client: { name: "Angela Ramos", identityVerified: true }, reference: "EN-2026-000004", session: { id: "ens_done", status: "notarized", hasDocument: true } }),
  request({ id: "eni_off", status: "declined", client: { name: "Dan Uy", identityVerified: true }, reference: "EN-2026-000007" }),
  request({ id: "eni_gone", status: "expired", client: { name: "Eve Go", identityVerified: true }, reference: "EN-2026-000008" }),
];
const deskOf = (over: Partial<NotaryDesk> = {}): NotaryDesk => ({
  applicationStatus: "approved", canAccept: true, paymentProfile: { payeeName: "ATTY ANA CRUZ", payeeCity: "MAKATI" }, requests: REQUESTS, ...over,
});

const settle = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const openAt = async (path: string, d: NotaryDesk = deskOf()) => {
  desk.mockResolvedValue(d);
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/enotary/desk" element={<NotaryDeskPage />} />
        <Route path="/app/enotary/desk/:id" element={<NotaryRequestPage />} />
        <Route path="/app/enotary/room/:invitationId" element={<p data-testid="room-page">The room</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await settle();
};
const sections = () => ["waiting", "progress", "completed", "closed"].filter(group => screen.queryByTestId(`desk-section-${group}`) !== null);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-10-17T01:00:00.000Z"));
  lookup.mockReset(); reopen.mockReset();
});
afterEach(() => { vi.useRealTimers(); });

describe("the desk's filters", () => {
  it("counts the closed requests, and shows one group at a time when its count is pressed", async () => {
    await openAt("/app/enotary/desk");
    expect(screen.getByTestId("tally-closed")).toHaveTextContent("2");
    expect(screen.getByTestId("tally-closed")).toHaveTextContent("Closed");
    expect(sections()).toEqual(["waiting", "completed", "closed"]);

    fireEvent.click(screen.getByTestId("tally-closed"));
    await settle();
    expect(screen.getByTestId("tally-closed")).toHaveAttribute("aria-pressed", "true");
    expect(sections()).toEqual(["closed"]);
    expect(within(screen.getByTestId("desk-section-closed")).getAllByTestId("desk-row")).toHaveLength(2);

    // Pressed again, every group is back.
    fireEvent.click(screen.getByTestId("tally-closed"));
    await settle();
    expect(sections()).toEqual(["waiting", "completed", "closed"]);
  });

  it("finds a request by the client's name or its reference, and says when nothing matches", async () => {
    await openAt("/app/enotary/desk");
    fireEvent.change(screen.getByTestId("desk-search"), { target: { value: "angela" } });
    await settle();
    expect(sections()).toEqual(["completed"]);
    fireEvent.change(screen.getByTestId("desk-search"), { target: { value: "EN-2026-000007" } });
    await settle();
    expect(screen.getAllByTestId("desk-row").map(row => row.textContent)).toEqual([expect.stringContaining("Dan Uy")]);
    fireEvent.change(screen.getByTestId("desk-search"), { target: { value: "nobody" } });
    await settle();
    expect(screen.getByTestId("desk-no-match")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("desk-show-all"));
    await settle();
    expect(screen.getByTestId("desk-search")).toHaveValue("");
    expect(sections()).toEqual(["waiting", "completed", "closed"]);
  });

  it("shows only the request a notice names, and every request again on Show all requests", async () => {
    await openAt("/app/enotary/desk?request=eni_done");
    expect(screen.getByTestId("desk-only")).toHaveTextContent("Showing only the request from Angela Ramos (EN-2026-000004).");
    expect(screen.getAllByTestId("desk-row")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("desk-show-all"));
    await settle();
    expect(screen.queryByTestId("desk-only")).toBeNull();
    expect(screen.getAllByTestId("desk-row")).toHaveLength(4);
  });

  it("reads its words and groups safely", () => {
    expect(deskShowOf("closed")).toBe("closed");
    expect(deskShowOf("anything")).toBe("all");
    expect(deskShowOf(null)).toBe("all");
    expect(deskMatches({ client: { name: "Christopher Oliva Cortes" }, reference: "EN-2026-000009" }, " cortes ")).toBe(true);
    expect(deskMatches({ client: { name: "Christopher Oliva Cortes" }, reference: null }, "en-2026-000009")).toBe(false);
  });
});

describe("a client's request to continue", () => {
  const calledOff = request({ id: "eni_cont", status: "accepted", client: { name: "Christopher Oliva Cortes", identityVerified: true }, reference: "EN-2026-000009", session: { id: "ens_cont", status: "cancelled", hasDocument: true } });

  it("opens the called-off session again by itself and takes the notary to the room", async () => {
    lookup.mockResolvedValue({ session: { id: "ens_cont", status: "cancelled" }, canStart: false, reason: null });
    reopen.mockResolvedValue({ id: "ens_cont", status: "preparing" });
    await openAt("/app/enotary/desk/eni_cont?then=reopen", deskOf({ requests: [calledOff] }));
    await settle(2000);
    expect(lookup).toHaveBeenCalledWith("eni_cont");
    expect(reopen).toHaveBeenCalledWith("ens_cont");
    expect(screen.getByTestId("room-page")).toBeInTheDocument();
  });

  it("goes straight to the room when the session is already open, without opening it twice", async () => {
    const open = { ...calledOff, session: { id: "ens_cont", status: "preparing" as const, hasDocument: true } };
    await openAt("/app/enotary/desk/eni_cont?then=reopen", deskOf({ requests: [open] }));
    expect(reopen).not.toHaveBeenCalled();
    expect(screen.getByTestId("room-page")).toBeInTheDocument();
  });

  it("does nothing by itself without being asked", async () => {
    lookup.mockResolvedValue({ session: { id: "ens_cont", status: "cancelled" }, canStart: false, reason: null });
    await openAt("/app/enotary/desk/eni_cont", deskOf({ requests: [calledOff] }));
    await settle(2000);
    expect(reopen).not.toHaveBeenCalled();
    expect(screen.queryByTestId("room-page")).toBeNull();
  });
});
