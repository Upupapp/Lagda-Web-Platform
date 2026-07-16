// Workflow Automation — Policy Detail (/app/automation/policies/:policyId)
// Edit settings for a specific policy family.
// Frontend demonstration only. No real execution. No Burgundy. No eNotary.

import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type { AutoPolicy, AutoPolicyId, AutoPolicyStatus } from "../../../models/workflow-automation";
import {
  AUTO_POLICY_FAMILY_LABELS,
  AUTO_POLICY_FAMILY_DESCRIPTIONS,
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

function inputStyle(): React.CSSProperties {
  return { ...GF, fontSize: 13, padding: "8px 11px", border: `1px solid ${SLATE2}`, borderRadius: 8, color: NAVY, width: "100%", boxSizing: "border-box" as const, background: "#FFFFFF" };
}

function LabelEl({ children }: { children: React.ReactNode }) {
  return <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 }}>{children}</label>;
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <LabelEl>{label}</LabelEl>
      {children}
    </div>
  );
}

export function PolicyDetailPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const [policy, setPolicy] = useState<AutoPolicy | null>(null);
  const [settings, setSettings] = useState<Record<string, string | number | boolean | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!policyId) return;
    const r = workflowAutomationService.getPolicy(policyId as AutoPolicyId);
    if (r.ok) { setPolicy(r.data); setSettings({ ...r.data.settings }); }
    setLoading(false);
  }, [policyId]);

  function set(key: string, value: string | number | boolean | null) {
    setSettings(s => ({ ...s, [key]: value }));
    setUnsaved(true);
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleSave() {
    if (!policyId || !policy) return;
    setSaving(true);
    const r = workflowAutomationService.updatePolicy(policyId as AutoPolicyId, settings);
    setSaving(false);
    if (r.ok) { setPolicy(r.data); setUnsaved(false); showToast("Policy saved.", "success"); }
    else showToast(r.error.message, "error");
  }

  function handleToggleStatus() {
    if (!policyId || !policy) return;
    const newStatus: AutoPolicyStatus = policy.status === "active" ? "inactive" : "active";
    const r = workflowAutomationService.setPolicyStatus(policyId as AutoPolicyId, newStatus);
    if (r.ok) { setPolicy(r.data); showToast(`Policy ${newStatus}.`, "success"); }
    else showToast(r.error.message, "error");
  }

  if (loading) return <div style={{ ...GF, padding: 40, color: SLATE4 }}>Loading…</div>;
  if (!policy) return (
    <div style={{ ...GF, padding: 40 }}>
      <div style={{ fontSize: 14, color: NAVY }}>Policy not found.</div>
      <Link to="/app/automation/policies" style={{ fontSize: 13, color: AZURE }}>Back to Policies</Link>
    </div>
  );

  const family = policy.family;

  return (
    <div style={{ ...GF, maxWidth: 640, padding: "32px 24px" }}>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ ...GF, position: "fixed", top: 20, right: 20, background: toast.type === "error" ? RED : NAVY, color: "#FFFFFF", fontSize: 13, padding: "10px 16px", borderRadius: 8, zIndex: 1000 }}>
          {toast.msg}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link to="/app/automation" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Automation</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <Link to="/app/automation/policies" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Policies</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <span style={{ fontSize: 13, color: SLATE6 }}>{AUTO_POLICY_FAMILY_LABELS[family]}</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>{AUTO_POLICY_FAMILY_LABELS[family]}</h1>
          <p style={{ fontSize: 13, color: SLATE6, margin: 0, lineHeight: 1.6 }}>{AUTO_POLICY_FAMILY_DESCRIPTIONS[family]}</p>
        </div>
        <button
          onClick={handleToggleStatus}
          style={{
            ...GF,
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 16px",
            borderRadius: 8,
            border: policy.status === "active" ? `1px solid ${SLATE2}` : `1px solid ${AZURE}`,
            background: policy.status === "active" ? "#F1F5F9" : "#EFF6FF",
            color: policy.status === "active" ? SLATE6 : AZURE,
            cursor: "pointer",
          }}
        >
          {policy.status === "active" ? "Deactivate" : "Activate"}
        </button>
      </div>

      {/* Policy settings editor */}
      <div style={{ padding: "22px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#FFFFFF", marginBottom: 24 }}>
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 18 }}>Settings</div>

        {/* Request Defaults */}
        {family === "request_defaults" && (
          <>
            <FieldRow label="Default invitation subject">
              <input type="text" value={String(settings["invitationSubject"] ?? "")} onChange={e => set("invitationSubject", e.target.value)} style={inputStyle()} />
              <div style={{ ...GF, fontSize: 11, color: SLATE4, marginTop: 4 }}>Use {"{title}"} to insert the transaction title.</div>
            </FieldRow>
            <FieldRow label="Default sender display name">
              <input type="text" value={String(settings["senderDisplayName"] ?? "")} onChange={e => set("senderDisplayName", e.target.value)} placeholder="Your name or team name" style={inputStyle()} />
            </FieldRow>
          </>
        )}

        {/* Participant Security */}
        {family === "participant_security" && (
          <>
            {[
              { key: "signerMinAuth", label: "Minimum auth for Signers" },
              { key: "approverMinAuth", label: "Minimum auth for Approvers" },
              { key: "ccMinAuth", label: "Minimum auth for CC Recipients" },
            ].map(({ key, label }) => (
              <FieldRow key={key} label={label}>
                <select
                  value={String(settings[key] ?? "none")}
                  onChange={e => set(key, e.target.value)}
                  style={{ ...inputStyle(), width: "auto", minWidth: 220 }}
                >
                  <option value="none">None (no auth required)</option>
                  <option value="email_otp">Email OTP</option>
                  <option value="sms_otp">SMS OTP</option>
                  <option value="id_verification">ID Verification</option>
                  <option value="biometric">Biometric</option>
                </select>
              </FieldRow>
            ))}
            <div style={{ ...GF, padding: "10px 12px", borderRadius: 8, background: "#FFF7ED", border: "1px solid #FDE68A", fontSize: 12, color: AMBER, lineHeight: 1.5 }}>
              These are recommendations only. Authentication is never automatically applied to live participant sessions.
            </div>
          </>
        )}

        {/* Reminder Direction */}
        {family === "reminder_direction" && (
          <>
            <FieldRow label="Enable reminders by default">
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={Boolean(settings["remindersEnabled"])} onChange={e => set("remindersEnabled", e.target.checked)} />
                <span style={{ ...GF, fontSize: 13, color: SLATE6 }}>Pre-fill reminders as enabled</span>
              </label>
            </FieldRow>
            <FieldRow label="First reminder after (days)">
              <input type="number" min={1} max={30} value={Number(settings["firstReminderDays"] ?? 3)} onChange={e => set("firstReminderDays", parseInt(e.target.value) || 1)} style={{ ...inputStyle(), width: 100 }} />
            </FieldRow>
            <FieldRow label="Repeat every (days)">
              <input type="number" min={1} max={30} value={Number(settings["repeatIntervalDays"] ?? 7)} onChange={e => set("repeatIntervalDays", parseInt(e.target.value) || 1)} style={{ ...inputStyle(), width: 100 }} />
            </FieldRow>
          </>
        )}

        {/* Completion Behavior */}
        {family === "completion_behavior" && (
          <>
            {[
              { key: "notifySenderOnComplete",            label: "Notify sender on completion" },
              { key: "sendCompletionCopyToParticipants",  label: "Send completed copy to signers" },
              { key: "sendCompletionCopyToCCRecipients",  label: "Send completed copy to CC recipients" },
              { key: "allowParticipantDownload",          label: "Allow participants to download" },
              { key: "createVerificationRecord",          label: "Create verification record" },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={Boolean(settings[key])} onChange={e => set(key, e.target.checked)} />
                  <span style={{ ...GF, fontSize: 13, color: NAVY }}>{label}</span>
                </label>
              </div>
            ))}
          </>
        )}

        {/* Organization */}
        {family === "organization" && (
          <>
            <FieldRow label="Default folder ID (optional)">
              <input type="text" value={String(settings["defaultFolderId"] ?? "")} onChange={e => set("defaultFolderId", e.target.value || null)} placeholder="folder_xxx" style={inputStyle()} />
              <div style={{ ...GF, fontSize: 11, color: SLATE4, marginTop: 4 }}>
                Leave blank to disable automatic folder assignment. See <Link to="/app/documents/folders" style={{ color: AZURE }}>Folders</Link>.
              </div>
            </FieldRow>
            <FieldRow label="Default tag ID (optional)">
              <input type="text" value={String(settings["defaultTagId"] ?? "")} onChange={e => set("defaultTagId", e.target.value || null)} placeholder="tag_xxx" style={inputStyle()} />
              <div style={{ ...GF, fontSize: 11, color: SLATE4, marginTop: 4 }}>
                Leave blank to disable automatic tag assignment. See <Link to="/app/documents/tags" style={{ color: AZURE }}>Tags</Link>.
              </div>
            </FieldRow>
          </>
        )}
      </div>

      {/* Save */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "10px 24px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Save Policy"}
        </button>
        <Link to="/app/automation/policies" style={{ ...GF, fontSize: 13, fontWeight: 600, color: SLATE6, textDecoration: "none" }}>Cancel</Link>
        {unsaved && <span style={{ ...GF, fontSize: 12, color: AMBER }}>Unsaved changes</span>}
      </div>
    </div>
  );
}
