// Step 7 of 7: Place Fields — interactive field-placement editor.
// Command 19: replaces FieldsHandoff.tsx placeholder.
//
// PRIVACY: No file content is read or stored. No participant PII is persisted.
// No PDF parsing occurs. No documents are uploaded. All fields are in-memory only.
// Burgundy (#67023B) is NEVER used here — eNotary-only color.
// No notarial, seal, OTP, password, or biometric field types exist here.
// Document pages shown are FICTIONAL PREVIEWS — not the selected files.

import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";
import { FieldEditorProvider, useFieldEditor } from "../../../context/FieldEditorContext";
import type {
  FieldId,
  FieldDefinition,
  FieldType,
  ResizeHandle,
  NormalizedRect,
  ParticipantEditorIdentity,
  EditorPageId,
} from "../../../models/field-editor";
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_ICONS,
  FIELD_TYPE_DESCRIPTIONS,
  FIELD_TYPE_GROUPS,
  FIELD_SIZE_CONSTRAINTS,
  FIELD_PLAN_TIER,
  FIELD_ELIGIBLE_ROLES,
  RESIZE_HANDLES,
  defaultFieldRect,
  applyResizeDelta,
} from "../../../models/field-editor";
import type { PrepParticipant } from "../../../models/prepare";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";
const BGCANVAS = "#DFE3E8";
const WHITE  = "#FFFFFF";

// A4 portrait base dimensions at 100% editor zoom
const BASE_PAGE_WIDTH  = 595;
const PAGE_RATIO       = 842 / 595; // height / width ≈ 1.415

// ── Participant lookup helper ──────────────────────────────────────────────────
function useParticipantById(participants: PrepParticipant[]) {
  return useCallback((id: string | null) =>
    id ? participants.find(p => p.id === id) ?? null : null,
    [participants],
  );
}

// ── Fictional page preview ────────────────────────────────────────────────────
// Shows placeholder content; does not display any selected file content.
function FictionPagePreview({ pageNumber }: { pageNumber: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0,
        padding: "9% 11% 8%",
        display: "flex", flexDirection: "column", gap: 0,
        pointerEvents: "none",
      }}
    >
      {/* Letterhead / header block */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5%" }}>
        <div style={{ width: "28%",  height: 18, background: "#E3E8EF", borderRadius: 3 }} />
        <div style={{ width: "18%",  height: 18, background: "#EAECF0", borderRadius: 3 }} />
      </div>
      {/* Title line */}
      <div style={{ width: "55%", height: 14, background: "#D4D8DF", borderRadius: 2, marginBottom: "3%" }} />
      {/* Sub-title line */}
      <div style={{ width: "38%", height: 10, background: "#EAECF0", borderRadius: 2, marginBottom: "4%" }} />
      {/* Body text */}
      {Array.from({ length: pageNumber === 1 ? 9 : 11 }, (_, i) => (
        <div key={i} style={{
          width:        i % 5 === 4 ? `${52 + (i % 3) * 7}%` : "100%",
          height:       9,
          background:   "#EDEEF2",
          borderRadius: 1,
          marginBottom: "1.3%",
        }} />
      ))}
      <div style={{ height: "4%" }} />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={`b${i}`} style={{
          width:        i % 4 === 3 ? "60%" : "100%",
          height:       9,
          background:   "#EDEEF2",
          borderRadius: 1,
          marginBottom: "1.3%",
        }} />
      ))}
    </div>
  );
}

// ── Resize handle positions ────────────────────────────────────────────────────
const HANDLE_POSITIONS: Record<ResizeHandle, React.CSSProperties> = {
  nw: { top: -5,  left: -5  },
  n:  { top: -5,  left: "calc(50% - 4px)" },
  ne: { top: -5,  right: -5 },
  w:  { top: "calc(50% - 4px)", left: -5  },
  e:  { top: "calc(50% - 4px)", right: -5 },
  sw: { bottom: -5, left: -5  },
  s:  { bottom: -5, left: "calc(50% - 4px)" },
  se: { bottom: -5, right: -5 },
};
const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize", n: "ns-resize",   ne: "nesw-resize",
  w:  "ew-resize",                     e: "ew-resize",
  sw: "nesw-resize", s: "ns-resize",   se: "nwse-resize",
};

// ── FieldElement ──────────────────────────────────────────────────────────────
interface FieldElementProps {
  field:       FieldDefinition;
  isSelected:  boolean;
  identity:    ParticipantEditorIdentity | null;
  isSender:    boolean;
  onPointerDown: (fieldId: FieldId, e: React.PointerEvent<HTMLDivElement>) => void;
  onResizeDown:  (fieldId: FieldId, handle: ResizeHandle, e: React.PointerEvent<HTMLDivElement>) => void;
  overrideRect?: NormalizedRect;
}

function FieldElement({ field, isSelected, identity, isSender, onPointerDown, onResizeDown, overrideRect }: FieldElementProps) {
  const rect     = overrideRect ?? field.rect;
  const canResize = FIELD_SIZE_CONSTRAINTS[field.type].resizable;

  const bg = isSender
    ? "#FFF9EC"
    : identity
      ? `${identity.colorHex}18`
      : "#F5F7FA";
  const borderColor = isSelected
    ? AZURE
    : isSender
      ? GOLD
      : identity
        ? identity.colorHex
        : SILVER;

  return (
    <div
      role="button"
      aria-label={`${FIELD_TYPE_LABELS[field.type]} field${identity ? ` assigned to ${identity.displayName}` : ""}${field.required ? ", required" : ", optional"}`}
      tabIndex={0}
      style={{
        position:    "absolute",
        left:        `${rect.x * 100}%`,
        top:         `${rect.y * 100}%`,
        width:       `${rect.width * 100}%`,
        height:      `${rect.height * 100}%`,
        background:  bg,
        border:      `${isSelected ? 2 : 1}px solid ${borderColor}`,
        borderRadius: 3,
        cursor:      "pointer",
        zIndex:      field.layer + (isSelected ? 100 : 0),
        display:     "flex",
        alignItems:  "center",
        justifyContent: "space-between",
        padding:     "0 6%",
        boxSizing:   "border-box",
        overflow:    "hidden",
        userSelect:  "none",
        outline:     isSelected ? `2px solid ${AZURE}` : "none",
        outlineOffset: isSelected ? "1px" : "0",
        transition:  "border-color 0.1s",
      }}
      onPointerDown={e => onPointerDown(field.id, e)}
    >
      {/* Icon + label */}
      <span style={{
        ...GF,
        fontSize:     "min(11px, 1.8vw)",
        fontWeight:   600,
        color:        isSender ? GOLD : (identity ? identity.colorHex : "#4B5E70"),
        whiteSpace:   "nowrap",
        overflow:     "hidden",
        textOverflow: "ellipsis",
        flexShrink:   1,
        minWidth:     0,
      }}>
        <span style={{ marginRight: 3 }} aria-hidden="true">{FIELD_TYPE_ICONS[field.type]}</span>
        {field.label}
      </span>

      {/* Participant badge */}
      {identity && !isSender && (
        <span style={{
          ...GF,
          fontSize:     "min(10px, 1.5vw)",
          fontWeight:   700,
          background:   identity.colorHex,
          color:        WHITE,
          padding:      "1px 5px",
          borderRadius: 10,
          flexShrink:   0,
          marginLeft:   4,
          lineHeight:   1.5,
        }} aria-hidden="true">
          {identity.label}
        </span>
      )}
      {isSender && (
        <span style={{
          ...GF,
          fontSize:   "min(9px, 1.4vw)",
          color:      GOLD,
          fontWeight: 600,
          flexShrink: 0,
          marginLeft: 4,
        }} aria-hidden="true">SENDER</span>
      )}

      {/* Resize handles */}
      {isSelected && canResize && RESIZE_HANDLES.map(handle => (
        <div
          key={handle}
          role="presentation"
          aria-hidden="true"
          style={{
            position:  "absolute",
            width:     9,
            height:    9,
            background: AZURE,
            border:    "1px solid #fff",
            borderRadius: 2,
            cursor:    HANDLE_CURSORS[handle],
            zIndex:    200,
            ...HANDLE_POSITIONS[handle],
          }}
          onPointerDown={e => { e.stopPropagation(); onResizeDown(field.id, handle, e); }}
        />
      ))}

      {/* Required indicator */}
      {field.required && (
        <span
          style={{
            position: "absolute", top: -5, left: "50%",
            transform: "translateX(-50%)",
            width: 5, height: 5,
            background: "#C0392B",
            borderRadius: "50%",
            zIndex: 10,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ── Page canvas ────────────────────────────────────────────────────────────────
interface PageCanvasProps {
  participants: PrepParticipant[];
}

function PageCanvas({ participants }: PageCanvasProps) {
  const {
    currentDocumentId, currentPageId, currentPageFields, documents,
    selectedFieldIds, mode, pendingFieldType, zoom,
    addField, moveField, resizeField, selectFields, clearSelection,
    participantIdentities,
  } = useFieldEditor();

  const canvasRef  = useRef<HTMLDivElement>(null);
  const dragRef    = useRef<{
    type:         "move" | "resize";
    fieldId:      FieldId;
    handle?:      ResizeHandle;
    startX:       number;
    startY:       number;
    origRect:     NormalizedRect;
    isDragging:   boolean;
  } | null>(null);

  const [dragging, setDragging] = useState<{ fieldId: FieldId; rect: NormalizedRect } | null>(null);

  const currentDoc  = documents.find(d => d.id === currentDocumentId);
  const currentPage = currentDoc?.pages.find(p => p.id === currentPageId);

  const pageWidth  = (BASE_PAGE_WIDTH * zoom) / 100;
  const pageHeight = pageWidth * PAGE_RATIO;

  const getIdentity = useCallback((participantId: string | null): ParticipantEditorIdentity | null =>
    participantId
      ? (participantIdentities.find(i => i.participantId === participantId) ?? null)
      : null,
    [participantIdentities],
  );

  // Convert client coords to normalized page coords
  const toNorm = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { nx: 0, ny: 0 };
    const b = canvas.getBoundingClientRect();
    return {
      nx: Math.max(0, Math.min(1, (clientX - b.left) / b.width)),
      ny: Math.max(0, Math.min(1, (clientY - b.top)  / b.height)),
    };
  }, []);

  // Canvas click: place new field or clear selection
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === "place-field" && pendingFieldType && currentDocumentId && currentPageId) {
      const b  = canvasRef.current?.getBoundingClientRect();
      if (!b) return;
      const nx = (e.clientX - b.left) / b.width;
      const ny = (e.clientY - b.top)  / b.height;

      // Auto-assign first eligible participant if exactly one eligible
      const eligible = participants.filter(p => FIELD_ELIGIBLE_ROLES[pendingFieldType].includes(p.role));
      const autoAssign = eligible.length === 1 ? eligible[0]!.id : null;

      addField({
        type:          pendingFieldType,
        documentId:    currentDocumentId,
        pageId:        currentPageId,
        rect:          defaultFieldRect(pendingFieldType, nx, ny),
        participantId: pendingFieldType === "sender-text" ? null : autoAssign,
        label:         FIELD_TYPE_LABELS[pendingFieldType],
        required:      pendingFieldType !== "sender-text",
        placeholder:   undefined,
        demonstrationOnly: true,
      });
    }
  }, [mode, pendingFieldType, currentDocumentId, currentPageId, participants, addField]);

  // Field pointer-down: start move drag
  const handleFieldPointerDown = useCallback((fieldId: FieldId, e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "select") return;
    e.preventDefault();
    e.stopPropagation();

    const field = currentPageFields.find(f => f.id === fieldId);
    if (!field) return;

    selectFields([fieldId]);
    canvasRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: "move", fieldId,
      startX: e.clientX, startY: e.clientY,
      origRect: field.rect,
      isDragging: false,
    };
  }, [mode, currentPageFields, selectFields]);

  // Resize handle pointer-down
  const handleResizePointerDown = useCallback((fieldId: FieldId, handle: ResizeHandle, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const field = currentPageFields.find(f => f.id === fieldId);
    if (!field) return;

    canvasRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      type: "resize", fieldId, handle,
      startX: e.clientX, startY: e.clientY,
      origRect: field.rect,
      isDragging: false,
    };
  }, [currentPageFields]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const b  = canvas.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / b.width;
    const dy = (e.clientY - d.startY) / b.height;

    if (!d.isDragging && Math.abs(dx) + Math.abs(dy) > 0.003) {
      dragRef.current = { ...d, isDragging: true };
    }
    if (!d.isDragging) return;

    if (d.type === "move") {
      const newRect = {
        ...d.origRect,
        x: Math.max(0, Math.min(1 - d.origRect.width,  d.origRect.x + dx)),
        y: Math.max(0, Math.min(1 - d.origRect.height, d.origRect.y + dy)),
      };
      setDragging({ fieldId: d.fieldId, rect: newRect });
    } else if (d.type === "resize" && d.handle) {
      const field = currentPageFields.find(f => f.id === d.fieldId);
      if (!field) return;
      const newRect = applyResizeDelta(d.origRect, d.handle!, dx, dy, field.type);
      setDragging({ fieldId: d.fieldId, rect: newRect });
    }
  }, [currentPageFields]);

  const handleCanvasPointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;

    if (!dragging) { setDragging(null); return; }
    const { fieldId, rect } = dragging;
    setDragging(null);

    // Both move and resize land here with the final absolute rect already computed.
    // moveField clamps within bounds before committing.
    moveField(fieldId, rect);
  }, [dragging, moveField, currentPageFields]);

  // Canvas keyboard events
  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (selectedFieldIds.length === 0) return;
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) return;
    e.preventDefault();

    const step  = e.shiftKey ? 0.02 : 0.005;
    const dxMap: Record<string, number> = { ArrowLeft: -step, ArrowRight: step, ArrowUp: 0, ArrowDown: 0 };
    const dyMap: Record<string, number> = { ArrowLeft: 0,     ArrowRight: 0,    ArrowUp: -step, ArrowDown: step };
    const dx = dxMap[e.key] ?? 0;
    const dy = dyMap[e.key] ?? 0;

    selectedFieldIds.forEach(fid => {
      const field = currentPageFields.find(f => f.id === fid);
      if (!field) return;
      moveField(fid, {
        ...field.rect,
        x: Math.max(0, Math.min(1 - field.rect.width,  field.rect.x + dx)),
        y: Math.max(0, Math.min(1 - field.rect.height, field.rect.y + dy)),
      });
    });
  }, [selectedFieldIds, currentPageFields, moveField]);

  if (!currentPage) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: BGCANVAS }}>
        <div style={{ ...GF, textAlign: "center", color: SILVER }}>
          <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden="true">📄</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#4B5E70" }}>No page selected</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Select a document and page from the panel.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: BGCANVAS,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      {/* Page container */}
      <div style={{ position: "relative" }}>
        {/* Fictional preview notice */}
        <div style={{
          ...GF,
          fontSize: 10,
          color: SILVER,
          textAlign: "center",
          marginBottom: 6,
          lineHeight: 1.4,
        }}>
          Document pages shown are fictional previews — selected files are not parsed or rendered.
        </div>

        {/* Page */}
        <div
          ref={canvasRef}
          role="application"
          aria-label={`Field placement canvas — ${currentPage.label}. ${mode === "place-field" ? `Click to place ${pendingFieldType} field.` : "Select fields or use the palette to add."}`}
          tabIndex={0}
          style={{
            position:  "relative",
            width:     pageWidth,
            height:    pageHeight,
            background: WHITE,
            boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
            cursor:    mode === "place-field" ? "crosshair" : "default",
            userSelect: "none",
          }}
          onClick={handleCanvasClick}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={handleCanvasPointerUp}
          onKeyDown={handleCanvasKeyDown}
          onPointerDown={e => {
            // Click on empty canvas clears selection
            if (e.target === canvasRef.current && mode === "select") {
              clearSelection();
            }
          }}
        >
          {/* Fictional page content */}
          <FictionPagePreview pageNumber={currentPage.pageNumber} />

          {/* Fields */}
          {currentPageFields.map(field => {
            const isSelected  = selectedFieldIds.includes(field.id);
            const identity    = getIdentity(field.participantId);
            const isSender    = field.type === "sender-text" || field.participantId === null;
            const overrideRect = dragging?.fieldId === field.id ? dragging.rect : undefined;

            return (
              <FieldElement
                key={field.id}
                field={field}
                isSelected={isSelected}
                identity={identity}
                isSender={isSender}
                onPointerDown={handleFieldPointerDown}
                onResizeDown={handleResizePointerDown}
                overrideRect={overrideRect}
              />
            );
          })}

          {/* Placement mode cursor overlay */}
          {mode === "place-field" && (
            <div style={{
              position: "absolute", inset: 0,
              border: `2px dashed ${AZURE}`,
              pointerEvents: "none",
              zIndex: 500,
            }} />
          )}
        </div>

        {/* Page indicator */}
        <div style={{ ...GF, fontSize: 11, color: SILVER, textAlign: "center", marginTop: 8 }}>
          Page {currentPage.pageNumber} of {currentDoc?.pageCount ?? 1} — {currentPageFields.length} field{currentPageFields.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

// ── Document panel (left) ─────────────────────────────────────────────────────
function DocumentPanel() {
  const {
    documents, currentDocumentId, currentPageId, fields,
    setDocument, setPage,
  } = useFieldEditor();

  if (documents.length === 0) {
    return (
      <div style={{ width: 200, background: WHITE, borderRight: "1px solid #E3E8EF", padding: 16 }}>
        <p style={{ ...GF, fontSize: 12, color: SILVER }}>No documents available.</p>
      </div>
    );
  }

  return (
    <div style={{
      width: 200,
      background: WHITE,
      borderRight: "1px solid #E3E8EF",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, padding: "10px 12px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Documents
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {documents.map(doc => {
          const isCurDoc    = doc.id === currentDocumentId;
          const docFields   = fields.filter(f => f.documentId === doc.id).length;
          return (
            <div key={doc.id}>
              {/* Doc header */}
              <button
                onClick={() => setDocument(doc.id)}
                aria-pressed={isCurDoc}
                style={{
                  ...GF,
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  background: isCurDoc ? "#EBF4FC" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isCurDoc ? AZURE : "transparent"}`,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: isCurDoc ? 700 : 500,
                  color: isCurDoc ? AZURE : NAVY,
                }}
              >
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.displayName}
                </div>
                <div style={{ fontSize: 10, color: SILVER, fontWeight: 400, marginTop: 2 }}>
                  {doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""} · {docFields} field{docFields !== 1 ? "s" : ""}
                </div>
              </button>

              {/* Page thumbnails */}
              {isCurDoc && doc.pages.map(page => {
                const isCurPage   = page.id === currentPageId;
                const pageFields  = fields.filter(f => f.pageId === page.id).length;
                return (
                  <button
                    key={page.id}
                    onClick={() => setPage(page.id)}
                    aria-label={`${page.label}, ${pageFields} field${pageFields !== 1 ? "s" : ""}${isCurPage ? ", current page" : ""}`}
                    aria-current={isCurPage ? "true" : undefined}
                    style={{
                      ...GF,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "5px 12px 5px 22px",
                      background: isCurPage ? "#F0F7FF" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      color: isCurPage ? AZURE : "#4B5E70",
                      fontWeight: isCurPage ? 600 : 400,
                    }}
                  >
                    {/* Mini page preview */}
                    <div style={{
                      width: 28, height: 36,
                      background: isCurPage ? "#EBF4FC" : "#F5F7FA",
                      border: `1px solid ${isCurPage ? AZURE : "#DDE1E7"}`,
                      borderRadius: 2,
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "4px 3px",
                    }} aria-hidden="true">
                      {[3,4,4,3,2].map((w, i) => (
                        <div key={i} style={{ height: 2, background: "#DDE1E7", borderRadius: 1, width: `${w * 20}%` }} />
                      ))}
                    </div>
                    <span>
                      <div>{page.label}</div>
                      {pageFields > 0 && <div style={{ fontSize: 9, color: SILVER }}>{pageFields} field{pageFields !== 1 ? "s" : ""}</div>}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Field Palette ─────────────────────────────────────────────────────────────
function FieldPalettePanel() {
  const { mode, pendingFieldType, setPendingField } = useFieldEditor();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", flex: 1 }}>
      <div style={{ ...GF, fontSize: 12, fontWeight: 700, color: SILVER, padding: "10px 14px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Field Types
      </div>
      {FIELD_TYPE_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 12 }}>
          <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: SILVER, padding: "4px 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {group.label}
          </div>
          {group.types.map(type => {
            const tier      = FIELD_PLAN_TIER[type];
            const isActive  = mode === "place-field" && pendingFieldType === type;
            const limited   = tier === "enterprise" || tier === "planned";
            return (
              <button
                key={type}
                onClick={() => setPendingField(isActive ? null : type)}
                aria-pressed={isActive}
                disabled={limited}
                title={FIELD_TYPE_DESCRIPTIONS[type]}
                style={{
                  ...GF,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  width: "100%",
                  padding: "7px 14px",
                  background: isActive ? "#EBF4FC" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? AZURE : "transparent"}`,
                  cursor: limited ? "not-allowed" : "pointer",
                  textAlign: "left",
                  opacity: limited ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, width: 20, textAlign: "center" }} aria-hidden="true">
                  {FIELD_TYPE_ICONS[type]}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? AZURE : NAVY }}>
                    {FIELD_TYPE_LABELS[type]}
                    {tier === "standard"   && <span style={{ fontSize: 9, marginLeft: 5, color: AZURE, fontWeight: 700 }}>PLAN</span>}
                    {tier === "enterprise" && <span style={{ fontSize: 9, marginLeft: 5, color: SILVER, fontWeight: 700 }}>ENTERPRISE</span>}
                    {tier === "planned"    && <span style={{ fontSize: 9, marginLeft: 5, color: SILVER, fontWeight: 700 }}>COMING SOON</span>}
                  </div>
                  <div style={{ fontSize: 10, color: SILVER, lineHeight: 1.4, marginTop: 1 }}>
                    {FIELD_TYPE_DESCRIPTIONS[type]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
      {mode === "place-field" && pendingFieldType && (
        <div style={{ ...GF, padding: "10px 14px 14px", fontSize: 12, color: AZURE, background: "#EBF4FC", borderTop: "1px solid #C8E1F5" }}>
          Click anywhere on the page to place a <strong>{FIELD_TYPE_LABELS[pendingFieldType]}</strong> field.
          <button
            onClick={() => setPendingField(null)}
            style={{ ...GF, display: "block", marginTop: 8, fontSize: 12, color: SILVER, background: "none", border: "1px solid #D1D9E0", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Field properties panel ────────────────────────────────────────────────────
interface FieldPropertiesProps {
  field:        FieldDefinition;
  participants: PrepParticipant[];
}

function FieldPropertiesPanel({ field, participants }: FieldPropertiesProps) {
  const { updateField, deleteFields, duplicateField, reorderLayer, participantIdentities } = useFieldEditor();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const eligible = participants.filter(p => FIELD_ELIGIBLE_ROLES[field.type].includes(p.role));
  const isSender = field.type === "sender-text";

  const identity = field.participantId
    ? participantIdentities.find(i => i.participantId === field.participantId)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
      {/* Header */}
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #F0F2F5" }}>
        <div style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY }}>
          {FIELD_TYPE_ICONS[field.type]} {FIELD_TYPE_LABELS[field.type]}
        </div>
        <div style={{ ...GF, fontSize: 10, color: SILVER, marginTop: 2 }}>
          {identity ? `Assigned: ${identity.displayName} (${identity.role})` : isSender ? "Sender field" : "Unassigned"}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>

        {/* Participant assignment */}
        {!isSender && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Participant
            </label>
            <select
              value={field.participantId ?? ""}
              onChange={e => updateField(field.id, { participantId: e.target.value || null })}
              aria-label="Assign participant"
              style={{ ...GF, width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid #D1D9E0", borderRadius: 6, color: NAVY, background: WHITE }}
            >
              <option value="">— Unassigned —</option>
              {eligible.map(p => {
                const id_ = participantIdentities.find(i => i.participantId === p.id);
                return (
                  <option key={p.id} value={p.id}>
                    {id_?.label ?? ""} {p.name} ({p.role})
                  </option>
                );
              })}
              {eligible.length === 0 && (
                <option disabled>No eligible participants for this field type</option>
              )}
            </select>
            {eligible.length === 0 && (
              <p style={{ ...GF, fontSize: 11, color: "#C0392B", marginTop: 4 }}>
                No participants have a role compatible with this field type.
              </p>
            )}
          </div>
        )}

        {/* Label */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
            Label
          </label>
          <input
            type="text"
            value={field.label}
            maxLength={80}
            onChange={e => updateField(field.id, { label: e.target.value })}
            aria-label="Field label"
            style={{ ...GF, width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid #D1D9E0", borderRadius: 6, color: NAVY, boxSizing: "border-box" }}
          />
        </div>

        {/* Sender text content */}
        {isSender && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
              Text Content
            </label>
            <textarea
              value={field.senderText ?? ""}
              maxLength={500}
              rows={3}
              onChange={e => updateField(field.id, { senderText: e.target.value })}
              aria-label="Sender text content"
              style={{ ...GF, width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid #D1D9E0", borderRadius: 6, color: NAVY, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
        )}

        {/* Required toggle */}
        {!isSender && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Required
            </label>
            <label style={{ ...GF, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: NAVY }}>
              <input
                type="checkbox"
                checked={field.required}
                onChange={e => updateField(field.id, { required: e.target.checked })}
                aria-label="Field is required"
              />
              Participant must complete this field
            </label>
          </div>
        )}

        {/* Multiline for text */}
        {(field.type === "text" || field.type === "multiline-text") && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...GF, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: NAVY }}>
              <input
                type="checkbox"
                checked={field.multiline ?? false}
                onChange={e => updateField(field.id, { multiline: e.target.checked })}
                aria-label="Allow multiline text"
              />
              Allow multiline text entry
            </label>
          </div>
        )}

        {/* Position & size */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Position
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {(["x","y","width","height"] as const).map(prop => (
              <label key={prop} style={{ ...GF, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, color: SILVER, textTransform: "uppercase" }}>{prop}</span>
                <input
                  type="number"
                  value={Math.round(field.rect[prop] * 1000) / 10}
                  step={0.1}
                  min={0}
                  max={100}
                  aria-label={`Field ${prop} (percentage)`}
                  onChange={e => {
                    const val = parseFloat(e.target.value) / 100;
                    if (isNaN(val)) return;
                    updateField(field.id, { rect: { ...field.rect, [prop]: Math.max(0, Math.min(1, val)) } });
                  }}
                  style={{ ...GF, padding: "4px 6px", fontSize: 11, border: "1px solid #D1D9E0", borderRadius: 4, color: NAVY }}
                />
              </label>
            ))}
          </div>
          <div style={{ ...GF, fontSize: 10, color: SILVER, marginTop: 4 }}>
            Values are percentages of page dimensions (0–100%).
          </div>
        </div>

        {/* Layer management */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Layer (z-order)
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(["bring-to-front","bring-forward","send-backward","send-to-back"] as const).map(action => (
              <button
                key={action}
                onClick={() => reorderLayer(field.id, action)}
                style={{ ...GF, fontSize: 10, padding: "4px 7px", borderRadius: 4, border: "1px solid #D1D9E0", background: WHITE, cursor: "pointer", color: NAVY }}
              >
                {action === "bring-to-front" ? "Front" : action === "bring-forward" ? "↑ Fwd" : action === "send-backward" ? "↓ Back" : "To Back"}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid #F0F2F5", paddingTop: 12 }}>
          <button
            onClick={() => duplicateField(field.id)}
            style={{ ...GF, fontSize: 12, padding: "7px 10px", borderRadius: 6, border: "1px solid #D1D9E0", background: WHITE, cursor: "pointer", color: NAVY, textAlign: "left" }}
          >
            Duplicate field
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ ...GF, fontSize: 12, padding: "7px 10px", borderRadius: 6, border: "1px solid #F5C6CB", background: "#FFF5F5", cursor: "pointer", color: "#C0392B", textAlign: "left" }}
            >
              Delete field
            </button>
          ) : (
            <div style={{ padding: "8px", background: "#FFF5F5", borderRadius: 6, border: "1px solid #F5C6CB" }}>
              <p style={{ ...GF, fontSize: 12, color: "#C0392B", margin: "0 0 8px" }}>Delete this field? This can be undone.</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { deleteFields([field.id]); setConfirmDelete(false); }}
                  style={{ ...GF, fontSize: 12, padding: "5px 10px", borderRadius: 5, border: "none", background: "#C0392B", color: WHITE, cursor: "pointer" }}
                >Delete</button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ ...GF, fontSize: 12, padding: "5px 10px", borderRadius: 5, border: "1px solid #D1D9E0", background: WHITE, color: NAVY, cursor: "pointer" }}
                >Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Field list (accessible non-canvas alternative) ────────────────────────────
interface FieldListProps { participants: PrepParticipant[] }

function FieldListView({ participants }: FieldListProps) {
  const {
    fields, selectedFieldIds, selectFields, deleteFields, setDocument, setPage,
    participantFilter, setParticipantFilter, participantIdentities,
  } = useFieldEditor();

  const [typeFilter, setTypeFilter] = useState<FieldType | "">("");
  const [errFilter,  setErrFilter]  = useState(false);

  const filtered = fields.filter(f => {
    if (participantFilter && f.participantId !== participantFilter) return false;
    if (typeFilter         && f.type          !== typeFilter)         return false;
    if (errFilter          && f.participantId !== null)               return false;
    return true;
  });

  const getIdentity = (id: string | null) =>
    id ? participantIdentities.find(i => i.participantId === id) ?? null : null;

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Filters */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #E3E8EF", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER }}>Filter:</span>

        <select
          value={participantFilter ?? ""}
          onChange={e => setParticipantFilter(e.target.value || null)}
          aria-label="Filter by participant"
          style={{ ...GF, fontSize: 11, padding: "3px 7px", border: "1px solid #D1D9E0", borderRadius: 5, color: NAVY }}
        >
          <option value="">All participants</option>
          <option value="__unassigned__" onClick={() => setParticipantFilter("__unassigned__")}>Unassigned</option>
          {participants.map(p => {
            const id = participantIdentities.find(i => i.participantId === p.id);
            return <option key={p.id} value={p.id}>{id?.label} {p.name}</option>;
          })}
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as FieldType | "")}
          aria-label="Filter by field type"
          style={{ ...GF, fontSize: 11, padding: "3px 7px", border: "1px solid #D1D9E0", borderRadius: 5, color: NAVY }}
        >
          <option value="">All types</option>
          {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>{label}</option>
          ))}
        </select>

        <label style={{ ...GF, fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: NAVY }}>
          <input type="checkbox" checked={errFilter} onChange={e => setErrFilter(e.target.checked)} />
          Unassigned only
        </label>

        <span style={{ ...GF, fontSize: 11, color: SILVER, marginLeft: "auto" }}>
          {filtered.length} field{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ ...GF, padding: 24, textAlign: "center", color: SILVER, fontSize: 13 }}>
            No fields match the current filters.
          </div>
        ) : (
          <table
            role="table"
            aria-label="Field list"
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, ...GF }}
          >
            <thead>
              <tr>
                {["Type","Label","Participant","Page","Required","Actions"].map(h => (
                  <th key={h} scope="col" style={{ textAlign: "left", padding: "6px 10px", background: "#F5F7FA", borderBottom: "1px solid #E3E8EF", fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(field => {
                const identity   = getIdentity(field.participantId);
                const isSelected = selectedFieldIds.includes(field.id);
                return (
                  <tr
                    key={field.id}
                    style={{ background: isSelected ? "#EBF4FC" : "transparent", borderBottom: "1px solid #F0F2F5" }}
                  >
                    <td style={{ padding: "6px 10px" }}>
                      <span aria-hidden="true">{FIELD_TYPE_ICONS[field.type]}</span>{" "}
                      {FIELD_TYPE_LABELS[field.type]}
                    </td>
                    <td style={{ padding: "6px 10px", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {field.label}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      {identity ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ background: identity.colorHex, color: WHITE, borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 700 }} aria-hidden="true">
                            {identity.label}
                          </span>
                          <span>{identity.displayName}</span>
                        </span>
                      ) : field.type === "sender-text" ? (
                        <span style={{ color: GOLD, fontWeight: 600 }}>Sender</span>
                      ) : (
                        <span style={{ color: "#C0392B", fontWeight: 600 }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <button
                        onClick={() => { setDocument(field.documentId); setPage(field.pageId); }}
                        style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: AZURE, fontSize: 12, padding: 0, textDecoration: "underline" }}
                      >
                        Go to page
                      </button>
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      {field.required ? (
                        <span style={{ color: "#C0392B", fontWeight: 600 }}>Required</span>
                      ) : (
                        <span style={{ color: SILVER }}>Optional</span>
                      )}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <button
                        onClick={() => { selectFields([field.id]); setDocument(field.documentId); setPage(field.pageId); }}
                        style={{ ...GF, fontSize: 11, padding: "3px 7px", border: "1px solid #D1D9E0", borderRadius: 4, background: WHITE, cursor: "pointer", color: NAVY, marginRight: 4 }}
                      >
                        Select
                      </button>
                      <button
                        onClick={() => deleteFields([field.id])}
                        style={{ ...GF, fontSize: 11, padding: "3px 7px", border: "1px solid #F5C6CB", borderRadius: 4, background: "#FFF5F5", cursor: "pointer", color: "#C0392B" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Validation panel ──────────────────────────────────────────────────────────
function ValidationPanel() {
  const { validation, setDocument, setPage, fields, selectFields } = useFieldEditor();

  const goToField = (fieldId?: FieldId, documentId?: string, pageId?: EditorPageId) => {
    const field = fieldId ? fields.find(f => f.id === fieldId) : null;
    const docId  = documentId ?? field?.documentId;
    const pgId   = pageId     ?? field?.pageId;
    if (docId) setDocument(docId);
    if (pgId)  setPage(pgId);
    if (fieldId) selectFields([fieldId]);
  };

  if (!validation) {
    return (
      <div style={{ ...GF, padding: 16, color: SILVER, fontSize: 12 }}>
        Run validation to see results.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      {/* Summary */}
      <div style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: validation.isValid ? "#F0FAF4" : "#FFF5F5",
        border: `1px solid ${validation.isValid ? "#A8D5B5" : "#F5C6CB"}`,
        marginBottom: 12,
      }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: validation.isValid ? "#2E7D32" : "#C0392B" }}>
          {validation.isValid ? "Ready to continue" : `${validation.errors.length} error${validation.errors.length !== 1 ? "s" : ""} to resolve`}
        </div>
        <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 3 }}>
          {validation.totalFieldCount} field{validation.totalFieldCount !== 1 ? "s" : ""} · {validation.warnings.length} warning{validation.warnings.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Errors */}
      {validation.errors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...GF, fontSize: 11, fontWeight: 700, color: "#C0392B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Errors ({validation.errors.length})
          </div>
          {validation.errors.map(issue => (
            <div key={issue.id} style={{ ...GF, padding: "8px 10px", borderRadius: 6, background: "#FFF5F5", border: "1px solid #F5C6CB", marginBottom: 5, fontSize: 12, color: "#C0392B" }}>
              <div style={{ fontWeight: 600 }}>✕ {issue.message}</div>
              {issue.suggestion && <div style={{ fontSize: 11, color: "#9B2335", marginTop: 3 }}>{issue.suggestion}</div>}
              {(issue.fieldId || issue.documentId) && (
                <button
                  onClick={() => goToField(issue.fieldId, issue.documentId, issue.pageId)}
                  style={{ ...GF, fontSize: 11, marginTop: 5, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  Go to {issue.fieldId ? "field" : "document"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...GF, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Warnings ({validation.warnings.length})
          </div>
          {validation.warnings.map(issue => (
            <div key={issue.id} style={{ ...GF, padding: "8px 10px", borderRadius: 6, background: "#FEF9EC", border: "1px solid #F0D07A", marginBottom: 5, fontSize: 12, color: GOLD }}>
              <div style={{ fontWeight: 600 }}>⚠ {issue.message}</div>
              {issue.suggestion && <div style={{ fontSize: 11, color: "#856404", marginTop: 3 }}>{issue.suggestion}</div>}
              {(issue.fieldId || issue.documentId) && (
                <button
                  onClick={() => goToField(issue.fieldId, issue.documentId, issue.pageId)}
                  style={{ ...GF, fontSize: 11, marginTop: 5, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  Go to {issue.fieldId ? "field" : "document"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Participant coverage */}
      {validation.participantCoverage.length > 0 && (
        <div>
          <div style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Participant Coverage
          </div>
          {validation.participantCoverage.map(cov => (
            <div key={cov.participantId} style={{
              ...GF, fontSize: 11,
              padding: "7px 10px",
              borderRadius: 6,
              background: cov.isSatisfied ? "#F0FAF4" : "#FFF5F5",
              border: `1px solid ${cov.isSatisfied ? "#A8D5B5" : "#F5C6CB"}`,
              marginBottom: 5,
              color: cov.isSatisfied ? "#2E7D32" : "#C0392B",
            }}>
              <div style={{ fontWeight: 600 }}>
                {cov.isSatisfied ? "✓" : "✕"} {cov.name} ({cov.role})
              </div>
              <div style={{ color: SILVER, marginTop: 2 }}>
                {cov.fieldCount} field{cov.fieldCount !== 1 ? "s" : ""} · {cov.requiredFieldCount} required
                {cov.hasSignature ? " · Has signature" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Keyboard placement dialog ─────────────────────────────────────────────────
interface KeyboardPlaceDialogProps {
  participants: PrepParticipant[];
  onClose:      () => void;
}

const PLACEMENT_REGIONS = [
  { id: "tl", label: "Top Left",     x: 0.10, y: 0.10 },
  { id: "tc", label: "Top Center",   x: 0.38, y: 0.10 },
  { id: "tr", label: "Top Right",    x: 0.62, y: 0.10 },
  { id: "ml", label: "Middle Left",  x: 0.10, y: 0.43 },
  { id: "mc", label: "Middle Center",x: 0.38, y: 0.43 },
  { id: "mr", label: "Middle Right", x: 0.62, y: 0.43 },
  { id: "bl", label: "Bottom Left",  x: 0.10, y: 0.72 },
  { id: "bc", label: "Bottom Center",x: 0.38, y: 0.72 },
  { id: "br", label: "Bottom Right", x: 0.62, y: 0.72 },
];

function KeyboardPlaceDialog({ participants, onClose }: KeyboardPlaceDialogProps) {
  const { currentDocumentId, currentPageId, addField, selectFields } = useFieldEditor();
  const [fieldType,     setFieldType]     = useState<FieldType>("signature");
  const [participantId, setParticipantId] = useState<string>("");
  const [region,        setRegion]        = useState("ml");

  const isSender  = fieldType === "sender-text";
  const eligible  = participants.filter(p => FIELD_ELIGIBLE_ROLES[fieldType].includes(p.role));
  const selRegion = PLACEMENT_REGIONS.find(r => r.id === region)!;

  const handlePlace = () => {
    if (!currentDocumentId || !currentPageId) return;
    const field = addField({
      type:          fieldType,
      documentId:    currentDocumentId,
      pageId:        currentPageId,
      rect:          defaultFieldRect(fieldType, selRegion.x, selRegion.y),
      participantId: isSender ? null : (participantId || null),
      label:         FIELD_TYPE_LABELS[fieldType],
      required:      !isSender,
      demonstrationOnly: true,
    });
    selectFields([field.id]);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add field — keyboard placement"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(7,17,31,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        ...GF,
        background: WHITE,
        borderRadius: 12,
        width: "100%", maxWidth: 480,
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E3E8EF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ ...GF, fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>Add Field</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ ...GF, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: SILVER, lineHeight: 1 }}
          >×</button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Field type */}
          <div>
            <label htmlFor="kp-type" style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>
              Field type
            </label>
            <select
              id="kp-type"
              value={fieldType}
              onChange={e => { setFieldType(e.target.value as FieldType); setParticipantId(""); }}
              style={{ ...GF, width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #D1D9E0", borderRadius: 7, color: NAVY }}
            >
              {FIELD_TYPE_GROUPS.flatMap(g => g.types).map(t => (
                <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Participant */}
          {!isSender && (
            <div>
              <label htmlFor="kp-pax" style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>
                Assign to participant
              </label>
              <select
                id="kp-pax"
                value={participantId}
                onChange={e => setParticipantId(e.target.value)}
                style={{ ...GF, width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #D1D9E0", borderRadius: 7, color: NAVY }}
              >
                <option value="">— Leave unassigned —</option>
                {eligible.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
              </select>
              {eligible.length === 0 && (
                <p style={{ ...GF, fontSize: 12, color: "#C0392B", marginTop: 4 }}>
                  No participants are eligible for this field type. Add eligible participants first.
                </p>
              )}
            </div>
          )}

          {/* Placement region */}
          <div>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
                Placement region
              </legend>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {PLACEMENT_REGIONS.map(r => (
                  <label
                    key={r.id}
                    style={{
                      ...GF,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "8px 4px",
                      border: `2px solid ${region === r.id ? AZURE : "#D1D9E0"}`,
                      borderRadius: 7,
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: region === r.id ? 700 : 400,
                      color: region === r.id ? AZURE : "#4B5E70",
                      background: region === r.id ? "#EBF4FC" : WHITE,
                    }}
                  >
                    <input
                      type="radio"
                      name="region"
                      value={r.id}
                      checked={region === r.id}
                      onChange={() => setRegion(r.id)}
                      style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #E3E8EF", display: "flex", gap: 8 }}>
          <button
            onClick={handlePlace}
            disabled={!currentDocumentId || !currentPageId}
            style={{ ...GF, flex: 1, padding: "9px 16px", borderRadius: 7, border: "none", background: AZURE, color: WHITE, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Place Field
          </button>
          <button
            onClick={onClose}
            style={{ ...GF, padding: "9px 16px", borderRadius: 7, border: "1px solid #D1D9E0", background: WHITE, color: NAVY, fontSize: 14, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Save state label ──────────────────────────────────────────────────────────
function SaveStateLabel({ state }: { state: string }) {
  if (state === "idle")               return null;
  if (state === "unsaved-changes")    return <span style={{ ...GF, fontSize: 11, color: GOLD }}>Unsaved changes</span>;
  if (state === "saved-in-session")   return <span style={{ ...GF, fontSize: 11, color: "#4CAF7D" }}>Saved in this session</span>;
  if (state === "error")              return <span style={{ ...GF, fontSize: 11, color: "#C0392B" }}>Save error — changes retained locally</span>;
  return null;
}

// ── Editor toolbar ─────────────────────────────────────────────────────────────
interface ToolbarProps {
  draftTitle:    string;
  participants:  PrepParticipant[];
  draft:         import("../../../models/prepare").PreparationDraft;
  showKbDialog:  boolean;
  setShowKbDialog: (v: boolean) => void;
  onContinue:    () => void;
  /** Validated internal path to return to (Command 37 workflow round-trip). */
  returnTo:      string | null;
  returnLabel:   string;
}

function EditorToolbar({ draftTitle, participants, draft, showKbDialog, setShowKbDialog, onContinue, returnTo, returnLabel }: ToolbarProps) {
  const {
    undo, redo, canUndo, canRedo,
    zoom, setZoom,
    showFieldList, toggleFieldList,
    showValidation, toggleValidation,
    saveState,
    validation, runValidation,
    mode, setMode, pendingFieldType, setPendingField,
    copySelected, paste, clipboard,
    fields,
  } = useFieldEditor();

  const navigate = useNavigate();

  const handleValidate = () => {
    runValidation(draft);
    if (!showValidation) toggleValidation();
  };

  const handleContinue = () => {
    const result = runValidation(draft);
    if (!result.isValid) {
      if (!showValidation) toggleValidation();
      return;
    }
    onContinue();
  };

  const btnBase: React.CSSProperties = {
    ...GF,
    height:       34,
    padding:      "0 10px",
    borderRadius: 6,
    border:       "1px solid #D1D9E0",
    background:   WHITE,
    color:        NAVY,
    fontSize:     12,
    fontWeight:   600,
    cursor:       "pointer",
    display:      "inline-flex",
    alignItems:   "center",
    gap:          5,
    whiteSpace:   "nowrap",
  };

  return (
    <div
      role="toolbar"
      aria-label="Field editor toolbar"
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         6,
        padding:     "6px 12px",
        background:  NAVY,
        borderBottom: "1px solid #1C2B3A",
        flexShrink:  0,
        overflowX:   "auto",
        minHeight:   50,
      }}
    >
      {/* Back — returns to the caller when a validated internal returnTo was supplied */}
      <button
        onClick={() => navigate(returnTo ?? "/app/prepare/review")}
        aria-label={returnTo ? `Back to ${returnLabel}` : "Back to Review step"}
        style={{ ...btnBase, border: "1px solid #2D4059", background: "transparent", color: "#BDC8D4" }}
      >
        ← {returnLabel}
      </button>

      <div style={{ width: 1, height: 24, background: "#2D4059", flexShrink: 0 }} role="separator" />

      {/* Draft title */}
      <span style={{ ...GF, fontSize: 12, color: "#BDC8D4", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {draftTitle}
      </span>
      <span style={{ ...GF, fontSize: 10, color: SILVER }}>— Place Fields</span>

      <div style={{ flex: 1, minWidth: 12 }} />

      {/* Save state */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <SaveStateLabel state={saveState} />
      </div>

      <div style={{ width: 1, height: 24, background: "#2D4059", flexShrink: 0 }} role="separator" />

      {/* Undo/Redo */}
      <button onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)" style={{ ...btnBase, opacity: canUndo ? 1 : 0.4 }}>↩ Undo</button>
      <button onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" style={{ ...btnBase, opacity: canRedo ? 1 : 0.4 }}>↪ Redo</button>

      <div style={{ width: 1, height: 24, background: "#2D4059", flexShrink: 0 }} role="separator" />

      {/* Clipboard */}
      <button onClick={copySelected} aria-label="Copy selected fields" style={btnBase}>Copy</button>
      <button onClick={paste} disabled={clipboard.length === 0} aria-label="Paste copied fields" style={{ ...btnBase, opacity: clipboard.length > 0 ? 1 : 0.4 }}>Paste</button>

      <div style={{ width: 1, height: 24, background: "#2D4059", flexShrink: 0 }} role="separator" />

      {/* Add field keyboard */}
      <button
        onClick={() => setShowKbDialog(true)}
        aria-label="Add field using keyboard placement"
        style={{ ...btnBase, background: pendingFieldType ? "#EBF4FC" : WHITE, color: AZURE, border: `1px solid ${AZURE}` }}
      >
        + Add Field
      </button>

      {/* Field list toggle */}
      <button
        onClick={toggleFieldList}
        aria-pressed={showFieldList}
        aria-label={showFieldList ? "Show canvas view" : "Show field list"}
        style={{ ...btnBase, background: showFieldList ? "#EBF4FC" : WHITE, color: showFieldList ? AZURE : NAVY }}
      >
        {showFieldList ? "Canvas" : "List"}
      </button>

      <div style={{ width: 1, height: 24, background: "#2D4059", flexShrink: 0 }} role="separator" />

      {/* Zoom */}
      <button onClick={() => setZoom(zoom - 10)} disabled={zoom <= 50} aria-label="Zoom out" style={{ ...btnBase, padding: "0 8px", opacity: zoom > 50 ? 1 : 0.4 }}>−</button>
      <span style={{ ...GF, fontSize: 11, color: "#BDC8D4", minWidth: 40, textAlign: "center" }} aria-live="polite" aria-label={`Zoom ${zoom}%`}>{zoom}%</span>
      <button onClick={() => setZoom(zoom + 10)} disabled={zoom >= 200} aria-label="Zoom in"  style={{ ...btnBase, padding: "0 8px", opacity: zoom < 200 ? 1 : 0.4 }}>+</button>
      <button onClick={() => setZoom(100)} aria-label="Fit page — reset zoom to 100%" style={{ ...btnBase }}>Fit</button>

      <div style={{ width: 1, height: 24, background: "#2D4059", flexShrink: 0 }} role="separator" />

      {/* Validate */}
      <button
        onClick={handleValidate}
        aria-pressed={showValidation}
        aria-label="Validate field placement"
        style={{
          ...btnBase,
          background: showValidation ? "#EBF4FC" : WHITE,
          color: validation?.isValid === false ? "#C0392B" : validation?.isValid ? "#2E7D32" : NAVY,
          borderColor: validation?.isValid === false ? "#F5C6CB" : validation?.isValid ? "#A8D5B5" : "#D1D9E0",
        }}
      >
        ✓ Validate{validation && ` (${validation.errors.length})`}
      </button>

      {/* Continue */}
      <button
        onClick={handleContinue}
        aria-label="Continue to final review"
        style={{
          ...GF,
          height:       34,
          padding:      "0 18px",
          borderRadius: 6,
          border:       "none",
          background:   fields.length > 0 ? AZURE : "#5A7A9A",
          color:        WHITE,
          fontSize:     13,
          fontWeight:   700,
          cursor:       "pointer",
          whiteSpace:   "nowrap",
        }}
      >
        Continue →
      </button>
    </div>
  );
}

// ── Main FieldsPage ────────────────────────────────────────────────────────────
function FieldsPageInner() {
  const navigate = useNavigate();
  const { draft, setStep } = usePrepare();

  // Command 37: the Signing Workflow can send the sender here to assign a
  // participant's own fields. Only an internal /app/... path is ever accepted, and
  // no participant name, email, requirement, or field value is carried in the URL.
  const returnTo = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("returnTo");
    if (!raw) return null;
    if (!raw.startsWith("/app/documents/")) return null;
    if (raw.includes("//") || raw.includes("..") || /[<>"']/.test(raw)) return null;
    return raw.slice(0, 200);
  }, []);
  const returnLabel = returnTo ? "Signing Workflow" : "Review";
  const {
    loadState, errorMessage,
    initialize, discard,
    selectedField, showFieldList, showValidation, toggleValidation,
  } = useFieldEditor();

  const [showKbDialog, setShowKbDialog] = useState(false);

  const participants = draft?.participants ?? [];

  useEffect(() => {
    setStep("fields");
    if (draft) {
      initialize(draft.id, draft);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isInput = document.activeElement instanceof HTMLInputElement ||
                      document.activeElement instanceof HTMLTextAreaElement ||
                      document.activeElement instanceof HTMLSelectElement;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        // undo handled by context
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!draft) {
    return (
      <div style={{ ...GF, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F5F7FA" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>No Preparation Draft</h1>
          <p style={{ fontSize: 13, color: SILVER, margin: "0 0 20px" }}>Start a new preparation workflow to place document fields.</p>
          <a href="/app/prepare" style={{ ...GF, color: AZURE, fontSize: 13, fontWeight: 600 }}>← Go to Prepare</a>
        </div>
      </div>
    );
  }

  if (loadState === "initializing") {
    return (
      <div style={{ ...GF, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F5F7FA" }}>
        <div style={{ textAlign: "center", color: SILVER }}>
          <div style={{ width: 28, height: 28, border: `2px solid ${AZURE}22`, borderTopColor: AZURE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13 }}>Loading editor…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { [style*="spin"] { animation: none; } }`}</style>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div style={{ ...GF, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F5F7FA" }}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#C0392B", margin: "0 0 8px" }}>Editor Error</h1>
          <p style={{ fontSize: 13, color: SILVER, margin: "0 0 20px" }}>{errorMessage ?? "Unable to load the field editor."}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => draft && initialize(draft.id, draft)} style={{ ...GF, padding: "8px 16px", borderRadius: 7, border: "none", background: AZURE, color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Retry
            </button>
            <button onClick={() => navigate("/app/prepare/review")} style={{ ...GF, padding: "8px 16px", borderRadius: 7, border: "1px solid #D1D9E0", background: WHITE, color: NAVY, fontSize: 13, cursor: "pointer" }}>
              Back to Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  const draftTitle = draft.details.title || "Untitled Document";

  return (
    <div
      style={{
        position:  "fixed",
        inset:     0,
        zIndex:    50,
        display:   "flex",
        flexDirection: "column",
        background: "#F0F2F5",
        overflow:  "hidden",
      }}
      aria-label="Field placement editor"
    >
      {/* Heading for screen readers */}
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        Place Document Fields — {draftTitle}
      </h1>

      {/* Toolbar */}
      <EditorToolbar
        draftTitle={draftTitle}
        participants={participants}
        draft={draft}
        showKbDialog={showKbDialog}
        setShowKbDialog={setShowKbDialog}
        onContinue={() => navigate(returnTo ?? "/app/prepare/confirmation")}
        returnTo={returnTo}
        returnLabel={returnLabel}
      />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left panel: document/page nav */}
        <DocumentPanel />

        {/* Center: canvas or field list */}
        <main
          id="editor-main"
          aria-label="Document editing area"
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {showFieldList ? (
            <FieldListView participants={participants} />
          ) : (
            <PageCanvas participants={participants} />
          )}
        </main>

        {/* Right panel */}
        <div style={{
          width:        272,
          background:   WHITE,
          borderLeft:   "1px solid #E3E8EF",
          display:      "flex",
          flexDirection: "column",
          overflow:     "hidden",
          flexShrink:   0,
        }}>
          {showValidation ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 8px", borderBottom: "1px solid #F0F2F5" }}>
                <span style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY }}>Validation</span>
                <button onClick={toggleValidation} aria-label="Close validation panel" style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: SILVER, fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
              <ValidationPanel />
            </>
          ) : selectedField ? (
            <FieldPropertiesPanel field={selectedField} participants={participants} />
          ) : (
            <FieldPalettePanel />
          )}
        </div>
      </div>

      {/* Keyboard placement dialog */}
      {showKbDialog && (
        <KeyboardPlaceDialog
          participants={participants}
          onClose={() => setShowKbDialog(false)}
        />
      )}
    </div>
  );
}

// ── Public export: wraps FieldEditorProvider ───────────────────────────────────
export function FieldsPage() {
  const { draft } = usePrepare();
  const participants = draft?.participants ?? [];

  return (
    <FieldEditorProvider participants={participants.map(p => ({ id: p.id, name: p.name, role: p.role }))}>
      <FieldsPageInner />
    </FieldEditorProvider>
  );
}
