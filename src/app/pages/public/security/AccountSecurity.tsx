import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function AccountSecurityDiagram() {
  const controls = [
    { label: "Password",         icon: "🔒", state: "Strong", color: "#22C55E" },
    { label: "MFA",              icon: "📱", state: "Enabled", color: "#22C55E" },
    { label: "Active sessions",  icon: "💻", state: "1 device", color: "#38bdf8" },
    { label: "Login history",    icon: "📋", state: "No anomalies", color: "#22C55E" },
  ];
  return (
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 380, width: "100%" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0 }}>Account Security</p>
        <p style={{ color: "#8A9BAE", ...GM, fontSize: 10, margin: "1px 0 0" }}>Ana Reyes · ana@mabinilegal.ph</p>
      </div>
      {controls.map((c) => (
        <div key={c.label} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 14 }}>{c.icon}</span>
            <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>{c.label}</span>
          </div>
          <span style={{ color: c.color, ...GM, fontSize: 10, fontWeight: 700 }}>{c.state}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(34,197,94,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
        <span style={{ color: "#22C55E", ...GM, fontSize: 10, fontWeight: 700 }}>All controls active</span>
      </div>
    </div>
  );
}

export function AccountSecurity() {
  return (
    <SecurityPageShell>
      <PageHero
        eyebrow="Account Security"
        headingId="as-h1"
        heading="Protect the LAGDA account that sends your documents."
        sub="Account security is the first layer in the LAGDA security model. Before any signing transaction begins, the sender's account must be properly protected. This page covers passwords, multi-factor authentication, session management, and access history."
      />

      <PageSection id="controls" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="as-two-col">
          <div>
            <SectionHeading eyebrow="Account controls" id="ac-h2" heading="What LAGDA provides for account-level protection." sub="Senders and workspace administrators should enable all available controls. Stronger account protection reduces the risk of unauthorized transactions." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Password-based account authentication with enforcement options",
                "Multi-factor authentication (MFA) using authenticator app",
                "Active session visibility and remote termination",
                "Login history with IP and device records",
                "Suspicious-activity detection",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#38BDF8", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <AccountSecurityDiagram />
        </div>
        <style>{`.as-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .as-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="mfa">
        <SectionHeading eyebrow="Multi-factor authentication" id="mfa-h2" heading="A second layer beyond your password." center />
        <div style={{ display: "grid", gap: 10 }} className="mfa-grid">
          {[
            { icon: "📱", title: "Authenticator app",   desc: "Use a TOTP app (Google Authenticator, Authy, or similar) to generate time-based codes for account login." },
            { icon: "🔑", title: "Backup codes",        desc: "One-time recovery codes for when your primary MFA device is unavailable. Store these securely." },
            { icon: "🏢", title: "Enterprise SSO",      desc: "Enterprise accounts can delegate authentication to an organizational identity provider via SAML/SSO." },
            { icon: "⚠️", title: "Account recovery",   desc: "Identity verification is required for account recovery to prevent unauthorized access through the recovery flow." },
          ].map((m) => (
            <div key={m.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 14px", display: "flex", gap: 12 }}>
              <span aria-hidden style={{ fontSize: 20, flexShrink: 0 }}>{m.icon}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{m.title}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`.mfa-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 580px) { .mfa-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="workspace-enforcement" light bordered>
        <SectionHeading eyebrow="Workspace enforcement" id="we-h2" heading="Administrators can require MFA across the workspace." center />
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { rule: "Require MFA for all senders",     desc: "Workspace members without active MFA may be blocked from sending new transactions." },
            { rule: "Require MFA before sensitive ops", desc: "Certain actions — deleting documents, changing settings, adding members — may require MFA re-verification." },
            { rule: "Enforce password policy",          desc: "Administrators can set minimum password strength requirements for all workspace members." },
          ].map((r) => (
            <div key={r.rule} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{r.rule}</p>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Security Overview",       desc: "All security layers explained", path: "/security" },
        { label: "Signer Authentication",   desc: "Authentication controls for document participants", path: "/security/signer-authentication" },
        { label: "Team Workspaces",         desc: "Member roles and access control", path: "/features/team-workspaces" },
      ]} />

      <PageCTA
        heading="Learn about signer authentication next."
        sub="Account security protects the sender. Signer authentication protects the participants in the transaction."
        primaryLabel="Signer Authentication"
        primaryPath="/security/signer-authentication"
        secondaryLabel="Security Overview"
        secondaryPath="/security"
      />
      <LegalNote />
    </SecurityPageShell>
  );
}
