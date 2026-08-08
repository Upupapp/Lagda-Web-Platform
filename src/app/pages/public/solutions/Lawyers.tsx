import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import {
  PageHero, PageSection, SectionHeading, PageCTA,
} from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions,
} from "../../../components/solutions/SolComponents";
import { LAWYER_WORKFLOW } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: Client engagement workflow ────────────────────────────────────────
function ClientEngagementMockup() {
  const steps = [
    { label: "Engagement Letter Template", status: "Template selected", who: "Ana Reyes · Sender" },
    { label: "Marco Santos — Client",       status: "Invitation sent",   who: "10:01 AM" },
    { label: "Internal Reviewer",           status: "Ready to proceed",  who: "On completion" },
  ];
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>New Transaction</p>
          <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "1px 0 0" }}>Engagement Letter · Mabini Legal Solutions</p>
        </div>
        <span style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(34,197,94,0.25)" }}>ACTIVE</span>
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ padding: "10px 16px", borderBottom: i < steps.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,120,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...GM, fontSize: 9, color: "#38bdf8", fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</p>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "1px 0 0" }}>{s.who}</p>
          </div>
          <span style={{ color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{s.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#7C8DA4", ...GM, fontSize: 9 }}>LAGDA-VER-2026-004821</span>
        <span style={{ color: "#22C55E", ...GM, fontSize: 9, fontWeight: 700 }}>Audit trail active</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "🔄", title: "Repeated document preparation", desc: "Building the same engagement letters and acknowledgments from scratch every client." },
  { icon: "📞", title: "Manual follow-up",               desc: "Tracking who has viewed or signed requires constant calls and emails." },
  { icon: "🗺️", title: "Distributed clients",           desc: "Clients in different cities or abroad cannot easily sign physical documents." },
  { icon: "📋", title: "No clear activity record",       desc: "Confirming that a client reviewed a document relies on their word alone." },
  { icon: "🗂️", title: "Scattered completed records",   desc: "Signed copies are spread across email threads and local storage." },
  { icon: "⚖️", title: "Workflow consistency",           desc: "Each matter requires the same controlled process — but without a system, it varies." },
];

const DOCS = [
  "Engagement letters",
  "Legal-service agreements",
  "Client acknowledgments",
  "Authorizations",
  "Non-disclosure agreements",
  "Consent forms",
  "Contract amendments",
  "Matter-closing acknowledgments",
  "Client instructions",
  "Internal review documents",
  "Completion acknowledgments",
  "Retainer agreements where applicable",
];

const CAPABILITIES = [
  { icon: "📑", title: "Templates",             desc: "Save your standard engagement workflow. Reuse for every new client.", path: "/features/templates" },
  { icon: "📇", title: "Saved contacts",        desc: "Store recurring clients and send invitations without re-entering details.", path: "/features/contacts" },
  { icon: "🔑", title: "Signer authentication", desc: "OTP, authenticator, or account login — match authentication to transaction risk.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",            desc: "Every event — delivery, viewing, signing — timestamped and preserved.", path: "/features/audit-trail" },
  { icon: "🔍", title: "Document Verification", desc: "Confirm any document matches its LAGDA record using a Verification ID.", path: "/features/document-verification" },
  { icon: "🔔", title: "Automatic reminders",   desc: "Clients are reminded without manual follow-up from your team.", path: "/features/notifications" },
];

export function Lawyers() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Lawyers"
        headingId="law-h1"
        heading="Client documents — prepared, sent, signed, and verified without manual follow-up."
        sub="LAGDA eSignature helps solo practitioners, in-house counsel, and independent lawyers manage client agreements, engagement letters, and recurring documents — with a complete audit trail and document verification."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)"
      />

      {/* Challenges + mockup */}
      <PageSection id="challenges" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="law-two-col">
          <div>
            <SectionHeading eyebrow="What slows you down" id="ch-h2" heading="The same problems appear in every matter." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>ENGAGEMENT IN PROGRESS</p>
            <ClientEngagementMockup />
          </div>
        </div>
        <style>{`.law-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .law-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Workflow */}
      <PageSection id="workflow">
        <div style={{ display: "grid", gap: "32px 48px" }} className="law-two-col">
          <div>
            <SectionHeading eyebrow="Typical workflow" id="wf-h2" heading="From template to verified record — without leaving LAGDA." />
            <WorkflowSteps steps={LAWYER_WORKFLOW} />
          </div>
          <div>
            <SectionHeading eyebrow="Document examples" id="doc-h2" heading="Where electronic signing may apply." sub="These are common document types used by legal practitioners where electronic signing may be appropriate — depending on the document, applicable law, and any required formalities." />
            <DocExampleList docs={DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            <div style={{ marginTop: 16 }}>
              <NoticeBox
                label="FORMALITY NOTE"
                text="Some documents require notarization, personal appearance, witnesses, or other formalities that electronic signing alone cannot satisfy. You remain responsible for determining the requirements for each document."
              />
            </div>
          </div>
        </div>
        <style>{`.law-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .law-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Capabilities */}
      <PageSection id="capabilities" light bordered>
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful to legal practitioners." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      {/* eNotary separation */}
      <PageSection id="enotary">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      {/* Related solutions */}
      <PageSection id="related-solutions" light bordered>
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Also relevant for your practice." center />
        <RelatedSolutions paths={[
          { label: "Law Firms",      desc: "Workspace, templates, and firm governance", path: "/solutions/law-firms" },
          { label: "Business Teams", desc: "Multi-department approvals and contracts",   path: "/solutions/business-teams" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Start with a free LAGDA account."
        sub="Set up your first signing workflow, build a template, and invite a client — at no cost to start."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Explore Law Firms"
        secondaryPath="/solutions/law-firms"
      />
      <SolLegalNote extra="Lawyers remain responsible for determining whether each document is suitable for electronic signing under applicable law and professional standards." />
    </SolPageShell>
  );
}
