// Workflow — reusable process design, and the live runs started from it.
//
// ── How this relates to what already exists ──────────────────────────────────
//
// This is the THIRD thing in this codebase with "workflow" in its name, so the
// boundaries matter:
//
//   - C32 `workflow-automation` — rules and policies that react to events.
//     Unrelated. Enterprise-preview. No imports either way.
//   - C37 `signing-workflow` — stage-based recipient routing for ONE document,
//     reached from that document's detail page. Its stage machinery is the
//     right machinery; what it cannot express is "design this once, run it
//     twenty times".
//   - This module — the reusable layer above C37's: a WorkflowTemplate anyone
//     can start repeatedly, and a WorkflowRun for each start.
//
// `StageParticipantAction` is imported from signing-workflow rather than
// redeclared. That union maps 1:1 onto `PrepParticipantRole` and C37 treats the
// mapping as a hard rule, so a second, drifting copy of "what a person does on
// a stage" is exactly the defect this codebase keeps rediscovering. The stage
// KIND below is genuinely new: C37's `SigningStageType` is structural
// ("action" | "distribution"), while a template author is choosing something
// semantic — is this the review step or the signature step.

import type { StageParticipantAction } from "./signing-workflow";
import { BLOCKING_ACTIONS } from "./signing-workflow";

// ── Branded identifiers ───────────────────────────────────────────────────────

export type WorkflowTemplateId = string & { readonly __brand: "WorkflowTemplateId" };
export type WorkflowRunId      = string & { readonly __brand: "WorkflowRunId" };
export type WorkflowStageId    = string & { readonly __brand: "WorkflowStageId" };
export type WorkflowSlotId     = string & { readonly __brand: "WorkflowSlotId" };

export const templateId = (v: string) => v as WorkflowTemplateId;
export const runId      = (v: string) => v as WorkflowRunId;
export const stageId    = (v: string) => v as WorkflowStageId;
export const slotId     = (v: string) => v as WorkflowSlotId;

// ── Limits ────────────────────────────────────────────────────────────────────

export const WORKFLOW_NAME_MAX        = 120;
export const WORKFLOW_DESCRIPTION_MAX = 400;
export const STAGE_NAME_MAX           = 80;
export const STAGE_DESCRIPTION_MAX    = 240;
export const MAX_STAGES_PER_TEMPLATE  = 12;
export const MAX_SLOTS_PER_STAGE      = 20;

// ── Stage kind ────────────────────────────────────────────────────────────────

export type WorkflowStageKind =
  | "prepare"
  | "review"
  | "approval"
  | "signature"
  | "verification"
  | "notification"
  | "archive";

export const WORKFLOW_STAGE_KINDS: readonly WorkflowStageKind[] = [
  "prepare", "review", "approval", "signature", "verification", "notification", "archive",
];

export const STAGE_KIND_LABELS: Record<WorkflowStageKind, string> = {
  prepare:      "Upload & Prepare",
  review:       "Review",
  approval:     "Approval",
  signature:    "Signature",
  verification: "Verification",
  notification: "Notification",
  archive:      "Archive & Complete",
};

export const STAGE_KIND_DESCRIPTIONS: Record<WorkflowStageKind, string> = {
  prepare:      "Documents are added and fields are placed before anyone is asked to act.",
  review:       "Assigned people read the document and record a review decision. A review is not an approval.",
  approval:     "Assigned people give an explicit approval decision. Approval is not a signature.",
  signature:    "Assigned people complete their own signing fields.",
  verification: "The completed document is checked against its verification record.",
  notification: "People are informed. Nobody is asked to act, so this stage never blocks.",
  archive:      "The run is closed and its documents and audit trail are retained.",
};

/**
 * The action a stage of this kind asks its people to take.
 *
 * Notification and archive stages ask for nothing, which is why they map to
 * `receive-copy` — an action C37 already classifies as non-blocking. Encoding
 * that here rather than at each call site is what stops a notification stage
 * ever being able to hold a run up.
 */
export const STAGE_KIND_DEFAULT_ACTION: Record<WorkflowStageKind, StageParticipantAction> = {
  prepare:      "review",
  review:       "review",
  approval:     "approve",
  signature:    "sign",
  verification: "review",
  notification: "receive-copy",
  archive:      "receive-copy",
};

/** True when a stage of this kind can hold the run at its position. */
export function stageKindBlocks(kind: WorkflowStageKind): boolean {
  return BLOCKING_ACTIONS.includes(STAGE_KIND_DEFAULT_ACTION[kind]);
}

// ── Participant slots (template level) ────────────────────────────────────────

/**
 * A template names ROLES, not people — that is what makes it reusable. A slot
 * is filled with a real participant when a run is started.
 */
export type WorkflowSlotKind = "role" | "team" | "specific-user" | "external";

export const SLOT_KIND_LABELS: Record<WorkflowSlotKind, string> = {
  "role":          "Role",
  "team":          "Team",
  "specific-user": "Specific person",
  "external":      "External recipient",
};

export interface WorkflowParticipantSlot {
  id:   WorkflowSlotId;
  /** What this slot is for, e.g. "Legal Reviewer". Shown to whoever starts a run. */
  label: string;
  kind:  WorkflowSlotKind;
  action: StageParticipantAction;
  /** A run cannot start until every required slot is filled. */
  required: boolean;
  /** Pre-filled suggestion. Never a commitment — the starter can always change it. */
  suggestedName: string | null;
}

// ── Template stage ────────────────────────────────────────────────────────────

export interface WorkflowTemplateStage {
  id:          WorkflowStageId;
  name:        string;
  description: string | null;
  /** 1-based and always contiguous after a reorder. */
  position:    number;
  kind:        WorkflowStageKind;
  slots:       WorkflowParticipantSlot[];
  /**
   * `all` — every required person must act. `any` — the first is enough.
   * Kept to two values on purpose; quorum rules are a product decision nobody
   * has made, and inventing one here would be a claim about how LAGDA behaves.
   */
  completion:  "all" | "any";
  /** Guidance text only. This build schedules nothing. */
  dueDateDirection: string | null;
  instruction:      string | null;
}

// ── Template ──────────────────────────────────────────────────────────────────

export type WorkflowTemplateStatus = "draft" | "active" | "archived";

export const TEMPLATE_STATUS_LABELS: Record<WorkflowTemplateStatus, string> = {
  draft:    "Draft",
  active:   "Active",
  archived: "Archived",
};

export type WorkflowCategory =
  | "legal"
  | "hr"
  | "procurement"
  | "government"
  | "finance"
  | "general";

export const WORKFLOW_CATEGORIES: readonly WorkflowCategory[] = [
  "legal", "hr", "procurement", "government", "finance", "general",
];

export const WORKFLOW_CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  legal:       "Legal",
  hr:          "HR",
  procurement: "Procurement",
  government:  "Government / LGU",
  finance:     "Finance",
  general:     "General",
};

export interface WorkflowTemplate {
  id:          WorkflowTemplateId;
  workspaceId: string;
  name:        string;
  description: string | null;
  category:    WorkflowCategory;
  status:      WorkflowTemplateStatus;
  stages:      WorkflowTemplateStage[];

  /** Guidance shown before starting. Not a scheduled SLA. */
  estimatedCompletion: string | null;

  createdBy:              string;
  createdAtDemonstration: string;
  updatedAtDemonstration: string;
  lastUsedAtDemonstration: string | null;

  /**
   * How many runs have ever been started from this template. The whole point of
   * a template is that this number can grow without the template changing.
   */
  initiationCount: number;

  demonstrationOnly: true;
}

// ── Run (initiation) ──────────────────────────────────────────────────────────

export type WorkflowRunStatus =
  | "not-started"
  | "in-progress"
  | "blocked"
  | "overdue"
  | "completed"
  | "cancelled";

export const RUN_STATUS_LABELS: Record<WorkflowRunStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "blocked":     "Blocked",
  "overdue":     "Overdue",
  "completed":   "Completed",
  "cancelled":   "Cancelled",
};

export type WorkflowStageStatus =
  | "not-started"
  | "waiting"
  | "in-progress"
  | "needs-review"
  | "needs-signature"
  | "completed"
  | "blocked"
  | "overdue"
  | "skipped"
  | "cancelled";

export const STAGE_STATUS_LABELS: Record<WorkflowStageStatus, string> = {
  "not-started":     "Not started",
  "waiting":         "Waiting",
  "in-progress":     "In progress",
  "needs-review":    "Needs review",
  "needs-signature": "Needs signature",
  "completed":       "Completed",
  "blocked":         "Blocked",
  "overdue":         "Overdue",
  "skipped":         "Skipped",
  "cancelled":       "Cancelled",
};

/** Statuses that mean the stage is finished, however it finished. */
export const TERMINAL_STAGE_STATUSES: readonly WorkflowStageStatus[] = [
  "completed", "skipped", "cancelled",
];

export type WorkflowParticipantStatus =
  | "not-notified"
  | "waiting"
  | "viewed"
  | "completed"
  | "declined";

export const PARTICIPANT_STATUS_LABELS: Record<WorkflowParticipantStatus, string> = {
  "not-notified": "Not notified",
  "waiting":      "Waiting",
  "viewed":       "Viewed",
  "completed":    "Completed",
  "declined":     "Declined",
};

export interface WorkflowRunParticipant {
  slotId:      WorkflowSlotId;
  /** Display name only. A run never carries an address it does not need. */
  displayName: string;
  /** Which slot label this person is filling, e.g. "Legal Reviewer". */
  slotLabel:   string;
  action:      StageParticipantAction;
  required:    boolean;
  status:      WorkflowParticipantStatus;
  isExternal:  boolean;
}

export interface WorkflowRunStage {
  id:          WorkflowStageId;
  name:        string;
  description: string | null;
  position:    number;
  kind:        WorkflowStageKind;
  status:      WorkflowStageStatus;
  completion:  "all" | "any";
  participants: WorkflowRunParticipant[];
  dueDateDirection: string | null;
  instruction:      string | null;
  /** Count only. The activity itself lives on the run. */
  activityCount: number;
  /** Plain-language reason the stage cannot proceed. Null when it can. */
  blockedReason: string | null;
}

export interface WorkflowRunDocument {
  id:     string;
  name:   string;
  /** Metadata only — this build never holds file content. */
  pageCount: number;
}

export type WorkflowActivityKind =
  | "run-started"
  | "documents-added"
  | "stage-started"
  | "stage-completed"
  | "review-recorded"
  | "approval-recorded"
  | "signature-recorded"
  | "reminder-sent"
  | "stage-skipped"
  | "participant-reassigned"
  | "run-completed"
  | "run-cancelled";

export const ACTIVITY_KIND_LABELS: Record<WorkflowActivityKind, string> = {
  "run-started":            "Workflow started",
  "documents-added":        "Documents added",
  "stage-started":          "Stage started",
  "stage-completed":        "Stage completed",
  "review-recorded":        "Review recorded",
  "approval-recorded":      "Approval recorded",
  "signature-recorded":     "Signature recorded",
  "reminder-sent":          "Reminder sent",
  "stage-skipped":          "Stage skipped",
  "participant-reassigned": "Participant reassigned",
  "run-completed":          "Workflow completed",
  "run-cancelled":          "Workflow cancelled",
};

export interface WorkflowActivityEntry {
  id:        string;
  kind:      WorkflowActivityKind;
  /** Already human-readable. No surface should have to build this. */
  summary:   string;
  actorName: string | null;
  stageId:   WorkflowStageId | null;
  atDemonstration: string;
}

export interface WorkflowRun {
  id:          WorkflowRunId;
  workspaceId: string;
  /** The template this run came from. The template is never modified by a run. */
  templateId:   WorkflowTemplateId;
  templateName: string;

  /** Names THIS run, e.g. "Contract Review — Northbridge Legal". */
  name:   string;
  status: WorkflowRunStatus;

  stages:    WorkflowRunStage[];
  documents: WorkflowRunDocument[];
  activity:  WorkflowActivityEntry[];

  startedBy:              string;
  startedAtDemonstration: string;
  updatedAtDemonstration: string;
  completedAtDemonstration: string | null;

  dueDateDirection: string | null;

  demonstrationOnly: true;
}

// ── Derived progress ──────────────────────────────────────────────────────────

export interface WorkflowRunProgress {
  totalStages:     number;
  completedStages: number;
  /** 0–100, rounded. Stages, not participants — that is what the bar shows. */
  percentComplete: number;
  currentStage:    WorkflowRunStage | null;
  /** Stages after the current one that have not started. */
  remainingStages: number;
  isBlocked:  boolean;
  isOverdue:  boolean;
  /** Ready-to-render sentence, so no two surfaces can word it differently. */
  summaryLine: string;
}

/**
 * The single progress calculation for a run.
 *
 * Everything that shows progress — the bar, the run card, the overview counts,
 * the board header — reads this. Two surfaces computing "percent complete"
 * separately is how a run comes to say 50% in one place and 60% in another.
 */
export function computeRunProgress(run: WorkflowRun): WorkflowRunProgress {
  const total = run.stages.length;
  const completed = run.stages.filter(s => TERMINAL_STAGE_STATUSES.includes(s.status)).length;

  // The current stage is the first that has not finished. A cancelled or
  // completed run has none, which is why the caller must handle null.
  const current = run.stages.find(s => !TERMINAL_STAGE_STATUSES.includes(s.status)) ?? null;

  const isBlocked = run.stages.some(s => s.status === "blocked");
  const isOverdue = run.stages.some(s => s.status === "overdue");
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  let summaryLine: string;
  if (run.status === "cancelled") {
    summaryLine = "This workflow run was cancelled.";
  } else if (run.status === "completed" || completed === total) {
    summaryLine = `All ${total} ${total === 1 ? "stage" : "stages"} complete.`;
  } else {
    const where = current ? ` · Currently in ${current.name}` : "";
    summaryLine = `${completed} of ${total} stages complete${where} · ${percent}% complete`;
  }

  return {
    totalStages: total,
    completedStages: completed,
    percentComplete: percent,
    currentStage: current,
    remainingStages: current ? total - completed - 1 : 0,
    isBlocked,
    isOverdue,
    summaryLine,
  };
}

// ── Template validation ───────────────────────────────────────────────────────

export type WorkflowIssueSeverity = "error" | "warning";

export interface WorkflowValidationIssue {
  severity: WorkflowIssueSeverity;
  /** Plain language. This text is shown to the user unchanged. */
  message:  string;
  stageId:  WorkflowStageId | null;
}

export interface WorkflowValidationResult {
  issues:      WorkflowValidationIssue[];
  /** Errors block publishing. Warnings never do. */
  canPublish:  boolean;
}

/**
 * The one validator for a template.
 *
 * Errors describe a template that cannot work at all; warnings describe one
 * that will work but probably is not what the author meant. Keeping the split
 * here means the builder and the review step cannot disagree about whether
 * something is publishable.
 */
export function validateTemplate(
  template: Pick<WorkflowTemplate, "name" | "stages">,
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];

  if (!template.name.trim()) {
    issues.push({ severity: "error", message: "Give this workflow a name.", stageId: null });
  }
  if (template.stages.length === 0) {
    issues.push({ severity: "error", message: "Add at least one stage.", stageId: null });
  }

  for (const stage of template.stages) {
    if (!stage.name.trim()) {
      issues.push({ severity: "error", message: `Stage ${stage.position} needs a name.`, stageId: stage.id });
    }
    const blocks = stageKindBlocks(stage.kind);
    if (blocks && stage.slots.length === 0) {
      issues.push({
        severity: "error",
        message: `"${stage.name}" asks someone to ${STAGE_KIND_LABELS[stage.kind].toLowerCase()}, but nobody is assigned. The run would stop here.`,
        stageId: stage.id,
      });
    }
    if (blocks && stage.slots.length > 0 && !stage.slots.some(s => s.required)) {
      issues.push({
        severity: "warning",
        message: `Nobody on "${stage.name}" is required, so the stage completes without anyone acting.`,
        stageId: stage.id,
      });
    }
    const labels = stage.slots.map(s => s.label.trim().toLowerCase()).filter(Boolean);
    if (new Set(labels).size !== labels.length) {
      issues.push({
        severity: "warning",
        message: `"${stage.name}" has two people with the same role name, which makes it unclear who does what.`,
        stageId: stage.id,
      });
    }
  }

  if (template.stages.length > 0 && !template.stages.some(s => s.kind === "signature")) {
    issues.push({
      severity: "warning",
      message: "No stage asks anyone to sign. That is valid for a review-only process, but unusual for a signing workflow.",
      stageId: null,
    });
  }

  return { issues, canPublish: !issues.some(i => i.severity === "error") };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export interface TemplateQuery {
  search:    string;
  status:    WorkflowTemplateStatus | "all";
  category:  WorkflowCategory | "all";
  hasSignatureStage: boolean | null;
}

export const DEFAULT_TEMPLATE_QUERY: TemplateQuery = {
  search: "", status: "all", category: "all", hasSignatureStage: null,
};

export type RunScope = "active" | "completed";

export interface RunQuery {
  search:   string;
  status:   WorkflowRunStatus | "all";
  templateId: WorkflowTemplateId | "all";
  waitingForMe: boolean;
}

export const DEFAULT_RUN_QUERY: RunQuery = {
  search: "", status: "all", templateId: "all", waitingForMe: false,
};
