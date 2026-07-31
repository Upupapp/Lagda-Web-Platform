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
  PrepParticipantRole,
  ResumableDraftSummary,
} from "../../models/prepare";
import {
  PREP_ROLE_IS_BLOCKING,
  DEFAULT_TRANSACTION_DETAILS,
  DEFAULT_ROUTING_CONFIG,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_PREP_SETTINGS,
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

  const stepNumbers = draft.routing.groups.map(g => g.stepNumber).sort((a, b) => a - b);
  for (let i = 0; i < stepNumbers.length; i++) {
    if (stepNumbers[i] !== i + 1) {
      issues.push(mk("routing", "error", "NON_CONTIGUOUS_STEPS", "Routing step numbers are not contiguous."));
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
    const expDate = new Date(draft.settings.expiration.expiresAt);
    const today   = new Date("2026-07-15");
    if (expDate <= today) {
      issues.push(mk("settings", "error", "EXPIRATION_IN_PAST", "The expiration date must be in the future."));
    }
  }
  if (draft.settings.reminders.enabled && draft.settings.reminders.firstReminderDays < 1) {
    issues.push(mk("settings", "error", "INVALID_REMINDER_INTERVAL", "Reminder interval must be at least 1 day."));
  }

  // ── Warnings (non-blocking) ──────────────────────────────────────────────────
  if (!draft.settings.expiration.enabled) {
    issues.push(mk("settings", "warning", "NO_EXPIRATION", "No expiration date is set. Transactions without expiration remain open indefinitely."));
  }
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
  createDraft(context?: { source?: string; templateId?: string }): Promise<PreparationDraft>;
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
}

// ── Mock implementation ───────────────────────────────────────────────────────

class MockPrepareDocumentService implements IPrepareDocumentService {

  private drafts: Map<PrepDraftId, PreparationDraft> = new Map();

  async createDraft(context?: { source?: string; templateId?: string }): Promise<PreparationDraft> {
    await delay(600);
    const id: PrepDraftId = `draft_session_${Date.now()}`;
    let base: PreparationDraft;

    if (context?.templateId && MOCK_TEMPLATES.find(t => t.id === context.templateId)) {
      // Template-based: use a pre-seeded draft
      base = {
        ...DRAFT_BLANK,
        id,
        sourceContext: { source: "template", templateId: context.templateId },
        updatedAt: new Date().toISOString(),
      };
    } else {
      base = {
        ...DRAFT_BLANK,
        id,
        sourceContext: { source: (context?.source as any) ?? "new" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    this.drafts.set(id, base);
    return { ...base };
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
        stepValidity: { upload: false, participants: false, routing: false, authentication: false, settings: false, review: false, fields: false },
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
