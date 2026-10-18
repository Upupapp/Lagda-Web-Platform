// The fee as the client sees it: who to pay and how much, the notary's QR, and
// where the transfer's reference goes; then the wait for the notary, and the end.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const sendPaymentProof = vi.fn();
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: { sendPaymentProof: (...a: unknown[]) => sendPaymentProof(...a) as unknown },
}));
vi.mock("../payment-qr", async (original) => ({
  ...(await original<typeof import("../payment-qr")>()),
  qrDataUrl: (payload: string) => Promise.resolve(`data:image/png;base64,${btoa(payload.slice(0, 12))}`),
}));

import { ClientPaymentPanel, paymentIsPending, referenceProblem } from "../ClientPaymentPanel";
import { ApiError } from "../../../../../services/api-client";
import type { Invitation, InvitationPayment } from "../../../../../services/real/enotary-invitations.service";

const PAYLOAD = "00020101021126300011ph.ppmi.p2m0111BNORPHMMXXX5204601253036085802PH5919ATTY AMADOR SIMANDO6009NAGA CITY63041234";

const payment = (over: Partial<InvitationPayment> = {}): InvitationPayment => ({
  status: "awaiting", amountCentavos: 150_000, payee: { name: "ATTY AMADOR SIMANDO", city: "NAGA CITY" }, qrPayload: PAYLOAD,
  reference: null, attemptsLeft: 5, requestedAt: "2026-10-18T00:00:00.000Z", proofAt: null, decidedAt: null, note: null, ...over,
});
const invitation = (over: Partial<InvitationPayment> = {}): Invitation => ({
  id: "eni_1", status: "accepted",
  notary: { directoryId: "a", name: "Amador L. Simando, Jr.", firm: "", city: "", province: "", emailOnRecord: true, accountKnown: true },
  notaryEmail: null, link: null, createdAt: "2026-10-17T00:00:00.000Z", expiresAt: "2026-10-20T00:00:00.000Z", secondsLeft: 0,
  claimedAt: "2026-10-17T01:00:00.000Z", decidedAt: "2026-10-18T00:00:00.000Z", payment: payment(over), timeline: [],
});

const show = (over: Partial<InvitationPayment> = {}, onChanged = vi.fn()) => {
  const inv = invitation(over);
  render(<ClientPaymentPanel invitation={inv} payment={inv.payment as InvitationPayment} onChanged={onChanged} />);
  return onChanged;
};

beforeEach(() => { sendPaymentProof.mockReset(); });

describe("paying the notary", () => {
  it("names the amount and the payee, shows the QR the notary saved, and says how to pay", async () => {
    show();
    expect(screen.getByTestId("payment-amount")).toHaveTextContent("PHP 1,500.00");
    expect(screen.getByTestId("payment-payee")).toHaveTextContent("Pay to ATTY AMADOR SIMANDO · NAGA CITY");
    expect(screen.getByTestId("payment-payee")).toHaveTextContent(/different name, do not pay/);
    expect(await screen.findByTestId("payment-qr-image")).toHaveAttribute("alt", "Payment QR code of ATTY AMADOR SIMANDO");
    expect(screen.getByRole("button", { name: "Save the QR" })).toBeEnabled();
    expect(screen.getByTestId("payment-steps")).toHaveTextContent(/Type the amount exactly: PHP 1,500.00/);
    expect(screen.getByText(/LAGDA does not hold or move the money, and cannot refund it/)).toBeInTheDocument();
  });

  it("asks for nothing but a reference number, and sends it once it looks like one", async () => {
    const user = userEvent.setup();
    const changed = show();
    const send = screen.getByRole("button", { name: "I have paid" });
    expect(send).toBeDisabled();
    const box = screen.getByLabelText("Reference number of your transfer");
    await user.type(box, "ab");
    expect(send).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/6 to 40 characters/);
    await user.clear(box);
    await user.type(box, "gc#12345");
    expect(screen.getByRole("alert")).toHaveTextContent(/only letters, numbers and dashes/i);
    expect(send).toBeDisabled();
    await user.clear(box);
    await user.type(box, "GC-1234 5678");
    expect(send).toBeEnabled();
    const next = invitation({ status: "proof", reference: "GC-12345678", qrPayload: PAYLOAD, attemptsLeft: 4 });
    sendPaymentProof.mockResolvedValue(next);
    await user.click(send);
    await waitFor(() => { expect(changed).toHaveBeenCalledWith(next); });
    expect(sendPaymentProof).toHaveBeenCalledWith("eni_1", "GC-1234 5678");
  });

  it("says plainly when the server will not take the reference, and keeps what was typed", async () => {
    const user = userEvent.setup();
    show();
    sendPaymentProof.mockRejectedValue(new ApiError(409, { code: "payment_state", message: "x" }, "payment_state"));
    await user.type(screen.getByLabelText("Reference number of your transfer"), "GC-12345678");
    await user.click(screen.getByRole("button", { name: "I have paid" }));
    expect(await screen.findByText(/already moved on/)).toBeInTheDocument();
    expect(screen.getByLabelText("Reference number of your transfer")).toHaveValue("GC-12345678");
  });

  it("tells the client the notary did not find the payment, with the note, and how many sends are left", () => {
    show({ status: "not_received", note: "No transfer with that reference.", attemptsLeft: 3, reference: "GC-12345678" });
    const notice = screen.getByTestId("payment-not-received");
    expect(notice).toHaveTextContent(/could not find your payment: No transfer with that reference/);
    expect(notice).toHaveTextContent("You can send it 3 more times.");
    expect(screen.getByRole("button", { name: "I have paid" })).toBeDisabled();
    expect(screen.getByTestId("payment-qr")).toBeInTheDocument();
  });

  it("stops offering to send proof when none is left", () => {
    show({ status: "not_received", attemptsLeft: 0 });
    expect(screen.getByTestId("payment-not-received")).toHaveTextContent(/contact the notary/);
    expect(screen.getByRole("button", { name: "I have paid" })).toBeDisabled();
  });

  it("waits for the notary once proof is sent, and shows no QR to pay to again", () => {
    show({ status: "proof", reference: "GC-12345678", attemptsLeft: 4 });
    expect(screen.getByTestId("payment-waiting")).toHaveTextContent(/paid PHP 1,500.00 \(reference GC-12345678\)/);
    expect(screen.getByTestId("payment-waiting")).toHaveTextContent(/checks their own account and confirms/);
    expect(screen.queryByTestId("payment-qr")).toBeNull();
    expect(screen.queryByRole("button", { name: "I have paid" })).toBeNull();
  });

  it("ends with the notary's confirmation, without the QR", () => {
    show({ status: "confirmed", reference: "GC-12345678", qrPayload: null, decidedAt: "2026-10-18T02:00:00.000Z" });
    const done = screen.getByTestId("payment-confirmed");
    expect(done).toHaveTextContent(/confirmed your payment of PHP 1,500.00 \(reference GC-12345678\)/);
    expect(within(screen.getByTestId("payment-panel")).queryByTestId("payment-qr")).toBeNull();
  });

  it("owes nothing when there is no fee", () => {
    show({ status: "waived", amountCentavos: 0, payee: null, qrPayload: null });
    expect(screen.getByTestId("payment-waived")).toHaveTextContent(/not charging a fee/);
    expect(screen.queryByTestId("payment-qr")).toBeNull();
  });
});

describe("what counts as pending, and as a reference", () => {
  it("is pending until it is confirmed or waived", () => {
    expect(["awaiting", "proof", "not_received"].every(status => paymentIsPending(payment({ status: status as never })))).toBe(true);
    expect(paymentIsPending(payment({ status: "confirmed" }))).toBe(false);
    expect(paymentIsPending(payment({ status: "waived" }))).toBe(false);
    expect(paymentIsPending(null)).toBe(false);
    expect(paymentIsPending(undefined)).toBe(false);
  });

  it("reads a reference the way the server does", () => {
    expect(referenceProblem("")).toBeNull();
    expect(referenceProblem("GC-1234 5678")).toBeNull();
    expect(referenceProblem("12345")).toMatch(/6 to 40/);
    expect(referenceProblem("x".repeat(41))).toMatch(/6 to 40/);
    expect(referenceProblem("ab#12345")).toMatch(/letters, numbers and dashes/);
  });
});
