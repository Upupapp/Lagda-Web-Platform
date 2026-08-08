// Workflow Automation — Conflicts (/app/automation/conflicts)
// Lists all active and resolved conflicts with resolution controls.
// Frontend demonstration only. No Burgundy. No eNotary.

import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type {
  AutoConflict,
  AutoConflictId,
  AutoConflictResolutionStrategy,
  AutoConflictListFilter,
} from "../../../models/workflow-automation";
import {
  AUTO_CONFLICT_KIND_LABELS,
} from "../../../models/workflow-automation";
import { Z } from "../../../utils/z-index";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const RED    = "#DC2626";
const AMBER  = "#D97706";
const GREEN  = "#16A34A";

const STRATEGIES: Array<{ value: AutoConflictResolutionStrategy; label: string }> = [
  { value: "disable_lower_priority",   label: "Disable lower-priority rule" },
  { value: "merge_non_conflicting",    label: "Merge non-conflicting actions" },
  { value: "manual_edit_required",     label: "Manual edit required" },
  { value: "acknowledge_and_proceed",  label: "Acknowledge and proceed" },
];

function SeverityBadge({ severity }: { severity: AutoConflict["severity"] }) {
  const colors: Record<string, string> = { error: RED, warning: AMBER, info: AZURE };
  return (
    <span style={{ ...GF, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${colors[severity]}18`, color: colors[severity], textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
      {severity}
    </span>
  );
}

type ResolveModalState = {
  conflict: AutoConflict;
  strategy: AutoConflictResolutionStrategy;
  notes: string;
};

export function ConflictsPage() {
  const [conflicts, setConflicts] = useState<AutoConflict[]>([]);
  const [filter, setFilter] = useState<AutoConflictListFilter>({ resolved: false });
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<ResolveModalState | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(() => {
    const r = workflowAutomationService.listConflicts(filter);
    if (r.ok) setConflicts(r.data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleScan() {
    const r = workflowAutomationService.runConflictScan();
    if (r.ok) { load(); showToast(`Scan complete — ${r.data.length} active conflict(s).`, "success"); }
    else showToast(r.error.message, "error");
  }

  function handleResolve() {
    if (!resolveModal) return;
    const r = workflowAutomationService.resolveConflict(
      resolveModal.conflict.id,
      resolveModal.strategy,
      resolveModal.notes,
    );
    if (r.ok) { load(); showToast("Conflict resolved.", "success"); }
    else showToast(r.error.message, "error");
    setResolveModal(null);
  }

  const active   = conflicts.filter(c => c.resolvedAt === null);
  const resolved = conflicts.filter(c => c.resolvedAt !== null);

  return (
    <div style={{ ...GF, maxWidth: 820, padding: "32px 24px" }}>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ ...GF, position: "fixed", top: 20, right: 20, background: toast.type === "error" ? RED : NAVY, color: "#FFFFFF", fontSize: 13, padding: "10px 16px", borderRadius: 8, zIndex: Z.toast }}>
          {toast.msg}
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal }} role="dialog" aria-modal="true" aria-label="Resolve conflict">
          <div style={{ ...GF, background: "#FFFFFF", borderRadius: 14, padding: "28px", width: 480, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>Resolve conflict</h2>
            <p style={{ fontSize: 12, color: SLATE6, margin: "0 0 20px", lineHeight: 1.5 }}>
              {resolveModal.conflict.description}
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 6 }}>Resolution strategy</label>
              <select
                value={resolveModal.strategy}
                onChange={e => setResolveModal(m => m ? { ...m, strategy: e.target.value as AutoConflictResolutionStrategy } : m)}
                style={{ ...GF, fontSize: 13, padding: "8px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, background: "#FFFFFF", width: "100%" }}
              >
                {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 6 }}>Notes <span style={{ color: SLATE4, fontWeight: 400 }}>(optional)</span></label>
              <textarea
                value={resolveModal.notes}
                onChange={e => setResolveModal(m => m ? { ...m, notes: e.target.value } : m)}
                rows={2}
                placeholder="Describe how you resolved this conflict…"
                style={{ ...GF, fontSize: 13, padding: "8px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, width: "100%", resize: "vertical", boxSizing: "border-box" as const }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setResolveModal(null)} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "8px 16px", border: `1px solid ${SLATE2}`, borderRadius: 8, background: "#FFFFFF", color: SLATE6, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleResolve} style={{ ...GF, fontSize: 13, fontWeight: 700, padding: "8px 20px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: "pointer" }}>Resolve</button>
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
            <span style={{ fontSize: 13, color: SLATE6 }}>Conflicts</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>
            Conflicts
            {active.length > 0 && <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700, color: RED }}>({active.length} active)</span>}
          </h1>
        </div>
        <button
          onClick={handleScan}
          style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}
        >
          Scan for Conflicts
        </button>
      </div>

      {/* Show toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setFilter({ resolved: false })}
          style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "6px 14px", borderRadius: 7, border: `1px solid ${filter.resolved === false ? AZURE : SLATE2}`, background: filter.resolved === false ? "#EFF6FF" : "#FFFFFF", color: filter.resolved === false ? AZURE : SLATE6, cursor: "pointer" }}
        >
          Active
        </button>
        <button
          onClick={() => setFilter({ resolved: true })}
          style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "6px 14px", borderRadius: 7, border: `1px solid ${filter.resolved === true ? AZURE : SLATE2}`, background: filter.resolved === true ? "#EFF6FF" : "#FFFFFF", color: filter.resolved === true ? AZURE : SLATE6, cursor: "pointer" }}
        >
          Resolved
        </button>
      </div>

      {loading ? (
        <div style={{ ...GF, padding: 40, textAlign: "center", color: SLATE4 }}>Loading…</div>
      ) : conflicts.length === 0 ? (
        <div style={{ padding: "48px 24px", background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
          <div style={{ ...GF, fontSize: 15, fontWeight: 700, color: GREEN, marginBottom: 6 }}>
            {filter.resolved ? "No resolved conflicts yet" : "No active conflicts"}
          </div>
          <div style={{ ...GF, fontSize: 13, color: SLATE6 }}>
            {filter.resolved ? "Conflicts you resolve will appear here." : "All rules are conflict-free."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {conflicts.map(conflict => (
            <div
              key={conflict.id}
              style={{
                background: "#FFFFFF",
                border: `1px solid ${conflict.severity === "error" ? "#FECACA" : conflict.severity === "warning" ? "#FDE68A" : SLATE2}`,
                borderLeft: `4px solid ${conflict.severity === "error" ? RED : conflict.severity === "warning" ? AMBER : AZURE}`,
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <SeverityBadge severity={conflict.severity} />
                  <span style={{ ...GF, fontSize: 12, color: SLATE6 }}>{AUTO_CONFLICT_KIND_LABELS[conflict.kind]}</span>
                </div>
                <div style={{ ...GF, fontSize: 11, color: SLATE4 }}>
                  Detected {new Date(conflict.detectedAt).toLocaleDateString()}
                  {conflict.resolvedAt && ` · Resolved ${new Date(conflict.resolvedAt).toLocaleDateString()}`}
                </div>
              </div>

              <p style={{ ...GF, fontSize: 13, color: NAVY, margin: "0 0 12px", lineHeight: 1.6 }}>{conflict.description}</p>

              {conflict.involvedRuleIds.length > 0 && (
                <div style={{ ...GF, fontSize: 12, color: SLATE6, marginBottom: 10 }}>
                  Rules: {conflict.involvedRuleIds.map(id => (
                    <Link key={id} to={`/app/automation/rules/${id}`} style={{ color: AZURE, marginRight: 8, textDecoration: "none" }}>{id}</Link>
                  ))}
                </div>
              )}
              {conflict.involvedPolicyIds.length > 0 && (
                <div style={{ ...GF, fontSize: 12, color: SLATE6, marginBottom: 10 }}>
                  Policies: {conflict.involvedPolicyIds.map(id => (
                    <span key={id} style={{ color: SLATE6, marginRight: 8 }}>{id}</span>
                  ))}
                </div>
              )}

              {conflict.resolvedAt ? (
                <div style={{ ...GF, fontSize: 12, color: GREEN, padding: "8px 12px", background: "#F0FDF4", borderRadius: 7 }}>
                  ✓ Resolved: {conflict.resolution}
                </div>
              ) : (
                <button
                  onClick={() => setResolveModal({ conflict, strategy: "acknowledge_and_proceed", notes: "" })}
                  style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: conflict.severity === "error" ? RED : AMBER, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}
                >
                  Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
