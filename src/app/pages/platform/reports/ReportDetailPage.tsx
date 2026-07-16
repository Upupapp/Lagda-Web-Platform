// Report Detail — /app/reports/:reportId (saved view detail)
// Command 29. Validates reportId against saved-view registry. No credential grant.
// No Burgundy. No eNotary.

import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router";
import { BookMarked, ChevronLeft, Clock } from "lucide-react";
import { usePlatform } from "../../../context/PlatformContext";
import { reportingService } from "../../../services/mock/reporting.service";
import type { ReportViewId, ReportDatePreset } from "../../../models/reports";
import { REPORT_FAMILY_LABELS, REPORT_DATE_PRESET_LABELS } from "../../../models/reports";
import {
  GF, NAVY, AZURE, SLATE, SILVER, GOLD,
  DemoBanner, ReportFamilyNav, ReportsRestricted, ReportPageHeader,
  DataQualityNotices, MetricGrid, SectionCard, DistributionChart,
  TimeSeriesChart, ReportTable, SectionDivider, FamilyIcon,
} from "./ReportsShared";

function isValidReportId(id: string): boolean {
  return /^sv_[a-zA-Z0-9_]+$/.test(id);
}

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { hasPermission, hasFlag } = usePlatform();

  const canView = hasPermission("view_reports") && hasFlag("reportsEnabled");

  const result = useMemo(() => {
    if (!reportId || !isValidReportId(reportId)) return null;
    const r = reportingService.getSavedView(reportId as ReportViewId);
    return r.ok ? r.data : null;
  }, [reportId]);

  const reportData = useMemo(() => {
    if (!result) return null;
    const query = {
      datePreset: result.datePreset as ReportDatePreset,
      page: 1,
      ...result.filters,
    };
    switch (result.family) {
      case "documents":    return { family: result.family, data: reportingService.getDocumentOperationsReport(query) };
      case "participants": return { family: result.family, data: reportingService.getParticipantReport(query) };
      case "templates":    return { family: result.family, data: reportingService.getTemplateReport(query) };
      case "verification": return { family: result.family, data: reportingService.getVerificationReport(query) };
      case "teams":        return { family: result.family, data: reportingService.getTeamActivityReport(query) };
    }
  }, [result]);

  if (!canView) return <ReportsRestricted />;

  // Invalid or unrecognised report ID
  if (!reportId || !isValidReportId(reportId) || !result) {
    return (
      <main aria-label="Report not found" style={{ ...GF, maxWidth: 1100, margin: "0 auto", textAlign: "center", padding: "60px 24px" }}>
        <BookMarked size={36} style={{ color: SILVER, marginBottom: 16 }} aria-hidden />
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Saved View Not Found</h1>
        <p style={{ ...GF, fontSize: 14, color: SLATE, maxWidth: 400, margin: "0 auto 24px" }}>
          The report ID in this URL does not match a saved view in the demonstration. It may have been removed or the link may be outdated.
        </p>
        <Link to="/app/reports/saved" style={{ ...GF, fontSize: 13, color: AZURE, textDecorationLine: "none", fontWeight: 500 }}>
          ← View all saved views
        </Link>
      </main>
    );
  }

  const notices = reportingService.getDataQualityNotices(result.family);
  const dateRange = reportingService.computeDateRange(result.datePreset);

  return (
    <main aria-labelledby="detail-title" style={{ ...GF, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/app/reports/saved"
          style={{ ...GF, fontSize: 12, color: AZURE, textDecorationLine: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}
        >
          <ChevronLeft size={13} aria-hidden /> Saved Views
        </Link>
      </div>

      <ReportPageHeader
        title={result.name}
        description={`${REPORT_FAMILY_LABELS[result.family]} · ${dateRange.label}`}
        family={result.family}
      />

      <ReportFamilyNav current={result.family} />

      {/* Saved view metadata */}
      <SectionCard>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FamilyIcon family={result.family} size={14} color={AZURE} />
            <span style={{ ...GF, fontSize: 13, color: NAVY, fontWeight: 500 }}>{REPORT_FAMILY_LABELS[result.family]}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} style={{ color: SILVER }} aria-hidden />
            <span style={{ ...GF, fontSize: 12, color: SLATE }}>{REPORT_DATE_PRESET_LABELS[result.datePreset]}</span>
          </div>
          {result.isDefault && (
            <span style={{ ...GF, fontSize: 10, background: "#FEF3C7", color: "#92400E", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>Default view</span>
          )}
          {result.annotation && (
            <div style={{ width: "100%", ...GF, fontSize: 12, color: SLATE, fontStyle: "italic", background: "#F8FAFC", borderRadius: 6, padding: "6px 10px" }}>
              "{result.annotation}"
            </div>
          )}
        </div>
      </SectionCard>

      <DemoBanner />
      <DataQualityNotices notices={notices} />

      {/* Render family-specific report data */}
      {reportData?.family === "documents" && (() => {
        const d = reportData.data as ReturnType<typeof reportingService.getDocumentOperationsReport>;
        return (
          <>
            <MetricGrid cols={3} cards={[d.completionRate, d.completionTime, d.awaitingAction, d.expiringCount, d.deliveryIssues, d.evidenceAvailability]} />
            <SectionCard><TimeSeriesChart series={d.volumeTrend} /></SectionCard>
            <SectionCard><DistributionChart dist={d.statusDistribution} /></SectionCard>
            <SectionCard><ReportTable table={d.detailTable} /></SectionCard>
          </>
        );
      })()}

      {reportData?.family === "participants" && (() => {
        const d = reportData.data as ReturnType<typeof reportingService.getParticipantReport>;
        return (
          <>
            <SectionCard><DistributionChart dist={d.roleDistribution} /></SectionCard>
            <MetricGrid cols={3} cards={d.routingStageSummary} />
            <SectionCard><DistributionChart dist={d.authMethodDistribution} /></SectionCard>
            <SectionCard><ReportTable table={d.detailTable} /></SectionCard>
          </>
        );
      })()}

      {reportData?.family === "templates" && (() => {
        const d = reportData.data as ReturnType<typeof reportingService.getTemplateReport>;
        return (
          <>
            <MetricGrid cols={3} cards={[...d.summary, d.placeholderSummary]} />
            <SectionCard><TimeSeriesChart series={d.usageTrend} /></SectionCard>
            <SectionCard><DistributionChart dist={d.statusDistribution} /></SectionCard>
            <SectionCard><ReportTable table={d.detailTable} /></SectionCard>
          </>
        );
      })()}

      {reportData?.family === "verification" && (() => {
        const d = reportData.data as ReturnType<typeof reportingService.getVerificationReport>;
        return (
          <>
            <MetricGrid cols={3} cards={d.summary} />
            <SectionCard><DistributionChart dist={d.outcomeDistribution} /></SectionCard>
            <SectionCard><DistributionChart dist={d.matchDistribution} /></SectionCard>
            <SectionCard><ReportTable table={d.detailTable} /></SectionCard>
          </>
        );
      })()}

      {reportData?.family === "teams" && (() => {
        const d = reportData.data as ReturnType<typeof reportingService.getTeamActivityReport>;
        return (
          <>
            <MetricGrid cols={5} cards={d.workspaceSummary} />
            <SectionCard><ReportTable table={d.teamComparison} /></SectionCard>
            <SectionCard><ReportTable table={d.senderActivity} /></SectionCard>
            <SectionCard>
              <div style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 8, padding: "6px 10px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6 }}>
                {d.memberActivityNote}
              </div>
              <ReportTable table={d.detailTable} />
            </SectionCard>
          </>
        );
      })()}

      <div style={{ marginTop: 20 }}>
        <Link
          to={`/app/reports/${result.family}`}
          style={{ ...GF, fontSize: 12, color: AZURE, textDecorationLine: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          Open full {REPORT_FAMILY_LABELS[result.family]} report →
        </Link>
      </div>
    </main>
  );
}
