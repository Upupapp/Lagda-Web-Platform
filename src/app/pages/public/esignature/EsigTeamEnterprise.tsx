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
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 14, overflow: "hidden",
      maxWidth: 440, width: "100%",
      boxShadow: "0 4px 16px rgba(7,17,31,0.08)",
    }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700, margin: 0 }}>Mabini Legal Solutions</p>
          <p style={{ color: "#64748B", ...GF, fontSize: 11, margin: 0 }}>Workspace</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.1)", color: "#0078D4", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 999, padding: "2px 10px", ...GM, fontSize: 10, fontWeight: 700 }}>
          4 members
        </span>
      </div>
      <div style={{ padding: "8px 0" }}>
        {members.map((m) => (
          <div key={m.name} style={{ padding: "9px 18px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,120,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, fontWeight: 700, color: "#0078D4", flexShrink: 0 }}>
              {m.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "#07111F", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{m.name}</p>
              <p style={{ color: "#64748B", ...GM, fontSize: 10, margin: "2px 0 0" }}>{m.role}</p>
            </div>
            <span style={{
              ...GM, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: m.status === "Active" ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)",
              color: m.status === "Active" ? "#178A4C" : "#64748B",
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
    { label: "Documents sent this month", value: "48",     color: "#0078D4" },
    { label: "Members",                   value: "12",     color: "#178A4C" },
    { label: "Templates",                 value: "9",      color: "#0078D4" },
    { label: "Storage used",              value: "3.1 GB", color: "#B45309" },
  ];

  return (
    <div aria-hidden style={{
      display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10,
      maxWidth: 360, width: "100%",
    }}>
      {STATS.map((s) => (
        <div key={s.label} style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12, padding: "14px 16px",
          boxShadow: "0 1px 4px rgba(7,17,31,0.07)",
        }}>
          <p style={{ color: s.color, ...GF, fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1 }}>{s.value}</p>
          <p style={{ color: "#64748B", ...GM, fontSize: 10, margin: "6px 0 0", lineHeight: 1.4 }}>{s.label}</p>
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
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 10, padding: "12px 14px",
          boxShadow: "0 1px 4px rgba(7,17,31,0.06)",
        }}>
          <span style={{ color: "#0078D4", ...GM, fontSize: 12, fontWeight: 700, flexShrink: 0, minWidth: 160 }}>
            {r.role}
          </span>
          <span style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.5 }}>{r.perms}</span>
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
        sub="On the Business plan, your whole team works in one LAGDA workspace: members, teams, roles, join links, shared contacts, company branding and an activity log. Enterprise is coming soon."
      />

      {/* Team capabilities grid */}
      <PageSection id="team-capabilities" light bordered>
        <SectionHeading eyebrow="Workspace features" id="ws-heading" heading="Organize your team's legal-document workflow." sub="One workspace. Every team member, template, contact, and transaction — organized and controlled." />
        <div style={{ display: "grid", gap: 14 }} className="tc-grid">
          {TEAM_CAPABILITIES.map((c) => (
            <div key={c.title} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: "20px 18px", boxShadow: "0 1px 4px rgba(7,17,31,0.07)" }}>
              <span aria-hidden style={{ fontSize: 22, display: "block", marginBottom: 10 }}>{c.icon}</span>
              <p style={{ color: "#07111F", ...GF, fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 6 }}>{c.title}</p>
              <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.tc-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .tc-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Members + workspace mockup */}
      <PageSection id="workspace">
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="te-two-col">
          <div>
            <SectionHeading eyebrow="Workspace management" id="wsm-heading" heading="Everyone in the right place with the right access." sub="Role-based access controls help organizations define who can send, review, administer, or audit document transactions." />
            <p style={{ color: "#334155", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0, marginBottom: 16 }}>
              LAGDA workspaces keep each organization's documents, templates, contacts and settings separate — even when a person belongs to several workspaces. A workspace has its owner's plan.
            </p>
            <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>WORKSPACE ISOLATION</p>
              <p style={{ color: "#334155", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Documents, templates, contacts, members, branding, usage, and activity history are separate per workspace.
              </p>
            </div>
          </div>
          <WorkspaceMockup />
        </div>
        <style>{`.te-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .te-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Workspace roles */}
      <PageSection id="roles" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="te-two-col">
          <div>
            <SectionHeading eyebrow="Role-based access" id="roles-heading" heading="Control who can do what." />
            <p style={{ color: "#334155", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0, marginBottom: 20 }}>
              Role-based access helps organizations control who prepares, sends, reviews, administers, or audits document transactions — without giving everyone full workspace access.
            </p>
            <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Roles are part of the Business plan. Every role below works in LAGDA today.
            </p>
          </div>
          <WorkspaceRolesTable />
        </div>
      </PageSection>

      {/* Activity and usage */}
      <PageSection id="reporting">
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="te-two-col">
          <div>
            <SectionHeading eyebrow="Activity and usage" id="report-heading" heading="See what is happening in your workspace." sub="The activity log records who joined, who was invited, and what changed. Usage shows the workspace's totals for the month." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Members joining and leaving",
                "Invitations sent, accepted and declined",
                "Join requests approved and declined",
                "Role and team changes",
                "Branding and document-sharing changes",
                "Documents sent this month",
                "Members, templates and storage used",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
                  <span style={{ color: "#334155", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <ReportingPreview />
        </div>
      </PageSection>

      {/* Security today, Enterprise coming soon */}
      <PageSection id="security-enterprise" light bordered>
        <SectionHeading eyebrow="Security and Enterprise" id="ent-heading" heading="Secure for every team today. Enterprise is coming soon." center />
        <div style={{ display: "grid", gap: 14 }} className="ent-grid">
          {[
            { title: "Two-step verification",   desc: "Every member can protect their own sign-in with an authenticator app." },
            { title: "Verified accounts",        desc: "Every account confirms its email address before it can be used." },
            { title: "Audit trail",              desc: "Every signing event is recorded, with a completion report and Document Verification." },
            { title: "Role-based access",        desc: "Each member sees and does only what their role allows." },
            { title: "Custom document volume",   desc: "Volume beyond Business for high-sending organizations.", enterprise: true },
            { title: "Dedicated onboarding and support", desc: "A guided rollout and a direct line to the LAGDA team.", enterprise: true },
          ].map((f) => (
            <div key={f.title} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "13px 14px", boxShadow: "0 1px 4px rgba(7,17,31,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700 }}>{f.title}</span>
                {f.enterprise && (
                  <span style={{ background: "rgba(201,150,12,0.1)", border: "1px solid rgba(201,150,12,0.3)", color: "#7D5C06", borderRadius: 999, padding: "2px 8px", ...GM, fontSize: 9, fontWeight: 700 }}>
                    ENTERPRISE · COMING SOON
                  </span>
                )}
              </div>
              <p style={{ color: "#64748B", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.15)", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ color: "#334155", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Enterprise is coming soon and will include everything in Business. Contact us to be told when it opens.
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
        sub="Start on Free, then choose Business in Plan & Billing when your team joins."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Compare Plans"
        secondaryPath="/pricing/compare"
      />

      <LegalNote />
    </EsigPageShell>
  );
}
