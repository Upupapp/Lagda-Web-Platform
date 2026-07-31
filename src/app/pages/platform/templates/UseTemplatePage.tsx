// /app/templates/:templateId/use — Use Template flow.
// 3-step wizard: Map Roles → Enter Variables → Review & Launch.
// Creates a fictional Prepare draft on completion (frontend-only, demonstrationOnly).
// No real participant PII is stored, submitted, or retained after session.
// Inline styles only. No Burgundy. No real backend.

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronLeft, ChevronRight, Users, Type, Eye,
  CheckCircle2, AlertCircle, Zap, LayoutTemplate,
  ArrowRight, Info, RotateCcw,
} from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import { asyncInstantiate } from "../../../services/mock/templates.service";
import type {
  DocumentTemplate, TemplateRoleMapping, TemplateVariableValues, TemplateRolePlaceholder,
  TemplateVariable,
} from "../../../models/templates";
import { TEMPLATE_CATEGORY_LABELS, TEMPLATE_STATUS_LABELS } from "../../../models/templates";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../../models/prepare";
import { PREP_AUTH_METHODS } from "../../../models/prepare";
import type { PrepAuthMethodId } from "../../../models/prepare";
import { PARTICIPANT_ACCENT_COLORS } from "../../../models/field-editor";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const GREEN = "#059669";
const RED   = "#DC2626";

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = [
  { id: "roles",     label: "Map Roles",        icon: <Users size={14} /> },
  { id: "variables", label: "Enter Variables",   icon: <Type  size={14} /> },
  { id: "review",    label: "Review & Launch",   icon: <Eye   size={14} /> },
] as const;

type WizardStep = typeof STEPS[number]["id"];

function StepBar({ current }: { current: WizardStep }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STEPS.map((s, i) => {
        const done    = i < idx;
        const active  = i === idx;
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: done ? GREEN : active ? AZURE : "#E2E8F0",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: done || active ? "white" : "#94A3B8",
                flexShrink: 0,
              }}>
                {done ? <CheckCircle2 size={14} /> : <span style={{ ...GF, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
              </div>
              <span style={{ ...GF, fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "#0F172A" : done ? GREEN : "#94A3B8" }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 32, height: 1, background: done ? GREEN : "#E2E8F0" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Map Roles ─────────────────────────────────────────────────────────
function RoleMappingStep({
  template, mappings, onChange,
}: {
  template:  DocumentTemplate;
  mappings:  TemplateRoleMapping[];
  onChange:  (idx: number, patch: Partial<TemplateRoleMapping>) => void;
}) {
  const AUTH_OPTIONS = PREP_AUTH_METHODS.map(m => ({ value: m.id, label: m.label }));

  return (
    <div>
      <h2 style={{ ...GF, fontSize: 16, fontWeight: 700, color: "#0F172A", margin: "0 0 6px" }}>Map Participants to Roles</h2>
      <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: "0 0 20px" }}>
        Enter the participant for each role placeholder in this template.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {mappings.map((m, idx) => {
          const color = PARTICIPANT_ACCENT_COLORS[idx % PARTICIPANT_ACCENT_COLORS.length] ?? AZURE;
          return (
            <div key={m.placeholderId} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <div>
                  <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{m.placeholderLabel}</div>
                  <div style={{ ...GF, fontSize: 11, color: "#94A3B8" }}>
                    {PREP_PARTICIPANT_ROLE_LABELS[m.role] ?? m.role}
                    {!m.required && " · Optional"}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FormField label="Full Name" required={m.required}>
                  <input
                    type="text"
                    value={m.displayName}
                    onChange={e => onChange(idx, { displayName: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Email Address" required={m.required}>
                  <input
                    type="email"
                    value={m.email}
                    onChange={e => onChange(idx, { email: e.target.value })}
                    placeholder="e.g. maria@example.com"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Organization" required={false}>
                  <input
                    type="text"
                    value={m.organization ?? ""}
                    onChange={e => onChange(idx, { organization: e.target.value })}
                    placeholder="Optional"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Authentication">
                  <select
                    value={m.authMethod}
                    onChange={e => onChange(idx, { authMethod: e.target.value as PrepAuthMethodId })}
                    style={selectStyle}
                  >
                    {AUTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Variables ─────────────────────────────────────────────────────────
function VariablesStep({
  variables, values, onChange,
}: {
  variables: TemplateVariable[];
  values:    TemplateVariableValues;
  onChange:  (key: string, val: string | boolean | null) => void;
}) {
  if (variables.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "#E6F4EA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <CheckCircle2 size={22} color={GREEN} />
        </div>
        <p style={{ ...GF, fontSize: 14, color: "#0F172A", fontWeight: 600, margin: "0 0 4px" }}>No Variables Required</p>
        <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: 0 }}>This template has no customizable variables.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ ...GF, fontSize: 16, fontWeight: 700, color: "#0F172A", margin: "0 0 6px" }}>Enter Variable Values</h2>
      <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: "0 0 20px" }}>
        These values will be used to customize the invitation message and document content.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {variables.map(v => {
          const val = values[v.internalKey];
          return (
            <div key={v.id} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <label style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                    {v.label}
                    {v.required && <span style={{ color: RED }}> *</span>}
                  </label>
                  <code style={{ ...GF, fontSize: 10, background: "#EEF4FB", color: AZURE, padding: "2px 5px", borderRadius: 4 }}>{`{{${v.internalKey}}}`}</code>
                </div>
                {v.helpText && <p style={{ ...GF, fontSize: 11, color: "#94A3B8", margin: 0 }}>{v.helpText}</p>}
              </div>
              {v.type === "multiline-text" ? (
                <textarea
                  value={(val as string) ?? ""}
                  onChange={e => onChange(v.internalKey, e.target.value)}
                  placeholder={v.placeholder}
                  rows={3}
                  style={{ ...textareaStyle }}
                />
              ) : v.type === "date" ? (
                <input
                  type="date"
                  value={(val as string) ?? ""}
                  onChange={e => onChange(v.internalKey, e.target.value)}
                  style={inputStyle}
                />
              ) : v.type === "yes-no" ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="radio" name={v.internalKey} value="yes" checked={val === "yes"} onChange={() => onChange(v.internalKey, "yes")} />
                    <span style={{ ...GF, fontSize: 13 }}>Yes</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="radio" name={v.internalKey} value="no" checked={val === "no"} onChange={() => onChange(v.internalKey, "no")} />
                    <span style={{ ...GF, fontSize: 13 }}>No</span>
                  </label>
                </div>
              ) : v.type === "select" && v.options ? (
                <select value={(val as string) ?? ""} onChange={e => onChange(v.internalKey, e.target.value)} style={selectStyle}>
                  <option value="">— Select —</option>
                  {v.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={v.type === "number" ? "number" : "text"}
                  value={(val as string) ?? ""}
                  onChange={e => onChange(v.internalKey, e.target.value)}
                  placeholder={v.placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 3: Review ────────────────────────────────────────────────────────────
function ReviewStep({
  template, mappings, variableValues,
}: {
  template:       DocumentTemplate;
  mappings:       TemplateRoleMapping[];
  variableValues: TemplateVariableValues;
}) {
  const authLabel = (method: PrepAuthMethodId) =>
    PREP_AUTH_METHODS.find(m => m.id === method)?.label ?? method;

  return (
    <div>
      <h2 style={{ ...GF, fontSize: 16, fontWeight: 700, color: "#0F172A", margin: "0 0 6px" }}>Review & Launch</h2>
      <p style={{ ...GF, fontSize: 13, color: "#64748B", margin: "0 0 20px" }}>
        Review your configuration before creating the signing request.
      </p>

      {/* Template info */}
      <div style={{ background: "#EEF4FB", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <LayoutTemplate size={18} color={AZURE} />
        <div>
          <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{template.name}</div>
          <div style={{ ...GF, fontSize: 11, color: "#64748B" }}>{TEMPLATE_CATEGORY_LABELS[template.category]}</div>
        </div>
      </div>

      {/* Participants */}
      <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
        <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Participants</h3>
        {mappings.filter(m => m.displayName.trim() || m.required).map((m, idx) => {
          const color = PARTICIPANT_ACCENT_COLORS[idx % PARTICIPANT_ACCENT_COLORS.length] ?? AZURE;
          return (
            <div key={m.placeholderId} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: idx < mappings.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{m.displayName || "(not mapped)"}</div>
                <div style={{ ...GF, fontSize: 11, color: "#94A3B8" }}>{m.email || "—"} · {m.placeholderLabel}</div>
              </div>
              <div style={{ ...GF, fontSize: 11, color: "#64748B" }}>{authLabel(m.authMethod)}</div>
            </div>
          );
        })}
      </div>

      {/* Variables */}
      {template.variables.length > 0 && (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Variables</h3>
          {template.variables.map(v => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 7, marginBottom: 7, borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ ...GF, fontSize: 12, color: "#64748B" }}>{v.label}</span>
              <span style={{ ...GF, fontSize: 12, color: "#334155", fontWeight: 600, textAlign: "right", maxWidth: 200 }}>
                {(variableValues[v.internalKey] as string) || <span style={{ color: "#94A3B8" }}>—</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Demo notice */}
      <div style={{ padding: "12px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, display: "flex", gap: 8 }}>
        <Info size={14} color="#94A3B8" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ ...GF, fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
          <strong>Demonstration only.</strong> Launching will create a fictional draft in the Prepare flow. No real signing request will be sent. No emails will be delivered. Participant data entered here is discarded when you close this page.
        </p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 12px",
  border: "1px solid #E2E8F0", borderRadius: 8,
  fontFamily: "'Geist', sans-serif", fontSize: 13, color: "#0F172A",
  background: "white", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: "pointer",
};
const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid #E2E8F0", borderRadius: 8,
  fontFamily: "'Geist', sans-serif", fontSize: 13, color: "#0F172A",
  background: "white", boxSizing: "border-box", resize: "vertical",
};
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ ...GF, fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
        {label}{required && <span style={{ color: RED }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function buildInitialMappings(template: DocumentTemplate): TemplateRoleMapping[] {
  return template.placeholders.map(ph => ({
    placeholderId:    ph.id,
    placeholderLabel: ph.label,
    role:             ph.role,
    required:         ph.required,
    displayName:      "",
    email:            "",
    organization:     "",
    authMethod:       ph.defaultAuthMethod,
  }));
}

function buildInitialVariables(template: DocumentTemplate): TemplateVariableValues {
  const vals: TemplateVariableValues = {};
  template.variables.forEach(v => { vals[v.internalKey] = ""; });
  return vals;
}

// ── Main page ─────────────────────────────────────────────────────────────────
function UseTemplateInner() {
  const { templateId } = useParams<{ templateId: string }>();
  const { state, loadTemplate } = useTemplates();
  const navigate = useNavigate();
  const t = state.activeTemplate;

  const [step,     setStep]     = useState<WizardStep>("roles");
  const [mappings, setMappings] = useState<TemplateRoleMapping[]>([]);
  const [varValues,setVarValues]= useState<TemplateVariableValues>({});
  const [launching,setLaunching]= useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const [launchDraftId, setLaunchDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) loadTemplate(templateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    if (t) {
      setMappings(buildInitialMappings(t));
      setVarValues(buildInitialVariables(t));
    }
  }, [t?.id]);

  usePageMeta();

  const handleMappingChange = (idx: number, patch: Partial<TemplateRoleMapping>) => {
    setMappings(m => m.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const validateStep = (): string | null => {
    if (step === "roles") {
      const missing = mappings.filter(m => m.required && (!m.displayName.trim() || !m.email.trim()));
      if (missing.length) return `Please complete all required participant fields (${missing.map(m => m.placeholderLabel).join(", ")}).`;
      const badEmail = mappings.filter(m => m.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email));
      if (badEmail.length) return `Invalid email address for: ${badEmail.map(m => m.placeholderLabel).join(", ")}.`;
    }
    if (step === "variables") {
      if (t) {
        const missing = t.variables.filter(v => v.required && !varValues[v.internalKey]);
        if (missing.length) return `Please fill in required variable: ${missing.map(v => v.label).join(", ")}.`;
      }
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    if (step === "roles") {
      setStep(t?.variables.length ? "variables" : "review");
    } else if (step === "variables") {
      setStep("review");
    }
  };

  const handleLaunch = async () => {
    if (!t) return;
    setLaunching(true);
    setError(null);
    try {
      const result = await asyncInstantiate(t.id, mappings, varValues);
      if (result.ok && result.prepDraftId) {
        setLaunchDraftId(result.prepDraftId);
        setLaunched(true);
      } else {
        setError(result.errorMessage ?? "Launch failed.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLaunching(false);
    }
  };

  // Loading state
  if (state.activeLoading || (!t && !state.activeError)) {
    return <div style={{ padding: 24 }}><style>{SKELETON_STYLE}</style><SkeletonBlock height={20} width={240} /></div>;
  }

  // Not found
  if (state.activeError || !t) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <AlertCircle size={32} color={RED} />
        <p style={{ ...GF, fontSize: 14, color: "#0F172A" }}>{state.activeError ?? "Template not found"}</p>
        <Link to="/app/templates" style={{ color: AZURE }}>← Templates</Link>
      </div>
    );
  }

  // Template not available
  if (t.status !== "available") {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <AlertCircle size={32} color={GOLD} />
        <p style={{ ...GF, fontSize: 14, color: "#0F172A", fontWeight: 600, marginBottom: 6 }}>Template Not Available</p>
        <p style={{ ...GF, fontSize: 13, color: "#64748B" }}>This template is currently {TEMPLATE_STATUS_LABELS[t.status]}.</p>
        <Link to={`/app/templates/${t.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, color: AZURE, ...GF, fontSize: 13 }}>
          ← Back to Template
        </Link>
      </div>
    );
  }

  // Launched!
  if (launched) {
    return (
      <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E6F4EA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <CheckCircle2 size={28} color={GREEN} />
          </div>
          <h2 style={{ ...GF, fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Draft Created
          </h2>
          <p style={{ ...GF, fontSize: 14, color: "#64748B", margin: "0 0 6px" }}>
            A signing request draft has been created from <strong>{t.name}</strong>.
          </p>
          <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "0 0 28px" }}>
            This is a demonstration — no real request was sent. Draft ID: <code style={{ background: "#F1F5F9", padding: "1px 5px", borderRadius: 4 }}>{launchDraftId}</code>
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to={`/app/prepare/${launchDraftId}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 20px", background: AZURE, color: "white", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
            >
              <ArrowRight size={14} />
              Continue in Prepare
            </Link>
            <Link
              to="/app/templates"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 20px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            >
              Templates Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Link to={`/app/templates/${templateId}`} style={{ ...GF, fontSize: 12, color: "#64748B", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={13} />
            {t.name}
          </Link>
          <span style={{ color: "#CBD5E1" }}>/</span>
          <span style={{ ...GF, fontSize: 12, color: "#0F172A" }}>Use Template</span>
        </div>
        <StepBar current={step} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, padding: "24px" }}>
        {error && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", background: "#FEF0F0", border: "1px solid #FECACA", borderRadius: 9, marginBottom: 16 }}>
            <AlertCircle size={14} color={RED} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ ...GF, fontSize: 13, color: "#7F1D1D" }}>{error}</span>
          </div>
        )}

        {step === "roles"     && <RoleMappingStep template={t} mappings={mappings} onChange={handleMappingChange} />}
        {step === "variables" && <VariablesStep variables={t.variables} values={varValues} onChange={(key, val) => setVarValues(v => ({ ...v, [key]: val }))} />}
        {step === "review"    && <ReviewStep template={t} mappings={mappings} variableValues={varValues} />}

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24 }}>
          {stepIdx > 0 && (
            <button
              onClick={() => { setError(null); setStep(STEPS[stepIdx - 1]!.id); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "#F1F5F9", color: "#0F172A", border: "none", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <ChevronLeft size={13} />
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step !== "review" ? (
            <button
              onClick={handleNext}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", background: AZURE, color: "white", border: "none", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Continue
              <ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={launching}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 22px", background: launching ? "#93C5FD" : AZURE, color: "white", border: "none", borderRadius: 8, ...GF, fontSize: 14, fontWeight: 700, cursor: launching ? "default" : "pointer" }}
            >
              <Zap size={15} />
              {launching ? "Launching…" : "Launch Signing Request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function UseTemplatePage() {
  return (
    <TemplateProvider>
      <UseTemplateInner />
    </TemplateProvider>
  );
}
