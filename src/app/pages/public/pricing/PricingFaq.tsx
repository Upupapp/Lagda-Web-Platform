import {
  PricingPageShell, PricingSection, PricingHeading, FaqAccordion, EnotarySeparationNote,
} from "../../../components/pricing/PricingComponents";
import { PRICING_FAQ_GROUPS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function PricingFaq() {
  return (
    <PricingPageShell>
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>FAQ</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            Pricing frequently asked questions.
          </h1>
          <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65 }}>
            Common questions about plans, usage, features, and billing. Answers reflect available information and will be updated as plan terms are confirmed.
          </p>
        </div>
      </section>

      {PRICING_FAQ_GROUPS.map(group => (
        <PricingSection key={group.id} id={group.id} light={group.id === "enotary"} bordered={group.id === "enotary"}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <PricingHeading eyebrow="FAQ" id={`${group.id}-heading`} heading={group.title} />
            <FaqAccordion items={group.items} />
            {group.id === "enotary" && (
              <div style={{ marginTop: 20 }}>
                <EnotarySeparationNote />
              </div>
            )}
          </div>
        </PricingSection>
      ))}

      <PricingSection id="more-questions">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "24px 28px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ color: "white", ...GF, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Have another question?</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 14, margin: 0, lineHeight: 1.5 }}>Our team can help with specific pricing or plan questions not answered here.</p>
            </div>
            <a href="/contact" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "11px 24px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center", flexShrink: 0 }}>Contact Sales</a>
          </div>
        </div>
      </PricingSection>
    </PricingPageShell>
  );
}
