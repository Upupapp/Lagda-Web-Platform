// The real verification flow, shared by the public pages (/verify,
// /verify/:verificationId) and the in-app pages (/app/verify, /app/verify/:id).
//
// LEGAL WORDING CONSTRAINTS (carried over from the demonstration pages):
//   - A found record is not a matching file.
//   - A matching file is not a determination of legal validity.
//   - Electronic signing is not notarization.
//   - Burgundy (#67023B) is reserved for eNotary and never used here.
//
// The access token from a successful code exchange lives in React state only.
// It is never written to localStorage, sessionStorage, a cookie or the URL.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Link } from "react-router";
import {
  lookupVerification, requestAccessCode, submitAccessCode, requestMemberAccess,
  fetchSignedDocument, checkVerificationFile, verificationPageUrl,
  type RealVerificationRecord, type VerificationGrant, type VerificationDetails,
  type WireTime, type FileCheckResult,
} from "../../services/real/public-verification.service";
import {
  documentSharingService, sharingErrorMessage, sharedWithMePath,
  UNLOCKING_RELATIONS, MAX_NOTE_LENGTH, type MyDocumentAccess,
} from "../../services/real/document-sharing.service";
import { ApiError } from "../../services/api-client";
import { VerificationQRCode } from "./VerificationQRCode";
import { OtpInput } from "./OtpInput";
import { withProcess } from "../../config/process-screens";

// ── Tokens ────────────────────────────────────────────────────────────────────
const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";
const NAVY = "#07111F";
const SLATE = "#334155";
const MUTED = "#64748B";
const BORDER = "rgba(0,0,0,0.10)";
const GREEN = "#15803D";
const RED = "#B91C1C";

const RESEND_COOLDOWN_SECONDS = 60;

const MSG_RATE_LIMITED = "Too many attempts. Please wait a few minutes before trying again.";
const MSG_NETWORK = "We could not reach LAGDA. Check your connection and try again.";
const MSG_EXPIRED = "Your access to this document has expired. Enter your email to request a new code.";
/** The same reply for every address, whether or not it has access. */
export const MSG_CODE_SENT = "If this email has access, we've sent a 6-digit code.";
const MSG_CODE_RESENT = "If this email has access, we've sent a new 6-digit code.";

function formatTime(value: WireTime | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return date.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
  } catch {
    return date.toISOString();
  }
}

function humanize(value: string): string {
  const spaced = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ── Shared primitives ─────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 12,
  padding: "clamp(16px, 4vw, 24px)", boxSizing: "border-box", minWidth: 0,
};

function buttonStyle(variant: "primary" | "secondary", disabled = false): React.CSSProperties {
  const primary = variant === "primary";
  return {
    ...GF, fontSize: 14, fontWeight: 600, minHeight: 44, padding: "10px 18px",
    borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    border: primary ? "none" : `1px solid ${BORDER}`,
    background: primary ? (disabled ? "rgba(0,120,212,0.5)" : AZURE) : "#FFFFFF",
    color: primary ? "#FFFFFF" : NAVY, textDecoration: "none",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    boxSizing: "border-box", maxWidth: "100%",
  };
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: MUTED, ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>
      {children}
    </p>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <dt style={{ color: MUTED, ...GF, fontSize: 13, flex: "0 0 auto" }}>{label}</dt>
      <dd style={{ margin: 0, color: NAVY, ...(mono ? GM : GF), fontSize: 13, textAlign: "right", overflowWrap: "anywhere", minWidth: 0, flex: "1 1 180px" }}>{value}</dd>
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "info" | "success"; children: React.ReactNode }) {
  const palette = {
    error: { bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.25)", color: RED },
    info: { bg: "rgba(0,120,212,0.06)", border: "rgba(0,120,212,0.22)", color: "#0B4F8A" },
    success: { bg: "rgba(34,197,94,0.07)", border: "rgba(34,197,94,0.28)", color: GREEN },
  }[tone];
  return (
    <div style={{ background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 8, padding: "12px 14px", color: palette.color, ...GF, fontSize: 13, lineHeight: 1.55 }}>
      {children}
    </div>
  );
}

// ── Rate limiting: say how long, count it down, and never say why ─────────
//
// A 429 (`verification_rate_limited`) carries `retryAfterSeconds`. The wait
// is about THIS browser's attempts; the wording never mentions the email
// address or whether it took part, so it reveals nothing about participation.

const SHORT_WAIT_SECONDS = 120;

/** "Please wait 42 seconds before requesting a new code." for a short wait;
 *  "Too many attempts. Try again in about 1 hour." for a long one. */
export function rateLimitText(seconds: number, action: "code" | "retry" = "code"): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s <= SHORT_WAIT_SECONDS) {
    return `Please wait ${s} ${s === 1 ? "second" : "seconds"} before ${action === "code" ? "requesting a new code" : "trying again"}.`;
  }
  if (s < 3600) {
    const minutes = Math.ceil(s / 60);
    return `Too many attempts. Try again in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
  }
  const hours = Math.max(1, Math.round(s / 3600));
  return `Too many attempts. Try again in about ${hours} ${hours === 1 ? "hour" : "hours"}.`;
}

/** A compact countdown for a button label: "42s", "5 min", "1 hr". */
function waitLabel(seconds: number): string {
  if (seconds <= SHORT_WAIT_SECONDS) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${Math.max(1, Math.round(seconds / 3600))} hr`;
}

export interface RetryCountdown {
  /** Whole seconds left; 0 when not waiting. */
  readonly remaining: number;
  /** What the wait was when it started — for the one-time announcement. */
  readonly started: number;
  readonly active: boolean;
  readonly start: (seconds: number) => void;
}

export function useRetryCountdown(): RetryCountdown {
  const [until, setUntil] = useState<number | null>(null);
  const [started, setStarted] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);

  const remaining = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
  useEffect(() => { if (until !== null && remaining === 0) setUntil(null); }, [until, remaining]);

  const start = useCallback((seconds: number) => {
    const whole = Math.max(1, Math.ceil(seconds));
    const at = Date.now();
    setNow(at);
    setStarted(whole);
    setUntil(at + whole * 1000);
  }, []);

  return { remaining, started, active: remaining > 0, start };
}

/** The visible text counts down; screen readers hear it once, when it starts,
 *  rather than every second. */
function RateLimitNotice({ wait, action = "code" }: { wait: RetryCountdown; action?: "code" | "retry" }) {
  if (!wait.active) return null;
  return (
    <div data-testid="rate-limit-notice">
      <Notice tone="error"><span aria-hidden>{rateLimitText(wait.remaining, action)}</span></Notice>
      <span role="status" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        {rateLimitText(wait.started, action)}
      </span>
    </div>
  );
}

function Caveat({ children }: { children: React.ReactNode }) {
  return <p style={{ color: MUTED, ...GF, fontSize: 12, lineHeight: 1.6, margin: "12px 0 0" }}>{children}</p>;
}

// ── Record summary (with QR) ──────────────────────────────────────────────────

export function RecordSummary({ record, action }: { record: RealVerificationRecord; action?: React.ReactNode }) {
  const pageUrl = verificationPageUrl(record.verificationId);
  return (
    <section aria-labelledby="vr-summary-heading" style={{ ...cardStyle, display: "flex", flexWrap: "wrap", gap: 24 }}>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <Eyebrow>Verification record</Eyebrow>
        <h2 id="vr-summary-heading" style={{ color: GREEN, ...GF, fontSize: 19, fontWeight: 800, margin: "0 0 6px" }}>
          Completed record found
        </h2>
        <p style={{ color: SLATE, ...GF, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
          LAGDA holds a completed transaction record for this Verification ID. A record on its own does not confirm that any particular copy of the file is the sealed document — use “Check a file” for that.
        </p>
        <dl style={{ margin: 0 }}>
          <Row label="Verification ID" value={record.verificationId} mono />
          <Row label="Completed" value={formatTime(record.completedAt)} />
          <Row label="Participants" value={String(record.participantCount)} />
          <Row label="Sealed fingerprint (SHA-256)" value={record.finalDocument.digest} mono />
          <Row label="Seal" value={record.seal.description} />
        </dl>
        {action && <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>{action}</div>}
      </div>
      <div style={{ flex: "0 0 auto", textAlign: "center", margin: "0 auto" }}>
        <Eyebrow>Scan to verify</Eyebrow>
        <VerificationQRCode url={pageUrl} size={136} alt={`QR code linking to ${pageUrl}`} />
        <p style={{ color: MUTED, ...GF, fontSize: 11, margin: "6px 0 0", maxWidth: 160 }}>Opens this record’s verification page.</p>
      </div>
    </section>
  );
}

// ── Search / ID entry ─────────────────────────────────────────────────────────

type LookupState =
  | { s: "idle" } | { s: "loading" } | { s: "found"; record: RealVerificationRecord }
  | { s: "not-found" } | { s: "rate-limited"; timed?: boolean } | { s: "error" };

export function VerificationSearch({ basePath, initialId = "" }: { basePath: string; initialId?: string }) {
  const [idInput, setIdInput] = useState(initialId);
  const [idError, setIdError] = useState<string | null>(null);
  const [state, setState] = useState<LookupState>({ s: "idle" });
  const resultRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const wait = useRetryCountdown();
  const startWait = wait.start;

  const run = useCallback(async (raw: string) => {
    const id = raw.trim();
    if (!id) { setIdError("Enter a Verification ID."); return; }
    setIdError(null);
    setState({ s: "loading" });
    const result = await withProcess("verify-lookup", "", () => lookupVerification(id));
    if (result.kind === "found") {
      setState({ s: "found", record: result.record });
      setTimeout(() => resultRef.current?.focus(), 0);
    } else if (result.kind === "rate-limited") {
      const timed = result.retryAfterSeconds !== undefined;
      if (result.retryAfterSeconds !== undefined) startWait(result.retryAfterSeconds);
      setState({ s: "rate-limited", timed });
    } else {
      setState({ s: result.kind });
    }
  }, [startWait]);
  const blocked = state.s === "loading" || wait.active;

  useEffect(() => {
    if (initialId) void run(initialId);
  }, [initialId, run]);

  const found = state.s === "found" ? state.record : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
      <form noValidate aria-label="Find a verification record"
        onSubmit={(e) => { e.preventDefault(); void run(idInput); }}
        style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <label htmlFor={inputId} style={{ color: SLATE, ...GF, fontSize: 13, fontWeight: 600 }}>Verification ID</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <input id={inputId} type="text" value={idInput} autoComplete="off" spellCheck={false}
            onChange={(e) => setIdInput(e.target.value)}
            placeholder="Printed on the completed document"
            aria-invalid={idError ? true : undefined}
            aria-describedby={idError ? `${inputId}-err` : undefined}
            style={{ flex: "1 1 220px", minWidth: 0, boxSizing: "border-box", minHeight: 46, padding: "10px 14px", border: `1px solid ${idError ? "rgba(220,38,38,0.45)" : "rgba(0,0,0,0.18)"}`, borderRadius: 8, color: NAVY, ...GM, fontSize: 14 }} />
          <button type="submit" disabled={blocked} style={{ ...buttonStyle("primary", blocked), flex: "0 0 auto" }}>
            {state.s === "loading" ? "Checking…" : wait.active ? `Check record (${waitLabel(wait.remaining)})` : "Check record"}
          </button>
        </div>
        {idError && <p id={`${inputId}-err`} role="alert" style={{ color: RED, ...GF, fontSize: 12, margin: 0 }}>{idError}</p>}
      </form>

      <div aria-live="polite" style={{ minWidth: 0 }}>
        {state.s === "not-found" && (
          <Notice tone="error">No completed LAGDA verification record was found for this ID. Check that it was entered exactly as printed.</Notice>
        )}
        {state.s === "rate-limited" && (state.timed === true
          ? <RateLimitNotice wait={wait} action="retry" />
          : <Notice tone="error">{MSG_RATE_LIMITED}</Notice>)}
        {state.s === "error" && <Notice tone="error">{MSG_NETWORK}</Notice>}
        {found && (
          <div ref={resultRef} tabIndex={-1} style={{ outline: "none" }}>
            <RecordSummary record={found} action={
              <Link to={`${basePath}/${encodeURIComponent(found.verificationId)}`} style={buttonStyle("primary")}>
                Open verification page
              </Link>
            } />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dedicated record page body ────────────────────────────────────────────────

type Stage =
  | { s: "member-checking" }
  | { s: "status"; access: MyDocumentAccess }
  | { s: "email" }
  | { s: "code"; email: string; expiresInSeconds: number }
  | { s: "unlocked"; grant: VerificationGrant };

export function VerificationRecordView({ verificationId, basePath, memberAccess = false }: {
  verificationId: string; basePath: string; memberAccess?: boolean;
}) {
  const [lookup, setLookup] = useState<LookupState>({ s: "loading" });
  const lookupWait = useRetryCountdown();
  const startLookupWait = lookupWait.start;

  useEffect(() => {
    let cancelled = false;
    setLookup({ s: "loading" });
    void lookupVerification(verificationId).then((result) => {
      if (cancelled) return;
      if (result.kind === "rate-limited" && result.retryAfterSeconds !== undefined) {
        startLookupWait(result.retryAfterSeconds);
        setLookup({ s: "rate-limited", timed: true });
        return;
      }
      setLookup(result.kind === "found" ? { s: "found", record: result.record } : { s: result.kind });
    });
    return () => { cancelled = true; };
  }, [verificationId, startLookupWait]);

  if (lookup.s === "loading" || lookup.s === "idle") {
    return <div role="status" aria-live="polite" style={{ ...cardStyle, color: MUTED, ...GF, fontSize: 14 }}>Looking up verification record…</div>;
  }
  if (lookup.s !== "found") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {lookup.s === "rate-limited" && lookup.timed === true ? (
          lookupWait.active
            ? <RateLimitNotice wait={lookupWait} action="retry" />
            : <Link to={`${basePath}/${encodeURIComponent(verificationId)}`} reloadDocument style={{ ...buttonStyle("primary"), alignSelf: "flex-start" }}>Try again</Link>
        ) : (
        <div role="alert">
          <Notice tone="error">
            {lookup.s === "not-found"
              ? "No completed LAGDA verification record was found for this ID. Check that it was entered exactly as printed."
              : lookup.s === "rate-limited" ? MSG_RATE_LIMITED : MSG_NETWORK}
          </Notice>
        </div>
        )}
        <Link to={basePath} style={{ ...buttonStyle("secondary"), alignSelf: "flex-start" }}>Search another Verification ID</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
      <RecordSummary record={lookup.record} />
      <AccessSection verificationId={verificationId} memberAccess={memberAccess} />
      <FileCheckPanel verificationId={verificationId} />
    </div>
  );
}

// ── Access: email → code → unlocked ───────────────────────────────────────────

function AccessSection({ verificationId, memberAccess }: { verificationId: string; memberAccess: boolean }) {
  const [stage, setStage] = useState<Stage>(memberAccess ? { s: "member-checking" } : { s: "email" });
  const [notice, setNotice] = useState<{ tone: "error" | "info" | "success"; text: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  // One wait for the whole access flow: changing the email address does not
  // reset a limit the server applies to this browser's attempts.
  const wait = useRetryCountdown();

  // Move focus to the heading of each new step (not on first paint).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [stage.s]);

  // Signed in: ask the backend how THIS account relates to the document, then
  // unlock without a code when it may (owner, admin, participant, accepted
  // share or approved request), or say honestly where things stand.
  useEffect(() => {
    if (!memberAccess) return;
    let cancelled = false;
    const unlockOr = (fallback: Stage) => requestMemberAccess(verificationId).then((result) => {
      if (cancelled) return;
      if (result.kind === "granted") setStage({ s: "unlocked", grant: result.grant });
      else setStage(fallback);
    });
    documentSharingService.myAccess(verificationId)
      .then((access) => {
        if (cancelled) return;
        if (UNLOCKING_RELATIONS.includes(access.relation)) { void unlockOr({ s: "email" }); return; }
        if (access.relation === "none" && !access.canRequestAccess) { setStage({ s: "email" }); return; }
        setStage({ s: "status", access });
      })
      // An older backend without /my-access: the member-access unlock alone.
      .catch(() => { if (!cancelled) void unlockOr({ s: "email" }); });
    return () => { cancelled = true; };
  }, [memberAccess, verificationId]);

  // The grant kept after "Close document view", so the view can be reopened
  // without a new emailed code until the grant itself expires. Closing still
  // takes the document off the screen at once.
  const [recent, setRecent] = useState<VerificationGrant | null>(null);
  const recentValid = recent !== null && new Date(recent.expiresAt).getTime() > Date.now();

  const expire = useCallback(() => {
    setRecent(null);
    setStage({ s: "email" });
    setNotice({ tone: "info", text: MSG_EXPIRED });
  }, []);

  // Grant expiry: drop the token and return to the email step.
  useEffect(() => {
    if (stage.s !== "unlocked") return;
    const expiresAt = new Date(stage.grant.expiresAt).getTime();
    if (Number.isNaN(expiresAt)) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { expire(); return; }
    const timer = setTimeout(expire, Math.min(remaining, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [stage, expire]);

  const heading = stage.s === "unlocked" ? "Signed document" : "View the signed document";

  return (
    <section aria-labelledby="vr-access-heading" style={cardStyle}>
      <Eyebrow>Document access</Eyebrow>
      <h2 id="vr-access-heading" ref={headingRef} tabIndex={-1} style={{ color: NAVY, ...GF, fontSize: 19, fontWeight: 800, margin: "0 0 6px", outline: "none" }}>
        {heading}
      </h2>
      <div aria-live="polite" style={{ margin: notice ? "12px 0" : 0 }}>
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      </div>

      {stage.s === "member-checking" && (
        <p role="status" style={{ color: MUTED, ...GF, fontSize: 14, margin: "8px 0 0" }}>Checking your access to this document…</p>
      )}
      {stage.s === "status" && (
        <AccessStatusPanel verificationId={verificationId} access={stage.access}
          onChange={(access) => setStage({ s: "status", access })}
          onUseCode={() => { setNotice(null); setStage({ s: "email" }); }} />
      )}
      {stage.s === "email" && recentValid && recent !== null && (
        <div data-testid="reopen-document" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ ...GF, fontSize: 13, color: SLATE }}>Your access is still valid.</span>
          <button type="button" onClick={() => { setNotice(null); setStage({ s: "unlocked", grant: recent }); }} style={buttonStyle("primary")}>
            Reopen the document
          </button>
        </div>
      )}
      {stage.s === "email" && (
        <EmailStep verificationId={verificationId} wait={wait}
          onSent={(email, expiresInSeconds) => {
            setNotice({ tone: "info", text: MSG_CODE_SENT });
            setStage({ s: "code", email, expiresInSeconds });
          }}
          onError={(text) => setNotice({ tone: "error", text })}
          clearNotice={() => setNotice(null)} />
      )}
      {stage.s === "code" && (
        <CodeStep verificationId={verificationId} email={stage.email} expiresInSeconds={stage.expiresInSeconds} wait={wait}
          onGranted={(grant) => { setNotice(null); setStage({ s: "unlocked", grant }); }}
          onNotice={setNotice}
          onChangeEmail={() => { setNotice(null); setStage({ s: "email" }); }} />
      )}
      {stage.s === "unlocked" && (
        <UnlockedView verificationId={verificationId} grant={stage.grant} onExpired={expire}
          onLock={() => { setRecent(stage.grant); setNotice({ tone: "info", text: "Document view closed. You can reopen it below until your access expires." }); setStage({ s: "email" }); }} />
      )}
      {!memberAccess && stage.s !== "unlocked" && <RequestAccessLinks verificationId={verificationId} />}
    </section>
  );
}

// ── Public page: the way in for someone who is not on the access list ────────

/** Sign-in / create-account links that come back to the in-app record page. */
export function RequestAccessLinks({ verificationId }: { verificationId: string }) {
  const returnTo = encodeURIComponent(`/app/verify/${encodeURIComponent(verificationId)}`);
  const link: React.CSSProperties = { color: "#005A9E", ...GF, fontSize: 14, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 };
  return (
    <div data-testid="request-access-links" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ color: SLATE, ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Don’t have access to this document?{" "}
        <Link to={`/sign-in?returnTo=${returnTo}`} style={link}>Sign in to request access</Link>
      </p>
      <p style={{ color: SLATE, ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        No account yet?{" "}
        <Link to={`/create-account?returnTo=${returnTo}`} style={link}>Create an account</Link>
      </p>
    </div>
  );
}

// ── In app: the signed-in caller's own relation, stated plainly ──────────────

function AccessStatusPanel({ verificationId, access, onChange, onUseCode }: {
  verificationId: string;
  access: MyDocumentAccess;
  onChange: (access: MyDocumentAccess) => void;
  onUseCode: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const noteId = useId();
  const tooLong = note.trim().length > MAX_NOTE_LENGTH;
  const linkStyle: React.CSSProperties = { color: "#005A9E", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 };

  async function request(e: React.FormEvent) {
    e.preventDefault();
    if (busy || tooLong) return;
    setBusy(true);
    setError(null);
    try {
      const created = await withProcess("verify-access-request", "", () => documentSharingService.requestAccess(verificationId, note));
      setSent(true);
      onChange({ ...access, relation: "request-pending", requestId: created.requestId, canRequestAccess: false });
    } catch (err) {
      const code = err instanceof ApiError ? err.body?.code : undefined;
      if (code === "document_access_already_pending") {
        onChange({ ...access, relation: "request-pending", canRequestAccess: false });
      } else {
        setError(sharingErrorMessage(err, "request"));
      }
    } finally {
      setBusy(false);
    }
  }

  let body: React.ReactNode;
  switch (access.relation) {
    case "shared-pending":
      body = (
        <Notice tone="info">
          This document was shared with you. Accept it in{" "}
          <Link to={sharedWithMePath("pending")} style={linkStyle}>Shared With Me</Link> to open it here.
        </Notice>
      );
      break;
    case "request-pending":
      body = (
        <Notice tone={sent ? "success" : "info"}>
          {sent ? "Request sent. " : ""}Your request is waiting for the owner’s approval. You will be notified when they decide.
        </Notice>
      );
      break;
    case "request-rejected":
    case "shared-rejected":
      body = (
        <Notice tone="info">
          Access to this document was not approved for this account.{" "}
          <Link to={sharedWithMePath("rejected")} style={linkStyle}>View Shared With Me</Link>
        </Notice>
      );
      break;
    default:
      body = access.canRequestAccess ? (
        <form noValidate onSubmit={(e) => { void request(e); }} aria-label="Request access to this document"
          style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: SLATE, ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Your account does not have access to this document. You can ask its owner for access; they decide whether to approve it.
          </p>
          <label htmlFor={noteId} style={{ color: SLATE, ...GF, fontSize: 13, fontWeight: 600 }}>
            Note to the owner <span style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea id={noteId} value={note} rows={3} onChange={(e) => setNote(e.target.value)}
            aria-invalid={tooLong ? true : undefined} aria-describedby={`${noteId}-count`}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: `1px solid ${tooLong ? "rgba(220,38,38,0.6)" : "rgba(0,0,0,0.25)"}`, color: NAVY, ...GF, fontSize: 14, resize: "vertical" }} />
          <p id={`${noteId}-count`} style={{ color: tooLong ? RED : MUTED, ...GF, fontSize: 12, margin: 0 }}>
            {note.trim().length} / {MAX_NOTE_LENGTH} characters{tooLong ? " — shorten the note to send it" : ""}
          </p>
          {error && <div role="alert"><Notice tone="error">{error}</Notice></div>}
          <div>
            <button type="submit" disabled={busy || tooLong} style={buttonStyle("primary", busy || tooLong)}>
              {busy ? "Sending request…" : "Request access"}
            </button>
          </div>
        </form>
      ) : (
        <Notice tone="info">Your account does not have access to this document.</Notice>
      );
  }

  return (
    <div data-testid="access-status" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
      <div aria-live="polite">{body}</div>
      <p style={{ color: MUTED, ...GF, fontSize: 13, margin: 0 }}>
        Took part with a different email address?{" "}
        <button type="button" onClick={onUseCode}
          style={{ ...GF, fontSize: 13, color: "#005A9E", fontWeight: 600, background: "none", border: "none", padding: "8px 2px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 36 }}>
          Use an emailed code
        </button>
      </p>
    </div>
  );
}

function EmailStep({ verificationId, wait, onSent, onError, clearNotice }: {
  verificationId: string;
  wait: RetryCountdown;
  onSent: (email: string, expiresInSeconds: number) => void;
  onError: (text: string) => void;
  clearNotice: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const blocked = busy || wait.active;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked) return;
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) { setFieldError("Enter a valid email address."); return; }
    setFieldError(null);
    clearNotice();
    setBusy(true);
    const result = await withProcess("verify-code-send", "", () => requestAccessCode(verificationId, trimmed));
    setBusy(false);
    if (result.kind === "sent") onSent(trimmed, result.expiresInSeconds);
    else if (result.kind === "rate-limited" && result.retryAfterSeconds !== undefined) wait.start(result.retryAfterSeconds);
    else onError(result.kind === "rate-limited" ? MSG_RATE_LIMITED : MSG_NETWORK);
  }

  return (
    <form noValidate onSubmit={(e) => { void submit(e); }} aria-label="Request an access code" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ color: SLATE, ...GF, fontSize: 14, lineHeight: 1.6, margin: "0 0 4px" }}>
        If you took part in this transaction or it was shared with you, enter your email address. We will email a 6-digit code to that address if it has access.
      </p>
      <label htmlFor={id} style={{ color: SLATE, ...GF, fontSize: 13, fontWeight: 600 }}>Email address</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <input id={id} type="email" inputMode="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${id}-err` : undefined}
          style={{ flex: "1 1 220px", minWidth: 0, boxSizing: "border-box", minHeight: 46, padding: "10px 14px", border: `1px solid ${fieldError ? "rgba(220,38,38,0.45)" : "rgba(0,0,0,0.18)"}`, borderRadius: 8, color: NAVY, ...GF, fontSize: 14 }} />
        <button type="submit" disabled={blocked} style={{ ...buttonStyle("primary", blocked), flex: "0 0 auto" }}>
          {busy ? "Sending…" : wait.active ? `Send code (${waitLabel(wait.remaining)})` : "Send code"}
        </button>
      </div>
      {fieldError && <p id={`${id}-err`} role="alert" style={{ color: RED, ...GF, fontSize: 12, margin: 0 }}>{fieldError}</p>}
      <RateLimitNotice wait={wait} />
    </form>
  );
}

function CodeStep({ verificationId, email, expiresInSeconds, wait, onGranted, onNotice, onChangeEmail }: {
  verificationId: string; email: string; expiresInSeconds: number; wait: RetryCountdown;
  onGranted: (grant: VerificationGrant) => void;
  onNotice: (n: { tone: "error" | "info" | "success"; text: string } | null) => void;
  onChangeEmail: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const hintId = useId();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setInvalid(true); onNotice({ tone: "error", text: "Enter all 6 digits of the code." }); return; }
    setBusy(true);
    const result = await withProcess("verify-code-check", "", () => submitAccessCode(verificationId, email, code));
    setBusy(false);
    if (result.kind === "granted") { onGranted(result.grant); return; }
    if (result.kind === "denied") {
      setInvalid(true);
      setCode("");
      onNotice({ tone: "error", text: "That code is not valid or has expired. Check the code, or request a new one." });
    } else if (result.kind === "rate-limited" && result.retryAfterSeconds !== undefined) {
      onNotice(null);
      wait.start(result.retryAfterSeconds);
    } else {
      onNotice({ tone: "error", text: result.kind === "rate-limited" ? MSG_RATE_LIMITED : MSG_NETWORK });
    }
  }

  async function resend() {
    if (wait.active) return;
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const result = await requestAccessCode(verificationId, email);
    if (result.kind === "sent") onNotice({ tone: "info", text: MSG_CODE_RESENT });
    else if (result.kind === "rate-limited" && result.retryAfterSeconds !== undefined) {
      onNotice(null);
      wait.start(result.retryAfterSeconds);
    } else onNotice({ tone: "error", text: result.kind === "rate-limited" ? MSG_RATE_LIMITED : MSG_NETWORK });
  }

  // The server's wait wins over the local cooldown whenever it is longer.
  const resendWait = Math.max(cooldown, wait.remaining);
  const verifyBlocked = busy || code.length !== 6 || wait.active;

  return (
    <form noValidate onSubmit={(e) => { void submit(e); }} aria-label="Enter your access code" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p id={hintId} style={{ color: SLATE, ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Enter the 6-digit code sent to <strong style={{ overflowWrap: "anywhere" }}>{email}</strong>. The code expires in {minutes} minutes.
      </p>
      <OtpInput label="6-digit access code" describedBy={hintId} value={code} autoFocus
        onChange={(v) => { setCode(v); setInvalid(false); }} disabled={busy} invalid={invalid} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={verifyBlocked} style={buttonStyle("primary", verifyBlocked)}>
          {busy ? "Verifying…" : "Verify code"}
        </button>
        <button type="button" onClick={() => { void resend(); }} disabled={resendWait > 0}
          style={buttonStyle("secondary", resendWait > 0)} aria-describedby={cooldown > 0 && !wait.active ? `${hintId}-cd` : undefined}>
          {resendWait > 0 ? `Resend code (${waitLabel(resendWait)})` : "Resend code"}
        </button>
        <button type="button" onClick={onChangeEmail}
          style={{ ...GF, fontSize: 13, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: "10px 4px", minHeight: 44 }}>
          Use a different email
        </button>
      </div>
      {cooldown > 0 && !wait.active && <span id={`${hintId}-cd`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>You can request another code in {cooldown} seconds.</span>}
      <RateLimitNotice wait={wait} />
    </form>
  );
}

// ── Unlocked view ─────────────────────────────────────────────────────────────

function fileNameFor(title: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "signed-document";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

function UnlockedView({ verificationId, grant, onExpired, onLock }: {
  verificationId: string; grant: VerificationGrant; onExpired: () => void; onLock: () => void;
}) {
  const [docState, setDocState] = useState<"loading" | "ready" | "error">("loading");
  const [docError, setDocError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const details: VerificationDetails = grant.details;
  const title = details.documentTitle || grant.documentTitle;

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setDocState("loading");
    void fetchSignedDocument(verificationId, grant.accessToken).then((result) => {
      if (cancelled) return;
      if (result.kind === "ok") {
        const blob = result.blob.type ? result.blob : new Blob([result.blob], { type: result.mediaType });
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
        setDocState("ready");
      } else if (result.kind === "expired") {
        onExpired();
      } else {
        setDocState("error");
        setDocError(result.kind === "rate-limited" ? MSG_RATE_LIMITED : "The signed document could not be loaded. Try again shortly.");
      }
    });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [verificationId, grant.accessToken, onExpired]);

  function download() {
    if (!objectUrl) return;
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileNameFor(title);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  const participants = [...details.participants].sort((a, b) => a.routingOrder - b.routingOrder);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 8, minWidth: 0 }}>
      <div role="status">
        <Notice tone="success">Access granted to <strong>{title}</strong> as {humanize(grant.recipientType).toLowerCase()}.</Notice>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="button" onClick={download} disabled={docState !== "ready"} style={buttonStyle("primary", docState !== "ready")}>
          Download signed document
        </button>
        {objectUrl && (
          <a href={objectUrl} target="_blank" rel="noopener noreferrer" style={buttonStyle("secondary")}>Open in new tab</a>
        )}
        <button type="button" onClick={onLock} style={buttonStyle("secondary")}>Close document view</button>
      </div>

      <div>
        <h3 style={{ color: NAVY, ...GF, fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Document</h3>
        {docState === "loading" && <p role="status" style={{ color: MUTED, ...GF, fontSize: 13 }}>Loading the signed document…</p>}
        {docState === "error" && <div role="alert"><Notice tone="error">{docError}</Notice></div>}
        {docState === "ready" && objectUrl && (
          <iframe src={objectUrl} title={`Signed document: ${title}`}
            style={{ width: "100%", height: "min(75vh, 820px)", minHeight: 360, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#F1F5F9", display: "block", boxSizing: "border-box" }} />
        )}
      </div>

      <div>
        <h3 style={{ color: NAVY, ...GF, fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Participants</h3>
        <ol aria-label="Participants in routing order" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}>
          {participants.map((p, i) => (
            <li key={`${p.routingOrder}-${p.maskedEmail}-${i}`} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", minWidth: 0, background: "#FBFCFD" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" }}>
                <span style={{ color: NAVY, ...GF, fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{p.name}</span>
                <span style={{ color: MUTED, ...GM, fontSize: 11 }}>Order {p.routingOrder}</span>
              </div>
              <dl style={{ margin: "6px 0 0" }}>
                <Row label="Email" value={p.maskedEmail} mono />
                <Row label="Role" value={humanize(p.recipientType)} />
                <Row label="Status" value={humanize(p.status)} />
                <Row label="Date" value={formatTime(p.actedAt)} />
              </dl>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 style={{ color: NAVY, ...GF, fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Document details</h3>
        <dl style={{ margin: 0 }}>
          <Row label="Title" value={title} />
          <Row label="Completed" value={formatTime(details.completedAt)} />
          <Row label="Sealed fingerprint (SHA-256)" value={details.sealedDigest} mono />
        </dl>
        {details.events.length > 0 && (
          <>
            <h4 style={{ color: SLATE, ...GF, fontSize: 13, fontWeight: 700, margin: "16px 0 8px" }}>Key audit events</h4>
            <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {details.events.map((ev, i) => (
                <li key={`${ev.type}-${i}`} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "2px 16px", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <span style={{ color: NAVY, ...GF, fontSize: 13 }}>{ev.label}</span>
                  <span style={{ color: MUTED, ...GF, fontSize: 12 }}>{formatTime(ev.at)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        <Caveat>
          These details are LAGDA’s record of the transaction. Electronic signing through LAGDA is not notarization, and this record is not a determination of the document’s legal validity or enforceability.
        </Caveat>
      </div>
    </div>
  );
}

// ── Check a file ──────────────────────────────────────────────────────────────

function looksLikePdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileCheckPanel({ verificationId }: { verificationId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FileCheckResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function choose(next: File | undefined | null) {
    setResult(null);
    if (!next) return;
    if (!looksLikePdf(next)) { setFile(null); setError("Choose a PDF file."); return; }
    setError(null);
    setFile(next);
  }

  async function check() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    const r = await withProcess("verify-integrity", "", () => checkVerificationFile(verificationId, file));
    setBusy(false);
    setResult(r);
  }

  return (
    <section aria-labelledby="vr-file-heading" style={cardStyle}>
      <Eyebrow>Integrity check</Eyebrow>
      <h2 id="vr-file-heading" style={{ color: NAVY, ...GF, fontSize: 19, fontWeight: 800, margin: "0 0 6px" }}>Check a file</h2>
      <p style={{ color: SLATE, ...GF, fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>
        Compare a copy of the PDF you hold against the document LAGDA sealed at completion. Nothing is sent until you select “Check file”, and the file is not stored.
      </p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}
        style={{ border: `1.5px dashed ${dragging ? AZURE : "rgba(0,0,0,0.22)"}`, background: dragging ? "rgba(0,120,212,0.05)" : "#FBFCFD", borderRadius: 10, padding: "20px 16px", textAlign: "center", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <label htmlFor={inputId} style={{ color: SLATE, ...GF, fontSize: 13 }}>Drop a PDF here, or</label>
        <input ref={inputRef} id={inputId} type="file" accept="application/pdf,.pdf" aria-label="PDF file to check"
          onChange={(e) => choose(e.target.files?.[0])}
          style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, opacity: 0, overflow: "hidden" }} />
        <button type="button" onClick={() => inputRef.current?.click()} style={buttonStyle("secondary")}>Choose PDF</button>
        {file && <p style={{ color: NAVY, ...GF, fontSize: 13, margin: 0, overflowWrap: "anywhere" }}>Selected: <strong>{file.name}</strong> ({formatSize(file.size)})</p>}
      </div>
      {error && <p role="alert" style={{ color: RED, ...GF, fontSize: 12, margin: "8px 0 0" }}>{error}</p>}
      {/* At the panel's right edge on every screen, like a form's submit. */}
      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => { void check(); }} disabled={!file || busy} data-testid="check-file"
          style={{ ...buttonStyle("primary", !file || busy), display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
          <Fingerprint size={17} aria-hidden />
          {busy ? "Checking…" : "Check file"}
        </button>
      </div>
      <div aria-live="polite" style={{ marginTop: result ? 14 : 0 }}>
        {result?.kind === "result" && result.matches && (
          <Notice tone="success">
            <strong style={{ display: "block", fontSize: 15, marginBottom: 4 }}>This is the exact sealed document.</strong>
            The file’s SHA-256 fingerprint is identical to the fingerprint LAGDA recorded when the transaction completed.
          </Notice>
        )}
        {result?.kind === "result" && !result.matches && (
          <Notice tone="error">
            <strong style={{ display: "block", fontSize: 15, marginBottom: 4 }}>This file does not match the sealed document — it may have been altered.</strong>
            Any change produces a different fingerprint, including re-saving, printing to PDF or adding annotations. Obtain the signed document from a participant or from this page.
          </Notice>
        )}
        {result?.kind === "result" && (
          <dl style={{ margin: "10px 0 0" }}>
            <Row label="Sealed fingerprint" value={result.authoritativeDigest} mono />
            <Row label="Your file’s fingerprint" value={result.uploadedDigest} mono />
          </dl>
        )}
        {result?.kind === "too-large" && <Notice tone="error">That file is larger than verification accepts.</Notice>}
        {result?.kind === "invalid" && <Notice tone="error">The file could not be read. Choose a different PDF.</Notice>}
        {result?.kind === "not-found" && <Notice tone="error">No completed LAGDA verification record was found for this ID.</Notice>}
        {result?.kind === "rate-limited" && <Notice tone="error">{MSG_RATE_LIMITED}</Notice>}
        {result?.kind === "error" && <Notice tone="error">{MSG_NETWORK}</Notice>}
      </div>
      <Caveat>
        A matching file confirms only that its bytes are identical to the sealed document. It is not a determination of legal validity, and electronic signing is not notarization.
      </Caveat>
    </section>
  );
}
