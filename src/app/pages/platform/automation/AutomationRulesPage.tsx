// Workflow Automation — Rules list page (/app/automation/rules)
// Lists all rules with status/trigger/priority filters and quick actions.
// Frontend demonstration only. No real execution. No Burgundy. No eNotary.

import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type { AutoRuleSummary, AutoRuleStatus, AutoTriggerKind, AutoRulePriority, AutoRuleListFilter } from "../../../models/workflow-automation";
import {
  AUTO_RULE_STATUS_LABELS,
  AUTO_RULE_STATUS_COLORS,
  AUTO_RULE_PRIORITY_LABELS,
  AUTO_RULE_PRIORITY_COLORS,
  AUTO_TRIGGER_CONFIGS,
} from "../../../models/workflow-automation";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const RED    = "#DC2626";

function StatusBadge({ status }: { status: AutoRuleStatus }) {
  return (
    <span style={{
      ...GF,
      fontSize: 11,
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: 20,
      background: `${AUTO_RULE_STATUS_COLORS[status]}18`,
      color: AUTO_RULE_STATUS_COLORS[status],
    }}>
      {AUTO_RULE_STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: AutoRulePriority }) {
  return (
    <span style={{
      ...GF,
      fontSize: 11,
      fontWeight: 600,
      color: AUTO_RULE_PRIORITY_COLORS[priority],
    }}>
      {AUTO_RULE_PRIORITY_LABELS[priority]}
    </span>
  );
}

export function AutomationRulesPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<AutoRuleSummary[]>([]);
  const [filter, setFilter] = useState<AutoRuleListFilter>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<AutoRuleSummary | null>(null);

  const load = useCallback(() => {
    const r = workflowAutomationService.listRules(filter);
    if (r.ok) setRules(r.data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleActivate(id: import("../../../models/workflow-automation").AutoRuleId) {
    const r = workflowAutomationService.activateRule(id);
    if (r.ok) { load(); showToast(`Rule set to "Active in Demonstration".`, "success"); }
    else showToast(r.error.message, "error");
  }

  function handlePause(id: import("../../../models/workflow-automation").AutoRuleId) {
    const r = workflowAutomationService.pauseRule(id);
    if (r.ok) { load(); showToast("Rule paused.", "success"); }
    else showToast(r.error.message, "error");
  }

  function handleArchive(rule: AutoRuleSummary) {
    setConfirmArchive(rule);
  }

  function confirmArchiveRule() {
    if (!confirmArchive) return;
    const r = workflowAutomationService.archiveRule(confirmArchive.id);
    if (r.ok) { load(); showToast("Rule archived.", "success"); }
    else showToast(r.error.message, "error");
    setConfirmArchive(null);
  }

  function handleDuplicate(id: import("../../../models/workflow-automation").AutoRuleId) {
    const r = workflowAutomationService.duplicateRule(id);
    if (r.ok) { load(); showToast(`Rule duplicated as "${r.data.name}".`, "success"); }
    else showToast(r.error.message, "error");
  }

  const statusOptions: Array<{ value: AutoRuleStatus; label: string }> = [
    { value: "active-demonstration", label: "Active" },
    { value: "draft",                label: "Draft" },
    { value: "paused",               label: "Paused" },
    { value: "archived",             label: "Archived" },
    { value: "conflict-detected",    label: "Conflict Detected" },
  ];

  return (
    <div style={{ ...GF, maxWidth: 960, padding: "32px 24px" }}>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ ...GF, position: "fixed", top: 20, right: 20, background: toast.type === "error" ? RED : NAVY, color: "#FFFFFF", fontSize: 13, padding: "10px 16px", borderRadius: 8, zIndex: 1000 }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm archive modal */}
      {confirmArchive && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }} role="dialog" aria-modal="true" aria-label="Archive rule">
          <div style={{ ...GF, background: "#FFFFFF", borderRadius: 14, padding: "28px 28px 24px", width: 400, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>Archive rule?</h2>
            <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 20px", lineHeight: 1.6 }}>
              "{confirmArchive.name}" will be archived. You can restore it later from the rule detail page.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmArchive(null)} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "8px 16px", border: `1px solid ${SLATE2}`, borderRadius: 8, background: "#FFFFFF", color: SLATE6, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmArchiveRule} style={{ ...GF, fontSize: 13, fontWeight: 700, padding: "8px 16px", border: "none", borderRadius: 8, background: RED, color: "#FFFFFF", cursor: "pointer" }}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Link to="/app/automation" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Automation</Link>
            <span style={{ color: SLATE4 }}>/</span>
            <span style={{ fontSize: 13, color: SLATE6 }}>Rules</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Rules</h1>
        </div>
        <Link
          to="/app/automation/rules/new"
          style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 6, background: AZURE, color: "#FFFFFF", fontWeight: 700, fontSize: 13, padding: "9px 18px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" }}
        >
          + New Rule
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search rules…"
          value={filter.query ?? ""}
          onChange={e => setFilter(f => ({ ...f, query: e.target.value || undefined }))}
          style={{ ...GF, fontSize: 13, padding: "7px 12px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, width: 220 }}
          aria-label="Search rules"
        />
        <select
          value={filter.status ?? ""}
          onChange={e => setFilter(f => ({ ...f, status: (e.target.value as AutoRuleStatus) || undefined }))}
          style={{ ...GF, fontSize: 13, padding: "7px 12px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, background: "#FFFFFF" }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filter.priority ?? ""}
          onChange={e => setFilter(f => ({ ...f, priority: (e.target.value as AutoRulePriority) || undefined }))}
          style={{ ...GF, fontSize: 13, padding: "7px 12px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, background: "#FFFFFF" }}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filter.trigger ?? ""}
          onChange={e => setFilter(f => ({ ...f, trigger: (e.target.value as AutoTriggerKind) || undefined }))}
          style={{ ...GF, fontSize: 13, padding: "7px 12px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, background: "#FFFFFF" }}
          aria-label="Filter by trigger"
        >
          <option value="">All triggers</option>
          {Object.values(AUTO_TRIGGER_CONFIGS).map(t => (
            <option key={t.kind} value={t.kind}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Rules table */}
      {loading ? (
        <div style={{ ...GF, padding: 40, textAlign: "center", color: SLATE4 }}>Loading…</div>
      ) : rules.length === 0 ? (
        <div style={{ ...GF, padding: "48px 24px", background: "#FAFAFA", border: `1px dashed ${SLATE2}`, borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8 }}>No rules found</div>
          <div style={{ fontSize: 13, color: SLATE6, marginBottom: 20 }}>
            {Object.keys(filter).length > 0 ? "Try adjusting your filters." : "Create your first automation rule to get started."}
          </div>
          {Object.keys(filter).length === 0 && (
            <Link to="/app/automation/rules/new" style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, padding: "8px 16px", borderRadius: 8, textDecoration: "none" }}>
              Create Rule
            </Link>
          )}
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: `1px solid ${SLATE2}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Automation rules">
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE6, textAlign: "left", padding: "10px 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>Name</th>
                <th style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE6, textAlign: "left", padding: "10px 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>Status</th>
                <th style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE6, textAlign: "left", padding: "10px 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>Trigger</th>
                <th style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE6, textAlign: "left", padding: "10px 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>Priority</th>
                <th style={{ ...GF, fontSize: 11, fontWeight: 700, color: SLATE6, textAlign: "right", padding: "10px 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <tr key={rule.id} style={{ borderTop: idx > 0 ? `1px solid ${SLATE2}` : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <Link to={`/app/automation/rules/${rule.id}`} style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textDecoration: "none" }}>
                      {rule.name}
                      {rule.hasConflicts && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: RED }}>⚠ CONFLICT</span>}
                    </Link>
                    <div style={{ ...GF, fontSize: 11, color: SLATE4, marginTop: 2 }}>
                      {rule.conditionCount} condition{rule.conditionCount !== 1 ? "s" : ""} · {rule.actionCount} action{rule.actionCount !== 1 ? "s" : ""}
                      {rule.firingCount > 0 && ` · Fired ${rule.firingCount}×`}
                    </div>
                  </td>
                  <td style={{ padding: "14px 12px" }}>
                    <StatusBadge status={rule.status} />
                  </td>
                  <td style={{ padding: "14px 12px" }}>
                    <span style={{ ...GF, fontSize: 12, color: SLATE6 }}>
                      {AUTO_TRIGGER_CONFIGS[rule.trigger]?.label ?? rule.trigger}
                    </span>
                  </td>
                  <td style={{ padding: "14px 12px" }}>
                    <PriorityBadge priority={rule.priority} />
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => navigate(`/app/automation/rules/${rule.id}/edit`)}
                        style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "transparent", border: `1px solid ${AZURE}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                        aria-label={`Edit rule ${rule.name}`}
                      >
                        Edit
                      </button>
                      {(rule.status === "draft" || rule.status === "paused" || rule.status === "conflict-detected") && (
                        <button
                          onClick={() => handleActivate(rule.id)}
                          style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                          aria-label={`Activate rule ${rule.name}`}
                        >
                          Activate
                        </button>
                      )}
                      {rule.status === "active-demonstration" && (
                        <button
                          onClick={() => handlePause(rule.id)}
                          style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE6, background: "#F1F5F9", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                          aria-label={`Pause rule ${rule.name}`}
                        >
                          Pause
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicate(rule.id)}
                        style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE6, background: "#F1F5F9", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                        aria-label={`Duplicate rule ${rule.name}`}
                      >
                        Copy
                      </button>
                      {rule.status !== "archived" && (
                        <button
                          onClick={() => handleArchive(rule)}
                          style={{ ...GF, fontSize: 12, fontWeight: 600, color: RED, background: "transparent", border: `1px solid #FECACA`, borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}
                          aria-label={`Archive rule ${rule.name}`}
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
