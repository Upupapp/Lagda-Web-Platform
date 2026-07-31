import { useState } from "react";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { VERIFICATION_STATES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function VerificationDemo() {
  const [selected, setSelected] = useState(0);
  const state = VERIFICATION_STATES[selected];
  if (!state) return null;
  return (
    <div style={{ maxWidth: 460, width: "100%" }}>
      {/* State selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {VERIFICATION_STATES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSelected(i)}
            aria-pressed={selected === i}
            style={{
              background: selected === i ? s.bg : "rgba(255,255,255,0.03)",
              border: `1px solid ${selected === i ? s.border : "rgba(255,255,255,0.08)"}`,
              borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              color: selected === i ? s.color : "#64748b",
              ...GF, fontSize: 12, fontWeight: selected === i ? 700 : 500,
              transition: "all 0.15s ease",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* Result card */}
      <div style={{ background: "rgba(7,17,31,0.95)", border: `1px solid ${state.border}`, borderRadius: 14, overflow: "hidden" }}>
        {/* Status bar */}
        <div style={{ padding: "12px 16px", background: state.bg, borderBottom: `1px solid ${state.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: state.color, flexShrink: 0 }} />
          <span style={{ color: state.color, ...GM, fontSize: 11, fontWeight: 700 }}>{state.label.toUpperCase()}</span>
        </div>
        {/* Public info */}
        <div style={{ padding: "12px 16px" }}>
          <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>PUBLIC VERIFICATION RESULT</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {state.public.map((line) => (
              <div key={line} style={{ display: "flex", gap: 10 }}>
                <span style={{ color: "#334155", ...GM, fontSize: 10, flexShrink: 0 }}>›</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>{line}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
            <p style={{ color: "#334155", ...GM, fontSize: 9, margin: 0 }}>Private: Signer identities, IP addresses, device data, and authentication details are not shown publicly.</p>
          </div>
        </div>
        {/* Explanation */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}>
          <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{state.desc}</p>
        </div>
      </div>
    </div>
  );
}

export function DocVerification() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Document Verification"
        headingId="dv-h1"
        heading="Confirm a document matches its LAGDA record — without exposing private details."
        sub="LAGDA Document Verification is designed to help determine whether a document matches the recorded completed transaction. Use a Verification ID, QR code, or verification link to check."
      />

      <PageSection id="demo" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="dv-two-col">
          <div>
            <SectionHeading eyebrow="Verification result" id="vr-h2" heading="Every result state — clearly explained." sub="Select a state to see what the public verification record shows. Private evidence is never exposed in public verification." />
            <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0, marginBottom: 16 }}>
              These are illustrative frontend examples. Real verification requires a valid LAGDA Verification ID and an active transaction record.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Locate the transaction record using the Verification ID",
                "Compare the uploaded file against the recorded completed document",
                "Return a controlled result — status and match only",
                "Never expose private signer identity, IP, or authentication data",
                "Distinguish record status from file-match status",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <VerificationDemo />
        </div>
        <style>{`.dv-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .dv-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="methods">
        <SectionHeading eyebrow="How to verify" id="hv-h2" heading="Multiple ways to verify a LAGDA document." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="vm-grid">
          {[
            { icon: "🔍", method: "Verification ID", desc: "Enter the LAGDA-VER- identifier printed on or attached to the document. Example: LAGDA-VER-2026-004821." },
            { icon: "📷", method: "QR code",          desc: "Scan the QR code printed or embedded on the completed document. Opens the verification record directly." },
            { icon: "🔗", method: "Secure link",      desc: "Use a verification link provided with the completed document. Links may have expiration." },
          ].map((m) => (
            <div key={m.method} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 16px" }}>
              <span aria-hidden style={{ fontSize: 22, display: "block", marginBottom: 10 }}>{m.icon}</span>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 6 }}>{m.method}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.vm-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .vm-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="public-private" light bordered>
        <SectionHeading eyebrow="Public and private" id="pp-h2" heading="What public verification shows — and what it does not." center />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="pp-grid">
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "16px 16px" }}>
            <p style={{ color: "#22C55E", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>SHOWN PUBLICLY</p>
            {["Verification ID", "Transaction status (completed, cancelled, expired)", "Completion date", "Document description", "File match result"].map((t) => (
              <div key={t} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#22C55E", flexShrink: 0 }}>✓</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13 }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "16px 16px" }}>
            <p style={{ color: "#ef4444", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>NOT SHOWN PUBLICLY</p>
            {["Signer names and email addresses", "Mobile numbers", "IP addresses and device data", "Authentication event details", "Confidential document content", "Private audit details"].map((t) => (
              <div key={t} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#ef4444", flexShrink: 0 }}>✕</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <style>{`.pp-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 560px) { .pp-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Verify a Document",       desc: "Use the public verification tool", path: "/verify" },
        { label: "Verification & Audit",    desc: "The eSignature Verification & Audit page", path: "/esignature/verification-and-audit" },
        { label: "Security: Verification",  desc: "File comparison, integrity, and privacy", path: "/security/document-verification" },
      ]} />

      <PageCTA
        heading="Verify a LAGDA document."
        sub="Enter a Verification ID or scan a QR code to confirm a document matches its LAGDA record."
        primaryLabel="Verify a Document"
        primaryPath="/verify"
        secondaryLabel="Read Security Guide"
        secondaryPath="/security/document-verification"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
