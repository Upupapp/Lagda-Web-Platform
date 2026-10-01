// /app/settings — the My Settings overview: who you are and how your account
// is protected. Every figure comes from the same sources as its own section
// (the session, /me and /me/sessions); the demo build shows its sample
// figures. The plan and usage moved to Workspace › Workspace Settings.

import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  ArrowRight, ShieldCheck, ShieldAlert, MonitorSmartphone, KeyRound, Users, Network, Settings,
} from "lucide-react";
import { SettingsPage, SCard, Badge, Skeleton, SET } from "./SettingsShell";
import { usePlatform } from "../../../context/PlatformContext";
import { UserAvatar } from "../../../components/platform/UserAvatar";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";
import { useSecuritySummary } from "./settings-data";
import { workspaceSettingsEntry } from "../workspace/shell/sections";

const GF = { fontFamily: SET.FONT };

function CardHeading({ children, to, linkLabel }: { children: ReactNode; to: string; linkLabel: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
      <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: SET.NAVY, margin: 0 }}>{children}</h3>
      <Link to={to} style={{ ...GF, fontSize: 13, fontWeight: 600, color: SET.AZURE_TEXT, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, minHeight: 32 }}>
        {linkLabel} <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );
}

function ProfileCard() {
  const { user } = usePlatform();
  const detail = [user?.jobTitle, user?.department].filter(v => v !== undefined && v.trim() !== "").join(" · ");
  return (
    <SCard style={{ marginBottom: 0 }}>
      <CardHeading to="/app/settings/profile" linkLabel="Edit profile">Your profile</CardHeading>
      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <UserAvatar user={user} size={52} fontSize={18} />
          <div style={{ minWidth: 0 }}>
            <div data-testid="overview-profile-name" style={{ ...GF, fontSize: 15, fontWeight: 700, color: SET.NAVY, overflowWrap: "anywhere" }}>{user.fullName ?? user.displayName}</div>
            <div style={{ ...GF, fontSize: 13, color: SET.SLATE, overflowWrap: "anywhere" }}>{user.email}</div>
            {detail && <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE, marginTop: 2 }}>{detail}</div>}
          </div>
        </div>
      ) : <Skeleton h={52} mb={0} />}
    </SCard>
  );
}

function SecurityCard() {
  const { mfa, sessions, error } = useSecuritySummary();
  const loading = !error && (mfa === null || sessions === null);
  return (
    <SCard style={{ marginBottom: 0 }}>
      <CardHeading to="/app/settings/security" linkLabel="Review security">Security</CardHeading>
      {loading ? <Skeleton h={80} mb={0} /> : error ? (
        <p style={{ ...GF, fontSize: 13, color: SET.DANGER, margin: 0 }}>Security details could not be loaded.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          <li style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...GF, fontSize: 13.5, color: SET.INK, display: "inline-flex", alignItems: "center", gap: 8 }}>
              {mfa?.enabled ? <ShieldCheck size={16} aria-hidden color={SET.SUCCESS} /> : <ShieldAlert size={16} aria-hidden color="#B45309" />}
              Two-step verification
            </span>
            <span data-testid="overview-mfa">{mfa?.enabled ? <Badge tone="success" dot>On</Badge> : <Badge tone="warning" dot>Off</Badge>}</span>
          </li>
          <li style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...GF, fontSize: 13.5, color: SET.INK, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <MonitorSmartphone size={16} aria-hidden color={SET.SLATE} /> Signed-in sessions
            </span>
            <span data-testid="overview-sessions" style={{ fontFamily: SET.MONO, fontSize: 13.5, fontWeight: 700, color: SET.NAVY }}>{sessions?.length ?? 0}</span>
          </li>
          <li style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...GF, fontSize: 13.5, color: SET.INK, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={16} aria-hidden color={SET.SLATE} /> Password
            </span>
            <Link to="/app/settings/security/password" style={{ ...GF, fontSize: 13, fontWeight: 600, color: SET.AZURE_TEXT, textDecoration: "none" }}>Change</Link>
          </li>
        </ul>
      )}
    </SCard>
  );
}

/** Where the workspace-wide settings went, for anyone who looks for them here. */
function WorkspaceSettingsLinks() {
  const access = useWorkspaceAccess();
  const links = [
    { to: workspaceSettingsEntry(access), label: "Workspace Settings", hint: "Name, branding, billing, usage and integrations", icon: Settings },
    { to: "/app/workspace/people", label: "People & Teams", hint: "Your teams and the people in them", icon: Users },
    { to: "/app/workspace/organization", label: "Organisation", hint: "Teams, organization units and roles", icon: Network },
  ];
  return (
    <SCard>
      <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: SET.NAVY, margin: "0 0 4px" }}>Looking for workspace settings?</h3>
      <p style={{ ...GF, fontSize: 13, color: SET.SLATE, margin: "0 0 12px", lineHeight: 1.5 }}>
        Settings that apply to everyone in the workspace are under Workspace. Old links still open them.
      </p>
      <ul data-testid="overview-workspace-links" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 8 }}>
        {links.map(l => (
          <li key={l.label}>
            <Link to={l.to} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 12px", border: `1px solid ${SET.BORDER}`, borderRadius: 10, textDecoration: "none", ...GF }}>
              <l.icon size={16} aria-hidden color={SET.AZURE_TEXT} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: SET.INK }}>{l.label}</span>
                <span style={{ display: "block", fontSize: 12, color: SET.SLATE, lineHeight: 1.4 }}>{l.hint}</span>
              </span>
              <ArrowRight size={14} aria-hidden color={SET.SLATE} style={{ flexShrink: 0 }} />
            </Link>
          </li>
        ))}
      </ul>
    </SCard>
  );
}

export function SettingsOverviewPage() {
  return (
    <SettingsPage title="Overview" description="Your profile, and how your account is protected.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginBottom: 16 }}>
        <ProfileCard />
        <SecurityCard />
      </div>
      <WorkspaceSettingsLinks />
    </SettingsPage>
  );
}
