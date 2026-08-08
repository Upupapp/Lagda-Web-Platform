import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions, ParticipantRoles,
} from "../../../components/solutions/SolComponents";
import { EDUCATION_WORKFLOW } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: Student and guardian enrollment form ─────────────────────────────
function EnrollmentMockup() {
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Enrollment Confirmation</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>Sampaguita Learning Institute · AY 2026–2027</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.12)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>ACTIVE</span>
      </div>
      {[
        { label: "Student — Ana Reyes",     role: "Student acknowledgment",     status: "DONE",    color: "#22C55E" },
        { label: "Parent — Marco Reyes",    role: "Guardian acknowledgment",    status: "ACTIVE",  color: "#0078D4" },
        { label: "Registrar",               role: "Institutional confirmation",  status: "PENDING", color: "#334155" },
      ].map((p, i) => (
        <div key={i} style={{ padding: "9px 16px", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: p.status === "DONE" ? "rgba(34,197,94,0.12)" : p.status === "ACTIVE" ? "rgba(0,120,212,0.15)" : "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            ...GM, fontSize: 9, fontWeight: 700, color: p.color, border: `1px solid ${p.color}33`,
          }}>
            {p.status === "DONE" ? "✓" : String(i + 1).padStart(2, "0")}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: p.status === "PENDING" ? "#334155" : "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{p.label}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>{p.role}</p>
          </div>
          <span style={{ color: p.color, ...GM, fontSize: 9, fontWeight: 700 }}>{p.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#334155", ...GM, fontSize: 9 }}>LAGDA-VER-2026-003492</span>
        <span style={{ color: "#22C55E", ...GM, fontSize: 9, fontWeight: 700 }}>Audit trail active</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "📋", title: "Paper enrollment forms",     desc: "Enrollment paperwork requires physical printing, signing, and physical submission." },
  { icon: "👨‍👩‍👧", title: "Guardian coordination",   desc: "Reaching a parent or guardian for signature adds delays to institutional timelines." },
  { icon: "🔄", title: "Repetitive preparation",     desc: "Acknowledgment forms for each intake cycle are rebuilt from scratch." },
  { icon: "📞", title: "Manual follow-up",            desc: "Staff must individually track who has returned signed documents." },
  { icon: "📂", title: "Scattered records",           desc: "Completed forms are distributed across files, folders, and email threads." },
  { icon: "🌐", title: "Distance challenges",         desc: "Families in different locations cannot easily sign and submit physical forms." },
];

const DOCS = [
  "Enrollment confirmation acknowledgments",
  "Parent and guardian consent forms",
  "School policy acknowledgments",
  "Code of conduct acknowledgments",
  "Field trip and activity consent forms",
  "Medical disclosure and authorization forms",
  "Student data privacy acknowledgments",
  "Faculty employment acknowledgments",
  "Staff policy acknowledgments",
  "Scholarship and award acknowledgments",
  "Program participation consent forms",
  "Graduation and clearance acknowledgments",
];

const EDU_ROLES = [
  { role: "Student",          desc: "Signs acknowledgments and consent forms appropriate for their age and standing." },
  { role: "Parent / Guardian", desc: "Required co-signatory for forms involving minors or guardian consent." },
  { role: "Registrar",         desc: "Institutional confirmation or counter-sign after student/guardian acts." },
  { role: "Staff / Faculty",   desc: "Employment letters, policy acknowledgments, and certification forms." },
];

const CAPABILITIES = [
  { icon: "↕️", title: "Sequential signing",    desc: "Student signs first, then guardian — controlled order per document.", path: "/features/sequential-signing" },
  { icon: "📑", title: "Templates",             desc: "Build once per form type — reuse for every intake cycle.", path: "/features/templates" },
  { icon: "📇", title: "Saved contacts",        desc: "Store students, guardians, and staff for recurring workflows.", path: "/features/contacts" },
  { icon: "🔑", title: "Signer authentication", desc: "OTP or account-based authentication to confirm participant identity.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",            desc: "Timestamped record of delivery, viewing, and completion per participant.", path: "/features/audit-trail" },
  { icon: "🔔", title: "Automatic reminders",   desc: "Families reminded automatically without staff follow-up.", path: "/features/notifications" },
];

export function Education() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Education"
        headingId="edu-h1"
        heading="Enrollment forms, consent forms, and policy acknowledgments — without the paper."
        sub="LAGDA eSignature helps schools and universities send enrollment acknowledgments, parent consent forms, and institutional policy acknowledgments online — with student-guardian sequential signing and a full audit trail."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      />

      <PageSection id="challenges" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="edu-two-col">
          <div>
            <SectionHeading eyebrow="Institutional form challenges" id="ch-h2" heading="The same delays appear every enrollment cycle." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>ENROLLMENT FORM IN PROGRESS</p>
            <EnrollmentMockup />
          </div>
        </div>
        <style>{`.edu-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .edu-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow">
        <div style={{ display: "grid", gap: "32px 48px" }} className="edu-two-col">
          <div>
            <SectionHeading eyebrow="Enrollment workflow" id="wf-h2" heading="Student and guardian — sequential, verified." />
            <WorkflowSteps steps={EDUCATION_WORKFLOW} />
            <div style={{ marginTop: 24 }}>
              <SectionHeading eyebrow="Who participates" id="roles-h2" heading="Participants in an education workflow." />
              <ParticipantRoles roles={EDU_ROLES} />
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Document examples" id="doc-h2" heading="Where electronic acknowledgment may apply." sub="These are institutional form types where electronic signing or acknowledgment is commonly used. Requirements vary by document, institution, and applicable regulation." />
            <DocExampleList docs={DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            <div style={{ marginTop: 16 }}>
              <NoticeBox label="STUDENT DATA NOTE" text="Education workflows may involve student and minor personal data. Institutions remain responsible for ensuring their workflows comply with applicable privacy laws and institutional data policies." />
            </div>
          </div>
        </div>
        <style>{`.edu-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .edu-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities" light bordered>
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful for education institutions." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      <PageSection id="enotary">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageSection id="related-solutions" light bordered>
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Also relevant for institutional teams." center />
        <RelatedSolutions paths={[
          { label: "Government & LGU", desc: "Institutional and public-sector workflows", path: "/solutions/government-and-lgu" },
          { label: "HR & Recruitment", desc: "Employee onboarding and policy acknowledgments", path: "/solutions/hr-and-recruitment" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Get your enrollment forms online."
        sub="Templates, guardian signing, and automatic reminders — built for institutional workflows."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Book a Demo"
        secondaryPath="/book-a-demo?solution=education"
      />
      <SolLegalNote extra="Educational institutions remain responsible for ensuring their use of LAGDA eSignature complies with applicable privacy laws, institutional policies, and document-handling requirements." />
    </SolPageShell>
  );
}
