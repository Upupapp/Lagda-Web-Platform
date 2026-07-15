import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions, ParticipantRoles,
} from "../../../components/solutions/SolComponents";
import { PROCUREMENT_WORKFLOW } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: Supplier agreement routing ────────────────────────────────────────
function ProcurementMockup() {
  const steps = [
    { label: "Procurement",           action: "Agreement prepared",   status: "DONE",    color: "#22C55E" },
    { label: "Legal",                 action: "Review complete",      status: "DONE",    color: "#22C55E" },
    { label: "Finance",               action: "Budget approved",      status: "DONE",    color: "#22C55E" },
    { label: "Company Representative",action: "Signing now",          status: "ACTIVE",  color: "#0078D4" },
    { label: "Vendor",                action: "Awaiting company sign", status: "PENDING", color: "#334155" },
  ];
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Supplier Service Agreement</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>5-step approval chain · Annual contract</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.12)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>STEP 4 OF 5</span>
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
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>{s.action}</p>
          </div>
          <span style={{ color: s.color, ...GM, fontSize: 9, fontWeight: 700 }}>{s.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)" }}>
        <span style={{ color: "#334155", ...GM, fontSize: 9 }}>Full audit trail from first step</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "🔄", title: "Long approval chains",        desc: "Procurement, legal, finance, and executive sign-off with no structured routing." },
  { icon: "⏳", title: "Vendor coordination delays",  desc: "Getting a supplier to sign a physical document takes far longer than necessary." },
  { icon: "❓", title: "No approval visibility",      desc: "Requestors don't know which step a document is at without asking." },
  { icon: "📋", title: "Repetitive form preparation", desc: "The same supplier agreement structure is rebuilt for each new vendor." },
  { icon: "📂", title: "Scattered signed copies",     desc: "Completed agreements live in multiple inboxes with no central record." },
  { icon: "🔐", title: "Access control gaps",          desc: "Sensitive commercial terms are shared via email without access control." },
];

const DOCS = [
  "Supplier and vendor agreements",
  "Service-level agreements",
  "Purchase order acknowledgments",
  "Non-disclosure agreements",
  "Supplier onboarding acknowledgments",
  "Contract amendments",
  "Renewal agreements",
  "Goods receipt acknowledgments",
  "Subcontractor agreements",
  "Internal procurement approvals",
  "Authorization letters",
  "Policy acknowledgments",
];

const PROCUREMENT_ROLES = [
  { role: "Procurement team",           desc: "Prepares the document and initiates the approval workflow." },
  { role: "Legal reviewer",             desc: "Reviews commercial terms before the document proceeds." },
  { role: "Finance approver",           desc: "Budget authority confirms terms and approves." },
  { role: "Company representative",     desc: "Authorized signatory completes the company side." },
  { role: "Vendor / Supplier",          desc: "External party completes the signing after internal approvals." },
];

const CAPABILITIES = [
  { icon: "↕️", title: "Sequential signing",    desc: "Each internal step is locked until the previous is complete.", path: "/features/sequential-signing" },
  { icon: "📑", title: "Templates",             desc: "Standardize supplier agreements so every vendor gets the same controlled workflow.", path: "/features/templates" },
  { icon: "🗂️", title: "Team workspaces",       desc: "Shared templates and contacts across the procurement function.", path: "/features/team-workspaces" },
  { icon: "🔑", title: "Signer authentication", desc: "OTP or account-based authentication for both internal and external signatories.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",            desc: "Complete record of every action from preparation through vendor signature.", path: "/features/audit-trail" },
  { icon: "🔍", title: "Document Verification", desc: "Confirm the final agreement matches its LAGDA record.", path: "/features/document-verification" },
];

export function Procurement() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Procurement"
        headingId="proc-h1"
        heading="Supplier agreements and internal approvals — routing, signing, and verified."
        sub="LAGDA eSignature gives procurement teams structured multi-step approval workflows, standardized vendor agreement templates, and complete audit visibility from first draft through vendor signature."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      />

      <PageSection id="challenges" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="proc-two-col">
          <div>
            <SectionHeading eyebrow="Procurement workflow problems" id="ch-h2" heading="Delays at every step of the approval chain." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>SUPPLIER AGREEMENT ROUTING</p>
            <ProcurementMockup />
          </div>
        </div>
        <style>{`.proc-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .proc-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px" }} className="proc-two-col">
          <div>
            <SectionHeading eyebrow="Procurement workflow" id="wf-h2" heading="Internal approvals first — then vendor." />
            <WorkflowSteps steps={PROCUREMENT_WORKFLOW} />
            <div style={{ marginTop: 24 }}>
              <SectionHeading eyebrow="Who participates" id="roles-h2" heading="Roles in a typical procurement workflow." />
              <ParticipantRoles roles={PROCUREMENT_ROLES} />
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Document examples" id="doc-h2" heading="Where electronic signing may apply." sub="Common procurement and supplier document types — applicable requirements vary by organization, document type, and governing law." />
            <DocExampleList docs={DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            <div style={{ marginTop: 16 }}>
              <NoticeBox label="ORGANIZATION RESPONSIBILITY NOTE" text="Some procurement transactions may require additional formalities — such as notarization, government permits, or institutional approval — beyond electronic signing. Organizations remain responsible for determining applicable requirements for each transaction." />
            </div>
          </div>
        </div>
        <style>{`.proc-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .proc-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities" light bordered>
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful for procurement." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      <PageSection id="enotary">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageSection id="related-solutions" light bordered>
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Also relevant for your team." center />
        <RelatedSolutions paths={[
          { label: "Business Teams", desc: "Corporate approvals and multi-department routing", path: "/solutions/business-teams" },
          { label: "Finance",        desc: "Budget approvals and payment authorizations",       path: "/solutions/finance" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Streamline your vendor agreement process."
        sub="Contact Sales for a team workspace or start free to explore procurement workflow templates."
        primaryLabel="Book a Demo"
        primaryPath="/book-a-demo?solution=procurement"
        secondaryLabel="Create Free Account"
        secondaryPath="/create-account"
      />
      <SolLegalNote />
    </SolPageShell>
  );
}
