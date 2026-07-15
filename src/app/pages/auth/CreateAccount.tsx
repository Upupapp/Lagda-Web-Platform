import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import {
  parsePlanId, PLAN_DISPLAY_NAMES,
  type SubmissionStatus, type FormErrors, type CreateAccountRequest,
} from "../../models/forms";
import { publicAccountService, conversionTracker } from "../../services/public";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INTENDED_USE_OPTIONS = [
  { value: "",                     label: "Select…" },
  { value: "individual-signing",   label: "Personal document signing" },
  { value: "legal-professional",   label: "Legal professional" },
  { value: "business-team",        label: "Business team" },
  { value: "government",           label: "Government or LGU" },
  { value: "hr-recruitment",       label: "HR and recruitment" },
  { value: "finance",              label: "Finance or accounting" },
  { value: "procurement",          label: "Procurement" },
  { value: "education",            label: "Education" },
  { value: "healthcare",           label: "Healthcare or wellness" },
  { value: "other",                label: "Other" },
];

function InputField({
  id, label, type = "text", value, onChange, error, required, autocomplete, placeholder, hint,
}: {
  id: string; label: string; type?: string; value: string; onChange: (v: string) => void;
  error?: string; required?: boolean; autocomplete?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
        {label}{required && <span aria-hidden style={{ color: "#ef4444" }}> *</span>}
        {!required && <span style={{ color: "#475569" }}> (optional)</span>}
      </label>
      {hint && <p id={`${id}-hint`} style={{ color: "#475569", ...GF, fontSize: 11, marginBottom: 5, lineHeight: 1.4 }}>{hint}</p>}
      <input
        id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autocomplete} placeholder={placeholder}
        aria-required={required} aria-invalid={!!error}
        aria-describedby={[error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.05)", border: `1px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 8, color: "white", ...GF, fontSize: 14, padding: "11px 14px", outline: "none",
          transition: "border-color 0.15s",
        }}
      />
      {error && <p id={`${id}-err`} role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

export function CreateAccount() {
  const [params] = useSearchParams();
  const planId = parsePlanId(params.get("plan"));
  const source = params.get("source") ?? undefined;

  const [fields, setFields] = useState<CreateAccountRequest>({ name: "", email: "", organization: "", intendedUse: "", consent: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof CreateAccountRequest>(k: K, v: CreateAccountRequest[K]) =>
    setFields((f) => ({ ...f, [k]: v }));

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!fields.name.trim()) e.name = "Full name is required";
    else if (fields.name.trim().length < 2) e.name = "Enter at least 2 characters";
    if (!fields.email.trim()) e.email = "Work email is required";
    else if (!EMAIL_RE.test(fields.email.trim())) e.email = "Enter a valid email address";
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
    conversionTracker.track({ name: "create_account_started", source, planId: planId ?? undefined });
    const result = await publicAccountService.createAccount(fields);
    if (result.success) {
      setStatus("success");
      conversionTracker.track({ name: "create_account_mock_completed", planId: planId ?? undefined });
      setTimeout(() => confirmRef.current?.focus(), 50);
    } else {
      setStatus(result.errorCode === "duplicate" ? "duplicate" : "error");
      setServerError(result.errorMessage ?? "An error occurred. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div ref={confirmRef} tabIndex={-1} style={{ outline: "none" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20 }} aria-hidden>✓</div>
          <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 8px" }}>Account setup started</h1>
        </div>
        <div style={{ background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }} role="status">
          <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            Your account information has been validated in this frontend demonstration. Secure registration and account creation will be connected during backend integration.
          </p>
        </div>
        {planId && planId !== "enterprise" && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0 }}>
              Selected plan: <strong style={{ color: "white" }}>{PLAN_DISPLAY_NAMES[planId]}</strong> — You can change your plan after account setup.
            </p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link to="/esignature" style={{ display: "block", textAlign: "center", background: AZURE, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px", borderRadius: 8, textDecoration: "none" }}>Explore LAGDA eSignature</Link>
          <Link to="/pricing" style={{ display: "block", textAlign: "center", background: "rgba(255,255,255,0.06)", color: "white", ...GF, fontSize: 14, fontWeight: 600, padding: "12px", borderRadius: 8, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}>View Plans</Link>
        </div>
      </div>
    );
  }

  const planName = planId ? PLAN_DISPLAY_NAMES[planId] : null;

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Create your LAGDA account</h1>
        <p style={{ color: "#64748b", ...GF, fontSize: 13 }}>
          Start signing and managing documents online.
        </p>
        {planName && (
          <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 6, padding: "5px 12px" }}>
            <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700 }}>SELECTED PLAN</span>
            <span style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600 }}>{planName}</span>
            <Link to="/pricing" style={{ color: "#64748b", ...GF, fontSize: 11, textDecoration: "none" }}>Change</Link>
          </div>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" aria-label="Form errors" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 18, outline: "none" }}>
          <p style={{ color: "#ef4444", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>Please correct the following:</p>
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {Object.values(errors).map((msg) => <li key={msg} style={{ color: "#ef4444", ...GF, fontSize: 12, lineHeight: 1.5 }}>{msg}</li>)}
          </ul>
        </div>
      )}
      {(status === "error" || status === "duplicate") && serverError && (
        <div role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 18 }}>
          <p style={{ color: "#ef4444", ...GF, fontSize: 13, margin: 0 }}>{serverError}</p>
          {status === "error" && <button onClick={() => setStatus("idle")} style={{ color: "#38bdf8", ...GF, fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", display: "block" }}>Try again</button>}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="Create account form" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <InputField id="ca-name" label="Full name" value={fields.name} onChange={(v) => set("name", v)} error={errors.name} required autocomplete="name" />
        <InputField id="ca-email" label="Work email" type="email" value={fields.email} onChange={(v) => set("email", v)} error={errors.email} required autocomplete="email" placeholder="you@organization.com" />
        <InputField id="ca-org" label="Organization" value={fields.organization ?? ""} onChange={(v) => set("organization", v)} error={errors.organization} autocomplete="organization" />

        <div>
          <label htmlFor="ca-use" style={{ display: "block", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
            Intended use <span style={{ color: "#475569" }}>(optional)</span>
          </label>
          <select id="ca-use" value={fields.intendedUse ?? ""} onChange={(e) => set("intendedUse", e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "white", ...GF, fontSize: 14, padding: "11px 14px", cursor: "pointer" }}>
            {INTENDED_USE_OPTIONS.map(({ value, label }) => <option key={value} value={value} style={{ background: "#07111F" }}>{label}</option>)}
          </select>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: errors.consent ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 14px" }}>
          <label style={{ display: "flex", gap: 10, cursor: "pointer", alignItems: "flex-start" }}>
            <input type="checkbox" id="ca-consent" checked={fields.consent} onChange={(e) => set("consent", e.target.checked)}
              aria-describedby={errors.consent ? "ca-consent-err" : undefined} style={{ marginTop: 2, flexShrink: 0, accentColor: AZURE }} />
            <span style={{ color: "#94a3b8", ...GF, fontSize: 12, lineHeight: 1.6 }}>
              I agree to LAGDA's <Link to="/legal/terms" style={{ color: "#38bdf8", textDecoration: "none" }}>Terms of Service</Link> and <Link to="/legal/privacy" style={{ color: "#38bdf8", textDecoration: "none" }}>Privacy Policy</Link>.
            </span>
          </label>
          {errors.consent && <p id="ca-consent-err" role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{errors.consent}</p>}
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, padding: "10px 12px" }}>
          <p style={{ color: "#334155", ...GF, fontSize: 11, lineHeight: 1.6, margin: 0 }}>
            Do not include passwords, government ID numbers, confidential documents, payment details, or other highly sensitive information in optional fields.
          </p>
        </div>

        <button type="submit" disabled={status === "submitting"}
          style={{ background: status === "submitting" ? "rgba(0,120,212,0.5)" : AZURE, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", borderRadius: 8, border: "none", cursor: status === "submitting" ? "not-allowed" : "pointer", minHeight: 48, transition: "background 0.15s" }}
          aria-busy={status === "submitting"}>
          {status === "submitting" ? "Setting up…" : "Continue Account Setup"}
        </button>

        <div style={{ padding: "12px 14px", background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.15)", borderRadius: 8 }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, marginBottom: 4 }}>FRONTEND DEMONSTRATION</p>
          <p style={{ color: "#475569", ...GF, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            No account is created during this demonstration phase. Secure registration will be connected during backend integration.
          </p>
        </div>
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ color: "#64748b", ...GF, fontSize: 13 }}>Already have an account? </span>
        <Link to="/sign-in" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Sign In</Link>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
        <p style={{ color: "#334155", ...GF, fontSize: 11, lineHeight: 1.55, margin: 0 }}>
          LAGDA eNotary is a separate future regulated product — creating a LAGDA account does not grant eNotary access.
        </p>
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
    </>
  );
}
