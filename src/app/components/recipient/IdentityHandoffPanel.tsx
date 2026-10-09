// "Use my phone instead": the identity check, handed from a computer to a
// phone with a QR code.
//
// ── What is on the screen ──────────────────────────────────────────────────
//
// The code, one line saying what to do with it, how the phone is getting on,
// and how long the code has left. The link itself carries a secret, so it is
// never printed: "Copy link" puts it on the clipboard, and it is shown only
// where the clipboard cannot be used at all.
//
// ── Watching the phone ─────────────────────────────────────────────────────
//
// The status is read every few seconds while this panel is open and the tab
// is in front. A hidden tab stops asking and asks again at once when it comes
// back; leaving the panel stops for good. Nothing is revoked on the way out:
// the code simply runs out, or is replaced by the next one.

import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type CSSProperties, type ReactNode, type Ref,
} from "react";
import QRCode from "qrcode";
import {
  AlertTriangle, ArrowLeft, Check, Clock, Copy, Loader2, RefreshCw, Smartphone,
} from "lucide-react";
import { ActionButton, ActionRow, Notice, GF, T, TAP } from "./signer-ui";
import { ApiError } from "../../services/api-client";
import type {
  IdentityHandoff, IdentityHandoffStatus,
} from "../../services/real/signing-access.service";
import { IDENTITY_HANDOFF_LIFETIME_MS, identityHandoffTimeLeft } from "../../models/identity-check";

/** The two calls the panel makes, on the participant's signing session. */
export interface IdentityHandoffClient {
  /** Asks for a new link. The one before it stops working. */
  readonly create: () => Promise<IdentityHandoff>;
  readonly status: (handoffId: string) => Promise<IdentityHandoffStatus>;
  /** How often the status is read while the panel is open. */
  readonly pollMs?: number;
}

export interface IdentityHandoffPanelProps {
  readonly client: IdentityHandoffClient;
  readonly headingRef: Ref<HTMLHeadingElement>;
  /** Says something through the step's polite live region. */
  readonly announce: (message: string) => void;
  /** Back to doing it on this computer. */
  readonly onBack: () => void;
  /** The phone passed the check. */
  readonly onCompleted: () => void;
  /** No attempt is left. */
  readonly onLocked: () => void;
  /**
   * The check is no longer wanted, or cannot be made here: the ceremony says
   * which. Resolves to a message when it could not be read, else null.
   */
  readonly onGone: () => Promise<string | null>;
}

type Standing = "waiting" | "opened" | "failed" | "expired" | "revoked";

type View =
  | { readonly kind: "creating" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "code";
      readonly handoff: IdentityHandoff;
      /** When the code stops working, by this device's clock. */
      readonly deadline: number;
      readonly standing: Standing;
      readonly attemptsRemaining: number;
    };

const DEFAULT_POLL_MS = 3000;
const QUIET_ZONE = 4;
const QR_LABEL = "QR code that continues the identity check on your phone";
const NOT_HERE = "Your phone cannot be used for this right now. Go back and continue on this computer.";

function describeHandoffError(error: unknown): string {
  if (!(error instanceof ApiError)) return "A code could not be made. Please try again.";
  if (error.status === 0) return "Could not reach the server. Check your connection and try again.";
  if (error.status === 401) return "Your signing session has ended. Open your signing link again to continue.";
  if (error.status === 403) return "This action could not be verified. Reload the page and try again.";
  if (error.status === 429) return "Too many tries in a short time. Wait a minute, then try again.";
  return "A code could not be made right now. Please try again.";
}

/** What a refusal means for the panel. */
function refusalOf(error: unknown): "locked" | "gone" | "other" {
  if (!(error instanceof ApiError)) return "other";
  const code = error.body?.code;
  if (code === "identity_check_locked") return "locked";
  if (
    code === "identity_check_not_required" || code === "identity_check_unavailable"
    || code === "signing_ceremony_unavailable"
  ) return "gone";
  return "other";
}

function clock(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}

function attemptsLeft(count: number): string {
  return count === 1 ? "1 attempt left" : `${String(count)} attempts left`;
}

// ── The code ────────────────────────────────────────────────────────────────

/**
 * Drawn as vector squares, so it is sharp at any size and on any screen, with
 * the four-module quiet zone a scanner needs and the darkest ink on white.
 */
function HandoffQrCode({ url }: { url: string }) {
  const drawn = useMemo(() => {
    try {
      const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
      const size = modules.size;
      let path = "";
      for (let row = 0; row < size; row += 1) {
        for (let column = 0; column < size; column += 1) {
          if (modules.get(row, column) !== 0) {
            path += `M${String(column + QUIET_ZONE)} ${String(row + QUIET_ZONE)}h1v1h-1z`;
          }
        }
      }
      return { side: size + QUIET_ZONE * 2, path };
    } catch {
      return null;
    }
  }, [url]);

  if (drawn === null) {
    return (
      <p role="alert" style={{ ...GF, margin: 0, padding: 16, fontSize: 13, color: T.danger, lineHeight: 1.5 }}>
        The code could not be drawn. Use Copy link instead.
      </p>
    );
  }
  return (
    <svg
      role="img" aria-label={QR_LABEL} data-testid="identity-handoff-qr"
      viewBox={`0 0 ${String(drawn.side)} ${String(drawn.side)}`} shapeRendering="crispEdges"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <rect width={drawn.side} height={drawn.side} fill="#FFFFFF" />
      <path d={drawn.path} fill={T.ink} />
    </svg>
  );
}

const STATUS_LINE: CSSProperties = {
  ...GF, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "14px 0 0",
  fontSize: "clamp(14px, 3.8vw, 15px)", fontWeight: 700, color: T.ink, lineHeight: 1.4, textAlign: "center",
};

const SMALL_PRINT: CSSProperties = {
  ...GF, margin: "6px 0 0", fontSize: "clamp(12px, 3.2vw, 13px)", color: T.inkSoft, lineHeight: 1.5,
  textAlign: "center",
};

// ── The panel ───────────────────────────────────────────────────────────────

export function IdentityHandoffPanel({
  client, headingRef, announce, onBack, onCompleted, onLocked, onGone,
}: IdentityHandoffPanelProps) {
  const [view, setView] = useState<View>({ kind: "creating" });
  const [now, setNow] = useState(() => Date.now());
  const [visible, setVisible] = useState(() => !document.hidden);
  const [copied, setCopied] = useState(false);
  const [shownLink, setShownLink] = useState(false);
  const linkId = useId();

  // Read through refs: the page hands these over afresh on every render, and
  // a new function must not restart the wait for the phone.
  const clientRef = useRef(client);
  clientRef.current = client;
  const handlers = useRef({ announce, onCompleted, onLocked, onGone });
  handlers.current = { announce, onCompleted, onLocked, onGone };

  const aliveRef = useRef(true);
  /** Bumped for every code asked for, so a late answer about an old one is dropped. */
  const runRef = useRef(0);
  const standingRef = useRef<Standing | null>(null);
  const warnedRef = useRef(false);
  /** Set when the tab comes back, so the first look is at once. */
  const promptRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const say = useCallback((message: string) => { handlers.current.announce(message); }, []);

  const refused = useCallback(async (error: unknown, run: number): Promise<boolean> => {
    const refusal = refusalOf(error);
    if (refusal === "other") return false;
    if (refusal === "locked") {
      handlers.current.onLocked();
      return true;
    }
    const message = await handlers.current.onGone();
    // Still here: the page did not move on, so say why there is no code.
    if (aliveRef.current && run === runRef.current) {
      setView({ kind: "error", message: message ?? NOT_HERE });
      say(message ?? NOT_HERE);
    }
    return true;
  }, [say]);

  const requestCode = useCallback(() => {
    runRef.current += 1;
    const run = runRef.current;
    standingRef.current = null;
    setCopied(false);
    setShownLink(false);
    setView({ kind: "creating" });
    void (async () => {
      try {
        const handoff = await clientRef.current.create();
        if (!aliveRef.current || run !== runRef.current) return;
        const received = Date.now();
        const left = identityHandoffTimeLeft(handoff.expiresAt, received) ?? IDENTITY_HANDOFF_LIFETIME_MS;
        standingRef.current = "waiting";
        // Said once, and only for a code that started with more than a minute.
        warnedRef.current = left <= 60_000;
        setNow(received);
        setView({ kind: "code", handoff, deadline: received + left, standing: "waiting", attemptsRemaining: 0 });
        say("Your code is ready. Scan it with your phone's camera.");
      } catch (error) {
        if (!aliveRef.current || run !== runRef.current) return;
        if (await refused(error, run)) return;
        // No such route: the check cannot be handed over here. The ceremony says more.
        if (error instanceof ApiError && error.status === 404) {
          const message = await handlers.current.onGone();
          if (!aliveRef.current || run !== runRef.current) return;
          setView({ kind: "error", message: message ?? NOT_HERE });
          say(message ?? NOT_HERE);
          return;
        }
        const message = describeHandoffError(error);
        setView({ kind: "error", message });
        say(message);
      }
    })();
  }, [refused, say]);

  // Asked for on arrival: the participant pressed "Use my phone instead" to get here.
  const askedRef = useRef(false);
  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;
    requestCode();
  }, [requestCode]);

  const stand = useCallback((standing: Standing, attemptsRemaining: number) => {
    setView(current => (current.kind === "code" ? { ...current, standing, attemptsRemaining } : current));
    if (standingRef.current === standing) return;
    standingRef.current = standing;
    if (standing === "opened") say("Phone connected. Continue there.");
    else if (standing === "waiting") say("Waiting for your phone.");
    else if (standing === "failed") {
      say(`The check on your phone was not completed. ${attemptsLeft(attemptsRemaining)}.`);
    } else if (standing === "expired") say("This code has expired.");
    else say("This code no longer works.");
  }, [say]);

  // ── The tab ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) promptRef.current = true;
      setVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  // ── Watching the phone ───────────────────────────────────────────────────

  const handoffId = view.kind === "code" ? view.handoff.handoffId : null;
  const standing = view.kind === "code" ? view.standing : null;
  // A failed try may be followed by another on the same phone, so it is still watched.
  const watching = standing === "waiting" || standing === "opened" || standing === "failed";
  const pollMs = client.pollMs ?? DEFAULT_POLL_MS;

  useEffect(() => {
    if (handoffId === null || !watching || !visible) return;
    const run = runRef.current;
    let cancelled = false;
    let timer = 0;
    const stale = () => cancelled || !aliveRef.current || run !== runRef.current;
    const look = async () => {
      try {
        const answer = await clientRef.current.status(handoffId);
        if (stale()) return;
        if (answer.status === "completed") {
          cancelled = true;
          handlers.current.onCompleted();
          return;
        }
        if (answer.status === "failed" && answer.attemptsRemaining <= 0) {
          cancelled = true;
          handlers.current.onLocked();
          return;
        }
        stand(answer.status, answer.attemptsRemaining);
      } catch (error) {
        if (stale()) return;
        if (await refused(error, run)) return;
        if (error instanceof ApiError && error.status === 404) stand("revoked", 0);
        else if (error instanceof ApiError && error.status === 401) {
          const message = describeHandoffError(error);
          setView({ kind: "error", message });
          say(message);
          return;
        }
        // Anything else is passing: the next look tries again.
      }
      if (!stale()) timer = window.setTimeout(() => { void look(); }, pollMs);
    };
    const first = promptRef.current ? 0 : pollMs;
    promptRef.current = false;
    timer = window.setTimeout(() => { void look(); }, first);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [handoffId, watching, visible, pollMs, stand, refused, say]);

  // ── The time left ────────────────────────────────────────────────────────

  const deadline = view.kind === "code" ? view.deadline : null;
  useEffect(() => {
    if (deadline === null || !watching) return;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      const left = deadline - at;
      if (left <= 0) {
        stand("expired", 0);
      } else if (left <= 60_000 && !warnedRef.current) {
        warnedRef.current = true;
        say("This code expires in 1 minute.");
      }
    };
    const timer = window.setInterval(tick, Math.min(1000, Math.max(50, deadline - Date.now())));
    return () => { window.clearInterval(timer); };
  }, [deadline, watching, stand, say]);

  // ── The link ─────────────────────────────────────────────────────────────

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      say("Link copied. Open it on your phone.");
    } catch {
      // No clipboard here: the link is shown so it can be copied by hand.
      setShownLink(true);
      say("The link could not be copied. It is shown below so you can copy it yourself.");
    }
  };

  const heading = (
    <h2
      ref={headingRef} tabIndex={-1} className="idc-heading"
      style={{ ...GF, margin: "0 0 8px", fontSize: "clamp(16px, 4.2vw, 18px)", fontWeight: 800, color: T.ink, lineHeight: 1.3 }}
    >
      Continue on your phone
    </h2>
  );

  const back = <ActionButton kind="secondary" icon={ArrowLeft} onClick={onBack} full>Back</ActionButton>;

  const shell = (children: ReactNode) => (
    <div data-testid="identity-handoff-panel" style={{ minWidth: 0 }}>
      {heading}
      {children}
    </div>
  );

  if (view.kind === "creating") {
    return shell(
      <>
        <div style={{ textAlign: "center", padding: "24px 0 4px" }}>
          <Loader2 size={28} aria-hidden className="idc-spin" style={{ color: T.azure }} />
          <p style={{ ...SMALL_PRINT, marginTop: 10 }}>Getting your code…</p>
        </div>
        <ActionRow>{back}</ActionRow>
      </>,
    );
  }

  if (view.kind === "error") {
    return shell(
      <>
        <Notice icon={AlertTriangle} tone="danger">{view.message}</Notice>
        <ActionRow>
          <ActionButton icon={RefreshCw} onClick={requestCode} full>Get a new code</ActionButton>
          {back}
        </ActionRow>
      </>,
    );
  }

  const { handoff } = view;
  const left = Math.max(0, view.deadline - now);

  if (view.standing === "expired" || view.standing === "revoked") {
    return shell(
      <>
        <Notice icon={Clock} tone="neutral">
          {view.standing === "expired"
            ? "This code has expired. Get a new code to continue on your phone."
            : "This code no longer works. Get a new code to continue on your phone."}
        </Notice>
        <ActionRow>
          <ActionButton icon={RefreshCw} onClick={requestCode} full>Get a new code</ActionButton>
          {back}
        </ActionRow>
      </>,
    );
  }

  if (view.standing === "failed") {
    return shell(
      <>
        <Notice icon={AlertTriangle} tone="warn">
          The check on your phone was not completed.
        </Notice>
        <p data-testid="identity-handoff-attempts-left"
          style={{ ...GF, margin: "0 0 8px", fontSize: "clamp(13px, 3.4vw, 14px)", fontWeight: 700, color: T.ink }}>
          {attemptsLeft(view.attemptsRemaining)}
        </p>
        <p style={{ ...SMALL_PRINT, textAlign: "left", margin: 0 }}>
          Try again on your phone, get a new code, or go back and continue on this computer.
        </p>
        <ActionRow>
          <ActionButton icon={RefreshCw} onClick={requestCode} full>Get a new code</ActionButton>
          {back}
        </ActionRow>
      </>,
    );
  }

  const connected = view.standing === "opened";
  return shell(
    <>
      {connected ? (
        <div style={{
          display: "grid", placeItems: "center", margin: "8px auto 0", width: 72, height: 72, borderRadius: 20,
          background: T.successWash, border: "1px solid #B7E3CA", color: T.success,
        }}>
          <Smartphone size={32} aria-hidden />
        </div>
      ) : (
        <>
          <p style={{ ...GF, margin: "0 0 14px", fontSize: "clamp(13px, 3.4vw, 14px)", color: T.inkSoft, lineHeight: 1.6 }}>
            Scan this code with your phone&rsquo;s camera. The identity check opens there, and this
            page continues by itself when you finish.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              width: "min(100%, 240px)", minWidth: 0, borderRadius: 12, overflow: "hidden", boxSizing: "border-box",
              background: "#FFFFFF", border: `1px solid ${T.borderStrong}`,
            }}>
              <HandoffQrCode url={handoff.url} />
            </div>
          </div>
        </>
      )}

      <p data-testid="identity-handoff-status" style={STATUS_LINE}>
        {connected
          ? <Check size={18} aria-hidden style={{ color: T.success, flexShrink: 0 }} />
          : <Loader2 size={16} aria-hidden className="idc-spin" style={{ color: T.azure, flexShrink: 0 }} />}
        <span style={{ minWidth: 0 }}>
          {connected ? "Phone connected. Continue there." : "Waiting for your phone"}
        </span>
      </p>
      <p data-testid="identity-handoff-countdown" style={SMALL_PRINT}>
        {connected ? "Time left on this code: " : "This code expires in "}
        <span style={{ fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{clock(left)}</span>
      </p>

      {shownLink && !connected && (
        <div style={{ marginTop: 14 }}>
          <label htmlFor={linkId} style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
            Link to open on your phone
          </label>
          <input
            id={linkId} readOnly value={handoff.url}
            onFocus={event => { event.target.select(); }}
            style={{
              ...GF, width: "100%", minHeight: TAP, padding: "0 12px", borderRadius: 10, boxSizing: "border-box",
              border: `1px solid ${T.borderStrong}`, background: T.surface, color: T.ink, fontSize: 16,
            }}
          />
          <p style={{ ...SMALL_PRINT, textAlign: "left" }}>
            Anyone with this link can continue your identity check. Do not share it.
          </p>
        </div>
      )}

      <ActionRow>
        {!connected && (
          <ActionButton kind="secondary" icon={copied ? Check : Copy} onClick={() => void copyLink(handoff.url)} full>
            {copied ? "Link copied" : "Copy link"}
          </ActionButton>
        )}
        <ActionButton kind="secondary" icon={RefreshCw} onClick={requestCode} full>Get a new code</ActionButton>
        {back}
      </ActionRow>
    </>,
  );
}
