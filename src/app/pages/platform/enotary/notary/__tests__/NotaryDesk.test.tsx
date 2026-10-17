// The notary desk: tallies, request rows with Accept and Decline, the banner
// while the application is not approved, and each refusal of an answer.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const desk = vi.fn();
const accept = vi.fn();
const decline = vi.fn();
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: {
    desk: (...a: unknown[]) => desk(...a) as unknown, accept: (...a: unknown[]) => accept(...a) as unknown,
    decline: (...a: unknown[]) => decline(...a) as unknown,
  },
}));

import { NotaryDeskPage, bannerFor } from "../NotaryDeskPage";
import { ApiError } from "../../../../../services/api-client";
import type { DeskRequest, NotaryDesk } from "../../../../../services/real/enotary-invitations.service";

const request = (over: Partial<DeskRequest> = {}): DeskRequest => ({
  id: "eni_1", status: "claimed", client: { name: "Ben Lim", identityVerified: true },
  receivedAt: "2026-10-17T01:00:00.000Z", expiresAt: "2026-10-19T01:00:00.000Z", secondsLeft: 2 * 24 * 3600, decidedAt: null, ...over,
});
const deskOf = (over: Partial<NotaryDesk> = {}): NotaryDesk => ({ applicationStatus: "approved", canAccept: true, requests: [request()], ...over });

const settle = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const press = (el: HTMLElement) => { fireEvent.click(el); };
const open = async (d: NotaryDesk | null) => {
  desk.mockResolvedValue(d);
  render(<MemoryRouter><NotaryDeskPage /></MemoryRouter>);
  await settle();
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-10-17T01:00:00.000Z"));
});
afterEach(() => { vi.useRealTimers(); });

describe("the desk", () => {
  it("counts waiting, accepted and closed requests and lists each with the client's name", async () => {
    await open(deskOf({ requests: [
      request({ id: "a" }), request({ id: "b", status: "accepted", client: { name: "Cara Tan", identityVerified: true }, decidedAt: "2026-10-17T00:30:00.000Z" }),
      request({ id: "c", status: "declined", client: { name: "Dan Uy", identityVerified: true } }), request({ id: "d", status: "expired", client: { name: "Eve Go", identityVerified: true } }),
    ] }));
    expect(screen.getByTestId("tally-waiting")).toHaveTextContent("1");
    expect(screen.getByTestId("tally-accepted")).toHaveTextContent("1");
    expect(screen.getByTestId("tally-closed")).toHaveTextContent("2");
    const rows = screen.getAllByTestId("desk-row");
    expect(rows.map(row => row.getAttribute("data-status"))).toEqual(["claimed", "accepted", "declined", "expired"]);
    expect(rows[0]).toHaveTextContent("Ben Lim");
    expect(rows[0]).toHaveTextContent("ID verified");
    expect(rows[0]).toHaveTextContent("Waiting for you");
    expect(rows[1]).toHaveTextContent("The session opens when LAGDA eNotary does");
    expect(screen.queryByTestId("desk-banner")).toBeNull();
    expect(screen.getByTestId("onramp-note")).toHaveTextContent(/Supreme Court accreditation/);
  });

  it("counts down the time left on a waiting request", async () => {
    await open(deskOf({ requests: [request({ secondsLeft: 2 * 3600 })] }));
    expect(screen.getByTestId("desk-countdown")).toHaveTextContent("2 h 00 m 00 s left");
    expect(screen.getByTestId("desk-countdown")).toHaveAttribute("data-tone", "red");
    await settle(1000);
    expect(screen.getByTestId("desk-countdown")).toHaveTextContent("1 h 59 m 59 s left");
  });

  it("says what to expect when there are no requests", async () => {
    await open(deskOf({ requests: [] }));
    expect(screen.getByTestId("desk-empty")).toHaveTextContent(/No requests yet/);
  });

  it("asks again every 15 seconds", async () => {
    await open(deskOf());
    await settle(15_000);
    expect(desk).toHaveBeenCalledTimes(2);
  });

  it("says so when the desk is not offered", async () => {
    await open(null);
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
  });
});

describe("accepting and declining", () => {
  it("accepts only after a confirmation that promises nothing beyond the answer", async () => {
    accept.mockResolvedValue(undefined);
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    expect(accept).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/nothing is booked or notarized yet/);
    desk.mockResolvedValue(deskOf({ requests: [request({ status: "accepted" })] }));
    press(within(dialog).getByRole("button", { name: "Accept the request" }));
    await settle();
    expect(accept).toHaveBeenCalledWith("eni_1");
    expect(screen.getByRole("status")).toHaveTextContent(/accepted the request from Ben Lim. The session opens when LAGDA eNotary does/);
    expect(screen.getByTestId("tally-accepted")).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });

  it("declines with a reason cut to 120 characters", async () => {
    decline.mockResolvedValue(undefined);
    await open(deskOf());
    press(screen.getByRole("button", { name: "Decline" }));
    const box = screen.getByLabelText("Reason (optional)");
    expect(box).toHaveAttribute("maxlength", "120");
    fireEvent.change(box, { target: { value: "Out of town" } });
    press(screen.getByRole("button", { name: "Decline the request" }));
    await settle();
    expect(decline).toHaveBeenCalledWith("eni_1", "Out of town");
    expect(screen.getByRole("status")).toHaveTextContent("You declined the request from Ben Lim.");
  });

  it("can back out of declining", async () => {
    await open(deskOf());
    press(screen.getByRole("button", { name: "Decline" }));
    press(screen.getByRole("button", { name: "Keep it" }));
    expect(decline).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
  });

  it.each([
    ["notary_not_approved", /application is not approved, or your commission has ended/],
    ["enotary_invitation_unavailable", /no longer open/],
    ["something_else", /could not be done right now/],
  ])("says plainly what a refusal (%s) means", async (code, words) => {
    accept.mockRejectedValue(new ApiError(409, { code, message: code }, code));
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Accept the request" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(words);
  });
});

describe("the banner while the notary cannot accept", () => {
  it.each([
    ["none", /apply once/, "Start my application"], ["draft", /Finish your application/, "Continue my application"],
    ["submitted", /with a LAGDA reviewer/, "See my application"], ["rejected", /not approved/, "See why"],
    ["withdrawn", /withdrew/, "Open my application"], ["expired", /commission on record has ended/, "Update my application"],
    ["approved", /commission on record has ended/, "Update my application"],
  ] as const)("%s", async (applicationStatus, words, label) => {
    await open(deskOf({ applicationStatus, canAccept: false }));
    const banner = screen.getByTestId("desk-banner");
    expect(banner).toHaveTextContent(words);
    expect(within(banner).getByRole("link", { name: label })).toHaveAttribute("href", "/app/enotary/apply");
    expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
  });

  it("is absent when the notary can accept", () => {
    expect(bannerFor(deskOf())).toBeNull();
  });
});
