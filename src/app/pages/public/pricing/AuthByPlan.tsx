import { Link } from "react-router";
import {
  PricingPageShell, PricingSection, PricingHeading,
} from "../../../components/pricing/PricingComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const AUTH_METHODS = [
  {
    id: "secure-link",
    name: "Secure invitation link",
    desc: "A unique one-time link is delivered to the participant's email address. Access depends on the participant being the same person who receives the invitation.",
    personal: true, business: true, enterprise: true,
    caution: "Link sharing does not transfer signing authority. Forwarding may weaken this control.",
    assurance: "Basic",
  },
  {
    id: "verified-email",
    name: "Verified email access",
    desc: "Participant confirms access to the registered email address before viewing or signing.",
    personal: true, business: true, enterprise: true,
    assurance: "Low to medium",
  },
  {
    id: "email-otp",
    name: "Email OTP",
    desc: "A one-time passcode is sent to the participant's email. Participant must enter the code to proceed.",
    personal: true, business: true, enterprise: true,
    caution: "Where the invitation link and OTP are delivered to the same email channel, the combined assurance is not equivalent to a true second factor.",
    assurance: "Low to medium",
  },
  {
    id: "sms-otp",
    name: "SMS OTP",
    desc: "A one-time passcode is delivered via SMS to the participant's confirmed mobile number. Adds a separate channel from the email invitation.",
    personal: false, business: true, enterprise: true,
    assurance: "Medium",
  },
  {
    id: "auth-app",
    name: "Authenticator app (TOTP)",
    desc: "Time-based one-time passcode from the participant's authenticator application. Requires prior enrolment.",
    personal: false, business: true, enterprise: true,
    assurance: "Medium to high",
  },
  {
    id: "account-auth",
    name: "Account authentication",
    desc: "Participant authenticates through their existing LAGDA account. Suitable for regular collaborators.",
    personal: true, business: true, enterprise: true,
    assurance: "Medium",
  },
  {
    id: "identity-verify",
    name: "Identity-document verification",
    desc: "Participant's government-issued ID is verified as part of the signing process. This is a planned future capability.",
    personal: false, business: false, enterprise: false,
    note: "Planned future capability — not yet available.",
    assurance: "High",
  },
  {
    id: "enterprise-sso",
    name: "Enterprise SSO / identity provider",
    desc: "Participant authenticates through your organization's enterprise identity provider (e.g., Azure AD, Okta). Requires Enterprise arrangement.",
    personal: false, business: false, enterprise: true,
    assurance: "High (depends on IdP)",
  },
];

const SELECTION_FACTORS = [
  { icon: "⚖️", title: "Transaction risk",         desc: "Higher-risk or higher-value transactions benefit from stronger authentication." },
  { icon: "🤝", title: "Participant relationship",  desc: "Known trusted collaborators may need lighter friction; external or unknown signers may warrant more." },
  { icon: "📋", title: "Organization policy",       desc: "Your organization may have policies specifying minimum authentication for certain document types." },
  { icon: "🌐", title: "Provider availability",     desc: "Some methods depend on network availability, device capability, or prior participant setup." },
  { icon: "🔒", title: "Legal requirements",        desc: "Some transactions, jurisdictions, or document types may have specific authentication requirements." },
  { icon: "👤", title: "User experience",           desc: "More friction at signing may reduce completion rates — balance assurance against practicality." },
];

export function AuthByPlan() {
  return (
    <PricingPageShell>
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>AUTHENTICATION BY PLAN</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            Signer authentication methods and plan availability.
          </h1>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 16, lineHeight: 1.65 }}>
            Authentication helps increase confidence that the intended participant is acting. Method availability may also depend on organization settings, country, and provider availability.
          </p>
        </div>
      </section>

      <PricingSection id="methods">
        <PricingHeading eyebrow="Authentication methods" id="meth-h2" heading="Available methods by plan." />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {AUTH_METHODS.map(({ id, name, desc, personal, business, enterprise, caution, note, assurance }) => (
            <div key={id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{name}</p>
                  <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {[{ label: "Personal", incl: personal }, { label: "Business", incl: business }, { label: "Enterprise", incl: enterprise }].map(({ label, incl }) => (
                    <span key={label} style={{
                      ...GM, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                      background: incl ? "rgba(0,120,212,0.15)" : "rgba(255,255,255,0.04)",
                      color: incl ? "#38bdf8" : "#7C8DA4",
                      border: incl ? "1px solid rgba(0,120,212,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    }}>{label}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#8A9BAE", ...GM, fontSize: 9 }}>ASSURANCE: {assurance}</span>
                {note && <span style={{ color: "#C9960C", ...GM, fontSize: 9 }}>⚠ {note}</span>}
              </div>
              {caution && (
                <p style={{ color: "#94A3B8", ...GM, fontSize: 10, marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>Note: {caution}</p>
              )}
            </div>
          ))}
        </div>
        <p style={{ color: "#7C8DA4", ...GF, fontSize: 12, marginTop: 16, lineHeight: 1.65 }}>
          Authentication helps increase confidence that the intended participant is acting, but it does not independently determine legal identity or legal sufficiency in every transaction. Users remain responsible for determining the requirements that apply to each transaction.
        </p>
      </PricingSection>

      <PricingSection id="selection" light bordered>
        <PricingHeading eyebrow="Choosing authentication" id="sel-h2" heading="Factors to consider when selecting a method." center />
        <div style={{ display: "grid", gap: 12, maxWidth: 900, margin: "0 auto" }} className="sel-grid">
          {SELECTION_FACTORS.map(({ icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 16px" }}>
              <span aria-hidden style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{title}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`.sel-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { .sel-grid { grid-template-columns: 1fr; } }`}</style>
      </PricingSection>

      <PricingSection id="cta">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ color: "white", ...GF, fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Learn more about signer authentication.</h2>
            <p style={{ color: "#94A3B8", ...GF, fontSize: 14, margin: 0 }}>How LAGDA uses authentication to build confidence in the signing process.</p>
          </div>
          <Link to="/features/signer-authentication" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "11px 24px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center", flexShrink: 0 }}>Explore Authentication</Link>
        </div>
      </PricingSection>
    </PricingPageShell>
  );
}
