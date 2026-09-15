// C13 — Email verification page.
// Demo codes: "VERIFY" → success | "EXPIRED" → expired | "LOCKED" → locked | else → invalid.
// Never claims a real email was sent. Never logs the code.

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router";
import { mockAuthService } from "../../services/mock/auth.service";
import { realAuthService } from "../../services/real/auth.service";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { ApiError } from "../../services/api-client";
import { useOnboarding } from "../../context/OnboardingContext";
import { sanitizeOnboardingReturnTo } from "../../utils/authReturnPath";
import { driveFirebaseVerificationSend } from "../../services/firebase-verification-send";
import { FIREBASE_WEB_CONFIG } from "../../services/firebase-config";

// A frontend-side proxy for "this deployment's backend is running
// EMAIL_VERIFICATION_PROVIDER=firebase" — the Firebase Web config is only
// ever populated when that's true (see .env.example). In that mode, the
// code this page's manual-entry form would submit is LAGDA's own digest-
// based code, which nothing ever shows the visitor and which can never
// match a Firebase-issued link — so that form is misleading and hidden.
const FIREBASE_MODE = USE_REAL_BACKEND && FIREBASE_WEB_CONFIG !== null;

const GF   = { fontFamily: "'Geist', sans-serif" };
const GM   = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Real emailed links carry the code as a path segment (see router.tsx's
  // /verify-email/:code); the manual-entry form on this same page still
  // types it into a text field either way.
  const { code: codeFromLink } = useParams<{ code?: string }>();
  const returnTo = params.get("returnTo") ?? "/onboarding/profile";
  const { pendingUser } = useOnboarding();

  const [code,          setCode]          = useState("");
  const [status,        setStatus]        = useState<"idle"|"submitting"|"success"|"error">("idle");
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [errorCode,     setErrorCode]     = useState<"invalid"|"expired"|"locked"|null>(null);
  const [resendStatus,  setResendStatus]  = useState<"idle"|"sending"|"sent">("idle");
  const [resendCooldown,setResendCooldown]= useState(0);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Mask the email for display
  const displayEmail = pendingUser?.email ?? "your email address";
  const maskedEmail  = displayEmail.replace(/(.{2})(.*)(@.*)/, (_,a,_b,c) => `${a}•••${c}`);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function submitCode(raw: string) {
    if (status === "submitting" || !raw.trim()) return;
    setStatus("submitting");
    setErrorMsg(null);
    setErrorCode(null);

    if (USE_REAL_BACKEND) {
      try {
        const result = await realAuthService.verifyEmail(raw.trim());
        if (result.verified) {
          setStatus("success");
          setTimeout(() => successRef.current?.focus(), 50);
          // No session exists yet — register never signs the visitor in, it
          // only creates the account (see auth.service.ts). Verifying routes
          // back to sign-in rather than straight into onboarding.
          setTimeout(() => navigate(
            `/sign-in?returnTo=${encodeURIComponent(returnTo)}`, { replace: true },
          ), 1500);
        } else {
          setStatus("error");
          setErrorCode("invalid");
          setErrorMsg("That verification link is not valid. Please check and try again.");
          setCode("");
          setTimeout(() => { errorRef.current?.focus(); inputRef.current?.focus(); }, 50);
        }
      } catch (err) {
        setStatus("error");
        setErrorCode("invalid");
        setErrorMsg(
          err instanceof ApiError
            ? err.message
            : "This verification link is expired or invalid. Please request a new one.",
        );
        setCode("");
        setTimeout(() => { errorRef.current?.focus(); inputRef.current?.focus(); }, 50);
      }
      return;
    }

    const result = await mockAuthService.verifyEmail(raw);
    if (result.success) {
      setStatus("success");
      setTimeout(() => successRef.current?.focus(), 50);
      setTimeout(() => navigate(sanitizeOnboardingReturnTo(returnTo), { replace: true }), 1500);
    } else {
      setStatus("error");
      setErrorCode(result.errorCode ?? "invalid");
      const msgs: Record<"invalid" | "expired" | "locked", string> = {
        invalid:  "That code is not valid. Please check and try again.",
        expired:  "This verification code has expired. Please request a new one.",
        locked:   "Too many incorrect attempts. This verification session has been locked.",
      };
      setErrorMsg(msgs[result.errorCode ?? "invalid"]);
      setCode("");
      setTimeout(() => { errorRef.current?.focus(); inputRef.current?.focus(); }, 50);
    }
  }

  // A real emailed link auto-submits on arrival rather than making someone
  // retype what was already in the URL.
  useEffect(() => {
    if (USE_REAL_BACKEND && codeFromLink) void submitCode(codeFromLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromLink]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCode(code);
  }

  async function handleResend() {
    if (resendCooldown > 0 || resendStatus === "sending") return;
    setResendStatus("sending");
    if (USE_REAL_BACKEND) {
      const result = await realAuthService.resendVerification(displayEmail);
      // Firebase-provider mode only — absent means the backend's own
      // delivery pipeline handled it, same as before this migration.
      if (result.verificationHandoff !== undefined) {
        await driveFirebaseVerificationSend(result.verificationHandoff, returnTo);
      }
    } else {
      await mockAuthService.resendVerification(displayEmail);
    }
    setResendStatus("sent");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setTimeout(() => setResendStatus("idle"), 3000);
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} style={{ outline: "none", textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20 }} aria-hidden>✓</div>
        <h1 style={{ color: "#07111F", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>Email verified</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>
          {USE_REAL_BACKEND
            ? "Your email has been verified. Redirecting you to sign in…"
            : "Your email has been verified in this frontend demonstration. Continuing to account setup…"}
        </p>
        <div role="status" aria-live="polite" style={{ width: 24, height: 24, border: "2px solid rgba(0,120,212,0.2)", borderTopColor: AZURE, borderRadius: "50%", animation: "ve-spin 0.8s linear infinite", margin: "0 auto" }} aria-label="Loading" />
        <style>{`@keyframes ve-spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="ve-spin"] { animation: none; } }`}</style>
      </div>
    );
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "#07111F", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Verify your email</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          {FIREBASE_MODE ? (
            <>Click the link we sent to{" "}
              <span style={{ color: "#334155" }}>{maskedEmail}</span> to verify your account.</>
          ) : USE_REAL_BACKEND ? (
            <>Click the link we sent to{" "}
              <span style={{ color: "#334155" }}>{maskedEmail}</span>, or paste its code below.</>
          ) : (
            <>Enter the 6-character code we would send to{" "}
              <span style={{ color: "#334155" }}>{maskedEmail}</span></>
          )}
        </p>
      </div>

      {/* Demo instruction */}
      {!USE_REAL_BACKEND && (
        <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
          <p style={{ color: "#334155", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            Use code <strong style={{ color: "#07111F", fontFamily: "'Geist Mono', monospace" }}>VERIFY</strong> to succeed,{" "}
            <strong style={{ color: "#07111F", fontFamily: "'Geist Mono', monospace" }}>EXPIRED</strong> to test an expired code, or{" "}
            <strong style={{ color: "#07111F", fontFamily: "'Geist Mono', monospace" }}>LOCKED</strong> to test the lockout state.
          </p>
        </div>
      )}

      {/* Error */}
      {errorMsg && !FIREBASE_MODE && (
        <div ref={errorRef} tabIndex={-1} role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, outline: "none" }}>
          <p style={{ color: "#EF4444", ...GF, fontSize: 13, margin: 0 }}>{errorMsg}</p>
          {errorCode === "expired" && (
            <button onClick={handleResend} style={{ color: "#0078D4", ...GF, fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", display: "block" }}>
              Request a new code
            </button>
          )}
        </div>
      )}

      {!FIREBASE_MODE && (
      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="ve-code" style={{ display: "block", color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Verification code <span aria-hidden style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            ref={inputRef}
            id="ve-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            autoComplete="one-time-code"
            inputMode="text"
            aria-required
            aria-invalid={status === "error"}
            aria-describedby="ve-code-hint"
            disabled={status === "submitting" || errorCode === "locked"}
            placeholder="e.g. VERIFY"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#ffffff",
              border: `1px solid ${status === "error" ? "rgba(239,68,68,0.4)" : "rgba(0,0,0,0.08)"}`,
              borderRadius: 8, color: "#07111F",
              fontFamily: "'Geist Mono', monospace", fontSize: 18, fontWeight: 700,
              padding: "14px 16px", outline: "none", letterSpacing: "0.15em",
              textAlign: "center", textTransform: "uppercase",
            }}
          />
          <p id="ve-code-hint" style={{ color: "#64748B", ...GF, fontSize: 11, margin: "6px 0 0" }}>
            Enter the code exactly as shown. Codes are case-insensitive.
          </p>
        </div>

        {errorCode !== "locked" && (
          <button
            type="submit"
            disabled={status === "submitting" || !code.trim()}
            aria-busy={status === "submitting"}
            style={{
              background: status === "submitting" || !code.trim() ? "rgba(0,120,212,0.4)" : AZURE,
              border: "none", borderRadius: 8, color: "white",
              ...GF, fontSize: 15, fontWeight: 700,
              padding: "14px", minHeight: 48, cursor: status === "submitting" || !code.trim() ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {status === "submitting" ? "Verifying…" : "Verify Email"}
          </button>
        )}
      </form>
      )}

      {/* Resend */}
      {errorCode !== "locked" && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{ color: "#64748B", ...GF, fontSize: 13, margin: "0 0 8px" }}>Didn't receive a code?</p>
          {resendStatus === "sent" ? (
            <p role="status" aria-live="polite" style={{ color: "#0078D4", ...GF, fontSize: 13 }}>
              {USE_REAL_BACKEND
                ? "If that address has an account, a new email is on its way."
                : "Resend requested in this frontend demonstration."}
            </p>
          ) : resendCooldown > 0 ? (
            <p aria-live="polite" style={{ color: "#64748B", ...GF, fontSize: 13 }}>Resend available in {resendCooldown}s</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendStatus === "sending"}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#0078D4", ...GF, fontSize: 13 }}
            >
              {resendStatus === "sending" ? "Requesting…" : USE_REAL_BACKEND ? "Resend email" : "Resend code (demonstration only)"}
            </button>
          )}
        </div>
      )}

      {/* Locked state guidance */}
      {errorCode === "locked" && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link to="/sign-in" style={{ color: "#0078D4", ...GF, fontSize: 13, textDecoration: "none" }}>Return to Sign In</Link>
          <span style={{ color: "#94A3B8", margin: "0 8px" }}>·</span>
          <Link to="/help" style={{ color: "#64748B", ...GF, fontSize: 13, textDecoration: "none" }}>Contact Support</Link>
        </div>
      )}

      {!errorCode && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/sign-in" style={{ color: "#64748B", ...GF, fontSize: 12, textDecoration: "none" }}>← Back to Sign In</Link>
        </div>
      )}
    </>
  );
}
