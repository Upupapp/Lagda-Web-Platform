// Field-placement editor context for /app/prepare/fields.
// Holds all editor state: documents, fields, selection, mode, zoom, undo/redo.
// PRIVACY: no field data, File objects, or participant PII persisted externally.
// Undo/redo history lives in memory only; cleared on draft discard.

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";
import type {
  FieldId,
  FieldDefinition,
  EditorDocument,
  EditorDocumentId,
  EditorPageId,
  FieldType,
  EditorMode,
  EditorSaveState,
  EditorLoadState,
  NormalizedRect,
  FieldPlacementValidation,
  ResizeHandle,
  ParticipantEditorIdentity,
} from "../models/field-editor";
import {
  EDITOR_HISTORY_LIMIT,
  buildParticipantIdentity,
  clampRect,
  clampMoveRect,
  applyResizeDelta,
  makeFieldId,
} from "../models/field-editor";
import type { PreparationDraft } from "../models/prepare";
import { fieldEditorService } from "../services/mock/field-editor.service";
// fieldEditorService is used only for initialization and validation (stateless).

// ── State ─────────────────────────────────────────────────────────────────────

interface FieldEditorState {
  loadState:         EditorLoadState;
  errorMessage:      string | null;
  documents:         EditorDocument[];
  currentDocumentId: EditorDocumentId | null;
  currentPageId:     EditorPageId | null;
  fields:            FieldDefinition[];
  selectedFieldIds:  FieldId[];
  mode:              EditorMode;
  pendingFieldType:  FieldType | null;
  zoom:              number;                   // 50–200
  showFieldList:     boolean;
  showValidation:    boolean;
  saveState:         EditorSaveState;
  validation:        FieldPlacementValidation | null;
  clipboard:         FieldDefinition[];        // internal clipboard, never system clipboard
  participantFilter: string | null;            // filter by participantId
  past:              FieldDefinition[][];      // undo stack
  future:            FieldDefinition[][];      // redo stack
  /**
   * Documents whose page list has been checked against the REAL file (see
   * SYNC_REAL_PAGES). Until then a document's pages are a placeholder guess,
   * and anything positioned on "the last page" could land on a page the file
   * does not have — and be dropped the moment the real count arrives.
   */
  verifiedDocumentIds: EditorDocumentId[];
}

// ── Actions ───────────────────────────────────────────────────────────────────

type FieldEditorAction =
  | { type: "INIT_OK";        documents: EditorDocument[]; fields: FieldDefinition[] }
  | { type: "INIT_ERROR";     message: string }
  | { type: "INIT_NO_DRAFT" }
  | { type: "SET_DOCUMENT";   documentId: EditorDocumentId }
  | { type: "SET_PAGE";       pageId: EditorPageId }
  | { type: "SET_MODE";       mode: EditorMode }
  | { type: "SET_PENDING";    fieldType: FieldType | null }
  | { type: "SET_ZOOM";       zoom: number }
  | { type: "SELECT";         fieldIds: FieldId[] }
  | { type: "CLEAR_SELECT" }
  | { type: "COMMIT_FIELDS";  fields: FieldDefinition[]; historyDesc: string }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "COPY" }
  | { type: "PASTE";          documentId: EditorDocumentId; pageId: EditorPageId }
  | { type: "SET_VALIDATION"; validation: FieldPlacementValidation }
  | { type: "SET_FILTER";     participantId: string | null }
  | { type: "TOGGLE_LIST" }
  | { type: "TOGGLE_VALIDATION" }
  | { type: "SET_SAVE_STATE"; saveState: EditorSaveState }
  | { type: "DISCARD" }
  /**
   * The draft's file set changed while (or before) this editor was open —
   * a file replaced, removed or added on the Documents step. Swaps in the
   * rebuilt document list while KEEPING the editor's own fields (and undo
   * history) for every document and page that still exists. INIT_OK would
   * reset the field set to the service's snapshot and lose local edits.
   */
  | { type: "SYNC_DOCUMENTS"; documents: EditorDocument[] }
  /**
   * Several fields in ONE history entry, layered against the CURRENT state.
   *
   * Calling `addField` in a loop does not work: each call closes over the
   * same `state.fields`, so every commit replaced the previous one and only
   * the last field survived. The reducer sees the true current list.
   */
  | { type: "ADD_FIELDS"; fields: FieldDefinition[]; select: boolean }
  /**
   * Replaces a document's fabricated page list with the real one.
   *
   * The editor is initialised from `buildEditorDocuments`, whose page count
   * comes from `derivePageCount` — an index into a hardcoded array — and whose
   * every page is assumed A4. Both are placeholders for a document nobody has
   * read yet. Once the real PDF is loaded, this corrects them.
   *
   * It is a correction rather than part of INIT because reading the PDF is
   * async and the editor must be usable before it finishes.
   */
  | {
      type: "SYNC_REAL_PAGES";
      documentId: EditorDocumentId;
      pageCount: number;
      /**
       * WIDTH / HEIGHT per page, matching `EditorPage.aspectRatio`.
       *
       * That direction is a trap worth naming: the model's `A4` is `595/842`
       * (0.707), while `PAGE_RATIO` in the editor is `842/595` (1.415). They
       * are reciprocals, and passing the wrong one shapes every page
       * inside-out without failing anything.
       */
      aspectRatios: readonly number[];
    };

// ── Reducer ───────────────────────────────────────────────────────────────────

const INITIAL: FieldEditorState = {
  loadState:         "initializing",
  errorMessage:      null,
  documents:         [],
  currentDocumentId: null,
  currentPageId:     null,
  fields:            [],
  selectedFieldIds:  [],
  mode:              "select",
  pendingFieldType:  null,
  zoom:              100,
  showFieldList:     false,
  showValidation:    false,
  saveState:         "idle",
  validation:        null,
  clipboard:         [],
  participantFilter: null,
  past:              [],
  future:            [],
  verifiedDocumentIds: [],
};

function pushHistory(state: FieldEditorState, _fields: FieldDefinition[]): Pick<FieldEditorState, "past" | "future"> {
  const past = [...state.past, state.fields].slice(-EDITOR_HISTORY_LIMIT);
  return { past, future: [] };
}

function reducer(state: FieldEditorState, action: FieldEditorAction): FieldEditorState {
  switch (action.type) {

    case "INIT_OK": {
      const doc = action.documents[0] ?? null;
      const page = doc?.pages[0] ?? null;
      return {
        ...INITIAL,
        loadState:         "ready",
        documents:         action.documents,
        fields:            action.fields,
        currentDocumentId: doc?.id ?? null,
        currentPageId:     page?.id ?? null,
        saveState:         action.fields.length > 0 ? "saved-in-session" : "idle",
      };
    }

    case "INIT_ERROR":
      return { ...state, loadState: "error", errorMessage: action.message };

    case "INIT_NO_DRAFT":
      return { ...state, loadState: "draft-unavailable" };

    case "SET_DOCUMENT": {
      const doc  = state.documents.find(d => d.id === action.documentId);
      const page = doc?.pages[0] ?? null;
      return {
        ...state,
        currentDocumentId: action.documentId,
        currentPageId:     page?.id ?? null,
        selectedFieldIds:  [],
      };
    }

    case "SET_PAGE":
      return {
        ...state,
        currentPageId:    action.pageId,
        selectedFieldIds: [],
      };

    case "SET_MODE":
      return {
        ...state,
        mode:            action.mode,
        pendingFieldType: action.mode !== "place-field" ? null : state.pendingFieldType,
      };

    case "SET_PENDING":
      return {
        ...state,
        pendingFieldType: action.fieldType,
        mode:             action.fieldType ? "place-field" : "select",
      };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(50, Math.min(200, action.zoom)) };

    case "SELECT":
      return { ...state, selectedFieldIds: action.fieldIds };

    case "CLEAR_SELECT":
      return { ...state, selectedFieldIds: [] };

    case "COMMIT_FIELDS": {
      const histEntry = pushHistory(state, action.fields);
      return {
        ...state,
        ...histEntry,
        fields:    action.fields,
        saveState: "unsaved-changes",
        validation: null,  // clear stale validation
      };
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const past    = [...state.past];
      const prev    = past.pop()!;
      const future  = [state.fields, ...state.future].slice(0, EDITOR_HISTORY_LIMIT);
      return { ...state, past, future, fields: prev, saveState: "unsaved-changes", validation: null };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const future  = [...state.future];
      const next    = future.shift()!;
      const past    = [...state.past, state.fields].slice(-EDITOR_HISTORY_LIMIT);
      return { ...state, past, future, fields: next, saveState: "unsaved-changes", validation: null };
    }

    case "COPY":
      return {
        ...state,
        clipboard: state.fields.filter(f => state.selectedFieldIds.includes(f.id)),
      };

    case "PASTE": {
      if (state.clipboard.length === 0) return state;
      const offset = 0.04;
      const newFields = state.clipboard.map(f => ({
        ...f,
        id:         makeFieldId(),
        documentId: action.documentId,
        pageId:     action.pageId,
        rect:       clampRect(clampMoveRect({
          ...f.rect,
          x: Math.min(1 - f.rect.width,  f.rect.x + offset),
          y: Math.min(1 - f.rect.height, f.rect.y + offset),
        }), f.type),
        demonstrationOnly: true as const,
      }));
      const hist = pushHistory(state, [...state.fields, ...newFields]);
      return {
        ...state, ...hist,
        fields:          [...state.fields, ...newFields],
        selectedFieldIds: newFields.map(f => f.id),
        saveState:       "unsaved-changes",
        validation:      null,
      };
    }

    case "SET_VALIDATION":
      return { ...state, validation: action.validation, saveState: "saved-in-session" };

    case "SET_FILTER":
      return { ...state, participantFilter: action.participantId };

    case "TOGGLE_LIST":
      return { ...state, showFieldList: !state.showFieldList, showValidation: false };

    case "TOGGLE_VALIDATION":
      return { ...state, showValidation: !state.showValidation, showFieldList: false };

    case "SET_SAVE_STATE":
      return { ...state, saveState: action.saveState };

    case "SYNC_REAL_PAGES": {
      const target = state.documents.find(doc => doc.id === action.documentId);
      if (target === undefined) return state;

      const sameCount = target.pageCount === action.pageCount;
      const sameShape = target.pages.every(
        (page, index) => page.aspectRatio === action.aspectRatios[index]);
      const alreadyVerified = state.verifiedDocumentIds.includes(action.documentId);
      const verifiedDocumentIds = alreadyVerified
        ? state.verifiedDocumentIds
        : [...state.verifiedDocumentIds, action.documentId];
      // Identical is the COMMON case — every re-render of a loaded document
      // reaches here. Returning the same state keeps React from looping.
      if (sameCount && sameShape) {
        return alreadyVerified ? state : { ...state, verifiedDocumentIds };
      }

      // Ids are rebuilt with the same deterministic scheme the initial pages
      // used, so a page that survives the correction keeps its id — and with
      // it, every field already placed on that page and the current page
      // selection. Only pages that genuinely no longer exist are lost.
      const pages = Array.from({ length: action.pageCount }, (_, index) => ({
        id: `epage_${action.documentId}_${String(index + 1)}`,
        documentId: action.documentId,
        pageNumber: index + 1,
        aspectRatio: action.aspectRatios[index] ?? target.pages[index]?.aspectRatio ?? 595 / 842,
        label: `Page ${String(index + 1)}`,
      }));

      const documents = state.documents.map(doc =>
        doc.id === action.documentId
          ? { ...doc, pageCount: action.pageCount, pages }
          : doc);

      // A field on a page the document does not have could never be saved —
      // the backend validates `pageNumber` against the artifact's real page
      // count and refuses it. Dropping it here is what turns an unexplainable
      // save failure into a page that simply is not offered.
      const livePageIds = new Set(pages.map(page => page.id));
      const fields = state.fields.filter(
        field => field.documentId !== action.documentId || livePageIds.has(field.pageId));

      const currentPageStillExists =
        state.currentPageId !== null && livePageIds.has(state.currentPageId);
      const belongsToTarget = state.currentDocumentId === action.documentId;

      return {
        ...state,
        documents,
        fields,
        verifiedDocumentIds,
        selectedFieldIds: state.selectedFieldIds.filter(
          id => fields.some(field => field.id === id)),
        currentPageId: belongsToTarget && !currentPageStillExists
          ? (pages[0]?.id ?? null)
          : state.currentPageId,
      };
    }

    case "ADD_FIELDS": {
      if (action.fields.length === 0) return state;
      const next = [...state.fields];
      for (const f of action.fields) {
        const maxLayer = next
          .filter(o => o.documentId === f.documentId && o.pageId === f.pageId)
          .reduce((m, o) => Math.max(m, o.layer), 0);
        next.push({ ...f, layer: maxLayer + 1 });
      }
      return {
        ...state,
        ...pushHistory(state, next),
        fields: next,
        saveState: "unsaved-changes",
        validation: null,
        selectedFieldIds: action.select ? action.fields.map(f => f.id) : state.selectedFieldIds,
      };
    }

    case "SYNC_DOCUMENTS": {
      const documents = action.documents;
      const livePages = new Set(documents.flatMap(d => d.pages.map(p => `${d.id}__${p.id}`)));
      const fields = state.fields.filter(f => livePages.has(`${f.documentId}__${f.pageId}`));
      const docStillThere = documents.find(d => d.id === state.currentDocumentId);
      const currentDoc = docStillThere ?? documents[0] ?? null;
      const pageStillThere = docStillThere?.pages.some(p => p.id === state.currentPageId) ?? false;
      return {
        ...state,
        documents,
        fields,
        // A replaced file must be re-read before its page list is trusted.
        verifiedDocumentIds: [],
        currentDocumentId: currentDoc?.id ?? null,
        currentPageId: pageStillThere ? state.currentPageId : (currentDoc?.pages[0]?.id ?? null),
        selectedFieldIds: state.selectedFieldIds.filter(id => fields.some(f => f.id === id)),
        validation: null,
      };
    }

    case "DISCARD":
      return { ...INITIAL, loadState: "ready" };

    default:
      return state;
  }
}

// ── Context interface ─────────────────────────────────────────────────────────

interface FieldEditorContextValue {
  // State
  loadState:            EditorLoadState;
  errorMessage:         string | null;
  documents:            EditorDocument[];
  currentDocumentId:    EditorDocumentId | null;
  currentPageId:        EditorPageId | null;
  fields:               FieldDefinition[];
  selectedFieldIds:     FieldId[];
  selectedField:        FieldDefinition | null;
  currentPageFields:    FieldDefinition[];
  mode:                 EditorMode;
  pendingFieldType:     FieldType | null;
  zoom:                 number;
  showFieldList:        boolean;
  showValidation:       boolean;
  saveState:            EditorSaveState;
  validation:           FieldPlacementValidation | null;
  clipboard:            FieldDefinition[];
  participantFilter:    string | null;
  canUndo:              boolean;
  canRedo:              boolean;
  participantIdentities: ParticipantEditorIdentity[];

  // Document navigation
  setDocument: (id: EditorDocumentId) => void;
  setPage:     (id: EditorPageId) => void;

  // Mode
  setMode:           (mode: EditorMode)              => void;
  setPendingField:   (type: FieldType | null)         => void;
  setZoom:           (zoom: number)                   => void;

  // Selection
  selectFields:    (ids: FieldId[])  => void;
  clearSelection:  ()                => void;

  // Field operations (all create undo entries)
  addField:       (partial: Omit<FieldDefinition, "id" | "layer">) => FieldDefinition;
  /** Adds several fields as one undoable change. Safe to call with many. */
  addFields:      (partials: Omit<FieldDefinition, "id" | "layer">[], opts?: { select?: boolean }) => FieldDefinition[];
  /** Documents whose page list has been read from the real file. */
  verifiedDocumentIds: EditorDocumentId[];
  /** Re-derives the document list after the draft's files changed. */
  syncDocuments: (draftId: string, draft: PreparationDraft) => void;
  moveField:      (fieldId: FieldId, rect: NormalizedRect)         => void;
  resizeField:    (fieldId: FieldId, handle: ResizeHandle, dx: number, dy: number) => void;
  updateField:    (fieldId: FieldId, patch: Partial<FieldDefinition>) => void;
  deleteFields:   (ids: FieldId[]) => void;
  duplicateField: (fieldId: FieldId) => FieldDefinition | null;
  reorderLayer:   (fieldId: FieldId, action: "bring-forward" | "send-backward" | "bring-to-front" | "send-to-back") => void;
  alignFields:    (ids: FieldId[], alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => void;

  // Clipboard
  copySelected: () => void;
  paste:        () => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;

  // Validation
  runValidation: (draft: PreparationDraft) => FieldPlacementValidation;

  // Filters
  setParticipantFilter: (id: string | null) => void;
  toggleFieldList:      () => void;
  toggleValidation:     () => void;

  // Lifecycle
  initialize:  (draftId: string, draft: PreparationDraft) => void;
  loadRealFields: (fields: FieldDefinition[]) => void;
  /**
   * Corrects a document's page list once the real PDF has been read.
   *
   * Safe to call on every render: identical input returns the same state, so
   * it does not loop.
   */
  syncRealPages: (
    documentId: EditorDocumentId,
    pageCount: number,
    /** WIDTH / HEIGHT per page — the same direction as `EditorPage.aspectRatio`. */
    aspectRatios: readonly number[],
  ) => void;
  discard:     (draftId: string) => void;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const FieldEditorContext = createContext<FieldEditorContextValue | null>(null);

export function useFieldEditor(): FieldEditorContextValue {
  const ctx = useContext(FieldEditorContext);
  if (!ctx) throw new Error("useFieldEditor must be used inside FieldEditorProvider");
  return ctx;
}

interface ProviderProps {
  children:     React.ReactNode;
  participants: { id: string; name: string; role: string }[];
}

export function FieldEditorProvider({ children, participants }: ProviderProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Derived: participant identities
  const participantIdentities = useMemo(() =>
    participants.map((p, i) => buildParticipantIdentity(p.id, i, p.name, p.role as import("../models/prepare").PrepParticipantRole)),
    [participants],
  );

  // Derived: selected field
  const selectedField = useMemo(() =>
    state.selectedFieldIds.length === 1
      ? (state.fields.find(f => f.id === state.selectedFieldIds[0]) ?? null)
      : null,
    [state.fields, state.selectedFieldIds],
  );

  // Derived: current page fields (sorted by layer)
  const currentPageFields = useMemo(() =>
    state.fields
      .filter(f => f.documentId === state.currentDocumentId && f.pageId === state.currentPageId)
      .sort((a, b) => a.layer - b.layer),
    [state.fields, state.currentDocumentId, state.currentPageId],
  );

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const commitFields = useCallback((fields: FieldDefinition[], desc: string) => {
    dispatch({ type: "COMMIT_FIELDS", fields, historyDesc: desc });
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────────

  const syncRealPages = useCallback((
    documentId: EditorDocumentId,
    pageCount: number,
    aspectRatios: readonly number[],
  ) => {
    dispatch({ type: "SYNC_REAL_PAGES", documentId, pageCount, aspectRatios });
  }, []);

  const initialize = useCallback((draftId: string, draft: PreparationDraft) => {
    if (!draft) { dispatch({ type: "INIT_NO_DRAFT" }); return; }
    try {
      const session = fieldEditorService.initializeEditor(draftId, draft);
      dispatch({ type: "INIT_OK", documents: session.documents, fields: session.fields });
    } catch {
      dispatch({ type: "INIT_ERROR", message: "Unable to initialize the field editor." });
    }
  }, []);

  // Real-backend only: replaces the current field set with what was loaded
  // from the backend (see FieldsPage.tsx). A full replace, like every other
  // field mutation (COMMIT_FIELDS), but immediately marked "saved-in-session"
  // rather than "unsaved-changes" — these fields did not just get edited,
  // they're exactly what the backend already has.
  const loadRealFields = useCallback((fields: FieldDefinition[]) => {
    dispatch({ type: "COMMIT_FIELDS", fields, historyDesc: "Loaded from server" });
    dispatch({ type: "SET_SAVE_STATE", saveState: fields.length > 0 ? "saved-in-session" : "idle" });
  }, []);

  const discard = useCallback((draftId: string) => {
    fieldEditorService.clearSession(draftId);
    dispatch({ type: "DISCARD" });
  }, []);

  const setDocument   = useCallback((id: EditorDocumentId)  => dispatch({ type: "SET_DOCUMENT", documentId: id }), []);
  const setPage       = useCallback((id: EditorPageId)       => dispatch({ type: "SET_PAGE",     pageId: id }), []);
  const setMode       = useCallback((mode: EditorMode)       => dispatch({ type: "SET_MODE",     mode }), []);
  const setPendingField = useCallback((ft: FieldType | null) => dispatch({ type: "SET_PENDING",  fieldType: ft }), []);
  const setZoom       = useCallback((zoom: number)           => dispatch({ type: "SET_ZOOM",     zoom }), []);
  const selectFields  = useCallback((ids: FieldId[])         => dispatch({ type: "SELECT",       fieldIds: ids }), []);
  const clearSelection = useCallback(()                      => dispatch({ type: "CLEAR_SELECT" }), []);
  const undo          = useCallback(()                       => dispatch({ type: "UNDO" }), []);
  const redo          = useCallback(()                       => dispatch({ type: "REDO" }), []);
  const copySelected  = useCallback(()                       => dispatch({ type: "COPY" }), []);
  const toggleFieldList   = useCallback(() => dispatch({ type: "TOGGLE_LIST" }), []);
  const toggleValidation  = useCallback(() => dispatch({ type: "TOGGLE_VALIDATION" }), []);
  const setParticipantFilter = useCallback((id: string | null) => dispatch({ type: "SET_FILTER", participantId: id }), []);

  const paste = useCallback(() => {
    if (!state.currentDocumentId || !state.currentPageId) return;
    dispatch({ type: "PASTE", documentId: state.currentDocumentId, pageId: state.currentPageId });
  }, [state.currentDocumentId, state.currentPageId]);

  const addField = useCallback((partial: Omit<FieldDefinition, "id" | "layer">): FieldDefinition => {
    const onPage   = state.fields.filter(f => f.documentId === partial.documentId && f.pageId === partial.pageId);
    const maxLayer = onPage.reduce((m, f) => Math.max(m, f.layer), 0);
    const field: FieldDefinition = {
      ...partial,
      id:    makeFieldId(),
      layer: maxLayer + 1,
      rect:  clampRect(partial.rect, partial.type),
      demonstrationOnly: true,
    };
    commitFields([...state.fields, field], `Add ${field.type} field`);
    dispatch({ type: "SELECT", fieldIds: [field.id] });
    return field;
  }, [state.fields, commitFields]);

  const addFields = useCallback((
    partials: Omit<FieldDefinition, "id" | "layer">[],
    opts?: { select?: boolean },
  ): FieldDefinition[] => {
    const built: FieldDefinition[] = partials.map(p => ({
      ...p,
      id:    makeFieldId(),
      // Provisional; the reducer layers each one against the live state.
      layer: 0,
      rect:  clampRect(p.rect, p.type),
    }));
    dispatch({ type: "ADD_FIELDS", fields: built, select: opts?.select ?? false });
    return built;
  }, []);

  const syncDocuments = useCallback((draftId: string, draft: PreparationDraft) => {
    try {
      const session = fieldEditorService.initializeEditor(draftId, draft);
      dispatch({ type: "SYNC_DOCUMENTS", documents: session.documents });
    } catch {
      dispatch({ type: "INIT_ERROR", message: "Unable to refresh the documents in the field editor." });
    }
  }, []);

  const moveField = useCallback((fieldId: FieldId, newRect: NormalizedRect) => {
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;
    const updated   = { ...field, rect: clampMoveRect(newRect) };
    const newFields = state.fields.map(f => f.id === fieldId ? updated : f);
    commitFields(newFields, "Move field");
  }, [state.fields, commitFields]);

  const resizeField = useCallback((fieldId: FieldId, handle: ResizeHandle, dx: number, dy: number) => {
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;
    const newRect   = applyResizeDelta(field.rect, handle, dx, dy, field.type);
    const updated   = { ...field, rect: newRect };
    const newFields = state.fields.map(f => f.id === fieldId ? updated : f);
    commitFields(newFields, "Resize field");
  }, [state.fields, commitFields]);

  const updateField = useCallback((fieldId: FieldId, patch: Partial<FieldDefinition>) => {
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;
    let updated = { ...field, ...patch, id: fieldId, demonstrationOnly: true as const };
    if (patch.rect) updated = { ...updated, rect: clampRect(patch.rect, updated.type) };
    const newFields = state.fields.map(f => f.id === fieldId ? updated : f);
    commitFields(newFields, "Update field");
  }, [state.fields, commitFields]);

  const deleteFields = useCallback((ids: FieldId[]) => {
    const idSet     = new Set(ids);
    const newFields = state.fields.filter(f => !idSet.has(f.id));
    commitFields(newFields, `Delete ${ids.length} field${ids.length !== 1 ? "s" : ""}`);
    dispatch({ type: "CLEAR_SELECT" });
  }, [state.fields, commitFields]);

  const duplicateField = useCallback((fieldId: FieldId): FieldDefinition | null => {
    const orig = state.fields.find(f => f.id === fieldId);
    if (!orig) return null;
    const offset  = 0.03;
    const newRect = clampRect({
      ...orig.rect,
      x: Math.min(1 - orig.rect.width,  orig.rect.x + offset),
      y: Math.min(1 - orig.rect.height, orig.rect.y + offset),
    }, orig.type);
    const dup: FieldDefinition = { ...orig, id: makeFieldId(), rect: newRect, layer: orig.layer + 1 };
    const newFields = [...state.fields, dup];
    commitFields(newFields, "Duplicate field");
    dispatch({ type: "SELECT", fieldIds: [dup.id] });
    return dup;
  }, [state.fields, commitFields]);

  const reorderLayer = useCallback((
    fieldId: FieldId,
    action:  "bring-forward" | "send-backward" | "bring-to-front" | "send-to-back",
  ) => {
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;
    const pageFields = state.fields.filter(
      f => f.documentId === field.documentId && f.pageId === field.pageId,
    );
    const sorted = [...pageFields].sort((a, b) => a.layer - b.layer);
    const myIdx  = sorted.findIndex(f => f.id === fieldId);
    const newMap = new Map(sorted.map((f, i) => [f.id, i + 1]));
    if (action === "bring-to-front") newMap.set(fieldId, sorted.length + 10);
    if (action === "send-to-back")   newMap.set(fieldId, 0);
    if (action === "bring-forward" && myIdx < sorted.length - 1) {
      const next = sorted[myIdx + 1]!;
      const la   = newMap.get(fieldId) ?? myIdx + 1;
      const lb   = newMap.get(next.id) ?? myIdx + 2;
      newMap.set(fieldId, lb);
      newMap.set(next.id, la);
    }
    if (action === "send-backward" && myIdx > 0) {
      const prev = sorted[myIdx - 1]!;
      const la   = newMap.get(fieldId) ?? myIdx + 1;
      const lb   = newMap.get(prev.id) ?? myIdx;
      newMap.set(fieldId, lb);
      newMap.set(prev.id, la);
    }
    const newFields = state.fields.map(f => {
      const nl = newMap.get(f.id);
      return nl !== undefined ? { ...f, layer: nl } : f;
    });
    commitFields(newFields, "Reorder field layer");
  }, [state.fields, commitFields]);

  const alignFields = useCallback((ids: FieldId[], alignment: "left" | "center-h" | "right" | "top" | "center-v" | "bottom") => {
    if (ids.length < 2) return;
    const targets = state.fields.filter(f => ids.includes(f.id));
    if (targets.length < 2) return;

    const refLeft   = Math.min(...targets.map(f => f.rect.x));
    const refRight  = Math.max(...targets.map(f => f.rect.x + f.rect.width));
    const refCenterH = (refLeft + refRight) / 2;
    const refTop    = Math.min(...targets.map(f => f.rect.y));
    const refBottom = Math.max(...targets.map(f => f.rect.y + f.rect.height));
    const refCenterV = (refTop + refBottom) / 2;

    const idSet = new Set(ids);
    const newFields = state.fields.map(f => {
      if (!idSet.has(f.id)) return f;
      let x = f.rect.x, y = f.rect.y;
      if (alignment === "left")     x = refLeft;
      if (alignment === "center-h") x = refCenterH - f.rect.width / 2;
      if (alignment === "right")    x = refRight - f.rect.width;
      if (alignment === "top")      y = refTop;
      if (alignment === "center-v") y = refCenterV - f.rect.height / 2;
      if (alignment === "bottom")   y = refBottom - f.rect.height;
      return { ...f, rect: clampMoveRect({ ...f.rect, x, y }) };
    });
    commitFields(newFields, `Align fields (${alignment})`);
  }, [state.fields, commitFields]);

  const runValidation = useCallback((draft: PreparationDraft): FieldPlacementValidation => {
    // Pass in-memory fields directly so the service validates the live state
    const validation = fieldEditorService.validateFieldPlacement(draft.id, draft, state.fields);
    dispatch({ type: "SET_VALIDATION", validation });
    return validation;
  }, [state.fields]);

  const value: FieldEditorContextValue = {
    loadState:            state.loadState,
    errorMessage:         state.errorMessage,
    documents:            state.documents,
    currentDocumentId:    state.currentDocumentId,
    currentPageId:        state.currentPageId,
    fields:               state.fields,
    selectedFieldIds:     state.selectedFieldIds,
    selectedField,
    currentPageFields,
    mode:                 state.mode,
    pendingFieldType:     state.pendingFieldType,
    zoom:                 state.zoom,
    showFieldList:        state.showFieldList,
    showValidation:       state.showValidation,
    saveState:            state.saveState,
    validation:           state.validation,
    clipboard:            state.clipboard,
    participantFilter:    state.participantFilter,
    canUndo:              state.past.length > 0,
    canRedo:              state.future.length > 0,
    participantIdentities,
    setDocument,
    setPage,
    setMode,
    setPendingField,
    setZoom,
    selectFields,
    clearSelection,
    addField,
    addFields,
    verifiedDocumentIds:  state.verifiedDocumentIds,
    syncDocuments,
    moveField,
    resizeField,
    updateField,
    deleteFields,
    duplicateField,
    reorderLayer,
    alignFields,
    copySelected,
    paste,
    undo,
    redo,
    runValidation,
    setParticipantFilter,
    toggleFieldList,
    toggleValidation,
    initialize,
    syncRealPages,
    loadRealFields,
    discard,
  };

  return (
    <FieldEditorContext.Provider value={value}>
      {children}
    </FieldEditorContext.Provider>
  );
}
