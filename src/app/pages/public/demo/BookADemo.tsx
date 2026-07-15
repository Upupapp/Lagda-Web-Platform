import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import {
  parseDemoTopic, parseSolutionId,
  DEMO_TOPIC_LABELS, SOLUTION_DISPLAY_NAMES, ORG_SIZE_LABELS, INQUIRY_ROLE_LABELS,
  type SubmissionStatus, type FormErrors, type DemoRequest, type DemoTopic,
  VALID_DEMO_TOPICS,
} from "../../../models/forms";
import { demoRequestService, conversionTracker } from "../../../services/public";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";
const BURGUNDY = "#67023B";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INDUSTRY_OPTIONS = [
  "", "Legal services", "Financial services", "Real estate", "Government / LGU",
  "Healthcare", "Education", "HR and recruitment", "Procurement", "Technology",
  "Logistics", "Manufacturing", "Non-profit", "Other",
];

const ENOTARY_DISCLAIMER = "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. Selecting eNotary updates as an interest does not enrol you in any active service.";

function Field({ id, label, children, error, required, optional }: { id: string; label: string; children: React.ReactNode; error?: string; required?: boolean; optional?: boolean }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
        {label}
        {required && <span aria-hidden style={{ color: "#ef4444" }}> *</span>}
        {optional && <span style={{ color: "#475569" }}> (optional)</span>}
      </label>
      {children}
      {error && <p id={`${id}-err`} role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "white", fontFamily: "'Geist', sans-serif", fontSize: 14, padding: "11px 14px", outline: "none" };

const INITIAL_FIELDS: DemoRequest = { name: "", email: "", organization: "", role: "", orgSize: "", industry: "", primaryInterest: "", message: "", consent: false };

export function BookADemo() {
  const [params] = useSearchParams();
  const topicRaw = params.get("topic");
  const solutionRaw = params.get("solution");
  const parsedTopic = parseDemoTopic(topicRaw);
  const parsedSolution = parseSolutionId(solutionRaw);

  const [fields, setFields] = useState<DemoRequest>({
    ...INITIAL_FIELDS,
    primaryInterest: parsedTopic ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof DemoRequest>(k: K, v: DemoRequest[K]) => setFields((f) => ({ ...f, [k]: v }));

  const isEnotaryInterest = fields.primaryInterest === "enotary-updates";

  useEffect(() => {
    conversionTracker.track({ name: "demo_request_started", topic: parsedTopic ?? undefined, solution: parsedSolution ?? undefined });
  }, []);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!fields.name.trim() || fields.name.trim().length < 2) e.name = "Full name is required";
    if (!fields.email.trim()) e.email = "Work email is required";
    else if (!EMAIL_RE.test(fields.email.trim())) e.email = "Enter a valid email address";
    if (!fields.organization.trim()) e.organization = "Organization is required";
    if (!fields.primaryInterest) e.primaryInterest = "Please select your primary interest";
    if (!fields.consent) e.consent = "Please confirm to continue";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTimeout(() => errorRef.current?.focus(), 50);
      conversionTracker.track({ name: "form_validation_failed", destination: "/book-a-demo" });
      return;
    }
    setErrors({});
    setServerError(null);
    setStatus("submitting");
    const result = await demoRequestService.submitDemoRequest(fields);
    if (result.success) {
      setStatus("success");
      conversionTracker.track({ name: "demo_request_mock_completed", topic: parsedTopic ?? undefined });
      setTimeout(() => confirmRef.current?.focus(), 50);
    } else {
      setStatus("error");
      setServerError(result.errorMessage ?? "An error occurred. Please try again.");
      setTimeout(() => errorRef.current?.focus(), 50);
    }
  }

  if (status === "success") {
    return (
      <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div ref={confirmRef} tabIndex={-1} style={{ outline: "none" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }} aria-hidden>✓</div>
            <h1 style={{ color: "white", ...GF, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, margin: "0 0 12px" }}>Demo request received</h1>
            <div style={{ background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }} role="status">
              <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                Your demo request has been validated in this frontend demonstration. Live scheduling and sales follow-up will be connected during backend integration.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/esignature/team-and-enterprise" style={{ background: AZURE, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 22px", borderRadius: 8, textDecoration: "none" }}>Explore Team and Enterprise</Link>
              <Link to="/security/trust-center" style={{ background: "rgba(255,255,255,0.06)", color: "white", ...GF, fontSize: 14, fontWeight: 600, padding: "12px 22px", borderRadius: 8, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}>Visit Trust Center</Link>
            </div>
            <Link to="/" style={{ display: "block", color: "#64748b", ...GF, fontSize: 13, textDecoration: "none", marginTop: 20 }}>← Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
      <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>BOOK A DEMO</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
            See LAGDA in action
          </h1>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
            Tell us about your organization and workflows. We'll show you how LAGDA eSignature can help.
          </p>
          {parsedSolution && (
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 6, padding: "5px 12px" }}>
              <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700 }}>CONTEXT</span>
              <span style={{ color: "white", ...GF, fontSize: 12 }}>{SOLUTION_DISPLAY_NAMES[parsedSolution]}</span>
              <Link to="/book-a-demo" style={{ color: "#64748b", ...GF, fontSize: 11, textDecoration: "none" }}>Clear</Link>
            </div>
          )}
        </div>
      </section>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Sensitive data warning */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "11px 14px", marginBottom: 24 }}>
          <p style={{ color: "#475569", ...GF, fontSize: 12, lineHeight: 1.55, margin: 0 }}>
            Do not include passwords, government ID numbers, confidential document content, payment details, case-sensitive legal information, or other highly sensitive personal data in the message field.
          </p>
        </div>

        {serverError && (
          <div ref={errorRef} tabIndex={-1} role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 18, outline: "none" }}>
            <p style={{ color: "#ef4444", ...GF, fontSize: 13, margin: 0 }}>{serverError}</p>
            <button onClick={() => { setServerError(null); setStatus("idle"); }} style={{ color: "#38bdf8", ...GF, fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "4px 0 0" }}>Try again</button>
          </div>
        )}
        {Object.keys(errors).length > 0 && !serverError && (
          <div ref={errorRef} tabIndex={-1} role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 18, outline: "none" }}>
            <p style={{ color: "#ef4444", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>Please correct the following:</p>
            <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
              {Object.values(errors).map((m) => <li key={m} style={{ color: "#ef4444", ...GF, fontSize: 12, lineHeight: 1.5 }}>{m}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label="Book a demo form" style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <Field id="demo-name" label="Full name" error={errors.name} required>
              <input id="demo-name" type="text" value={fields.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" aria-required aria-invalid={!!errors.name} aria-describedby={errors.name ? "demo-name-err" : undefined} style={{ ...inputStyle, borderColor: errors.name ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)" }} />
            </Field>
            <Field id="demo-email" label="Work email" error={errors.email} required>
              <input id="demo-email" type="email" value={fields.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" aria-required aria-invalid={!!errors.email} aria-describedby={errors.email ? "demo-email-err" : undefined} style={{ ...inputStyle, borderColor: errors.email ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)" }} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <Field id="demo-org" label="Organization" error={errors.organization} required>
              <input id="demo-org" type="text" value={fields.organization} onChange={(e) => set("organization", e.target.value)} autoComplete="organization" aria-required aria-invalid={!!errors.organization} aria-describedby={errors.organization ? "demo-org-err" : undefined} style={{ ...inputStyle, borderColor: errors.organization ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)" }} />
            </Field>
            <Field id="demo-role" label="Your role" optional>
              <select id="demo-role" value={fields.role} onChange={(e) => set("role", e.target.value as DemoRequest["role"])} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="" style={{ background: "#07111F" }}>Select…</option>
                {(Object.entries(INQUIRY_ROLE_LABELS) as [string, string][]).map(([v, l]) => <option key={v} value={v} style={{ background: "#07111F" }}>{l}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <Field id="demo-size" label="Organization size" optional>
              <select id="demo-size" value={fields.orgSize} onChange={(e) => set("orgSize", e.target.value as DemoRequest["orgSize"])} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="" style={{ background: "#07111F" }}>Select…</option>
                {(Object.entries(ORG_SIZE_LABELS) as [string, string][]).map(([v, l]) => <option key={v} value={v} style={{ background: "#07111F" }}>{l}</option>)}
              </select>
            </Field>
            <Field id="demo-industry" label="Industry" optional>
              <select id="demo-industry" value={fields.industry} onChange={(e) => set("industry", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o} style={{ background: "#07111F" }}>{o || "Select…"}</option>)}
              </select>
            </Field>
          </div>

          <Field id="demo-interest" label="Primary interest" error={errors.primaryInterest} required>
            <select id="demo-interest" value={fields.primaryInterest} onChange={(e) => set("primaryInterest", e.target.value as DemoTopic | "")} aria-required aria-invalid={!!errors.primaryInterest} aria-describedby={errors.primaryInterest ? "demo-interest-err" : undefined} style={{ ...inputStyle, cursor: "pointer", borderColor: errors.primaryInterest ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)" }}>
              <option value="" style={{ background: "#07111F" }}>Select your primary interest…</option>
              {VALID_DEMO_TOPICS.map((t) => <option key={t} value={t} style={{ background: "#07111F" }}>{DEMO_TOPIC_LABELS[t]}</option>)}
            </select>
          </Field>

          {isEnotaryInterest && (
            <div style={{ background: "rgba(103,2,59,0.08)", border: "1px solid rgba(103,2,59,0.25)", borderRadius: 9, padding: "12px 16px" }}>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                <strong style={{ color: "#67023B" }}>LAGDA eNotary is Coming Soon</strong> and Subject to Supreme Court Accreditation and applicable rules. Selecting this interest does not enrol you in any active service or schedule an eNotary demonstration.
              </p>
            </div>
          )}

          <Field id="demo-message" label="What would you like to discuss?" optional>
            <textarea id="demo-message" value={fields.message} onChange={(e) => set("message", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
          </Field>

          <div style={{ background: "rgba(255,255,255,0.03)", border: errors.consent ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 14px" }}>
            <label style={{ display: "flex", gap: 10, cursor: "pointer", alignItems: "flex-start" }}>
              <input type="checkbox" id="demo-consent" checked={fields.consent} onChange={(e) => set("consent", e.target.checked)} aria-describedby={errors.consent ? "demo-consent-err" : undefined} style={{ marginTop: 2, flexShrink: 0, accentColor: AZURE }} />
              <span style={{ color: "#94a3b8", ...GF, fontSize: 12, lineHeight: 1.6 }}>
                I understand this is a demo request and that the information I provide will be used to arrange a product demonstration when live scheduling is connected. I have read the <Link to="/legal/privacy" style={{ color: "#38bdf8", textDecoration: "none" }}>Privacy Policy</Link>.
              </span>
            </label>
            {errors.consent && <p id="demo-consent-err" role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{errors.consent}</p>}
          </div>

          <button type="submit" disabled={status === "submitting"}
            style={{ background: status === "submitting" ? "rgba(0,120,212,0.5)" : AZURE, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", borderRadius: 8, border: "none", cursor: status === "submitting" ? "not-allowed" : "pointer", minHeight: 48, transition: "background 0.15s" }}
            aria-busy={status === "submitting"}>
            {status === "submitting" ? "Submitting…" : "Request a Demo"}
          </button>

          <div style={{ padding: "12px 14px", background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.15)", borderRadius: 8 }}>
            <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, marginBottom: 4 }}>FRONTEND DEMONSTRATION</p>
            <p style={{ color: "#475569", ...GF, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
              No live scheduling or sales follow-up occurs during this demonstration phase. This will be connected during backend integration.
            </p>
          </div>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.65, margin: "0 0 10px" }}>
            Looking for something else?
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/contact?category=sales" style={{ color: "#38bdf8", ...GF, fontSize: 13, textDecoration: "none" }}>Contact Sales →</Link>
            <Link to="/pricing" style={{ color: "#64748b", ...GF, fontSize: 13, textDecoration: "none" }}>View Plans</Link>
            <Link to="/help" style={{ color: "#64748b", ...GF, fontSize: 13, textDecoration: "none" }}>Help Center</Link>
          </div>
        </div>
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
    </div>
  );
}
