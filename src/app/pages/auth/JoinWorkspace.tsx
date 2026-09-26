// /join/:token — ask to join a workspace with a join link (078).
//
// Public route: the link can be opened signed out. It shows which workspace
// the link is for and who sent it (POST /workspace-join/preview — a read that
// uses nothing). Sending the request needs an account: "Join Now" while
// signed out goes to sign-in and comes back here afterwards (`?returnTo=`).
//
// Nobody joins from this page. Sending creates a PENDING request that the
// owner or an administrator approves or declines. The link is single-use:
// once someone sends a request with it, later visitors are told that someone
// already used it.

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import { LagdaLoader } from "../../components/brand/LagdaLoader";
import { useMinimumSplash } from "../../hooks/useMinimumSplash";
import {
  previewJoinLink, submitJoinRequest, isPlausibleJoinToken,
  JOIN_MESSAGES, JOIN_REASON_MAX, JOIN_FULL_NAME_MAX,
} from "../../services/real/workspace-join.service";
import lagdaHeaderLogo from "../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor_Header.svg";

export const JOIN_SPLASH_MIN_MS = 1500;
const JOIN_SPLASH_EXIT_MS = 240;

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const DANGER = "#B42318";

type Phase =
  | { kind: "loading" }
  | { kind: "form"; workspaceName: string; invitedByName: string | null }
  | { kind: "sent"; workspaceName: string }
  | { kind: "cancelled"; workspaceName: string; invitedByName: string | null }
  | { kind: "used" }
  | { kind: "invalid" }
  | { kind: "already-member"; workspaceName: string | null }
  | { kind: "pending"; workspaceName: string | null }
  | { kind: "email-unverified"; workspaceName: string | null }
  | { kind: "error" };

// What was typed survives the trip through sign-in (an in-app navigation,
// so the module stays loaded). Memory only — never written to storage —
// keyed by the link, and cleared once the request is sent.
const drafts = new Map<string, { fullName: string; reason: string }>();

function readDraft(token: string): { fullName: string; reason: string } | null {
  return drafts.get(token) ?? null;
}
function writeDraft(token: string, draft: { fullName: string; reason: string }): void {
  drafts.set(token, draft);
}
function clearDraft(token: string): void {
  drafts.delete(token);
}

const inputStyle = (invalid: boolean, readOnly = false): CSSProperties => ({
  ...GF, fontSize: 15, width: "100%", boxSizing: "border-box", padding: "11px 14px", minHeight: 46,
  border: `1.5px solid ${invalid ? DANGER : "#D1D9E0"}`, borderRadius: 10, outline: "none",
  background: readOnly ? "#F5F7FA" : "#FFFFFF", color: readOnly ? SLATE : NAVY,
});
const labelStyle: CSSProperties = { ...GF, fontSize: 14, fontWeight: 600, color: NAVY, display: "block", marginBottom: 6 };
const hintStyle: CSSProperties = { ...GF, fontSize: 12, color: SLATE, margin: "6px 0 0", lineHeight: 1.5 };
const primaryButton = (disabled = false): CSSProperties => ({
  ...GF, fontSize: 15, fontWeight: 700, color: "#FFFFFF", background: disabled ? "rgba(0,120,212,0.55)" : AZURE,
  border: "none", borderRadius: 10, padding: "12px 20px", minHeight: 48, cursor: disabled ? "not-allowed" : "pointer",
  width: "100%",
});
const secondaryButton: CSSProperties = {
  ...GF, fontSize: 15, fontWeight: 600, color: NAVY, background: "#FFFFFF", border: "1.5px solid #D1D9E0",
  borderRadius: 10, padding: "12px 20px", minHeight: 48, cursor: "pointer", width: "100%",
};

export function JoinWorkspace() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const platform = usePlatform();

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const saved = useRef(token ? readDraft(token) : null);
  const [fullName, setFullName] = useState(saved.current?.fullName ?? "");
  const [reason, setReason] = useState(saved.current?.reason ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameTouched = useRef(saved.current !== null && saved.current.fullName !== "");

  const nameId = useId();
  const emailId = useId();
  const reasonId = useId();

  const sessionKnown = platform.sessionStatus !== "initializing";
  const signedIn = platform.sessionStatus === "authenticated" && platform.user !== null;
  const splash = useMinimumSplash(phase.kind !== "loading" && sessionKnown, JOIN_SPLASH_MIN_MS, JOIN_SPLASH_EXIT_MS);

  useEffect(() => {
    document.title = "Join a Workspace — LAGDA";
  }, []);

  // Preview: which workspace is this link for?
  useEffect(() => {
    if (!isPlausibleJoinToken(token)) { setPhase({ kind: "invalid" }); return; }
    const controller = new AbortController();
    void previewJoinLink(token, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.kind === "ok") setPhase({ kind: "form", workspaceName: result.workspaceName, invitedByName: result.invitedByName });
      else setPhase({ kind: result.kind });
    });
    return () => { controller.abort(); };
  }, [token]);

  // Prefill the name from the signed-in account, unless the person typed one.
  useEffect(() => {
    if (!signedIn || nameTouched.current) return;
    const suggestion = platform.user?.fullName?.trim() || platform.user?.displayName?.trim() || "";
    if (suggestion) setFullName(suggestion);
  }, [signedIn, platform.user]);

  function goBack() {
    // `key === "default"` is the first app entry in this tab. Anything before
    // it (the page that linked here) is still "the previous page"; with no
    // history at all, fall back to the home page.
    if (location.key !== "default") void navigate(-1);
    else if (window.history.length > 1) window.history.back();
    else void navigate("/");
  }

  const goToDashboard = () => { void navigate("/app/dashboard"); };
  const returnPath = token ? `/join/${token}` : "/";
  const signInUrl = `/sign-in?returnTo=${encodeURIComponent(returnPath)}`;
  const createAccountUrl = `/create-account?returnTo=${encodeURIComponent(returnPath)}`;

  async function joinNow() {
    if (phase.kind !== "form" || !token || submitting) return;
    const name = fullName.trim();
    if (name.length < 2) {
      setNameError(name === "" ? "Enter your full name." : "Enter your full name as it should appear to the workspace.");
      document.getElementById(nameId)?.focus();
      return;
    }
    if (name.length > JOIN_FULL_NAME_MAX) { setNameError(`Keep your name under ${String(JOIN_FULL_NAME_MAX)} characters.`); return; }
    if (reason.length > JOIN_REASON_MAX) return;

    if (!signedIn) {
      writeDraft(token, { fullName: name, reason });
      void navigate(signInUrl);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const trimmedReason = reason.trim();
    const result = await submitJoinRequest(token, { fullName: name, reason: trimmedReason === "" ? null : trimmedReason });
    setSubmitting(false);
    const workspaceName = phase.workspaceName;
    switch (result.kind) {
      case "sent":
        clearDraft(token);
        setPhase({ kind: "sent", workspaceName: result.workspaceName || workspaceName });
        return;
      case "used": setPhase({ kind: "used" }); return;
      case "invalid": setPhase({ kind: "invalid" }); return;
      case "already-member": clearDraft(token); setPhase({ kind: "already-member", workspaceName }); return;
      case "pending": clearDraft(token); setPhase({ kind: "pending", workspaceName }); return;
      default:
        if (result.reason === "email-unverified") { setPhase({ kind: "email-unverified", workspaceName }); return; }
        if (result.reason === "signed-out") { writeDraft(token, { fullName: name, reason }); void navigate(signInUrl); return; }
        setSubmitError(result.message);
    }
  }

  if (splash !== "gone") {
    return (
      <LagdaLoader
        mode="fullscreen"
        theme="light"
        message="Opening your join link securely"
        ariaLabel="Opening your join link"
        showWordmark
        spinner
        isExiting={splash === "exiting"}
      />
    );
  }

  let body: ReactNode;
  switch (phase.kind) {
    case "form": {
      const reasonTooLong = reason.length > JOIN_REASON_MAX;
      body = (
        <>
          <p style={{ ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: AZURE, margin: "0 0 8px" }}>JOIN A WORKSPACE</p>
          <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: "0 0 6px", lineHeight: 1.3, overflowWrap: "anywhere" }}>
            {phase.workspaceName}
          </h1>
          <p style={{ ...GF, fontSize: 14, color: SLATE, margin: "0 0 20px", lineHeight: 1.6 }}>
            {phase.invitedByName ? <>Invited by <strong style={{ color: NAVY }}>{phase.invitedByName}</strong>. </> : null}
            Your request goes to the owner or an administrator of this workspace, who approves or declines it.
          </p>

          {submitError && (
            <p role="alert" style={{ ...GF, fontSize: 14, color: DANGER, background: "#FEF3F2", border: "1px solid #FECDCA", borderRadius: 10, padding: "10px 14px", margin: "0 0 16px" }}>
              {submitError}
            </p>
          )}

          <form noValidate onSubmit={(e) => { e.preventDefault(); void joinNow(); }}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor={nameId} style={labelStyle}>Full name <span aria-hidden style={{ color: DANGER }}>*</span></label>
              <input id={nameId} type="text" autoComplete="name" value={fullName} maxLength={JOIN_FULL_NAME_MAX}
                onChange={(e) => { nameTouched.current = true; setFullName(e.target.value); setNameError(null); }}
                aria-required aria-invalid={!!nameError} aria-describedby={nameError ? `${nameId}-err` : undefined}
                style={inputStyle(!!nameError)} />
              {nameError && <p id={`${nameId}-err`} role="alert" style={{ ...hintStyle, color: DANGER }}>{nameError}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor={emailId} style={labelStyle}>Email <span aria-hidden style={{ color: DANGER }}>*</span></label>
              <input id={emailId} type="email" readOnly aria-readonly aria-required
                value={signedIn ? (platform.user?.email ?? "") : ""}
                placeholder={signedIn ? undefined : "Sign in to fill this in"}
                aria-describedby={`${emailId}-hint`} style={inputStyle(false, true)} />
              <p id={`${emailId}-hint`} style={hintStyle}>
                {signedIn
                  ? "Your request uses your account's verified email address. To use a different one, sign in with that account."
                  : "Your request uses the verified email address of your LAGDA account. Sign in or create an account to continue."}
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor={reasonId} style={labelStyle}>
                Reason for joining <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
              </label>
              <textarea id={reasonId} value={reason} rows={3} maxLength={JOIN_REASON_MAX}
                onChange={(e) => setReason(e.target.value)}
                placeholder="For example, I'm joining the finance team."
                aria-describedby={`${reasonId}-count`} aria-invalid={reasonTooLong}
                style={{ ...inputStyle(reasonTooLong), resize: "vertical", minHeight: 88 }} />
              <p id={`${reasonId}-count`} aria-live="polite" style={{ ...hintStyle, textAlign: "right" }}>
                {reason.length}/{JOIN_REASON_MAX}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="submit" disabled={submitting} aria-busy={submitting} style={primaryButton(submitting)}>
                {submitting ? "Sending request…" : "Join Now"}
              </button>
              <button type="button" onClick={() => setPhase({ kind: "cancelled", workspaceName: phase.workspaceName, invitedByName: phase.invitedByName })}
                disabled={submitting} style={secondaryButton}>
                Cancel
              </button>
            </div>
          </form>

          {!signedIn && (
            <p style={{ ...GF, fontSize: 13, color: SLATE, textAlign: "center", margin: "16px 0 0", lineHeight: 1.6 }}>
              New to LAGDA?{" "}
              <a href={createAccountUrl} onClick={(e) => { e.preventDefault(); if (token) writeDraft(token, { fullName: fullName.trim(), reason }); void navigate(createAccountUrl); }}
                style={{ color: AZURE, fontWeight: 600 }}>
                Create an account
              </a>
            </p>
          )}
        </>
      );
      break;
    }
    case "sent":
      body = (
        <Outcome icon="✓" tone="success" title="Request sent"
          text={<>The owner or an admin of <strong style={{ color: NAVY }}>{phase.workspaceName}</strong> will review it. You'll have access once your request is approved.</>}
          action={<button type="button" onClick={goToDashboard} style={primaryButton()}>Go to dashboard</button>} />
      );
      break;
    case "cancelled":
      body = (
        <Outcome icon="✕" tone="neutral" title="Request not sent"
          text={<>You did not ask to join <strong style={{ color: NAVY }}>{phase.workspaceName}</strong>. This link has not been used, so you can come back to it later.</>}
          action={<>
            <button type="button" onClick={goToDashboard} style={primaryButton()}>Go to dashboard</button>
            <button type="button" onClick={() => setPhase({ kind: "form", workspaceName: phase.workspaceName, invitedByName: phase.invitedByName })} style={{ ...secondaryButton, marginTop: 10 }}>
              Back to the request
            </button>
          </>} />
      );
      break;
    case "used":
      body = <Outcome icon="!" tone="warning" title="This link was already used" text={JOIN_MESSAGES.used}
        action={<button type="button" onClick={goToDashboard} style={primaryButton()}>Go to dashboard</button>} />;
      break;
    case "invalid":
      body = <Outcome icon="!" tone="warning" title="This link isn't valid" text={JOIN_MESSAGES.invalid}
        action={<button type="button" onClick={goToDashboard} style={primaryButton()}>Go to dashboard</button>} />;
      break;
    case "already-member":
      body = <Outcome icon="✓" tone="neutral" title="You're already a member"
        text={phase.workspaceName ? <>You already belong to <strong style={{ color: NAVY }}>{phase.workspaceName}</strong>. Switch to it from your dashboard.</> : JOIN_MESSAGES.alreadyMember}
        action={<button type="button" onClick={goToDashboard} style={primaryButton()}>Go to dashboard</button>} />;
      break;
    case "pending":
      body = <Outcome icon="…" tone="neutral" title="Request already waiting"
        text={phase.workspaceName
          ? <>You already asked to join <strong style={{ color: NAVY }}>{phase.workspaceName}</strong>. The owner or an admin will review it.</>
          : JOIN_MESSAGES.pending}
        action={<button type="button" onClick={goToDashboard} style={primaryButton()}>Go to dashboard</button>} />;
      break;
    case "email-unverified":
      body = <Outcome icon="!" tone="warning" title="Verify your email first"
        text={<>{JOIN_MESSAGES.emailUnverified} Check your inbox for the verification email, then open this link again. The link has not been used.</>}
        action={<button type="button" onClick={() => { void navigate("/verify-email"); }} style={primaryButton()}>Verify my email</button>} />;
      break;
    case "error":
      body = <Outcome icon="!" tone="warning" title="We couldn't open this link" text={JOIN_MESSAGES.error}
        action={<button type="button" onClick={() => window.location.reload()} style={primaryButton()}>Try again</button>} />;
      break;
    default:
      body = null;
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#F5F7FA", display: "flex", flexDirection: "column", ...GF }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", height: 56, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, position: "relative" }}>
        <button type="button" onClick={goBack} aria-label="Go back"
          style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: NAVY, background: "none", border: "none", cursor: "pointer", padding: "8px 6px", minHeight: 44 }}>
          <ArrowLeft size={18} aria-hidden /> Back
        </button>
        {/* Same sizing as the signer page's header (RecipientLayout). */}
        <img src={lagdaHeaderLogo} alt="LAGDA"
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)", display: "block",
            width: "clamp(110px, 30vw, 152px)", aspectRatio: "200 / 58", height: "auto",
            objectFit: "cover", objectPosition: "left center",
          }} />
      </header>
      <main style={{ flex: 1, display: "flex", justifyContent: "center", padding: "24px 16px 48px" }}>
        <div data-testid="join-card" style={{ width: "100%", maxWidth: 480, background: "#FFFFFF", border: "1px solid #E3E8EF", borderRadius: 16, padding: "28px clamp(16px, 5vw, 32px)", boxShadow: "0 1px 4px rgba(7,17,31,0.07)", boxSizing: "border-box", alignSelf: "flex-start" }}>
          {body}
        </div>
      </main>
    </div>
  );
}

function Outcome({ icon, tone, title, text, action }: {
  icon: string; tone: "success" | "warning" | "neutral"; title: string; text: ReactNode; action: ReactNode;
}) {
  const palette = tone === "success" ? { bg: "rgba(0,120,212,0.12)", border: "rgba(0,120,212,0.3)", color: AZURE }
    : tone === "warning" ? { bg: "rgba(201,150,12,0.10)", border: "rgba(201,150,12,0.3)", color: "#8A5A00" }
    : { bg: "#F5F7FA", border: "rgba(0,0,0,0.08)", color: SLATE };
  return (
    <div role={tone === "warning" ? "alert" : "status"} style={{ textAlign: "center" }}>
      <div aria-hidden style={{ width: 52, height: 52, borderRadius: "50%", background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, fontWeight: 700 }}>
        {icon}
      </div>
      <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>{title}</h1>
      <p style={{ ...GF, fontSize: 14, color: SLATE, lineHeight: 1.7, margin: "0 0 22px", overflowWrap: "anywhere" }}>{text}</p>
      {action}
    </div>
  );
}
