// Shared UI components for the Reports Center (Command 29).
// Used by all 8 report pages. No external chart library.
// No Burgundy (#67023B). No eNotary metrics.

import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { isCapabilityInActiveProfile } from "../../../config/capability-resolver";
import {
  BarChart2, FileText, Users, Files, ShieldCheck, Building2, Send,
  BookMarked, ChevronRight, Info, AlertTriangle, Clock, Calendar,
  Download, Share2, CalendarClock, PenLine, X,
  CheckCircle2, Archive, RotateCcw, Trash2, Copy, Star,
} from "lucide-react";
import type {
  ReportMetricCard, ReportDistribution, ReportTimeSeries,
  ReportTable, ReportDataQualityNotice, ReportDatePreset,
  ReportSavedView, ReportExportPreview, ReportSharePreview,
  ReportSchedulePreview, ReportFamily,
} from "../../../models/reports";
import {
  REPORT_FAMILY_LABELS, REPORT_FAMILY_DESCRIPTIONS,
  REPORT_FAMILY_PATHS, REPORT_DATE_PRESET_LABELS, VALID_DATE_PRESETS,
} from "../../../models/reports";

// ── Design tokens ──────────────────────────────────────────────────────────────
export const GF     = { fontFamily: "'Geist', 'Inter', system-ui, sans-serif" };
export const GM     = { fontFamily: "'Geist Mono', 'Fira Code', monospace" };
export const NAVY   = "#07111F";
export const AZURE  = "#0078D4";
export const SLATE  = "#64748B";
export const SILVER = "#8A9BAE";
export const GOLD   = "#C9960C";
export const GREEN  = "#16A34A";
export const RED    = "#DC2626";
export const AMBER  = "#D97706";
export const VIOLET = "#7C3AED";

export const DIST_COLORS: Record<string, string> = {
  azure:  AZURE, navy:  NAVY,  slate: SLATE, green: GREEN,
  amber:  AMBER, red:   RED,   gold:  GOLD,  violet:VIOLET,
};

// ── Demo disclaimer banner ────────────────────────────────────────────────────

export function DemoBanner() {
  return (
    <div
      role="note"
      style={{
        background: "#EFF6FF", border: "1px solid #BFDBFE",
        borderRadius: 8, padding: "10px 14px",
        ...GF, fontSize: 12, color: "#1D4ED8",
        display: "flex", alignItems: "flex-start", gap: 8,
        marginBottom: 20,
      }}
    >
      <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} aria-hidden />
      <span>
        <strong>Demonstration data only.</strong> All metrics, charts, and tables show fictional
        frontend demonstration values. This is not a live reporting system and values do not
        reflect real operational data. Production reporting requires backend integration.
      </span>
    </div>
  );
}

// ── Member privacy notice ─────────────────────────────────────────────────────

export function MemberPrivacyNotice() {
  return (
    <div
      role="note"
      aria-label="Member reporting notice"
      style={{
        background: "#FFFBEB", border: "1px solid #FDE68A",
        borderRadius: 8, padding: "10px 14px",
        ...GF, fontSize: 12, color: "#92400E",
        display: "flex", alignItems: "flex-start", gap: 8,
        marginBottom: 20,
      }}
    >
      <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} aria-hidden />
      <span>
        Member-level information is limited to operational workflow direction and should not be
        interpreted as a productivity, trust, identity, or legal-quality score.
      </span>
    </div>
  );
}

// ── Data quality notices ──────────────────────────────────────────────────────

export function DataQualityNotices({ notices }: { notices: ReportDataQualityNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <ul style={{ listStyle: "none", margin: "0 0 20px", padding: 0, display: "flex", flexDirection: "column", gap: 6 }} aria-label="Data quality notices">
      {notices.map(n => (
        <li
          key={n.id}
          style={{
            ...GF, fontSize: 12, padding: "8px 12px",
            borderRadius: 6,
            background: n.level === "warning" ? "#FFFBEB" : n.level === "error" ? "#FEF2F2" : "#F0F9FF",
            color:      n.level === "warning" ? "#92400E"  : n.level === "error" ? "#991B1B"  : "#0C4A6E",
            border: `1px solid ${n.level === "warning" ? "#FDE68A" : n.level === "error" ? "#FECACA" : "#BAE6FD"}`,
            display: "flex", alignItems: "flex-start", gap: 6,
          }}
        >
          <Info size={12} style={{ marginTop: 1, flexShrink: 0 }} aria-hidden />
          <span>
            <strong>{n.message}</strong>
            {n.detail ? ` — ${n.detail}` : null}
            {n.linkTo ? <> <Link to={n.linkTo} style={{ color: "inherit", textDecorationLine: "underline" }}>View</Link></> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Family icon ───────────────────────────────────────────────────────────────

export function FamilyIcon({ family, size = 16, color }: { family: ReportFamily; size?: number; color?: string }) {
  const c = color ?? AZURE;
  switch (family) {
    case "documents":    return <FileText   size={size} style={{ color: c }} aria-hidden />;
    case "participants": return <Users       size={size} style={{ color: c }} aria-hidden />;
    case "templates":    return <Files       size={size} style={{ color: c }} aria-hidden />;
    case "verification": return <ShieldCheck size={size} style={{ color: c }} aria-hidden />;
    case "teams":        return <Building2   size={size} style={{ color: c }} aria-hidden />;
    case "preparation":  return <Send        size={size} style={{ color: c }} aria-hidden />;
  }
}

// ── Available report families ─────────────────────────────────────────────────

/**
 * The five launch families are always listed. `preparation` (Bulk Send) is
 * availability-gated the same way the Saved Views tab is: omitted entirely rather
 * than rendered as a tab that leads to a capability-unavailable page.
 *
 * Exported so the Overview page and the family nav cannot drift apart — one list,
 * one gate.
 */
export function availableReportFamilies(): ReportFamily[] {
  const families: ReportFamily[] = ["documents", "participants", "templates", "verification", "teams"];
  if (isCapabilityInActiveProfile("bulk-send")) families.push("preparation");
  return families;
}

// ── Report family navigation tabs ─────────────────────────────────────────────

export function ReportFamilyNav({ current }: { current: ReportFamily | "overview" | "saved" }) {
  const families = availableReportFamilies();
  return (
    <nav aria-label="Report sections" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 24 }}>
      <Link
        to="/app/reports"
        aria-current={current === "overview" ? "page" : undefined}
        style={{
          ...GF, fontSize: 13, fontWeight: 500, textDecorationLine: "none",
          padding: "6px 12px", borderRadius: 6,
          background: current === "overview" ? NAVY : "transparent",
          color: current === "overview" ? "#fff" : SLATE,
          border: `1px solid ${current === "overview" ? NAVY : "#E2E8F0"}`,
          display: "flex", alignItems: "center", gap: 5,
        }}
      >
        <BarChart2 size={13} aria-hidden />
        Overview
      </Link>
      {families.map(f => (
        <Link
          key={f}
          to={REPORT_FAMILY_PATHS[f]}
          aria-current={current === f ? "page" : undefined}
          style={{
            ...GF, fontSize: 13, fontWeight: 500, textDecorationLine: "none",
            padding: "6px 12px", borderRadius: 6,
            background: current === f ? AZURE : "transparent",
            color: current === f ? "#fff" : SLATE,
            border: `1px solid ${current === f ? AZURE : "#E2E8F0"}`,
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <FamilyIcon family={f} size={13} color={current === f ? "#fff" : AZURE} />
          {REPORT_FAMILY_LABELS[f]}
        </Link>
      ))}
      {/* Saved report views are advanced-reports (post-launch). Omitted rather than
          rendered as a tab that leads to a capability-unavailable page. */}
      {isCapabilityInActiveProfile("advanced-reports") && (
        <Link
          to="/app/reports/saved"
          aria-current={current === "saved" ? "page" : undefined}
          style={{
            ...GF, fontSize: 13, fontWeight: 500, textDecorationLine: "none",
            padding: "6px 12px", borderRadius: 6,
            background: current === "saved" ? GOLD : "transparent",
            color: current === "saved" ? "#fff" : SLATE,
            border: `1px solid ${current === "saved" ? GOLD : "#E2E8F0"}`,
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <BookMarked size={13} aria-hidden />
          Saved Views
        </Link>
      )}
    </nav>
  );
}

// ── Date preset selector ──────────────────────────────────────────────────────

export function DatePresetSelector() {
  const [params, setParams] = useSearchParams();
  const current = (params.get("datePreset") as ReportDatePreset) ?? "last-30-days";

  function select(p: ReportDatePreset) {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("datePreset", p);
      // clear custom date params when switching to non-custom
      if (p !== "custom") { next.delete("dateFrom"); next.delete("dateTo"); }
      return next;
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }} role="group" aria-label="Date range">
      <span style={{ ...GF, fontSize: 12, color: SILVER, display: "flex", alignItems: "center", gap: 4 }}>
        <Calendar size={12} aria-hidden />
        Period:
      </span>
      {VALID_DATE_PRESETS.filter(p => p !== "custom").map(p => (
        <button
          key={p}
          onClick={() => select(p)}
          aria-pressed={current === p}
          style={{
            ...GF, fontSize: 12, border: "1px solid", borderRadius: 5,
            padding: "3px 8px", cursor: "pointer",
            background: current === p ? AZURE : "#F8FAFC",
            color:      current === p ? "#fff" : SLATE,
            borderColor:current === p ? AZURE : "#E2E8F0",
          }}
        >
          {REPORT_DATE_PRESET_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

export function MetricCard({ card, compact = false }: { card: ReportMetricCard; compact?: boolean }) {
  const [showNotice, setShowNotice] = useState(false);
  return (
    <article
      aria-label={card.label}
      style={{
        background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
        padding: compact ? "14px 16px" : "18px 20px",
      }}
    >
      <div style={{ ...GF, fontSize: 12, color: SILVER, fontWeight: 500, marginBottom: 4 }}>
        {card.label}
        {card.notice ? (
          <button
            onClick={() => setShowNotice(v => !v)}
            aria-label={`Notice about ${card.label}`}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px", verticalAlign: "middle" }}
          >
            <Info size={11} style={{ color: SILVER }} aria-hidden />
          </button>
        ) : null}
      </div>
      <div style={{ ...GF, fontSize: compact ? 22 : 28, fontWeight: 700, color: NAVY, lineHeight: 1.1, marginBottom: 4 }}>
        {card.isUnavailable   ? <span style={{ color: SILVER, fontSize: 16 }}>Unavailable</span>
        : card.isInsufficient ? <span style={{ color: SILVER, fontSize: 16 }}>Insufficient data</span>
        : card.value}
      </div>
      {card.denominator ? (
        <div style={{ ...GF, fontSize: 11, color: SILVER, marginBottom: 4 }}>{card.denominator}</div>
      ) : null}
      {card.trend ? (
        <div
          aria-label={card.trend.label}
          style={{
            ...GF, fontSize: 11, color:
              card.trend.direction === "increase" ? GREEN :
              card.trend.direction === "decrease" ? RED :
              card.trend.direction === "unchanged" ? SLATE : SILVER,
            display: "flex", alignItems: "center", gap: 3,
          }}
        >
          {card.trend.direction === "increase" ? "↑" :
           card.trend.direction === "decrease" ? "↓" :
           card.trend.direction === "unchanged" ? "→" : "—"}
          {" "}{card.trend.label}
          <span style={{ color: SILVER, fontSize: 10 }}>({card.trend.comparedTo})</span>
        </div>
      ) : null}
      {showNotice && card.notice ? (
        <div style={{ ...GF, fontSize: 11, color: SLATE, marginTop: 6, background: "#F8FAFC", borderRadius: 5, padding: "5px 7px" }}>
          {card.notice}
        </div>
      ) : null}
    </article>
  );
}

// ── Metric grid ────────────────────────────────────────────────────────────────

export function MetricGrid({ cards, cols = 3 }: { cards: ReportMetricCard[]; cols?: number }) {
  return (
    <div
      role="list"
      aria-label="Summary metrics"
      style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12, marginBottom: 24 }}
    >
      {cards.map(c => (
        <div role="listitem" key={c.id}><MetricCard card={c} compact /></div>
      ))}
    </div>
  );
}

// ── Distribution bar chart ─────────────────────────────────────────────────────

export function DistributionChart({ dist }: { dist: ReportDistribution }) {
  return (
    <section aria-labelledby={`dist-title-${dist.id}`} style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 id={`dist-title-${dist.id}`} style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, margin: 0 }}>
          {dist.title}
        </h3>
        <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "2px 0 0" }}>{dist.description}</p>
      </div>
      <div role="img" aria-label={dist.textSummary}>
        {dist.items.map(item => (
          <div key={item.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ ...GF, fontSize: 12, color: NAVY, fontWeight: 500 }}>{item.label}</span>
              <span style={{ ...GM, fontSize: 11, color: SLATE }}>
                {item.count} <span style={{ color: SILVER }}>({item.percentage}%)</span>
              </span>
            </div>
            <div style={{ background: "#F1F5F9", borderRadius: 4, height: 10, overflow: "hidden" }}>
              <div
                aria-hidden
                style={{
                  width: `${item.percentage}%`,
                  height: "100%",
                  background: DIST_COLORS[item.colorClass] ?? SLATE,
                  borderRadius: 4,
                  transition: "width 0.35s ease",
                  minWidth: item.percentage > 0 ? 4 : 0,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 4 }}>{dist.textSummary}</p>
      <p style={{ ...GF, fontSize: 10, color: SILVER, marginTop: 2 }}>{dist.denominatorNote}</p>
    </section>
  );
}

// ── Time series chart ─────────────────────────────────────────────────────────

export function TimeSeriesChart({ series }: { series: ReportTimeSeries }) {
  const maxHeight = 60;
  return (
    <section aria-labelledby={`ts-title-${series.id}`} style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 id={`ts-title-${series.id}`} style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, margin: 0 }}>
          {series.title}
        </h3>
      </div>
      <div
        role="img"
        aria-label={series.textSummary}
        style={{
          display: "flex", alignItems: "flex-end", gap: 6,
          padding: "12px 0 0", borderBottom: `1px solid #E2E8F0`,
          height: maxHeight + 20,
        }}
      >
        {series.points.map(pt => {
          const h = series.maxValue === 0 ? 0 : Math.max(4, Math.round((pt.count / series.maxValue) * maxHeight));
          return (
            <div key={pt.isoDate} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <span style={{ ...GF, fontSize: 10, color: SLATE, marginBottom: 3 }}>{pt.count}</span>
              <div
                aria-hidden
                title={`${pt.period}: ${pt.count} ${series.unit}`}
                style={{
                  width: "100%", height: h, background: AZURE, borderRadius: "3px 3px 0 0",
                  minHeight: pt.count > 0 ? 4 : 0,
                  opacity: 0.85,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {series.points.map(pt => (
          <div key={pt.isoDate} style={{ flex: 1, textAlign: "center" }}>
            <time dateTime={pt.isoDate} style={{ ...GF, fontSize: 9, color: SILVER, display: "block" }}>{pt.period}</time>
          </div>
        ))}
      </div>
      <p style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 6 }}>{series.textSummary}</p>
    </section>
  );
}

// ── Report table ──────────────────────────────────────────────────────────────

export function ReportTable({ table }: { table: ReportTable }) {
  return (
    <section aria-labelledby={`tbl-title-${table.id}`} style={{ marginBottom: 24 }}>
      <h3 id={`tbl-title-${table.id}`} style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, margin: "0 0 10px" }}>
        {table.title}
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table
          aria-labelledby={`tbl-title-${table.id}`}
          style={{ width: "100%", borderCollapse: "collapse", ...GF, fontSize: 13 }}
        >
          <thead>
            <tr>
              {table.columns.map(col => (
                <th
                  key={col.id}
                  scope="col"
                  style={{
                    textAlign: "left", padding: "6px 12px",
                    background: "#F8FAFC", color: SLATE,
                    fontWeight: 600, fontSize: 11,
                    borderBottom: "1px solid #E2E8F0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr>
                <td colSpan={table.columns.length} style={{ padding: "24px 12px", textAlign: "center", color: SILVER }}>
                  No data in this demonstration period.
                </td>
              </tr>
            ) : table.rows.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                {table.columns.map((col, ci) => {
                  const val = row.cells[col.id];
                  const cell = (
                    <td
                      key={col.id}
                      style={{ padding: "8px 12px", borderBottom: "1px solid #F1F5F9", color: NAVY, verticalAlign: "middle" }}
                    >
                      {ci === 0 && row.linkTo ? (
                        <Link to={row.linkTo} style={{ color: AZURE, textDecorationLine: "none", fontWeight: 500 }}>
                          {val ?? "—"}
                        </Link>
                      ) : (
                        <span>{val ?? "—"}</span>
                      )}
                    </td>
                  );
                  return cell;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 6 }}>{table.textSummary}</p>
    </section>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

export function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E8F0",
      borderRadius: 12, padding: "20px 24px",
      marginBottom: 20, ...style,
    }}>
      {children}
    </div>
  );
}

// ── Restricted state ──────────────────────────────────────────────────────────

export function ReportsRestricted() {
  return (
    <div style={{ ...GF, textAlign: "center", padding: "60px 24px", color: SLATE }}>
      <ShieldCheck size={40} style={{ color: SILVER, marginBottom: 16 }} aria-hidden />
      <h2 style={{ ...GF, fontSize: 18, fontWeight: 600, color: NAVY, marginBottom: 8 }}>
        Reports Not Available
      </h2>
      <p style={{ ...GF, fontSize: 14, color: SLATE, maxWidth: 420, margin: "0 auto 20px" }}>
        Your current workspace role does not include the <code>view_reports</code> permission.
        Contact your Workspace Owner or Administrator to request access.
      </p>
      <Link
        to="/app/dashboard"
        style={{ ...GF, fontSize: 13, color: AZURE, textDecorationLine: "none", fontWeight: 500 }}
      >
        ← Return to Dashboard
      </Link>
    </div>
  );
}

// ── Report page header ────────────────────────────────────────────────────────

export function ReportPageHeader({
  title, description, family, actions,
}: {
  title: string;
  description: string;
  family?: ReportFamily;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {family ? <FamilyIcon family={family} size={18} color={NAVY} /> : <BarChart2 size={18} style={{ color: NAVY }} aria-hidden />}
          <h1 style={{ ...GF, fontSize: 20, fontWeight: 700, color: NAVY, margin: 0 }}>{title}</h1>
        </div>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>{description}</p>
      </div>
      {actions ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div> : null}
    </div>
  );
}

// ── Report action toolbar ─────────────────────────────────────────────────────

export function ReportActionToolbar({
  onExport, onShare, onSchedule, onSave,
}: {
  onExport?: () => void;
  onShare?:  () => void;
  onSchedule?: () => void;
  onSave?: () => void;
}) {
  const btnStyle: React.CSSProperties = {
    ...GF, fontSize: 12, border: "1px solid #E2E8F0",
    borderRadius: 6, padding: "5px 10px", cursor: "pointer",
    background: "#fff", color: SLATE,
    display: "flex", alignItems: "center", gap: 4,
  };
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {onSave     ? <button style={btnStyle} onClick={onSave}     aria-label="Save view"><BookMarked  size={13} aria-hidden /> Save View</button>    : null}
      {onExport   ? <button style={btnStyle} onClick={onExport}   aria-label="Export preview"><Download   size={13} aria-hidden /> Export</button>        : null}
      {onShare    ? <button style={btnStyle} onClick={onShare}    aria-label="Share preview"><Share2     size={13} aria-hidden /> Share</button>         : null}
      {onSchedule ? <button style={btnStyle} onClick={onSchedule} aria-label="Schedule preview"><CalendarClock size={13} aria-hidden /> Schedule</button> : null}
    </div>
  );
}

// ── Export preview panel ──────────────────────────────────────────────────────

export function ExportPreviewPanel({ preview, onClose }: { preview: ReportExportPreview; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
      style={{
        background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
        padding: 24, marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 id="export-title" style={{ ...GF, fontSize: 16, fontWeight: 600, color: NAVY, margin: 0 }}>
          Export Preview
        </h2>
        <button onClick={onClose} aria-label="Close export preview" style={{ background: "none", border: "none", cursor: "pointer" }}>
          <X size={16} style={{ color: SLATE }} aria-hidden />
        </button>
      </div>
      <div style={{ ...GF, fontSize: 13, color: NAVY, background: "#F0F9FF", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Export not available in this demonstration</p>
        <p style={{ margin: 0, color: SLATE }}>
          This preview shows what a future export would include. No file is generated, downloaded, or delivered.
        </p>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE, marginBottom: 4 }}>Date range: {preview.dateRange.label}</p>
        <p style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE, marginBottom: 4 }}>
          Estimated rows: <strong style={{ color: NAVY }}>{preview.estimatedRows}</strong>
        </p>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 4 }}>Columns included</p>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {preview.includedColumns.map(c => (
            <li key={c} style={{ ...GF, fontSize: 12, color: SLATE }}>{c}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ ...GF, fontSize: 12, fontWeight: 600, color: RED, marginBottom: 4 }}>Private fields always excluded</p>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {preview.excludedPrivateFields.map(f => (
            <li key={f} style={{ ...GF, fontSize: 12, color: SLATE }}>{f}</li>
          ))}
        </ul>
      </div>
      <p style={{ ...GF, fontSize: 11, color: SLATE, background: "#F8FAFC", borderRadius: 6, padding: "8px 10px", margin: 0 }}>
        {preview.privacyNotice}
      </p>
    </div>
  );
}

// ── Share preview panel ───────────────────────────────────────────────────────

export function SharePreviewPanel({ preview, onClose }: { preview: ReportSharePreview; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 id="share-title" style={{ ...GF, fontSize: 16, fontWeight: 600, color: NAVY, margin: 0 }}>Share Preview</h2>
        <button onClick={onClose} aria-label="Close share preview" style={{ background: "none", border: "none", cursor: "pointer" }}>
          <X size={16} style={{ color: SLATE }} aria-hidden />
        </button>
      </div>
      <div style={{ ...GF, fontSize: 13, color: NAVY, background: "#F0F9FF", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Share not available in this demonstration</p>
        <p style={{ margin: 0, color: SLATE }}>No link is generated or sent. This preview describes future sharing behavior.</p>
      </div>
      <div style={{ ...GF, fontSize: 12, display: "flex", flexDirection: "column", gap: 6, color: SLATE }}>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Scope:</strong> {preview.scope}</p>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Recipients:</strong> {preview.proposedRecipientCategory}</p>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Permission required:</strong> {preview.permissionRequired}</p>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Expiration:</strong> {preview.expirationDirection}</p>
        <p style={{ margin: 0 }}><strong style={{ color: RED }}>Excluded:</strong> {preview.dataExcluded.join(", ")}</p>
      </div>
    </div>
  );
}

// ── Schedule preview panel ────────────────────────────────────────────────────

export function SchedulePreviewPanel({ preview, onClose }: { preview: ReportSchedulePreview; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sched-title"
      style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 id="sched-title" style={{ ...GF, fontSize: 16, fontWeight: 600, color: NAVY, margin: 0 }}>Schedule Preview</h2>
        <button onClick={onClose} aria-label="Close schedule preview" style={{ background: "none", border: "none", cursor: "pointer" }}>
          <X size={16} style={{ color: SLATE }} aria-hidden />
        </button>
      </div>
      <div style={{ ...GF, fontSize: 13, color: NAVY, background: "#F0F9FF", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Scheduling not available in this demonstration</p>
        <p style={{ margin: 0, color: SLATE }}>No scheduled delivery is created. This preview describes future scheduling behavior.</p>
      </div>
      <div style={{ ...GF, fontSize: 12, display: "flex", flexDirection: "column", gap: 6, color: SLATE }}>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Frequency:</strong> {preview.frequencyDirection}</p>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Time zone:</strong> {preview.timeZoneDirection}</p>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Channel:</strong> {preview.channelDirection}</p>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Recipients:</strong> {preview.recipientDirection}</p>
        <p style={{ margin: 0 }}><strong style={{ color: NAVY }}>Permission required:</strong> {preview.permissionRequired}</p>
      </div>
    </div>
  );
}

// ── Create saved view dialog ──────────────────────────────────────────────────

export function CreateSavedViewPanel({
  family,
  onClose,
  onCreate,
}: {
  family: ReportFamily;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (name.trim().length > 120) { setError("Name must be 120 characters or fewer."); return; }
    onCreate(name.trim());
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-view-title"
      style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 20 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 id="create-view-title" style={{ ...GF, fontSize: 16, fontWeight: 600, color: NAVY, margin: 0 }}>Save Current View</h2>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer" }}>
          <X size={16} style={{ color: SLATE }} aria-hidden />
        </button>
      </div>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="sv-name" style={{ ...GF, fontSize: 12, color: SLATE, fontWeight: 500, display: "block", marginBottom: 4 }}>
            View Name <span aria-hidden>*</span>
          </label>
          <input
            id="sv-name"
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            maxLength={120}
            required
            aria-describedby={error ? "sv-name-err" : undefined}
            style={{
              ...GF, fontSize: 13, width: "100%",
              border: `1px solid ${error ? RED : "#CBD5E1"}`,
              borderRadius: 6, padding: "7px 10px", boxSizing: "border-box",
              outline: "none",
            }}
          />
          {error ? <p id="sv-name-err" role="alert" style={{ ...GF, fontSize: 11, color: RED, margin: "3px 0 0" }}>{error}</p> : null}
        </div>
        <div style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 14, background: "#F8FAFC", borderRadius: 6, padding: "7px 10px" }}>
          Saved to <strong>{REPORT_FAMILY_LABELS[family]}</strong> family.
          This is a demonstration — views are stored in memory only and reset on page reload.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            style={{ ...GF, fontSize: 13, background: AZURE, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 500 }}
          >
            Save View
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ ...GF, fontSize: 13, background: "#F8FAFC", color: SLATE, border: "1px solid #E2E8F0", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Annotation editor ─────────────────────────────────────────────────────────

export function AnnotationEditor({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(current);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ann-title"
      style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 20 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 id="ann-title" style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <PenLine size={14} aria-hidden /> Annotation
        </h3>
        <button onClick={onClose} aria-label="Close annotation" style={{ background: "none", border: "none", cursor: "pointer" }}>
          <X size={14} style={{ color: SLATE }} aria-hidden />
        </button>
      </div>
      <textarea
        value={val}
        onChange={e => setVal(e.target.value.slice(0, 500))}
        maxLength={500}
        aria-label="Annotation text (max 500 characters)"
        rows={4}
        style={{
          ...GF, fontSize: 12, width: "100%", boxSizing: "border-box",
          border: "1px solid #CBD5E1", borderRadius: 6, padding: "7px 10px", resize: "vertical",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <span style={{ ...GF, fontSize: 10, color: SILVER }}>{val.length}/500 characters</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => { onSave(val); onClose(); }}
            style={{ ...GF, fontSize: 12, background: AZURE, color: "#fff", border: "none", borderRadius: 5, padding: "5px 12px", cursor: "pointer" }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            style={{ ...GF, fontSize: 12, background: "#F8FAFC", color: SLATE, border: "1px solid #E2E8F0", borderRadius: 5, padding: "5px 12px", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Saved view card ────────────────────────────────────────────────────────────

export function SavedViewCard({
  view,
  onRename,
  onDuplicate,
  onSetDefault,
  onArchive,
  onRestore,
  onRemove,
  onAnnotate,
}: {
  view: ReportSavedView;
  onRename:     (id: string) => void;
  onDuplicate:  (id: string) => void;
  onSetDefault: (id: string) => void;
  onArchive:    (id: string) => void;
  onRestore:    (id: string) => void;
  onRemove:     (id: string) => void;
  onAnnotate:   (id: string) => void;
}) {
  return (
    <article
      aria-label={`Saved view: ${view.name}`}
      style={{
        background: "#fff", border: `1px solid ${view.status === "archived" ? "#E2E8F0" : "#E2E8F0"}`,
        borderRadius: 10, padding: "14px 16px",
        opacity: view.status === "archived" ? 0.7 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
            <Link
              to={`/app/reports/${view.id}`}
              style={{ ...GF, fontSize: 14, fontWeight: 600, color: AZURE, textDecorationLine: "none" }}
            >
              {view.name}
            </Link>
            {view.isDefault && (
              <span style={{ ...GF, fontSize: 10, background: "#FEF3C7", color: "#92400E", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>
                Default
              </span>
            )}
            {view.status === "archived" && (
              <span style={{ ...GF, fontSize: 10, background: "#F1F5F9", color: SLATE, borderRadius: 4, padding: "1px 6px" }}>
                Archived
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <FamilyIcon family={view.family} size={11} color={SLATE} />
              <span style={{ ...GF, fontSize: 11, color: SLATE }}>{REPORT_FAMILY_LABELS[view.family]}</span>
            </span>
            <span style={{ ...GF, fontSize: 11, color: SILVER }}>·</span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={10} style={{ color: SILVER }} aria-hidden />
              <span style={{ ...GF, fontSize: 11, color: SILVER }}>{REPORT_DATE_PRESET_LABELS[view.datePreset]}</span>
            </span>
          </div>
          {view.annotation ? (
            <p style={{ ...GF, fontSize: 11, color: SLATE, margin: "4px 0 0", fontStyle: "italic" }}>
              "{view.annotation.slice(0, 100)}{view.annotation.length > 100 ? "…" : ""}"
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {view.status === "active" ? (
            <>
              {!view.isDefault ? (
                <button onClick={() => onSetDefault(view.id)} aria-label="Set as default" title="Set as default"
                  style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 5, padding: "4px 7px", cursor: "pointer" }}>
                  <Star size={12} style={{ color: GOLD }} aria-hidden />
                </button>
              ) : null}
              <button onClick={() => onAnnotate(view.id)} aria-label="Edit annotation" title="Edit annotation"
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 5, padding: "4px 7px", cursor: "pointer" }}>
                <PenLine size={12} style={{ color: SLATE }} aria-hidden />
              </button>
              <button onClick={() => onRename(view.id)} aria-label="Rename view" title="Rename"
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 5, padding: "4px 7px", cursor: "pointer" }}>
                <PenLine size={12} style={{ color: AZURE }} aria-hidden />
              </button>
              <button onClick={() => onDuplicate(view.id)} aria-label="Duplicate view" title="Duplicate"
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 5, padding: "4px 7px", cursor: "pointer" }}>
                <Copy size={12} style={{ color: SLATE }} aria-hidden />
              </button>
              <button onClick={() => onArchive(view.id)} aria-label="Archive view" title="Archive"
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 5, padding: "4px 7px", cursor: "pointer" }}>
                <Archive size={12} style={{ color: AMBER }} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onRestore(view.id)} aria-label="Restore view" title="Restore"
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 5, padding: "4px 7px", cursor: "pointer" }}>
                <RotateCcw size={12} style={{ color: GREEN }} aria-hidden />
              </button>
              <button onClick={() => onRemove(view.id)} aria-label="Remove from demonstration" title="Remove from demonstration"
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 5, padding: "4px 7px", cursor: "pointer" }}>
                <Trash2 size={12} style={{ color: RED }} aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Insufficient data state ───────────────────────────────────────────────────

export function InsufficientDataState({ message }: { message?: string }) {
  return (
    <div style={{ ...GF, textAlign: "center", padding: "40px 24px", color: SILVER }}>
      <BarChart2 size={32} style={{ color: SILVER, marginBottom: 12 }} aria-hidden />
      <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0 }}>
        {message ?? "Not enough data in the selected period for a meaningful comparison."}
      </p>
    </div>
  );
}

// ── Report section divider ────────────────────────────────────────────────────

export function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0 16px" }}>
      <h2 style={{ ...GF, fontSize: 13, fontWeight: 600, color: SLATE, margin: 0, whiteSpace: "nowrap" }}>{label}</h2>
      <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} aria-hidden />
    </div>
  );
}

// ── Link to full family report ────────────────────────────────────────────────

export function FamilyCard({ family }: { family: ReportFamily }) {
  return (
    <Link
      to={REPORT_FAMILY_PATHS[family]}
      style={{ textDecorationLine: "none" }}
      aria-label={`Go to ${REPORT_FAMILY_LABELS[family]} report`}
    >
      <div
        style={{
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
          padding: "16px 18px", cursor: "pointer",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = AZURE)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <FamilyIcon family={family} size={16} color={AZURE} />
          <span style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY }}>{REPORT_FAMILY_LABELS[family]}</span>
          <ChevronRight size={14} style={{ color: SILVER, marginLeft: "auto" }} aria-hidden />
        </div>
        <p style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>{REPORT_FAMILY_DESCRIPTIONS[family]}</p>
      </div>
    </Link>
  );
}
