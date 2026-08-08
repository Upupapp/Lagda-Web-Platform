import { Link } from "react-router";
import {
  PricingPageShell, PricingSection, PricingHeading,
} from "../../../components/pricing/PricingComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const TEMPLATE_DIMENSIONS = [
  { icon: "👤", title: "Personal templates",       personal: true,  business: true,  enterprise: true  },
  { icon: "🏢", title: "Shared workspace templates",personal: false, business: true,  enterprise: true  },
  { icon: "🔒", title: "Template permissions",      personal: false, business: true,  enterprise: true  },
  { icon: "🎨", title: "Branding in templates",     personal: false, business: true,  enterprise: true  },
  { icon: "🔐", title: "Authentication rules",       personal: true,  business: true,  enterprise: true  },
  { icon: "⏰", title: "Reminder and expiry rules", personal: true,  business: true,  enterprise: true  },
  { icon: "👥", title: "Participant-role placeholders",personal: true, business: true, enterprise: true  },
  { icon: "🔄", title: "Enterprise-managed templates",personal: false, business: false, enterprise: true },
];

const TEMPLATE_USES = [
  { title: "Engagement letter",    desc: "Professional services engagement template with variable client details." },
  { title: "Employee onboarding",  desc: "Multi-document onboarding packet with sequential participant flow." },
  { title: "Vendor agreement",     desc: "Vendor or supplier agreement with configurable participants and authentication." },
  { title: "Lease workflow",        desc: "Property lease with tenant, lessor, and witness participant roles." },
  { title: "Internal approval",    desc: "Department approval template with sequential routing." },
  { title: "Client acknowledgment",desc: "Service acknowledgment with client and staff countersign." },
];

export function TemplatesByPlan() {
  return (
    <PricingPageShell>
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>TEMPLATES BY PLAN</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            Template access by plan.
          </h1>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 16, lineHeight: 1.65 }}>
            A LAGDA template is a reusable document workflow that may retain document files, fields, participant roles, routing, authentication rules, reminders, branding, and verification settings.
          </p>
        </div>
      </section>

      <PricingSection id="what-is-template" light bordered>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <PricingHeading eyebrow="What is a template?" id="def-h2" heading="A template is a reusable workflow, not just a file." sub="Unlike a stored document, a LAGDA template preserves the full workflow configuration — participant roles, routing order, authentication requirements, field placement, reminder schedule, branding, and expiration settings." />
          <p style={{ color: "#94A3B8", ...GF, fontSize: 14, lineHeight: 1.65 }}>
            When you use a template to start a new transaction, a new copy of the document is prepared with the template's configuration pre-applied. You can adjust participant details without changing the underlying template.
          </p>
        </div>
      </PricingSection>

      <PricingSection id="availability">
        <PricingHeading eyebrow="Availability" id="avail-h2" heading="Template access across plans." />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }} aria-label="Template availability by plan">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px 10px 0", color: "#8A9BAE", ...GF, fontSize: 13, fontWeight: 600, width: "50%" }}>Template feature</th>
                <th style={{ textAlign: "center", padding: "10px 12px", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 700 }}>Personal</th>
                <th style={{ textAlign: "center", padding: "10px 12px", color: "#38bdf8", ...GF, fontSize: 12, fontWeight: 700 }}>Business</th>
                <th style={{ textAlign: "center", padding: "10px 12px", color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 700 }}>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {TEMPLATE_DIMENSIONS.map(({ icon, title, personal, business, enterprise }) => (
                <tr key={title} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 16px 10px 0", color: "#94a3b8", ...GF, fontSize: 13 }}>
                    <span aria-hidden style={{ marginRight: 8 }}>{icon}</span>{title}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 12px" }}>
                    {personal ? <span style={{ color: "#22C55E" }}>✓</span> : <span style={{ color: "#7C8DA4" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 12px", background: "rgba(0,120,212,0.04)" }}>
                    {business ? <span style={{ color: "#22C55E" }}>✓</span> : <span style={{ color: "#7C8DA4" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "center", padding: "10px 12px" }}>
                    {enterprise ? <span style={{ color: "#22C55E" }}>✓</span> : <span style={{ color: "#7C8DA4" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: "#7C8DA4", ...GF, fontSize: 12, marginTop: 12 }}>
          Numeric template limits will be confirmed at launch. Actual limits depend on plan terms.
        </p>
      </PricingSection>

      <PricingSection id="examples" light bordered>
        <PricingHeading eyebrow="Example uses" id="ex-h2" heading="Common template scenarios." center />
        <div style={{ display: "grid", gap: 12, maxWidth: 900, margin: "0 auto" }} className="ex-grid">
          {TEMPLATE_USES.map(({ title, desc }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 18px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{title}</p>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ex-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { .ex-grid { grid-template-columns: 1fr; } }`}</style>
      </PricingSection>

      <PricingSection id="cta">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ color: "white", ...GF, fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Explore templates in the product.</h2>
            <p style={{ color: "#94A3B8", ...GF, fontSize: 14, margin: 0 }}>See how templates are built, shared, and managed across your workspace.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/features/templates" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "11px 24px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}>Explore Templates</Link>
            <Link to="/pricing/compare" style={{ background: "rgba(255,255,255,0.06)", color: "white", ...GF, fontSize: 14, fontWeight: 600, padding: "11px 24px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.1)" }}>Compare Plans</Link>
          </div>
        </div>
      </PricingSection>
    </PricingPageShell>
  );
}
