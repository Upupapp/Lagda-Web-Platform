import { Link } from "react-router";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { OVERVIEW_CAPABILITIES, FEATURES_LEGAL_NOTE, ENOTARY_NOTE } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Transaction lifecycle strip ────────────────────────────────────────────────
function LifecycleStrip() {
  const steps = [
    { icon: "📄", label: "Prepare", sub: "Upload & configure" },
    { icon: "👥", label: "Assign",  sub: "Add participants" },
    { icon: "📤", label: "Send",    sub: "Invite to sign" },
    { icon: "🔑", label: "Auth",    sub: "Verify identity" },
    { icon: "✍️", label: "Sign",   sub: "Adopt signature" },
    { icon: "📋", label: "Record",  sub: "Audit trail" },
    { icon: "✅", label: "Complete",sub: "All parties done" },
    { icon: "🔍", label: "Verify",  sub: "Confirm document" },
  ];
  return (
    <div style={{ overflowX: "auto", scrollbarWidth: "none" }}>
      <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ textAlign: "center", padding: "12px 14px" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }} aria-hidden>{s.icon}</div>
              <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>{s.label}</p>
              <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "2px 0 0" }}>{s.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <div aria-hidden style={{ width: 24, height: 1, background: "rgba(0,120,212,0.4)", flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Capability map grid ────────────────────────────────────────────────────────
function CapabilityMap({ group }: { group: string }) {
  const caps = OVERVIEW_CAPABILITIES.filter((c) => c.group === group);
  return (
    <div style={{ display: "grid", gap: 12 }} className="cap-map-grid">
      {caps.map((c) => (
        <Link key={c.path} to={c.path} style={{ textDecoration: "none" }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "16px 18px",
            transition: "border-color 0.15s ease, background 0.15s ease",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,120,212,0.35)"; e.currentTarget.style.background = "rgba(0,120,212,0.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          >
            <span aria-hidden style={{ fontSize: 20, display: "block", marginBottom: 8 }}>{c.icon}</span>
            <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{c.title}</p>
            <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
          </div>
        </Link>
      ))}
      <style>{`.cap-map-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 560px) { .cap-map-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}

export function FeaturesOverview() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Features"
        headingId="feat-h1"
        heading="Everything needed to move a document from preparation to verification."
        sub="LAGDA eSignature combines document preparation, participant management, routing, authentication, audit evidence, verification, templates, and team controls — designed for Philippine professionals and organizations."
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/esignature/core-workflow" style={{ background: "#0078D4", color: "white", padding: "12px 24px", borderRadius: 10, ...GF, fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 44 }}>
            Explore Core Workflow →
          </Link>
          <Link to="/create-account" style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)", padding: "12px 20px", borderRadius: 10, ...GF, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 44 }}>
            Create Free Account
          </Link>
        </div>
      </PageHero>

      {/* Lifecycle */}
      <PageSection id="lifecycle" light bordered>
        <SectionHeading eyebrow="Transaction lifecycle" id="lifecycle-h2" heading="From preparation to verification — every step in one place." sub="LAGDA guides each document through a complete, auditable workflow." />
        <LifecycleStrip />
      </PageSection>

      {/* Core Workflow */}
      <PageSection id="core-workflow">
        <SectionHeading eyebrow="Core Workflow" id="core-h2" heading="Prepare. Route. Sign." sub="The four foundational pages covering how documents are prepared and routed to participants." />
        <CapabilityMap group="Core Workflow" />
      </PageSection>

      {/* Trust & Evidence */}
      <PageSection id="trust-evidence" light bordered>
        <SectionHeading eyebrow="Trust & Evidence" id="trust-h2" heading="Authenticate. Record. Verify." sub="How LAGDA helps increase confidence in who acted, when they acted, and what they signed." />
        <CapabilityMap group="Trust & Evidence" />
      </PageSection>

      {/* Productivity */}
      <PageSection id="productivity">
        <SectionHeading eyebrow="Productivity" id="prod-h2" heading="Build once. Reuse every time." sub="Templates, contacts, branding, and notifications help organizations work with documents repeatedly." />
        <CapabilityMap group="Productivity" />
      </PageSection>

      {/* Team & Scale */}
      <PageSection id="team-scale" light bordered>
        <SectionHeading eyebrow="Team & Scale" id="team-h2" heading="Workspaces, storage, and enterprise integrations." sub="Controls for organizations that send documents at volume — across teams, clients, and systems." />
        <CapabilityMap group="Team & Scale" />
      </PageSection>

      {/* Capability note */}
      <PageSection id="capability-note">
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 16 }}>CAPABILITY NOTE</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            Some capabilities are available on all plans. Others depend on the plan selected or are designed for enterprise organizations. Look for availability labels on each feature page. Contact Sales to discuss enterprise requirements.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "eSignature Overview",  desc: "The complete eSignature product section", path: "/esignature" },
        { label: "Security Overview",    desc: "How LAGDA protects documents and evidence", path: "/security" },
        { label: "View Plans",           desc: "Compare plans and capabilities by tier", path: "/pricing" },
      ]} />

      <PageCTA
        heading="Start with LAGDA eSignature today."
        sub="Create a free account or explore the Core Workflow to see LAGDA in action."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Explore Core Workflow"
        secondaryPath="/esignature/core-workflow"
      />

      <LegalNote showEnotary />
    </FeaturesPageShell>
  );
}
