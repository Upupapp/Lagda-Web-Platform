// Workspace & Team Activity Report — /app/reports/teams
// Command 29. Frontend demonstration only. No eNotary. No Burgundy.
// Member privacy: aggregate only, no productivity/trust/risk scores.

import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import { usePlatform } from "../../../context/PlatformContext";
import { reportingService } from "../../../services/mock/reporting.service";
import { DEFAULT_REPORT_QUERY } from "../../../models/reports";
import type { ReportDatePreset } from "../../../models/reports";
import {
  GF, NAVY, SLATE,
  DemoBanner, ReportFamilyNav, ReportsRestricted,
  ReportPageHeader, DatePresetSelector, DataQualityNotices,
  MetricGrid, SectionCard, ReportTable,
  ReportActionToolbar, SectionDivider, MemberPrivacyNotice,
  ExportPreviewPanel, SharePreviewPanel, SchedulePreviewPanel,
  CreateSavedViewPanel,
} from "./ReportsShared";

export function ReportsTeamsPage() {
  const { hasPermission, hasFlag } = usePlatform();
  const [params]  = useSearchParams();
  const [showExport,   setShowExport]   = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSave,     setShowSave]     = useState(false);
  const [toast,        setToast]        = useState("");

  const canView = hasPermission("view_reports") && hasFlag("reportsEnabled");

  const datePreset = (params.get("datePreset") as ReportDatePreset) ?? DEFAULT_REPORT_QUERY.datePreset;
  const query      = useMemo(() => ({ ...DEFAULT_REPORT_QUERY, datePreset }), [datePreset]);
  const data       = useMemo(() => reportingService.getTeamActivityReport(query), [query]);
  const notices    = reportingService.getDataQualityNotices("teams");
  const exportPrev = useMemo(() => reportingService.getExportPreview("teams", query), [query]);
  const sharePrev  = reportingService.getSharePreview("teams");
  const schedPrev  = reportingService.getSchedulePreview("teams");
  const dateRange  = useMemo(() => reportingService.computeDateRange(datePreset), [datePreset]);

  function handleSave(name: string) {
    const res = reportingService.createSavedView({ name, family: "teams", datePreset, filters: {} });
    if (res.ok) { setToast(`Saved view "${name}" created.`); setShowSave(false); }
  }

  if (!canView) return <ReportsRestricted />;

  return (
    <main aria-label="Workspace and team activity report" style={{ ...GF, maxWidth: 1100, margin: "0 auto" }}>
      <ReportPageHeader
        title="Workspace & Team Activity"
        description="Workspace operational summary, team comparison, sender activity direction, and member participation direction."
        family="teams"
        actions={
          <ReportActionToolbar
            onSave={()      => { setShowExport(false); setShowShare(false); setShowSchedule(false); setShowSave(true); }}
            onExport={()    => { setShowSave(false); setShowShare(false); setShowSchedule(false); setShowExport(v => !v); }}
            onShare={()     => { setShowSave(false); setShowExport(false); setShowSchedule(false); setShowShare(v => !v); }}
            onSchedule={()  => { setShowSave(false); setShowExport(false); setShowShare(false); setShowSchedule(v => !v); }}
          />
        }
      />

      <ReportFamilyNav current="teams" />

      {toast ? (
        <div role="status" aria-live="polite" style={{ ...GF, fontSize: 12, background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 6, padding: "7px 12px", marginBottom: 12 }}>
          {toast} <button onClick={() => setToast("")} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#15803D", marginLeft: 8 }}>Dismiss</button>
        </div>
      ) : null}

      {showSave     && <CreateSavedViewPanel family="teams" onClose={() => setShowSave(false)} onCreate={handleSave} />}
      {showExport   && <ExportPreviewPanel   preview={exportPrev} onClose={() => setShowExport(false)}   />}
      {showShare    && <SharePreviewPanel    preview={sharePrev}  onClose={() => setShowShare(false)}    />}
      {showSchedule && <SchedulePreviewPanel preview={schedPrev}  onClose={() => setShowSchedule(false)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <DatePresetSelector />
        <span style={{ ...GF, fontSize: 12, color: "#6B7280" }}>Period: <strong>{dateRange.label}</strong></span>
      </div>

      <DemoBanner />
      <MemberPrivacyNotice />
      <DataQualityNotices notices={notices} />

      {/* Workspace summary */}
      <SectionCard>
        <h2 style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, margin: "0 0 14px" }}>Workspace Summary</h2>
        <MetricGrid cards={data.workspaceSummary} cols={5} />
      </SectionCard>

      {/* Team comparison */}
      <SectionCard>
        <SectionDivider label="Team Comparison" />
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 12px" }}>
          Team size affects transaction counts. Compare with team size in context, not in isolation.
        </p>
        <ReportTable table={data.teamComparison} />
      </SectionCard>

      {/* Sender activity */}
      <SectionCard>
        <SectionDivider label="Sender Activity Direction" />
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 12px" }}>
          Operational workflow direction only. Does not represent productivity, role effectiveness, or output quality.
        </p>
        <ReportTable table={data.senderActivity} />
      </SectionCard>

      {/* Member direction */}
      <SectionCard>
        <SectionDivider label="Member Activity Direction" />
        <MemberPrivacyNotice />
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 12px" }}>{data.memberActivityNote}</p>
        <ReportTable table={data.detailTable} />
      </SectionCard>
    </main>
  );
}
