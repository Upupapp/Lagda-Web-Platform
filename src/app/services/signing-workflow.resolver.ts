// Signing Workflow — centralized current-stage / next-stage / completion / progress resolver.
//
// This is the ONLY place that decides which stage is current. The board, the timeline,
// the list, the stage detail, the summary header, and the notification previews all read
// from here. Visual board order NEVER determines the current stage.
//
// Determinism rules:
//   - Inputs are stage sequence, stage status, assignment status, completion rule,
//     and the transaction status. Nothing else.
//   - Inconsistent fixture data resolves to a safe explained fallback, never a throw
//     and never an impossible state.
//   - Nothing here marks anything complete. It only reads and reports.

import type {
  SigningWorkflow,
  SigningStage,
  SigningStageId,
  SigningStageProgress,
  SigningStageSummary,
  SigningWorkflowProgress,
  SigningWorkflowStatus,
  StageParticipantAssignment,
  WorkflowCurrentStageResolution,
  WorkflowNextStageResolution,
  WorkflowCompletionResolution,
} from "../models/signing-workflow";
import {
  COMPLETED_ASSIGNMENT_STATUSES,
  TERMINAL_NEGATIVE_ASSIGNMENT_STATUSES,
  TERMINAL_STAGE_STATUSES,
  isBlockingAction,
} from "../models/signing-workflow";
import type { TransactionStatus } from "../models";

// ── Assignment-level predicates ───────────────────────────────────────────────

export function isAssignmentComplete(a: StageParticipantAssignment): boolean {
  return COMPLETED_ASSIGNMENT_STATUSES.includes(a.status);
}

export function isAssignmentTerminalNegative(a: StageParticipantAssignment): boolean {
  return TERMINAL_NEGATIVE_ASSIGNMENT_STATUSES.includes(a.status);
}

/**
 * An assignment blocks the stage when its action is blocking AND the sender
 * marked it blocking. View/Receive-a-Copy can never block.
 */
export function isAssignmentBlocking(a: StageParticipantAssignment): boolean {
  return a.blocking && isBlockingAction(a.action);
}

/**
 * A required signature is counted only when the requirement is explicit.
 * An approval without a signature requirement is never counted as a signature.
 */
export function assignmentRequiresSignature(a: StageParticipantAssignment): boolean {
  return a.signatureRequirement.signatureRequired;
}

export function assignmentSignatureCompletedInDemonstration(a: StageParticipantAssignment): boolean {
  return assignmentRequiresSignature(a) && isAssignmentComplete(a);
}

// ── Stage progress ────────────────────────────────────────────────────────────

export function resolveStageProgress(stage: SigningStage): SigningStageProgress {
  const assignments = stage.assignments ?? [];
  const blocking = assignments.filter(isAssignmentBlocking);
  const completedBlocking = blocking.filter(isAssignmentComplete).length;
  const requiredSignatures = assignments.filter(assignmentRequiresSignature).length;
  const completedSignatures = assignments.filter(assignmentSignatureCompletedInDemonstration).length;

  const percentComplete = blocking.length === 0
    ? (stage.status === "completed" ? 100 : 0)
    : Math.round((completedBlocking / blocking.length) * 100);

  return {
    stageId:                stage.id,
    position:               stage.position,
    totalAssignments:       assignments.length,
    blockingAssignments:    blocking.length,
    completedBlocking,
    nonblockingAssignments: assignments.length - blocking.length,
    requiredSignatures,
    completedSignaturesInDemonstration: completedSignatures,
    percentComplete,
  };
}

/**
 * True when every blocking assignment in the stage has completed.
 * A stage with no blocking assignments (a distribution-only stage) satisfies its
 * completion rule as soon as it becomes ready — but this function reports the raw
 * rule outcome only; it does not set status.
 */
export function stageCompletionRuleSatisfied(stage: SigningStage): boolean {
  const blocking = (stage.assignments ?? []).filter(isAssignmentBlocking);
  if (blocking.length === 0) return true;
  return blocking.every(isAssignmentComplete);
}

export function stageHasTerminalNegativeAssignment(stage: SigningStage): boolean {
  return (stage.assignments ?? []).some(a => isAssignmentBlocking(a) && isAssignmentTerminalNegative(a));
}

export function isStageTerminal(stage: SigningStage): boolean {
  return TERMINAL_STAGE_STATUSES.includes(stage.status);
}

// ── Stage ordering ────────────────────────────────────────────────────────────

/** Stages sorted by declared position. Never by array order alone. */
export function orderedStages(workflow: SigningWorkflow): SigningStage[] {
  return [...(workflow.stages ?? [])].sort((a, b) => a.position - b.position);
}

/** Positions are valid when they are 1..n contiguous with no duplicates. */
export function stagePositionsAreValid(workflow: SigningWorkflow): boolean {
  const positions = (workflow.stages ?? []).map(s => s.position).sort((a, b) => a - b);
  return positions.every((p, i) => p === i + 1);
}

// ── Current stage ─────────────────────────────────────────────────────────────

const TERMINAL_TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  "completed", "declined", "cancelled", "expired", "voided", "failed-delivery", "archived",
];

export function resolveCurrentStage(
  workflow: SigningWorkflow,
  documentStatus: TransactionStatus,
): WorkflowCurrentStageResolution {
  const stages = orderedStages(workflow);

  if (stages.length === 0) {
    return {
      currentStageId: null, currentStageName: null, currentStagePosition: null,
      reason: "no-stages",
      explanation: "This workflow has no stages yet.",
    };
  }

  if (!stagePositionsAreValid(workflow)) {
    return {
      currentStageId: null, currentStageName: null, currentStagePosition: null,
      reason: "inconsistent-data",
      explanation: "Stage order could not be resolved from the current configuration. Open the workflow builder to review the stage sequence.",
    };
  }

  // A draft workflow has no runtime current stage — it has an editing focus instead.
  if (workflow.configurationStatus === "draft"
    || workflow.configurationStatus === "needs-attention"
    || workflow.configurationStatus === "ready-for-review"
    || workflow.configurationStatus === "not-configured") {
    return {
      currentStageId: null, currentStageName: null, currentStagePosition: null,
      reason: "draft",
      explanation: "This workflow is still being configured. No stage is active.",
    };
  }

  if (TERMINAL_TRANSACTION_STATUSES.includes(documentStatus)) {
    const allDone = stages.every(s => s.status === "completed");
    return {
      currentStageId: null, currentStageName: null, currentStagePosition: null,
      reason: allDone ? "completed" : "terminal",
      explanation: allDone
        ? "Every stage in this workflow has completed."
        : "This document is no longer active, so no stage is currently open.",
    };
  }

  // The current stage is the earliest stage that is neither completed nor otherwise terminal.
  const candidate = stages.find(s => !isStageTerminal(s));

  if (!candidate) {
    return {
      currentStageId: null, currentStageName: null, currentStagePosition: null,
      reason: "completed",
      explanation: "Every stage in this workflow has completed.",
    };
  }

  // A stage that is still marked draft while the workflow is active is inconsistent data.
  if (candidate.status === "draft" || candidate.status === "unavailable") {
    return {
      currentStageId: null, currentStageName: null, currentStagePosition: null,
      reason: "inconsistent-data",
      explanation: "The next stage is not in a state that can be opened. Review the workflow configuration.",
    };
  }

  return {
    currentStageId:   candidate.id,
    currentStageName: candidate.name,
    currentStagePosition: candidate.position,
    reason: "active",
    explanation: `Stage ${candidate.position} of ${stages.length} is the current stage.`,
  };
}

// ── Next stage ────────────────────────────────────────────────────────────────

export function resolveNextStage(
  workflow: SigningWorkflow,
  currentStageId: SigningStageId | null,
): WorkflowNextStageResolution {
  const stages = orderedStages(workflow);
  const first = stages[0];

  if (!first) {
    return {
      nextStageId: null, nextStageName: null, nextStagePosition: null,
      isFinalStage: false,
      explanation: "This workflow has no stages yet.",
    };
  }

  if (!currentStageId) {
    return {
      nextStageId: first.id, nextStageName: first.name, nextStagePosition: first.position,
      isFinalStage: stages.length === 1,
      explanation: `The workflow would begin at Stage ${first.position} — ${first.name}.`,
    };
  }

  const index = stages.findIndex(s => s.id === currentStageId);
  if (index === -1) {
    return {
      nextStageId: null, nextStageName: null, nextStagePosition: null,
      isFinalStage: false,
      explanation: "The next stage could not be resolved from the current configuration.",
    };
  }

  const next = stages[index + 1];
  if (!next) {
    return {
      nextStageId: null, nextStageName: null, nextStagePosition: null,
      isFinalStage: true,
      explanation: "This is the final stage. The workflow completes when this stage completes.",
    };
  }

  return {
    nextStageId: next.id, nextStageName: next.name, nextStagePosition: next.position,
    isFinalStage: false,
    explanation: `When this stage completes, Stage ${next.position} — ${next.name} becomes ready.`,
  };
}

// ── Completion ────────────────────────────────────────────────────────────────

export function resolveWorkflowCompletion(
  workflow: SigningWorkflow,
  documentStatus: TransactionStatus,
): WorkflowCompletionResolution {
  const stages = orderedStages(workflow);
  const allBlockingComplete = stages.length > 0 && stages.every(stageCompletionRuleSatisfied);

  let status: SigningWorkflowStatus = workflow.status;
  let terminalReason: string | null = null;

  if (documentStatus === "cancelled") {
    status = "cancelled";
    terminalReason = "The document transaction was cancelled.";
  } else if (documentStatus === "voided") {
    status = "voided";
    terminalReason = "The document transaction was voided.";
  } else if (documentStatus === "expired") {
    status = "expired";
    terminalReason = "The document transaction expired.";
  } else if (documentStatus === "declined") {
    status = "declined";
    terminalReason = "A participant declined.";
  } else if (stages.some(s => s.status === "rejected")) {
    status = "rejected";
    terminalReason = "An approval was rejected.";
  } else if (stages.some(s => s.status === "blocked") || stages.some(stageHasTerminalNegativeAssignment)) {
    status = "blocked";
    terminalReason = "A required participant can no longer complete their action.";
  } else if (allBlockingComplete && stages.every(s => s.status === "completed")) {
    status = "completed";
    terminalReason = null;
  }

  const explanation =
    status === "completed" ? "All required actions in every stage are complete in this demonstration."
    : status === "blocked" ? "One or more required actions cannot proceed. Review the blocked stage."
    : terminalReason ?? "The workflow has not completed.";

  return { allBlockingComplete, workflowStatus: status, terminalReason, explanation };
}

// ── Workflow progress ─────────────────────────────────────────────────────────

export function resolveWorkflowProgress(workflow: SigningWorkflow): SigningWorkflowProgress {
  const stages = orderedStages(workflow);
  const allAssignments = stages.flatMap(s => s.assignments ?? []);

  // Copy recipients and non-required viewers are excluded from required-action counts.
  const blocking = allAssignments.filter(isAssignmentBlocking);
  const completedRequiredActions = blocking.filter(isAssignmentComplete).length;

  const requiredSignatures = allAssignments.filter(assignmentRequiresSignature);
  const completedSignatures = requiredSignatures.filter(isAssignmentComplete).length;

  const completedStages = stages.filter(s => s.status === "completed").length;

  const percentComplete = blocking.length === 0
    ? (stages.length > 0 && completedStages === stages.length ? 100 : 0)
    : Math.round((completedRequiredActions / blocking.length) * 100);

  return {
    totalStages:              stages.length,
    completedStages,
    totalRequiredActions:     blocking.length,
    completedRequiredActions,
    totalRequiredSignatures:  requiredSignatures.length,
    completedRequiredSignaturesInDemonstration: completedSignatures,
    nonblockingAssignments:   allAssignments.length - blocking.length,
    percentComplete,
  };
}

// ── Stage summaries ───────────────────────────────────────────────────────────

export function resolveStageSummaries(
  workflow: SigningWorkflow,
  currentStageId: SigningStageId | null,
): SigningStageSummary[] {
  return orderedStages(workflow).map(stage => ({
    id:            stage.id,
    name:          stage.name,
    position:      stage.position,
    status:        stage.status,
    executionMode: stage.executionMode,
    progress:      resolveStageProgress(stage),
    isCurrent:     stage.id === currentStageId,
    hasBlockingIssue: stage.status === "blocked" || stageHasTerminalNegativeAssignment(stage),
  }));
}

// ── Assignment eligibility text ───────────────────────────────────────────────
// Plain-language explanation of why an assignment is where it is. Used as the
// non-colour, non-icon status text on every card.

export function describeAssignmentEligibility(
  stage: SigningStage,
  assignment: StageParticipantAssignment,
  isCurrentStage: boolean,
): string {
  if (isAssignmentComplete(assignment)) {
    return assignment.status === "no-longer-required"
      ? "No longer required."
      : "Completed in this demonstration.";
  }
  if (isAssignmentTerminalNegative(assignment)) {
    return "This person can no longer complete their action.";
  }
  if (!isAssignmentBlocking(assignment)) {
    return assignment.action === "receive-copy"
      ? "Receives a copy. Does not hold up the stage."
      : "Does not hold up the stage.";
  }
  if (!isCurrentStage && stage.status === "waiting-for-prior-stage") {
    return `Waiting for stage ${Math.max(1, stage.position - 1)} to complete.`;
  }
  if (stage.executionMode === "ordered") {
    const earlier = (stage.assignments ?? [])
      .filter(a => a.position < assignment.position && isAssignmentBlocking(a));
    const pending = earlier.filter(a => !isAssignmentComplete(a));
    const blocker = pending[0];
    if (blocker) {
      return `Waiting for ${blocker.participantName}.`;
    }
  }
  return isCurrentStage ? "Ready to act." : "Becomes ready when this stage starts.";
}
