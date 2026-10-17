// A visit to the identity verification partner's page, and the wait for its
// result: the ONE implementation of how the page is opened and how the result
// is asked for.
//
// Three places send a person there: the signing page (a check the sender
// asked for), My Settings (verifying an account) and the eNotary gate. They
// differ in what the answer means; they do not differ in any of this.
//
// ── A new tab, not this one ────────────────────────────────────────────────
//
// On a computer the partner's page opens in a NEW tab and the page that sent
// them stays, and waits. The partner reliably sends back only the device that
// FINISHES the check; a person who starts on a computer and finishes on the
// phone its page offers would otherwise be left on the partner's "all done"
// page with nothing to return to. So the page that stayed is what continues:
// it asks for the result every few seconds and moves on by itself. It never
// depends on the partner's way back being reached. On a server the partner
// cannot call (a developer's machine), asking is the ONLY way the result
// arrives at all.
//
// The tab is opened blank, in the click itself, BEFORE the visit is asked
// for, and pointed at the partner's address once that is known. A tab opened
// after an await is no longer the click's and browsers block it; and asking
// `window.open` for "noopener" makes it return null even when it worked, so
// a blocked pop-up could not be told from an opened one. The blank tab's
// opener is cut by hand instead, and the tab is closed again if the visit
// cannot be opened. If the browser blocks even that, or on a phone (which
// finishes the check itself and is sent back), the page goes there itself.
//
// ── Three layers ───────────────────────────────────────────────────────────
//
//   launchProviderSession   opens one visit (the new tab, or this one)
//   useProviderPolling      asks again by itself while a wait is on screen
//   useAskOnReturn          asks once when a page nobody is polling comes back
//
// and, built from those for a page whose answer is simple (My Settings, the
// eNotary gate):
//
//   useProviderSession      the whole wait as one small state machine
//
// The signing page keeps its own states (attempts, a lock, a name the sender
// must decide about) and builds them on the first three.

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../services/api-client";
import { identityCheckKind, type IdentityCheckKind } from "../../models/identity-check";

// ── Timing ──────────────────────────────────────────────────────────────────

/** How often the result is asked for while a check is being done. */
export const PROVIDER_FAST_POLL_MS = 3_000;
/** How often it is asked for while a person at the partner is reviewing. */
export const PROVIDER_REVIEW_POLL_MS = 10_000;
/** How long a page waits on a check before it stops asking and says so. */
export const PROVIDER_WAIT_MS = 15 * 60 * 1000;
/** How long "Opening…" may stand if the browser never left. */
export const PROVIDER_OPENING_GIVE_UP_MS = 10_000;

// ── The tab ─────────────────────────────────────────────────────────────────

/** A tab opened for the partner's page, not yet pointed anywhere. */
export interface ProviderTab {
  /** Points the tab at the partner's page. */
  readonly go: (url: string) => void;
  /** Closes it again: the visit could not be opened. */
  readonly close: () => void;
}

export function openBlankTab(): ProviderTab | null {
  let tab: Window | null = null;
  try { tab = window.open("", "_blank"); } catch { tab = null; }
  if (tab === null) return null;
  const opened = tab;
  // The partner's page gets no handle on this one.
  try { opened.opener = null; } catch { /* already cut */ }
  return {
    go: url => { opened.location.replace(url); },
    close: () => { try { opened.close(); } catch { /* already gone */ } },
  };
}

/**
 * Whether this device is a phone or tablet, which finishes the check itself
 * and is sent back by the provider, so it keeps one tab.
 *
 * Deliberately narrower than "has a touch screen": a laptop with a touch
 * screen is still a computer, the provider shows it only the code to scan,
 * and it is the device that finishes (the phone) that is sent back. Treated
 * as a phone, such a laptop would be left on the provider's finished page.
 * So the MAIN pointer must be a finger, or the browser must say it is mobile.
 */
export function isTouchDevice(): boolean {
  try {
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
    return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/** The partner's address is used exactly as given, but only if it is a web address. */
export function isWebAddress(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

// ── Opening one visit ───────────────────────────────────────────────────────

export interface ProviderLaunchOptions<S extends { readonly url: string }> {
  /** A phone or tablet: no new tab, the page goes there itself. */
  readonly touch: boolean;
  /** Opens the blank tab. `window.open` unless given. Null: the browser would not. */
  readonly openTab?: (() => ProviderTab | null) | undefined;
  /** Sends THIS page to the partner's. The page's own navigation unless given. */
  readonly navigate?: ((url: string) => void) | undefined;
  /** Asks the server for the visit. Its rejection is rethrown, the blank tab closed. */
  readonly startSession: () => Promise<S>;
  /** False once the page that asked has gone: nothing more is done. */
  readonly stillWanted: () => boolean;
  /**
   * Runs once the visit is known and before anything goes anywhere, so what
   * must survive the trip (a marker in sessionStorage) is written in time.
   */
  readonly beforeLeave?: (how: "tab" | "same-tab", session: S) => void;
}

export type ProviderLaunchResult<S> =
  /** The partner's page is open in a new tab; the page that asked stays. */
  | { readonly how: "tab"; readonly session: S }
  /** The page that asked is on its way to the partner's page. */
  | { readonly how: "same-tab"; readonly session: S }
  /** The server answered with something that is not a web address. Nothing was opened. */
  | { readonly how: "invalid" }
  /** The page that asked went away meanwhile. Nothing was opened. */
  | { readonly how: "abandoned" };

/**
 * Opens one visit. MUST be called inside the click that asks for it, before
 * anything else is awaited: the blank tab is opened on the first line.
 */
export async function launchProviderSession<S extends { readonly url: string }>(
  options: ProviderLaunchOptions<S>,
): Promise<ProviderLaunchResult<S>> {
  // In the click, before anything is awaited: see the note at the top.
  let tab: ProviderTab | null = null;
  if (!options.touch) {
    try { tab = (options.openTab ?? openBlankTab)(); } catch { tab = null; }
  }
  let session: S;
  try {
    session = await options.startSession();
  } catch (error) {
    tab?.close();
    throw error;
  }
  if (!options.stillWanted()) { tab?.close(); return { how: "abandoned" }; }
  if (!isWebAddress(session.url)) { tab?.close(); return { how: "invalid" }; }
  if (tab !== null) {
    options.beforeLeave?.("tab", session);
    tab.go(session.url);
    return { how: "tab", session };
  }
  options.beforeLeave?.("same-tab", session);
  (options.navigate ?? ((url: string) => { window.location.assign(url); }))(session.url);
  return { how: "same-tab", session };
}

// ── Asking again by itself ──────────────────────────────────────────────────

export interface ProviderPollingOptions {
  /**
   * Names the wait on screen. A new name starts the timers afresh, so two
   * waits that ask equally often still each get their own deadline.
   */
  readonly waitKey: string;
  /** How often to ask, or null when nothing on screen is a wait. */
  readonly every: number | null;
  /** Asks once. Never awaited: a question still out is the asker's to drop. */
  readonly ask: () => void;
  /**
   * Also ask when the window gets the focus back. For a wait on another tab,
   * which the person leaves by switching back: that may be a window gaining
   * focus without anything becoming visible.
   */
  readonly askOnFocus?: boolean;
  /** When this wait gives up, read as the timers start. Null: it does not. */
  readonly deadline?: () => number | null;
  /** The deadline came and this wait is still the one on screen. */
  readonly onTimeout?: () => void;
}

/**
 * Asks at a steady pace while a wait is on screen: never while the tab is
 * hidden, at once when it shows again, and not at all once the screen that
 * was waiting has gone.
 */
export function useProviderPolling(options: ProviderPollingOptions): void {
  const { waitKey, every, askOnFocus = false } = options;
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (every === null) return;
    const ask = () => { latest.current.ask(); };
    let timer: number | null = null;
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      // Never while nobody is looking.
      if (!document.hidden) timer = window.setInterval(ask, every);
    };
    const onVisibility = () => {
      if (document.hidden) { stop(); return; }
      ask();
      start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    const onFocus = () => { if (!document.hidden) ask(); };
    if (askOnFocus) window.addEventListener("focus", onFocus);

    let giveUp: number | null = null;
    const until = latest.current.deadline?.() ?? null;
    if (until !== null) {
      giveUp = window.setTimeout(() => { latest.current.onTimeout?.(); }, Math.max(0, until - Date.now()));
    }
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      if (giveUp !== null) window.clearTimeout(giveUp);
    };
  }, [waitKey, every, askOnFocus]);
}

/**
 * The page coming back to the front where no timer is running. A person who
 * finished on a phone, or pressed Back, is sitting on a screen gone stale.
 * `onRestored`: the Back button restored the page whole, as it was left.
 */
export function useAskOnReturn(active: boolean, onBack: () => void, onRestored?: () => void): void {
  const latest = useRef({ onBack, onRestored });
  latest.current = { onBack, onRestored };

  useEffect(() => {
    if (!active) return;
    const back = () => { latest.current.onBack(); };
    const onVisible = () => { if (!document.hidden) back(); };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) latest.current.onRestored?.();
      back();
    };
    window.addEventListener("focus", back);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", back);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active]);
}

// ── Plain words ─────────────────────────────────────────────────────────────

export const PROVIDER_TOO_MANY = "Too many tries in a short time. Wait a minute, then try again.";
export const PROVIDER_NOTHING_YET =
  "Nothing has arrived yet. If you finished the check, wait a moment and check again.";
export const PROVIDER_STILL_REVIEWING =
  "It is still being reviewed. Nothing more is needed from you right now.";

/** Why a visit could not be opened or its result read, for a signed-in person. Never the server's words. */
export function describeProviderError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  if (error.status === 0) return "Could not reach the server. Check your connection and try again.";
  if (error.status === 401) return "Your session has ended. Sign in again to continue.";
  if (error.status === 403) return "This action could not be verified. Reload the page and try again.";
  if (error.status === 429) return PROVIDER_TOO_MANY;
  return "The identity check could not be completed right now. Please try again.";
}

// ── The whole wait, for a page whose answer is simple ───────────────────────

/**
 * What an answer means to the page that asked.
 *
 *   done      the check was passed: the wait is over
 *   review    a person at the partner is looking at it
 *   declined  the visit ended without a pass
 *   pending   nothing new
 *   moved     the server now asks for something else: the wait is over, and
 *             the page shows whatever the answer says
 */
export type ProviderOutcome = "done" | "review" | "declined" | "pending" | "moved";

export type ProviderPhase =
  /** Nothing is being waited on. The page shows its own screen. */
  | "idle"
  /** The partner's page is open in another tab; this page waits. */
  | "tab"
  /** Back from the partner's page in this tab; the result is on its way. */
  | "waiting"
  | "review"
  | "not-received"
  | "declined"
  | "unavailable";

export interface ProviderSessionOptions<A> {
  /** Where this wait is remembered across a reload or the trip, in sessionStorage. */
  readonly storageKey: string;
  /** Opens a visit. Rejects with the API's error. */
  readonly startSession: () => Promise<{ readonly url: string; readonly kind?: IdentityCheckKind | undefined }>;
  /** Asks where the check stands. Rejects with the API's error. */
  readonly refresh: () => Promise<A>;
  /**
   * What an answer means. `context` is whatever the page gave when the visit
   * was opened (what it must compare the answer with), kept across a reload.
   * `kind` is what the visit that is being waited on asked for, where known.
   */
  readonly interpret: (answer: A, context: string, kind: IdentityCheckKind | null) => ProviderOutcome;
  /** Every answer, with what it meant: the page keeps what it shows up to date. */
  readonly onAnswer?: (answer: A, outcome: ProviderOutcome) => void;
  /**
   * A refusal the page understands better than this hook does (the server
   * says the check is no longer wanted, say). True: handled, say nothing.
   */
  readonly onRefused?: (error: unknown) => boolean;
  /**
   * Whether the server ALREADY says the last visit was declined, read as a
   * new visit is opened. If it does, that word is about the old visit and is
   * not taken for this one until the server has said something else.
   */
  readonly declinedBefore?: () => boolean;
  /** The person has just come back from the partner's page: start asking. */
  readonly returned?: boolean;
  readonly openTab?: (() => ProviderTab | null) | undefined;
  readonly navigate?: ((url: string) => void) | undefined;
  readonly touch?: boolean | undefined;
}

export interface ProviderSessionState {
  readonly phase: ProviderPhase;
  /** A phone or tablet: the partner's page takes this tab. */
  readonly touch: boolean;
  /** What the last visit opened here asked for, where one is known. */
  readonly kind: IdentityCheckKind | null;
  readonly opening: boolean;
  readonly checking: boolean;
  /** True while anything is in flight: no button may be pressed twice. */
  readonly busy: boolean;
  /** Something to say under the heading. `quiet`: a remark, not a problem. */
  readonly note: { readonly text: string; readonly quiet: boolean } | null;
  /** What `unavailable` offers to try again. */
  readonly retry: "session" | "refresh";
  /** For a polite live region. */
  readonly announcement: string;
  /** The click handler that opens a visit. `context`: see `interpret`. */
  readonly start: (context?: string) => void;
  /** "Check again". */
  readonly checkAgain: () => void;
  /** Back to the page's own screen, forgetting the wait. */
  readonly reset: () => void;
  /**
   * The page read, on arriving, that a visit is already open or under review
   * (started in another tab, or before a reload long ago): show that instead
   * of the page's own screen. Does nothing once a wait is on screen.
   */
  readonly resume: (to: "review" | "not-received") => void;
  readonly announce: (message: string) => void;
}

interface Marker {
  readonly since: number;
  readonly how: "tab" | "same";
  readonly kind: IdentityCheckKind | null;
  readonly context: string;
}

function readMarker(key: string): Marker | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { since, how, kind, context } = parsed as Record<string, unknown>;
    if (typeof since !== "number" || !Number.isFinite(since) || since > Date.now()) return null;
    return {
      since,
      how: how === "tab" ? "tab" : "same",
      kind: kind === "face" || kind === "full" ? kind : null,
      context: typeof context === "string" ? context : "",
    };
  } catch {
    return null;
  }
}

function writeMarker(key: string, marker: Marker): void {
  try { window.sessionStorage.setItem(key, JSON.stringify(marker)); } catch { /* not kept: a reload starts over */ }
}

function clearMarker(key: string): void {
  try { window.sessionStorage.removeItem(key); } catch { /* nothing to clear */ }
}

const ANNOUNCE: Readonly<Record<Exclude<ProviderPhase, "idle">, string>> = {
  "tab": "The verification page opened in a new tab.",
  "waiting": "Checking for your result…",
  "review": "Your verification is being reviewed",
  "not-received": "We have not received your result yet",
  "declined": "We could not verify your identity",
  "unavailable": "Identity verification is not available right now",
};

/** Where a page stands as it arrives: its own screen, or a wait it comes back to. */
interface Arrival {
  readonly phase: ProviderPhase;
  readonly until: number;
  readonly kind: IdentityCheckKind | null;
  readonly context: string;
  readonly sentAway: boolean;
}

/** Who asked: nobody (a timer, the tab coming back) or the person, with a button. */
type Origin = "manual" | "quiet";

export function useProviderSession<A>(options: ProviderSessionOptions<A>): ProviderSessionState {
  const latest = useRef(options);
  latest.current = options;

  // Decided once, on arrival.
  const [arrival] = useState((): Arrival => {
    const marker = readMarker(options.storageKey);
    const now = Date.now();
    if (options.returned === true) {
      // Sent back by the partner: the wait starts now, whatever was kept.
      return {
        phase: "waiting", until: now + PROVIDER_WAIT_MS,
        kind: marker?.kind ?? null, context: marker?.context ?? "", sentAway: true,
      };
    }
    if (marker !== null && marker.since + PROVIDER_WAIT_MS > now) {
      // A reload of the page that was left waiting comes back to the wait.
      return {
        phase: marker.how === "tab" ? "tab" : "waiting",
        until: marker.since + PROVIDER_WAIT_MS, kind: marker.kind, context: marker.context, sentAway: true,
      };
    }
    return { phase: "idle", until: 0, kind: null, context: "", sentAway: marker !== null };
  });
  const [touch] = useState(() => options.touch ?? isTouchDevice());

  const [phase, setPhase] = useState<ProviderPhase>(arrival.phase);
  const phaseRef = useRef(phase);
  const [kind, setKind] = useState<IdentityCheckKind | null>(arrival.kind);
  const kindRef = useRef(kind);
  const [busy, setBusy] = useState<"session" | "refresh" | null>(null);
  const [note, setNote] = useState<ProviderSessionState["note"]>(null);
  const [retry, setRetry] = useState<"session" | "refresh">("session");
  const [announcement, setAnnouncement] = useState("");

  const aliveRef = useRef(true);
  const startingRef = useRef(false);
  const refreshingRef = useRef(false);
  const untilRef = useRef(arrival.until);
  const contextRef = useRef(arrival.context);
  /** True once this page has sent the person to the partner's page. */
  const sentAwayRef = useRef(arrival.sentAway);
  /** The wait a failed question came from, to go back to. */
  const waitPhaseRef = useRef<ProviderPhase>(arrival.phase === "idle" ? "tab" : arrival.phase);
  const openingTimerRef = useRef<number | null>(null);
  /** False while a "declined" could still be about the visit before this one. */
  const declineArmedRef = useRef(true);

  const show = useCallback((next: ProviderPhase, say = true) => {
    const changed = phaseRef.current !== next;
    phaseRef.current = next;
    if (next === "tab" || next === "waiting") waitPhaseRef.current = next;
    setPhase(next);
    if (changed) {
      setNote(null);
      if (say && next !== "idle") setAnnouncement(ANNOUNCE[next]);
    }
  }, []);

  const tell = useCallback((message: string, quiet = false) => {
    setNote({ text: message, quiet });
    setAnnouncement(message);
  }, []);

  const stopOpening = useCallback(() => {
    if (openingTimerRef.current !== null) window.clearTimeout(openingTimerRef.current);
    openingTimerRef.current = null;
    startingRef.current = false;
    setBusy(current => (current === "session" ? null : current));
  }, []);

  /** The wait is over, one way or the other. */
  const finish = useCallback(() => {
    clearMarker(latest.current.storageKey);
    untilRef.current = 0;
    sentAwayRef.current = false;
  }, []);

  const refused = useCallback((error: unknown, origin: Origin, what: "session" | "refresh") => {
    if (latest.current.onRefused?.(error) === true) {
      finish();
      show("idle");
      return;
    }
    if (origin === "quiet") return;
    const code = error instanceof ApiError ? error.body?.code : undefined;
    // A route that is not there cannot open a visit either.
    if (code === "identity_check_unavailable" || (error instanceof ApiError && error.status === 404)) {
      setRetry(what);
      show("unavailable");
      return;
    }
    tell(describeProviderError(error));
  }, [finish, show, tell]);

  const settle = useCallback((answer: A, origin: Origin) => {
    const said = latest.current.interpret(answer, contextRef.current, kindRef.current);
    const outcome: ProviderOutcome = said === "declined" && !declineArmedRef.current ? "pending" : said;
    if (said !== "declined") declineArmedRef.current = true;
    latest.current.onAnswer?.(answer, outcome);
    const before = phaseRef.current;
    if (outcome === "done" || outcome === "moved") {
      finish();
      show("idle", false);
      return;
    }
    if (outcome === "review") {
      show("review");
      if (origin === "manual" && before === "review") tell(PROVIDER_STILL_REVIEWING, true);
      return;
    }
    if (outcome === "declined") {
      // Nothing is waited on any more; "Try again" opens a new visit.
      clearMarker(latest.current.storageKey);
      untilRef.current = 0;
      if (before === "idle" && !sentAwayRef.current) return;
      show("declined");
      return;
    }
    // Nothing new. A question nobody asked leaves the screen as it is, except
    // a review that has ended without a word: back to the wait it came from.
    if (before === "review") {
      show(Date.now() < untilRef.current ? waitPhaseRef.current : "not-received");
      return;
    }
    if (origin !== "manual") return;
    if (before === "unavailable") {
      show(Date.now() < untilRef.current ? waitPhaseRef.current : "not-received");
      return;
    }
    if (before === "tab" || before === "waiting" || before === "not-received") tell(PROVIDER_NOTHING_YET, true);
  }, [finish, show, tell]);

  const ask = useCallback(async (origin: Origin): Promise<void> => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    if (origin === "manual") { setBusy("refresh"); setNote(null); }
    try {
      const answer = await latest.current.refresh();
      if (aliveRef.current) settle(answer, origin);
    } catch (error) {
      if (aliveRef.current) refused(error, origin, "refresh");
    } finally {
      refreshingRef.current = false;
      if (aliveRef.current && origin === "manual") setBusy(current => (current === "refresh" ? null : current));
    }
  }, [refused, settle]);

  const go = useCallback(async (context: string | undefined): Promise<void> => {
    if (startingRef.current) return;
    startingRef.current = true;
    if (context !== undefined) contextRef.current = context;
    declineArmedRef.current = latest.current.declinedBefore?.() !== true;
    setBusy("session");
    setNote(null);
    setAnnouncement("Opening…");
    try {
      const result = await launchProviderSession({
        touch,
        openTab: latest.current.openTab,
        navigate: latest.current.navigate,
        startSession: () => latest.current.startSession(),
        stillWanted: () => aliveRef.current,
        beforeLeave: (how, session) => {
          const now = Date.now();
          sentAwayRef.current = true;
          untilRef.current = now + PROVIDER_WAIT_MS;
          writeMarker(latest.current.storageKey, {
            since: now, how: how === "tab" ? "tab" : "same",
            kind: identityCheckKind(session.kind), context: contextRef.current,
          });
        },
      });
      if (result.how === "abandoned") return;
      if (result.how === "invalid") {
        stopOpening();
        setRetry("session");
        show("unavailable");
        return;
      }
      kindRef.current = identityCheckKind(result.session.kind);
      setKind(kindRef.current);
      if (result.how === "tab") {
        stopOpening();
        // Shown afresh even from the wait itself, so its deadline starts again.
        phaseRef.current = "idle";
        show("tab", false);
        setAnnouncement(identityCheckKind(result.session.kind) === "face"
          ? "The face check opened in a new tab." : ANNOUNCE.tab);
        return;
      }
      // The page is leaving: the button stays busy so it cannot be pressed
      // again on the way out. If the browser never leaves, it is given back.
      openingTimerRef.current = window.setTimeout(stopOpening, PROVIDER_OPENING_GIVE_UP_MS);
    } catch (error) {
      if (!aliveRef.current) return;
      stopOpening();
      refused(error, "manual", "session");
    }
  }, [refused, show, stopOpening, touch]);

  // Arrival, and leaving.
  useEffect(() => {
    aliveRef.current = true;
    // A return or a reload is waiting on an answer: ask at once.
    if (phaseRef.current !== "idle") void ask("quiet");
    return () => {
      aliveRef.current = false;
      if (openingTimerRef.current !== null) window.clearTimeout(openingTimerRef.current);
    };
  // Arrival happens once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waiting = phase === "tab" || phase === "waiting";
  // `tab` twice running (the page opened again) must restart the deadline.
  const [waitRound, setWaitRound] = useState(0);

  useProviderPolling({
    waitKey: `${phase}:${String(waitRound)}`,
    every: waiting ? PROVIDER_FAST_POLL_MS : phase === "review" ? PROVIDER_REVIEW_POLL_MS : null,
    ask: () => { void ask("quiet"); },
    askOnFocus: phase === "tab",
    deadline: () => (waiting ? untilRef.current : null),
    onTimeout: () => {
      if (phaseRef.current !== "tab" && phaseRef.current !== "waiting") return;
      untilRef.current = 0;
      // A reload from here on starts from the page's own screen.
      clearMarker(latest.current.storageKey);
      show("not-received");
    },
  });

  // Where no timer runs: ask once when the page comes back to the front.
  useAskOnReturn(
    phase === "not-received" || phase === "declined" || (phase === "idle" && sentAwayRef.current),
    () => { if (sentAwayRef.current || phaseRef.current !== "idle") void ask("quiet"); },
    stopOpening,
  );

  const start = useCallback((context?: string) => {
    void go(context).then(() => { if (aliveRef.current) setWaitRound(round => round + 1); });
  }, [go]);
  const resume = useCallback((to: "review" | "not-received") => {
    if (phaseRef.current !== "idle") return;
    sentAwayRef.current = true;
    show(to, false);
  }, [show]);
  const checkAgain = useCallback(() => { void ask("manual"); }, [ask]);
  const reset = useCallback(() => {
    finish();
    show("idle");
  }, [finish, show]);

  return {
    phase, touch, kind, note, retry, announcement,
    opening: busy === "session", checking: busy === "refresh", busy: busy !== null,
    start, checkAgain, reset, resume, announce: setAnnouncement,
  };
}
