// Workflow Automation — Rule Detail (/app/automation/rules/:ruleId)
// Shows full rule info, conditions, actions, simulation entry, status controls, conflict alerts.
// Frontend demonstration only. No real execution. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type { AutoRule, AutoRuleId, AutoConflict } from "../../../models/workflow-automation";
import {
  AUTO_RULE_STATUS_LABELS,
  AUTO_RULE_STATUS_COLORS,
  AUTO_RULE_PRIORITY_LABELS,
  AUTO_RULE_PRIORITY_COLORS,
  AUTO_CONFLICT_BEHAVIOR_LABELS,
  AUTO_TRIGGER_CONFIGS,
  AUTO_ACTION_CONFIGS,
} from "../../../models/workflow-automation";
import { Z } from "../../../utils/z-index";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const RED    = "#DC2626";
const GREEN  = "#16A34A";
const AMBER  = "#D97706";

function StatusBadge({ status }: { status: AutoRule["status"] }) {
  return (
    <span style={{ ...GF, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${AUTO_RULE_STATUS_COLORS[status]}18`, color: AUTO_RULE_STATUS_COLORS[status] }}>
      {AUTO_RULE_STATUS_LABELS[status]}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, padding: "18px 20px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#FFFFFF" }}>
      <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

export function RuleDetailPage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const navigate = useNavigate();
  const [rule, setRule] = useState<AutoRule | null>(null);
  const [conflicts, setConflicts] = useState<AutoConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function load() {
    if (!ruleId) return;
    const r = workflowAutomationService.getRule(ruleId as AutoRuleId);
    if (!r.ok) { setNotFound(true); setLoading(false); return; }
    setRule(r.data);
    const cr = workflowAutomationService.listConflicts({ resolved: false });
    if (cr.ok) setConflicts(cr.data.filter(c => c.involvedRuleIds.includes(ruleId as AutoRuleId)));
    setLoading(false);
  }

  useEffect(() => { load(); }, [ruleId]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleActivate() {
    const r = workflowAutomationService.activateRule(ruleId as AutoRuleId);
    if (r.ok) { setRule(r.data); showToast("Rule set to Active in Demonstration.", "success"); }
    else showToast(r.error.message, "error");
  }

  function handlePause() {
    const r = workflowAutomationService.pauseRule(ruleId as AutoRuleId);
    if (r.ok) { setRule(r.data); showToast("Rule paused.", "success"); }
    else showToast(r.error.message, "error");
  }

  function handleArchive() {
    const r = workflowAutomationService.archiveRule(ruleId as AutoRuleId);
    if (r.ok) { setRule(r.data); showToast("Rule archived.", "success"); }
    else showToast(r.error.message, "error");
  }

  function handleRestore() {
    const r = workflowAutomationService.restoreRule(ruleId as AutoRuleId);
    if (r.ok) { setRule(r.data); showToast("Rule restored to Draft.", "success"); }
    else showToast(r.error.message, "error");
  }

  function handleDuplicate() {
    const r = workflowAutomationService.duplicateRule(ruleId as AutoRuleId);
    if (r.ok) { showToast(`Duplicated as "${r.data.name}".`, "success"); navigate(`/app/automation/rules/${r.data.id}`); }
    else showToast(r.error.message, "error");
  }

  function handleRemove() {
    const r = workflowAutomationService.removeRule(ruleId as AutoRuleId);
    if (r.ok) { navigate("/app/automation/rules"); }
    else showToast(r.error.message, "error");
    setConfirmRemove(false);
  }

  if (loading) return <div style={{ ...GF, padding: 40, color: SLATE4 }}>Loading…</div>;
  if (notFound) return (
    <div style={{ ...GF, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Rule not found</div>
      <Link to="/app/automation/rules" style={{ fontSize: 13, color: AZURE }}>Back to Rules</Link>
    </div>
  );
  if (!rule) return null;

  const triggerCfg = AUTO_TRIGGER_CONFIGS[rule.trigger];

  return (
    <div style={{ ...GF, maxWidth: 760, padding: "32px 24px" }}>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ ...GF, position: "fixed", top: 20, right: 20, background: toast.type === "error" ? RED : NAVY, color: "#FFFFFF", fontSize: 13, padding: "10px 16px", borderRadius: 8, zIndex: Z.toast }}>
          {toast.msg}
        </div>
      )}

      {/* Remove confirm */}
      {confirmRemove && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal }} role="dialog" aria-modal="true" aria-label="Remove rule">
          <div style={{ ...GF, background: "#FFFFFF", borderRadius: 14, padding: "28px", width: 400, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>Remove rule?</h2>
            <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 20px", lineHeight: 1.6 }}>
              "{rule.name}" will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmRemove(false)} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "8px 16px", border: `1px solid ${SLATE2}`, borderRadius: 8, background: "#FFFFFF", color: SLATE6, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleRemove} style={{ ...GF, fontSize: 13, fontWeight: 700, padding: "8px 16px", border: "none", borderRadius: 8, background: RED, color: "#FFFFFF", cursor: "pointer" }}>Remove permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link to="/app/automation" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Automation</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <Link to="/app/automation/rules" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Rules</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <span style={{ fontSize: 13, color: SLATE6 }}>{rule.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>{rule.name}</h1>
            <StatusBadge status={rule.status} />
          </div>
          {rule.description && <p style={{ fontSize: 13, color: SLATE6, margin: 0, lineHeight: 1.6 }}>{rule.description}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            to={`/app/automation/rules/${rule.id}/edit`}
            style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, border: `1px solid ${AZURE}`, borderRadius: 8, padding: "8px 14px", textDecoration: "none" }}
          >
            Edit
          </Link>
          <button onClick={handleDuplicate} style={{ ...GF, fontSize: 13, fontWeight: 600, color: SLATE6, background: "#F1F5F9", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Duplicate</button>
          {rule.status === "archived" ? (
            <button onClick={handleRestore} style={{ ...GF, fontSize: 13, fontWeight: 600, color: GREEN, background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Restore</button>
          ) : (
            <>
              {(rule.status === "draft" || rule.status === "paused" || rule.status === "conflict-detected") && (
                <button onClick={handleActivate} style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Activate</button>
              )}
              {rule.status === "active-demonstration" && (
                <button onClick={handlePause} style={{ ...GF, fontSize: 13, fontWeight: 600, color: SLATE6, background: "#F1F5F9", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Pause</button>
              )}
              <button onClick={handleArchive} style={{ ...GF, fontSize: 13, fontWeight: 600, color: RED, background: "transparent", border: `1px solid #FECACA`, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Archive</button>
            </>
          )}
        </div>
      </div>

      {/* Conflicts banner */}
      {conflicts.length > 0 && (
        <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 10, background: "#FEF2F2", border: `1px solid #FECACA` }}>
          <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: RED, marginBottom: 6 }}>⚠ {conflicts.length} active conflict{conflicts.length !== 1 ? "s" : ""}</div>
          {conflicts.map(c => (
            <div key={c.id} style={{ ...GF, fontSize: 12, color: "#7F1D1D", marginBottom: 4, lineHeight: 1.5 }}>
              {c.description}
            </div>
          ))}
          <Link to="/app/automation/conflicts" style={{ ...GF, fontSize: 12, color: RED, textDecoration: "none", fontWeight: 600 }}>Resolve conflicts →</Link>
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ ...GF, fontSize: 11, color: SLATE4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Priority</div>
          <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: AUTO_RULE_PRIORITY_COLORS[rule.priority] }}>{AUTO_RULE_PRIORITY_LABELS[rule.priority]}</span>
        </div>
        <div>
          <div style={{ ...GF, fontSize: 11, color: SLATE4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>On Conflict</div>
          <span style={{ ...GF, fontSize: 13, color: SLATE6 }}>{AUTO_CONFLICT_BEHAVIOR_LABELS[rule.conflictBehavior].split("—")[0]}</span>
        </div>
        <div>
          <div style={{ ...GF, fontSize: 11, color: SLATE4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Fired</div>
          <span style={{ ...GF, fontSize: 13, color: SLATE6 }}>{rule.firingCount}× (simulated)</span>
        </div>
        <div>
          <div style={{ ...GF, fontSize: 11, color: SLATE4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Last fired</div>
          <span style={{ ...GF, fontSize: 13, color: SLATE6 }}>
            {rule.lastFiredAt ? new Date(rule.lastFiredAt).toLocaleDateString() : "Never"}
          </span>
        </div>
        <div>
          <div style={{ ...GF, fontSize: 11, color: SLATE4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Scope</div>
          <span style={{ ...GF, fontSize: 13, color: SLATE6 }}>{rule.scope}</span>
        </div>
      </div>

      {/* Trigger */}
      <SectionCard title="Trigger">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{triggerCfg?.label ?? rule.trigger}</div>
            <div style={{ ...GF, fontSize: 12, color: SLATE6, marginTop: 3, lineHeight: 1.5 }}>{triggerCfg?.description ?? ""}</div>
          </div>
        </div>
      </SectionCard>

      {/* Conditions */}
      <SectionCard title={`Conditions (${rule.conditionLogic.toUpperCase()} must match)`}>
        {rule.conditions.length === 0 ? (
          <div style={{ ...GF, fontSize: 12, color: SLATE4 }}>No conditions — rule fires for every matching trigger.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rule.conditions.map(cond => (
              <div key={cond.id} style={{ ...GF, fontSize: 12, color: NAVY, padding: "8px 12px", background: "#F8FAFC", borderRadius: 8 }}>
                <span style={{ fontWeight: 600 }}>{cond.field.replace(/_/g, " ")}</span>
                {" "}
                <span style={{ color: SLATE6 }}>{cond.operator.replace(/_/g, " ")}</span>
                {" "}
                {cond.value !== null && cond.operator !== "is_set" && cond.operator !== "is_not_set" && (
                  <span style={{ fontWeight: 600 }}>{String(cond.value)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Actions */}
      <SectionCard title="Actions">
        {rule.actions.length === 0 ? (
          <div style={{ ...GF, fontSize: 12, color: RED }}>No actions configured. Edit this rule to add actions.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rule.actions.map(action => {
              const cfg = AUTO_ACTION_CONFIGS[action.kind];
              return (
                <div key={action.id} style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${SLATE2}`, background: "#FAFAFA" }}>
                  <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{cfg.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(action.params).map(([k, v]) => (
                      <span key={k} style={{ ...GF, fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#EFF6FF", color: AZURE }}>
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Test / Simulate quick action */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#F8FAFC", marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>Test this rule</div>
          <div style={{ ...GF, fontSize: 12, color: SLATE6, marginTop: 3 }}>Run a simulation to see which conditions match and what changes would be projected.</div>
        </div>
        <Link
          to={`/app/automation/rules/${rule.id}/test`}
          style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, padding: "9px 18px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Run Test
        </Link>
      </div>

      {/* Remove */}
      {(rule.status === "archived" || rule.status === "draft") && (
        <div style={{ paddingTop: 8 }}>
          <button
            onClick={() => setConfirmRemove(true)}
            style={{ ...GF, fontSize: 12, color: RED, background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Remove this rule permanently
          </button>
        </div>
      )}
    </div>
  );
}
