// The identity check done on the identity verification partner's page: what
// the participant sees before they go and after they come back.
//
// Pinned here, in the order a participant meets them:
//
//   - nothing is sent until they agree; then one visit is opened, the
//     partner's page is opened at the address exactly as the server gave it,
//     and the button cannot be pressed twice
//   - on a computer that page opens in a NEW tab and this one waits, asking
//     every 3 s; on a phone, or where the browser blocks the tab, this tab
//     goes there itself
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
  IdentityCheckHosted, HOSTED_FAST_POLL_MS, HOSTED_REVIEW_POLL_MS, HOSTED_PASSED_PAUSE_MS, HOSTED_TAB_WAIT_MS,
  type IdentityCheckHostedProps, type ProviderTab,
} from "../IdentityCheckHosted";
import { ApiError } from "../../../services/api-client";
import { IDENTITY_CHECK_VALID_NOTE } from "../../../models/identity-check";
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
  // A computer whose browser opens the tab it is asked for, unless a test says otherwise.
  const tab = { go: vi.fn<ProviderTab["go"]>(), close: vi.fn<ProviderTab["close"]>() };
  const openTab = vi.fn<() => ProviderTab | null>(() => tab);
  const props: IdentityCheckHostedProps = {
    identityCheck: pending, documentTitle: "Office Lease", requestId: "sr_1",
    startSession, refresh, onReload, navigate, openTab, touch: false, ...over,
  };
  const view = render(<IdentityCheckHosted {...props} />);
  return {
    startSession: props.startSession as typeof startSession,
    refresh: props.refresh as typeof refresh,
    onReload: props.onReload as typeof onReload,
    openTab: props.openTab as typeof openTab,
    navigate, tab, props, ...view,
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
    expect(screen.getByText(/our identity verification partner’s secure page opens in a new\s+tab/)).toBeInTheDocument();
    expect(screen.getByText(/photograph your ID and take a short selfie video check/)).toBeInTheDocument();
    expect(screen.getByText(/this\s+page continues by itself when you are done/)).toBeInTheDocument();
    expect(screen.getByText(/It takes about two minutes/)).toBeInTheDocument();
    // On a computer the photos are taken with a phone: said before they agree.
    expect((screen.getByTestId("identity-hosted-phone-notice").textContent ?? "").replace(/\s+/g, " "))
      .toBe("Have your phone ready. You will scan a code and take the photos with your phone’s camera.");
    // And not, as well, that a phone is only for a device without a camera.
    expect(screen.queryByText(/If this device has no camera/)).toBeNull();
    expect(screen.queryByText(/switch to your\s+phone/)).toBeNull();
    expect(screen.getByText("A photo of your ID")).toBeInTheDocument();
    expect(screen.getByText("A selfie")).toBeInTheDocument();
    expect(screen.getByText(/The result of the check, which is recorded/)).toBeInTheDocument();
    expect(screen.getByText(
      /LAGDA keeps the name shown on your ID, and the result of the check\. It does not keep your ID number, your photo, or the image of your ID\./,
    )).toBeInTheDocument();

    const next = screen.getByRole("button", { name: "Continue to verification" });
    expect(next).toBeDisabled();
    await userEvent.click(next);
    expect(startSession).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    expect(next).toBeEnabled();
    expectNothingInline();
  });

  it("on a phone says the check is done on this device, with nothing about getting a phone ready", () => {
    setup({ touch: true });
    expect(heading("Before you start")).toBeInTheDocument();
    expect(screen.getByText(/taken to our identity verification partner’s secure\s+page/)).toBeInTheDocument();
    expect(screen.getByText(/photograph your ID and take a short selfie video check with this\s+device/)).toBeInTheDocument();
    expect(screen.getByText(/brought back here/)).toBeInTheDocument();
    expect(screen.queryByTestId("identity-hosted-phone-notice")).toBeNull();
    expect(screen.queryByText(/Have your phone ready|scan a code|new\s+tab/)).toBeNull();
    expect(screen.getByText("A photo of your ID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to verification" })).toBeDisabled();
  });

  it("opens one visit, and the partner's page in a new tab at the address exactly as given", async () => {
    const { startSession, navigate, openTab, tab } = setup();
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));

    await waitFor(() => { expect(tab.go).toHaveBeenCalledTimes(1); });
    expect(tab.go).toHaveBeenCalledWith(PARTNER_URL);
    expect(openTab).toHaveBeenCalledTimes(1);
    expect(tab.close).not.toHaveBeenCalled();
    // This tab stays where it is.
    expect(navigate).not.toHaveBeenCalled();
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(startSession).toHaveBeenCalledWith();
    // What this tab remembers: how many attempts were left, that a tab was opened, and when.
    expect(window.sessionStorage.getItem(MARKER) ?? "").toMatch(/^3\|tab\|\d+$/);
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.getItem(MARKER)).toBeNull();
  });

  it("opens the tab in the click itself, before the visit has been asked for", async () => {
    const order: string[] = [];
    const tab = { go: vi.fn<ProviderTab["go"]>(), close: vi.fn<ProviderTab["close"]>() };
    const openTab = vi.fn<() => ProviderTab | null>(() => { order.push("tab"); return tab; });
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>(() => {
      order.push("session");
      return new Promise(() => undefined);
    });
    setup({ openTab, startSession });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    press(screen.getByRole("button", { name: "Continue to verification" }));
    // Both have happened by the time the click handler returns.
    expect(order).toEqual(["tab", "session"]);
    expect(tab.go).not.toHaveBeenCalled();
  });

  it("shows Opening… and cannot be pressed twice, where this tab is the one that goes", async () => {
    let open: (value: { url: string; expiresAt: string }) => void = () => undefined;
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>(
      () => new Promise(resolve => { open = resolve; }));
    const { navigate } = setup({ startSession, touch: true });
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
    const { startSession } = setup({ touch: true });
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
    const { navigate, tab } = setup({ startSession });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    expect(await screen.findByRole("heading", { name: "Identity verification is not available right now" })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    // The blank tab is not left behind, and is never pointed there.
    expect(tab.go).not.toHaveBeenCalled();
    expect(tab.close).toHaveBeenCalledTimes(1);
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
    const { navigate, tab, openTab } = setup({ startSession });
    await press();
    expect(await screen.findByRole("heading", { name: "Identity verification is not available right now" })).toBeInTheDocument();
    expect(screen.getByText("Please try again in a few minutes.")).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toContain("server said");
    expect(navigate).not.toHaveBeenCalled();
    // The blank tab opened for the visit is closed again.
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(tab.go).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => { expect(tab.go).toHaveBeenCalledWith(PARTNER_URL); });
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(openTab).toHaveBeenCalledTimes(2);
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
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
    // Announced whole: that they passed, and how long it counts for.
    expect(screen.getByRole("status").textContent).toBe(`Identity check passed. ${IDENTITY_CHECK_VALID_NOTE}`);
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
    const { startSession, tab } = setup({
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
    expect(tab.go).toHaveBeenCalledWith(PARTNER_URL);
    expect(heading("Finish the verification in the new tab")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(MARKER) ?? "").toMatch(/^2\|tab\|\d+$/);
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
    const { startSession, tab } = setup();
    await pass(0);
    press(screen.getByRole("button", { name: "Continue verification" }));
    expect(screen.getByRole("button", { name: "Opening…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Check again" })).toBeDisabled();
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(tab.go).toHaveBeenCalledWith(PARTNER_URL);
    expect(heading("Finish the verification in the new tab")).toBeInTheDocument();
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

describe("sitting on Start after this tab itself went to the partner's page", () => {
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
    const { navigate } = setup({ refresh, touch: true });
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
    const { refresh, navigate } = setup({ touch: true });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await waitFor(() => { expect(navigate).toHaveBeenCalledTimes(1); });
    act(() => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => { expect(refresh).toHaveBeenCalledTimes(2); });
    expect(heading("Before you start")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// ── A new tab, and this one waits ────────────────────────────────────────────

describe("on a computer, with the partner's page in a new tab", () => {
  beforeEach(() => { vi.useFakeTimers(); });

  const TAB_HEADING = "Finish the verification in the new tab";

  /** Agrees and presses, on a held clock. */
  async function begin() {
    press(screen.getByRole("checkbox", { name: AGREE }));
    press(screen.getByRole("button", { name: "Continue to verification" }));
    await pass(0);
  }

  it("says where the page went, announces it, and asks for the result every 3 s", async () => {
    const { refresh, tab, navigate } = setup();
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    await begin();

    expect(tab.go).toHaveBeenCalledWith(PARTNER_URL);
    expect(navigate).not.toHaveBeenCalled();
    expect(heading(TAB_HEADING)).toHaveFocus();
    expect(screen.getByText(
      /We opened our identity verification partner’s secure page in a new tab\. Scan the code\s+it shows with your phone and complete the check there\. This page will continue by\s+itself when you are done\./,
    )).toBeInTheDocument();
    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live.textContent ?? "").toBe("The verification page opened in a new tab.");
    expect(screen.getByRole("button", { name: "Open the verification page again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
    expectNothingInline();

    await pass(HOSTED_FAST_POLL_MS - 1);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    await pass(HOSTED_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(3);
    // Well past the 20 s a return is given: this wait does not cut off there.
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(23);
    expect(heading(TAB_HEADING)).toBeInTheDocument();
  });

  it("pauses while this tab is hidden, and asks at once when they switch back to it", async () => {
    const { refresh } = setup();
    await pass(0);
    await begin();
    expect(refresh).toHaveBeenCalledTimes(1);

    // They are in the new tab, doing the check.
    setHidden(true);
    await pass(10 * HOSTED_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(1);

    setHidden(false);
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    await pass(HOSTED_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("asks at once when the window gets the focus back", async () => {
    const { refresh } = setup();
    await pass(0);
    await begin();
    act(() => { window.dispatchEvent(new Event("focus")); });
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stops asking when the screen goes away", async () => {
    const { refresh, unmount } = setup();
    await pass(0);
    await begin();
    await pass(HOSTED_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
    unmount();
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("continues by itself after a pass, by re-reading the ceremony", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockResolvedValueOnce(standing())
      .mockResolvedValue(standing({ status: "passed", verifiedAt: "2026-10-09T02:00:00.000Z" }));
    const { onReload } = setup({ refresh });
    await pass(0);
    await begin();
    await pass(HOSTED_FAST_POLL_MS);
    expect(heading(TAB_HEADING)).toBeInTheDocument();
    await pass(HOSTED_FAST_POLL_MS);
    expect(heading("Identity check passed")).toHaveFocus();
    expect(onReload).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(MARKER)).toBeNull();

    await pass(HOSTED_PASSED_PAUSE_MS);
    expect(onReload).toHaveBeenCalledTimes(1);
    const asked = refresh.mock.calls.length;
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(asked);
  });

  it("shows the review screen when a person at the partner is looking at it", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockResolvedValue(standing({ pendingReview: true }));
    setup({ refresh });
    await pass(0);
    await begin();
    await pass(HOSTED_FAST_POLL_MS);
    expect(heading("Your verification is being reviewed")).toHaveFocus();
    // And from there at the review's own pace.
    const asked = refresh.mock.calls.length;
    await pass(HOSTED_REVIEW_POLL_MS - 1);
    expect(refresh).toHaveBeenCalledTimes(asked);
    await pass(1);
    expect(refresh).toHaveBeenCalledTimes(asked + 1);
  });

  it("sees an attempt that was not passed, and opens a new tab to try again", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockResolvedValue(standing({ attemptsRemaining: 2 }));
    const { startSession, openTab, tab } = setup({ refresh });
    await pass(0);
    await begin();
    await pass(HOSTED_FAST_POLL_MS);
    expect(heading("We could not complete the identity check")).toHaveFocus();
    expect(screen.getByTestId("identity-check-attempts-left").textContent ?? "").toBe("2 attempts left");
    const asked = refresh.mock.calls.length;
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(asked);

    press(screen.getByRole("button", { name: "Try again" }));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(openTab).toHaveBeenCalledTimes(2);
    expect(tab.go).toHaveBeenCalledTimes(2);
    expect(heading(TAB_HEADING)).toBeInTheDocument();
    expect(window.sessionStorage.getItem(MARKER) ?? "").toMatch(/^2\|tab\|\d+$/);
  });

  it("shows the closed screen when the check is locked", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockResolvedValue(standing({ status: "locked", attemptsRemaining: 0 }));
    setup({ refresh });
    await pass(0);
    await begin();
    await pass(HOSTED_FAST_POLL_MS);
    expect(heading("The identity check is closed for now")).toHaveFocus();
    expect(window.sessionStorage.getItem(MARKER)).toBeNull();
    const asked = refresh.mock.calls.length;
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(asked);
  });

  it("opens the verification page again, in another new tab, on the same visit", async () => {
    const { startSession, openTab, tab, navigate } = setup();
    await pass(0);
    await begin();
    press(screen.getByRole("button", { name: "Open the verification page again" }));
    expect(screen.getByRole("button", { name: "Opening…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Check again" })).toBeDisabled();
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(openTab).toHaveBeenCalledTimes(2);
    expect(tab.go).toHaveBeenCalledTimes(2);
    expect(tab.go).toHaveBeenLastCalledWith(PARTNER_URL);
    expect(tab.close).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(heading(TAB_HEADING)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open the verification page again" })).toBeEnabled();
  });

  it("closes the blank tab and stays put when the page cannot be opened again", async () => {
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>()
      .mockResolvedValueOnce({ url: PARTNER_URL, expiresAt: "2026-10-09T02:30:00.000Z" })
      .mockRejectedValue(refusal(429, "rate_limited"));
    const { tab } = setup({ startSession });
    await pass(0);
    await begin();
    press(screen.getByRole("button", { name: "Open the verification page again" }));
    await pass(0);
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(tab.go).toHaveBeenCalledTimes(1);
    expect(heading(TAB_HEADING)).toBeInTheDocument();
    expect(screen.getByRole("alert").textContent ?? "").toBe("Too many tries in a short time. Wait a minute, then try again.");
  });

  it("checks again when asked, and says when there is still nothing", async () => {
    const { refresh } = setup();
    await pass(0);
    await begin();
    press(screen.getByRole("button", { name: "Check again" }));
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(heading(TAB_HEADING)).toBeInTheDocument();
    expect(screen.getByTestId("identity-hosted-note").textContent ?? "")
      .toBe("Nothing has arrived yet. If you finished the check, wait a moment and check again.");
  });

  it("says it is not available when Check again is refused, and comes back to the wait", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockRejectedValueOnce(refusal(409, "identity_check_unavailable"))
      .mockResolvedValue(standing());
    setup({ refresh });
    await pass(0);
    await begin();
    press(screen.getByRole("button", { name: "Check again" }));
    await pass(0);
    expect(heading("Identity verification is not available right now")).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toContain("server said");
    press(screen.getByRole("button", { name: "Try again" }));
    await pass(0);
    expect(heading(TAB_HEADING)).toBeInTheDocument();
  });

  it("keeps waiting through a question that fails by itself", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>()
      .mockResolvedValueOnce(standing())
      .mockRejectedValueOnce(refusal(409, "identity_check_unavailable"))
      .mockRejectedValueOnce(refusal(429, "rate_limited"))
      .mockResolvedValue(standing());
    setup({ refresh });
    await pass(0);
    await begin();
    await pass(3 * HOSTED_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(4);
    expect(heading(TAB_HEADING)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("after 15 minutes says nothing has arrived, and stops asking", async () => {
    const { refresh } = setup();
    await pass(0);
    await begin();
    await pass(HOSTED_TAB_WAIT_MS - 1);
    expect(heading(TAB_HEADING)).toBeInTheDocument();
    await pass(1);
    expect(heading("We have not received your result yet")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue verification" })).toBeEnabled();
    // A reload from here is an ordinary return, no longer a wait on a tab.
    expect(window.sessionStorage.getItem(MARKER)).toBe("3");
    const asked = refresh.mock.calls.length;
    await pass(60_000);
    expect(refresh).toHaveBeenCalledTimes(asked);
  });

  it("comes back to the wait, not to Start, when this tab is reloaded", async () => {
    window.sessionStorage.setItem(MARKER, `3|tab|${String(Date.now() - 60_000)}`);
    const { refresh, openTab, startSession } = setup();
    expect(heading(TAB_HEADING)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue to verification" })).toBeNull();
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(HOSTED_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
    // Nothing is opened by a reload.
    expect(openTab).not.toHaveBeenCalled();
    expect(startSession).not.toHaveBeenCalled();

    // The 15 minutes are counted from when the tab was opened, not from the reload.
    await pass(HOSTED_TAB_WAIT_MS - 60_000 - HOSTED_FAST_POLL_MS);
    expect(heading("We have not received your result yet")).toBeInTheDocument();
  });

  it("sees on a reload an attempt that was not passed while it was away", async () => {
    window.sessionStorage.setItem(MARKER, `3|tab|${String(Date.now() - 60_000)}`);
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ attemptsRemaining: 2 }));
    setup({ refresh, identityCheck: { ...pending, attemptsRemaining: 2 } });
    await pass(0);
    expect(heading("We could not complete the identity check")).toBeInTheDocument();
  });

  it("is an ordinary return once the 15 minutes are over", async () => {
    window.sessionStorage.setItem(MARKER, `3|tab|${String(Date.now() - HOSTED_TAB_WAIT_MS - 1)}`);
    setup();
    expect(heading("Checking…")).toBeInTheDocument();
    await pass(0);
    expect(heading("We have not received your result yet")).toBeInTheDocument();
  });

  it("is the return, not the wait, in a tab the partner sent back", async () => {
    // A tab opened from this one starts with a copy of what this one kept.
    window.sessionStorage.setItem(MARKER, `3|tab|${String(Date.now() - 60_000)}`);
    setup({ returnedAt: Date.now() });
    expect(heading("Checking for your result…")).toBeInTheDocument();
    await pass(20_000);
    expect(heading("We have not received your result yet")).toBeInTheDocument();
  });
});

describe("where the browser will not open a new tab", () => {
  it("sends this tab to the partner's page instead, as before", async () => {
    const openTab = vi.fn<() => ProviderTab | null>(() => null);
    const { navigate, startSession } = setup({ openTab });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await waitFor(() => { expect(navigate).toHaveBeenCalledTimes(1); });
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
    expect(openTab).toHaveBeenCalledTimes(1);
    expect(startSession).toHaveBeenCalledTimes(1);
    // Still Start, still busy: this page is on its way out.
    expect(screen.getByRole("button", { name: "Opening…" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Finish the verification in the new tab" })).toBeNull();
    // An ordinary marker: coming back is a return, not a wait on a tab.
    expect(window.sessionStorage.getItem(MARKER)).toBe("3");
  });

  it("does the same when opening one throws", async () => {
    const openTab = vi.fn<() => ProviderTab | null>(() => { throw new Error("blocked"); });
    const { navigate } = setup({ openTab });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await waitFor(() => { expect(navigate).toHaveBeenCalledWith(PARTNER_URL); });
  });
});

describe("on a phone", () => {
  it("opens no new tab: this one goes to the partner's page", async () => {
    const { navigate, openTab, tab } = setup({ touch: true });
    await userEvent.click(screen.getByRole("checkbox", { name: AGREE }));
    await userEvent.click(screen.getByRole("button", { name: "Continue to verification" }));
    await waitFor(() => { expect(navigate).toHaveBeenCalledTimes(1); });
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
    expect(openTab).not.toHaveBeenCalled();
    expect(tab.go).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(MARKER)).toBe("3");
    expect(screen.queryByRole("heading", { name: "Finish the verification in the new tab" })).toBeNull();
  });

  it("goes back to the same visit in this tab too", async () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem(MARKER, "3");
    const { navigate, openTab } = setup({ touch: true });
    await pass(0);
    press(screen.getByRole("button", { name: "Continue verification" }));
    await pass(0);
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
    expect(openTab).not.toHaveBeenCalled();
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

// ── How long the pass counts, and time to read it ───────────────────────────

describe("after a pass: how long it counts", () => {
  beforeEach(() => { vi.useFakeTimers(); });

  const passedNow = () => vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ status: "passed" }));

  it("says the pass counts for the next 24 hours, in the notice and to a screen reader", async () => {
    setup({ refresh: passedNow(), returnedAt: Date.now() });
    await pass(0);
    expect(heading("Identity check passed")).toBeInTheDocument();
    expect(screen.getByTestId("identity-check-valid-note").textContent ?? "").toBe(
      "Your identity is verified for the next 24 hours. During that time you can open and sign other "
      + "documents from this sender's workspace without verifying again.");
    const live = screen.getByRole("status");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent ?? "").toBe(`Identity check passed. ${IDENTITY_CHECK_VALID_NOTE}`);
    expect(screen.getByTestId("identity-hosted-auto-continue").textContent ?? "")
      .toBe("This page continues by itself in a few seconds.");
  });

  it("waits six seconds, long enough to read it, then continues by itself", async () => {
    expect(HOSTED_PASSED_PAUSE_MS).toBe(6_000);
    const { onReload } = setup({ refresh: passedNow(), returnedAt: Date.now() });
    await pass(0);
    // The old pause has long gone by, and it is still there to be read.
    await pass(1_200);
    expect(onReload).not.toHaveBeenCalled();
    await pass(4_799);
    expect(onReload).not.toHaveBeenCalled();
    expect(heading("Identity check passed")).toBeInTheDocument();
    await pass(1);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("continues at once on Continue, and not a second time when the six seconds are up", async () => {
    const { onReload } = setup({ refresh: passedNow(), returnedAt: Date.now() });
    await pass(0);
    press(screen.getByRole("button", { name: "Continue" }));
    await pass(0);
    expect(onReload).toHaveBeenCalledTimes(1);
    await pass(HOSTED_PASSED_PAUSE_MS);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("does not continue after the page has gone", async () => {
    const { onReload, unmount } = setup({ refresh: passedNow(), returnedAt: Date.now() });
    await pass(0);
    expect(heading("Identity check passed")).toBeInTheDocument();
    unmount();
    await pass(HOSTED_PASSED_PAUSE_MS * 2);
    expect(onReload).not.toHaveBeenCalled();
  });
});
