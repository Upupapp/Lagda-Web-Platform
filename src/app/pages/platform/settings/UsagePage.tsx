// /app/settings/usage — Current-period usage metrics for the workspace.
// Frontend-only demonstration data. No real metering, export, or billing events.

import React, { useEffect, useState } from "react";
import { SettingsPage, SSection, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockUsageService } from "../../../services/mock/settings.service";
import type { UsageSummaryData, UsageMetric, UsagePeriod } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const RED   = "#DC2626";

function barColor(level: UsageMetric["warningLevel"]) {
  if (level === "exceeded")    return RED;
  if (level === "approaching") return AMBER;
  return AZURE;
}

function textColor(level: UsageMetric["warningLevel"]) {
  if (level === "exceeded")    return RED;
  if (level === "approaching") return AMBER;
  if (level === "none")        return GREEN;
  return SILVER;
}

function warningLabel(level: UsageMetric["warningLevel"]) {
  if (level === "exceeded")    return "Exceeded";
  if (level === "approaching") return "Approaching limit";
  return "";
}

function MetricCard({ metric }: { metric: UsageMetric }) {
  const numericLimit = typeof metric.limit === "number" ? metric.limit : null;
  const pct = numericLimit != null ? Math.min((metric.value / numericLimit) * 100, 100) : null;
  const bColor = barColor(metric.warningLevel);
  const tColor = textColor(metric.warningLevel);
  const hasWarning = metric.warningLevel === "approaching" || metric.warningLevel === "exceeded";

  return (
    <div style={{ border: `1.5px solid ${hasWarning ? `${tColor}55` : "#E3E8EF"}`, borderRadius: 10, padding: "16px 18px", background: metric.warningLevel === "exceeded" ? "#FEF2F2" : metric.warningLevel === "approaching" ? "#FFFBEB" : "#FFFFFF" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>{metric.label}</div>
        {hasWarning && (
          <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: tColor, background: `${tColor}18`, padding: "2px 8px", borderRadius: 999 }}>
            {warningLabel(metric.warningLevel)}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: pct != null ? 10 : 6 }}>
        <span style={{ ...GM, fontSize: 24, fontWeight: 800, color: NAVY }}>{metric.value.toLocaleString()}</span>
        {numericLimit != null && <span style={{ ...GM, fontSize: 14, color: SLATE }}>/ {numericLimit.toLocaleString()}</span>}
        <span style={{ ...GF, fontSize: 12, color: SLATE }}>{metric.unit}</span>
      </div>
      {pct != null && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ height: 6, background: "#E3E8EF", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: bColor, borderRadius: 999, transition: "width 0.4s" }}
              role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
              aria-label={`${metric.label} usage: ${Math.round(pct)}%`} />
          </div>
          <div style={{ ...GF, fontSize: 11, color: SLATE, marginTop: 4, textAlign: "right" }}>{Math.round(pct)}%</div>
        </div>
      )}
      {metric.limit === "varies" && (
        <div style={{ ...GF, fontSize: 11, color: SLATE, fontStyle: "italic" }}>{metric.limitLabel}</div>
      )}
    </div>
  );
}

const PERIOD_OPTIONS: { value: UsagePeriod; label: string }[] = [
  { value: "current-month",  label: "Current month" },
  { value: "previous-month", label: "Previous month" },
  { value: "last-90-days",   label: "Last 90 days" },
  { value: "current-year",   label: "Current year" },
];

export function UsagePage() {
  const [data, setData]       = useState<UsageSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<UsagePeriod>("current-month");

  const load = async (p: UsagePeriod) => {
    setLoading(true);
    const d = await mockUsageService.getUsageSummary(p);
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load("current-month"); }, []);

  const warnings = data?.metrics.filter(m => m.warningLevel === "approaching" || m.warningLevel === "exceeded") ?? [];

  return (
    <SettingsPage title="Usage" breadcrumb="Usage">
      {DEMO_NOTICE}

      {/* Period selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ ...GF, fontSize: 13, color: SLATE }}>Period:</span>
        {PERIOD_OPTIONS.map(o => (
          <button key={o.value} onClick={() => { setPeriod(o.value); load(o.value); }}
            style={{ ...GF, fontSize: 13, fontWeight: period === o.value ? 700 : 400, padding: "6px 14px", border: `1.5px solid ${period === o.value ? AZURE : "#D1D9E0"}`, borderRadius: 8, background: period === o.value ? "#EBF5FB" : "#FFFFFF", color: period === o.value ? AZURE : SLATE, cursor: "pointer" }}>
            {o.label}
          </button>
        ))}
        {data && !loading && (
          <span style={{ ...GF, fontSize: 11, color: SILVER, marginLeft: "auto" }}>
            Refreshed: {new Date(data.refreshedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} (demo)
          </span>
        )}
      </div>

      {/* Warnings banner */}
      {warnings.length > 0 && !loading && (
        <div role="alert" style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "12px 16px", marginBottom: 18, ...GF, fontSize: 13, color: "#92400E" }}>
          <strong>Attention:</strong>{" "}
          {warnings.map((w, i) => (
            <span key={w.id}>{i > 0 ? " · " : ""}<strong>{w.label}</strong> ({warningLabel(w.warningLevel)})</span>
          ))}.{" "}
          Review your plan for additional capacity.
        </div>
      )}

      {/* Period label */}
      {data && !loading && (
        <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14 }}>
          {data.periodLabel}
        </div>
      )}

      {/* Metrics grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={110} />)}
        </div>
      ) : (
        <SSection title="Metrics">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {data?.metrics.map(m => <MetricCard key={m.id} metric={m} />)}
          </div>
        </SSection>
      )}

      <div style={{ marginTop: 20, background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: 8, padding: "12px 16px", ...GF, fontSize: 12, color: SLATE }}>
        Usage data is fictional frontend demonstration data. No real metering, overage calculation, or export occurs. Contact your workspace administrator for actual usage reporting.
      </div>

      <div style={{ marginTop: 10 }}>
        <button disabled style={{ ...GF, fontSize: 13, color: SLATE, background: "#F8FAFC", border: "1.5px solid #E3E8EF", borderRadius: 8, padding: "8px 16px", cursor: "not-allowed" }}>
          Export usage data (demonstration only — no file generated)
        </button>
      </div>
    </SettingsPage>
  );
}
