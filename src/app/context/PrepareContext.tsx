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
import { realDocumentService } from "../services/real/document.service";
import { deleteDraftOnServer } from "../services/prepare/unfinished-draft";
import { clearAllFileRefs } from "../services/prepare/file-registry";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { DEFAULT_CONTACT_QUERY } from "../models/contacts";
import { usePlatform } from "./PlatformContext";
import { realRecipientService } from "../services/real/recipient.service";
import {
  syncParticipants, syncRoutingOrder, isRealRecipientId, buildParticipantsAndRoutingFromRecipients,
  needsInitialParticipantPush,
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
import type { TemplateApplication } from "../models/templates";
import {
  normalizeRoutingGroups,
  PREPARATION_STEPS,
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
  settingsSeen = true,
  /** Whether the field editor holds at least one placed field. */
  fieldsPlaced = false,
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
      authentication: unavail(),
      review:         unavail(),
      authorization:  unavail(),
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

  // Settings no longer bypasses the chain. It used to open as soon as files
  // existed, which was harmless when it sat fourth but would now let someone
  // skip Participants and Routing entirely.
  //
  // The chain, in the order PREPARATION_STEPS declares:
  //
  //   Documents -> Signers -> Order -> Settings -> Place Fields
  //             -> Authentication -> Review -> Authorization
  //
  // Each step opens only once the one before it is VALID, never merely
  // visited. "Visited" would unlock the next step for somebody who opened a
  // step and left it empty, which is the state this gating exists to prevent.
  //
  // Nothing is pre-selected and nothing defaults to done: an unvisited step
  // with satisfiable prerequisites reads "available", not "complete".
  const beforeFields = filesOk && participantsOk && routingOk && settingsOk;
  const beforeAuth   = beforeFields && allOk;
  const beforeReview = beforeAuth && authOk;
  // Authorization is the last gate and needs the whole draft valid. It is the
  // step that releases the document to real people, so it may not open on a
  // draft that Review itself would refuse.
  const beforeAuthorization = beforeReview && v.isValid;

  return {
    upload:         stepState("upload", true, filesOk),
    participants:   stepState("participants", filesOk, participantsOk),
    routing:        stepState("routing", participantsOk, routingOk),
    // Settings is valid from its defaults, so validity alone would tick it
    // before the sender ever opened it. Display only: gating still uses
    // settingsOk.
    settings:       stepState("settings", routingOk, settingsOk && settingsSeen),
    // Complete once a field has been placed (finding 3): the card used to
    // stay "available" forever, the one grey step between green ones.
    fields:         beforeFields
      ? (activeStepId === "fields" ? "current" : fieldsPlaced ? "complete" : "available")
      : "blocked",
    authentication: stepState("authentication", beforeAuth, authOk),
    review:         stepState("review", beforeReview, v.isValid),
    authorization:  stepState("authorization", beforeAuthorization, false),
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

/** Exported for its tests only. */
export function prepareReducer(state: PrepareState, action: PrepareAction): PrepareState {
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
          // A template's fields name the participants by the ids they had
          // BEFORE the server created them. Left alone, every one of them
          // pointed at a participant that no longer existed and arrived on
          // Place Fields as "a removed participant can't complete this".
          ...(state.draft.templateFields
            ? { templateFields: state.draft.templateFields.map((f) => (f.participantId === null ? f : { ...f, participantId: replace(f.participantId) })) }
            : {}),
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

// ── Saving the title ──────────────────────────────────────────────────────────

/** The longest title the field and the server accept. */
export const TITLE_MAX_LENGTH = 200;

export interface TitleSaveStatus {
  readonly state: "idle" | "saving" | "saved" | "failed";
  /**
   * The server saved a different title than the one typed, because that one
   * was already used in the workspace. `saved` is now the draft's title.
   */
  readonly adjusted: { readonly typed: string; readonly saved: string } | null;
}

export type TitleSaveOutcome =
  /** Nothing to save: no document yet, no title, or it is already saved. */
  | { readonly status: "skipped" }
  | { readonly status: "saved"; readonly title: string; readonly adjusted: { readonly typed: string; readonly saved: string } | null }
  | { readonly status: "failed" };

const TITLE_IDLE: TitleSaveStatus = { state: "idle", adjusted: null };
const TITLE_SKIPPED: TitleSaveOutcome = { status: "skipped" };

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
    /** Resolved participants + routing from an applied template. A snapshot:
     *  it holds no link back to the template. */
    templateApplication?: TemplateApplication;
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
  /**
   * Clears the LOCAL draft only. What the server holds is left alone: this is
   * what follows a send, and what "keep that as a draft" means.
   */
  discardDraft: () => Promise<void>;
  /**
   * "Discard draft": deletes the draft's documents on the server, then clears
   * the local draft. Rejects, with the local draft kept, when the server
   * could not delete. A draft that never reached the server is just cleared.
   */
  deleteDraftEverywhere: () => Promise<void>;

  // The title, as the server holds it
  /** How the last save of the title went. Not persisted. */
  titleSave: TitleSaveStatus;
  /** True when a document exists and its title is not the one typed. */
  titleNeedsSave: boolean;
  /**
   * Saves the typed title to the draft's document, when there is one and the
   * title is not already saved. Saves run one at a time, each with the title
   * as it stands when its turn comes. Never rejects.
   */
  saveTitle: () => Promise<TitleSaveOutcome>;
  /** Records the title the server gave a document it has just created. */
  recordServerTitle: (documentId: string, title: string) => void;

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
  // The same, but current from the moment of the render itself. The title
  // save is started from effects and event handlers of child components,
  // which run before the effect above has caught up.
  const latestDraftRef = useRef(state.draft);
  latestDraftRef.current = state.draft;
  const workspaceIdRef = useRef(platform.currentWorkspace?.id);
  workspaceIdRef.current = platform.currentWorkspace?.id;
  const [titleSave, setTitleSave] = useState<TitleSaveStatus>(TITLE_IDLE);

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
      if (recipients.length === 0 && !isDocumentSynced("participants", documentId)) {
        // PUSH THE OTHER WAY. Local participants that have never been sent.
        //
        // `syncParticipants` only ever ran from `updateParticipants` — an
        // EDIT. A draft whose participants arrive wholesale never edits them,
        // so nothing created them on the backend: a template handoff writes
        // the finished draft straight to localStorage (see
        // template-handoff.ts) and PrepareProvider rehydrates it. The
        // Participants step then looked correct while the backend had no
        // recipients at all, and the Fields step's save referenced recipient
        // ids that did not exist — rejected 422, with nothing on screen
        // explaining why.
        //
        // Creating them here closes that gap for every such path, not just
        // templates. Guarded by the same once-per-document ref above, so it
        // cannot run twice and double-create.
        const local = draftRef.current?.participants ?? [];
        if (!needsInitialParticipantPush(recipients.length, local, false)) return;
        void syncParticipants(workspaceId, documentId, [], local).then((result) => {
          if (result.idReplacements.size > 0) {
            dispatch({ type: "REPLACE_PARTICIPANT_IDS", replacements: result.idReplacements });
            // The step each person is in. Creating a recipient does not carry
            // it, so until now a draft that arrived whole (a template) left
            // everyone on the server's default step 1: the screen showed five
            // steps and the server would have asked all of them at once.
            const routing = draftRef.current?.routing;
            if (routing) {
              const orders: { id: string; routingOrder: number }[] = [];
              for (const group of routing.groups) {
                for (const id of group.participantIds) {
                  orders.push({ id: result.idReplacements.get(id) ?? id, routingOrder: group.stepNumber });
                }
              }
              void syncRoutingOrder(workspaceId, documentId, orders).then((errors) => {
                if (errors.size > 0) setSyncError([...errors.values()][0] ?? "The signing order could not be saved.");
              });
            }
          }
          if (result.errors.size > 0) {
            setSyncError([...result.errors.values()][0]
              ?? "Some participants could not be saved.");
          } else {
            setSyncError(null);
            markDocumentSynced("participants", documentId);
          }
        }).catch(() => {
          setSyncError("Could not save this document's participants. Your local changes are unaffected.");
        });
        return;
      }
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
  // Steps opened this session, per draft. Settings reads "complete" only once
  // the sender has opened it (or moved past it), not straight from defaults.
  const [visitedSteps, setVisitedSteps] = useState<{ draftId: string | null; ids: ReadonlySet<PreparationStepId> }>({ draftId: null, ids: new Set() });
  const draftId = state.draft?.id ?? null;
  const activeStepId = state.activeStepId;
  useEffect(() => {
    setVisitedSteps(prev => {
      const ids = prev.draftId === draftId ? prev.ids : new Set<PreparationStepId>();
      if (activeStepId === null || ids.has(activeStepId)) return prev.draftId === draftId ? prev : { draftId, ids };
      return { draftId, ids: new Set([...ids, activeStepId]) };
    });
  }, [draftId, activeStepId]);
  const seen = visitedSteps.draftId === draftId ? visitedSteps.ids : new Set<PreparationStepId>();
  const settingsIndex = PREPARATION_STEPS.findIndex(s => s.id === "settings");
  const settingsSeen = PREPARATION_STEPS.some((s, i) => i >= settingsIndex && seen.has(s.id));
  const stepStates = resolveStepStates(state.draft, state.activeStepId, settingsSeen, (fieldsSnapshot?.length ?? 0) > 0);

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
    templateApplication?: TemplateApplication;
    initialFiles?: PrepFile[];
    initialTitle?: string;
  }) => {
    dispatch({ type: "LOAD_START" });
    try {
      const draft = await prepareService.createDraft(opts);
      setTitleSave(TITLE_IDLE);
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
      // The title came FROM the server, so it is already saved there. Without
      // this note the first save would rename the document to its own title.
      const withSavedTitle = await prepareService.updateTransactionDetails(draft.id, {
        ...withParticipants.details,
        savedTitle: { documentId, title: resumable.title.trim() },
      });
      setTitleSave(TITLE_IDLE);
      dispatch({ type: "LOAD_OK", draft: withSavedTitle });
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

  // LOCAL ONLY, on purpose. This is what follows a send (the document is now
  // a signing request and must stay) and what "keep that as a draft" means.
  // "Discard draft" is deleteDraftEverywhere below, which deletes on the
  // server first.
  const discardDraft = useCallback(async () => {
    const current = latestDraftRef.current;
    if (current) {
      await prepareService.discardDraft(current.id).catch(() => {});
    }
    clearAllFileRefs();
    setTitleSave(TITLE_IDLE);
    dispatch({ type: "DISCARD" });
  }, []);

  const deleteDraftEverywhere = useCallback(async () => {
    // The demo build has nothing on a server, and makes no call.
    if (USE_REAL_BACKEND) {
      // Throws when a document could not be deleted: the local draft is then
      // still here, exactly as it was, for the caller to say so.
      await deleteDraftOnServer(workspaceIdRef.current, latestDraftRef.current);
    }
    await discardDraft();
  }, [discardDraft]);

  // ── The title, saved early ────────────────────────────────────────────────
  //
  // The document is created with its FILE's name, and the title the sender
  // types used to reach the server only at Send, with a failure swallowed. It
  // is now saved as soon as there is a document to save it to. The server may
  // answer with a different title (it numbers one that is already used); that
  // title then becomes the draft's.
  /** Saves wait their turn here, so two never race for the last word. */
  const titleQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const writeDetails = useCallback((draftId: PrepDraftId, details: TransactionDetailsDraft) => {
    dispatch({ type: "UPDATE_DRAFT", patch: { details } });
    prepareService.updateTransactionDetails(draftId, details).catch(() => {});
  }, []);

  const saveTitle = useCallback((): Promise<TitleSaveOutcome> => {
    if (!USE_REAL_BACKEND) return Promise.resolve(TITLE_SKIPPED);

    const run = async (): Promise<TitleSaveOutcome> => {
      const before = latestDraftRef.current;
      const workspaceId = workspaceIdRef.current;
      const documentId = getPrimaryBackendDocumentId(before);
      if (!before || !workspaceId || !documentId) return TITLE_SKIPPED;
      const typed = before.details.title.trim();
      // Never an empty title, and never one the field itself refuses.
      if (typed === "" || typed.length > TITLE_MAX_LENGTH) return TITLE_SKIPPED;
      const saved = before.details.savedTitle;
      if (saved?.documentId === documentId && saved.title === typed) {
        // Typed back to what is saved: an earlier failure no longer applies.
        setTitleSave(current => (current.state === "failed" ? TITLE_IDLE : current));
        return TITLE_SKIPPED;
      }

      setTitleSave(current => ({ state: "saving", adjusted: current.adjusted }));
      try {
        const document = await realDocumentService.rename(workspaceId, documentId, typed);
        const serverTitle = typeof document.title === "string" ? document.title.trim() : "";
        // An older server does not say; that means "saved as typed".
        const wasAdjusted = document.titleAdjusted === true && serverTitle !== "" && serverTitle !== typed;
        const nowSaved = wasAdjusted ? serverTitle : typed;

        const after = latestDraftRef.current;
        let adjusted: { typed: string; saved: string } | null = null;
        if (after && after.id === before.id) {
          // The field takes the server's title only if it still holds what
          // was sent. Somebody who kept typing keeps what they typed, and
          // that is saved in its own turn.
          const untouched = after.details.title.trim() === typed;
          if (wasAdjusted && untouched) adjusted = { typed, saved: serverTitle };
          writeDetails(after.id, {
            ...after.details,
            title: wasAdjusted && untouched ? serverTitle : after.details.title,
            savedTitle: { documentId, title: nowSaved },
          });
        }
        setTitleSave({ state: "saved", adjusted });
        return { status: "saved", title: nowSaved, adjusted };
      } catch (error) {
        log.warn("prepare: the document title could not be saved", error);
        setTitleSave({ state: "failed", adjusted: null });
        return { status: "failed" };
      }
    };

    const next = titleQueueRef.current.then(run, run);
    titleQueueRef.current = next;
    return next;
  }, [writeDetails]);

  const recordServerTitle = useCallback((documentId: string, title: string) => {
    const current = latestDraftRef.current;
    if (!current) return;
    const saved = current.details.savedTitle;
    // One note, for the document the title belongs to. A second file's
    // document must not overwrite the first's.
    if (saved !== undefined && saved.documentId !== documentId) return;
    writeDetails(current.id, { ...current.details, savedTitle: { documentId, title: title.trim() } });
  }, [writeDetails]);

  const primaryDocumentId = getPrimaryBackendDocumentId(state.draft);
  const typedTitle = state.draft?.details.title.trim() ?? "";
  const savedTitle = state.draft?.details.savedTitle;
  const titleNeedsSave = USE_REAL_BACKEND
    && primaryDocumentId !== undefined
    && typedTitle !== "" && typedTitle.length <= TITLE_MAX_LENGTH
    && !(savedTitle?.documentId === primaryDocumentId && savedTitle.title === typedTitle);

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
        stepValidity: { upload: false, participants: false, routing: false, authentication: false, settings: false, review: false, fields: false, authorization: false },
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
  // With a backend, "Add from contacts" offers the workspace's real address
  // book (the contacts this person can see), not the demonstration list.
  const contactsWorkspaceId = platform.currentWorkspace?.id;
  const loadContacts = useCallback(async () => {
    try {
      if (USE_REAL_BACKEND && contactsWorkspaceId) {
        const { listContacts } = await import("../services/contacts-source");
        const page = await listContacts(contactsWorkspaceId, { ...DEFAULT_CONTACT_QUERY, perPage: 100 });
        dispatch({
          type: "SET_CONTACTS",
          contacts: page.items.map(c => ({
            id: c.id, name: c.name, email: c.email, organization: c.organization ?? "",
            lastUsedAt: c.lastUsedAt ?? c.updatedAt, tagIds: c.tagIds,
          })),
        });
        return;
      }
      const contacts = await prepareService.getContacts();
      dispatch({ type: "SET_CONTACTS", contacts });
    } catch (error) {
      log.warn("prepare: contact lookup failed; the contact picker will be empty", error);
    }
  }, [contactsWorkspaceId]);

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
    deleteDraftEverywhere,
    titleSave,
    titleNeedsSave,
    saveTitle,
    recordServerTitle,
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
