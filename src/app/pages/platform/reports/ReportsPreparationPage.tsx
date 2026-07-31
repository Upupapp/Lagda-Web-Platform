// Bulk Send Preparation Report — /app/reports/preparation
// Gap Closure Command 5. Frontend demonstration only. No eNotary. No Burgundy.
//
// Registered as a sixth report FAMILY through the existing Reports architecture:
// same query, date range, saved views, export preview, share preview, schedule
// preview, family navigation and restricted state as the five launch families.
// No second reporting surface is created.
//
// AVAILABILITY: unlike the launch families, this page is gated on the Bulk Send
// capability as well as `view_reports`. A user in a profile without Bulk Send
// gets the standard unavailable state, not an empty report.
//
// RECIPIENT DATA: every value on this page comes from the shared platform
// projection, which carries batch names, status labels and counts only. Recipient
// names, email addresses, organizations, Contact records, Contact Group
// membership, uploaded file contents and pasted values are structurally absent —
// they cannot be exported, shared, or scheduled from here because they are never
// in the data.

import { useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import { usePlatform } from "../../../context/PlatformContext";
import { reportingService } from "../../../services/mock/reporting.service";
import { DEFAULT_REPORT_QUERY } from "../../../models/reports";
import type { ReportDatePreset } from "../../../models/reports";
import { CapabilityUnavailable } from "../../../components/platform/CapabilityUnavailable";
import {
  GF, NAVY, SLATE,
  DemoBanner, ReportFamilyNav, ReportsRestricted,
  ReportPageHeader, DatePresetSelector, DataQualityNotices,
  MetricGrid, SectionCard, ReportTable,
  ReportActionToolbar, SectionDivider,
  ExportPreviewPanel, SharePreviewPanel, SchedulePreviewPanel,
  CreateSavedViewPanel,
} from "./ReportsShared";

export function ReportsPreparationPage() {
  const { hasPermission, hasFlag, resolveCapability } = usePlatform();
  const [params]  = useSearchParams();
  const [showExport,   setShowExport]   = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSave,     setShowSave]     = useState(false);
  const [toast,        setToast]        = useState("");

  const canView = hasPermission("view_reports") && hasFlag("reportsEnabled");
  const cap     = resolveCapability("bulk-send");

  const datePreset = (params.get("datePreset") as ReportDatePreset) ?? DEFAULT_REPORT_QUERY.datePreset;
  const query      = useMemo(() => ({ ...DEFAULT_REPORT_QUERY, datePreset }), [datePreset]);
  const data       = useMemo(() => reportingService.getPreparationReport(query), [query]);
  const notices    = reportingService.getDataQualityNotices("preparation");
  const exportPrev = useMemo(() => reportingService.getExportPreview("preparation", query), [query]);
  const sharePrev  = reportingService.getSharePreview("preparation");
  const schedPrev  = reportingService.getSchedulePreview("preparation");
  const dateRange  = useMemo(() => reportingService.computeDateRange(datePreset), [datePreset]);

  function handleSave(name: string) {
    const res = reportingService.createSavedView({ name, family: "preparation", datePreset, filters: {} });
    if (res.ok) { setToast(`Saved view "${name}" created.`); setShowSave(false); }
  }

  // Permission first, then capability — a user without `view_reports` should be
  // told that, not told the feature is unavailable.
  if (!canView) return <ReportsRestricted />;
  if (!cap.available) {
    return (
      <CapabilityUnavailable
        outcome={cap.outcome}
        reasonLabel={cap.reasonLabel}
        safeFallbackRoute="/app/reports"
        title="Bulk Send Preparation Report Not Available"
      />
    );
  }

  return (
    <main aria-label="Bulk Send preparation report" style={{ ...GF, maxWidth: 1100, margin: "0 auto" }}>
      <ReportPageHeader
        title="Bulk Send Preparation"
        description="Batch readiness, recipient-row counts, validation-issue direction, and recipient-source mix. No recipient identity is reported."
        family="preparation"
        actions={
          <ReportActionToolbar
            onSave={()      => { setShowExport(false); setShowShare(false); setShowSchedule(false); setShowSave(true); }}
            onExport={()    => { setShowSave(false); setShowShare(false); setShowSchedule(false); setShowExport(v => !v); }}
            onShare={()     => { setShowSave(false); setShowExport(false); setShowSchedule(false); setShowShare(v => !v); }}
            onSchedule={()  => { setShowSave(false); setShowExport(false); setShowShare(false); setShowSchedule(v => !v); }}
          />
        }
      />

      <ReportFamilyNav current="preparation" />

      {toast ? (
        <div role="status" aria-live="polite" style={{ ...GF, fontSize: 12, background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 6, padding: "7px 12px", marginBottom: 12 }}>
          {toast} <button onClick={() => setToast("")} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#15803D", marginLeft: 8 }}>Dismiss</button>
        </div>
      ) : null}

      {showSave     && <CreateSavedViewPanel family="preparation" onClose={() => setShowSave(false)} onCreate={handleSave} />}
      {showExport   && <ExportPreviewPanel   preview={exportPrev} onClose={() => setShowExport(false)}   />}
      {showShare    && <SharePreviewPanel    preview={sharePrev}  onClose={() => setShowShare(false)}    />}
      {showSchedule && <SchedulePreviewPanel preview={schedPrev}  onClose={() => setShowSchedule(false)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <DatePresetSelector />
        <span style={{ ...GF, fontSize: 12, color: "#6B7280" }}>Period: <strong>{dateRange.label}</strong></span>
      </div>

      <DemoBanner />

      {/* Recipient-data boundary — stated before any table is read, not buried
          beneath one. */}
      <div
        role="note"
        style={{
          ...GF, fontSize: 12, color: SLATE, background: "#F8FAFC",
          border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", marginBottom: 14,
        }}
      >
        {data.recipientDataNote}
      </div>

      <DataQualityNotices notices={notices} />

      {/* Readiness summary */}
      <SectionCard>
        <h2 style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, margin: "0 0 14px" }}>Preparation Readiness</h2>
        <MetricGrid cards={data.readinessSummary} cols={5} />
      </SectionCard>

      {/* Batch readiness */}
      <SectionCard>
        <SectionDivider label="Batch Readiness" />
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 12px" }}>
          Preparation state per batch. A batch that is ready for review has not been sent —
          Bulk Send creates frontend Draft Projections only.
        </p>
        <ReportTable table={data.batchTable} />
      </SectionCard>

      {/* Source mix */}
      <SectionCard>
        <SectionDivider label="Recipient Source Mix" />
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 12px" }}>
          How batches were populated, by count. No Contact, Contact Group member, uploaded file,
          or pasted value is identified.
        </p>
        <ReportTable table={data.sourceMix} />
      </SectionCard>

      {/* Detail */}
      <SectionCard>
        <SectionDivider label="Preparation Detail" />
        <ReportTable table={data.detailTable} />
      </SectionCard>
    </main>
  );
}
