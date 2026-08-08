import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { SECURITY_LAYERS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function SecurityOverview() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Security Overview"
        headingId="sec-h1"
        heading="LAGDA eSignature is designed in layers — each one purposeful."
        sub="Security in LAGDA is not a single feature. It is the combination of account protection, signing-request access controls, participant authentication, audit evidence, document integrity, and storage controls."
      />

      <PageSection id="layers" light bordered>
        <SectionHeading eyebrow="Security layers" id="sl-h2" heading="Seven overlapping layers — each one distinct." sub="Each layer addresses a different threat surface. Together, they support the trust requirements of digital document transactions." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720, margin: "0 auto" }}>
          {SECURITY_LAYERS.map((l, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{l.icon}</div>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 3 }}>{l.layer}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{l.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection id="section-map">
        <SectionHeading eyebrow="What this section covers" id="sm-h2" heading="Each security topic — covered in its own page." center />
        <div style={{ display: "grid", gap: 10 }} className="sm-grid">
          {[
            { path: "/security/account-security",           label: "Account Security",          desc: "Passwords, MFA, session controls, and access history." },
            { path: "/security/signer-authentication",      label: "Signer Authentication",     desc: "Methods that increase confidence the right person is signing." },
            { path: "/security/identity-verification",      label: "Identity Verification",     desc: "How LAGDA layers access, intent, and authentication evidence." },
            { path: "/security/audit-trail",                label: "Audit Trail",               desc: "Evidence integrity, access levels, and event detail." },
            { path: "/security/document-verification",      label: "Document Verification",     desc: "File comparison, integrity checks, and privacy boundaries." },
            { path: "/security/device-and-location-evidence", label: "Device and Location",    desc: "What is recorded, how, and privacy safeguards." },
            { path: "/security/secure-storage",             label: "Secure Storage",            desc: "How documents are stored, retained, and deleted." },
            { path: "/security/privacy-and-data-protection", label: "Privacy and Data Protection", desc: "Data categories, principles, and participant rights." },
            { path: "/security/trust-center",               label: "Trust Center",              desc: "Policies, legal documents, and security contacts." },
          ].map((item) => (
            <a key={item.path} href={item.path} style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 14px", height: "100%", transition: "border-color 0.15s ease" }}>
                <p style={{ color: "#38BDF8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", margin: 0, marginBottom: 4 }}>→ {item.path.split("/security/")[1]?.toUpperCase() ?? "SECURITY"}</p>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{item.label}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            </a>
          ))}
        </div>
        <style>{`.sm-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .sm-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="no-guarantees" light bordered>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>A NOTE ON SECURITY CLAIMS</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            LAGDA does not claim that its features guarantee legal validity, perfect tamper resistance, or certified compliance. Digital document security involves platform controls, participant behavior, document type, and applicable law. Senders and their organizations remain responsible for determining which controls are appropriate for each transaction.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Trust Center",        desc: "Policies, contacts, and service status", path: "/security/trust-center" },
        { label: "Signer Authentication", desc: "Authentication methods in detail", path: "/security/signer-authentication" },
        { label: "Features Overview",   desc: "Full product capability map", path: "/features" },
      ]} />

      <PageCTA
        heading="Start with Account Security."
        sub="See how LAGDA protects sender accounts — the first layer in every secure transaction."
        primaryLabel="Account Security"
        primaryPath="/security/account-security"
        secondaryLabel="Create Free Account"
        secondaryPath="/create-account"
      />
      <LegalNote showEnotary />
    </SecurityPageShell>
  );
}
