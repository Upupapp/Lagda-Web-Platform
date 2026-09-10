// C13 — Sign-in page with deterministic mock auth scenarios.
// Email-based routing: standard → /app, mfa → /mfa, verify → /verify-email,
// locked → /auth/account-locked, onboarding (default) → /onboarding/profile.
// Password is NEVER logged or stored.

import { useState, useRef } from "react";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router";
import { type FormErrors } from "../../models/forms";
import { conversionTracker } from "../../services/public";
import {
  usePlatform,
  createMockSignInPayload,
} from "../../context/PlatformContext";
import { useOnboarding } from "../../context/OnboardingContext";
import { mockAuthService } from "../../services/mock/auth.service";
import { sanitizeAppReturnTo } from "../../utils/authReturnPath";

const GF = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignIn() {
  const [params] = useSearchParams();
  const redirectTo = sanitizeAppReturnTo(
    params.get("returnTo") ?? params.get("redirect"),
  );
  const navigate = useNavigate();
  const platform = usePlatform();
  const { setPendingUser } = useOnboarding();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Already signed in — this is a continuation boundary, not a form to fill
  // out again. Send the visitor straight through to where they were headed.
  if (platform.sessionStatus === "authenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!email.trim()) e.email = "Email address is required";
    else if (!EMAIL_RE.test(email.trim()))
      e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 6)
      e.password = "Password must be at least 6 characters";
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

    // Password is never logged — passed as unnamed arg to satisfy interface only.
    const result = await mockAuthService.signIn(email.trim(), password);

    if (!result.success) {
      setStatus("error");
      setServerError(result.errorMessage);
      setTimeout(() => errorRef.current?.focus(), 50);
      return;
    }

    conversionTracker.track({ name: "sign_in_mock_completed" });
    const { scenario, user } = result;
    setPendingUser(user);

    switch (scenario) {
      case "standard":
        // Fully authenticated — go straight to platform
        const p = createMockSignInPayload();
        // The mock fixture always has a current workspace; guard so a missing one
        // never enters the session as an undefined workspace.
        const ws = p.currentWorkspace ?? p.workspaces[0];
        if (ws)
          platform.signIn(
            p.user,
            p.workspaces,
            ws,
            p.subscription,
            p.notifications,
          );
        navigate(redirectTo, { replace: true });
        break;

      case "mfa-challenge":
        navigate(
          `/mfa${redirectTo !== "/app/dashboard" ? `?returnTo=${encodeURIComponent(redirectTo)}` : ""}`,
          { replace: true },
        );
        break;

      case "email-verification":
        navigate("/verify-email", { replace: true });
        break;

      case "locked":
        navigate("/auth/account-locked", { replace: true });
        break;

      case "onboarding":
      default:
        navigate("/onboarding/profile", { replace: true });
        break;
    }
  }

  return (
    <>
      <div
        style={{
          textAlign: "center",
          marginBottom: 0,
          position: "relative",
          bottom: 26,
        }}
      >
        <p
          style={{
            color: "#111827",
            ...GF,
            fontSize: 15,
            fontWeight: 650,
            letterSpacing: "0.005em",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Welcome back. Access your documents and workspace.
        </p>
      </div>

      {(serverError || Object.keys(errors).length > 0) && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 16,
            outline: "none",
          }}
        >
          {serverError ? (
            <>
              <p style={{ color: "#ef4444", ...GF, fontSize: 13, margin: 0 }}>
                {serverError}
              </p>
              <button
                onClick={() => {
                  setServerError(null);
                  setStatus("idle");
                }}
                style={{
                  color: "#0078D4",
                  ...GF,
                  fontSize: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 0 0",
                  display: "block",
                }}
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <p
                style={{
                  color: "#ef4444",
                  ...GF,
                  fontSize: 13,
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                Please correct the following:
              </p>
              {Object.values(errors).map((m) => (
                <p
                  key={m}
                  style={{
                    color: "#ef4444",
                    ...GF,
                    fontSize: 12,
                    margin: "2px 0 0",
                  }}
                >
                  {m}
                </p>
              ))}
            </>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Sign in form"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label
            htmlFor="si-email"
            style={{
              display: "block",
              color: "#64748B",
              ...GF,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 5,
            }}
          >
            Email address{" "}
            <span aria-hidden style={{ color: "#ef4444" }}>
              *
            </span>
          </label>
          <input
            id="si-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email)
                setErrors((p) => {
                  const n = { ...p };
                  delete n.email;
                  return n;
                });
            }}
            autoComplete="email"
            aria-required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "si-email-err" : undefined}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#ffffff",
              border: `1px solid ${errors.email ? "rgba(239,68,68,0.4)" : "rgba(0,0,0,0.08)"}`,
              borderRadius: 8,
              color: "#07111F",
              ...GF,
              fontSize: 14,
              padding: "11px 14px",
              outline: "none",
            }}
          />
          {errors.email && (
            <p
              id="si-email-err"
              role="alert"
              style={{
                color: "#ef4444",
                ...GF,
                fontSize: 12,
                margin: "4px 0 0",
              }}
            >
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <label
              htmlFor="si-password"
              style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600 }}
            >
              Password{" "}
              <span aria-hidden style={{ color: "#ef4444" }}>
                *
              </span>
            </label>
            <Link
              to="/forgot-password"
              style={{
                color: "#64748B",
                ...GF,
                fontSize: 12,
                textDecoration: "none",
              }}
            >
              Forgot password?
            </Link>
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="si-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => {
                    const n = { ...p };
                    delete n.password;
                    return n;
                  });
              }}
              autoComplete="current-password"
              aria-required
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "si-pw-err" : undefined}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#ffffff",
                border: `1px solid ${errors.password ? "rgba(239,68,68,0.4)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: 8,
                color: "#07111F",
                ...GF,
                fontSize: 14,
                padding: "11px 44px 11px 14px",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748B",
                ...GF,
                fontSize: 11,
                padding: "4px",
                minHeight: 28,
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p
              id="si-pw-err"
              role="alert"
              style={{
                color: "#ef4444",
                ...GF,
                fontSize: 12,
                margin: "4px 0 0",
              }}
            >
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          style={{
            background: status === "submitting" ? "rgba(0,120,212,0.5)" : AZURE,
            color: "white",
            ...GF,
            fontSize: 15,
            fontWeight: 700,
            padding: "14px",
            borderRadius: 8,
            border: "none",
            cursor: status === "submitting" ? "not-allowed" : "pointer",
            minHeight: 48,
            transition: "background 0.15s",
          }}
          aria-busy={status === "submitting"}
        >
          {status === "submitting" ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ color: "#64748B", ...GF, fontSize: 13 }}>
          Don't have an account?{" "}
        </span>
        <Link
          to={`/create-account?returnTo=${encodeURIComponent(redirectTo)}`}
          style={{
            color: "#0078D4",
            ...GF,
            fontSize: 13,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Create one free
        </Link>
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
    </>
  );
}
