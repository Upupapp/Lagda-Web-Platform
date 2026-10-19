/* eslint-disable testing-library/prefer-user-event, testing-library/no-unnecessary-act -- these files run on a held clock (fake timers), where userEvent waits on timers; fireEvent does not. */
// The notary desk: tallies, request rows with Accept and Decline, the banner
// while the application is not approved, and each refusal of an answer.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const desk = vi.fn();
const accept = vi.fn();
const decline = vi.fn();
const take = vi.fn();
const confirmPayment = vi.fn();
const paymentNotReceived = vi.fn();
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: {
    desk: (...a: unknown[]) => desk(...a) as unknown, accept: (...a: unknown[]) => accept(...a) as unknown,
    decline: (...a: unknown[]) => decline(...a) as unknown, take: (...a: unknown[]) => take(...a) as unknown,
    confirmPayment: (...a: unknown[]) => confirmPayment(...a) as unknown,
    paymentNotReceived: (...a: unknown[]) => paymentNotReceived(...a) as unknown,
  },
}));

import { NotaryDeskPage, bannerFor } from "../NotaryDeskPage";
import { ApiError } from "../../../../../services/api-client";
import type { DeskIncoming, DeskPayment, DeskRequest, NotaryDesk } from "../../../../../services/real/enotary-invitations.service";

const request = (over: Partial<DeskRequest> = {}): DeskRequest => ({
  id: "eni_1", status: "claimed", client: { name: "Ben Lim", identityVerified: true },
  receivedAt: "2026-10-17T01:00:00.000Z", expiresAt: "2026-10-19T01:00:00.000Z", secondsLeft: 2 * 24 * 3600, decidedAt: null, ...over,
});
const deskOf = (over: Partial<NotaryDesk> = {}): NotaryDesk => ({
  applicationStatus: "approved", canAccept: true, paymentProfile: { payeeName: "ATTY ANA CRUZ", payeeCity: "MAKATI" },
  requests: [request()], ...over,
});
const paid = (over: Partial<DeskPayment> = {}): DeskPayment => ({
  status: "awaiting", amountCentavos: 150_000, reference: null, attemptsLeft: 5, proofAt: null, decidedAt: null, ...over,
});

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

const incomingOf = (over: Partial<DeskIncoming> = {}): DeskIncoming => ({
  id: "eni_new", client: { name: "Rosa Villanueva", identityVerified: true },
  receivedAt: "2026-10-17T00:55:00.000Z", expiresAt: "2026-10-20T00:55:00.000Z", secondsLeft: 3 * 24 * 3600 - 300, ...over,
});

describe("requests sent to the notary's own listing", () => {
  it("are listed as new, with the client's name, a count and the time left, before the notary has opened any link", async () => {
    await open(deskOf({ requests: [], incoming: [incomingOf()] }));
    expect(screen.getByTestId("tally-new")).toHaveTextContent("1");
    const rows = screen.getAllByTestId("desk-new-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Rosa Villanueva");
    expect(rows[0]).toHaveTextContent("ID verified");
    expect(screen.getByTestId("desk-new-countdown")).toHaveTextContent(/left/);
    // With something to take, the desk does not also say there is nothing.
    expect(screen.queryByTestId("desk-empty")).toBeNull();
  });

  it("are taken with one press, then the desk is read again", async () => {
    take.mockResolvedValue({});
    await open(deskOf({ requests: [], incoming: [incomingOf()] }));
    desk.mockResolvedValue(deskOf({ incoming: [], requests: [request({ id: "eni_new", client: { name: "Rosa Villanueva", identityVerified: true } })] }));
    press(screen.getByRole("button", { name: "Take this request" }));
    await settle();
    expect(take).toHaveBeenCalledWith("eni_new");
    expect(screen.getByRole("status")).toHaveTextContent("You took the request from Rosa Villanueva");
    expect(screen.queryByTestId("desk-new")).toBeNull();
    expect(screen.getAllByTestId("desk-row")).toHaveLength(1);
  });

  it("say plainly when the request is gone or the identity does not match", async () => {
    take.mockRejectedValueOnce(new ApiError(404, { code: "enotary_invitation_unavailable", message: "gone" }, "gone"));
    await open(deskOf({ requests: [], incoming: [incomingOf()] }));
    press(screen.getByRole("button", { name: "Take this request" }));
    await settle();
    expect(screen.getByText(/no longer open/)).toBeInTheDocument();
    take.mockRejectedValueOnce(new ApiError(409, { code: "notary_name_mismatch", message: "name" }, "name"));
    press(screen.getByRole("button", { name: "Take this request" }));
    await settle();
    expect(screen.getByText(/name on your verified ID does not match/)).toBeInTheDocument();
  });

  it("work against an older server that sends no list", async () => {
    await open(deskOf());
    expect(screen.queryByTestId("desk-new")).toBeNull();
    expect(screen.getByTestId("tally-new")).toHaveTextContent("0");
  });
});

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
    expect(rows[1]).toHaveTextContent("The session can begin.");
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

  it("asks again every 5 seconds, so a new request appears without a refresh", async () => {
    await open(deskOf());
    await settle(5_000);
    expect(desk).toHaveBeenCalledTimes(2);
  });

  it("says so when the desk is not offered", async () => {
    await open(null);
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
  });
});

describe("accepting and declining", () => {
  it("accepts only once a fee is named, and says The online session begins once the fee is settled", async () => {
    accept.mockResolvedValue(undefined);
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    expect(accept).not.toHaveBeenCalled();
    const panel = screen.getByTestId("accept-panel");
    expect(panel).toHaveTextContent(/The online session begins once the fee is settled/);
    expect(panel).toHaveTextContent(/LAGDA never holds the money/);
    expect(within(panel).getByRole("button", { name: "Accept the request" })).toBeDisabled();
    fireEvent.change(screen.getByTestId("fee-input"), { target: { value: "1,500.50" } });
    desk.mockResolvedValue(deskOf({ requests: [request({ status: "accepted", payment: paid({ amountCentavos: 150_050 }) })] }));
    press(within(panel).getByRole("button", { name: "Accept the request" }));
    await settle();
    expect(accept).toHaveBeenCalledWith("eni_1", 150_050);
    expect(screen.getByRole("status")).toHaveTextContent(/accepted the request from Ben Lim. They were asked to pay PHP 1,500.50/);
    expect(screen.getByTestId("tally-accepted")).toHaveTextContent("1");
    expect(screen.getByTestId("desk-payment")).toHaveTextContent("Waiting for Ben Lim to pay PHP 1,500.50.");
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });

  it("refuses a fee that is not a sum of pesos within bounds before asking the server", async () => {
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    const accepting = () => within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept the request" });
    for (const bad of ["abc", "0.5", "50001", "12.345", "-5", "1e3"]) {
      fireEvent.change(screen.getByTestId("fee-input"), { target: { value: bad } });
      expect(screen.getByRole("alert"), bad).toHaveTextContent(/between 1 and 50,000 pesos/);
      expect(accepting(), bad).toBeDisabled();
    }
    fireEvent.change(screen.getByTestId("fee-input"), { target: { value: "PHP 2,000" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(accepting()).toBeEnabled();
    expect(accept).not.toHaveBeenCalled();
  });

  it("accepts with no fee when the notary says they are not charging one", async () => {
    accept.mockResolvedValue(undefined);
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    press(screen.getByTestId("no-fee"));
    expect(screen.getByTestId("fee-input")).toBeDisabled();
    press(within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept the request" }));
    await settle();
    expect(accept).toHaveBeenCalledWith("eni_1", 0);
    expect(screen.getByRole("status")).toHaveTextContent(/without a fee/);
  });

  it("will not ask for a fee without a saved payment QR, and points to where to save one", async () => {
    await open(deskOf({ paymentProfile: null }));
    expect(screen.getByTestId("desk-qr-banner")).toHaveTextContent(/save your payment QR first/);
    press(screen.getByRole("button", { name: "Accept" }));
    fireEvent.change(screen.getByTestId("fee-input"), { target: { value: "1500" } });
    expect(screen.getByTestId("accept-needs-qr")).toHaveTextContent(/you have not saved one/);
    expect(within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept the request" })).toBeDisabled();
    expect(within(screen.getByTestId("accept-panel")).getByRole("link", { name: "Save my payment QR" })).toHaveAttribute("href", "/app/enotary/payment");
    // No fee needs no QR.
    press(screen.getByTestId("no-fee"));
    expect(within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept the request" })).toBeEnabled();
  });

  it("can back out of accepting", async () => {
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    press(screen.getByRole("button", { name: "Not now" }));
    expect(accept).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
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
    fireEvent.change(screen.getByTestId("fee-input"), { target: { value: "1500" } });
    press(within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept the request" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(words);
  });

  it("tells a notary whose payment QR was removed meanwhile to save one", async () => {
    accept.mockRejectedValue(new ApiError(409, { code: "payment_profile_required", message: "x" }, "payment_profile_required"));
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    fireEvent.change(screen.getByTestId("fee-input"), { target: { value: "1500" } });
    press(within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept the request" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(/Save your payment QR first/);
  });
});

describe("confirming the payment", () => {
  const proofDesk = () => deskOf({ requests: [request({
    status: "accepted", decidedAt: "2026-10-17T00:30:00.000Z",
    payment: paid({ status: "proof", reference: "GC-12345678", proofAt: "2026-10-17T00:50:00.000Z", attemptsLeft: 4 }),
  })] });

  it("shows the reference the client gave, and says to look in the notary's own app", async () => {
    await open(proofDesk());
    expect(screen.getByTestId("tally-confirm")).toHaveTextContent("1");
    expect(screen.getByTestId("desk-reference")).toHaveTextContent("GC-12345678");
    expect(screen.getByTestId("desk-proof")).toHaveTextContent(/own bank or e-wallet app. Do not go by a screenshot/);
    expect(screen.getByTestId("desk-payment")).toHaveTextContent("Ben Lim says they paid PHP 1,500.00.");
    expect(screen.getByTestId("desk-row")).toHaveTextContent(/goes on once the fee is paid and you have confirmed it/);
  });

  it("confirms only after the notary says the money is in their account", async () => {
    confirmPayment.mockResolvedValue(undefined);
    await open(proofDesk());
    press(screen.getByRole("button", { name: "I received it" }));
    expect(confirmPayment).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/PHP 1,500.00/);
    expect(dialog).toHaveTextContent(/GC-12345678/);
    desk.mockResolvedValue(deskOf({ requests: [request({ status: "accepted", payment: paid({ status: "confirmed", reference: "GC-12345678", decidedAt: "2026-10-17T01:00:00.000Z" }) })] }));
    press(within(dialog).getByRole("button", { name: "Yes, I received it" }));
    await settle();
    expect(confirmPayment).toHaveBeenCalledWith("eni_1");
    expect(screen.getByRole("status")).toHaveTextContent("You confirmed the payment from Ben Lim.");
    expect(screen.getByTestId("desk-payment")).toHaveTextContent("You confirmed the payment of PHP 1,500.00.");
    expect(screen.queryByTestId("desk-proof")).toBeNull();
    expect(screen.getByTestId("desk-row")).toHaveTextContent("The session can begin.");
  });

  it("tells the client the payment did not arrive, with a note cut to 120 characters", async () => {
    paymentNotReceived.mockResolvedValue(undefined);
    await open(proofDesk());
    press(screen.getByRole("button", { name: "Not received" }));
    const box = screen.getByLabelText("Note for the client (optional)");
    expect(box).toHaveAttribute("maxlength", "120");
    fireEvent.change(box, { target: { value: "No transfer with that reference." } });
    desk.mockResolvedValue(deskOf({ requests: [request({ status: "accepted", payment: paid({ status: "not_received", reference: "GC-12345678", attemptsLeft: 4 }) })] }));
    press(screen.getByRole("button", { name: "Tell the client it did not arrive" }));
    await settle();
    expect(paymentNotReceived).toHaveBeenCalledWith("eni_1", "No transfer with that reference.");
    expect(screen.getByRole("status")).toHaveTextContent(/Ben Lim was told the payment did not arrive/);
    expect(screen.getByTestId("desk-payment")).toHaveTextContent(/did not arrive. Waiting for another proof/);
  });

  it("says plainly when the payment has already moved on", async () => {
    confirmPayment.mockRejectedValue(new ApiError(409, { code: "payment_state", message: "x" }, "payment_state"));
    await open(proofDesk());
    press(screen.getByRole("button", { name: "I received it" }));
    press(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Yes, I received it" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(/already moved on/);
  });

  it.each([
    ["waived", "No fee for this request."],
    ["awaiting", "Waiting for Ben Lim to pay PHP 1,500.00."],
    ["not_received", "did not arrive. Waiting for another proof."],
  ] as const)("says where a %s payment stands, with nothing to confirm", async (status, words) => {
    await open(deskOf({ requests: [request({ status: "accepted", payment: paid({ status, amountCentavos: status === "waived" ? 0 : 150_000 }) })] }));
    expect(screen.getByTestId("desk-payment")).toHaveTextContent(words);
    expect(screen.queryByTestId("desk-proof")).toBeNull();
    expect(screen.getByTestId("tally-confirm")).toHaveTextContent("0");
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
