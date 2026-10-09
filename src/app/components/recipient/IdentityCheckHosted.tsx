// The identity check, done on the identity verification partner's page.
//
// Where the server says `flow: "hosted"` the participant does not photograph
// anything on LAGDA's screens. They agree here, are sent to the partner's
// secure page (which takes the ID photo and the selfie video check, and
// offers its own way to switch to a phone), and are brought back. This
// component is what they see before they go and after they return.
//
// It takes the place of `IdentityCheckStages` on the signing page and shares
// nothing with it but the look: none of the inline stages, the simulated
// result, the test banner or LAGDA's own "Use my phone instead" exists here.
//
// ── What leaves this device ────────────────────────────────────────────────
//
// That the participant agreed. Nothing else: the images go from the
// participant to the partner, and LAGDA receives the result and a reference.
//
// ── Knowing where they stand ───────────────────────────────────────────────
//
// The ceremony says only `pending`. Whether a visit was started, is being
// reviewed by a person, or was not passed is learnt by asking (`refresh`):
//
//   passed                      → say so, then on to the ceremony
//   pending, under review       → wait, asking every 10 s while the tab shows
//   pending, fewer attempts     → that attempt was not passed
//   pending, nothing new        → no result yet (or, never started: Start)
//   locked / not-required       → the locked screen / on to the ceremony
//
// "Fewer attempts than before" needs a before. It is the number this tab
// last knew when it sent the participant away, kept in sessionStorage so it
// survives the trip to the partner's page and back. That marker also says
// "this tab has sent them away", which is what tells a first visit (Start)
// from a return (waiting). It holds a small number and nothing else.

import {
  useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode,
} from "react";
import {
  AlertTriangle, Ban, CheckCircle2, Clock, Loader2, Lock, RefreshCw, ShieldCheck,
} from "lucide-react";
import {
  ActionButton, ActionRow, Notice, PhaseBanner, GF, T, TAP,
} from "./signer-ui";
import { ApiError } from "../../services/api-client";
import type {
  CeremonyIdentityCheck, IdentityCheckSession, IdentityCheckSessionStatus,
} from "../../services/real/signing-access.service";
import { IDENTITY_RETURN_FAST_WINDOW_MS } from "../../models/identity-check";

export interface IdentityCheckHostedProps {
  readonly identityCheck: CeremonyIdentityCheck;
  readonly documentTitle: string;
  /** Tells this check from another this tab may have open: the signing request. */
  readonly requestId: string;
  /** Opens a visit to the partner's page. Rejects with the API's error. */
  readonly startSession: () => Promise<IdentityCheckSession>;
  /** Asks where the check stands. Rejects with the API's error. */
  readonly refresh: () => Promise<IdentityCheckSessionStatus>;
  /**
   * Re-reads the ceremony and lets the page move to whatever comes next.
   * Resolves to a message when the ceremony could not be read, else null.
   */
  readonly onReload: () => Promise<string | null>;
  /** Present when the page offers declining; opens the page's own decline form. */
  readonly onDecline?: () => void;
  /** Sends the browser to the partner's page. The page's own navigation unless given. */
  readonly navigate?: (url: string) => void;
  /** When the participant came back from the partner's page, if they just did. */
  readonly returnedAt?: number | null;
}

/** How often the result is asked for just after coming back. */
export const HOSTED_FAST_POLL_MS = 3_000;
/** How often it is asked for while a person at the partner is reviewing. */
export const HOSTED_REVIEW_POLL_MS = 10_000;
/** How long "passed" stays up before the page moves on by itself. */
export const HOSTED_PASSED_PAUSE_MS = 1_200;
/** How long "Opening…" may stand if the browser never left. */
const OPENING_GIVE_UP_MS = 10_000;

type View =
  /** A return outside the fast window: one question, then whatever it says. */
  | { readonly kind: "arriving" }
  | { readonly kind: "start" }
  /** Just back: the result usually arrives within seconds. */
  | { readonly kind: "waiting" }
  | { readonly kind: "review" }
  | { readonly kind: "not-received" }
  | { readonly kind: "failed"; readonly left: number }
  | { readonly kind: "passed" }
  | { readonly kind: "locked" }
  | { readonly kind: "unavailable"; readonly retry: "session" | "refresh" };

/**
 * Who asked. `quiet` questions are the ones nobody pressed a button for (a
 * timer, the tab coming back, a first visit): a failure of one is not shown,
 * because the participant can do nothing about a request they did not make.
 */
type Origin = "arrival" | "manual" | "quiet";

const TOO_MANY = "Too many tries in a short time. Wait a minute, then try again.";

/** In plain words, and never in the server's or the partner's. */
function describeHostedError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  if (error.status === 0) return "Could not reach the server. Check your connection and try again.";
  if (error.status === 401) return "Your signing session has ended. Open your signing link again to continue.";
  if (error.status === 403) return "This action could not be verified. Reload the page and try again.";
  if (error.status === 429) return TOO_MANY;
  return "The identity check could not be completed right now. Please try again.";
}

/** The partner's address is used exactly as given, but only if it is a web address. */
function isWebAddress(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

// ── What this tab remembers across the trip ─────────────────────────────────

const markerKey = (requestId: string) => `lagda:identity-hosted:${requestId}`;

/** The attempts left when this tab sent the participant away, or null if it never did. */
function readMarker(requestId: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(markerKey(requestId));
    if (raw === null) return null;
    const attempts = Number(raw);
    return Number.isInteger(attempts) && attempts >= 0 ? attempts : null;
  } catch {
    return null;
  }
}

function writeMarker(requestId: string, attempts: number): void {
  try { window.sessionStorage.setItem(markerKey(requestId), String(attempts)); } catch { /* not kept: the return page still says they came back */ }
}

function clearMarker(requestId: string): void {
  try { window.sessionStorage.removeItem(markerKey(requestId)); } catch { /* nothing to clear */ }
}

// ── Look ────────────────────────────────────────────────────────────────────

const SR_ONLY: CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden",
  clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0, opacity: 0,
};

const BODY: CSSProperties = {
  ...GF, margin: "0 0 12px", fontSize: "clamp(13px, 3.4vw, 14px)", color: T.inkSoft, lineHeight: 1.6,
  overflowWrap: "anywhere",
};

const STYLES = `
  .idh-stage { animation: idh-in 180ms ease both; min-height: 216px; }
  @keyframes idh-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .idh-spin { animation: idh-spin 900ms linear infinite; }
  @keyframes idh-spin { to { transform: rotate(360deg); } }
  .idh-heading:focus { outline: none; }
  .idh-heading:focus-visible { outline: 2px solid ${T.azure}; outline-offset: 4px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) {
    .idh-stage, .idh-spin { animation: none; }
  }
`;

const HEADINGS: Readonly<Record<View["kind"], string>> = {
  "arriving": "Checking…",
  "start": "Before you start",
  "waiting": "Checking for your result…",
  "review": "Your verification is being reviewed",
  "not-received": "We have not received your result yet",
  "failed": "We could not complete the identity check",
  "passed": "Identity check passed",
  "locked": "The identity check is closed for now",
  "unavailable": "Identity verification is not available right now",
};

// ── The step ────────────────────────────────────────────────────────────────

export function IdentityCheckHosted(props: IdentityCheckHostedProps) {
  const { identityCheck, documentTitle, requestId, onDecline, returnedAt = null } = props;
  // Read when something happens, never as a reason to start over: the page
  // hands new functions over on every render.
  const propsRef = useRef(props);
  propsRef.current = props;

  // Decided once, on arrival.
  const [arrival] = useState(() => {
    const marker = readMarker(requestId);
    const fastUntil = returnedAt === null ? 0 : returnedAt + IDENTITY_RETURN_FAST_WINDOW_MS;
    return {
      sentAway: marker !== null || returnedAt !== null,
      baseline: marker ?? identityCheck.attemptsRemaining,
      fastUntil,
    };
  });

  /** True once this tab has sent the participant to the partner's page. */
  const sentAwayRef = useRef(arrival.sentAway);
  /** The attempts left as last known: a lower number later means an attempt was not passed. */
  const baselineRef = useRef(arrival.baseline);
  const fastUntilRef = useRef(arrival.fastUntil);

  const [view, setView] = useState<View>(() => {
    if (identityCheck.status === "locked") return { kind: "locked" };
    if (!arrival.sentAway) return { kind: "start" };
    return Date.now() < arrival.fastUntil ? { kind: "waiting" } : { kind: "arriving" };
  });
  const viewRef = useRef(view);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState<"session" | "refresh" | "reload" | null>(null);
  /** Something to say under the heading. `quiet`: a plain remark, not a problem. */
  const [note, setNote] = useState<{ readonly text: string; readonly quiet: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [recheckCount, setRecheckCount] = useState(0);

  const consentId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const aliveRef = useRef(true);
  const startingRef = useRef(false);
  const refreshingRef = useRef(false);
  const movingRef = useRef(false);
  /** Moving on has been tried once: after that it is the participant's to press. */
  const movedOnceRef = useRef(false);
  const openingTimerRef = useRef<number | null>(null);

  // The ceremony's own word on a lock outranks whatever this screen thinks.
  const shown: View = identityCheck.status === "locked" ? { kind: "locked" } : view;
  const shownKind = shown.kind;

  const show = useCallback((next: View, say = true) => {
    const changed = viewRef.current.kind !== next.kind;
    viewRef.current = next;
    setView(next);
    if (changed) {
      setNote(null);
      if (say) setAnnouncement(HEADINGS[next.kind]);
    }
  }, []);

  /** Where a participant with nothing new to hear belongs. */
  const resting = useCallback((): View => {
    if (!sentAwayRef.current) return { kind: "start" };
    return Date.now() < fastUntilRef.current ? { kind: "waiting" } : { kind: "not-received" };
  }, []);

  const tell = useCallback((message: string, quiet = false) => {
    setNote({ text: message, quiet });
    setAnnouncement(message);
  }, []);

  // ── On to the ceremony ───────────────────────────────────────────────────

  /** Re-reads the ceremony. Still here afterwards means it had nothing new to say. */
  const moveOn = useCallback(async (): Promise<void> => {
    const message = await propsRef.current.onReload();
    if (!aliveRef.current) return;
    if (viewRef.current.kind === "arriving") show(resting());
    if (message !== null) tell(message);
  }, [resting, show, tell]);

  const continueAfterPass = useCallback(async (): Promise<void> => {
    if (movingRef.current) return;
    movingRef.current = true;
    movedOnceRef.current = true;
    setBusy("reload");
    try {
      const message = await propsRef.current.onReload();
      if (aliveRef.current && message !== null) tell(message);
    } finally {
      movingRef.current = false;
      if (aliveRef.current) setBusy(null);
    }
  }, [tell]);

  // ── What an answer means ─────────────────────────────────────────────────

  const refused = useCallback(async (error: unknown, origin: Origin, what: "session" | "refresh"): Promise<void> => {
    const code = error instanceof ApiError ? error.body?.code : undefined;
    if (code === "identity_check_locked") {
      clearMarker(propsRef.current.requestId);
      show({ kind: "locked" });
      return;
    }
    if (code === "identity_check_not_required" || code === "signing_ceremony_unavailable") {
      // Something changed on the sender's side. The ceremony says what.
      await moveOn();
      return;
    }
    if (origin === "quiet") return;
    if (code === "identity_check_unavailable") {
      show({ kind: "unavailable", retry: what });
      return;
    }
    if (viewRef.current.kind === "arriving") show(resting());
    tell(describeHostedError(error));
  }, [moveOn, resting, show, tell]);

  const settle = useCallback(async (answer: IdentityCheckSessionStatus, origin: Origin): Promise<void> => {
    const { requestId: id } = propsRef.current;
    if (answer.status === "passed") {
      clearMarker(id);
      show({ kind: "passed" }, false);
      setAnnouncement("Identity check passed.");
      return;
    }
    if (answer.status === "locked") {
      clearMarker(id);
      show({ kind: "locked" }, false);
      setAnnouncement("The identity check could not be completed.");
      return;
    }
    if (answer.status === "not-required") {
      // The sender allowed another way while this was going on.
      clearMarker(id);
      await moveOn();
      return;
    }
    const before = viewRef.current.kind;
    if (answer.pendingReview) {
      show({ kind: "review" });
      if (origin === "manual" && before === "review") tell("It is still being reviewed. Nothing more is needed from you right now.", true);
      return;
    }
    if (answer.attemptsRemaining < baselineRef.current) {
      // The only sign of an attempt that was not passed.
      baselineRef.current = answer.attemptsRemaining;
      show({ kind: "failed", left: answer.attemptsRemaining }, false);
      setAnnouncement("We could not complete the identity check.");
      return;
    }
    // The sender may have given the attempts back.
    baselineRef.current = answer.attemptsRemaining;
    // Nothing new. A question nobody asked leaves the screen as it is, except
    // where the screen was itself only a wait for this answer.
    if (origin === "quiet" && before !== "waiting" && before !== "review") return;
    if (before === "failed") return;
    show(resting());
    if (origin === "manual" && before === "not-received") {
      tell("Nothing has arrived yet. If you finished the check, wait a moment and check again.", true);
    }
  }, [moveOn, resting, show, tell]);

  const ask = useCallback(async (origin: Origin): Promise<void> => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    if (origin === "manual") { setBusy("refresh"); setNote(null); }
    try {
      const answer = await propsRef.current.refresh();
      if (aliveRef.current) await settle(answer, origin);
    } catch (error) {
      if (aliveRef.current) await refused(error, origin, "refresh");
    } finally {
      refreshingRef.current = false;
      if (aliveRef.current && origin === "manual") setBusy(null);
    }
  }, [refused, settle]);

  // ── Going to the partner's page ──────────────────────────────────────────

  const stopOpening = useCallback(() => {
    if (openingTimerRef.current !== null) window.clearTimeout(openingTimerRef.current);
    openingTimerRef.current = null;
    startingRef.current = false;
    setBusy(current => (current === "session" ? null : current));
  }, []);

  /**
   * The click handler of "Continue to verification", and of every later way
   * back to the partner's page. Reached only after the agreement was given on
   * this screen or, for a return, before this tab first sent them away: the
   * server keeps no visit that was not agreed to.
   */
  const go = useCallback(async (): Promise<void> => {
    if (startingRef.current) return;
    startingRef.current = true;
    setBusy("session");
    setNote(null);
    setAnnouncement("Opening…");
    try {
      const session = await propsRef.current.startSession();
      if (!aliveRef.current) return;
      if (!isWebAddress(session.url)) {
        stopOpening();
        show({ kind: "unavailable", retry: "session" });
        return;
      }
      sentAwayRef.current = true;
      writeMarker(propsRef.current.requestId, baselineRef.current);
      // The page is leaving: the button stays busy so it cannot be pressed
      // again on the way out. If the browser never leaves, it is given back.
      openingTimerRef.current = window.setTimeout(stopOpening, OPENING_GIVE_UP_MS);
      (propsRef.current.navigate ?? ((url: string) => { window.location.assign(url); }))(session.url);
    } catch (error) {
      if (!aliveRef.current) return;
      stopOpening();
      await refused(error, "manual", "session");
    }
  }, [refused, show, stopOpening]);

  // ── Arrival, and leaving ─────────────────────────────────────────────────

  useEffect(() => {
    aliveRef.current = true;
    // Once, on every arrival that is not already locked. For a first visit it
    // is a quiet question: it finds a review started in another tab, and
    // otherwise changes nothing.
    // A return outside the fast window is waiting on this one answer, so a
    // failure of it is said; everywhere else a timer or a button follows.
    if (viewRef.current.kind !== "locked") void ask(viewRef.current.kind === "arriving" ? "arrival" : "quiet");
    return () => {
      aliveRef.current = false;
      if (openingTimerRef.current !== null) window.clearTimeout(openingTimerRef.current);
    };
  // Arrival happens once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Asking again by itself ───────────────────────────────────────────────

  useEffect(() => {
    if (shownKind !== "review" && shownKind !== "waiting") return;
    const every = shownKind === "review" ? HOSTED_REVIEW_POLL_MS : HOSTED_FAST_POLL_MS;
    let timer: number | null = null;
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      // Never while nobody is looking.
      if (!document.hidden) timer = window.setInterval(() => { void ask("quiet"); }, every);
    };
    const onVisibility = () => {
      if (document.hidden) { stop(); return; }
      void ask("quiet");
      start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);

    // Just back: after the fast window, stop asking and say so.
    let settleTimer: number | null = null;
    if (shownKind === "waiting") {
      settleTimer = window.setTimeout(() => {
        if (viewRef.current.kind === "waiting") show({ kind: "not-received" });
      }, Math.max(0, fastUntilRef.current - Date.now()));
    }
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
    };
  }, [shownKind, ask, show]);

  // The tab coming back to the front, where no timer is running. The partner
  // sends the device that STARTED the check back; a participant who finished
  // on a phone, or pressed Back, is sitting on a screen that has gone stale.
  useEffect(() => {
    if (shownKind !== "start" && shownKind !== "not-received") return;
    const onBack = () => {
      if (sentAwayRef.current) void ask("quiet");
    };
    const onVisible = () => { if (!document.hidden) onBack(); };
    const onPageShow = (event: PageTransitionEvent) => {
      // Restored by the Back button with "Opening…" still on the button.
      if (event.persisted) stopOpening();
      onBack();
    };
    window.addEventListener("focus", onBack);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onBack);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [shownKind, ask, stopOpening]);

  // ── Passed: a moment to read it, then on ─────────────────────────────────

  useEffect(() => {
    if (shownKind !== "passed") return;
    const timer = window.setTimeout(() => {
      if (!movedOnceRef.current) void continueAfterPass();
    }, HOSTED_PASSED_PAUSE_MS);
    return () => { window.clearTimeout(timer); };
  }, [shownKind, continueAfterPass]);

  // ── Locked: "Check again" ────────────────────────────────────────────────

  const checkLockAgain = async () => {
    if (busy !== null) return;
    setBusy("reload");
    setNote(null);
    try {
      const message = await propsRef.current.onReload();
      if (!aliveRef.current) return;
      if (message !== null) tell(message);
      else setRecheckCount(count => count + 1);
    } finally {
      if (aliveRef.current) setBusy(null);
    }
  };

  // After "Check again", with whatever the ceremony now says. Still here means
  // the page did not move on: either nothing changed, or the attempts are back.
  const standingRef = useRef(identityCheck);
  standingRef.current = identityCheck;
  useEffect(() => {
    if (recheckCount === 0) return;
    const now = standingRef.current;
    if (now.status === "pending" && now.attemptsRemaining > 0) {
      clearMarker(propsRef.current.requestId);
      sentAwayRef.current = false;
      baselineRef.current = now.attemptsRemaining;
      show({ kind: "start" });
      return;
    }
    tell("Nothing has changed yet. You can try again later.", true);
  }, [recheckCount, show, tell]);

  // ── Focus ────────────────────────────────────────────────────────────────

  useEffect(() => {
    headingRef.current?.focus();
  }, [shownKind]);

  // ── Shared pieces ────────────────────────────────────────────────────────

  const heading = (
    <h2
      ref={headingRef} tabIndex={-1} className="idh-heading"
      style={{ ...GF, margin: "0 0 8px", fontSize: "clamp(16px, 4.2vw, 18px)", fontWeight: 800, color: T.ink, lineHeight: 1.3 }}
    >
      {HEADINGS[shownKind]}
    </h2>
  );

  const noteLine = note !== null && (note.quiet
    ? <p data-testid="identity-hosted-note" style={BODY}>{note.text}</p>
    : <Notice icon={AlertTriangle} tone="danger">{note.text}</Notice>);

  const declineLink = onDecline !== undefined && (
    <div style={{ marginTop: 16, textAlign: "center" }}>
      <button
        type="button" onClick={onDecline}
        style={{
          ...GF, minHeight: TAP, padding: "0 12px", background: "transparent", border: "none",
          color: T.inkSoft, fontSize: 13, textDecoration: "underline", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        <Ban size={14} aria-hidden /> Decline to sign
      </button>
    </div>
  );

  const opening = busy === "session";
  const checking = busy === "refresh";

  const frame = (children: ReactNode) => (
    <div data-testid="identity-check-hosted">
      <style>{STYLES}</style>
      <PhaseBanner
        icon={ShieldCheck} tone="info" badge="Required"
        title="Identity check"
        description={`The sender asked for this before you open "${documentTitle}".`}
      />
      <div role="status" aria-live="polite" style={SR_ONLY}>{announcement}</div>
      <div key={shownKind} className="idh-stage" data-testid={`identity-hosted-${shownKind}`}>{children}</div>
    </div>
  );

  // ── Locked ───────────────────────────────────────────────────────────────

  if (shown.kind === "locked") {
    return frame(
      <>
        {heading}
        <Notice icon={Lock} tone="neutral">
          The identity check could not be completed. The sender has been told and can let you
          continue another way. You can come back to this link later.
        </Notice>
        {note !== null && (
          <p data-testid="identity-check-recheck-note" style={BODY}>{note.text}</p>
        )}
        <ActionRow>
          <ActionButton
            icon={busy === "reload" ? Loader2 : RefreshCw} kind="secondary"
            onClick={() => void checkLockAgain()} disabled={busy !== null} full
          >
            {busy === "reload" ? "Checking…" : "Check again"}
          </ActionButton>
        </ActionRow>
        {declineLink}
      </>,
    );
  }

  // ── Start ────────────────────────────────────────────────────────────────

  if (shown.kind === "start") {
    return frame(
      <>
        {heading}
        <p style={BODY}>
          The sender asked that you confirm who you are before you sign this document.
          It takes about two minutes.
        </p>
        <p style={BODY}>
          When you continue, you will be taken to our identity verification partner&rsquo;s secure
          page. There you will photograph your ID and take a short selfie video check, and then
          you will be brought back here. If this device has no camera, you can switch to your
          phone on that page.
        </p>
        <ul style={{ ...BODY, paddingLeft: 20, listStyle: "disc" }}>
          <li style={{ display: "list-item", marginBottom: 4 }}>A photo of your ID</li>
          <li style={{ display: "list-item", marginBottom: 4 }}>A selfie</li>
          <li style={{ display: "list-item" }}>The result of the check, which is recorded in the document&rsquo;s history</li>
        </ul>
        <p style={BODY}>
          Our partner checks your ID and selfie. LAGDA receives the result and a reference,
          not the images.
        </p>
        {noteLine}
        <label
          htmlFor={consentId}
          style={{
            ...GF, display: "flex", alignItems: "flex-start", gap: 10, minHeight: TAP, padding: "10px 12px",
            borderRadius: 10, cursor: "pointer", boxSizing: "border-box",
            fontSize: "clamp(13px, 3.4vw, 14px)", color: T.ink, lineHeight: 1.5,
            background: agreed ? T.azureWash : T.surface, border: `1px solid ${agreed ? "#B7DAF5" : T.border}`,
          }}
        >
          <input
            id={consentId} type="checkbox" checked={agreed} disabled={opening}
            onChange={event => { setAgreed(event.target.checked); }}
            style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1, accentColor: T.azure }}
          />
          <span style={{ minWidth: 0 }}>
            I agree to the use of my ID and selfie to verify my identity for this document.
          </span>
        </label>
        <ActionRow>
          <ActionButton
            icon={opening ? Loader2 : ShieldCheck} onClick={() => void go()} disabled={!agreed || opening} full
          >
            {opening ? "Opening…" : "Continue to verification"}
          </ActionButton>
        </ActionRow>
        {declineLink}
      </>,
    );
  }

  // ── Passed ───────────────────────────────────────────────────────────────

  if (shown.kind === "passed") {
    return frame(
      <>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <CheckCircle2 size={22} aria-hidden style={{ color: T.success, flexShrink: 0, marginTop: 1 }} />
          {heading}
        </div>
        <p style={BODY}>Thank you. You can now continue to the document.</p>
        {noteLine}
        <ActionRow>
          <ActionButton
            icon={busy === "reload" ? Loader2 : undefined}
            onClick={() => void continueAfterPass()} disabled={busy === "reload"} full
          >
            {busy === "reload" ? "Opening…" : "Continue"}
          </ActionButton>
        </ActionRow>
      </>,
    );
  }

  // ── Under review ─────────────────────────────────────────────────────────

  if (shown.kind === "review") {
    return frame(
      <>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Clock size={22} aria-hidden style={{ color: T.azure, flexShrink: 0, marginTop: 1 }} />
          {heading}
        </div>
        <p style={BODY}>
          This can take a few minutes. You can keep this page open, or come back to your
          signing link later.
        </p>
        {noteLine}
        <ActionRow>
          <ActionButton
            icon={checking ? Loader2 : RefreshCw} kind="secondary"
            onClick={() => void ask("manual")} disabled={busy !== null} full
          >
            {checking ? "Checking…" : "Check again"}
          </ActionButton>
        </ActionRow>
        {declineLink}
      </>,
    );
  }

  // ── No result yet ────────────────────────────────────────────────────────

  if (shown.kind === "not-received") {
    return frame(
      <>
        {heading}
        <p style={BODY}>
          If you finished the check, it can take a moment to reach us. If you left before
          finishing, you can continue where you stopped.
        </p>
        {noteLine}
        <ActionRow>
          <ActionButton
            icon={checking ? Loader2 : RefreshCw}
            onClick={() => void ask("manual")} disabled={busy !== null} full
          >
            {checking ? "Checking…" : "Check again"}
          </ActionButton>
          <ActionButton
            icon={opening ? Loader2 : ShieldCheck} kind="secondary"
            onClick={() => void go()} disabled={busy !== null} full
          >
            {opening ? "Opening…" : "Continue verification"}
          </ActionButton>
        </ActionRow>
        {declineLink}
      </>,
    );
  }

  // ── An attempt that was not passed ───────────────────────────────────────

  if (shown.kind === "failed") {
    const left = shown.left;
    return frame(
      <>
        {heading}
        <p style={{ ...BODY, marginBottom: 6 }}>This usually happens when:</p>
        <ul style={{ ...BODY, paddingLeft: 20, listStyle: "disc" }}>
          <li style={{ display: "list-item", marginBottom: 4 }}>the photo of the ID is blurry, dark or cut off</li>
          <li style={{ display: "list-item", marginBottom: 4 }}>your face is not clearly lit, or something covers it</li>
          <li style={{ display: "list-item" }}>the ID belongs to someone else, or has expired</li>
        </ul>
        <p data-testid="identity-check-attempts-left" style={{ ...BODY, fontWeight: 700, color: T.ink }}>
          {left === 1 ? "1 attempt left" : `${String(left)} attempts left`}
        </p>
        {noteLine}
        <ActionRow>
          <ActionButton
            icon={opening ? Loader2 : RefreshCw} onClick={() => void go()} disabled={busy !== null} full
          >
            {opening ? "Opening…" : "Try again"}
          </ActionButton>
        </ActionRow>
        {declineLink}
      </>,
    );
  }

  // ── Not available ────────────────────────────────────────────────────────

  if (shown.kind === "unavailable") {
    const retry = shown.retry;
    const working = retry === "session" ? opening : checking;
    return frame(
      <>
        {heading}
        <p style={BODY}>Please try again in a few minutes.</p>
        {noteLine}
        <ActionRow>
          <ActionButton
            icon={working ? Loader2 : RefreshCw}
            onClick={() => void (retry === "session" ? go() : ask("manual"))} disabled={busy !== null} full
          >
            {working ? (retry === "session" ? "Opening…" : "Checking…") : "Try again"}
          </ActionButton>
        </ActionRow>
        {declineLink}
      </>,
    );
  }

  // ── Waiting for the first answer ─────────────────────────────────────────

  return frame(
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <Loader2 size={28} aria-hidden className="idh-spin" style={{ color: T.azure }} />
      {heading}
      <p style={{ ...BODY, marginBottom: 0 }}>This takes a moment. Keep this page open.</p>
    </div>,
  );
}
