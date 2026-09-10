// C13 update — adds password + confirm password fields.
// On mock success: sets pendingUser in OnboardingContext, navigates to /verify-email.
// Password is NEVER logged or stored.

import { useState, useRef } from "react";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router";
import {
  parsePlanId,
  PLAN_DISPLAY_NAMES,
  type SubmissionStatus,
  type FormErrors,
  type CreateAccountRequest,
} from "../../models/forms";
import { conversionTracker } from "../../services/public";
import { useOnboarding } from "../../context/OnboardingContext";
import { usePlatform } from "../../context/PlatformContext";
import { checkPassword, isPasswordAcceptable } from "../../models/auth";
import { sanitizeAppReturnTo, DEFAULT_RETURN_PATH } from "../../utils/authReturnPath";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INTENDED_USE_OPTIONS = [
  { value: "", label: "Select your intended use" },
  { value: "individual-signing", label: "Personal document signing" },
  { value: "legal-professional", label: "Legal professional" },
  { value: "business-team", label: "Business team" },
  { value: "government", label: "Government or LGU" },
  { value: "hr-recruitment", label: "HR and recruitment" },
  { value: "finance", label: "Finance or accounting" },
  { value: "procurement", label: "Procurement" },
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare or wellness" },
  { value: "other", label: "Other" },
];

function InputField({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  required,
  autocomplete,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  autocomplete?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "block",
          color: "#64748B",
          ...GF,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 5,
        }}
      >
        {label}
        {required ? (
          <span aria-hidden style={{ color: "#ef4444" }}>
            {" "}
            *
          </span>
        ) : (
          <span style={{ color: "#64748B" }}> (optional)</span>
        )}
      </label>
      {hint && (
        <p
          id={`${id}-hint`}
          style={{
            color: "#64748B",
            ...GF,
            fontSize: 11,
            marginBottom: 5,
            lineHeight: 1.4,
          }}
        >
          {hint}
        </p>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autocomplete}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={
          [error ? `${id}-err` : null, hint ? `${id}-hint` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#ffffff",
          border: `1px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(0,0,0,0.08)"}`,
          borderRadius: 8,
          color: "#07111F",
          ...GF,
          fontSize: 14,
          padding: "11px 14px",
          outline: "none",
          transition: "border-color 0.15s",
        }}
      />
      {error && (
        <p
          id={`${id}-err`}
          role="alert"
          style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function PwReq({ met, children }: { met: boolean; children: string }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        color: met ? "#0078D4" : "#94A3B8",
        ...GF,
        fontSize: 11,
        margin: 0,
      }}
    >
      <span aria-hidden style={{ fontSize: 9 }}>
        {met ? "✓" : "○"}
      </span>
      {children}
    </li>
  );
}

export function CreateAccount() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const platform = usePlatform();
  const planId = parsePlanId(params.get("plan"));
  const source = params.get("source") ?? undefined;
  const returnTo = sanitizeAppReturnTo(
    params.get("returnTo") ?? params.get("redirect"),
  );
  const { setPendingUser, setReturnTo } = useOnboarding();

  const [fields, setFields] = useState<CreateAccountRequest>({
    name: "",
    email: "",
    organization: "",
    intendedUse: "",
    consent: false,
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<
    FormErrors & { password?: string; confirm?: string }
  >({});
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Already signed in — account creation is a continuation boundary, not a
  // form to fill out again. Send the visitor straight through.
  if (platform.sessionStatus === "authenticated") {
    return <Navigate to={returnTo} replace />;
  }

  const set = <K extends keyof CreateAccountRequest>(
    k: K,
    v: CreateAccountRequest[K],
  ) => setFields((f) => ({ ...f, [k]: v }));

  const pwChecks = checkPassword(password);
  const pwOk = isPasswordAcceptable(password);
  const matchOk = password === confirm && confirm.length > 0;

  function validate(): typeof errors {
    const e: typeof errors = {};
    if (!fields.name.trim()) e.name = "Full name is required";
    else if (fields.name.trim().length < 2)
      e.name = "Enter at least 2 characters";
    if (!fields.email.trim()) e.email = "Email address is required";
    else if (!EMAIL_RE.test(fields.email.trim()))
      e.email = "Enter a valid email address";
    if (!pwOk) e.password = "Password must be at least 8 characters";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (!matchOk) e.confirm = "Passwords do not match";
    if (!fields.consent) e.consent = "Please confirm to continue";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatus("idle");
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }
    setErrors({});
    setStatus("submitting");
    conversionTracker.track({
      name: "create_account_started",
      source,
      planId: planId ?? undefined,
    });

    // Mock delay — password is NOT logged.
    await new Promise((r) => setTimeout(r, 700));
    conversionTracker.track({
      name: "create_account_mock_completed",
      planId: planId ?? undefined,
    });

    // Set pending user for the verification flow
    const name = fields.name.trim();
    setPendingUser({
      email: fields.email.trim().toLowerCase(),
      displayName: name,
      authStatus: "email-verification-required",
    });

    // Preserve the intended destination across the mandatory verify-email →
    // onboarding wizard, so a visitor who started from e.g. an expired /app
    // link lands back there instead of the generic dashboard once setup
    // completes. Only worth keeping when it differs from the default.
    setReturnTo(returnTo !== DEFAULT_RETURN_PATH ? returnTo : null);

    // Navigate to verify-email
    navigate("/verify-email?returnTo=/onboarding/profile", { replace: true });
  }

  const planName = planId ? PLAN_DISPLAY_NAMES[planId] : null;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        {planName && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,120,212,0.1)",
              border: "1px solid rgba(0,120,212,0.2)",
              borderRadius: 6,
              padding: "5px 12px",
            }}
          >
            <span
              style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700 }}
            >
              SELECTED PLAN
            </span>
            <span
              style={{ color: "#07111F", ...GF, fontSize: 12, fontWeight: 600 }}
            >
              {planName}
            </span>
            <Link
              to="/pricing"
              style={{
                color: "#64748B",
                ...GF,
                fontSize: 11,
                textDecoration: "none",
              }}
            >
              Change
            </Link>
          </div>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-label="Form errors"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 18,
            outline: "none",
          }}
        >
          <p
            style={{
              color: "#ef4444",
              ...GF,
              fontSize: 13,
              fontWeight: 600,
              margin: "0 0 6px",
            }}
          >
            Please correct the following:
          </p>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {Object.values(errors).map(
              (msg) =>
                msg && (
                  <li
                    key={msg}
                    style={{
                      color: "#ef4444",
                      ...GF,
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    {msg}
                  </li>
                ),
            )}
          </ul>
        </div>
      )}
      {status === "error" && serverError && (
        <div
          role="alert"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 18,
          }}
        >
          <p style={{ color: "#ef4444", ...GF, fontSize: 13, margin: 0 }}>
            {serverError}
          </p>
          <button
            onClick={() => setStatus("idle")}
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
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Create account form"
        className="create-account-form"
      >
        <div className="create-account-field-grid">
          <InputField
            id="ca-name"
            label="Full name"
            value={fields.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
            required
            autocomplete="name"
            placeholder="e.g., Alex Morgan"
          />
          <InputField
            id="ca-email"
            label="Email address"
            type="email"
            value={fields.email}
            onChange={(v) => set("email", v)}
            error={errors.email}
            required
            autocomplete="email"
            placeholder="name@company.com"
          />
        </div>

        <div className="create-account-field-grid">
          <InputField
            id="ca-org"
            label="Organization"
            value={fields.organization ?? ""}
            onChange={(v) => set("organization", v)}
            autocomplete="organization"
            placeholder="Company or organization name"
          />
          <div>
            <label
              htmlFor="ca-use"
              style={{
                display: "block",
                color: "#64748B",
                ...GF,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              Intended use <span style={{ color: "#64748B" }}>(optional)</span>
            </label>
            <select
              id="ca-use"
              value={fields.intendedUse ?? ""}
              onChange={(e) => set("intendedUse", e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                color: "#07111F",
                ...GF,
                fontSize: 14,
                padding: "11px 14px",
                cursor: "pointer",
              }}
            >
              {INTENDED_USE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="create-account-field-grid">
          {/* Password */}
          <div>
            <label
              htmlFor="ca-pw"
              style={{
                display: "block",
                color: "#64748B",
                ...GF,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              Password{" "}
              <span aria-hidden style={{ color: "#ef4444" }}>
                *
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="ca-pw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-required
                aria-invalid={!!errors.password}
                aria-describedby="ca-pw-reqs"
                placeholder="Create a secure password"
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
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
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
                  padding: 4,
                }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <p
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
            {password.length > 0 && (
              <ul
                id="ca-pw-reqs"
                aria-label="Password requirements"
                style={{
                  margin: "8px 0 0",
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <PwReq met={pwChecks.minLength}>At least 8 characters</PwReq>
                <PwReq met={pwChecks.hasUppercase}>One uppercase letter</PwReq>
                <PwReq met={pwChecks.hasNumber}>One number</PwReq>
              </ul>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="ca-confirm"
              style={{
                display: "block",
                color: "#64748B",
                ...GF,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              Confirm password{" "}
              <span aria-hidden style={{ color: "#ef4444" }}>
                *
              </span>
            </label>
            <input
              id="ca-confirm"
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              aria-required
              aria-invalid={confirm.length > 0 && !matchOk}
              placeholder="Re-enter your password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#ffffff",
                border: `1px solid ${confirm.length > 0 && !matchOk ? "rgba(239,68,68,0.4)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: 8,
                color: "#07111F",
                ...GF,
                fontSize: 14,
                padding: "11px 14px",
                outline: "none",
              }}
            />
            {errors.confirm && (
              <p
                role="alert"
                style={{
                  color: "#ef4444",
                  ...GF,
                  fontSize: 12,
                  margin: "4px 0 0",
                }}
              >
                {errors.confirm}
              </p>
            )}
            {confirm.length > 0 && matchOk && (
              <p
                style={{
                  color: "#0078D4",
                  ...GF,
                  fontSize: 12,
                  margin: "4px 0 0",
                }}
              >
                Passwords match.
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            background: "#f8fafb",
            border: errors.consent
              ? "1px solid rgba(239,68,68,0.3)"
              : "1px solid rgba(0,0,0,0.08)",
            borderRadius: 8,
            padding: "12px 14px",
          }}
        >
          <label
            style={{
              display: "flex",
              gap: 10,
              cursor: "pointer",
              alignItems: "flex-start",
            }}
          >
            <input
              type="checkbox"
              id="ca-consent"
              checked={fields.consent}
              onChange={(e) => set("consent", e.target.checked)}
              aria-describedby={errors.consent ? "ca-consent-err" : undefined}
              style={{ marginTop: 2, flexShrink: 0, accentColor: AZURE }}
            />
            <span
              style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.6 }}
            >
              I agree to LAGDA's{" "}
              <Link
                to="/legal/terms"
                style={{ color: "#0078D4", textDecoration: "none" }}
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                to="/legal/privacy"
                style={{ color: "#0078D4", textDecoration: "none" }}
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.consent && (
            <p
              id="ca-consent-err"
              role="alert"
              style={{
                color: "#ef4444",
                ...GF,
                fontSize: 12,
                margin: "4px 0 0",
              }}
            >
              {errors.consent}
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
          {status === "submitting" ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ color: "#64748B", ...GF, fontSize: 13 }}>
          Already have an account?{" "}
        </span>
        <Link
          to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
          style={{
            color: "#0078D4",
            ...GF,
            fontSize: 13,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Sign In
        </Link>
      </div>

      <style>{`
        .create-account-form { display: flex; flex-direction: column; gap: 18px; }
        .create-account-field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: start; }
        @media (max-width: 680px) {
          .create-account-field-grid { grid-template-columns: 1fr; gap: 16px; }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>
    </>
  );
}
