// The short face check on the signing page: a participant who verified with
// an ID before is asked only for a quick face check.
//
// Pinned here:
//
//   - where the ceremony predicts a face check, the start screen says so in
//     its own words, with nothing about photographing an ID
//   - the visit's own word wins: if the server opens the full check after
//     all, the wording follows it, with no error
//   - the wait is named for the face check
//   - a face check that is not passed offers the ID next, "Verify with my
//     ID", with the attempts left as always
//   - a ceremony that predicts nothing is the full check, unchanged

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  IdentityCheckHosted, HOSTED_FAST_POLL_MS, type IdentityCheckHostedProps, type ProviderTab,
} from "../IdentityCheckHosted";
import type {
  CeremonyIdentityCheck, IdentityCheckSession, IdentityCheckSessionStatus,
} from "../../../services/real/signing-access.service";

const PARTNER_URL = "https://verify.partner.example/session/face";
const MARKER = "lagda:identity-hosted:sr_1";
const AGREE = "I agree to the use of my ID and selfie to verify my identity for this document.";
const FACE_BODY = "You verified your identity before. This time we only need a quick face check, with no ID. It takes a few seconds.";
const FACE_DECLINED = "We could not confirm it is you from the face check. You can verify with your ID instead.";

const check = (over: Partial<CeremonyIdentityCheck> = {}): CeremonyIdentityCheck => ({
  required: true, status: "pending", mode: "live", attemptsRemaining: 3, verifiedAt: null, idTypes: [],
  flow: "hosted", nextCheck: "face", ...over,
});

const standing = (over: Partial<IdentityCheckSessionStatus> = {}): IdentityCheckSessionStatus => ({
  status: "pending", attemptsRemaining: 3, verifiedAt: null, pendingReview: false, ...over,
});

const visit = (kind?: IdentityCheckSession["kind"]): IdentityCheckSession => ({
  url: PARTNER_URL, expiresAt: "2026-10-12T02:30:00.000Z", ...(kind === undefined ? {} : { kind }),
});

function setup(over: Partial<IdentityCheckHostedProps> = {}) {
  const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>().mockResolvedValue(visit("face"));
  const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing());
  const onReload = vi.fn<IdentityCheckHostedProps["onReload"]>().mockResolvedValue(null);
  const navigate = vi.fn<(url: string) => void>();
  const tab = { go: vi.fn<ProviderTab["go"]>(), close: vi.fn<ProviderTab["close"]>() };
  const openTab = vi.fn<() => ProviderTab | null>(() => tab);
  const props: IdentityCheckHostedProps = {
    identityCheck: check(), documentTitle: "Office Lease", requestId: "sr_1",
    startSession, refresh, onReload, navigate, openTab, touch: false, ...over,
  };
  const view = render(<IdentityCheckHosted {...props} />);
  return {
    startSession: props.startSession as typeof startSession,
    refresh: props.refresh as typeof refresh,
    navigate, tab, openTab, props, ...view,
  };
}

async function pass(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

/** A click that does not wait on a timer: this file runs on a held clock. */
function press(element: HTMLElement) {
  // eslint-disable-next-line testing-library/prefer-user-event
  fireEvent.click(element);
}

const heading = (name: string) => screen.getByRole("heading", { level: 2, name });
const squashed = (testId: string) => (screen.getByTestId(testId).textContent ?? "").replace(/\s+/g, " ");

/** Agrees and continues, and lets the page settle. */
async function agreeAndContinue(name: string) {
  press(screen.getByRole("checkbox", { name: AGREE }));
  press(screen.getByRole("button", { name }));
  await pass(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
});

afterEach(() => { vi.useRealTimers(); });

describe("the start screen, where a face check is all that is needed", () => {
  it("says so in its own words, and holds the button until they agree", async () => {
    const { startSession } = setup();
    await pass(0);
    expect(heading("Confirm it is you")).toBeInTheDocument();
    expect(squashed("identity-hosted-face-body")).toBe(FACE_BODY);
    expect(squashed("identity-hosted-phone-notice"))
      .toBe("Have your phone ready. You will scan a code and take a short selfie with your phone.");
    // Nothing about an ID that will not be asked for.
    expect(screen.queryByText("A photo of your ID")).toBeNull();
    expect(screen.queryByTestId("identity-check-kept-note")).toBeNull();
    expect(screen.queryByText(/photograph your ID/)).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: "Before you start" })).toBeNull();
    // The same agreement, and nothing sent before it is given.
    expect(screen.getByRole("checkbox", { name: AGREE })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Continue to face check" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Continue to verification" })).toBeNull();
    expect(startSession).not.toHaveBeenCalled();
  });

  it("on a phone says nothing about getting a phone ready", async () => {
    setup({ touch: true });
    await pass(0);
    expect(heading("Confirm it is you")).toBeInTheDocument();
    expect(screen.queryByTestId("identity-hosted-phone-notice")).toBeNull();
  });

  it("is the full check, unchanged, where the ceremony predicts nothing", async () => {
    for (const nextCheck of [undefined, null, "full"] as const) {
      const { unmount } = setup({
        identityCheck: check(nextCheck === undefined ? { nextCheck: undefined } : { nextCheck }),
      });
      await pass(0);
      expect(heading("Before you start")).toBeInTheDocument();
      expect(screen.getByText("A photo of your ID")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Continue to verification" })).toBeInTheDocument();
      expect(squashed("identity-hosted-phone-notice")).toMatch(/take the photos with your phone’s camera/);
      unmount();
    }
  });
});

describe("the wait for a face check", () => {
  it("is named for the face check, announced, and remembered as one", async () => {
    const { tab } = setup();
    await pass(0);
    await agreeAndContinue("Continue to face check");
    expect(tab.go).toHaveBeenCalledWith(PARTNER_URL);
    expect(heading("Finish the face check in the new tab")).toHaveFocus();
    expect(screen.getByRole("status").textContent).toBe("The face check opened in a new tab.");
    expect(screen.getByRole("button", { name: "Open the face check again" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(MARKER) ?? "").toMatch(/^3\|tab\|\d+\|face$/);
  });

  it("comes back to the face wait when the tab is reloaded", async () => {
    window.sessionStorage.setItem(MARKER, `3|tab|${String(Date.now() - 60_000)}|face`);
    setup({ identityCheck: check({ nextCheck: null }) });
    await pass(0);
    expect(heading("Finish the face check in the new tab")).toBeInTheDocument();
  });

  it("shows the ordinary passed screen, with how long the pass counts", async () => {
    const { refresh } = setup();
    await pass(0);
    await agreeAndContinue("Continue to face check");
    refresh.mockResolvedValue(standing({ status: "passed", verifiedAt: "2026-10-12T02:00:00.000Z" }));
    await pass(HOSTED_FAST_POLL_MS);
    expect(heading("Identity check passed")).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-valid-note").textContent).toMatch(/verified for the next 24 hours/);
  });
});

describe("when the server opens the full check after all", () => {
  it.each([["full" as const], [undefined]])("switches to the full check's wording without any error (kind %s)", async (kind) => {
    const { startSession } = setup();
    startSession.mockResolvedValue(visit(kind));
    await pass(0);
    expect(heading("Confirm it is you")).toBeInTheDocument();
    await agreeAndContinue("Continue to face check");
    expect(heading("Finish the verification in the new tab")).toHaveFocus();
    expect(screen.getByRole("status").textContent).toBe("The verification page opened in a new tab.");
    expect(screen.getByRole("button", { name: "Open the verification page again" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/face check/)).toBeNull();
    // Kept, so a reload does not go back to the face wording.
    expect(window.sessionStorage.getItem(MARKER) ?? "").toMatch(/^3\|tab\|\d+\|full$/);
  });

  it("goes to a face check, with its wording, where the full one had been predicted", async () => {
    setup({ identityCheck: check({ nextCheck: "full" }) });
    await pass(0);
    await agreeAndContinue("Continue to verification");
    expect(heading("Finish the face check in the new tab")).toBeInTheDocument();
  });
});

describe("a face check that is not passed", () => {
  it("offers the ID next, with the attempts left, and opens the full check", async () => {
    const { refresh, startSession, openTab } = setup();
    await pass(0);
    await agreeAndContinue("Continue to face check");
    refresh.mockResolvedValue(standing({ attemptsRemaining: 2 }));
    await pass(HOSTED_FAST_POLL_MS);

    expect(heading("We could not complete the identity check")).toHaveFocus();
    expect(squashed("identity-hosted-face-declined")).toBe(FACE_DECLINED);
    expect(screen.getByRole("status").textContent).toBe(FACE_DECLINED);
    expect(screen.getByTestId("identity-check-attempts-left").textContent).toBe("2 attempts left");
    // The causes of a failed ID check are not what happened here.
    expect(screen.queryByText("This usually happens when:")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();

    startSession.mockResolvedValue(visit("full"));
    press(screen.getByRole("button", { name: "Verify with my ID" }));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(openTab).toHaveBeenCalledTimes(2);
    expect(heading("Finish the verification in the new tab")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(MARKER) ?? "").toMatch(/^2\|tab\|\d+\|full$/);
  });

  it("is seen on the way back too, in the tab that went there itself", async () => {
    window.sessionStorage.setItem(MARKER, "3|same|0|face");
    const { refresh } = setup({
      returnedAt: Date.now(),
      refresh: vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ attemptsRemaining: 2 })),
    });
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(squashed("identity-hosted-face-declined")).toBe(FACE_DECLINED);
    expect(screen.getByRole("button", { name: "Verify with my ID" })).toBeInTheDocument();
  });

  it("keeps the usual causes and Try again for a full check that is not passed", async () => {
    const { refresh } = setup({
      identityCheck: check({ nextCheck: null }),
      startSession: vi.fn<IdentityCheckHostedProps["startSession"]>().mockResolvedValue(visit()),
    });
    await pass(0);
    press(screen.getByRole("checkbox", { name: AGREE }));
    press(screen.getByRole("button", { name: "Continue to verification" }));
    await pass(0);
    refresh.mockResolvedValue(standing({ attemptsRemaining: 2 }));
    await pass(HOSTED_FAST_POLL_MS);
    expect(screen.getByText("This usually happens when:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByTestId("identity-hosted-face-declined")).toBeNull();
  });
});
