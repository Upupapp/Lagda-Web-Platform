// Mock preparation service for /app/prepare.
// No real uploads, no real invitations, no real persistence.
// All operations are in-memory and deterministic.
// Replace MockPrepareDocumentService with RealPrepareDocumentService at integration time.

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
  PrepValidationIssue,
  PreparationStepId,
  PrepSource,
  ResumableDraftSummary,
} from "../../models/prepare";
import {
  PREP_ROLE_IS_BLOCKING,
  getAuthMethodConfig,
} from "../../models/prepare";
import {
  DRAFT_FIXTURES,
  DRAFT_BLANK,
  RESUMABLE_DRAFTS,
  MOCK_CONTACTS,
  MOCK_TEMPLATES,
  type MockContact,
  type MockTemplateSummary,
} from "../../data/mock/prepare";
import type { TemplateApplication } from "../../models/templates";
import { delay } from "./delay";

// ── Validation helpers ────────────────────────────────────────────────────────

function validateDraftState(draft: PreparationDraft): PrepValidationResult {
  const issues: PrepValidationIssue[] = [];
  let issueIdx = 0;

  const mk = (
    stepId: PreparationStepId,
    severity: "error" | "warning",
    code: string,
    message: string,
    extra?: Partial<PrepValidationIssue>,
  ): PrepValidationIssue => ({
    id: `vi_${++issueIdx}`,
    stepId,
    severity,
    code,
    message,
    ...extra,
  });

  // ── Files step ──────────────────────────────────────────────────────────────
  if (draft.files.length === 0) {
    issues.push(mk("upload", "error", "NO_FILES", "At least one document file must be selected."));
  } else {
    const invalidFiles = draft.files.filter(f => f.fileState !== "ready");
    invalidFiles.forEach(f =>
      issues.push(mk("upload", "error", "INVALID_FILE", `"${f.fileName}" is not in a ready state (${f.fileState}).`)),
    );
    // fileState alone is a client-side selection classification, set the
    // moment a file is picked — it says nothing about whether the real
    // upload to the backend actually finished. uploadStatus is that signal
    // and is undefined in mock mode (no real upload happens), so only gate
    // on it when it's actually present.
    draft.files.forEach(f => {
      if (f.uploadStatus === "failed") {
        issues.push(mk("upload", "error", "UPLOAD_FAILED",
          `"${f.fileName}" failed to upload${f.uploadError ? `: ${f.uploadError}` : "."}`));
      } else if (f.uploadStatus === "uploading" || f.uploadStatus === "processing") {
        issues.push(mk("upload", "error", "UPLOAD_IN_PROGRESS",
          `"${f.fileName}" is still uploading — wait for it to finish before continuing.`));
      } else if (f.uploadStatus === "needs-reselection") {
        issues.push(mk("upload", "error", "UPLOAD_NEEDS_RESELECTION",
          `"${f.fileName}" needs to be re-selected before continuing.`));
      }
    });
    const names = draft.files.map(f => f.fileName);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) {
      issues.push(mk("upload", "warning", "DUPLICATE_FILENAME", "One or more files share the same filename."));
    }
    if (draft.files.length > 5) {
      issues.push(mk("upload", "warning", "MANY_FILES", "This draft contains more than 5 files. Consider whether all are necessary."));
    }
  }

  const titleTrimmed = draft.details.title.trim();
  if (!titleTrimmed) {
    issues.push(mk("upload", "error", "NO_TITLE", "A transaction title is required."));
  } else if (titleTrimmed.length > 200) {
    issues.push(mk("upload", "error", "TITLE_TOO_LONG", "Transaction title must be 200 characters or fewer."));
  }

  // ── Participants step ────────────────────────────────────────────────────────
  const blockingParticipants = draft.participants.filter(
    p => PREP_ROLE_IS_BLOCKING[p.role] && p.isRequired,
  );
  if (blockingParticipants.length === 0 && draft.participants.length > 0) {
    issues.push(mk("participants", "error", "NO_REQUIRED_PARTICIPANT",
      "At least one participant with a required blocking role (Signer, Approver, Reviewer, or Acknowledgment Recipient) must be added."));
  }
  if (draft.participants.length === 0) {
    issues.push(mk("participants", "error", "NO_PARTICIPANTS", "At least one participant must be added."));
  }

  const emailsSeen = new Set<string>();
  draft.participants.forEach(p => {
    if (!p.name.trim()) {
      issues.push(mk("participants", "error", "MISSING_NAME", `Participant "${p.email || p.id}" is missing a name.`, { participantId: p.id }));
    }
    if (!p.email.trim()) {
      issues.push(mk("participants", "error", "MISSING_EMAIL", `Participant "${p.name || p.id}" is missing an email address.`, { participantId: p.id }));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) {
      issues.push(mk("participants", "error", "INVALID_EMAIL", `"${p.email}" does not appear to be a valid email address.`, { participantId: p.id }));
    } else {
      const lower = p.email.toLowerCase().trim();
      if (emailsSeen.has(lower)) {
        issues.push(mk("participants", "error", "DUPLICATE_EMAIL", `Email address "${p.email}" appears more than once.`, { participantId: p.id }));
      }
      emailsSeen.add(lower);
    }
    if (p.role === "carbon-copy" && p.isRequired) {
      issues.push(mk("participants", "warning", "CC_MARKED_REQUIRED",
        `Copy Recipient "${p.name || p.email}" is marked required but cannot block completion.`, { participantId: p.id }));
    }
  });

  // ── Routing step ─────────────────────────────────────────────────────────────
  const blockingPaxIds = draft.participants
    .filter(p => PREP_ROLE_IS_BLOCKING[p.role] && p.isRequired)
    .map(p => p.id);

  const assignedPaxIds = new Set(draft.routing.groups.flatMap(g => g.participantIds));

  if (draft.participants.length > 0 && draft.routing.groups.length === 0) {
    issues.push(mk("routing", "error", "NO_ROUTING_GROUPS", "At least one routing step must be configured."));
  }

  blockingPaxIds.forEach(paxId => {
    if (!assignedPaxIds.has(paxId)) {
      const pax = draft.participants.find(p => p.id === paxId);
      issues.push(mk("routing", "error", "PARTICIPANT_NOT_ROUTED",
        `Participant "${pax?.name || paxId}" is required but has not been assigned to a routing step.`, { participantId: paxId }));
    }
  });

  // Kept as a defensive check — normalizeRoutingGroups() (models/prepare.ts)
  // is now the single place step numbers get assigned, called from every
  // mutation site, so this should be unreachable in normal use. It stays as
  // a safety net for anything that constructs a draft outside that path
  // (e.g. a hand-edited localStorage value).
  const stepNumbers = draft.routing.groups.map(g => g.stepNumber).sort((a, b) => a - b);
  for (let i = 0; i < stepNumbers.length; i++) {
    if (stepNumbers[i] !== i + 1) {
      issues.push(mk("routing", "error", "NON_CONTIGUOUS_STEPS",
        "There's a gap in your routing order. Reorder the steps or remove an empty step to continue."));
      break;
    }
  }

  draft.routing.groups.forEach(g => {
    if (g.participantIds.length === 0) {
      issues.push(mk("routing", "error", "EMPTY_ROUTING_STEP",
        `Routing step ${g.stepNumber} (${g.label || `Step ${g.stepNumber}`}) has no participants.`, { groupId: g.id }));
    }
    const dups = g.participantIds.filter((id, i) => g.participantIds.indexOf(id) !== i);
    if (dups.length > 0) {
      issues.push(mk("routing", "error", "DUPLICATE_IN_STEP",
        `Routing step ${g.stepNumber} contains the same participant more than once.`, { groupId: g.id }));
    }
  });

  if (draft.routing.mode === "approval-based") {
    const firstGroup = draft.routing.groups.find(g => g.stepNumber === 1);
    if (firstGroup) {
      const approvers = draft.participants.filter(
        p => (p.role === "approver" || p.role === "reviewer") && firstGroup.participantIds.includes(p.id),
      );
      if (approvers.length === 0) {
        issues.push(mk("routing", "error", "APPROVAL_STEP_MISSING",
          "Approval-based routing requires an Approver or Reviewer in the first routing step."));
      }
    }
  }

  // ── Authentication step ──────────────────────────────────────────────────────
  const defaultMethodConfig = getAuthMethodConfig(draft.auth.defaultMethod);
  if (defaultMethodConfig.availability === "planned") {
    issues.push(mk("authentication", "error", "AUTH_METHOD_NOT_AVAILABLE",
      `The selected default authentication method (${defaultMethodConfig.label}) is not yet available in this demonstration.`));
  }
  if (defaultMethodConfig.availability === "enterprise") {
    issues.push(mk("authentication", "warning", "AUTH_METHOD_ENTERPRISE",
      `The selected authentication method (${defaultMethodConfig.label}) requires an Enterprise plan.`));
  }

  // ── Settings step (mostly optional) ─────────────────────────────────────────
  if (draft.settings.expiration.enabled && draft.settings.expiration.expiresAt) {
    // Real current time, not a fixture date — this must correctly catch a
    // draft that had a valid future expiration when created but has since
    // become stale (e.g. restored from localStorage days later). Compared
    // at day granularity so "today" itself is never wrongly flagged as
    // already past, matching the date input's own `min={today}` below.
    const expDate = new Date(`${draft.settings.expiration.expiresAt}T00:00:00`);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (expDate < startOfToday) {
      issues.push(mk("settings", "error", "EXPIRATION_IN_PAST", "This expiration date has already passed — choose a new date to continue."));
    }
  }
  if (draft.settings.reminders.enabled && draft.settings.reminders.firstReminderDays < 1) {
    issues.push(mk("settings", "error", "INVALID_REMINDER_INTERVAL", "Reminder interval must be at least 1 day."));
  }

  // ── Warnings (non-blocking) ──────────────────────────────────────────────────
  // No "expiration not set" warning here deliberately: expiration.enabled
  // defaults to false, so warning about the default on every fresh document
  // is just alert fatigue for a legitimate, common choice. It's still shown
  // neutrally (no warning styling) in the Settings step's "Reminders &
  // Expiry" summary card.
  if (!draft.settings.reminders.enabled) {
    issues.push(mk("settings", "warning", "REMINDERS_DISABLED", "Reminders are disabled. Participants will not receive automated follow-up in production."));
  }
  if (draft.auth.defaultMethod === "none") {
    issues.push(mk("authentication", "warning", "WEAKEST_AUTH",
      "Secure Invitation Link is the only access control. Consider Email Code for additional confirmation."));
  }

  const errors   = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");

  const stepValidity: Record<PreparationStepId, boolean> = {
    upload:         errors.filter(i => i.stepId === "upload").length === 0 && !!titleTrimmed && draft.files.length > 0,
    participants:   errors.filter(i => i.stepId === "participants").length === 0 && draft.participants.length > 0,
    routing:        errors.filter(i => i.stepId === "routing").length === 0,
    authentication: errors.filter(i => i.stepId === "authentication").length === 0,
    settings:       errors.filter(i => i.stepId === "settings").length === 0,
    review:         errors.length === 0,
    fields:         false, // determined by markReadyForFieldPlacement
    // Authorization is an ACT, not a configuration. There is no field to
    // fill, so it is never "valid" in the sense the other steps are — it is
    // done by pressing Authorize, which leaves the draft entirely.
    authorization:  false,
  };

  const readyForFieldPlacement = errors.length === 0 && draft.participants.length > 0 && draft.files.length > 0 && !!titleTrimmed;

  return {
    isValid: errors.length === 0,
    issues,
    errors,
    warnings,
    readyForFieldPlacement,
    stepValidity,
  };
}

// ── Service interface ─────────────────────────────────────────────────────────

export interface IPrepareDocumentService {
  createDraft(context?: {
    source?: string;
    /** Provenance only. Never a key anything resolves routing or participants
     *  through — see the createDraft implementation. */
    templateId?: string;
    /** The resolved participants + routing snapshot produced by
     *  services/prepare/template-apply.ts. Self-contained: it carries no link
     *  back to the template, so a later edit to that template cannot reach
     *  the draft built from it. */
    templateApplication?: TemplateApplication;
    /** Pre-populates the new draft's files — used to hand off a document
     *  selected before authentication (see PendingPreparationContext). */
    initialFiles?: PrepFile[];
    initialTitle?: string;
  }): Promise<PreparationDraft>;
  getDraft(draftId: PrepDraftId): Promise<PreparationDraft | null>;
  listResumableDrafts(): Promise<ResumableDraftSummary[]>;
  updateFiles(draftId: PrepDraftId, files: PrepFile[]): Promise<PreparationDraft>;
  updateTransactionDetails(draftId: PrepDraftId, details: TransactionDetailsDraft): Promise<PreparationDraft>;
  updateParticipants(draftId: PrepDraftId, participants: PrepParticipant[]): Promise<PreparationDraft>;
  updateRouting(draftId: PrepDraftId, routing: PrepRoutingConfig): Promise<PreparationDraft>;
  updateAuthentication(draftId: PrepDraftId, auth: PrepAuthConfig): Promise<PreparationDraft>;
  updateSettings(draftId: PrepDraftId, settings: PrepSettings): Promise<PreparationDraft>;
  validateDraft(draftId: PrepDraftId): Promise<PrepValidationResult>;
  markReadyForFieldPlacement(draftId: PrepDraftId): Promise<PreparationDraft>;
  discardDraft(draftId: PrepDraftId): Promise<void>;
  getContacts(): Promise<MockContact[]>;
  getTemplates(): Promise<MockTemplateSummary[]>;
  /** LOCAL_PERSISTENCE — see PrepareContext's hydration effect. */
  seedDraft(draft: PreparationDraft): void;
}

// ── Mock implementation ───────────────────────────────────────────────────────

// `createDraft` accepts a plain `string` source because callers pass a route or
// entry-point name. Narrowing it here — rather than asserting it — means an
// unrecognised entry point starts a normal blank draft instead of writing a
// value outside `PrepSource` into the draft and corrupting every later branch
// that switches on it.
const PREP_SOURCES: readonly PrepSource[] = [
  "new", "template", "dashboard", "documents", "transaction-draft", "direct", "public-upload",
];

function toPrepSource(value: string | undefined): PrepSource {
  return PREP_SOURCES.find((s) => s === value) ?? "new";
}

// Monotonic within the session, so two drafts created in the same millisecond
// still get distinct ids. See createDraft.
let draftSequence = 0;

class MockPrepareDocumentService implements IPrepareDocumentService {

  private drafts: Map<PrepDraftId, PreparationDraft> = new Map();

  async createDraft(context?: {
    source?: string;
    templateId?: string;
    templateApplication?: TemplateApplication;
    initialFiles?: PrepFile[];
    initialTitle?: string;
  }): Promise<PreparationDraft> {
    await delay(600);
    // A bare Date.now() collided: two drafts created within the same
    // millisecond got the SAME id, and the second silently overwrote the first
    // in the drafts map — one draft ceased to exist, with no error anywhere.
    // The counter makes the id unique regardless of clock resolution; nothing
    // parses this string, so its shape is free.
    const id: PrepDraftId = `draft_session_${Date.now()}_${++draftSequence}`;
    let base: PreparationDraft;

    if (context?.templateApplication) {
      // ── A template was applied ────────────────────────────────────────────
      //
      // This branch used to return `{ ...DRAFT_BLANK }` with nothing but a
      // sourceContext set — so "Use Template" landed the visitor on an empty
      // Participants step, having discarded the roles they had just filled in.
      //
      // It now seeds the participants and routing that template-apply
      // resolved. What arrives here is already a SNAPSHOT: plain arrays with
      // no template id inside them. They are COPIED again on the way in, so
      // the caller cannot keep a handle on the draft's arrays and mutate them
      // afterwards either.
      const { participants, routing } = context.templateApplication;
      base = {
        ...DRAFT_BLANK,
        id,
        participants: participants.map(p => ({ ...p })),
        routing: { mode: routing.mode, groups: routing.groups.map(g => ({ ...g, participantIds: [...g.participantIds] })) },
        // `templateId` is recorded for PROVENANCE ONLY — "this draft began
        // from that template" — and nothing reads it to resolve routing or
        // participants. It must never become a lookup key: the moment
        // something re-reads the template through it, editing that template
        // starts changing drafts already made from it.
        sourceContext: { source: "template", templateId: context.templateId },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else if (context?.templateId && MOCK_TEMPLATES.find(t => t.id === context.templateId)) {
      // A template id with no resolved application. Nothing to pre-fill from,
      // so this stays a blank draft rather than guessing — the roles have not
      // been mapped to real people yet.
      base = {
        ...DRAFT_BLANK,
        id,
        sourceContext: { source: "template", templateId: context.templateId },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      base = {
        ...DRAFT_BLANK,
        id,
        sourceContext: { source: toPrepSource(context?.source) },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Hand off a document selected before authentication — see
    // PendingPreparationContext.claimPending(). Files were already validated
    // by the same classifyFiles() the authenticated Documents step uses.
    if (context?.initialFiles && context.initialFiles.length > 0) {
      base = {
        ...base,
        files: context.initialFiles,
        details: context.initialTitle
          ? { ...base.details, title: context.initialTitle }
          : base.details,
      };
    }

    this.drafts.set(id, base);
    return { ...base };
  }

  // LOCAL_PERSISTENCE — re-registers a draft restored from localStorage (see
  // PrepareContext's hydration effect) into this service's in-memory map, so
  // later calls like updateFiles(draftId, ...) find it instead of silently
  // no-op'ing against an id this service instance has never seen. Synchronous
  // and side-effect-only; not part of IPrepareDocumentService since nothing
  // outside the hydration path should ever call it.
  seedDraft(draft: PreparationDraft): void {
    this.drafts.set(draft.id, { ...draft });
  }

  async getDraft(draftId: PrepDraftId): Promise<PreparationDraft | null> {
    await delay(300);
    if (this.drafts.has(draftId)) {
      return { ...this.drafts.get(draftId)! };
    }
    if (DRAFT_FIXTURES[draftId]) {
      const f = { ...DRAFT_FIXTURES[draftId] };
      this.drafts.set(draftId, f);
      return { ...f };
    }
    return null;
  }

  async listResumableDrafts(): Promise<ResumableDraftSummary[]> {
    await delay(400);
    return RESUMABLE_DRAFTS.map(d => ({ ...d }));
  }

  private update(draftId: PrepDraftId, patch: Partial<PreparationDraft>): PreparationDraft {
    const existing = this.drafts.get(draftId);
    if (!existing) throw new Error(`Draft ${draftId} not found in session`);
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.drafts.set(draftId, updated);
    return { ...updated };
  }

  async updateFiles(draftId: PrepDraftId, files: PrepFile[]): Promise<PreparationDraft> {
    await delay(200);
    return this.update(draftId, { files });
  }

  async updateTransactionDetails(draftId: PrepDraftId, details: TransactionDetailsDraft): Promise<PreparationDraft> {
    await delay(200);
    return this.update(draftId, { details });
  }

  async updateParticipants(draftId: PrepDraftId, participants: PrepParticipant[]): Promise<PreparationDraft> {
    await delay(200);
    return this.update(draftId, { participants });
  }

  async updateRouting(draftId: PrepDraftId, routing: PrepRoutingConfig): Promise<PreparationDraft> {
    await delay(200);
    return this.update(draftId, { routing });
  }

  async updateAuthentication(draftId: PrepDraftId, auth: PrepAuthConfig): Promise<PreparationDraft> {
    await delay(200);
    return this.update(draftId, { auth });
  }

  async updateSettings(draftId: PrepDraftId, settings: PrepSettings): Promise<PreparationDraft> {
    await delay(200);
    return this.update(draftId, { settings });
  }

  async validateDraft(draftId: PrepDraftId): Promise<PrepValidationResult> {
    await delay(300);
    const draft = this.drafts.get(draftId) ?? DRAFT_FIXTURES[draftId];
    if (!draft) {
      return {
        isValid: false,
        issues: [{ id: "vi_notfound", stepId: "upload", severity: "error", code: "DRAFT_NOT_FOUND", message: "Draft not found." }],
        errors: [{ id: "vi_notfound", stepId: "upload", severity: "error", code: "DRAFT_NOT_FOUND", message: "Draft not found." }],
        warnings: [],
        readyForFieldPlacement: false,
        stepValidity: { upload: false, participants: false, routing: false, authentication: false, settings: false, review: false, fields: false, authorization: false },
      };
    }
    return validateDraftState(draft);
  }

  async markReadyForFieldPlacement(draftId: PrepDraftId): Promise<PreparationDraft> {
    await delay(300);
    const draft = this.drafts.get(draftId) ?? DRAFT_FIXTURES[draftId];
    if (!draft) throw new Error("Draft not found");
    const validation = validateDraftState(draft);
    if (!validation.readyForFieldPlacement) {
      throw new Error("Draft has blocking errors and cannot proceed to field placement.");
    }
    return this.update(draftId, { status: "ready-for-field-placement" });
  }

  async discardDraft(draftId: PrepDraftId): Promise<void> {
    await delay(300);
    this.drafts.delete(draftId);
  }

  async getContacts(): Promise<MockContact[]> {
    await delay(300);
    return MOCK_CONTACTS.map(c => ({ ...c }));
  }

  async getTemplates(): Promise<MockTemplateSummary[]> {
    await delay(300);
    return MOCK_TEMPLATES.map(t => ({ ...t }));
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const prepareService: IPrepareDocumentService = new MockPrepareDocumentService();
export { validateDraftState };
