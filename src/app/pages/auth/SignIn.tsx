import { useState, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { type SubmissionStatus, type FormErrors, type SignInRequest } from "../../models/forms";
import { publicAccountService, conversionTracker } from "../../services/public";
import { usePlatform, createMockSignInPayload } from "../../context/PlatformContext";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeReturnPath(raw: string | null): string {
  if (!raw) return "/app/dashboard";
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.startsWith("/app") ? decoded : "/app/dashboard";
  } catch {
    return "/app/dashboard";
  }
}

export function SignIn() {
  const [params] = useSearchParams();
  const redirectTo = safeReturnPath(params.get("returnTo") ?? params.get("redirect"));
  const navigate = useNavigate();
  const platform = usePlatform();

  const [fields, setFields] = useState<SignInRequest>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!fields.email.trim()) e.email = "Email address is required";
    else if (!EMAIL_RE.test(fields.email.trim())) e.email = "Enter a valid email address";
    if (!fields.password) e.password = "Password is required";
    else if (fields.password.length < 6) e.password = "Password must be at least 6 characters";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (status === "submitting") return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }
    setErrors({});
    setServerError(null);
    setStatus("submitting");
    conversionTracker.track({ name: "sign_in_started" });
    // Password is passed to the mock service interface but never logged or stored.
    const result = await publicAccountService.signIn({ email: fields.email, password: fields.password });
    if (result.success) {
      setStatus("success");
      conversionTracker.track({ name: "sign_in_mock_completed" });
      // Establish the in-memory platform session for the authenticated shell.
      const p = createMockSignInPayload();
      platform.signIn(p.user, p.workspaces, p.currentWorkspace, p.subscription, p.notifications);
      setTimeout(() => confirmRef.current?.focus(), 50);
      setTimeout(() => navigate(redirectTo), 1400);
    } else {
      setStatus("error");
      setServerError(result.errorMessage ?? "An error occurred. Please try again.");
      setTimeout(() => errorRef.current?.focus(), 50);
    }
  }

  if (status === "success") {
    return (
      <div ref={confirmRef} tabIndex={-1} style={{ outline: "none", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20 }} aria-hidden>✓</div>
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>Signing you in…</h1>
        <div style={{ background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 10, padding: "14px 18px", marginTop: 16 }} role="status">
          <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            Sign-in validation is complete in this frontend demonstration. Secure authentication will be connected during backend integration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Sign in to LAGDA</h1>
        <p style={{ color: "#64748b", ...GF, fontSize: 13 }}>Welcome back. Access your documents and workspace.</p>
      </div>

      {(serverError || Object.keys(errors).length > 0) && (
        <div ref={errorRef} tabIndex={-1} role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, outline: "none" }}>
          {serverError ? (
            <>
              <p style={{ color: "#ef4444", ...GF, fontSize: 13, margin: 0 }}>{serverError}</p>
              <button onClick={() => { setServerError(null); setStatus("idle"); }} style={{ color: "#38bdf8", ...GF, fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", display: "block" }}>Try again</button>
            </>
          ) : (
            <>
              <p style={{ color: "#ef4444", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Please correct the following:</p>
              {Object.values(errors).map((m) => <p key={m} style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "2px 0 0" }}>{m}</p>)}
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="Sign in form" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="si-email" style={{ display: "block", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
            Email address <span aria-hidden style={{ color: "#ef4444" }}>*</span>
          </label>
          <input id="si-email" type="email" value={fields.email}
            onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
            autoComplete="email" aria-required aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "si-email-err" : undefined}
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: `1px solid ${errors.email ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, color: "white", ...GF, fontSize: 14, padding: "11px 14px", outline: "none" }} />
          {errors.email && <p id="si-email-err" role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{errors.email}</p>}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <label htmlFor="si-password" style={{ color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600 }}>
              Password <span aria-hidden style={{ color: "#ef4444" }}>*</span>
            </label>
            <Link to="/forgot-password" style={{ color: "#64748b", ...GF, fontSize: 12, textDecoration: "none" }}>Forgot password?</Link>
          </div>
          <div style={{ position: "relative" }}>
            <input id="si-password" type={showPassword ? "text" : "password"}
              value={fields.password} onChange={(e) => setFields((f) => ({ ...f, password: e.target.value }))}
              autoComplete="current-password" aria-required aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "si-pw-err" : undefined}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: `1px solid ${errors.password ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, color: "white", ...GF, fontSize: 14, padding: "11px 44px 11px 14px", outline: "none" }} />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", ...GF, fontSize: 11, padding: "4px", minHeight: 28 }}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && <p id="si-pw-err" role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{errors.password}</p>}
        </div>

        <button type="submit" disabled={status === "submitting"}
          style={{ background: status === "submitting" ? "rgba(0,120,212,0.5)" : AZURE, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", borderRadius: 8, border: "none", cursor: status === "submitting" ? "not-allowed" : "pointer", minHeight: 48, transition: "background 0.15s" }}
          aria-busy={status === "submitting"}>
          {status === "submitting" ? "Signing in…" : "Continue to Sign In"}
        </button>

        <div style={{ padding: "12px 14px", background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.15)", borderRadius: 8 }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, marginBottom: 4 }}>FRONTEND DEMONSTRATION</p>
          <p style={{ color: "#475569", ...GF, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            No real authentication occurs in this phase. Secure sign-in will be connected during backend integration.
          </p>
        </div>
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ color: "#64748b", ...GF, fontSize: 13 }}>Don't have an account? </span>
        <Link to="/create-account" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Create one free</Link>
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
    </>
  );
}
