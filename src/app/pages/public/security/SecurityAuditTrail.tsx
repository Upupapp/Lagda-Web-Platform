import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function SecurityAuditTrail() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Security: Audit Trail"
        headingId="sat-h1"
        heading="Evidence integrity, access levels, and what the audit trail actually records."
        sub="The LAGDA audit trail is the primary evidence record for a signing transaction. This page explains how evidence is protected, who can access which details, and how the audit trail supports dispute resolution."
      />

      <PageSection id="integrity" light bordered>
        <SectionHeading eyebrow="Evidence integrity" id="ei-h2" heading="How the audit trail is protected from modification." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640, margin: "0 auto" }}>
          {[
            { title: "Write-once event records",         desc: "Audit events are written at the time they occur. They are not editable by workspace members, administrators, or senders." },
            { title: "Timestamped at event time",        desc: "Each event is recorded with a server-generated timestamp at the moment of occurrence — not at download time." },
            { title: "Transaction-scoped records",       desc: "Each event is attached to its transaction ID. Records cannot be reassigned to other transactions." },
            { title: "Verification record generation",   desc: "When a transaction is completed, a Verification ID is generated and linked to the audit record for public verification." },
          ].map((item) => (
            <div key={item.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{item.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection id="access-levels">
        <SectionHeading eyebrow="Access levels" id="al-h2" heading="Not all audit detail is accessible to everyone." sub="The audit trail uses three access levels. Higher-detail evidence is restricted to authorized workspace members and legal process." center />
        <div style={{ display: "grid", gap: 10 }} className="al-grid">
          {[
            {
              level: "Public",
              color: "#22C55E",
              desc: "Accessible to anyone via the verification tool.",
              items: ["Verification ID", "Transaction status", "Completion date", "Document description", "File match result"],
            },
            {
              level: "Workspace",
              color: "#38bdf8",
              desc: "Accessible to authorized workspace members (Sender, Auditor role).",
              items: ["Full event timeline", "Participant identities", "IP addresses", "Device and browser", "Auth method used"],
            },
            {
              level: "Legal process",
              color: "#a78bfa",
              desc: "Full evidence package may be requested for legal or dispute resolution purposes.",
              items: ["Complete raw audit log", "Session identifiers", "Authentication event details", "Evidence bundle export"],
            },
          ].map((tier) => (
            <div key={tier.level} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 14px" }}>
              <p style={{ color: tier.color, ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 4 }}>{tier.level.toUpperCase()}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>{tier.desc}</p>
              {tier.items.map((item) => (
                <div key={item} style={{ display: "flex", gap: 7, marginBottom: 5 }}>
                  <span style={{ color: tier.color, flexShrink: 0, fontSize: 11 }}>·</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <style>{`.al-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .al-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="retention" light bordered>
        <SectionHeading eyebrow="Retention" id="ret-h2" heading="How long audit records are kept." center />
        <div style={{ display: "grid", gap: 10 }} className="ret-grid">
          {[
            { title: "Retention period by plan",      desc: "Audit record retention varies by plan. Exact durations are on the Pricing page." },
            { title: "Export before deletion",        desc: "Audit records can be exported before a retention period ends. Senders and Auditors can initiate exports." },
            { title: "Workspace-configurable",        desc: "Some retention settings may be configurable by administrators within their plan's allowed range." },
            { title: "Legal hold",                    desc: "Records subject to legal hold should be exported and stored by the responsible party outside LAGDA." },
          ].map((r) => (
            <div key={r.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ret-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 580px) { .ret-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Audit Trail (Features)",  desc: "Interactive event timeline and event types", path: "/features/audit-trail" },
        { label: "Document Verification",   desc: "How the audit record supports verification", path: "/security/document-verification" },
        { label: "Privacy and Data",        desc: "Who can access what — and under what conditions", path: "/security/privacy-and-data-protection" },
      ]} />

      <PageCTA
        heading="Verify a document using the audit record."
        sub="The Verification ID generated at completion is the link between the public verification record and the full audit trail."
        primaryLabel="Document Verification"
        primaryPath="/security/document-verification"
        secondaryLabel="Audit Trail Features"
        secondaryPath="/features/audit-trail"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
