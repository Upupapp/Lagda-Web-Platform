import { useState } from "react";
import {
  EnotaryPageShell, EnotaryStatusBanner, EnotaryDisclaimer,
  EnotarySection,
} from "../../../components/enotary/EnotaryComponents";
import { ENOTARY_DISCLAIMER } from "./content";
import { Link } from "react-router";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const BURGUNDY = "#67023B";

type Audience = "individual" | "organization" | "notary" | "legal-professional" | "government" | "";
type FormState = "idle" | "submitting" | "success" | "error";

interface WaitlistFields {
  name: string;
  email: string;
  organization: string;
  audience: Audience;
  interest: string;
  consent: boolean;
}

const INITIAL: WaitlistFields = { name: "", email: "", organization: "", audience: "", interest: "", consent: false };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "individual",         label: "Individual / Personal"         },
  { value: "organization",       label: "Organization / Business"       },
  { value: "notary",             label: "Notary Public"                 },
  { value: "legal-professional", label: "Legal Professional"            },
  { value: "government",         label: "Government / Regulatory Body"  },
];

const NON_GUARANTEES = [
  "Does not create a LAGDA account",
  "Does not confirm eligibility for the service",
  "Does not reserve accreditation or appoint a Notary Public",
  "Does not guarantee access to any future LAGDA eNotary service",
  "Does not constitute a commercial offer or agreement",
];

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
      {children}{required && <span aria-hidden style={{ color: "#ef4444" }}> *</span>}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{message}</p>;
}

export function EnotaryWaitlist() {
  const [fields, setFields] = useState<WaitlistFields>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof WaitlistFields, string>>>({});
  const [formState, setFormState] = useState<FormState>("idle");

  const set = <K extends keyof WaitlistFields>(key: K, value: WaitlistFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  function validate(): boolean {
    const e: Partial<Record<keyof WaitlistFields, string>> = {};
    if (!fields.name.trim()) e.name = "Name is required";
    if (!fields.email.trim()) e.email = "Email is required";
    else if (!EMAIL_RE.test(fields.email)) e.email = "Enter a valid email address";
    if (!fields.audience) e.audience = "Please select a category";
    if (!fields.consent) e.consent = "Please confirm to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setFormState("submitting");
    setTimeout(() => {
      setFormState(Math.random() > 0.08 ? "success" : "error");
    }, 900);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "white", ...GF, fontSize: 14, padding: "11px 14px", outline: "none", boxSizing: "border-box",
  };

  if (formState === "success") {
    return (
      <EnotaryPageShell>
        <EnotaryStatusBanner />
        <section style={{ padding: "80px 24px", minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 580, width: "100%", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(103,2,59,0.15)", border: "1px solid rgba(103,2,59,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>✓</div>
            <h2 style={{ color: "white", ...GF, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 900, margin: "0 0 12px" }}>Information validated</h2>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, margin: "0 0 20px" }}>
              Your information has been validated in this frontend demonstration. Live waitlist registration will be connected during backend integration.
            </p>
            <div style={{ background: "rgba(103,2,59,0.08)", border: "1px solid rgba(103,2,59,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {ENOTARY_DISCLAIMER} Your waitlist registration does not create a LAGDA account, confirm eligibility, or guarantee access to any future service.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/enotary" style={{ background: BURGUNDY, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "11px 22px", borderRadius: 7, textDecoration: "none" }}>Back to eNotary</Link>
              <Link to="/enotary/faq" style={{ background: "rgba(255,255,255,0.06)", color: "white", ...GF, fontSize: 14, fontWeight: 600, padding: "11px 22px", borderRadius: 7, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}>eNotary FAQ</Link>
            </div>
          </div>
        </section>
      </EnotaryPageShell>
    );
  }

  return (
    <EnotaryPageShell>
      <EnotaryStatusBanner />

      {/* Hero */}
      <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: BURGUNDY, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>ENOTARY / WAITLIST</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
            Join the eNotary waitlist
          </h1>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, margin: "0 0 20px" }}>
            Register to receive updates on LAGDA eNotary as we work toward Supreme Court accreditation.
          </p>
          <EnotaryDisclaimer />
        </div>
      </section>

      <EnotarySection id="form">
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          {/* What this is not */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>JOINING THE WAITLIST</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {NON_GUARANTEES.map((item) => (
                <div key={item} style={{ display: "flex", gap: 10, padding: "9px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7 }}>
                  <span style={{ color: BURGUNDY, flexShrink: 0 }}>—</span>
                  <span style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate aria-label="eNotary waitlist registration">
            {formState === "error" && (
              <div role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                <p style={{ color: "#ef4444", ...GF, fontSize: 13, margin: 0 }}>Something went wrong in this demonstration. Please try again.</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Name */}
              <div>
                <FieldLabel htmlFor="wl-name" required>Full name</FieldLabel>
                <input id="wl-name" type="text" value={fields.name} onChange={(e) => set("name", e.target.value)}
                  aria-describedby={errors.name ? "wl-name-err" : undefined}
                  aria-invalid={!!errors.name} style={{ ...inputStyle, borderColor: errors.name ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)" }} />
                <FieldError id="wl-name-err" message={errors.name} />
              </div>

              {/* Email */}
              <div>
                <FieldLabel htmlFor="wl-email" required>Email address</FieldLabel>
                <input id="wl-email" type="email" value={fields.email} onChange={(e) => set("email", e.target.value)}
                  aria-describedby={errors.email ? "wl-email-err" : undefined}
                  aria-invalid={!!errors.email} style={{ ...inputStyle, borderColor: errors.email ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)" }} />
                <FieldError id="wl-email-err" message={errors.email} />
              </div>

              {/* Organization */}
              <div>
                <FieldLabel htmlFor="wl-org">Organization (optional)</FieldLabel>
                <input id="wl-org" type="text" value={fields.organization} onChange={(e) => set("organization", e.target.value)} style={inputStyle} />
              </div>

              {/* Audience */}
              <div>
                <FieldLabel htmlFor="wl-audience" required>I am registering as</FieldLabel>
                <select id="wl-audience" value={fields.audience} onChange={(e) => set("audience", e.target.value as Audience)}
                  aria-describedby={errors.audience ? "wl-audience-err" : undefined}
                  aria-invalid={!!errors.audience}
                  style={{ ...inputStyle, cursor: "pointer", borderColor: errors.audience ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)" }}
                >
                  <option value="">Select a category…</option>
                  {AUDIENCE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <FieldError id="wl-audience-err" message={errors.audience} />
              </div>

              {/* Interest */}
              <div>
                <FieldLabel htmlFor="wl-interest">What interests you most about LAGDA eNotary? (optional)</FieldLabel>
                <textarea id="wl-interest" value={fields.interest} onChange={(e) => set("interest", e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} />
              </div>

              {/* Consent */}
              <div style={{ padding: "14px 16px", background: "rgba(103,2,59,0.06)", border: errors.consent ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(103,2,59,0.18)", borderRadius: 9 }}>
                <label style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "flex-start" }}>
                  <input type="checkbox" id="wl-consent" checked={fields.consent} onChange={(e) => set("consent", e.target.checked)}
                    aria-describedby={errors.consent ? "wl-consent-err" : undefined}
                    style={{ marginTop: 2, flexShrink: 0, accentColor: BURGUNDY }} />
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6 }}>
                    I understand that LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules, that this registration does not create an account or guarantee access, and that I may receive update emails about LAGDA eNotary.
                  </span>
                </label>
                <FieldError id="wl-consent-err" message={errors.consent} />
              </div>

              <button
                type="submit"
                disabled={formState === "submitting"}
                style={{
                  background: formState === "submitting" ? "rgba(103,2,59,0.5)" : BURGUNDY,
                  color: "white", ...GF, fontSize: 15, fontWeight: 700,
                  padding: "14px 24px", borderRadius: 8, border: "none", cursor: formState === "submitting" ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
                aria-busy={formState === "submitting"}
              >
                {formState === "submitting" ? "Registering…" : "Join the waitlist"}
              </button>

              <p style={{ color: "#7C8DA4", ...GF, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                This is a frontend demonstration. Waitlist registrations are not currently stored or processed. Live registration will be connected during backend integration.
              </p>
            </div>
          </form>
        </div>
      </EnotarySection>
    </EnotaryPageShell>
  );
}
