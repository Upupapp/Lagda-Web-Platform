// /app/settings — Settings overview and navigation.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { SettingsPage, SCard, StatusBadge, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockSecuritySettingsService } from "../../../services/mock/settings.service";
import { mockBillingSettingsService } from "../../../services/mock/settings.service";
import { mockUsageService } from "../../../services/mock/settings.service";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const SLATE = "#64748B";
const AMBER = "#D97706";

interface OverviewData {
  mfaStatus:    string;
  sessions:     number;
  planName:     string;
  membersUsed:  number;
  seatAlloc:    number;
  warningCount: number;
}

function QuickLinkCard({ to, title, description, badge }: { to: string; title: string; description: string; badge?: string }) {
  return (
    <Link to={to} style={{ display: "block", textDecoration: "none", border: "1.5px solid #E3E8EF", borderRadius: 10, padding: "14px 16px", background: "#FFFFFF", transition: "border-color 0.15s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY }}>{title}</div>
        {badge && <StatusBadge label={badge} color={AMBER} />}
      </div>
      <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 4 }}>{description}</div>
    </Link>
  );
}

function AttentionItem({ message, to }: { message: string; to: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, marginBottom: 8 }}>
      <span style={{ ...GF, fontSize: 13, color: "#92400E" }}>⚠ {message}</span>
      <Link to={to} style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", whiteSpace: "nowrap", marginLeft: 16 }}>Review →</Link>
    </div>
  );
}

export function SettingsOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      mockSecuritySettingsService.getSecurityOverview(),
      mockBillingSettingsService.getBillingAccount(),
      mockUsageService.getUsageSummary(),
    ]).then(([sec, billing, usage]) => {
      const membersMetric = usage.metrics.find(m => m.id === "members-active");
      setData({
        mfaStatus:    sec.mfaStatus,
        sessions:     sec.activeSessionCount,
        planName:     billing.planName,
        membersUsed:  billing.activeMembers,
        seatAlloc:    billing.seatAllocation,
        warningCount: usage.metrics.filter(m => m.warningLevel !== "none").length,
      });
      setLoading(false);
    });
  }, []);

  const attentionItems: { msg: string; to: string }[] = [];
  if (data?.mfaStatus === "not-enabled") attentionItems.push({ msg: "Multi-factor authentication is not enabled.", to: "/app/settings/security/mfa" });
  if (data && data.membersUsed >= data.seatAlloc * 0.8) attentionItems.push({ msg: `Seat usage is approaching allocation (${data.membersUsed} of ${data.seatAlloc}).`, to: "/app/settings/usage" });
  if (data && data.warningCount > 0) attentionItems.push({ msg: `${data.warningCount} usage metric${data.warningCount > 1 ? "s" : ""} approaching allocation.`, to: "/app/settings/usage" });

  return (
    <SettingsPage title="Settings">
      {DEMO_NOTICE}

      {loading ? (
        <SCard><Skeleton h={80} mb={8} /><Skeleton h={80} mb={8} /><Skeleton h={80} /></SCard>
      ) : (
        <>
          {attentionItems.length > 0 && (
            <SCard style={{ border: "1.5px solid #FDE68A" }}>
              <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#92400E", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Attention</h2>
              {attentionItems.map((a, i) => <AttentionItem key={i} message={a.msg} to={a.to} />)}
            </SCard>
          )}

          <SCard>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Personal</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              <QuickLinkCard to="/app/settings/profile"     title="Profile"       description="Name, job title, display preferences" />
              <QuickLinkCard to="/app/settings/preferences" title="Preferences"   description="Language, timezone, appearance" />
              <QuickLinkCard to="/app/settings/security"    title="Security"      description={`MFA: ${data?.mfaStatus === "demonstration-enabled" ? "Enabled" : "Not enabled"} · ${data?.sessions ?? 0} session${data?.sessions !== 1 ? "s" : ""}`} badge={data?.mfaStatus === "not-enabled" ? "Review" : undefined} />
              <QuickLinkCard to="/app/settings/notifications" title="Notifications" description="Email, in-app, and digest preferences" />
              <QuickLinkCard to="/app/settings/signatures"    title="Signatures & Initials" description="Manage your reusable signature and initials library" />
              <QuickLinkCard to="/app/settings/data-and-privacy" title="Data & Privacy" description="Export and account closure direction" />
            </div>
          </SCard>

          <SCard>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Workspace</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
              <span style={{ ...GF, fontSize: 12, color: SLATE }}>Current plan:</span>
              <StatusBadge label={data?.planName ?? "—"} color={GOLD} />
              <span style={{ ...GF, fontSize: 12, color: SLATE }}>{data?.membersUsed ?? 0} of {data?.seatAlloc ?? 0} seats used</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              <QuickLinkCard to="/app/settings/branding"      title="Branding"       description="Workspace logo, colors, and sender display" />
              <QuickLinkCard to="/app/settings/billing"       title="Billing & Plan" description="Plan, seats, invoices, and payment method" />
              <QuickLinkCard to="/app/settings/usage"         title="Usage"          description="Signing requests, storage, and member usage" badge={data && data.warningCount > 0 ? `${data.warningCount} alerts` : undefined} />
              <QuickLinkCard to="/app/settings/integrations"  title="Integrations"   description="Cloud storage, identity, CRM, and developer tools" />
            </div>
          </SCard>

          <SCard>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Administrative</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/app/workspace" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}>Workspace Members & Teams →</Link>
              <Link to="/app/workspace/roles" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}>Roles & Permissions →</Link>
              <Link to="/app/workspace/settings" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none" }}>Workspace Identity & Security →</Link>
            </div>
          </SCard>
        </>
      )}
    </SettingsPage>
  );
}
