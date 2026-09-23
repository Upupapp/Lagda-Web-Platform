// /app/templates/:templateId/edit — Template configuration editor.
// Sections: Details, Documents, Role Placeholders, Routing, Auth Defaults, Request Settings, Variables.
// Tab-based layout. All mutations are in-session only. demonstrationOnly.
// Inline styles only. No Burgundy.

import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import {
  ChevronLeft, AlertCircle, CheckCircle2, Save, Info,
  Users, FileText, Settings, GitBranch, Type, Shield,
  Plus, Trash2,
} from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { usePlatform } from "../../../context/PlatformContext";
import { useProcessing, buildSteps } from "../../../services/processing.service";
import {
  updateTemplate, realTemplatesAvailable, attachTemplateDocument, detachTemplateDocument,
} from "../../../services/templates-source";
import { realDocumentService } from "../../../services/real/document.service";
import { realOrganizationService } from "../../../services/real/organization.service";
import type { OrganizationUnit } from "../../../models/organization";
import { ApiError } from "../../../services/api-client";
import { VALID_PREP_PARTICIPANT_ROLES } from "../../../models/prepare";
import type { PrepParticipantRole } from "../../../models/prepare";
import type {
  TemplateRolePlaceholder, TemplateVariable, TemplateVariableType,
} from "../../../models/templates";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORIES,
} from "../../../models/templates";
import type {
  DocumentTemplate, TemplateCategory, TemplateScope,
} from "../../../models/templates";
import { TEMPLATE_VARIABLE_TYPE_LABELS } from "../../../models/templates";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../../models/prepare";
import type { PrepAuthMethodId } from "../../../models/prepare";
import { PREP_AUTH_METHODS } from "../../../models/prepare";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useViewport } from "../../../hooks/useViewport";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
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
//
// A stored template holds AT MOST ONE document (059's `document_id` +
// `source_artifact_id` pair). Adding one goes through the same two calls
// every upload in this platform makes — `realDocumentService.create` then
// `.upload` — followed by the one call unique to a template:
// `attachTemplateDocument`, which points the template at the result.
// Removing clears the reference only; the document and its bytes are
// untouched (see `detachTemplateDocument`'s own header).
function DocumentsTab({
  draft, workspaceId, canWrite, onChange,
}: {
  draft: DocumentTemplate;
  workspaceId: string | undefined;
  canWrite: boolean;
  onChange: (next: DocumentTemplate) => void;
}) {
  const { run } = useProcessing();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set only when the detach would actually lose something — see
  // handleRemoveClick. Confirmed once, then handleRemove runs for real.
  const [confirmDetach, setConfirmDetach] = useState(false);

  const doc = draft.documents[0];

  const UPLOAD_STAGES = [
    { id: "transfer", label: "Transferring your file" },
    { id: "process",  label: "Securing and preparing it" },
    { id: "attach",   label: "Attaching it to the template" },
  ];

  const handleFile = async (file: File) => {
    if (!workspaceId) return;
    setError(null);
    setBusy(true);
    try {
      const capacity = await realDocumentService.checkUploadCapacity();
      if (!capacity.available) {
        setError(capacity.message ?? "Uploads are temporarily unavailable.");
        return;
      }
      const updated = await run(
        {
          message: `Uploading ${file.name}`,
          detail: "Large documents can take a moment.",
          steps: buildSteps(UPLOAD_STAGES, "transfer"),
        },
        async ({ update }) => {
          const created = await realDocumentService.create(workspaceId, file.name);
          update({ steps: buildSteps(UPLOAD_STAGES, "process") });
          const result = await realDocumentService.upload(workspaceId, created.documentId, file);
          update({ steps: buildSteps(UPLOAD_STAGES, "attach") });
          return attachTemplateDocument(workspaceId, draft.id, {
            documentId: created.documentId, artifactId: result.artifactId,
          });
        },
      );
      onChange(updated);
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
        : "Something went wrong uploading this file. Please try again.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!workspaceId) return;
    setError(null);
    setConfirmDetach(false);
    setBusy(true);
    try {
      const updated = await run(
        { message: "Removing document", detail: "The document itself is not deleted." },
        () => detachTemplateDocument(workspaceId, draft.id),
      );
      onChange(updated);
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
        : "Something went wrong removing this document. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Detaching clears the WHOLE field layout — `detachWorkflowTemplateDocument`
   * wipes it unconditionally, because a field's geometry is meaningless
   * without the page count it was placed against. That is the right backend
   * behaviour; what was missing was telling the person about it before it
   * happens rather than after. A template with nothing placed loses nothing,
   * so it detaches immediately — the same one-click behaviour as before.
   */
  const handleRemoveClick = () => {
    if (draft.fields.length > 0) {
      setConfirmDetach(true);
      return;
    }
    void handleRemove();
  };

  return (
    <div>
      <div style={{ padding: "14px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, marginBottom: 16, display: "flex", gap: 8 }}>
        <Info size={14} color={AZURE} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ ...GF, fontSize: 12, color: "#334155", margin: 0, lineHeight: 1.6 }}>
          Attach the document senders will use every time this template is applied.
          Applying the template pre-fills the Upload step with it, ready to send as-is.
        </p>
      </div>

      {error !== null && (
        <div style={{ ...GF, marginBottom: 12, padding: "10px 13px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12.5, color: "#B91C1C" }}>
          {error}
        </div>
      )}

      {doc === undefined ? (
        <p style={{ ...GF, fontSize: 13, color: "#94A3B8" }}>No document attached to this template.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "white", border: "1px solid #E2E8F0", borderRadius: 9 }}>
            <FileText size={15} color="#64748B" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.displayName}</div>
              <div style={{ ...GF, fontSize: 11, color: "#94A3B8" }}>{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}</div>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={handleRemoveClick}
                disabled={busy}
                title="Remove document"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", borderRadius: 7, background: "none", color: busy ? "#CBD5E1" : "#DC2626", cursor: busy ? "default" : "pointer", flexShrink: 0 }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {confirmDetach && (
            <div style={{ padding: "12px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9 }}>
              <p style={{ ...GF, fontSize: 12.5, color: "#92400E", margin: "0 0 10px", lineHeight: 1.55 }}>
                This will also remove all {draft.fields.length} placed field{draft.fields.length !== 1 ? "s" : ""} — a field's
                position is meaningless without this document's page count, and there
                is no undo.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setConfirmDetach(false); }}
                  disabled={busy}
                  style={{ ...GF, padding: "7px 14px", borderRadius: 7, background: "white", border: "1px solid #FDE68A", color: "#92400E", fontSize: 12.5, fontWeight: 600, cursor: busy ? "default" : "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { void handleRemove(); }}
                  disabled={busy}
                  style={{ ...GF, padding: "7px 14px", borderRadius: 7, background: "#DC2626", border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer" }}
                >
                  {busy ? "Removing…" : "Remove document and fields"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canWrite && doc === undefined && (
        <div style={{ marginTop: 12 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", border: "1px dashed #C8E1F5", borderRadius: 8, background: "#F8FAFC", color: busy ? "#94A3B8" : AZURE, ...GF, fontSize: 12, fontWeight: 600, cursor: busy ? "default" : "pointer", minHeight: 44 }}
          >
            <Plus size={13} />
            Add document
          </button>
        </div>
      )}

      {!canWrite && (
        <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: "6px 0 0", lineHeight: 1.5 }}>
          Open a workspace to attach or remove a document.
        </p>
      )}
    </div>
  );
}

// ── One slot's resolution (061) ────────────────────────────────────────────
//
// Manual (the default, unchanged from before this existed) or automatic —
// "whoever currently holds [a title] in [a unit]", resolved live every
// time the template is applied. `units` is `null` while loading, `[]` once
// loaded with none (or in fixture mode, which has no unit concept at all).
function RoleResolutionField({ placeholder, units, onChange }: {
  placeholder: TemplateRolePlaceholder;
  units: OrganizationUnit[] | null;
  onChange: (patch: Partial<TemplateRolePlaceholder>) => void;
}) {
  const automatic = placeholder.resolution !== undefined;

  const setAutomatic = (on: boolean) => {
    if (!on) { onChange({ resolution: undefined }); return; }
    onChange({
      resolution: { mode: "unit-title", unitId: units?.[0]?.unitId ?? "", title: "" },
    });
  };

  if (units !== null && units.length === 0) {
    // No units exist yet in this workspace (or none loaded) — nothing to
    // resolve against. Shown as a quiet note rather than an empty toggle
    // that turns on to a picker with nothing in it.
    return (
      <p style={{ ...GF, fontSize: 11.5, color: "#94A3B8", margin: "8px 0 0", lineHeight: 1.5 }}>
        This role is filled by hand each time. Create an{" "}
        <Link to="/app/settings/organization" style={{ color: AZURE }}>organization unit</Link>{" "}
        to route it automatically by title instead.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #E2E8F0" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={automatic}
          onChange={e => { setAutomatic(e.target.checked); }}
          style={{ accentColor: AZURE, width: 14, height: 14, flexShrink: 0 }}
        />
        <span style={{ ...GF, fontSize: 12.5, color: "#475569" }}>
          Assign automatically, by title
        </span>
      </label>

      {automatic && (
        units === null ? (
          <p style={{ ...GF, fontSize: 11.5, color: "#94A3B8", margin: "8px 0 0" }}>Loading units…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 8 }}>
            <select
              value={placeholder.resolution?.unitId ?? ""}
              onChange={e => onChange({
                resolution: { mode: "unit-title", unitId: e.target.value, title: placeholder.resolution?.title ?? "" },
              })}
              style={{ ...GF, fontSize: 12.5, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", background: "white", cursor: "pointer", minWidth: 0 }}
            >
              {units.map(u => <option key={u.unitId} value={u.unitId}>{u.name}</option>)}
            </select>
            <input
              type="text"
              value={placeholder.resolution?.title ?? ""}
              onChange={e => onChange({
                resolution: { mode: "unit-title", unitId: placeholder.resolution?.unitId ?? "", title: e.target.value },
              })}
              placeholder="e.g. Department Head"
              style={{ ...GF, fontSize: 12.5, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", background: "white", minWidth: 0, boxSizing: "border-box" }}
            />
          </div>
        )
      )}
    </div>
  );
}

// ── Tab panel: Role Placeholders ───────────────────────────────────────────────
function PlaceholdersTab({ draft, workspaceId, onChange }: {
  draft: DocumentTemplate;
  workspaceId: string | undefined;
  onChange: (patch: Partial<DocumentTemplate>) => void;
}) {
  const slots = draft.placeholders;
  const [units, setUnits] = useState<OrganizationUnit[] | null>(null);

  useEffect(() => {
    if (!realTemplatesAvailable(workspaceId)) { setUnits([]); return; }
    let cancelled = false;
    realOrganizationService.listUnits(workspaceId!)
      .then(list => { if (!cancelled) setUnits(list.filter(u => u.archivedAt === null)); })
      .catch(() => { if (!cancelled) setUnits([]); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const patch = (id: string, p: Partial<TemplateRolePlaceholder>) =>
    onChange({ placeholders: slots.map(s2 => (s2.id === id ? { ...s2, ...p } : s2)) });

  const add = () =>
    onChange({
      placeholders: [...slots, {
        id: `slot-new-${String(Date.now())}`,
        label: "", role: "signer", required: true,
        routingStep: slots.length + 1, defaultAuthMethod: "none",
        description: "", mustMapToParticipant: true,
      }],
    });

  // Renumbered contiguously from 1. The backend refuses a template whose
  // routing steps skip a number, so a form that could produce one would fail
  // at save with a message about data the person never saw.
  const remove = (id: string) =>
    onChange({
      placeholders: slots.filter(s2 => s2.id !== id)
        .map((s2, i) => ({ ...s2, routingStep: Math.min(s2.routingStep, i + 1) })),
    });

  return (
    <div>
      <p style={{ ...GF, fontSize: 12.5, color: "#64748B", margin: "0 0 14px", lineHeight: 1.6 }}>
        Name the roles, not the people. You choose who fills each one every time
        you use this template.
      </p>

      {slots.length === 0 ? (
        <p style={{ ...GF, fontSize: 13, color: "#94A3B8" }}>No roles yet. Add the first one below.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {slots.map(ph => (
            <div key={ph.id} style={{ padding: "14px 16px", background: "white", border: "1px solid #E2E8F0", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
                  STEP {ph.routingStep}
                </span>
                {slots.length > 1 && (
                  <button
                    onClick={() => remove(ph.id)}
                    style={{ ...GF, marginLeft: "auto", fontSize: 12, color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                value={ph.label}
                onChange={e => patch(ph.id, { label: e.target.value })}
                placeholder="e.g. Department Head"
                style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 8, ...GF, fontSize: 13, color: "#0F172A", boxSizing: "border-box", outline: "none", marginBottom: 8 }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                <select
                  value={ph.role}
                  onChange={e => patch(ph.id, { role: e.target.value as PrepParticipantRole })}
                  style={{ ...GF, fontSize: 12.5, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", background: "white", cursor: "pointer", minWidth: 0 }}
                >
                  {VALID_PREP_PARTICIPANT_ROLES.map(r => (
                    <option key={r} value={r}>{PREP_PARTICIPANT_ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <select
                  value={String(ph.routingStep)}
                  onChange={e => patch(ph.id, { routingStep: Number(e.target.value) })}
                  style={{ ...GF, fontSize: 12.5, color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", background: "white", cursor: "pointer", minWidth: 0 }}
                >
                  {slots.map((_, i) => (
                    <option key={i} value={String(i + 1)}>Step {i + 1}</option>
                  ))}
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={ph.required}
                  onChange={e => patch(ph.id, { required: e.target.checked })}
                  style={{ accentColor: AZURE, width: 14, height: 14, flexShrink: 0 }}
                />
                <span style={{ ...GF, fontSize: 12.5, color: "#475569" }}>
                  Must act before later steps begin
                </span>
              </label>
              {!ph.required && (
                <p style={{ ...GF, fontSize: 11.5, color: "#94A3B8", margin: "6px 0 0 21px", lineHeight: 1.5 }}>
                  They will still receive the document at the same time as the
                  next step — it just will not wait for them.
                </p>
              )}

              <RoleResolutionField
                placeholder={ph}
                units={units}
                onChange={patch2 => patch(ph.id, patch2)}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={add}
        style={{ ...GF, marginTop: 10, fontSize: 13, fontWeight: 600, color: AZURE, background: "none", border: "1px dashed #C8E1F5", borderRadius: 8, padding: "9px 14px", cursor: "pointer", width: "100%" }}
      >
        + Add a role
      </button>
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
function SettingsTab({
  draft, canWrite, onChange,
}: {
  draft: DocumentTemplate;
  /** Whether this is a real, backend-stored template. Only
   *  `completionCopySender` has a real producer there (`notifySenderOnComplete`
   *  — see real/templates.service.ts's `defaultSettings`); every other
   *  control below is disabled for one rather than accepting input that
   *  looks saved and is discarded on reload. Fixture templates are
   *  unaffected — the mock service genuinely holds whatever is typed here. */
  canWrite: boolean;
  onChange: (patch: Partial<DocumentTemplate>) => void;
}) {
  const { isNarrow } = useViewport();
  const s = draft.settings;
  const patchSettings = (p: Partial<typeof s>) => onChange({ settings: { ...s, ...p } });
  // Only for a REAL template — see this component's own `canWrite` doc.
  const readOnly = canWrite;
  return (
    <div>
      {readOnly && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
          <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: 0 }}>
            Only “Send completion copy to sender” is saved today. The rest of
            this tab describes behaviour the backend does not have yet, and is
            shown read-only rather than accepting input that would be
            discarded on reload.
          </p>
        </div>
      )}
      <fieldset disabled={readOnly} style={{ border: "none", padding: 0, margin: 0, opacity: readOnly ? 0.6 : 1 }}>
      <FormField label="Invitation Email Subject">
        <Input value={s.invitationSubject} onChange={v => patchSettings({ invitationSubject: v })} placeholder="Subject line…" />
      </FormField>
      <FormField label="Invitation Message" hint="You may use {{variable}} tokens.">
        <Input value={s.invitationMessage} onChange={v => patchSettings({ invitationMessage: v })} multiline rows={5} placeholder="Message body…" />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 14 }}>
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
      </fieldset>
      <div style={{ marginTop: 14 }}>
        <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Completion Options</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={s.completionCopySender} onChange={e => patchSettings({ completionCopySender: e.target.checked })} />
          <span style={{ ...GF, fontSize: 13 }}>Send completion copy to sender</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: readOnly ? "default" : "pointer", opacity: readOnly ? 0.6 : 1 }}>
          <input type="checkbox" checked={s.completionCopyParticipants} disabled={readOnly} onChange={e => patchSettings({ completionCopyParticipants: e.target.checked })} />
          <span style={{ ...GF, fontSize: 13 }}>Send completion copy to all participants</span>
        </label>
      </div>
    </div>
  );
}

// ── Tab panel: Variables ──────────────────────────────────────────────────────
/** The five variable types the backend actually stores — `select` needs an
 *  `options` list `WorkflowTemplateVariableSchema` has no column for, so it
 *  is not offered here (see real/templates.service.ts's `toWireVariable`). */
const BACKEND_VARIABLE_TYPES: TemplateVariableType[] =
  ["short-text", "multiline-text", "date", "number", "yes-no"];

/** Lowercase letters, digits and underscores, starting with a letter —
 *  mirrors the backend's own `VARIABLE_KEY_PATTERN` exactly, so a key this
 *  accepts is never rejected on save. */
const VARIABLE_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

function VariablesTab({
  draft, onChange,
}: {
  draft: DocumentTemplate;
  onChange: (patch: Partial<DocumentTemplate>) => void;
}) {
  const vars = draft.variables;

  const patch = (id: string, p: Partial<TemplateVariable>) =>
    onChange({ variables: vars.map(v => (v.id === id ? { ...v, ...p } : v)) });

  const add = () => {
    const id = `var-new-${String(Date.now())}`;
    onChange({
      variables: [...vars, {
        id, internalKey: "", label: "", type: "short-text", required: false,
        helpText: "", placeholder: "",
      }],
    });
  };

  const remove = (id: string) =>
    onChange({ variables: vars.filter(v => v.id !== id) });

  // Duplicate and malformed keys are flagged here so the sender sees the
  // exact same problem Save would otherwise report only after a round trip
  // to the server — matching the backend's own two rules for a key
  // (validateVariables in workflow-templates.ts): the pattern, and
  // uniqueness case-insensitively.
  const keyCounts = new Map<string, number>();
  for (const v of vars) {
    const k = v.internalKey.trim().toLowerCase();
    if (k === "") continue;
    keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  }
  const keyIssue = (v: TemplateVariable): string | null => {
    const k = v.internalKey.trim();
    if (k === "") return "A key is required.";
    if (!VARIABLE_KEY_PATTERN.test(k)) {
      return "Lowercase letters, digits and underscores only, starting with a letter.";
    }
    if ((keyCounts.get(k.toLowerCase()) ?? 0) > 1) return "This key is used by another variable.";
    return null;
  };

  return (
    <div>
      <p style={{ ...GF, fontSize: 12.5, color: "#64748B", margin: "0 0 14px", lineHeight: 1.6 }}>
        Name a value a sender will fill in once, when they use this template.
      </p>
      <div style={{ marginBottom: 16, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
        <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: 0 }}>
          Variables are saved with the template, but nothing yet inserts a
          sender's typed value into an invitation or a document field —
          that connection is a later piece of work.
        </p>
      </div>

      {vars.length === 0 ? (
        <p style={{ ...GF, fontSize: 13, color: "#94A3B8" }}>No variables yet. Add the first one below.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {vars.map(v => {
            const issue = keyIssue(v);
            return (
              <div key={v.id} style={{ padding: "14px 16px", background: "white", border: "1px solid #E2E8F0", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <code style={{ ...GF, fontSize: 11, background: "#EEF4FB", color: AZURE, padding: "2px 7px", borderRadius: 5 }}>
                    {`{{${v.internalKey.trim() || "key"}}}`}
                  </code>
                  <button
                    onClick={() => remove(v.id)}
                    style={{ ...GF, marginLeft: "auto", fontSize: 12, color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Remove
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <FormField label="Label" required>
                    <Input value={v.label} onChange={val => patch(v.id, { label: val })} placeholder="e.g. Client Name" />
                  </FormField>
                  <FormField label="Key" required hint={issue ?? "Used as {{this_key}}."}>
                    <Input
                      value={v.internalKey}
                      onChange={val => patch(v.id, { internalKey: val.toLowerCase() })}
                      placeholder="e.g. client_name"
                    />
                  </FormField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                  <FormField label="Type">
                    <Select
                      value={v.type}
                      onChange={val => patch(v.id, { type: val as TemplateVariableType })}
                      options={BACKEND_VARIABLE_TYPES.map(t => [t, TEMPLATE_VARIABLE_TYPE_LABELS[t]])}
                    />
                  </FormField>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={v.required} onChange={e => patch(v.id, { required: e.target.checked })} />
                    <span style={{ ...GF, fontSize: 13 }}>Required</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={add}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, ...GF, fontSize: 13, fontWeight: 600, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <Plus size={14} />
        Add variable
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function TemplateEditInner() {
  const { isNarrow } = useViewport();
  const { templateId } = useParams<{ templateId: string }>();
  const { state, loadTemplate } = useTemplates();
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

  const platform = usePlatform();
  const { run: runProcessing } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  const canWrite = realTemplatesAvailable(workspaceId);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Set only when this save would orphan field placements — see handleSave.
  // Confirming re-invokes performSave directly, bypassing the check.
  const [confirmOrphanCount, setConfirmOrphanCount] = useState<number | null>(null);

  const performSave = async () => {
    if (!draft) return;
    setConfirmOrphanCount(null);
    setSaving(true);
    try {
      await runProcessing(
        { message: "Saving your changes", detail: "Updating the template's roles and routing." },
        () => updateTemplate(workspaceId, draft.id, {
          name: draft.name,
          routingMode: draft.routing.mode,
          placeholders: draft.placeholders,
          notifySenderOnComplete: draft.settings.completionCopySender,
          variables: draft.variables,
        }),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // The server's own reason where it gave one — a duplicate name or a
      // malformed slot is actionable, and "something went wrong" is not.
      setSaveError(err instanceof Error && err.message !== ""
        ? err.message
        : "The template could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaveError(null);

    if (!canWrite) {
      setSaveError("Open a workspace to save changes to a template.");
      return;
    }
    if (draft.name.trim() === "") {
      setSaveError("Template name is required.");
      return;
    }
    if (draft.placeholders.some(p => p.label.trim() === "")) {
      setSaveError("Every role needs a name.");
      return;
    }
    if (draft.variables.some(v => v.label.trim() === "" || !VARIABLE_KEY_PATTERN.test(v.internalKey.trim()))) {
      setSaveError("Every variable needs a label and a valid key.");
      return;
    }
    {
      const keys = draft.variables.map(v => v.internalKey.trim().toLowerCase());
      if (new Set(keys).size !== keys.length) {
        setSaveError("Two variables cannot share the same key.");
        return;
      }
    }

    // A role removed from the draft leaves any field placed FOR it with a
    // placeholderId nothing here names any more — updateWorkflowTemplate
    // deletes exactly those, silently and correctly (an orphaned slot
    // reference cannot be kept), but the sender who spent time placing them
    // deserves to know before that happens, not after.
    const currentPlaceholderIds = new Set(draft.placeholders.map(p => p.id));
    const orphanCount = draft.fields
      .filter(f => f.placeholderId !== null && !currentPlaceholderIds.has(f.placeholderId))
      .length;
    if (orphanCount > 0) {
      setConfirmOrphanCount(orphanCount);
      return;
    }

    await performSave();
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
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: isNarrow ? "16px 16px" : "16px 24px" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 6, ...GF, fontSize: 12, color: GREEN, whiteSpace: "nowrap" }}>
              <CheckCircle2 size={13} />
              Saved
            </div>
          )}
          {/* Offered only where a save can succeed. In fixture mode there is
              no workspace to write to, and a button that can only fail reads
              as a broken feature rather than an unavailable one. */}
          {canWrite && (
            <button
              onClick={() => { void handleSave(); }}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: saving ? "#93C5FD" : AZURE, color: "white", border: "none", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", whiteSpace: "nowrap" }}
            >
              <Save size={14} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>
        {saveError !== null && (
          <div style={{ ...GF, marginTop: 10, padding: "10px 13px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12.5, color: "#B91C1C" }}>
            {saveError}
          </div>
        )}
        {confirmOrphanCount !== null && (
          <div style={{ ...GF, marginTop: 10, padding: "12px 14px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <p style={{ fontSize: 12.5, color: "#92400E", margin: "0 0 10px", lineHeight: 1.55 }}>
              Removing {confirmOrphanCount === 1 ? "a role that has a field" : `roles that have ${confirmOrphanCount} fields`} placed
              for {confirmOrphanCount === 1 ? "it" : "them"} will also remove {confirmOrphanCount === 1 ? "that field" : "those fields"} — a
              field with no role to belong to cannot be kept. There is no undo.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setConfirmOrphanCount(null); }}
                disabled={saving}
                style={{ ...GF, padding: "7px 14px", borderRadius: 7, background: "white", border: "1px solid #FDE68A", color: "#92400E", fontSize: 12.5, fontWeight: 600, cursor: saving ? "default" : "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { void performSave(); }}
                disabled={saving}
                style={{ ...GF, padding: "7px 14px", borderRadius: 7, background: "#DC2626", border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: saving ? "default" : "pointer" }}
              >
                {saving ? "Saving…" : "Save and remove those fields"}
              </button>
            </div>
          </div>
        )}
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
        {activeTab === "documents"    && <DocumentsTab    draft={draft} workspaceId={workspaceId} canWrite={canWrite} onChange={setDraft} />}
        {activeTab === "placeholders" && <PlaceholdersTab draft={draft} workspaceId={workspaceId} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
        {activeTab === "routing"      && <RoutingTab      draft={draft} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
        {activeTab === "auth"         && <AuthTab         draft={draft} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
        {activeTab === "settings"     && <SettingsTab     draft={draft} canWrite={canWrite} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
        {activeTab === "variables"    && <VariablesTab    draft={draft} onChange={p => setDraft(d => d ? { ...d, ...p } : d)} />}
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
