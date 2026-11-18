// /app/templates/:templateId — Template detail / overview page.
// Shows status, summary, placeholder list, routing, documents, usage, and action buttons.
// Inline styles only. No Burgundy. demonstrationOnly.

import { useCallback, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronLeft, LayoutTemplate, FileText, Star,
  Edit2, Copy, Archive, RotateCcw, CheckCircle2, Eye,
  AlertCircle, AlertTriangle, PenLine, Zap, RefreshCw, Info, X, Trash2,
  Type, UserPlus,
} from "lucide-react";
import { TemplateProvider, useTemplates, useActiveTemplateLoader } from "../../../context/TemplateContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import {
  TEMPLATE_STATUS_LABELS, TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_SCOPE_LABELS,
} from "../../../models/templates";
import type { DocumentTemplate } from "../../../models/templates";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../../models/prepare";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useDetailTitle } from "../../../hooks/useDetailTitle";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { useViewport } from "../../../hooks/useViewport";
import { Z } from "../../../utils/z-index";
import { ConfirmDeleteTemplate } from "../../../components/templates/ConfirmDeleteTemplate";
import { deleteTemplate } from "../../../services/templates-source";
import { usePlatform } from "../../../context/PlatformContext";
import { AssignToMemberDialog } from "../../../components/contact-requests/AssignToMemberDialog";
import { contactRequestsAvailable } from "../../../services/real/contact-request.service";
import { useWorkspaceAccess } from "../../../hooks/useWorkspaceAccess";
import { useProcessing } from "../../../services/processing.service";
import { processScreen } from "../../../config/process-screens";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const GOLD  = "#7D5C06";
const GREEN = "#166534";
const RED   = "#B91C1C";

const STATUS_BG: Record<string, string> = {
  available:   "#E6F4EA",
  draft:       "#FEF9E7",
  archived:    "#F1F5F9",
  unavailable: "#F1F5F9",
  invalid:     "#FEF0F0",
};
const STATUS_TEXT: Record<string, string> = {
  available:   GREEN,
  draft:       GOLD,
  archived:    "#5A6673",
  unavailable: "#5A6673",
  invalid:     RED,
};

// ── Small helpers ─────────────────────────────────────────────────────────────
function Tag({ label, bg = "#EEF4FB", color = "#0078D4" }: { label: string; bg?: string; color?: string }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 9px", background: bg, color, borderRadius: 99, ...GF, fontSize: 11, fontWeight: 600, marginRight: 4, marginBottom: 4 }}>
      {label}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 14 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
        <h3 style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#0F172A", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Action button strip ───────────────────────────────────────────────────────
function ActionStrip({
  template, onMakeAvailable, onReturnToDraft, onArchive, onRestore, onDuplicate, onDelete,
  canDelete, canEdit, canDuplicate, hasStatusLifecycle, pendingOp, onAssign,
}: {
  /** Opens the "assign to a team member" dialog; absent when this template cannot be assigned. */
  onAssign?:       () => void;
  /** Edit, Fields and Author: only for someone who may change the template. */
  canEdit:         boolean;
  /** Duplicate makes a new template. */
  canDuplicate:    boolean;
  template:        DocumentTemplate;
  onMakeAvailable: () => void;
  onReturnToDraft: () => void;
  onArchive:       () => void;
  onRestore:       () => void;
  onDuplicate:     () => void;
  onDelete:        () => void;
  /** Only where a delete can actually succeed. Fixtures have nowhere to
   *  delete from, and a destructive button that refuses is worse than none. */
  canDelete:       boolean;
  /**
   * Whether Make Available / Return to Draft / Archive / Restore mean
   * anything for this template. `true` for a fixture, whose in-memory
   * status these buttons genuinely change; `false` for a real, backend-
   * stored template — the backend has no status column at all (§ GAP 2.1),
   * so these buttons were previously rendered anyway and either silently
   * failed against a real id or "succeeded" against a session-local
   * fixture that was never the template being viewed. Hidden rather than
   * disabled: a disabled button with no visible reason is its own kind of
   * confusing, and there is no reason to show here that would not just be
   * restating this comment.
   */
  hasStatusLifecycle: boolean;
  pendingOp:       string;
}) {
  const { id, status } = template;
  const busy = pendingOp !== "none";

  return (
    /* Wraps at every width. On a phone this used to be one sideways-scrolling
       row: Edit, Fields, Author, Duplicate and Delete sat off the edge of the
       screen with nothing to say they were there. Wrapped, the primary action
       still comes first and every button is on screen. */
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {/* Primary: Use (available only) */}
      {status === "available" && (
        <Link
          to={`/app/templates/${id}/use`}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: AZURE, color: "white", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 700, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Zap size={14} />
          Use Template
        </Link>
      )}

      {onAssign !== undefined && (
        <button
          type="button" onClick={onAssign} disabled={busy} data-testid="assign-template"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F0FDFA", color: "#115E59", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.55 : 1, flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <UserPlus size={14} />
          Assign to a team member
        </button>
      )}

      {/* Preview */}
      <Link
        to={`/app/templates/${id}/preview`}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
      >
        <Eye size={14} />
        Preview
      </Link>

      {/* Edit */}
      {canEdit && status !== "archived" && (
        <Link
          to={`/app/templates/${id}/edit`}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Edit2 size={14} />
          Edit
        </Link>
      )}

      {/* Fields */}
      {canEdit && status !== "archived" && (
        <Link
          to={`/app/templates/${id}/fields`}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <PenLine size={14} />
          Fields
        </Link>
      )}

      {/* Author the document (066) — a peer of Fields, not something buried in
          the Documents tab. Offered whatever the template's document state is:
          the editor itself warns before replacing one that was uploaded. */}
      {canEdit && status !== "archived" && (
        <Link
          to={`/app/templates/${id}/author`}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Type size={14} />
          Author
        </Link>
      )}

      {/* Duplicate */}
      {canDuplicate && (
      <button
        onClick={onDuplicate}
        disabled={busy}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.55 : 1 }}
      >
        <Copy size={14} />
        {pendingOp === "duplicate" ? "Duplicating…" : "Duplicate"}
      </button>
      )}

      {/* Make Available / Return to Draft */}
      {hasStatusLifecycle && status === "draft" && (
        <button
          onClick={onMakeAvailable}
          disabled={busy || !!(template.validation && !template.validation.canMakeAvailable)}
          title={template.validation && !template.validation.canMakeAvailable ? "Template has validation errors" : undefined}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#E6F4EA", color: GREEN, borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", opacity: busy ? 0.55 : 1 }}
        >
          <CheckCircle2 size={14} />
          {pendingOp === "make-available" ? "Publishing…" : "Make Available"}
        </button>
      )}

      {hasStatusLifecycle && status === "available" && (
        <button
          onClick={onReturnToDraft}
          disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#FEF9E7", color: GOLD, borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", opacity: busy ? 0.55 : 1 }}
        >
          <RotateCcw size={14} />
          {pendingOp === "return-to-draft" ? "Working…" : "Return to Draft"}
        </button>
      )}

      {/* Archive / Restore */}
      {hasStatusLifecycle && status !== "archived" && (
        <button
          onClick={onArchive}
          disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#5A6673", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", opacity: busy ? 0.55 : 1 }}
        >
          <Archive size={14} />
          {pendingOp === "archive" ? "Archiving…" : "Archive"}
        </button>
      )}
      {hasStatusLifecycle && status === "archived" && (
        <button
          onClick={onRestore}
          disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#EEF4FB", color: AZURE, borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", opacity: busy ? 0.55 : 1 }}
        >
          <RefreshCw size={14} />
          {pendingOp === "restore" ? "Restoring…" : "Restore to Draft"}
        </button>
      )}

      {/* Delete — LAST in the row, and the only one tinted red. In a
          horizontally scrolling strip the order is what conveys severity,
          so the irreversible action sits furthest from the thumb's resting
          position rather than beside "Use Template". */}
      {canDelete && (
        <button
          onClick={onDelete}
          disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#FEF2F2", color: "#B91C1C", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.55 : 1, flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Trash2 size={14} />
          Delete
        </button>
      )}
    </div>
  );
}

// ── Detail page inner ─────────────────────────────────────────────────────────
function TemplateDetailInner() {
  const { isNarrow } = useViewport();
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const access = useWorkspaceAccess();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const platform = usePlatform();
  const { run: runProcessing } = useProcessing();

  const handleDelete = async () => {
    if (!t) return;
    setDeleteError(null);
    try {
      // The shared processing panel rather than a local spinner: it covers
      // the route change too, so the person is not returned to a list that
      // still shows the template they just removed.
      await runProcessing(
        processScreen("template-delete"),
        () => deleteTemplate(platform.currentWorkspace?.id, t.id),
      );
      setConfirmDelete(false);
      void navigate("/app/templates");
    } catch (err) {
      setConfirmDelete(false);
      setDeleteError(err instanceof Error && err.message !== ""
        ? err.message
        : "The template could not be deleted.");
    }
  };
  const { templateId } = useParams<{ templateId: string }>();
  const { state, makeAvailable, returnToDraft, archive, restore, duplicate, clearOpMessage, canWrite, canManage } = useTemplates();
  const navigate = useNavigate();
  const t = state.activeTemplate;
  // A real template with a document attached can be handed to a team member to prepare (086).
  const assignWorkspaceId = platform.currentWorkspace?.id;
  const assignDocumentId = t !== null && t !== undefined && contactRequestsAvailable(assignWorkspaceId)
    && (!access.confirmed || access.can("upload-request.create"))
    ? t.documents.find(doc => !doc.isPlaceholder)?.backendDocumentId ?? null
    : null;

  // Waits for the session bootstrap, and re-reads on a workspace change.
  useActiveTemplateLoader(templateId);

  usePageMeta();
  // The header crumb reads "Templates › <name>", not the record id.
  useDetailTitle(t?.name);

  const handleDuplicate = useCallback(() => {
    if (!t) return;
    duplicate(t.id, r => {
      if (r.ok && r.newId) void navigate(`/app/templates/${r.newId}`);
    });
  }, [t, duplicate, navigate]);

  // Loading — including the moment before the workspace is known, when no
  // read has started yet. Showing "Not Found" there flashed it on a refresh.
  if (state.activeLoading || (!t && !state.activeError)) {
    return (
      <div style={{ padding: "24px", ...GF }}>
        <style>{SKELETON_STYLE}</style>
        <SkeletonBlock height={20} width={200} />
        <div style={{ marginTop: 16 }}><SkeletonBlock height={36} width="60%" /></div>
        <div style={{ marginTop: 12 }}><SkeletonBlock height={16} width="40%" /></div>
      </div>
    );
  }

  // Not found / error
  if (state.activeError || !t) {
    return (
      <div style={{ padding: isNarrow ? "40px 16px" : "40px 24px", textAlign: "center" }}>
        <AlertCircle size={32} color={RED} style={{ marginBottom: 12 }} />
        <p style={{ ...GF, fontSize: 15, color: "#0F172A", fontWeight: 600 }}>Template Not Found</p>
        <p style={{ ...GF, fontSize: 13, color: "#5A6673", marginBottom: 16 }}>{state.activeError ?? "The requested template does not exist."}</p>
        <Link to="/app/templates" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "underline" }}>← Back to Templates</Link>
      </div>
    );
  }

  // "Approval-based" on its own overstates what happens: there is no
  // distinct approval record anywhere in the system, and an approver's act
  // is stored exactly as a signature is (see the backend contract's own
  // WorkflowRoutingModeSchema comment). The qualifier is what RoutingStep.tsx
  // and TemplateEditPage.tsx already say for the same mode; this was the one
  // remaining spot that dropped it.
  const routingLabelMap: Record<string, string> = {
    sequential:     "Sequential",
    parallel:       "Parallel (everyone at once)",
    mixed:          "Mixed",
    "approval-based":"Approval-based — approver goes first, a decline ends the request",
  };

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      {/* Breadcrumb header */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: isNarrow ? "18px 16px" : "18px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Link to="/app/templates" style={{ ...GF, fontSize: 12, color: "#5A6673", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={13} />
            Templates
          </Link>
          <span style={{ color: "#CBD5E1" }}>/</span>
          <span style={{ ...GF, fontSize: 12, color: "#0F172A" }}>{t.name}</span>
        </div>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EEF4FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LayoutTemplate size={20} color={AZURE} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{t.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "3px 9px", background: STATUS_BG[t.status] ?? "#F1F5F9", color: STATUS_TEXT[t.status] ?? "#5A6673", borderRadius: 99, ...GF, fontSize: 11, fontWeight: 700 }}>
                {TEMPLATE_STATUS_LABELS[t.status]}
              </span>
              <span style={{ ...GF, fontSize: 12, color: "#5B6776" }}>
                {TEMPLATE_CATEGORY_LABELS[t.category]} · {TEMPLATE_SCOPE_LABELS[t.scope]} · {t.ownerLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Op feedback */}
        {state.pendingMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#E6F4EA", border: "1px solid #BBF7D0", borderRadius: 8, marginBottom: 14 }}>
            <CheckCircle2 size={14} color={GREEN} />
            <span style={{ ...GF, fontSize: 13, color: "#14532D" }}>{state.pendingMessage}</span>
            <button onClick={clearOpMessage} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#14532D", fontSize: 14 }}>×</button>
          </div>
        )}
        {state.pendingError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FEF0F0", border: "1px solid #FECACA", borderRadius: 8, marginBottom: 14 }}>
            <AlertCircle size={14} color={RED} />
            <span style={{ ...GF, fontSize: 13, color: "#7F1D1D" }}>{state.pendingError}</span>
            <button onClick={clearOpMessage} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#7F1D1D", fontSize: 14 }}>×</button>
          </div>
        )}

        {/* Action strip */}
        <ActionStrip
          template={t}
          onMakeAvailable={() => makeAvailable(t.id)}
          onReturnToDraft={() => returnToDraft(t.id)}
          onArchive={() => archive(t.id)}
          onRestore={() => restore(t.id)}
          onDuplicate={handleDuplicate}
          onDelete={() => { setConfirmDelete(true); }}
          canDelete={canWrite && canManage.remove}
          canEdit={canManage.update}
          canDuplicate={canManage.create}
          hasStatusLifecycle={!canWrite}
          pendingOp={state.pendingOp}
          {...(assignDocumentId === null ? {} : { onAssign: () => { setAssignOpen(true); } })}
        />
        {assignOpen && assignDocumentId !== null && platform.currentWorkspace?.id !== undefined && (
          <AssignToMemberDialog
            workspaceId={platform.currentWorkspace.id}
            document={{ documentId: assignDocumentId, title: t.name }}
            label={t.name}
            onClose={() => { setAssignOpen(false); }}
          />
        )}
        {deleteError !== null && (
          <div style={{ ...GF, marginTop: 10, padding: "10px 13px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12.5, color: "#B91C1C" }}>
            {deleteError}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: isNarrow ? "20px 16px" : "20px 24px", display: "grid",
        // Top to bottom on a phone: a 300px sidebar next to a 1fr column left
        // the main content about 40px wide and pushed everything sideways.
        // `minmax(0, …)`: a bare 1fr cannot shrink below its content, so on a
        // tablet the 300px panel was pushed past the right edge.
        gridTemplateColumns: isNarrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 300px)",
        gap: 16, alignItems: "start" }}>

        {/* Main column */}
        <div>
          {/* Validation issues */}
          {state.activeValidation && (state.activeValidation.errors.length > 0 || state.activeValidation.warnings.length > 0) && (
            <div style={{ background: "white", border: `1px solid ${state.activeValidation.errors.length > 0 ? "#FECACA" : "#FEF3C7"}`, borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
              {state.activeValidation.errors.map(e => (
                <div key={e.id} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <AlertCircle size={13} color={RED} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ ...GF, fontSize: 12, color: "#7F1D1D" }}>{e.message}</span>
                </div>
              ))}
              {state.activeValidation.warnings.map(w => (
                <div key={w.id} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                  <AlertTriangle size={13} color={GOLD} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ ...GF, fontSize: 12, color: "#78350F" }}>{w.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {t.description && (
            <SectionCard title="Description">
              <p style={{ ...GF, fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.65 }}>{t.description}</p>
              {t.tags.length > 0 && (
                <div style={{ marginTop: 12 }}>{t.tags.map(tag => <Tag key={tag} label={tag} />)}</div>
              )}
            </SectionCard>
          )}

          {/* Role placeholders */}
          <SectionCard title="Role Placeholders">
            {t.placeholders.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: "#5B6776", margin: 0 }}>No role placeholders defined.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {t.placeholders.map((ph, idx) => (
                  <div key={ph.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#F8FAFC", borderRadius: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "#EEF4FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: AZURE }}>{idx + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{ph.label}</span>
                        <Tag label={PREP_PARTICIPANT_ROLE_LABELS[ph.role] ?? ph.role} bg="#F1F5F9" color="#5A6673" />
                        {!ph.required && <Tag label="Optional" bg="#F1F5F9" color="#5B6776" />}
                      </div>
                      <p style={{ ...GF, fontSize: 12, color: "#5A6673", margin: "3px 0 0", lineHeight: 1.5 }}>{ph.description}</p>
                    </div>
                    <div style={{ ...GF, fontSize: 11, color: "#5B6776", flexShrink: 0 }}>Step {ph.routingStep}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Documents */}
          <SectionCard title="Documents">
            {t.documents.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: "#5B6776", margin: 0 }}>No documents attached.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {t.documents.map(doc => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F8FAFC", borderRadius: 8 }}>
                    <FileText size={15} color="#5A6673" />
                    <span style={{ ...GF, fontSize: 13, color: "#0F172A", flex: 1 }}>{doc.displayName}</span>
                    <span style={{ ...GF, fontSize: 11, color: "#5B6776" }}>{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Fields summary */}
          <SectionCard title={`Fields (${t.fields.length})`}>
            {t.fields.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: "#5B6776", margin: 0 }}>No fields defined yet.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {t.fields.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#F1F5F9", borderRadius: 7 }}>
                    <PenLine size={11} color="#5B6776" />
                    <span style={{ ...GF, fontSize: 11, color: "#334155" }}>{f.label}</span>
                    <span style={{ ...GF, fontSize: 10, color: "#5B6776" }}>({f.type})</span>
                  </div>
                ))}
              </div>
            )}
            {t.fields.length > 0 && (
              <Link to={`/app/templates/${t.id}/fields`} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 12, ...GF, fontSize: 12, color: AZURE, textDecoration: "none", fontWeight: 600 }}>
                <PenLine size={12} />
                Edit Fields
              </Link>
            )}
          </SectionCard>

          {/* Variables */}
          {t.variables.length > 0 && (
            <SectionCard title={`Variables (${t.variables.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {t.variables.map(v => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F8FAFC", borderRadius: 8 }}>
                    <code style={{ ...GF, fontSize: 10, background: "#E2E8F0", padding: "2px 6px", borderRadius: 4, color: "#334155" }}>
                      {`{{${v.internalKey}}}`}
                    </code>
                    <span style={{ ...GF, fontSize: 12, color: "#0F172A", flex: 1 }}>{v.label}</span>
                    <span style={{ ...GF, fontSize: 11, color: "#5B6776" }}>{v.type}{v.required ? " *" : ""}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── Side panel ───────────────────────────────────────────────
            On a phone it is a sheet behind a toggle rather than a third
            screen of scrolling between the roles list and the footer.
            Details and Usage are reference, not the reason the page was
            opened — they should be reachable, not in the way. */}
        {isNarrow && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            style={{
              ...GF, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 7, width: "100%", padding: "11px 16px", borderRadius: 10,
              background: "white", border: "1px solid #E2E8F0",
              fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer",
            }}
          >
            <Info size={14} />
            Details &amp; usage
          </button>
        )}

        <div
          style={isNarrow ? {
            position: "fixed", inset: 0, zIndex: Z.modalScrim,
            background: "rgba(15, 23, 42, 0.45)",
            display: panelOpen ? "flex" : "none",
            alignItems: "flex-end", justifyContent: "center",
          } : undefined}
          onClick={isNarrow ? () => setPanelOpen(false) : undefined}
        >
        <div
          onClick={isNarrow ? e => e.stopPropagation() : undefined}
          style={isNarrow ? {
            position: "relative", zIndex: Z.modal,
            background: "#F8FAFC", width: "100%",
            borderRadius: "16px 16px 0 0", maxHeight: "85vh",
            overflowY: "auto", WebkitOverflowScrolling: "touch",
            padding: "16px 16px 24px",
          } : undefined}
        >
          {isNarrow && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 14, position: "sticky", top: 0,
              background: "#F8FAFC", paddingBottom: 8, zIndex: 1,
            }}>
              <h2 style={{ ...GF, fontSize: 15, fontWeight: 800, color: "#0F172A", margin: 0, flex: 1 }}>
                Details &amp; usage
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
                aria-label="Close"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#5B6776", width: 32, height: 32, display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {/* Details card */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#5A6673", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Details</h3>
            <DetailRow label="Routing" value={routingLabelMap[t.routing.mode] ?? t.routing.mode} />
            <DetailRow label="Documents" value={`${t.documents.length}`} />
            <DetailRow label="Role Placeholders" value={`${t.placeholders.length}`} />
            <DetailRow label="Fields" value={`${t.fields.length}`} />
            <DetailRow label="Variables" value={`${t.variables.length}`} />
            <DetailRow label="Auth (default)" value={t.authentication.globalDefault.replace(/-/g, " ")} />
            <DetailRow label="Created" value={new Date(t.createdAt).toLocaleDateString()} />
            <DetailRow label="Last Updated" value={new Date(t.updatedAt).toLocaleDateString()} isLast />
          </div>

          {/* Usage card. Demo build only: the backend tracks no template usage,
              so a real template's counts are placeholder zeros
              (real/templates.service.ts) and showing them claims a history
              that was never recorded. */}
          {!USE_REAL_BACKEND && (
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px" }}>
            <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#5A6673", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Usage</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Star size={16} color={GOLD} />
              <span style={{ ...GF, fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>{t.usageSummary.timesUsed}</span>
              <span style={{ ...GF, fontSize: 12, color: "#5A6673" }}>times used</span>
            </div>
            <DetailRow label="Last Used" value={t.usageSummary.lastUsedDate ? new Date(t.usageSummary.lastUsedDate).toLocaleDateString() : "Never"} />
            <DetailRow label="Draft Starts" value={`${t.usageSummary.recentDraftStarts}`} isLast />
            {t.usageSummary.demonstrationOnly && (
              <p style={{ ...GF, fontSize: 10, color: "#5B6776", margin: "10px 0 0", fontStyle: "italic" }}>
                Demonstration counts only
              </p>
            )}
          </div>
          )}
        </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDeleteTemplate
          templateName={t.name}
          onCancel={() => { setConfirmDelete(false); }}
          onConfirm={() => { void handleDelete(); }}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: isLast ? 0 : 10, marginBottom: isLast ? 0 : 10, borderBottom: isLast ? "none" : "1px solid #F1F5F9" }}>
      <span style={{ ...GF, fontSize: 12, color: "#5B6776" }}>{label}</span>
      <span style={{ ...GF, fontSize: 12, color: "#334155", fontWeight: 600, textAlign: "right", maxWidth: 160 }}>{value}</span>
    </div>
  );
}

// ── Export wrapped in provider ─────────────────────────────────────────────────
export function TemplateDetailPage() {
  return (
    <TemplateProvider>
      <TemplateDetailInner />
    </TemplateProvider>
  );
}
