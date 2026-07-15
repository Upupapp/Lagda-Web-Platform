import {
  EsigPageShell,
  PageHero,
  PageSection,
  SectionHeading,
  RelatedPages,
  PageCTA,
  LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { TEMPLATE_FEATURES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Template library mockup ───────────────────────────────────────────────────
function TemplateLibraryMockup() {
  const templates = [
    { name: "Professional Services Agreement", uses: 12, fields: 4, roles: 2, status: "Ready" },
    { name: "Engagement Letter",               uses: 8,  fields: 3, roles: 2, status: "Ready" },
    { name: "NDA — Standard",                  uses: 31, fields: 3, roles: 2, status: "Ready" },
    { name: "Board Resolution Template",       uses: 4,  fields: 2, roles: 3, status: "Draft" },
  ];

  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden",
      maxWidth: 460, width: "100%",
    }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>Template Library</span>
        <span style={{ background: "rgba(0,120,212,0.15)", color: "#38bdf8", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 999, padding: "2px 10px", ...GM, fontSize: 10, fontWeight: 700 }}>
          {templates.length} templates
        </span>
      </div>
      {templates.map((t) => (
        <div key={t.name} style={{ padding: "11px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "3px 0 0" }}>
              {t.roles} roles · {t.fields} fields
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <span style={{ color: "#64748b", ...GM, fontSize: 10 }}>{t.uses}× used</span>
            <span style={{
              background: t.status === "Ready" ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)",
              color: t.status === "Ready" ? "#22C55E" : "#94a3b8",
              border: `1px solid ${t.status === "Ready" ? "rgba(34,197,94,0.25)" : "rgba(100,116,139,0.25)"}`,
              borderRadius: 999, padding: "2px 8px", ...GM, fontSize: 9, fontWeight: 700,
            }}>
              {t.status}
            </span>
          </div>
        </div>
      ))}
      <div style={{ padding: "10px 18px", background: "rgba(0,120,212,0.06)" }}>
        <span style={{ color: "#0078D4", ...GF, fontSize: 12, fontWeight: 700 }}>+ Create New Template</span>
      </div>
    </div>
  );
}

// ── Template content cards ────────────────────────────────────────────────────
function TemplateFeatureList() {
  return (
    <div>
      <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>WHAT A TEMPLATE RETAINS</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }} className="tf-grid">
        {TEMPLATE_FEATURES.map((f) => (
          <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0, fontSize: 12 }}>✓</span>
            <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>
      <style>{`.tf-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 480px) { .tf-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}

// ── Branding preview mockup ───────────────────────────────────────────────────
function BrandingMockup() {
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.2)",
      borderRadius: 14, overflow: "hidden",
      maxWidth: 380, width: "100%",
    }}>
      {/* Company header */}
      <div style={{ padding: "12px 18px", background: "#0078D4", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏢</div>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Mabini Legal Solutions</p>
          <p style={{ color: "rgba(255,255,255,0.7)", ...GF, fontSize: 10, margin: 0 }}>Sent via LAGDA</p>
        </div>
      </div>
      <div style={{ padding: "16px 18px" }}>
        <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>Professional Services Agreement</p>
        <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, marginBottom: 14 }}>Please review and sign the document below.</p>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 12, margin: 0 }}>📄 Professional Services Agreement.pdf</p>
        </div>
        <div style={{ background: "#0078D4", borderRadius: 8, padding: "9px 16px", textAlign: "center", ...GF, fontSize: 13, fontWeight: 700, color: "white" }}>
          Review and Sign
        </div>
      </div>
      {/* Footer */}
      <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#334155", ...GM, fontSize: 10 }}>LAGDA-VER-2026-004821</span>
        <span style={{ color: "#334155", ...GF, fontSize: 10 }}>Secured by LAGDA</span>
      </div>
    </div>
  );
}

// ── Role placeholder cards ────────────────────────────────────────────────────
function RolePlaceholders() {
  const ROLES = [
    { role: "Client",                  fills: "First signer in the engagement letter flow" },
    { role: "Lawyer",                  fills: "Approver or second signer" },
    { role: "Authorized Representative", fills: "Signs on behalf of the organization" },
    { role: "HR Manager",              fills: "Approves employment documents" },
    { role: "Finance Approver",        fills: "Approves procurement documents" },
    { role: "Copy Recipient",          fills: "Receives the completed document" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="rp-grid">
      {ROLES.map((r) => (
        <div key={r.role} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{r.role}</p>
          <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{r.fills}</p>
        </div>
      ))}
      <style>{`.rp-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 560px) { .rp-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function EsigTemplatesBranding() {
  return (
    <EsigPageShell>
      <PageHero
        eyebrow="Templates & Branding"
        headingId="tb-h1"
        heading="Turn repeat documents into branded, reusable workflows."
        sub="A LAGDA template is more than a stored document — it captures the full workflow: fields, routing, authentication, reminders, and branding. Build once. Use every time."
      />

      {/* Template library */}
      <PageSection id="template-library" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="tb-two-col">
          <div>
            <SectionHeading eyebrow="Template library" id="lib-heading" heading="Build once. Use every time." sub="Save any completed transaction setup — fields, participants, routing, authentication, and branding — as a reusable template." />
            <TemplateFeatureList />
            <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>
              Template availability and workspace-sharing controls may vary by plan.
            </p>
          </div>
          <TemplateLibraryMockup />
        </div>
        <style>{`.tb-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .tb-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Role placeholders */}
      <PageSection id="role-placeholders">
        <SectionHeading eyebrow="Participant roles" id="roles-heading" heading="Define the workflow. Assign the right people each time." sub="Templates use role placeholders — not fixed email addresses. Each time you use a template, you assign the right person to each role." />
        <RolePlaceholders />
        <div style={{ marginTop: 20, background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            "Build the workflow once. Assign the right people each time you use it." Templates are designed for organizations that repeatedly prepare the same type of document — engagement letters, NDAs, employment contracts, board resolutions.
          </p>
        </div>
      </PageSection>

      {/* Branding */}
      <PageSection id="branding" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="tb-two-col">
          <div>
            <SectionHeading eyebrow="Company branding" id="brand-heading" heading="Apply company branding only when it fits the document." />
            <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.65, margin: 0, marginBottom: 16 }}>
              LAGDA workspace branding lets organizations add a consistent identity to their outgoing documents — logo, company header, sender name, and email customization.
            </p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.65, margin: 0, marginBottom: 20 }}>
              Branding is applied to the signing interface and invitation email, not directly onto document content. LAGDA does not automatically overlay logos onto the PDF content itself.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Company logo in the signing interface",
                "Customizable invitation email subject and message",
                "Organizational sender name and identity",
                "Completion-page branding",
                "Verification placement and QR positioning",
                "Company branding never removes LAGDA trust indicators",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <BrandingMockup />
        </div>
      </PageSection>

      {/* Template states */}
      <PageSection id="template-states">
        <SectionHeading eyebrow="Template status" id="ts-heading" heading="Know which templates are ready to use." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }} className="ts-grid">
          {[
            { status: "Ready",           color: "#22C55E", desc: "Template is complete and available to all authorized senders in the workspace." },
            { status: "Draft",           color: "#F59E0B", desc: "Template setup is incomplete and not yet available to other senders." },
            { status: "Needs Review",    color: "#F59E0B", desc: "Template has been flagged for review by an administrator." },
            { status: "Restricted",      color: "#94a3b8", desc: "Template is available only to specific roles or senders." },
            { status: "Archived",        color: "#475569", desc: "Template is no longer active. Existing transactions are retained." },
            { status: "Enterprise Managed", color: "#C9960C", desc: "Template is centrally managed at the enterprise level." },
          ].map((s) => (
            <div key={s.status} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>{s.status}</span>
              </div>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ts-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .ts-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Team & Enterprise",     desc: "Shared templates, workspace roles, and administration", path: "/esignature/team-and-enterprise" },
        { label: "View Plans",            desc: "Template limits and availability by plan", path: "/pricing" },
      ]} />

      <PageCTA
        heading="Start with LAGDA eSignature today."
        sub="Create a free account and build your first reusable signing workflow."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="View Plans"
        secondaryPath="/pricing"
      />

      <LegalNote />
    </EsigPageShell>
  );
}
