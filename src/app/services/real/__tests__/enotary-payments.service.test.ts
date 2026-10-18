// The sums, the words and the calls of paying a notary.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../api-client";
import {
  describePaymentError, formatPesos, parsePesos, realEnotaryInvitationsService,
} from "../enotary-invitations.service";

describe("pesos", () => {
  it("shows whole centavos with separators and two decimals", () => {
    expect(formatPesos(150_000)).toBe("1,500.00");
    expect(formatPesos(5)).toBe("0.05");
    expect(formatPesos(123_456_789)).toBe("1,234,567.89");
    expect(formatPesos(0)).toBe("0.00");
  });

  it("reads what a person typed as whole centavos", () => {
    expect(parsePesos("1500")).toBe(150_000);
    expect(parsePesos("1,500.50")).toBe(150_050);
    expect(parsePesos(" PHP 2,000 ")).toBe(200_000);
    expect(parsePesos("₱ 99.9")).toBe(9_990);
    expect(parsePesos("0")).toBe(0);
    expect(parsePesos("0.00")).toBe(0);
  });

  it("refuses what is not a sum of money, or is outside the fee bounds", () => {
    for (const bad of ["", "abc", "1.234", "-5", "1e3", "0.5", "50000.01", "999999", "12 34"]) {
      expect(parsePesos(bad), bad).toBeNull();
    }
    expect(parsePesos("50000")).toBe(5_000_000);
    expect(parsePesos("1")).toBe(100);
  });
});

describe("the words for a refusal", () => {
  const refusal = (status: number, code: string, details?: { field: string; code: string; message: string }[]) =>
    new ApiError(status, { code, message: code, ...(details === undefined ? {} : { details }) }, code);

  it("says what each payment code means", () => {
    expect(describePaymentError(refusal(409, "payment_profile_required"))).toMatch(/Save your payment QR/);
    expect(describePaymentError(refusal(409, "payment_state"))).toMatch(/already moved on/);
    expect(describePaymentError(refusal(409, "notary_not_approved"))).toMatch(/not approved/);
    expect(describePaymentError(refusal(410, "enotary_invitation_unavailable"))).toMatch(/no longer open/);
    expect(describePaymentError(refusal(422, "validation_failed"))).toMatch(/not accepted/);
    expect(describePaymentError(refusal(500, "x"))).toMatch(/could not be done right now/);
  });

  it("repeats the server's own reason for a QR it cannot use", () => {
    const message = "That is not a payment QR. Upload the QR your bank or e-wallet app shows for receiving money.";
    expect(describePaymentError(refusal(422, "payment_qr_invalid", [{ field: "qrPayload", code: "not_a_payment_code", message }]))).toBe(message);
    expect(describePaymentError(refusal(422, "payment_qr_invalid"))).toMatch(/not a payment QR/);
  });

  it("says when the server cannot be reached or the session ended", () => {
    expect(describePaymentError(new ApiError(0, undefined, "network"))).toMatch(/Could not reach the server/);
    expect(describePaymentError(refusal(401, "AUTHENTICATION_REQUIRED"))).toMatch(/session has ended/);
    expect(describePaymentError(refusal(429, "rate_limited"))).toMatch(/Too many tries/);
  });
});

describe("the calls", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  const answer = (body: unknown, status = 200) => fetchMock.mockImplementation(() => Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })));
  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
    return { url, method: init.method ?? "GET", body: typeof init.body === "string" ? JSON.parse(init.body) as unknown : undefined };
  };

  it("sends the fee with an acceptance, and nothing when none is named", async () => {
    answer({ request: {} });
    await realEnotaryInvitationsService.accept("eni_1", 150_000);
    expect(lastCall()).toMatchObject({ url: expect.stringContaining("/me/notary/requests/eni_1/accept") as string, method: "POST", body: { feeCentavos: 150_000 } });
    await realEnotaryInvitationsService.accept("eni_1");
    expect(lastCall().body).toEqual({});
    await realEnotaryInvitationsService.accept("eni_1", 0);
    expect(lastCall().body).toEqual({ feeCentavos: 0 });
  });

  it("reads, saves and removes the notary's payment QR", async () => {
    const profile = { payeeName: "ATTY ANA CRUZ", payeeCity: null, qrPayload: "0002…", updatedAt: "2026-10-18T00:00:00.000Z" };
    answer({ profile });
    expect(await realEnotaryInvitationsService.paymentProfile()).toEqual(profile);
    expect(lastCall()).toMatchObject({ method: "GET" });
    expect(lastCall().url).toContain("/me/notary/payment-profile");
    expect(await realEnotaryInvitationsService.savePaymentProfile("0002…")).toEqual(profile);
    expect(lastCall()).toMatchObject({ method: "PUT", body: { qrPayload: "0002…" } });
    answer({ profile: null });
    await realEnotaryInvitationsService.removePaymentProfile();
    expect(lastCall().method).toBe("DELETE");
  });

  it("sends the client's reference, and the notary's answers", async () => {
    answer({ invitation: { id: "eni_1" } });
    expect(await realEnotaryInvitationsService.sendPaymentProof("eni_1", "GC-1234")).toEqual({ id: "eni_1" });
    expect(lastCall()).toMatchObject({ method: "POST", body: { reference: "GC-1234" } });
    expect(lastCall().url).toContain("/me/enotary/invitations/eni_1/payment-proof");
    answer({ payment: {} });
    await realEnotaryInvitationsService.confirmPayment("eni_1");
    expect(lastCall().url).toContain("/me/notary/requests/eni_1/payment/confirm");
    await realEnotaryInvitationsService.paymentNotReceived("eni_1", "  No transfer.  ");
    expect(lastCall()).toMatchObject({ method: "POST", body: { note: "No transfer." } });
    expect(lastCall().url).toContain("/payment/not-received");
    await realEnotaryInvitationsService.paymentNotReceived("eni_1");
    expect(lastCall().body).toEqual({});
  });
});
