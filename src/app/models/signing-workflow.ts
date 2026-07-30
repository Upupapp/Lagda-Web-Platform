// Signing Workflow domain models — Command 37.
//
// SCOPE: stage-based recipient routing for ONE document transaction.
//   Signing Workflow  →  ordered Stages  →  Stage Participant Assignments
//                     →  required participant Actions  →  individual field assignments
//
// This is NOT Workflow Automation (Command 32, models/workflow-automation.ts).
// Nothing in this file may import from workflow-automation.ts, and Signing Workflow
// must remain fully usable when `automationEnabled` is false.
//
// HARD RULES encoded here:
//   - A stage never signs. A group never signs. Only an identified person signs.
//   - Every assignment carries an EXPLICIT required action.
//   - Every assignment carries an EXPLICIT electronic-signature requirement.
//   - One Signature field belongs to exactly one participant assignment.
//   - Nothing in this file persists, delivers, or enforces anything. Frontend only.
//
// Burgundy (#67023B) is eNotary-only and never appears in this feature.
// Presentation (colors, icons) lives in the component layer, not here.

import type { PrepParticipantRole } from "./prepare";
import type { FieldType } from "./field-editor";
import type { TransactionStatus } from "./index";

// ── Branded identity types ────────────────────────────────────────────────────

export type SigningWorkflowId          = string & { readonly __brand: "SigningWorkflowId" };
export type SigningStageId             = string & { readonly __brand: "SigningStageId" };
export type StageParticipantAssignmentId = string & { readonly __brand: "StageParticipantAssignmentId" };

export function signingWorkflowId(s: string): SigningWorkflowId { return s as SigningWorkflowId; }
export function signingStageId(s: string): SigningStageId { return s as SigningStageId; }
export function stageAssignmentId(s: string): StageParticipantAssignmentId {
  return s as StageParticipantAssignmentId;
}

/** Opaque-ID shape guard used on every route/query value before it reaches the service. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export function isSafeWorkflowIdValue(v: unknown): v is string {
  return typeof v === "string" && ID_PATTERN.test(v);
}

// ── Names and descriptions ────────────────────────────────────────────────────

export type SigningWorkflowName        = string;
export type SigningWorkflowDescription = string;
export type SigningStageName           = string;
export type SigningStageDescription    = string;

export const WORKFLOW_NAME_MAX_LENGTH        = 120;
export const WORKFLOW_DESCRIPTION_MAX_LENGTH = 400;
export const STAGE_NAME_MAX_LENGTH           = 80;
export const STAGE_DESCRIPTION_MAX_LENGTH    = 240;
export const STAGE_INSTRUCTION_MAX_LENGTH    = 300;

export const MAX_STAGES_PER_WORKFLOW      = 12;
export const MAX_ASSIGNMENTS_PER_STAGE    = 20;

/**
 * Plain-text normalisation for every user-authored string in this feature.
 * Collapses whitespace, strips control characters, enforces a length limit.
 * No HTML is ever accepted, stored, or rendered as markup.
 */
export function normalizeWorkflowText(input: string, maxLength: number): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

// ── Participant required actions ──────────────────────────────────────────────
// Deliberately identical in shape to the existing PrepParticipantRole union so
// the two systems never diverge. No new participant vocabulary is introduced.

export type StageParticipantAction =
  | "sign"
  | "approve"
  | "review"
  | "acknowledge"
  | "view"
  | "receive-copy";

export const STAGE_PARTICIPANT_ACTIONS: readonly StageParticipantAction[] = [
  "sign", "approve", "review", "acknowledge", "view", "receive-copy",
];

export const STAGE_ACTION_LABELS: Record<StageParticipantAction, string> = {
  "sign":         "Sign",
  "approve":      "Approve",
  "review":       "Review",
  "acknowledge":  "Acknowledge",
  "view":         "View",
  "receive-copy": "Receive a Copy",
};

export const STAGE_ACTION_DESCRIPTIONS: Record<StageParticipantAction, string> = {
  "sign":         "Completes their own assigned signing fields.",
  "approve":      "Gives an explicit approval decision. Approval is not a signature unless a signature is also required.",
  "review":       "Completes an explicit review. A review is not an approval.",
  "acknowledge":  "Explicitly acknowledges the document. Acknowledgment is not a signature unless a signature is also required.",
  "view":         "Receives controlled view access. Does not block the stage.",
  "receive-copy": "Receives a completion copy after the approved transaction point. Does not block the stage.",
};

/** Actions that hold up stage completion. View and Receive a Copy never do. */
export const BLOCKING_ACTIONS: readonly StageParticipantAction[] = [
  "sign", "approve", "review", "acknowledge",
];

export function isBlockingAction(action: StageParticipantAction): boolean {
  return BLOCKING_ACTIONS.includes(action);
}

/** Sign always requires the participant's own Signature field. */
export function actionAlwaysRequiresSignature(action: StageParticipantAction): boolean {
  return action === "sign";
}

/** Approve / Review / Acknowledge may optionally add a signature requirement. */
export function actionSupportsOptionalSignature(action: StageParticipantAction): boolean {
  return action === "approve" || action === "review" || action === "acknowledge";
}

/** View and Receive a Copy must never require an electronic signature. */
export function actionForbidsSignature(action: StageParticipantAction): boolean {
  return action === "view" || action === "receive-copy";
}

/** Maps a required action onto the existing preparation participant role vocabulary. */
export const ACTION_TO_PREP_ROLE: Record<StageParticipantAction, PrepParticipantRole> = {
  "sign":         "signer",
  "approve":      "approver",
  "review":       "reviewer",
  "acknowledge":  "acknowledgment-recipient",
  "view":         "viewer",
  "receive-copy": "carbon-copy",
};

export const PREP_ROLE_TO_ACTION: Record<PrepParticipantRole, StageParticipantAction> = {
  "signer":                   "sign",
  "approver":                 "approve",
  "reviewer":                 "review",
  "acknowledgment-recipient": "acknowledge",
  "viewer":                   "view",
  "carbon-copy":              "receive-copy",
};

// ── Electronic signature requirement ──────────────────────────────────────────
// Always individual. A stage requirement or group requirement does not exist.

export interface StageParticipantSignatureRequirement {
  /** Explicit — never inferred from a job title or role label. */
  signatureRequired: boolean;
  /** Explicit — separate from signatureRequired. */
  initialsRequired:  boolean;
  /**
   * Why the requirement is set. "action-implied" only ever applies to `sign`;
   * every other requirement must be "explicit-sender-choice".
   */
  source: "action-implied" | "explicit-sender-choice" | "not-required";
}

export const NO_SIGNATURE_REQUIREMENT: StageParticipantSignatureRequirement = {
  signatureRequired: false,
  initialsRequired:  false,
  source:            "not-required",
};

// ── Field readiness ───────────────────────────────────────────────────────────

export type FieldReadinessState =
  | "ready"
  | "missing-signature-field"
  | "missing-initials-field"
  | "missing-required-fields"
  | "role-mismatch"
  | "participant-missing"
  | "field-assigned-to-another-participant"
  | "nonblocking"
  | "unavailable";

export const FIELD_READINESS_LABELS: Record<FieldReadinessState, string> = {
  "ready":                                 "Fields Ready",
  "missing-signature-field":               "Missing Signature Field",
  "missing-initials-field":                "Missing Initials Field",
  "missing-required-fields":               "Missing Required Fields",
  "role-mismatch":                         "Role Mismatch",
  "participant-missing":                   "Participant Missing",
  "field-assigned-to-another-participant": "Field Assigned to Another Participant",
  "nonblocking":                           "No Fields Needed",
  "unavailable":                           "Field Information Unavailable",
};

export function isFieldReadinessSatisfied(state: FieldReadinessState): boolean {
  return state === "ready" || state === "nonblocking";
}

/**
 * A safe descriptor of one field assigned to a participant.
 * Deliberately carries NO value, no signature representation, no coordinates
 * beyond the page number needed to point the sender at the right page.
 */
export interface StageAssignedFieldRef {
  fieldId:       string;
  fieldType:     FieldType;
  pageNumber:    number;
  /** The assignment this field belongs to. Exactly one owner, always. */
  ownerAssignmentId: StageParticipantAssignmentId;
  /** True when the field still exists in the field configuration. */
  present:       boolean;
}

export interface StageParticipantFieldReadiness {
  state:                  FieldReadinessState;
  requiredFieldCount:     number;
  assignedFieldCount:     number;
  missingFieldTypes:      FieldType[];
  assignedFields:         StageAssignedFieldRef[];
  /** Fields referenced by this assignment that no longer exist. */
  staleFieldIds:          string[];
  /** Fields on this assignment that are owned by a different assignment. */
  foreignFieldIds:        string[];
  repairActionLabel:      string | null;
}

// ── Authentication / consent direction ────────────────────────────────────────
// "Direction" = the configured intent. Never a claim that anything was verified.

export type StageParticipantAuthenticationDirection =
  | "secure-link-only"
  | "email-code"
  | "sms-code"
  | "not-configured";

export const AUTH_DIRECTION_LABELS: Record<StageParticipantAuthenticationDirection, string> = {
  "secure-link-only": "Secure Invitation Link",
  "email-code":       "Email Code",
  "sms-code":         "SMS Code",
  "not-configured":   "Not Configured",
};

export type StageParticipantConsentDirection =
  | "electronic-records-consent-required"
  | "electronic-records-consent-not-required"
  | "not-configured";

export const CONSENT_DIRECTION_LABELS: Record<StageParticipantConsentDirection, string> = {
  "electronic-records-consent-required":     "Electronic Records Consent Required",
  "electronic-records-consent-not-required": "Electronic Records Consent Not Required",
  "not-configured":                          "Not Configured",
};

// ── Notification direction ────────────────────────────────────────────────────
// Direction only. Nothing here sends, schedules, or delivers anything.

export type StageParticipantNotificationDirection =
  | "notify-when-stage-becomes-ready"
  | "notify-when-assignment-becomes-ready"
  | "notify-on-completion-only"
  | "no-notification-direction";

export const NOTIFICATION_DIRECTION_LABELS: Record<StageParticipantNotificationDirection, string> = {
  "notify-when-stage-becomes-ready":      "When the stage becomes ready",
  "notify-when-assignment-becomes-ready": "When it is this person's turn",
  "notify-on-completion-only":            "On completion only",
  "no-notification-direction":            "No notification direction",
};

// ── Statuses ──────────────────────────────────────────────────────────────────

export type SigningWorkflowConfigurationStatus =
  | "not-configured"
  | "draft"
  | "needs-attention"
  | "ready-for-review"
  | "ready-in-demonstration"
  | "unavailable";

export const WORKFLOW_CONFIGURATION_STATUS_LABELS: Record<SigningWorkflowConfigurationStatus, string> = {
  "not-configured":         "Not Configured",
  "draft":                  "Draft",
  "needs-attention":        "Needs Attention",
  "ready-for-review":       "Ready for Review",
  "ready-in-demonstration": "Ready in Demonstration",
  "unavailable":            "Unavailable",
};

export type SigningWorkflowStatus =
  | "waiting"
  | "ready"
  | "in-progress"
  | "completed"
  | "blocked"
  | "declined"
  | "rejected"
  | "expired"
  | "cancelled"
  | "voided"
  | "unavailable";

export const WORKFLOW_STATUS_LABELS: Record<SigningWorkflowStatus, string> = {
  "waiting":     "Waiting",
  "ready":       "Ready",
  "in-progress": "In Progress",
  "completed":   "Completed",
  "blocked":     "Blocked",
  "declined":    "Declined",
  "rejected":    "Rejected",
  "expired":     "Expired",
  "cancelled":   "Cancelled",
  "voided":      "Voided",
  "unavailable": "Unavailable",
};

export type SigningStageStatus =
  | "draft"
  | "waiting-for-prior-stage"
  | "ready"
  | "in-progress"
  | "completed"
  | "blocked"
  | "declined"
  | "rejected"
  | "expired"
  | "cancelled"
  | "skipped-unavailable"
  | "unavailable";

export const STAGE_STATUS_LABELS: Record<SigningStageStatus, string> = {
  "draft":                   "Draft",
  "waiting-for-prior-stage": "Waiting for Prior Stage",
  "ready":                   "Ready",
  "in-progress":             "In Progress",
  "completed":               "Completed",
  "blocked":                 "Blocked",
  "declined":                "Declined",
  "rejected":                "Rejected",
  "expired":                 "Expired",
  "cancelled":               "Cancelled",
  "skipped-unavailable":     "Skipped — Unavailable",
  "unavailable":             "Unavailable",
};

export type StageParticipantStatus =
  | "waiting-for-prior-stage"
  | "waiting-for-prior-participant"
  | "ready-for-action"
  | "viewed"
  | "in-progress"
  | "completed"
  | "declined"
  | "rejected"
  | "authentication-failed"
  | "expired"
  | "cancelled"
  | "no-longer-required"
  | "unavailable";

export const STAGE_PARTICIPANT_STATUS_LABELS: Record<StageParticipantStatus, string> = {
  "waiting-for-prior-stage":       "Waiting for Prior Stage",
  "waiting-for-prior-participant": "Waiting for Prior Participant",
  "ready-for-action":              "Action Required",
  "viewed":                        "Viewed",
  "in-progress":                   "In Progress",
  "completed":                     "Completed",
  "declined":                      "Declined",
  "rejected":                      "Rejected",
  "authentication-failed":         "Authentication Not Completed",
  "expired":                       "Expired",
  "cancelled":                     "Cancelled",
  "no-longer-required":            "No Longer Required",
  "unavailable":                   "Unavailable",
};

/** Statuses that mean the assignment's required action is finished. */
export const COMPLETED_ASSIGNMENT_STATUSES: readonly StageParticipantStatus[] = [
  "completed", "no-longer-required",
];

/** Statuses that mean the assignment can no longer complete normally. */
export const TERMINAL_NEGATIVE_ASSIGNMENT_STATUSES: readonly StageParticipantStatus[] = [
  "declined", "rejected", "authentication-failed", "expired", "cancelled",
];

export const TERMINAL_STAGE_STATUSES: readonly SigningStageStatus[] = [
  "completed", "declined", "rejected", "expired", "cancelled", "skipped-unavailable",
];

export const TERMINAL_WORKFLOW_STATUSES: readonly SigningWorkflowStatus[] = [
  "completed", "declined", "rejected", "expired", "cancelled", "voided",
];

// ── Stage execution and completion ────────────────────────────────────────────

export type SigningStageExecutionMode = "parallel" | "ordered";

export const STAGE_EXECUTION_MODE_LABELS: Record<SigningStageExecutionMode, string> = {
  "parallel": "Everyone at the same time",
  "ordered":  "One after another",
};

export const STAGE_EXECUTION_MODE_DESCRIPTIONS: Record<SigningStageExecutionMode, string> = {
  "parallel": "All required people in this stage become eligible together when the stage starts.",
  "ordered":  "Each person waits for the person listed above them in this stage.",
};

/**
 * Only one completion rule is supported in this command.
 * Quorum, weighted voting, and "any one signs for the group" are deliberately absent:
 * the repository contains no approved Recipient Group model with legal, permission,
 * access, field, and notification boundaries.
 */
export type SigningStageCompletionRule = "all-required-participants-complete";

export const STAGE_COMPLETION_RULE_LABELS: Record<SigningStageCompletionRule, string> = {
  "all-required-participants-complete": "All required people must complete their action",
};

export type SigningStageType = "action" | "distribution";

export const STAGE_TYPE_LABELS: Record<SigningStageType, string> = {
  "action":       "Action Stage",
  "distribution": "Distribution Stage",
};

// ── Stage participant assignment ──────────────────────────────────────────────

export interface StageParticipantAssignment {
  id:            StageParticipantAssignmentId;
  workflowId:    SigningWorkflowId;
  stageId:       SigningStageId;

  /** Identity comes from the canonical participant directory. Never re-created here. */
  participantId:   string;
  /** Present when the participant has become an addressable recipient. */
  recipientId:     string | null;
  participantName: string;
  /** Already masked upstream (e.g. "m****@example.com"). Never unmasked here. */
  participantEmailMasked: string;
  participantOrganization: string | null;
  participantSource: "document-participant" | "contact" | "workspace-member" | "template-role";

  /** 1-based position inside the stage. */
  position: number;

  role:   PrepParticipantRole;
  action: StageParticipantAction;

  signatureRequirement: StageParticipantSignatureRequirement;
  fieldReadiness:       StageParticipantFieldReadiness;

  authenticationDirection: StageParticipantAuthenticationDirection;
  consentDirection:        StageParticipantConsentDirection;
  notificationDirection:   StageParticipantNotificationDirection;

  /** Optional private note for this person. Plain text, never rendered as markup. */
  instruction: string | null;

  status: StageParticipantStatus;

  /** True when this assignment holds up stage completion. */
  blocking: boolean;

  /** Set only when the fixture represents an action that already happened. */
  completedAtDemonstration: string | null;
}

export interface StageParticipantProgress {
  assignmentId: StageParticipantAssignmentId;
  completed:    boolean;
  blocking:     boolean;
  signatureRequired: boolean;
  signatureCompletedInDemonstration: boolean;
}

// ── Stage ─────────────────────────────────────────────────────────────────────

export interface SigningStage {
  id:          SigningStageId;
  workflowId:  SigningWorkflowId;
  name:        SigningStageName;
  description: SigningStageDescription | null;

  /** 1-based sequence position. Always contiguous after any reorder. */
  position: number;

  type:           SigningStageType;
  executionMode:  SigningStageExecutionMode;
  completionRule: SigningStageCompletionRule;

  assignments: StageParticipantAssignment[];

  status: SigningStageStatus;

  /** Optional direction values. Never a scheduled backend job. */
  dueDateDirection:      string | null;
  instruction:           string | null;
  notificationDirection: StageParticipantNotificationDirection;
}

export interface SigningStageProgress {
  stageId:                 SigningStageId;
  position:                number;
  totalAssignments:        number;
  blockingAssignments:     number;
  completedBlocking:       number;
  nonblockingAssignments:  number;
  requiredSignatures:      number;
  completedSignaturesInDemonstration: number;
  percentComplete:         number;
}

export interface SigningStageSummary {
  id:            SigningStageId;
  name:          SigningStageName;
  position:      number;
  status:        SigningStageStatus;
  executionMode: SigningStageExecutionMode;
  progress:      SigningStageProgress;
  isCurrent:     boolean;
  hasBlockingIssue: boolean;
}

// ── Workflow ──────────────────────────────────────────────────────────────────

export interface SigningWorkflow {
  id:          SigningWorkflowId;
  documentId:  string;
  workspaceId: string;
  teamId:      string | null;

  name:        SigningWorkflowName;
  description: SigningWorkflowDescription | null;

  stages: SigningStage[];

  configurationStatus: SigningWorkflowConfigurationStatus;
  status:              SigningWorkflowStatus;

  /** Optional direction values only. */
  dueDateDirection:     string | null;
  requestInstruction:   string | null;

  createdAtDemonstration: string;
  updatedAtDemonstration: string;

  /** Origin of the configuration, used for honest wording and Undo. */
  origin: "built-from-scratch" | "converted-from-recipient-order" | "applied-from-template" | "fixture";

  /**
   * Always true in this build. Present so the future backend adapter can flip it
   * and so every surface can render the correct frontend-only notice.
   */
  demonstrationOnly: true;
}

export interface SigningWorkflowProgress {
  totalStages:        number;
  completedStages:    number;
  totalRequiredActions:     number;
  completedRequiredActions: number;
  totalRequiredSignatures:  number;
  completedRequiredSignaturesInDemonstration: number;
  /** Excluded from required-action counts. Reported separately for transparency. */
  nonblockingAssignments:   number;
  percentComplete:    number;
}

export interface SigningWorkflowSummary {
  workflowId:          SigningWorkflowId;
  documentId:          string;
  name:                SigningWorkflowName;
  configurationStatus: SigningWorkflowConfigurationStatus;
  status:              SigningWorkflowStatus;
  stageCount:          number;
  participantAssignmentCount: number;
  requiredSignatureCount:     number;
  progress:            SigningWorkflowProgress;
  currentStageId:      SigningStageId | null;
  currentStageName:    string | null;
  nextStageId:         SigningStageId | null;
  nextStageName:       string | null;
  blockingIssueCount:  number;
  advisoryIssueCount:  number;
}

// ── Stage / workflow resolution ───────────────────────────────────────────────

export interface WorkflowCurrentStageResolution {
  currentStageId:   SigningStageId | null;
  currentStageName: string | null;
  currentStagePosition: number | null;
  /** Why there is no current stage, when there isn't one. */
  reason: "draft" | "active" | "completed" | "terminal" | "no-stages" | "inconsistent-data";
  explanation: string;
}

export interface WorkflowNextStageResolution {
  nextStageId:       SigningStageId | null;
  nextStageName:     string | null;
  nextStagePosition: number | null;
  isFinalStage:      boolean;
  explanation:       string;
}

export interface WorkflowCompletionResolution {
  allBlockingComplete: boolean;
  workflowStatus:      SigningWorkflowStatus;
  terminalReason:      string | null;
  explanation:         string;
}

// ── Validation ────────────────────────────────────────────────────────────────

export type SigningWorkflowValidationSeverity = "blocking" | "advisory";

export type SigningWorkflowValidationIssueId =
  // Workflow
  | "workflow-name-required"
  | "workflow-no-stages"
  | "workflow-no-blocking-action"
  | "workflow-document-mismatch"
  | "workflow-stage-order-invalid"
  | "workflow-too-many-stages"
  // Stage
  | "stage-name-required"
  | "stage-empty"
  | "stage-no-blocking-participant"
  | "stage-invalid-execution-mode"
  | "stage-invalid-completion-rule"
  | "stage-invalid-position"
  | "stage-too-many-participants"
  | "stage-duplicate-name"
  | "stage-distribution-has-blocking-action"
  | "stage-terminal-dead-end"
  // Participant
  | "participant-missing"
  | "participant-wrong-document"
  | "participant-unsupported-action"
  | "participant-signature-requirement-incoherent"
  | "participant-duplicate-in-stage"
  | "participant-repeated-across-stages"
  | "participant-out-of-scope"
  | "participant-invalid-position"
  | "participant-auth-unsupported"
  | "participant-consent-unsupported"
  // Fields
  | "field-signature-missing"
  | "field-initials-missing"
  | "field-required-missing"
  | "field-owned-by-other-participant"
  | "field-removed"
  | "field-unsupported-type";

export interface SigningWorkflowValidationIssue {
  issueId:   SigningWorkflowValidationIssueId;
  severity:  SigningWorkflowValidationSeverity;
  /** Plain user-facing sentence. Never a stack trace, never a raw ID. */
  message:   string;
  stageId:   SigningStageId | null;
  stageName: string | null;
  assignmentId: StageParticipantAssignmentId | null;
  participantName: string | null;
  /** What the user should do about it. */
  repairActionLabel: string | null;
  repairTarget: "stage-editor" | "participant-editor" | "field-placement" | "workflow-basics" | null;
}

export interface SigningWorkflowValidationResult {
  issues:              SigningWorkflowValidationIssue[];
  blockingIssueCount:  number;
  advisoryIssueCount:  number;
  readyForReview:      boolean;
  configurationStatus: SigningWorkflowConfigurationStatus;
}

// ── Board / view models ───────────────────────────────────────────────────────

export type WorkflowBoardView = "board" | "timeline" | "list";

export const WORKFLOW_BOARD_VIEW_LABELS: Record<WorkflowBoardView, string> = {
  board:    "Board",
  timeline: "Timeline",
  list:     "List",
};

export const VALID_WORKFLOW_BOARD_VIEWS: readonly WorkflowBoardView[] = ["board", "timeline", "list"];

export function parseWorkflowBoardView(v: unknown): WorkflowBoardView {
  return VALID_WORKFLOW_BOARD_VIEWS.includes(v as WorkflowBoardView)
    ? (v as WorkflowBoardView)
    : "board";
}

export type WorkflowBoardFilter = "all" | "action-required" | "issues-only" | "completed";

export const WORKFLOW_BOARD_FILTER_LABELS: Record<WorkflowBoardFilter, string> = {
  "all":             "All people",
  "action-required": "Action required",
  "issues-only":     "Issues only",
  "completed":       "Completed",
};

export const VALID_WORKFLOW_BOARD_FILTERS: readonly WorkflowBoardFilter[] =
  ["all", "action-required", "issues-only", "completed"];

export type WorkflowBoardSort = "stage-order" | "participant-name" | "status";

export interface WorkflowBoardCard {
  assignment: StageParticipantAssignment;
  stageId:    SigningStageId;
  stagePosition: number;
  /** Accessible label combining every meaningful state as text. */
  accessibleLabel: string;
}

export interface WorkflowBoardColumn {
  stage:    SigningStage;
  summary:  SigningStageSummary;
  cards:    WorkflowBoardCard[];
  isCurrent: boolean;
  /** Accessible label combining stage number, name, status and counts as text. */
  accessibleLabel: string;
}

export interface WorkflowBoardSelection {
  stageId:      SigningStageId | null;
  assignmentId: StageParticipantAssignmentId | null;
}

export const EMPTY_BOARD_SELECTION: WorkflowBoardSelection = {
  stageId: null,
  assignmentId: null,
};

// ── Document preview context ──────────────────────────────────────────────────

export type WorkflowPreviewAvailability = "available" | "unavailable" | "loading";

export interface WorkflowDocumentPreviewContext {
  availability:  WorkflowPreviewAvailability;
  documentTitle: string;
  pageCount:     number;
  currentPage:   number;
  /** Selected stage/participant driving the highlight state. */
  selection:     WorkflowBoardSelection;
  /** Safe field descriptors only — never values, never signature representations. */
  highlightedFields: StageAssignedFieldRef[];
  missingFieldTypes: FieldType[];
  unavailableReason: string | null;
}

// ── Document summary shown on every workflow surface ──────────────────────────

export interface WorkflowDocumentSummary {
  documentId:      string;
  title:           string;
  documentStatus:  TransactionStatus;
  ownerName:       string;
  workspaceName:   string;
  participantCount: number;
  demonstrationPageCount: number;
  createdAt:       string;
  updatedAt:       string;
  expiresAt:       string | null;
  verificationDirection: string;
  /** True when the transaction is past the point where routing may be edited. */
  configurationLocked: boolean;
  lockReason: string | null;
}

// ── Actions and availability ──────────────────────────────────────────────────

export type SigningWorkflowAction =
  | "view-workflow"
  | "create-workflow"
  | "edit-workflow"
  | "delete-workflow-demonstration"
  | "add-stage"
  | "remove-stage"
  | "reorder-stages"
  | "assign-participants"
  | "configure-participant-actions"
  | "configure-signature-requirements"
  | "configure-stage-execution"
  | "view-progress"
  | "view-field-readiness"
  | "preview-notifications"
  | "convert-from-recipient-order"
  | "open-field-placement";

export interface SigningWorkflowActionAvailability {
  action:    SigningWorkflowAction;
  available: boolean;
  /** Always populated when unavailable, so no control is silently disabled. */
  reason:    string | null;
}

export type SigningStageAction =
  | "open-stage"
  | "edit-stage"
  | "duplicate-stage"
  | "delete-stage"
  | "move-stage-earlier"
  | "move-stage-later"
  | "move-stage-to-position"
  | "add-person";

export interface SigningStageActionAvailability {
  action:    SigningStageAction;
  available: boolean;
  reason:    string | null;
}

// ── Permission and capability context ─────────────────────────────────────────
// Signing Workflow reuses the existing document permissions rather than adding a
// parallel permission system. The named capabilities below are the C37 vocabulary
// mapped onto those existing permissions in one place.

export interface SigningWorkflowPermissionContext {
  canViewDocumentWorkflow:        boolean;
  canCreateDocumentWorkflow:      boolean;
  canEditDocumentWorkflow:        boolean;
  canDeleteWorkflowDemonstration: boolean;
  canReorderWorkflowStages:       boolean;
  canAddWorkflowStage:            boolean;
  canRemoveWorkflowStage:         boolean;
  canAssignWorkflowParticipants:  boolean;
  canConfigureParticipantActions: boolean;
  canConfigureSignatureRequirements: boolean;
  canConfigureStageExecution:     boolean;
  canViewWorkflowProgress:        boolean;
  canViewWorkflowFieldReadiness:  boolean;
  canPreviewWorkflowNotifications: boolean;
  canManageDraftWorkflow:         boolean;
}

export const NO_WORKFLOW_PERMISSIONS: SigningWorkflowPermissionContext = {
  canViewDocumentWorkflow:        false,
  canCreateDocumentWorkflow:      false,
  canEditDocumentWorkflow:        false,
  canDeleteWorkflowDemonstration: false,
  canReorderWorkflowStages:       false,
  canAddWorkflowStage:            false,
  canRemoveWorkflowStage:         false,
  canAssignWorkflowParticipants:  false,
  canConfigureParticipantActions: false,
  canConfigureSignatureRequirements: false,
  canConfigureStageExecution:     false,
  canViewWorkflowProgress:        false,
  canViewWorkflowFieldReadiness:  false,
  canPreviewWorkflowNotifications: false,
  canManageDraftWorkflow:         false,
};

/**
 * Maps existing platform permissions onto the Signing Workflow vocabulary.
 * `view_workflow_automation` is deliberately absent — Workflow Automation
 * permission never grants Signing Workflow access.
 */
export function buildWorkflowPermissionContext(input: {
  hasViewDocuments:    boolean;
  hasPrepareDocuments: boolean;
  documentAccessible:  boolean;
  configurationLocked: boolean;
}): SigningWorkflowPermissionContext {
  const view = input.hasViewDocuments && input.documentAccessible;
  const edit = view && input.hasPrepareDocuments && !input.configurationLocked;
  return {
    canViewDocumentWorkflow:        view,
    canCreateDocumentWorkflow:      edit,
    canEditDocumentWorkflow:        edit,
    canDeleteWorkflowDemonstration: edit,
    canReorderWorkflowStages:       edit,
    canAddWorkflowStage:            edit,
    canRemoveWorkflowStage:         edit,
    canAssignWorkflowParticipants:  edit,
    canConfigureParticipantActions: edit,
    canConfigureSignatureRequirements: edit,
    canConfigureStageExecution:     edit,
    canViewWorkflowProgress:        view,
    canViewWorkflowFieldReadiness:  view,
    canPreviewWorkflowNotifications: view,
    canManageDraftWorkflow:         edit,
  };
}

export interface SigningWorkflowCapabilityContext {
  capabilityAvailable: boolean;
  reasonLabel:         string;
  safeFallbackRoute:   string;
}

// ── Errors and scenarios ──────────────────────────────────────────────────────

export type SigningWorkflowError =
  | "workflow-not-found"
  | "stage-not-found"
  | "assignment-not-found"
  | "document-restricted"
  | "document-not-found"
  | "capability-unavailable"
  | "permission-denied"
  | "invalid-input"
  | "invalid-state"
  | "preview-unavailable"
  | "partial-error"
  | "full-error";

export type SigningWorkflowScenario =
  | "standard"
  | "preview-unavailable"
  | "partial-error"
  | "full-error";

export const VALID_WORKFLOW_SCENARIOS: readonly SigningWorkflowScenario[] =
  ["standard", "preview-unavailable", "partial-error", "full-error"];

// ── Frontend demonstration activity ───────────────────────────────────────────
// These are NOT audit records, NOT Evidence, and NOT proof of anything.
// Canonical transaction Activity lives in models/transaction-detail.ts and is untouched.

export type SigningWorkflowActivityType =
  | "workflow-draft-created"
  | "stage-added"
  | "stage-renamed"
  | "stage-removed"
  | "stage-reordered"
  | "stage-execution-changed"
  | "participant-assigned"
  | "participant-updated"
  | "participant-removed"
  | "participant-reordered"
  | "signature-requirement-added"
  | "signature-requirement-removed"
  | "workflow-ready-for-review"
  | "workflow-created-in-demonstration"
  | "converted-from-recipient-order";

export interface SigningWorkflowActivityRecord {
  id:        string;
  workflowId: SigningWorkflowId;
  type:      SigningWorkflowActivityType;
  timestamp: string;
  title:     string;
  description: string;
  stageId:   SigningStageId | null;
  /** Always true. These records never enter the canonical Activity or Evidence stores. */
  demonstrationOnly: true;
}

// ── Notification event direction (NOTIFY integration) ─────────────────────────
// Definitions only. No provider is called, nothing is scheduled, nothing is delivered.

export type SigningWorkflowNotificationEventId =
  | "signing_workflow.stage_ready"
  | "signing_workflow.participant_action_required"
  | "signing_workflow.participant_reminder_due"
  | "signing_workflow.stage_completed"
  | "signing_workflow.stage_blocked"
  | "signing_workflow.participant_declined"
  | "signing_workflow.completed";

export interface SigningWorkflowNotificationDefinition {
  eventId:   SigningWorkflowNotificationEventId;
  label:     string;
  audience:  string;
  exclusions: string[];
  channelDirection: string;
  timingDirection:  string;
  reminderStopConditions: string[];
  deepLinkPattern:  string;
  fallbackLink:     string;
  frontendReady:    boolean;
  backendReady:     false;
}

/** Reminder direction stops for every event, without exception. */
export const REMINDER_STOP_CONDITIONS: readonly string[] = [
  "Participant completed their required action",
  "Participant declined",
  "Participant rejected",
  "Stage completed",
  "Workflow completed",
  "Transaction cancelled",
  "Transaction voided",
  "Transaction expired",
  "Participant removed from the workflow",
  "Participant access revoked",
];

export const SIGNING_WORKFLOW_NOTIFICATION_DEFINITIONS: readonly SigningWorkflowNotificationDefinition[] = [
  {
    eventId:   "signing_workflow.stage_ready",
    label:     "Stage becomes ready",
    audience:  "Blocking participants assigned to the stage that just became ready.",
    exclusions: [
      "Copy recipients (they are addressed only at the approved distribution point)",
      "Participants in later stages",
      "Participants who already completed their action",
      "Anyone without document access",
    ],
    channelDirection: "In-app notification, with an email direction recorded for the future backend.",
    timingDirection:  "When the prior stage's blocking assignments are all complete.",
    reminderStopConditions: [...REMINDER_STOP_CONDITIONS],
    deepLinkPattern:  "/app/documents/:documentId/workflow",
    fallbackLink:     "/app/documents",
    frontendReady:    true,
    backendReady:     false,
  },
  {
    eventId:   "signing_workflow.participant_action_required",
    label:     "It is this person's turn",
    audience:  "One identified participant whose assignment has become eligible.",
    exclusions: [
      "Other participants in the same stage when the stage is ordered",
      "View-only participants when viewing is not required",
      "Copy recipients",
    ],
    channelDirection: "In-app notification plus the participant's configured invitation direction.",
    timingDirection:  "When the assignment becomes eligible under the stage execution mode.",
    reminderStopConditions: [...REMINDER_STOP_CONDITIONS],
    deepLinkPattern:  "/app/inbox",
    fallbackLink:     "/app/inbox",
    frontendReady:    true,
    backendReady:     false,
  },
  {
    eventId:   "signing_workflow.participant_reminder_due",
    label:     "Reminder direction",
    audience:  "A participant with an outstanding blocking action.",
    exclusions: [
      "Participants who already completed",
      "Copy recipients",
      "Participants in a terminal transaction",
    ],
    channelDirection: "Reminder direction only. No reminder is scheduled or delivered in this build.",
    timingDirection:  "Follows the transaction's existing reminder settings. Never independent of them.",
    reminderStopConditions: [...REMINDER_STOP_CONDITIONS],
    deepLinkPattern:  "/app/inbox",
    fallbackLink:     "/app/inbox",
    frontendReady:    true,
    backendReady:     false,
  },
  {
    eventId:   "signing_workflow.stage_completed",
    label:     "Stage completed",
    audience:  "The document owner and senders with document access.",
    exclusions: [
      "Participants in later stages (they receive the stage-ready event instead)",
      "Copy recipients",
    ],
    channelDirection: "In-app notification.",
    timingDirection:  "When every blocking assignment in the stage completes.",
    reminderStopConditions: [...REMINDER_STOP_CONDITIONS],
    deepLinkPattern:  "/app/documents/:documentId/workflow",
    fallbackLink:     "/app/documents",
    frontendReady:    true,
    backendReady:     false,
  },
  {
    eventId:   "signing_workflow.stage_blocked",
    label:     "Stage blocked",
    audience:  "The document owner and senders with document access.",
    exclusions: ["All participants", "Copy recipients"],
    channelDirection: "In-app notification.",
    timingDirection:  "When a blocking assignment reaches a terminal negative status.",
    reminderStopConditions: [...REMINDER_STOP_CONDITIONS],
    deepLinkPattern:  "/app/documents/:documentId/workflow",
    fallbackLink:     "/app/documents",
    frontendReady:    true,
    backendReady:     false,
  },
  {
    eventId:   "signing_workflow.participant_declined",
    label:     "Participant declined",
    audience:  "The document owner and senders with document access.",
    exclusions: ["Other participants", "Copy recipients"],
    channelDirection: "In-app notification.",
    timingDirection:  "When a participant records a decline.",
    reminderStopConditions: [...REMINDER_STOP_CONDITIONS],
    deepLinkPattern:  "/app/documents/:documentId/workflow",
    fallbackLink:     "/app/documents",
    frontendReady:    true,
    backendReady:     false,
  },
  {
    eventId:   "signing_workflow.completed",
    label:     "Workflow completed",
    audience:  "The document owner, senders with access, and copy recipients at the approved distribution point.",
    exclusions: ["Anyone whose access was revoked", "Participants removed before completion"],
    channelDirection: "In-app notification, with a completion-copy direction for copy recipients.",
    timingDirection:  "When the final stage completes.",
    reminderStopConditions: [...REMINDER_STOP_CONDITIONS],
    deepLinkPattern:  "/app/documents/:documentId",
    fallbackLink:     "/app/documents",
    frontendReady:    true,
    backendReady:     false,
  },
];

// ── Honest frontend-only language ─────────────────────────────────────────────

export const WORKFLOW_DEMONSTRATION_NOTICE =
  "This Signing Workflow uses frontend demonstration state. No request, invitation, email, " +
  "SMS message, participant session, electronic signature, approval, acknowledgment, completed " +
  "document, Activity record, or Evidence record was created or delivered.";

export const WORKFLOW_PROGRESS_NOTICE =
  "Progress shown here is derived from frontend demonstration fixtures. Production enforcement " +
  "of signing order, participant eligibility, and completion requires backend services.";

export const WORKFLOW_NOTIFICATION_PREVIEW_NOTICE =
  "Notification previews describe who would be addressed and when. No notification, email, SMS " +
  "message, or reminder is created, scheduled, or delivered.";

export const WORKFLOW_LEGAL_NOTICE =
  "Legal effect depends on the document, the parties, the circumstances, and applicable requirements.";

// ── Suggested starter stage names (suggestions only — never auto-applied) ─────

export const SUGGESTED_STAGE_NAMES: readonly string[] = [
  "Internal Review",
  "Approval",
  "Company Signing",
  "Client Signing",
  "Acknowledgment",
  "Distribution",
];

// ── Creation step model ───────────────────────────────────────────────────────

export type WorkflowCreationStepId =
  | "basics"
  | "stages"
  | "people"
  | "actions"
  | "fields"
  | "review";

export const WORKFLOW_CREATION_STEPS: readonly {
  id: WorkflowCreationStepId;
  label: string;
  shortLabel: string;
  helper: string;
}[] = [
  { id: "basics",  label: "Workflow Basics", shortLabel: "Basics",  helper: "Name this signing workflow." },
  { id: "stages",  label: "Build Stages",    shortLabel: "Stages",  helper: "Stages control when people act." },
  { id: "people",  label: "Add People",      shortLabel: "People",  helper: "Put each person in the stage where they act." },
  { id: "actions", label: "Configure Actions", shortLabel: "Actions", helper: "Say exactly what each person must do." },
  { id: "fields",  label: "Check Fields",    shortLabel: "Fields",  helper: "Everyone who signs needs their own fields." },
  { id: "review",  label: "Review Workflow", shortLabel: "Review",  helper: "Check the order, the people, and the requirements." },
];

export const VALID_CREATION_STEP_IDS: readonly WorkflowCreationStepId[] =
  ["basics", "stages", "people", "actions", "fields", "review"];

export function parseCreationStepId(v: unknown): WorkflowCreationStepId {
  return VALID_CREATION_STEP_IDS.includes(v as WorkflowCreationStepId)
    ? (v as WorkflowCreationStepId)
    : "basics";
}

// ── Draft input shapes ────────────────────────────────────────────────────────

export interface CreateWorkflowInput {
  name:        string;
  description: string;
  dueDateDirection: string | null;
  requestInstruction: string | null;
}

export interface UpdateWorkflowInput {
  name?:        string;
  description?: string | null;
  dueDateDirection?: string | null;
  requestInstruction?: string | null;
}

export interface AddStageInput {
  name:           string;
  description?:   string | null;
  type?:          SigningStageType;
  executionMode?: SigningStageExecutionMode;
  instruction?:   string | null;
  dueDateDirection?: string | null;
  /** 1-based insert position. Appended when omitted. */
  position?:      number;
}

export interface UpdateStageInput {
  name?:           string;
  description?:    string | null;
  type?:           SigningStageType;
  executionMode?:  SigningStageExecutionMode;
  instruction?:    string | null;
  dueDateDirection?: string | null;
  notificationDirection?: StageParticipantNotificationDirection;
}

export interface AddStageParticipantInput {
  participantId:   string;
  participantName: string;
  participantEmailMasked: string;
  participantOrganization?: string | null;
  participantSource: StageParticipantAssignment["participantSource"];
  recipientId?:    string | null;
  action:          StageParticipantAction;
  signatureRequired?: boolean;
  initialsRequired?:  boolean;
  authenticationDirection?: StageParticipantAuthenticationDirection;
  consentDirection?:        StageParticipantConsentDirection;
  notificationDirection?:   StageParticipantNotificationDirection;
  instruction?:    string | null;
}

export interface UpdateStageParticipantInput {
  action?:            StageParticipantAction;
  signatureRequired?: boolean;
  initialsRequired?:  boolean;
  authenticationDirection?: StageParticipantAuthenticationDirection;
  consentDirection?:        StageParticipantConsentDirection;
  notificationDirection?:   StageParticipantNotificationDirection;
  instruction?:       string | null;
  /** Moving between stages is an explicit operation, never a side effect of a drag. */
  targetStageId?:     SigningStageId;
}

// ── Recipient-order conversion preview ────────────────────────────────────────

export interface RecipientOrderConversionPreviewStage {
  proposedName:  string;
  sourceStepNumber: number;
  participants: {
    participantId:   string;
    participantName: string;
    role:            PrepParticipantRole;
    proposedAction:  StageParticipantAction;
    /** Suggested only. Always reviewable, never silently applied as a fact. */
    signatureSuggested: boolean;
    suggestionReason:   string;
  }[];
}

export interface RecipientOrderConversionPreview {
  available:    boolean;
  unavailableReason: string | null;
  stages:       RecipientOrderConversionPreviewStage[];
  notes:        string[];
  wouldOverwriteExistingConfiguration: boolean;
}
