import { useState } from "react";
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote, AvailBadge,
} from "../../../components/esignature/EsigPageShell";
import { AUTH_METHODS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const TIER_CONFIG = {
  Core:       { color: "#22C55E", badge: "Core" as const },
  Advanced:   { color: "#38bdf8", badge: "Advanced" as const },
  Enterprise: { color: "#C9960C", badge: "Enterprise" as const },
};

function AuthMethodSelector() {
  const [selected, setSelected] = useState(0);
  const method = AUTH_METHODS[selected];
  return (
    <div style={{ display: "flex", gap: 16, flexDirection: "column" }} className="auth-sel">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {AUTH_METHODS.map((m, i) => {
          const cfg = TIER_CONFIG[m.tier as keyof typeof TIER_CONFIG];
          return (
            <button
              key={m.method}
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
              style={{
                background: selected === i ? "rgba(0,120,212,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selected === i ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                transition: "all 0.15s ease", textAlign: "left",
              }}
            >
              <span style={{ color: selected === i ? "white" : "#94a3b8", ...GF, fontSize: 13, fontWeight: selected === i ? 700 : 500 }}>{m.method}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <span style={{ color: "#334155", ...GM, fontSize: 9 }}>{m.channel}</span>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color }} />
              </div>
            </button>
          );
        })}
      </div>
      {/* Detail panel */}
      <div style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0 }}>{method.method}</p>
          <AvailBadge tier={TIER_CONFIG[method.tier as keyof typeof TIER_CONFIG].badge} />
        </div>
        <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{method.desc}</p>
      </div>
    </div>
  );
}

export function SignerAuth() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Signer Authentication"
        headingId="sa-h1"
        heading="Configure how participants prove they are the intended person."
        sub="Signer authentication is a configurable safeguard added to a signing transaction. Different methods provide different levels of confidence and create different types of evidence."
      />

      <PageSection id="methods" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="sa-two-col">
          <div>
            <SectionHeading eyebrow="Authentication methods" id="sa-m-h2" heading="Choose the method that fits the transaction." sub="Authentication selection may depend on transaction risk, organization policy, participant relationship, plan, availability, and legal or compliance requirements." />
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {Object.entries(TIER_CONFIG).map(([tier, cfg]) => (
                <div key={tier} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color }} />
                  <span style={{ color: "#64748b", ...GF, fontSize: 12 }}>{tier}</span>
                </div>
              ))}
            </div>
          </div>
          <AuthMethodSelector />
        </div>
        <style>{`.sa-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .sa-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="channel-note">
        <SectionHeading eyebrow="Channel awareness" id="channel-h2" heading="Independent channels provide stronger evidence." sub="When the invitation link and the authentication code arrive through the same channel (email), they do not provide independent second-factor verification. A separate channel — SMS, authenticator app, enterprise SSO — offers a stronger evidence basis." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="ch-grid">
          <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 12, padding: "16px 16px" }}>
            <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>SAME CHANNEL</p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>Invitation link + email OTP both arrive in the same inbox. Access to that inbox satisfies both steps.</p>
          </div>
          <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "16px 16px" }}>
            <p style={{ color: "#F59E0B", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>SEPARATE CHANNEL</p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>SMS OTP or authenticator app requires access to a different device or app — providing a second, independent factor.</p>
          </div>
        </div>
        <style>{`.ch-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 560px) { .ch-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="selection" light bordered>
        <SectionHeading eyebrow="Selecting authentication" id="sel-h2" heading="Match authentication to transaction risk." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="risk-grid">
          {[
            { risk: "Lower risk",    example: "Internal team review, routine document sharing", method: "Secure link or email OTP" },
            { risk: "Standard risk", example: "Client engagement letters, NDA, service agreements", method: "Email OTP or SMS OTP" },
            { risk: "Higher risk",   example: "Financial commitments, regulated documents, authority-sensitive transactions", method: "SMS OTP, authenticator, or enterprise SSO" },
          ].map((r) => (
            <div key={r.risk} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.risk}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0, marginBottom: 8 }}>{r.example}</p>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 11, margin: 0, fontWeight: 600 }}>{r.method}</p>
            </div>
          ))}
        </div>
        <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>
          Risk classification is the responsibility of the sending organization and its legal counsel. LAGDA does not determine legal sufficiency or risk level for any specific transaction.
        </p>
        <style>{`.risk-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .risk-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Identity-Aware Signing", desc: "How authentication fits into identity layers", path: "/features/identity-aware-signing" },
        { label: "Security: Signer Auth",  desc: "Authentication assurance, evidence, and limitations", path: "/security/signer-authentication" },
        { label: "Account Security",       desc: "Protecting your LAGDA account", path: "/security/account-security" },
      ]} />

      <PageCTA
        heading="Explore identity-aware signing."
        sub="See how authentication evidence is layered with access, intent, and document integrity."
        primaryLabel="Identity-Aware Signing"
        primaryPath="/features/identity-aware-signing"
        secondaryLabel="Security Overview"
        secondaryPath="/security"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
