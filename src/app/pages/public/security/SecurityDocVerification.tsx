import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { PUBLIC_EVIDENCE, PRIVATE_EVIDENCE } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function SecurityDocVerification() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Security: Document Verification"
        headingId="sdv-h1"
        heading="File comparison, integrity, and what stays private."
        sub="LAGDA Document Verification is designed to help determine whether a document matches the recorded completed transaction — without exposing private evidence. This page covers the security architecture behind the public verification result."
      />

      <PageSection id="how-it-works" light bordered>
        <SectionHeading eyebrow="How verification works" id="hiw-h2" heading="A controlled comparison — not an open audit." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 620, margin: "0 auto" }}>
          {[
            { step: "01", title: "Verification ID or QR code provided",  desc: "The verifier supplies a LAGDA-VER- identifier or scans the QR code attached to the document." },
            { step: "02", title: "Transaction record located",           desc: "LAGDA looks up the transaction associated with the Verification ID." },
            { step: "03", title: "File comparison (if file provided)",    desc: "If an uploaded file is provided, LAGDA compares it against the stored completed-transaction document." },
            { step: "04", title: "Controlled result returned",           desc: "The result is a status and match indicator — no private details are exposed." },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < 3 ? 20 : 0, position: "relative" }}>
              {i < 3 && <div style={{ position: "absolute", left: 19, top: 40, width: 1, height: "calc(100% - 14px)", background: "rgba(255,255,255,0.07)" }} />}
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,120,212,0.12)", border: "2px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700 }}>{s.step}</span>
              </div>
              <div style={{ paddingTop: 7 }}>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{s.title}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection id="public-private">
        <SectionHeading eyebrow="What is shared" id="ws-h2" heading="Public verification exposes only what's necessary." center />
        <div style={{ display: "grid", gap: 12 }} className="pv-grid">
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "16px" }}>
            <p style={{ color: "#22C55E", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 10 }}>SHOWN PUBLICLY</p>
            {PUBLIC_EVIDENCE.map((t) => (
              <div key={t} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#22C55E", flexShrink: 0 }}>✓</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13 }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "16px" }}>
            <p style={{ color: "#ef4444", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 10 }}>NOT SHOWN PUBLICLY</p>
            {PRIVATE_EVIDENCE.map((t) => (
              <div key={t} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#ef4444", flexShrink: 0 }}>✕</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <style>{`.pv-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 560px) { .pv-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="limitations" light bordered>
        <SectionHeading eyebrow="What verification confirms and what it does not" id="lim-h2" heading="A match is evidence — not a legal finding." center />
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { claim: "Document matches its LAGDA record",         confirmed: true },
            { claim: "Transaction completed on recorded date",    confirmed: true },
            { claim: "Document is legally valid",                 confirmed: false },
            { claim: "Signer identity confirmed",                 confirmed: false },
            { claim: "Document has not been printed and altered after verification", confirmed: false },
            { claim: "Transaction is enforceable in your jurisdiction", confirmed: false },
          ].map((c) => (
            <div key={c.claim} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ color: c.confirmed ? "#22C55E" : "#ef4444", fontSize: 16, flexShrink: 0 }}>{c.confirmed ? "✓" : "✕"}</span>
              <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.4 }}>{c.claim}</span>
            </div>
          ))}
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Document Verification (Features)", desc: "Interactive verification demo", path: "/features/document-verification" },
        { label: "Audit Trail",                      desc: "Full evidence behind the verification record", path: "/security/audit-trail" },
        { label: "Verify a Document",                desc: "Use the public verification tool", path: "/verify" },
      ]} />

      <PageCTA
        heading="Verify a LAGDA document."
        sub="Enter a Verification ID or scan the QR code attached to the completed document."
        primaryLabel="Verify a Document"
        primaryPath="/verify"
        secondaryLabel="Security: Audit Trail"
        secondaryPath="/security/audit-trail"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
