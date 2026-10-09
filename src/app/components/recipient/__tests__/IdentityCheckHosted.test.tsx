// The identity check done on the identity verification partner's page: what
// the participant sees before they go and after they come back.
//
// Pinned here, in the order a participant meets them:
//
//   - nothing is sent until they agree; then one visit is opened, the browser
//     is sent to the address exactly as the server gave it, and the button
//     cannot be pressed twice
//   - coming back, the result is asked for at once and then every 3 s for
//     about 20 s, after which the page says it has not arrived and stops
//   - a review by a person is waited for at 10 s, only while the tab shows
//   - an attempt that was not passed is seen as fewer attempts than before
//   - a pass moves on by RE-READING the ceremony
//   - none of LAGDA's own ID and selfie stages, its QR code to a phone, or
//     anything about a simulated result is ever on this screen

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  IdentityCheckHosted, HOSTED_FAST_POLL_MS, HOSTED_REVIEW_POLL_MS, HOSTED_PASSED_PAUSE_MS,
  type IdentityCheckHostedProps,
} from "../IdentityCheckHosted";
import { ApiError } from "../../../services/api-client";
import type {
  CeremonyIdentityCheck, IdentityCheckSessionStatus,
} from "../../../services/real/signing-access.service";

const PARTNER_URL = "https://verify.partner.example/session/abc?step=1#top";
const MARKER = "lagda:identity-hosted:sr_1";

const pending: CeremonyIdentityCheck = {
  required: true, status: "pending", mode: "live", attemptsRemaining: 3, verifiedAt: null, idTypes: [], flow: "hosted",
};

const standing = (over: Partial<IdentityCheckSessionStatus> = {}): IdentityCheckSessionStatus => ({
  status: "pending", attemptsRemaining: 3, verifiedAt: null, pendingReview: false, ...over,
});

const refusal = (status: number, code: string) =>
  new ApiError(status, { code, message: `server said ${code}` }, `server said ${code}`);

function setup(over: Partial<IdentityCheckHostedProps> = {}) {
  const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>()
    .mockResolvedValue({ url: PARTNER_URL, expiresAt: "2026-10-09T02:30:00.000Z" });
  const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing());
  const onReload = vi.fn<IdentityCheckHostedProps["onReload"]>().mockResolvedValue(null);
  const navigate = vi.fn<(url: string) => void>();
  const props: IdentityCheckHostedProps = {
    identityCheck: pending, documentTitle: "Office Lease", requestId: "sr_1",
    startSession, refresh, onReload, navigate, ...over,
  };
  const view = render(<IdentityCheckHosted {...props} />);
  return {
    startSession: props.startSession as typeof startSession,
    refresh: props.refresh as typeof refresh,
    onReload: props.onReload as typeof onReload,
    navigate, props, ...view,
  };
}

/** Lets time pass, and everything waiting on it settle. */
async function pass(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

/**
 * A click that does not wait on a timer. Most of this file runs on a held
 * clock, where userEvent's own pauses would never end.
 */
function press(element: HTMLElement) {
  // eslint-disable-next-line testing-library/prefer-user-event
  fireEvent.click(element);
}

let hidden = false;
function setHidden(next: boolean) {
  hidden = next;
  act(() => { document.dispatchEvent(new Event("visibilitychange")); });
}

const heading = (name: string) => screen.getByRole("heading", { level: 2, name });
const AGREE = "I agree to the use of my ID and selfie to verify my identity for this document.";

/** Nothing of the check LAGDA runs on its own screens. */
function expectNothingInline() {
  expect(screen.queryByTestId("identity-check-step")).toBeNull();
  expect(screen.queryByTestId("identity-check-test-banner")).toBeNull();
  expect(screen.queryByTestId("identity-check-test-panel")).toBeNull();
  expect(screen.queryByRole("list", { name: "Identity check progress" })).toBeNull();
  expect(screen.queryByLabelText("Type of ID")).toBeNull();
  expect(screen.queryByRole("button", { name: /Use my phone instead/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Use my camera|Upload a selfie|Check my identity/ })).toBeNull();
  expect(screen.queryByText(/Test mode|Simulated|simulated/)).toBeNull();
}

beforeEach(() => {
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(document, "hidden");
});

// ── Start ────────────────────────────────────────────────────────────────────

describe("before they go", () => {
  it("says what will happen, what is collected, and holds the button until they agree", async () => {
    const { startSession } = setup();
    expect(screen.getByRole("heading", { level: 1, name: "Identity check" })).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText('The sender asked for this before you open "Office Lease".')).toBeInTheDocument();
    expect(heading("Before you start")).toBeInTheDocument();
    expect(screen.getByText(/taken to our identity verification partner’s secure\s+page/)).toBeInTheDocument();
    expect(screen.getByText(/photograph your ID and take a short selfie video check/)).toBeInTheDocument();
    expect(screen.getByText(/brought back here/)).toBeInTheDocument();
    expect(screen.getByText(/It takes about two minutes/)).toBeInTheDocument();
    expect(screen.getByText(/you can switch to your\s+phone on that page/)).toBeInTheDocument();
    expect(screen.getByText("A photo of your ID")).toBeInTheDocument();
    expect(screen.getByText("A selfie")).toBeInTheDocument();
    expect(screen.getByText(/The result of the check, which is recorded/)).toBeInTheDocument();
    expect(screen.getByText(/LAGDA receives the result and a reference,\s+not the images/)).toBeInTheDocument();

    const next = screen.getByRole("button", { name: "Continue to verification" });
    expect(next).toBeDisabled();
    await userEvent.click(next);
    expect(startSession).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    expect(next).toBeEnabled();
    expectNothingInline();
  });

  it("opens one visit and sends the browser to the address exactly as given", async () => {
    const { startSession, navigate } = setup();
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));

    await waitFor(() => { expect(navigate).toHaveBeenCalledTimes(1); });
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(startSession).toHaveBeenCalledWith();
    // What this tab remembers for the way back: how many attempts were left, and nothing else.
    expect(window.sessionStorage.getItem(MARKER)).toBe("3");
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.getItem(MARKER)).toBeNull();
  });

  it("shows Opening… and cannot be pressed twice", async () => {
    let open: (value: { url: string; expiresAt: string }) => void = () => undefined;
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>(
      () => new Promise(resolve => { open = resolve; }));
    const { navigate } = setup({ startSession });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    const next = screen.getByRole("button", { name: "Continue to verification" });
    press(next);
    press(next);

    const busy = await screen.findByRole("button", { name: "Opening…" });
    expect(busy).toBeDisabled();
    press(busy);
    expect(startSession).toHaveBeenCalledTimes(1);

    await act(async () => { open({ url: PARTNER_URL, expiresAt: "2026-10-09T02:30:00.000Z" }); await Promise.resolve(); });
    expect(navigate).toHaveBeenCalledTimes(1);
    // Still busy: the page is on its way out.
    expect(screen.getByRole("button", { name: "Opening…" })).toBeDisabled();
    press(screen.getByRole("button", { name: "Opening…" }));
    expect(startSession).toHaveBeenCalledTimes(1);
  });

  it("gives the button back when the Back button restores the page", async () => {
    const { startSession } = setup();
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await screen.findByRole("button", { name: "Opening…" });

    const restored = new Event("pageshow");
    Object.defineProperty(restored, "persisted", { value: true });
    act(() => { window.dispatchEvent(restored); });
    expect(await screen.findByRole("button", { name: "Continue to verification" })).toBeEnabled();
    expect(startSession).toHaveBeenCalledTimes(1);
  });

  it("does not go to an address that is not a web address", async () => {
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>()
      .mockResolvedValue({ url: ["java", "script:alert(1)"].join(""), expiresAt: "2026-10-09T02:30:00.000Z" });
    const { navigate } = setup({ startSession });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    expect(await screen.findByRole("heading", { name: "Identity verification is not available right now" })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(MARKER)).toBeNull();
  });

  it("keeps Decline to sign within reach where the page offers it, and not otherwise", async () => {
    const onDecline = vi.fn();
    const { unmount } = setup({ onDecline });
    await userEvent.click(screen.getByRole("button", { name: "Decline to sign" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    unmount();
    setup();
    expect(screen.queryByRole("button", { name: "Decline to sign" })).toBeNull();
  });

  it("asks once on arrival, and stays on Start when there is nothing to hear", async () => {
    const { refresh, startSession } = setup();
    await waitFor(() => { expect(refresh).toHaveBeenCalledTimes(1); });
    expect(heading("Before you start")).toBeInTheDocument();
    expect(startSession).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says nothing about a question nobody asked that failed", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockRejectedValue(refusal(409, "identity_check_unavailable"));
    setup({ refresh });
    await waitFor(() => { expect(refresh).toHaveBeenCalledTimes(1); });
    expect(heading("Before you start")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("finds a review that was started on an earlier visit", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ pendingReview: true }));
    setup({ refresh });
    expect(await screen.findByRole("heading", { name: "Your verification is being reviewed" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue to verification" })).toBeNull();
  });

  it("moves focus to the heading, and announces politely", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ pendingReview: true }));
    setup({ refresh });
    const reviewed = await screen.findByRole("heading", { name: "Your verification is being reviewed" });
    expect(reviewed).toHaveFocus();
    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live.textContent).toBe("Your verification is being reviewed");
  });
});

describe("when a visit cannot be opened", () => {
  async function press() {
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
  }

  it("says it is not available right now, never in the partner's words, and tries again", async () => {
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>()
      .mockRejectedValueOnce(refusal(409, "identity_check_unavailable"))
      .mockResolvedValue({ url: PARTNER_URL, expiresAt: "2026-10-09T02:30:00.000Z" });
    const { navigate } = setup({ startSession });
    await press();
    expect(await screen.findByRole("heading", { name: "Identity verification is not available right now" })).toBeInTheDocument();
    expect(screen.getByText("Please try again in a few minutes.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("server said");
    expect(navigate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => { expect(navigate).toHaveBeenCalledWith(PARTNER_URL); });
    expect(startSession).toHaveBeenCalledTimes(2);
  });

  it("says too many tries on a 429", async () => {
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>().mockRejectedValue(refusal(429, "rate_limited"));
    setup({ startSession });
    await press();
    expect((await screen.findByRole("alert")).textContent)
      .toBe("Too many tries in a short time. Wait a minute, then try again.");
    expect(heading("Before you start")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to verification" })).toBeEnabled();
  });

  it("re-reads the ceremony when the check is no longer wanted", async () => {
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>()
      .mockRejectedValue(refusal(409, "identity_check_not_required"));
    const { onReload, navigate } = setup({ startSession });
    await press();
    await waitFor(() => { expect(onReload).toHaveBeenCalledTimes(1); });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows the closed screen when the check is locked", async () => {
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>()
      .mockRejectedValue(refusal(409, "identity_check_locked"));
    setup({ startSession });
    await press();
    expect(await screen.findByRole("heading", { name: "The identity check is closed for now" })).toBeInTheDocument();
  });

  it.each([
    [0, "x", "Could not reach the server. Check your connection and try again."],
    [401, "RECIPIENT_AUTHENTICATION_REQUIRED", "Your signing session has ended. Open your signing link again to continue."],
    [422, "identity_check_invalid", "The identity check could not be completed right now. Please try again."],
  ])("puts a %i in plain words", async (status, code, wording) => {
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>().mockRejectedValue(refusal(status, code));
    setup({ startSession });
    await press();
    expect((await screen.findByRole("alert")).textContent).toBe(wording);
  });
});

// ── Coming back ──────────────────────────────────────────────────────────────

describe("just back from the partner's page", () => {
  beforeEach(() => { vi.useFakeTimers(); });

  it("asks at once, then every 3 s, and after about 20 s says nothing has arrived and stops", async () => {
    const { refresh } = setup({ returnedAt: Date.now() });
    expect(heading("Checking for your result…")).toBeInTheDocument();
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(1);

    await pass(HOSTED_FAST_POLL_MS - 1);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    await pass(HOSTED_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(heading("Checking for your result…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue to verification" })).toBeNull();

    await pass(20_000 - 2 * HOSTED_FAST_POLL_MS);
    expect(heading("We have not received your result yet")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue verification" })).toBeEnabled();
    const asked = refresh.mock.calls.length;
    expect(asked).toBe(7);

    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(asked);
    expectNothingInline();
  });

  it("stops asking when the screen goes away", async () => {
    const { refresh, unmount } = setup({ returnedAt: Date.now() });
    await pass(HOSTED_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
    unmount();
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("says passed for a moment, then moves on by re-reading the ceremony", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockResolvedValue(standing({ status: "passed", verifiedAt: "2026-10-09T02:00:00.000Z" }));
    window.sessionStorage.setItem(MARKER, "3");
    const { onReload } = setup({ refresh, returnedAt: Date.now() });
    await pass(0);
    expect(heading("Checking for your result…")).toBeInTheDocument();

    await pass(HOSTED_FAST_POLL_MS);
    expect(heading("Identity check passed")).toHaveFocus();
    expect(screen.getByText("Thank you. You can now continue to the document.")).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toBe("Identity check passed.");
    expect(onReload).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(MARKER)).toBeNull();

    await pass(HOSTED_PASSED_PAUSE_MS);
    expect(onReload).toHaveBeenCalledTimes(1);
    // And nothing is asked of the partner any more.
    const asked = refresh.mock.calls.length;
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(asked);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("lets them continue by hand, and says so when the ceremony cannot be read", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ status: "passed" }));
    const onReload = vi.fn<IdentityCheckHostedProps["onReload"]>()
      .mockResolvedValue("Your signing session has ended. Open your signing link again to continue.");
    setup({ refresh, onReload, returnedAt: Date.now() });
    await pass(0);
    press(screen.getByRole("button", { name: "Continue" }));
    await pass(0);
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent)
      .toBe("Your signing session has ended. Open your signing link again to continue.");
    // The pause that follows does not ask a second time on top of the press.
    await pass(HOSTED_PASSED_PAUSE_MS);
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();

    press(screen.getByRole("button", { name: "Continue" }));
    await pass(0);
    expect(onReload).toHaveBeenCalledTimes(2);
  });

  it("sees an attempt that was not passed as fewer attempts than when they left", async () => {
    window.sessionStorage.setItem(MARKER, "3");
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ attemptsRemaining: 2 }));
    // The ceremony read on the way back already carries the lower number.
    const { startSession, navigate } = setup({
      refresh, returnedAt: Date.now(), identityCheck: { ...pending, attemptsRemaining: 2 },
    });
    await pass(0);
    expect(heading("We could not complete the identity check")).toHaveFocus();
    expect(screen.getByText("the photo of the ID is blurry, dark or cut off")).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-attempts-left").textContent).toBe("2 attempts left");
    expectNothingInline();

    // Nothing more is asked while they read it.
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    press(screen.getByRole("button", { name: "Try again" }));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
    expect(window.sessionStorage.getItem(MARKER)).toBe("2");
  });

  it("says 1 attempt left in the singular", async () => {
    window.sessionStorage.setItem(MARKER, "2");
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ attemptsRemaining: 1 }));
    setup({ refresh, returnedAt: Date.now() });
    await pass(0);
    expect(screen.getByTestId("identity-check-attempts-left").textContent).toBe("1 attempt left");
  });

  it("shows the closed screen when the check is locked, and what happens now", async () => {
    window.sessionStorage.setItem(MARKER, "1");
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValue(standing({ status: "locked", attemptsRemaining: 0 }));
    const { onReload, props, rerender } = setup({ refresh, returnedAt: Date.now() });
    // The ceremony, read again, says the same.
    onReload.mockImplementation(() => {
      rerender(<IdentityCheckHosted {...props} identityCheck={{ ...pending, status: "locked", attemptsRemaining: 0 }} />);
      return Promise.resolve(null);
    });
    await pass(0);
    expect(heading("The identity check is closed for now")).toHaveFocus();
    expect(screen.getByText(
      "The identity check could not be completed. The sender has been told and can let you "
      + "continue another way. You can come back to this link later.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(MARKER)).toBeNull();
    expect(screen.queryByRole("button", { name: /Try again|Continue/ })).toBeNull();

    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    press(screen.getByRole("button", { name: "Check again" }));
    await pass(0);
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("identity-check-recheck-note").textContent)
      .toBe("Nothing has changed yet. You can try again later.");
  });

  it("re-reads the ceremony when the check is no longer required", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValue(standing({ status: "not-required", attemptsRemaining: 0 }));
    const { onReload } = setup({ refresh, returnedAt: Date.now() });
    await pass(0);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it.each(["identity_check_not_required", "signing_ceremony_unavailable"])(
    "re-reads the ceremony on a 409 %s", async code => {
      const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockRejectedValue(refusal(409, code));
      const { onReload } = setup({ refresh, returnedAt: Date.now() });
      await pass(0);
      expect(onReload).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).not.toContain("server said");
    });
});

describe("while a person at the partner is reviewing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(MARKER, "3");
  });

  const reviewing = () => vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ pendingReview: true }));

  it("says so, and asks again every 10 s", async () => {
    const { refresh } = setup({ refresh: reviewing() });
    expect(heading("Checking…")).toBeInTheDocument();
    await pass(0);
    expect(heading("Your verification is being reviewed")).toHaveFocus();
    expect(screen.getByText(
      /This can take a few minutes\. You can keep this page open, or come back to your\s+signing link later\./)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);

    await pass(HOSTED_REVIEW_POLL_MS - 1);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    await pass(HOSTED_REVIEW_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(3);
    expectNothingInline();
  });

  it("pauses while the tab is hidden, and asks at once when it is back", async () => {
    const { refresh } = setup({ refresh: reviewing() });
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(1);

    setHidden(true);
    await pass(5 * HOSTED_REVIEW_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(1);

    setHidden(false);
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    await pass(HOSTED_REVIEW_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("stops when the screen goes away", async () => {
    const { refresh, unmount } = setup({ refresh: reviewing() });
    await pass(0);
    await pass(HOSTED_REVIEW_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
    unmount();
    await pass(5 * HOSTED_REVIEW_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("has a Check again that asks now, and says when it is still being reviewed", async () => {
    const { refresh } = setup({ refresh: reviewing() });
    await pass(0);
    press(screen.getByRole("button", { name: "Check again" }));
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("identity-hosted-note").textContent)
      .toBe("It is still being reviewed. Nothing more is needed from you right now.");
    expect(heading("Your verification is being reviewed")).toBeInTheDocument();
  });

  it("moves on when the review ends in a pass", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing({ pendingReview: true }))
      .mockResolvedValue(standing({ status: "passed" }));
    const { onReload } = setup({ refresh });
    await pass(0);
    await pass(HOSTED_REVIEW_POLL_MS);
    expect(heading("Identity check passed")).toBeInTheDocument();
    await pass(HOSTED_PASSED_PAUSE_MS);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("keeps waiting through a question that fails by itself", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing({ pendingReview: true }))
      .mockRejectedValueOnce(refusal(409, "identity_check_unavailable"))
      .mockRejectedValueOnce(refusal(429, "rate_limited"))
      .mockResolvedValue(standing({ pendingReview: true }));
    setup({ refresh });
    await pass(0);
    await pass(2 * HOSTED_REVIEW_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(heading("Your verification is being reviewed")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("when no result has arrived", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // This tab sent them away on an earlier visit, long enough ago.
    window.sessionStorage.setItem(MARKER, "3");
  });

  it("asks once on arrival and then waits to be asked", async () => {
    const { refresh } = setup();
    await pass(0);
    expect(heading("We have not received your result yet")).toHaveFocus();
    expect(screen.getByText(/If you left before\s+finishing, you can continue where you stopped/)).toBeInTheDocument();
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("checks again when asked, and says when there is still nothing", async () => {
    const { refresh } = setup();
    await pass(0);
    press(screen.getByRole("button", { name: "Check again" }));
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("identity-hosted-note").textContent)
      .toBe("Nothing has arrived yet. If you finished the check, wait a moment and check again.");
  });

  it("goes back to the same visit with Continue verification", async () => {
    const { startSession, navigate } = setup();
    await pass(0);
    press(screen.getByRole("button", { name: "Continue verification" }));
    expect(screen.getByRole("button", { name: "Opening…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Check again" })).toBeDisabled();
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
  });

  it("says it is not available when asking is refused, and tries again from there", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockRejectedValueOnce(refusal(409, "identity_check_unavailable"))
      .mockResolvedValue(standing({ pendingReview: true }));
    setup({ refresh });
    await pass(0);
    press(screen.getByRole("button", { name: "Check again" }));
    await pass(0);
    expect(heading("Identity verification is not available right now")).toHaveFocus();
    expect(screen.getByText("Please try again in a few minutes.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("server said");

    press(screen.getByRole("button", { name: "Try again" }));
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(heading("Your verification is being reviewed")).toBeInTheDocument();
  });

  it("says it is not available when the one question on arrival is refused", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockRejectedValue(refusal(409, "identity_check_unavailable"));
    setup({ refresh });
    await pass(0);
    expect(heading("Identity verification is not available right now")).toBeInTheDocument();
  });

  it("says too many tries on a 429, and keeps both ways forward", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockRejectedValue(refusal(429, "rate_limited"));
    setup({ refresh });
    await pass(0);
    press(screen.getByRole("button", { name: "Check again" }));
    await pass(0);
    expect(screen.getByRole("alert").textContent).toBe("Too many tries in a short time. Wait a minute, then try again.");
    expect(heading("We have not received your result yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue verification" })).toBeEnabled();
  });

  it("asks once when the tab comes back to the front", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockResolvedValue(standing({ status: "passed" }));
    setup({ refresh });
    await pass(0);
    act(() => { window.dispatchEvent(new Event("focus")); });
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(heading("Identity check passed")).toBeInTheDocument();
  });
});

describe("sitting on Start after having sent them away", () => {
  it("asks nothing on focus before they were ever sent away", async () => {
    const { refresh } = setup();
    await waitFor(() => { expect(refresh).toHaveBeenCalledTimes(1); });
    act(() => { window.dispatchEvent(new Event("focus")); });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    await act(async () => { await Promise.resolve(); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("asks once when the tab comes back, and notices a result that arrived meanwhile", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockResolvedValue(standing({ status: "passed" }));
    const { navigate } = setup({ refresh });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await waitFor(() => { expect(navigate).toHaveBeenCalledTimes(1); });
    expect(refresh).toHaveBeenCalledTimes(1);

    // They finished on their phone while this tab stayed open.
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(await screen.findByRole("heading", { name: "Identity check passed" })).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stays on Start when the tab comes back and there is still nothing", async () => {
    const { refresh, navigate } = setup();
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await waitFor(() => { expect(navigate).toHaveBeenCalledTimes(1); });
    act(() => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => { expect(refresh).toHaveBeenCalledTimes(2); });
    expect(heading("Before you start")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("a check the ceremony already says is locked", () => {
  it("shows the closed screen and asks the partner nothing", async () => {
    const { refresh, startSession } = setup({ identityCheck: { ...pending, status: "locked", attemptsRemaining: 0 } });
    expect(heading("The identity check is closed for now")).toBeInTheDocument();
    await act(async () => { await Promise.resolve(); });
    expect(refresh).not.toHaveBeenCalled();
    expect(startSession).not.toHaveBeenCalled();
    expectNothingInline();
  });

  it("goes back to Start when the sender gives the attempts back", async () => {
    const locked: CeremonyIdentityCheck = { ...pending, status: "locked", attemptsRemaining: 0 };
    window.sessionStorage.setItem(MARKER, "1");
    const { props, rerender, onReload } = setup({ identityCheck: locked });
    // The page re-reads the ceremony, which now allows three more attempts.
    onReload.mockImplementation(() => {
      rerender(<IdentityCheckHosted {...props} identityCheck={pending} />);
      return Promise.resolve(null);
    });
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to verification" })).toBeDisabled();
    expect(window.sessionStorage.getItem(MARKER)).toBeNull();
  });
});
