// Participants & Routing Report — /app/reports/participants
// Command 29. Frontend demonstration only. No eNotary. No Burgundy.

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
  MetricGrid, SectionCard, DistributionChart, ReportTable,
  ReportActionToolbar, SectionDivider,
  ExportPreviewPanel, SharePreviewPanel, SchedulePreviewPanel,
  CreateSavedViewPanel,
} from "./ReportsShared";

export function ReportsParticipantsPage() {
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
  const data       = useMemo(() => reportingService.getParticipantReport(query), [query]);
  const notices    = reportingService.getDataQualityNotices("participants");
  const exportPrev = useMemo(() => reportingService.getExportPreview("participants", query), [query]);
  const sharePrev  = reportingService.getSharePreview("participants");
  const schedPrev  = reportingService.getSchedulePreview("participants");
  const dateRange  = useMemo(() => reportingService.computeDateRange(datePreset), [datePreset]);

  function handleSave(name: string) {
    const res = reportingService.createSavedView({ name, family: "participants", datePreset, filters: {} });
    if (res.ok) { setToast(`Saved view "${name}" created.`); setShowSave(false); }
  }

  if (!canView) return <ReportsRestricted />;

  return (
    <main aria-label="Participants and routing report" style={{ ...GF, maxWidth: 1100, margin: "0 auto" }}>
      <ReportPageHeader
        title="Participants & Routing"
        description="Role distribution, routing-stage direction, authentication methods, consent, and field completion."
        family="participants"
        actions={
          <ReportActionToolbar
            onSave={()      => { setShowExport(false); setShowShare(false); setShowSchedule(false); setShowSave(true); }}
            onExport={()    => { setShowSave(false); setShowShare(false); setShowSchedule(false); setShowExport(v => !v); }}
            onShare={()     => { setShowSave(false); setShowExport(false); setShowSchedule(false); setShowShare(v => !v); }}
            onSchedule={()  => { setShowSave(false); setShowExport(false); setShowShare(false); setShowSchedule(v => !v); }}
          />
        }
      />

      <ReportFamilyNav current="participants" />

      {toast ? (
        <div role="status" aria-live="polite" style={{ ...GF, fontSize: 12, background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 6, padding: "7px 12px", marginBottom: 12 }}>
          {toast} <button onClick={() => setToast("")} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#15803D", marginLeft: 8 }}>Dismiss</button>
        </div>
      ) : null}

      {showSave     && <CreateSavedViewPanel family="participants" onClose={() => setShowSave(false)} onCreate={handleSave} />}
      {showExport   && <ExportPreviewPanel   preview={exportPrev} onClose={() => setShowExport(false)}   />}
      {showShare    && <SharePreviewPanel    preview={sharePrev}  onClose={() => setShowShare(false)}    />}
      {showSchedule && <SchedulePreviewPanel preview={schedPrev}  onClose={() => setShowSchedule(false)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <DatePresetSelector />
        <span style={{ ...GF, fontSize: 12, color: "#6B7280" }}>Period: <strong>{dateRange.label}</strong></span>
      </div>

      <DemoBanner />
      <DataQualityNotices notices={notices} />

      {/* Note about participant privacy */}
      <div role="note" style={{ ...GF, fontSize: 12, color: SLATE, background: "#F8FAFC", borderRadius: 6, padding: "8px 12px", marginBottom: 16, border: "1px solid #E2E8F0" }}>
        Participant names are not included in aggregate reports. Authentication evidence and field values are excluded.
      </div>

      {/* Role distribution */}
      <SectionCard>
        <DistributionChart dist={data.roleDistribution} />
      </SectionCard>

      {/* Role outcomes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {data.roleOutcomes.map(d => (
          <SectionCard key={d.id} style={{ marginBottom: 0 }}>
            <DistributionChart dist={d} />
          </SectionCard>
        ))}
      </div>

      {/* Routing stage summary */}
      <SectionCard>
        <h3 style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, margin: "0 0 14px" }}>Routing Stage Summary</h3>
        <MetricGrid cards={data.routingStageSummary} cols={3} />
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>{data.bottleneckDirection}</p>
      </SectionCard>

      {/* Authentication method distribution */}
      <SectionCard>
        <DistributionChart dist={data.authMethodDistribution} />
      </SectionCard>

      {/* Consent + field completion metrics */}
      <SectionCard>
        <SectionDivider label="Consent & Field Completion" />
        <MetricGrid cards={[...data.consentMetrics, ...data.fieldCompletionMetrics]} cols={4} />
      </SectionCard>

      {/* Role summary table */}
      <SectionCard>
        <ReportTable table={data.detailTable} />
      </SectionCard>
    </main>
  );
}
