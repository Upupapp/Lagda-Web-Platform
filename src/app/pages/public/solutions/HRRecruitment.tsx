import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions,
} from "../../../components/solutions/SolComponents";
import { HR_WORKFLOW } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: HR onboarding packet ──────────────────────────────────────────────
function HROnboardingMockup() {
  const docs = [
    { label: "Employment offer letter",      status: "SIGNED",  color: "#22C55E" },
    { label: "Code of conduct acknowledgment", status: "SIGNED", color: "#22C55E" },
    { label: "IT equipment policy",           status: "ACTIVE",  color: "#0078D4" },
    { label: "Data privacy consent form",     status: "PENDING", color: "#334155" },
  ];
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Onboarding Packet</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>Sofia Navarro · 4 documents</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.12)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>IN PROGRESS</span>
      </div>
      {docs.map((d, i) => (
        <div key={i} style={{ padding: "9px 16px", borderBottom: i < docs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: d.status === "SIGNED" ? "rgba(34,197,94,0.12)" : d.status === "ACTIVE" ? "rgba(0,120,212,0.15)" : "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            ...GM, fontSize: 9, fontWeight: 700, color: d.color, border: `1px solid ${d.color}33`,
          }}>
            {d.status === "SIGNED" ? "✓" : String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: d.status === "PENDING" ? "#334155" : "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{d.label}</p>
          </div>
          <span style={{ color: d.color, ...GM, fontSize: 9, fontWeight: 700 }}>{d.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#22C55E", ...GM, fontSize: 9, fontWeight: 700 }}>2 of 4 complete</span>
        <span style={{ color: "#475569", ...GM, fontSize: 9 }}>Audit trail active</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "📋", title: "Scattered onboarding docs",   desc: "New hire paperwork is distributed across email threads, print-outs, and file folders." },
  { icon: "⏳", title: "Delayed start dates",          desc: "Physical sign-offs on employment letters and policies slow down onboarding timelines." },
  { icon: "🔄", title: "Repetitive document prep",    desc: "Every hire goes through the same documents rebuilt from scratch." },
  { icon: "📞", title: "Manual follow-up",             desc: "HR must chase each new hire individually for every unsigned document." },
  { icon: "🌐", title: "Remote and distributed hires", desc: "Candidates in different cities cannot sign physical documents without significant delay." },
  { icon: "🔒", title: "Privacy handling gaps",        desc: "Sensitive employee data in email attachments is harder to control." },
];

const DOCS = [
  "Employment offer letters",
  "Code of conduct acknowledgments",
  "Policy acknowledgments",
  "IT equipment and data policy forms",
  "Non-disclosure and confidentiality agreements",
  "Contractor engagement letters",
  "Performance review acknowledgments",
  "Role change and promotion letters",
  "Leave policy acknowledgments",
  "Separation and clearance acknowledgments",
  "Training completion forms",
  "Internal consent forms",
];

const CAPABILITIES = [
  { icon: "📑", title: "Templates",             desc: "Standard onboarding packet templates — reused for every new hire.", path: "/features/templates" },
  { icon: "↕️", title: "Sequential signing",    desc: "Manager counter-sign after employee completion — controlled order.", path: "/features/sequential-signing" },
  { icon: "📇", title: "Saved contacts",        desc: "Store candidates and managers for recurring workflows.", path: "/features/contacts" },
  { icon: "🔑", title: "Signer authentication", desc: "OTP or account-based authentication for identity assurance.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",            desc: "Record of every event — delivery, viewing, signing — per employee.", path: "/features/audit-trail" },
  { icon: "🔔", title: "Automatic reminders",   desc: "Missing signatures reminded automatically without HR follow-up.", path: "/features/notifications" },
];

export function HRRecruitment() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For HR & Recruitment"
        headingId="hr-h1"
        heading="Onboarding, employment, and policy documents — without the paper pile."
        sub="LAGDA eSignature helps HR teams send offer letters, acknowledgment forms, and policy documents online — with templates, automatic reminders, and a complete audit trail."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      />

      <PageSection id="challenges" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="hr-two-col">
          <div>
            <SectionHeading eyebrow="HR document challenges" id="ch-h2" heading="Onboarding shouldn't slow your first hire down." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>ONBOARDING PACKET</p>
            <HROnboardingMockup />
          </div>
        </div>
        <style>{`.hr-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .hr-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px" }} className="hr-two-col">
          <div>
            <SectionHeading eyebrow="HR workflow" id="wf-h2" heading="From template to completed employee record." />
            <WorkflowSteps steps={HR_WORKFLOW} />
          </div>
          <div>
            <SectionHeading eyebrow="Document examples" id="doc-h2" heading="Where electronic signing may apply." sub="Common HR document types — requirements vary by document, employment law, and applicable regulations." />
            <DocExampleList docs={DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            <div style={{ marginTop: 16 }}>
              <NoticeBox label="PRIVACY AND DATA HANDLING NOTE" text="HR workflows may involve sensitive personal information. Organizations remain responsible for determining appropriate handling, access controls, and data practices for employee data — including compliance with applicable privacy laws." />
            </div>
          </div>
        </div>
        <style>{`.hr-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .hr-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities" light bordered>
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful for HR teams." center />
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
          { label: "Business Teams", desc: "Corporate contracts and multi-department approvals", path: "/solutions/business-teams" },
          { label: "Procurement",    desc: "Contractor and vendor agreements",                   path: "/solutions/procurement" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Start onboarding your next hire online."
        sub="Templates, reminders, and a full audit trail — no paper required."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Book a Demo"
        secondaryPath="/contact"
      />
      <SolLegalNote extra="HR organizations remain responsible for ensuring their document processes comply with applicable labor law and privacy regulations." />
    </SolPageShell>
  );
}
