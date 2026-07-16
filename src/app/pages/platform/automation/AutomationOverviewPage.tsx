// Workflow Automation — Overview dashboard (/app/automation)
// Shows stats, recent activity, active conflicts, and quick links to all automation sections.
// Frontend demonstration only. No real rule execution. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type {
  AutoOverviewStats,
  AutoConflict,
} from "../../../models/workflow-automation";
import {
  AUTO_ACTIVITY_KIND_LABELS,
  AUTO_CONFLICT_KIND_LABELS,
} from "../../../models/workflow-automation";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const AMBER  = "#D97706";
const GREEN  = "#16A34A";
const RED    = "#DC2626";
const GOLD   = "#C9960C";

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{ ...GF, background: "#FFFFFF", border: `1px solid ${SLATE2}`, borderRadius: 12, padding: "18px 20px", minWidth: 130 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color ?? NAVY, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: SLATE6, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: SLATE4, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionLink({ to, label, desc, icon }: { to: string; label: string; desc: string; icon: string }) {
  return (
    <Link
      to={to}
      style={{
        ...GF,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 18px",
        background: "#FFFFFF",
        border: `1px solid ${SLATE2}`,
        borderRadius: 12,
        textDecoration: "none",
        color: NAVY,
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{label}</div>
        <div style={{ fontSize: 12, color: SLATE6, marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </Link>
  );
}

function ConflictBadge({ severity }: { severity: AutoConflict["severity"] }) {
  const colors: Record<string, string> = { error: RED, warning: AMBER, info: AZURE };
  return (
    <span style={{ ...GF, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${colors[severity]}18`, color: colors[severity], textTransform: "uppercase", letterSpacing: 0.5 }}>
      {severity}
    </span>
  );
}

export function AutomationOverviewPage() {
  const [stats, setStats] = useState<AutoOverviewStats | null>(null);
  const [conflicts, setConflicts] = useState<AutoConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const sr = workflowAutomationService.getOverviewStats();
    const cr = workflowAutomationService.listConflicts({ resolved: false });
    if (sr.ok) setStats(sr.data);
    if (cr.ok) setConflicts(cr.data);
    setLoading(false);
  }, []);

  function handleScanConflicts() {
    const r = workflowAutomationService.runConflictScan();
    if (r.ok) {
      setConflicts(r.data);
      const sr = workflowAutomationService.getOverviewStats();
      if (sr.ok) setStats(sr.data);
      setToast(`Conflict scan complete — ${r.data.length} active conflict(s) found.`);
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) {
    return (
      <div style={{ ...GF, padding: 40, textAlign: "center", color: SLATE4 }}>
        Loading automation overview…
      </div>
    );
  }

  return (
    <div style={{ ...GF, maxWidth: 960, padding: "32px 24px" }}>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ ...GF, position: "fixed", top: 20, right: 20, background: NAVY, color: "#FFFFFF", fontSize: 13, padding: "10px 16px", borderRadius: 8, zIndex: 1000 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>Workflow Automation</h1>
            <p style={{ fontSize: 13, color: SLATE6, margin: 0, lineHeight: 1.6 }}>
              Configure rules, policies, and defaults that govern how transactions behave.
              All automation is active only in this demonstration environment.
            </p>
          </div>
          <Link
            to="/app/automation/rules/new"
            style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 6, background: AZURE, color: "#FFFFFF", fontWeight: 700, fontSize: 13, padding: "9px 18px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" }}
          >
            + New Rule
          </Link>
        </div>
      </div>

      {/* Demo notice */}
      <div style={{ ...GF, padding: "10px 14px", borderRadius: 8, background: "#F0F7FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1E40AF", marginBottom: 28, lineHeight: 1.6 }}>
        <strong>Frontend demonstration</strong> — Rules and policies shown here configure default values for transaction preparation. No rules execute automatically, no reminders are dispatched, and no documents are processed outside of this simulation environment.
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
          <StatCard label="Total Rules" value={stats.totalRules} />
          <StatCard label="Active" value={stats.activeRules} color={AZURE} sub="in demonstration" />
          <StatCard label="Drafts" value={stats.draftRules} color={SLATE6} />
          <StatCard label="Paused" value={stats.pausedRules} color={AMBER} />
          <StatCard label="Conflicts" value={stats.conflictCount} color={stats.conflictCount > 0 ? RED : GREEN} sub={stats.conflictCount > 0 ? "needs attention" : "all clear"} />
          <StatCard label="Policies" value={stats.activePolicies} color={GREEN} sub="active" />
        </div>
      )}

      {/* Two-column layout: Quick links + Conflicts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>

        {/* Quick links */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 14px" }}>Sections</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLink to="/app/automation/rules" label="Rules" desc="Create, edit, and manage automation rules." icon="⚙️" />
            <SectionLink to="/app/automation/policies" label="Policies" desc="Configure workspace-level default behaviors." icon="📋" />
            <SectionLink to="/app/automation/conflicts" label="Conflicts" desc="Review and resolve rule conflicts." icon="⚠️" />
            <SectionLink to="/app/automation/activity" label="Activity" desc="Audit log of automation events and simulations." icon="📜" />
          </div>
        </div>

        {/* Active conflicts */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>
              Active Conflicts{conflicts.length > 0 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: RED }}>({conflicts.length})</span>}
            </h2>
            <button
              onClick={handleScanConflicts}
              style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              Scan now
            </button>
          </div>

          {conflicts.length === 0 ? (
            <div style={{ ...GF, padding: "20px 16px", background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 12, fontSize: 13, color: GREEN, textAlign: "center" }}>
              No active conflicts
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {conflicts.slice(0, 4).map(c => (
                <Link
                  key={c.id}
                  to={`/app/automation/conflicts`}
                  style={{ ...GF, display: "block", padding: "12px 14px", background: "#FFFFFF", border: `1px solid ${c.severity === "error" ? "#FECACA" : "#FDE68A"}`, borderRadius: 10, textDecoration: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <ConflictBadge severity={c.severity} />
                    <span style={{ fontSize: 11, color: SLATE4 }}>{AUTO_CONFLICT_KIND_LABELS[c.kind]}</span>
                  </div>
                  <div style={{ fontSize: 12, color: NAVY, lineHeight: 1.5 }}>{c.description.slice(0, 100)}{c.description.length > 100 ? "…" : ""}</div>
                </Link>
              ))}
              {conflicts.length > 4 && (
                <Link to="/app/automation/conflicts" style={{ ...GF, fontSize: 12, color: AZURE, textDecoration: "none", padding: "4px 0" }}>
                  View all {conflicts.length} conflicts →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {stats && stats.recentActivity.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>Recent Activity</h2>
            <Link to="/app/automation/activity" style={{ ...GF, fontSize: 12, color: AZURE, textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ background: "#FFFFFF", border: `1px solid ${SLATE2}`, borderRadius: 12, overflow: "hidden" }}>
            {stats.recentActivity.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: idx < stats.recentActivity.length - 1 ? `1px solid ${SLATE2}` : "none",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: AZURE, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: SLATE6, marginTop: 2, lineHeight: 1.5 }}>{item.detail}</div>
                </div>
                <div style={{ fontSize: 11, color: SLATE4, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {new Date(item.occurredAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
