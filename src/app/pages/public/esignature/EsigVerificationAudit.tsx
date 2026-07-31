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
import { AUDIT_EVENTS, VERIFICATION_STATES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Transaction progress tracker ──────────────────────────────────────────────
function ProgressTracker() {
  const STATUSES = [
    { label: "Sent",               color: "#0078D4", done: true },
    { label: "Ana Reyes — Signed", color: "#22C55E", done: true },
    { label: "Marco Santos — Approving", color: "#F59E0B", done: false },
    { label: "Completed",          color: "#94a3b8", done: false },
  ];

  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.2)",
      borderRadius: 14, padding: "20px 20px",
      maxWidth: 360, width: "100%",
    }}>
      <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 16 }}>
        PROFESSIONAL SERVICES AGREEMENT
      </p>
      {STATUSES.map((s, i) => (
        <div key={s.label} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < STATUSES.length - 1 ? 0 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: s.done ? s.color : "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: "white", fontWeight: 700,
            }}>
              {s.done ? "✓" : "·"}
            </div>
            {i < STATUSES.length - 1 && (
              <div style={{ width: 1, height: 20, background: s.done ? "rgba(0,120,212,0.3)" : "rgba(255,255,255,0.08)", margin: "2px 0" }} />
            )}
          </div>
          <div style={{ paddingBottom: i < STATUSES.length - 1 ? 16 : 0 }}>
            <span style={{ color: s.done ? "white" : "#475569", ...GF, fontSize: 12, fontWeight: s.done ? 600 : 400 }}>
              {s.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Audit trail mockup ────────────────────────────────────────────────────────
function AuditTrailMockup() {
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.2)",
      borderRadius: 14, overflow: "hidden",
      maxWidth: 480, width: "100%",
    }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>Activity Log</span>
        <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700 }}>{AUDIT_EVENTS.length} EVENTS</span>
      </div>
      <div style={{ padding: "6px 0" }}>
        {AUDIT_EVENTS.map((ev, i) => (
          <div key={i} style={{ padding: "9px 18px", display: "flex", gap: 10, alignItems: "flex-start", borderBottom: i < AUDIT_EVENTS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <span aria-hidden style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{ev.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{ev.event}</p>
              <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.who}</p>
            </div>
            <span style={{ color: "#334155", ...GM, fontSize: 10, flexShrink: 0 }}>{ev.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Verification demo ─────────────────────────────────────────────────────────
function VerificationDemo() {
  const [activeId, setActiveId] = useState("verified");
  const active = VERIFICATION_STATES.find((s) => s.id === activeId) ?? VERIFICATION_STATES[0];
  if (!active) return null;

  const DETAILS: Record<string, { label: string; value: string; mono?: boolean }[]> = {
    verified: [
      { label: "Verification ID", value: "LAGDA-VER-2026-004821", mono: true },
      { label: "Status",          value: "Completed" },
      { label: "Completed",       value: "14 July 2026, 4:01 PM PHT" },
      { label: "Document Match",  value: "Confirmed" },
      { label: "Participants",    value: "3 of 3 completed" },
    ],
    mismatch: [
      { label: "Verification ID", value: "LAGDA-VER-2026-004821", mono: true },
      { label: "Record Status",   value: "Completed" },
      { label: "Warning",         value: "The submitted file does not match the LAGDA record for this ID." },
    ],
    incomplete: [
      { label: "Verification ID", value: "LAGDA-VER-2026-004788", mono: true },
      { label: "Status",          value: "Awaiting signatures" },
      { label: "Note",            value: "This document has not yet been completed." },
    ],
    notfound: [
      { label: "Searched",        value: "LAGDA-VER-2026-000000", mono: true },
      { label: "Result",          value: "No matching record was found." },
    ],
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {VERIFICATION_STATES.map((s) => (
          <button key={s.id} onClick={() => setActiveId(s.id)}
            aria-pressed={s.id === activeId}
            style={{
              all: "unset", padding: "5px 12px", borderRadius: 999, cursor: "pointer",
              background: s.id === activeId ? "rgba(0,120,212,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${s.id === activeId ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: s.id === activeId ? "#38bdf8" : "#64748b",
              ...GF, fontSize: 12, fontWeight: s.id === activeId ? 700 : 500,
              transition: "all 0.15s ease",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{
        background: "rgba(7,17,31,0.95)",
        border: "1px solid rgba(0,120,212,0.2)",
        borderRadius: 14, overflow: "hidden",
        maxWidth: 460, width: "100%",
      }}>
        {/* Status banner */}
        <div style={{ padding: "12px 18px", background: active.bg, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: active.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {active.icon}
          </span>
          <span style={{ color: active.color, ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
            {active.statusText}
          </span>
        </div>
        {/* Fields */}
        <div style={{ padding: "8px 0" }}>
          {DETAILS[active.id]?.map((f) => (
            <div key={f.label} style={{ padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ color: "#475569", ...GM, fontSize: 10, flexShrink: 0, minWidth: 80, paddingTop: 2 }}>{f.label}</span>
              <span style={{ color: "white", ...(f.mono ? GM : GF), fontSize: 12, lineHeight: 1.4, wordBreak: "break-word" }}>{f.value}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 18px", background: "rgba(0,0,0,0.2)" }}>
          <p style={{ color: "#334155", ...GF, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            Verification confirms LAGDA records only. Not a substitute for legal authentication.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Public vs private data ────────────────────────────────────────────────────
function PublicPrivateSection() {
  const PUBLIC = ["Verification status", "Verification ID", "Completion date", "Document description (where permitted)", "Transaction status", "Document-match result"];
  const PRIVATE = ["Signer email addresses", "Phone numbers", "IP addresses and device details", "Authentication evidence", "Document content", "Private audit records"];

  return (
    <PageSection id="public-private" light bordered>
      <SectionHeading eyebrow="Privacy" id="pp-heading" heading="Public verification protects participant privacy." sub="LAGDA's public verification surface is designed to confirm a document's status without exposing participant information." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="pp-grid">
        <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: "20px 20px" }}>
          <p style={{ color: "#22C55E", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>PUBLICLY SHOWN BY DEFAULT</p>
          {PUBLIC.map((item) => (
            <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ color: "#22C55E", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
              <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 14, padding: "20px 20px" }}>
          <p style={{ color: "#DC2626", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>NOT SHOWN BY DEFAULT</p>
          {PRIVATE.map((item) => (
            <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
              <span style={{ color: "#DC2626", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✗</span>
              <span style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`.pp-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 640px) { .pp-grid { grid-template-columns: 1fr; } }`}</style>
    </PageSection>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function EsigVerificationAudit() {
  return (
    <EsigPageShell>
      <PageHero
        eyebrow="Verification & Audit"
        headingId="va-h1"
        heading="Track every action and verify every completed record."
        sub="LAGDA records a complete, timestamped activity log for every transaction. Completed documents receive a Verification ID and QR code that anyone can use to confirm status — no account needed."
      />

      {/* Tracking */}
      <PageSection id="tracking" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="va-two-col">
          <div>
            <SectionHeading eyebrow="Real-time tracking" id="tracking-heading" heading="Track every document from send to completion." sub="LAGDA shows exactly where each participant stands at every moment — who has signed, who is pending, and what is outstanding." />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["View per-participant status in real time", "See when the document was viewed", "Know which authentication step was completed", "Monitor partial completion progress", "Identify pending or failed actions", "Cancel or extend where needed"].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <ProgressTracker />
        </div>
        <style>{`.va-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .va-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Audit trail */}
      <PageSection id="audit-trail">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="va-two-col">
          <AuditTrailMockup />
          <div>
            <SectionHeading eyebrow="Audit trail" id="audit-heading" heading="Create audit-ready records automatically." sub="Every significant action in a transaction is recorded — with a timestamp and relevant contextual evidence." />
            <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0, marginBottom: 16 }}>
              Recorded events may include: transaction creation, invitation delivery, document views, authentication attempts and completions, field entries, signatures, approvals, completions, cancellations, expirations, and verification record generation.
            </p>
            <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              The audit trail supports transparency and accountability. For situations requiring formal legal evidence, consult applicable requirements for what records must be produced.
            </p>
          </div>
        </div>
      </PageSection>

      {/* Evidence details */}
      <PageSection id="evidence" light bordered>
        <SectionHeading eyebrow="Evidence" id="evidence-heading" heading="What each event may record." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="ev-grid">
          {[
            { label: "Event type",              desc: "What happened in the transaction." },
            { label: "Date and time",            desc: "Timestamp in Philippine time zone." },
            { label: "Participant role",         desc: "Which participant performed the action." },
            { label: "Authentication method",    desc: "How the participant's identity was verified." },
            { label: "IP information",           desc: "Network address associated with the action." },
            { label: "Document integrity",       desc: "A reference used to detect changes to the completed document." },
          ].map((e) => (
            <div key={e.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{e.label}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{e.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.6, margin: "20px 0 0" }}>
          Exact device location is never collected automatically. Location information, where shown, is derived from IP address only and is approximate. Precise location should only be collected with explicit participant permission and where justified by the selected workflow.
        </p>
        <style>{`.ev-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .ev-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Verification */}
      <PageSection id="verification">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="va-two-col">
          <div>
            <SectionHeading eyebrow="Document Verification" id="verif-heading" heading="Store completed documents and verify records when needed." sub="Every completed LAGDA transaction receives a Verification ID. Scan the QR code or enter the ID to check a document's LAGDA status." />
            <div style={{ background: "rgba(201,150,12,0.08)", border: "1px solid rgba(201,150,12,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>VERIFICATION CONFIRMS</p>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                That a document matches the LAGDA record for a given Verification ID. Verification helps detect whether the submitted file has been altered since completion. It does not substitute for legal authentication or notarization.
              </p>
            </div>
            <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: "#64748b" }}>Verification methods:</strong> QR code, Verification ID, secure verification link, or document upload where supported.
            </p>
          </div>
          <VerificationDemo />
        </div>
      </PageSection>

      <PublicPrivateSection />

      <RelatedPages links={[
        { label: "Verify a Document",     desc: "Public verification — no account required", path: "/verify" },
        { label: "Advanced Capabilities", desc: "Reminders, bulk, and enterprise features", path: "/esignature/advanced-capabilities" },
      ]} />

      <PageCTA
        heading="Track, verify, and secure every signing workflow."
        sub="Start free. Every LAGDA transaction includes a full audit trail and Verification ID."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Verify a Document"
        secondaryPath="/verify"
      />

      <LegalNote />
    </EsigPageShell>
  );
}
