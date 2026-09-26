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
import { Link } from "react-router";
import {
  lookupVerification, requestAccessCode, submitAccessCode, requestMemberAccess,
  fetchSignedDocument, checkVerificationFile, verificationPageUrl,
  type RealVerificationRecord, type VerificationGrant, type VerificationDetails,
  type WireTime, type FileCheckResult,
} from "../../services/real/public-verification.service";
import { VerificationQRCode } from "./VerificationQRCode";
import { OtpInput } from "./OtpInput";

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
  | { s: "not-found" } | { s: "rate-limited" } | { s: "error" };

export function VerificationSearch({ basePath, initialId = "" }: { basePath: string; initialId?: string }) {
  const [idInput, setIdInput] = useState(initialId);
  const [idError, setIdError] = useState<string | null>(null);
  const [state, setState] = useState<LookupState>({ s: "idle" });
  const resultRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const run = useCallback(async (raw: string) => {
    const id = raw.trim();
    if (!id) { setIdError("Enter a Verification ID."); return; }
    setIdError(null);
    setState({ s: "loading" });
    const result = await lookupVerification(id);
    if (result.kind === "found") {
      setState({ s: "found", record: result.record });
      setTimeout(() => resultRef.current?.focus(), 0);
    } else {
      setState({ s: result.kind });
    }
  }, []);

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
          <button type="submit" disabled={state.s === "loading"} style={{ ...buttonStyle("primary", state.s === "loading"), flex: "0 0 auto" }}>
            {state.s === "loading" ? "Checking…" : "Check record"}
          </button>
        </div>
        {idError && <p id={`${inputId}-err`} role="alert" style={{ color: RED, ...GF, fontSize: 12, margin: 0 }}>{idError}</p>}
      </form>

      <div aria-live="polite" style={{ minWidth: 0 }}>
        {state.s === "not-found" && (
          <Notice tone="error">No completed LAGDA verification record was found for this ID. Check that it was entered exactly as printed.</Notice>
        )}
        {state.s === "rate-limited" && <Notice tone="error">{MSG_RATE_LIMITED}</Notice>}
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
  | { s: "email" }
  | { s: "code"; email: string; expiresInSeconds: number }
  | { s: "unlocked"; grant: VerificationGrant };

export function VerificationRecordView({ verificationId, basePath, memberAccess = false }: {
  verificationId: string; basePath: string; memberAccess?: boolean;
}) {
  const [lookup, setLookup] = useState<LookupState>({ s: "loading" });

  useEffect(() => {
    let cancelled = false;
    setLookup({ s: "loading" });
    void lookupVerification(verificationId).then((result) => {
      if (cancelled) return;
      setLookup(result.kind === "found" ? { s: "found", record: result.record } : { s: result.kind });
    });
    return () => { cancelled = true; };
  }, [verificationId]);

  if (lookup.s === "loading" || lookup.s === "idle") {
    return <div role="status" aria-live="polite" style={{ ...cardStyle, color: MUTED, ...GF, fontSize: 14 }}>Looking up verification record…</div>;
  }
  if (lookup.s !== "found") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div role="alert">
          <Notice tone="error">
            {lookup.s === "not-found"
              ? "No completed LAGDA verification record was found for this ID. Check that it was entered exactly as printed."
              : lookup.s === "rate-limited" ? MSG_RATE_LIMITED : MSG_NETWORK}
          </Notice>
        </div>
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

  // Move focus to the heading of each new step (not on first paint).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [stage.s]);

  useEffect(() => {
    if (!memberAccess) return;
    let cancelled = false;
    void requestMemberAccess(verificationId).then((result) => {
      if (cancelled) return;
      if (result.kind === "granted") setStage({ s: "unlocked", grant: result.grant });
      else setStage({ s: "email" });
    });
    return () => { cancelled = true; };
  }, [memberAccess, verificationId]);

  const expire = useCallback(() => {
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
      <Eyebrow>Participant access</Eyebrow>
      <h2 id="vr-access-heading" ref={headingRef} tabIndex={-1} style={{ color: NAVY, ...GF, fontSize: 19, fontWeight: 800, margin: "0 0 6px", outline: "none" }}>
        {heading}
      </h2>
      <div aria-live="polite" style={{ margin: notice ? "12px 0" : 0 }}>
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      </div>

      {stage.s === "member-checking" && (
        <p role="status" style={{ color: MUTED, ...GF, fontSize: 14, margin: "8px 0 0" }}>Checking whether your account is a participant…</p>
      )}
      {stage.s === "email" && (
        <EmailStep verificationId={verificationId}
          onSent={(email, expiresInSeconds) => {
            setNotice({ tone: "info", text: "If that email is a participant, we’ve sent a code." });
            setStage({ s: "code", email, expiresInSeconds });
          }}
          onError={(text) => setNotice({ tone: "error", text })}
          clearNotice={() => setNotice(null)} />
      )}
      {stage.s === "code" && (
        <CodeStep verificationId={verificationId} email={stage.email} expiresInSeconds={stage.expiresInSeconds}
          onGranted={(grant) => { setNotice(null); setStage({ s: "unlocked", grant }); }}
          onNotice={setNotice}
          onChangeEmail={() => { setNotice(null); setStage({ s: "email" }); }} />
      )}
      {stage.s === "unlocked" && (
        <UnlockedView verificationId={verificationId} grant={stage.grant} onExpired={expire}
          onLock={() => { setNotice({ tone: "info", text: "Document view closed." }); setStage({ s: "email" }); }} />
      )}
    </section>
  );
}

function EmailStep({ verificationId, onSent, onError, clearNotice }: {
  verificationId: string;
  onSent: (email: string, expiresInSeconds: number) => void;
  onError: (text: string) => void;
  clearNotice: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) { setFieldError("Enter a valid email address."); return; }
    setFieldError(null);
    clearNotice();
    setBusy(true);
    const result = await requestAccessCode(verificationId, trimmed);
    setBusy(false);
    if (result.kind === "sent") onSent(trimmed, result.expiresInSeconds);
    else onError(result.kind === "rate-limited" ? MSG_RATE_LIMITED : MSG_NETWORK);
  }

  return (
    <form noValidate onSubmit={(e) => { void submit(e); }} aria-label="Request an access code" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ color: SLATE, ...GF, fontSize: 14, lineHeight: 1.6, margin: "0 0 4px" }}>
        If you took part in this transaction, enter the email address it was sent to. We will email a 6-digit code to that address if it belongs to a participant.
      </p>
      <label htmlFor={id} style={{ color: SLATE, ...GF, fontSize: 13, fontWeight: 600 }}>Participant email</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <input id={id} type="email" inputMode="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${id}-err` : undefined}
          style={{ flex: "1 1 220px", minWidth: 0, boxSizing: "border-box", minHeight: 46, padding: "10px 14px", border: `1px solid ${fieldError ? "rgba(220,38,38,0.45)" : "rgba(0,0,0,0.18)"}`, borderRadius: 8, color: NAVY, ...GF, fontSize: 14 }} />
        <button type="submit" disabled={busy} style={{ ...buttonStyle("primary", busy), flex: "0 0 auto" }}>
          {busy ? "Sending…" : "Send code"}
        </button>
      </div>
      {fieldError && <p id={`${id}-err`} role="alert" style={{ color: RED, ...GF, fontSize: 12, margin: 0 }}>{fieldError}</p>}
    </form>
  );
}

function CodeStep({ verificationId, email, expiresInSeconds, onGranted, onNotice, onChangeEmail }: {
  verificationId: string; email: string; expiresInSeconds: number;
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
    const result = await submitAccessCode(verificationId, email, code);
    setBusy(false);
    if (result.kind === "granted") { onGranted(result.grant); return; }
    if (result.kind === "denied") {
      setInvalid(true);
      setCode("");
      onNotice({ tone: "error", text: "That code is not valid or has expired. Check the code, or request a new one." });
    } else {
      onNotice({ tone: "error", text: result.kind === "rate-limited" ? MSG_RATE_LIMITED : MSG_NETWORK });
    }
  }

  async function resend() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const result = await requestAccessCode(verificationId, email);
    if (result.kind === "sent") onNotice({ tone: "info", text: "If that email is a participant, we’ve sent a new code." });
    else onNotice({ tone: "error", text: result.kind === "rate-limited" ? MSG_RATE_LIMITED : MSG_NETWORK });
  }

  return (
    <form noValidate onSubmit={(e) => { void submit(e); }} aria-label="Enter your access code" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p id={hintId} style={{ color: SLATE, ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Enter the 6-digit code sent to <strong style={{ overflowWrap: "anywhere" }}>{email}</strong>. The code expires in {minutes} minutes.
      </p>
      <OtpInput label="6-digit access code" describedBy={hintId} value={code} autoFocus
        onChange={(v) => { setCode(v); setInvalid(false); }} disabled={busy} invalid={invalid} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={busy || code.length !== 6} style={buttonStyle("primary", busy || code.length !== 6)}>
          {busy ? "Verifying…" : "Verify code"}
        </button>
        <button type="button" onClick={() => { void resend(); }} disabled={cooldown > 0}
          style={buttonStyle("secondary", cooldown > 0)} aria-describedby={cooldown > 0 ? `${hintId}-cd` : undefined}>
          {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
        </button>
        <button type="button" onClick={onChangeEmail}
          style={{ ...GF, fontSize: 13, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: "10px 4px", minHeight: 44 }}>
          Use a different email
        </button>
      </div>
      {cooldown > 0 && <span id={`${hintId}-cd`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>You can request another code in {cooldown} seconds.</span>}
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
    const r = await checkVerificationFile(verificationId, file);
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
      <div style={{ marginTop: 14 }}>
        <button type="button" onClick={() => { void check(); }} disabled={!file || busy} style={buttonStyle("primary", !file || busy)}>
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
