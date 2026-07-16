// Template Adoption Report — /app/reports/templates
// Command 29. Frontend demonstration only. No eNotary. No Burgundy.

import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import { usePlatform } from "../../../context/PlatformContext";
import { reportingService } from "../../../services/mock/reporting.service";
import { DEFAULT_REPORT_QUERY } from "../../../models/reports";
import type { ReportDatePreset } from "../../../models/reports";
import {
  GF,
  DemoBanner, ReportFamilyNav, ReportsRestricted,
  ReportPageHeader, DatePresetSelector, DataQualityNotices,
  MetricGrid, SectionCard, DistributionChart, TimeSeriesChart,
  ReportTable, ReportActionToolbar,
  ExportPreviewPanel, SharePreviewPanel, SchedulePreviewPanel,
  CreateSavedViewPanel,
} from "./ReportsShared";

export function ReportsTemplatesPage() {
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
  const data       = useMemo(() => reportingService.getTemplateReport(query), [query]);
  const notices    = reportingService.getDataQualityNotices("templates");
  const exportPrev = useMemo(() => reportingService.getExportPreview("templates", query), [query]);
  const sharePrev  = reportingService.getSharePreview("templates");
  const schedPrev  = reportingService.getSchedulePreview("templates");
  const dateRange  = useMemo(() => reportingService.computeDateRange(datePreset), [datePreset]);

  function handleSave(name: string) {
    const res = reportingService.createSavedView({ name, family: "templates", datePreset, filters: {} });
    if (res.ok) { setToast(`Saved view "${name}" created.`); setShowSave(false); }
  }

  if (!canView) return <ReportsRestricted />;

  return (
    <main aria-label="Template adoption report" style={{ ...GF, maxWidth: 1100, margin: "0 auto" }}>
      <ReportPageHeader
        title="Template Adoption"
        description="Usage trends, frequently used templates, status distribution, and role-placeholder direction."
        family="templates"
        actions={
          <ReportActionToolbar
            onSave={()      => { setShowExport(false); setShowShare(false); setShowSchedule(false); setShowSave(true); }}
            onExport={()    => { setShowSave(false); setShowShare(false); setShowSchedule(false); setShowExport(v => !v); }}
            onShare={()     => { setShowSave(false); setShowExport(false); setShowSchedule(false); setShowShare(v => !v); }}
            onSchedule={()  => { setShowSave(false); setShowExport(false); setShowShare(false); setShowSchedule(v => !v); }}
          />
        }
      />

      <ReportFamilyNav current="templates" />

      {toast ? (
        <div role="status" aria-live="polite" style={{ ...GF, fontSize: 12, background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 6, padding: "7px 12px", marginBottom: 12 }}>
          {toast} <button onClick={() => setToast("")} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#15803D", marginLeft: 8 }}>Dismiss</button>
        </div>
      ) : null}

      {showSave     && <CreateSavedViewPanel family="templates" onClose={() => setShowSave(false)} onCreate={handleSave} />}
      {showExport   && <ExportPreviewPanel   preview={exportPrev} onClose={() => setShowExport(false)}   />}
      {showShare    && <SharePreviewPanel    preview={sharePrev}  onClose={() => setShowShare(false)}    />}
      {showSchedule && <SchedulePreviewPanel preview={schedPrev}  onClose={() => setShowSchedule(false)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <DatePresetSelector />
        <span style={{ ...GF, fontSize: 12, color: "#6B7280" }}>Period: <strong>{dateRange.label}</strong></span>
      </div>

      <DemoBanner />
      <DataQualityNotices notices={notices} />

      {/* Summary metrics */}
      <MetricGrid cards={[...data.summary, data.placeholderSummary]} cols={3} />

      {/* Usage trend */}
      <SectionCard>
        <TimeSeriesChart series={data.usageTrend} />
      </SectionCard>

      {/* Status distribution */}
      <SectionCard>
        <DistributionChart dist={data.statusDistribution} />
      </SectionCard>

      {/* Template detail table */}
      <SectionCard>
        <ReportTable table={data.detailTable} />
      </SectionCard>
    </main>
  );
}
