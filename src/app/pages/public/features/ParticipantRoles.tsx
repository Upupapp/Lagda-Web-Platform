import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { PARTICIPANT_ROLES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Role assignment mockup ────────────────────────────────────────────────────
function RoleAssignmentMockup() {
  const assignments = [
    { name: "Marco Santos",   email: "marco.santos@example.com", role: "Signer",         avatar: "MS", color: "#0078D4" },
    { name: "Ana Reyes",      email: "ana.reyes@example.com",    role: "Approver",        avatar: "AR", color: "#22C55E" },
    { name: "Lea Cruz",       email: "lea.cruz@example.com",     role: "Copy Recipient",  avatar: "LC", color: "#64748b" },
  ];
  return (
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0 }}>Participant Setup</p>
        <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "2px 0 0" }}>Professional Services Agreement</p>
      </div>
      {assignments.map((a) => (
        <div key={a.name} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${a.color}22`, border: `1px solid ${a.color}44`, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 10, fontWeight: 700, color: a.color, flexShrink: 0 }}>{a.avatar}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{a.name}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</p>
          </div>
          <span style={{ background: `${a.color}18`, border: `1px solid ${a.color}33`, color: a.color, ...GM, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 999, flexShrink: 0 }}>{a.role}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,120,212,0.06)" }}>
        <span style={{ color: "#0078D4", ...GF, fontSize: 12, fontWeight: 700 }}>+ Add participant</span>
      </div>
    </div>
  );
}

export function ParticipantRoles() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Participant Roles"
        headingId="pr-h1"
        heading="Every person in a transaction has a role that defines what they do."
        sub="LAGDA eSignature supports several participant roles — each with distinct access, responsibilities, field assignments, notifications, and activity records."
      />

      <PageSection id="role-list" light bordered>
        <SectionHeading eyebrow="Active roles" id="roles-h2" heading="Six roles for eSignature transactions." sub="Assign each participant to the role that matches their responsibility in the workflow." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="roles-grid">
          {PARTICIPANT_ROLES.map((r) => (
            <div key={r.role} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 18px" }}>
              <span aria-hidden style={{ fontSize: 24, display: "block", marginBottom: 10 }}>{r.icon}</span>
              <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 6 }}>{r.role}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.roles-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .roles-grid { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 480px) { .roles-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="assignment">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="dp-two-col">
          <div>
            <SectionHeading eyebrow="Field assignment" id="fa-h2" heading="Each participant only sees and acts on their assigned fields." sub="When you place a field on a document, you assign it to a specific role. That role's participants interact only with their own fields — not others." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "A Signer only sees and completes their signature and initials fields",
                "An Approver receives an approval action — not a full signature unless configured",
                "A Reviewer gets access to review without taking a required action",
                "A Viewer can read the document without being required to act",
                "A Copy Recipient receives a notification or copy on completion",
                "A Sender manages the entire transaction from preparation to completion",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <RoleAssignmentMockup />
        </div>
        <style>{`.dp-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .dp-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="routing" light bordered>
        <SectionHeading eyebrow="Routing" id="routing-h2" heading="Role determines when a participant receives their invitation." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }} className="route-grid">
          {[
            { title: "Parallel routing", desc: "All participants in a step receive their invitation at the same time. Completion order does not matter." },
            { title: "Sequential routing", desc: "One participant's invitation is sent only after the previous step is complete. Useful for approval chains." },
            { title: "Mixed routing", desc: "Steps are sequential, but multiple participants within one step may act in parallel." },
            { title: "Copy Recipient timing", desc: "Copy Recipients typically receive a notification after the transaction is complete, not during signing." },
          ].map((r) => (
            <div key={r.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.route-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .route-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="enotary-note">
        <div style={{ background: "rgba(103,2,59,0.06)", border: "1px solid rgba(103,2,59,0.2)", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ color: "#c084fc", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>eNOTARY — NOT AN ACTIVE ROLE</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Notary Public is not an active participant role in LAGDA eSignature. Electronic signing and electronic notarization are separate processes. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Parallel Signing",   desc: "Multiple participants acting at the same time", path: "/features/parallel-signing" },
        { label: "Sequential Signing", desc: "Participants acting in a defined order", path: "/features/sequential-signing" },
        { label: "Document Preparation", desc: "Placing fields and assigning roles", path: "/features/document-preparation" },
      ]} />

      <PageCTA
        heading="Explore parallel and sequential signing."
        primaryLabel="Parallel Signing"
        primaryPath="/features/parallel-signing"
        secondaryLabel="Sequential Signing"
        secondaryPath="/features/sequential-signing"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
