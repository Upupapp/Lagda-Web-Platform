import { useState } from "react";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Sequential step diagram ────────────────────────────────────────────────────
function SequentialDiagram() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: "Step 1", participant: "Ana Reyes", role: "Approver", avatar: "AR", desc: "Manager reviews and approves before any signature is collected." },
    { label: "Step 2", participant: "Marco Santos", role: "Signer", avatar: "MS", desc: "Authorized signatory receives invitation only after Step 1 is complete." },
    { label: "Step 3", participant: "Lea Cruz", role: "Copy Recipient", avatar: "LC", desc: "Receives a completed copy once all required participants have acted." },
  ];

  return (
    <div aria-hidden style={{ maxWidth: 420, width: "100%" }}>
      {/* Sender */}
      <div style={{ background: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 0, textAlign: "center" }}>
        <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 2 }}>SENDER</p>
        <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: 0 }}>Mabini Legal Solutions</p>
      </div>

      {steps.map((s, i) => (
        <div key={s.label}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 1, height: 16, background: i <= activeStep ? "#0078D4" : "rgba(255,255,255,0.1)" }} />
          </div>
          <button
            onClick={() => setActiveStep(i)}
            style={{
              width: "100%",
              background: i === activeStep ? "rgba(0,120,212,0.12)" : i < activeStep ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${i === activeStep ? "rgba(0,120,212,0.4)" : i < activeStep ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10, padding: "12px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 12, textAlign: "left",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ color: i < activeStep ? "#22C55E" : i === activeStep ? "#38bdf8" : "#7C8DA4", ...GM, fontSize: 11, fontWeight: 700, flexShrink: 0, minWidth: 48 }}>
              {i < activeStep ? "✓ Done" : i === activeStep ? "Active" : "Pending"}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{s.label}: {s.participant}</p>
              <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "2px 0 0" }}>{s.role}</p>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,120,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 10, fontWeight: 700, color: "#38bdf8", flexShrink: 0 }}>{s.avatar}</div>
          </button>
          {i === activeStep && (
            <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 14px" }}>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          )}
        </div>
      ))}
      <p style={{ color: "#7C8DA4", ...GM, fontSize: 10, marginTop: 12, textAlign: "center" }}>Click a step to see details</p>
    </div>
  );
}

export function SequentialSigning() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Sequential Signing"
        headingId="ss-h1"
        heading="Participants act in a defined order, one step unlocking the next."
        sub="Sequential routing ensures each participant receives their invitation only after the previous step is complete. Useful when internal approval, authority, or process order matters."
      />

      <PageSection id="diagram" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="ss-two-col">
          <div>
            <SectionHeading eyebrow="How it works" id="ss-how-h2" heading="Each step waits for the previous one to finish." sub="When Step 1 is complete, Step 2 participants receive their invitation — and so on. No step starts until the previous is done." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[
                "Each step is unlocked only when the previous step is complete",
                "Participants in a later step are not notified until their turn",
                "Useful for enforcing approval chains and authority hierarchies",
                "Combine sequential steps with parallel participants within one step",
                "Declined or expired transactions prevent the next step from starting",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#38BDF8", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <SequentialDiagram />
        </div>
        <style>{`.ss-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .ss-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="use-cases">
        <SectionHeading eyebrow="Use cases" id="ss-uc-h2" heading="When sequential routing makes sense." center />
        <div style={{ display: "grid", gap: 12 }} className="uc-grid">
          {[
            { title: "Approval before signing", desc: "A manager or legal counsel reviews and approves before the authorized signatory is invited to sign." },
            { title: "HR acknowledgement",      desc: "Employee signs an employment document first; HR acknowledges receipt in a subsequent step." },
            { title: "Procurement chain",       desc: "Vendor fills in required information before the procurement approver acts." },
            { title: "Counter-party signing",   desc: "One party signs first; the counter-party signs only after receiving a fully-prepared document." },
            { title: "Board authorization",     desc: "Board resolution is approved before the corporate secretary certifies." },
            { title: "Internal compliance",     desc: "Compliance review completes before the final authorized execution." },
          ].map((u) => (
            <div key={u.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{u.title}</p>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{u.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.uc-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .uc-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="mixed" light bordered>
        <SectionHeading eyebrow="Mixed routing" id="mixed-h2" heading="Sequential steps, parallel participants within each step." sub="Steps occur in order. Within each step, multiple participants may act simultaneously — reducing wait time without compromising the approval sequence." />
        <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 14, padding: "20px 18px" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>EXAMPLE — MIXED ROUTING</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            Step 1: Two authorized representatives sign simultaneously (parallel).<br />
            Step 2: Only after both complete does the corporate secretary certify (sequential unlock).<br />
            Step 3: Finance Approver reviews once the document is fully signed.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Parallel Signing",     desc: "Multiple participants acting at the same time", path: "/features/parallel-signing" },
        { label: "Participant Roles",    desc: "How roles determine routing and access", path: "/features/participant-roles" },
        { label: "Signer Authentication", desc: "Adding authentication to each step", path: "/features/signer-authentication" },
      ]} />

      <PageCTA
        heading="Explore signer authentication."
        sub="Add authentication requirements at each routing step to increase confidence in each participant."
        primaryLabel="Signer Authentication"
        primaryPath="/features/signer-authentication"
        secondaryLabel="Parallel Signing"
        secondaryPath="/features/parallel-signing"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
