// Workflow Automation — Create / Edit Rule (/app/automation/rules/new, /:ruleId/edit)
// Full rule builder: trigger selection, condition builder, action builder, priority, conflict behavior.
// Frontend demonstration only. No real execution. No Burgundy. No eNotary.

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { workflowAutomationService } from "../../../services/mock/workflow-automation.service";
import type {
  AutoRule,
  AutoRuleId,
  AutoTriggerKind,
  AutoCondition,
  AutoConditionId,
  AutoConditionLogic,
  AutoAction,
  AutoActionId,
  AutoActionKind,
  AutoRulePriority,
  AutoConflictBehavior,
  AutoValidationResult,
  AutoConditionFieldDef,
  AutoConditionOperator,
} from "../../../models/workflow-automation";
import {
  AUTO_TRIGGER_CONFIGS,
  AUTO_ACTION_CONFIGS,
  AUTO_RULE_PRIORITY_LABELS,
  AUTO_CONFLICT_BEHAVIOR_LABELS,
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
const GOLD   = "#C9960C";

type FormState = {
  name: string;
  description: string;
  trigger: AutoTriggerKind | "";
  conditionLogic: AutoConditionLogic;
  conditions: AutoCondition[];
  actions: AutoAction[];
  priority: AutoRulePriority;
  conflictBehavior: AutoConflictBehavior;
  scope: AutoRule["scope"];
};

const BLANK_FORM: FormState = {
  name: "",
  description: "",
  trigger: "",
  conditionLogic: "all",
  conditions: [],
  actions: [],
  priority: "normal",
  conflictBehavior: "use_highest_priority",
  scope: "workspace",
};

const OPERATORS: Array<{ value: AutoConditionOperator; label: string }> = [
  { value: "equals",       label: "equals" },
  { value: "not_equals",   label: "does not equal" },
  { value: "contains",     label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with",  label: "starts with" },
  { value: "greater_than", label: ">" },
  { value: "less_than",    label: "<" },
  { value: "is_set",       label: "is set" },
  { value: "is_not_set",   label: "is not set" },
];

function inputStyle(error?: boolean): React.CSSProperties {
  return {
    ...GF,
    width: "100%",
    padding: "8px 11px",
    borderRadius: 8,
    border: `1px solid ${error ? RED : SLATE2}`,
    background: "#FFFFFF",
    fontSize: 13,
    color: NAVY,
    boxSizing: "border-box" as const,
  };
}

function labelStyle(): React.CSSProperties {
  return { ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 5 };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24, padding: "20px", borderRadius: 12, border: `1px solid ${SLATE2}`, background: "#FFFFFF" }}>
      <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

export function CreateEditRulePage() {
  const { ruleId } = useParams<{ ruleId?: string }>();
  const navigate = useNavigate();
  const isEdit = !!ruleId;

  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [validation, setValidation] = useState<AutoValidationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [unsaved, setUnsaved] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!isEdit) { setLoading(false); return; }
    const r = workflowAutomationService.getRule(ruleId as AutoRuleId);
    if (r.ok) {
      const rule = r.data;
      setForm({
        name: rule.name,
        description: rule.description,
        trigger: rule.trigger,
        conditionLogic: rule.conditionLogic,
        conditions: rule.conditions,
        actions: rule.actions,
        priority: rule.priority,
        conflictBehavior: rule.conflictBehavior,
        scope: rule.scope,
      });
    }
    setLoading(false);
  }, [isEdit, ruleId]);

  function patch(key: keyof FormState, value: FormState[keyof FormState]) {
    setForm(f => ({ ...f, [key]: value }));
    setUnsaved(true);
  }

  const revalidate = useCallback(() => {
    const v = workflowAutomationService.validateRule(
      form.name,
      form.trigger || null,
      form.conditions,
      form.actions,
    );
    setValidation(v);
    return v;
  }, [form]);

  function hasIssue(field: string): boolean {
    return validation?.issues.some(i => i.field === field && i.severity === "error") ?? false;
  }

  // ── Condition builder ─────────────────────────────────────────────────────

  function addCondition() {
    const triggerCfg = form.trigger ? AUTO_TRIGGER_CONFIGS[form.trigger] : null;
    const firstField = triggerCfg?.availableConditionFields[0] ?? "transaction_title";
    const cond: AutoCondition = {
      id: workflowAutomationService.buildConditionId(),
      field: firstField,
      operator: "equals",
      value: "",
    };
    patch("conditions", [...form.conditions, cond]);
  }

  function updateCondition(id: AutoConditionId, updates: Partial<AutoCondition>) {
    patch("conditions", form.conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  function removeCondition(id: AutoConditionId) {
    patch("conditions", form.conditions.filter(c => c.id !== id));
  }

  // ── Action builder ────────────────────────────────────────────────────────

  function addAction(kind: AutoActionKind) {
    const cfg = AUTO_ACTION_CONFIGS[kind];
    const defaultParams: Record<string, string | number | boolean | null> = {};
    for (const param of cfg.paramSchema) {
      defaultParams[param.key] = param.type === "boolean" ? true : param.type === "number" ? (param.min ?? 1) : "";
    }
    const action: AutoAction = {
      id: workflowAutomationService.buildActionId(),
      kind,
      params: defaultParams,
      label: cfg.label,
    };
    patch("actions", [...form.actions, action]);
  }

  function updateAction(id: AutoActionId, paramKey: string, value: string | number | boolean | null) {
    patch("actions", form.actions.map(a => a.id === id ? { ...a, params: { ...a.params, [paramKey]: value } } : a));
  }

  function removeAction(id: AutoActionId) {
    patch("actions", form.actions.filter(a => a.id !== id));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    const v = revalidate();
    if (!v.valid) {
      setToast({ msg: "Fix validation errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3500);
      return;
    }
    if (!form.trigger) return;
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      trigger: form.trigger,
      conditionLogic: form.conditionLogic,
      conditions: form.conditions,
      actions: form.actions,
      priority: form.priority,
      conflictBehavior: form.conflictBehavior,
      scope: form.scope,
    };
    const r = isEdit
      ? workflowAutomationService.updateRule(ruleId as AutoRuleId, payload)
      : workflowAutomationService.createRule(payload);
    setSaving(false);
    if (r.ok) {
      setUnsaved(false);
      navigate(`/app/automation/rules/${r.data.id}`);
    } else {
      setToast({ msg: r.error.message, type: "error" });
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) return <div style={{ ...GF, padding: 40, color: SLATE4 }}>Loading…</div>;

  const triggerCfg = form.trigger ? AUTO_TRIGGER_CONFIGS[form.trigger] : null;

  return (
    <div style={{ ...GF, maxWidth: 700, padding: "32px 24px" }}>

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{ ...GF, position: "fixed", top: 20, right: 20, background: toast.type === "error" ? RED : NAVY, color: "#FFFFFF", fontSize: 13, padding: "10px 16px", borderRadius: 8, zIndex: Z.toast }}>
          {toast.msg}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link to="/app/automation" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Automation</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <Link to="/app/automation/rules" style={{ fontSize: 13, color: AZURE, textDecoration: "none" }}>Rules</Link>
        <span style={{ color: SLATE4 }}>/</span>
        <span style={{ fontSize: 13, color: SLATE6 }}>{isEdit ? "Edit Rule" : "New Rule"}</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>{isEdit ? "Edit Rule" : "New Rule"}</h1>
      <p style={{ fontSize: 13, color: SLATE6, margin: "0 0 28px", lineHeight: 1.6 }}>
        Rules evaluate conditions against trigger events and apply configuration defaults in demonstration mode.
      </p>

      {/* Validation summary */}
      {validation && validation.issues.length > 0 && (
        <div role="alert" style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 8, border: `1px solid ${RED}20`, background: "#FFF5F5" }}>
          {validation.issues.filter(i => i.severity === "error").map(i => (
            <div key={i.id} style={{ ...GF, fontSize: 12, color: RED, marginBottom: 3 }}>• {i.message}</div>
          ))}
          {validation.issues.filter(i => i.severity === "warning").map(i => (
            <div key={i.id} style={{ ...GF, fontSize: 12, color: GOLD, marginBottom: 3 }}>• {i.message}</div>
          ))}
        </div>
      )}

      {/* Basic info */}
      <SectionCard title="Rule Details">
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="rule-name" style={labelStyle()}>Rule name <span style={{ color: RED }}>*</span></label>
          <input
            id="rule-name"
            type="text"
            value={form.name}
            maxLength={120}
            onChange={e => patch("name", e.target.value)}
            onBlur={revalidate}
            placeholder="e.g. Apply Urgent tag on completion"
            style={inputStyle(hasIssue("name"))}
          />
        </div>
        <div>
          <label htmlFor="rule-desc" style={labelStyle()}>Description <span style={{ color: SLATE4, fontWeight: 400 }}>(optional)</span></label>
          <textarea
            id="rule-desc"
            value={form.description}
            maxLength={500}
            rows={2}
            onChange={e => patch("description", e.target.value)}
            style={{ ...inputStyle(), resize: "vertical" }}
          />
        </div>
      </SectionCard>

      {/* Trigger */}
      <SectionCard title="Trigger">
        <p style={{ ...GF, fontSize: 12, color: SLATE6, margin: "0 0 14px", lineHeight: 1.5 }}>
          Select the event that will cause this rule to evaluate its conditions.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.values(AUTO_TRIGGER_CONFIGS).map(t => (
            <button
              key={t.kind}
              type="button"
              onClick={() => { patch("trigger", t.kind); patch("conditions", []); }}
              style={{
                ...GF,
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 10,
                border: `2px solid ${form.trigger === t.kind ? AZURE : SLATE2}`,
                background: form.trigger === t.kind ? "#EFF6FF" : "#FFFFFF",
                cursor: "pointer",
              }}
              aria-pressed={form.trigger === t.kind}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{t.label}</div>
              <div style={{ fontSize: 11, color: SLATE6, marginTop: 3, lineHeight: 1.4 }}>{t.description}</div>
            </button>
          ))}
        </div>
        {hasIssue("trigger") && <div style={{ ...GF, fontSize: 12, color: RED, marginTop: 8 }}>A trigger must be selected.</div>}
      </SectionCard>

      {/* Conditions */}
      <SectionCard title="Conditions">
        {form.conditions.length > 1 && (
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...GF, fontSize: 12, color: SLATE6 }}>Match</span>
            <select
              value={form.conditionLogic}
              onChange={e => patch("conditionLogic", e.target.value as AutoConditionLogic)}
              style={{ ...GF, fontSize: 13, padding: "6px 10px", border: `1px solid ${SLATE2}`, borderRadius: 7, color: NAVY, background: "#FFFFFF" }}
              aria-label="Condition logic"
            >
              <option value="all">ALL conditions</option>
              <option value="any">ANY condition</option>
            </select>
          </div>
        )}

        {form.conditions.length === 0 && (
          <div style={{ ...GF, fontSize: 12, color: SLATE4, marginBottom: 12, padding: "10px 12px", background: "#F8FAFC", borderRadius: 8 }}>
            No conditions — this rule will fire for every matching trigger. Add conditions to narrow its scope.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {form.conditions.map(cond => (
            <div key={cond.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <select
                value={cond.field}
                onChange={e => updateCondition(cond.id, { field: e.target.value as AutoConditionFieldDef })}
                style={{ ...GF, fontSize: 12, padding: "6px 9px", border: `1px solid ${SLATE2}`, borderRadius: 7, color: NAVY, background: "#FFFFFF" }}
                aria-label="Condition field"
              >
                {(triggerCfg?.availableConditionFields ?? []).map(f => (
                  <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
                ))}
              </select>
              <select
                value={cond.operator}
                onChange={e => updateCondition(cond.id, { operator: e.target.value as AutoConditionOperator })}
                style={{ ...GF, fontSize: 12, padding: "6px 9px", border: `1px solid ${SLATE2}`, borderRadius: 7, color: NAVY, background: "#FFFFFF" }}
                aria-label="Condition operator"
              >
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {cond.operator !== "is_set" && cond.operator !== "is_not_set" && (
                <input
                  type="text"
                  value={String(cond.value ?? "")}
                  onChange={e => updateCondition(cond.id, { value: e.target.value })}
                  placeholder="value"
                  style={{ ...GF, fontSize: 12, padding: "6px 9px", border: `1px solid ${SLATE2}`, borderRadius: 7, color: NAVY, width: 140 }}
                  aria-label="Condition value"
                />
              )}
              <button
                type="button"
                onClick={() => removeCondition(cond.id)}
                style={{ ...GF, fontSize: 12, color: RED, background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px" }}
                aria-label="Remove condition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCondition}
          disabled={!form.trigger}
          style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "transparent", border: `1px dashed ${AZURE}`, borderRadius: 7, padding: "7px 14px", cursor: form.trigger ? "pointer" : "not-allowed", opacity: form.trigger ? 1 : 0.5 }}
        >
          + Add condition
        </button>
        {!form.trigger && <div style={{ ...GF, fontSize: 11, color: SLATE4, marginTop: 6 }}>Select a trigger first.</div>}
      </SectionCard>

      {/* Actions */}
      <SectionCard title="Actions">
        <p style={{ ...GF, fontSize: 12, color: SLATE6, margin: "0 0 14px", lineHeight: 1.5 }}>
          Actions define what defaults are applied when this rule fires. Actions project configuration only — no documents are processed automatically.
        </p>
        {hasIssue("actions") && (
          <div style={{ ...GF, fontSize: 12, color: RED, marginBottom: 10 }}>At least one action is required.</div>
        )}

        {form.actions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {form.actions.map(action => {
              const cfg = AUTO_ACTION_CONFIGS[action.kind];
              return (
                <div key={action.id} style={{ padding: "14px", borderRadius: 10, border: `1px solid ${SLATE2}`, background: "#FAFAFA" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{cfg.label}</div>
                    <button
                      type="button"
                      onClick={() => removeAction(action.id)}
                      style={{ ...GF, fontSize: 12, color: RED, background: "transparent", border: "none", cursor: "pointer", padding: "2px 6px" }}
                      aria-label={`Remove action ${cfg.label}`}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {cfg.paramSchema.map(param => (
                      <div key={param.key}>
                        <label style={{ ...GF, fontSize: 11, fontWeight: 600, color: SLATE6, display: "block", marginBottom: 4 }}>
                          {param.label}{param.required && <span style={{ color: RED }}> *</span>}
                        </label>
                        {param.type === "boolean" ? (
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={action.params[param.key] as boolean ?? false}
                              onChange={e => updateAction(action.id, param.key, e.target.checked)}
                            />
                            <span style={{ ...GF, fontSize: 12, color: SLATE6 }}>{param.label}</span>
                          </label>
                        ) : param.type === "select" ? (
                          <select
                            value={String(action.params[param.key] ?? "")}
                            onChange={e => updateAction(action.id, param.key, e.target.value)}
                            style={{ ...GF, fontSize: 12, padding: "6px 9px", border: `1px solid ${SLATE2}`, borderRadius: 7, color: NAVY, background: "#FFFFFF", width: "100%" }}
                          >
                            <option value="">Select…</option>
                            {(param.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : param.type === "number" ? (
                          <input
                            type="number"
                            value={Number(action.params[param.key] ?? param.min ?? 1)}
                            min={param.min}
                            max={param.max}
                            onChange={e => updateAction(action.id, param.key, parseInt(e.target.value) || param.min || 1)}
                            style={{ ...GF, fontSize: 12, padding: "6px 9px", border: `1px solid ${SLATE2}`, borderRadius: 7, color: NAVY, width: 100 }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(action.params[param.key] ?? "")}
                            onChange={e => updateAction(action.id, param.key, e.target.value)}
                            style={{ ...GF, fontSize: 12, padding: "6px 9px", border: `1px solid ${SLATE2}`, borderRadius: 7, color: NAVY, width: "100%" }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 4 }}>
          <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE6, marginBottom: 10 }}>Add action:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.values(AUTO_ACTION_CONFIGS)
              .filter(cfg => cfg.status === "available")
              .map(cfg => (
                <button
                  key={cfg.kind}
                  type="button"
                  onClick={() => addAction(cfg.kind)}
                  style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 7, padding: "6px 12px", cursor: "pointer" }}
                >
                  {cfg.label}
                </button>
              ))
            }
          </div>
        </div>
      </SectionCard>

      {/* Priority + conflict behavior */}
      <SectionCard title="Priority and Conflict Behavior">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label htmlFor="rule-priority" style={labelStyle()}>Priority</label>
            <select
              id="rule-priority"
              value={form.priority}
              onChange={e => patch("priority", e.target.value as AutoRulePriority)}
              style={{ ...inputStyle() }}
            >
              {(Object.entries(AUTO_RULE_PRIORITY_LABELS) as [AutoRulePriority, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div style={{ ...GF, fontSize: 11, color: SLATE4, marginTop: 5 }}>
              Higher-priority rules win when conflicts occur.
            </div>
          </div>
          <div>
            <label htmlFor="rule-conflict" style={labelStyle()}>On conflict</label>
            <select
              id="rule-conflict"
              value={form.conflictBehavior}
              onChange={e => patch("conflictBehavior", e.target.value as AutoConflictBehavior)}
              style={{ ...inputStyle() }}
            >
              {(Object.entries(AUTO_CONFLICT_BEHAVIOR_LABELS) as [AutoConflictBehavior, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Save / cancel */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 8 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "10px 24px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Rule"}
        </button>
        <button
          type="button"
          onClick={() => navigate(isEdit ? `/app/automation/rules/${ruleId}` : "/app/automation/rules")}
          style={{ ...GF, fontSize: 13, fontWeight: 600, color: SLATE6, background: "#FFFFFF", border: `1px solid ${SLATE2}`, borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}
        >
          Cancel
        </button>
        {unsaved && <span style={{ ...GF, fontSize: 12, color: AMBER }}>Unsaved changes</span>}
      </div>

    </div>
  );
}
