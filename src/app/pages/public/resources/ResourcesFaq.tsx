import {
  ResourcesPageShell, ResourcesSection, ResourcesHeading, FaqAccordion, EduDisclaimer,
} from "../../../components/resources/ResourceComponents";
import { GENERAL_FAQ_GROUPS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function ResourcesFaq() {
  return (
    <ResourcesPageShell>
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>FREQUENTLY ASKED QUESTIONS</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            LAGDA FAQ
          </h1>
          <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65 }}>
            Common questions about LAGDA eSignature, Document Verification, security, plans, and legal considerations.
          </p>
        </div>
      </section>

      {GENERAL_FAQ_GROUPS.map((group, idx) => (
        <ResourcesSection key={group.id} id={group.id} light={idx % 2 === 1} bordered={idx % 2 === 1}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <ResourcesHeading eyebrow="FAQ" id={`${group.id}-h`} heading={group.title} />
            <FaqAccordion items={group.items} />
          </div>
        </ResourcesSection>
      ))}

      <ResourcesSection id="disclaimer">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EduDisclaimer />
          <p style={{ color: "#334155", ...GF, fontSize: 12, lineHeight: 1.65, marginTop: 12 }}>
            Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction.
            LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.
          </p>
        </div>
      </ResourcesSection>
    </ResourcesPageShell>
  );
}
