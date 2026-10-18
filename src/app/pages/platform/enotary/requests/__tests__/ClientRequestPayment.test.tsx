/* eslint-disable testing-library/prefer-user-event, testing-library/no-unnecessary-act -- these files run on a held clock (fake timers), where userEvent waits on timers; fireEvent does not. */
// A request after the notary accepted it: the fee panel is on the page, the page
// keeps asking while a fee is still to be paid or confirmed, and stops once it is
// settled.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const get = vi.fn();
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: { get: (...a: unknown[]) => get(...a) as unknown },
}));
vi.mock("../../payments/payment-qr", async (original) => ({
  ...(await original<typeof import("../../payments/payment-qr")>()),
  qrDataUrl: () => Promise.resolve("data:image/png;base64,AAAA"),
}));

import { ClientRequestPage, POLL_MS } from "../ClientRequestPage";
import type { Invitation, InvitationPayment } from "../../../../../services/real/enotary-invitations.service";

const payment = (over: Partial<InvitationPayment> = {}): InvitationPayment => ({
  status: "awaiting", amountCentavos: 150_000, payee: { name: "ATTY ANA CRUZ", city: null }, qrPayload: "0002…",
  reference: null, attemptsLeft: 5, requestedAt: "2026-10-17T01:00:00.000Z", proofAt: null, decidedAt: null, note: null, ...over,
});
const accepted = (over: Partial<InvitationPayment> | null = {}): Invitation => ({
  id: "eni_1", status: "accepted",
  notary: { directoryId: "ana-cruz", name: "Ana Maria Cruz", firm: "Cruz Law", city: "Makati City", province: "Metro Manila", emailOnRecord: true, accountKnown: true },
  notaryEmail: null, link: null, createdAt: "2026-10-17T00:00:00.000Z", expiresAt: "2026-10-20T00:00:00.000Z", secondsLeft: 0,
  claimedAt: "2026-10-17T00:30:00.000Z", decidedAt: "2026-10-17T01:00:00.000Z",
  payment: over === null ? null : payment(over), timeline: [],
});

const settle = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const open = async (first: Invitation) => {
  get.mockResolvedValue(first);
  render(
    <MemoryRouter initialEntries={["/app/enotary/requests/eni_1"]}>
      <Routes><Route path="/app/enotary/requests/:id" element={<ClientRequestPage />} /></Routes>
    </MemoryRouter>,
  );
  await settle();
};

beforeEach(() => {
  get.mockReset();
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-10-17T02:00:00.000Z"));
});
afterEach(() => { vi.useRealTimers(); });

describe("an accepted request with a fee", () => {
  it("says to pay below, and shows the payment panel with the amount", async () => {
    await open(accepted());
    expect(screen.getByTestId("request-notice")).toHaveTextContent("Ana Maria Cruz accepted your request. Pay the fee below to go on.");
    expect(screen.getByTestId("payment-panel")).toBeInTheDocument();
    expect(screen.getByTestId("payment-amount")).toHaveTextContent("PHP 1,500.00");
  });

  it("keeps asking while the fee is unpaid, and notices when the notary confirms", async () => {
    await open(accepted());
    expect(get).toHaveBeenCalledTimes(1);
    get.mockResolvedValue(accepted({ status: "proof", reference: "GC-12345678", attemptsLeft: 4 }));
    await settle(POLL_MS);
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("request-notice")).toHaveTextContent("They are checking your payment.");
    expect(screen.getByTestId("payment-waiting")).toBeInTheDocument();
    get.mockResolvedValue(accepted({ status: "confirmed", reference: "GC-12345678", qrPayload: null, decidedAt: "2026-10-17T02:01:00.000Z" }));
    await settle(POLL_MS);
    expect(screen.getByTestId("payment-confirmed")).toBeInTheDocument();
    expect(screen.getByTestId("request-notice")).toHaveTextContent("You will be told when the session can begin.");
    const calls = get.mock.calls.length;
    await settle(POLL_MS * 3);
    expect(get).toHaveBeenCalledTimes(calls);
  });

  it("stops asking at once when there is no fee", async () => {
    await open(accepted({ status: "waived", amountCentavos: 0, payee: null, qrPayload: null }));
    expect(screen.getByTestId("payment-waived")).toBeInTheDocument();
    await settle(POLL_MS * 3);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("shows no payment panel for a request accepted before fees existed", async () => {
    await open(accepted(null));
    expect(screen.queryByTestId("payment-panel")).toBeNull();
    expect(screen.getByTestId("request-notice")).toHaveTextContent("You will be told when the session can begin.");
    await settle(POLL_MS * 3);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
