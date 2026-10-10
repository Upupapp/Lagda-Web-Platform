// The signing page, for a participant who passed the identity check under a
// name that is not the one the sender entered.
//
// Pinned: the ceremony's `name-mismatch` holds them on the waiting screen,
// before consent and with no document, on arrival and on a reload; nothing
// there starts the check again; declining is offered where the server allows
// it; and when the sender has decided, the page moves on to consent with the
// "Identity verified … Valid until …" line.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import type { CeremonyView, CeremonyIdentityCheck } from "../../../services/real/signing-access.service";

const bootstrap = vi.fn();
const continueFromApp = vi.fn();
const enter = vi.fn();
const read = vi.fn();
const startIdentityCheckSession = vi.fn();
const refreshIdentityCheckSession = vi.fn();
const submitIdentityCheck = vi.fn();

vi.mock("../../../services/real/signing-access.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/signing-access.service")>()),
  realSigningAccessService: {
    bootstrap: (...args: unknown[]) => bootstrap(...args) as unknown,
    continueFromApp: (...args: unknown[]) => continueFromApp(...args) as unknown,
    enter: (...args: unknown[]) => enter(...args) as unknown,
    read: (...args: unknown[]) => read(...args) as unknown,
    acceptConsent: vi.fn(),
    submitIdentityCheck: (...args: unknown[]) => submitIdentityCheck(...args) as unknown,
    createIdentityHandoff: vi.fn(),
    identityHandoffStatus: vi.fn(),
    startIdentityCheckSession: (...args: unknown[]) => startIdentityCheckSession(...args) as unknown,
    refreshIdentityCheckSession: (...args: unknown[]) => refreshIdentityCheckSession(...args) as unknown,
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

const TOKEN = "t".repeat(43);
const HEADING = "The name on your ID does not match this document";

const check = (over: Partial<CeremonyIdentityCheck> = {}): CeremonyIdentityCheck => ({
  required: true, status: "name-mismatch", mode: "live", attemptsRemaining: 3, verifiedAt: null,
  idTypes: [], flow: "hosted", ...over,
});

function ceremony(identityCheck: CeremonyIdentityCheck, mayDecline = true): CeremonyView {
  const held = identityCheck.status !== "passed";
  return {
    request: { signingRequestId: "sr_1", documentTitle: "Office Lease" },
    recipient: { recipientId: "srr_1", name: "Maria Santos", email: "maria@example.ph", type: "signer" },
    accountLink: { maskedEmail: "mar•••@example.ph" },
    access: {
      mayEnter: true, mayViewDocument: false, mayViewAssignedFields: false,
      mayAcceptConsent: !held, mayProceedToInput: false, mayDecline, maySkip: false,
    },
    consent: { required: true, accepted: false, type: "electronic-records", requiredVersion: "v1", acceptedVersion: null, acceptedAt: null },
    identityCheck,
    document: null, fields: [], firstEnteredAt: null,
  };
}

const standing = (over: Record<string, unknown> = {}) => ({
  status: "name-mismatch", attemptsRemaining: 3, verifiedAt: null, pendingReview: false, ...over,
});

const renderPage = (entry = `/sign/${TOKEN}`) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes><Route path="/sign/:requestId" element={<RealSigningPage />} /></Routes>
  </MemoryRouter>,
);

function expectHeld() {
  expect(screen.queryByRole("heading", { name: "Consent to sign electronically" })).toBeNull();
  expect(screen.queryByTestId("signing-surface")).toBeNull();
  for (const name of [/Continue verification/, /Try again/, /Continue to verification/]) {
    expect(screen.queryByRole("button", { name })).toBeNull();
  }
  expect(startIdentityCheckSession).not.toHaveBeenCalled();
  expect(submitIdentityCheck).not.toHaveBeenCalled();
}

beforeEach(() => {
  bootstrap.mockReset();
  bootstrap.mockResolvedValue({ authenticated: true });
  continueFromApp.mockReset();
  continueFromApp.mockResolvedValue({ authenticated: true });
  enter.mockReset();
  read.mockReset();
  startIdentityCheckSession.mockReset();
  submitIdentityCheck.mockReset();
  refreshIdentityCheckSession.mockReset();
  refreshIdentityCheckSession.mockResolvedValue(standing());
  window.sessionStorage.clear();
});

describe("a name that does not match, on the signing page", () => {
  it("holds the participant on the waiting screen on arrival, before consent and without the document", async () => {
    enter.mockResolvedValue(ceremony(check()));
    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: HEADING })).toBeInTheDocument();
    expect(screen.getByText(/You do not need to verify again/)).toBeInTheDocument();
    expect(screen.getByText("This did not use one of your attempts.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Decline to sign/ })).toBeInTheDocument();
    expectHeld();
  });

  // The server records a mismatch for a pass that still counts only when the
  // ceremony is ENTERED (or refreshed), never when it is merely read. Both
  // ways of opening a document must therefore enter before anything is shown.
  it("enters the ceremony from an emailed link, and shows what entering answered", async () => {
    enter.mockResolvedValue(ceremony(check()));
    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: HEADING })).toBeInTheDocument();
    expect(bootstrap).toHaveBeenCalledWith(TOKEN);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(bootstrap.mock.invocationCallOrder[0]!).toBeLessThan(enter.mock.invocationCallOrder[0]!);
    // Not the read: it would not have recorded the mismatch.
    expect(read).not.toHaveBeenCalled();
    expectHeld();
  });

  it("enters the ceremony from Continue signing in the app, and shows what entering answered", async () => {
    const code = "c".repeat(22);
    window.location.hash = `#${code}`;
    enter.mockResolvedValue(ceremony(check()));
    renderPage("/sign/continue");
    expect(await screen.findByRole("heading", { level: 2, name: HEADING })).toBeInTheDocument();
    expect(continueFromApp).toHaveBeenCalledWith(code);
    expect(bootstrap).not.toHaveBeenCalled();
    expect(enter).toHaveBeenCalledTimes(1);
    expect(continueFromApp.mock.invocationCallOrder[0]!).toBeLessThan(enter.mock.invocationCallOrder[0]!);
    expect(read).not.toHaveBeenCalled();
    expectHeld();
  });

  it("is the same on a reload: the ceremony still says so", async () => {
    enter.mockResolvedValue(ceremony(check()));
    const view = renderPage();
    await screen.findByRole("heading", { level: 2, name: HEADING });
    view.unmount();
    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: HEADING })).toBeInTheDocument();
    expectHeld();
  });

  it("does not offer declining where the server does not allow it", async () => {
    enter.mockResolvedValue(ceremony(check(), false));
    renderPage();
    await screen.findByRole("heading", { level: 2, name: HEADING });
    expect(screen.queryByRole("button", { name: /Decline to sign/ })).toBeNull();
  });

  it("uses the waiting screen whatever the flow, and none of LAGDA's own ID and selfie stages", async () => {
    const { flow: _flow, ...inline } = check();
    enter.mockResolvedValue(ceremony(inline));
    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: HEADING })).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
    expect(screen.queryByLabelText("Type of ID")).toBeNull();
    expectHeld();
  });

  it("moves on to consent, with how long the pass counts, once the sender has decided", async () => {
    const user = userEvent.setup();
    enter.mockResolvedValue(ceremony(check()));
    renderPage();
    await screen.findByRole("heading", { level: 2, name: HEADING });
    const verifiedAt = "2026-10-10T02:00:00.000Z";
    refreshIdentityCheckSession.mockResolvedValue(standing({ status: "passed", verifiedAt }));
    read.mockResolvedValue(ceremony(check({ status: "passed", verifiedAt })));
    await user.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Identity check passed" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Consent to sign electronically" })).toBeInTheDocument();
    await waitFor(() => { expect(read).toHaveBeenCalledTimes(1); });
    expect(document.body.textContent ?? "").toMatch(/Identity verified .* Valid until /);
    expect(screen.queryByText(HEADING)).toBeNull();
  });
});
