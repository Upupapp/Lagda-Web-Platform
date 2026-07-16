// Workflow Automation — Policies (/app/automation/policies)
// Lists all 5 policy families with current status and quick navigation to detail.
// Frontend demonstration only. No real execution. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type { AutoPolicy } from "../../../models/workflow-automation";
import {
  AUTO_POLICY_FAMILY_LABELS,
  AUTO_POLICY_FAMILY_DESCRIPTIONS,
  AUTO_POLICY_FAMILY_ICONS,
} from "../../../models/workflow-automation";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE6 = "#64748B";
const SLATE4 = "#94A3B8";
const SLATE2 = "#E2E8F0";
const RED    = "#DC2626";
const GREEN  = "#16A34A";
const AMBER  = "#D97706";

function PolicyStatusBadge({ status }: { status: AutoPolicy["status"] }) {
  const map = {
    active:            { color: GREEN, label: "Active" },
    inactive:          { color: SLATE4, label: "Inactive" },
    "conflict-detected": { color: RED,   label: "Conflict Detected" },
  };
  const cfg = map[status];
  return (
    <span style={{ ...GF, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${cfg.color}18`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export function PoliciesPage() {
  const [policies, setPolicies] = useState<AutoPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = workflowAutomationService.listPolicies();
    if (r.ok) setPolicies(r.data);
    setLoading(false);
  }, []);

  return (
    <div style={{ ...GF, maxWidth: 820, padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Link to="/app/automation" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Automation</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <span style={{ fontSize: 13, color: SLATE6 }}>Policies</span>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>Policies</h1>
      <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 28px", lineHeight: 1.6 }}>
        Policies define workspace-level default behaviors that apply when no template or per-transaction override is present. They are lower in priority than explicit rule actions.
      </p>

      {/* Priority notice */}
      <div style={{ padding: "10px 14px", borderRadius: 8, background: "#F0F7FF", border: "1px solid #BFDBFE", fontSize: 12, color: "#1E40AF", marginBottom: 28, lineHeight: 1.6 }}>
        <strong>Priority order:</strong> Explicit per-transaction setting → Template default → Rule action → Workspace Policy → System default
      </div>

      {loading ? (
        <div style={{ color: SLATE4, padding: 40, textAlign: "center" }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {policies.map(policy => {
            const familyIcon = AUTO_POLICY_FAMILY_ICONS[policy.family];
            return (
              <Link
                key={policy.id}
                to={`/app/automation/policies/${policy.id}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "20px 22px",
                  background: "#FFFFFF",
                  border: `1px solid ${policy.status === "conflict-detected" ? "#FECACA" : SLATE2}`,
                  borderRadius: 12,
                  textDecoration: "none",
                  color: NAVY,
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {familyIcon === "FileText" ? "📄" : familyIcon === "ShieldCheck" ? "🛡" : familyIcon === "Bell" ? "🔔" : familyIcon === "CheckCircle" ? "✓" : "📁"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{AUTO_POLICY_FAMILY_LABELS[policy.family]}</span>
                    <PolicyStatusBadge status={policy.status} />
                  </div>
                  <div style={{ fontSize: 12, color: SLATE6, marginBottom: 10, lineHeight: 1.5 }}>{AUTO_POLICY_FAMILY_DESCRIPTIONS[policy.family]}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(policy.settings).map(([k, v]) => (
                      <span key={k} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#F8FAFC", color: SLATE6, border: `1px solid ${SLATE2}` }}>
                        {k}: <strong style={{ color: NAVY }}>{String(v ?? "—")}</strong>
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: AZURE, fontWeight: 600, flexShrink: 0, paddingTop: 4 }}>Edit →</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
