// /app/templates/:templateId/preview — Read-only template preview.
// Renders the template's REAL document where it has one — uploaded or
// authored — with field overlays on top, plus role placeholder summary,
// routing diagram, and settings snapshot.
// Inline styles only. No Burgundy.

import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useParams, Link } from "react-router";
import {
  ChevronLeft, ChevronDown, Users, GitBranch,
  Settings, AlertCircle, Zap, PenLine, Type,
} from "lucide-react";
import { TemplateProvider, useTemplates, useActiveTemplateLoader } from "../../../context/TemplateContext";
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
import { useDetailTitle } from "../../../hooks/useDetailTitle";
import { useMediaQuery } from "../../../hooks/useViewport";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF       = { fontFamily: "'Geist', sans-serif" };
const AZURE    = "#0078D4";
const AZURE_DEEP = "#005A9E";
const GOLD     = "#C9960C";
const BGCANVAS = "#DFE3E8";
const BASE_W   = 595;
/** One rendered page, at A4 proportions. */
const PAGE_W   = Math.min(500, BASE_W);
const PAGE_RATIO = 842 / 595;

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
function PreviewFieldOverlay({ template, docId, pageId, placeholderColors, scale = 1 }: {
  template: DocumentTemplate; docId: string; pageId: string;
  placeholderColors: Record<string, string>;
  /** Page width relative to the 100% size, so labels shrink with the page. */
  scale?: number;
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
              border:      `${scale < 0.75 ? 1.5 : 2}px solid ${color}`,
              background:  `${color}18`,
              borderRadius:3,
              boxSizing:   "border-box",
              pointerEvents:"none",
              display:     "flex",
              alignItems:  "center",
              overflow:    "hidden",
            }}
          >
            <span style={{ ...GF, fontSize: Math.max(6, 9 * scale), fontWeight: 700, color, paddingLeft: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
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
  if (groups.length === 0) return <p style={{ ...GF, fontSize: 12, color: "#475569" }}>No routing groups defined.</p>;

  return (
    <ol className="tpv-flow" aria-label="Routing order" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {groups.map((g, idx) => (
        <li key={g.id} className="tpv-flow-item">
          <div className="tpv-flow-box" style={{ padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 }}>
            <div style={{ ...GF, fontSize: 10.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Step {g.step}</div>
            <div className="tpv-wrap" style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>{g.label}</div>
            {g.placeholderIds.map(pid => {
              const ph = template.placeholders.find(p => p.id === pid);
              if (!ph) return null;
              const color = placeholderColors[pid] ?? AZURE;
              return (
                <div key={pid} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, minWidth: 0 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span className="tpv-wrap" style={{ ...GF, fontSize: 11.5, color: "#475569", minWidth: 0 }}>{ph.label}</span>
                </div>
              );
            })}
          </div>
          {idx < groups.length - 1 && (
            <span className="tpv-flow-arrow" aria-hidden style={{ color: "#64748B", fontSize: 16, lineHeight: 1 }}>→</span>
          )}
        </li>
      ))}
    </ol>
  );
}

// ── Main preview ──────────────────────────────────────────────────────────────
function TemplatePreviewInner() {
  const { templateId } = useParams<{ templateId: string }>();
  const { state } = useTemplates();
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id;
  const t = state.activeTemplate;
  const [activeDocIdx, setActiveDocIdx] = useState(0);

  // Waits for the session bootstrap, and re-reads on a workspace change.
  useActiveTemplateLoader(templateId);

  usePageMeta();
  // The header crumb names the template, not its id.
  useDetailTitle(t?.name);

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
  // Below this the side details drop under the document as collapsible cards.
  const narrowLayout = useMediaQuery("(max-width: 899px)");

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

  const singleColumn = narrowLayout;
  const placeholderColors: Record<string, string> = {};
  t.placeholders.forEach((ph, idx) => {
    placeholderColors[ph.id] = PARTICIPANT_ACCENT_COLORS[idx % PARTICIPANT_ACCENT_COLORS.length] ?? AZURE;
  });

  const actions = (
    <>
      {/* Preview had no route to the authoring editor, so a template
          whose content needed writing looked like a dead end. */}
      {canAuthor && (
        <Link
          to={`/app/templates/${t.id}/author`}
          className="tpv-action"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, padding: "0 16px", background: "white", color: AZURE_DEEP, border: `1.5px solid ${AZURE}`, borderRadius: 8, ...GF, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", boxSizing: "border-box" }}
        >
          <PenLine size={14} aria-hidden />
          {isRealPreview ? "Edit content" : "Author content"}
        </Link>
      )}
      {t.status === "available" && (
        <Link
          to={`/app/templates/${t.id}/use`}
          className="tpv-action"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, padding: "0 16px", background: AZURE, color: "white", borderRadius: 8, ...GF, fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", boxSizing: "border-box" }}
        >
          <Zap size={14} aria-hidden />
          Use Template
        </Link>
      )}
    </>
  );
  const hasActions = canAuthor || t.status === "available";

  return (
    <div className="tpv-root" style={{ background: "#F8FAFC", minHeight: "100%", ...GF }}>
      <style>{TPV_STYLES}</style>
      {/* Header — line 1: back link + title; line 2: meta + actions. */}
      <div className="tpv-pad" style={{ background: "white", borderBottom: "1px solid #E2E8F0", paddingTop: 16, paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Link
            to={`/app/templates/${templateId ?? t.id}`}
            aria-label={`Back to ${t.name}`}
            title="Back to template"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, color: "#334155", flexShrink: 0, border: "1px solid #E2E8F0", boxSizing: "border-box" }}
          >
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <h1 title={t.name} style={{ ...GF, fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.02em", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.name}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 12px", marginTop: 10 }}>
          <p style={{ ...GF, fontSize: 12.5, color: "#475569", margin: 0, flex: "1 1 200px", minWidth: 0 }}>
            Template Preview · {TEMPLATE_CATEGORY_LABELS[t.category]} · {TEMPLATE_STATUS_LABELS[t.status]}
          </p>
          {hasActions && (
            <div className="tpv-header-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Shown only when there is genuinely nothing to render. This used to
          be unconditional and claimed every preview was fictional, including
          templates with a real uploaded or authored document behind them. */}
      {!isRealPreview && realDocument.status !== "loading" && (
        <div className="tpv-pad" style={{ background: "#FEF9E7", borderBottom: "1px solid #FEF3C7", paddingTop: 8, paddingBottom: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <AlertCircle size={14} color={GOLD} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
          <span style={{ ...GF, fontSize: 12.5, color: "#78350F" }}>
            {realDocument.status === "error"
              ? "This template's document could not be loaded. The layout below is a placeholder."
              : "This template has no document yet — the layout below is a placeholder. Author or upload one to see the real pages."}
          </span>
        </div>
      )}

      <div className="tpv-body tpv-pad" data-testid="tpv-body" data-layout={singleColumn ? "single" : "split"} style={{ paddingTop: 20, paddingBottom: 20 }}>

        {/* Document preview column */}
        <div style={{ minWidth: 0 }}>
          {/* Doc tabs */}
          {docs.length > 1 && (
            <div className="tpv-doc-tabs" style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", whiteSpace: "nowrap" }}>
              {docs.map((doc, idx) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDocIdx(idx)}
                  aria-pressed={activeDocIdx === idx}
                  style={{ ...GF, fontSize: 12.5, minHeight: 36, padding: "0 14px", border: `1px solid ${activeDocIdx === idx ? AZURE : "#E2E8F0"}`, borderRadius: 8, background: activeDocIdx === idx ? "#EEF4FB" : "white", color: activeDocIdx === idx ? AZURE_DEEP : "#475569", cursor: "pointer", fontWeight: activeDocIdx === idx ? 700 : 500, flexShrink: 0 }}
                >
                  {doc.displayName}
                </button>
              ))}
            </div>
          )}

          <PreviewCanvas
            loading={realDocument.status === "loading"}
            realDoc={realDoc}
            pageCount={pageCount}
            template={t}
            docId={activeDoc.id}
            placeholderColors={placeholderColors}
          />

          {/* Field legend */}
          {t.placeholders.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {t.placeholders.map(ph => (
                <div key={ph.id} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: placeholderColors[ph.id] ?? AZURE, flexShrink: 0 }} />
                  <span className="tpv-wrap" style={{ ...GF, fontSize: 12.5, color: "#334155" }}>{ph.label}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "#64748B", flexShrink: 0 }} />
                <span style={{ ...GF, fontSize: 12.5, color: "#334155" }}>Sender Prefill</span>
              </div>
            </div>
          )}
        </div>

        {/* Info panels — beside the document on wide screens, collapsible
            cards below it on narrow ones. */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <InfoCard id="roles" title="Role Placeholders" icon={<Users size={14} color={AZURE} aria-hidden />} collapsible={singleColumn} defaultOpen>
            {t.placeholders.map((ph, idx) => (
              <div key={ph.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, marginTop: 3, background: PARTICIPANT_ACCENT_COLORS[idx % PARTICIPANT_ACCENT_COLORS.length] ?? AZURE, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tpv-wrap" style={{ ...GF, fontSize: 12.5, fontWeight: 600, color: "#0F172A" }}>{ph.label}</div>
                  <div style={{ ...GF, fontSize: 11.5, color: "#475569" }}>
                    {PREP_PARTICIPANT_ROLE_LABELS[ph.role] ?? ph.role} · Step {ph.routingStep}
                    {!ph.required && " · Optional"}
                  </div>
                </div>
              </div>
            ))}
          </InfoCard>

          <InfoCard id="routing" title="Routing" icon={<GitBranch size={14} color={AZURE} aria-hidden />} collapsible={singleColumn}>
            <div style={{ ...GF, fontSize: 12, color: "#475569", textTransform: "capitalize", marginBottom: 8 }}>
              {t.routing.mode.replace(/-/g, " ")}
            </div>
            <RoutingDiagram template={t} placeholderColors={placeholderColors} />
          </InfoCard>

          {t.variables.length > 0 && (
            <InfoCard id="variables" title={`Variables (${String(t.variables.length)})`} icon={<Type size={14} color={AZURE} aria-hidden />} collapsible={singleColumn}>
              {t.variables.map(v => (
                <div key={v.id} style={{ marginBottom: 8 }}>
                  <code className="tpv-wrap" style={{ ...GF, fontSize: 11, background: "#EEF4FB", color: AZURE_DEEP, padding: "2px 6px", borderRadius: 4, display: "inline-block", maxWidth: "100%" }}>{`{{${v.internalKey}}}`}</code>
                  <span className="tpv-wrap" style={{ ...GF, fontSize: 12, color: "#475569", marginLeft: 6 }}>{v.label}{v.required ? " *" : ""}</span>
                </div>
              ))}
            </InfoCard>
          )}

          <InfoCard id="settings" title="Request Settings" icon={<Settings size={14} color={AZURE} aria-hidden />} collapsible={singleColumn}>
            <SettingRow label="Reminder" value={t.settings.reminderEnabled ? `Every ${String(t.settings.reminderIntervalDays)}d` : "Off"} />
            <SettingRow label="Expiration" value={t.settings.expirationEnabled ? `After ${String(t.settings.expirationDays)}d` : "Off"} />
            <SettingRow label="Auth Default" value={t.authentication.globalDefault.replace(/-/g, " ")} />
            <SettingRow label="Completion Copies" value={[t.settings.completionCopySender ? "Sender" : null, t.settings.completionCopyParticipants ? "All Participants" : null].filter(Boolean).join(", ") || "None"} isLast />
          </InfoCard>
        </div>
      </div>

      {/* Phones: the actions stay in reach at the bottom of the screen. */}
      {hasActions && (
        <div className="tpv-bottom-bar" data-testid="tpv-bottom-bar">
          {actions}
        </div>
      )}
    </div>
  );
}

// ── Scaled page canvas ──────────────────────────────────────────────────────
//
// The page used to be a fixed 500px box, wider than any phone. It now fits the
// column it sits in (Fit), keeping A4 proportions, with a 100% toggle for a
// closer look — at 100% a page wider than the column scrolls inside the
// canvas, never the whole page. Field overlays are positioned in percentages,
// so they follow the page at any size.

function fitPageWidth(available: number | null, padding: number): number {
  if (available === null || available <= 0) return PAGE_W;
  return Math.round(Math.min(PAGE_W, Math.max(120, available - padding * 2)));
}

function PreviewCanvas({ loading, realDoc, pageCount, template, docId, placeholderColors }: {
  loading: boolean;
  realDoc: PDFDocumentProxy | null;
  pageCount: number;
  template: DocumentTemplate;
  docId: string;
  placeholderColors: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [avail, setAvail] = useState<number | null>(null);
  const [zoom, setZoom] = useState<"fit" | "full">("fit");
  const phone = useMediaQuery("(max-width: 639px)");
  const pad = phone ? 12 : 16;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { setAvail(el.clientWidth); };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => { window.removeEventListener("resize", measure); };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { ro.disconnect(); };
  }, []);

  const pageW = zoom === "fit" ? fitPageWidth(avail, pad) : PAGE_W;
  const pageH = Math.round(pageW * PAGE_RATIO);
  const scale = pageW / PAGE_W;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <div role="group" aria-label="Zoom" style={{ display: "inline-flex", border: "1px solid #CBD5E1", borderRadius: 8, overflow: "hidden", background: "white" }}>
          {(["fit", "full"] as const).map(z => (
            <button
              key={z}
              type="button"
              aria-pressed={zoom === z}
              onClick={() => setZoom(z)}
              style={{ ...GF, minHeight: 36, minWidth: 56, padding: "0 12px", border: "none", background: zoom === z ? "#EEF4FB" : "white", color: zoom === z ? AZURE_DEEP : "#334155", fontSize: 12.5, fontWeight: zoom === z ? 700 : 500, cursor: "pointer" }}
            >
              {z === "fit" ? "Fit" : "100%"}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        className="tpv-canvas"
        data-testid="tpv-canvas"
        style={{ background: BGCANVAS, padding: pad, borderRadius: 12, overflowX: "auto", maxWidth: "100%", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "max-content", minWidth: "100%" }}>
          {loading && (
            <div style={{ width: pageW, height: pageH, background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", ...GF, fontSize: 12.5, color: "#475569" }}>
              Loading document…
            </div>
          )}
          {!loading && Array.from({ length: pageCount }, (_, i) => {
            const pageId = `page-${String(i + 1)}`;
            return (
              <div
                key={pageId}
                data-testid="tpv-page"
                style={{ position: "relative", width: pageW, height: pageH, background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", flexShrink: 0 }}
              >
                {/* The REAL page where there is one. The placeholder is the
                    fallback for a template with no document behind it. */}
                {realDoc !== null ? (
                  <DocumentPageSurface doc={realDoc} pageNumber={i + 1} width={pageW} height={pageH} />
                ) : (
                  <FictionalPageBg pageNumber={i + 1} />
                )}
                <PreviewFieldOverlay
                  template={template}
                  docId={docId}
                  pageId={pageId}
                  placeholderColors={placeholderColors}
                  scale={scale}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ id, title, icon, collapsible, defaultOpen = false, children }: {
  id: string; title: string; icon: React.ReactNode; collapsible: boolean;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open;
  const bodyId = `tpv-card-${id}`;
  return (
    <section style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 12, padding: collapsible ? "4px 16px" : "16px 18px", minWidth: 0 }}>
      {collapsible ? (
        <h3 style={{ margin: 0 }}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen(o => !o)}
            style={{ ...GF, display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 44, padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#0F172A", textAlign: "left" }}
          >
            {icon}
            <span style={{ flex: 1, minWidth: 0 }}>{title}</span>
            <ChevronDown size={16} aria-hidden className="tpv-chevron" style={{ transform: open ? "rotate(180deg)" : "none", color: "#475569" }} />
          </button>
        </h3>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {icon}
          <h3 style={{ ...GF, fontSize: 12.5, fontWeight: 700, color: "#0F172A", margin: 0 }}>{title}</h3>
        </div>
      )}
      <div id={bodyId} hidden={!shown} style={{ paddingBottom: collapsible ? 12 : 0 }}>
        {children}
      </div>
    </section>
  );
}

function SettingRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: isLast ? 0 : 8, marginBottom: isLast ? 0 : 8, borderBottom: isLast ? "none" : "1px solid #F1F5F9" }}>
      <span style={{ ...GF, fontSize: 12, color: "#475569", flexShrink: 0 }}>{label}</span>
      <span className="tpv-wrap" style={{ ...GF, fontSize: 12, color: "#334155", fontWeight: 600, textAlign: "right", minWidth: 0, textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}

const TPV_STYLES = `
  .tpv-pad { padding-left: 24px; padding-right: 24px; }
  .tpv-body { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
  .tpv-wrap { overflow-wrap: anywhere; word-break: break-word; }
  .tpv-bottom-bar { display: none; }
  .tpv-flow { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; }
  .tpv-flow-item { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; }
  .tpv-flow-box { min-width: 100px; max-width: 100%; box-sizing: border-box; }
  .tpv-doc-tabs { scrollbar-width: none; }
  .tpv-doc-tabs::-webkit-scrollbar { display: none; }
  .tpv-root button:focus-visible, .tpv-root a:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; }
  .tpv-chevron { transition: transform 180ms ease; flex-shrink: 0; }
  @media (prefers-reduced-motion: reduce) { .tpv-chevron { transition: none; } }
  @media (max-width: 1100px) {
    .tpv-body { grid-template-columns: minmax(0, 1fr) 260px; }
  }
  @media (max-width: 899px) {
    .tpv-body { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 639px) {
    .tpv-pad { padding-left: 16px; padding-right: 16px; }
    .tpv-header-actions { display: none !important; }
    .tpv-bottom-bar {
      display: flex; gap: 8px; position: sticky; bottom: 0; z-index: 5;
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
      background: #FFFFFF; border-top: 1px solid #E2E8F0;
      box-shadow: 0 -2px 8px rgba(7,17,31,0.06);
    }
    .tpv-bottom-bar > * { flex: 1 1 0; min-width: 0; }
    .tpv-flow { flex-direction: column; flex-wrap: nowrap; }
    .tpv-flow-item { flex-direction: column; align-items: stretch; }
    .tpv-flow-box { width: 100%; }
    .tpv-flow-arrow { align-self: center; transform: rotate(90deg); }
  }
`;

export function TemplatePreviewPage() {
  return (
    <TemplateProvider>
      <TemplatePreviewInner />
    </TemplateProvider>
  );
}
