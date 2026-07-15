import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { EVIDENCE_TYPES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function DeviceLocationEvidence() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Device and Location Evidence"
        headingId="dle-h1"
        heading="What LAGDA records about the device and session — and how that evidence is protected."
        sub="Every signing action generates device and session evidence. This page explains what is recorded, how accurate it is, and how it is protected from public exposure."
      />

      <PageSection id="evidence-table" light bordered>
        <SectionHeading eyebrow="Evidence types" id="et-h2" heading="Every type of device and session data LAGDA records." sub="All private evidence is access-controlled. It is not exposed in public verification results." center />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
            <thead>
              <tr>
                {["Data type", "Public", "Description"].map((h) => (
                  <th key={h} style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textAlign: "left", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EVIDENCE_TYPES.map((e) => (
                <tr key={e.type} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 12px", color: "white", ...GF, fontSize: 12, fontWeight: 600 }}>{e.type}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ color: e.public ? "#22C55E" : "#ef4444", fontSize: 14 }}>{e.public ? "✓" : "✕"}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b", ...GF, fontSize: 12 }}>{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection id="ip-accuracy">
        <SectionHeading eyebrow="IP address and location" id="ip-h2" heading="Approximate only — not a GPS fix." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="ip-grid">
          {[
            { title: "City-level accuracy at best",    desc: "IP-based geolocation is not GPS. It may place the participant in the correct city or region — not an exact address." },
            { title: "VPN and proxy affected",         desc: "Participants using a VPN or corporate proxy may show an IP location that differs significantly from their physical location." },
            { title: "Shared IPs",                    desc: "Corporate networks and NAT often assign the same IP to many users. An IP is a network location, not a personal identifier." },
            { title: "Recorded, not displayed publicly", desc: "IP addresses are recorded as part of the audit trail but are not exposed in the public verification result." },
          ].map((item) => (
            <div key={item.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{item.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ip-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 580px) { .ip-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="precise-location" light bordered>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>PRECISE DEVICE LOCATION</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            GPS or device location (latitude and longitude) requires explicit participant permission via the browser. LAGDA does not collect this without an explicit permission prompt. Where a participant denies the permission, no precise location is recorded. Availability and behavior may vary by browser, device, and platform policy.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Audit Trail (Security)",  desc: "Access levels and evidence integrity", path: "/security/audit-trail" },
        { label: "Privacy and Data",        desc: "How device data is protected and retained", path: "/security/privacy-and-data-protection" },
        { label: "Document Verification",  desc: "What is and is not exposed publicly", path: "/security/document-verification" },
      ]} />

      <PageCTA
        heading="See how device evidence is protected in the Audit Trail."
        primaryLabel="Security: Audit Trail"
        primaryPath="/security/audit-trail"
        secondaryLabel="Privacy and Data"
        secondaryPath="/security/privacy-and-data-protection"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
