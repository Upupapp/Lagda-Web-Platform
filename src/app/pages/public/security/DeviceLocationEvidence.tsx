import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { EVIDENCE_TYPES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// What a signing step leaves behind, said as it is today. The audit trail holds
// the step, the server's time and who acted. It does NOT hold an IP address, a
// device, a browser or a location, so this page says so instead of describing
// evidence nothing collects. The route keeps its address: links, the sitemap and
// the security sub-navigation all point here.
export function DeviceLocationEvidence() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Device and Location Evidence"
        headingId="dle-h1"
        heading="What a signing record holds — and what LAGDA does not record."
        sub="Each signing step is recorded with the time and the person who acted. LAGDA does not record an IP address, device, browser or location for any signing step today."
      />

      <PageSection id="evidence-table" light bordered>
        <SectionHeading eyebrow="Evidence types" id="et-h2" heading="What is in the record, and what is not." sub="The public verification result shows none of the participant details below." center />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
            <thead>
              <tr>
                {["Data type", "Recorded", "Description"].map((h) => (
                  <th key={h} style={{ color: "#64748B", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textAlign: "left", padding: "8px 12px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVIDENCE_TYPES.map((e) => (
                <tr key={e.type} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <td style={{ padding: "10px 12px", color: "#07111F", ...GF, fontSize: 12, fontWeight: 600 }}>{e.type}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span aria-label={e.recorded ? "Recorded" : "Not recorded"} style={{ color: e.recorded ? "#16A34A" : "#DC2626", fontSize: 14 }}>{e.recorded ? "✓" : "✕"}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748B", ...GF, fontSize: 12 }}>{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection id="ip-accuracy">
        <SectionHeading eyebrow="IP address and location" id="ip-h2" heading="Not recorded today." center />
        <div style={{ display: "grid", gap: 10 }} className="ip-grid">
          {[
            { title: "No IP address in the audit trail", desc: "A signing step is recorded with its time and the person who acted. The network address it came from is not part of that record." },
            { title: "No device or browser details",     desc: "LAGDA does not record which device, operating system or browser a participant used to sign." },
            { title: "No location",                      desc: "LAGDA does not estimate a participant's location from their network address and does not ask the browser for one." },
            { title: "Ordinary server logs",             desc: "Like any web service, LAGDA's servers keep short-lived request logs for security and fault-finding. They are described in the Privacy Policy and are not part of a document's signing record." },
          ].map((item) => (
            <div key={item.title} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "12px 14px", boxShadow: "0 1px 4px rgba(7,17,31,0.07)" }}>
              <p style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{item.title}</p>
              <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ip-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 580px) { .ip-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="precise-location" light bordered>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ color: "#B45309", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>WHAT THIS MEANS FOR YOUR RECORDS</p>
          <p style={{ color: "#64748B", ...GF, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            A LAGDA signing record shows what was done, when, and by which participant. It does not show where a participant was or what they signed on. If a transaction needs that kind of evidence, arrange it separately.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Audit Trail (Security)",  desc: "What each signing step records", path: "/security/audit-trail" },
        { label: "Privacy and Data",        desc: "What LAGDA collects and how it is protected", path: "/security/privacy-and-data-protection" },
        { label: "Document Verification",  desc: "What is and is not exposed publicly", path: "/security/document-verification" },
      ]} />

      <PageCTA
        heading="See what the Audit Trail records for each signing step."
        primaryLabel="Security: Audit Trail"
        primaryPath="/security/audit-trail"
        secondaryLabel="Privacy and Data"
        secondaryPath="/security/privacy-and-data-protection"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
