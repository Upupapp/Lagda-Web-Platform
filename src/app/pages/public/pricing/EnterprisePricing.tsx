import { Link } from "react-router";
import {
  PricingPageShell, PricingSection, PricingHeading,
} from "../../../components/pricing/PricingComponents";
import { ENTERPRISE_NEEDS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function EnterprisePricing() {
  return (
    <PricingPageShell>
      <section style={{ padding: "80px 24px 64px", background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,120,212,0.1) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>ENTERPRISE</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(28px, 5vw, 50px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
            Built for organizations with complex requirements.
          </h1>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 17, lineHeight: 1.65, marginBottom: 32 }}>
            Enterprise arrangements may include tailored usage, workspace administration, onboarding, security review, and integration planning based on approved product availability.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/contact" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "13px 32px", borderRadius: 8, textDecoration: "none", minHeight: 48, display: "flex", alignItems: "center" }}>Contact Sales</Link>
            <Link to="/contact" style={{ background: "rgba(255,255,255,0.07)", color: "white", ...GF, fontSize: 15, fontWeight: 600, padding: "13px 32px", borderRadius: 8, textDecoration: "none", minHeight: 48, display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.1)" }}>Book a Demo</Link>
          </div>
        </div>
      </section>

      <PricingSection id="needs">
        <PricingHeading eyebrow="Enterprise requirements" id="needs-h2" heading="When organizations consider Enterprise." center />
        <div style={{ display: "grid", gap: 16, maxWidth: 900, margin: "0 auto" }} className="needs-grid">
          {ENTERPRISE_NEEDS.map(({ icon, title, desc }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{title}</p>
                  <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <style>{`.needs-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { .needs-grid { grid-template-columns: 1fr; } }`}</style>
      </PricingSection>

      <PricingSection id="capabilities" light bordered>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <PricingHeading eyebrow="Enterprise capabilities" id="cap-h2" heading="What Enterprise may include." sub="Enterprise arrangements are tailored. Capabilities depend on your requirements and approved product availability." />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Custom signing-request volume",         status: "Available by arrangement" },
              { label: "Custom workspace and role structure",   status: "Available by arrangement" },
              { label: "Company branding",                      status: "Included" },
              { label: "Shared template library",               status: "Included" },
              { label: "Enterprise SSO / identity provider",    status: "Available by arrangement" },
              { label: "User provisioning (SCIM)",              status: "Available by arrangement" },
              { label: "API access",                            status: "Available by arrangement" },
              { label: "Webhook delivery",                      status: "Available by arrangement" },
              { label: "Embedded signing",                      status: "Available by arrangement" },
              { label: "Security and compliance review",        status: "Available by arrangement" },
              { label: "Custom onboarding and training",        status: "Available by arrangement" },
              { label: "Priority support",                      status: "Available by arrangement" },
              { label: "Custom contract and procurement docs",  status: "Available by arrangement" },
            ].map(({ label, status }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13 }}>{label}</span>
                <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{status}</span>
              </div>
            ))}
          </div>
          <p style={{ color: "#7C8DA4", ...GF, fontSize: 12, marginTop: 16, lineHeight: 1.65 }}>
            Not all capabilities listed are confirmed as currently available. Enterprise plans do not include LAGDA eNotary, which is a separate future regulated product.
          </p>
        </div>
      </PricingSection>

      <PricingSection id="process">
        <PricingHeading eyebrow="Process" id="proc-h2" heading="How Enterprise arrangements work." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600, margin: "0 auto" }}>
          {[
            { num: "01", title: "Contact sales",           desc: "Tell us about your organization's requirements, volume, and workflow." },
            { num: "02", title: "Capability review",       desc: "We review your requirements against available and planned product capabilities." },
            { num: "03", title: "Proposal",                desc: "A tailored proposal is prepared based on confirmed availability and your needs." },
            { num: "04", title: "Onboarding and setup",    desc: "Your workspace, users, and integration requirements are configured." },
            { num: "05", title: "Ongoing support",         desc: "Dedicated support and account management throughout your arrangement." },
          ].map(({ num, title, desc }) => (
            <div key={num} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={{ color: "#38BDF8", ...GM, fontSize: 20, fontWeight: 800, width: 36, flexShrink: 0 }}>{num}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{title}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PricingSection>

      <PricingSection id="cta-bottom" light bordered>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "white", ...GF, fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Discuss your organization's requirements.</h2>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 15, lineHeight: 1.65, marginBottom: 28 }}>Contact our sales team to explore how LAGDA can support your organization's document workflow.</p>
          <Link to="/contact" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "13px 32px", borderRadius: 8, textDecoration: "none", minHeight: 48, display: "inline-flex", alignItems: "center" }}>Contact Sales</Link>
        </div>
      </PricingSection>
    </PricingPageShell>
  );
}
