import { useState } from "react";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { AUDIT_EVENTS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function AuditTimeline() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 500, width: "100%" }}>
      <div style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700 }}>Audit Trail</span>
          <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700 }}>LAGDA-VER-2026-004821</span>
        </div>
        {AUDIT_EVENTS.map((e, i) => (
          <div key={i}>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              aria-expanded={expanded === i}
              style={{
                width: "100%", background: "transparent", border: "none",
                borderBottom: i < AUDIT_EVENTS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                padding: "9px 16px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10, textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>{e.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{e.event}</p>
                <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.who}</p>
              </div>
              <span style={{ color: "#7C8DA4", ...GM, fontSize: 9, flexShrink: 0 }}>{expanded === i ? "▲" : "▼"}</span>
            </button>
            {expanded === i && (
              <div style={{ padding: "8px 16px 10px 40px", background: "rgba(0,120,212,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: "#7C8DA4", ...GM, fontSize: 10, minWidth: 80 }}>Time</span>
                    <span style={{ color: "#94a3b8", ...GM, fontSize: 10 }}>{e.time}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: "#7C8DA4", ...GM, fontSize: 10, minWidth: 80 }}>Participant</span>
                    <span style={{ color: "#94a3b8", ...GM, fontSize: 10 }}>{e.who}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: "#7C8DA4", ...GM, fontSize: 10, minWidth: 80 }}>Event</span>
                    <span style={{ color: "#94a3b8", ...GM, fontSize: 10 }}>{e.event}</span>
                  </div>
                  <p style={{ color: "#7C8DA4", ...GM, fontSize: 9, margin: "4px 0 0", fontStyle: "italic" }}>
                    Additional details (IP, device, auth method) are access-controlled and not shown publicly.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const ALL_EVENTS = [
  "Transaction created", "Document uploaded", "Participant added", "Invitation sent",
  "Delivery confirmed", "Document viewed", "Authentication attempted", "Authentication completed",
  "Field completed", "Signature adopted", "Approval recorded", "Reminder sent",
  "Participant declined", "Transaction completed", "Transaction cancelled",
  "Transaction expired", "Verification record generated",
];

export function AuditTrail() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Audit Trail"
        headingId="at-h1"
        heading="Every transaction event — recorded, timestamped, and preserved."
        sub="The LAGDA audit trail captures the complete sequence of events in a signing transaction — from invitation to completion and verification. It helps organizations understand what happened, when, and under what circumstances."
      />

      <PageSection id="timeline" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="at-two-col">
          <div>
            <SectionHeading eyebrow="Transaction events" id="te-h2" heading="A complete, expandable timeline of every event." sub="Click any event to see what information is recorded. Detailed evidence — IP, device, authentication method — is access-controlled and not exposed publicly." />
            <p style={{ color: "#8A9BAE", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0, marginTop: 8 }}>
              Not every event will contain every data field. The presence of specific data depends on the authentication method, participant behavior, device, and transaction configuration.
            </p>
          </div>
          <AuditTimeline />
        </div>
        <style>{`.at-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .at-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="all-events">
        <SectionHeading eyebrow="Recorded events" id="ae-h2" heading="What the audit trail may include." sub="Not all events occur in every transaction. The events present depend on the workflow, routing, and participant actions." center />
        <div style={{ display: "grid", gap: 8 }} className="ae-grid">
          {ALL_EVENTS.map((ev) => (
            <div key={ev} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ color: "#38BDF8", fontSize: 12, flexShrink: 0, marginTop: 1 }}>●</span>
              <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>{ev}</span>
            </div>
          ))}
        </div>
        <style>{`.ae-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .ae-grid { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 480px) { .ae-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="evidence-detail" light bordered>
        <SectionHeading eyebrow="Event details" id="ed-h2" heading="What an event record may contain." center />
        <div style={{ display: "grid", gap: 10 }} className="ed-grid">
          {[
            { field: "Event type",              example: "Signature adopted" },
            { field: "Participant role",         example: "Marco Santos · Signer" },
            { field: "Date and time",            example: "10:16 AM, 14 Jul 2026" },
            { field: "Authentication method",   example: "Email OTP" },
            { field: "Device and browser",       example: "Chrome 126 · Windows 11" },
            { field: "IP address",               example: "Recorded — access-controlled" },
            { field: "Completion state",         example: "All fields completed" },
            { field: "Session identifier",       example: "Unique to this participant session" },
          ].map((d) => (
            <div key={d.field} style={{ display: "flex", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 12px" }}>
              <span style={{ color: "#94A3B8", ...GM, fontSize: 11, flexShrink: 0, minWidth: 160 }}>{d.field}</span>
              <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>{d.example}</span>
            </div>
          ))}
        </div>
        <style>{`.ed-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .ed-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Document Verification",   desc: "Public verification using the Verification ID", path: "/features/document-verification" },
        { label: "Security: Audit Trail",   desc: "Evidence integrity, access levels, and retention", path: "/security/audit-trail" },
        { label: "Verification & Audit",    desc: "The eSignature section Verification & Audit page", path: "/esignature/verification-and-audit" },
      ]} />

      <PageCTA
        heading="Explore Document Verification."
        sub="See how the audit trail supports document verification using a Verification ID or QR code."
        primaryLabel="Document Verification"
        primaryPath="/features/document-verification"
        secondaryLabel="Verification & Audit"
        secondaryPath="/esignature/verification-and-audit"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
