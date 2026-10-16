// The signing page, with and without the sender's identity check.
//
// The first half is about what must NOT change. A ceremony that carries no
// identity check — an older server that does not send the field at all, or a
// document whose sender asked for none — goes through exactly the screens it
// went through before: view-only for a viewer, the sign-in step, consent,
// then the document.
//
// The second half is the check itself: it comes after the sign-in step and
// before consent, a pass leads on to consent, a failure says how many
// attempts are left, a lock says what happens now, and a simulated result is
// never worded as a real one.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import type { CeremonyView, CeremonyIdentityCheck } from "../../../services/real/signing-access.service";

const bootstrap = vi.fn();
const continueFromApp = vi.fn();
const enter = vi.fn();
const read = vi.fn();
const acceptConsent = vi.fn();
const submitIdentityCheck = vi.fn();
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
// The branded splash holds every arrival for a second and a half; it is not
// what is under test here.
vi.mock("../../../hooks/useMinimumSplash", () => ({ useMinimumSplash: () => "gone" }));
vi.mock("../../../components/recipient/PositionedSigningSurface", () => ({
  PositionedSigningSurface: () => <div data-testid="signing-surface" />,
}));

import { RealSigningPage } from "../RealSigningPage";
import { ApiError } from "../../../services/api-client";

const TOKEN = "t".repeat(43);

const check = (over: Partial<CeremonyIdentityCheck> = {}): CeremonyIdentityCheck => ({
  required: true, status: "pending", mode: "test", attemptsRemaining: 3, verifiedAt: null,
  idTypes: ["umid", "philippine-passport"], ...over,
});

/** A signer with an account, consent still to give: the ordinary arrival. */
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

/** The same signer once consent is in and the document is theirs to act on. */
function open(over: Partial<CeremonyView> = {}): CeremonyView {
  return ceremony({
    access: {
      mayEnter: true, mayViewDocument: true, mayViewAssignedFields: true,
      mayAcceptConsent: false, mayProceedToInput: true, mayDecline: true, maySkip: false,
    },
    consent: { required: true, accepted: true, type: "electronic-records", requiredVersion: "v1", acceptedVersion: "v1", acceptedAt: "2026-10-08T01:00:00.000Z" },
    document: { mediaType: "application/pdf", sizeBytes: 10, digest: "d", pageCount: 1 },
    ...over,
  });
}

/** What the server sends while the check is outstanding: nothing may be done but enter and decline. */
function gated(over: Partial<CeremonyIdentityCheck> = {}, rest: Partial<CeremonyView> = {}): CeremonyView {
  return ceremony({
    access: {
      mayEnter: true, mayViewDocument: false, mayViewAssignedFields: false,
      mayAcceptConsent: false, mayProceedToInput: false, mayDecline: true, maySkip: false,
    },
    identityCheck: check(over),
    ...rest,
  });
}

function renderPage(path = `/sign/${TOKEN}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/sign/:requestId" element={<RealSigningPage />} /></Routes>
    </MemoryRouter>,
  );
}

const CONSENT_TITLE = "Consent to sign electronically";
const IDENTITY_TITLE = "Identity check";

async function walkToSelfie() {
  await userEvent.click(await screen.findByRole("checkbox", { name: /I agree to the use of my ID and selfie/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  await userEvent.selectOptions(screen.getByLabelText("Type of ID"), "umid");
  await userEvent.upload(screen.getByLabelText("Front of the ID: choose a file"),
    new File(["x"], "front.jpg", { type: "image/jpeg" }));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  await userEvent.upload(screen.getByLabelText("Selfie: choose a file"),
    new File(["y"], "me.jpg", { type: "image/jpeg" }));
  await screen.findByRole("button", { name: "Retake" });
}

beforeEach(() => {
  bootstrap.mockResolvedValue({ authenticated: true });
  continueFromApp.mockResolvedValue({ authenticated: true });
  submitIdentityCheck.mockResolvedValue({ outcome: "passed", attemptsRemaining: 3, status: "passed" });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: () => "blob:test/1" });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: () => undefined });
});

afterEach(() => {
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

// ── Unchanged ────────────────────────────────────────────────────────────────

describe.each([
  ["an older server that says nothing about an identity check", undefined],
  ["a document whose sender asked for none",
    check({ required: false, status: "not-required", mode: null, attemptsRemaining: 0, idTypes: [] })],
  ["a participant who has already passed", check({ status: "passed", verifiedAt: "2026-10-08T01:00:00.000Z" })],
] as const)("with %s", (_name, identityCheck) => {
  const withCheck = (view: CeremonyView): CeremonyView =>
    identityCheck === undefined ? view : { ...view, identityCheck };

  it("goes to consent, then to the document, exactly as before", async () => {
    enter.mockResolvedValue(withCheck(ceremony()));
    acceptConsent.mockResolvedValue(withCheck(open()));
    renderPage();

    expect(await screen.findByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
    expect(bootstrap).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByText(/Before you can open "Office Lease", please confirm you consent/)).toBeInTheDocument();
    expect(screen.getByText("Signed in as mar•••@example.ph")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
    expect(screen.queryByText(/Test mode/)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /I consent — continue/ }));
    expect(acceptConsent).toHaveBeenCalledWith("v1");
    expect(await screen.findByTestId("signing-surface")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
    expect(submitIdentityCheck).not.toHaveBeenCalled();
  });

  it("still asks an unlinked signer to sign in first", async () => {
    const { accountLink: _dropped, ...unlinked } = withCheck(ceremony());
    enter.mockResolvedValue(unlinked);
    renderPage();
    expect(await screen.findByRole("heading", { name: "Sign in to sign this document" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: CONSENT_TITLE })).toBeNull();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
  });

  it("still shows a viewer the read-only document", async () => {
    enter.mockResolvedValue(withCheck(open({
      recipient: { recipientId: "srr_v", name: "Val Ong", email: "val@example.ph", type: "viewer" },
    })));
    renderPage();
    expect(await screen.findByText("View only")).toBeInTheDocument();
    expect(screen.getByTestId("signing-surface")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
  });

  it("goes straight to the document for someone who consented on an earlier visit", async () => {
    enter.mockResolvedValue(withCheck(open()));
    renderPage();
    expect(await screen.findByTestId("signing-surface")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: CONSENT_TITLE })).toBeNull();
  });

  it("still says Not yet your turn to a signer waiting on someone else", async () => {
    enter.mockResolvedValue(withCheck(ceremony({
      consent: { required: true, accepted: true, type: "electronic-records", requiredVersion: "v1", acceptedVersion: "v1", acceptedAt: "2026-10-08T01:00:00.000Z" },
    })));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Not yet your turn" })).toBeInTheDocument();
  });
});

describe("failures that have nothing to do with the check", () => {
  it("still shows the one link message when the link cannot be opened", async () => {
    bootstrap.mockRejectedValue(new ApiError(404, { code: "x", message: "y" }, "z"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "This link can't be used" })).toBeInTheDocument();
    expect(screen.getByText(/This signing link can no longer be opened/)).toBeInTheDocument();
  });

  it("still reports an ordinary consent failure on the consent screen", async () => {
    enter.mockResolvedValue(ceremony());
    acceptConsent.mockRejectedValue(new ApiError(409, { code: "signing_ceremony_unavailable", message: "Not available now." }, "z"));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /I consent — continue/ }));
    // Said in the page's own words: the server's text for a refused ceremony
    // is never shown (110), but it is still reported here, on this screen.
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This document can't be signed from this link any more. Nothing more is needed from you here.");
    expect(read).not.toHaveBeenCalled();
  });
});

// ── The check ────────────────────────────────────────────────────────────────

describe("when the sender asked for an identity check", () => {
  it("comes before consent", async () => {
    enter.mockResolvedValue(gated());
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: IDENTITY_TITLE })).toBeInTheDocument();
    expect(screen.getByText(/The sender asked for this before you open "Office Lease"/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: CONSENT_TITLE })).toBeNull();
    expect(screen.queryByTestId("signing-surface")).toBeNull();
    expect(acceptConsent).not.toHaveBeenCalled();
  });

  it("comes after the sign-in step, never instead of it", async () => {
    const { accountLink: _dropped, ...unlinked } = gated();
    enter.mockResolvedValue(unlinked);
    renderPage();
    expect(await screen.findByRole("heading", { name: "Sign in to sign this document" })).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
  });

  it("is never asked of a viewer", async () => {
    enter.mockResolvedValue(gated({}, {
      recipient: { recipientId: "srr_v", name: "Val Ong", email: "val@example.ph", type: "viewer" },
    }));
    renderPage();
    expect(await screen.findByText("View only")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
  });

  it("says on every arrival in test mode that the check is simulated", async () => {
    enter.mockResolvedValue(gated());
    renderPage();
    expect((await screen.findByTestId("identity-check-test-banner")).textContent)
      .toBe("Test mode: this identity check is simulated.");
  });

  it("continues to consent after the check, re-reading the ceremony without entering it again", async () => {
    enter.mockResolvedValue(gated());
    read.mockResolvedValue(ceremony({ identityCheck: check({ status: "passed", verifiedAt: "2026-10-08T01:00:00.000Z" }) }));
    renderPage();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));

    expect(await screen.findByRole("heading", { name: "Identity check completed (test mode)" })).toBeInTheDocument();
    expect(screen.getByText("This was a simulated check. No identity was verified.")).toBeInTheDocument();
    expect(screen.queryByText("Identity check passed")).toBeNull();
    expect(submitIdentityCheck).toHaveBeenCalledWith({ idType: "umid", capture: "upload", consent: true, testOutcome: "pass" });
    expect(read).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
    expect(enter).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
  });

  it("says Identity check passed for a real check", async () => {
    enter.mockResolvedValue(gated({ mode: "live" }));
    renderPage();
    await walkToSelfie();
    expect(screen.queryByTestId("identity-check-test-panel")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByRole("heading", { name: "Identity check passed" })).toBeInTheDocument();
    expect(submitIdentityCheck).toHaveBeenCalledWith({ idType: "umid", capture: "upload", consent: true });
  });

  it("says how many attempts are left when it is not passed", async () => {
    enter.mockResolvedValue(gated());
    submitIdentityCheck.mockResolvedValue({ outcome: "failed", attemptsRemaining: 2, status: "pending" });
    renderPage();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("radio", { name: "Fail" }));
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByRole("heading", { name: "We could not complete the identity check" })).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-attempts-left").textContent).toBe("2 attempts left");
    expect(submitIdentityCheck).toHaveBeenCalledWith(expect.objectContaining({ testOutcome: "fail" }));
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("tells a locked participant what happens now, and lets them in once the sender allows it", async () => {
    enter.mockResolvedValue(gated({ status: "locked", attemptsRemaining: 0 }));
    renderPage();
    expect(await screen.findByText(
      "The identity check could not be completed. The sender has been told and can let you "
      + "continue another way. You can come back to this link later.")).toBeInTheDocument();

    // Nothing has changed yet.
    read.mockResolvedValueOnce(gated({ status: "locked", attemptsRemaining: 0 }));
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByTestId("identity-check-recheck-note")).toBeInTheDocument();

    // The sender allowed a lighter method: the requirement no longer applies.
    read.mockResolvedValueOnce(ceremony({
      identityCheck: check({ required: false, status: "not-required", mode: null, attemptsRemaining: 0 }),
    }));
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
  });

  it("moves on when the sender allowed another way while they were trying", async () => {
    enter.mockResolvedValue(gated());
    submitIdentityCheck.mockRejectedValue(new ApiError(409, { code: "identity_check_not_required", message: "m" }, "z"));
    read.mockResolvedValue(ceremony());
    renderPage();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByRole("heading", { name: CONSENT_TITLE })).toBeInTheDocument();
  });

  it("says so when the ceremony cannot be re-read after the check", async () => {
    enter.mockResolvedValue(gated());
    read.mockRejectedValue(new ApiError(401, { code: "RECIPIENT_AUTHENTICATION_REQUIRED", message: "m" }, "z"));
    renderPage();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
    expect((await screen.findByRole("alert")).textContent)
      .toBe("Your signing session has ended. Open your signing link again to continue.");
  });

  it("goes to the check when consent is refused because it is outstanding", async () => {
    // The page read the ceremony before the sender asked for the check.
    enter.mockResolvedValue(ceremony());
    acceptConsent.mockRejectedValue(new ApiError(409, { code: "signing_identity_check_required", message: "Pass the identity check first." }, "z"));
    read.mockResolvedValue(gated());
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /I consent — continue/ }));
    expect(await screen.findByRole("heading", { level: 1, name: IDENTITY_TITLE })).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: CONSENT_TITLE })).toBeNull();
  });

  it("lets them decline from the check, and come back to it", async () => {
    enter.mockResolvedValue(gated());
    decline.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Decline to sign" }));
    expect(screen.getByRole("heading", { name: "Decline this request" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back to the identity check" }));
    expect(screen.getByRole("heading", { level: 1, name: IDENTITY_TITLE })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Decline to sign" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm decline" }));
    expect(await screen.findByRole("heading", { name: "You declined this request" })).toBeInTheDocument();
    expect(decline).toHaveBeenCalledTimes(1);
  });

  it("offers no decline there when the server says this participant may not", async () => {
    const view = gated();
    enter.mockResolvedValue({ ...view, access: { ...view.access, mayDecline: false } });
    renderPage();
    await screen.findByRole("heading", { level: 1, name: IDENTITY_TITLE });
    expect(screen.queryByRole("button", { name: "Decline to sign" })).toBeNull();
  });

  it("keeps Back to document on the decline form reached from the document", async () => {
    enter.mockResolvedValue(open());
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));
    await userEvent.click(screen.getByRole("button", { name: "Back to document" }));
    expect(screen.getByTestId("signing-surface")).toBeInTheDocument();
  });
});

describe("continuing from the app", () => {
  it("meets the same check on /sign/continue", async () => {
    window.location.hash = "#" + "c".repeat(22);
    enter.mockResolvedValue(gated());
    renderPage("/sign/continue");
    expect(await screen.findByRole("heading", { level: 1, name: IDENTITY_TITLE })).toBeInTheDocument();
    await waitFor(() => { expect(continueFromApp).toHaveBeenCalledWith("c".repeat(22)); });
    expect(bootstrap).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: CONSENT_TITLE })).toBeNull();
  });
});
