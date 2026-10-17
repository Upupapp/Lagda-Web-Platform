// A visit to the identity verification partner's page, and the wait for its
// result: the one implementation the signing page, My Settings and the
// eNotary gate share.
//
// Pinned here:
//
//   - on a computer the page opens in a NEW tab, opened in the click itself,
//     and the page that asked stays and waits; where the browser blocks the
//     tab, or on a phone, the page goes there itself
//   - while it waits it asks every 3 s, never while hidden, at once when it
//     shows again or the window gets the focus back, never after it has gone,
//     and after 15 minutes it stops and says so, with Check again
//   - what each answer means: done, under review, declined, nothing new, and
//     the server asking for something else
//   - "not available", too many tries, and an ended session, in plain words

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  useProviderSession, launchProviderSession, isWebAddress,
  PROVIDER_FAST_POLL_MS, PROVIDER_REVIEW_POLL_MS, PROVIDER_WAIT_MS,
  type ProviderOutcome, type ProviderSessionOptions, type ProviderTab,
} from "../provider-session";
import { ProviderLive, ProviderSessionView } from "../ProviderSessionParts";
import { ApiError } from "../../../services/api-client";
import type { IdentityCheckKind } from "../../../models/identity-check";

const PARTNER_URL = "https://verify.partner.example/session/abc?step=1#top";
const KEY = "lagda:test-provider-session";

interface Answer { readonly outcome: ProviderOutcome }
type Options = ProviderSessionOptions<Answer>;

const refusal = (status: number, code: string) =>
  new ApiError(status, { code, message: `server said ${code}` }, `server said ${code}`);

function Harness(props: Options) {
  const session = useProviderSession<Answer>(props);
  return (
    <div>
      <ProviderLive>{session.announcement}</ProviderLive>
      <div data-testid="phase">{session.phase}</div>
      <div data-testid="kind">{session.kind ?? "unknown"}</div>
      {session.phase === "idle" && (
        <>
          <button type="button" disabled={session.busy} onClick={() => { session.start("before"); }}>
            {session.opening ? "Opening…" : "Start"}
          </button>
          {session.note !== null && <p data-testid="idle-note">{session.note.text}</p>}
        </>
      )}
      <ProviderSessionView session={session} context="before" />
    </div>
  );
}

function setup(over: Partial<Options> = {}) {
  const startSession = vi.fn<Options["startSession"]>().mockResolvedValue({ url: PARTNER_URL });
  const refresh = vi.fn<Options["refresh"]>().mockResolvedValue({ outcome: "pending" });
  const interpret = vi.fn<Options["interpret"]>((answer: Answer) => answer.outcome);
  const onAnswer = vi.fn<NonNullable<Options["onAnswer"]>>();
  const navigate = vi.fn<(url: string) => void>();
  const tab = { go: vi.fn<ProviderTab["go"]>(), close: vi.fn<ProviderTab["close"]>() };
  const openTab = vi.fn<() => ProviderTab | null>(() => tab);
  const props: Options = {
    storageKey: KEY, startSession, refresh, interpret, onAnswer, navigate, openTab, touch: false, ...over,
  };
  const view = render(<Harness {...props} />);
  return {
    startSession: props.startSession as typeof startSession,
    refresh: props.refresh as typeof refresh,
    openTab: props.openTab as typeof openTab,
    interpret, onAnswer, navigate, tab, props, ...view,
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

const phase = () => screen.getByTestId("phase").textContent ?? "";
const heading = (name: string) => screen.getByRole("heading", { level: 2, name });
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const marker = () => window.sessionStorage.getItem(KEY);

/** Opens a visit in a new tab and lets the page settle into its wait. */
async function openInTab(over: Partial<Options> = {}) {
  const made = setup(over);
  press(button("Start"));
  await pass(0);
  expect(phase()).toBe("tab");
  return made;
}

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(document, "hidden");
});

// ── Opening ──────────────────────────────────────────────────────────────────

describe("opening the partner's page", () => {
  it("opens the tab in the click itself, before the visit has been asked for", async () => {
    let release: (value: { url: string }) => void = () => undefined;
    const startSession = vi.fn<Options["startSession"]>(() => new Promise(resolve => { release = resolve; }));
    const { openTab, tab } = setup({ startSession });
    press(button("Start"));
    // Still inside the click: the tab exists, and points nowhere yet.
    expect(openTab).toHaveBeenCalledTimes(1);
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(tab.go).not.toHaveBeenCalled();
    expect(button("Opening…")).toBeDisabled();
    await act(async () => { release({ url: PARTNER_URL }); await Promise.resolve(); });
    expect(tab.go).toHaveBeenCalledWith(PARTNER_URL);
  });

  it("stays and waits, says where the page went, and remembers the wait across a reload", async () => {
    const { navigate, tab } = await openInTab();
    expect(tab.go).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    const title = heading("Finish the verification in the new tab");
    expect(title).toHaveFocus();
    expect(screen.getAllByRole("status").map(node => node.textContent ?? "")).toContain("The verification page opened in a new tab.");
    expect(JSON.parse(marker() ?? "{}")).toMatchObject({ how: "tab", context: "before", kind: "full" });
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("cannot be pressed twice", async () => {
    let release: (value: { url: string }) => void = () => undefined;
    const startSession = vi.fn<Options["startSession"]>(() => new Promise(resolve => { release = resolve; }));
    setup({ startSession });
    press(button("Start"));
    press(button("Opening…"));
    expect(startSession).toHaveBeenCalledTimes(1);
    await act(async () => { release({ url: PARTNER_URL }); await Promise.resolve(); });
  });

  it("sends this page there instead where the browser will not open a tab", async () => {
    const { navigate, startSession } = setup({ openTab: () => null });
    press(button("Start"));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
    // Written before the page leaves, so the return finds it.
    expect(JSON.parse(marker() ?? "{}")).toMatchObject({ how: "same", context: "before" });
    // The page is leaving: the button stays busy so it cannot be pressed again.
    expect(button("Opening…")).toBeDisabled();
    expect(phase()).toBe("idle");
  });

  it("does the same when opening a tab throws", async () => {
    const { navigate } = setup({ openTab: () => { throw new Error("blocked"); } });
    press(button("Start"));
    await pass(0);
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
  });

  it("on a phone opens no tab: this one goes to the partner's page", async () => {
    const { openTab, navigate } = setup({ touch: true });
    press(button("Start"));
    await pass(0);
    expect(openTab).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(PARTNER_URL);
  });

  it("gives the button back if the browser never left", async () => {
    setup({ touch: true });
    press(button("Start"));
    await pass(0);
    expect(button("Opening…")).toBeDisabled();
    await pass(10_000);
    expect(button("Start")).toBeEnabled();
  });

  it("goes nowhere that is not a web address, and closes the blank tab", async () => {
    const { tab, navigate } = setup({
      startSession: vi.fn<Options["startSession"]>().mockResolvedValue({ url: "data:text/html,<p>not the partner</p>" }),
    });
    press(button("Start"));
    await pass(0);
    expect(tab.go).not.toHaveBeenCalled();
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(heading("Identity verification is not available right now")).toBeInTheDocument();
    expect(marker()).toBeNull();
  });

  it("takes the kind of the visit from the server's answer", async () => {
    await openInTab({ startSession: vi.fn<Options["startSession"]>().mockResolvedValue({ url: PARTNER_URL, kind: "face" }) });
    expect(screen.getByTestId("kind").textContent).toBe("face");
    expect(heading("Finish the face check in the new tab")).toBeInTheDocument();
    expect(button("Open the face check again")).toBeInTheDocument();
    expect(JSON.parse(marker() ?? "{}")).toMatchObject({ kind: "face" });
  });
});

describe("launchProviderSession", () => {
  it("closes the blank tab and opens nothing when the page that asked has gone", async () => {
    const tab = { go: vi.fn<ProviderTab["go"]>(), close: vi.fn<ProviderTab["close"]>() };
    const navigate = vi.fn<(url: string) => void>();
    const result = await launchProviderSession({
      touch: false, openTab: () => tab, navigate,
      startSession: () => Promise.resolve({ url: PARTNER_URL }), stillWanted: () => false,
    });
    expect(result).toEqual({ how: "abandoned" });
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(tab.go).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("closes the blank tab and rethrows when the visit is refused", async () => {
    const tab = { go: vi.fn<ProviderTab["go"]>(), close: vi.fn<ProviderTab["close"]>() };
    const error = refusal(409, "identity_check_unavailable");
    await expect(launchProviderSession({
      touch: false, openTab: () => tab,
      startSession: () => Promise.reject(error), stillWanted: () => true,
    })).rejects.toBe(error);
    expect(tab.close).toHaveBeenCalledTimes(1);
  });

  it("accepts only web addresses", () => {
    expect(isWebAddress("https://verify.partner.example/x")).toBe(true);
    expect(isWebAddress("http://localhost:3000/x")).toBe(true);
    expect(isWebAddress("data:text/html,<p>not the partner</p>")).toBe(false);
    expect(isWebAddress("/relative")).toBe(false);
    expect(isWebAddress(undefined)).toBe(false);
  });
});

// ── Waiting ──────────────────────────────────────────────────────────────────

describe("while the partner's page is open in another tab", () => {
  it("asks for the result every 3 s", async () => {
    const { refresh } = await openInTab();
    expect(refresh).not.toHaveBeenCalled();
    await pass(PROVIDER_FAST_POLL_MS - 1);
    expect(refresh).not.toHaveBeenCalled();
    await pass(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(PROVIDER_FAST_POLL_MS * 3);
    expect(refresh).toHaveBeenCalledTimes(4);
    expect(phase()).toBe("tab");
  });

  it("pauses while the page is hidden, and asks at once when it shows again", async () => {
    const { refresh } = await openInTab();
    setHidden(true);
    await pass(PROVIDER_FAST_POLL_MS * 5);
    expect(refresh).not.toHaveBeenCalled();
    setHidden(false);
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(PROVIDER_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("asks at once when the window gets the focus back", async () => {
    const { refresh } = await openInTab();
    act(() => { window.dispatchEvent(new Event("focus")); });
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops asking when the screen goes away", async () => {
    const { refresh, unmount } = await openInTab();
    await pass(PROVIDER_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
    unmount();
    await pass(PROVIDER_FAST_POLL_MS * 10);
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("after 15 minutes says nothing has arrived, stops asking, and offers Check again", async () => {
    const { refresh } = await openInTab();
    await pass(PROVIDER_WAIT_MS);
    expect(heading("We have not received your result yet")).toHaveFocus();
    expect(marker()).toBeNull();
    const asked = refresh.mock.calls.length;
    await pass(PROVIDER_FAST_POLL_MS * 10);
    expect(refresh).toHaveBeenCalledTimes(asked);
    press(button("Check again"));
    await pass(0);
    expect(refresh).toHaveBeenCalledTimes(asked + 1);
    expect(screen.getByTestId("provider-session-note").textContent)
      .toBe("Nothing has arrived yet. If you finished the check, wait a moment and check again.");
    expect(button("Continue verification")).toBeInTheDocument();
  });

  it("keeps waiting, saying nothing, through a question that fails by itself", async () => {
    const { refresh } = await openInTab();
    refresh.mockRejectedValueOnce(refusal(500, "server_error"));
    await pass(PROVIDER_FAST_POLL_MS);
    expect(phase()).toBe("tab");
    expect(screen.queryByRole("alert")).toBeNull();
    await pass(PROVIDER_FAST_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("opens the page again in another new tab, and starts its 15 minutes again", async () => {
    const { startSession, openTab, refresh } = await openInTab();
    await pass(PROVIDER_WAIT_MS - 60_000);
    press(button("Open the verification page again"));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(openTab).toHaveBeenCalledTimes(2);
    await pass(120_000);
    expect(phase()).toBe("tab");
    expect(refresh.mock.calls.length).toBeGreaterThan(10);
  });

  it("says when Check again finds nothing yet, and cannot be pressed twice at once", async () => {
    let release: (value: Answer) => void = () => undefined;
    const { refresh } = await openInTab();
    refresh.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    press(button("Check again"));
    expect(button("Checking…")).toBeDisabled();
    expect(button("Open the verification page again")).toBeDisabled();
    await act(async () => { release({ outcome: "pending" }); await Promise.resolve(); });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("provider-session-note").textContent).toMatch(/^Nothing has arrived yet\./);
    expect(button("Check again")).toBeEnabled();
  });
});

// ── Answers ──────────────────────────────────────────────────────────────────

describe("what an answer means", () => {
  it("done: the wait is over, the page is told, and nothing more is asked", async () => {
    const { refresh, onAnswer, interpret } = await openInTab();
    refresh.mockResolvedValue({ outcome: "done" });
    await pass(PROVIDER_FAST_POLL_MS);
    expect(phase()).toBe("idle");
    expect(onAnswer).toHaveBeenCalledWith({ outcome: "done" }, "done");
    // The page's own word for what to compare with, and what the visit asked for.
    expect(interpret).toHaveBeenLastCalledWith({ outcome: "done" }, "before", "full");
    expect(marker()).toBeNull();
    await pass(PROVIDER_FAST_POLL_MS * 5);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("review: says so, asks every 10 s, and says when it is still being reviewed", async () => {
    const { refresh } = await openInTab();
    refresh.mockResolvedValue({ outcome: "review" });
    await pass(PROVIDER_FAST_POLL_MS);
    expect(heading("Your verification is being reviewed")).toHaveFocus();
    const asked = refresh.mock.calls.length;
    await pass(PROVIDER_REVIEW_POLL_MS - 1);
    expect(refresh).toHaveBeenCalledTimes(asked);
    await pass(1);
    expect(refresh).toHaveBeenCalledTimes(asked + 1);
    press(button("Check again"));
    await pass(0);
    expect(screen.getByTestId("provider-session-note").textContent)
      .toBe("It is still being reviewed. Nothing more is needed from you right now.");
    refresh.mockResolvedValue({ outcome: "done" });
    await pass(PROVIDER_REVIEW_POLL_MS);
    expect(phase()).toBe("idle");
  });

  it("declined: says so with the usual causes, and Try again opens a new visit", async () => {
    const { refresh, startSession } = await openInTab();
    refresh.mockResolvedValue({ outcome: "declined" });
    await pass(PROVIDER_FAST_POLL_MS);
    expect(heading("We could not verify your identity")).toHaveFocus();
    expect(screen.getByText("This usually happens when:")).toBeInTheDocument();
    expect(screen.getByText("the photo of the ID is blurry, dark or cut off")).toBeInTheDocument();
    // No count of attempts here: that is the signing page's alone.
    expect(screen.queryByText(/attempts? left/)).toBeNull();
    expect(marker()).toBeNull();
    const asked = refresh.mock.calls.length;
    await pass(PROVIDER_FAST_POLL_MS * 5);
    expect(refresh).toHaveBeenCalledTimes(asked);
    refresh.mockResolvedValue({ outcome: "pending" });
    press(button("Try again"));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(phase()).toBe("tab");
  });

  it("moved: the server asks for something else, so the page shows its own screen again", async () => {
    const { refresh, onAnswer } = await openInTab();
    refresh.mockResolvedValue({ outcome: "moved" });
    await pass(PROVIDER_FAST_POLL_MS);
    expect(phase()).toBe("idle");
    expect(onAnswer).toHaveBeenCalledWith({ outcome: "moved" }, "moved");
    expect(marker()).toBeNull();
  });

  it("does not take an old 'declined' for the new visit until the server has said something else", async () => {
    const { refresh } = await openInTab({ declinedBefore: () => true });
    refresh.mockResolvedValue({ outcome: "declined" });
    await pass(PROVIDER_FAST_POLL_MS * 2);
    expect(phase()).toBe("tab");
    refresh.mockResolvedValueOnce({ outcome: "pending" });
    await pass(PROVIDER_FAST_POLL_MS);
    expect(phase()).toBe("tab");
    await pass(PROVIDER_FAST_POLL_MS);
    expect(phase()).toBe("declined");
  });
});

// ── Refusals ─────────────────────────────────────────────────────────────────

describe("when a visit cannot be opened", () => {
  it.each([
    ["the check is switched off", refusal(409, "identity_check_unavailable")],
    ["the route is not there", refusal(404, "resource_not_found")],
  ])("says it is not available when %s, never in the server's words, and tries again", async (_why, error) => {
    const { startSession, tab } = setup();
    startSession.mockRejectedValueOnce(error);
    press(button("Start"));
    await pass(0);
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(heading("Identity verification is not available right now")).toHaveFocus();
    expect(screen.getByText("Please try again in a few minutes.")).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/server said/);
    press(button("Try again"));
    await pass(0);
    expect(startSession).toHaveBeenCalledTimes(2);
    expect(phase()).toBe("tab");
  });

  it.each([
    [429, "rate_limited", "Too many tries in a short time. Wait a minute, then try again."],
    [401, "unauthenticated", "Your session has ended. Sign in again to continue."],
    [0, "network", "Could not reach the server. Check your connection and try again."],
  ])("says a %i in plain words and stays put", async (status, code, wording) => {
    const { startSession } = setup();
    startSession.mockRejectedValueOnce(refusal(status, code));
    press(button("Start"));
    await pass(0);
    expect(phase()).toBe("idle");
    expect(screen.getByTestId("idle-note").textContent).toBe(wording);
    expect(button("Start")).toBeEnabled();
  });

  it("leaves a refusal the page understands to the page, and says nothing itself", async () => {
    const onRefused = vi.fn((error: unknown) => error instanceof ApiError && error.body?.code === "enotary_access_not_required");
    const { startSession } = setup({ onRefused });
    startSession.mockRejectedValueOnce(refusal(409, "enotary_access_not_required"));
    press(button("Start"));
    await pass(0);
    expect(onRefused).toHaveBeenCalledTimes(1);
    expect(phase()).toBe("idle");
    expect(screen.queryByTestId("idle-note")).toBeNull();
  });

  it("says it is not available when Check again is refused, and comes back to the wait", async () => {
    const { refresh } = await openInTab();
    refresh.mockRejectedValueOnce(refusal(409, "identity_check_unavailable"));
    press(button("Check again"));
    await pass(0);
    expect(heading("Identity verification is not available right now")).toBeInTheDocument();
    press(button("Try again"));
    await pass(0);
    expect(phase()).toBe("tab");
  });
});

// ── Coming back ──────────────────────────────────────────────────────────────

describe("coming back", () => {
  it("just returned from the partner: asks at once, then every 3 s, with Check again within reach", async () => {
    const { refresh } = setup({ returned: true });
    await pass(0);
    expect(phase()).toBe("waiting");
    expect(heading("Checking for your result…")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    await pass(PROVIDER_FAST_POLL_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(button("Check again")).toBeInTheDocument();
    await pass(PROVIDER_WAIT_MS);
    expect(phase()).toBe("not-received");
  });

  it("a reload of the page that was left waiting comes back to the wait, with what it knew", async () => {
    const kind: IdentityCheckKind = "face";
    window.sessionStorage.setItem(KEY, JSON.stringify({ since: Date.now() - 60_000, how: "tab", kind, context: "earlier" }));
    const { refresh, interpret } = setup();
    await pass(0);
    expect(phase()).toBe("tab");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(interpret).toHaveBeenLastCalledWith({ outcome: "pending" }, "earlier", "face");
    expect(heading("Finish the face check in the new tab")).toBeInTheDocument();
    // What is left of the 15 minutes, not a fresh 15.
    await pass(PROVIDER_WAIT_MS - 60_000);
    expect(phase()).toBe("not-received");
  });

  it("is the page's own screen once the 15 minutes are over, or the marker cannot be read", async () => {
    window.sessionStorage.setItem(KEY, JSON.stringify({ since: Date.now() - PROVIDER_WAIT_MS - 1, how: "tab", kind: "full", context: "" }));
    const first = setup();
    await pass(0);
    expect(phase()).toBe("idle");
    expect(first.refresh).not.toHaveBeenCalled();
    first.unmount();
    window.sessionStorage.setItem(KEY, "not json");
    setup();
    await pass(0);
    expect(phase()).toBe("idle");
  });
});
