import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions,
} from "../../../components/solutions/SolComponents";
import { FINANCE_WORKFLOW, FINANCE_NOTICE } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: Budget approval chain ─────────────────────────────────────────────
function FinanceApprovalMockup() {
  const steps = [
    { label: "Department submits request",   status: "DONE",    color: "#22C55E" },
    { label: "Finance reviews documents",    status: "DONE",    color: "#22C55E" },
    { label: "Budget authority approves",    status: "ACTIVE",  color: "#0078D4" },
    { label: "CFO / Authorized signatory",   status: "PENDING", color: "#334155" },
  ];
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Capital Expenditure Authorization</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>Finance approval chain · Internal routing</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.12)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>STEP 3 OF 4</span>
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ padding: "9px 16px", borderBottom: i < steps.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: s.status === "DONE" ? "rgba(34,197,94,0.12)" : s.status === "ACTIVE" ? "rgba(0,120,212,0.15)" : "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            ...GM, fontSize: 9, fontWeight: 700, color: s.color, border: `1px solid ${s.color}33`,
          }}>
            {s.status === "DONE" ? "✓" : String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: s.status === "PENDING" ? "#334155" : "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{s.label}</p>
          </div>
          <span style={{ color: s.color, ...GM, fontSize: 9, fontWeight: 700 }}>{s.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)" }}>
        <span style={{ color: "#334155", ...GM, fontSize: 9 }}>Full audit trail of all approvals retained</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "✍️", title: "Manual sign-off chains",   desc: "Budget approvals route through multiple levels without a structured path." },
  { icon: "❓", title: "No approval status",        desc: "Requestors have no visibility into where an approval stands." },
  { icon: "⏳", title: "Physical document delays",  desc: "Wet signatures from senior approvers add days to every approval." },
  { icon: "📂", title: "Inconsistent records",      desc: "Completed approvals sit in email threads rather than a central accessible record." },
  { icon: "🔄", title: "Repeated form preparation", desc: "The same authorization forms are rebuilt for every new request." },
  { icon: "🔒", title: "Access control gaps",       desc: "Documents with financial data are shared via email with limited control over access." },
];

const DOCS = [
  "Internal budget approval forms",
  "Expense authorization requests",
  "Capital expenditure approvals",
  "Payment authorization forms",
  "Internal signatory acknowledgments",
  "Financial policy acknowledgments",
  "Disbursement authorization forms",
  "Petty cash fund acknowledgments",
  "Department budget acknowledgments",
  "Reimbursement approval forms",
];

const CAPABILITIES = [
  { icon: "↕️", title: "Sequential signing",    desc: "Multi-level approvals — each authority acts in the required order.", path: "/features/sequential-signing" },
  { icon: "📑", title: "Templates",             desc: "Standardize every approval form type with a saved template.", path: "/features/templates" },
  { icon: "🗂️", title: "Team workspaces",       desc: "Shared templates and contacts for the finance team.", path: "/features/team-workspaces" },
  { icon: "🔑", title: "Signer authentication", desc: "Require stronger authentication for high-authority signatories.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",            desc: "Full timestamped record of every action per participant.", path: "/features/audit-trail" },
  { icon: "🔍", title: "Document Verification", desc: "Confirm any completed authorization form against its LAGDA record.", path: "/features/document-verification" },
];

export function Finance() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Finance Teams"
        headingId="fin-h1"
        heading="Budget approvals, authorizations, and financial acknowledgments — structured and auditable."
        sub="LAGDA eSignature helps finance teams route internal approvals, disbursement authorizations, and acknowledgment forms through structured signing chains — with a full audit trail."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      />

      <PageSection id="notice" light bordered>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <NoticeBox label="FINANCE USE — IMPORTANT NOTE" text={FINANCE_NOTICE} />
        </div>
      </PageSection>

      <PageSection id="challenges">
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="fin-two-col">
          <div>
            <SectionHeading eyebrow="Internal finance workflow problems" id="ch-h2" heading="The same delays appear in every approval cycle." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>BUDGET APPROVAL IN PROGRESS</p>
            <FinanceApprovalMockup />
          </div>
        </div>
        <style>{`.fin-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .fin-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow" light bordered>
        <div style={{ display: "grid", gap: "32px 48px" }} className="fin-two-col">
          <div>
            <SectionHeading eyebrow="Approval workflow" id="wf-h2" heading="From submission to verified approval record." />
            <WorkflowSteps steps={FINANCE_WORKFLOW} />
          </div>
          <div>
            <SectionHeading eyebrow="Document examples" id="doc-h2" heading="Internal finance documents where electronic signing may apply." sub="These are internal authorization and acknowledgment forms — where your organization has determined electronic signing is appropriate under applicable policies." />
            <DocExampleList docs={DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            <div style={{ marginTop: 16 }}>
              <NoticeBox label="REGULATORY NOTE" text="LAGDA does not make any representation about regulatory compliance for financial transactions. Organizations must determine the controls, recordkeeping, and signature requirements that apply to each document under applicable law and institutional policy." />
            </div>
          </div>
        </div>
        <style>{`.fin-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .fin-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities">
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful for finance teams." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      <PageSection id="enotary" light bordered>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageSection id="related-solutions">
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Also relevant for your organization." center />
        <RelatedSolutions paths={[
          { label: "Business Teams", desc: "Contracts and multi-department approvals",  path: "/solutions/business-teams" },
          { label: "Procurement",    desc: "Vendor agreements and payment terms",        path: "/solutions/procurement" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Bring structure to your internal approvals."
        sub="Contact Sales for a team workspace setup or start free to explore the approval workflow."
        primaryLabel="Book a Demo"
        primaryPath="/book-a-demo?solution=finance"
        secondaryLabel="Create Free Account"
        secondaryPath="/create-account"
      />
      <SolLegalNote extra={FINANCE_NOTICE} />
    </SolPageShell>
  );
}
