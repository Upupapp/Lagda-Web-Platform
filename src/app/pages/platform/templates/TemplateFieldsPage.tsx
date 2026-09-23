// /app/templates/:templateId/fields — Template field editor.
// Self-contained local-state field editor (does not use PrepDraft-specific FieldEditorContext).
// Reuses field type labels/icons/constants from field-editor.ts.
// Saves to the real backend when a workspace and a stored template are in
// scope (060); falls back to the in-session mock save otherwise.
// Inline styles only. No Burgundy.

import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { ChevronLeft, AlertCircle, Info, Save, CheckCircle2 } from "lucide-react";
import { TemplateProvider, useTemplates } from "../../../context/TemplateContext";
import { usePlatform } from "../../../context/PlatformContext";
import { SkeletonBlock, SKELETON_STYLE } from "../../../components/platform";
import { useProcessing } from "../../../services/processing.service";
import { saveTemplateFields as mockSaveTemplateFields } from "../../../services/mock/templates.service";
import {
  saveTemplateFields as realSaveTemplateFields, realTemplatesAvailable,
} from "../../../services/templates-source";
import type {
  DocumentTemplate, TemplateField, TemplateRolePlaceholder, TemplateVariable,
} from "../../../models/templates";
import type { FieldType, ResizeHandle, NormalizedRect } from "../../../models/field-editor";
import {
  FIELD_TYPE_LABELS, FIELD_TYPE_ICONS, FIELD_TYPE_GROUPS,
  FIELD_SIZE_CONSTRAINTS, RESIZE_HANDLES, defaultFieldRect,
  PARTICIPANT_ACCENT_COLORS, clampRect as clampFieldRect, clampMoveRect,
} from "../../../models/field-editor";
import {
  useRealDocument, DocumentPageSurface,
} from "../../../components/pdf/DocumentPageSurface";
import { realSigningRequestService } from "../../../services/real/signing-request.service";
import { usePageMeta } from "../../../hooks/usePageMeta";
import type * as pdfjsLib from "pdfjs-dist";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF           = { fontFamily: "'Geist', sans-serif" };
const AZURE        = "#0078D4";
const NAVY         = "#07111F";
const SILVER       = "#64748B";
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

/**
 * Applies one resize-handle drag to a rect. `dx`/`dy` are normalized deltas.
 * A handle moves the edges it names and leaves the others alone; the caller
 * clamps the result against the field type's own size constraints.
 */
function resizeByHandle(
  orig: NormalizedRect, handle: ResizeHandle, dx: number, dy: number,
): NormalizedRect {
  let { x, y, width, height } = orig;
  if (handle.includes("n")) { y = orig.y + dy; height = orig.height - dy; }
  if (handle.includes("s")) { height = orig.height + dy; }
  if (handle.includes("w")) { x = orig.x + dx; width = orig.width - dx; }
  if (handle.includes("e")) { width = orig.width + dx; }
  return { x, y, width, height };
}

/** An in-progress move or resize of an EXISTING field, held locally so the
 *  reducer sees finished rects rather than one action per pointer event. */
interface Interaction {
  readonly kind: "move" | "resize";
  readonly handle?: ResizeHandle;
  readonly localId: string;
  readonly type: FieldType;
  readonly startX: number;
  readonly startY: number;
  readonly origRect: NormalizedRect;
}

// ── Page canvas ───────────────────────────────────────────────────────────────
function PageCanvas({
  docId, pageId, pageNumber, fields, selected, dragging, pendingType, placeholders,
  realDoc, realPageSize,
  onDragStart, onDragMove, onDragEnd, onDragCancel,
  onSelect, onMoveField,
}: {
  docId: string; pageId: string; pageNumber: number;
  fields: LocalField[]; selected: string | null;
  dragging: EditorState["dragging"];
  pendingType: FieldType | null;
  placeholders: TemplateRolePlaceholder[];
  /** The real PDF, when one has loaded. Null keeps the fictional placeholder,
   *  which is all a fixture template has behind it. */
  realDoc: pdfjsLib.PDFDocumentProxy | null;
  realPageSize: { width: number; height: number } | null;
  onDragStart: (sx: number, sy: number) => void;
  onDragMove:  (x: number, y: number) => void;
  onDragEnd:   (x: number, y: number) => void;
  onDragCancel:() => void;
  onSelect: (id: string | null) => void;
  onMoveField: (id: string, rect: NormalizedRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(BASE_PAGE_W);
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setCanvasW(Math.min(w - 48, BASE_PAGE_W));
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // The real page's own aspect ratio where it is known — an uploaded document
  // is not necessarily A4, and assuming it puts every field somewhere other
  // than where it was placed.
  const ratio = realPageSize !== null && realPageSize.width > 0
    ? realPageSize.height / realPageSize.width
    : PAGE_RATIO;
  const h = canvasW * ratio;
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
    // An in-progress move/resize of an existing field takes precedence over
    // the draw-a-new-one drag; they can never both be live.
    if (interaction !== null) {
      const [x, y] = pos(e);
      const dx = x - interaction.startX;
      const dy = y - interaction.startY;
      const next = interaction.kind === "move"
        ? clampMoveRect({
            ...interaction.origRect,
            x: interaction.origRect.x + dx,
            y: interaction.origRect.y + dy,
          })
        : clampFieldRect(
            resizeByHandle(interaction.origRect, interaction.handle!, dx, dy),
            interaction.type);
      onMoveField(interaction.localId, next);
      return;
    }
    if (!dragging) return;
    const [x, y] = pos(e);
    onDragMove(x, y);
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction !== null) { setInteraction(null); return; }
    if (!dragging) return;
    const [x, y] = pos(e);
    onDragEnd(x, y);
  };

  /** Starts a move or resize. Stops propagation so the canvas's own
   *  draw-a-new-field handler does not also fire for the same press. */
  const beginInteraction = (
    e: React.PointerEvent, f: LocalField, kind: "move" | "resize", handle?: ResizeHandle,
  ) => {
    if (e.button !== 0 || pendingType) return;
    e.stopPropagation();
    onSelect(f._localId);
    const surface = ref.current?.querySelector(`[data-page-surface="${pageId}"]`);
    const r = (surface ?? e.currentTarget).getBoundingClientRect();
    setInteraction({
      kind, handle, localId: f._localId, type: f.type,
      startX: (e.clientX - r.left) / canvasW,
      startY: (e.clientY - r.top) / h,
      origRect: f.rect,
    });
  };

  return (
    <div ref={ref} style={{ flex: 1, overflowY: "auto", background: BGCANVAS, padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div
        data-page-surface={pageId}
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
        onPointerCancel={() => { setInteraction(null); onDragCancel(); }}
        onClick={e => { if (e.target === e.currentTarget) onSelect(null); }}
      >
        {/* The REAL document where there is one. The fictional placeholder is
            the fallback for a fixture template, which has no file behind it —
            it used to be shown unconditionally, so a template with a genuine
            document (uploaded or authored) still showed grey bars, and fields
            were placed against a page nobody could see. */}
        {realDoc !== null ? (
          <DocumentPageSurface doc={realDoc} pageNumber={pageNumber} width={canvasW} height={h} />
        ) : (
          <FictionalPage pageNumber={pageNumber} />
        )}

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
              onPointerDown={e => beginInteraction(e, f, "move")}
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
                cursor:     pendingType ? "crosshair" : "move",
                display:    "flex",
                alignItems: "center",
                overflow:   "visible",
              }}
            >
              <span style={{ ...GF, fontSize: 10, fontWeight: 700, color: sel ? AZURE : color, paddingLeft: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {FIELD_TYPE_ICONS[f.type]} {f.label}
              </span>
              {sel && RESIZE_HANDLES.map(hdl => (
                <div
                  key={hdl}
                  onPointerDown={e => beginInteraction(e, f, "resize", hdl)}
                  style={{ position: "absolute", width: 10, height: 10, borderRadius: 2, background: AZURE, border: "1px solid #ffffff", ...HANDLE_POS[hdl] }}
                />
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
  placeholders, variables, fields, selected, pendingType, onSetPending, onUpdateField, onDeleteField, onDeselectAll,
}: {
  placeholders:   TemplateRolePlaceholder[];
  variables:      TemplateVariable[];
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
    <div style={{ width: 220, flexShrink: 0, borderLeft: "1px solid rgba(0,0,0,0.08)", background: "#ffffff", overflowY: "auto" }}>
      {sel ? (
        <div style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: SILVER, ...GF, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>Properties</span>
            <button onClick={onDeselectAll} style={{ color: SILVER, background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ color: "#94A3B8", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Type</div>
          <div style={{ color: NAVY, ...GF, fontSize: 12, marginBottom: 10 }}>{FIELD_TYPE_ICONS[sel.type]} {FIELD_TYPE_LABELS[sel.type]}</div>
          <div style={{ color: "#94A3B8", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Label</div>
          <input
            value={sel.label}
            onChange={e => onUpdateField(sel._localId, { label: e.target.value })}
            style={{ width: "100%", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 6, color: NAVY, ...GF, fontSize: 12, padding: "5px 8px", boxSizing: "border-box", marginBottom: 10 }}
          />
          {/*
            ONE control for the field's target, not two.

            A field is signed by a role OR filled from a variable — the
            backend enforces exactly-one with a CHECK constraint, so offering
            two independent pickers would let the editor build a state the
            save can only reject. A single list makes the exclusivity obvious
            and unrepresentable-wrong.

            "Sender Prefill" with no variable chosen was the old meaning of
            `placeholderId: null`, and those fields were SILENTLY DROPPED on
            save. It is kept as an explicit option, and now warns.
          */}
          <div style={{ color: "#94A3B8", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Filled by</div>
          <select
            value={
              sel.variableRef !== undefined && sel.variableRef !== ""
                ? `var:${sel.variableRef}`
                : sel.placeholderId ?? ""
            }
            onChange={e => {
              const v = e.target.value;
              if (v.startsWith("var:")) {
                onUpdateField(sel._localId, {
                  placeholderId: null, isSenderText: true, variableRef: v.slice(4),
                });
                return;
              }
              onUpdateField(sel._localId, {
                placeholderId: v || null, isSenderText: !v, variableRef: undefined,
              });
            }}
            style={{ width: "100%", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 6, color: NAVY, ...GF, fontSize: 12, padding: "5px 8px", marginBottom: 6 }}
          >
            <option value="">— Sender Prefill (not saved) —</option>
            {placeholders.length > 0 && (
              <optgroup label="Signed by a role">
                {placeholders.map(ph => <option key={ph.id} value={ph.id}>{ph.label}</option>)}
              </optgroup>
            )}
            {variables.length > 0 && (
              <optgroup label="Filled from a variable">
                {variables.map(v => (
                  <option key={v.internalKey} value={`var:${v.internalKey}`}>
                    {v.label} {`{{${v.internalKey}}}`}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {sel.placeholderId === null && (sel.variableRef ?? "") === "" && (
            <p style={{ ...GF, fontSize: 10, color: "#B45309", margin: "0 0 10px", lineHeight: 1.45 }}>
              This field names no target, so it will not be saved. Pick a role
              or a variable.
            </p>
          )}
          {variables.length === 0 && (
            <p style={{ ...GF, fontSize: 10, color: "#64748B", margin: "0 0 10px", lineHeight: 1.45 }}>
              No variables declared yet — add them in the template's Variables
              tab to fill a field from one.
            </p>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 12 }}>
            <input type="checkbox" checked={sel.required} onChange={e => onUpdateField(sel._localId, { required: e.target.checked })} />
            <span style={{ ...GF, fontSize: 11, color: NAVY }}>Required</span>
          </label>
          <button
            onClick={() => onDeleteField(sel._localId)}
            style={{ ...GF, fontSize: 11, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 12px", cursor: "pointer", width: "100%" }}
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
            <button onClick={() => onSetPending(null)} style={{ ...GF, fontSize: 11, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "5px 10px", cursor: "pointer", width: "100%", marginBottom: 10 }}>
              Cancel
            </button>
          )}
          {FIELD_TYPE_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 10 }}>
              <div style={{ color: "#94A3B8", ...GF, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{group.label}</div>
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
                    background:  pendingType === type ? `${AZURE}22` : "none",
                    border:      pendingType === type ? `1px solid ${AZURE}55` : "none",
                    borderRadius:6,
                    color:       pendingType === type ? AZURE : NAVY,
                    ...GF,
                    fontSize:    11,
                    cursor:      "pointer",
                    textAlign:   "left",
                  }}
                  onMouseEnter={e => { if (pendingType !== type) (e.currentTarget as HTMLElement).style.background = "#F1F5F9"; }}
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
  const platform = usePlatform();
  const { run } = useProcessing();
  const workspaceId = platform.currentWorkspace?.id;
  const isReal = realTemplatesAvailable(workspaceId);

  const [edState, edDispatch] = useReducer(editorReducer, INITIAL_STATE);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingType, setPendingType] = useState<FieldType | null>(null);
  const [activePlaceholder, setActivePlaceholder] = useState<string | null>(
    template.placeholders[0]?.id ?? null
  );
  const [activeDocIdx, setActiveDocIdx] = useState(0);

  // A REAL template with nothing attached has no page to place a field
  // against — the fictional 3-page fallback below exists for the mock
  // catalogue, where every template is its own fiction and there is
  // nothing to save to. Placing is blocked on it in real mode instead of
  // letting someone draw a layout the next save can only refuse.
  const hasRealDocument = template.documents.some(d => !d.isPlaceholder);
  const canPlaceFields = !isReal || hasRealDocument;

  const docs = template.documents.length > 0
    ? template.documents
    : [{ id: "doc-1", displayName: "Document 1", pageCount: 3, order: 1, isPlaceholder: true as const }];
  const activeDoc = docs[activeDocIdx] ?? docs[0]!;

  // ── The real document ─────────────────────────────────────────────────────
  //
  // The same loader the preparation editor uses, for the same reason: fields
  // are placed against the page a person is looking at, so that page has to
  // be the real one. Memoised on the two ids — `useRealDocument` re-runs when
  // the loader's identity changes, so an inline closure would refetch on
  // every render.
  const realDocumentId = activeDoc.backendDocumentId ?? null;
  const loadDocument = useMemo(
    () => (workspaceId === undefined || realDocumentId === null
      ? null
      : () => realSigningRequestService.documentContentBlob(workspaceId, realDocumentId)),
    [workspaceId, realDocumentId],
  );
  const realDocument = useRealDocument(loadDocument);
  const realDoc = realDocument.status === "ready" ? realDocument.doc : null;

  // The real file is the authority on how many pages there are. The stored
  // page count is a cache of it and can lag (an authored document is
  // regenerated with a different page count, say), so prefer the file.
  const pageCount = realDocument.status === "ready"
    ? realDocument.pageCount
    : Math.max(activeDoc.pageCount, 1);

  // Load existing template fields on mount
  useEffect(() => {
    const converted: LocalField[] = template.fields.map(f => ({ ...f, _localId: mkId() }));
    edDispatch({ type: "LOAD", fields: converted });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const handleSave = async () => {
    const tplFields: TemplateField[] = edState.fields.map(f => {
      const { _localId, ...rest } = f;
      return rest;
    });

    if (!isReal || !workspaceId) {
      mockSaveTemplateFields(template.id, tplFields);
      edDispatch({ type: "MARK_SAVED" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      const result = await run(
        { message: "Saving field layout", detail: "Applying to the template." },
        () => realSaveTemplateFields(workspaceId, template.id, tplFields, template.placeholders),
      );
      edDispatch({ type: "LOAD", fields: result.fields.map(f => ({ ...f, _localId: mkId() })) });
      if (result.skipped > 0) {
        setSaveError(
          `${String(result.skipped)} field${result.skipped === 1 ? "" : "s"} could not be saved `
          + "— a Sender Prefill field has no role to attach to on a stored template.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      setSaveError(err instanceof Error && err.message !== ""
        ? err.message
        : "The field layout could not be saved.");
    } finally {
      setSaving(false);
    }
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
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#ffffff", ...GF }}>
      {/* Top bar */}
      <div style={{ height: 52, background: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
        <Link to={`/app/templates/${template.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: SILVER, ...GF, fontSize: 12, textDecoration: "none" }}>
          <ChevronLeft size={13} />
          {template.name}
        </Link>
        <span style={{ color: "#CBD5E1" }}>/</span>
        <span style={{ color: NAVY, ...GF, fontSize: 12 }}>Fields</span>
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
            {isReal ? "Saved" : "Saved (in-session)"}
          </div>
        )}
        <button
          onClick={() => { void handleSave(); }}
          disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: saving ? "#93C5FD" : AZURE, color: "white", border: "none", borderRadius: 7, ...GF, fontSize: 12, fontWeight: 700, cursor: saving ? "default" : "pointer" }}
        >
          <Save size={13} />
          {saving ? "Saving…" : "Save Fields"}
        </button>
      </div>

      {isReal && !canPlaceFields && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "#FDF8EC", borderBottom: "1px solid #EBD79A", flexShrink: 0 }}>
          <Info size={13} color="#B45309" />
          <span style={{ ...GF, fontSize: 12, color: "#78350F" }}>
            Attach a document to this template before placing fields —
            {" "}<Link to={`/app/templates/${template.id}/edit`} style={{ color: "#B45309" }}>go to Documents</Link>.
          </span>
        </div>
      )}

      {/* The document's own load state. Silence here was the defect: a page
          that failed to load looked identical to a blank one, and fields were
          placed against nothing. */}
      {realDocument.status === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "#F8FAFC", borderBottom: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
          <Info size={13} color={SILVER} />
          <span style={{ ...GF, fontSize: 12, color: SILVER }}>Loading the document…</span>
        </div>
      )}
      {realDocument.status === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "#FEF2F2", borderBottom: "1px solid #FECACA", flexShrink: 0 }}>
          <AlertCircle size={13} color="#B91C1C" />
          <span style={{ ...GF, fontSize: 12, color: "#B91C1C" }}>
            {realDocument.message} Field positions are still saved, but they are
            being placed against a blank page.
          </span>
        </div>
      )}

      {/* Assign-to role bar + doc tabs */}
      <div style={{ background: "#f8fafb", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
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
                  style={{ ...GF, fontSize: 11, padding: "4px 10px", border: `1px solid ${active ? color : "#CBD5E1"}`, borderRadius: 99, background: active ? `${color}18` : "none", color: active ? color : SILVER, cursor: "pointer" }}
                >
                  {ph.label}
                </button>
              );
            })}
            <button
              onClick={() => setActivePlaceholder(null)}
              style={{ ...GF, fontSize: 11, padding: "4px 10px", border: `1px solid ${activePlaceholder === null ? "#0078D4" : "#CBD5E1"}`, borderRadius: 99, background: activePlaceholder === null ? "#EEF4FB" : "none", color: activePlaceholder === null ? "#0078D4" : SILVER, cursor: "pointer" }}
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
          {Array.from({ length: pageCount }, (_, i) => {
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
                realDoc={realDoc}
                realPageSize={realDocument.status === "ready" ? realDocument.pageSizes[i] ?? null : null}
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
          variables={template.variables}
          fields={edState.fields}
          selected={edState.selected}
          pendingType={pendingType}
          onSetPending={canPlaceFields ? setPendingType : () => {}}
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

  return <FieldsEditorInner template={t} />;
}

export function TemplateFieldsPage() {
  return (
    <TemplateProvider>
      <TemplateFieldsInner />
    </TemplateProvider>
  );
}
