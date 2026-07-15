import {
  EsigPageShell,
  PageHero,
  PageSection,
  SectionHeading,
  RelatedPages,
  PageCTA,
  LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { WORKSPACE_ROLES, TEAM_CAPABILITIES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Workspace member mockup ───────────────────────────────────────────────────
function WorkspaceMockup() {
  const members = [
    { name: "Maria Santos",  role: "Administrator",  status: "Active",   avatar: "MS" },
    { name: "Juan Reyes",    role: "Sender",         status: "Active",   avatar: "JR" },
    { name: "Ana Cruz",      role: "Sender",         status: "Active",   avatar: "AC" },
    { name: "Pedro Lim",     role: "Reviewer",       status: "Inactive", avatar: "PL" },
  ];

  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 14, overflow: "hidden",
      maxWidth: 440, width: "100%",
    }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0 }}>Mabini Legal Solutions</p>
          <p style={{ color: "#475569", ...GF, fontSize: 11, margin: 0 }}>Workspace</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.15)", color: "#38bdf8", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 999, padding: "2px 10px", ...GM, fontSize: 10, fontWeight: 700 }}>
          4 members
        </span>
      </div>
      <div style={{ padding: "8px 0" }}>
        {members.map((m) => (
          <div key={m.name} style={{ padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,120,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, fontWeight: 700, color: "#38bdf8", flexShrink: 0 }}>
              {m.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{m.name}</p>
              <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "2px 0 0" }}>{m.role}</p>
            </div>
            <span style={{
              ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: m.status === "Active" ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)",
              color: m.status === "Active" ? "#22C55E" : "#64748b",
              border: `1px solid ${m.status === "Active" ? "rgba(34,197,94,0.25)" : "rgba(100,116,139,0.25)"}`,
            }}>
              {m.status}
            </span>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 18px", background: "rgba(0,120,212,0.06)" }}>
        <span style={{ color: "#0078D4", ...GF, fontSize: 12, fontWeight: 700 }}>+ Invite Team Member</span>
      </div>
    </div>
  );
}

// ── Reporting preview ─────────────────────────────────────────────────────────
function ReportingPreview() {
  const STATS = [
    { label: "Transactions sent (30d)", value: "48",  color: "#0078D4" },
    { label: "Completion rate",         value: "87%", color: "#22C55E" },
    { label: "Avg. completion time",    value: "1.4d",color: "#38bdf8" },
    { label: "Expiring this week",      value: "3",   color: "#F59E0B" },
  ];

  return (
    <div aria-hidden style={{
      display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10,
      maxWidth: 360, width: "100%",
    }}>
      {STATS.map((s) => (
        <div key={s.label} style={{
          background: "rgba(7,17,31,0.95)",
          border: "1px solid rgba(0,120,212,0.2)",
          borderRadius: 12, padding: "14px 16px",
        }}>
          <p style={{ color: s.color, ...GF, fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1 }}>{s.value}</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "6px 0 0", lineHeight: 1.4 }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Workspace roles table ─────────────────────────────────────────────────────
function WorkspaceRolesTable() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {WORKSPACE_ROLES.map((r) => (
        <div key={r.role} style={{
          display: "flex", gap: 16, alignItems: "flex-start",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 10, padding: "12px 14px",
        }}>
          <span style={{ color: "#0078D4", ...GM, fontSize: 12, fontWeight: 700, flexShrink: 0, minWidth: 160 }}>
            {r.role}
          </span>
          <span style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.5 }}>{r.perms}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function EsigTeamEnterprise() {
  return (
    <EsigPageShell>
      <PageHero
        eyebrow="Team & Enterprise"
        headingId="te-h1"
        heading="Built for teams, law firms, and high-volume organizations."
        sub="LAGDA eSignature is designed to support organizations with multiple senders, shared workflows, governance controls, role-based access, and usage reporting — all within a shared workspace."
      />

      {/* Team capabilities grid */}
      <PageSection id="team-capabilities" light bordered>
        <SectionHeading eyebrow="Workspace features" id="ws-heading" heading="Organize your team's legal-document workflow." sub="One workspace. Every team member, template, contact, and transaction — organized and controlled." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }} className="tc-grid">
          {TEAM_CAPABILITIES.map((c) => (
            <div key={c.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 18px" }}>
              <span aria-hidden style={{ fontSize: 22, display: "block", marginBottom: 10 }}>{c.icon}</span>
              <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 6 }}>{c.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.tc-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .tc-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Members + workspace mockup */}
      <PageSection id="workspace">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="te-two-col">
          <div>
            <SectionHeading eyebrow="Workspace management" id="wsm-heading" heading="Everyone in the right place with the right access." sub="Role-based access controls help organizations define who can send, review, administer, or audit document transactions." />
            <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0, marginBottom: 16 }}>
              LAGDA workspaces are designed to keep each organization's documents, templates, contacts, billing, and settings separate — even when a user belongs to multiple workspaces.
            </p>
            <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>WORKSPACE ISOLATION</p>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Documents, templates, contacts, members, branding, billing, usage, and activity history are separate per workspace.
              </p>
            </div>
          </div>
          <WorkspaceMockup />
        </div>
        <style>{`.te-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .te-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Workspace roles */}
      <PageSection id="roles" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="te-two-col">
          <div>
            <SectionHeading eyebrow="Role-based access" id="roles-heading" heading="Control who can do what." />
            <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0, marginBottom: 20 }}>
              Role-based access helps organizations control who prepares, sends, reviews, administers, or audits document transactions — without giving everyone full workspace access.
            </p>
            <p style={{ color: "#475569", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              The exact permission matrix depends on your plan and workspace configuration. Contact Sales to discuss enterprise governance requirements.
            </p>
          </div>
          <WorkspaceRolesTable />
        </div>
      </PageSection>

      {/* Reporting */}
      <PageSection id="reporting">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px", alignItems: "start" }} className="te-two-col">
          <div>
            <SectionHeading eyebrow="Usage reporting" id="report-heading" heading="Monitor your team's document activity." sub="Track transaction volume, completion rates, sender activity, expiring requests, and failed deliveries — all within the workspace." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Transaction volume by sender and period",
                "Completion rate and average completion time",
                "Expiring and overdue transactions",
                "Failed delivery notifications",
                "Template usage frequency",
                "Verification activity",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <ReportingPreview />
        </div>
      </PageSection>

      {/* Security + enterprise */}
      <PageSection id="security-enterprise" light bordered>
        <SectionHeading eyebrow="Enterprise direction" id="ent-heading" heading="Ready for higher-volume organizations." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }} className="ent-grid">
          {[
            { title: "Multi-factor authentication",  desc: "Require MFA for all workspace members as an organization-level control." },
            { title: "Session management",            desc: "Control how long sessions remain active and set timeout policies." },
            { title: "Authentication defaults",       desc: "Set organization-wide default authentication requirements for all senders." },
            { title: "Retention controls",            desc: "Configure how long transaction records are retained within the workspace." },
            { title: "Single Sign-On (SSO)",          desc: "Authenticate workspace members through your organization's identity provider.", enterprise: true },
            { title: "User provisioning",             desc: "Manage workspace membership through your identity and access management system.", enterprise: true },
            { title: "API & webhooks",                desc: "Connect LAGDA to your internal systems programmatically as the platform expands.", enterprise: true },
            { title: "Custom integrations",           desc: "Discuss document-management, government-system, and enterprise integrations with Sales.", enterprise: true },
          ].map((f) => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "13px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>{f.title}</span>
                {f.enterprise && (
                  <span style={{ background: "rgba(201,150,12,0.1)", border: "1px solid rgba(201,150,12,0.3)", color: "#C9960C", borderRadius: 999, padding: "2px 8px", ...GM, fontSize: 9, fontWeight: 700 }}>
                    ENTERPRISE
                  </span>
                )}
              </div>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.15)", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Enterprise and integration capabilities are on LAGDA's roadmap and may not be currently available on all plans. Contact Sales to discuss your organization's requirements and current availability.
          </p>
        </div>
        <style>{`.ent-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 720px) { .ent-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Compare Plans",        desc: "Find the right plan for your team size", path: "/pricing/compare" },
        { label: "Templates & Branding", desc: "Shared templates and company identity", path: "/esignature/templates-and-branding" },
      ]} />

      <PageCTA
        heading="Ready to scale your document workflow?"
        sub="Contact Sales to discuss team, enterprise, and volume requirements."
        primaryLabel="Contact Sales"
        primaryPath="/contact"
        secondaryLabel="Compare Plans"
        secondaryPath="/pricing/compare"
      />

      <LegalNote />
    </EsigPageShell>
  );
}
