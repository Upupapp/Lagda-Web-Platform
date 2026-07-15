import { Link } from "react-router";
import {
  PricingPageShell, PricingHero, PricingSection, PricingHeading,
  PlanCards, CompareTable, FaqAccordion, EnotarySeparationNote,
} from "../../../components/pricing/PricingComponents";
import { PRICING_FAQ_GROUPS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function PricingOverview() {
  const topFaq = PRICING_FAQ_GROUPS.flatMap(g => g.items).slice(0, 4);
  return (
    <PricingPageShell>
      <PricingHero
        heading="Choose the LAGDA plan that fits your document workflow."
        sub="LAGDA eSignature plans differ by usage, workspace size, authentication options, templates, branding, and enterprise capabilities. Prices will be confirmed at launch."
      />

      {/* Plan cards */}
      <PricingSection id="plans">
        <PricingHeading eyebrow="Plans" id="plans-heading" heading="eSignature plans for individuals, teams, and enterprise." center
          sub="All plans include document preparation, audit trail, and Document Verification. Plans differ in sending allowances, workspace features, and authentication options."
        />
        <PlanCards />
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link to="/pricing/compare" style={{ color: "#38bdf8", ...GF, fontSize: 14, textDecoration: "none", fontWeight: 600 }}>
            Compare all features in detail →
          </Link>
        </div>
      </PricingSection>

      {/* Capability overview */}
      <PricingSection id="capabilities" light bordered>
        <PricingHeading eyebrow="What's included" id="cap-heading" heading="Core capabilities across all plans." center />
        <div style={{ display: "grid", gap: 16, maxWidth: 900, margin: "0 auto" }} className="cap-grid">
          {[
            { icon: "📄", title: "Document Preparation",   desc: "Upload PDFs, configure fields, set participant roles, routing, and authentication." },
            { icon: "📋", title: "Audit Trail",             desc: "Every invitation, view, authentication event, and signature recorded with timestamps." },
            { icon: "🔍", title: "Document Verification",  desc: "Verification ID and QR code included on all completed transactions on all plans." },
            { icon: "📑", title: "Templates",              desc: "Personal templates on all plans. Shared templates and advanced management on Business and Enterprise." },
            { icon: "🔐", title: "Authentication",         desc: "Secure invitation and email OTP on all plans. SMS OTP and authenticator app on Business+." },
            { icon: "🏢", title: "Workspace",              desc: "Shared workspace, role-based access, and administration on Business and Enterprise." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" }}>
              <span aria-hidden style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{title}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`.cap-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { .cap-grid { grid-template-columns: 1fr; } }`}</style>
      </PricingSection>

      {/* Compare preview */}
      <PricingSection id="compare-preview">
        <PricingHeading eyebrow="Comparison" id="cmp-heading" heading="Full feature comparison." />
        <CompareTable />
        <div style={{ marginTop: 24 }}>
          <EnotarySeparationNote />
        </div>
      </PricingSection>

      {/* FAQ preview */}
      <PricingSection id="faq-preview" light bordered>
        <PricingHeading eyebrow="Frequently asked questions" id="faq-heading" heading="Common pricing questions." center />
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <FaqAccordion items={topFaq} />
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Link to="/pricing/faq" style={{ color: "#38bdf8", ...GF, fontSize: 14, textDecoration: "none", fontWeight: 600 }}>View all pricing questions →</Link>
          </div>
        </div>
      </PricingSection>

      {/* Enterprise */}
      <PricingSection id="enterprise-cta">
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>ENTERPRISE</p>
          <h2 style={{ color: "white", ...GF, fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, marginBottom: 14, letterSpacing: "-0.02em" }}>High-volume, complex, or integration requirements?</h2>
          <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65, marginBottom: 28 }}>Enterprise arrangements include custom volume, workspace administration, onboarding, security review, and integration planning.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/contact" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}>Contact Sales</Link>
            <Link to="/pricing/enterprise" style={{ background: "rgba(255,255,255,0.06)", color: "white", ...GF, fontSize: 14, fontWeight: 600, padding: "12px 28px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.1)" }}>Learn About Enterprise</Link>
          </div>
        </div>
      </PricingSection>

      {/* Responsible-use note */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
        <p style={{ color: "#334155", ...GF, fontSize: 12, lineHeight: 1.65, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 20 }}>
          Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction. LAGDA eNotary is a separate future regulated product — Coming Soon and Subject to Supreme Court Accreditation and applicable rules.
        </p>
      </div>
    </PricingPageShell>
  );
}
