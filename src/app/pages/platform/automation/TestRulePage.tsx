// Workflow Automation — Test Rule / Simulation (/app/automation/rules/:ruleId/test)
// Runs the simulation engine to project which conditions match and what changes would be applied.
// All results are demonstrationOnly: true. No real execution.

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type { AutoRule, AutoRuleId, AutoSimulation, AutoSimTriggerContext } from "../../../models/workflow-automation";
import { AUTO_TRIGGER_CONFIGS } from "../../../models/workflow-automation";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const RED    = "#DC2626";
const GREEN  = "#16A34A";
const AMBER  = "#D97706";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${SLATE2}` }}>
      <div style={{ ...GF, fontSize: 12, color: SLATE4, fontWeight: 600, minWidth: 180, flexShrink: 0 }}>{label}</div>
      <div style={{ ...GF, fontSize: 12, color: NAVY, flex: 1 }}>{value}</div>
    </div>
  );
}

export function TestRulePage() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const [rule, setRule] = useState<AutoRule | null>(null);
  const [ctx, setCtx] = useState<AutoSimTriggerContext>({ triggerKind: "transaction_created" });
  const [result, setResult] = useState<AutoSimulation | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ruleId) return;
    const r = workflowAutomationService.getRule(ruleId as AutoRuleId);
    if (r.ok) {
      setRule(r.data);
      setCtx({ triggerKind: r.data.trigger, transactionTitle: "Sample Transaction" });
    }
    setLoading(false);
  }, [ruleId]);

  function handleRun() {
    setRunning(true);
    const r = workflowAutomationService.runSimulation(ctx);
    setRunning(false);
    if (r.ok) setResult(r.data);
  }

  if (loading) return <div style={{ ...GF, padding: 40, color: SLATE4 }}>Loading…</div>;
  if (!rule) return (
    <div style={{ ...GF, padding: 40 }}>
      <div style={{ fontSize: 14, color: NAVY }}>Rule not found.</div>
      <Link to="/app/automation/rules" style={{ fontSize: 13, color: AZURE }}>Back to Rules</Link>
    </div>
  );

  const ruleMatched = result?.matchedRuleIds.includes(rule.id);

  return (
    <div style={{ ...GF, maxWidth: 760, padding: "32px 24px" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link to="/app/automation" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Automation</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <Link to="/app/automation/rules" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Rules</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <Link to={`/app/automation/rules/${rule.id}`} style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>{rule.name}</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <span style={{ fontSize: 13, color: SLATE6 }}>Test</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>Test Rule</h1>
      <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 24px", lineHeight: 1.6 }}>
        Configure a trigger context and run the simulation engine to see which conditions match and what changes would be projected. All results are demonstration only.
      </p>

      {/* Demo notice */}
      <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FFF7ED", border: "1px solid #FDE68A", fontSize: 12, color: AMBER, marginBottom: 24, lineHeight: 1.6 }}>
        <strong>Simulation only</strong> — No transactions are created, no documents are processed, and no notifications are sent.
      </div>

      {/* Context builder */}
      <div style={{ marginBottom: 24, padding: "20px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#FFFFFF" }}>
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Trigger Context</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label htmlFor="ctx-trigger" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>Trigger event</label>
            <select
              id="ctx-trigger"
              value={ctx.triggerKind}
              onChange={e => setCtx(c => ({ ...c, triggerKind: e.target.value as AutoSimTriggerContext["triggerKind"] }))}
              style={{ ...GF, fontSize: 13, padding: "8px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, background: "#FFFFFF", width: "100%" }}
            >
              {Object.values(AUTO_TRIGGER_CONFIGS).map(t => (
                <option key={t.kind} value={t.kind}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ctx-title" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>Transaction title</label>
            <input
              id="ctx-title"
              type="text"
              value={ctx.transactionTitle ?? ""}
              onChange={e => setCtx(c => ({ ...c, transactionTitle: e.target.value }))}
              placeholder="e.g. Q3 NDA Agreement"
              style={{ ...GF, fontSize: 13, padding: "8px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, width: "100%", boxSizing: "border-box" as const }}
            />
          </div>
          <div>
            <label htmlFor="ctx-template" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>Template name (optional)</label>
            <input
              id="ctx-template"
              type="text"
              value={ctx.templateName ?? ""}
              onChange={e => setCtx(c => ({ ...c, templateName: e.target.value || undefined }))}
              placeholder="e.g. Employment Agreement"
              style={{ ...GF, fontSize: 13, padding: "8px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, width: "100%", boxSizing: "border-box" as const }}
            />
          </div>
          <div>
            <label htmlFor="ctx-pcount" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>Participant count</label>
            <input
              id="ctx-pcount"
              type="number"
              value={ctx.participantCount ?? 1}
              min={1}
              max={20}
              onChange={e => setCtx(c => ({ ...c, participantCount: parseInt(e.target.value) || 1 }))}
              style={{ ...GF, fontSize: 13, padding: "8px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, width: "100%", boxSizing: "border-box" as const }}
            />
          </div>
          <div>
            <label htmlFor="ctx-prole" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>Participant role</label>
            <select
              id="ctx-prole"
              value={ctx.participantRole ?? "signer"}
              onChange={e => setCtx(c => ({ ...c, participantRole: e.target.value }))}
              style={{ ...GF, fontSize: 13, padding: "8px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, background: "#FFFFFF", width: "100%" }}
            >
              <option value="signer">Signer</option>
              <option value="approver">Approver</option>
              <option value="cc">CC Recipient</option>
            </select>
          </div>
          <div>
            <label htmlFor="ctx-srole" style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>Sender role</label>
            <select
              id="ctx-srole"
              value={ctx.senderRole ?? "sender"}
              onChange={e => setCtx(c => ({ ...c, senderRole: e.target.value }))}
              style={{ ...GF, fontSize: 13, padding: "8px 10px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, background: "#FFFFFF", width: "100%" }}
            >
              <option value="owner">Owner</option>
              <option value="administrator">Administrator</option>
              <option value="sender">Sender</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            onClick={handleRun}
            disabled={running}
            style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "10px 24px", cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.7 : 1 }}
          >
            {running ? "Running…" : "Run Simulation"}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div>
          {/* Match verdict */}
          <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 12, background: ruleMatched ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${ruleMatched ? "#BBF7D0" : "#FECACA"}` }}>
            <div style={{ ...GF, fontSize: 15, fontWeight: 800, color: ruleMatched ? GREEN : RED, marginBottom: 6 }}>
              {ruleMatched ? "✓ Rule matched" : "✕ Rule did not match"}
            </div>
            {!ruleMatched && result.skippedReasons[rule.id] && (
              <div style={{ ...GF, fontSize: 13, color: "#7F1D1D" }}>{result.skippedReasons[rule.id]}</div>
            )}
            {ruleMatched && (
              <div style={{ ...GF, fontSize: 13, color: "#14532D" }}>
                {result.projectedChanges.length} projected change{result.projectedChanges.length !== 1 ? "s" : ""}.
                {result.conflictsDetected.length > 0 && ` ${result.conflictsDetected.length} conflict(s) detected.`}
              </div>
            )}
          </div>

          {/* Projected changes */}
          {result.projectedChanges.length > 0 && (
            <div style={{ marginBottom: 20, padding: "20px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#FFFFFF" }}>
              <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Projected Changes</div>
              <div>
                {result.projectedChanges.map((change, idx) => (
                  <Row
                    key={idx}
                    label={change.field}
                    value={
                      <span>
                        <span style={{ textDecoration: "line-through", color: SLATE4 }}>{String(change.originalValue ?? "—")}</span>
                        <span style={{ margin: "0 8px", color: SLATE4 }}>→</span>
                        <span style={{ fontWeight: 700, color: GREEN }}>{String(change.projectedValue ?? "—")}</span>
                        <span style={{ marginLeft: 8, fontSize: 11, color: SLATE4 }}>via {change.sourceName}</span>
                      </span>
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Activity notes */}
          {result.projectedActivityNotes.length > 0 && (
            <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#FFFFFF" }}>
              <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Projected Activity Notes</div>
              {result.projectedActivityNotes.map((note, i) => (
                <div key={i} style={{ ...GF, fontSize: 12, color: SLATE6, padding: "8px 10px", background: "#F8FAFC", borderRadius: 7, marginBottom: 6 }}>
                  {note}
                </div>
              ))}
            </div>
          )}

          {/* Notifications */}
          {result.projectedNotifications.length > 0 && (
            <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#FFFFFF" }}>
              <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 10 }}>Projected Notifications</div>
              {result.projectedNotifications.map((note, i) => (
                <div key={i} style={{ ...GF, fontSize: 12, color: AMBER, padding: "8px 10px", background: "#FFFBEB", borderRadius: 7, marginBottom: 6 }}>
                  {note}
                </div>
              ))}
            </div>
          )}

          {/* All matched rules */}
          <div style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#F8FAFC" }}>
            <div style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE6, marginBottom: 8 }}>All matched rules in this simulation run</div>
            {result.matchedRuleNames.length === 0 ? (
              <div style={{ ...GF, fontSize: 12, color: SLATE4 }}>No rules matched.</div>
            ) : (
              result.matchedRuleNames.map((name, i) => (
                <div key={i} style={{ ...GF, fontSize: 12, color: NAVY, padding: "4px 0" }}>• {name}</div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
