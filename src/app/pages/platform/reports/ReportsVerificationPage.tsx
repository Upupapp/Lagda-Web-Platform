// Verification Report — /app/reports/verification
// Command 29. Frontend demonstration only. No file hashing. No eNotary. No Burgundy.

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
  MetricGrid, SectionCard, DistributionChart, TimeSeriesChart,
  MetricCard, ReportTable, ReportActionToolbar, SectionDivider,
  ExportPreviewPanel, SharePreviewPanel, SchedulePreviewPanel,
  CreateSavedViewPanel,
} from "./ReportsShared";

export function ReportsVerificationPage() {
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
  const data       = useMemo(() => reportingService.getVerificationReport(query), [query]);
  const notices    = reportingService.getDataQualityNotices("verification");
  const exportPrev = useMemo(() => reportingService.getExportPreview("verification", query), [query]);
  const sharePrev  = reportingService.getSharePreview("verification");
  const schedPrev  = reportingService.getSchedulePreview("verification");
  const dateRange  = useMemo(() => reportingService.computeDateRange(datePreset), [datePreset]);

  function handleSave(name: string) {
    const res = reportingService.createSavedView({ name, family: "verification", datePreset, filters: {} });
    if (res.ok) { setToast(`Saved view "${name}" created.`); setShowSave(false); }
  }

  if (!canView) return <ReportsRestricted />;

  return (
    <main aria-label="Verification report" style={{ ...GF, maxWidth: 1100, margin: "0 auto" }}>
      <ReportPageHeader
        title="Verification"
        description="Verification check direction, outcome distribution, coverage direction, and match/mismatch simulation."
        family="verification"
        actions={
          <ReportActionToolbar
            onSave={()      => { setShowExport(false); setShowShare(false); setShowSchedule(false); setShowSave(true); }}
            onExport={()    => { setShowSave(false); setShowShare(false); setShowSchedule(false); setShowExport(v => !v); }}
            onShare={()     => { setShowSave(false); setShowExport(false); setShowSchedule(false); setShowShare(v => !v); }}
            onSchedule={()  => { setShowSave(false); setShowExport(false); setShowShare(false); setShowSchedule(v => !v); }}
          />
        }
      />

      <ReportFamilyNav current="verification" />

      {toast ? (
        <div role="status" aria-live="polite" style={{ ...GF, fontSize: 12, background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 6, padding: "7px 12px", marginBottom: 12 }}>
          {toast} <button onClick={() => setToast("")} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#15803D", marginLeft: 8 }}>Dismiss</button>
        </div>
      ) : null}

      {showSave     && <CreateSavedViewPanel family="verification" onClose={() => setShowSave(false)} onCreate={handleSave} />}
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
      <MetricGrid cards={data.summary} cols={3} />

      {/* Coverage metric */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <SectionCard style={{ marginBottom: 0 }}>
          <MetricCard card={data.coverageMetric} />
        </SectionCard>

        {/* Outcome trend */}
        <SectionCard style={{ marginBottom: 0 }}>
          <TimeSeriesChart series={data.outcomeTrend} />
        </SectionCard>
      </div>

      {/* Outcome distribution */}
      <SectionCard>
        <DistributionChart dist={data.outcomeDistribution} />
      </SectionCard>

      {/* File match distribution */}
      <SectionCard>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 8, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, padding: "7px 10px" }}>
          File match direction is a simulated demonstration output only. No actual file content, hash, or signature was compared.
        </div>
        <DistributionChart dist={data.matchDistribution} />
      </SectionCard>

      {/* Detail table */}
      <SectionCard>
        <SectionDivider label="Verification Records" />
        <ReportTable table={data.detailTable} />
        <p style={{ ...GF, fontSize: 11, color: SLATE, marginTop: 8 }}>
          <a href="/app/verify" style={{ color: "#0078D4" }}>Open Verification page</a> to check individual document authenticity.
        </p>
      </SectionCard>
    </main>
  );
}
