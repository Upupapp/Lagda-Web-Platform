// Reports Overview — /app/reports
// Command 29. Frontend demonstration only. No live analytics.
// No eNotary metrics. No Burgundy (#67023B).

import { useMemo } from "react";
import { Link } from "react-router";
import { BookMarked, ChevronRight } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { reportingService } from "../../../services/mock/reporting.service";
import { isCapabilityInActiveProfile } from "../../../config/capability-resolver";
import { DEFAULT_REPORT_QUERY } from "../../../models/reports";
import type { ReportFamily } from "../../../models/reports";
import {
  GF, NAVY, AZURE, SLATE, SILVER,
  DemoBanner, ReportFamilyNav, ReportsRestricted,
  ReportPageHeader, MetricGrid, SectionCard,
  FamilyCard, SectionDivider, GOLD,
  availableReportFamilies,
} from "./ReportsShared";

export function ReportsOverviewPage() {
  const { hasPermission, hasFlag } = usePlatform();

  const canView = hasPermission("view_reports") && hasFlag("reportsEnabled");

  // Bulk Send Preparation joins this list only when the capability is in the
  // active profile — see availableReportFamilies().
  const families: ReportFamily[] = availableReportFamilies();

  const teamData  = useMemo(() => reportingService.getTeamActivityReport(DEFAULT_REPORT_QUERY), []);
  const savedViews = useMemo(() => reportingService.getSavedViews().filter(v => v.status === "active").slice(0, 4), []);

  if (!canView) return <ReportsRestricted />;

  return (
    <main aria-label="Reports and analytics overview" style={{ ...GF, maxWidth: 1100, margin: "0 auto" }}>
      <ReportPageHeader
        title="Reports & Analytics"
        description="Operational insights across document transactions, participants, templates, verification, and workspace activity."
      />

      <ReportFamilyNav current="overview" />

      <DemoBanner />

      {/* Workspace summary metrics */}
      <SectionCard>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ ...GF, fontSize: 15, fontWeight: 600, color: NAVY, margin: 0 }}>Workspace Summary</h2>
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "3px 0 0" }}>
            Last 30 days · Demonstration data only
          </p>
        </div>
        <MetricGrid cards={teamData.workspaceSummary} cols={5} />
        <Link
          to="/app/reports/teams"
          style={{ ...GF, fontSize: 12, color: AZURE, textDecorationLine: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}
        >
          View Team & Workspace report <ChevronRight size={13} aria-hidden />
        </Link>
      </SectionCard>

      {/* Report family cards */}
      <SectionDivider label="Report Families" />
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 24 }}
        role="list"
        aria-label="Report family navigation"
      >
        {families.map(f => (
          <div role="listitem" key={f}><FamilyCard family={f} /></div>
        ))}
      </div>

      {/* Saved views */}
      <SectionDivider label="Saved Views" />
      {savedViews.length === 0 ? (
        <div style={{ ...GF, fontSize: 13, color: SILVER, padding: "20px 0" }}>
          No saved views yet. Open a report family and use Save View to save a configuration.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {savedViews.map(v => (
            <Link
              key={v.id}
              to={`/app/reports/${v.id}`}
              style={{ textDecorationLine: "none" }}
            >
              <div
                style={{
                  background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
                  padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <BookMarked size={14} style={{ color: GOLD, flexShrink: 0 }} aria-hidden />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>{v.name}</div>
                  <div style={{ ...GF, fontSize: 11, color: SLATE }}>{v.family} · {v.datePreset.replace(/-/g, " ")}</div>
                </div>
                {v.isDefault ? (
                  <span style={{ ...GF, fontSize: 10, background: "#FEF3C7", color: "#92400E", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>Default</span>
                ) : null}
                <ChevronRight size={14} style={{ color: SILVER }} aria-hidden />
              </div>
            </Link>
          ))}
          {/* Saved report views are advanced-reports (post-launch) and the route is
              capability-guarded, so the link is omitted in the launch profile. */}
          {isCapabilityInActiveProfile("advanced-reports")
            && reportingService.getSavedViews().filter(v => v.status === "active").length > 4 ? (
            <Link to="/app/reports/saved" style={{ ...GF, fontSize: 12, color: AZURE, textDecorationLine: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View all saved views <ChevronRight size={12} aria-hidden />
            </Link>
          ) : null}
        </div>
      )}

      {/* Direction toward docs/usage boundary */}
      <SectionCard>
        <h2 style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 8 }}>Related Sections</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            <strong>Document Transactions</strong> — for the full transaction list with filtering and status, see{" "}
            <Link to="/app/documents" style={{ color: AZURE }}>Documents</Link>.
          </p>
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            <strong>Plan Usage</strong> — for signing-request, storage, and member-seat consumption, see{" "}
            <Link to="/app/settings/usage" style={{ color: AZURE }}>Usage Settings</Link>.
          </p>
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            <strong>Administrative Events</strong> — for the workspace member and role change log, see{" "}
            <Link to="/app/workspace/activity" style={{ color: AZURE }}>Workspace Activity</Link>.
          </p>
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            <strong>My Actions</strong> — for signing and approval requests assigned to you, see{" "}
            <Link to="/app/inbox" style={{ color: AZURE }}>My Actions</Link>.
            Personal action data does not appear in Reports.
          </p>
        </div>
      </SectionCard>
    </main>
  );
}
