import { SolPageShell } from "../../../components/solutions/SolutionsSubNav";
import { PageHero, PageSection, SectionHeading, PageCTA } from "../../../components/esignature/EsigPageShell";
import {
  DocExampleList, WorkflowSteps, ChallengeCards, CapabilityLinks,
  NoticeBox, EnotaryNotice, SolLegalNote, RelatedSolutions,
} from "../../../components/solutions/SolComponents";
import { REAL_ESTATE_WORKFLOW } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Mockup: Property document signing view ────────────────────────────────────
function PropertyMockup() {
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)", border: "1px solid rgba(34,197,94,0.22)",
      borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Residential Lease Agreement</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>Harborline Properties · Unit 12B</p>
        </div>
        <span style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(34,197,94,0.25)" }}>ACTIVE</span>
      </div>
      {[
        { label: "Lea Cruz — Property Manager", role: "Internal reviewer", status: "DONE",    color: "#22C55E" },
        { label: "Daniel Lim — Tenant",          role: "Lessee signature",  status: "ACTIVE",  color: "#0078D4" },
        { label: "Harborline Properties",         role: "Lessor signature",  status: "PENDING", color: "#334155" },
      ].map((s, i) => (
        <div key={i} style={{ padding: "9px 16px", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: s.status === "PENDING" ? "#334155" : "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{s.label}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>{s.role}</p>
          </div>
          <span style={{ color: s.color, ...GM, fontSize: 9, fontWeight: 700 }}>{s.status}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#334155", ...GM, fontSize: 9 }}>LAGDA-VER-2026-008813</span>
        <span style={{ color: "#22C55E", ...GM, fontSize: 9, fontWeight: 700 }}>Audit trail active</span>
      </div>
    </div>
  );
}

const CHALLENGES = [
  { icon: "📋", title: "Paper-heavy process",          desc: "Property documents require printing, signing, scanning, and re-distributing physical copies." },
  { icon: "📞", title: "Manual coordination",           desc: "Tenants and landlords sign at different times, locations, and schedules." },
  { icon: "🗂️", title: "Scattered records",            desc: "Signed leases and acknowledgments are distributed across email threads." },
  { icon: "⏳", title: "Delay in tenant onboarding",   desc: "Physical documentation slows down move-in timelines and increases turnover cost." },
  { icon: "🔄", title: "Repetitive document prep",     desc: "Lease renewal and move-out forms are rebuilt from scratch every tenancy cycle." },
  { icon: "❓", title: "No clear paper trail",         desc: "Confirming what a tenant was told, agreed to, or acknowledged is difficult without a record." },
];

const ESIG_DOCS = [
  "Lease agreements (where appropriate)",
  "Lease addenda and amendments",
  "Move-in and move-out checklists",
  "Pet addenda",
  "Parking and storage agreements",
  "House rules and building policy acknowledgments",
  "Maintenance request authorizations",
  "Early termination agreements",
  "Lease renewal offers and acceptances",
  "Notice acknowledgments",
];

const NOT_ESIG_DOCS = [
  "Deeds of sale or absolute sale",
  "Contracts to sell requiring notarization",
  "Documents requiring registration with the Register of Deeds",
  "Mortgage or encumbrance instruments",
];

const CAPABILITIES = [
  { icon: "📑", title: "Templates",             desc: "Save lease and acknowledgment templates. Reuse for each new tenant.", path: "/features/templates" },
  { icon: "↕️", title: "Sequential signing",    desc: "Tenant signs first, then lessor — controlled order.", path: "/features/sequential-signing" },
  { icon: "📇", title: "Saved contacts",        desc: "Add tenants and owners to your contact directory.", path: "/features/contacts" },
  { icon: "📋", title: "Audit trail",            desc: "Record of every delivery, viewing, and signature event.", path: "/features/audit-trail" },
  { icon: "🔍", title: "Document Verification", desc: "Confirm any completed document against its LAGDA record.", path: "/features/document-verification" },
  { icon: "🔔", title: "Automatic reminders",   desc: "Expiring signatures are reminded automatically.", path: "/features/notifications" },
];

export function RealEstate() {
  return (
    <SolPageShell>
      <PageHero
        eyebrow="For Real Estate"
        headingId="re-h1"
        heading="Leases, acknowledgments, and internal documents — where electronic signing is appropriate."
        sub="LAGDA eSignature helps property managers and real estate teams streamline leases, move-in checklists, renewals, and internal approvals — with a full audit trail and document verification."
        gradient="radial-gradient(ellipse 80% 60% at 40% 0%, rgba(34,197,94,0.08) 0%, transparent 70%)"
      />

      <PageSection id="important-notice" light bordered>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <NoticeBox
            label="IMPORTANT — NOT ALL PROPERTY DOCUMENTS ARE ELIGIBLE"
            text="Deeds of sale, contracts to sell, and other instruments for the transfer or encumbrance of real property typically require notarization, personal appearance, or registration with the Register of Deeds — none of which LAGDA provides. LAGDA eSignature is not appropriate for those document types."
            color="#ef4444"
          />
        </div>
      </PageSection>

      <PageSection id="challenges">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="re-two-col">
          <div>
            <SectionHeading eyebrow="What slows you down" id="ch-h2" heading="Paper-heavy workflows for recurring processes." />
            <ChallengeCards challenges={CHALLENGES} />
          </div>
          <div>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 12 }}>LEASE AGREEMENT IN PROGRESS</p>
            <PropertyMockup />
          </div>
        </div>
        <style>{`.re-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .re-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workflow" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px" }} className="re-two-col">
          <div>
            <SectionHeading eyebrow="Workflow" id="wf-h2" heading="From template to completed lease record." />
            <WorkflowSteps steps={REAL_ESTATE_WORKFLOW} />
          </div>
          <div>
            <div style={{ marginBottom: 24 }}>
              <SectionHeading eyebrow="Where electronic signing may apply" id="doc-h2" heading="Likely appropriate document types." sub="These are typical leasing and tenancy documents where electronic signing is more commonly appropriate, depending on the specific document and applicable law." />
              <DocExampleList docs={ESIG_DOCS} qualifier="WHERE ELECTRONIC SIGNING IS APPROPRIATE" />
            </div>
            <div>
              <p style={{ color: "#ef4444", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>LIKELY NOT APPROPRIATE FOR LAGDA eSIGNATURE</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {NOT_ESIG_DOCS.map((d) => (
                  <div key={d} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#ef4444", flexShrink: 0, fontSize: 12, marginTop: 2 }}>×</span>
                    <span style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.45 }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <style>{`.re-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 780px) { .re-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="capabilities">
        <SectionHeading eyebrow="Relevant features" id="cap-h2" heading="The LAGDA features most useful for leasing workflows." center />
        <CapabilityLinks items={CAPABILITIES} />
      </PageSection>

      <PageSection id="enotary" light bordered>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <EnotaryNotice />
        </div>
      </PageSection>

      <PageSection id="related-solutions">
        <SectionHeading eyebrow="Related solutions" id="rs-h2" heading="Also relevant for your team." center />
        <RelatedSolutions paths={[
          { label: "Business Teams", desc: "Contracts, approvals, and vendor agreements", path: "/solutions/business-teams" },
          { label: "Procurement",    desc: "Vendor agreements and supplier contracts",     path: "/solutions/procurement" },
        ]} />
      </PageSection>

      <PageCTA
        heading="Start signing leases and acknowledgments online."
        sub="Use LAGDA eSignature for the documents where it's appropriate. Start free, no card required."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Book a Demo"
        secondaryPath="/book-a-demo?solution=real-estate"
      />
      <SolLegalNote extra="Real estate organizations remain responsible for confirming that each document type is eligible for electronic signing under applicable law." />
    </SolPageShell>
  );
}
