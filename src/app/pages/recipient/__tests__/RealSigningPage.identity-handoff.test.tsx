// The signing page, when the identity check is handed to a phone.
//
// What is pinned: the page asks for the code on the participant's own signing
// session and only when they press for it; a pass on the phone moves this
// page on by RE-READING the ceremony, never by entering it a second time; and
// a refusal because the check is no longer wanted does the same.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import type { CeremonyView, CeremonyIdentityCheck } from "../../../services/real/signing-access.service";

const bootstrap = vi.fn();
const enter = vi.fn();
const read = vi.fn();
const submitIdentityCheck = vi.fn();
const createIdentityHandoff = vi.fn();
const identityHandoffStatus = vi.fn();

vi.mock("../../../services/real/signing-access.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/signing-access.service")>()),
  realSigningAccessService: {
    bootstrap: (...args: unknown[]) => bootstrap(...args) as unknown,
    continueFromApp: vi.fn(),
    enter: (...args: unknown[]) => enter(...args) as unknown,
    read: (...args: unknown[]) => read(...args) as unknown,
    acceptConsent: vi.fn(),
    submitIdentityCheck: (...args: unknown[]) => submitIdentityCheck(...args) as unknown,
    createIdentityHandoff: (...args: unknown[]) => createIdentityHandoff(...args) as unknown,
    identityHandoffStatus: (...args: unknown[]) => identityHandoffStatus(...args) as unknown,
    documentBlob: () => Promise.resolve(new Blob()),
  },
}));
vi.mock("../../../services/real/signing-submission.service", () => ({
  realSigningSubmissionService: { submit: vi.fn(), skip: vi.fn(), decline: vi.fn() },
}));
vi.mock("../../../services/real/signing-account-link.service", () => ({
  realSigningAccountLinkService: { mintHandoff: vi.fn() },
}));
vi.mock("../../../hooks/useMinimumSplash", () => ({ useMinimumSplash: () => "gone" }));
vi.mock("../../../components/recipient/PositionedSigningSurface", () => ({
  PositionedSigningSurface: () => <div data-testid="signing-surface" />,
}));

import { RealSigningPage } from "../RealSigningPage";
import { ApiError } from "../../../services/api-client";

const TOKEN = "t".repeat(43);
const CONSENT_TITLE = "Consent to sign electronically";

const check = (over: Partial<CeremonyIdentityCheck> = {}): CeremonyIdentityCheck => ({
  required: true, status: "pending", mode: "live", attemptsRemaining: 3, verifiedAt: null,
  idTypes: ["umid", "philippine-passport"], ...over,
});

function ceremony(over: Partial<CeremonyView> = {}): CeremonyView {
  return {
    request: { signingRequestId: "sr_1", documentTitle: "Office Lease" },
    recipient: { recipientId: "srr_1", name: "Maria Santos", email: "maria@example.ph", type: "signer" },
    accountLink: { maskedEmail: "mar•••@example.ph" },
    access: {
      mayEnter: true, mayViewDocument: false, mayViewAssignedFields: false,
      mayAcceptConsent: true, mayProceedToInput: false, mayDecline: true, maySkip: false,
    },
    consent: { required: true, accepted: false, type: "electronic-records", requiredVersion: "v1", acceptedVersion: null, acceptedAt: null },
    document: null, fields: [], firstEnteredAt: null,
    ...over,
  };
}

const gated = (over: Partial<CeremonyIdentityCheck> = {}): CeremonyView => ceremony({
  access: {
    mayEnter: true, mayViewDocument: false, mayViewAssignedFields: false,
    mayAcceptConsent: false, mayProceedToInput: false, mayDecline: true, maySkip: false,
  },
  identityCheck: check(over),
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/sign/${TOKEN}`]}>
      <Routes><Route path="/sign/:requestId" element={<RealSigningPage />} /></Routes>
    </MemoryRouter>,
  );
}

async function agree() {
  await userEvent.click(await screen.findByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
}

beforeEach(() => {
  bootstrap.mockResolvedValue({ authenticated: true });
  enter.mockResolvedValue(gated());
  createIdentityHandoff.mockImplementation(() => Promise.resolve({
    handoffId: "idh_1", url: `https://lagda.io/sign/identity/handoff#${"k".repeat(43)}`,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }));
});

// The page reads the status at its real pace, about every three seconds.
const WITHIN_A_LOOK = { timeout: 8000 };

describe("handing the identity check to a phone", () => {
  it("asks for nothing until the participant presses for it, and then on their signing session", async () => {
    identityHandoffStatus.mockResolvedValue({ status: "waiting", attemptsRemaining: 3 });
    renderPage();
    await agree();
    expect(createIdentityHandoff).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(createIdentityHandoff).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Waiting for your phone")).toBeInTheDocument();
    await waitFor(() => { expect(identityHandoffStatus).toHaveBeenCalledWith("idh_1"); }, WITHIN_A_LOOK);
  }, 20_000);

  it("moves on to consent when the phone passes, re-reading the ceremony without entering it again", async () => {
    identityHandoffStatus.mockResolvedValue({ status: "completed", attemptsRemaining: 3 });
    read.mockResolvedValue(ceremony({ identityCheck: check({ status: "passed", verifiedAt: "2026-10-09T01:00:00.000Z" }) }));
    renderPage();
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));

    expect(await screen.findByRole("heading", { name: CONSENT_TITLE }, WITHIN_A_LOOK)).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(submitIdentityCheck).not.toHaveBeenCalled();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
  }, 20_000);

  it("shows the locked stage when the phone used the last attempt", async () => {
    identityHandoffStatus.mockResolvedValue({ status: "failed", attemptsRemaining: 0 });
    renderPage();
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    expect(await screen.findByText(
      "The identity check could not be completed. The sender has been told and can let you "
      + "continue another way. You can come back to this link later.", undefined, WITHIN_A_LOOK)).toBeInTheDocument();
  }, 20_000);

  it("moves on when the sender allowed another way before a code could be made", async () => {
    createIdentityHandoff.mockRejectedValue(new ApiError(409, { code: "identity_check_not_required", message: "m" }, "z"));
    read.mockResolvedValue(ceremony());
    renderPage();
    await agree();
    await userEvent.click(screen.getByRole("button", { name: "Use my phone instead" }));
    expect(await screen.findByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledTimes(1);
  });
});
