// Template context for /app/templates/* page family.
// Provides: active template, library query state, and mutation callbacks.
// In-memory only — no backend, no localStorage, no real sharing.
// Burgundy (#67023B) never appears here.

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import type {
  DocumentTemplate,
  DocumentTemplateId,
  TemplateListQuery,
  TemplateActionAvailability,
  TemplateValidationResult,
} from "../models/templates";
import { DEFAULT_TEMPLATE_QUERY } from "../models/templates";
import type { TemplateListResult, TemplateStatusMutationResult, TemplateDuplicateResult } from "../services/mock/templates.service";
import {
  asyncListTemplates,
  asyncGetTemplateById,
  asyncMakeAvailable,
  asyncReturnToDraft,
  asyncArchive,
  asyncRestore,
  asyncDuplicate,
  getTemplateActionAvailability,
  validateTemplate,
} from "../services/mock/templates.service";

// ── State definition ───────────────────────────────────────────────────────────

interface TemplateState {
  // Library
  query:         TemplateListQuery;
  listResult:    TemplateListResult | null;
  listLoading:   boolean;
  listError:     string | null;

  // Active template (detail / edit / fields / preview / use pages)
  activeTemplate:    DocumentTemplate | null;
  activeLoading:     boolean;
  activeError:       string | null;
  activeActions:     TemplateActionAvailability[];
  activeValidation:  TemplateValidationResult | null;

  // Pending operation (optimistic feedback)
  pendingOp: "none" | "make-available" | "return-to-draft" | "archive" | "restore" | "duplicate";
  pendingMessage: string | null;
  pendingError:   string | null;
}

const INITIAL_STATE: TemplateState = {
  query:           DEFAULT_TEMPLATE_QUERY,
  listResult:      null,
  listLoading:     false,
  listError:       null,
  activeTemplate:  null,
  activeLoading:   false,
  activeError:     null,
  activeActions:   [],
  activeValidation:null,
  pendingOp:       "none",
  pendingMessage:  null,
  pendingError:    null,
};

// ── Actions ────────────────────────────────────────────────────────────────────

type TemplateAction =
  | { type: "SET_QUERY";           query:    TemplateListQuery  }
  | { type: "LIST_LOADING" }
  | { type: "LIST_SUCCESS";        result:   TemplateListResult }
  | { type: "LIST_ERROR";          error:    string             }
  | { type: "ACTIVE_LOADING" }
  | { type: "ACTIVE_SUCCESS";      template: DocumentTemplate   }
  | { type: "ACTIVE_ERROR";        error:    string             }
  | { type: "ACTIVE_CLEAR" }
  | { type: "OP_START";            op: TemplateState["pendingOp"] }
  | { type: "OP_SUCCESS";          message:  string; template?: DocumentTemplate }
  | { type: "OP_ERROR";            error:    string             }
  | { type: "OP_CLEAR" };

function reducer(state: TemplateState, action: TemplateAction): TemplateState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: action.query };
    case "LIST_LOADING":
      return { ...state, listLoading: true, listError: null };
    case "LIST_SUCCESS":
      return { ...state, listLoading: false, listResult: action.result, listError: null };
    case "LIST_ERROR":
      return { ...state, listLoading: false, listError: action.error };
    case "ACTIVE_LOADING":
      return { ...state, activeLoading: true, activeError: null };
    case "ACTIVE_SUCCESS": {
      const av = getTemplateActionAvailability(action.template);
      const vr = validateTemplate(action.template);
      return { ...state, activeLoading: false, activeTemplate: action.template, activeError: null, activeActions: av, activeValidation: vr };
    }
    case "ACTIVE_ERROR":
      return { ...state, activeLoading: false, activeError: action.error, activeTemplate: null };
    case "ACTIVE_CLEAR":
      return { ...state, activeTemplate: null, activeLoading: false, activeError: null, activeActions: [], activeValidation: null };
    case "OP_START":
      return { ...state, pendingOp: action.op, pendingMessage: null, pendingError: null };
    case "OP_SUCCESS": {
      const nextState = { ...state, pendingOp: "none" as const, pendingMessage: action.message, pendingError: null };
      if (action.template) {
        const av = getTemplateActionAvailability(action.template);
        const vr = validateTemplate(action.template);
        return { ...nextState, activeTemplate: action.template, activeActions: av, activeValidation: vr };
      }
      return nextState;
    }
    case "OP_ERROR":
      return { ...state, pendingOp: "none", pendingMessage: null, pendingError: action.error };
    case "OP_CLEAR":
      return { ...state, pendingMessage: null, pendingError: null };
    default:
      return state;
  }
}

// ── Context interface ──────────────────────────────────────────────────────────

interface TemplateContextValue {
  state: TemplateState;
  // Library
  setQuery:      (q: TemplateListQuery) => void;
  loadList:      (q?: TemplateListQuery) => void;
  // Active template
  loadTemplate:  (id: DocumentTemplateId) => void;
  clearTemplate: () => void;
  // Actions
  makeAvailable: (id: DocumentTemplateId) => void;
  returnToDraft: (id: DocumentTemplateId) => void;
  archive:       (id: DocumentTemplateId) => void;
  restore:       (id: DocumentTemplateId) => void;
  duplicate:     (id: DocumentTemplateId, onDone?: (result: TemplateDuplicateResult) => void) => void;
  clearOpMessage:() => void;
}

const TemplateContext = createContext<TemplateContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function TemplateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const latestQuery = useRef(state.query);
  latestQuery.current = state.query;

  const loadList = useCallback(async (q?: TemplateListQuery) => {
    const query = q ?? latestQuery.current;
    dispatch({ type: "LIST_LOADING" });
    try {
      const result = await asyncListTemplates(query);
      dispatch({ type: "LIST_SUCCESS", result });
    } catch {
      dispatch({ type: "LIST_ERROR", error: "Unable to load templates." });
    }
  }, []);

  const setQuery = useCallback((q: TemplateListQuery) => {
    dispatch({ type: "SET_QUERY", query: q });
  }, []);

  const loadTemplate = useCallback(async (id: DocumentTemplateId) => {
    dispatch({ type: "ACTIVE_LOADING" });
    try {
      const template = await asyncGetTemplateById(id);
      if (template) {
        dispatch({ type: "ACTIVE_SUCCESS", template });
      } else {
        dispatch({ type: "ACTIVE_ERROR", error: "Template not found." });
      }
    } catch {
      dispatch({ type: "ACTIVE_ERROR", error: "Unable to load template." });
    }
  }, []);

  const clearTemplate = useCallback(() => {
    dispatch({ type: "ACTIVE_CLEAR" });
  }, []);

  const makeAvailable = useCallback(async (id: DocumentTemplateId) => {
    dispatch({ type: "OP_START", op: "make-available" });
    const r: TemplateStatusMutationResult = await asyncMakeAvailable(id);
    if (r.ok && r.template) {
      dispatch({ type: "OP_SUCCESS", message: "Template is now Available.", template: r.template });
    } else {
      dispatch({ type: "OP_ERROR", error: r.reason ?? "Operation failed." });
    }
  }, []);

  const returnToDraft = useCallback(async (id: DocumentTemplateId) => {
    dispatch({ type: "OP_START", op: "return-to-draft" });
    const r = await asyncReturnToDraft(id);
    if (r.ok && r.template) {
      dispatch({ type: "OP_SUCCESS", message: "Template returned to Draft.", template: r.template });
    } else {
      dispatch({ type: "OP_ERROR", error: r.reason ?? "Operation failed." });
    }
  }, []);

  const archive = useCallback(async (id: DocumentTemplateId) => {
    dispatch({ type: "OP_START", op: "archive" });
    const r = await asyncArchive(id);
    if (r.ok && r.template) {
      dispatch({ type: "OP_SUCCESS", message: "Template archived.", template: r.template });
    } else {
      dispatch({ type: "OP_ERROR", error: r.reason ?? "Operation failed." });
    }
  }, []);

  const restore = useCallback(async (id: DocumentTemplateId) => {
    dispatch({ type: "OP_START", op: "restore" });
    const r = await asyncRestore(id);
    if (r.ok && r.template) {
      dispatch({ type: "OP_SUCCESS", message: "Template restored to Draft.", template: r.template });
    } else {
      dispatch({ type: "OP_ERROR", error: r.reason ?? "Operation failed." });
    }
  }, []);

  const duplicate = useCallback(async (id: DocumentTemplateId, onDone?: (r: TemplateDuplicateResult) => void) => {
    dispatch({ type: "OP_START", op: "duplicate" });
    const r = await asyncDuplicate(id);
    if (r.ok) {
      dispatch({ type: "OP_SUCCESS", message: `"${r.template?.name}" created as a draft.` });
      onDone?.(r);
    } else {
      dispatch({ type: "OP_ERROR", error: r.reason ?? "Duplicate failed." });
    }
  }, []);

  const clearOpMessage = useCallback(() => {
    dispatch({ type: "OP_CLEAR" });
  }, []);

  return (
    <TemplateContext.Provider value={{
      state,
      setQuery,
      loadList,
      loadTemplate,
      clearTemplate,
      makeAvailable,
      returnToDraft,
      archive,
      restore,
      duplicate,
      clearOpMessage,
    }}>
      {children}
    </TemplateContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useTemplates(): TemplateContextValue {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error("useTemplates must be used inside <TemplateProvider>");
  return ctx;
}
