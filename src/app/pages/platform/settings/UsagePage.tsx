// /app/settings/usage — this workspace's usage for the current month.
//
// With a backend every figure is GET /workspaces/:id/usage — a new workspace
// shows zeros, not samples. Limits come from the plan in config/pricing.config
// (the same source Billing & Plan uses); during Early Access none is applied,
// and each figure says "No limit applied". Demo build: sample figures.

import { Link } from "react-router";
import {
  Send, CircleCheck, Hourglass, FileText, Upload, HardDrive, Users, LayoutTemplate, BookUser, ScanSearch,
  RefreshCw, TriangleAlert, Sparkles, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SettingsPage, SSection, Skeleton, Notice, BTN_SECONDARY, Badge, SET, TONES } from "./SettingsShell";
import { useWorkspaceUsage, formatBytes, formatDate, IS_LIVE } from "./settings-data";
import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import { CURRENT_PLAN, currentPlanLimits, type PlanLimit } from "../../../config/pricing.config";

const GF = { fontFamily: SET.FONT };
const GM = { fontFamily: SET.MONO };

interface Metric {
  id: string;
  label: string;
  value: number;
  display?: string;
  icon: LucideIcon;
  /** The plan limit this figure counts against, when it has one. */
  limit?: PlanLimit | null;
  limited?: boolean;
  note?: string;
}

function level(m: Metric): "none" | "approaching" | "exceeded" {
  if (!m.limit || m.limit.value === null) return "none";
  if (m.value >= m.limit.value) return "exceeded";
  if (m.value >= m.limit.value * 0.8) return "approaching";
  return "none";
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const lv = level(metric);
  const limitValue = metric.limit?.value ?? null;
  const pct = limitValue !== null && limitValue > 0 ? Math.min(100, (metric.value / limitValue) * 100) : null;
  const tone = lv === "exceeded" ? TONES.danger : lv === "approaching" ? TONES.warning : null;
  return (
    <div data-testid={`usage-metric-${metric.id}`} style={{
      border: `1px solid ${tone ? tone.border : SET.BORDER}`, background: tone ? tone.bg : "#FFFFFF",
      borderRadius: 10, padding: "14px 16px", minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, ...GF, fontSize: 13, fontWeight: 600, color: SET.INK, minWidth: 0 }}>
          <Icon size={15} aria-hidden color={SET.AZURE_TEXT} style={{ flexShrink: 0 }} />
          <span style={{ overflowWrap: "anywhere" }}>{metric.label}</span>
        </span>
        {lv !== "none" && <Badge tone={lv === "exceeded" ? "danger" : "warning"}>{lv === "exceeded" ? "Limit reached" : "Nearing limit"}</Badge>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <span data-testid={`usage-value-${metric.id}`} style={{ ...GM, fontSize: 24, fontWeight: 700, color: SET.NAVY, lineHeight: 1.1 }}>
          {metric.display ?? metric.value.toLocaleString("en-PH")}
        </span>
        {metric.limit && metric.limit.value !== null && (
          <span style={{ ...GM, fontSize: 13, color: SET.SLATE }}>of {metric.limit.label}</span>
        )}
      </div>
      {pct !== null && (
        <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${metric.label}: ${String(Math.round(pct))}% of the plan limit`}
          style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
          <div style={{ height: "100%", width: `${String(pct)}%`, background: tone ? tone.dot : SET.AZURE, borderRadius: 999 }} />
        </div>
      )}
      {(metric.limited || metric.note) && (
        <div style={{ ...GF, fontSize: 12, color: SET.SLATE, marginTop: 6 }}>
          {metric.limited && (metric.limit === null || metric.limit === undefined) ? "No limit applied" : metric.note}
        </div>
      )}
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))", gap: 12 }}>
      {metrics.map(m => <MetricCard key={m.id} metric={m} />)}
    </div>
  );
}

export function UsagePage() {
  const { workspaceId } = useWorkspaceMode();
  const { usage, error, reload } = useWorkspaceUsage(workspaceId);
  const limits = currentPlanLimits();
  const heading = { title: "Usage", breadcrumb: "Usage", description: "What this workspace has used this month, and in total." };

  if (error) return (
    <SettingsPage {...heading}>
      <Notice tone="danger" role="alert">Usage could not be loaded.</Notice>
      <button type="button" onClick={reload} style={BTN_SECONDARY}>Try again</button>
    </SettingsPage>
  );
  if (!usage) return (
    <SettingsPage {...heading}>
      <Skeleton h={60} mb={16} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))", gap: 12 }}>
        {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={104} mb={0} />)}
      </div>
    </SettingsPage>
  );

  const sr = usage.signingRequests;
  const signing: Metric[] = [
    { id: "sent-month", label: "Sent this month", value: sr.sentThisMonth, icon: Send, limit: limits?.signingRequestsPerMonth ?? null, limited: true },
    { id: "completed-month", label: "Completed this month", value: sr.completedThisMonth, icon: CircleCheck },
    { id: "in-progress", label: "In progress now", value: sr.inProgress, icon: Hourglass, note: "Sent and still waiting on someone" },
    { id: "sent-total", label: "Sent in total", value: sr.sentTotal, icon: Send },
    { id: "completed-total", label: "Completed in total", value: sr.completedTotal, icon: CircleCheck },
  ];
  const documents: Metric[] = [
    { id: "uploaded-month", label: "Uploaded this month", value: usage.documents.uploadedThisMonth, icon: Upload },
    { id: "documents-total", label: "Documents in total", value: usage.documents.total, icon: FileText },
    { id: "storage", label: "Storage used", value: usage.storageBytes, display: formatBytes(usage.storageBytes), icon: HardDrive, limit: limits?.storageBytes ?? null, limited: true },
  ];
  const workspace: Metric[] = [
    { id: "members", label: "Members", value: usage.members, icon: Users, limit: limits?.users ?? null, limited: true },
    { id: "templates", label: "Templates", value: usage.templates, icon: LayoutTemplate, limit: limits?.templates ?? null, limited: true },
    { id: "contacts", label: "Saved contacts", value: usage.contacts, icon: BookUser },
  ];
  const verification: Metric[] = [
    { id: "verifications", label: "Verification checks this month", value: usage.verificationsThisMonth, icon: ScanSearch, note: "Times a document was checked on the Verify page" },
  ];
  const warnings = [...signing, ...documents, ...workspace].filter(m => level(m) !== "none");
  const periodLabel = new Date(usage.period.start).toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  return (
    <SettingsPage {...heading} actions={<button type="button" onClick={reload} style={BTN_SECONDARY}><RefreshCw size={15} aria-hidden /> Refresh</button>}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between", background: "#FFFFFF", border: `1px solid ${SET.BORDER}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...GM, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: SET.MUTED }}>This period</div>
          <div data-testid="usage-period" style={{ ...GF, fontSize: 16, fontWeight: 700, color: SET.NAVY }}>{periodLabel}</div>
          <div style={{ ...GF, fontSize: 12.5, color: SET.SLATE }}>{formatDate(usage.period.start)} – {formatDate(usage.period.end - 1)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Badge tone="accent" icon={Sparkles}>{CURRENT_PLAN.name}</Badge>
          <span style={{ ...GF, fontSize: 13, color: SET.SLATE }}>{limits ? "Plan limits apply" : "No limits applied"}</span>
          <Link to="/app/settings/billing" style={{ ...GF, fontSize: 13, fontWeight: 600, color: SET.AZURE_TEXT, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            Plans <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>

      {warnings.length > 0 && (
        <Notice tone="warning" icon={TriangleAlert} role="alert">
          <strong>Nearing your plan limits:</strong> {warnings.map(w => w.label).join(", ")}.
        </Notice>
      )}

      <SSection title="Signing requests" icon={Send}><MetricGrid metrics={signing} /></SSection>
      <SSection title="Documents and storage" icon={FileText}><MetricGrid metrics={documents} /></SSection>
      <SSection title="Workspace" icon={Users}><MetricGrid metrics={workspace} /></SSection>
      <SSection title="Verification" icon={ScanSearch}><MetricGrid metrics={verification} /></SSection>

      <p style={{ ...GF, fontSize: 12.5, color: SET.SLATE, margin: 0 }}>
        {IS_LIVE ? "Counted from this workspace’s own records. Monthly figures start again at the beginning of each calendar month." : "Demo build — these are sample figures."}
      </p>
    </SettingsPage>
  );
}
