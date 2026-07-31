// C13 — MFA challenge page.
// Demo codes: "123456" → success | "000000" → locked | else → invalid.
// Code is NEVER logged.

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { mockAuthService } from "../../services/mock/auth.service";
import { usePlatform } from "../../context/PlatformContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { createMockSignInPayload } from "../../context/PlatformContext";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

export function MfaChallenge() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const returnTo   = params.get("returnTo") ?? "/app/dashboard";
  const platform   = usePlatform();
  const { pendingUser } = useOnboarding();

  const [code,     setCode]    = useState("");
  const [status,   setStatus]  = useState<"idle"|"submitting"|"success"|"error">("idle");
  const [errorMsg, setErrorMsg]= useState<string | null>(null);
  const [errorCode,setErrorCode]=useState<"invalid"|"locked"|null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const errorRef   = useRef<HTMLDivElement>(null);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting" || !code.trim()) return;
    setStatus("submitting");
    setErrorMsg(null);
    setErrorCode(null);

    const result = await mockAuthService.submitMfaChallenge(code);
    if (result.success) {
      setStatus("success");
      const payload = createMockSignInPayload();
      // The mock fixture always has a current workspace; guard so a missing one
      // never enters the session as an undefined workspace.
      const ws = payload.currentWorkspace ?? payload.workspaces[0];
      if (ws) platform.signIn(payload.user, payload.workspaces, ws, payload.subscription, payload.notifications);
      setTimeout(() => navigate(safeReturnTo(returnTo), { replace: true }), 800);
    } else {
      setStatus("error");
      setErrorCode(result.errorCode ?? "invalid");
      const msgs: Record<"invalid" | "locked", string> = {
        invalid: "That code is incorrect. Please try again.",
        locked:  "Too many incorrect attempts. Your account access has been locked.",
      };
      setErrorMsg(msgs[result.errorCode ?? "invalid"]);
      setCode("");
      setTimeout(() => { errorRef.current?.focus(); inputRef.current?.focus(); }, 50);
    }
  }

  // Handle physical digit-only input normalization
  function handleCodeChange(raw: string) {
    setCode(raw.replace(/\D/g, "").slice(0, 6));
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Two-factor authentication</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          {pendingUser?.email
            ? <>Signed in as <span style={{ color: "#94A3B8" }}>{pendingUser.email}</span>. Enter your authenticator code.</>
            : "Enter the 6-digit code from your authenticator app."
          }
        </p>
      </div>

      {/* Demo instruction */}
      <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
        <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
        <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Use code <strong style={{ color: "#94A3B8", ...GM }}>123456</strong> to succeed or{" "}
          <strong style={{ color: "#94A3B8", ...GM }}>000000</strong> to test the lockout state.
        </p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div ref={errorRef} tabIndex={-1} role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, outline: "none" }}>
          <p style={{ color: "#EF4444", ...GF, fontSize: 13, margin: 0 }}>{errorMsg}</p>
          {errorCode === "locked" && (
            <Link to="/auth/account-locked" style={{ color: "#38BDF8", ...GF, fontSize: 12, display: "block", marginTop: 6 }}>View account locked information</Link>
          )}
        </div>
      )}

      {status === "success" && (
        <div role="status" aria-live="polite" style={{ textAlign: "center", marginBottom: 16, color: "#38BDF8", ...GF, fontSize: 14 }}>
          Verified — signing you in…
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="mfa-code" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Authenticator code <span aria-hidden style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            ref={inputRef}
            id="mfa-code"
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            aria-required
            aria-invalid={status === "error"}
            disabled={status === "submitting" || errorCode === "locked" || status === "success"}
            placeholder="000000"
            maxLength={6}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${status === "error" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 8, color: "white",
              ...GM, fontSize: 24, fontWeight: 700,
              padding: "14px 16px", outline: "none",
              textAlign: "center", letterSpacing: "0.2em",
            }}
          />
        </div>

        {errorCode !== "locked" && status !== "success" && (
          <button
            type="submit"
            disabled={status === "submitting" || code.length !== 6}
            aria-busy={status === "submitting"}
            style={{
              background: (status === "submitting" || code.length !== 6) ? "rgba(0,120,212,0.4)" : AZURE,
              border: "none", borderRadius: 8, color: "white",
              ...GF, fontSize: 15, fontWeight: 700,
              padding: "14px", minHeight: 48,
              cursor: (status === "submitting" || code.length !== 6) ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {status === "submitting" ? "Verifying…" : "Verify"}
          </button>
        )}
      </form>

      {/* Recovery option */}
      {errorCode !== "locked" && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{ color: "#475569", ...GF, fontSize: 13, margin: "0 0 6px" }}>Lost access to your authenticator?</p>
          <Link to="/mfa/recovery" style={{ color: "#38BDF8", ...GF, fontSize: 13, textDecoration: "none" }}>Use a recovery code</Link>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link to="/sign-in" style={{ color: "#475569", ...GF, fontSize: 12, textDecoration: "none" }}>← Back to Sign In</Link>
      </div>
    </>
  );
}

function safeReturnTo(raw: string): string {
  if (raw.startsWith("/app")) return raw;
  return "/app/dashboard";
}
