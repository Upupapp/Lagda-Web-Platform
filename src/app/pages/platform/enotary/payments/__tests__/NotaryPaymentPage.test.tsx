// The notary's payment QR page: nothing saved yet, a picture read and saved, the
// server's refusal of a code it cannot use, replacing and removing.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const paymentProfile = vi.fn();
const savePaymentProfile = vi.fn();
const removePaymentProfile = vi.fn();
vi.mock("../../../../../services/real/enotary-invitations.service", async (original) => ({
  ...(await original<typeof import("../../../../../services/real/enotary-invitations.service")>()),
  realEnotaryInvitationsService: {
    paymentProfile: (...a: unknown[]) => paymentProfile(...a) as unknown,
    savePaymentProfile: (...a: unknown[]) => savePaymentProfile(...a) as unknown,
    removePaymentProfile: (...a: unknown[]) => removePaymentProfile(...a) as unknown,
  },
}));
const decodeQrPicture = vi.fn();
vi.mock("../payment-qr", async (original) => ({
  ...(await original<typeof import("../payment-qr")>()),
  decodeQrPicture: (...a: unknown[]) => decodeQrPicture(...a) as unknown,
  qrDataUrl: () => Promise.resolve("data:image/png;base64,AAAA"),
}));

import { NotaryPaymentPage } from "../NotaryPaymentPage";
import { QrPictureError } from "../payment-qr";
import { ApiError } from "../../../../../services/api-client";
import type { PaymentProfile } from "../../../../../services/real/enotary-invitations.service";

const PROFILE: PaymentProfile = { payeeName: "ATTY ANA CRUZ", payeeCity: "MAKATI", qrPayload: "0002…", updatedAt: "2026-10-18T00:00:00.000Z" };
const picture = () => new File(["x"], "qr.png", { type: "image/png" });

const open = async (profile: PaymentProfile | null) => {
  paymentProfile.mockResolvedValue(profile);
  render(<MemoryRouter><NotaryPaymentPage /></MemoryRouter>);
  await screen.findByRole("heading", { level: 1 });
};

beforeEach(() => { paymentProfile.mockReset(); savePaymentProfile.mockReset(); removePaymentProfile.mockReset(); decodeQrPicture.mockReset(); });

describe("the notary's payment QR", () => {
  it("explains how the notary is paid, and asks for a picture when none is saved", async () => {
    await open(null);
    expect(screen.getByTestId("payment-how")).toHaveTextContent(/LAGDA never holds or moves the money/);
    expect(screen.getByTestId("payment-empty")).toHaveTextContent(/standing QR/);
    expect(screen.getByRole("button", { name: "Choose a picture" })).toBeEnabled();
    expect(screen.queryByTestId("payment-profile")).toBeNull();
    expect(screen.getByRole("link", { name: /Back to the desk/ })).toHaveAttribute("href", "/app/enotary/desk");
  });

  it("reads the picture in the browser, sends only its text, and shows who clients will pay", async () => {
    const user = userEvent.setup();
    await open(null);
    decodeQrPicture.mockResolvedValue("0002…");
    savePaymentProfile.mockResolvedValue(PROFILE);
    await user.upload(screen.getByTestId("payment-qr-file"), picture());
    await waitFor(() => { expect(savePaymentProfile).toHaveBeenCalledWith("0002…"); });
    expect(await screen.findByTestId("payee-name")).toHaveTextContent("ATTY ANA CRUZ");
    expect(screen.getByRole("status")).toHaveTextContent("Saved. Clients will be asked to pay ATTY ANA CRUZ.");
    expect(await screen.findByTestId("payment-qr-image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace the QR" })).toBeInTheDocument();
  });

  it("says what is wrong with a picture that holds no QR, and saves nothing", async () => {
    const user = userEvent.setup();
    await open(null);
    decodeQrPicture.mockRejectedValue(new QrPictureError("no_code"));
    await user.upload(screen.getByTestId("payment-qr-file"), picture());
    expect(await screen.findByText(/No QR code was found in that picture/)).toBeInTheDocument();
    expect(savePaymentProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId("payment-empty")).toBeInTheDocument();
  });

  it("repeats the server's reason for a code it cannot use, and keeps the one already saved", async () => {
    const user = userEvent.setup();
    await open(PROFILE);
    decodeQrPicture.mockResolvedValue("https://example.com");
    savePaymentProfile.mockRejectedValue(new ApiError(422, {
      code: "payment_qr_invalid", message: "x",
      details: [{ field: "qrPayload", code: "not_a_payment_code", message: "That is not a payment QR. Upload the QR your bank or e-wallet app shows for receiving money." }],
    }, "payment_qr_invalid"));
    await user.upload(screen.getByTestId("payment-qr-file"), picture());
    expect(await screen.findByRole("alert")).toHaveTextContent(/That is not a payment QR/);
    expect(screen.getByTestId("payee-name")).toHaveTextContent("ATTY ANA CRUZ");
  });

  it("removes the QR only after a confirmation that says requests already accepted keep theirs", async () => {
    const user = userEvent.setup();
    await open(PROFILE);
    removePaymentProfile.mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(removePaymentProfile).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/already accepted keep the QR they were accepted with/);
    await user.click(within(dialog).getByRole("button", { name: "Remove the QR" }));
    await waitFor(() => { expect(removePaymentProfile).toHaveBeenCalled(); });
    expect(await screen.findByTestId("payment-empty")).toBeInTheDocument();
  });

  it("says so where it is not offered", async () => {
    paymentProfile.mockRejectedValue(new ApiError(404, { code: "not_found", message: "x" }, "not_found"));
    render(<MemoryRouter><NotaryPaymentPage /></MemoryRouter>);
    expect(await screen.findByText("Not available on this account yet.")).toBeInTheDocument();
  });
});
