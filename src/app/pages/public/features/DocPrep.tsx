import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote, AvailBadge,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Document workspace mockup ─────────────────────────────────────────────────
function DocWorkspaceMockup() {
  const fields = [
    { type: "Signature",  participant: "Marco Santos · Signer",   page: 3 },
    { type: "Initials",   participant: "Marco Santos · Signer",   page: 1 },
    { type: "Date",       participant: "System (auto-fill)",       page: 3 },
    { type: "Full name",  participant: "Ana Reyes · Approver",    page: 1 },
    { type: "Approval",   participant: "Ana Reyes · Approver",    page: 3 },
  ];
  return (
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 480, width: "100%" }}>
      {/* Toolbar */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Signature", "Initials", "Date", "Text", "Checkbox"].map((t) => (
          <span key={t} style={{ background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.25)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>{t}</span>
        ))}
      </div>
      {/* Document preview */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 32, height: 40, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 8, color: "#8A9BAE" }}>PDF</div>
          <div>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>Professional Services Agreement</p>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: 0 }}>3 pages · 4 fields placed</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3].map((pg) => (
            <div key={pg} style={{ flex: 1, height: 48, background: pg === 3 ? "rgba(0,120,212,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${pg === 3 ? "rgba(0,120,212,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 9, color: "#8A9BAE" }}>
              Pg {pg}{pg === 3 && " ●"}
            </div>
          ))}
        </div>
      </div>
      {/* Field list */}
      <div style={{ padding: "8px 0" }}>
        {fields.map((f) => (
          <div key={f.type + f.participant} style={{ padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "rgba(0,120,212,0.12)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{f.type}</span>
              <span style={{ color: "#94A3B8", ...GF, fontSize: 11 }}>{f.participant}</span>
            </div>
            <span style={{ color: "#7C8DA4", ...GM, fontSize: 9 }}>pg {f.page}</span>
          </div>
        ))}
      </div>
      {/* Summary */}
      <div style={{ padding: "10px 16px", background: "rgba(0,120,212,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>Ready to review</span>
        <span style={{ background: "#0078D4", color: "white", ...GF, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6 }}>Review & Send</span>
      </div>
    </div>
  );
}

const FIELD_TYPES = [
  { type: "Signature",    desc: "Visible signature representation adopted by the participant." },
  { type: "Initials",     desc: "Abbreviated initials for each page or section acknowledgement." },
  { type: "Full name",    desc: "Participant's full name, typed or pre-filled." },
  { type: "Date",         desc: "Date of signing — auto-filled or set by the platform." },
  { type: "Text",         desc: "Free-form text input for variable information." },
  { type: "Checkbox",     desc: "Binary selection for acknowledgements and confirmations." },
  { type: "Radio button", desc: "Single selection from a set of options." },
  { type: "Dropdown",     desc: "Choice from a defined list of values." },
  { type: "Attachment",   desc: "File upload by a participant as part of the transaction." },
  { type: "Approval",     desc: "Formal approval action without a visible signature." },
];

export function DocPrep() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Document Preparation"
        headingId="dp-h1"
        heading="Prepare documents before they reach a single participant."
        sub="Upload PDFs, place fields, assign participants, configure routing, and review the complete setup before sending. Every signing transaction starts with preparation."
      />

      <PageSection id="workspace" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="dp-two-col">
          <div>
            <SectionHeading eyebrow="Field placement" id="fp-h2" heading="Place the right fields for the right participants." sub="Assign each field to a specific participant role. Signers only see and complete their own required fields." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Upload one or more PDFs in a single transaction", "Set document order for multi-document workflows", "Browse page thumbnails and preview before placing fields", "Assign fields to specific participant roles", "Mark fields as required or optional", "Review the complete preparation summary before sending", "Save as a draft if setup is not complete"].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#38BDF8", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <DocWorkspaceMockup />
        </div>
        <style>{`.dp-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .dp-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="field-types">
        <SectionHeading eyebrow="Field types" id="ft-h2" heading="Capture exactly what each transaction requires." center />
        <div style={{ display: "grid", gap: 10 }} className="ft-grid">
          {FIELD_TYPES.map((f) => (
            <div key={f.type} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, margin: 0, marginBottom: 4 }}>{f.type}</p>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ft-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .ft-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="templates-link" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "center" }} className="dp-two-col">
          <div>
            <SectionHeading eyebrow="Reuse" id="reuse-h2" heading="Save your setup as a template." sub="Once a document workflow is configured, save it as a template to reuse with different participants — without reconfiguring fields and routing each time." />
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.2)", color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 8 }}>Templates →</span>
            </div>
          </div>
          <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 14, padding: "20px 18px" }}>
            <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>TEMPLATE REUSE</p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0 }}>
              A template retains the document, field configuration, participant roles, routing, authentication rules, and branding. Each time you use it, assign the right person to each role.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection id="prep-note">
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 24px" }}>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            <strong style={{ color: "white" }}>Note:</strong> The document-preparation interface is part of the authenticated LAGDA platform. The example above is illustrative. File-size and page limits vary by plan.
          </p>
        </div>
        <div style={{ marginTop: 12 }}>
          <AvailBadge tier="Core" />
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Participant Roles",  desc: "Who can be assigned to each field", path: "/features/participant-roles" },
        { label: "Core Workflow",      desc: "The complete preparation-to-completion flow", path: "/esignature/core-workflow" },
        { label: "Templates",          desc: "Save and reuse preparation setups", path: "/features/templates" },
      ]} />

      <PageCTA
        heading="See the Core Workflow in detail."
        sub="The Core Workflow page walks through preparation, routing, authentication, and completion."
        primaryLabel="Core Workflow"
        primaryPath="/esignature/core-workflow"
        secondaryLabel="Create Free Account"
        secondaryPath="/create-account"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
