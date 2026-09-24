// /app/templates/:templateId/preview — Read-only template preview.
// Renders the template's REAL document where it has one — uploaded or
// authored — with field overlays on top, plus role placeholder summary,
// routing diagram, and settings snapshot.
// Inline styles only. No Burgundy.

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import {
  ChevronLeft, Users, GitBranch,
  Settings, AlertCircle, Zap, PenLine,
} from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { usePlatform } from "../../../context/PlatformContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import {
  useRealDocument, DocumentPageSurface,
} from "../../../components/pdf/DocumentPageSurface";
import { realSigningRequestService } from "../../../services/real/signing-request.service";
import { realTemplatesAvailable } from "../../../services/templates-source";
import {
  TEMPLATE_STATUS_LABELS, TEMPLATE_CATEGORY_LABELS,
} from "../../../models/templates";
import type { DocumentTemplate } from "../../../models/templates";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../../models/prepare";
import { PARTICIPANT_ACCENT_COLORS } from "../../../models/field-editor";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF       = { fontFamily: "'Geist', sans-serif" };
const AZURE    = "#0078D4";
const GOLD     = "#C9960C";
const BGCANVAS = "#DFE3E8";
const BASE_W   = 595;
/** One rendered page, at A4 proportions. */
const PAGE_W   = Math.min(500, BASE_W);
const PAGE_H   = PAGE_W * (842 / 595);

// ── Fictional page ────────────────────────────────────────────────────────────
function FictionalPageBg({ pageNumber }: { pageNumber: number }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, padding: "9% 11% 8%", pointerEvents: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5%" }}>
        <div style={{ width: "28%", height: 13, background: "#E3E8EF", borderRadius: 3 }} />
        <div style={{ width: "18%", height: 13, background: "#EAECF0", borderRadius: 3 }} />
      </div>
      <div style={{ height: 1, background: "#DEE3EA", marginBottom: "5%" }} />
      {[0.6, 0.45, 0.7, 0.55, 0.5, 0.65, 0.4, 0.58, 0.62, 0.5].map((w, i) => (
        <div key={i} style={{ height: 8, width: `${w * 100}%`, background: "#EAECF0", borderRadius: 3, marginBottom: 7 }} />
      ))}
      <div style={{ position: "absolute", bottom: "2.5%", left: "11%", ...GF, fontSize: 8, color: "#B0BAC6" }}>
        Page {pageNumber} · Fictional Preview
      </div>
    </div>
  );
}

// ── Field overlay preview ─────────────────────────────────────────────────────
function PreviewFieldOverlay({ template, docId, pageId, placeholderColors }: {
  template: DocumentTemplate; docId: string; pageId: string;
  placeholderColors: Record<string, string>;
}) {
  const fields = template.fields.filter(f => f.documentId === docId && f.pageId === pageId);
  if (fields.length === 0) return null;
  return (
    <>
      {fields.map(f => {
        const color = f.placeholderId ? (placeholderColors[f.placeholderId] ?? AZURE) : "#94A3B8";
        return (
          <div
            key={f.id}
            title={`${f.label} (${f.type})`}
            style={{
              position:    "absolute",
              left:        `${f.rect.x * 100}%`,
              top:         `${f.rect.y * 100}%`,
              width:       `${f.rect.width * 100}%`,
              height:      `${f.rect.height * 100}%`,
              border:      `2px solid ${color}`,
              background:  `${color}18`,
              borderRadius:3,
              boxSizing:   "border-box",
              pointerEvents:"none",
              display:     "flex",
              alignItems:  "center",
              overflow:    "hidden",
            }}
          >
            <span style={{ ...GF, fontSize: 9, fontWeight: 700, color, paddingLeft: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {f.label}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Routing diagram ───────────────────────────────────────────────────────────
function RoutingDiagram({ template, placeholderColors }: {
  template: DocumentTemplate; placeholderColors: Record<string, string>;
}) {
  const groups = template.routing.groups.slice().sort((a, b) => a.step - b.step);
  if (groups.length === 0) return <p style={{ ...GF, fontSize: 12, color: "#94A3B8" }}>No routing groups defined.</p>;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {groups.map((g, idx) => (
        <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, minWidth: 100 }}>
            <div style={{ ...GF, fontSize: 9, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Step {g.step}</div>
            <div style={{ ...GF, fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 6 }}>{g.label}</div>
            {g.placeholderIds.map(pid => {
              const ph = template.placeholders.find(p => p.id === pid);
              if (!ph) return null;
              const color = placeholderColors[pid] ?? AZURE;
              return (
                <div key={pid} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ ...GF, fontSize: 10, color: "#64748B" }}>{ph.label}</span>
                </div>
              );
            })}
          </div>
          {idx < groups.length - 1 && (
            <span style={{ color: "#CBD5E1", fontSize: 16 }}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main preview ──────────────────────────────────────────────────────────────
function TemplatePreviewInner() {
  const { templateId } = useParams<{ templateId: string }>();
  const { state, loadTemplate } = useTemplates();
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id;
  const t = state.activeTemplate;
  const [activeDocIdx, setActiveDocIdx] = useState(0);

  useEffect(() => {
    if (templateId) loadTemplate(templateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  usePageMeta();

  // ── The real document ─────────────────────────────────────────────────────
  //
  // The same loader the field editor and the preparation editor use. This
  // page used to draw grey bars unconditionally, so a template with a genuine
  // document — uploaded, or authored through /author and rendered to a PDF —
  // previewed as a fictional placeholder and the banner below called it one.
  //
  // Hooks run before the early returns, so they are read from the template
  // defensively: `t` is null while loading and on the error path.
  const previewDocs = t?.documents ?? [];
  const previewDoc = previewDocs[activeDocIdx] ?? previewDocs[0];
  const realDocumentId = previewDoc?.backendDocumentId ?? null;
  const loadDocument = useMemo(
    () => (workspaceId === undefined || realDocumentId === null
      ? null
      : () => realSigningRequestService.documentContentBlob(workspaceId, realDocumentId)),
    [workspaceId, realDocumentId],
  );
  const realDocument = useRealDocument(loadDocument);
  const realDoc = realDocument.status === "ready" ? realDocument.doc : null;

  if (state.activeLoading || (!t && !state.activeError)) {
    return <div style={{ padding: 24 }}><style>{SKELETON_STYLE}</style><SkeletonBlock height={20} width={200} /><div style={{ marginTop: 14 }}><SkeletonBlock height={400} /></div></div>;
  }

  if (state.activeError || !t) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <AlertCircle size={32} color="#DC2626" />
        <p style={{ ...GF, fontSize: 14, color: "#0F172A" }}>{state.activeError ?? "Not found"}</p>
        <Link to="/app/templates" style={{ color: AZURE }}>← Templates</Link>
      </div>
    );
  }

  const docs = t.documents.length > 0
    ? t.documents
    : [{ id: "doc-1", displayName: "Document 1", pageCount: 1, order: 1, isPlaceholder: true as const }];
  const activeDoc = docs[activeDocIdx] ?? docs[0]!;

  // The real file is the authority on how many pages there are; the stored
  // count is a cache of it and can lag when an authored document is
  // regenerated at a different length. Same rule the field editor follows.
  const pageCount = realDocument.status === "ready"
    ? realDocument.pageCount
    : Math.max(activeDoc.pageCount, 1);

  // Whether this preview is showing a genuine document. Drives both the page
  // surface below and whether the "no real document" notice appears at all.
  const isRealPreview = realDoc !== null;
  const canAuthor = realTemplatesAvailable(workspaceId);

  const placeholderColors: Record<string, string> = {};
  t.placeholders.forEach((ph, idx) => {
    placeholderColors[ph.id] = PARTICIPANT_ACCENT_COLORS[idx % PARTICIPANT_ACCENT_COLORS.length] ?? AZURE;
  });

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Link to={`/app/templates/${templateId}`} style={{ ...GF, fontSize: 12, color: "#64748B", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={13} />
            {t.name}
          </Link>
          <span style={{ color: "#CBD5E1" }}>/</span>
          <span style={{ ...GF, fontSize: 12, color: "#0F172A" }}>Preview</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <h1 style={{ ...GF, fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 2px", letterSpacing: "-0.02em" }}>
              {t.name}
            </h1>
            <p style={{ ...GF, fontSize: 12, color: "#94A3B8", margin: 0 }}>
              Template Preview · {TEMPLATE_CATEGORY_LABELS[t.category]} · {TEMPLATE_STATUS_LABELS[t.status]}
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {/* Preview had no route to the authoring editor, so a template
                whose content needed writing looked like a dead end. */}
            {canAuthor && (
              <Link
                to={`/app/templates/${t.id}/author`}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "white", color: AZURE, border: `1.5px solid ${AZURE}`, borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                <PenLine size={13} />
                {isRealPreview ? "Edit content" : "Author content"}
              </Link>
            )}
            {t.status === "available" && (
              <Link
                to={`/app/templates/${t.id}/use`}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: AZURE, color: "white", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
              >
                <Zap size={13} />
                Use Template
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Shown only when there is genuinely nothing to render. This used to
          be unconditional and claimed every preview was fictional, including
          templates with a real uploaded or authored document behind them. */}
      {!isRealPreview && realDocument.status !== "loading" && (
        <div style={{ background: "#FEF9E7", borderBottom: "1px solid #FEF3C7", padding: "8px 24px", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={13} color={GOLD} />
          <span style={{ ...GF, fontSize: 12, color: "#78350F" }}>
            {realDocument.status === "error"
              ? "This template's document could not be loaded. The layout below is a placeholder."
              : "This template has no document yet — the layout below is a placeholder. Author or upload one to see the real pages."}
          </span>
        </div>
      )}

      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* Document preview column */}
        <div>
          {/* Doc tabs */}
          {docs.length > 1 && (
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {docs.map((doc, idx) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDocIdx(idx)}
                  style={{ ...GF, fontSize: 12, padding: "6px 14px", border: `1px solid ${activeDocIdx === idx ? AZURE : "#E2E8F0"}`, borderRadius: 8, background: activeDocIdx === idx ? "#EEF4FB" : "white", color: activeDocIdx === idx ? AZURE : "#64748B", cursor: "pointer", fontWeight: activeDocIdx === idx ? 700 : 400 }}
                >
                  {doc.displayName}
                </button>
              ))}
            </div>
          )}

          {/* Pages */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, background: BGCANVAS, padding: 24, borderRadius: 12 }}>
            {realDocument.status === "loading" && (
              <div style={{ width: PAGE_W, height: PAGE_H, background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", ...GF, fontSize: 12, color: "#94A3B8" }}>
                Loading document…
              </div>
            )}
            {realDocument.status !== "loading" && Array.from({ length: pageCount }, (_, i) => {
              const pageId = `page-${i + 1}`;
              return (
                <div
                  key={pageId}
                  style={{
                    position:   "relative",
                    width:      PAGE_W,
                    height:     PAGE_H,
                    background: "white",
                    boxShadow:  "0 4px 20px rgba(0,0,0,0.12)",
                    flexShrink: 0,
                  }}
                >
                  {/* The REAL page where there is one. The placeholder is the
                      fallback for a template with no document behind it. */}
                  {realDoc !== null ? (
                    <DocumentPageSurface
                      doc={realDoc}
                      pageNumber={i + 1}
                      width={PAGE_W}
                      height={PAGE_H}
                    />
                  ) : (
                    <FictionalPageBg pageNumber={i + 1} />
                  )}
                  <PreviewFieldOverlay
                    template={t}
                    docId={activeDoc.id}
                    pageId={pageId}
                    placeholderColors={placeholderColors}
                  />
                </div>
              );
            })}
          </div>

          {/* Field legend */}
          {t.placeholders.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {t.placeholders.map(ph => (
                <div key={ph.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: placeholderColors[ph.id] ?? AZURE, border: `2px solid ${placeholderColors[ph.id] ?? AZURE}` }} />
                  <span style={{ ...GF, fontSize: 12, color: "#334155" }}>{ph.label}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "#94A3B8", border: "2px solid #94A3B8" }} />
                <span style={{ ...GF, fontSize: 12, color: "#334155" }}>Sender Prefill</span>
              </div>
            </div>
          )}
        </div>

        {/* Info panels */}
        <div>
          {/* Role placeholders */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Users size={14} color={AZURE} />
              <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#0F172A", margin: 0 }}>Role Placeholders</h3>
            </div>
            {t.placeholders.map((ph, idx) => (
              <div key={ph.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: PARTICIPANT_ACCENT_COLORS[idx % PARTICIPANT_ACCENT_COLORS.length] ?? AZURE, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{ph.label}</div>
                  <div style={{ ...GF, fontSize: 10, color: "#94A3B8" }}>
                    {PREP_PARTICIPANT_ROLE_LABELS[ph.role] ?? ph.role} · Step {ph.routingStep}
                    {!ph.required && " · Optional"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Routing */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <GitBranch size={14} color={AZURE} />
              <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#0F172A", margin: 0 }}>Routing</h3>
            </div>
            <div style={{ ...GF, fontSize: 11, color: "#64748B", textTransform: "capitalize", marginBottom: 8 }}>
              {t.routing.mode.replace(/-/g, " ")}
            </div>
            <RoutingDiagram template={t} placeholderColors={placeholderColors} />
          </div>

          {/* Variables */}
          {t.variables.length > 0 && (
            <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
              <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#0F172A", margin: "0 0 10px" }}>Variables ({t.variables.length})</h3>
              {t.variables.map(v => (
                <div key={v.id} style={{ marginBottom: 7 }}>
                  <code style={{ ...GF, fontSize: 10, background: "#EEF4FB", color: AZURE, padding: "2px 6px", borderRadius: 4 }}>{`{{${v.internalKey}}}`}</code>
                  <span style={{ ...GF, fontSize: 11, color: "#64748B", marginLeft: 6 }}>{v.label}{v.required ? " *" : ""}</span>
                </div>
              ))}
            </div>
          )}

          {/* Settings snapshot */}
          <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Settings size={14} color={AZURE} />
              <h3 style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#0F172A", margin: 0 }}>Request Settings</h3>
            </div>
            <SettingRow label="Reminder" value={t.settings.reminderEnabled ? `Every ${t.settings.reminderIntervalDays}d` : "Off"} />
            <SettingRow label="Expiration" value={t.settings.expirationEnabled ? `After ${t.settings.expirationDays}d` : "Off"} />
            <SettingRow label="Auth Default" value={t.authentication.globalDefault.replace(/-/g, " ")} />
            <SettingRow label="Completion Copies" value={[t.settings.completionCopySender ? "Sender" : null, t.settings.completionCopyParticipants ? "All Participants" : null].filter(Boolean).join(", ") || "None"} isLast />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: isLast ? 0 : 8, marginBottom: isLast ? 0 : 8, borderBottom: isLast ? "none" : "1px solid #F1F5F9" }}>
      <span style={{ ...GF, fontSize: 11, color: "#94A3B8" }}>{label}</span>
      <span style={{ ...GF, fontSize: 11, color: "#334155", fontWeight: 600, textAlign: "right", maxWidth: 140, textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}

export function TemplatePreviewPage() {
  return (
    <TemplateProvider>
      <TemplatePreviewInner />
    </TemplateProvider>
  );
}
