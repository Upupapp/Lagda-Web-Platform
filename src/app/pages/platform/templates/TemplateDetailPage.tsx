// /app/templates/:templateId — Template detail / overview page.
// Shows status, summary, placeholder list, routing, documents, usage, and action buttons.
// Inline styles only. No Burgundy. demonstrationOnly.

import { useEffect, useCallback, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronLeft, LayoutTemplate, FileText, Star,
  Edit2, Copy, Archive, RotateCcw, CheckCircle2, Eye,
  AlertCircle, AlertTriangle, PenLine, Zap, RefreshCw, Info, X, Trash2,
} from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import {
  TEMPLATE_STATUS_LABELS, TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_SCOPE_LABELS,
} from "../../../models/templates";
import type { DocumentTemplate } from "../../../models/templates";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../../models/prepare";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useViewport } from "../../../hooks/useViewport";
import { Z } from "../../../utils/z-index";
import { ConfirmDeleteTemplate } from "../../../components/templates/ConfirmDeleteTemplate";
import { deleteTemplate } from "../../../services/templates-source";
import { usePlatform } from "../../../context/PlatformContext";
import { useProcessing } from "../../../services/processing.service";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF    = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const GREEN = "#059669";
const RED   = "#DC2626";

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
  archived:    "#64748B",
  unavailable: "#64748B",
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
  canDelete, hasStatusLifecycle, pendingOp,
}: {
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
  const { isNarrow } = useViewport();
  const { id, status } = template;
  const busy = pendingOp !== "none";

  return (
    /* ── One horizontal row on a phone, scrolled ────────────────────────
       Wrapping produced four ragged rows of different widths that pushed
       the content below off the fold, and the primary action ended up
       visually level with Archive. A single row keeps the order meaningful
       — Use Template first, destructive last — and costs a swipe instead of
       a third of the screen.

       `WebkitOverflowScrolling` for momentum on iOS; the negative margin
       plus padding lets the row bleed to the screen edge so it reads as
       scrollable rather than clipped. */
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      ...(isNarrow
        ? {
            flexWrap: "nowrap" as const,
            overflowX: "auto" as const,
            WebkitOverflowScrolling: "touch" as const,
            scrollbarWidth: "none" as const,
            margin: "0 -16px",
            padding: "2px 16px 6px",
          }
        : { flexWrap: "wrap" as const }),
    }}>
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

      {/* Preview */}
      <Link
        to={`/app/templates/${id}/preview`}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
      >
        <Eye size={14} />
        Preview
      </Link>

      {/* Edit */}
      {status !== "archived" && (
        <Link
          to={`/app/templates/${id}/edit`}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <Edit2 size={14} />
          Edit
        </Link>
      )}

      {/* Fields */}
      {status !== "archived" && (
        <Link
          to={`/app/templates/${id}/fields`}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <PenLine size={14} />
          Fields
        </Link>
      )}

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        disabled={busy}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#0F172A", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.55 : 1 }}
      >
        <Copy size={14} />
        {pendingOp === "duplicate" ? "Duplicating…" : "Duplicate"}
      </button>

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
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "#F1F5F9", color: "#64748B", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", opacity: busy ? 0.55 : 1 }}
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
        {
          message: "Deleting the template",
          detail: "Documents already sent from it are not affected.",
        },
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
  const { state, loadTemplate, makeAvailable, returnToDraft, archive, restore, duplicate, clearOpMessage, canWrite } = useTemplates();
  const navigate = useNavigate();
  const t = state.activeTemplate;

  useEffect(() => {
    if (templateId) loadTemplate(templateId);
    return () => {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  usePageMeta();

  const handleDuplicate = useCallback(() => {
    if (!t) return;
    duplicate(t.id, r => {
      if (r.ok && r.newId) void navigate(`/app/templates/${r.newId}`);
    });
  }, [t, duplicate, navigate]);

  // Loading
  if (state.activeLoading) {
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
        <p style={{ ...GF, fontSize: 13, color: "#64748B", marginBottom: 16 }}>{state.activeError ?? "The requested template does not exist."}</p>
        <Link to="/app/templates" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "underline" }}>← Back to Templates</Link>
      </div>
    );
  }

  const routingLabelMap: Record<string, string> = {
    sequential:     "Sequential",
    parallel:       "Parallel (everyone at once)",
    mixed:          "Mixed",
    "approval-based":"Approval-based",
  };

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      {/* Breadcrumb header */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: isNarrow ? "18px 16px" : "18px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Link to="/app/templates" style={{ ...GF, fontSize: 12, color: "#64748B", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
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
              <span style={{ display: "inline-block", padding: "3px 9px", background: STATUS_BG[t.status] ?? "#F1F5F9", color: STATUS_TEXT[t.status] ?? "#64748B", borderRadius: 99, ...GF, fontSize: 11, fontWeight: 700 }}>
                {TEMPLATE_STATUS_LABELS[t.status]}
              </span>
              <span style={{ ...GF, fontSize: 12, color: "#94A3B8" }}>
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
          canDelete={canWrite}
          hasStatusLifecycle={!canWrite}
          pendingOp={state.pendingOp}
        />
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
        gridTemplateColumns: isNarrow ? "1fr" : "1fr 300px",
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
              <p style={{ ...GF, fontSize: 13, color: "#94A3B8", margin: 0 }}>No role placeholders defined.</p>
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
                        <Tag label={PREP_PARTICIPANT_ROLE_LABELS[ph.role] ?? ph.role} bg="#F1F5F9" color="#64748B" />
                        {!ph.required && <Tag label="Optional" bg="#F1F5F9" color="#94A3B8" />}
                      </div>
                      <p style={{ ...GF, fontSize: 12, color: "#64748B", margin: "3px 0 0", lineHeight: 1.5 }}>{ph.description}</p>
                    </div>
                    <div style={{ ...GF, fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>Step {ph.routingStep}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Documents */}
          <SectionCard title="Documents">
            {t.documents.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: "#94A3B8", margin: 0 }}>No documents attached.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {t.documents.map(doc => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F8FAFC", borderRadius: 8 }}>
                    <FileText size={15} color="#64748B" />
                    <span style={{ ...GF, fontSize: 13, color: "#0F172A", flex: 1 }}>{doc.displayName}</span>
                    <span style={{ ...GF, fontSize: 11, color: "#94A3B8" }}>{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Fields summary */}
          <SectionCard title={`Fields (${t.fields.length})`}>
            {t.fields.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: "#94A3B8", margin: 0 }}>No fields defined yet.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {t.fields.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#F1F5F9", borderRadius: 7 }}>
                    <PenLine size={11} color="#94A3B8" />
                    <span style={{ ...GF, fontSize: 11, color: "#334155" }}>{f.label}</span>
                    <span style={{ ...GF, fontSize: 10, color: "#94A3B8" }}>({f.type})</span>
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
                    <span style={{ ...GF, fontSize: 11, color: "#94A3B8" }}>{v.type}{v.required ? " *" : ""}</span>
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
                  color: "#94A3B8", width: 32, height: 32, display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {/* Details card */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Details</h3>
            <DetailRow label="Routing" value={routingLabelMap[t.routing.mode] ?? t.routing.mode} />
            <DetailRow label="Documents" value={`${t.documents.length}`} />
            <DetailRow label="Role Placeholders" value={`${t.placeholders.length}`} />
            <DetailRow label="Fields" value={`${t.fields.length}`} />
            <DetailRow label="Variables" value={`${t.variables.length}`} />
            <DetailRow label="Auth (default)" value={t.authentication.globalDefault.replace(/-/g, " ")} />
            <DetailRow label="Created" value={new Date(t.createdAt).toLocaleDateString()} />
            <DetailRow label="Last Updated" value={new Date(t.updatedAt).toLocaleDateString()} isLast />
          </div>

          {/* Usage card */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px" }}>
            <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Usage</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Star size={16} color={GOLD} />
              <span style={{ ...GF, fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>{t.usageSummary.timesUsed}</span>
              <span style={{ ...GF, fontSize: 12, color: "#64748B" }}>times used</span>
            </div>
            <DetailRow label="Last Used" value={t.usageSummary.lastUsedDate ? new Date(t.usageSummary.lastUsedDate).toLocaleDateString() : "Never"} />
            <DetailRow label="Draft Starts" value={`${t.usageSummary.recentDraftStarts}`} isLast />
            {t.usageSummary.demonstrationOnly && (
              <p style={{ ...GF, fontSize: 10, color: "#94A3B8", margin: "10px 0 0", fontStyle: "italic" }}>
                Demonstration counts only
              </p>
            )}
          </div>
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
      <span style={{ ...GF, fontSize: 12, color: "#94A3B8" }}>{label}</span>
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
