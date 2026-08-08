import { Link } from "react-router";
import {
  PricingPageShell, PricingSection, PricingHeading,
  CompareTable, EnotarySeparationNote, PlanCards,
} from "../../../components/pricing/PricingComponents";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function ComparePlans() {
  return (
    <PricingPageShell>
      <section style={{ padding: "64px 24px 48px", background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,120,212,0.1) 0%, transparent 70%)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>PLAN COMPARISON</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(26px, 4.5vw, 46px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            Compare LAGDA eSignature Plans
          </h1>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 16, lineHeight: 1.65, maxWidth: 640, margin: "0 auto" }}>
            A detailed view of what's included in each plan. Prices and exact limits will be confirmed at launch.
          </p>
        </div>
      </section>

      <PricingSection id="plan-cards">
        <PlanCards />
        <div style={{ marginTop: 24 }}>
          <EnotarySeparationNote />
        </div>
      </PricingSection>

      <PricingSection id="compare-table" light bordered>
        <PricingHeading eyebrow="Full comparison" id="compare-h2" heading="Feature-by-feature breakdown." />

        {/* Legend */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
          {[
            { sym: "✓ Included",       col: "#22C55E" },
            { sym: "— Not included",   col: "#8A9BAE" },
            { sym: "Enterprise",       col: "#0078D4" },
            { sym: "Planned",          col: "#C9960C" },
            { sym: "Varies by plan",   col: "#94A3B8" },
          ].map(({ sym, col }) => (
            <span key={sym} style={{ color: col, ...GM, fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>{sym}</span>
          ))}
        </div>

        <CompareTable />

        <p style={{ color: "#7C8DA4", ...GF, fontSize: 12, lineHeight: 1.65, marginTop: 20 }}>
          Feature availability may vary by plan configuration, product version, and market. This comparison reflects planned availability and is subject to change. Planned features are not yet confirmed as included.
        </p>
      </PricingSection>

      {/* Auth methods detail */}
      <PricingSection id="auth-detail">
        <PricingHeading eyebrow="Authentication" id="auth-h2" heading="Authentication availability by plan." sub="Authentication method availability may also depend on organization settings, country, and provider availability." />
        <div style={{ display: "grid", gap: 12 }} className="auth-grid">
          {[
            { method: "Secure invitation link",       personal: true,  business: true,  enterprise: true,  note: "All plans" },
            { method: "Verified email access",         personal: true,  business: true,  enterprise: true,  note: "All plans" },
            { method: "Email OTP",                     personal: true,  business: true,  enterprise: true,  note: "All plans" },
            { method: "SMS OTP",                       personal: false, business: true,  enterprise: true,  note: "Business and Enterprise" },
            { method: "Authenticator app (TOTP)",      personal: false, business: true,  enterprise: true,  note: "Business and Enterprise" },
            { method: "Account authentication",        personal: true,  business: true,  enterprise: true,  note: "All plans" },
            { method: "Identity-document verification",personal: false, business: false, enterprise: false, note: "Planned future capability" },
            { method: "Enterprise SSO / IdP",         personal: false, business: false, enterprise: true,  note: "Enterprise only" },
          ].map(({ method, note }) => (
            <div key={method} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#94a3b8", ...GF, fontSize: 13 }}>{method}</span>
              <span style={{ color: "#94A3B8", ...GM, fontSize: 10, flexShrink: 0 }}>{note}</span>
            </div>
          ))}
        </div>
        <style>{`.auth-grid { grid-template-columns: 1fr; max-width: 720px; }`}</style>
        <div style={{ marginTop: 16 }}>
          <Link to="/pricing/authentication-by-plan" style={{ color: "#38bdf8", ...GF, fontSize: 14, textDecoration: "none", fontWeight: 600 }}>
            Full authentication by plan guide →
          </Link>
        </div>
      </PricingSection>

      {/* CTA */}
      <PricingSection id="cta" light bordered>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "white", ...GF, fontSize: 28, fontWeight: 800, marginBottom: 14 }}>Ready to get started?</h2>
          <p style={{ color: "#94A3B8", ...GF, fontSize: 15, lineHeight: 1.65, marginBottom: 28 }}>Create a free account or contact sales to discuss your requirements.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/create-account" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}>Create Free Account</Link>
            <Link to="/contact" style={{ background: "rgba(255,255,255,0.06)", color: "white", ...GF, fontSize: 14, fontWeight: 600, padding: "12px 28px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.1)" }}>Contact Sales</Link>
          </div>
        </div>
      </PricingSection>
    </PricingPageShell>
  );
}
