import { Link } from "react-router";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ paddingTop: 36, paddingBottom: 12, borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 28 }}>
      <h2 id={`${id}-h`} style={{ color: "white", ...GF, fontSize: "clamp(17px, 2.5vw, 22px)", fontWeight: 800, margin: "0 0 14px" }}>{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.75, margin: "0 0 14px" }}>{children}</p>;
}

function UL({ items }: { items: string[] }) {
  return <ul style={{ padding: "0 0 0 20px", margin: "0 0 14px" }}>{items.map(i => <li key={i} style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{i}</li>)}</ul>;
}

export function Accessibility() {
  return (
    <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
      <section style={{ padding: "72px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>LEGAL</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 14px" }}>Accessibility Statement</h1>
          <p style={{ color: "#64748b", ...GF, fontSize: 15, margin: "0 0 10px" }}>UpUp Technologies — LAGDA Platform</p>
          <span style={{ color: "#475569", ...GM, fontSize: 10 }}>Updated: July 2026</span>
        </div>
      </section>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 80px" }}>

        <LegalSection id="commitment" title="Our commitment">
          <P>UpUp Technologies is committed to making the LAGDA platform accessible to all users, including people with disabilities. We aim to align the LAGDA public website and product interfaces with recognized accessibility practices.</P>
          <P>We do not currently claim formal conformance to WCAG 2.1 Level AA, as the site has not been formally audited against that standard. We are working toward that goal as the platform develops.</P>
        </LegalSection>

        <LegalSection id="practices" title="Accessibility practices we apply">
          <UL items={[
            "Keyboard navigation: Core functionality is navigable using a keyboard without a mouse",
            "Visible focus indicators: Interactive elements have visible focus states for keyboard users",
            "Semantic HTML: Pages use appropriate heading hierarchy, landmark regions, and semantic elements",
            "Color contrast: We aim for sufficient contrast between text and background colors",
            "Reduced motion: Animations and transitions respect the prefers-reduced-motion user preference",
            "Responsive design: Pages are designed to work across screen sizes and support browser zoom",
            "Form labels: All form fields have associated labels — placeholder text is not used as the sole label",
            "Error messages: Form errors are communicated clearly with field-level and summary messages",
            "ARIA attributes: We use ARIA attributes where native semantics are insufficient",
            "Alt text: Meaningful images include descriptive alternative text",
            "Status communication: Service status and document states are communicated in text, not by color alone",
          ]} />
        </LegalSection>

        <LegalSection id="known-limitations" title="Known limitations">
          <P>As an in-development product, LAGDA may have accessibility gaps. Some areas currently under development include:</P>
          <UL items={[
            "Feature comparison tables may not be fully optimized for all screen readers at all viewport sizes",
            "Some signing workflow steps are still being designed for full keyboard accessibility",
            "Mobile accessibility testing across all assistive technology combinations is ongoing",
            "Embedded PDF viewing has inherent accessibility limitations depending on document structure",
          ]} />
          <P>We document known limitations and work to address them as the product develops. Discovered issues are reviewed and prioritized for remediation.</P>
        </LegalSection>

        <LegalSection id="standards" title="Standards and approach">
          <P>We aim to align LAGDA with the Web Content Accessibility Guidelines (WCAG) 2.1 as a reference framework. We use both automated testing tools and manual review as part of development. A formal audit by an independent accessibility specialist is planned as the product matures.</P>
        </LegalSection>

        <LegalSection id="feedback" title="Accessibility feedback">
          <P>If you encounter an accessibility barrier on LAGDA, or have difficulty using any part of the platform, we want to hear from you.</P>
          <P>To report an accessibility issue:</P>
          <UL items={[
            "Visit the Contact page at lagda.io/contact",
            "Select the appropriate contact category",
            "Describe the specific barrier or difficulty you experienced",
            "Include the URL or page where you encountered the issue",
          ]} />
          <P>We will review your feedback and aim to respond with steps we are taking to address the issue. <Link to="/contact" style={{ color: "#38bdf8", textDecoration: "none" }}>Contact LAGDA →</Link></P>
        </LegalSection>

        <LegalSection id="review" title="Review process">
          <P>This accessibility statement is reviewed and updated as the platform develops. We do not publish an audit date unless a formal accessibility audit has been completed and the findings incorporated.</P>
        </LegalSection>

        <div style={{ marginTop: 40, background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "14px 18px" }}>
          <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            LAGDA aims to align its public website and product interfaces with recognized accessibility practices. This statement describes our current approach and does not claim formal conformance to any standard unless a completed audit confirms it.
          </p>
        </div>
      </div>
    </div>
  );
}
