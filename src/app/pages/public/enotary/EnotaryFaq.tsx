import { Link } from "react-router";
import {
  EnotaryPageShell, EnotaryStatusBanner, EnotaryDisclaimer,
  EnotarySection, EnotaryHeading, EnotaryFaqGroup,
} from "../../../components/enotary/EnotaryComponents";
import { ENOTARY_FAQ_GROUPS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const BURGUNDY = "#67023B";

export function EnotaryFaq() {
  return (
    <EnotaryPageShell>
      <EnotaryStatusBanner />

      {/* Hero */}
      <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <p style={{ color: BURGUNDY, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>ENOTARY / FAQ</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            eNotary Frequently Asked Questions
          </h1>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 16, lineHeight: 1.7, maxWidth: 620, margin: "0 0 24px" }}>
            Common questions about LAGDA eNotary — a future regulated product, not a currently available service.
          </p>
          <EnotaryDisclaimer />
        </div>
      </section>

      {/* FAQ groups */}
      <EnotarySection id="faq">
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {ENOTARY_FAQ_GROUPS.map((group) => (
            <EnotaryFaqGroup key={group.id} group={group} />
          ))}
        </div>
      </EnotarySection>

      {/* Responsible use note */}
      <EnotarySection id="responsible-use" light bordered>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <EnotaryHeading>Legal formalities reminder</EnotaryHeading>
          <div style={{ background: "rgba(103,2,59,0.08)", border: "1px solid rgba(103,2,59,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction. Neither LAGDA eSignature nor LAGDA eNotary (when available) eliminates this responsibility.
            </p>
          </div>
          <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.7 }}>
            If you are unsure whether electronic signing or electronic notarization (when available) satisfies the requirements for a specific document or transaction, consult qualified legal counsel.
          </p>
        </div>
      </EnotarySection>

      {/* Still have questions */}
      <EnotarySection id="more-questions" bordered>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "white", ...GF, fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 900, margin: "0 0 12px" }}>Still have questions?</h2>
          <p style={{ color: "#64748b", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 22px" }}>
            Contact us through the LAGDA contact form. Select the most appropriate category for your question.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/contact" style={{ background: "rgba(255,255,255,0.07)", color: "white", ...GF, fontSize: 14, fontWeight: 600, padding: "11px 22px", borderRadius: 7, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}>Contact LAGDA</Link>
            <Link to="/enotary/waitlist" style={{ background: BURGUNDY, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "11px 22px", borderRadius: 7, textDecoration: "none" }}>Join the waitlist</Link>
          </div>
        </div>
      </EnotarySection>
    </EnotaryPageShell>
  );
}
