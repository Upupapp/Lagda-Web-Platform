// /app/settings — the overview: who you are, how your account is protected,
// the plan, and this month's usage at a glance. Every figure comes from the
// same sources as its own section (the session, /me, /me/sessions and the
// workspace usage endpoint); the demo build shows its sample figures.

import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  ArrowRight, ShieldCheck, ShieldAlert, MonitorSmartphone, KeyRound, Sparkles, Send, FileText, Users, HardDrive,
  Network, ShieldQuestion, SlidersHorizontal,
} from "lucide-react";
import { SettingsPage, SCard, Badge, StatTile, Skeleton, SET } from "./SettingsShell";
import { usePlatform } from "../../../context/PlatformContext";
import { UserAvatar } from "../../../components/platform/UserAvatar";
import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import { useSecuritySummary, useWorkspaceUsage, formatBytes } from "./settings-data";
import { CURRENT_PLAN } from "../../../config/pricing.config";

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

function PlanCard() {
  return (
    <SCard style={{ marginBottom: 0 }}>
      <CardHeading to="/app/settings/billing" linkLabel="Billing & Plan">Plan</CardHeading>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: SET.MONO, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: SET.NAVY }}>
          <Sparkles size={15} aria-hidden color="#A16207" /> {CURRENT_PLAN.name.toUpperCase()}
        </span>
        <Badge tone="success" dot>Active</Badge>
      </div>
      <p style={{ ...GF, fontSize: 13, color: SET.SLATE, margin: 0, lineHeight: 1.55 }}>{CURRENT_PLAN.summary}</p>
    </SCard>
  );
}

function UsageGlance() {
  const { workspaceId } = useWorkspaceMode();
  const { usage, error } = useWorkspaceUsage(workspaceId);
  return (
    <SCard>
      <CardHeading to="/app/settings/usage" linkLabel="View usage">Usage this month</CardHeading>
      {error ? (
        <p style={{ ...GF, fontSize: 13, color: SET.DANGER, margin: 0 }}>Usage could not be loaded.</p>
      ) : usage === null ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {[0, 1, 2, 3].map(i => <Skeleton key={i} h={84} mb={0} />)}
        </div>
      ) : (
        <div data-testid="overview-usage" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <StatTile icon={Send} tone="info" label="Signing requests sent" value={usage.signingRequests.sentThisMonth.toLocaleString("en-PH")} note="No limit applied" />
          <StatTile icon={FileText} tone="info" label="Documents" value={usage.documents.total.toLocaleString("en-PH")} note={`${usage.documents.uploadedThisMonth.toLocaleString("en-PH")} uploaded this month`} />
          <StatTile icon={Users} tone="teal" label="Members" value={usage.members.toLocaleString("en-PH")} />
          <StatTile icon={HardDrive} tone="teal" label="Storage used" value={formatBytes(usage.storageBytes)} />
        </div>
      )}
    </SCard>
  );
}

function AdminLinks() {
  const links = [
    { to: "/app/workspace/members", label: "Members & teams", icon: Users },
    { to: "/app/workspace/roles", label: "Roles & permissions", icon: ShieldQuestion },
    { to: "/app/workspace/settings", label: "Workspace name & sign-in policy", icon: SlidersHorizontal },
    { to: "/app/settings/organization", label: "Organization units", icon: Network },
  ];
  return (
    <SCard>
      <h3 style={{ ...GF, fontSize: 15, fontWeight: 700, color: SET.NAVY, margin: "0 0 12px" }}>Workspace administration</h3>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        {links.map(l => (
          <li key={l.to}>
            <Link to={l.to} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "8px 12px", border: `1px solid ${SET.BORDER}`, borderRadius: 10, textDecoration: "none", ...GF, fontSize: 13.5, fontWeight: 600, color: SET.INK }}>
              <l.icon size={16} aria-hidden color={SET.TEAL_TEXT} />
              <span style={{ flex: 1, minWidth: 0 }}>{l.label}</span>
              <ArrowRight size={14} aria-hidden color={SET.SLATE} />
            </Link>
          </li>
        ))}
      </ul>
    </SCard>
  );
}

export function SettingsOverviewPage() {
  return (
    <SettingsPage title="Overview" description="Your account, how it is protected, and your workspace's plan and usage.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, marginBottom: 16 }}>
        <ProfileCard />
        <SecurityCard />
        <PlanCard />
      </div>
      <UsageGlance />
      <AdminLinks />
    </SettingsPage>
  );
}
