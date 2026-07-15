import {
  EnotaryPageShell, EnotaryStatusBanner, EnotaryDisclaimer,
  EnotarySection, EnotaryHeading, FutureConceptCard,
} from "../../../components/enotary/EnotaryComponents";
import { FUTURE_CAPABILITY_CATEGORIES } from "./content";
import { Link } from "react-router";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const BURGUNDY = "#67023B";

const WHAT_NOTARY_DOES = [
  { label: "Confirms identity", body: "A Notary Public confirms the identity of the person appearing before them, through personal appearance or, where allowed, through approved remote means." },
  { label: "Confirms volition and capacity", body: "Notarial acts confirm that the party is acting freely, understands the document, and is legally capable of entering into it." },
  { label: "Performs a notarial act", body: "The notary administers an oath, takes an acknowledgment, or performs another notarial act as applicable to the document." },
  { label: "Records the act", body: "Notarial acts are entered into the notarial register, providing an official record of the transaction." },
  { label: "Affixes seal and signature", body: "The notary affixes their official seal and signature, creating the notarial certificate on the document." },
];

export function FutureCapabilities() {
  return (
    <EnotaryPageShell>
      <EnotaryStatusBanner />

      {/* Hero */}
      <section style={{ padding: "64px 24px 48px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <p style={{ color: BURGUNDY, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>ENOTARY / FUTURE CAPABILITIES</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Future Capabilities
          </h1>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 16, lineHeight: 1.7, maxWidth: 620, margin: "0 0 24px" }}>
            LAGDA is exploring electronic notarization capabilities for a future regulated product. All content on this page describes future concepts that are not currently available.
          </p>
          <EnotaryDisclaimer />
        </div>
      </section>

      {/* What notarization requires */}
      <EnotarySection id="what-notarization-requires">
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <EnotaryHeading sub="Electronic notarization is more than a signature. It involves a commissioned Notary Public performing specific legally defined acts.">What notarization requires</EnotaryHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {WHAT_NOTARY_DOES.map(({ label, body }, i) => (
              <div key={label} style={{ display: "flex", gap: 16, padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9 }}>
                <span style={{ color: BURGUNDY, ...GM, fontSize: 11, fontWeight: 700, flexShrink: 0, minWidth: 22, marginTop: 1 }}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{label}</p>
                  <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: "14px 18px", background: "rgba(103,2,59,0.08)", border: "1px solid rgba(103,2,59,0.2)", borderRadius: 9 }}>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
              Electronic notarization requires technology that can support all of these steps in compliance with the Rules on Notarial Practice and any future Supreme Court rules on remote notarization. LAGDA is researching and designing for this — subject to accreditation.
            </p>
          </div>
        </div>
      </EnotarySection>

      {/* Capability categories */}
      <EnotarySection id="capability-categories" light bordered>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <EnotaryHeading sub="Capability areas being designed for a future regulated product. All subject to Supreme Court accreditation and applicable rules.">Capability areas under exploration</EnotaryHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {FUTURE_CAPABILITY_CATEGORIES.map(({ id, label, status, capabilities }) => (
              <div key={id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  <h3 style={{ color: "white", ...GF, fontSize: 16, fontWeight: 800, margin: 0 }}>{label}</h3>
                  <span style={{ color: "#475569", ...GM, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 3, background: "rgba(71,85,105,0.12)", border: "1px solid rgba(71,85,105,0.2)", whiteSpace: "nowrap" }}>
                    {status}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
                  {capabilities.map((cap) => (
                    <div key={cap} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "rgba(103,2,59,0.05)", border: "1px solid rgba(103,2,59,0.13)", borderRadius: 8 }}>
                      <span style={{ color: BURGUNDY, fontSize: 14, marginTop: 1, flexShrink: 0 }}>○</span>
                      <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6 }}>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </EnotarySection>

      {/* Future concept illustrations */}
      <EnotarySection id="session-concept" bordered>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <EnotaryHeading sub="Concepts for how an electronic notarization session might work — future concept only.">Session concept</EnotaryHeading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <FutureConceptCard label="Identity and appearance verification">
              Parties connect to a secure session. Identity documents are reviewed. A live audio-video session is conducted to confirm identity, presence, and volition. Subject to applicable rules.
            </FutureConceptCard>
            <FutureConceptCard label="Notarial act performance">
              The commissioned Notary Public performs the applicable notarial act — oath, acknowledgment, or other — in accordance with the Rules on Notarial Practice. Subject to approved rules.
            </FutureConceptCard>
            <FutureConceptCard label="Evidence and notarial records">
              Session evidence is recorded. The Notary Public makes the required entries in the notarial register. A notarial certificate is generated. Subject to applicable rules.
            </FutureConceptCard>
          </div>
        </div>
      </EnotarySection>

      {/* What this is not */}
      <EnotarySection id="what-this-is-not" light bordered>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <EnotaryHeading>What LAGDA eNotary is not</EnotaryHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "LAGDA eNotary is not currently available",
              "LAGDA is not accredited by the Supreme Court for electronic notarization",
              "LAGDA eSignature does not perform notarization",
              "No notarial acts can be performed through LAGDA at this time",
              "LAGDA does not appoint Notary Publics",
              "Joining the eNotary waitlist does not give access to notarial services",
              "No electronic seal, notarial certificate, or notarial register function is currently available",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: 12, padding: "12px 16px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 8 }}>
                <span style={{ color: "#ef4444", flexShrink: 0 }}>✕</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </EnotarySection>

      {/* CTA */}
      <EnotarySection id="cta" bordered>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "white", ...GF, fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 900, margin: "0 0 12px" }}>Stay informed</h2>
          <p style={{ color: "#64748b", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 22px" }}>
            Join the waitlist to receive updates as we progress toward accreditation. Joining the waitlist does not guarantee access.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/enotary/waitlist" style={{ background: BURGUNDY, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 8, textDecoration: "none" }}>Join the waitlist</Link>
            <Link to="/enotary/accreditation-roadmap" style={{ background: "rgba(255,255,255,0.06)", color: "white", ...GF, fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 8, textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)" }}>Accreditation roadmap</Link>
          </div>
        </div>
      </EnotarySection>
    </EnotaryPageShell>
  );
}
