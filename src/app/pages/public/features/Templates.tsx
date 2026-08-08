import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote, AvailBadge,
} from "../../../components/esignature/EsigPageShell";
import { TEMPLATE_FIELDS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function TemplateLibraryMockup() {
  const templates = [
    { name: "Professional Services Agreement", uses: 12, roles: 2, fields: 4, status: "Ready" },
    { name: "Engagement Letter",               uses: 8,  roles: 2, fields: 3, status: "Ready" },
    { name: "NDA — Standard",                  uses: 31, roles: 2, fields: 3, status: "Ready" },
    { name: "Board Resolution Template",       uses: 4,  roles: 3, fields: 2, status: "Draft" },
  ];
  return (
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 460, width: "100%" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>Template Library</span>
        <span style={{ background: "rgba(0,120,212,0.15)", color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>4 templates</span>
      </div>
      {templates.map((t) => (
        <div key={t.name} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</p>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "2px 0 0" }}>{t.roles} roles · {t.fields} fields · {t.uses}× used</p>
          </div>
          <span style={{
            background: t.status === "Ready" ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)",
            color: t.status === "Ready" ? "#22C55E" : "#94a3b8",
            border: `1px solid ${t.status === "Ready" ? "rgba(34,197,94,0.25)" : "rgba(100,116,139,0.25)"}`,
            borderRadius: 999, padding: "2px 8px", ...GM, fontSize: 9, fontWeight: 700, flexShrink: 0,
          }}>{t.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,120,212,0.06)" }}>
        <span style={{ color: "#38BDF8", ...GF, fontSize: 12, fontWeight: 700 }}>+ Create New Template</span>
      </div>
    </div>
  );
}

const TEMPLATE_STATUSES = [
  { status: "Ready",            color: "#22C55E", desc: "Complete and available to authorized senders in the workspace." },
  { status: "Draft",            color: "#F59E0B", desc: "Setup is incomplete — not yet available for use." },
  { status: "Needs Review",     color: "#F59E0B", desc: "Flagged for review by an administrator." },
  { status: "Restricted",       color: "#94a3b8", desc: "Available only to specific roles or senders." },
  { status: "Archived",         color: "#8A9BAE", desc: "No longer active. Existing transactions are retained." },
  { status: "Enterprise Managed", color: "#C9960C", desc: "Centrally managed at the enterprise level." },
];

export function Templates() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Templates"
        headingId="tmpl-h1"
        heading="Build a signing workflow once. Use it every time."
        sub="A LAGDA template is more than a stored document — it captures the complete workflow: fields, roles, routing, authentication, branding, reminders, and expiration. Set it up once, then launch a new transaction in seconds."
      />

      <PageSection id="library" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="tmpl-two-col">
          <div>
            <SectionHeading eyebrow="Template library" id="tl-h2" heading="Every team's recurring documents — organized." sub="Templates are stored in your workspace library. Authorized senders can start a new transaction from any ready template." />
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>WHAT A TEMPLATE RETAINS</p>
            <div style={{ display: "grid", gap: 6 }} className="tf-grid">
              {TEMPLATE_FIELDS.map((f) => (
                <div key={f} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                  <span style={{ color: "#38BDF8", fontWeight: 700, flexShrink: 0, fontSize: 12, marginTop: 1 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 12, lineHeight: 1.45 }}>{f}</span>
                </div>
              ))}
            </div>
            <style>{`.tf-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 480px) { .tf-grid { grid-template-columns: 1fr; } }`}</style>
            <p style={{ color: "#8A9BAE", ...GF, fontSize: 13, marginTop: 14, lineHeight: 1.6 }}>
              Template availability and workspace-sharing controls may vary by plan.
            </p>
          </div>
          <TemplateLibraryMockup />
        </div>
        <style>{`.tmpl-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .tmpl-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="roles">
        <SectionHeading eyebrow="Role placeholders" id="rp-h2" heading="Define the workflow. Assign the right people each time." sub="Templates use role placeholders — not fixed email addresses. Each time you start a transaction, assign the right person to each role." />
        <div style={{ display: "grid", gap: 10 }} className="rp-grid">
          {["Client", "Lawyer / Counsel", "Authorized Representative", "HR Manager", "Finance Approver", "Copy Recipient"].map((r) => (
            <div key={r} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 12px" }}>
              <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700 }}>ROLE</span>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: "4px 0 0" }}>{r}</p>
            </div>
          ))}
        </div>
        <style>{`.rp-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .rp-grid { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 480px) { .rp-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="statuses" light bordered>
        <SectionHeading eyebrow="Template status" id="ts-h2" heading="Know which templates are ready to use." center />
        <div style={{ display: "grid", gap: 10 }} className="ts-grid">
          {TEMPLATE_STATUSES.map((s) => (
            <div key={s.status} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>{s.status}</span>
              </div>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <AvailBadge tier="Advanced" />
          <span style={{ color: "#8A9BAE", ...GF, fontSize: 13, marginLeft: 10 }}>Template availability and sharing controls may be plan-dependent.</span>
        </div>
        <style>{`.ts-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .ts-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Templates & Branding",  desc: "Templates in the eSignature product section", path: "/esignature/templates-and-branding" },
        { label: "Company Branding",      desc: "Apply workspace branding to templates", path: "/features/company-branding" },
        { label: "Contacts",              desc: "Reuse participant data across templates", path: "/features/contacts" },
      ]} />

      <PageCTA
        heading="Start with LAGDA eSignature today."
        sub="Create a free account and build your first reusable signing workflow."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Templates & Branding"
        secondaryPath="/esignature/templates-and-branding"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
