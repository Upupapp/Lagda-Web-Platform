// /app/templates/:templateId/edit — Template configuration editor.
// Sections: Details, Documents, Role Placeholders, Routing, Auth Defaults, Request Settings, Variables.
// Tab-based layout. All mutations are in-session only. demonstrationOnly.
// Inline styles only. No Burgundy.

import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronLeft, AlertCircle, CheckCircle2, Save, Info,
  Users, FileText, Settings, GitBranch, Mail, Type, Shield,
  Plus, Trash2, GripVertical, AlertTriangle,
} from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import {
  TEMPLATE_STATUS_LABELS, TEMPLATE_CATEGORY_LABELS, TEMPLATE_SCOPE_LABELS,
  TEMPLATE_CATEGORIES, TEMPLATE_STATUS_TONE,
} from "../../../models/templates";
import type {
  DocumentTemplate, TemplateCategory, TemplateScope, TemplateRolePlaceholder,
  TemplateVariable, TemplateVariableType, TEMPLATE_VARIABLE_TYPE_LABELS as TVTL,
} from "../../../models/templates";
import { TEMPLATE_VARIABLE_TYPE_LABELS } from "../../../models/templates";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../../models/prepare";
import type { PrepParticipantRole, PrepAuthMethodId } from "../../../models/prepare";
import { PREP_AUTH_METHODS } from "../../../models/prepare";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const GREEN = "#059669";
const RED   = "#DC2626";

// ── Tab definition ────────────────────────────────────────────────────────────
const TABS = [
  { id: "details",      label: "Details",    icon: <Info size={13} />     },
  { id: "documents",    label: "Documents",  icon: <FileText size={13} /> },
  { id: "placeholders", label: "Roles",      icon: <Users size={13} />    },
  { id: "routing",      label: "Routing",    icon: <GitBranch size={13} />},
  { id: "auth",         label: "Auth",       icon: <Shield size={13} />   },
  { id: "settings",     label: "Settings",   icon: <Settings size={13} /> },
  { id: "variables",    label: "Variables",  icon: <Type size={13} />     },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: RED }}> *</span>}
      </label>
      {children}
      {hint && <p style={{ ...GF, fontSize: 11, color: "#94A3B8", margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, multiline, rows }: {
  value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number;
}) {
  const style = {
    width:        "100%",
    padding:      "9px 12px",
    border:       "1px solid #E2E8F0",
    borderRadius: 8,
    ...GF,
    fontSize:     13,
    color:        "#0F172A",
    background:   "white",
    boxSizing:    "border-box" as const,
    resize:       "vertical" as const,
    outline:      "none",
    fontFamily:   "inherit",
  };
  if (multiline) return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows ?? 4} style={style} />;
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...style, height: 38 }} />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", height: 38, padding: "0 10px", border: "1px solid #E2E8F0", borderRadius: 8, ...GF, fontSize: 13, color: "#0F172A", background: "white" }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// ── Tab panel: Details ────────────────────────────────────────────────────────
function DetailsTab({ draft, onChange }: { draft: DocumentTemplate; onChange: (patch: Partial<DocumentTemplate>) => void }) {
  return (
    <div>
      <FormField label="Template Name" required>
        <Input value={draft.name} onChange={v => onChange({ name: v })} placeholder="e.g. Engagement Letter — Standard" />
      </FormField>
      <FormField label="Description" hint="Displayed in the template library and Use Template flow.">
        <Input value={draft.description} onChange={v => onChange({ description: v })} multiline rows={4} placeholder="Describe what this template is for…" />
      </FormField>
      <FormField label="Category">
        <Select
          value={draft.category}
          onChange={v => onChange({ category: v as TemplateCategory })}
          options={TEMPLATE_CATEGORIES.map(c => [c, TEMPLATE_CATEGORY_LABELS[c]])}
        />
      </FormField>
      <FormField label="Scope">
        <Select
          value={draft.scope}
          onChange={v => onChange({ scope: v as TemplateScope })}
          options={[["personal", "Personal — only I can use this"], ["workspace", "Workspace — visible to team members"]]}
        />
      </FormField>
      <FormField label="Tags" hint="Space or comma-separated. Used for search.">
        <Input
          value={draft.tags.join(", ")}
          onChange={v => onChange({ tags: v.split(/[,\s]+/).map(t => t.trim()).filter(Boolean) })}
          placeholder="e.g. legal, client, fee-schedule"
        />
      </FormField>
    </div>
  );
}

// ── Tab panel: Documents ──────────────────────────────────────────────────────
function DocumentsTab({ draft }: { draft: DocumentTemplate }) {
  return (
    <div>
      <div style={{ padding: "14px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, marginBottom: 16, display: "flex", gap: 8 }}>
        <Info size={14} color={AZURE} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ ...GF, fontSize: 12, color: "#334155", margin: 0, lineHeight: 1.6 }}>
          In this demonstration, documents are shown as placeholders. In a live workspace, you would upload real PDF files here.
        </p>
      </div>
      {draft.documents.length === 0 ? (
        <p style={{ ...GF, fontSize: 13, color: "#94A3B8" }}>No documents attached to this template.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {draft.documents.map(doc => (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "white", border: "1px solid #E2E8F0", borderRadius: 9 }}>
              <GripVertical size={14} color="#CBD5E1" />
              <FileText size={15} color="#64748B" />
              <div style={{ flex: 1 }}>
                <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{doc.displayName}</div>
                <div style={{ ...GF, fontSize: 11, color: "#94A3B8" }}>{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""} · Placeholder</div>
              </div>
              <span style={{ ...GF, fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Demo document</span>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => alert("Document upload is not available in the frontend demonstration.")}
        style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", border: "1px dashed #CBD5E1", borderRadius: 8, background: "white", color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
      >
        <Plus size={13} />
        Add Document (Demo — no upload)
      </button>
    </div>
  );
}

// ── Tab panel: Role Placeholders ───────────────────────────────────────────────
function PlaceholdersTab({ draft }: { draft: DocumentTemplate }) {
  const ROLES: [PrepParticipantRole, string][] = Object.entries(PREP_PARTICIPANT_ROLE_LABELS) as [PrepParticipantRole, string][];
  return (
    <div>
      {draft.placeholders.length === 0 ? (
        <p style={{ ...GF, fontSize: 13, color: "#94A3B8" }}>No role placeholders defined.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {draft.placeholders.map((ph, idx) => (
            <div key={ph.id} style={{ padding: "14px 16px", background: "white", border: "1px solid #E2E8F0", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#EEF4FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ ...GF, fontSize: 10, fontWeight: 700, color: AZURE }}>{idx + 1}</span>
                </div>
                <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{ph.label}</span>
                {!ph.required && <span style={{ ...GF, fontSize: 10, color: "#94A3B8", background: "#F1F5F9", padding: "2px 6px", borderRadius: 99 }}>Optional</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Role</div>
                  <div style={{ ...GF, fontSize: 12, color: "#334155" }}>{PREP_PARTICIPANT_ROLE_LABELS[ph.role] ?? ph.role}</div>
                </div>
                <div>
                  <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Routing Step</div>
                  <div style={{ ...GF, fontSize: 12, color: "#334155" }}>Step {ph.routingStep}</div>
                </div>
                <div>
                  <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Default Auth</div>
                  <div style={{ ...GF, fontSize: 12, color: "#334155" }}>{ph.defaultAuthMethod.replace(/-/g, " ")}</div>
                </div>
                <div>
                  <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Description</div>
                  <div style={{ ...GF, fontSize: 12, color: "#334155", lineHeight: 1.4 }}>{ph.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
        <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: 0 }}>
          Role placeholder editing is available in the full implementation. Displayed here as read-only for this demonstration.
        </p>
      </div>
    </div>
  );
}

// ── Tab panel: Routing ────────────────────────────────────────────────────────
function RoutingTab({ draft, onChange }: { draft: DocumentTemplate; onChange: (patch: Partial<DocumentTemplate>) => void }) {
  const MODES: [string, string][] = [
    ["sequential",    "Sequential — steps in order, one at a time"],
    ["parallel",      "Parallel — all recipients at once"],
    ["mixed",         "Mixed — custom group order"],
    ["approval-based","Approval-based — approvers before signers"],
  ];
  return (
    <div>
      <FormField label="Routing Mode">
        <Select
          value={draft.routing.mode}
          onChange={v => onChange({ routing: { ...draft.routing, mode: v as DocumentTemplate["routing"]["mode"] } })}
          options={MODES}
        />
      </FormField>
      <div style={{ marginTop: 8 }}>
        <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Routing Groups</div>
        {draft.routing.groups.length === 0 ? (
          <p style={{ ...GF, fontSize: 13, color: "#94A3B8" }}>No routing groups defined.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {draft.routing.groups.map(g => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 9 }}>
                <span style={{ width: 22, height: 22, background: "#EEF4FB", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", ...GF, fontSize: 10, fontWeight: 700, color: AZURE, flexShrink: 0 }}>{g.step}</span>
                <span style={{ ...GF, fontSize: 13, color: "#0F172A", fontWeight: 600, flex: 1 }}>{g.label}</span>
                <span style={{ ...GF, fontSize: 12, color: "#94A3B8" }}>
                  {g.placeholderIds.map(pid => draft.placeholders.find(p => p.id === pid)?.label ?? pid).join(", ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab panel: Auth ────────────────────────────────────────────────────────────
function AuthTab({ draft, onChange }: { draft: DocumentTemplate; onChange: (patch: Partial<DocumentTemplate>) => void }) {
  const AUTH_METHODS = PREP_AUTH_METHODS.map(m => [m.id, m.label] as [string, string]);
  return (
    <div>
      <FormField label="Global Default Auth Method" hint="Applied to all role placeholders unless overridden below.">
        <Select
          value={draft.authentication.globalDefault}
          onChange={v => onChange({ authentication: { ...draft.authentication, globalDefault: v as PrepAuthMethodId } })}
          options={AUTH_METHODS}
        />
      </FormField>
      {draft.placeholders.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Per-Role Overrides</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {draft.placeholders.map(ph => {
              const override = draft.authentication.placeholderOverrides[ph.id] ?? draft.authentication.globalDefault;
              return (
                <div key={ph.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "white", border: "1px solid #E2E8F0", borderRadius: 9 }}>
                  <span style={{ ...GF, fontSize: 13, color: "#0F172A", flex: 1 }}>{ph.label}</span>
                  <select
                    value={override}
                    onChange={e => onChange({
                      authentication: {
                        ...draft.authentication,
                        placeholderOverrides: { ...draft.authentication.placeholderOverrides, [ph.id]: e.target.value as PrepAuthMethodId },
                      },
                    })}
                    style={{ ...GF, fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 7, padding: "5px 8px", background: "white" }}
                  >
                    {AUTH_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab panel: Settings ────────────────────────────────────────────────────────
function SettingsTab({ draft, onChange }: { draft: DocumentTemplate; onChange: (patch: Partial<DocumentTemplate>) => void }) {
  const s = draft.settings;
  const patchSettings = (p: Partial<typeof s>) => onChange({ settings: { ...s, ...p } });
  return (
    <div>
      <FormField label="Invitation Email Subject">
        <Input value={s.invitationSubject} onChange={v => patchSettings({ invitationSubject: v })} placeholder="Subject line…" />
      </FormField>
      <FormField label="Invitation Message" hint="You may use {{variable}} tokens.">
        <Input value={s.invitationMessage} onChange={v => patchSettings({ invitationMessage: v })} multiline rows={5} placeholder="Message body…" />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reminders</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={s.reminderEnabled} onChange={e => patchSettings({ reminderEnabled: e.target.checked })} />
            <span style={{ ...GF, fontSize: 13 }}>Enable reminders</span>
          </label>
          {s.reminderEnabled && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...GF, fontSize: 12, color: "#64748B" }}>Every</span>
              <input
                type="number" min={1} max={30}
                value={s.reminderIntervalDays}
                onChange={e => patchSettings({ reminderIntervalDays: Number(e.target.value) })}
                style={{ width: 56, height: 34, border: "1px solid #E2E8F0", borderRadius: 7, ...GF, fontSize: 12, padding: "0 8px" }}
              />
              <span style={{ ...GF, fontSize: 12, color: "#64748B" }}>days</span>
            </div>
          )}
        </div>
        <div>
          <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Expiration</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={s.expirationEnabled} onChange={e => patchSettings({ expirationEnabled: e.target.checked })} />
            <span style={{ ...GF, fontSize: 13 }}>Enable expiration</span>
          </label>
          {s.expirationEnabled && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...GF, fontSize: 12, color: "#64748B" }}>Expires after</span>
              <input
                type="number" min={1} max={365}
                value={s.expirationDays}
                onChange={e => patchSettings({ expirationDays: Number(e.target.value) })}
                style={{ width: 56, height: 34, border: "1px solid #E2E8F0", borderRadius: 7, ...GF, fontSize: 12, padding: "0 8px" }}
              />
              <span style={{ ...GF, fontSize: 12, color: "#64748B" }}>days</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Completion Options</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={s.completionCopySender} onChange={e => patchSettings({ completionCopySender: e.target.checked })} />
          <span style={{ ...GF, fontSize: 13 }}>Send completion copy to sender</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={s.completionCopyParticipants} onChange={e => patchSettings({ completionCopyParticipants: e.target.checked })} />
          <span style={{ ...GF, fontSize: 13 }}>Send completion copy to all participants</span>
        </label>
      </div>
    </div>
  );
}

// ── Tab panel: Variables ──────────────────────────────────────────────────────
function VariablesTab({ draft }: { draft: DocumentTemplate }) {
  const VAR_TYPES: [string, string][] = Object.entries(TEMPLATE_VARIABLE_TYPE_LABELS);
  return (
    <div>
      <p style={{ ...GF, fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        Variables allow senders to customize invitation messages and document content when using this template. Use <code>{`{{variable_key}}`}</code> tokens in invitation text.
      </p>
      {draft.variables.length === 0 ? (
        <p style={{ ...GF, fontSize: 13, color: "#94A3B8" }}>No variables defined.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {draft.variables.map(v => (
            <div key={v.id} style={{ padding: "12px 14px", background: "white", border: "1px solid #E2E8F0", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <code style={{ ...GF, fontSize: 11, background: "#EEF4FB", color: AZURE, padding: "2px 7px", borderRadius: 5 }}>{`{{${v.internalKey}}}`}</code>
                <span style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{v.label}</span>
                <span style={{ ...GF, fontSize: 11, color: "#94A3B8", marginLeft: "auto" }}>{TEMPLATE_VARIABLE_TYPE_LABELS[v.type]}{v.required ? " · Required" : " · Optional"}</span>
              </div>
              {v.helpText && <p style={{ ...GF, fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.5 }}>{v.helpText}</p>}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
        <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: 0 }}>Variable editing is available in the full implementation. Displayed here as read-only for this demonstration.</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function TemplateEditInner() {
  const { templateId } = useParams<{ templateId: string }>();
  const { state, loadTemplate, clearOpMessage } = useTemplates();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [draft, setDraft] = useState<DocumentTemplate | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (templateId) loadTemplate(templateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    if (state.activeTemplate && !draft) {
      setDraft(state.activeTemplate);
    }
  }, [state.activeTemplate, draft]);

  usePageMeta();

  const handleSave = () => {
    // In-memory only — no real persistence
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (state.activeLoading || !draft) {
    return <div style={{ padding: 24 }}><style>{SKELETON_STYLE}</style><SkeletonBlock height={22} width={200} /><div style={{ marginTop: 14 }}><SkeletonBlock height={300} /></div></div>;
  }

  if (state.activeError) {
    return <div style={{ padding: 24 }}><AlertCircle size={18} color={RED} /><p style={{ ...GF, fontSize: 14 }}>{state.activeError}</p><Link to="/app/templates" style={{ color: AZURE }}>← Templates</Link></div>;
  }

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Link to={`/app/templates/${templateId}`} style={{ ...GF, fontSize: 12, color: "#64748B", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={13} />
            {draft.name}
          </Link>
          <span style={{ color: "#CBD5E1" }}>/</span>
          <span style={{ ...GF, fontSize: 12, color: "#0F172A" }}>Edit</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ ...GF, fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>Edit Template</h1>
          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, ...GF, fontSize: 12, color: GREEN }}>
              <CheckCircle2 size={13} />
              Saved (demo — in memory only)
            </div>
          )}
          <button
            onClick={handleSave}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: AZURE, color: "white", border: "none", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "0 24px", display: "flex", gap: 2 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display:     "inline-flex",
              alignItems:  "center",
              gap:         6,
              padding:     "10px 14px",
              border:      "none",
              borderBottom:`2px solid ${activeTab === tab.id ? AZURE : "transparent"}`,
              background:  "none",
              color:       activeTab === tab.id ? AZURE : "#64748B",
              ...GF,
              fontSize:    12,
              fontWeight:  activeTab === tab.id ? 700 : 500,
              cursor:      "pointer",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: "24px", maxWidth: 640 }}>
        {activeTab === "details"      && <DetailsTab      draft={draft} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
        {activeTab === "documents"    && <DocumentsTab    draft={draft} />}
        {activeTab === "placeholders" && <PlaceholdersTab draft={draft} />}
        {activeTab === "routing"      && <RoutingTab      draft={draft} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
        {activeTab === "auth"         && <AuthTab         draft={draft} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
        {activeTab === "settings"     && <SettingsTab     draft={draft} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
        {activeTab === "variables"    && <VariablesTab    draft={draft} />}
      </div>
    </div>
  );
}

export function TemplateEditPage() {
  return (
    <TemplateProvider>
      <TemplateEditInner />
    </TemplateProvider>
  );
}
