import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions,
} from "../../../components/solutions/SolComponents";
import { BUSINESS_WORKFLOW } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: Multi-department approval flow ─────────────────────────────────────
function ApprovalFlowMockup() {
  const steps = [
    { label: "Operations", action: "Document prepared",    status: "DONE",    color: "#22C55E" },
    { label: "Legal",      action: "Review complete",      status: "DONE",    color: "#22C55E" },
    { label: "Finance",    action: "Terms approved",       status: "ACTIVE",  color: "#38BDF8" },
    { label: "Signatory",  action: "Awaiting turn",        status: "PENDING", color: "#7C8DA4" },
    { label: "Vendor",     action: "Not yet reached",      status: "PENDING", color: "#7C8DA4" },
  ];
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Vendor Service Agreement</p>
          <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "1px 0 0" }}>Multi-step approval · Bayani Business Services</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.12)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>IN PROGRESS</span>
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ padding: "9px 16px", borderBottom: i < steps.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: s.status === "DONE" ? "rgba(34,197,94,0.12)" : s.status === "ACTIVE" ? "rgba(0,120,212,0.15)" : "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...GM, fontSize: 9, fontWeight: 700,
            color: s.color, border: `1px solid ${s.color}33`,
          }}>
            {s.status === "DONE" ? "✓" : String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: s.status === "PENDING" ? "#7C8DA4" : "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{s.label}</p>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "1px 0 0" }}>{s.action}</p>
          </div>
          <span style={{ color: s.color, ...GM, fontSize: 9, fontWeight: 700 }}>{s.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#7C8DA4", ...GM, fontSize: 9 }}>LAGDA-VER-2026-002247</span>
        <span style={{ color: "#22C55E", ...GM, fontSize: 9, fontWeight: 700 }}>2 of 5 complete</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "🏢", title: "Multi-department routing",   desc: "Approvals span multiple departments with no structured routing path." },
  { icon: "⏳", title: "Bottlenecks at each step",   desc: "One delayed approver stalls every step after it." },
  { icon: "❓", title: "No status visibility",        desc: "Anyone outside the email thread has no idea where a document stands." },
  { icon: "📋", title: "Repeated preparation",        desc: "Operations and legal rebuild the same contract types for every new deal." },
  { icon: "🖋️", title: "Physical sign-off trips",    desc: "In-person signatures slow down transactions involving geographically distributed parties." },
  { icon: "📂", title: "Fragmented final records",    desc: "The signed document exists in multiple inboxes with no single official copy." },
];

const DOCS = [
  "Vendor and supplier agreements",
  "Service-level agreements",
  "Commercial contracts",
  "Joint venture agreements",
  "Business partnership agreements",
  "Authorization forms",
  "Internal approvals",
  "Non-disclosure agreements",
  "Amendment letters",
  "Policy acknowledgments",
  "Contractor agreements",
  "Renewal letters",
];

const CAPABILITIES = [
  { icon: "↕️", title: "Sequential signing",    desc: "Lock each step in order — one department acts, then the next.", path: "/features/sequential-signing" },
  { icon: "⚡", title: "Parallel signing",      desc: "Multiple parties sign simultaneously when order does not matter.", path: "/features/parallel-signing" },
  { icon: "📑", title: "Templates",             desc: "Standardize contract formats across business units.", path: "/features/templates" },
  { icon: "🗂️", title: "Team workspaces",       desc: "Shared templates and contacts across departments.", path: "/features/team-workspaces" },
  { icon: "📋", title: "Audit trail",            desc: "Every action per participant, timestamped.", path: "/features/audit-trail" },
  { icon: "🔍", title: "Document Verification", desc: "Confirm any completed document against its LAGDA record.", path: "/features/document-verification" },
];

export function BusinessTeams() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Business Teams"
        headingId="biz-h1"
        heading="Multi-department approvals and contracts — without the bottlenecks."
        sub="LAGDA eSignature gives operations, legal, finance, and procurement teams a structured approval workflow, shared templates, and real-time visibility — from preparation through verified completion."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      />

      <PageSection id="challenges" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="biz-two-col">
          <div>
            <SectionHeading eyebrow="What slows you down" id="ch-h2" heading="The problems that grow with every new deal." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>MULTI-STEP APPROVAL</p>
            <ApprovalFlowMockup />
          </div>
        </div>
        <style>{`.biz-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .biz-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow">
        <div style={{ display: "grid", gap: "32px 48px" }} className="biz-two-col">
          <div>
            <SectionHeading eyebrow="Approval workflow" id="wf-h2" heading="Structured routing — every department in order." />
            <WorkflowSteps steps={BUSINESS_WORKFLOW} />
          </div>
          <div>
            <SectionHeading eyebrow="Document examples" id="doc-h2" heading="Where electronic signing may apply." sub="Common business document types — applicable requirements vary by document type, industry, and law." />
            <DocExampleList docs={DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            <div style={{ marginTop: 16 }}>
              <NoticeBox label="ORGANIZATION RESPONSIBILITY NOTE" text="Some transactions, regulatory filings, and document types require wet signatures, corporate seals, notarization, or other formalities. Organizations remain responsible for determining the requirements applicable to each transaction." />
            </div>
          </div>
        </div>
        <style>{`.biz-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .biz-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities" light bordered>
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful to business teams." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      <PageSection id="enotary">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageSection id="related-solutions" light bordered>
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Related departments and workflows." center />
        <RelatedSolutions paths={[
          { label: "Procurement", desc: "Vendor agreements and sequential approvals", path: "/solutions/procurement" },
          { label: "Finance",     desc: "Budget approvals and financial authorizations", path: "/solutions/finance" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Bring your team onto one approval workflow."
        sub="Start with a free LAGDA account or contact Sales for a team workspace setup and demo."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Book a Demo"
        secondaryPath="/book-a-demo?solution=business-teams"
      />
      <SolLegalNote />
    </SolPageShell>
  );
}
