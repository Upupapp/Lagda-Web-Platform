import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ENOTARY_DISCLAIMER } from "./content";
import { ENOTARY_DIRECTORY_PATH } from "../../../config/enotary-directory";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { withProcess } from "../../../config/process-screens";
import { publicInquiriesService, inquiryErrorMessage } from "../../../services/real/public-inquiries.service";
import { LandingHeader, LandingFooter } from "../home/LandingChrome";

// Drawn in the landing page's style (pages/public/home): its header and
// footer, Geist, the navy buttons and the purple eNotary accent. Rendered by
// LandingLayout, so the public site's header, footer and waves are not shown.

const INK = "#0B1730";
const BODY = "#3D4A63";
const MUTED = "#4A5772";
const NAVY = "#0B3981";
const PURPLE = "#5B2A86";
const LINE = "#E3E8EF";
const ERROR = "#B42318";

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

const MORE_ENOTARY: { label: string; to: string; staticPage?: boolean }[] = [
  { label: "Notary Directory", to: ENOTARY_DIRECTORY_PATH, staticPage: true },
  { label: "Future capabilities", to: "/enotary/future-capabilities" },
  { label: "Accreditation roadmap", to: "/enotary/accreditation-roadmap" },
  { label: "eNotary FAQ", to: "/enotary/faq" },
];

const WIDE: React.CSSProperties = { maxWidth: "1240px", margin: "0 auto", boxSizing: "border-box" };

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", height: "52px", padding: "0 16px",
  border: "1px solid #C3CCD8", borderRadius: "12px", background: "#ffffff",
  color: INK, font: "16px 'Geist', sans-serif", outline: "none",
};

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", marginBottom: "8px", color: INK, fontSize: "14px", fontWeight: 600 }}>
      {children}{required && <span aria-hidden style={{ color: ERROR }}> *</span>}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" style={{ margin: "6px 0 0", color: ERROR, fontSize: "13px" }}>{message}</p>;
}

/** The accreditation disclaimer, in the landing page's purple. */
function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: "12px", background: "#F3EDFA", border: "1px solid #E2D6F3", borderLeft: `4px solid ${PURPLE}` }}>
      <p style={{ margin: 0, color: "#3E1C5E", fontSize: "14px", lineHeight: 1.6 }}>
        {children ?? (
          <>
            <strong style={{ fontWeight: 700 }}>LAGDA eNotary is Coming Soon</strong> and Subject to Supreme Court Accreditation and applicable rules. LAGDA does not currently represent this service as accredited, approved, or available.
          </>
        )}
      </p>
    </div>
  );
}

/** The landing page's shell: its header, the page, its footer. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lgl-root lgl-page" style={{ fontFamily: "'Geist', sans-serif", color: INK, background: "#ffffff", minWidth: 0 }}>
      <LandingHeader />
      {children}
      <LandingFooter />
    </div>
  );
}

function MoreAboutEnotary() {
  const tile: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
    padding: "18px 20px", borderRadius: "16px", border: `1px solid ${LINE}`, background: "#ffffff",
    color: INK, fontSize: "16px", fontWeight: 600,
  };
  return (
    <section aria-labelledby="wl-more-h" style={{ background: "#ffffff", borderTop: "1px solid #EEF1F5" }}>
      <div className="lgl-wide" style={{ ...WIDE, padding: "56px 32px 64px" }}>
        <h2 id="wl-more-h" style={{ margin: "0 0 20px", color: INK, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em" }}>
          More about LAGDA eNotary
        </h2>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {MORE_ENOTARY.map((item) => (
            <li key={item.to}>
              {item.staticPage ? (
                // A static page outside the app: a full page load.
                <a href={item.to} className="lgl-btn-ghost" style={tile}>{item.label}<span aria-hidden style={{ color: NAVY }}>→</span></a>
              ) : (
                <Link to={item.to} className="lgl-btn-ghost" style={tile}>{item.label}<span aria-hidden style={{ color: NAVY }}>→</span></Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function EnotaryWaitlist() {
  const [fields, setFields] = useState<WaitlistFields>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof WaitlistFields, string>>>({});
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorText, setErrorText] = useState("Something went wrong. Please try again.");

  // The confirmation replaces a long form: start it at the top of the page.
  useEffect(() => {
    if (formState === "success") window.scrollTo({ top: 0, behavior: "instant" });
  }, [formState]);

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

    // With a backend the sign-up is stored and the LAGDA owner is told.
    if (USE_REAL_BACKEND) {
      withProcess("enotary-waitlist", fields.name, () => publicInquiriesService.submit({
        kind: "waitlist",
        name: fields.name,
        email: fields.email,
        organization: fields.organization,
        topic: AUDIENCE_OPTIONS.find(option => option.value === fields.audience)?.label ?? fields.audience,
        message: fields.interest,
        consent: true,
      }), inquiryErrorMessage).then(() => {
        setFormState("success");
      }).catch((error: unknown) => {
        setErrorText(inquiryErrorMessage(error));
        setFormState("error");
      });
      return;
    }

    // The demo build has no server: it says so on the next screen.
    setTimeout(() => { setFormState("success"); }, 900);
  }

  const border = (bad?: string) => (bad ? ERROR : "#C3CCD8");

  if (formState === "success") {
    return (
      <Shell>
        <section aria-labelledby="wl-done-h" style={{ background: "#F7F9FC", borderBottom: "1px solid #EEF1F5" }}>
          <div className="lgl-wide" style={{ ...WIDE, padding: "96px 32px", display: "flex", justifyContent: "center" }}>
            <div style={{ maxWidth: "600px", width: "100%", textAlign: "center" }}>
              <div aria-hidden style={{ width: "64px", height: "64px", margin: "0 auto 24px", borderRadius: "50%", background: "#F3EDFA", border: "1px solid #E2D6F3", color: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 700 }}>✓</div>
              <h1 id="wl-done-h" style={{ margin: "0 0 14px", color: INK, fontSize: "clamp(32px, 3.6vw, 44px)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
                {USE_REAL_BACKEND ? "You are on the list" : "Information validated"}
              </h1>
              <p data-testid="waitlist-received" role="status" style={{ margin: "0 0 28px", color: BODY, fontSize: "17px", lineHeight: 1.6 }}>
                {USE_REAL_BACKEND
                  ? <>We will email <strong>{fields.email.trim()}</strong> when there is news about LAGDA eNotary.</>
                  : "Your information has been validated in this frontend demonstration. Nothing was sent: the live site stores the sign-up and tells LAGDA."}
              </p>
              <div style={{ textAlign: "left", marginBottom: "28px" }}>
                <Disclaimer>
                  {ENOTARY_DISCLAIMER} Your waitlist registration does not create a LAGDA account, confirm eligibility, or guarantee access to any future service.
                </Disclaimer>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href={ENOTARY_DIRECTORY_PATH} className="lgl-btn-light" style={{ display: "inline-flex", alignItems: "center", minHeight: "54px", padding: "0 28px", borderRadius: "12px", background: NAVY, color: "#ffffff", fontSize: "16px", fontWeight: 700 }}>Notary Directory</a>
                <Link to="/enotary/faq" className="lgl-btn-ghost" style={{ display: "inline-flex", alignItems: "center", minHeight: "54px", padding: "0 24px", border: "1px solid #B9C3D3", borderRadius: "12px", background: "#ffffff", color: INK, fontSize: "16px", fontWeight: 600 }}>eNotary FAQ</Link>
              </div>
            </div>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <section aria-labelledby="wl-h" style={{ background: "#F7F9FC", borderBottom: "1px solid #EEF1F5" }}>
        <div className="lgl-wide" style={{ ...WIDE, padding: "clamp(40px, 6vw, 80px) 32px clamp(48px, 7vw, 96px)", display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "48px 72px" }}>

          {/* Left: what this is */}
          <div style={{ flex: "1 1 420px", maxWidth: "560px", minWidth: 0 }}>
            <p style={{ display: "inline-flex", alignItems: "center", margin: "0 0 24px", padding: "6px 14px", borderRadius: "999px", background: "#F3EDFA", border: "1px solid #E2D6F3", color: PURPLE, fontSize: "14px", fontWeight: 600 }}>
              LAGDA eNotary · Coming soon
            </p>
            <h1 id="wl-h" style={{ margin: "0 0 20px", color: INK, fontSize: "clamp(40px, 4.6vw, 64px)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em" }}>
              Join the eNotary <span style={{ color: NAVY }}>waitlist.</span>
            </h1>
            <p style={{ margin: "0 0 28px", color: BODY, fontSize: "clamp(17px, 1.4vw, 19px)", lineHeight: 1.55 }}>
              Register to receive updates on LAGDA eNotary as we work toward Supreme Court accreditation.
            </p>
            <Disclaimer />

            {/* What this is not */}
            <div style={{ marginTop: "36px" }}>
              <h2 style={{ margin: "0 0 14px", color: PURPLE, fontSize: "15px", fontWeight: 700 }}>Joining the waitlist</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                {NON_GUARANTEES.map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "12px", color: MUTED, fontSize: "15px", lineHeight: 1.5 }}>
                    <span aria-hidden style={{ flex: "none", color: PURPLE, fontWeight: 700 }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: the form */}
          <div style={{ flex: "1 1 440px", maxWidth: "580px", minWidth: 0, boxSizing: "border-box", padding: "clamp(22px, 3vw, 36px)", borderRadius: "22px", background: "#ffffff", border: `1px solid ${LINE}`, boxShadow: "0 24px 48px -28px rgba(11,23,48,0.25)" }}>
            <h2 style={{ margin: "0 0 6px", color: INK, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>Register your interest</h2>
            <p style={{ margin: "0 0 24px", color: MUTED, fontSize: "14px", lineHeight: 1.5 }}>Fields marked * are required.</p>

            <form onSubmit={handleSubmit} noValidate aria-label="eNotary waitlist registration">
              {formState === "error" && (
                <div role="alert" style={{ background: "#FEF3F2", border: "1px solid #FECDCA", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px" }}>
                  <p style={{ margin: 0, color: ERROR, fontSize: "14px" }}>{errorText}</p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <FieldLabel htmlFor="wl-name" required>Full name</FieldLabel>
                  <input id="wl-name" type="text" autoComplete="name" value={fields.name} onChange={(e) => set("name", e.target.value)}
                    aria-describedby={errors.name ? "wl-name-err" : undefined}
                    aria-invalid={!!errors.name} style={{ ...inputStyle, borderColor: border(errors.name) }} />
                  <FieldError id="wl-name-err" message={errors.name} />
                </div>

                <div>
                  <FieldLabel htmlFor="wl-email" required>Email address</FieldLabel>
                  <input id="wl-email" type="email" autoComplete="email" value={fields.email} onChange={(e) => set("email", e.target.value)}
                    aria-describedby={errors.email ? "wl-email-err" : undefined}
                    aria-invalid={!!errors.email} style={{ ...inputStyle, borderColor: border(errors.email) }} />
                  <FieldError id="wl-email-err" message={errors.email} />
                </div>

                <div>
                  <FieldLabel htmlFor="wl-org">Organization (optional)</FieldLabel>
                  <input id="wl-org" type="text" autoComplete="organization" value={fields.organization} onChange={(e) => set("organization", e.target.value)} style={inputStyle} />
                </div>

                <div>
                  <FieldLabel htmlFor="wl-audience" required>I am registering as</FieldLabel>
                  <select id="wl-audience" value={fields.audience} onChange={(e) => set("audience", e.target.value as Audience)}
                    aria-describedby={errors.audience ? "wl-audience-err" : undefined}
                    aria-invalid={!!errors.audience}
                    style={{ ...inputStyle, cursor: "pointer", borderColor: border(errors.audience) }}
                  >
                    <option value="">Select a category…</option>
                    {AUDIENCE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <FieldError id="wl-audience-err" message={errors.audience} />
                </div>

                <div>
                  <FieldLabel htmlFor="wl-interest">What interests you most about LAGDA eNotary? (optional)</FieldLabel>
                  <textarea id="wl-interest" value={fields.interest} onChange={(e) => set("interest", e.target.value)} rows={3}
                    style={{ ...inputStyle, height: "auto", minHeight: "96px", padding: "14px 16px", lineHeight: 1.5, resize: "vertical" }} />
                </div>

                <div style={{ padding: "14px 16px", borderRadius: "12px", background: "#F7F9FC", border: `1px solid ${errors.consent ? ERROR : LINE}` }}>
                  <label style={{ display: "flex", gap: "12px", cursor: "pointer", alignItems: "flex-start" }}>
                    <input type="checkbox" id="wl-consent" checked={fields.consent} onChange={(e) => set("consent", e.target.checked)}
                      aria-describedby={errors.consent ? "wl-consent-err" : undefined}
                      style={{ width: "18px", height: "18px", margin: "2px 0 0", flexShrink: 0, accentColor: NAVY }} />
                    <span style={{ color: BODY, fontSize: "14px", lineHeight: 1.55 }}>
                      I understand that LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules, that this registration does not create an account or guarantee access, and that I may receive update emails about LAGDA eNotary.
                    </span>
                  </label>
                  <FieldError id="wl-consent-err" message={errors.consent} />
                </div>

                <button
                  type="submit"
                  className={formState === "submitting" ? undefined : "lgl-btn-light"}
                  disabled={formState === "submitting"}
                  aria-busy={formState === "submitting"}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: "54px",
                    margin: 0, padding: "0 28px", border: "none", borderRadius: "12px",
                    background: formState === "submitting" ? "#6B85B0" : NAVY, color: "#ffffff",
                    fontFamily: "inherit", fontSize: "16px", fontWeight: 700,
                    cursor: formState === "submitting" ? "not-allowed" : "pointer",
                  }}
                >
                  {formState === "submitting" ? "Registering…" : "Join the waitlist"}
                </button>

                <p style={{ margin: 0, color: MUTED, fontSize: "13px", lineHeight: 1.55 }}>
                  {USE_REAL_BACKEND
                    ? "We'll email you when LAGDA eNotary opens."
                    : "This is a frontend demonstration. Waitlist registrations are not currently stored or processed. Live registration will be connected during backend integration."}
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <MoreAboutEnotary />
    </Shell>
  );
}
