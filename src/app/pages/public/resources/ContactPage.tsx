import { useState } from "react";
import {
  ResourcesPageShell, ResourcesSection,
} from "../../../components/resources/ResourceComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

type FormState = "idle" | "submitting" | "success" | "error";

interface ContactForm {
  name: string;
  email: string;
  organization: string;
  role: string;
  category: string;
  subject: string;
  message: string;
  phone: string;
  consent: boolean;
}

const CATEGORIES = [
  "Sales",
  "Product question",
  "Account support",
  "Billing question",
  "Security or privacy",
  "Document Verification concern",
  "Partnership",
  "eNotary waitlist question",
  "Other",
];

const EMPTY: ContactForm = { name: "", email: "", organization: "", role: "", category: "", subject: "", message: "", phone: "", consent: false };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p role="alert" style={{ color: "#ef4444", ...GF, fontSize: 12, margin: "4px 0 0" }}>{msg}</p>;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} style={{ color: "#94a3b8", ...GF, fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
      {children}{required && <span style={{ color: "#ef4444", marginLeft: 3 }} aria-hidden>*</span>}
    </label>
  );
}

function Input({ id, type = "text", value, onChange, placeholder, autocomplete }: { id: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; autocomplete?: string }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autocomplete}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8, padding: "11px 14px", color: "white", ...GF, fontSize: 14,
        outline: "none", minHeight: 44,
      }}
      onFocus={e => (e.target as HTMLInputElement).style.borderColor = "#0078D4"}
      onBlur={e => (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)"}
    />
  );
}

function validate(form: ContactForm) {
  const errors: Partial<Record<keyof ContactForm, string>> = {};
  if (!form.name.trim())          errors.name = "Name is required";
  if (!form.email.trim())         errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address";
  if (!form.category)             errors.category = "Please select a contact category";
  if (!form.subject.trim())       errors.subject = "Subject is required";
  if (form.message.trim().length < 10) errors.message = "Message must be at least 10 characters";
  if (!form.consent)              errors.consent = "Please acknowledge before submitting";
  return errors;
}

export function ContactPage() {
  const [form, setForm]           = useState<ContactForm>(EMPTY);
  const [errors, setErrors]       = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [state, setState]         = useState<FormState>("idle");
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof ContactForm) => (value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setState("submitting");
    setTimeout(() => {
      setState(Math.random() > 0.1 ? "success" : "error");
      setSubmitted(true);
    }, 900);
  };

  if (state === "success") {
    return (
      <ResourcesPageShell>
        <ResourcesSection id="success">
          <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h1 style={{ color: "white", ...GF, fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Message received.</h1>
            <p style={{ color: "#64748b", ...GF, fontSize: 15, lineHeight: 1.65, marginBottom: 20 }}>
              Your message has been validated in this frontend demonstration. Live message delivery will be connected during backend integration.
            </p>
            <div style={{ background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>FRONTEND DEMONSTRATION</p>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>No message has been transmitted. Contact form delivery requires backend integration.</p>
            </div>
            <button onClick={() => { setForm(EMPTY); setState("idle"); setSubmitted(false); }} style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "11px 24px", borderRadius: 8, border: "none", cursor: "pointer", minHeight: 44 }}>Send another message</button>
          </div>
        </ResourcesSection>
      </ResourcesPageShell>
    );
  }

  return (
    <ResourcesPageShell>
      <section style={{ padding: "64px 24px 32px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>CONTACT</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 16px" }}>Contact LAGDA</h1>
          <p style={{ color: "#64748b", ...GF, fontSize: 15, lineHeight: 1.65 }}>Sales, product questions, account support, and partnership inquiries.</p>
        </div>
      </section>

      <ResourcesSection id="form">
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* Sensitive data warning */}
          <div style={{ background: "rgba(201,150,12,0.08)", border: "1px solid rgba(201,150,12,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 28 }}>
            <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>SENSITIVE INFORMATION WARNING</p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Do not include passwords, one-time codes, government ID numbers, payment details, confidential document content, or other highly sensitive information in this form.
            </p>
          </div>

          {state === "error" && (
            <div role="alert" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ color: "#ef4444", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Submission error</p>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 13, margin: 0 }}>Something went wrong. Please try again.</p>
              <button onClick={() => setState("idle")} style={{ color: "#38bdf8", background: "none", border: "none", cursor: "pointer", ...GF, fontSize: 13, padding: 0, marginTop: 8 }}>Try again</button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gap: 20 }} className="contact-grid">
              <div>
                <Label htmlFor="c-name" required>Full name</Label>
                <Input id="c-name" value={form.name} onChange={set("name")} autocomplete="name" placeholder="Your full name" />
                <FieldError msg={errors.name} />
              </div>
              <div>
                <Label htmlFor="c-email" required>Work email</Label>
                <Input id="c-email" type="email" value={form.email} onChange={set("email")} autocomplete="email" placeholder="you@organization.com" />
                <FieldError msg={errors.email} />
              </div>
              <div>
                <Label htmlFor="c-org">Organization</Label>
                <Input id="c-org" value={form.organization} onChange={set("organization")} autocomplete="organization" placeholder="Your organization" />
              </div>
              <div>
                <Label htmlFor="c-role">Your role</Label>
                <Input id="c-role" value={form.role} onChange={set("role")} autocomplete="organization-title" placeholder="e.g. Lawyer, HR Manager, IT Administrator" />
              </div>
            </div>

            <div>
              <Label htmlFor="c-category" required>Contact category</Label>
              <select id="c-category" value={form.category} onChange={e => set("category")(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "11px 14px", color: form.category ? "white" : "#64748b", ...GF, fontSize: 14, outline: "none", minHeight: 44 }}>
                <option value="">Select a category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <FieldError msg={errors.category} />
            </div>

            <div>
              <Label htmlFor="c-subject" required>Subject</Label>
              <Input id="c-subject" value={form.subject} onChange={set("subject")} placeholder="Brief description of your inquiry" />
              <FieldError msg={errors.subject} />
            </div>

            <div>
              <Label htmlFor="c-message" required>Message</Label>
              <textarea
                id="c-message"
                value={form.message}
                onChange={e => set("message")(e.target.value)}
                rows={5}
                placeholder="Describe your question or requirement…"
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "11px 14px", color: "white", ...GF, fontSize: 14, outline: "none", resize: "vertical", minHeight: 120 }}
                onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "#0078D4"}
                onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,0.1)"}
              />
              <FieldError msg={errors.message} />
            </div>

            <div>
              <Label htmlFor="c-phone">Phone (optional)</Label>
              <Input id="c-phone" type="tel" value={form.phone} onChange={set("phone")} autocomplete="tel" placeholder="+63 (optional)" />
            </div>

            <div>
              <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  id="c-consent"
                  checked={form.consent}
                  onChange={e => set("consent")(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: "#0078D4", cursor: "pointer" }}
                />
                <span style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55 }}>
                  I acknowledge that this form is a frontend demonstration. I understand no message will be delivered until backend integration is complete. I agree not to include sensitive personal or confidential information in this form.
                </span>
              </label>
              <FieldError msg={errors.consent} />
            </div>

            <div style={{ paddingTop: 4 }}>
              <button
                type="submit"
                disabled={state === "submitting"}
                style={{ background: state === "submitting" ? "#334155" : "#0078D4", color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "13px 32px", borderRadius: 8, border: "none", cursor: state === "submitting" ? "not-allowed" : "pointer", minHeight: 48, opacity: state === "submitting" ? 0.7 : 1, transition: "all 0.15s" }}
              >
                {state === "submitting" ? "Submitting…" : "Send Message"}
              </button>
            </div>
          </form>
        </div>
        <style>{`.contact-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .contact-grid { grid-template-columns: 1fr; } }`}</style>
      </ResourcesSection>
    </ResourcesPageShell>
  );
}
