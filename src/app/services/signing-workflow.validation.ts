// Signing Workflow — the single centralized validation engine.
//
// Every surface (builder, stage editor, participant panel, review screen, board,
// field-readiness matrix) reads from this one function. Validation logic must never
// be duplicated inside a card or a page component.
//
// Rules enforced here that matter most:
//   - Sign always requires the participant's own Signature field.
//   - Approve / Review / Acknowledge + signature requires the participant's own Signature field.
//   - View and Receive a Copy must never carry a signature requirement.
//   - One Signature field belongs to exactly one participant assignment.
//   - A non-final action stage must contain at least one blocking participant.
//   - A workflow must contain at least one blocking action before it can complete.
//
// Nothing here claims legal compliance. Readiness is a configuration check.

import type {
  SigningWorkflow,
  SigningStage,
  SigningWorkflowValidationIssue,
  SigningWorkflowValidationResult,
  SigningWorkflowConfigurationStatus,
  StageParticipantAssignment,
  StageParticipantFieldReadiness,
} from "../models/signing-workflow";
import {
  MAX_ASSIGNMENTS_PER_STAGE,
  MAX_STAGES_PER_WORKFLOW,
  actionForbidsSignature,
  actionAlwaysRequiresSignature,
  isBlockingAction,
  isFieldReadinessSatisfied,
} from "../models/signing-workflow";
import { orderedStages, stagePositionsAreValid, isAssignmentBlocking } from "./signing-workflow.resolver";

// ── Issue builder ─────────────────────────────────────────────────────────────

type IssueInput = Omit<SigningWorkflowValidationIssue, "stageName" | "participantName"> & {
  stageName?: string | null;
  participantName?: string | null;
};

function issue(i: IssueInput): SigningWorkflowValidationIssue {
  return {
    issueId:  i.issueId,
    severity: i.severity,
    message:  i.message,
    stageId:  i.stageId,
    stageName: i.stageName ?? null,
    assignmentId: i.assignmentId,
    participantName: i.participantName ?? null,
    repairActionLabel: i.repairActionLabel,
    repairTarget: i.repairTarget,
  };
}

// ── Field readiness ───────────────────────────────────────────────────────────

/**
 * Recomputes field readiness for one assignment from the field references it carries.
 * Called by the service whenever fields or requirements change, so readiness is never
 * a value the UI can set directly.
 */
export function computeFieldReadiness(
  assignment: StageParticipantAssignment,
): StageParticipantFieldReadiness {
  const base = assignment.fieldReadiness;
  const fields = base.assignedFields ?? [];

  const presentFields = fields.filter(f => f.present);
  const staleFieldIds = fields.filter(f => !f.present).map(f => f.fieldId);
  const foreignFieldIds = fields
    .filter(f => f.ownerAssignmentId !== assignment.id)
    .map(f => f.fieldId);

  const { signatureRequired, initialsRequired } = assignment.signatureRequirement;
  const needsSignature = signatureRequired || actionAlwaysRequiresSignature(assignment.action);

  // Non-blocking assignments never need fields.
  if (!isBlockingAction(assignment.action)) {
    return {
      ...base,
      state: "nonblocking",
      requiredFieldCount: 0,
      assignedFieldCount: presentFields.length,
      missingFieldTypes: [],
      staleFieldIds,
      foreignFieldIds,
      repairActionLabel: null,
    };
  }

  const ownFields = presentFields.filter(f => f.ownerAssignmentId === assignment.id);
  const hasOwnSignature = ownFields.some(f => f.fieldType === "signature");
  const hasOwnInitials  = ownFields.some(f => f.fieldType === "initials");

  const missingFieldTypes: StageParticipantFieldReadiness["missingFieldTypes"] = [];
  if (needsSignature && !hasOwnSignature) missingFieldTypes.push("signature");
  if (initialsRequired && !hasOwnInitials) missingFieldTypes.push("initials");

  const requiredFieldCount = (needsSignature ? 1 : 0) + (initialsRequired ? 1 : 0);

  let state: StageParticipantFieldReadiness["state"];
  let repairActionLabel: string | null = null;

  if (foreignFieldIds.length > 0) {
    state = "field-assigned-to-another-participant";
    repairActionLabel = "Open Field Placement";
  } else if (needsSignature && !hasOwnSignature) {
    state = "missing-signature-field";
    repairActionLabel = "Open Field Placement";
  } else if (initialsRequired && !hasOwnInitials) {
    state = "missing-initials-field";
    repairActionLabel = "Open Field Placement";
  } else if (staleFieldIds.length > 0) {
    state = "missing-required-fields";
    repairActionLabel = "Open Field Placement";
  } else if (requiredFieldCount === 0) {
    // A blocking action with no signature requirement (e.g. Review only) needs no fields.
    state = "ready";
  } else {
    state = "ready";
  }

  return {
    state,
    requiredFieldCount,
    assignedFieldCount: ownFields.length,
    missingFieldTypes,
    assignedFields: fields,
    staleFieldIds,
    foreignFieldIds,
    repairActionLabel,
  };
}

// ── Per-assignment validation ─────────────────────────────────────────────────

function validateAssignment(
  stage: SigningStage,
  assignment: StageParticipantAssignment,
  workflowDocumentId: string,
  seenParticipantIdsInStage: Set<string>,
  participantStageCount: Map<string, number>,
): SigningWorkflowValidationIssue[] {
  const out: SigningWorkflowValidationIssue[] = [];
  const ctx = {
    stageId: stage.id, stageName: stage.name,
    assignmentId: assignment.id, participantName: assignment.participantName,
  };

  // Identity
  if (!assignment.participantId || !assignment.participantName.trim()) {
    out.push(issue({
      ...ctx, issueId: "participant-missing", severity: "blocking",
      message: `A person in "${stage.name}" is missing identity information.`,
      repairActionLabel: "Open participant", repairTarget: "participant-editor",
    }));
  }

  if (assignment.participantSource === "document-participant" && !workflowDocumentId) {
    out.push(issue({
      ...ctx, issueId: "participant-wrong-document", severity: "blocking",
      message: `${assignment.participantName} could not be matched to this document.`,
      repairActionLabel: "Open participant", repairTarget: "participant-editor",
    }));
  }

  // Signature requirement coherence
  const { signatureRequired, initialsRequired, source } = assignment.signatureRequirement;

  if (actionForbidsSignature(assignment.action) && (signatureRequired || initialsRequired)) {
    out.push(issue({
      ...ctx, issueId: "participant-signature-requirement-incoherent", severity: "blocking",
      message: `${assignment.participantName} is set to ${assignment.action === "view" ? "View" : "Receive a Copy"}, which cannot require an electronic signature.`,
      repairActionLabel: "Fix requirement", repairTarget: "participant-editor",
    }));
  }

  if (actionAlwaysRequiresSignature(assignment.action) && !signatureRequired) {
    out.push(issue({
      ...ctx, issueId: "participant-signature-requirement-incoherent", severity: "blocking",
      message: `${assignment.participantName} is set to Sign, so an electronic signature is required.`,
      repairActionLabel: "Fix requirement", repairTarget: "participant-editor",
    }));
  }

  if (signatureRequired && source === "not-required") {
    out.push(issue({
      ...ctx, issueId: "participant-signature-requirement-incoherent", severity: "advisory",
      message: `The signature requirement for ${assignment.participantName} is not recorded as an explicit choice.`,
      repairActionLabel: "Review requirement", repairTarget: "participant-editor",
    }));
  }

  // Field readiness
  const readiness = assignment.fieldReadiness;
  if (isBlockingAction(assignment.action) && !isFieldReadinessSatisfied(readiness.state)) {
    if (readiness.state === "missing-signature-field") {
      out.push(issue({
        ...ctx, issueId: "field-signature-missing", severity: "blocking",
        message: `${assignment.participantName} needs their own Signature field on the document.`,
        repairActionLabel: "Open Field Placement", repairTarget: "field-placement",
      }));
    } else if (readiness.state === "missing-initials-field") {
      out.push(issue({
        ...ctx, issueId: "field-initials-missing", severity: "blocking",
        message: `${assignment.participantName} needs their own Initials field on the document.`,
        repairActionLabel: "Open Field Placement", repairTarget: "field-placement",
      }));
    } else if (readiness.state === "field-assigned-to-another-participant") {
      out.push(issue({
        ...ctx, issueId: "field-owned-by-other-participant", severity: "blocking",
        message: `A field listed for ${assignment.participantName} belongs to a different person. One signature field belongs to one person.`,
        repairActionLabel: "Open Field Placement", repairTarget: "field-placement",
      }));
    } else if (readiness.state === "missing-required-fields") {
      out.push(issue({
        ...ctx, issueId: "field-required-missing", severity: "blocking",
        message: `${assignment.participantName} has required fields that are no longer available on the document.`,
        repairActionLabel: "Open Field Placement", repairTarget: "field-placement",
      }));
    } else if (readiness.state === "unavailable") {
      out.push(issue({
        ...ctx, issueId: "field-required-missing", severity: "advisory",
        message: `Field information for ${assignment.participantName} could not be read.`,
        repairActionLabel: "Open Field Placement", repairTarget: "field-placement",
      }));
    }
  }

  if (readiness.staleFieldIds.length > 0 && isFieldReadinessSatisfied(readiness.state)) {
    out.push(issue({
      ...ctx, issueId: "field-removed", severity: "advisory",
      message: `A field previously assigned to ${assignment.participantName} is no longer on the document.`,
      repairActionLabel: "Open Field Placement", repairTarget: "field-placement",
    }));
  }

  // Duplicates
  if (seenParticipantIdsInStage.has(assignment.participantId)) {
    out.push(issue({
      ...ctx, issueId: "participant-duplicate-in-stage", severity: "blocking",
      message: `${assignment.participantName} appears more than once in "${stage.name}". Each person acts once per stage.`,
      repairActionLabel: "Remove duplicate", repairTarget: "stage-editor",
    }));
  }
  seenParticipantIdsInStage.add(assignment.participantId);

  const stageCount = participantStageCount.get(assignment.participantId) ?? 0;
  if (stageCount > 1) {
    out.push(issue({
      ...ctx, issueId: "participant-repeated-across-stages", severity: "advisory",
      message: `${assignment.participantName} is assigned in ${stageCount} stages. Each assignment is a separate action they must complete.`,
      repairActionLabel: "Review assignments", repairTarget: "stage-editor",
    }));
  }

  // Position
  if (!Number.isInteger(assignment.position) || assignment.position < 1) {
    out.push(issue({
      ...ctx, issueId: "participant-invalid-position", severity: "blocking",
      message: `The order of ${assignment.participantName} within "${stage.name}" is not valid.`,
      repairActionLabel: "Open stage", repairTarget: "stage-editor",
    }));
  }

  // Direction values
  if (assignment.authenticationDirection === "not-configured" && isBlockingAction(assignment.action)) {
    out.push(issue({
      ...ctx, issueId: "participant-auth-unsupported", severity: "advisory",
      message: `No authentication direction is set for ${assignment.participantName}.`,
      repairActionLabel: "Set authentication", repairTarget: "participant-editor",
    }));
  }

  return out;
}

// ── Per-stage validation ──────────────────────────────────────────────────────

function validateStage(
  stage: SigningStage,
  isFinalStage: boolean,
  duplicateNameCount: number,
  workflowDocumentId: string,
  participantStageCount: Map<string, number>,
): SigningWorkflowValidationIssue[] {
  const out: SigningWorkflowValidationIssue[] = [];
  const ctx = { stageId: stage.id, stageName: stage.name, assignmentId: null };

  if (!stage.name.trim()) {
    out.push(issue({
      ...ctx, issueId: "stage-name-required", severity: "blocking",
      message: `Stage ${stage.position} needs a name.`,
      repairActionLabel: "Name this stage", repairTarget: "stage-editor",
    }));
  }

  if (duplicateNameCount > 1) {
    out.push(issue({
      ...ctx, issueId: "stage-duplicate-name", severity: "advisory",
      message: `More than one stage is called "${stage.name}". The stage number tells them apart.`,
      repairActionLabel: "Rename stage", repairTarget: "stage-editor",
    }));
  }

  const assignments = stage.assignments ?? [];

  if (assignments.length === 0) {
    out.push(issue({
      ...ctx, issueId: "stage-empty", severity: "blocking",
      message: `"${stage.name}" has no people in it yet.`,
      repairActionLabel: "Add person", repairTarget: "stage-editor",
    }));
  }

  if (assignments.length > MAX_ASSIGNMENTS_PER_STAGE) {
    out.push(issue({
      ...ctx, issueId: "stage-too-many-participants", severity: "blocking",
      message: `"${stage.name}" has more than ${MAX_ASSIGNMENTS_PER_STAGE} people.`,
      repairActionLabel: "Open stage", repairTarget: "stage-editor",
    }));
  }

  const blocking = assignments.filter(isAssignmentBlocking);

  if (stage.type === "action" && assignments.length > 0 && blocking.length === 0) {
    out.push(issue({
      ...ctx, issueId: "stage-no-blocking-participant", severity: "blocking",
      message: `"${stage.name}" has no one who must act, so it would never complete. Add someone who signs, approves, reviews, or acknowledges — or make this a distribution stage.`,
      repairActionLabel: "Open stage", repairTarget: "stage-editor",
    }));
  }

  if (stage.type === "distribution" && blocking.length > 0) {
    out.push(issue({
      ...ctx, issueId: "stage-distribution-has-blocking-action", severity: "blocking",
      message: `"${stage.name}" is a distribution stage, so it can only contain people who receive a copy or view the document.`,
      repairActionLabel: "Open stage", repairTarget: "stage-editor",
    }));
  }

  if (stage.type === "distribution" && !isFinalStage) {
    out.push(issue({
      ...ctx, issueId: "stage-terminal-dead-end", severity: "advisory",
      message: `"${stage.name}" only distributes copies but is not the last stage. Distribution normally comes last.`,
      repairActionLabel: "Move stage", repairTarget: "stage-editor",
    }));
  }

  if (stage.executionMode !== "parallel" && stage.executionMode !== "ordered") {
    out.push(issue({
      ...ctx, issueId: "stage-invalid-execution-mode", severity: "blocking",
      message: `"${stage.name}" has an execution setting that is not supported.`,
      repairActionLabel: "Open stage", repairTarget: "stage-editor",
    }));
  }

  if (stage.completionRule !== "all-required-participants-complete") {
    out.push(issue({
      ...ctx, issueId: "stage-invalid-completion-rule", severity: "blocking",
      message: `"${stage.name}" has a completion rule that is not supported.`,
      repairActionLabel: "Open stage", repairTarget: "stage-editor",
    }));
  }

  if (!Number.isInteger(stage.position) || stage.position < 1) {
    out.push(issue({
      ...ctx, issueId: "stage-invalid-position", severity: "blocking",
      message: `The position of "${stage.name}" is not valid.`,
      repairActionLabel: "Reorder stages", repairTarget: "stage-editor",
    }));
  }

  // Ordered stages need distinct, contiguous participant positions.
  if (stage.executionMode === "ordered" && assignments.length > 1) {
    const positions = assignments.map(a => a.position).sort((a, b) => a - b);
    const contiguous = positions.every((p, i) => p === i + 1);
    if (!contiguous) {
      out.push(issue({
        ...ctx, issueId: "participant-invalid-position", severity: "blocking",
        message: `"${stage.name}" runs one person after another, but the order is not valid.`,
        repairActionLabel: "Open stage", repairTarget: "stage-editor",
      }));
    }
  }

  const seen = new Set<string>();
  for (const a of assignments) {
    out.push(...validateAssignment(stage, a, workflowDocumentId, seen, participantStageCount));
  }

  return out;
}

// ── Workflow validation ───────────────────────────────────────────────────────

export function validateSigningWorkflow(
  workflow: SigningWorkflow,
  expectedDocumentId: string,
): SigningWorkflowValidationResult {
  const issues: SigningWorkflowValidationIssue[] = [];
  const stages = orderedStages(workflow);

  if (!workflow.name.trim()) {
    issues.push(issue({
      issueId: "workflow-name-required", severity: "blocking",
      message: "This signing workflow needs a name.",
      stageId: null, assignmentId: null,
      repairActionLabel: "Add a name", repairTarget: "workflow-basics",
    }));
  }

  if (workflow.documentId !== expectedDocumentId) {
    issues.push(issue({
      issueId: "workflow-document-mismatch", severity: "blocking",
      message: "This workflow does not belong to the document you are viewing.",
      stageId: null, assignmentId: null,
      repairActionLabel: null, repairTarget: null,
    }));
  }

  if (stages.length === 0) {
    issues.push(issue({
      issueId: "workflow-no-stages", severity: "blocking",
      message: "Add at least one stage. Stages control when people act.",
      stageId: null, assignmentId: null,
      repairActionLabel: "Add first stage", repairTarget: "stage-editor",
    }));
  }

  if (stages.length > MAX_STAGES_PER_WORKFLOW) {
    issues.push(issue({
      issueId: "workflow-too-many-stages", severity: "blocking",
      message: `A signing workflow can have at most ${MAX_STAGES_PER_WORKFLOW} stages.`,
      stageId: null, assignmentId: null,
      repairActionLabel: "Remove a stage", repairTarget: "stage-editor",
    }));
  }

  if (stages.length > 0 && !stagePositionsAreValid(workflow)) {
    issues.push(issue({
      issueId: "workflow-stage-order-invalid", severity: "blocking",
      message: "The stage order is not valid. Reorder the stages so they run 1, 2, 3 and so on.",
      stageId: null, assignmentId: null,
      repairActionLabel: "Reorder stages", repairTarget: "stage-editor",
    }));
  }

  const allAssignments = stages.flatMap(s => s.assignments ?? []);
  const anyBlocking = allAssignments.some(isAssignmentBlocking);

  if (stages.length > 0 && !anyBlocking) {
    issues.push(issue({
      issueId: "workflow-no-blocking-action", severity: "blocking",
      message: "No one in this workflow has to act, so it would never complete. At least one person must sign, approve, review, or acknowledge.",
      stageId: null, assignmentId: null,
      repairActionLabel: "Configure actions", repairTarget: "stage-editor",
    }));
  }

  // How many stages each participant appears in — drives the repeated-assignment advisory.
  const participantStageCount = new Map<string, number>();
  for (const stage of stages) {
    const uniqueInStage = new Set((stage.assignments ?? []).map(a => a.participantId));
    for (const pid of uniqueInStage) {
      participantStageCount.set(pid, (participantStageCount.get(pid) ?? 0) + 1);
    }
  }

  const nameCounts = new Map<string, number>();
  for (const s of stages) {
    const key = s.name.trim().toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  stages.forEach((stage, index) => {
    issues.push(...validateStage(
      stage,
      index === stages.length - 1,
      nameCounts.get(stage.name.trim().toLowerCase()) ?? 1,
      workflow.documentId,
      participantStageCount,
    ));
  });

  const blockingIssueCount = issues.filter(i => i.severity === "blocking").length;
  const advisoryIssueCount = issues.filter(i => i.severity === "advisory").length;
  const readyForReview = blockingIssueCount === 0 && stages.length > 0;

  const configurationStatus: SigningWorkflowConfigurationStatus =
    workflow.configurationStatus === "ready-in-demonstration" ? "ready-in-demonstration"
    : blockingIssueCount > 0 ? (stages.length === 0 ? "draft" : "needs-attention")
    : readyForReview ? "ready-for-review"
    : "draft";

  return { issues, blockingIssueCount, advisoryIssueCount, readyForReview, configurationStatus };
}

// ── Issue grouping helpers for the UI ─────────────────────────────────────────

export function issuesForStage(
  result: SigningWorkflowValidationResult,
  stageId: string,
): SigningWorkflowValidationIssue[] {
  return result.issues.filter(i => i.stageId === stageId);
}

export function issuesForAssignment(
  result: SigningWorkflowValidationResult,
  assignmentId: string,
): SigningWorkflowValidationIssue[] {
  return result.issues.filter(i => i.assignmentId === assignmentId);
}

export function blockingIssuesForAssignment(
  result: SigningWorkflowValidationResult,
  assignmentId: string,
): SigningWorkflowValidationIssue[] {
  return issuesForAssignment(result, assignmentId).filter(i => i.severity === "blocking");
}
