import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions,
} from "../../../components/solutions/SolComponents";
import { GOVERNMENT_WORKFLOW, GOVERNMENT_NOTICE } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: Office workflow with reviewer chain ───────────────────────────────
function GovernmentWorkflowMockup() {
  const flow = [
    { label: "Administrative Staff",    action: "Document prepared", status: "DONE",    color: "#22C55E" },
    { label: "Department Reviewer",     action: "In review",         status: "ACTIVE",  color: "#a78bfa" },
    { label: "Finance — Budget Office", action: "Awaiting",          status: "PENDING", color: "#7C8DA4" },
    { label: "Authorized Officer",      action: "Awaiting",          status: "PENDING", color: "#7C8DA4" },
  ];
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(167,139,250,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Purchase Request for Approval</p>
          <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "1px 0 0" }}>Internal workflow · Office document routing</p>
        </div>
        <span style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(167,139,250,0.25)" }}>IN REVIEW</span>
      </div>
      {flow.map((s, i) => (
        <div key={i} style={{ padding: "9px 16px", borderBottom: i < flow.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: s.status === "DONE" ? "rgba(34,197,94,0.12)" : s.status === "ACTIVE" ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            ...GM, fontSize: 9, fontWeight: 700, color: s.color, border: `1px solid ${s.color}33`,
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
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)" }}>
        <span style={{ color: "#7C8DA4", ...GM, fontSize: 9 }}>Subject to agency policy and applicable procurement rules</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "📬", title: "Physical document routing",  desc: "Routing forms between offices, approvers, and budget holders adds days to internal processes." },
  { icon: "✍️", title: "Manual sign-off",            desc: "Authorized officers must physically sign documents before a process can proceed." },
  { icon: "❓", title: "No tracking in transit",     desc: "There is no reliable record of where a document is or who last acted on it." },
  { icon: "📋", title: "Repetitive preparation",      desc: "Routine internal forms are rebuilt from scratch for each submission." },
  { icon: "📂", title: "Fragmented records",          desc: "Completed forms and approvals are stored inconsistently across departments." },
  { icon: "🔄", title: "Inconsistent workflows",     desc: "Different offices and departments follow different routing practices." },
];

const DOCS = [
  "Internal approval forms",
  "Administrative requests",
  "Procurement request forms",
  "Travel and allowance authorizations",
  "Policy acknowledgments",
  "Internal certifications",
  "Designation and assignment letters",
  "Leave and schedule acknowledgments",
  "Program consent forms",
  "Inter-office communications",
  "Internal endorsement forms",
  "Staff acknowledgment records",
];

const CAPABILITIES = [
  { icon: "↕️", title: "Sequential signing",    desc: "Route from office to office in order. Each step unlocks only after the previous is complete.", path: "/features/sequential-signing" },
  { icon: "📑", title: "Templates",             desc: "Build once per form type; each department uses the same approved starting point.", path: "/features/templates" },
  { icon: "🗂️", title: "Team workspaces",       desc: "Separate workspaces per department or unit with shared templates.", path: "/features/team-workspaces" },
  { icon: "🔑", title: "Signer authentication", desc: "Configure authentication to match internal security policies.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",            desc: "Full record of who acted and when — accessible to Auditor-role members.", path: "/features/audit-trail" },
  { icon: "🔍", title: "Document Verification", desc: "Verify any completed document against its LAGDA record.", path: "/features/document-verification" },
];

export function GovernmentLGU() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Government & LGU"
        headingId="gov-h1"
        heading="Internal document workflows — where appropriate for your office and applicable rules."
        sub="LAGDA eSignature may help government offices and LGUs route internal forms, process approvals, and maintain an audit trail — subject to applicable laws, agency policies, and procurement requirements."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(167,139,250,0.10) 0%, transparent 70%)"
      />

      <PageSection id="notice" light bordered>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <NoticeBox
            label="GOVERNMENT USE — IMPORTANT NOTE"
            text={GOVERNMENT_NOTICE}
            color="#a78bfa"
          />
        </div>
      </PageSection>

      <PageSection id="challenges">
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="gov-two-col">
          <div>
            <SectionHeading eyebrow="Common internal challenges" id="ch-h2" heading="Routing and tracking internal forms." sub="LAGDA may help with internal workflows where electronic signing is permitted under your office's applicable rules and policies." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>APPROVAL WORKFLOW EXAMPLE</p>
            <GovernmentWorkflowMockup />
          </div>
        </div>
        <style>{`.gov-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .gov-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow" light bordered>
        <div style={{ display: "grid", gap: "32px 48px" }} className="gov-two-col">
          <div>
            <SectionHeading eyebrow="Typical internal workflow" id="wf-h2" heading="From form preparation to verified approval record." />
            <WorkflowSteps steps={GOVERNMENT_WORKFLOW} />
          </div>
          <div>
            <SectionHeading eyebrow="Document examples" id="doc-h2" heading="Internal documents where electronic signing may apply." sub="These document types are examples only. Government document requirements vary widely by agency, type, and applicable law. Confirm eligibility with your legal office or appropriate authority." />
            <DocExampleList docs={DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE UNDER APPLICABLE RULES" />
            <div style={{ marginTop: 16 }}>
              <NoticeBox
                label="AGENCY POLICY NOTE"
                text="Government use may be subject to agency-specific policies, records rules, COA requirements, and other applicable laws. LAGDA does not represent that any specific government document type is eligible for electronic signing. Offices must determine eligibility under their applicable rules."
              />
            </div>
          </div>
        </div>
        <style>{`.gov-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .gov-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities">
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features relevant for internal workflows." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      <PageSection id="enotary" light bordered>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageSection id="related-solutions">
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Also relevant for institutional teams." center />
        <RelatedSolutions paths={[
          { label: "Procurement",  desc: "Vendor and supplier agreements with approval routing", path: "/solutions/procurement" },
          { label: "Business Teams", desc: "Corporate approvals and multi-department routing",  path: "/solutions/business-teams" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Explore whether LAGDA fits your office's needs."
        sub="Contact us with questions about how LAGDA eSignature may apply to your internal workflows."
        primaryLabel="Book a Demo"
        primaryPath="/book-a-demo?solution=government-and-lgu"
        secondaryLabel="Explore eSignature"
        secondaryPath="/esignature"
      />
      <SolLegalNote extra={GOVERNMENT_NOTICE} />
    </SolPageShell>
  );
}
