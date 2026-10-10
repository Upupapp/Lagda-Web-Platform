// The signing page and how long a passed identity check counts.
//
// Straight after a pass the participant is told it counts for 24 hours. And
// when they are NOT asked, because an earlier pass still counts, the consent
// screen says so: when the identity was verified and until when. A document
// that asks no check shows a consent screen that is byte-for-byte what it
// always was.
//
// The harness below is the one RealSigningPage.identity-check.test.tsx uses.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

// The participant's own locale and timezone, pinned: a browser in Manila set
// to en-PH, whatever machine runs this.
//
// Written out part by part rather than left to the runtime's own locale data,
// which words "10:00 am" differently from one version to the next. What is
// under test is the instant shown and the 24 hours added, not that wording.
beforeEach(() => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  vi.spyOn(Date.prototype, "toLocaleString").mockImplementation(function (this: Date) {
    const part = (type: string) => parts.formatToParts(this).find(p => p.type === type)?.value ?? "";
    return `${part("day")} ${part("month")} ${part("year")}, ${part("hour")}:${part("minute")}`;
  });
});

const VERIFIED_AT = "2026-10-09T02:00:00.000Z";
const passedCheck = (over: Partial<CeremonyIdentityCheck> = {}) =>
  check({ status: "passed", mode: "live", verifiedAt: VERIFIED_AT, ...over });

/** The consent screen's markup for a ceremony carrying this identity check. */
async function consentMarkup(identityCheck: CeremonyIdentityCheck | undefined): Promise<string> {
  enter.mockResolvedValue(identityCheck === undefined ? ceremony() : ceremony({ identityCheck }));
  const { container, unmount } = renderPage();
  await screen.findByRole("heading", { name: CONSENT_TITLE });
  const html = container.innerHTML;
  unmount();
  return html;
}

describe("straight after a pass, on LAGDA's own screens", () => {
  it("says a real pass counts for the next 24 hours", async () => {
    enter.mockResolvedValue(gated({ mode: "live" }));
    renderPage();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByRole("heading", { name: "Identity check passed" })).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-valid-note").textContent ?? "").toBe(
      "Your identity is verified for the next 24 hours. During that time you can open and sign other "
      + "documents from this sender's workspace without verifying again.");
    // Still theirs to continue; nothing moves on by itself here.
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("never calls a simulated result a verification", async () => {
    enter.mockResolvedValue(gated({ mode: "test" }));
    renderPage();
    await walkToSelfie();
    await userEvent.click(screen.getByRole("button", { name: "Check my identity" }));
    expect(await screen.findByRole("heading", { name: "Identity check completed (test mode)" })).toBeInTheDocument();
    const note = screen.getByTestId("identity-check-valid-note").textContent ?? "";
    expect(note).toBe("In test mode this result is kept for 24 hours, as a real verification would be.");
    expect(note).not.toMatch(/is verified/i);
    expect(screen.getByText("This was a simulated check. No identity was verified.")).toBeInTheDocument();
    expect(screen.queryByText(/Your identity is verified/)).toBeNull();
  });
});

describe("the consent screen, when an earlier pass still counts", () => {
  it("says when the identity was verified and until when, above the consent button", async () => {
    enter.mockResolvedValue(ceremony({ identityCheck: passedCheck() }));
    renderPage();
    await screen.findByRole("heading", { name: CONSENT_TITLE });
    const standing = screen.getByTestId("identity-check-standing");
    // 02:00 UTC is 10:00 in Manila; 24 hours on is 10:00 the next day.
    expect(standing.textContent ?? "").toBe(
      "Identity verified 9 Oct 2026, 10:00. Valid until 10 Oct 2026, 10:00. "
      + "You will not be asked again for this workspace's documents until then.");
    const consent = screen.getByRole("button", { name: /I consent — continue/ });
    expect(standing.compareDocumentPosition(consent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Nobody is asked for the check again.
    expect(screen.queryByTestId("identity-check-step")).toBeNull();
  });

  it("does not say verified in test mode", async () => {
    enter.mockResolvedValue(ceremony({ identityCheck: passedCheck({ mode: "test" }) }));
    renderPage();
    await screen.findByRole("heading", { name: CONSENT_TITLE });
    const text = screen.getByTestId("identity-check-standing").textContent ?? "";
    expect(text).toBe("Identity check completed in test mode 9 Oct 2026, 10:00. Kept until 10 Oct 2026, 10:00.");
    expect(text).not.toMatch(/verified/i);
  });

  it.each([
    ["the check is not required", check({ required: false, status: "not-required", mode: null, attemptsRemaining: 0, idTypes: [] })],
    ["a pass is on record but the check is not required", passedCheck({ required: false })],
    ["there is no record of when", passedCheck({ verifiedAt: null })],
  ] as const)("says nothing when %s", async (_name, identityCheck) => {
    enter.mockResolvedValue(ceremony({ identityCheck }));
    renderPage();
    await screen.findByRole("heading", { name: CONSENT_TITLE });
    expect(screen.queryByTestId("identity-check-standing")).toBeNull();
    expect(screen.queryByText(/Identity verified|Valid until|Kept until/)).toBeNull();
  });
});

describe("a document that does not ask the check", () => {
  it("shows a consent screen that is byte-for-byte what it was", async () => {
    // What an older server sends: no identity check at all.
    const before = await consentMarkup(undefined);
    expect(before).toContain("I consent");
    expect(before).not.toContain("identity-check-standing");

    const notRequired = await consentMarkup(
      check({ required: false, status: "not-required", mode: null, attemptsRemaining: 0, idTypes: [] }));
    expect(notRequired).toBe(before);

    // A pass on record that this document does not ask for changes nothing either.
    expect(await consentMarkup(passedCheck({ required: false }))).toBe(before);
    // Nor does a pass with no date to show.
    expect(await consentMarkup(passedCheck({ verifiedAt: null }))).toBe(before);
  });

  it("adds exactly one element, and nothing else, when an earlier pass counts", async () => {
    const before = await consentMarkup(undefined);
    enter.mockResolvedValue(ceremony({ identityCheck: passedCheck() }));
    const { container } = renderPage();
    await screen.findByRole("heading", { name: CONSENT_TITLE });
    screen.getByTestId("identity-check-standing").remove();
    expect(container.innerHTML).toBe(before);
  });
});
