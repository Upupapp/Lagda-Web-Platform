import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { DATA_CATEGORIES, PRIVACY_PRINCIPLES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function PrivacyDataProtection() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Privacy and Data Protection"
        headingId="pdp-h1"
        heading="What LAGDA collects, how it uses data, and what protections apply."
        sub="This page describes the categories of data LAGDA processes, the privacy principles that guide how data is handled, and where to find the official Privacy Policy and data subject rights."
      />

      <PageSection id="categories" light bordered>
        <SectionHeading eyebrow="Data categories" id="dc-h2" heading="Every type of data LAGDA processes." sub="Each category is processed for a specific purpose. The full details are in the Privacy Policy." center />
        <div style={{ display: "grid", gap: 10 }} className="dc-grid">
          {DATA_CATEGORIES.map((c) => (
            <div key={c.category} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 4 }}>{c.category.toUpperCase()}</p>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.examples}</p>
            </div>
          ))}
        </div>
        <style>{`.dc-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 580px) { .dc-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="principles">
        <SectionHeading eyebrow="Privacy principles" id="pp-h2" heading="The principles that guide how LAGDA handles data." center />
        <div style={{ display: "grid", gap: 10 }} className="pp-grid">
          {PRIVACY_PRINCIPLES.map((p) => (
            <div key={p.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 14px", display: "flex", gap: 12 }}>
              <span aria-hidden style={{ fontSize: 20, flexShrink: 0 }}>{p.icon}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{p.title}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`.pp-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 560px) { .pp-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="participant-rights" light bordered>
        <SectionHeading eyebrow="Participant rights" id="pr-h2" heading="Rights that may apply to you as a document participant." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640, margin: "0 auto" }}>
          {[
            { right: "Access",      desc: "Request a copy of the personal data LAGDA holds about you." },
            { right: "Correction",  desc: "Request correction of inaccurate personal data." },
            { right: "Deletion",    desc: "Request deletion of your data, subject to retention obligations and applicable law." },
            { right: "Portability", desc: "Receive your data in a portable format where applicable." },
            { right: "Objection",   desc: "Object to certain types of processing where permitted by law." },
          ].map((r) => (
            <div key={r.right} style={{ display: "flex", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px" }}>
              <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, minWidth: 80, flexShrink: 0, paddingTop: 1 }}>{r.right.toUpperCase()}</span>
              <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5 }}>{r.desc}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{ color: "#475569", ...GF, fontSize: 13, marginBottom: 12 }}>Rights availability depends on your jurisdiction and relationship with LAGDA. See the Privacy Policy for full details.</p>
          <a href="/legal/privacy" style={{ display: "inline-block", background: "#0078D4", color: "white", ...GF, fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 8, textDecoration: "none" }}>
            Read Privacy Policy
          </a>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Trust Center",        desc: "Privacy Policy, Terms, and contact links", path: "/security/trust-center" },
        { label: "Secure Storage",      desc: "How data is stored and deleted", path: "/security/secure-storage" },
        { label: "Audit Trail",         desc: "Evidence retention and access levels", path: "/security/audit-trail" },
      ]} />

      <PageCTA
        heading="Review the full Privacy Policy."
        sub="LAGDA's Privacy Policy contains the complete details of what is collected, how it is used, and how to exercise your rights."
        primaryLabel="Privacy Policy"
        primaryPath="/legal/privacy"
        secondaryLabel="Trust Center"
        secondaryPath="/security/trust-center"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
