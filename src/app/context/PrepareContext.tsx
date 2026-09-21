// Preparation draft context for /app/prepare/*.
// PRIVACY: File objects (browser File references) are NEVER stored in this
// context or anywhere downstream — only metadata (filename, size, type)
// passes through domain models. That rule is unchanged.
//
// LOCAL_PERSISTENCE: the draft itself IS now mirrored to localStorage (see
// services/local-persistence.ts) so a refresh mid-preparation doesn't lose
// work — there is no backend draft API yet to resume from instead. All
// state is still cleared when the user discards the draft. See that file's
// header for how to remove this layer once a real backend exists.

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { readJSON, writeJSON, removeKey, PERSISTENCE_KEYS } from "../services/local-persistence";
import { loadResumableDraft } from "../services/real/resume-draft.service";
import { clearAllFileRefs } from "../services/prepare/file-registry";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { usePlatform } from "./PlatformContext";
import { realRecipientService } from "../services/real/recipient.service";
import {
  syncParticipants, syncRoutingOrder, isRealRecipientId, buildParticipantsAndRoutingFromRecipients,
} from "../services/prepare/participant-sync";
import { isDocumentSynced, markDocumentSynced } from "../services/prepare/sync-markers";
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
import type { FieldDefinition } from "../models/field-editor";
import {
  normalizeRoutingGroups,
} from "../models/prepare";
import {
  prepareService,
  validateDraftState,
} from "../services/mock/prepare.service";
import type { MockContact, MockTemplateSummary } from "../data/mock/prepare";
import { log } from "../utils/logger";

// ── Step gating (centralized) ─────────────────────────────────────────────────

function resolveStepStates(
  draft: PreparationDraft | null,
  activeStepId: PreparationStepId | null,
): Record<PreparationStepId, PreparationStepState> {
  const unavail = (): PreparationStepState => "unavailable";

  if (!draft) {
    // No draft yet: only the first step is reachable, and every later one is
    // locked. Listed in the running order so this reads against
    // PREPARATION_STEPS rather than against the old sequence.
    return {
      upload:         "available",
      participants:   unavail(),
      routing:        unavail(),
      settings:       unavail(),
      fields:         "blocked",
      review:         unavail(),
      authentication: unavail(),
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

  // The unlock chain, in the order PREPARATION_STEPS now declares:
  //
  //   Documents -> Participants -> Routing -> Settings -> Fields -> Review
  //                                                            -> Authentication
  //
  // Each step opens only once the one before it is VALID, not merely visited.
  // "Visited" would unlock the next step for someone who opened a step and
  // left it empty, which is the state this gating exists to prevent.
  //
  // Settings no longer bypasses the chain. It used to open as soon as files
  // existed, which was harmless when it sat fourth but would now let someone
  // skip Participants and Routing entirely.
  //
  // Authentication is last and needs everything before it: it asks how each
  // signer proves who they are, and there are no signers to ask about until
  // participants and routing are settled.
  const beforeFields  = filesOk && participantsOk && routingOk && settingsOk;
  const beforeReview  = beforeFields && allOk;
  const beforeAuth    = beforeReview && v.isValid;

  return {
    upload:         stepState("upload", true, filesOk),
    participants:   stepState("participants", filesOk, participantsOk),
    routing:        stepState("routing", participantsOk, routingOk),
    settings:       stepState("settings", routingOk, settingsOk),
    fields:         beforeFields
      ? (activeStepId === "fields" ? "current" : "available")
      : "blocked",
    review:         stepState("review", beforeReview, v.isValid),
    authentication: stepState("authentication", beforeAuth, authOk),
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
  // Swaps a locally-generated participant id for the real backend
  // recipientId once creation is confirmed — applied to BOTH the
  // participants array and every routing group's participantIds in one
  // pass, so the two never drift out of sync with each other. See
  // participant-sync.ts §IDENTITY.
  | { type: "REPLACE_PARTICIPANT_IDS"; replacements: Map<string, string> }
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
    case "REPLACE_PARTICIPANT_IDS": {
      if (!state.draft || action.replacements.size === 0) return state;
      const replace = (id: string) => action.replacements.get(id) ?? id;
      return {
        ...state,
        draft: {
          ...state.draft,
          participants: state.draft.participants.map((p) => ({ ...p, id: replace(p.id) })),
          routing: {
            ...state.draft.routing,
            groups: state.draft.routing.groups.map((g) => ({
              ...g, participantIds: g.participantIds.map(replace),
            })),
          },
        },
      };
    }
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

// LOCAL_PERSISTENCE — restore a draft saved before a refresh. Passed as
// useReducer's lazy-init argument below, so it runs synchronously before the
// first render — the step-gating in resolveStepStates() sees the real draft
// immediately instead of flashing an empty entry screen first.
// LOCAL_PERSISTENCE — structural guard for hydration. readJSON() only
// protects against corrupt JSON; it can't know whether a well-formed object
// still matches PreparationDraft's current shape. A draft saved by an
// earlier version of this app (a field renamed, a step added) is exactly
// this kind of "valid JSON, wrong shape" data — trusting it blindly crashed
// the whole /app/prepare tree on first render instead of just starting a
// fresh draft, since nothing here ever asked "is this actually usable?"
// before handing it to resolveStepStates()/validateDraftState().
function isUsablePreparationDraft(v: unknown): v is PreparationDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    Array.isArray(d.files) &&
    !!d.details && typeof (d.details as Record<string, unknown>).title === "string" &&
    Array.isArray(d.participants) &&
    !!d.routing && Array.isArray((d.routing as Record<string, unknown>).groups) &&
    !!d.auth && typeof (d.auth as Record<string, unknown>).defaultMethod === "string" &&
    !!d.settings
  );
}

function hydratedInitialState(): PrepareState {
  let saved: PreparationDraft | null = null;
  try {
    const raw = readJSON<PreparationDraft>(PERSISTENCE_KEYS.prepareDraft);
    if (isUsablePreparationDraft(raw)) saved = raw;
  } catch {
    saved = null;
  }
  if (!saved) {
    removeKey(PERSISTENCE_KEYS.prepareDraft); // drop whatever unusable value was there
    return INITIAL_STATE;
  }

  // Repair routing step numbering on restore. A draft saved before the
  // normalizeRoutingGroups() fix (or one that predates today's approval-based
  // numbering fix) can have a gap — e.g. a lone "Signing" group stuck at
  // stepNumber 2 with nothing at 1. Pure positional renumbering is always
  // safe here: it never touches participant/group configuration, only the
  // number, so this can't lose anything the user configured.
  if (saved.routing.groups.length > 0) {
    saved = { ...saved, routing: { ...saved.routing, groups: normalizeRoutingGroups(saved.routing.groups) } };
  }
  prepareService.seedDraft(saved);
  return { ...INITIAL_STATE, draft: saved, loadState: "ready" };
}

// ── Context interface ─────────────────────────────────────────────────────────

interface PrepareContextValue {
  // State
  draft:           PreparationDraft | null;
  loadState:       PrepareLoadState;
  errorMessage:    string | null;
  /** Real-backend only: the most recent participant/routing save failure,
   *  if any. Distinct from errorMessage (draft load/create failures) —
   *  local edits are never lost when this is set; see updateParticipants. */
  syncError:       string | null;
  /** True when this draft has more than one file that has reached real
   *  backend upload — see the MULTI-DOCUMENT SIGNING MODEL BACKEND GAP note
   *  above hasMultiDocumentSigningGap(). Participants/routing only actually
   *  sync against the FIRST such document; a real send must not be offered
   *  as complete/correct while this is true. */
  multiDocumentSigningGap: boolean;
  isDirty:         boolean;
  activeStepId:    PreparationStepId | null;
  stepStates:      Record<PreparationStepId, PreparationStepState>;
  contacts:        MockContact[];
  templates:       MockTemplateSummary[];
  resumableDrafts: ResumableDraftSummary[];

  // Draft lifecycle
  createDraft:  (opts?: {
    source?: string;
    templateId?: string;
    /** Hands off a document selected before authentication. */
    initialFiles?: PrepFile[];
    initialTitle?: string;
  }) => Promise<PrepDraftId | null>;
  loadDraft:    (draftId: PrepDraftId) => Promise<void>;
  /**
   * Rebuilds a draft from a backend document and re-enters preparation.
   *
   * For a signing request still in `draft` state: its document, recipients
   * and field placement are all on the server, so the work is recoverable on
   * any device even though the LOCAL draft never left the browser that
   * started it.
   */
  resumeBackendDraft: (documentId: string) => Promise<boolean>;
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

  /** Latest field-editor snapshot, pushed up by whichever step page currently
   *  has FieldEditorContext mounted (FieldsPage, ConfirmationPage) — null
   *  until the field editor has been visited this session. Lets the
   *  cross-step Help panel (PreparationHelpFab) reuse computeSendReadiness()
   *  even on steps that don't mount a field editor themselves, without
   *  lifting FieldEditorProvider itself up to this layer. Never written by
   *  more than one mounted page at a time in practice (only one prepare step
   *  is visible at once), so a later write simply reflects the more recently
   *  visited page. */
  fieldsSnapshot: FieldDefinition[] | null;
  setFieldsSnapshot: (fields: FieldDefinition[] | null) => void;

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

// Participants/routing are modeled per-TRANSACTION (one flat list on the
// draft) but the backend scopes recipients per-DOCUMENT. Until a
// transaction can carry more than one real backend document's worth of
// recipients, the first file that has actually reached real upload is used
// as "the" document for participant/routing sync — correct for the
// common single-document case this phase targets; a multi-document
// transaction only syncs participants against its first document.
function getPrimaryBackendDocumentId(draft: PreparationDraft | null): string | undefined {
  return draft?.files.find((f) => f.backendDocumentId)?.backendDocumentId;
}

// MULTI-DOCUMENT SIGNING MODEL BACKEND GAP — traced against
// Lagda-Backend's schema (packages/db/src/migrations/018_preparation_recipients.ts,
// 019_signing_requests.ts): every recipient row foreign-keys to exactly one
// document's preparation/signing-request. There is no envelope/transaction
// table grouping several documents under one shared recipient set. The
// frontend's transaction-wide participants/routing model therefore cannot be
// represented correctly for more than one real document — duplicating
// recipients per document would silently fork a single visitor-authored
// list into independently-editable copies with different backend ids,
// which is not what "shared participants" means to the person configuring
// it. Until the backend adds that abstraction, a transaction with more than
// one real uploaded document is flagged, not silently synced against only
// the first one and passed off as complete.
function hasMultiDocumentSigningGap(draft: PreparationDraft | null): boolean {
  const realDocCount = draft?.files.filter((f) => f.backendDocumentId).length ?? 0;
  return realDocCount > 1;
}

export function PrepareProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(prepareReducer, undefined, hydratedInitialState);
  const platform = usePlatform();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [fieldsSnapshot, setFieldsSnapshot] = useState<FieldDefinition[] | null>(null);

  // Mirrors state.draft so the real-backend sync calls below (which span an
  // await, sometimes several) always diff against the truly-current
  // participants list rather than whatever was in scope when the async
  // function started.
  const draftRef = useRef(state.draft);
  useEffect(() => { draftRef.current = state.draft; }, [state.draft]);

  // Reload/resume authority: once a real backend document exists for this
  // draft, the backend's own recipient list — not whatever localStorage
  // happened to have — is what repopulates Participants/Routing. Runs once
  // per distinct real document (refresh, or resuming a draft that already
  // reached upload in an earlier session), not on every local edit; a
  // participant added seconds ago via updateParticipants is already
  // reflected optimistically and does not need re-fetching.
  const loadedRecipientsForDocumentRef = useRef<string | null>(null);
  useEffect(() => {
    const workspaceId = platform.currentWorkspace?.id;
    const documentId = getPrimaryBackendDocumentId(state.draft);
    if (!USE_REAL_BACKEND || !workspaceId || !documentId) return;
    if (loadedRecipientsForDocumentRef.current === documentId) return;
    loadedRecipientsForDocumentRef.current = documentId;

    void realRecipientService.list(workspaceId, documentId).then((recipients) => {
      // EMPTY-STATE RECONCILIATION: a zero-length list is only authoritative
      // once this document has actually completed a sync before (marker set
      // below, in updateParticipants, or here on first observed non-empty
      // list). Before that, an empty GET on a freshly-uploaded document
      // could just mean "nobody has pushed yet" — local, not-yet-synced
      // participants must not be wiped in that case.
      if (recipients.length === 0 && !isDocumentSynced("participants", documentId)) return;
      if (recipients.length > 0) markDocumentSynced("participants", documentId);
      const { participants, routing } = buildParticipantsAndRoutingFromRecipients(recipients);
      dispatch({ type: "UPDATE_DRAFT", patch: { participants, routing } });
    }).catch(() => {
      // Non-fatal — the visitor keeps whatever local state they had
      // (possibly none) and can still add participants, which retries
      // against the backend on the next updateParticipants call.
      setSyncError("Could not load previously saved participants. Your local changes are unaffected.");
    });
  }, [platform.currentWorkspace?.id, state.draft?.files]);

  // Derived step states
  const stepStates = resolveStepStates(state.draft, state.activeStepId);

  // A field snapshot from a discarded/replaced draft must never leak into
  // the next one's readiness calculation.
  useEffect(() => { setFieldsSnapshot(null); }, [state.draft?.id]);

  // LOCAL_PERSISTENCE — real-time write-through on every draft change.
  useEffect(() => {
    if (state.draft) {
      writeJSON(PERSISTENCE_KEYS.prepareDraft, state.draft);
    } else {
      removeKey(PERSISTENCE_KEYS.prepareDraft);
    }
  }, [state.draft]);

  const createDraft = useCallback(async (opts?: {
    source?: string;
    templateId?: string;
    initialFiles?: PrepFile[];
    initialTitle?: string;
  }) => {
    dispatch({ type: "LOAD_START" });
    try {
      const draft = await prepareService.createDraft(opts);
      dispatch({ type: "LOAD_OK", draft });
      return draft.id;
    } catch (_e) {
      dispatch({ type: "LOAD_ERROR", message: "Unable to create a preparation draft. Please try again." });
      return null;
    }
  }, []);

  const resumeBackendDraft = useCallback(async (documentId: string) => {
    const workspaceId = platform.currentWorkspace?.id;
    if (workspaceId === undefined) return false;
    dispatch({ type: "LOAD_START" });
    try {
      const resumable = await loadResumableDraft(workspaceId, documentId);
      const draft = await prepareService.createDraft({
        source: "resumed-backend-draft",
        initialFiles: resumable.files,
        initialTitle: resumable.title,
      });
      // Participants are applied AFTER the draft exists, through the service
      // that owns persisting them. Assigning them onto the returned object
      // would update this render and store nothing.
      const withParticipants = resumable.participants.length === 0
        ? draft
        : await prepareService.updateParticipants(draft.id, resumable.participants);
      dispatch({ type: "LOAD_OK", draft: withParticipants });
      return true;
    } catch {
      dispatch({
        type: "LOAD_ERROR",
        message: "This draft could not be reopened. Its document may have been removed.",
      });
      return false;
    }
  }, [platform.currentWorkspace?.id]);

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
    // BACKEND DOCUMENT CLEANUP POLICY REQUIRED — Lagda-Backend has no
    // document-deletion route (traced: GET/PATCH exist on
    // /workspaces/{id}/documents/{id}, no DELETE). A discarded draft whose
    // files already reached real backend document/upload state therefore
    // leaves that document behind server-side; this only clears local
    // draft state and the in-memory File registry, and does not pretend
    // otherwise. Revisit once the backend defines one.
    clearAllFileRefs();
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
    const previous = draftRef.current?.participants ?? [];
    // REMOVAL RECONCILIATION: a participant removed here but still
    // referenced by a routing group (the caller — e.g. ParticipantsStep's
    // handleRemove — only ever edits the participants list) would otherwise
    // leave a stale id sitting in routing.groups[].participantIds until
    // RoutingStep happened to remount and re-derive its groups. That stale
    // id is exactly the kind of drift real backend sync must not paper
    // over (it would try to push a routingOrder update for a recipient
    // that no longer exists), so it is purged here, in the one place both
    // collections change together.
    const survivingIds = new Set(participants.map((p) => p.id));
    const priorRouting = draftRef.current?.routing;
    const reconciledRouting: PrepRoutingConfig | undefined =
      priorRouting && priorRouting.groups.some((g) => g.participantIds.some((id) => !survivingIds.has(id)))
        ? {
            ...priorRouting,
            groups: normalizeRoutingGroups(
              priorRouting.groups.map((g) => ({
                ...g,
                participantIds: g.participantIds.filter((id) => survivingIds.has(id)),
              })),
            ),
          }
        : undefined;

    // Optimistic, unchanged from before — the visitor's edit is never held
    // up waiting on a network round trip.
    dispatch({ type: "UPDATE_DRAFT", patch: { participants, ...(reconciledRouting ? { routing: reconciledRouting } : {}) } });
    if (state.draft) {
      prepareService.updateParticipants(state.draft.id, participants).catch(() => {});
      if (reconciledRouting) {
        prepareService.updateRouting(state.draft.id, reconciledRouting).catch(() => {});
      }
    }

    const workspaceId = platform.currentWorkspace?.id;
    const documentId = getPrimaryBackendDocumentId(state.draft);
    if (!USE_REAL_BACKEND || !workspaceId || !documentId) return;

    void syncParticipants(workspaceId, documentId, previous, participants).then((result) => {
      if (result.idReplacements.size > 0) {
        dispatch({ type: "REPLACE_PARTICIPANT_IDS", replacements: result.idReplacements });
      }
      if (result.errors.size > 0) {
        // Surfaced, not silent — but the local edit already applied above
        // and is never rolled back on a transient failure (P1 §12). The
        // visitor can retry the same edit, which re-diffs against whatever
        // did or didn't make it through last time. The sync marker is
        // deliberately NOT set on a partial failure — an empty backend GET
        // must keep being treated as "not yet confirmed" until a full pass
        // succeeds, so a stale/partially-synced local list is never wiped.
        setSyncError([...result.errors.values()][0] ?? "Some participant changes could not be saved.");
      } else {
        setSyncError(null);
        markDocumentSynced("participants", documentId);
      }
    });
  }, [state.draft, platform.currentWorkspace]);

  const updateRouting = useCallback((routing: PrepRoutingConfig) => {
    dispatch({ type: "UPDATE_DRAFT", patch: { routing } });
    if (state.draft) {
      prepareService.updateRouting(state.draft.id, routing).catch(() => {});
    }

    const workspaceId = platform.currentWorkspace?.id;
    const documentId = getPrimaryBackendDocumentId(state.draft);
    if (!USE_REAL_BACKEND || !workspaceId || !documentId) return;

    // The backend has no separate "routing group" resource — a group's
    // stepNumber IS each of its participants' routingOrder. Only
    // already-real participants can carry one; a routing group referencing
    // a still-local id is skipped here and picked up on the NEXT
    // updateParticipants sync once that participant is real (routingOrder
    // is also sent at creation time — see participant-sync.ts — so this
    // mainly matters for a REORDER of already-real participants).
    const orderByParticipantId = new Map<string, number>();
    for (const group of routing.groups) {
      for (const participantId of group.participantIds) {
        orderByParticipantId.set(participantId, group.stepNumber);
      }
    }
    const payload = [...orderByParticipantId.entries()]
      .filter(([id]) => isRealRecipientId(id))
      .map(([id, routingOrder]) => ({ id, routingOrder }));
    if (payload.length === 0) return;

    void syncRoutingOrder(workspaceId, documentId, payload).then((errors) => {
      setSyncError(errors.size > 0
        ? [...errors.values()][0] ?? "Some routing changes could not be saved."
        : null);
    });
  }, [state.draft, platform.currentWorkspace]);

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

  // These three loads are deliberately non-blocking: a failure leaves the
  // corresponding picker empty rather than stopping preparation. They must still
  // be reported, because an empty catch makes "the lookup failed" and "you have
  // none of these" indistinguishable — to the user AND to whoever debugs it.
  // `log` is the approved channel and redacts before emitting.
  const loadContacts = useCallback(async () => {
    try {
      const contacts = await prepareService.getContacts();
      dispatch({ type: "SET_CONTACTS", contacts });
    } catch (error) {
      log.warn("prepare: contact lookup failed; the contact picker will be empty", error);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const templates = await prepareService.getTemplates();
      dispatch({ type: "SET_TEMPLATES", templates });
    } catch (error) {
      log.warn("prepare: template lookup failed; the template list will be empty", error);
    }
  }, []);

  const loadResumableDrafts = useCallback(async () => {
    try {
      const drafts = await prepareService.listResumableDrafts();
      dispatch({ type: "SET_RESUMABLE", drafts });
    } catch (error) {
      log.warn("prepare: resumable-draft lookup failed; no drafts will be offered", error);
    }
  }, []);

  const value: PrepareContextValue = {
    draft:                   state.draft,
    loadState:               state.loadState,
    errorMessage:            state.errorMessage,
    syncError,
    multiDocumentSigningGap: hasMultiDocumentSigningGap(state.draft),
    isDirty:                 state.isDirty,
    activeStepId:            state.activeStepId,
    stepStates,
    contacts:                state.contacts,
    templates:               state.templates,
    resumableDrafts:         state.resumableDrafts,
    createDraft,
    loadDraft,
    resumeBackendDraft,
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
    fieldsSnapshot,
    setFieldsSnapshot,
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
