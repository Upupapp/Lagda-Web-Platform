import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { STORAGE_STAGES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function SecureStorage() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Secure Storage"
        headingId="ss-h1"
        heading="How documents are stored, retained, and deleted."
        sub="LAGDA stores documents and transaction records for the duration of the workspace's retention period. This page explains the lifecycle of a stored document, access controls, and deletion behavior."
      />

      <PageSection id="lifecycle" light bordered>
        <SectionHeading eyebrow="Document lifecycle" id="dl-h2" heading="Every storage stage — from upload to deletion." sub="Documents move through defined states. Access and retention behavior differs at each stage." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 680, margin: "0 auto" }}>
          {STORAGE_STAGES.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 3 }}>{s.stage}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
              {i < STORAGE_STAGES.length - 1 && (
                <div style={{ position: "absolute", display: "none" }} aria-hidden />
              )}
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection id="access">
        <SectionHeading eyebrow="Access controls" id="ac-h2" heading="Who can access stored documents." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="acc-grid">
          {[
            { who: "Senders",           access: "Can access their own transactions, download completed documents, and export audit records within their retention period." },
            { who: "Workspace admins",  access: "Can view transaction status and audit records across the workspace. Access to document content depends on workspace configuration." },
            { who: "Auditor role",      access: "Specific role for audit record access. May view event logs without necessarily accessing raw document content." },
            { who: "Participants",      access: "Receive a completed document copy after the transaction finishes. Ongoing document access depends on workspace configuration." },
            { who: "LAGDA support",     access: "Access may occur in response to a verified support request. Access is logged." },
            { who: "Legal process",     access: "Records may be produced in response to a valid legal order. Documented per applicable process." },
          ].map((r) => (
            <div key={r.who} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.who.toUpperCase()}</p>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{r.access}</p>
            </div>
          ))}
        </div>
        <style>{`.acc-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 580px) { .acc-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="deletion" light bordered>
        <SectionHeading eyebrow="Deletion" id="del-h2" heading="What happens when a document is deleted." center />
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { title: "Soft deletion vs. hard deletion",   desc: "Deletion from the active view ('archive') does not immediately purge data. Hard deletion removes the document and associated records after retention obligations are met." },
            { title: "Audit records and deletion",        desc: "Deleting a document does not automatically delete its audit trail. Audit records may be retained independently based on workspace policy." },
            { title: "Participant data",                  desc: "Participant data associated with the transaction is addressed per the applicable Privacy Policy and data retention rules." },
            { title: "Export before deletion",            desc: "Senders should export documents and audit records before reaching the end of the retention period or before initiating hard deletion." },
          ].map((item) => (
            <div key={item.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{item.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Storage and Plan Limits",     desc: "Storage capacity by plan", path: "/features/storage-and-plan-limits" },
        { label: "Privacy and Data Protection", desc: "Data categories and retention principles", path: "/security/privacy-and-data-protection" },
        { label: "Audit Trail (Security)",      desc: "Evidence retention and access levels", path: "/security/audit-trail" },
      ]} />

      <PageCTA
        heading="Review storage limits and plan capacity."
        primaryLabel="Storage & Plan Limits"
        primaryPath="/features/storage-and-plan-limits"
        secondaryLabel="Privacy and Data"
        secondaryPath="/security/privacy-and-data-protection"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
