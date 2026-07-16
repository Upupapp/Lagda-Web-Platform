// Workflow Automation — Activity log (/app/automation/activity)
// Chronological audit log of all automation events, simulations, and changes.
// Frontend demonstration only. No real events. No Burgundy. No eNotary.

import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type { AutoActivity, AutoActivityKind, AutoActivityListFilter } from "../../../models/workflow-automation";
import { AUTO_ACTIVITY_KIND_LABELS } from "../../../models/workflow-automation";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const RED    = "#DC2626";
const AMBER  = "#D97706";
const GREEN  = "#16A34A";

function kindColor(kind: AutoActivityKind): string {
  if (kind.includes("conflict")) return RED;
  if (kind.includes("activated") || kind.includes("restored")) return GREEN;
  if (kind.includes("archived") || kind.includes("paused") || kind.includes("removed")) return AMBER;
  if (kind.includes("simulation")) return "#7C3AED";
  return AZURE;
}

function kindIcon(kind: AutoActivityKind): string {
  if (kind.includes("conflict")) return "⚠";
  if (kind.includes("simulation")) return "▶";
  if (kind.includes("activated")) return "✓";
  if (kind.includes("archived") || kind.includes("removed")) return "✕";
  if (kind.includes("paused")) return "⏸";
  if (kind.includes("created") || kind.includes("duplicated")) return "+";
  if (kind.includes("policy")) return "📋";
  return "•";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AutomationActivityPage() {
  const [items, setItems] = useState<AutoActivity[]>([]);
  const [filter, setFilter] = useState<AutoActivityListFilter>({ limit: 50 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const r = workflowAutomationService.listActivity(filter);
    if (r.ok) setItems(r.data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const kindOptions: Array<{ value: AutoActivityKind; label: string }> = Object.entries(AUTO_ACTIVITY_KIND_LABELS).map(
    ([k, v]) => ({ value: k as AutoActivityKind, label: v })
  );

  return (
    <div style={{ ...GF, maxWidth: 820, padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Link to="/app/automation" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Automation</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <span style={{ fontSize: 13, color: SLATE6 }}>Activity</span>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>Activity</h1>
      <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 24px", lineHeight: 1.6 }}>
        Chronological audit log of all automation events, policy changes, simulations, and conflict detections.
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search activity…"
          value={filter.query ?? ""}
          onChange={e => setFilter(f => ({ ...f, query: e.target.value || undefined }))}
          style={{ ...GF, fontSize: 13, padding: "7px 12px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, width: 220 }}
          aria-label="Search activity"
        />
        <select
          value={filter.kind ?? ""}
          onChange={e => setFilter(f => ({ ...f, kind: (e.target.value as AutoActivityKind) || undefined }))}
          style={{ ...GF, fontSize: 13, padding: "7px 12px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, background: "#FFFFFF" }}
          aria-label="Filter by event type"
        >
          <option value="">All event types</option>
          {kindOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: SLATE4 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: "48px 24px", background: "#FAFAFA", border: `1px dashed ${SLATE2}`, borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📜</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>No activity yet</div>
          <div style={{ fontSize: 13, color: SLATE6 }}>Automation events will appear here as you create rules, run simulations, and resolve conflicts.</div>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", border: `1px solid ${SLATE2}`, borderRadius: 12, overflow: "hidden" }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "14px 18px",
                borderTop: idx > 0 ? `1px solid ${SLATE2}` : "none",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: `${kindColor(item.kind)}18`,
                color: kindColor(item.kind),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                flexShrink: 0,
                marginTop: 2,
              }}>
                {kindIcon(item.kind)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{item.title}</span>
                    <span style={{ ...GF, fontSize: 11, color: SLATE4, marginLeft: 8 }}>
                      {AUTO_ACTIVITY_KIND_LABELS[item.kind]}
                    </span>
                  </div>
                  <div style={{ ...GF, fontSize: 11, color: SLATE4, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {formatDate(item.occurredAt)}
                  </div>
                </div>
                <div style={{ ...GF, fontSize: 12, color: SLATE6, marginTop: 4, lineHeight: 1.5 }}>{item.detail}</div>
                <div style={{ ...GF, fontSize: 11, color: SLATE4, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>by {item.performedBy}</span>
                  {item.relatedRuleId && (
                    <Link to={`/app/automation/rules/${item.relatedRuleId}`} style={{ color: AZURE, textDecoration: "none" }}>
                      View rule →
                    </Link>
                  )}
                  {item.relatedPolicyId && (
                    <Link to={`/app/automation/policies/${item.relatedPolicyId}`} style={{ color: AZURE, textDecoration: "none" }}>
                      View policy →
                    </Link>
                  )}
                  {item.relatedConflictId && (
                    <Link to="/app/automation/conflicts" style={{ color: RED, textDecoration: "none" }}>
                      View conflict →
                    </Link>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 700, color: SLATE4, padding: "1px 6px", background: "#F1F5F9", borderRadius: 20 }}>
                    DEMONSTRATION
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length >= 50 && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={() => setFilter(f => ({ ...f, limit: (f.limit ?? 50) + 50 }))}
            style={{ ...GF, fontSize: 13, color: AZURE, background: "transparent", border: `1px solid ${AZURE}`, borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
