// C13 — Email verification page.
// Demo codes: "VERIFY" → success | "EXPIRED" → expired | "LOCKED" → locked | else → invalid.
// Never claims a real email was sent. Never logs the code.

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { mockAuthService } from "../../services/mock/auth.service";
import { useOnboarding } from "../../context/OnboardingContext";

const GF   = { fontFamily: "'Geist', sans-serif" };
const GM   = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting" || !code.trim()) return;
    setStatus("submitting");
    setErrorMsg(null);
    setErrorCode(null);

    const result = await mockAuthService.verifyEmail(code);
    if (result.success) {
      setStatus("success");
      setTimeout(() => successRef.current?.focus(), 50);
      setTimeout(() => navigate(safeReturnTo(returnTo), { replace: true }), 1500);
    } else {
      setStatus("error");
      setErrorCode(result.errorCode ?? "invalid");
      const msgs: Record<string, string> = {
        invalid:  "That code is not valid. Please check and try again.",
        expired:  "This verification code has expired. Please request a new one.",
        locked:   "Too many incorrect attempts. This verification session has been locked.",
      };
      setErrorMsg(msgs[result.errorCode ?? "invalid"]);
      setCode("");
      setTimeout(() => { errorRef.current?.focus(); inputRef.current?.focus(); }, 50);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resendStatus === "sending") return;
    setResendStatus("sending");
    await mockAuthService.resendVerification(displayEmail);
    setResendStatus("sent");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setTimeout(() => setResendStatus("idle"), 3000);
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} style={{ outline: "none", textAlign: "center", padding: "8px 0" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20 }} aria-hidden>✓</div>
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>Email verified</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>
          Your email has been verified in this frontend demonstration. Continuing to account setup…
        </p>
        <div role="status" aria-live="polite" style={{ width: 24, height: 24, border: "2px solid rgba(0,120,212,0.2)", borderTopColor: AZURE, borderRadius: "50%", animation: "ve-spin 0.8s linear infinite", margin: "0 auto" }} aria-label="Loading" />
        <style>{`@keyframes ve-spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="ve-spin"] { animation: none; } }`}</style>
      </div>
    );
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Verify your email</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          Enter the 6-character code we would send to{" "}
          <span style={{ color: "#94A3B8" }}>{maskedEmail}</span>
        </p>
      </div>

      {/* Demo instruction */}
      <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
        <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
        <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Use code <strong style={{ color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>VERIFY</strong> to succeed,{" "}
          <strong style={{ color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>EXPIRED</strong> to test an expired code, or{" "}
          <strong style={{ color: "#94A3B8", fontFamily: "'Geist Mono', monospace" }}>LOCKED</strong> to test the lockout state.
        </p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div ref={errorRef} tabIndex={-1} role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, outline: "none" }}>
          <p style={{ color: "#EF4444", ...GF, fontSize: 13, margin: 0 }}>{errorMsg}</p>
          {errorCode === "expired" && (
            <button onClick={handleResend} style={{ color: "#38BDF8", ...GF, fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", display: "block" }}>
              Request a new code
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="ve-code" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
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
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${status === "error" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 8, color: "white",
              fontFamily: "'Geist Mono', monospace", fontSize: 18, fontWeight: 700,
              padding: "14px 16px", outline: "none", letterSpacing: "0.15em",
              textAlign: "center", textTransform: "uppercase",
            }}
          />
          <p id="ve-code-hint" style={{ color: "#475569", ...GF, fontSize: 11, margin: "6px 0 0" }}>
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

      {/* Resend */}
      {errorCode !== "locked" && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{ color: "#475569", ...GF, fontSize: 13, margin: "0 0 8px" }}>Didn't receive a code?</p>
          {resendStatus === "sent" ? (
            <p role="status" aria-live="polite" style={{ color: "#38BDF8", ...GF, fontSize: 13 }}>
              Resend requested in this frontend demonstration.
            </p>
          ) : resendCooldown > 0 ? (
            <p aria-live="polite" style={{ color: "#475569", ...GF, fontSize: 13 }}>Resend available in {resendCooldown}s</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendStatus === "sending"}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#38BDF8", ...GF, fontSize: 13 }}
            >
              {resendStatus === "sending" ? "Requesting…" : "Resend code (demonstration only)"}
            </button>
          )}
        </div>
      )}

      {/* Locked state guidance */}
      {errorCode === "locked" && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link to="/sign-in" style={{ color: "#38BDF8", ...GF, fontSize: 13, textDecoration: "none" }}>Return to Sign In</Link>
          <span style={{ color: "#334155", margin: "0 8px" }}>·</span>
          <Link to="/help" style={{ color: "#475569", ...GF, fontSize: 13, textDecoration: "none" }}>Contact Support</Link>
        </div>
      )}

      {!errorCode && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/sign-in" style={{ color: "#475569", ...GF, fontSize: 12, textDecoration: "none" }}>← Back to Sign In</Link>
        </div>
      )}
    </>
  );
}

function safeReturnTo(raw: string): string {
  if (raw.startsWith("/onboarding") || raw.startsWith("/app")) return raw;
  return "/onboarding/profile";
}
