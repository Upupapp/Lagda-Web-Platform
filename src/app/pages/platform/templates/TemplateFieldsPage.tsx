// /app/templates/:templateId/fields — Template field editor.
// Self-contained local-state field editor (does not use PrepDraft-specific FieldEditorContext).
// Reuses field type labels/icons/constants from field-editor.ts.
// In-session saves only. No real PDF. No real backend. demonstrationOnly.
// Inline styles only. No Burgundy.

import React, { useEffect, useReducer, useCallback, useRef, useState, useMemo } from "react";
import { useParams, Link } from "react-router";
import { ChevronLeft, AlertCircle, Save, CheckCircle2, Trash2, GripVertical } from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import { saveTemplateFields } from "../../../services/mock/templates.service";
import type { DocumentTemplate, TemplateField, TemplateRolePlaceholder } from "../../../models/templates";
import type { FieldType, ResizeHandle, NormalizedRect } from "../../../models/field-editor";
import {
  FIELD_TYPE_LABELS, FIELD_TYPE_ICONS, FIELD_TYPE_GROUPS,
  FIELD_SIZE_CONSTRAINTS, RESIZE_HANDLES, defaultFieldRect,
  PARTICIPANT_ACCENT_COLORS,
} from "../../../models/field-editor";
import { usePageMeta } from "../../../hooks/usePageMeta";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF           = { fontFamily: "'Geist', sans-serif" };
const AZURE        = "#0078D4";
const NAVY         = "#07111F";
const SILVER       = "#8A9BAE";
const BGCANVAS     = "#DFE3E8";
const BASE_PAGE_W  = 595;
const PAGE_RATIO   = 842 / 595;

// ── Local field state ─────────────────────────────────────────────────────────

interface LocalField extends TemplateField {
  _localId:      string;
  isSenderText?: boolean;   // true = sender-prefill field (mirrors the recipient-side flag)
}

interface EditorState {
  fields:    LocalField[];
  selected:  string | null;   // _localId
  dragging:  null | { startX: number; startY: number; curX: number; curY: number; docId: string; pageId: string };
  resizing:  null | { fieldId: string; handle: ResizeHandle; origRect: NormalizedRect };
  changed:   boolean;
}

type EditorAction =
  | { type: "LOAD"; fields: LocalField[] }
  | { type: "ADD_FIELD"; field: LocalField }
  | { type: "SELECT"; id: string | null }
  | { type: "UPDATE"; id: string; patch: Partial<LocalField> }
  | { type: "DELETE"; id: string }
  | { type: "START_DRAG"; sx: number; sy: number; docId: string; pageId: string }
  | { type: "UPDATE_DRAG"; x: number; y: number }
  | { type: "COMMIT_DRAG"; fieldType: FieldType; placeholderId: string | null; docId: string; pageId: string }
  | { type: "CANCEL_DRAG" }
  | { type: "MARK_SAVED" };

let _fid = 0;
function mkId() { return `tpl-f-${Date.now()}-${++_fid}`; }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function clampRect(r: NormalizedRect, type: FieldType): NormalizedRect {
  const c = FIELD_SIZE_CONSTRAINTS[type] ?? { minWidth: 0.04, minHeight: 0.02, maxWidth: 0.9, maxHeight: 0.5 };
  return {
    x:      clamp(r.x, 0, 1 - c.minWidth),
    y:      clamp(r.y, 0, 1 - c.minHeight),
    width:  clamp(r.width,  c.minWidth, c.maxWidth),
    height: clamp(r.height, c.minHeight, c.maxHeight),
  };
}

const INITIAL_STATE: EditorState = { fields: [], selected: null, dragging: null, resizing: null, changed: false };

function editorReducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case "LOAD":   return { ...INITIAL_STATE, fields: a.fields };
    case "ADD_FIELD": return { ...s, fields: [...s.fields, a.field], selected: a.field._localId, changed: true };
    case "SELECT": return { ...s, selected: a.id };
    case "UPDATE":
      return { ...s, changed: true, fields: s.fields.map(f => f._localId === a.id ? { ...f, ...a.patch } : f) };
    case "DELETE":
      return { ...s, changed: true, selected: null, fields: s.fields.filter(f => f._localId !== a.id) };
    case "START_DRAG":
      return { ...s, dragging: { startX: a.sx, startY: a.sy, curX: a.sx, curY: a.sy, docId: a.docId, pageId: a.pageId } };
    case "UPDATE_DRAG":
      return s.dragging ? { ...s, dragging: { ...s.dragging, curX: a.x, curY: a.y } } : s;
    case "COMMIT_DRAG": {
      if (!s.dragging) return s;
      const x0 = Math.min(s.dragging.startX, s.dragging.curX);
      const y0 = Math.min(s.dragging.startY, s.dragging.curY);
      const w  = Math.abs(s.dragging.curX - s.dragging.startX);
      const h  = Math.abs(s.dragging.curY - s.dragging.startY);
      const def = defaultFieldRect(a.fieldType);
      const rect = w < 0.04 || h < 0.01
        ? clampRect({ x: s.dragging.startX, y: s.dragging.startY, width: def.width, height: def.height }, a.fieldType)
        : clampRect({ x: x0, y: y0, width: w, height: h }, a.fieldType);
      const field: LocalField = {
        _localId:      mkId(),
        id:            mkId(),
        type:          a.fieldType,
        label:         FIELD_TYPE_LABELS[a.fieldType] ?? a.fieldType,
        required:      true,
        layer:         s.fields.length + 1,
        pageId:        a.pageId,
        documentId:    a.docId,
        rect,
        isSenderText:  a.placeholderId === null,
        placeholderId: a.placeholderId,
        demonstrationOnly: true,
      };
      return { ...s, dragging: null, fields: [...s.fields, field], selected: field._localId, changed: true };
    }
    case "CANCEL_DRAG": return { ...s, dragging: null };
    case "MARK_SAVED": return { ...s, changed: false };
    default: return s;
  }
}

// ── Color for placeholder ─────────────────────────────────────────────────────
function phColor(ph: TemplateRolePlaceholder[], placeholderId: string | null): string {
  if (!placeholderId) return "#94A3B8";
  const idx = ph.findIndex(p => p.id === placeholderId);
  return PARTICIPANT_ACCENT_COLORS[idx >= 0 ? idx % PARTICIPANT_ACCENT_COLORS.length : 0] ?? AZURE;
}

// ── Fictional page background ─────────────────────────────────────────────────
function FictionalPage({ pageNumber }: { pageNumber: number }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, padding: "9% 11% 8%", pointerEvents: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5%" }}>
        <div style={{ width: "28%", height: 13, background: "#E3E8EF", borderRadius: 3 }} />
        <div style={{ width: "18%", height: 13, background: "#EAECF0", borderRadius: 3 }} />
      </div>
      <div style={{ height: 1, background: "#DEE3EA", marginBottom: "5%" }} />
      {[0.6, 0.45, 0.7, 0.55, 0.5, 0.65, 0.4, 0.58].map((w, i) => (
        <div key={i} style={{ height: 8, width: `${w * 100}%`, background: "#EAECF0", borderRadius: 3, marginBottom: 7 }} />
      ))}
      <div style={{ height: 1, background: "#DEE3EA", margin: "5% 0" }} />
      {[0.7, 0.6, 0.5].map((w, i) => (
        <div key={i} style={{ height: 8, width: `${w * 100}%`, background: "#EAECF0", borderRadius: 3, marginBottom: 7 }} />
      ))}
      <div style={{ position: "absolute", bottom: "2.5%", left: "11%", ...GF, fontSize: 8, color: "#B0BAC6" }}>
        Page {pageNumber} — Fictional Preview
      </div>
    </div>
  );
}

// ── Resize handle dot ─────────────────────────────────────────────────────────
const HANDLE_POS: Record<ResizeHandle, React.CSSProperties> = {
  n:  { top: -4, left: "50%", transform: "translateX(-50%)", cursor: "n-resize"  },
  s:  { bottom: -4, left: "50%", transform: "translateX(-50%)", cursor: "s-resize" },
  e:  { right: -4, top: "50%", transform: "translateY(-50%)", cursor: "e-resize"  },
  w:  { left: -4, top: "50%", transform: "translateY(-50%)", cursor: "w-resize"   },
  ne: { top: -4, right: -4, cursor: "ne-resize"  },
  nw: { top: -4, left: -4,  cursor: "nw-resize"  },
  se: { bottom: -4, right: -4, cursor: "se-resize" },
  sw: { bottom: -4, left: -4,  cursor: "sw-resize" },
};

// ── Page canvas ───────────────────────────────────────────────────────────────
function PageCanvas({
  docId, pageId, pageNumber, fields, selected, dragging, pendingType, placeholders,
  onDragStart, onDragMove, onDragEnd, onDragCancel,
  onSelect, onMoveField,
}: {
  docId: string; pageId: string; pageNumber: number;
  fields: LocalField[]; selected: string | null;
  dragging: EditorState["dragging"];
  pendingType: FieldType | null;
  placeholders: TemplateRolePlaceholder[];
  onDragStart: (sx: number, sy: number) => void;
  onDragMove:  (x: number, y: number) => void;
  onDragEnd:   (x: number, y: number) => void;
  onDragCancel:() => void;
  onSelect: (id: string | null) => void;
  onMoveField: (id: string, rect: NormalizedRect) => void;
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
  const pageFields = fields.filter(f => f.documentId === docId && f.pageId === pageId);

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [(e.clientX - r.left) / canvasW, (e.clientY - r.top) / h];
  };

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pendingType) return;
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
          cursor:     pendingType ? "crosshair" : "default",
          userSelect: "none",
        }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={onDragCancel}
        onClick={e => { if (e.target === e.currentTarget) onSelect(null); }}
      >
        <FictionalPage pageNumber={pageNumber} />

        {/* Drag preview */}
        {dragging && dragging.docId === docId && dragging.pageId === pageId && (() => {
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

        {/* Fields */}
        {pageFields.map(f => {
          const color = phColor(placeholders, f.placeholderId ?? null);
          const sel = selected === f._localId;
          return (
            <div
              key={f._localId}
              onClick={e => { e.stopPropagation(); onSelect(f._localId); }}
              style={{
                position:   "absolute",
                left:       `${f.rect.x * 100}%`,
                top:        `${f.rect.y * 100}%`,
                width:      `${f.rect.width * 100}%`,
                height:     `${f.rect.height * 100}%`,
                border:     `2px solid ${sel ? AZURE : color}`,
                background: sel ? `${AZURE}22` : `${color}18`,
                borderRadius: 4,
                boxSizing:  "border-box",
                cursor:     "pointer",
                display:    "flex",
                alignItems: "center",
                overflow:   "hidden",
              }}
            >
              <span style={{ ...GF, fontSize: 10, fontWeight: 700, color: sel ? AZURE : color, paddingLeft: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {FIELD_TYPE_ICONS[f.type]} {f.label}
              </span>
              {sel && RESIZE_HANDLES.map(hdl => (
                <div key={hdl} style={{ position: "absolute", width: 8, height: 8, borderRadius: 2, background: AZURE, ...HANDLE_POS[hdl] }} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────
function RightPanel({
  placeholders, fields, selected, pendingType, onSetPending, onUpdateField, onDeleteField, onDeselectAll,
}: {
  placeholders:   TemplateRolePlaceholder[];
  fields:         LocalField[];
  selected:       string | null;
  pendingType:    FieldType | null;
  onSetPending:   (t: FieldType | null) => void;
  onUpdateField:  (id: string, patch: Partial<LocalField>) => void;
  onDeleteField:  (id: string) => void;
  onDeselectAll:  () => void;
}) {
  const sel = selected ? fields.find(f => f._localId === selected) ?? null : null;

  return (
    <div style={{ width: 220, flexShrink: 0, borderLeft: "1px solid #162538", background: "#0A1828", overflowY: "auto" }}>
      {sel ? (
        <div style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: SILVER, ...GF, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>Properties</span>
            <button onClick={onDeselectAll} style={{ color: SILVER, background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ color: "#4A6178", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Type</div>
          <div style={{ color: "#C8DCEE", ...GF, fontSize: 12, marginBottom: 10 }}>{FIELD_TYPE_ICONS[sel.type]} {FIELD_TYPE_LABELS[sel.type]}</div>
          <div style={{ color: "#4A6178", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Label</div>
          <input
            value={sel.label}
            onChange={e => onUpdateField(sel._localId, { label: e.target.value })}
            style={{ width: "100%", background: "#162538", border: "1px solid #2A3F55", borderRadius: 6, color: "#C8DCEE", ...GF, fontSize: 12, padding: "5px 8px", boxSizing: "border-box", marginBottom: 10 }}
          />
          <div style={{ color: "#4A6178", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Assign to Role</div>
          <select
            value={sel.placeholderId ?? ""}
            onChange={e => onUpdateField(sel._localId, { placeholderId: e.target.value || null, isSenderText: !e.target.value })}
            style={{ width: "100%", background: "#162538", border: "1px solid #2A3F55", borderRadius: 6, color: "#C8DCEE", ...GF, fontSize: 12, padding: "5px 8px", marginBottom: 10 }}
          >
            <option value="">— Sender Prefill —</option>
            {placeholders.map(ph => <option key={ph.id} value={ph.id}>{ph.label}</option>)}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 12 }}>
            <input type="checkbox" checked={sel.required} onChange={e => onUpdateField(sel._localId, { required: e.target.checked })} />
            <span style={{ ...GF, fontSize: 11, color: "#C8DCEE" }}>Required</span>
          </label>
          <button
            onClick={() => onDeleteField(sel._localId)}
            style={{ ...GF, fontSize: 11, color: "#F87171", background: "#2A1A1A", border: "1px solid #4A2222", borderRadius: 6, padding: "6px 12px", cursor: "pointer", width: "100%" }}
          >
            Delete Field
          </button>
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          <div style={{ color: SILVER, ...GF, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            {pendingType ? `Placing: ${FIELD_TYPE_LABELS[pendingType]}` : "Add Field"}
          </div>
          {pendingType && (
            <button onClick={() => onSetPending(null)} style={{ ...GF, fontSize: 11, color: "#F87171", background: "#2A1A1A", border: "1px solid #4A2222", borderRadius: 6, padding: "5px 10px", cursor: "pointer", width: "100%", marginBottom: 10 }}>
              Cancel
            </button>
          )}
          {FIELD_TYPE_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 10 }}>
              <div style={{ color: "#4A6178", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{group.label}</div>
              {group.types.map(type => (
                <button
                  key={type}
                  onClick={() => onSetPending(pendingType === type ? null : type)}
                  style={{
                    display:     "flex",
                    alignItems:  "center",
                    gap:         7,
                    width:       "100%",
                    padding:     "6px 8px",
                    background:  pendingType === type ? `${AZURE}33` : "none",
                    border:      pendingType === type ? `1px solid ${AZURE}55` : "none",
                    borderRadius:6,
                    color:       pendingType === type ? AZURE : "#C8DCEE",
                    ...GF,
                    fontSize:    11,
                    cursor:      "pointer",
                    textAlign:   "left",
                  }}
                  onMouseEnter={e => { if (pendingType !== type) (e.currentTarget as HTMLElement).style.background = "#162538"; }}
                  onMouseLeave={e => { if (pendingType !== type) (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <span style={{ fontSize: 12 }}>{FIELD_TYPE_ICONS[type]}</span>
                  {FIELD_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fields editor inner ───────────────────────────────────────────────────────
function FieldsEditorInner({ template }: { template: DocumentTemplate }) {
  usePageMeta();
  const [edState, edDispatch] = useReducer(editorReducer, INITIAL_STATE);
  const [saved, setSaved]     = useState(false);
  const [pendingType, setPendingType] = useState<FieldType | null>(null);
  const [activePlaceholder, setActivePlaceholder] = useState<string | null>(
    template.placeholders[0]?.id ?? null
  );
  const [activeDocIdx, setActiveDocIdx] = useState(0);

  const docs = template.documents.length > 0
    ? template.documents
    : [{ id: "doc-1", displayName: "Document 1", pageCount: 3, order: 1, isPlaceholder: true as const }];
  const activeDoc = docs[activeDocIdx] ?? docs[0]!;

  // Load existing template fields on mount
  useEffect(() => {
    const converted: LocalField[] = template.fields.map(f => ({ ...f, _localId: mkId() }));
    edDispatch({ type: "LOAD", fields: converted });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const handleSave = () => {
    const tplFields: TemplateField[] = edState.fields.map(f => {
      const { _localId, ...rest } = f;
      return rest;
    });
    saveTemplateFields(template.id, tplFields);
    edDispatch({ type: "MARK_SAVED" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDragStart = (docId: string, pageId: string) => (sx: number, sy: number) => {
    if (!pendingType) return;
    edDispatch({ type: "START_DRAG", sx, sy, docId, pageId });
  };

  const handleDragEnd = (docId: string, pageId: string) => (_x: number, _y: number) => {
    if (!pendingType) { edDispatch({ type: "CANCEL_DRAG" }); return; }
    edDispatch({ type: "COMMIT_DRAG", fieldType: pendingType, placeholderId: activePlaceholder, docId, pageId });
    setPendingType(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: NAVY, ...GF }}>
      {/* Top bar */}
      <div style={{ height: 52, background: "#07111F", borderBottom: "1px solid #162538", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
        <Link to={`/app/templates/${template.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: SILVER, ...GF, fontSize: 12, textDecoration: "none" }}>
          <ChevronLeft size={13} />
          {template.name}
        </Link>
        <span style={{ color: "#2A3F55" }}>/</span>
        <span style={{ color: "#C8DCEE", ...GF, fontSize: 12 }}>Fields</span>
        {edState.changed && (
          <span style={{ ...GF, fontSize: 11, color: SILVER, background: "#162538", padding: "2px 7px", borderRadius: 99 }}>Unsaved changes</span>
        )}
        <div style={{ flex: 1 }} />
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#34D399", ...GF, fontSize: 12 }}>
            <CheckCircle2 size={12} />
            Saved (in-session)
          </div>
        )}
        <button
          onClick={handleSave}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: AZURE, color: "white", border: "none", borderRadius: 7, ...GF, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          <Save size={13} />
          Save Fields
        </button>
      </div>

      {/* Assign-to role bar + doc tabs */}
      <div style={{ background: "#0A1828", borderBottom: "1px solid #162538", padding: "8px 16px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        {template.placeholders.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: SILVER, ...GF, fontSize: 11 }}>Assign to:</span>
            {template.placeholders.map((ph, idx) => {
              const color = PARTICIPANT_ACCENT_COLORS[idx % PARTICIPANT_ACCENT_COLORS.length] ?? AZURE;
              const active = activePlaceholder === ph.id;
              return (
                <button
                  key={ph.id}
                  onClick={() => setActivePlaceholder(ph.id)}
                  style={{ ...GF, fontSize: 11, padding: "4px 10px", border: `1px solid ${active ? color : "#2A3F55"}`, borderRadius: 99, background: active ? `${color}22` : "none", color: active ? color : SILVER, cursor: "pointer" }}
                >
                  {ph.label}
                </button>
              );
            })}
            <button
              onClick={() => setActivePlaceholder(null)}
              style={{ ...GF, fontSize: 11, padding: "4px 10px", border: `1px solid ${activePlaceholder === null ? "#CBD5E1" : "#2A3F55"}`, borderRadius: 99, background: activePlaceholder === null ? "#2A3F5533" : "none", color: activePlaceholder === null ? "#CBD5E1" : SILVER, cursor: "pointer" }}
            >
              Sender Prefill
            </button>
          </div>
        )}
        {docs.length > 1 && (
          <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
            {docs.map((doc, idx) => (
              <button key={doc.id} onClick={() => setActiveDocIdx(idx)} style={{ ...GF, fontSize: 11, padding: "4px 10px", border: "none", borderBottom: `2px solid ${activeDocIdx === idx ? AZURE : "transparent"}`, background: "none", color: activeDocIdx === idx ? AZURE : SILVER, cursor: "pointer" }}>
                {doc.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main workspace */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Pages column */}
        <div style={{ flex: 1, overflowY: "auto", background: BGCANVAS, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 24 }}>
          {Array.from({ length: activeDoc.pageCount }, (_, i) => {
            const pageId = `page-${i + 1}`;
            return (
              <PageCanvas
                key={`${activeDoc.id}-${pageId}`}
                docId={activeDoc.id}
                pageId={pageId}
                pageNumber={i + 1}
                fields={edState.fields}
                selected={edState.selected}
                dragging={edState.dragging}
                pendingType={pendingType}
                placeholders={template.placeholders}
                onDragStart={handleDragStart(activeDoc.id, pageId)}
                onDragMove={(x, y) => edDispatch({ type: "UPDATE_DRAG", x, y })}
                onDragEnd={handleDragEnd(activeDoc.id, pageId)}
                onDragCancel={() => edDispatch({ type: "CANCEL_DRAG" })}
                onSelect={id => edDispatch({ type: "SELECT", id })}
                onMoveField={(id, rect) => edDispatch({ type: "UPDATE", id, patch: { rect } })}
              />
            );
          })}
        </div>

        {/* Right panel */}
        <RightPanel
          placeholders={template.placeholders}
          fields={edState.fields}
          selected={edState.selected}
          pendingType={pendingType}
          onSetPending={setPendingType}
          onUpdateField={(id, patch) => edDispatch({ type: "UPDATE", id, patch })}
          onDeleteField={id => edDispatch({ type: "DELETE", id })}
          onDeselectAll={() => edDispatch({ type: "SELECT", id: null })}
        />
      </div>
    </div>
  );
}

// ── Root loader ───────────────────────────────────────────────────────────────
function TemplateFieldsInner() {
  const { templateId } = useParams<{ templateId: string }>();
  const { state, loadTemplate } = useTemplates();

  useEffect(() => {
    if (templateId) loadTemplate(templateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const t = state.activeTemplate;

  if (state.activeLoading || (!t && !state.activeError)) {
    return <div style={{ padding: 24, background: NAVY, minHeight: "100vh" }}><style>{SKELETON_STYLE}</style><SkeletonBlock height={20} width={200} /></div>;
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

  return <FieldsEditorInner template={t} />;
}

export function TemplateFieldsPage() {
  return (
    <TemplateProvider>
      <TemplateFieldsInner />
    </TemplateProvider>
  );
}
