// /app/settings/security — how your account is protected, at a glance.
// Built from the same calls as the sub-pages: `/me`'s security summary and
// GET /me/sessions. Sign-in history is not recorded yet, and says so.

import type { ReactNode } from "react";
import { Link } from "react-router";
import { KeyRound, Smartphone, Monitor, History, ArrowRight, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SettingsPage, SCard, Badge, Skeleton, Notice, BTN_SECONDARY, SET } from "./SettingsShell";
import { useSecuritySummary } from "./settings-data";

const GF = { fontFamily: SET.FONT };

function Row({ icon: Icon, title, detail, status, to, linkLabel, testId }: {
  icon: LucideIcon; title: string; detail: string; status: ReactNode; to: string; linkLabel: string; testId: string;
}) {
  return (
    <li data-testid={testId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: `1px solid ${SET.BORDER}`, flexWrap: "wrap" }}>
      <span aria-hidden style={{ width: 38, height: 38, borderRadius: 10, background: "#EFF6FD", border: "1px solid #BAD7F5", color: SET.AZURE_TEXT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} />
      </span>
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...GF, fontSize: 14, fontWeight: 700, color: SET.NAVY }}>{title}</span>
          {status}
        </div>
        <div style={{ ...GF, fontSize: 13, color: SET.SLATE, marginTop: 2, lineHeight: 1.5 }}>{detail}</div>
      </div>
      <Link to={to} style={{ ...BTN_SECONDARY, minHeight: 36, padding: "6px 14px", fontSize: 13 }}>
        {linkLabel} <ArrowRight size={14} aria-hidden />
      </Link>
    </li>
  );
}

export function SecurityOverviewPage() {
  const { mfa, sessions, error, reload } = useSecuritySummary();
  const heading = { title: "Security overview", breadcrumb: "Security › Overview", description: "Your password, two-step verification and signed-in sessions." };

  if (error) return (
    <SettingsPage {...heading}>
      <Notice tone="danger" role="alert">Your security details could not be loaded.</Notice>
      <button type="button" onClick={reload} style={BTN_SECONDARY}>Try again</button>
    </SettingsPage>
  );
  if (mfa === null || sessions === null) return <SettingsPage {...heading}><Skeleton h={260} /></SettingsPage>;

  const count = sessions.length;
  return (
    <SettingsPage {...heading}>
      {!mfa.enabled && (
        <Notice tone="warning" icon={ShieldAlert}>
          Two-step verification is off. Turn it on so a stolen password alone cannot open your account.{" "}
          <Link to="/app/settings/security/mfa" style={{ color: "#78350F", fontWeight: 700 }}>Set it up</Link>
        </Notice>
      )}
      <SCard>
        <ul style={{ listStyle: "none", margin: "-14px 0 0", padding: 0 }}>
          <Row testId="security-row-password" icon={KeyRound} title="Password" status={<Badge tone="success" dot>Set</Badge>}
            detail="Change it any time. Other sessions are signed out when you do." to="/app/settings/security/password" linkLabel="Change" />
          <Row testId="security-row-mfa" icon={Smartphone} title="Two-step verification"
            status={mfa.enabled ? <Badge tone="success" dot>On</Badge> : <Badge tone="warning" dot>Off</Badge>}
            detail={mfa.enabled ? "A code from your authenticator app is asked for at sign-in." : "Only your password protects your account."}
            to="/app/settings/security/mfa" linkLabel={mfa.enabled ? "Review" : "Set up"} />
          <Row testId="security-row-sessions" icon={Monitor} title="Sessions"
            status={<Badge tone="info">{count} signed in</Badge>}
            detail={`${String(count)} browser${count === 1 ? " is" : "s are"} signed in to your account, including this one.`}
            to="/app/settings/security/sessions" linkLabel="Manage" />
          <Row testId="security-row-activity" icon={History} title="Sign-in history"
            status={<Badge tone="neutral">Not recorded yet</Badge>}
            detail="LAGDA does not keep a sign-in history yet." to="/app/settings/security/activity" linkLabel="Details" />
        </ul>
      </SCard>
    </SettingsPage>
  );
}
