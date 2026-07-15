// C13 — Forgot password page.
// Privacy-preserving: never reveals whether an account exists.
// Never claims a real email was sent — all messaging is clearly demonstration language.

import { useState, useRef } from "react";
import { Link } from "react-router";
import { mockAuthService } from "../../services/mock/auth.service";

const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";

export function ForgotPassword() {
  const [email,     setEmail]     = useState("");
  const [status,    setStatus]    = useState<"idle"|"submitting"|"sent">("idle");
  const [emailErr,  setEmailErr]  = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  function validateEmail(v: string) {
    if (!v.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) { setEmailErr(err); return; }
    setEmailErr(null);
    setStatus("submitting");

    // Email is NOT logged. Neutral response regardless of account existence.
    await mockAuthService.requestPasswordReset(email);
    setStatus("sent");
    setTimeout(() => successRef.current?.focus(), 50);
  }

  if (status === "sent") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" aria-live="polite" style={{ outline: "none", textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px", fontSize: 22,
        }} aria-hidden>✉</div>
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>Check your inbox</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
          If an account exists for that address, a password reset link would be sent (this is a frontend demonstration — no email is actually sent).
        </p>
        <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, textAlign: "left" }}>
          <p style={{ color: "#C9960C", fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
          <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            To test the reset form, go to <strong style={{ color: "#94A3B8" }}>/reset-password?state=valid</strong> directly.
          </p>
        </div>
        <Link
          to="/sign-in"
          style={{ display: "block", background: AZURE, border: "none", borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textAlign: "center", textDecoration: "none", minHeight: 48, lineHeight: "20px" }}
        >
          Return to Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Reset your password</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          Enter your email and we will send instructions to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="fp-email" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Email address <span aria-hidden style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            id="fp-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr(null); }}
            autoComplete="email"
            aria-required
            aria-invalid={!!emailErr}
            aria-describedby={emailErr ? "fp-email-err" : undefined}
            placeholder="you@example.com"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${emailErr ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 8, color: "white",
              ...GF, fontSize: 15, padding: "13px 14px",
              outline: "none",
            }}
          />
          {emailErr && <p id="fp-email-err" role="alert" style={{ color: "#EF4444", ...GF, fontSize: 12, margin: "5px 0 0" }}>{emailErr}</p>}
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          aria-busy={status === "submitting"}
          style={{
            background: status === "submitting" ? "rgba(0,120,212,0.5)" : AZURE,
            border: "none", borderRadius: 8, color: "white",
            ...GF, fontSize: 15, fontWeight: 700,
            padding: "14px", minHeight: 48,
            cursor: status === "submitting" ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {status === "submitting" ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link to="/sign-in" style={{ color: "#475569", ...GF, fontSize: 13, textDecoration: "none" }}>
          ← Back to Sign In
        </Link>
      </div>
    </>
  );
}
