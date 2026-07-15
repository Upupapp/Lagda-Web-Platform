import { useState } from "react";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Animated parallel routing diagram ─────────────────────────────────────────
function ParallelDiagram() {
  const [completed, setCompleted] = useState<string[]>([]);

  const participants = [
    { name: "Ana Reyes",   role: "Signer", avatar: "AR" },
    { name: "Marco Santos", role: "Signer", avatar: "MS" },
    { name: "Lea Cruz",    role: "Approver", avatar: "LC" },
  ];

  const allDone = participants.every((p) => completed.includes(p.name));

  return (
    <div aria-hidden style={{ maxWidth: 440, width: "100%" }}>
      {/* Sender */}
      <div style={{ background: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, textAlign: "center" }}>
        <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 2 }}>SENDER</p>
        <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: 0 }}>Mabini Legal Solutions</p>
      </div>
      {/* Fork lines */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 0 }}>
        <div style={{ width: 1, height: 16, background: "rgba(0,120,212,0.4)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", marginBottom: 0 }}>
        <div style={{ position: "absolute", top: 0, left: "16.66%", right: "16.66%", height: 1, background: "rgba(0,120,212,0.3)" }} />
        {participants.map((p) => (
          <div key={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flex: 1 }}>
            <div style={{ width: 1, height: 16, background: "rgba(0,120,212,0.4)" }} />
            <button
              onClick={() => setCompleted((prev) =>
                prev.includes(p.name) ? prev.filter((x) => x !== p.name) : [...prev, p.name]
              )}
              style={{
                background: completed.includes(p.name) ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${completed.includes(p.name) ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 10, padding: "10px 8px", cursor: "pointer", width: "90%",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,120,212,0.2)", margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 10, fontWeight: 700, color: "#38bdf8" }}>{p.avatar}</div>
              <p style={{ color: "white", ...GF, fontSize: 11, fontWeight: 600, margin: 0 }}>{p.name}</p>
              <p style={{ color: "#475569", ...GM, fontSize: 9, margin: "2px 0 0" }}>{p.role}</p>
              <div style={{ marginTop: 6, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {completed.includes(p.name)
                  ? <span style={{ color: "#22C55E", fontSize: 14 }}>✓</span>
                  : <span style={{ color: "#475569", ...GM, fontSize: 9 }}>Waiting</span>
                }
              </div>
            </button>
          </div>
        ))}
      </div>
      {/* Join line */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 0 }}>
        {participants.map((p) => (
          <div key={p.name} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 1, height: 16, background: "rgba(0,120,212,0.3)" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", height: 1 }}>
        <div style={{ position: "absolute", top: 0, left: "16.66%", right: "16.66%", height: 1, background: "rgba(0,120,212,0.3)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: 1, height: 16, background: "rgba(0,120,212,0.4)" }} />
      </div>
      {/* Completion */}
      <div style={{
        background: allDone ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${allDone ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10, padding: "10px 14px", textAlign: "center",
        transition: "all 0.3s ease",
      }}>
        <p style={{ color: allDone ? "#22C55E" : "#475569", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 2 }}>
          {allDone ? "COMPLETE" : "WAITING FOR ALL PARTICIPANTS"}
        </p>
        <p style={{ color: allDone ? "white" : "#334155", ...GF, fontSize: 12, margin: 0 }}>
          {allDone ? "All required participants have acted." : `${completed.length} of ${participants.length} completed — click to simulate`}
        </p>
      </div>
    </div>
  );
}

export function ParallelSigning() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Parallel Signing"
        headingId="ps-h1"
        heading="Multiple participants can act at the same time."
        sub="With parallel signing, all participants in a step receive their invitations simultaneously. No one waits for another. The transaction completes after all required participants have acted."
      />

      <PageSection id="diagram" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="ps-two-col">
          <div>
            <SectionHeading eyebrow="How it works" id="ps-how-h2" heading="Everyone receives their invitation at the same time." sub="Parallel routing is useful when signing order does not matter — all required participants must act, but no one is waiting for another to go first." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[
                "All participants in a step are notified simultaneously",
                "Each completes their fields independently",
                "The step advances when all required participants have acted",
                "Multiple steps can be combined: parallel within a step, sequential between steps",
                "Parallel workflows may help reduce total completion time",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Use the diagram to simulate each participant completing their action. The transaction completes when all have acted.
            </p>
          </div>
          <ParallelDiagram />
        </div>
        <style>{`.ps-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .ps-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="use-cases">
        <SectionHeading eyebrow="Use cases" id="ps-uc-h2" heading="When parallel signing makes sense." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="uc-grid">
          {[
            { title: "Joint agreement",   desc: "Two authorized company representatives both need to sign the same contract." },
            { title: "Multi-party NDA",   desc: "Several parties sign a non-disclosure agreement without a required order." },
            { title: "Board resolution",  desc: "Board members simultaneously approve a resolution or document." },
            { title: "Parallel reviewers", desc: "Multiple reviewers complete their review in the same step." },
            { title: "Simultaneous consent", desc: "Both parties to an agreement sign without one waiting for the other." },
            { title: "Bulk acceptance",   desc: "Multiple individuals from the same organization complete in parallel." },
          ].map((u) => (
            <div key={u.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{u.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{u.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.uc-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .uc-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="disclaimer" light bordered>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Parallel signing may reduce total elapsed time compared to sequential workflows, but does not guarantee faster legal completion or execution. Legal requirements governing signature order — where they apply to a specific document — remain the responsibility of the parties and their counsel.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Sequential Signing",  desc: "Participants acting in a defined order", path: "/features/sequential-signing" },
        { label: "Advanced Capabilities", desc: "Mixed routing and reminders", path: "/esignature/advanced-capabilities" },
        { label: "Participant Roles",   desc: "How roles work within parallel steps", path: "/features/participant-roles" },
      ]} />

      <PageCTA
        heading="Compare sequential signing."
        sub="See how sequential routing differs — and when to combine both in one workflow."
        primaryLabel="Sequential Signing"
        primaryPath="/features/sequential-signing"
        secondaryLabel="Advanced Capabilities"
        secondaryPath="/esignature/advanced-capabilities"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
