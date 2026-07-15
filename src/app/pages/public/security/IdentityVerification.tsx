import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const LAYERS = [
  { num: "01", label: "Signing-request access",    color: "#38bdf8", desc: "Control how a participant reaches the transaction — via a secure link, account login, or enterprise session." },
  { num: "02", label: "Signer authentication",     color: "#0078D4", desc: "Verify the participant's identity before they can act — via OTP, authenticator, account, or enterprise SSO." },
  { num: "03", label: "Declared signature intent", color: "#7c3aed", desc: "Confirmation that the participant understands and intends to apply their signature." },
  { num: "04", label: "Audit evidence",            color: "#a78bfa", desc: "Timestamped record of every action — delivery, viewing, authentication, field completion, and signature adoption." },
];

export function IdentityVerification() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Identity Verification"
        headingId="iv-h1"
        heading="Identity-aware signing layers evidence — not just a name on a line."
        sub="LAGDA's identity model is not a single check. It is a layered combination of access controls, authentication evidence, declared intent, and audit records. Each layer adds a distinct form of evidence to the transaction record."
      />

      <PageSection id="layers" light bordered>
        <SectionHeading eyebrow="The identity layers" id="il-h2" heading="What LAGDA records as part of a participant's identity evidence." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 640, margin: "0 auto" }}>
          {LAYERS.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 16, position: "relative", paddingBottom: i < LAYERS.length - 1 ? 24 : 0 }}>
              {/* Vertical connector */}
              {i < LAYERS.length - 1 && (
                <div style={{ position: "absolute", left: 20, top: 42, width: 1, height: "calc(100% - 16px)", background: "rgba(255,255,255,0.07)" }} />
              )}
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(0,120,212,0.12)`, border: `2px solid ${l.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                <span style={{ color: l.color, ...GM, fontSize: 10, fontWeight: 700 }}>{l.num}</span>
              </div>
              <div style={{ paddingTop: 8 }}>
                <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 4 }}>{l.label}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{l.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection id="what-lagda-does-not-do">
        <SectionHeading eyebrow="Scope and limitations" id="scl-h2" heading="What identity-aware signing is — and is not." center />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="iv-cmp-grid">
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "16px" }}>
            <p style={{ color: "#22C55E", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 10 }}>LAGDA PROVIDES</p>
            {[
              "Evidence-based audit trail per participant",
              "Multiple authentication methods (email, SMS, TOTP, SSO)",
              "Declared intent confirmation before signing",
              "IP, device, and session evidence recorded",
              "Access-controlled evidence visibility",
            ].map((t) => (
              <div key={t} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#22C55E", flexShrink: 0 }}>✓</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13 }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "16px" }}>
            <p style={{ color: "#ef4444", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 10 }}>LAGDA DOES NOT</p>
            {[
              "Perform live biometric identity verification",
              "Issue government-recognized digital certificates",
              "Guarantee the legal identity of a participant",
              "Replace notarization or personal appearance",
              "Guarantee legal validity under any jurisdiction",
            ].map((t) => (
              <div key={t} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#ef4444", flexShrink: 0 }}>✕</span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <style>{`.iv-cmp-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 580px) { .iv-cmp-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="enotary-separation" light bordered>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ color: "#7B2D3E", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>LAGDA eNOTARY — SEPARATE AND COMING SOON</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            Electronic notarization involves a Notary Public who performs identity verification as part of a notarial act. This is distinct from electronic signing. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. It is not part of LAGDA eSignature identity features.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Identity-Aware Signing (Features)", desc: "Feature-level layer explanation", path: "/features/identity-aware-signing" },
        { label: "Signer Authentication",              desc: "Authentication methods in detail", path: "/security/signer-authentication" },
        { label: "Audit Trail",                        desc: "How identity evidence is recorded", path: "/security/audit-trail" },
      ]} />

      <PageCTA
        heading="See how identity evidence is recorded in the Audit Trail."
        primaryLabel="Security: Audit Trail"
        primaryPath="/security/audit-trail"
        secondaryLabel="Signer Authentication"
        secondaryPath="/security/signer-authentication"
      />
      <LegalNote showEnotary />
    </SecurityPageShell>
  );
}
