// The signing page, where the identity check is done on the identity
// verification partner's page (`flow: "hosted"`).
//
// What is pinned: the check keeps its place (after the sign-in step, before
// consent); none of LAGDA's own ID and selfie stages, its QR code to a phone
// or its simulated result is ever shown, and none of their routes is called;
// the browser is sent to the partner's address exactly as given; a pass moves
// on by RE-READING the ceremony; and a participant sent back by the partner
// is let in on the signing session they left with, with no code and no link.
//
// And what must not change: a ceremony that does not say `hosted` gets the
// stages it always had.

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import type { CeremonyView, CeremonyIdentityCheck } from "../../../services/real/signing-access.service";

const bootstrap = vi.fn();
const continueFromApp = vi.fn();
const enter = vi.fn();
const read = vi.fn();
const acceptConsent = vi.fn();
const submitIdentityCheck = vi.fn();
const createIdentityHandoff = vi.fn();
const identityHandoffStatus = vi.fn();
const startIdentityCheckSession = vi.fn();
const refreshIdentityCheckSession = vi.fn();
const decline = vi.fn();

vi.mock("../../../services/real/signing-access.service", async (original) => ({
  ...(await original<typeof import("../../../services/real/signing-access.service")>()),
  realSigningAccessService: {
    bootstrap: (...args: unknown[]) => bootstrap(...args) as unknown,
    continueFromApp: (...args: unknown[]) => continueFromApp(...args) as unknown,
    enter: (...args: unknown[]) => enter(...args) as unknown,
    read: (...args: unknown[]) => read(...args) as unknown,
    acceptConsent: (...args: unknown[]) => acceptConsent(...args) as unknown,
    submitIdentityCheck: (...args: unknown[]) => submitIdentityCheck(...args) as unknown,
    createIdentityHandoff: (...args: unknown[]) => createIdentityHandoff(...args) as unknown,
    identityHandoffStatus: (...args: unknown[]) => identityHandoffStatus(...args) as unknown,
    startIdentityCheckSession: (...args: unknown[]) => startIdentityCheckSession(...args) as unknown,
    refreshIdentityCheckSession: (...args: unknown[]) => refreshIdentityCheckSession(...args) as unknown,
    documentBlob: () => Promise.resolve(new Blob()),
  },
}));
vi.mock("../../../services/real/signing-submission.service", () => ({
  realSigningSubmissionService: {
    submit: vi.fn(), skip: vi.fn(),
    decline: (...args: unknown[]) => decline(...args) as unknown,
  },
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
import { identityReturnState } from "../../../models/identity-check";

const TOKEN = "t".repeat(43);
const PARTNER_URL = "https://verify.partner.example/session/abc?step=1";
const CONSENT_TITLE = "Consent to sign electronically";
const AGREE = /I agree to the use of my ID and selfie/;

const check = (over: Partial<CeremonyIdentityCheck> = {}): CeremonyIdentityCheck => ({
  required: true, status: "pending", mode: "live", attemptsRemaining: 3, verifiedAt: null,
  idTypes: [], flow: "hosted", ...over,
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

const gated = (over: Partial<CeremonyIdentityCheck> = {}, rest: Partial<CeremonyView> = {}): CeremonyView => ceremony({
  access: {
    mayEnter: true, mayViewDocument: false, mayViewAssignedFields: false,
    mayAcceptConsent: false, mayProceedToInput: false, mayDecline: true, maySkip: false,
  },
  identityCheck: check(over),
  ...rest,
});

const passed = () => ceremony({ identityCheck: check({ status: "passed", verifiedAt: "2026-10-09T02:00:00.000Z" }) });
const standing = (over: Record<string, unknown> = {}) => ({
  status: "pending", attemptsRemaining: 3, verifiedAt: null, pendingReview: false, ...over,
});

function renderPage(entry: string | { pathname: string; state: unknown } = `/sign/${TOKEN}`) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes><Route path="/sign/:requestId" element={<RealSigningPage />} /></Routes>
    </MemoryRouter>,
  );
}

function expectNothingInline() {
  expect(screen.queryByTestId("identity-check-step")).toBeNull();
  expect(screen.queryByTestId("identity-check-test-banner")).toBeNull();
  expect(screen.queryByTestId("identity-check-test-panel")).toBeNull();
  expect(screen.queryByRole("list", { name: "Identity check progress" })).toBeNull();
  expect(screen.queryByLabelText("Type of ID")).toBeNull();
  expect(screen.queryByRole("button", { name: /Use my phone instead/ })).toBeNull();
  expect(screen.queryByText(/Test mode|[Ss]imulated/)).toBeNull();
  expect(submitIdentityCheck).not.toHaveBeenCalled();
  expect(createIdentityHandoff).not.toHaveBeenCalled();
  expect(identityHandoffStatus).not.toHaveBeenCalled();
}

const originalLocation = window.location;
const assign = vi.fn();
/** The blank tab the browser hands back, as far as this page uses one. */
const newTab = { opener: {} as unknown, location: { replace: vi.fn() }, close: vi.fn() };
let open: MockInstance<typeof window.open>;

beforeEach(() => {
  bootstrap.mockResolvedValue({ authenticated: true });
  continueFromApp.mockResolvedValue({ authenticated: true });
  enter.mockResolvedValue(gated());
  startIdentityCheckSession.mockResolvedValue({ url: PARTNER_URL, expiresAt: "2026-10-09T02:30:00.000Z" });
  refreshIdentityCheckSession.mockResolvedValue(standing());
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, hash: "", assign } });
  newTab.opener = {};
  open = vi.spyOn(window, "open").mockReturnValue(newTab as unknown as Window);
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

describe("the hosted identity check on the signing page", () => {
  it("comes before consent, on its own Start screen, with none of LAGDA's own stages", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Identity check" })).toBeInTheDocument();
    expect(screen.getByText('The sender asked for this before you open "Office Lease".')).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Before you start" })).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-hosted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to verification" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: CONSENT_TITLE })).toBeNull();
    expect(screen.queryByTestId("signing-surface")).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(acceptConsent).not.toHaveBeenCalled();
    expectNothingInline();
  });

  it("comes after the sign-in step, never instead of it", async () => {
    const { accountLink: _dropped, ...unlinked } = gated();
    enter.mockResolvedValue(unlinked);
    renderPage();
    expect(await screen.findByRole("heading", { name: "Sign in to sign this document" })).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-hosted")).toBeNull();
    expect(refreshIdentityCheckSession).not.toHaveBeenCalled();
  });

  it("is never asked of a viewer", async () => {
    enter.mockResolvedValue(gated({}, {
      recipient: { recipientId: "srr_v", name: "Val Ong", email: "val@example.ph", type: "viewer" },
    }));
    renderPage();
    expect(await screen.findByText("View only")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-hosted")).toBeNull();
  });

  it("opens the partner's page in a new tab at the address exactly as given, and stays to wait", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("checkbox", { name: AGREE }));
    expect(startIdentityCheckSession).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Finish the verification in the new tab" })).toBeInTheDocument();
    // A blank tab, asked for without "noopener" so that a blocked one can be told from an opened one...
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("", "_blank");
    // ...its opener cut by hand, and then pointed at the partner.
    expect(newTab.opener).toBeNull();
    expect(newTab.location.replace).toHaveBeenCalledTimes(1);
    expect(newTab.location.replace).toHaveBeenCalledWith(PARTNER_URL);
    expect(newTab.close).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(startIdentityCheckSession).toHaveBeenCalledTimes(1);
    expectNothingInline();
  });

  it("sends this tab there instead when the browser blocks the new one", async () => {
    open.mockReturnValue(null);
    renderPage();
    await userEvent.click(await screen.findByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await waitFor(() => { expect(assign).toHaveBeenCalledTimes(1); });
    expect(assign).toHaveBeenCalledWith(PARTNER_URL);
    expect(screen.getByRole("button", { name: "Opening…" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Finish the verification in the new tab" })).toBeNull();
  });

  it("closes the blank tab when the visit cannot be opened", async () => {
    startIdentityCheckSession.mockRejectedValue(new ApiError(409, { code: "identity_check_unavailable", message: "m" }, "z"));
    renderPage();
    await userEvent.click(await screen.findByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    expect(await screen.findByRole("heading", { name: "Identity verification is not available right now" })).toBeInTheDocument();
    expect(newTab.close).toHaveBeenCalledTimes(1);
    expect(newTab.location.replace).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("continues from the waiting tab after a pass, re-reading the ceremony without entering it again", async () => {
    vi.useFakeTimers();
    const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
    refreshIdentityCheckSession
      .mockResolvedValueOnce(standing())
      .mockResolvedValueOnce(standing())
      .mockResolvedValue(standing({ status: "passed", verifiedAt: "2026-10-09T02:00:00.000Z" }));
    read.mockResolvedValue(passed());
    renderPage();
    await tick(0);
    // eslint-disable-next-line testing-library/prefer-user-event -- the clock is held
    fireEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    // eslint-disable-next-line testing-library/prefer-user-event -- the clock is held
    fireEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await tick(0);
    expect(screen.getByRole("heading", { level: 2, name: "Finish the verification in the new tab" })).toBeInTheDocument();
    expect(refreshIdentityCheckSession).toHaveBeenCalledTimes(1);

    await tick(3000);
    expect(refreshIdentityCheckSession).toHaveBeenCalledTimes(2);
    expect(read).not.toHaveBeenCalled();
    await tick(3000);
    expect(screen.getByRole("heading", { name: "Identity check passed" })).toBeInTheDocument();
    await tick(1200);
    expect(screen.getByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it("moves on to consent after a pass, re-reading the ceremony without entering it again", async () => {
    refreshIdentityCheckSession.mockResolvedValue(standing({ status: "passed", verifiedAt: "2026-10-09T02:00:00.000Z" }));
    read.mockResolvedValue(passed());
    renderPage();
    expect(await screen.findByRole("heading", { name: "Identity check passed" })).toBeInTheDocument();
    expect(read).not.toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: CONSENT_TITLE }, { timeout: 4000 })).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("identity-check-hosted")).toBeNull();
    expectNothingInline();
  });

  it("shows the closed screen for a locked check, and lets them in once the sender allows it", async () => {
    enter.mockResolvedValue(gated({ status: "locked", attemptsRemaining: 0 }));
    renderPage();
    expect(await screen.findByText(
      "The identity check could not be completed. The sender has been told and can let you "
      + "continue another way. You can come back to this link later.")).toBeInTheDocument();
    expect(refreshIdentityCheckSession).not.toHaveBeenCalled();
    expectNothingInline();

    read.mockResolvedValueOnce(gated({ status: "locked", attemptsRemaining: 0 }));
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByTestId("identity-check-recheck-note")).toBeInTheDocument();

    read.mockResolvedValueOnce(ceremony({
      identityCheck: check({ required: false, status: "not-required", mode: null, attemptsRemaining: 0 }),
    }));
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
  });

  it("re-reads the ceremony when the check is no longer wanted", async () => {
    startIdentityCheckSession.mockRejectedValue(new ApiError(409, { code: "identity_check_not_required", message: "m" }, "z"));
    read.mockResolvedValue(ceremony());
    renderPage();
    await userEvent.click(await screen.findByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    expect(await screen.findByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("lets them decline from the check, and come back to it", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Decline to sign" }));
    expect(screen.getByRole("heading", { name: "Decline this request" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back to the identity check" }));
    expect(screen.getByRole("heading", { level: 2, name: "Before you start" })).toBeInTheDocument();
  });

  it("offers no decline there when the server says this participant may not", async () => {
    const view = gated();
    enter.mockResolvedValue({ ...view, access: { ...view.access, mayDecline: false } });
    renderPage();
    await screen.findByRole("heading", { level: 2, name: "Before you start" });
    expect(screen.queryByRole("button", { name: "Decline to sign" })).toBeNull();
  });
});

describe("sent back by the partner", () => {
  const back = () => ({ pathname: "/sign/continue", state: identityReturnState(Date.now()) });

  it("opens on the signing session they left with: no code, no link, no second entry", async () => {
    read.mockResolvedValue(gated());
    renderPage(back());
    expect(await screen.findByRole("heading", { level: 2, name: "Checking for your result…" })).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
    expect(enter).not.toHaveBeenCalled();
    expect(continueFromApp).not.toHaveBeenCalled();
    expect(bootstrap).not.toHaveBeenCalled();
    await waitFor(() => { expect(refreshIdentityCheckSession).toHaveBeenCalledTimes(1); });
    expectNothingInline();
  });

  it("asks for the result every 3 s, then says it has not arrived", async () => {
    vi.useFakeTimers();
    read.mockResolvedValue(gated());
    renderPage(back());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(refreshIdentityCheckSession).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(refreshIdentityCheckSession).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(refreshIdentityCheckSession).toHaveBeenCalledTimes(3);
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(screen.getByRole("heading", { name: "We have not received your result yet" })).toBeInTheDocument();
    const asked = refreshIdentityCheckSession.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(refreshIdentityCheckSession).toHaveBeenCalledTimes(asked);
  });

  it("goes straight on when the check was passed by the time they are back", async () => {
    read.mockResolvedValue(passed());
    renderPage(back());
    expect(await screen.findByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
    expect(enter).not.toHaveBeenCalled();
    expect(refreshIdentityCheckSession).not.toHaveBeenCalled();
  });

  it("says to open the signing link again when the session is gone", async () => {
    read.mockRejectedValue(new ApiError(401, { code: "RECIPIENT_AUTHENTICATION_REQUIRED", message: "server words" }, "z"));
    renderPage(back());
    expect(await screen.findByText("Your signing session has ended. Open your signing link again to continue.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("server words");
  });

  it("never shows the server's own words when the ceremony cannot be read", async () => {
    read.mockRejectedValue(new ApiError(500, { code: "x", message: "server words" }, "server words"));
    renderPage(back());
    expect(await screen.findByText(/Your document could not be opened right now/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("server words");
  });

  it("still redeems a code from Documents when there is one", async () => {
    const code = "c".repeat(22);
    Object.defineProperty(window, "location", {
      configurable: true, value: { ...originalLocation, hash: `#${code}`, assign },
    });
    enter.mockResolvedValue(gated());
    renderPage(back());
    await screen.findByRole("heading", { level: 1, name: "Identity check" });
    expect(continueFromApp).toHaveBeenCalledWith(code);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(read).not.toHaveBeenCalled();
  });
});

describe.each([
  ["a ceremony that does not say where the check is done", undefined],
  ["a ceremony that says inline", "inline" as const],
])("with %s", (_name, flow) => {
  it("shows LAGDA's own stages exactly as before, and asks the partner nothing", async () => {
    const { flow: _dropped, ...inline } = check({ mode: "test", idTypes: ["umid", "philippine-passport"] });
    enter.mockResolvedValue(gated({}, { identityCheck: flow === undefined ? inline : { ...inline, flow } }));
    renderPage();
    expect(await screen.findByTestId("identity-check-step")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-hosted")).toBeNull();
    expect(screen.getByRole("list", { name: "Identity check progress" })).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-test-banner").textContent).toBe("Test mode: this identity check is simulated.");
    expect(screen.queryByRole("button", { name: "Continue to verification" })).toBeNull();

    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText("Type of ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use my phone instead" })).toBeInTheDocument();
    expect(startIdentityCheckSession).not.toHaveBeenCalled();
    expect(refreshIdentityCheckSession).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
