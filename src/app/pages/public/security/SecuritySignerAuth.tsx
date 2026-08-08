import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote, AvailBadge,
} from "../../../components/esignature/EsigPageShell";
import { AUTH_COMPARISON } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const TIER_COLOR: Record<string, string> = {
  Core:       "#38bdf8",
  Advanced:   "#a78bfa",
  Enterprise: "#C9960C",
};

export function SecuritySignerAuth() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Signer Authentication"
        headingId="ssa-h1"
        heading="Increase confidence that the right participant is acting."
        sub="Signer authentication controls how a participant proves their identity before or during signing. LAGDA provides multiple methods — from secure links to multi-channel OTP — with different confidence levels and use-case fit."
      />

      <PageSection id="methods-table" light bordered>
        <SectionHeading eyebrow="Method comparison" id="mc-h2" heading="Every authentication method — at a glance." sub="Methods are listed from least to most friction. Higher friction generally corresponds to higher confidence." center />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
            <thead>
              <tr>
                {["Method", "Experience", "Independent channel", "Evidence recorded", "Tier"].map((h) => (
                  <th key={h} style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textAlign: "left", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUTH_COMPARISON.map((row) => (
                <tr key={row.method} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 12px", color: "white", ...GF, fontSize: 12, fontWeight: 600 }}>{row.method}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8", ...GF, fontSize: 12 }}>{row.experience}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ color: row.independentChannel ? "#22C55E" : "#8A9BAE", fontSize: 14 }}>{row.independentChannel ? "✓" : "—"}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {row.evidenceRecorded.map((e) => (
                        <span key={e} style={{ background: "rgba(255,255,255,0.05)", color: "#94A3B8", ...GM, fontSize: 9, padding: "2px 6px", borderRadius: 4 }}>{e}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ color: TIER_COLOR[row.tier], ...GM, fontSize: 10, fontWeight: 700 }}>{row.tier}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {(["Core", "Advanced", "Enterprise"] as const).map((tier) => (
            <div key={tier} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: TIER_COLOR[tier], ...GM, fontSize: 10, fontWeight: 700 }}>{tier}</span>
              <AvailBadge tier={tier} />
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection id="channel-concept">
        <SectionHeading eyebrow="Independent channels" id="ic-h2" heading="Why a separate channel matters." sub="Using a different communication channel for authentication increases confidence that the recipient controls both the email account and the phone or device." center />
        <div style={{ display: "grid", gap: 12 }} className="ic-grid">
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px" }}>
            <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 10 }}>SAME-CHANNEL (Email OTP)</p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Both the invitation and the OTP arrive in the same email inbox. Confirms the recipient controls the email account — but if the inbox is compromised, both are exposed.
            </p>
          </div>
          <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 12, padding: "16px" }}>
            <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", marginBottom: 10 }}>INDEPENDENT CHANNEL (SMS OTP)</p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              The OTP arrives on a mobile number — a channel separate from email. An attacker would need to control both the email account and the phone number to proceed.
            </p>
          </div>
        </div>
        <style>{`.ic-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 580px) { .ic-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="risk-model" light bordered>
        <SectionHeading eyebrow="Choosing a method" id="rm-h2" heading="Match the method to the transaction's risk level." center />
        <div style={{ display: "grid", gap: 10 }} className="rm-grid">
          {[
            { tier: "Low risk",    method: "Secure link or Email OTP",    examples: "Internal approvals, low-value contracts, standard correspondence" },
            { tier: "Medium risk", method: "SMS OTP or Authenticator app", examples: "Client agreements, employment documents, financial forms" },
            { tier: "High risk",   method: "Account login + MFA, or SSO",  examples: "High-value contracts, multi-party legal agreements, enterprise workflows" },
          ].map((r) => (
            <div key={r.tier} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 14px" }}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.tier}</p>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.method}</p>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{r.examples}</p>
            </div>
          ))}
        </div>
        <p style={{ color: "#8A9BAE", ...GF, fontSize: 13, marginTop: 14, lineHeight: 1.6, textAlign: "center" }}>
          These are general guidance only. Senders are responsible for selecting the authentication requirements appropriate to each transaction.
        </p>
        <style>{`.rm-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .rm-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Signer Authentication (Features)", desc: "Feature-level explanation of each method", path: "/features/signer-authentication" },
        { label: "Identity Verification",            desc: "How LAGDA layers identity evidence", path: "/security/identity-verification" },
        { label: "Audit Trail",                      desc: "Evidence recorded for each authentication event", path: "/security/audit-trail" },
      ]} />

      <PageCTA
        heading="Explore Identity Verification next."
        sub="Authentication is one layer. Identity-aware signing layers access, intent, and authentication evidence together."
        primaryLabel="Identity Verification"
        primaryPath="/security/identity-verification"
        secondaryLabel="View Auth Methods"
        secondaryPath="/features/signer-authentication"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
