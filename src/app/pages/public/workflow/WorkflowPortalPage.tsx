// /workflow — the public page for LAGDA's reusable document workflows.
//
// WHY THIS PAGE EXISTS. Every other public page that says "reusable workflow"
// means a document TEMPLATE — a saved field layout, routing order and branding
// for one document. The Workflow product is a different thing: a multi-stage
// process an administrator designs once and starts many times, where each start
// is an independent run with its own documents, participants, progress and
// audit trail. The marketing site described the first and never mentioned the
// second, so the public story did not match the product.
//
// Every claim here is checked against what /app/workflow actually does. The
// stage kinds, the template-versus-run distinction, the independence of runs and
// the "starting a run never changes the workflow" promise are all real
// behaviour, not aspiration. Nothing here promises delivery, notification or
// legal effect.

import { Link } from "react-router";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useStructuredData } from "../../../hooks/useStructuredData";
import {
  EsigPageShell,
  PageHero,
  PageSection,
  SectionHeading,
  PageCTA,
  RelatedPages,
  LegalNote,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// The seven stage kinds the product actually supports, in the order a document
// usually travels. Kept in step with STAGE_KIND_LABELS in models/workflow.ts —
// if that list changes, this one has to change with it.
const STAGES = [
  { name: "Upload & Prepare", desc: "Documents are added and fields placed before anyone is asked to act." },
  { name: "Review",           desc: "Assigned people read the document and record a review decision. A review is not an approval." },
  { name: "Approval",         desc: "Assigned people give an explicit approval decision. Approval is not a signature." },
  { name: "Signature",        desc: "Assigned people complete their own signing fields." },
  { name: "Verification",     desc: "The completed document is checked against its verification record." },
  { name: "Notification",     desc: "People are informed. Nobody is asked to act, so this stage never holds the process up." },
  { name: "Archive & Complete", desc: "The run is closed and retained with its audit trail." },
];

// Typed rather than a tuple array: destructuring `[label, path]` widens both to
// `string | undefined`, which `Link`'s `to` rejects.
const SOLUTION_LINKS: { label: string; path: string }[] = [
  { label: "Law firms",        path: "/solutions/law-firms" },
  { label: "Business teams",   path: "/solutions/business-teams" },
  { label: "Government / LGU", path: "/solutions/government-and-lgu" },
  { label: "HR & recruitment", path: "/solutions/hr-and-recruitment" },
  { label: "Finance",          path: "/solutions/finance" },
  { label: "Procurement",      path: "/solutions/procurement" },
];

const EXAMPLES = [
  { title: "Contract review and signing", stages: ["Prepare", "Internal review", "Legal approval", "Client signature", "Verification", "Archive"] },
  { title: "HR onboarding documents",     stages: ["Prepare packet", "HR review", "Employee signature", "Manager acknowledgment", "Archive"] },
  { title: "Procurement approval",        stages: ["Upload documents", "Department review", "Finance approval", "Vendor signature", "Verification"] },
  { title: "LGU document routing",        stages: ["Intake", "Department review", "Authorised signatory", "Records verification", "Archive"] },
];

export function WorkflowPortalPage() {
  usePageMeta();
  useStructuredData();

  return (
    <EsigPageShell>
      <PageHero
        eyebrow="Document workflows"
        headingId="wf-hero"
        heading="Design a process once. Run it as many times as you need."
        sub="A LAGDA workflow is a reusable sequence of stages — review, approval, signature, verification — with the right people assigned to each. Start it for one client or a hundred; every run tracks its own documents, participants, progress and audit trail."
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/book-a-demo" style={ctaPrimary}>Book a demo</Link>
          <Link to="/esignature" style={ctaSecondary}>See eSignature</Link>
        </div>
      </PageHero>

      {/* The distinction the whole feature rests on. Lead with it: someone who
          leaves this page thinking a workflow is a document has understood
          nothing about the product. */}
      <PageSection id="workflow-vs-run" bordered light>
        <SectionHeading
          eyebrow="How it works"
          id="wf-vs-run-h"
          heading="A workflow is the design. A run is one use of it."
          sub="This is the difference between writing a process down and doing it. LAGDA keeps them separate so one can change without disturbing the other."
          center
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <ConceptCard
            label="WORKFLOW"
            title="The reusable design"
            points={[
              "Stages in the order the document must travel",
              "The role each stage needs — reviewer, approver, signer, verifier",
              "Whether everyone must act, or the first response is enough",
              "Edited whenever the process changes",
            ]}
          />
          <ConceptCard
            label="RUN"
            title="One live use of that workflow"
            points={[
              "Its own documents and its own people",
              "Its own stage-by-stage progress",
              "Its own activity and audit trail",
              "Many can be in flight at the same time",
            ]}
            accent
          />
        </div>
        <p style={{ ...GF, color: "#94a3b8", fontSize: 14.5, lineHeight: 1.7, margin: "24px auto 0", maxWidth: 640, textAlign: "center" }}>
          Starting a run never changes the workflow it came from, and never touches
          any other run. Editing a workflow leaves work already in progress exactly
          as it was.
        </p>
      </PageSection>

      <PageSection id="stages">
        <SectionHeading
          eyebrow="Stages"
          id="wf-stages-h"
          heading="Seven kinds of stage, in any order you need."
          sub="Each stage names what happens and who has to act. A stage that asks nobody to act never holds the process up."
        />
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {STAGES.map((s, i) => (
            <li key={s.name} style={card}>
              <p style={{ ...GM, color: "#38bdf8", fontSize: 10, fontWeight: 700, margin: "0 0 8px", letterSpacing: "0.08em" }}>
                STAGE TYPE {String(i + 1).padStart(2, "0")}
              </p>
              <h3 style={{ ...GF, color: "white", fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{s.name}</h3>
              <p style={{ ...GF, color: "#94a3b8", fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
            </li>
          ))}
        </ol>
      </PageSection>

      <PageSection id="examples" bordered light>
        <SectionHeading
          eyebrow="Examples"
          id="wf-examples-h"
          heading="Processes teams already run on paper."
          sub="These ship as starting points. Rename the stages, change who is assigned, and it is yours."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          {EXAMPLES.map(ex => (
            <div key={ex.title} style={card}>
              <h3 style={{ ...GF, color: "white", fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>{ex.title}</h3>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {ex.stages.map((st, i) => (
                  <li key={st} style={{ ...GF, color: "#94a3b8", fontSize: 13, display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span aria-hidden style={{ ...GM, color: "#38bdf8", fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                    {st}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection id="visibility">
        <SectionHeading
          eyebrow="Visibility"
          id="wf-visibility-h"
          heading="Know what is waiting, on whom, and for how long."
          sub="Every run shows its stage board, so nobody has to ask where a document has got to."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {[
            { t: "Stage-by-stage progress", d: "A run reads “2 of 6 stages complete, currently in Legal Approval” — not just a percentage." },
            { t: "Named owners",            d: "Each stage shows who is assigned, what they were asked to do, and who has already done it." },
            { t: "Blocked and overdue",     d: "A stage that cannot proceed says so and says why, in plain language." },
            { t: "Its own audit trail",     d: "Each run keeps its own activity record, separate from every other run of the same workflow." },
          ].map(x => (
            <div key={x.t} style={card}>
              <h3 style={{ ...GF, color: "white", fontSize: 15.5, fontWeight: 700, margin: "0 0 8px" }}>{x.t}</h3>
              <p style={{ ...GF, color: "#94a3b8", fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{x.d}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection id="who" bordered light>
        <SectionHeading
          eyebrow="Who uses this"
          id="wf-who-h"
          heading="Built for documents that need more than one signature."
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {SOLUTION_LINKS.map(({ label, path }) => (
            <Link key={path} to={path} style={chip}>{label}</Link>
          ))}
        </div>
      </PageSection>

      <PageCTA
        heading="See a workflow run end to end."
        sub="Book a walkthrough and we will route a sample document through review, approval, signature and verification."
        primaryLabel="Book a demo"
        primaryPath="/book-a-demo"
        secondaryLabel="Contact sales"
        secondaryPath="/contact"
      />

      <RelatedPages
        links={[
          { label: "Templates & Branding", desc: "Save a single document's setup for reuse", path: "/esignature/templates-and-branding" },
          { label: "Audit Trail",          desc: "What is recorded as a document moves",     path: "/security/audit-trail" },
          { label: "Document Verification",desc: "Confirm a completed document is genuine",  path: "/security/document-verification" },
        ]}
      />

      <LegalNote />
    </EsigPageShell>
  );
}

function ConceptCard({
  label, title, points, accent,
}: {
  label: string; title: string; points: string[]; accent?: boolean;
}) {
  return (
    <div style={{
      ...card,
      borderColor: accent ? "rgba(0,120,212,0.35)" : "rgba(255,255,255,0.08)",
      background: accent ? "rgba(0,120,212,0.06)" : "rgba(255,255,255,0.02)",
    }}>
      <p style={{ ...GM, color: accent ? "#38bdf8" : "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 8px" }}>
        {label}
      </p>
      <h3 style={{ ...GF, color: "white", fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>{title}</h3>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {points.map(p => (
          <li key={p} style={{ ...GF, color: "#94a3b8", fontSize: 14, lineHeight: 1.6, display: "flex", gap: 8 }}>
            <span aria-hidden style={{ color: "#38bdf8", flexShrink: 0 }}>·</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: 22,
};

const ctaPrimary: React.CSSProperties = {
  ...GF, display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 24px",
  borderRadius: 10, background: "#0078D4", color: "white", fontSize: 15, fontWeight: 700,
  textDecoration: "none",
};

const ctaSecondary: React.CSSProperties = {
  ...GF, display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 24px",
  borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)", color: "white",
  fontSize: 15, fontWeight: 600, textDecoration: "none",
};

const chip: React.CSSProperties = {
  ...GF, display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 16px",
  borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)",
  color: "#94a3b8", fontSize: 14, textDecoration: "none",
};
