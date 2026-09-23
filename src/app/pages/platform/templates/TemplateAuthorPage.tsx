// /app/templates/:templateId/author — Author a document from scratch (066).
// The alternative to uploading a file: place fixed-position text blocks on
// blank pages, then render them into a real PDF and attach it to the
// template — same one-atomic-write model, same normalized-rectangle
// geometry, and structurally the same editor as TemplateFieldsPage.tsx, just
// drawing TEXT into a box instead of reading a value out of one.
// Inline styles only. No Burgundy.

import React, { useEffect, useReducer, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { ChevronLeft, AlertCircle, Info, Save, CheckCircle2, Plus, Trash2, FileText } from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { usePlatform } from "../../../context/PlatformContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import { useProcessing } from "../../../services/processing.service";
import {
  generateTemplateDocument, realTemplatesAvailable,
} from "../../../services/templates-source";
import type { DocumentTemplate, TemplateContentBlock, TemplateContentBlockAlign } from "../../../models/templates";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF           = { fontFamily: "'Geist', sans-serif" };
const AZURE        = "#0078D4";
const NAVY         = "#07111F";
const SILVER       = "#64748B";
const BGCANVAS     = "#DFE3E8";
const BASE_PAGE_W  = 595;
const PAGE_RATIO   = 842 / 595;
const MAX_PAGES    = 30;

const MIN_W = 0.05, MIN_H = 0.02, MAX_W = 0.95, MAX_H = 0.9;
const DEFAULT_W = 0.6, DEFAULT_H = 0.06;

// ── Local block state ─────────────────────────────────────────────────────────

interface LocalBlock extends TemplateContentBlock {
  _localId: string;
}

interface EditorState {
  blocks:     LocalBlock[];
  pageCount:  number;
  selected:   string | null;   // _localId
  dragging:   null | { startX: number; startY: number; curX: number; curY: number; pageNumber: number };
  changed:    boolean;
}

type EditorAction =
  | { type: "LOAD"; blocks: LocalBlock[]; pageCount: number }
  | { type: "SET_PAGE_COUNT"; pageCount: number }
  | { type: "SELECT"; id: string | null }
  | { type: "UPDATE"; id: string; patch: Partial<LocalBlock> }
  | { type: "DELETE"; id: string }
  | { type: "START_DRAG"; sx: number; sy: number; pageNumber: number }
  | { type: "UPDATE_DRAG"; x: number; y: number }
  | { type: "COMMIT_DRAG"; pageNumber: number }
  | { type: "CANCEL_DRAG" }
  | { type: "MARK_SAVED" };

let _bid = 0;
function mkId() { return `tpl-c-${Date.now()}-${++_bid}`; }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function clampRect(r: { x: number; y: number; width: number; height: number }) {
  return {
    x:      clamp(r.x, 0, 1 - MIN_W),
    y:      clamp(r.y, 0, 1 - MIN_H),
    width:  clamp(r.width,  MIN_W, MAX_W),
    height: clamp(r.height, MIN_H, MAX_H),
  };
}

const INITIAL_STATE: EditorState = { blocks: [], pageCount: 1, selected: null, dragging: null, changed: false };

function editorReducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case "LOAD": return { ...INITIAL_STATE, blocks: a.blocks, pageCount: a.pageCount };
    case "SET_PAGE_COUNT": {
      const pageCount = clamp(a.pageCount, 1, MAX_PAGES);
      // Blocks on a page that no longer exists cannot be kept — their
      // position is meaningless without a page to sit on.
      return {
        ...s, pageCount, changed: true,
        blocks: s.blocks.filter(b => b.pageNumber <= pageCount),
      };
    }
    case "SELECT": return { ...s, selected: a.id };
    case "UPDATE":
      return { ...s, changed: true, blocks: s.blocks.map(b => b._localId === a.id ? { ...b, ...a.patch } : b) };
    case "DELETE":
      return { ...s, changed: true, selected: null, blocks: s.blocks.filter(b => b._localId !== a.id) };
    case "START_DRAG":
      return { ...s, dragging: { startX: a.sx, startY: a.sy, curX: a.sx, curY: a.sy, pageNumber: a.pageNumber } };
    case "UPDATE_DRAG":
      return s.dragging ? { ...s, dragging: { ...s.dragging, curX: a.x, curY: a.y } } : s;
    case "COMMIT_DRAG": {
      if (!s.dragging) return s;
      const x0 = Math.min(s.dragging.startX, s.dragging.curX);
      const y0 = Math.min(s.dragging.startY, s.dragging.curY);
      const w  = Math.abs(s.dragging.curX - s.dragging.startX);
      const h  = Math.abs(s.dragging.curY - s.dragging.startY);
      const rect = w < 0.03 || h < 0.01
        ? clampRect({ x: s.dragging.startX, y: s.dragging.startY, width: DEFAULT_W, height: DEFAULT_H })
        : clampRect({ x: x0, y: y0, width: w, height: h });
      const block: LocalBlock = {
        _localId:   mkId(),
        pageNumber: a.pageNumber,
        rect,
        text:       "",
        fontSize:   11,
        bold:       false,
        align:      "left",
      };
      return { ...s, dragging: null, blocks: [...s.blocks, block], selected: block._localId, changed: true };
    }
    case "CANCEL_DRAG": return { ...s, dragging: null };
    case "MARK_SAVED": return { ...s, changed: false };
    default: return s;
  }
}

// ── Page canvas ───────────────────────────────────────────────────────────────
function PageCanvas({
  pageNumber, blocks, selected, dragging, placing,
  onDragStart, onDragMove, onDragEnd, onDragCancel, onSelect,
}: {
  pageNumber: number;
  blocks: LocalBlock[]; selected: string | null;
  dragging: EditorState["dragging"];
  placing: boolean;
  onDragStart: (sx: number, sy: number) => void;
  onDragMove:  (x: number, y: number) => void;
  onDragEnd:   (x: number, y: number) => void;
  onDragCancel:() => void;
  onSelect: (id: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(BASE_PAGE_W);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setCanvasW(Math.min(w - 48, BASE_PAGE_W));
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const h = canvasW * PAGE_RATIO;
  const pageBlocks = blocks.filter(b => b.pageNumber === pageNumber);

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [(e.clientX - r.left) / canvasW, (e.clientY - r.top) / h];
  };

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !placing) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    onDragStart(x, y);
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const [x, y] = pos(e);
    onDragMove(x, y);
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const [x, y] = pos(e);
    onDragEnd(x, y);
  };

  return (
    <div ref={ref} style={{ flex: 1, overflowY: "auto", background: BGCANVAS, padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div
        style={{
          position:   "relative",
          width:      canvasW,
          height:     h,
          background: "white",
          boxShadow:  "0 4px 24px rgba(0,0,0,0.18)",
          flexShrink: 0,
          cursor:     placing ? "crosshair" : "default",
          userSelect: "none",
        }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={onDragCancel}
        onClick={e => { if (e.target === e.currentTarget) onSelect(null); }}
      >
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", ...GF, fontSize: 9, color: "#CBD5E1", pointerEvents: "none" }}>
          Page {pageNumber}
        </div>

        {/* Drag preview */}
        {dragging && dragging.pageNumber === pageNumber && (() => {
          const x0 = Math.min(dragging.startX, dragging.curX);
          const y0 = Math.min(dragging.startY, dragging.curY);
          const dw = Math.abs(dragging.curX - dragging.startX);
          const dh = Math.abs(dragging.curY - dragging.startY);
          if (dw < 0.01 || dh < 0.005) return null;
          return (
            <div style={{
              position: "absolute",
              left: `${x0 * 100}%`, top: `${y0 * 100}%`,
              width: `${dw * 100}%`, height: `${dh * 100}%`,
              border: `2px dashed ${AZURE}`, background: `${AZURE}1A`,
              pointerEvents: "none", boxSizing: "border-box",
            }} />
          );
        })()}

        {/* Blocks */}
        {pageBlocks.map(b => {
          const sel = selected === b._localId;
          return (
            <div
              key={b._localId}
              onClick={e => { e.stopPropagation(); onSelect(b._localId); }}
              style={{
                position:   "absolute",
                left:       `${b.rect.x * 100}%`,
                top:        `${b.rect.y * 100}%`,
                width:      `${b.rect.width * 100}%`,
                height:     `${b.rect.height * 100}%`,
                border:     `2px solid ${sel ? AZURE : "#94A3B8"}`,
                background: sel ? `${AZURE}18` : "#94A3B812",
                borderRadius: 4,
                boxSizing:  "border-box",
                cursor:     "pointer",
                overflow:   "hidden",
                padding:    "2px 4px",
              }}
            >
              <span style={{
                ...GF,
                fontSize:    Math.min(b.fontSize ?? 11, 13),
                fontWeight:  b.bold ? 700 : 400,
                textAlign:   b.align ?? "left",
                color:       NAVY,
                display:     "block",
                whiteSpace:  "pre-wrap",
                overflow:    "hidden",
              }}>
                {b.text.trim() === "" ? <span style={{ color: "#94A3B8", fontStyle: "italic" }}>Empty text block</span> : b.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────
function RightPanel({
  blocks, selected, placing, onSetPlacing, onUpdateBlock, onDeleteBlock, onDeselectAll,
}: {
  blocks:         LocalBlock[];
  selected:       string | null;
  placing:        boolean;
  onSetPlacing:   (v: boolean) => void;
  onUpdateBlock:  (id: string, patch: Partial<LocalBlock>) => void;
  onDeleteBlock:  (id: string) => void;
  onDeselectAll:  () => void;
}) {
  const sel = selected ? blocks.find(b => b._localId === selected) ?? null : null;

  const labelStyle: React.CSSProperties = { color: "#94A3B8", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 };
  const fieldStyle: React.CSSProperties = { width: "100%", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 6, color: NAVY, ...GF, fontSize: 12, padding: "5px 8px", boxSizing: "border-box", marginBottom: 10 };

  return (
    <div style={{ width: 220, flexShrink: 0, borderLeft: "1px solid rgba(0,0,0,0.08)", background: "#ffffff", overflowY: "auto" }}>
      {sel ? (
        <div style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: SILVER, ...GF, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>Properties</span>
            <button onClick={onDeselectAll} style={{ color: SILVER, background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
          </div>
          <div style={labelStyle}>Text</div>
          <textarea
            value={sel.text}
            onChange={e => onUpdateBlock(sel._localId, { text: e.target.value })}
            rows={5}
            style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={labelStyle}>Font Size</div>
          <input
            type="number" min={6} max={72}
            value={sel.fontSize ?? 11}
            onChange={e => onUpdateBlock(sel._localId, { fontSize: Number(e.target.value) })}
            style={fieldStyle}
          />
          <div style={labelStyle}>Align</div>
          <select
            value={sel.align ?? "left"}
            onChange={e => onUpdateBlock(sel._localId, { align: e.target.value as TemplateContentBlockAlign })}
            style={fieldStyle}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 12 }}>
            <input type="checkbox" checked={sel.bold ?? false} onChange={e => onUpdateBlock(sel._localId, { bold: e.target.checked })} />
            <span style={{ ...GF, fontSize: 11, color: NAVY }}>Bold</span>
          </label>
          <button
            onClick={() => onDeleteBlock(sel._localId)}
            style={{ ...GF, fontSize: 11, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 12px", cursor: "pointer", width: "100%" }}
          >
            Delete Block
          </button>
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          <div style={{ color: SILVER, ...GF, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            {placing ? "Draw a box on the page" : "Add Text"}
          </div>
          <button
            onClick={() => onSetPlacing(!placing)}
            style={{
              display:     "flex",
              alignItems:  "center",
              justifyContent: "center",
              gap:         7,
              width:       "100%",
              padding:     "8px 10px",
              background:  placing ? `${AZURE}22` : "#F8FAFC",
              border:      placing ? `1px solid ${AZURE}55` : "1px dashed #C8E1F5",
              borderRadius:7,
              color:       placing ? AZURE : NAVY,
              ...GF,
              fontSize:    12,
              fontWeight:  600,
              cursor:      "pointer",
            }}
          >
            <Plus size={13} />
            {placing ? "Cancel" : "Add Text Block"}
          </button>
          <p style={{ ...GF, fontSize: 11, color: "#94A3B8", margin: "10px 0 0", lineHeight: 1.5 }}>
            Click "Add Text Block", then draw a box on any page. Type the text
            in this panel once it's placed.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Author editor inner ─────────────────────────────────────────────────────
function AuthorEditorInner({ template }: { template: DocumentTemplate }) {
  usePageMeta();
  const platform = usePlatform();
  const { run } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  const isReal = realTemplatesAvailable(workspaceId);

  const [edState, edDispatch] = useReducer(editorReducer, INITIAL_STATE);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [placing, setPlacing] = useState(false);

  // A document already attached that did NOT come from authoring (no content
  // blocks on record) — saving here replaces it, so the sender is told
  // before it happens rather than discovering it after.
  const hasForeignDocument = template.documents.length > 0 && template.contentPageCount === 0;

  // Load existing authored content on mount.
  useEffect(() => {
    const converted: LocalBlock[] = template.contentBlocks.map(b => ({ ...b, _localId: mkId() }));
    edDispatch({ type: "LOAD", blocks: converted, pageCount: Math.max(template.contentPageCount, 1) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const handleSave = async () => {
    if (!isReal || !workspaceId) {
      setSaveError("Open a workspace to author and save a document.");
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const blocks: TemplateContentBlock[] = edState.blocks.map(b => {
        const { _localId, ...rest } = b;
        return rest;
      });
      const updated = await run(
        { message: "Generating your document", detail: "Rendering the content into a PDF." },
        () => generateTemplateDocument(workspaceId, template.id, { pageCount: edState.pageCount, blocks }),
      );
      edDispatch({
        type: "LOAD",
        blocks: updated.contentBlocks.map(b => ({ ...b, _localId: mkId() })),
        pageCount: Math.max(updated.contentPageCount, 1),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error && err.message !== ""
        ? err.message
        : "The document could not be generated.");
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (pageNumber: number) => (sx: number, sy: number) => {
    if (!placing) return;
    edDispatch({ type: "START_DRAG", sx, sy, pageNumber });
  };

  const handleDragEnd = (pageNumber: number) => (_x: number, _y: number) => {
    if (!placing) { edDispatch({ type: "CANCEL_DRAG" }); return; }
    edDispatch({ type: "COMMIT_DRAG", pageNumber });
    setPlacing(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#ffffff", ...GF }}>
      {/* Top bar */}
      <div style={{ height: 52, background: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
        <Link to={`/app/templates/${template.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: SILVER, ...GF, fontSize: 12, textDecoration: "none" }}>
          <ChevronLeft size={13} />
          {template.name}
        </Link>
        <span style={{ color: "#CBD5E1" }}>/</span>
        <span style={{ color: NAVY, ...GF, fontSize: 12 }}>Author Document</span>
        {edState.changed && (
          <span style={{ ...GF, fontSize: 11, color: SILVER, background: "#F1F5F9", padding: "2px 7px", borderRadius: 99 }}>Unsaved changes</span>
        )}
        <div style={{ flex: 1 }} />
        {saveError !== null && (
          <span style={{ ...GF, fontSize: 11.5, color: "#B91C1C", maxWidth: 340 }}>{saveError}</span>
        )}
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#34D399", ...GF, fontSize: 12 }}>
            <CheckCircle2 size={12} />
            Saved
          </div>
        )}
        {isReal && (
          <button
            onClick={() => { void handleSave(); }}
            disabled={saving}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: saving ? "#93C5FD" : AZURE, color: "white", border: "none", borderRadius: 7, ...GF, fontSize: 12, fontWeight: 700, cursor: saving ? "default" : "pointer" }}
          >
            <Save size={13} />
            {saving ? "Generating…" : "Generate & Save"}
          </button>
        )}
      </div>

      {!isReal && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "#FDF8EC", borderBottom: "1px solid #EBD79A", flexShrink: 0 }}>
          <Info size={13} color="#B45309" />
          <span style={{ ...GF, fontSize: 12, color: "#78350F" }}>Open a workspace to author and save a document.</span>
        </div>
      )}

      {isReal && hasForeignDocument && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "#FDF8EC", borderBottom: "1px solid #EBD79A", flexShrink: 0 }}>
          <Info size={13} color="#B45309" />
          <span style={{ ...GF, fontSize: 12, color: "#78350F" }}>
            This template already has an uploaded document ({template.documents[0]?.displayName}).
            Generating a document here will replace it.
          </span>
        </div>
      )}

      {/* Page controls */}
      <div style={{ background: "#f8fafb", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <FileText size={13} color={SILVER} />
        <span style={{ ...GF, fontSize: 11, color: SILVER }}>
          {edState.pageCount} page{edState.pageCount !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => edDispatch({ type: "SET_PAGE_COUNT", pageCount: edState.pageCount + 1 })}
          disabled={edState.pageCount >= MAX_PAGES}
          style={{ ...GF, fontSize: 11, padding: "3px 9px", border: "1px solid #CBD5E1", borderRadius: 99, background: "none", color: NAVY, cursor: edState.pageCount >= MAX_PAGES ? "default" : "pointer" }}
        >
          + Add page
        </button>
        {edState.pageCount > 1 && (
          <button
            onClick={() => edDispatch({ type: "SET_PAGE_COUNT", pageCount: edState.pageCount - 1 })}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, ...GF, fontSize: 11, padding: "3px 9px", border: "1px solid #FECACA", borderRadius: 99, background: "none", color: "#DC2626", cursor: "pointer" }}
          >
            <Trash2 size={11} />
            Remove last page
          </button>
        )}
      </div>

      {/* Main workspace */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Pages column */}
        <div style={{ flex: 1, overflowY: "auto", background: BGCANVAS, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 24 }}>
          {Array.from({ length: edState.pageCount }, (_, i) => {
            const pageNumber = i + 1;
            return (
              <PageCanvas
                key={pageNumber}
                pageNumber={pageNumber}
                blocks={edState.blocks}
                selected={edState.selected}
                dragging={edState.dragging}
                placing={placing}
                onDragStart={handleDragStart(pageNumber)}
                onDragMove={(x, y) => edDispatch({ type: "UPDATE_DRAG", x, y })}
                onDragEnd={handleDragEnd(pageNumber)}
                onDragCancel={() => edDispatch({ type: "CANCEL_DRAG" })}
                onSelect={id => edDispatch({ type: "SELECT", id })}
              />
            );
          })}
        </div>

        {/* Right panel */}
        <RightPanel
          blocks={edState.blocks}
          selected={edState.selected}
          placing={placing}
          onSetPlacing={setPlacing}
          onUpdateBlock={(id, patch) => edDispatch({ type: "UPDATE", id, patch })}
          onDeleteBlock={id => edDispatch({ type: "DELETE", id })}
          onDeselectAll={() => edDispatch({ type: "SELECT", id: null })}
        />
      </div>
    </div>
  );
}

// ── Root loader ───────────────────────────────────────────────────────────────
function TemplateAuthorInner() {
  const { templateId } = useParams<{ templateId: string }>();
  const { state, loadTemplate } = useTemplates();

  useEffect(() => {
    if (templateId) loadTemplate(templateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const t = state.activeTemplate;

  if (state.activeLoading || (!t && !state.activeError)) {
    return <div style={{ padding: 24, background: "#ffffff", minHeight: "100vh" }}><style>{SKELETON_STYLE}</style><SkeletonBlock height={20} width={200} /></div>;
  }

  if (state.activeError || !t) {
    return (
      <div style={{ padding: 24 }}>
        <AlertCircle size={18} />
        <p style={{ ...GF, fontSize: 14 }}>{state.activeError ?? "Template not found"}</p>
        <Link to="/app/templates" style={{ color: AZURE }}>← Templates</Link>
      </div>
    );
  }

  return <AuthorEditorInner template={t} />;
}

export function TemplateAuthorPage() {
  return (
    <TemplateProvider>
      <TemplateAuthorInner />
    </TemplateProvider>
  );
}
