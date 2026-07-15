// In-memory preparation draft context for /app/prepare/*.
// PRIVACY: No draft state is written to localStorage, sessionStorage, or cookies.
// File objects (browser File references) are NEVER stored in this context.
// Only metadata (filename, size, type) passes through domain models.
// All state is cleared when the user discards the draft or leaves preparation.

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import type {
  PreparationDraft,
  PrepDraftId,
  PrepFile,
  TransactionDetailsDraft,
  PrepParticipant,
  PrepRoutingConfig,
  PrepAuthConfig,
  PrepSettings,
  PrepValidationResult,
  PreparationStepId,
  PreparationStepState,
  ResumableDraftSummary,
} from "../models/prepare";
import {
  PREPARATION_STEPS,
  PREP_ROLE_IS_BLOCKING,
} from "../models/prepare";
import {
  prepareService,
  validateDraftState,
} from "../services/mock/prepare.service";
import type { MockContact, MockTemplateSummary } from "../data/mock/prepare";

// ── Step gating (centralized) ─────────────────────────────────────────────────

function resolveStepStates(
  draft: PreparationDraft | null,
  activeStepId: PreparationStepId | null,
): Record<PreparationStepId, PreparationStepState> {
  const unavail = (): PreparationStepState => "unavailable";
  const avail   = (): PreparationStepState => "available";

  if (!draft) {
    return {
      upload:         "available",
      participants:   unavail(),
      routing:        unavail(),
      authentication: unavail(),
      settings:       unavail(),
      review:         unavail(),
      fields:         "blocked",
    };
  }

  const v = validateDraftState(draft);

  const filesOk       = v.stepValidity.upload;
  const participantsOk = v.stepValidity.participants;
  const routingOk     = v.stepValidity.routing;
  const authOk        = v.stepValidity.authentication;
  const settingsOk    = v.stepValidity.settings;
  const allOk         = v.readyForFieldPlacement;

  const stepState = (
    id: PreparationStepId,
    prereq: boolean,
    valid: boolean,
  ): PreparationStepState => {
    if (id === activeStepId) return "current";
    if (!prereq)             return "unavailable";
    if (valid)               return "complete";
    return "available";
  };

  return {
    upload:         stepState("upload", true, filesOk),
    participants:   stepState("participants", filesOk, participantsOk),
    routing:        stepState("routing", participantsOk, routingOk),
    authentication: stepState("authentication", routingOk, authOk),
    settings:       stepState("settings", filesOk, settingsOk), // settings always open once files done
    review:         stepState("review", filesOk && participantsOk && routingOk, v.isValid),
    fields:         allOk ? (activeStepId === "fields" ? "current" : "available") : "blocked",
  };
}

// ── State and actions ─────────────────────────────────────────────────────────

type PrepareLoadState = "idle" | "loading" | "ready" | "error" | "discarded" | "not-found";

interface PrepareState {
  draft:           PreparationDraft | null;
  loadState:       PrepareLoadState;
  errorMessage:    string | null;
  isDirty:         boolean;
  activeStepId:    PreparationStepId | null;
  contacts:        MockContact[];
  templates:       MockTemplateSummary[];
  resumableDrafts: ResumableDraftSummary[];
}

type PrepareAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_OK"; draft: PreparationDraft }
  | { type: "LOAD_ERROR"; message: string }
  | { type: "LOAD_NOT_FOUND" }
  | { type: "SET_ACTIVE_STEP"; stepId: PreparationStepId | null }
  | { type: "UPDATE_DRAFT"; patch: Partial<PreparationDraft> }
  | { type: "DISCARD" }
  | { type: "SET_CONTACTS"; contacts: MockContact[] }
  | { type: "SET_TEMPLATES"; templates: MockTemplateSummary[] }
  | { type: "SET_RESUMABLE"; drafts: ResumableDraftSummary[] };

function prepareReducer(state: PrepareState, action: PrepareAction): PrepareState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loadState: "loading", errorMessage: null };
    case "LOAD_OK":
      return { ...state, loadState: "ready", draft: action.draft, isDirty: false, errorMessage: null };
    case "LOAD_ERROR":
      return { ...state, loadState: "error", errorMessage: action.message };
    case "LOAD_NOT_FOUND":
      return { ...state, loadState: "not-found" };
    case "SET_ACTIVE_STEP":
      return { ...state, activeStepId: action.stepId };
    case "UPDATE_DRAFT":
      if (!state.draft) return state;
      return {
        ...state,
        draft: { ...state.draft, ...action.patch, updatedAt: new Date().toISOString() },
        isDirty: true,
      };
    case "DISCARD":
      return { ...state, draft: null, loadState: "discarded", isDirty: false, errorMessage: null };
    case "SET_CONTACTS":
      return { ...state, contacts: action.contacts };
    case "SET_TEMPLATES":
      return { ...state, templates: action.templates };
    case "SET_RESUMABLE":
      return { ...state, resumableDrafts: action.drafts };
    default:
      return state;
  }
}

const INITIAL_STATE: PrepareState = {
  draft:           null,
  loadState:       "idle",
  errorMessage:    null,
  isDirty:         false,
  activeStepId:    null,
  contacts:        [],
  templates:       [],
  resumableDrafts: [],
};

// ── Context interface ─────────────────────────────────────────────────────────

interface PrepareContextValue {
  // State
  draft:           PreparationDraft | null;
  loadState:       PrepareLoadState;
  errorMessage:    string | null;
  isDirty:         boolean;
  activeStepId:    PreparationStepId | null;
  stepStates:      Record<PreparationStepId, PreparationStepState>;
  contacts:        MockContact[];
  templates:       MockTemplateSummary[];
  resumableDrafts: ResumableDraftSummary[];

  // Draft lifecycle
  createDraft:  (opts?: { source?: string; templateId?: string }) => Promise<PrepDraftId | null>;
  loadDraft:    (draftId: PrepDraftId) => Promise<void>;
  discardDraft: () => Promise<void>;

  // Draft mutations (update local state immediately, persist via service)
  updateFiles:        (files: PrepFile[]) => void;
  updateDetails:      (details: TransactionDetailsDraft) => void;
  updateParticipants: (participants: PrepParticipant[]) => void;
  updateRouting:      (routing: PrepRoutingConfig) => void;
  updateAuth:         (auth: PrepAuthConfig) => void;
  updateSettings:     (settings: PrepSettings) => void;

  // Validation
  validate:   () => PrepValidationResult;
  setStep:    (stepId: PreparationStepId | null) => void;

  // Field placement
  markReadyForFieldPlacement: () => Promise<boolean>;

  // Support data loaders
  loadContacts:        () => Promise<void>;
  loadTemplates:       () => Promise<void>;
  loadResumableDrafts: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const PrepareContext = createContext<PrepareContextValue | null>(null);

export function usePrepare(): PrepareContextValue {
  const ctx = useContext(PrepareContext);
  if (!ctx) throw new Error("usePrepare must be used inside PrepareProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PrepareProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(prepareReducer, INITIAL_STATE);

  // Derived step states
  const stepStates = resolveStepStates(state.draft, state.activeStepId);

  const createDraft = useCallback(async (opts?: { source?: string; templateId?: string }) => {
    dispatch({ type: "LOAD_START" });
    try {
      const draft = await prepareService.createDraft(opts);
      dispatch({ type: "LOAD_OK", draft });
      return draft.id;
    } catch (e) {
      dispatch({ type: "LOAD_ERROR", message: "Unable to create a preparation draft. Please try again." });
      return null;
    }
  }, []);

  const loadDraft = useCallback(async (draftId: PrepDraftId) => {
    dispatch({ type: "LOAD_START" });
    try {
      const draft = await prepareService.getDraft(draftId);
      if (!draft) {
        dispatch({ type: "LOAD_NOT_FOUND" });
        return;
      }
      dispatch({ type: "LOAD_OK", draft });
    } catch {
      dispatch({ type: "LOAD_ERROR", message: "Unable to load the preparation draft." });
    }
  }, []);

  const discardDraft = useCallback(async () => {
    if (state.draft) {
      await prepareService.discardDraft(state.draft.id).catch(() => {});
    }
    dispatch({ type: "DISCARD" });
  }, [state.draft]);

  const updateFiles = useCallback((files: PrepFile[]) => {
    dispatch({ type: "UPDATE_DRAFT", patch: { files } });
    if (state.draft) {
      prepareService.updateFiles(state.draft.id, files).catch(() => {});
    }
  }, [state.draft]);

  const updateDetails = useCallback((details: TransactionDetailsDraft) => {
    dispatch({ type: "UPDATE_DRAFT", patch: { details } });
    if (state.draft) {
      prepareService.updateTransactionDetails(state.draft.id, details).catch(() => {});
    }
  }, [state.draft]);

  const updateParticipants = useCallback((participants: PrepParticipant[]) => {
    dispatch({ type: "UPDATE_DRAFT", patch: { participants } });
    if (state.draft) {
      prepareService.updateParticipants(state.draft.id, participants).catch(() => {});
    }
  }, [state.draft]);

  const updateRouting = useCallback((routing: PrepRoutingConfig) => {
    dispatch({ type: "UPDATE_DRAFT", patch: { routing } });
    if (state.draft) {
      prepareService.updateRouting(state.draft.id, routing).catch(() => {});
    }
  }, [state.draft]);

  const updateAuth = useCallback((auth: PrepAuthConfig) => {
    dispatch({ type: "UPDATE_DRAFT", patch: { auth } });
    if (state.draft) {
      prepareService.updateAuthentication(state.draft.id, auth).catch(() => {});
    }
  }, [state.draft]);

  const updateSettings = useCallback((settings: PrepSettings) => {
    dispatch({ type: "UPDATE_DRAFT", patch: { settings } });
    if (state.draft) {
      prepareService.updateSettings(state.draft.id, settings).catch(() => {});
    }
  }, [state.draft]);

  const validate = useCallback((): PrepValidationResult => {
    if (!state.draft) {
      return {
        isValid: false,
        issues: [],
        errors: [{ id: "vi_no_draft", stepId: "upload", severity: "error", code: "NO_DRAFT", message: "No active draft." }],
        warnings: [],
        readyForFieldPlacement: false,
        stepValidity: { upload: false, participants: false, routing: false, authentication: false, settings: false, review: false, fields: false },
      };
    }
    return validateDraftState(state.draft);
  }, [state.draft]);

  const setStep = useCallback((stepId: PreparationStepId | null) => {
    dispatch({ type: "SET_ACTIVE_STEP", stepId });
  }, []);

  const markReadyForFieldPlacement = useCallback(async () => {
    if (!state.draft) return false;
    try {
      const updated = await prepareService.markReadyForFieldPlacement(state.draft.id);
      dispatch({ type: "LOAD_OK", draft: updated });
      return true;
    } catch {
      return false;
    }
  }, [state.draft]);

  const loadContacts = useCallback(async () => {
    try {
      const contacts = await prepareService.getContacts();
      dispatch({ type: "SET_CONTACTS", contacts });
    } catch {}
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const templates = await prepareService.getTemplates();
      dispatch({ type: "SET_TEMPLATES", templates });
    } catch {}
  }, []);

  const loadResumableDrafts = useCallback(async () => {
    try {
      const drafts = await prepareService.listResumableDrafts();
      dispatch({ type: "SET_RESUMABLE", drafts });
    } catch {}
  }, []);

  const value: PrepareContextValue = {
    draft:                   state.draft,
    loadState:               state.loadState,
    errorMessage:            state.errorMessage,
    isDirty:                 state.isDirty,
    activeStepId:            state.activeStepId,
    stepStates,
    contacts:                state.contacts,
    templates:               state.templates,
    resumableDrafts:         state.resumableDrafts,
    createDraft,
    loadDraft,
    discardDraft,
    updateFiles,
    updateDetails,
    updateParticipants,
    updateRouting,
    updateAuth,
    updateSettings,
    validate,
    setStep,
    markReadyForFieldPlacement,
    loadContacts,
    loadTemplates,
    loadResumableDrafts,
  };

  return (
    <PrepareContext.Provider value={value}>
      {children}
    </PrepareContext.Provider>
  );
}
