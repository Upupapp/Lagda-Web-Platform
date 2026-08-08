import { useState } from "react";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote, AvailBadge,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function BrandingPreview({ branded }: { branded: boolean }) {
  return (
    <div style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 14, overflow: "hidden", maxWidth: 360, width: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "12px 18px",
        background: branded ? "#0078D4" : "rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", gap: 10,
        transition: "background 0.3s ease",
      }}>
        {branded ? (
          <>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🏢</div>
            <div>
              <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Mabini Legal Solutions</p>
              <p style={{ color: "rgba(255,255,255,0.7)", ...GF, fontSize: 10, margin: 0 }}>Sent via LAGDA</p>
            </div>
          </>
        ) : (
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>LAGDA eSignature</p>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: "16px 18px" }}>
        <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>Professional Services Agreement</p>
        <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, marginBottom: 14 }}>Please review and sign the document below.</p>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 12, margin: 0 }}>📄 Professional Services Agreement.pdf</p>
        </div>
        <div style={{ background: branded ? "#0078D4" : "rgba(0,120,212,0.6)", borderRadius: 8, padding: "9px 16px", textAlign: "center", ...GF, fontSize: 13, fontWeight: 700, color: "white", transition: "background 0.3s ease" }}>
          Review and Sign
        </div>
      </div>
      {/* Footer */}
      <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#334155", ...GM, fontSize: 10 }}>LAGDA-VER-2026-004821</span>
        <span style={{ color: branded ? "#0078D4" : "#334155", ...GF, fontSize: 10 }}>
          {branded ? "Mabini Legal Solutions via LAGDA" : "Secured by LAGDA"}
        </span>
      </div>
    </div>
  );
}

export function CompanyBranding() {
  const [branded, setBranded] = useState(false);
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Company Branding"
        headingId="cb-h1"
        heading="Help recipients recognize who sent the document."
        sub="LAGDA workspace branding lets organizations add a consistent identity to outgoing documents — logo, company header, and email customization. Branding builds recognition and reduces confusion for recipients."
      />

      <PageSection id="preview" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="cb-two-col">
          <div>
            <SectionHeading eyebrow="Before and after" id="ba-h2" heading="See what branding adds to the recipient experience." sub="Toggle to compare an unbranded and branded signing invitation. LAGDA trust indicators remain visible in both states." />
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => setBranded(false)}
                aria-pressed={!branded}
                style={{ padding: "8px 16px", borderRadius: 8, ...GF, fontSize: 13, fontWeight: !branded ? 700 : 500, background: !branded ? "rgba(0,120,212,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${!branded ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.1)"}`, color: !branded ? "white" : "#64748b", cursor: "pointer" }}
              >
                Without branding
              </button>
              <button
                onClick={() => setBranded(true)}
                aria-pressed={branded}
                style={{ padding: "8px 16px", borderRadius: 8, ...GF, fontSize: 13, fontWeight: branded ? 700 : 500, background: branded ? "rgba(0,120,212,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${branded ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.1)"}`, color: branded ? "white" : "#64748b", cursor: "pointer" }}
              >
                With branding
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Company logo in the signing interface",
                "Customizable invitation email subject and message",
                "Organizational sender name and identity",
                "Completion-page branding",
                "Verification ID and QR placement",
                "Branding never removes LAGDA trust indicators",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <BrandingPreview branded={branded} />
        </div>
        <style>{`.cb-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .cb-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="safeguards">
        <SectionHeading eyebrow="Document safeguards" id="ds-h2" heading="Branding is applied to the interface — not the document content." center />
        <div style={{ display: "grid", gap: 12 }} className="ds-grid">
          {[
            { title: "Applied to interface",       desc: "Branding appears in the signing environment and invitation email — not overlaid on the PDF content itself." },
            { title: "Source content respected",   desc: "Existing headers, footers, and document content should not be obscured by organizational branding." },
            { title: "Verification placement",     desc: "QR codes and Verification IDs use controlled placement to avoid obscuring document content." },
            { title: "LAGDA indicators preserved", desc: "Organizational branding does not remove or replace LAGDA platform trust indicators." },
          ].map((s) => (
            <div key={s.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{s.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <AvailBadge tier="Advanced" />
          <span style={{ color: "#475569", ...GF, fontSize: 13, marginLeft: 10 }}>Workspace branding may be plan-dependent.</span>
        </div>
        <style>{`.ds-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .ds-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Templates & Branding", desc: "How branding integrates with templates", path: "/esignature/templates-and-branding" },
        { label: "Team Workspaces",      desc: "Workspace-level branding controls", path: "/features/team-workspaces" },
        { label: "View Plans",           desc: "Branding availability by plan", path: "/pricing" },
      ]} />

      <PageCTA
        heading="Explore Templates and Branding."
        primaryLabel="Templates & Branding"
        primaryPath="/esignature/templates-and-branding"
        secondaryLabel="View Plans"
        secondaryPath="/pricing"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
