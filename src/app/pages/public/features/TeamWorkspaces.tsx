import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { WORKSPACE_ROLES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function WorkspaceMockup() {
  const members = [
    { name: "Ana Reyes",    role: "Owner",         avatar: "AR", active: true },
    { name: "Marco Santos", role: "Sender",        avatar: "MS", active: true },
    { name: "Lea Cruz",     role: "Reviewer",      avatar: "LC", active: true },
    { name: "Pedro Lim",    role: "Administrator", avatar: "PL", active: false },
  ];
  return (
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 420, width: "100%" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Mabini Legal Solutions</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>Team Workspace</p>
        </div>
        <span style={{ background: "rgba(0,120,212,0.15)", color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: "1px solid rgba(0,120,212,0.25)" }}>4 members</span>
      </div>
      {members.map((m) => (
        <div key={m.name} style={{ padding: "9px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,120,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 9, fontWeight: 700, color: "#38bdf8", flexShrink: 0 }}>{m.avatar}</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{m.name}</p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "1px 0 0" }}>{m.role}</p>
          </div>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.active ? "#22C55E" : "#334155", flexShrink: 0 }} />
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,120,212,0.06)", display: "flex", gap: 12 }}>
        <span style={{ color: "#0078D4", ...GF, fontSize: 12, fontWeight: 700 }}>+ Invite member</span>
        <span style={{ color: "#475569", ...GF, fontSize: 12 }}>Manage roles</span>
      </div>
    </div>
  );
}

export function TeamWorkspaces() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Team Workspaces"
        headingId="tw-h1"
        heading="One workspace. Multiple senders. Role-based access for everything."
        sub="LAGDA workspaces let your team send, manage, and review document transactions together — with shared templates, contacts, branding, and audit visibility, all governed by role-based access control."
      />

      <PageSection id="members" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="tw-two-col">
          <div>
            <SectionHeading eyebrow="Member management" id="mm-h2" heading="Add team members and define their permissions." sub="Each workspace member is assigned a role that determines what they can see, do, and manage. Roles can be changed at any time by an Owner or Administrator." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Invite by email — new members register and are linked automatically",
                "Multiple roles can be assigned to the same member",
                "Workspace visibility controls shared contacts and templates",
                "Audit records show activity per sender",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <WorkspaceMockup />
        </div>
        <style>{`.tw-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .tw-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="roles">
        <SectionHeading eyebrow="Workspace roles" id="wr-h2" heading="Every role — and what it controls." sub="LAGDA uses purpose-built workspace roles. Assign more than one role to a member to combine permissions." center />
        <div style={{ display: "grid", gap: 10 }} className="wr-grid">
          {WORKSPACE_ROLES.map((r) => (
            <div key={r.role} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{r.role}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{r.perms}</p>
            </div>
          ))}
        </div>
        <style>{`.wr-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .wr-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="shared" light bordered>
        <SectionHeading eyebrow="Shared workspace resources" id="sr-h2" heading="One library. Every authorized sender." center />
        <div style={{ display: "grid", gap: 12 }} className="sr-grid">
          {[
            { icon: "📑", label: "Templates",       desc: "Authorized senders share the same template library. Template Administrators control what's available." },
            { icon: "📇", label: "Contacts",        desc: "Contact records can be workspace-visible or sender-private depending on the configuration." },
            { icon: "🏢", label: "Branding",        desc: "A single workspace logo and email identity applies to all outgoing transactions from the workspace." },
            { icon: "📊", label: "Audit access",    desc: "Auditor-role members can view transaction history and audit records across the workspace." },
          ].map((item) => (
            <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 14px", display: "flex", gap: 12 }}>
              <span aria-hidden style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{item.label}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`.sr-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .sr-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Team & Enterprise",       desc: "Enterprise workspace features in eSignature", path: "/esignature/team-and-enterprise" },
        { label: "Company Branding",        desc: "Workspace-level branding controls", path: "/features/company-branding" },
        { label: "Storage & Plan Limits",   desc: "Seat limits and capacity by plan", path: "/features/storage-and-plan-limits" },
      ]} />

      <PageCTA
        heading="Explore Team and Enterprise capabilities."
        primaryLabel="Team & Enterprise"
        primaryPath="/esignature/team-and-enterprise"
        secondaryLabel="View Plans"
        secondaryPath="/pricing"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
