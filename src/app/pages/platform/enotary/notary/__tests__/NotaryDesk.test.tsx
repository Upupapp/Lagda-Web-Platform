/* eslint-disable testing-library/prefer-user-event, testing-library/no-unnecessary-act -- these files run on a held clock (fake timers), where userEvent waits on timers; fireEvent does not. */
// The notary desk: tallies, request rows with Accept and Decline, the banner
// while the application is not approved, and each refusal of an answer.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const desk = vi.fn();
const accept = vi.fn();
const decline = vi.fn();
const take = vi.fn();
const confirmPayment = vi.fn();
const paymentNotReceived = vi.fn();
const paymentScreenshot = vi.fn();
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: {
    desk: (...a: unknown[]) => desk(...a) as unknown, accept: (...a: unknown[]) => accept(...a) as unknown,
    decline: (...a: unknown[]) => decline(...a) as unknown, take: (...a: unknown[]) => take(...a) as unknown,
    confirmPayment: (...a: unknown[]) => confirmPayment(...a) as unknown,
    paymentNotReceived: (...a: unknown[]) => paymentNotReceived(...a) as unknown,
    paymentScreenshot: (...a: unknown[]) => paymentScreenshot(...a) as unknown,
  },
}));

const startSession = vi.fn();
const openRoom = vi.fn();
vi.mock("../../../../../services/real/enotary-sessions.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-sessions.service")>()),
  realEnotarySessionsService: {
    lookup: () => Promise.resolve(null),
    start: (...a: unknown[]) => startSession(...a) as unknown, open: (...a: unknown[]) => openRoom(...a) as unknown,
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
    expect(screen.getByTestId("tally-waiting")).toHaveTextContent("1");
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
    expect(screen.getByTestId("tally-waiting")).toHaveTextContent("1");
  });
});

describe("the desk", () => {
  it("counts waiting, in progress and completed requests, and lists each in its own section", async () => {
    await open(deskOf({ requests: [
      request({ id: "a" }), request({ id: "b", status: "accepted", client: { name: "Cara Tan", identityVerified: true }, decidedAt: "2026-10-17T00:30:00.000Z" }),
      request({ id: "c", status: "declined", client: { name: "Dan Uy", identityVerified: true } }), request({ id: "d", status: "expired", client: { name: "Eve Go", identityVerified: true } }),
    ] }));
    expect(screen.getByTestId("tally-waiting")).toHaveTextContent("1");
    expect(screen.getByTestId("tally-progress")).toHaveTextContent("1");
    expect(screen.getByTestId("tally-completed")).toHaveTextContent("0");
    expect(within(screen.getByTestId("desk-section-closed")).getAllByTestId("desk-row")).toHaveLength(2);
    const rows = screen.getAllByTestId("desk-row");
    expect(rows.map(row => row.getAttribute("data-status"))).toEqual(["claimed", "accepted", "declined", "expired"]);
    expect(rows[0]).toHaveTextContent("Ben Lim");
    expect(rows[0]).toHaveTextContent("ID verified");
    expect(rows[0]).toHaveTextContent("Waiting for you");
    expect(rows[1]).toHaveTextContent("The session can begin.");
    expect(screen.queryByTestId("desk-banner")).toBeNull();
    expect(screen.getByTestId("onramp-note")).toHaveTextContent(/Supreme Court accreditation/);
  });

  it("lists a notarized request among the completed, with its number, document, act, fee and where its copy is", async () => {
    const done = (id: string, copy: NonNullable<DeskRequest["case"]>["copy"]) => request({
      id, status: "accepted", client: { name: "Angela Ramos", identityVerified: true }, reference: "EN-2026-000004",
      session: { id: `ens_${id}`, status: "notarized", hasDocument: true },
      case: { documentName: "Deed of Sale", actLabel: "Acknowledgment", feeCentavos: 60_000, copy },
    });
    await open(deskOf({ requests: [
      done("a", { status: "received", mode: "physical", stage: "delivered" }),
      done("b", { status: "fulfilled", mode: "physical", stage: "delivered" }),
      done("c", null),
    ] }));
    expect(screen.getByTestId("tally-completed")).toHaveTextContent("3");
    expect(screen.getByTestId("tally-progress")).toHaveTextContent("0");
    const rows = within(screen.getByTestId("desk-section-completed")).getAllByTestId("desk-row");
    expect(rows[0]).toHaveTextContent("Angela Ramos");
    expect(rows[0]).toHaveTextContent("EN-2026-000004");
    // The facts of the card, each under its own label.
    const facts = within(rows[0]!).getAllByRole("term").map(term => `${term.textContent ?? ""}: ${term.nextElementSibling?.textContent ?? ""}`);
    expect(facts).toEqual(expect.arrayContaining(["Document: Deed of Sale", "Service: Acknowledgment", "Fee: PHP 600.00", "Reference no.: EN-2026-000004"]));
    expect(within(rows[0]!).getByTestId("desk-copy-state")).toHaveTextContent("Copy received by the client");
    expect(within(rows[1]!).getByTestId("desk-copy-state")).toHaveTextContent("Copy delivered, awaiting receipt");
    expect(within(rows[2]!).getByTestId("desk-copy-state")).toHaveTextContent("Notarized");
    expect(screen.getByTestId("open-register")).toHaveAttribute("href", "/app/enotary/register");
  });

  it("keeps a request whose room was called off out of progress", async () => {
    await open(deskOf({ requests: [request({ status: "accepted", session: { id: "ens_1", status: "cancelled", hasDocument: false } })] }));
    expect(screen.getByTestId("tally-progress")).toHaveTextContent("0");
    expect(within(screen.getByTestId("desk-section-closed")).getByTestId("desk-row")).toHaveTextContent("The session was called off");
  });

  it("shows a called-off request as the card: badges, the session's and the payment's states side by side, and the way in", async () => {
    await open(deskOf({ requests: [request({
      status: "accepted", reference: "EN-2026-000002", decidedAt: "2026-10-20T01:56:00.000Z",
      client: { name: "Christopher Oliva Cortes", identityVerified: true },
      session: { id: "ens_1", status: "cancelled", hasDocument: true },
      case: { documentName: "Receipt Signature.pdf", actLabel: "Signature witnessing", feeCentavos: 60_000, copy: null },
      payment: { status: "confirmed", amountCentavos: 60_000, reference: "GC-1", attemptsLeft: 0, proofAt: null, decidedAt: null },
    })] }));
    const card = within(screen.getByTestId("desk-section-closed")).getByTestId("desk-row");
    expect(within(card).getByRole("heading", { name: "Christopher Oliva Cortes" })).toBeInTheDocument();
    expect(card).toHaveTextContent("ID verified");
    expect(within(card).getByTestId("status-pill")).toHaveTextContent("Called off");
    expect(within(card).getByTestId("desk-session-state")).toHaveTextContent("The session was called off. Nothing was notarized.");
    expect(within(card).getByTestId("desk-payment")).toHaveTextContent("You confirmed the payment of PHP 600.00.");
    // Its session band offers "Open the session again", so the card has no Open beside its badges.
    expect(within(card).queryByTestId("desk-open")).toBeNull();
    expect(within(screen.getByTestId("desk-section-closed")).getByRole("heading", { level: 2 })).toHaveTextContent("Closed1");
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
    expect(screen.getByTestId("desk-empty")).toHaveTextContent(/No request is waiting/);
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
  it("accepts without naming a fee, and says the act and fee come later in the room", async () => {
    accept.mockResolvedValue(undefined);
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    expect(accept).not.toHaveBeenCalled();
    const panel = screen.getByTestId("accept-panel");
    expect(panel).toHaveTextContent(/video call/);
    expect(screen.getByTestId("accept-later")).toHaveTextContent(/state the notarial act and your fee, or no fee/);
    expect(screen.queryByTestId("fee-input")).toBeNull();
    desk.mockResolvedValue(deskOf({ requests: [request({ status: "accepted" })] }));
    press(within(panel).getByRole("button", { name: "Accept the request" }));
    await settle();
    expect(accept).toHaveBeenCalledWith("eni_1");
    expect(screen.getByRole("status")).toHaveTextContent(/accepted the request from Ben Lim. Once they start the session, you open the room from here/);
    expect(screen.getByTestId("tally-progress")).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });

  it("accepts a right-now request and opens the room in the same step (132)", async () => {
    accept.mockResolvedValue(undefined);
    startSession.mockResolvedValue({ id: "ens_1", status: "preparing" });
    openRoom.mockResolvedValue({ id: "ens_1", status: "live" });
    desk.mockResolvedValue(deskOf({ requests: [request({ booking: { kind: "now", at: null, answerBy: "2026-10-17T01:30:00.000Z" } })] }));
    render(
      <MemoryRouter initialEntries={["/app/enotary/desk"]}>
        <Routes>
          <Route path="/app/enotary/desk" element={<NotaryDeskPage />} />
          <Route path="/app/enotary/room/:id" element={<p data-testid="the-room">room</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await settle();
    press(screen.getByRole("button", { name: "Accept" }));
    expect(screen.getByTestId("accept-now")).toHaveTextContent(/accepting opens the room at once/);
    press(within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept and open the room" }));
    await settle(5_000);
    expect(accept).toHaveBeenCalledWith("eni_1");
    expect(startSession).toHaveBeenCalledWith("eni_1");
    expect(openRoom).toHaveBeenCalledWith("ens_1");
    expect(screen.getByTestId("the-room")).toBeInTheDocument();
  });

  it("does not need a saved payment QR to accept, and still points to where to save one for a fee", async () => {
    await open(deskOf({ paymentProfile: null }));
    expect(screen.getByTestId("desk-qr-banner")).toHaveTextContent(/save your payment QR first/);
    press(screen.getByRole("button", { name: "Accept" }));
    expect(within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept the request" })).toBeEnabled();
  });

  it("can back out of accepting", async () => {
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    press(screen.getByRole("button", { name: "Not now" }));
    expect(accept).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
  });

  it("declines only with a reason: one of the common ones, or another in 120 characters at most", async () => {
    decline.mockResolvedValue(undefined);
    await open(deskOf());
    press(screen.getByRole("button", { name: "Decline" }));
    // No reason chosen: nothing is sent.
    press(screen.getByRole("button", { name: "Decline the request" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a reason. The client is shown it.");
    expect(decline).not.toHaveBeenCalled();
    press(screen.getByRole("radio", { name: "Another reason" }));
    press(screen.getByRole("button", { name: "Decline the request" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Write the reason in a few words.");
    const box = screen.getByLabelText("Your reason");
    expect(box).toHaveAttribute("maxlength", "120");
    fireEvent.change(box, { target: { value: "Out of town" } });
    press(screen.getByRole("button", { name: "Decline the request" }));
    await settle();
    expect(decline).toHaveBeenCalledWith("eni_1", "Out of town");
    expect(screen.getByRole("status")).toHaveTextContent("You declined the request from Ben Lim.");
  });

  it("declines with one of the common reasons", async () => {
    decline.mockResolvedValue(undefined);
    await open(deskOf());
    press(screen.getByRole("button", { name: "Decline" }));
    press(screen.getByRole("radio", { name: "The document is outside my notarial jurisdiction." }));
    press(screen.getByRole("button", { name: "Decline the request" }));
    await settle();
    expect(decline).toHaveBeenCalledWith("eni_1", "The document is outside my notarial jurisdiction.");
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
    ["notary_name_mismatch", /reserved for the notary the client named\. It cannot be answered with your account\./],
    ["something_else", /could not be done right now/],
  ])("says plainly what a refusal (%s) means", async (code, words) => {
    accept.mockRejectedValue(new ApiError(409, { code, message: code }, code));
    await open(deskOf());
    press(screen.getByRole("button", { name: "Accept" }));
    press(within(screen.getByTestId("accept-panel")).getByRole("button", { name: "Accept the request" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(words);
  });
});

describe("confirming the payment", () => {
  const proofDesk = () => deskOf({ requests: [request({
    status: "accepted", decidedAt: "2026-10-17T00:30:00.000Z",
    payment: paid({ status: "proof", reference: "GC-12345678", proofAt: "2026-10-17T00:50:00.000Z", attemptsLeft: 4 }),
  })] });

  it("shows the reference the client gave, and says to look in the notary's own app", async () => {
    await open(proofDesk());
    expect(screen.getByTestId("tally-waiting")).toHaveTextContent("1");
    expect(screen.getByTestId("desk-reference")).toHaveTextContent("GC-12345678");
    expect(screen.getByTestId("desk-proof")).toHaveTextContent(/own bank or e-wallet app. The client’s screenshot helps you find it; do not go by the screenshot alone/);
    expect(screen.getByTestId("desk-payment")).toHaveTextContent("Ben Lim says they paid PHP 1,500.00.");
    // The fee does not hold the request up (2026-10-22): the session can begin while it is being paid.
    expect(screen.getByTestId("desk-row")).toHaveTextContent(/Accepted. The session can begin./);
  });

  it("opens the client's receipt screenshot in a panel, and says when there is none", async () => {
    URL.createObjectURL = vi.fn(() => "blob:receipt"); URL.revokeObjectURL = vi.fn();
    paymentScreenshot.mockResolvedValueOnce(new Blob(["x"], { type: "image/png" })).mockResolvedValueOnce(null);
    await open(proofDesk());
    fireEvent.click(screen.getByTestId("view-screenshot"));
    await settle();
    expect(paymentScreenshot).toHaveBeenCalledWith("eni_1");
    expect(screen.getByRole("dialog", { name: "Receipt screenshot from Ben Lim" })).toBeInTheDocument();
    expect(screen.getByTestId("screenshot-image")).toHaveAttribute("src", "blob:receipt");
    fireEvent.click(screen.getByRole("button", { name: "Close the screenshot" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByTestId("view-screenshot"));
    await settle();
    expect(screen.getByText("Ben Lim sent no screenshot with this payment.")).toBeInTheDocument();
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
    expect(screen.getByTestId("tally-waiting")).toHaveTextContent("0");
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

const openOne = async (d: NotaryDesk, focus: string) => {
  desk.mockResolvedValue(d);
  render(<MemoryRouter><NotaryDeskPage focus={focus} /></MemoryRouter>);
  await settle();
};

describe("one request, in its own page", () => {
  it("is linked from every row of the list", async () => {
    await open(deskOf());
    expect(screen.getByTestId("desk-open")).toHaveAttribute("href", "/app/enotary/desk/eni_1");
  });

  it("lays a waiting request out as the attorney pages do: its title, the client's card, what happens on accepting, then the answer", async () => {
    await openOne(deskOf(), "eni_1");
    expect(screen.getByTestId("case-title")).toHaveTextContent("Ben Lim asks you to notarize a document");
    expect(screen.getByTestId("party-card")).toHaveTextContent("Ben Lim");
    expect(screen.getByTestId("party-status")).toHaveTextContent("Waiting for you");
    expect(screen.getByTestId("party-identity")).toHaveTextContent("Verified by LAGDA");
    const panel = screen.getByTestId("new-request");
    expect(panel).toHaveTextContent("What happens when you accept");
    expect(panel).toHaveTextContent("A private room opens.");
    expect(screen.getAllByRole("listitem").some(item => item.textContent?.startsWith("1A private room opens."))).toBe(true);
    // The steps of the notary, in the order of the pages.
    expect(screen.getByRole("list", { name: "Steps of this request" })).toHaveTextContent("Request received");
    // The answer is the same as on the desk.
    press(screen.getByRole("button", { name: "Accept" }));
    expect(screen.getByTestId("accept-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("desk-open")).toBeNull();
  });

  it("offers a request not yet taken for taking, with its own title", async () => {
    take.mockResolvedValue({});
    await openOne(deskOf({ requests: [], incoming: [incomingOf()] }), "eni_new");
    expect(screen.getByTestId("case-title")).toHaveTextContent("Rosa Villanueva asks you to notarize a document");
    expect(screen.getByTestId("party-status")).toHaveTextContent("New: take it to answer");
    desk.mockResolvedValue(deskOf({ incoming: [], requests: [request({ id: "eni_new", client: { name: "Rosa Villanueva", identityVerified: true } })] }));
    press(screen.getByRole("button", { name: "Take this request" }));
    await settle();
    expect(take).toHaveBeenCalledWith("eni_new");
    expect(screen.getByRole("status")).toHaveTextContent("You took the request from Rosa Villanueva");
  });

  it("says plainly when the request is not on the desk, and leads back", async () => {
    await openOne(deskOf(), "nobody");
    expect(screen.getByTestId("request-missing")).toHaveTextContent("not on your desk");
    expect(screen.getByRole("link", { name: "Back to the desk" })).toHaveAttribute("href", "/app/enotary/desk");
  });
});

describe("bookings (130)", () => {
  // The desk's clock: Saturday, October 17, 2026, 9:00 AM in Manila.
  const BOOKED = { kind: "scheduled" as const, at: "2026-10-19T02:00:00.000Z", answerBy: null }; // Mon, Oct 19, 10:00 AM
  const URGENT = { kind: "now" as const, at: null, answerBy: "2026-10-17T01:15:00.000Z" }; // answer by 9:15 AM

  it("marks a request for right now, with the time to answer by", async () => {
    await open(deskOf({ requests: [], incoming: [incomingOf({ booking: URGENT })] }));
    const row = screen.getByTestId("desk-new-row");
    expect(row).toHaveTextContent("Right now");
    expect(within(row).getByTestId("desk-booking")).toHaveTextContent("Right now · answer by 9:15 AM");
  });

  it("shows a booked time on the request's card", async () => {
    await open(deskOf({ requests: [request({ booking: BOOKED })] }));
    expect(screen.getByTestId("desk-booking")).toHaveTextContent("Mon, Oct 19, 10:00 AM");
  });

  it("lists the accepted bookings still to come, soonest first, and leaves out the past and the finished", async () => {
    await open(deskOf({ requests: [
      request({ id: "eni_b", status: "accepted", client: { name: "Later Client", identityVerified: true }, booking: { ...BOOKED, at: "2026-10-20T03:00:00.000Z" } }),
      request({ id: "eni_a", status: "accepted", client: { name: "Sooner Client", identityVerified: true }, booking: BOOKED }),
      request({ id: "eni_c", status: "accepted", client: { name: "Past Client", identityVerified: true }, booking: { ...BOOKED, at: "2026-10-16T02:00:00.000Z" } }),
      request({ id: "eni_d", status: "claimed", client: { name: "Not Yet Accepted", identityVerified: true }, booking: BOOKED }),
    ] }));
    const rows = within(screen.getByTestId("desk-upcoming")).getAllByTestId("desk-upcoming-row");
    expect(rows.map(r => r.textContent)).toEqual([
      expect.stringContaining("Sooner Client"), expect.stringContaining("Later Client"),
    ]);
    expect(rows[0]).toHaveTextContent("Mon, Oct 19, 10:00 AM");
  });

  it("says plainly that a time is already taken when accepting a second booking for it", async () => {
    accept.mockRejectedValue(new ApiError(409, { code: "enotary_slot_taken", message: "That time was just booked." }, "That time was just booked."));
    await open(deskOf({ requests: [request({ booking: BOOKED })] }));
    press(screen.getByRole("button", { name: /^Accept/ }));
    await settle();
    const confirm = screen.queryAllByRole("button", { name: /^Accept/ }).at(-1);
    if (confirm !== undefined) press(confirm);
    await settle(2500);
    expect(document.body.textContent).toContain("You already accepted another booking at that time");
  });
});
