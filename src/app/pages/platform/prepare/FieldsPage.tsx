// Step 7 of 7: Place Fields — interactive field-placement editor.
// Command 19: replaces FieldsHandoff.tsx placeholder.
//
// PRIVACY: No file content is read or stored. No participant PII is persisted.
// No PDF parsing occurs. No documents are uploaded. All fields are in-memory only.
// Burgundy (#67023B) is NEVER used here — eNotary-only color.
// No notarial, seal, OTP, password, or biometric field types exist here.
// Document pages: the REAL uploaded file is rendered with pdf.js when this
// is running against the real backend (see RealDocumentPage). The fictional
// preview below is the DEMO-MODE fallback only — in demo mode there is no
// uploaded file to show.

import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { usePrepare } from "../../../context/PrepareContext";
import { usePlatform } from "../../../context/PlatformContext";
import { FieldEditorProvider, useFieldEditor } from "../../../context/FieldEditorContext";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { ApiError } from "../../../services/api-client";
import { realPreparationService } from "../../../services/real/preparation.service";
import { isBackendFieldType, placeableFieldTypeGroups, toBackendFieldInput, fromBackendField } from "../../../services/prepare/field-sync";
import {
  clampRectOntoPage, pushInsideSafeMargin, nudgeOffOverlap,
  resolveAssignmentFor, computeBackendFieldIssues, preferredAssignee,
} from "../../../services/prepare/field-autofix";
import { isDocumentSynced, markDocumentSynced } from "../../../services/prepare/sync-markers";
import { useFieldEditorShortcuts } from "../../../hooks/useFieldEditorShortcuts";
import { ToolbarOverflow, type ToolbarItem } from "../../../components/prepare/ToolbarOverflow";
import { EditorDrawer, EditorSheet } from "../../../components/prepare/EditorMobileChrome";
import { useViewport } from "../../../components/system/design-system";
import {
  useRealDocument, DocumentPageSurface,
} from "../../../components/pdf/DocumentPageSurface";
import { realSigningRequestService } from "../../../services/real/signing-request.service";
import type {
  FieldId,
  FieldDefinition,
  FieldType,
  ResizeHandle,
  NormalizedRect,
  ParticipantEditorIdentity,
  EditorPageId,
  FieldValidationIssue,
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
import { Z } from "../../../utils/z-index";
import { useProcessing } from "../../../services/processing.service";

// Stacking INSIDE the field-placement canvas. Deliberately not part of the
// global `Z` ladder: these order a field's own furniture against each other
// within the editor surface, so they are relative to the field, not the page.
const CANVAS_Z = {
  /** The small red dot marking a required field. */
  requiredMarker: 10,
  /** Resize handles must sit above the field body they resize. */
  resizeHandle:   200,
  /** The dashed selection outline sits above handles so it is never clipped. */
  selectionOutline: 500,
} as const;

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

/**
 * The zoom at which a page fits the width available to it.
 *
 * "Fit" used to mean `setZoom(100)`, which is not a fit — it is a reset, and
 * on a phone it reset to the very width that did not fit. 595px of page in a
 * 375px viewport is what made the editor unusable there.
 *
 * Clamped to the reducer's own 50-200 range so the button can never request
 * a zoom the state will silently refuse.
 */
function fitWidthZoom(availableWidth: number): number {
  // The canvas pads 16px each side; the page needs to fit what is left.
  const usable = Math.max(0, availableWidth - 32);
  const raw = Math.round((usable / BASE_PAGE_WIDTH) * 100);
  return Math.max(50, Math.min(200, raw));
}
const PAGE_RATIO       = 842 / 595; // height / width ≈ 1.415

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
      data-field-id={field.id}
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
        // `grab`, not `pointer`: this is a thing you pick up and move, and the
        // cursor is the only hint that says so before you try. `grabbing`
        // while it is actually moving — `overrideRect` is set only for the
        // field currently under the pointer, so it is the honest signal.
        cursor:      overrideRect ? "grabbing" : "grab",
        zIndex:      field.layer + (isSelected ? 100 : 0),
        display:     "flex",
        alignItems:  "center",
        justifyContent: "space-between",
        padding:     "0 6%",
        boxSizing:   "border-box",
        overflow:    "hidden",
        userSelect:  "none",
        // Why a finger could not move a field.
        //
        // The drag is built on pointer events, which DO cover touch — but
        // without this the browser claims a one-finger drag as a pan, fires
        // `pointercancel`, and the drag dies mid-gesture. The field simply
        // refused to move, which read as "you cannot grab this".
        //
        // `none` says this element handles its own gestures. The cost is that
        // a swipe STARTING on a field no longer scrolls the canvas — correct,
        // because touching a field is how you say you mean to move it.
        touchAction: "none",
        // The cursor half of the same idea, for a mouse.
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
            // 9px is a mouse target. A fingertip is around 40px, so the hit
            // area is widened with a transparent inset border rather than by
            // growing the visible dot, which would swamp a small field.
            width:     9,
            height:    9,
            background: AZURE,
            border:    "1px solid #fff",
            borderRadius: 2,
            cursor:    HANDLE_CURSORS[handle],
            // Same reason as the field itself: without it a touch-resize is
            // claimed by the browser as a pan and cancelled.
            touchAction: "none",
            zIndex:    CANVAS_Z.resizeHandle,
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
            zIndex: CANVAS_Z.requiredMarker,
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
  /**
   * The workspace and real document behind the current editor document, when
   * there is one. Absent in demo mode, where no file was ever uploaded.
   */
  workspaceId: string | null;
  realDocumentIdByEditorDocId: Map<string, string>;
  /** The scroll container, so the page can measure it to fit and to pinch. */
  scrollRef: React.RefObject<HTMLDivElement>;
}

function PageCanvas({
  participants, workspaceId, realDocumentIdByEditorDocId, scrollRef,
}: PageCanvasProps) {
  const {
    currentDocumentId, currentPageId, currentPageFields, documents,
    selectedFieldIds, mode, pendingFieldType, zoom, setZoom,
    addField, moveField, selectFields, clearSelection,
    participantIdentities, syncRealPages,
  } = useFieldEditor();

  const canvasRef  = useRef<HTMLDivElement>(null);

  // ── Pinch to zoom ───────────────────────────────────────────────────────
  //
  // The gesture anyone reaches for on a document, and the reason the toolbar
  // buttons are not enough on their own: placing a field means looking
  // closely at one spot, and stepping there 10% at a time through a button is
  // not the same interaction.
  //
  // Only two-finger gestures are touched. A single finger still pans and
  // still drags a field, so this adds a gesture rather than replacing any.
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  const touchDistance = (touches: React.TouchList): number => {
    const a = touches[0];
    const b = touches[1];
    if (a === undefined || b === undefined) return 0;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onPinchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return;
    pinchStart.current = { distance: touchDistance(e.touches), zoom };
  };

  const onPinchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = pinchStart.current;
    if (start === null || e.touches.length !== 2) return;
    const distance = touchDistance(e.touches);
    if (distance === 0 || start.distance === 0) return;
    // Proportional to how far the fingers have moved apart, which is what
    // makes it feel attached to the gesture rather than stepped.
    const next = Math.round(start.zoom * (distance / start.distance));
    const clamped = Math.max(50, Math.min(200, next));
    if (clamped !== zoom) setZoom(clamped);
  };

  const onPinchEnd = () => { pinchStart.current = null; };
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

  // ── The real document ─────────────────────────────────────────────────────
  //
  // Loaded per editor document. `useRealDocument` returns `idle` when either
  // id is absent, which is demo mode and the pre-upload state.
  const realDocumentId = currentDocumentId === null
    ? null
    : realDocumentIdByEditorDocId.get(currentDocumentId) ?? null;

  // Memoised on the two ids: `useRealDocument` re-runs when the loader's
  // identity changes, so an inline closure would refetch the document on
  // every render.
  const loadDocument = useMemo(
    () => (workspaceId === null || realDocumentId === null
      ? null
      : () => realSigningRequestService.documentContentBlob(workspaceId, realDocumentId)),
    [workspaceId, realDocumentId],
  );
  const realDocument = useRealDocument(loadDocument);

  // The page list the editor was initialised with is a placeholder: the count
  // comes from `derivePageCount` and every page is assumed A4. Correct it as
  // soon as the real file has been read.
  useEffect(() => {
    if (realDocument.status !== "ready" || currentDocumentId === null) return;
    syncRealPages(
      currentDocumentId,
      realDocument.pageCount,
      // WIDTH / HEIGHT, matching `EditorPage.aspectRatio` (A4 = 595/842).
      realDocument.pageSizes.map(size => size.width / size.height),
    );
  }, [realDocument, currentDocumentId, syncRealPages]);

  const pageWidth  = (BASE_PAGE_WIDTH * zoom) / 100;
  // The page's OWN shape, not a fixed A4 assumption. Fields are normalised
  // against this box, so a wrong ratio puts every field at the wrong height —
  // silently, since nothing errors.
  //
  // DIVIDED, because `EditorPage.aspectRatio` is WIDTH/HEIGHT (A4 = 595/842 =
  // 0.707) while `PAGE_RATIO` is its reciprocal. Multiplying by one where the
  // other is meant renders every page inside-out.
  const pageHeight = currentPage === undefined
    ? pageWidth * PAGE_RATIO
    : pageWidth / currentPage.aspectRatio;

  const getIdentity = useCallback((participantId: string | null): ParticipantEditorIdentity | null =>
    participantId
      ? (participantIdentities.find(i => i.participantId === participantId) ?? null)
      : null,
    [participantIdentities],
  );

  // Convert client coords to normalized page coords
  // Canvas click: place new field or clear selection
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === "place-field" && pendingFieldType && currentDocumentId && currentPageId) {
      const b  = canvasRef.current?.getBoundingClientRect();
      if (!b) return;
      const nx = (e.clientX - b.left) / b.width;
      const ny = (e.clientY - b.top)  / b.height;

      // Auto-assign when there is one obvious participant (see preferredAssignee).
      const autoAssign = preferredAssignee(pendingFieldType, participants);

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
      const newRect = applyResizeDelta(d.origRect, d.handle, dx, dy, field.type);
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
      ref={scrollRef}
      onTouchStart={onPinchStart}
      onTouchMove={onPinchMove}
      onTouchEnd={onPinchEnd}
      style={{
        flex: 1,
        overflow: "auto",
        background: BGCANVAS,
        display: "flex",
        alignItems: "flex-start",
        // NOT `justifyContent: center`, and this cost the left edge of every
        // page on a phone.
        //
        // A centred flex child that is WIDER than its scroll container gets
        // pushed to a negative offset, and a scroll container cannot scroll
        // past its own origin — so the overflowing left side is not merely
        // off-screen, it is unreachable. The document read "OYMENT AGREEMENT"
        // and no amount of swiping recovered the rest.
        //
        // `margin: auto` on the child centres it while it fits and collapses
        // to zero once it does not, which keeps the whole page reachable.
        justifyContent: "flex-start",
        padding: "24px 16px",
      }}
    >
      {/* Page container */}
      <div style={{ position: "relative", margin: "auto" }}>
        {/* Shown only when the page really IS a placeholder.
            *
            * This notice used to render unconditionally, including while
            * `DocumentPageSurface` was displaying the signer's actual PDF
            * directly beneath it. Someone placing a signature on a real
            * signature line was being told their file was not parsed or
            * rendered — false, and alarming in the one place where being sure
            * the document is real matters most. */}
        {realDocumentId === null && (
          <div style={{
            ...GF,
            fontSize: 10,
            color: SILVER,
            textAlign: "center",
            marginBottom: 6,
            lineHeight: 1.4,
          }}>
            No file was uploaded for this document, so the page below is a
            placeholder. Field positions are still saved.
          </div>
        )}

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
          {/* The page itself. The real file when there is one — a signature
              is placed on a signature LINE, and a placeholder has none. */}
          {realDocument.status === "ready"
            ? (
              <DocumentPageSurface
                doc={realDocument.doc}
                pageNumber={currentPage.pageNumber}
                width={pageWidth}
                height={pageHeight}
              />
            )
            : realDocumentId === null
              ? <FictionPagePreview pageNumber={currentPage.pageNumber} />
              : (
                <div
                  aria-live="polite"
                  style={{
                    position: "absolute", inset: 0, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    padding: 24, textAlign: "center", pointerEvents: "none",
                    fontSize: 13, color: "#8A9BAE",
                  }}
                >
                  {realDocument.status === "error"
                    ? realDocument.message
                    : "Loading your document…"}
                </div>
              )}

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
              zIndex: CANVAS_Z.selectionOutline,
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
// On the live system, only the types the server can store are offered. A type
// it can't store (multiline-text, radio-group, acknowledgment) could be placed
// but never sent, and no fix could resolve it — so it isn't offered at all.
const PLACEABLE_TYPE_GROUPS = placeableFieldTypeGroups(FIELD_TYPE_GROUPS, USE_REAL_BACKEND);

function FieldPalettePanel() {
  const { mode, pendingFieldType, setPendingField } = useFieldEditor();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", flex: 1 }}>
      <div style={{ ...GF, fontSize: 12, fontWeight: 700, color: SILVER, padding: "10px 14px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Field Types
      </div>
      {PLACEABLE_TYPE_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 12 }}>
          <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: SILVER, padding: "4px 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {group.label}
          </div>
          {group.types.map(type => {
            const tier      = FIELD_PLAN_TIER[type];
            const isActive  = mode === "place-field" && pendingFieldType === type;
            const limited   = tier === "enterprise" || tier === "planned";
            // TRUTHFUL PERSISTENCE (P1.5 §3): a field type the backend
            // can't represent (multiline-text, radio-group, acknowledgment,
            // sender-text) is still placeable — it's real, useful work for
            // whoever is drafting — but must never look like it will be
            // saved server-side when it can't be. Badge, not disable: the
            // field editor's existing UX is preserved, the claim is just
            // made honest.
            const notPersisted = USE_REAL_BACKEND && !isBackendFieldType(type);
            return (
              <button
                key={type}
                onClick={() => setPendingField(isActive ? null : type)}
                aria-pressed={isActive}
                disabled={limited}
                title={notPersisted
                  ? `${FIELD_TYPE_DESCRIPTIONS[type]} — not saved to the server yet; local to this session only.`
                  : FIELD_TYPE_DESCRIPTIONS[type]}
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
                    {notPersisted          && <span style={{ fontSize: 9, marginLeft: 5, color: "#B8720A", fontWeight: 700 }}>NOT SAVED</span>}
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

/**
 * Nudge a field a precise amount, for fingers.
 *
 * At a fit-to-width zoom of about 55%, one screen pixel is nearly two
 * document pixels, and a fingertip covers roughly forty of them. Dragging is
 * fine for getting a field roughly where it belongs and hopeless for landing
 * it ON a signature line — which is the only placement that matters.
 *
 * The step is expressed in NORMALIZED units because that is what the rect
 * stores, so a nudge means the same distance at every zoom rather than
 * getting coarser as you zoom out to see more of the page.
 */
function NudgePad({ field }: { field: FieldDefinition }) {
  const { moveField } = useFieldEditor();
  // 0.002 of the page: sub-millimetre on A4, and small enough that holding a
  // direction walks the field rather than throwing it.
  const STEP = 0.002;

  const nudge = (dx: number, dy: number) => {
    moveField(field.id, {
      ...field.rect,
      // Clamped so a field cannot be walked off the page and lost.
      x: Math.max(0, Math.min(1 - field.rect.width, field.rect.x + dx)),
      y: Math.max(0, Math.min(1 - field.rect.height, field.rect.y + dy)),
    });
  };

  const key = {
    ...GF, width: 40, height: 36, borderRadius: 8,
    border: "1px solid #D1D9E0", background: "#FFFFFF",
    color: NAVY, fontSize: 15, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  } as const;

  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid #F0F2F5" }}>
      <div style={{ ...GF, fontSize: 10, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        Nudge
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 40px)", gap: 6, justifyContent: "center" }}>
        <span />
        <button type="button" style={key} aria-label="Nudge field up" onClick={() => { nudge(0, -STEP); }}>↑</button>
        <span />
        <button type="button" style={key} aria-label="Nudge field left" onClick={() => { nudge(-STEP, 0); }}>←</button>
        <span />
        <button type="button" style={key} aria-label="Nudge field right" onClick={() => { nudge(STEP, 0); }}>→</button>
        <span />
        <button type="button" style={key} aria-label="Nudge field down" onClick={() => { nudge(0, STEP); }}>↓</button>
        <span />
      </div>
    </div>
  );
}

function FieldPropertiesPanel({ field, participants }: FieldPropertiesProps) {
  const { updateField, deleteFields, duplicateField, reorderLayer, participantIdentities } = useFieldEditor();
  const { isCompact } = useViewport();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const eligible = participants.filter(p => FIELD_ELIGIBLE_ROLES[field.type].includes(p.role));
  const isSender = field.type === "sender-text";
  // An approver approves or skips; their fields are never required, and one
  // left empty is drawn on the final document as APPROVED / SKIPPED (069).
  const assigneeRole = participants.find(p => p.id === field.participantId)?.role;
  const forApprover = assigneeRole === "approver";
  const roleNote = assigneeRole === "reviewer"
    ? "Completed by a reviewer, who finishes by choosing Mark as reviewed."
    : assigneeRole === "acknowledgment-recipient"
      ? "Completed by an acknowledgment recipient, who finishes by choosing Acknowledge. A checkbox is the usual way to confirm receipt."
      : null;

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

      {/* Touch only. A mouse already has pixel precision, and the arrow keys
          already nudge — this is the same capability for a finger. */}
      {isCompact && <NudgePad field={field} />}

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

        {/* Approver fields: optional, with the outcome label */}
        {forApprover && (
          <div role="note" style={{ ...GF, marginBottom: 12, padding: "8px 10px", fontSize: 12, lineHeight: 1.45, color: NAVY, background: "#EAF6FF", border: "1px solid #B8DDF7", borderRadius: 7 }}>
            Optional for approvers. The approver chooses <strong>Approve</strong> or <strong>Skip</strong>;
            if this field is left empty, the signed document shows <strong>APPROVED</strong> or <strong>SKIPPED</strong> with the date here.
          </div>
        )}

        {roleNote !== null && (
          <div role="note" style={{ ...GF, marginBottom: 12, padding: "8px 10px", fontSize: 12, lineHeight: 1.45, color: NAVY, background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 7 }}>
            {roleNote}
          </div>
        )}

        {/* Required toggle */}
        {!isSender && !forApprover && (
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

// "Fix it for me" below only appears for issue codes with an unambiguous,
// safe fix (UNASSIGNED_FIELD, FIELD_OVERLAP) — sparing the visitor a manual
// property-panel trip for the common case. Anything with more than one
// reasonable fix (which participant? which field moves?) stays manual
// rather than guessing.
// Exported for its own behaviour test (the fix-button handlers here are the
// bulk of the Validation panel's logic).
export function ValidationPanel({
  onSaveNow,
  saving,
}: {
  /** Runs the exact same save Continue uses — see saveFieldsToBackend in
   *  FieldsPageInner. Lets "unsaved edits" be resolved right here instead
   *  of requiring a full Continue click, which is easy to bypass (e.g. by
   *  navigating away via the sidebar) and previously left Review showing a
   *  "not ready" blocker that nothing on THIS page explained how to fix. */
  onSaveNow: () => Promise<boolean>;
  saving: boolean;
}) {
  const { validation, runValidation, setDocument, setPage, fields, selectFields, updateField, moveField, deleteFields, setParticipantFilter, addField, currentDocumentId, currentPageId } = useFieldEditor();
  const { draft } = usePrepare();
  const navigate = useNavigate();
  const participants = draft?.participants ?? [];

  // Keep the panel live. Every field mutation (COMMIT_FIELDS, undo/redo,
  // paste, a server reload after Save) deliberately resets `validation` to
  // null so a stale result is never shown — but while THIS panel is open,
  // null just meant a blank "Run validation to see results." right after
  // clicking a fix button, so it looked like the fix did nothing until the
  // visitor pressed Validate again (reported live, and why the Review deep
  // link landed on an empty panel). This panel only mounts while visible.
  useEffect(() => {
    if (validation === null && draft) runValidation(draft);
  }, [validation, draft, runValidation]);

  // Real-backend-only checks that this page's own "Validate" previously
  // never ran — FieldPlacementValidation (above) only checks placement
  // correctness (assignment, overlap, coverage), not backend persistability.
  // computeSendReadiness (used by Review's banner) DOES check these, which
  // is exactly why "Ready to continue" here could still be followed by
  // "not ready to send" on Review with no visible reason on this page. These
  // are now surfaced here too, so both pages agree.
  const backendIssues = useMemo(
    () => (USE_REAL_BACKEND ? computeBackendFieldIssues(fields) : []),
    [fields],
  );

  const goToField = (fieldId?: FieldId, documentId?: string, pageId?: EditorPageId) => {
    const field = fieldId ? fields.find(f => f.id === fieldId) : null;
    const docId  = documentId ?? field?.documentId;
    const pgId   = pageId     ?? field?.pageId;
    if (docId) setDocument(docId);
    if (pgId)  setPage(pgId);
    if (fieldId) selectFields([fieldId]);
  };

  // The auto-fix decision logic lives in ../services/prepare/field-autofix
  // (pure + unit-tested); these thin handlers just apply the result via the
  // field editor and reveal the field.
  const autoFixUnassigned = (fieldId: FieldId) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    // Ambiguous (2+ eligible) → don't guess; just reveal the field so the
    // visitor picks in Field Properties.
    const assignee = preferredAssignee(field.type, participants);
    if (assignee === null) { goToField(fieldId); return; }
    updateField(fieldId, { participantId: assignee });
    selectFields([fieldId]);
  };

  const autoFixOverlap = (fieldId: FieldId) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    moveField(fieldId, nudgeOffOverlap(field.rect));
    goToField(fieldId);
  };

  const autoFixOutOfBounds = (fieldId: FieldId) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    moveField(fieldId, clampRectOntoPage(field.rect));
    goToField(fieldId);
  };

  const autoFixNearEdge = (fieldId: FieldId) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    moveField(fieldId, pushInsideSafeMargin(field.rect));
    goToField(fieldId);
  };

  // Assigned to a removed participant or a role-incompatible one: reassign to
  // a single eligible participant if there is one, else clear it.
  const autoFixBadAssignment = (fieldId: FieldId) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { participantId: resolveAssignmentFor(field.type, participants) });
    selectFields([fieldId]);
  };

  // A required field on a Viewer/Copy Recipient — those roles never take
  // action, so a required field on them can never actually be completed.
  // Making it optional is the direct, literal fix the suggestion describes.
  const autoFixBlockingOnNonBlocking = (fieldId: FieldId) => {
    updateField(fieldId, { required: false });
    selectFields([fieldId]);
  };

  /**
   * A participant with no Signature (or no acknowledgement) field.
   *
   * This was the one error deliberately left without a fix, on the grounds
   * that nothing can know WHERE the field belongs. That reasoning produced a
   * worse outcome than guessing: the only action offered was "Show their
   * fields", which for a participant with no fields reveals an empty list and
   * moves nothing forward.
   *
   * Placing it dead-centre on the CURRENT page is an honest answer to that —
   * the position is deliberate, visible and obviously provisional, and the
   * visitor drags it where it really goes. The field is created assigned and
   * selected, so the next thing they do is position it, not hunt for it.
   */
  const autoFixMissingParticipantField = (issue: FieldValidationIssue) => {
    const participantId = issue.participantId;
    if (!participantId || !currentDocumentId || !currentPageId) return;
    const type: FieldType = issue.code === "SIGNER_MISSING_SIGNATURE"
      ? "signature"
      : "checkbox";
    const created = addField({
      type,
      documentId:    currentDocumentId,
      pageId:        currentPageId,
      rect:          defaultFieldRect(type, 0.5, 0.5),
      participantId,
      label:         FIELD_TYPE_LABELS[type],
      required:      true,
      demonstrationOnly: true,
    });
    goToField(created.id, currentDocumentId, currentPageId);
  };

  // Every issue's action row — one place for both Errors and Warnings, so
  // adding a fix for a new code never means updating two near-identical JSX
  // blocks. Every issue that can be fixed offers a fix; the rest still get a
  // real next step instead of nothing.
  const renderIssueActions = (issue: FieldValidationIssue) => {
    const fixButtonStyle = { ...GF, fontSize: 11, fontWeight: 700, color: "#2E7D32", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" } as const;
    const linkButtonStyle = { ...GF, fontSize: 11, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" } as const;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 5 }}>
        {(issue.fieldId || issue.documentId) && (
          <button onClick={() => goToField(issue.fieldId, issue.documentId, issue.pageId)} style={linkButtonStyle}>
            Go to {issue.fieldId ? "field" : "document"}
          </button>
        )}
        {issue.code === "NO_DOCUMENTS" && (
          <button onClick={() => void navigate("/app/prepare/upload")} style={linkButtonStyle}>
            Go to Documents step
          </button>
        )}
        {(issue.code === "SIGNER_MISSING_SIGNATURE" || issue.code === "ACK_RECIPIENT_MISSING_ACK_FIELD") && issue.participantId && (
          <>
            <button onClick={() => autoFixMissingParticipantField(issue)} style={fixButtonStyle}>
              Auto-Fix
            </button>
            {/* Only where it has something to reveal. For a participant with
                no fields at all this was the ONLY action offered, and it
                opened an empty list. */}
            {fields.some(f => f.participantId === issue.participantId) && (
              <button onClick={() => setParticipantFilter(issue.participantId!)} style={linkButtonStyle}>
                Show their fields
              </button>
            )}
          </>
        )}
        {issue.code === "UNASSIGNED_FIELD" && issue.fieldId && (
          <button onClick={() => autoFixUnassigned(issue.fieldId!)} style={fixButtonStyle}>Fix it for me</button>
        )}
        {issue.code === "FIELD_OUT_OF_BOUNDS" && issue.fieldId && (
          <button onClick={() => autoFixOutOfBounds(issue.fieldId!)} style={fixButtonStyle}>Fix it for me</button>
        )}
        {issue.code === "NEAR_PAGE_EDGE" && issue.fieldId && (
          <button onClick={() => autoFixNearEdge(issue.fieldId!)} style={fixButtonStyle}>Fix it for me</button>
        )}
        {issue.code === "FIELD_OVERLAP" && issue.fieldId && (
          <button onClick={() => autoFixOverlap(issue.fieldId!)} style={fixButtonStyle}>Fix it for me</button>
        )}
        {(issue.code === "UNKNOWN_PARTICIPANT" || issue.code === "INCOMPATIBLE_ROLE") && issue.fieldId && (
          <button onClick={() => autoFixBadAssignment(issue.fieldId!)} style={fixButtonStyle}>Fix it for me</button>
        )}
        {issue.code === "BLOCKING_FIELD_ON_NON_BLOCKING_ROLE" && issue.fieldId && (
          <button onClick={() => autoFixBlockingOnNonBlocking(issue.fieldId!)} style={fixButtonStyle}>Fix it for me</button>
        )}
        {issue.code === "UNSUPPORTED_BACKEND_TYPE" && issue.fieldId && (
          <button onClick={() => deleteFields([issue.fieldId!])} style={fixButtonStyle}>Remove this field</button>
        )}
        {issue.code === "UNSAVED_EDITS" && (
          <button onClick={() => void onSaveNow()} disabled={saving} style={{ ...fixButtonStyle, color: saving ? SILVER : "#2E7D32", cursor: saving ? "default" : "pointer" }}>
            {saving ? "Saving…" : "Save now"}
          </button>
        )}
      </div>
    );
  };

  if (!validation) {
    return (
      <div style={{ ...GF, padding: 16, color: SILVER, fontSize: 12 }}>
        Run validation to see results.
      </div>
    );
  }

  // Merged for display only — FieldEditorContext's own `validation` object
  // (placement correctness) is never mutated; backendIssues is layered on
  // top so this panel's "ready" state matches what Review's send-readiness
  // banner will actually say, instead of the two silently disagreeing.
  const allErrors = [...validation.errors, ...backendIssues];
  const combinedIsValid = validation.isValid && backendIssues.length === 0;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
      {/* Summary */}
      <div style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: combinedIsValid ? "#F0FAF4" : "#FFF5F5",
        border: `1px solid ${combinedIsValid ? "#A8D5B5" : "#F5C6CB"}`,
        marginBottom: 12,
      }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: combinedIsValid ? "#2E7D32" : "#C0392B" }}>
          {combinedIsValid ? "Ready to continue" : `${allErrors.length} error${allErrors.length !== 1 ? "s" : ""} to resolve`}
        </div>
        <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 3 }}>
          {validation.totalFieldCount} field{validation.totalFieldCount !== 1 ? "s" : ""} · {validation.warnings.length} warning{validation.warnings.length !== 1 ? "s" : ""}
        </div>
        {USE_REAL_BACKEND && (
          <div style={{ ...GF, fontSize: 10.5, color: SILVER, marginTop: 6, lineHeight: 1.5 }}>
            Includes server-save checks, so this matches what Review will say.
          </div>
        )}
      </div>

      {/* Errors */}
      {allErrors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...GF, fontSize: 11, fontWeight: 700, color: "#C0392B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Errors ({allErrors.length})
          </div>
          {allErrors.map(issue => (
            <div key={issue.id} style={{ ...GF, padding: "8px 10px", borderRadius: 6, background: "#FFF5F5", border: "1px solid #F5C6CB", marginBottom: 5, fontSize: 12, color: "#C0392B" }}>
              <div style={{ fontWeight: 600 }}>✕ {issue.message}</div>
              {issue.suggestion && <div style={{ fontSize: 11, color: "#9B2335", marginTop: 3 }}>{issue.suggestion}</div>}
              {renderIssueActions(issue)}
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
              {renderIssueActions(issue)}
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
        position: "fixed", inset: 0, zIndex: Z.modal,
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
              {PLACEABLE_TYPE_GROUPS.flatMap(g => g.types).map(t => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
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
  /** Compact only: opens the document/page rail, which is a drawer there. */
  onOpenDocuments?: () => void;
  /** Validated internal path to return to (Command 37 workflow round-trip). */
  returnTo:      string | null;
  returnLabel:   string;
  /** Sets zoom so a page fits the canvas width. Measured, not assumed. */
  onFitWidth:    () => void;
  /** Reopens the properties/palette sheet. Compact only — see onOpenPanel. */
  onOpenPanel:   () => void;
  /** Whether a field is selected, so the menu can name what it will show. */
  hasSelection:  boolean;
}

function EditorToolbar({ draftTitle, participants: _participants, draft, showKbDialog: _showKbDialog, setShowKbDialog, onContinue, returnTo, returnLabel, onOpenDocuments, onFitWidth, onOpenPanel, hasSelection }: ToolbarProps) {
  const { isCompact, isMobileS } = useViewport();
  const {
    undo, redo, canUndo, canRedo,
    zoom, setZoom,
    showFieldList, toggleFieldList,
    showValidation, toggleValidation,
    saveState,
    validation, runValidation,
    pendingFieldType,
    copySelected, paste, clipboard,
    fields,
  } = useFieldEditor();

  const navigate = useNavigate();

  const handleValidate = () => {
    runValidation(draft);
    if (!showValidation) toggleValidation();
  };

  // The validation gate now lives on the PAGE, because the floating Continue
  // on a phone needs the identical check. Two copies of "may this document
  // proceed" would drift, and the copy that drifted would be the one letting
  // an invalid document through.
  const handleContinue = onContinue;

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

  // ── What stays visible when the screen is narrow ──────────────────────────
  //
  // Fourteen buttons, six separators and two labels in one non-wrapping row
  // has an intrinsic width over 900px. The container once set `overflowX:
  // auto`, but every child is shrinkable by default and the `flex: 1` spacer
  // collapses first, so the children squeezed instead of the row scrolling —
  // and at 320px Copy, Paste, "+ Add Field" and List sat past the right edge
  // of a clipping ancestor: unreachable, not merely off-screen.
  //
  // That `overflowX` is gone now, and its removal is itself a fix: see the
  // toolbar's own style below for what it was doing to the overflow menu.
  //
  // So on a narrow screen the row carries only what the task needs — go back,
  // place a field, see whether it is valid, continue — and the rest moves
  // into one menu. The secondary controls are declared ONCE below and
  // rendered either inline or inside that menu, so the two cannot drift.
  const secondary: ToolbarItem[] = [
    { id: "undo", label: "Undo", glyph: "↩", title: "Undo (Ctrl+Z)", onClick: undo, disabled: !canUndo },
    { id: "redo", label: "Redo", glyph: "↪", title: "Redo (Ctrl+Y or Ctrl+Shift+Z)", onClick: redo, disabled: !canRedo },
    { id: "copy", label: "Copy", title: "Copy (Ctrl+C)", onClick: copySelected, disabled: false },
    { id: "paste", label: "Paste", title: "Paste (Ctrl+V)", onClick: paste, disabled: clipboard.length === 0 },
    { id: "view", label: showFieldList ? "Canvas view" : "Field list", title: "Switch view", onClick: toggleFieldList, disabled: false },
    { id: "zoom-out", label: "Zoom out", title: "Zoom out", onClick: () => { setZoom(zoom - 10); }, disabled: zoom <= 50 },
    { id: "zoom-in", label: "Zoom in", title: "Zoom in", onClick: () => { setZoom(zoom + 10); }, disabled: zoom >= 200 },
    { id: "fit", label: "Fit width", title: "Fit the page to the width of the screen", onClick: onFitWidth, disabled: false },
    // The way back to the sheet.
    //
    // On a phone the panel IS the sheet, and closing it necessarily clears
    // the selection that summoned it — so once dismissed, the only way back
    // was to find and tap the field again, and for the field palette there
    // was no way back at all. This is that route, and it names what it will
    // show rather than saying "Panel" and leaving you to find out.
    ...(isCompact
      ? [{
          id: "panel",
          label: hasSelection ? "Field properties" : "Field types",
          title: hasSelection
            ? "Show properties for the selected field"
            : "Show the field types you can place",
          onClick: onOpenPanel,
          disabled: false,
        }]
      : []),
  ];

  const separator = (key: string) => (
    <div key={key} style={{ width: 1, height: 24, background: "#E2E8F0", flexShrink: 0 }} role="separator" />
  );

  return (
    <div
      role="toolbar"
      aria-label="Field editor toolbar"
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         6,
        padding:     isCompact ? "6px 8px" : "6px 12px",
        background:  WHITE,
        borderBottom: "1px solid #E2E8F0",
        flexShrink:  0,
        // NOT `overflowX: auto`, and this is why the "…" button did nothing.
        //
        // `overflow-x: auto` makes the element a scroll container, and a
        // scroll container clips on BOTH axes — `overflow-y` can no longer be
        // visible. The overflow menu is positioned below the toolbar with
        // `top: calc(100% + 6px)`, which is outside that box, so it opened
        // correctly and was clipped to nothing. Every tap toggled state that
        // could never be seen.
        //
        // It was a backstop from when this row scrolled, left in place after
        // the menu removed the need for it — where it then broke the very
        // control that replaced it. The row no longer overflows: everything
        // that is not the task itself lives in the menu.
        minHeight:   50,
        // Guards the wrap instead. If a future control does not fit, the row
        // grows rather than hiding it behind a gesture with no affordance.
        flexWrap:    "wrap",
      }}
    >
      {/* Back — returns to the caller when a validated internal returnTo was supplied */}
      <button
        onClick={() => navigate(returnTo ?? "/app/prepare/review")}
        aria-label={returnTo ? `Back to ${returnLabel}` : "Back to Review step"}
        style={{ ...btnBase, flexShrink: 0, border: "1px solid #D1D9E0", background: "transparent", color: "#334155" }}
      >
        {isCompact ? "←" : `← ${returnLabel}`}
      </button>

      {isCompact && onOpenDocuments && (
        <button
          onClick={onOpenDocuments}
          aria-label="Show documents and pages"
          title="Documents and pages"
          style={{ ...btnBase, flexShrink: 0, padding: isMobileS ? "0 8px" : "0 10px" }}
        >
          {isMobileS ? "☰" : "Pages"}
        </button>
      )}

      {!isCompact && separator("s1")}

      {/* The document's name and where you are. Dropped when narrow: the
          breadcrumb above already names it, and this is the row that has to
          fit. */}
      {!isCompact && (
        <>
          <span style={{ ...GF, fontSize: 12, color: "#334155", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {draftTitle}
          </span>
          <span style={{ ...GF, fontSize: 10, color: SILVER }}>— Place Fields</span>
        </>
      )}

      <div style={{ flex: 1, minWidth: 8 }} />

      {!isCompact && (
        <>
          <div style={{ display: "flex", alignItems: "center" }}>
            <SaveStateLabel state={saveState} />
          </div>
          {separator("s2")}
        </>
      )}

      {isCompact
        ? <ToolbarOverflow items={secondary} zoom={zoom} />
        : (
          <>
            {secondary.slice(0, 2).map(item => (
              <button
                key={item.id} onClick={item.onClick} disabled={item.disabled}
                aria-label={item.label} title={item.title}
                style={{ ...btnBase, flexShrink: 0, opacity: item.disabled ? 0.4 : 1 }}
              >
                {item.glyph} {item.label}
              </button>
            ))}
            {separator("s3")}
            {secondary.slice(2, 4).map(item => (
              <button
                key={item.id} onClick={item.onClick} disabled={item.disabled}
                aria-label={item.id === "copy" ? "Copy selected fields" : "Paste copied fields"}
                title={item.title}
                style={{ ...btnBase, flexShrink: 0, opacity: item.disabled ? 0.4 : 1 }}
              >
                {item.label}
              </button>
            ))}
            {separator("s4")}
          </>
        )}

      {/* The primary task. Visible at every width. */}
      <button
        onClick={() => setShowKbDialog(true)}
        aria-label="Add field using keyboard placement"
        style={{ ...btnBase, flexShrink: 0, background: pendingFieldType ? "#EBF4FC" : WHITE, color: AZURE, border: `1px solid ${AZURE}` }}
      >
        {isCompact ? "+ Add" : "+ Add Field"}
      </button>

      {!isCompact && (
        <>
          <button
            onClick={toggleFieldList}
            aria-pressed={showFieldList}
            aria-label={showFieldList ? "Show canvas view" : "Show field list"}
            style={{ ...btnBase, flexShrink: 0, background: showFieldList ? "#EBF4FC" : WHITE, color: showFieldList ? AZURE : NAVY }}
          >
            {showFieldList ? "Canvas" : "List"}
          </button>
          {separator("s5")}
        </>
      )}

      {/* Zoom, on every viewport.
          *
          * This block used to be inside the `!isCompact` guard above, so the
          * one viewport that cannot read a 595px page at 100% was the only
          * one with no way to change it. */}
      <button onClick={() => { setZoom(zoom - 10); }} disabled={zoom <= 50} aria-label="Zoom out" style={{ ...btnBase, flexShrink: 0, padding: "0 10px", opacity: zoom > 50 ? 1 : 0.4 }}>−</button>
      {!isMobileS && (
        <span style={{ ...GF, fontSize: 11, color: "#334155", minWidth: 40, textAlign: "center", flexShrink: 0 }} aria-live="polite" aria-label={`Zoom ${zoom}%`}>{zoom}%</span>
      )}
      <button onClick={() => { setZoom(zoom + 10); }} disabled={zoom >= 200} aria-label="Zoom in" style={{ ...btnBase, flexShrink: 0, padding: "0 10px", opacity: zoom < 200 ? 1 : 0.4 }}>+</button>
      <button
        onClick={onFitWidth}
        aria-label="Fit the page to the width of the screen"
        style={{ ...btnBase, flexShrink: 0 }}
      >
        Fit
      </button>
      {separator("s6")}

      <button
        onClick={handleValidate}
        aria-pressed={showValidation}
        aria-label="Validate field placement"
        style={{
          ...btnBase,
          flexShrink: 0,
          background: showValidation ? "#EBF4FC" : WHITE,
          color: validation?.isValid === false ? "#C0392B" : validation?.isValid ? "#2E7D32" : NAVY,
          borderColor: validation?.isValid === false ? "#F5C6CB" : validation?.isValid ? "#A8D5B5" : "#D1D9E0",
        }}
      >
        {isCompact ? "✓" : "✓ Validate"}{validation && ` (${validation.errors.length})`}
      </button>

      {/* Desktop only. On a phone this is a floating control at the bottom
          right of the canvas — see the editor main — because the toolbar is
          at the top of the screen and Continue is a thumb action. */}
      {!isCompact && (
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
          flexShrink:   0,
        }}
      >
        Continue &rarr;
      </button>
      )}
    </div>
  );
}

// ── Main FieldsPage ────────────────────────────────────────────────────────────
function FieldsPageInner() {
  const navigate = useNavigate();
  const { draft, setStep, setFieldsSnapshot } = usePrepare();

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
  const { isCompact } = useViewport();
  // The document rail is a drawer on a phone, so it needs an open state that
  // the desktop column never had.
  const [showDocuments, setShowDocuments] = useState(false);
  // The sheet used to be purely derived: it existed because something was
  // selected. That made it impossible to reopen — dismissing it cleared the
  // selection, and with nothing selected there was no state left to imply it.
  //
  // `panelOpen` is the explicit half: the overflow menu can ask for the sheet
  // without a selection to justify it.
  //
  // Declared here with the other state, above every early return. Hooks after
  // `if (!draft) return` run on some renders and not others, which changes
  // hook ORDER — the second time that trap caught me in this file.
  const [panelOpen, setPanelOpen] = useState(false);
  // The scroll container the page sits in. Fit measures it rather than
  // assuming a width, so it is correct with the rail open, closed, on a
  // phone, and on a monitor.
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const {
    loadState, errorMessage,
    initialize, loadRealFields,
    documents, fields,
    selectedField, showFieldList, showValidation, toggleValidation, runValidation,
    setDocument, setPage, selectFields, addField,
    // Keyboard shortcuts. Every one of these already existed — see
    // useFieldEditorShortcuts for what was and was not wired up before.
    selectedFieldIds, currentPageFields, clipboard, mode,
    copySelected, paste, undo, redo, duplicateField, deleteFields,
    clearSelection, setPendingField,
    // `setZoom` only: the page SETS zoom (fit, auto-fit) but never reads it.
    // The toolbar and the canvas read it where they need it.
    setZoom,
  } = useFieldEditor();

  const fitToWidth = useCallback(() => {
    const width = canvasScrollRef.current?.clientWidth;
    if (width === undefined || width === 0) return;
    setZoom(fitWidthZoom(width));
  }, [setZoom]);

  // Open at a zoom that fits, on the viewports where 100% does not.
  //
  // Only once, and only on a phone or tablet: re-fitting on every resize
  // would fight a user who has deliberately zoomed in to place a field, and
  // on a desktop 100% already fits, so imposing a fit there would override a
  // sensible default with a computed one.
  const didAutoFit = useRef(false);
  useEffect(() => {
    if (didAutoFit.current || !isCompact) return;
    const width = canvasScrollRef.current?.clientWidth;
    if (width === undefined || width === 0) return;
    didAutoFit.current = true;
    setZoom(fitWidthZoom(width));
  }, [isCompact, setZoom, loadState]);

  /**
   * The last thing a shortcut did, for the canvas's live region.
   *
   * Copy, cut, paste, undo and delete all change the document without moving
   * focus or showing a dialog, so without this they are silent: three fields
   * can disappear on Delete with nothing said about it.
   */
  const [shortcutMessage, setShortcutMessage] = useState("");

  // Review's "not ready to send" banner can deep-link straight here with the
  // exact offending field(s) via ?focusFieldIds=a,b — so the sender lands on
  // the right page/document with those fields already selected, instead of
  // having to re-find them. Runs once, after fields have actually loaded
  // (an empty/not-yet-loaded field list would silently select nothing).
  const focusFieldIds = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("focusFieldIds");
    return raw ? raw.split(",").filter(Boolean) : [];
  }, []);
  // Keeps the cross-step Help panel's readiness calculation current while
  // this page is open — see PrepareContext's fieldsSnapshot doc comment.
  useEffect(() => { setFieldsSnapshot(fields); }, [fields, setFieldsSnapshot]);

  const focusedRef = useRef(false);
  useEffect(() => {
    if (focusedRef.current || focusFieldIds.length === 0 || loadState !== "ready") return;
    const matches = fields.filter((f) => focusFieldIds.includes(f.id));
    if (matches.length === 0) return;
    focusedRef.current = true;
    const first = matches[0]!;
    setDocument(first.documentId);
    setPage(first.pageId);
    selectFields(matches.map((f) => f.id));
  }, [focusFieldIds, fields, loadState, setDocument, setPage, selectFields]);

  // Review's banner (and the Help FAB) send the visitor here with
  // ?showValidation=1 whenever the blocker is something this page's
  // Validation panel explains — see buildActionUrl(). Selecting a field
  // alone (above) opens Field Properties instead, which has no idea why
  // that field was flagged; this forces the panel that actually has the
  // "Fix it for me" / "Remove this field" / "Save now" button front and
  // center, instead of requiring the visitor to already know to click
  // Validate themselves. Runs once fields have loaded, so the panel isn't
  // forced open onto an empty/stale validation result.
  const openedValidationRef = useRef(false);
  useEffect(() => {
    if (openedValidationRef.current || loadState !== "ready" || !draft) return;
    if (new URLSearchParams(window.location.search).get("showValidation") !== "1") return;
    openedValidationRef.current = true;
    runValidation(draft);
    if (!showValidation) toggleValidation();
  }, [loadState, draft, runValidation, showValidation, toggleValidation]);
  const platform = usePlatform();

  const [showKbDialog, setShowKbDialog] = useState(false);
  const [fieldSyncError, setFieldSyncError] = useState<string | null>(null);
  const { run: runProcessing } = useProcessing();
  const [savingFields, setSavingFields] = useState(false);

  const participants = draft?.participants ?? [];

  useEffect(() => {
    setStep("fields");
    if (draft) {
      initialize(draft.id, draft);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id]);

  // Real backend document(s) this editor session covers — each EditorDocument
  // maps back to the PrepFile it was built from (prepFileId), which is where
  // upload already stashed the real backendDocumentId. A transaction with
  // several files therefore has several real preparations, one per document
  // — the backend has no single "preparation for the whole transaction"
  // resource; see PreparationField living under one /documents/{id}/preparation.
  const realDocumentIdByEditorDocId = useMemo(() => {
    const map = new Map<string, string>();
    for (const doc of documents) {
      const prepFile = draft?.files.find((f) => f.id === doc.prepFileId);
      if (prepFile?.backendDocumentId) map.set(doc.id, prepFile.backendDocumentId);
    }
    return map;
  }, [documents, draft?.files]);

  // Last-known revision per real document, needed for optimistic
  // concurrency on save() — populated by the load effect below and updated
  // after every successful save, never guessed.
  const revisionByDocumentIdRef = useRef(new Map<string, number>());

  // Load once per distinct real-document set (refresh/resume) — not on
  // every keystroke; field edits stay purely local (COMMIT_FIELDS) until
  // the visitor continues.
  const loadedForDraftIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!USE_REAL_BACKEND || !draft || !platform.currentWorkspace) return;
    if (realDocumentIdByEditorDocId.size === 0) return;
    if (loadedForDraftIdRef.current === draft.id) return;
    loadedForDraftIdRef.current = draft.id;

    const workspaceId = platform.currentWorkspace.id;
    void (async () => {
      const loaded: FieldDefinition[] = [];
      // EMPTY-STATE RECONCILIATION (same reasoning as PrepareContext's
      // participant load): a document with zero saved fields is only
      // authoritative once THIS document has completed a save before —
      // otherwise a brand-new real document's empty preparation would wipe
      // fields the visitor just placed locally but hasn't saved yet.
      let anyDocumentHadRealData = false;
      for (const [editorDocId, backendDocId] of realDocumentIdByEditorDocId) {
        try {
          const prep = await realPreparationService.get(workspaceId, backendDocId);
          revisionByDocumentIdRef.current.set(backendDocId, prep.revision);
          if (prep.fields.length > 0) {
            markDocumentSynced("fields", backendDocId);
            anyDocumentHadRealData = true;
          }
          const doc = documents.find((d) => d.id === editorDocId);
          const pageIdForNumber = (n: number) => doc?.pages.find((p) => p.pageNumber === n)?.id ?? null;
          for (const f of prep.fields) {
            const translated = fromBackendField(f, editorDocId, pageIdForNumber);
            if (translated) loaded.push(translated);
          }
        } catch {
          setFieldSyncError("Could not load previously saved fields. Your local changes are unaffected.");
        }
      }
      const anyDocumentAlreadySynced = [...realDocumentIdByEditorDocId.values()]
        .some((id) => isDocumentSynced("fields", id));
      if (loaded.length > 0 || anyDocumentHadRealData || anyDocumentAlreadySynced) {
        // A previously-synced document with a genuinely empty backend list
        // must still clear whatever local fields are sitting in the editor
        // (e.g. restored from localStorage before a refresh) — loadRealFields
        // replaces the field set outright, same as a fresh load would.
        loadRealFields(loaded);
      } else if (draft.templateFields && draft.templateFields.length > 0) {
        // TEMPLATE FIELDS — the document has never had a real preparation
        // saved (this is the very first time it is being prepared), and the
        // draft carries the template's own field layout, already resolved to
        // this draft's participants by template-apply.ts. Seeded once, the
        // same way DEFAULT FIELDS below is — the visitor can then move,
        // resize or delete any of them like fields they placed themselves.
        //
        // Page numbers are the TEMPLATE's own document's, which is safe only
        // because `initialFilesFor` (UseTemplatePage.tsx) seeds this exact
        // draft's file from the template's own backendDocumentId/artifactId
        // — the same bytes, the same pages, the same numbering.
        const firstDoc = documents[0];
        if (firstDoc) {
          const pageIdForNumber = (n: number) =>
            firstDoc.pages.find((p) => p.pageNumber === n)?.id ?? null;
          // Ascending layer, so `addField`'s own auto-assigned z-order
          // (append-and-increment — it does not accept a caller-chosen
          // layer) reproduces the template's relative stacking order.
          const inLayerOrder = [...draft.templateFields].sort((a, b) => a.layer - b.layer);
          for (const f of inLayerOrder) {
            const pageId = pageIdForNumber(f.pageNumber);
            if (!pageId) continue;
            addField({
              type: f.type,
              documentId: firstDoc.id,
              pageId,
              rect: { ...f.rect },
              participantId: f.participantId,
              // 064. A field the template bound to a variable arrives with
              // the sender's typed value and NO participant. It renders as
              // already-filled and is excluded from every recipient's
              // obligations, which is exactly what `static_value` means.
              ...(f.staticValue === null ? {} : { staticValue: f.staticValue }),
              label: f.label,
              required: f.required,
              demonstrationOnly: false,
            });
          }
        }
      } else {
        // DEFAULT FIELDS — a document that has genuinely never had fields
        // saved (not "empty because nothing loaded yet") starts with a
        // blank canvas otherwise, and every signer needs a manually-added
        // Signature field before Validate stops complaining. Reported live
        // as a real source of user mistakes. Placed once, only the first
        // time this document is opened (this whole effect runs once per
        // draft — see loadedForDraftIdRef — and this branch only fires when
        // nothing was ever saved), on page 1 of the first document, one per
        // participant whose role has an unambiguous backend-supported
        // default field. Never repeats the earlier phantom-field bug: only
        // real, backend-storable types are used (signature/checkbox), and
        // these are ordinary local fields the visitor can edit, move, or
        // delete like anything they placed themselves.
        const firstDoc = documents[0];
        const firstPage = firstDoc?.pages[0];
        if (firstDoc && firstPage) {
          let offset = 0;
          for (const p of draft.participants) {
            const defaultType: FieldType | null =
              p.role === "signer" ? "signature" :
              p.role === "acknowledgment-recipient" ? "checkbox" :
              null;
            if (!defaultType) continue;
            addField({
              type: defaultType,
              documentId: firstDoc.id,
              pageId: firstPage.id,
              rect: defaultFieldRect(defaultType, 0.1, 0.12 + offset * 0.1),
              participantId: p.id,
              label: FIELD_TYPE_LABELS[defaultType],
              required: true,
              demonstrationOnly: false,
            });
            offset += 1;
          }
        }
      }
    })();
  }, [draft, platform.currentWorkspace, realDocumentIdByEditorDocId, documents, loadRealFields, addField]);

  // Persists the CURRENT field set to every real document this editor
  // covers, before continuing on. A field of a type the backend doesn't
  // support (multiline-text, radio-group, acknowledgment, sender-text —
  // see field-sync.ts) is skipped, not silently coerced into a type it
  // isn't; it stays local/in-session only, same as it always has.
  const [revisionConflict, setRevisionConflict] = useState(false);

  const saveFieldsToBackend = useCallback(async (): Promise<boolean> => {
    if (!USE_REAL_BACKEND || !platform.currentWorkspace || realDocumentIdByEditorDocId.size === 0) return true;
    const workspaceId = platform.currentWorkspace.id;
    setSavingFields(true);
    return runProcessing(
      {
        message: "Checking your fields",
        detail: "Saving every field and confirming it is placed correctly.",
      },
      async () => {
    let ok = true;
    let conflict = false;
    // Backend-confirmed fields, per document, translated back to editor
    // fields with their real `bf_` ids — see the merge after the loop.
    const savedByDocument = new Map<string, FieldDefinition[]>();
    for (const [editorDocId, backendDocId] of realDocumentIdByEditorDocId) {
      const doc = documents.find((d) => d.id === editorDocId);
      const pageNumberOf = (pageId: string) => doc?.pages.find((p) => p.id === pageId)?.pageNumber ?? null;
      const pageIdForNumber = (n: number) => doc?.pages.find((p) => p.pageNumber === n)?.id ?? null;
      const inputs = fields
        .filter((f) => f.documentId === editorDocId && isBackendFieldType(f.type))
        .map((f) => toBackendFieldInput(f, pageNumberOf))
        .filter((f): f is NonNullable<typeof f> => f !== null);
      const expectedRevision = revisionByDocumentIdRef.current.get(backendDocId) ?? 0;
      try {
        const saved = await realPreparationService.save(workspaceId, backendDocId, expectedRevision, inputs);
        revisionByDocumentIdRef.current.set(backendDocId, saved.revision);
        markDocumentSynced("fields", backendDocId);
        savedByDocument.set(
          editorDocId,
          saved.fields
            .map((f) => fromBackendField(f, editorDocId, pageIdForNumber))
            .filter((f): f is FieldDefinition => f !== null),
        );
      } catch (err) {
        ok = false;
        if (err instanceof ApiError && err.status === 409) {
          // REVISION CONFLICT: someone/something else saved this document's
          // fields since we last read it. Never silently overwrite that
          // newer state — refresh the revision number so a retry compares
          // against the truth, but leave the visitor's local edits and
          // navigation blocked until they explicitly choose to proceed.
          conflict = true;
          try {
            const latest = await realPreparationService.get(workspaceId, backendDocId);
            revisionByDocumentIdRef.current.set(backendDocId, latest.revision);
          } catch {
            // Revision refresh itself failed — surfaced via the generic
            // message below; the visitor can retry Continue again.
          }
        } else {
          setFieldSyncError(
            err instanceof ApiError
              ? err.message
              : "Could not save your field placement. Please try again.",
          );
        }
      }
    }
    setSavingFields(false);
    setRevisionConflict(conflict);
    if (conflict) {
      setFieldSyncError(
        "This document's fields were changed elsewhere since you loaded it. Your local placement is unchanged — review it, then press Continue again to save over the latest version.",
      );
    } else if (ok) {
      setFieldSyncError(null);
      // Adopt the backend's ids. A save used to leave the editor holding the
      // same locally-generated ids it had before, so "is this saved?" (the
      // `bf_` prefix check in send-readiness.ts and this page's own
      // Validation panel) stayed false after a confirmed PUT 200 — "Save
      // now" visibly did nothing (reported live). Fields of a type the
      // backend can't store are kept as-is: they were never sent, so they
      // are still local, and still (correctly) flagged as such.
      if (savedByDocument.size > 0) {
        const merged = fields.filter((f) => !savedByDocument.has(f.documentId) || !isBackendFieldType(f.type));
        for (const savedFields of savedByDocument.values()) merged.push(...savedFields);
        loadRealFields(merged);
      }
    }
    return ok && !conflict;
      },
    );
  }, [platform.currentWorkspace, realDocumentIdByEditorDocId, documents, fields, loadRealFields, runProcessing]);

  // Keyboard shortcuts.
  //
  // This replaces a stub that matched Ctrl+Z, called preventDefault(), and
  // then did nothing — suppressing the browser's undo without running the
  // editor's, while the toolbar advertised the shortcut in its tooltip.
  useFieldEditorShortcuts({
    copy: copySelected,
    paste,
    undo,
    redo,
    duplicate: useCallback(() => {
      const first = selectedFieldIds[0];
      if (first !== undefined) duplicateField(first);
    }, [selectedFieldIds, duplicateField]),
    deleteSelected: useCallback(() => {
      deleteFields(selectedFieldIds);
    }, [selectedFieldIds, deleteFields]),
    selectAll: useCallback(() => {
      selectFields(currentPageFields.map(f => f.id));
    }, [currentPageFields, selectFields]),
    escape: useCallback(() => {
      // A pending placement is the more urgent thing to escape from: the
      // canvas is armed and the next click would drop a field.
      if (mode === "place-field") setPendingField(null);
      else clearSelection();
    }, [mode, setPendingField, clearSelection]),
    hasSelection: selectedFieldIds.length > 0,
    hasClipboard: clipboard.length > 0,
    announce: setShortcutMessage,
  });

  // Bring the selected field out from under the sheet.
  //
  // The properties sheet rises from the bottom and can take 70% of a short
  // screen, so selecting a field in the lower half opened an editor for
  // something the editor itself was covering. Changing a field's properties
  // while unable to see the field is not editing, it is guessing.
  //
  // Declared HERE, above every early return. Placed after `if (!draft)` it
  // ran on some renders and not others, which changes hook order — the one
  // thing React cannot tolerate. The sheet condition is recomputed inside
  // rather than read from a binding that does not exist yet.
  useEffect(() => {
    const open = isCompact && (showValidation || selectedField !== null);
    if (!open || selectedField === null) return;
    const scroller = canvasScrollRef.current;
    if (scroller === null) return;
    const element = scroller.querySelector(`[data-field-id="${selectedField.id}"]`);
    if (!(element instanceof HTMLElement)) return;

    const scrollerBox = scroller.getBoundingClientRect();
    const fieldBox = element.getBoundingClientRect();
    // A comfortable margin below the top of the canvas — the band the sheet
    // never reaches.
    const delta = fieldBox.top - (scrollerBox.top + 24);
    // Already in the safe band; moving would be motion for its own sake.
    if (Math.abs(delta) < 8) return;
    scroller.scrollBy({ top: delta, behavior: "smooth" });
  }, [isCompact, showValidation, selectedField]);

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

  // The right-hand content, declared once and rendered either as the desktop
  // column or inside the phone's bottom sheet. Two copies of this would be
  // two things to keep in step.
  const sidePanel = showValidation ? (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 8px", borderBottom: "1px solid #F0F2F5" }}>
        <span style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY }}>Validation</span>
        <button onClick={toggleValidation} aria-label="Close validation panel" style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: SILVER, fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      <ValidationPanel onSaveNow={saveFieldsToBackend} saving={savingFields} />
    </>
  ) : selectedField ? (
    <FieldPropertiesPanel field={selectedField} participants={participants} />
  ) : (
    <FieldPalettePanel />
  );

  // The sheet is not a thing you open; it is what having a selection or an
  // open validation run LOOKS like on a phone. Closing it therefore has to
  // undo the state that summoned it, or it would reappear immediately.
  // Selecting a field deliberately does NOT open the sheet.
  //
  // It used to. But on a phone selecting IS how you grab a field to move it,
  // so every drag threw a 70%-tall sheet over the page you were working on,
  // and the field you had just picked up went under it. The panel became
  // something to dismiss rather than something to use.
  //
  // Opening it is now an explicit act: the Properties button over the canvas,
  // or the overflow menu. Validation still summons it on its own, because
  // that IS a result you asked to see.
  const sheetOpen = isCompact && (showValidation || panelOpen);


  const sheetTitle = showValidation
    ? "Validation"
    : selectedField !== null ? "Field properties" : "Field types";
  // The one definition of "may this document proceed".
  //
  // Validation first: continuing past an invalid layout is the failure this
  // guards, and it opens the validation panel so the reason is visible rather
  // than the button appearing to do nothing.
  const guardedContinue = () => {
    if (savingFields) return; // already saving — ignore a double press
    const result = runValidation(draft);
    if (!result.isValid) {
      if (!showValidation) toggleValidation();
      return;
    }
    void (async () => {
      const ok = await saveFieldsToBackend();
      // Authentication, not confirmation. Fields now sit mid-sequence rather
      // than at the end, so continuing moves to the next STEP instead of
      // jumping past Authentication, Review and Authorization to the send.
      //
      // `returnTo` still wins when set: that is the Signing Workflow sending
      // the sender here to assign one participant's fields, and it owns where
      // they go back to.
      if (ok) void navigate(returnTo ?? "/app/prepare/authentication");
    })();
  };

  const closeSheet = () => {
    // Dismiss means dismiss: clear every reason the sheet is showing, or it
    // reappears on the next render from whichever one was left standing.
    setPanelOpen(false);
    if (showValidation) toggleValidation();
    else clearSelection();
  };

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
        zIndex:    Z.drawer,
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

      {/* What the last keyboard shortcut did.
          Copy, cut, paste, undo and delete change the document without
          moving focus or opening anything, so they are otherwise silent —
          fields can vanish on Delete with nothing said about it. */}
      <div
        aria-live="polite"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}
      >
        {shortcutMessage}
      </div>

      {fieldSyncError && (
        <div
          role="alert"
          style={{
            padding: "8px 16px", background: revisionConflict ? "#FFF4E5" : "#FDECEA",
            color: revisionConflict ? "#7A4A00" : "#611A15",
            fontSize: 13, borderBottom: `1px solid ${revisionConflict ? "#F5D9A8" : "#F5C6C0"}`, flexShrink: 0,
          }}
        >
          {fieldSyncError}
        </div>
      )}

      {/* Toolbar */}
      <EditorToolbar
        draftTitle={draftTitle}
        participants={participants}
        draft={draft}
        showKbDialog={showKbDialog}
        setShowKbDialog={setShowKbDialog}
        onContinue={guardedContinue}
        returnTo={returnTo}
        returnLabel={returnLabel}
        onOpenDocuments={() => { setShowDocuments(true); }}
        onFitWidth={fitToWidth}
        onOpenPanel={() => { setPanelOpen(true); }}
        hasSelection={selectedField !== null}
      />

      {/* Body.
          On a phone the two side panels become a drawer and a sheet — see
          EditorMobileChrome for the arithmetic. 200px + 272px of fixed
          chrome is 152px more than a 320px viewport holds, so the canvas
          used to collapse to nothing and the right panel was pushed outside
          a clipping root entirely. */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!isCompact && <DocumentPanel />}

        {/* Center: canvas or field list. Full width when compact. */}
        <main
          id="editor-main"
          aria-label="Document editing area"
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, position: "relative" }}
        >
          {/* The two thumb controls, phone only.
              *
              * Continue moved off the toolbar because the toolbar is at the
              * TOP of the screen and continuing is the last thing you do —
              * a reach across the whole device for the most-used action.
              *
              * Properties left, Continue right: the dominant thumb lands
              * bottom-right, and that belongs to the action that moves the
              * work forward. Properties is the occasional one.
              *
              * Both hide while the sheet is open, so neither can sit on top
              * of the panel it summoned. */}
          {isCompact && !sheetOpen && (
            <>
              {selectedField !== null && (
                <button
                  type="button"
                  onClick={() => { setPanelOpen(true); }}
                  aria-label="Show properties for the selected field"
                  style={{
                    ...GF,
                    position: "absolute",
                    left: 14,
                    bottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
                    zIndex: CANVAS_Z.resizeHandle + 1,
                    minHeight: 40, padding: "0 16px", borderRadius: 999,
                    border: "1px solid #D1D9E0", background: WHITE, color: AZURE,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(7,17,31,0.16)",
                  }}
                >
                  Properties
                </button>
              )}

              <button
                type="button"
                onClick={guardedContinue}
                aria-label="Continue to final review"
                style={{
                  ...GF,
                  position: "absolute",
                  right: 14,
                  bottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
                  zIndex: CANVAS_Z.resizeHandle + 1,
                  minHeight: 44, padding: "0 20px", borderRadius: 999,
                  border: "none",
                  background: fields.length > 0 ? AZURE : "#5A7A9A",
                  color: WHITE, fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,120,212,0.32)",
                }}
              >
                Continue &rarr;
              </button>
            </>
          )}

          {showFieldList ? (
            <FieldListView participants={participants} />
          ) : (
            <PageCanvas
              participants={participants}
              workspaceId={platform.currentWorkspace?.id ?? null}
              realDocumentIdByEditorDocId={realDocumentIdByEditorDocId}
              scrollRef={canvasScrollRef}
            />
          )}
        </main>

        {!isCompact && (
          <div style={{
            width:        272,
            background:   WHITE,
            borderLeft:   "1px solid #E3E8EF",
            display:      "flex",
            flexDirection: "column",
            overflow:     "hidden",
            flexShrink:   0,
          }}>
            {sidePanel}
          </div>
        )}
      </div>

      {/* Compact: the same two panels, summoned rather than resident. */}
      {isCompact && (
        <>
          <EditorDrawer
            open={showDocuments}
            title="Documents and pages"
            onClose={() => { setShowDocuments(false); }}
          >
            <DocumentPanel />
          </EditorDrawer>

          <EditorSheet
            open={sheetOpen}
            title={sheetTitle}
            onClose={closeSheet}
          >
            {sidePanel}
          </EditorSheet>
        </>
      )}

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
