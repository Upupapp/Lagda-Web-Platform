import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import {
  PageHero, PageSection, SectionHeading, PageCTA,
} from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, ParticipantRoles, RelatedSolutions,
} from "../../../components/solutions/SolComponents";
import { FIRM_WORKFLOW, FIRM_NOTICE } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: Firm workspace with member roles ──────────────────────────────────
function FirmWorkspaceMockup() {
  const members = [
    { name: "Ana Reyes",    role: "Owner",                  avatar: "AR", status: "Active" },
    { name: "Daniel Lim",   role: "Template Administrator", avatar: "DL", status: "Active" },
    { name: "Sofia Navarro",role: "Sender",                 avatar: "SN", status: "Active" },
    { name: "Marco Santos", role: "Auditor",                avatar: "MS", status: "Active" },
  ];
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Northbridge Legal Group</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>Firm Workspace · 4 members</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.12)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>WORKSPACE</span>
      </div>
      {members.map((m) => (
        <div key={m.name} style={{ padding: "9px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,120,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 9, fontWeight: 700, color: "#38bdf8", flexShrink: 0 }}>{m.avatar}</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{m.name}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>{m.role}</p>
          </div>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)", display: "flex", gap: 14 }}>
        <span style={{ color: "#0078D4", ...GF, fontSize: 11, fontWeight: 700 }}>+ Invite member</span>
        <span style={{ color: "#475569", ...GF, fontSize: 11 }}>7 templates · 26 active</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "👥", title: "Multiple senders",          desc: "Different lawyers send similar documents inconsistently without a shared system." },
  { icon: "📑", title: "No shared templates",       desc: "Every team member builds the same documents from scratch." },
  { icon: "🏷️", title: "Inconsistent branding",    desc: "Outgoing documents don't consistently represent the firm's identity." },
  { icon: "🔐", title: "Access control gaps",       desc: "Any team member can send any document without authorization controls." },
  { icon: "📊", title: "No usage visibility",       desc: "Firm administrators cannot see what was sent, by whom, or when." },
  { icon: "📂", title: "Disconnected records",      desc: "Completed documents exist in individual inboxes, not a firm record." },
];

const DOCS = [
  "Engagement letters",
  "Retainer agreements",
  "Client intake acknowledgments",
  "Conflict-check confirmations",
  "Confidentiality agreements",
  "Legal-service agreements",
  "Matter-update acknowledgments",
  "Corporate document execution",
  "Internal approvals",
  "Vendor and supplier agreements",
  "Policy acknowledgments",
  "Matter-closing acknowledgments",
];

const FIRM_ROLES = [
  { role: "Owner",                  desc: "Full control over workspace, billing, and member management." },
  { role: "Administrator",          desc: "Manages members, templates, branding, and workspace settings." },
  { role: "Template Administrator", desc: "Creates, edits, and publishes templates for firm-wide use." },
  { role: "Billing Administrator",  desc: "Manages subscription, payment, and plan details." },
  { role: "Security Administrator", desc: "Configures authentication requirements and access controls." },
  { role: "Sender",                 desc: "Prepares and sends document transactions." },
  { role: "Auditor",                desc: "Access to audit records and usage reports." },
];

const CAPABILITIES = [
  { icon: "🗂️", title: "Team Workspaces",       desc: "Multiple senders, shared templates, and centralized visibility.", path: "/features/team-workspaces" },
  { icon: "📑", title: "Shared templates",        desc: "Firm-approved workflows locked and published by Template Administrators.", path: "/features/templates" },
  { icon: "🏢", title: "Company branding",        desc: "Firm logo and identity on every outgoing document and invitation.", path: "/features/company-branding" },
  { icon: "🔑", title: "Authentication controls", desc: "Configure authentication defaults across the workspace.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",              desc: "Full event history per transaction. Auditor role for firm review.", path: "/features/audit-trail" },
  { icon: "🔍", title: "Verification",             desc: "Every completed document gets a Verification ID.", path: "/features/document-verification" },
];

export function LawFirms() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Law Firms"
        headingId="lf-h1"
        heading="Firm-wide document workflows — consistent, controlled, and verifiable."
        sub="LAGDA Team Workspaces give law firms shared templates, role-based access, company branding, and centralized audit visibility across every matter and sender in the firm."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      />

      <PageSection id="challenges" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="lf-two-col">
          <div>
            <SectionHeading eyebrow="Firm-level problems" id="ch-h2" heading="The problems that grow with your team." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>FIRM WORKSPACE</p>
            <FirmWorkspaceMockup />
          </div>
        </div>
        <style>{`.lf-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .lf-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workspace-model">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px" }} className="lf-two-col">
          <div>
            <SectionHeading eyebrow="Workspace model" id="wm-h2" heading="One firm workspace — every lawyer, one system." sub="A LAGDA firm workspace provides shared contacts, templates, branding, and audit visibility across all authorized senders." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Multiple lawyers and senders under one workspace",
                "Shared template library — only Template Administrators publish",
                "Firm logo and email identity on all outgoing documents",
                "Role-based access — who can send, review, or audit",
                "Shared contact directory for recurring clients",
                "Centralized usage and activity visibility",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#0078D4", flexShrink: 0, fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Workspace roles" id="wr-h2" heading="Role-based permissions for every function." sub="Roles control who can send, manage, audit, and administer. Multiple roles can be combined for the same member." />
            <ParticipantRoles roles={FIRM_ROLES} />
          </div>
        </div>
        <style>{`.lf-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .lf-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px" }} className="lf-two-col">
          <div>
            <SectionHeading eyebrow="Client engagement workflow" id="wf-h2" heading="From template to verified completion." />
            <WorkflowSteps steps={FIRM_WORKFLOW} />
          </div>
          <div>
            <SectionHeading eyebrow="Document examples" id="doc-h2" heading="Where electronic signing may apply." sub="These are typical law-firm document types. Applicable requirements vary by document, matter, and applicable law." />
            <DocExampleList docs={DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            <div style={{ marginTop: 16 }}>
              <NoticeBox label="FIRM RESPONSIBILITY NOTE" text={FIRM_NOTICE} />
            </div>
          </div>
        </div>
        <style>{`.lf-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .lf-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities">
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful to law firms." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      <PageSection id="enotary" light bordered>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageSection id="related-solutions">
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Also relevant for your practice." center />
        <RelatedSolutions paths={[
          { label: "Lawyers",        desc: "Solo and independent practitioner workflows",  path: "/solutions/lawyers" },
          { label: "Business Teams", desc: "Corporate contracts and approvals",            path: "/solutions/business-teams" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Get your firm workspace set up."
        sub="LAGDA team workspaces support multiple senders, shared templates, and firm branding. Contact Sales for larger deployments."
        primaryLabel="Book a Demo"
        primaryPath="/contact"
        secondaryLabel="Compare Plans"
        secondaryPath="/pricing/compare"
      />
      <SolLegalNote extra={FIRM_NOTICE} />
    </SolPageShell>
  );
}
