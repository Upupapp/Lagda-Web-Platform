import { useState } from "react";
import {
  EsigPageShell,
  PageHero,
  PageSection,
  SectionHeading,
  RelatedPages,
  PageCTA,
  LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { PARTICIPANT_ROLES, AUTH_METHODS, FIELD_TYPES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Document setup mockup ─────────────────────────────────────────────────────
function DocumentSetupMockup() {
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden",
      maxWidth: 420, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>📄</span>
        <span style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700 }}>Professional Services Agreement.pdf</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 10 }}>FIELDS PLACED</p>
        {[
          { field: "Signature",    by: "Ana Reyes · Page 4",    icon: "✍️" },
          { field: "Initials",     by: "Ana Reyes · Page 2",    icon: "🖊" },
          { field: "Date",         by: "Auto-populated",         icon: "📅" },
          { field: "Approval",     by: "Marco Santos · Page 4",  icon: "✓" },
        ].map((f) => (
          <div key={f.field} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontSize: 13 }}>{f.icon}</span>
            <span style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, flex: 1 }}>{f.field}</span>
            <span style={{ color: "#475569", ...GM, fontSize: 10 }}>{f.by}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 16px", background: "rgba(0,120,212,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#64748b", ...GF, fontSize: 12 }}>4 fields · 2 participants</span>
        <span style={{ color: "#0078D4", ...GF, fontSize: 12, fontWeight: 700 }}>Review & Send →</span>
      </div>
    </div>
  );
}

// ── Routing diagram ───────────────────────────────────────────────────────────
function RoutingDiagram() {
  const [mode, setMode] = useState<"sequential" | "parallel">("sequential");

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["sequential", "parallel"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            aria-pressed={mode === m}
            style={{
              all: "unset", padding: "6px 14px", borderRadius: 999, cursor: "pointer",
              background: mode === m ? "rgba(0,120,212,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${mode === m ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: mode === m ? "#38bdf8" : "#64748b",
              ...GF, fontSize: 13, fontWeight: mode === m ? 700 : 500,
              transition: "all 0.15s ease",
            }}
          >
            {m === "sequential" ? "Sequential" : "Parallel"}
          </button>
        ))}
      </div>

      <div style={{
        background: "rgba(7,17,31,0.95)",
        border: "1px solid rgba(0,120,212,0.2)",
        borderRadius: 14, padding: "20px 20px",
        minHeight: 160,
      }}>
        {mode === "sequential" ? (
          <div>
            <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>SEQUENTIAL — ACTS IN ORDER</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {["Ana Reyes · Signer", "→", "Marco Santos · Approver", "→", "Completed"].map((item, i) => (
                item === "→" ? (
                  <span key={i} style={{ color: "#0078D4", fontSize: 18, fontWeight: 700 }}>→</span>
                ) : (
                  <div key={i} style={{
                    background: item === "Completed" ? "rgba(34,197,94,0.1)" : "rgba(0,120,212,0.1)",
                    border: `1px solid ${item === "Completed" ? "rgba(34,197,94,0.25)" : "rgba(0,120,212,0.25)"}`,
                    borderRadius: 8, padding: "7px 12px",
                    color: item === "Completed" ? "#22C55E" : "white",
                    ...GF, fontSize: 12, fontWeight: 600,
                  }}>
                    {item}
                  </div>
                )
              ))}
            </div>
            <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.5, margin: "16px 0 0" }}>
              Each participant acts only after the previous one completes. Useful when an approval or authority depends on prior action.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>PARALLEL — ACT SIMULTANEOUSLY</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {["Ana Reyes · Signer", "Marco Santos · Signer"].map((p) => (
                <div key={p} style={{
                  background: "rgba(0,120,212,0.1)",
                  border: "1px solid rgba(0,120,212,0.25)",
                  borderRadius: 8, padding: "7px 12px",
                  color: "white", ...GF, fontSize: 12, fontWeight: 600,
                }}>
                  {p}
                </div>
              ))}
            </div>
            <div style={{ width: "100%", height: 1, background: "rgba(0,120,212,0.2)", marginBottom: 12 }} />
            <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, padding: "7px 12px", display: "inline-flex", color: "#22C55E", ...GF, fontSize: 12, fontWeight: 600 }}>
              Completed when both sign
            </div>
            <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.5, margin: "16px 0 0" }}>
              All participants in this step act at the same time. Completion requires all to respond. Useful when signing order does not matter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Transaction summary mockup ────────────────────────────────────────────────
function ReviewSummaryMockup() {
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.2)",
      borderRadius: 14, overflow: "hidden",
      maxWidth: 400, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>Transaction Summary</span>
      </div>
      {[
        { label: "Document",    value: "Professional Services Agreement.pdf" },
        { label: "Participants", value: "Ana Reyes (Signer) → Marco Santos (Approver)" },
        { label: "Routing",     value: "Sequential" },
        { label: "Auth",        value: "Email OTP · Secure Link" },
        { label: "Fields",      value: "4 fields placed" },
        { label: "Reminder",    value: "3 days, then daily" },
        { label: "Expires",     value: "21 July 2026" },
      ].map((row) => (
        <div key={row.label} style={{ padding: "9px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ color: "#475569", ...GM, fontSize: 10, flexShrink: 0, paddingTop: 2, minWidth: 80 }}>{row.label}</span>
          <span style={{ color: "#94a3b8", ...GF, fontSize: 12, lineHeight: 1.4 }}>{row.value}</span>
        </div>
      ))}
      <div style={{ padding: "12px 16px", background: "rgba(0,120,212,0.08)" }}>
        <div style={{ background: "#0078D4", borderRadius: 8, padding: "8px 16px", textAlign: "center", ...GF, fontSize: 13, fontWeight: 700, color: "white" }}>
          Send Document
        </div>
      </div>
    </div>
  );
}

// ── Recipient journey steps ───────────────────────────────────────────────────
const RECIPIENT_STEPS = [
  { num: 1, title: "Open the invitation",    desc: "Participant receives a secure invitation via email with a unique link." },
  { num: 2, title: "Confirm document",       desc: "Participant sees the sender, document name, and any instructions." },
  { num: 3, title: "Authenticate",           desc: "Participant completes the configured identity verification step." },
  { num: 4, title: "Review the document",    desc: "Participant reads the full document before completing any fields." },
  { num: 5, title: "Complete required fields", desc: "Navigate to signature, initials, and any other assigned fields." },
  { num: 6, title: "Adopt a signature",      desc: "Participant adopts an electronic signature for use in this document." },
  { num: 7, title: "Confirm completion",     desc: "Participant reviews their entries before submitting." },
  { num: 8, title: "Access completed record", desc: "Where permitted, participant can download or verify the completed document." },
];

// ── Main export ───────────────────────────────────────────────────────────────
export function EsigCoreWorkflow() {
  return (
    <EsigPageShell>
      <PageHero
        eyebrow="Core Workflow"
        headingId="cw-h1"
        heading="Prepare, send, verify, and sign documents faster."
        sub="A step-by-step guide to preparing a LAGDA document, configuring participants and routing, and delivering a clean, guided signing experience to every recipient."
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <a href="#prepare" style={{ color: "#38bdf8", ...GF, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Prepare ↓</a>
          <a href="#participants" style={{ color: "#64748b", ...GF, fontSize: 14, textDecoration: "none" }}>Participants ↓</a>
          <a href="#routing" style={{ color: "#64748b", ...GF, fontSize: 14, textDecoration: "none" }}>Routing ↓</a>
          <a href="#authentication" style={{ color: "#64748b", ...GF, fontSize: 14, textDecoration: "none" }}>Authentication ↓</a>
          <a href="#recipient" style={{ color: "#64748b", ...GF, fontSize: 14, textDecoration: "none" }}>Recipient journey ↓</a>
        </div>
      </PageHero>

      {/* Prepare */}
      <PageSection id="prepare" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="cw-two-col">
          <div>
            <SectionHeading eyebrow="Step 1" id="prepare-heading" heading="Prepare documents faster." sub="Upload PDFs, configure fields, set instructions and reminders, and prepare the complete document before it goes out." />
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {["Upload one or multiple PDFs", "Define document order in multi-document transactions", "Add instructions visible to all participants", "Set automated reminder schedule", "Set a completion deadline", "Save as a draft before sending"].map((item) => (
                <li key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <DocumentSetupMockup />
        </div>
        <style>{`.cw-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .cw-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Participants */}
      <PageSection id="participants">
        <SectionHeading eyebrow="Step 2" id="part-heading" heading="Send documents to the right people in the right order." sub="Add participants by email and assign each a role that determines what they can do in the transaction." />
        <div style={{ display: "grid", gap: 12 }} className="roles-grid">
          {PARTICIPANT_ROLES.map((r) => (
            <div key={r.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.label}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ color: "#334155", ...GF, fontSize: 12, lineHeight: 1.6, marginTop: 16 }}>
          Recipients do not need an existing LAGDA account to sign or approve a document. A secure invitation link is sufficient.
        </p>
        <style>{`.roles-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .roles-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Routing */}
      <PageSection id="routing" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="cw-two-col">
          <div>
            <SectionHeading eyebrow="Step 3" id="routing-heading" heading="Control the order signing happens." sub="LAGDA supports sequential, parallel, and mixed routing to match how your documents actually need to move." />
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>EXAMPLE — SEQUENTIAL</p>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                A services agreement is sent to the department manager for approval first. Only after approval does the authorized signatory receive the signing invitation.
              </p>
            </div>
          </div>
          <RoutingDiagram />
        </div>
      </PageSection>

      {/* Authentication */}
      <PageSection id="authentication">
        <SectionHeading eyebrow="Step 4" id="auth-heading" heading="Know exactly who is signing." sub="Select an authentication method for each participant. Identity is confirmed at the moment of signing." />
        <div style={{ display: "grid", gap: 10 }} className="auth-grid">
          {AUTH_METHODS.map((m) => (
            <div key={m.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <span style={{ color: m.available ? "#22C55E" : "#C9960C", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>{m.available ? "✓" : "★"}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 2 }}>
                  {m.label}
                  {!m.available && <span style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, marginLeft: 8 }}>ENTERPRISE</span>}
                </p>
                <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`.auth-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 720px) { .auth-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Field placement */}
      <PageSection id="field-placement" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="cw-two-col">
          <div>
            <SectionHeading eyebrow="Step 5" id="fields-heading" heading="Place the right fields for each participant." sub="Define exactly what each participant must complete — where on the document and in what form." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {FIELD_TYPES.map((f) => (
                <div key={f.label} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0" }}>
                  <span aria-hidden style={{ fontSize: 16, flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>{f.label}</p>
                    <p style={{ color: "#64748b", ...GF, fontSize: 11, margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ReviewSummaryMockup />
        </div>
      </PageSection>

      {/* Recipient journey */}
      <PageSection id="recipient">
        <SectionHeading eyebrow="Recipient experience" id="recip-heading" heading="Make signing simple for every recipient." sub="Recipients follow a guided, step-by-step experience. No LAGDA account required — just the secure invitation link." />
        <div style={{ display: "grid", gap: 10 }} className="recip-grid">
          {RECIPIENT_STEPS.map((s) => (
            <div key={s.num} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 14px" }}>
              <span style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 6 }}>
                {String(s.num).padStart(2, "0")}
              </span>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{s.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.recip-grid { grid-template-columns: repeat(4, 1fr); } @media (max-width: 900px) { .recip-grid { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 560px) { .recip-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Verification & Audit",   desc: "How evidence is recorded and documents are verified", path: "/esignature/verification-and-audit" },
        { label: "Advanced Capabilities",  desc: "Reminders, expiration, and complex routing", path: "/esignature/advanced-capabilities" },
      ]} />

      <PageCTA
        heading="Ready to send your first document?"
        sub="Create a free LAGDA account and prepare your first signing request in minutes."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Explore Verification & Audit"
        secondaryPath="/esignature/verification-and-audit"
      />

      <LegalNote />
    </EsigPageShell>
  );
}
