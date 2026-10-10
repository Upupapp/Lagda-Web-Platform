// The identity check was passed, but the name read from the ID is not the
// name the sender entered. The participant waits for the sender.
//
// Pinned here:
//
//   - the state is reached on arrival (the ceremony says so), from an answer
//     to "where does it stand", and from a refused visit (409)
//   - it says what happened, that no attempt was used, and offers "Check
//     again" and, where the page allows it, declining; nothing on it starts
//     the check again
//   - it asks every 15 s while the tab shows, not while it is hidden, at once
//     when it shows again, and not after it has gone
//   - when the sender has decided, it is an ordinary pass
//   - the ID's name is never on this screen: this browser is not given it
//   - what LAGDA keeps is said before they agree

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  IdentityCheckHosted, HOSTED_NAME_POLL_MS, HOSTED_PASSED_PAUSE_MS,
  type IdentityCheckHostedProps, type ProviderTab,
} from "../IdentityCheckHosted";
import { ApiError } from "../../../services/api-client";
import { IDENTITY_CHECK_KEPT_NOTE, IDENTITY_CHECK_VALID_NOTE } from "../../../models/identity-check";
import type {
  CeremonyIdentityCheck, IdentityCheckSessionStatus,
} from "../../../services/real/signing-access.service";

const HEADING = "The name on your ID does not match this document";
const BODY = "Your identity was verified, but the name on your ID is different from the name the sender entered "
  + "for you. The sender has been told and can correct it or confirm it is you. You do not need to verify again.";
const UNCHANGED = "Nothing has changed yet. You can try again later.";
const AGREE = "I agree to the use of my ID and selfie to verify my identity for this document.";

const pending: CeremonyIdentityCheck = {
  required: true, status: "pending", mode: "live", attemptsRemaining: 3, verifiedAt: null, idTypes: [], flow: "hosted",
};
const mismatch: CeremonyIdentityCheck = { ...pending, status: "name-mismatch" };

const standing = (over: Partial<IdentityCheckSessionStatus> = {}): IdentityCheckSessionStatus => ({
  status: "name-mismatch", attemptsRemaining: 3, verifiedAt: null, pendingReview: false, ...over,
});

const refusal = (status: number, code: string) =>
  new ApiError(status, { code, message: `server said ${code}` }, `server said ${code}`);

function setup(over: Partial<IdentityCheckHostedProps> = {}) {
  const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>()
    .mockResolvedValue({ url: "https://verify.partner.example/s/1", expiresAt: "2026-10-10T02:30:00.000Z" });
  const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing());
  const onReload = vi.fn<IdentityCheckHostedProps["onReload"]>().mockResolvedValue(null);
  const tab = { go: vi.fn<ProviderTab["go"]>(), close: vi.fn<ProviderTab["close"]>() };
  const props: IdentityCheckHostedProps = {
    identityCheck: mismatch, documentTitle: "Office Lease", requestId: "sr_1",
    startSession, refresh, onReload, navigate: vi.fn(), openTab: () => tab, touch: false, ...over,
  };
  const view = render(<IdentityCheckHosted {...props} />);
  return {
    startSession: props.startSession as typeof startSession,
    refresh: props.refresh as typeof refresh,
    onReload: props.onReload as typeof onReload,
    tab, props, ...view,
  };
}

/** Lets time pass, and everything waiting on it settle. */
async function pass(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

/** A click that does not wait on a timer: this file runs on a held clock. */
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
const text = (testId: string) => (screen.getByTestId(testId).textContent ?? "").replace(/\s+/g, " ").trim();

/** Nothing on the screen sends them back to the partner's page. */
function expectNoWayToStartAgain() {
  for (const name of [/Continue verification/, /Try again/, /Continue to verification/, /Open the verification page again/]) {
    expect(screen.queryByRole("button", { name })).toBeNull();
  }
  expect(screen.queryByRole("checkbox")).toBeNull();
}

beforeEach(() => {
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  window.sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(document, "hidden");
});

describe("a name that does not match, as the participant sees it", () => {
  it("is shown on arrival, with focus on its heading, and says no attempt was used", async () => {
    const { refresh, startSession } = setup({ onDecline: vi.fn() });
    await pass(0);
    expect(heading(HEADING)).toHaveFocus();
    expect(text("identity-hosted-name-mismatch")).toContain(BODY);
    expect(screen.getByTestId("identity-hosted-name-attempts").textContent ?? "").toBe("This did not use one of your attempts.");
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Decline to sign/ })).toBeInTheDocument();
    expectNoWayToStartAgain();
    // Asked once on arrival; no visit is opened by anything here.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(startSession).not.toHaveBeenCalled();
    // Focus is on the heading, so nothing more is announced.
    expect(screen.getByRole("status").textContent ?? "").toBe("");
  });

  it("offers declining only where the page allows it", async () => {
    setup();
    await pass(0);
    expect(heading(HEADING)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Decline to sign/ })).toBeNull();
  });

  it("opens the page's own decline form", async () => {
    const onDecline = vi.fn();
    setup({ onDecline });
    await pass(0);
    press(screen.getByRole("button", { name: /Decline to sign/ }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("is reached from an answer that says so, and is announced", async () => {
    const { refresh } = setup({ identityCheck: pending });
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(heading(HEADING)).toHaveFocus();
    expect(screen.getByRole("status").textContent ?? "").toBe(HEADING);
    expectNoWayToStartAgain();
    // What this tab remembered about the trip is dropped: there is no trip to resume.
    expect(window.sessionStorage.getItem("lagda:identity-hosted:sr_1")).toBeNull();
  });

  it("is reached when the ceremony, read again by the page, says so", async () => {
    const { rerender, props } = setup({
      identityCheck: pending, refresh: vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ status: "pending" })),
    });
    await pass(0);
    expect(heading("Before you start")).toBeInTheDocument();
    rerender(<IdentityCheckHosted {...props} identityCheck={mismatch} />);
    await pass(0);
    expect(heading(HEADING)).toBeInTheDocument();
    expectNoWayToStartAgain();
  });

  it("is reached when opening a visit is refused because the name is waiting on the sender", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ status: "pending" }));
    const startSession = vi.fn<IdentityCheckHostedProps["startSession"]>()
      .mockRejectedValue(refusal(409, "identity_name_mismatch"));
    const { tab } = setup({ identityCheck: pending, refresh, startSession });
    await pass(0);
    press(screen.getByRole("checkbox", { name: AGREE }));
    press(screen.getByRole("button", { name: "Continue to verification" }));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(heading(HEADING)).toHaveFocus();
    // The tab opened for the partner's page is closed again, and nothing is said as an error.
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/server said/)).toBeNull();
    expectNoWayToStartAgain();
  });

  it("says nothing has changed when Check again finds the same answer, and cannot be pressed twice at once", async () => {
    let release: (value: IdentityCheckSessionStatus) => void = () => undefined;
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing());
    setup({ refresh });
    await pass(0);
    refresh.mockImplementationOnce(() => new Promise<IdentityCheckSessionStatus>(resolve => { release = resolve; }));
    press(screen.getByRole("button", { name: "Check again" }));
    expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
    press(screen.getByRole("button", { name: "Checking…" }));
    expect(refresh).toHaveBeenCalledTimes(2);
    await act(async () => { release(standing()); await Promise.resolve(); });
    await pass(0);
    expect(screen.getByTestId("identity-hosted-note").textContent ?? "").toBe(UNCHANGED);
    expect(screen.getByRole("status").textContent ?? "").toBe(UNCHANGED);
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
    expectNoWayToStartAgain();
  });

  it("says a failed Check again in plain words and stays where it is", async () => {
    const refresh = vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing());
    setup({ refresh });
    await pass(0);
    for (const error of [refusal(0, "network"), refusal(409, "identity_check_unavailable")]) {
      refresh.mockRejectedValueOnce(error);
      press(screen.getByRole("button", { name: "Check again" }));
      await pass(0);
      expect(heading(HEADING)).toBeInTheDocument();
      expect(screen.getByRole("alert").textContent ?? "").not.toMatch(/server said/);
      expectNoWayToStartAgain();
    }
  });

  it("asks every 15 seconds while the tab shows", async () => {
    const { refresh } = setup();
    await pass(0);
    expect(HOSTED_NAME_POLL_MS).toBe(15_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(HOSTED_NAME_POLL_MS - 1);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    await pass(HOSTED_NAME_POLL_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(4);
    // A question nobody pressed for says nothing when the answer is the same.
    expect(screen.queryByTestId("identity-hosted-note")).toBeNull();
  });

  it("does not ask while the tab is hidden, and asks at once when it shows again", async () => {
    const { refresh } = setup();
    await pass(0);
    setHidden(true);
    await pass(HOSTED_NAME_POLL_MS * 4);
    expect(refresh).toHaveBeenCalledTimes(1);
    setHidden(false);
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    await pass(HOSTED_NAME_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("stops asking once the screen is gone", async () => {
    const { refresh, unmount } = setup();
    await pass(0);
    unmount();
    await pass(HOSTED_NAME_POLL_MS * 4);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("becomes an ordinary pass when the sender has decided, and moves on by re-reading the ceremony", async () => {
    const { refresh, onReload } = setup({ onDecline: vi.fn() });
    await pass(0);
    refresh.mockResolvedValue(standing({ status: "passed", verifiedAt: "2026-10-10T02:00:00.000Z" }));
    await pass(HOSTED_NAME_POLL_MS);
    expect(heading("Identity check passed")).toHaveFocus();
    expect(screen.getByTestId("identity-check-valid-note").textContent ?? "").toContain(IDENTITY_CHECK_VALID_NOTE);
    expect(screen.queryByText(HEADING)).toBeNull();
    expect(onReload).not.toHaveBeenCalled();
    await pass(HOSTED_PASSED_PAUSE_MS);
    expect(onReload).toHaveBeenCalledTimes(1);
    // And it has stopped asking.
    const asked = refresh.mock.calls.length;
    await pass(HOSTED_NAME_POLL_MS * 3);
    expect(refresh).toHaveBeenCalledTimes(asked);
  });

  it("passes at once from Check again", async () => {
    const { refresh } = setup();
    await pass(0);
    refresh.mockResolvedValue(standing({ status: "passed", verifiedAt: "2026-10-10T02:00:00.000Z" }));
    press(screen.getByRole("button", { name: "Check again" }));
    await pass(0);
    expect(heading("Identity check passed")).toBeInTheDocument();
  });

  it("re-reads the ceremony when the sender allowed another way instead", async () => {
    const { refresh, onReload } = setup();
    await pass(0);
    refresh.mockResolvedValue(standing({ status: "not-required" }));
    await pass(HOSTED_NAME_POLL_MS);
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("goes back to the beginning, with a fresh agreement, if the server no longer holds the pass", async () => {
    const { refresh } = setup();
    await pass(0);
    refresh.mockResolvedValue(standing({ status: "pending", attemptsRemaining: 3 }));
    await pass(HOSTED_NAME_POLL_MS);
    expect(heading("Before you start")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: AGREE })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Continue to verification" })).toBeDisabled();
  });

  it("never shows a name from the ID: this browser is not given one", async () => {
    // Even a server that wrongly sent one would not have it shown.
    const leaky = { ...standing(), verifiedName: "MARIA CLARA SANTOS" } as IdentityCheckSessionStatus;
    setup({ refresh: vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(leaky) });
    await pass(0);
    expect(heading(HEADING)).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/MARIA CLARA/);
  });
});

describe("what LAGDA keeps, said before they agree", () => {
  it("says it keeps the name on the ID and the result, and not the number, photo or image", async () => {
    setup({
      identityCheck: pending,
      refresh: vi.fn<IdentityCheckHostedProps["refresh"]>().mockResolvedValue(standing({ status: "pending" })),
    });
    await pass(0);
    expect(heading("Before you start")).toBeInTheDocument();
    expect(IDENTITY_CHECK_KEPT_NOTE).toBe(
      "LAGDA keeps the name shown on your ID, and the result of the check. "
      + "It does not keep your ID number, your photo, or the image of your ID.");
    expect(text("identity-check-kept-note")).toBe(`Our partner checks your ID and selfie. ${IDENTITY_CHECK_KEPT_NOTE}`);
    // Said once, and nothing beside it says otherwise.
    expect((document.body.textContent ?? "").split("LAGDA keeps").length - 1).toBe(1);
    expect(document.body.textContent ?? "").not.toMatch(/LAGDA receives the result and a reference/);
  });
});
