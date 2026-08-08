import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { TRUST_RESOURCES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function TrustCenter() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Trust Center"
        headingId="tc-h1"
        heading="Policies, contacts, and disclosures — in one place."
        sub="The LAGDA Trust Center is the starting point for anyone who needs to review how LAGDA operates, what it collects, and how to get in contact about security, legal, or accessibility matters."
      />

      <PageSection id="resources" light bordered>
        <SectionHeading eyebrow="Trust resources" id="tr-h2" heading="Documents and contacts." center />
        <div style={{ display: "grid", gap: 12 }} className="tr-grid">
          {TRUST_RESOURCES.map((r) => (
            <a key={r.path} href={r.path} style={{ textDecoration: "none" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 16px", height: "100%" }}>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.title}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
                <p style={{ color: "#38BDF8", ...GM, fontSize: 10, fontWeight: 700, margin: "8px 0 0" }}>→ View</p>
              </div>
            </a>
          ))}
        </div>
        <style>{`.tr-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .tr-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="disclosure">
        <SectionHeading eyebrow="Responsible disclosure" id="rd-h2" heading="Found a security issue? Contact us." center />
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px 24px" }}>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>RESPONSIBLE DISCLOSURE</p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
              If you believe you have found a security vulnerability in LAGDA, please contact us before disclosing it publicly. We aim to respond promptly and work with you to address the issue responsibly.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Describe the issue clearly — what it is, how to reproduce it, and who it might affect",
                "Include your contact information for follow-up",
                "Do not test against accounts that are not your own",
                "Avoid accessing or modifying other users' data during testing",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#38BDF8", flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <a href="/contact" style={{ display: "inline-block", background: "#0078D4", color: "white", ...GF, fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 8, textDecoration: "none" }}>
                Contact Security Team
              </a>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection id="no-claims" light bordered>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>WHAT THIS PAGE DOES NOT DO</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            This Trust Center page does not list certifications, compliance attestations, security standards badges, or third-party audit results that LAGDA has not published. It does not grant regulatory approval or constitute legal advice. For specific compliance questions relevant to your organization or jurisdiction, consult qualified legal counsel.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Privacy and Data Protection", desc: "Data categories, principles, and rights", path: "/security/privacy-and-data-protection" },
        { label: "Security Overview",            desc: "The full security layer map", path: "/security" },
        { label: "Contact LAGDA",                desc: "Reach the security or support team", path: "/contact" },
      ]} />

      <PageCTA
        heading="Review the Privacy Policy and Terms of Service."
        primaryLabel="Privacy Policy"
        primaryPath="/legal/privacy"
        secondaryLabel="Terms of Service"
        secondaryPath="/legal/terms"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
