import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions,
} from "../../../components/solutions/SolComponents";
import { HEALTHCARE_NOTICE } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Wellness-specific workflow (no healthcare-specific workflow in content.ts)
const WELLNESS_WORKFLOW = [
  { num: "01", label: "Staff selects the approved form",     desc: "Template for the specific acknowledgment or consent type." },
  { num: "02", label: "Client or patient is assigned",       desc: "Contact added with appropriate authentication configured." },
  { num: "03", label: "Invitation sent to the participant",  desc: "Secure signing link delivered — accessible on any device." },
  { num: "04", label: "Client acknowledges and signs",       desc: "Required fields completed through the secure signing interface." },
  { num: "05", label: "Authorized staff counter-signs",      desc: "Designated staff member countersigns where required." },
  { num: "06", label: "Record retained with full audit trail", desc: "Completed form, timestamps, and verification record preserved." },
];

// ── Mockup: Wellness consent form flow ────────────────────────────────────────
function WellnessMockup() {
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Service Agreement & Consent Form</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>Lakandula Wellness Center</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.12)", color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>ACTIVE</span>
      </div>
      {[
        { label: "Sofia Navarro — Client",  role: "Client acknowledgment",      status: "DONE",    color: "#22C55E" },
        { label: "Lea Cruz — Practitioner", role: "Practitioner countersign",   status: "ACTIVE",  color: "#0078D4" },
      ].map((p, i) => (
        <div key={i} style={{ padding: "9px 16px", borderBottom: i < 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: p.status === "DONE" ? "rgba(34,197,94,0.12)" : "rgba(0,120,212,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            ...GM, fontSize: 9, fontWeight: 700, color: p.color, border: `1px solid ${p.color}33`,
          }}>
            {p.status === "DONE" ? "✓" : "02"}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{p.label}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>{p.role}</p>
          </div>
          <span style={{ color: p.color, ...GM, fontSize: 9, fontWeight: 700 }}>{p.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#334155", ...GM, fontSize: 9 }}>LAGDA-VER-2026-009917</span>
        <span style={{ color: "#22C55E", ...GM, fontSize: 9, fontWeight: 700 }}>Audit trail active</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "📋", title: "Paper intake forms",           desc: "Client intake, consent, and acknowledgment forms are still paper-based." },
  { icon: "📞", title: "Manual follow-up before visits", desc: "Staff must chase clients for signed consent forms before their appointment." },
  { icon: "🔄", title: "Repetitive preparation",       desc: "The same consent form structure is rebuilt for every new service type." },
  { icon: "📂", title: "Scattered client records",      desc: "Signed forms exist in individual files without a central searchable record." },
  { icon: "🌐", title: "Remote client coordination",    desc: "Clients in different locations cannot easily complete intake forms before their visit." },
  { icon: "❓", title: "No clear completion record",    desc: "Confirming that a client acknowledged terms relies on manual record-keeping." },
];

const WELLNESS_DOCS = [
  "Service agreements",
  "Client acknowledgment forms",
  "Treatment consent forms (non-medical where appropriate)",
  "Studio and facility terms acknowledgments",
  "Photography and media consent forms",
  "Program participation acknowledgments",
  "Cancellation and refund policy acknowledgments",
  "Staff engagement letters",
  "Instructor policy acknowledgments",
  "Waiver and liability acknowledgment forms",
];

const NOT_RECOMMENDED = [
  "Informed consent for medical procedures",
  "Consent for regulated medical treatment",
  "Clinical records or medical charts",
  "Documents requiring a licensed medical professional's notarized signature",
];

const CAPABILITIES = [
  { icon: "📑", title: "Templates",             desc: "Build once per consent or service type. Reuse for every new client.", path: "/features/templates" },
  { icon: "↕️", title: "Sequential signing",    desc: "Client acknowledges first, then practitioner countersigns.", path: "/features/sequential-signing" },
  { icon: "📇", title: "Saved contacts",        desc: "Store client contacts for recurring session workflows.", path: "/features/contacts" },
  { icon: "🔑", title: "Signer authentication", desc: "OTP or account-based identity confirmation.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",            desc: "Timestamped record of delivery, viewing, and signature for each client.", path: "/features/audit-trail" },
  { icon: "🔔", title: "Automatic reminders",   desc: "Clients reminded to sign before appointments without manual follow-up.", path: "/features/notifications" },
];

export function HealthcareWellness() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Healthcare & Wellness"
        headingId="hc-h1"
        heading="Wellness consent forms, service agreements, and acknowledgments — where appropriate."
        sub="LAGDA eSignature may help wellness, fitness, and non-clinical healthcare practices manage client consent forms, service acknowledgments, and policy documents — subject to careful determination of what is appropriate for each document and context."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      />

      <PageSection id="critical-notice" light bordered>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <NoticeBox
            label="HEALTHCARE USE — READ CAREFULLY"
            text={HEALTHCARE_NOTICE}
            color="#ef4444"
          />
          <NoticeBox
            label="MEDICAL PROCEDURES — NOT APPROPRIATE"
            text="LAGDA eSignature is not designed or appropriate for informed consent for medical procedures, regulated clinical treatment consent, or any document where healthcare law requires specific formalities. Do not use LAGDA for documents of this type."
            color="#ef4444"
          />
        </div>
      </PageSection>

      <PageSection id="challenges">
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="hc-two-col">
          <div>
            <SectionHeading eyebrow="Wellness operation challenges" id="ch-h2" heading="Where manual paperwork slows down your practice." sub="These are common challenges in wellness and fitness operations where digital document workflows may apply — subject to confirmation that each document type is appropriate." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>WELLNESS CONSENT FORM</p>
            <WellnessMockup />
          </div>
        </div>
        <style>{`.hc-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .hc-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow" light bordered>
        <div style={{ display: "grid", gap: "32px 48px" }} className="hc-two-col">
          <div>
            <SectionHeading eyebrow="Workflow example" id="wf-h2" heading="Client acknowledgment — from form to verified record." />
            <WorkflowSteps steps={WELLNESS_WORKFLOW} />
          </div>
          <div>
            <div style={{ marginBottom: 24 }}>
              <SectionHeading eyebrow="Where electronic signing may apply" id="doc-h2" heading="Wellness document types." sub="These examples apply to wellness, fitness, and non-clinical service contexts where electronic signing is more likely appropriate — subject to your organization's determination for each document type." />
              <DocExampleList docs={WELLNESS_DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            </div>
            <div>
              <p style={{ color: "#ef4444", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>LIKELY NOT APPROPRIATE FOR LAGDA eSIGNATURE</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {NOT_RECOMMENDED.map((d) => (
                  <div key={d} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#ef4444", flexShrink: 0, fontSize: 12, marginTop: 2 }}>×</span>
                    <span style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.45 }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <style>{`.hc-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .hc-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities">
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful for wellness operations." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      <PageSection id="enotary" light bordered>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageSection id="related-solutions">
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Also relevant for service-based teams." center />
        <RelatedSolutions paths={[
          { label: "Business Teams", desc: "Service agreements and client acknowledgments",        path: "/solutions/business-teams" },
          { label: "HR & Recruitment", desc: "Staff onboarding and policy acknowledgments",       path: "/solutions/hr-and-recruitment" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Explore LAGDA for your wellness practice."
        sub="Contact us with questions about how LAGDA eSignature may apply to your specific workflow."
        primaryLabel="Book a Demo"
        primaryPath="/book-a-demo?solution=healthcare-and-wellness"
        secondaryLabel="Create Free Account"
        secondaryPath="/create-account"
      />
      <SolLegalNote extra={HEALTHCARE_NOTICE} />
    </SolPageShell>
  );
}
