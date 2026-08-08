import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const LAYERS = [
  { num: "01", label: "Recipient access",    color: "#38BDF8", desc: "The participant receives a secure invitation to the transaction. Access is controlled by the invitation method — link, account login, or enterprise session." },
  { num: "02", label: "Authentication",      color: "#38bdf8", desc: "A configured method verifies the participant has access to a credential — email account, mobile number, authenticator app, or enterprise identity. Different methods provide different evidence." },
  { num: "03", label: "Signature adoption",  color: "#22C55E", desc: "The participant applies a visible representation — typed, drawn, uploaded, or certificate-based. A signature image is a representation. Authentication is what builds the evidence record." },
  { num: "04", label: "Intent and consent",  color: "#C9960C", desc: "The platform records that the participant took a deliberate action — reviewing, consenting, and completing their assigned fields — not that the document was signed accidentally." },
  { num: "05", label: "Event evidence",      color: "#a78bfa", desc: "Each action — invitation, delivery, viewing, authentication, signing, completion — is recorded as a timestamped audit event with device and network context." },
  { num: "06", label: "Document integrity",  color: "#f472b6", desc: "A reference record helps determine whether the document matches its state at the time of completion. Public verification compares an uploaded file against this record." },
];

function IdentityLayerDiagram() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {LAYERS.map((l, i) => (
        <div key={l.num} style={{ display: "flex", gap: 0 }}>
          {/* Spine */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${l.color}22`, border: `2px solid ${l.color}55`, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 10, fontWeight: 700, color: l.color, flexShrink: 0 }}>
              {l.num}
            </div>
            {i < LAYERS.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: `${l.color}33` }} />}
          </div>
          {/* Content */}
          <div style={{ paddingLeft: 12, paddingBottom: i < LAYERS.length - 1 ? 16 : 0 }}>
            <p style={{ color: l.color, ...GM, fontSize: 11, fontWeight: 700, margin: 0, marginBottom: 4 }}>{l.label}</p>
            <p style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{l.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function IdentityAwareSigning() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Identity-Aware Signing"
        headingId="ias-h1"
        heading="A signature image is a representation. Identity evidence is the record."
        sub="Identity-aware signing combines access control, authentication, intent, and event evidence into a layered approach — helping organizations understand not just that someone signed, but how and under what circumstances."
      />

      <PageSection id="layers" light bordered>
        <div style={{ display: "grid", gap: "32px 64px", alignItems: "start" }} className="ias-two-col">
          <div>
            <SectionHeading eyebrow="The six layers" id="layers-h2" heading="Six overlapping layers build the evidence record." sub="No single layer proves legal identity in every case. Together, they create a transaction record that supports review, attribution, and verification." />
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", marginTop: 16 }}>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                LAGDA does not independently prove legal identity in every transaction. The weight of each layer depends on the authentication method selected, the transaction type, and applicable legal requirements. Users and their counsel are responsible for assessing sufficiency.
              </p>
            </div>
          </div>
          <IdentityLayerDiagram />
        </div>
        <style>{`.ias-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .ias-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="sig-vs-identity">
        <SectionHeading eyebrow="Signature vs identity" id="sig-h2" heading="A visible signature is not identity." center />
        <div style={{ display: "grid", gap: 12 }} className="sig-grid">
          <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 12, padding: "18px 18px" }}>
            <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>VISIBLE SIGNATURE</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              {["A typed, drawn, or uploaded image", "Represents the participant's chosen signature style", "A visual cue — not cryptographic proof", "Can be adopted without additional authentication"].map((t) => (
                <li key={t} style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.45 }}>{t}</li>
              ))}
            </ul>
          </div>
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "18px 18px" }}>
            <p style={{ color: "#22C55E", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>IDENTITY EVIDENCE</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              {["Authentication event and method", "Timestamps for each key action", "Device, browser, and IP context", "Consent and intent record", "Document integrity reference"].map((t) => (
                <li key={t} style={{ color: "#94A3B8", ...GF, fontSize: 13, lineHeight: 1.45 }}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
        <style>{`.sig-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 560px) { .sig-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="auth-strength" light bordered>
        <SectionHeading eyebrow="Authentication strength" id="as-h2" heading="Not all authentication methods have the same assurance level." sub="The evidence created by authentication depends on the method selected. Stronger methods create more independent, verifiable evidence." />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Secure link only",     strength: 1, note: "Proves access to the email inbox where the invitation was sent." },
            { label: "Email OTP",            strength: 2, note: "Proves access to the email account at the time of signing — same channel as invitation." },
            { label: "SMS OTP",              strength: 3, note: "Proves access to a separate mobile number — different channel, stronger evidence." },
            { label: "Authenticator app",    strength: 3, note: "Time-based code from an enrolled app — independent of email channel." },
            { label: "Enterprise SSO",       strength: 4, note: "Organization controls the identity claim and authentication standards." },
          ].map((a) => (
            <div key={a.label} style={{ display: "flex", gap: 14, alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ color: "#94a3b8", ...GF, fontSize: 12, fontWeight: 600, minWidth: 160, flexShrink: 0 }}>{a.label}</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[1,2,3,4].map((n) => (
                  <div key={n} style={{ width: 14, height: 14, borderRadius: 3, background: n <= a.strength ? "#0078D4" : "rgba(255,255,255,0.06)" }} />
                ))}
              </div>
              <span style={{ color: "#8A9BAE", ...GF, fontSize: 12, lineHeight: 1.4 }}>{a.note}</span>
            </div>
          ))}
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Audit Trail",            desc: "The complete event record for each transaction", path: "/features/audit-trail" },
        { label: "Signer Authentication",  desc: "Configuring authentication for transactions", path: "/features/signer-authentication" },
        { label: "Security: Identity",     desc: "Identity verification, privacy, and limitations", path: "/security/identity-verification" },
      ]} />

      <PageCTA
        heading="Explore the Audit Trail."
        sub="See every event recorded during a transaction — delivery, authentication, signing, and more."
        primaryLabel="Audit Trail"
        primaryPath="/features/audit-trail"
        secondaryLabel="Security Overview"
        secondaryPath="/security"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
