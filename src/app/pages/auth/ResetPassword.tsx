// C13 — Reset password form.
// URL param ?state= drives the page:
//   "valid"   → show the reset form
//   "expired" → show expired link state
//   "used"    → show already-used state
//   anything else → show invalid state
// Password is NEVER logged or stored.

import { useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { checkPassword, isPasswordAcceptable } from "../../models/auth";
import { mockAuthService } from "../../services/mock/auth.service";

const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";

type LinkState = "valid" | "expired" | "used" | "invalid";

function getLinkState(raw: string | null): LinkState {
  if (raw === "valid" || raw === "expired" || raw === "used") return raw;
  return "invalid";
}

// ── Link-error states ──────────────────────────────────────────────────────────

function LinkError({ linkState }: { linkState: "expired" | "used" | "invalid" }) {
  const copy = {
    expired: {
      icon: "⏱",
      title: "Reset link expired",
      body:  "Password reset links are valid for a limited time. Please request a new one.",
      cta:   "Request a new link",
      to:    "/forgot-password",
    },
    used: {
      icon: "✓",
      title: "Link already used",
      body:  "This password reset link has already been used. If you need to reset again, please request a new link.",
      cta:   "Request a new link",
      to:    "/forgot-password",
    },
    invalid: {
      icon: "✕",
      title: "Invalid reset link",
      body:  "This password reset link is not valid. It may be malformed or from an older request.",
      cta:   "Request a new link",
      to:    "/forgot-password",
    },
  }[linkState];

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 18px", fontSize: 20,
      }} aria-hidden>{copy.icon}</div>
      <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>{copy.title}</h1>
      <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>{copy.body}</p>
      <Link to={copy.to} style={{ display: "block", background: AZURE, borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px" }}>
        {copy.cta}
      </Link>
      <div style={{ marginTop: 16 }}>
        <Link to="/sign-in" style={{ color: "#475569", ...GF, fontSize: 12, textDecoration: "none" }}>← Back to Sign In</Link>
      </div>
    </div>
  );
}

// ── Password requirement row ───────────────────────────────────────────────────

function Req({ met, children }: { met: boolean; children: string }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 8, color: met ? "#38BDF8" : "#475569", ...GF, fontSize: 12, margin: 0 }}>
      <span aria-hidden style={{ fontSize: 10, lineHeight: 1 }}>{met ? "✓" : "○"}</span>
      {children}
    </li>
  );
}

// ── Reset form ────────────────────────────────────────────────────────────────

function ResetForm() {
  const navigate  = useNavigate();
  const [pw,       setPw]       = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [status,   setStatus]   = useState<"idle"|"submitting"|"success"|"error">("idle");
  const [formErr,  setFormErr]  = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const checks    = checkPassword(pw);
  const pwOk      = isPasswordAcceptable(pw);
  const matchOk   = pw === confirm && confirm.length > 0;
  const canSubmit = pwOk && matchOk && status !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!matchOk) { setFormErr("Passwords do not match."); return; }
    setFormErr(null);
    setStatus("submitting");

    // Password is NOT logged. Demo only.
    const result = await mockAuthService.resetPassword(pw);
    if (result.success) {
      setStatus("success");
      setTimeout(() => successRef.current?.focus(), 50);
      setTimeout(() => navigate("/sign-in?notice=password-reset", { replace: true }), 1800);
    } else {
      setStatus("error");
      setFormErr("Something went wrong in this demonstration. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" aria-live="polite" style={{ outline: "none", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 22 }} aria-hidden>✓</div>
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 10px" }}>Password updated</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>
          Your password has been updated in this frontend demonstration. Redirecting to Sign In…
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Set new password</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          Choose a strong password for your account.
        </p>
      </div>

      {formErr && (
        <div role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ color: "#EF4444", ...GF, fontSize: 13, margin: 0 }}>{formErr}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* New password */}
        <div>
          <label htmlFor="rp-pw" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            New password <span aria-hidden style={{ color: "#EF4444" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="rp-pw"
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              aria-required
              aria-describedby="rp-pw-reqs"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8, color: "white",
                ...GF, fontSize: 15, padding: "13px 44px 13px 14px",
                outline: "none",
              }}
            />
            <button
              type="button"
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw((v) => !v)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 4, fontSize: 12 }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {/* Requirements */}
          {pw.length > 0 && (
            <ul id="rp-pw-reqs" aria-label="Password requirements" style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              <Req met={checks.minLength}>At least 8 characters</Req>
              <Req met={checks.hasUppercase}>One uppercase letter</Req>
              <Req met={checks.hasNumber}>One number</Req>
              <Req met={checks.hasSymbol}>One special character</Req>
            </ul>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label htmlFor="rp-confirm" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Confirm password <span aria-hidden style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            id="rp-confirm"
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            aria-required
            aria-invalid={confirm.length > 0 && !matchOk}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${confirm.length > 0 && !matchOk ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 8, color: "white",
              ...GF, fontSize: 15, padding: "13px 14px",
              outline: "none",
            }}
          />
          {confirm.length > 0 && !matchOk && (
            <p role="alert" style={{ color: "#EF4444", ...GF, fontSize: 12, margin: "5px 0 0" }}>Passwords do not match.</p>
          )}
          {confirm.length > 0 && matchOk && (
            <p style={{ color: "#38BDF8", ...GF, fontSize: 12, margin: "5px 0 0" }}>Passwords match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          aria-busy={status === "submitting"}
          style={{
            background: !canSubmit ? "rgba(0,120,212,0.4)" : AZURE,
            border: "none", borderRadius: 8, color: "white",
            ...GF, fontSize: 15, fontWeight: 700,
            padding: "14px", minHeight: 48,
            cursor: !canSubmit ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {status === "submitting" ? "Updating…" : "Set new password"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link to="/sign-in" style={{ color: "#475569", ...GF, fontSize: 12, textDecoration: "none" }}>← Back to Sign In</Link>
      </div>
    </>
  );
}

// ── Page entry point ───────────────────────────────────────────────────────────

export function ResetPassword() {
  const [params]    = useSearchParams();
  const linkState   = getLinkState(params.get("state"));

  if (linkState !== "valid") return <LinkError linkState={linkState} />;
  return <ResetForm />;
}
