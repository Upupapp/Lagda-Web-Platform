import { Link } from "react-router";
import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import { SolLegalNote, EnotaryNotice } from "../../../components/solutions/SolComponents";
import { AUDIENCE_GROUPS, COMMON_PROBLEMS, SHARED_CAPABILITIES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function SolutionsOverview() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="Industry Solutions"
        headingId="sol-h1"
        heading="Digital document workflows for Philippine legal, business, and institutional teams."
        sub="LAGDA eSignature helps organizations prepare, send, sign, track, verify, and securely manage documents online — across industries and office locations."
        gradient="radial-gradient(ellipse 90% 60% at 50% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <Link to="/esignature" style={{
            background: "#0078D4", color: "white", padding: "12px 24px", borderRadius: 10,
            ...GF, fontSize: 14, fontWeight: 700, textDecoration: "none", minHeight: 44,
            display: "inline-flex", alignItems: "center",
          }}>
            Explore LAGDA eSignature
          </Link>
          <Link to="/book-a-demo" style={{
            background: "rgba(255,255,255,0.06)", color: "white", padding: "12px 20px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            ...GF, fontSize: 14, fontWeight: 600, textDecoration: "none", minHeight: 44,
            display: "inline-flex", alignItems: "center",
          }}>
            Book a Demo
          </Link>
        </div>
      </PageHero>

      {/* Common problems */}
      <PageSection id="problems" light bordered>
        <SectionHeading
          eyebrow="Shared document workflow problems"
          id="prob-h2"
          heading="The same delays appear across every industry."
          sub="LAGDA addresses the common pain points in physical and manual document workflows — regardless of sector."
          center
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }} className="prob-grid">
          {COMMON_PROBLEMS.map((p) => (
            <div key={p.title} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "14px 14px",
            }}>
              <span aria-hidden style={{ fontSize: 20, display: "block", marginBottom: 8 }}>{p.icon}</span>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{p.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.prob-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .prob-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Audience groups */}
      <PageSection id="audiences">
        <SectionHeading
          eyebrow="Find your industry"
          id="aud-h2"
          heading="LAGDA adapts to the document workflows of each team."
          sub="Select the audience that best matches your organization or workflow to see how LAGDA applies."
          center
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }} className="aud-grid">
          {AUDIENCE_GROUPS.map((group) => (
            <div key={group.group} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "20px 20px", display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
                }}>{group.icon}</div>
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>{group.group}</p>
                  <p style={{ color: "#475569", ...GM, fontSize: 10, margin: 0 }}>{group.solutions.length} solution{group.solutions.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{group.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {group.solutions.map((s) => (
                  <Link key={s.path} to={s.path} style={{
                    background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.2)",
                    color: "#38bdf8", borderRadius: 8, padding: "6px 12px",
                    ...GF, fontSize: 13, fontWeight: 700, textDecoration: "none",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    {s.label} →
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <style>{`.aud-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 720px) { .aud-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Shared capabilities */}
      <PageSection id="capabilities" light bordered>
        <SectionHeading
          eyebrow="Common capabilities"
          id="cap-h2"
          heading="One product. Configurable for every workflow."
          sub="The same LAGDA features power workflows across legal, business, government, and institutional teams."
          center
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }} className="cap-grid">
          {SHARED_CAPABILITIES.map((cap) => (
            <Link key={cap.path} to={cap.path} style={{ textDecoration: "none" }}>
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "14px 14px", height: "100%",
              }}>
                <span aria-hidden style={{ fontSize: 20, display: "block", marginBottom: 8 }}>{cap.icon}</span>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{cap.title}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.45, margin: 0 }}>{cap.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        <style>{`.cap-grid { grid-template-columns: repeat(4, 1fr); } @media (max-width: 900px) { .cap-grid { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 500px) { .cap-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* eNotary separation */}
      <PageSection id="enotary">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageCTA
        heading="Not sure which solution fits?"
        sub="Start with the Core Workflow guide to understand how LAGDA eSignature works from preparation through verification."
        primaryLabel="Explore LAGDA eSignature"
        primaryPath="/esignature"
        secondaryLabel="Book a Demo"
        secondaryPath="/book-a-demo"
      />
      <SolLegalNote />
    </SolPageShell>
  );
}
