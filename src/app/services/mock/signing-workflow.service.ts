// Mock Signing Workflow service — Command 37.
//
// The ONE canonical service boundary for the Signing Workflow feature.
// All state is in-memory for the lifetime of the tab. Nothing is persisted,
// delivered, scheduled, sent, signed, approved, completed, or enforced.
//
// A future backend adapter can implement the same method signatures and swap in
// without touching a single component.
//
// Safety behaviours built in:
//   - Every ID is shape-validated before it is used.
//   - Workspace-scoped drafts are cleared on workspace switch and sign-out.
//   - Field readiness and validation are recomputed by the service, never by the UI.
//   - Stage positions and participant positions are always renormalised to 1..n.

import type {
  SigningWorkflow,
  SigningStage,
  SigningStageId,
  StageParticipantAssignment,
  SigningWorkflowSummary,
  SigningWorkflowProgress,
  SigningWorkflowValidationResult,
  SigningWorkflowScenario,
  WorkflowDocumentPreviewContext,
  WorkflowBoardSelection,
  WorkflowDocumentSummary,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  AddStageInput,
  UpdateStageInput,
  AddStageParticipantInput,
  UpdateStageParticipantInput,
  RecipientOrderConversionPreview,
  SigningWorkflowActivityRecord,
  SigningWorkflowActivityType,
  StageParticipantFieldReadiness,
} from "../../models/signing-workflow";
import {
  signingWorkflowId,
  signingStageId,
  stageAssignmentId,
  isSafeWorkflowIdValue,
  normalizeWorkflowText,
  WORKFLOW_NAME_MAX_LENGTH,
  WORKFLOW_DESCRIPTION_MAX_LENGTH,
  STAGE_NAME_MAX_LENGTH,
  STAGE_DESCRIPTION_MAX_LENGTH,
  STAGE_INSTRUCTION_MAX_LENGTH,
  MAX_STAGES_PER_WORKFLOW,
  MAX_ASSIGNMENTS_PER_STAGE,
  ACTION_TO_PREP_ROLE,
  PREP_ROLE_TO_ACTION,
  isBlockingAction,
  actionAlwaysRequiresSignature,
  actionForbidsSignature,
} from "../../models/signing-workflow";
import {
  SIGNING_WORKFLOW_FIXTURES,
  VALID_WORKFLOW_DOCUMENT_IDS,
  WORKFLOW_PREVIEW_PAGE_COUNTS,
  PREVIEW_UNAVAILABLE_DOCUMENT_IDS,
  WORKFLOW_PARTICIPANT_CANDIDATES,
  WORKFLOW_TEMPLATE_BLUEPRINTS,
  type WorkflowParticipantCandidate,
} from "../../data/mock/signing-workflow";
import { validateSigningWorkflow, computeFieldReadiness } from "../signing-workflow.validation";
import {
  orderedStages,
  resolveCurrentStage,
  resolveNextStage,
  resolveWorkflowProgress,
  isAssignmentBlocking,
  assignmentRequiresSignature,
} from "../signing-workflow.resolver";
import type { TransactionDetail } from "../../models/transaction-detail";
import type { ServiceResult } from "../../models/errors";
import { ok, fail } from "../../models/errors";
import { delay } from "./delay";

// ── Context passed by every caller ────────────────────────────────────────────

export interface SigningWorkflowContext {
  workspaceId:  string;
  teamId:       string | null;
  /** Result of the C35 capability resolution for "signing-workflow". */
  capabilityAvailable: boolean;
  canView:      boolean;
  canEdit:      boolean;
  /** Abort support — the caller flips this when the request is superseded. */
  signal?:      AbortSignal;
}

// ── In-memory store ───────────────────────────────────────────────────────────

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

let store: SigningWorkflow[] = deepCopy(SIGNING_WORKFLOW_FIXTURES);
let activityLog: SigningWorkflowActivityRecord[] = [];
let scenario: SigningWorkflowScenario = "standard";

/** Monotonic counter so generated IDs are stable and never rely on Math.random. */
let idCounter = 1000;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

// ── Guards ────────────────────────────────────────────────────────────────────

function guard(ctx: SigningWorkflowContext, needsEdit: boolean): ServiceResult<true> | null {
  if (!ctx.capabilityAvailable) return fail("FEATURE_UNAVAILABLE");
  if (!ctx.canView) return fail("PERMISSION_DENIED");
  if (needsEdit && !ctx.canEdit) return fail("PERMISSION_DENIED");
  if (ctx.signal?.aborted) return fail("CANCELLED");
  return null;
}

function findWorkflow(documentId: string): SigningWorkflow | undefined {
  return store.find(w => w.documentId === documentId);
}

function findWorkflowById(workflowId: string): SigningWorkflow | undefined {
  return store.find(w => w.id === workflowId);
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/** Renormalises stage positions to 1..n and participant positions to 1..m. */
function renormalize(workflow: SigningWorkflow): void {
  const sorted = [...workflow.stages].sort((a, b) => a.position - b.position);
  sorted.forEach((stage, i) => {
    stage.position = i + 1;
    const assignments = [...stage.assignments].sort((a, b) => a.position - b.position);
    assignments.forEach((a, j) => { a.position = j + 1; });
    stage.assignments = assignments;
  });
  workflow.stages = sorted;
}

/** Recomputes derived state the UI must never set directly. */
function refresh(workflow: SigningWorkflow): void {
  renormalize(workflow);

  for (const stage of workflow.stages) {
    for (const a of stage.assignments) {
      a.role = ACTION_TO_PREP_ROLE[a.action];
      a.blocking = isBlockingAction(a.action);

      // Enforce signature coherence at the data layer, not just in validation.
      if (actionForbidsSignature(a.action)) {
        a.signatureRequirement = { signatureRequired: false, initialsRequired: false, source: "not-required" };
      } else if (actionAlwaysRequiresSignature(a.action)) {
        a.signatureRequirement = {
          ...a.signatureRequirement,
          signatureRequired: true,
          source: "action-implied",
        };
      }

      a.fieldReadiness = computeFieldReadiness(a);
    }
  }

  const result = validateSigningWorkflow(workflow, workflow.documentId);
  if (workflow.configurationStatus !== "ready-in-demonstration") {
    workflow.configurationStatus = result.configurationStatus;
  }
  workflow.updatedAtDemonstration = new Date().toISOString();
}

function logActivity(
  workflow: SigningWorkflow,
  type: SigningWorkflowActivityType,
  title: string,
  description: string,
  stageId: SigningStageId | null = null,
): void {
  activityLog.unshift({
    id: nextId("wfact"),
    workflowId: workflow.id,
    type,
    timestamp: new Date().toISOString(),
    title,
    description,
    stageId,
    demonstrationOnly: true,
  });
  if (activityLog.length > 200) activityLog.length = 200;
}

// ── Summary building ──────────────────────────────────────────────────────────

function buildSummary(
  workflow: SigningWorkflow,
  documentStatus: TransactionDetail["status"],
): SigningWorkflowSummary {
  const validation = validateSigningWorkflow(workflow, workflow.documentId);
  const current = resolveCurrentStage(workflow, documentStatus);
  const next = resolveNextStage(workflow, current.currentStageId);
  const progress: SigningWorkflowProgress = resolveWorkflowProgress(workflow);
  const allAssignments = workflow.stages.flatMap(s => s.assignments);

  return {
    workflowId: workflow.id,
    documentId: workflow.documentId,
    name: workflow.name,
    configurationStatus: workflow.configurationStatus,
    status: workflow.status,
    stageCount: workflow.stages.length,
    participantAssignmentCount: allAssignments.length,
    requiredSignatureCount: allAssignments.filter(assignmentRequiresSignature).length,
    progress,
    currentStageId: current.currentStageId,
    currentStageName: current.currentStageName,
    nextStageId: next.nextStageId,
    nextStageName: next.nextStageName,
    blockingIssueCount: validation.blockingIssueCount,
    advisoryIssueCount: validation.advisoryIssueCount,
  };
}

// ── Document summary ──────────────────────────────────────────────────────────

const CONFIGURATION_LOCKED_STATUSES: readonly TransactionDetail["status"][] = [
  "sent", "delivered", "viewed", "authentication-completed", "awaiting-signature",
  "awaiting-approval", "partially-completed", "completed", "declined",
  "cancelled", "expired", "failed-delivery", "voided", "archived",
];

export function buildDocumentSummary(txn: TransactionDetail): WorkflowDocumentSummary {
  const locked = CONFIGURATION_LOCKED_STATUSES.includes(txn.status);
  return {
    documentId: txn.id,
    title: txn.title,
    documentStatus: txn.status,
    ownerName: txn.ownerName,
    workspaceName: txn.workspaceName,
    participantCount: txn.participants.length,
    demonstrationPageCount: WORKFLOW_PREVIEW_PAGE_COUNTS[txn.id]
      ?? txn.files.reduce((n, f) => n + f.pageCount, 0),
    createdAt: txn.createdAt,
    updatedAt: txn.updatedAt,
    expiresAt: txn.expiresAt ?? null,
    verificationDirection: txn.verificationRecord.recordStatus === "available"
      ? "A verification record is available for this document."
      : "No verification record is available yet.",
    configurationLocked: locked,
    lockReason: locked
      ? "This document is no longer in a draft state, so the signing workflow is shown as read-only configuration."
      : null,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

class MockSigningWorkflowService {

  // ── Read ────────────────────────────────────────────────────────────────────

  async getDocumentWorkflow(
    documentId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflow | null>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<SigningWorkflow | null>;
    if (!isSafeWorkflowIdValue(documentId)) return fail("INVALID_ID");

    await delay(180);
    if (ctx.signal?.aborted) return fail("CANCELLED");
    if (scenario === "full-error") return fail("DEMO_SERVICE_UNAVAILABLE");
    if (!VALID_WORKFLOW_DOCUMENT_IDS.has(documentId)) return fail("NOT_FOUND");

    const found = findWorkflow(documentId);
    if (!found) return ok(null);

    refresh(found);
    return ok(deepCopy(found));
  }

  async getWorkflowSummary(
    documentId: string,
    documentStatus: TransactionDetail["status"],
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflowSummary | null>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<SigningWorkflowSummary | null>;
    if (!isSafeWorkflowIdValue(documentId)) return fail("INVALID_ID");

    await delay(120);
    if (ctx.signal?.aborted) return fail("CANCELLED");

    const found = findWorkflow(documentId);
    if (!found) return ok(null);
    refresh(found);
    return ok(buildSummary(found, documentStatus));
  }

  async listWorkflowStages(
    documentId: string,
    workflowId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningStage[]>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<SigningStage[]>;
    if (!isSafeWorkflowIdValue(documentId) || !isSafeWorkflowIdValue(workflowId)) return fail("INVALID_ID");

    await delay(90);
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    refresh(wf);
    return ok(deepCopy(orderedStages(wf)));
  }

  async getWorkflowStage(
    documentId: string,
    workflowId: string,
    stageId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningStage>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<SigningStage>;
    if (![documentId, workflowId, stageId].every(isSafeWorkflowIdValue)) return fail("INVALID_ID");

    await delay(90);
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    refresh(wf);
    const stage = wf.stages.find(s => s.id === stageId);
    if (!stage) return fail("NOT_FOUND");
    return ok(deepCopy(stage));
  }

  async validateWorkflow(
    documentId: string,
    workflowId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflowValidationResult>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<SigningWorkflowValidationResult>;
    if (!isSafeWorkflowIdValue(documentId) || !isSafeWorkflowIdValue(workflowId)) return fail("INVALID_ID");

    await delay(70);
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    refresh(wf);
    return ok(validateSigningWorkflow(wf, documentId));
  }

  async getWorkflowProgress(
    documentId: string,
    workflowId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflowProgress>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<SigningWorkflowProgress>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    await delay(50);
    refresh(wf);
    return ok(resolveWorkflowProgress(wf));
  }

  async getFieldReadiness(
    documentId: string,
    workflowId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<{ stage: SigningStage; assignment: StageParticipantAssignment }[]>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<{ stage: SigningStage; assignment: StageParticipantAssignment }[]>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    await delay(70);
    refresh(wf);
    const rows = orderedStages(wf).flatMap(stage =>
      stage.assignments.map(assignment => ({ stage: deepCopy(stage), assignment: deepCopy(assignment) })),
    );
    return ok(rows);
  }

  // ── Document preview ────────────────────────────────────────────────────────

  async getWorkflowDocumentPreview(
    documentId: string,
    workflowId: string | null,
    selection: WorkflowBoardSelection,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<WorkflowDocumentPreviewContext>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<WorkflowDocumentPreviewContext>;
    if (!isSafeWorkflowIdValue(documentId)) return fail("INVALID_ID");

    await delay(140);
    if (ctx.signal?.aborted) return fail("CANCELLED");

    const pageCount = WORKFLOW_PREVIEW_PAGE_COUNTS[documentId] ?? 1;
    const unavailable =
      scenario === "preview-unavailable" || PREVIEW_UNAVAILABLE_DOCUMENT_IDS.includes(documentId);

    if (unavailable) {
      return ok({
        availability: "unavailable",
        documentTitle: "",
        pageCount,
        currentPage: 1,
        selection,
        highlightedFields: [],
        missingFieldTypes: [],
        unavailableReason:
          "The document preview could not be loaded. Your workflow configuration is unchanged.",
      });
    }

    const wf = workflowId ? findWorkflowById(workflowId) : findWorkflow(documentId);
    let highlightedFields: WorkflowDocumentPreviewContext["highlightedFields"] = [];
    let missingFieldTypes: WorkflowDocumentPreviewContext["missingFieldTypes"] = [];
    let currentPage = 1;

    if (wf && selection.assignmentId) {
      const assignment = wf.stages
        .flatMap(s => s.assignments)
        .find(a => a.id === selection.assignmentId);
      if (assignment) {
        highlightedFields = assignment.fieldReadiness.assignedFields.filter(f => f.present);
        missingFieldTypes = assignment.fieldReadiness.missingFieldTypes;
        currentPage = highlightedFields[0]?.pageNumber ?? 1;
      }
    } else if (wf && selection.stageId) {
      const stage = wf.stages.find(s => s.id === selection.stageId);
      if (stage) {
        highlightedFields = stage.assignments
          .flatMap(a => a.fieldReadiness.assignedFields)
          .filter(f => f.present);
        currentPage = highlightedFields[0]?.pageNumber ?? 1;
      }
    }

    return ok({
      availability: "available",
      documentTitle: "",
      pageCount,
      currentPage: Math.min(Math.max(1, currentPage), pageCount),
      selection,
      highlightedFields,
      missingFieldTypes,
      unavailableReason: null,
    });
  }

  // ── Create / update workflow ────────────────────────────────────────────────

  async createWorkflowDraft(
    documentId: string,
    input: CreateWorkflowInput,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflow>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<SigningWorkflow>;
    if (!isSafeWorkflowIdValue(documentId)) return fail("INVALID_ID");
    if (!VALID_WORKFLOW_DOCUMENT_IDS.has(documentId)) return fail("NOT_FOUND");
    if (findWorkflow(documentId)) return fail("CONFLICT");

    const name = normalizeWorkflowText(input.name, WORKFLOW_NAME_MAX_LENGTH);
    if (!name) return fail("REQUIRED_FIELD", "name");

    await delay(200);
    const now = new Date().toISOString();
    const workflow: SigningWorkflow = {
      id: signingWorkflowId(nextId("wf")),
      documentId,
      workspaceId: ctx.workspaceId,
      teamId: ctx.teamId,
      name,
      description: normalizeWorkflowText(input.description ?? "", WORKFLOW_DESCRIPTION_MAX_LENGTH) || null,
      stages: [],
      configurationStatus: "draft",
      status: "waiting",
      dueDateDirection: input.dueDateDirection ?? null,
      requestInstruction: input.requestInstruction
        ? normalizeWorkflowText(input.requestInstruction, STAGE_INSTRUCTION_MAX_LENGTH)
        : null,
      createdAtDemonstration: now,
      updatedAtDemonstration: now,
      origin: "built-from-scratch",
      demonstrationOnly: true,
    };

    store.push(workflow);
    refresh(workflow);
    logActivity(workflow, "workflow-draft-created", "Workflow draft created",
      `"${name}" was created as a frontend draft. Nothing was persisted or sent.`);
    return ok(deepCopy(workflow));
  }

  async updateWorkflowDraft(
    documentId: string,
    workflowId: string,
    input: UpdateWorkflowInput,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflow>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<SigningWorkflow>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");

    await delay(120);
    if (input.name !== undefined) {
      const name = normalizeWorkflowText(input.name, WORKFLOW_NAME_MAX_LENGTH);
      if (!name) return fail("REQUIRED_FIELD", "name");
      wf.name = name;
    }
    if (input.description !== undefined) {
      wf.description = input.description
        ? normalizeWorkflowText(input.description, WORKFLOW_DESCRIPTION_MAX_LENGTH) || null
        : null;
    }
    if (input.dueDateDirection !== undefined) wf.dueDateDirection = input.dueDateDirection;
    if (input.requestInstruction !== undefined) {
      wf.requestInstruction = input.requestInstruction
        ? normalizeWorkflowText(input.requestInstruction, STAGE_INSTRUCTION_MAX_LENGTH) || null
        : null;
    }

    refresh(wf);
    return ok(deepCopy(wf));
  }

  async removeWorkflowDraftDemonstration(
    documentId: string,
    workflowId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<true>> {
    const g = guard(ctx, true);
    if (g) return g;
    const index = store.findIndex(w => w.id === workflowId && w.documentId === documentId);
    if (index === -1) return fail("NOT_FOUND");
    await delay(120);
    store.splice(index, 1);
    activityLog = activityLog.filter(a => a.workflowId !== workflowId);
    return ok(true);
  }

  /**
   * Marks the frontend draft as ready in demonstration. This creates NOTHING outside
   * the browser: no request, no invitation, no notification, no signature, no record.
   */
  async createWorkflowPreview(
    documentId: string,
    workflowId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflow>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<SigningWorkflow>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");

    refresh(wf);
    const validation = validateSigningWorkflow(wf, documentId);
    if (!validation.readyForReview) return fail("INCOMPATIBLE_CONFIGURATION");

    await delay(260);
    wf.configurationStatus = "ready-in-demonstration";
    wf.status = "ready";
    // First stage becomes ready; later stages wait. Nothing is completed by this call.
    const stages = orderedStages(wf);
    stages.forEach((stage, i) => {
      stage.status = i === 0 ? "ready" : "waiting-for-prior-stage";
      stage.assignments.forEach(a => {
        if (i !== 0) { a.status = "waiting-for-prior-stage"; return; }
        if (stage.executionMode === "ordered" && a.position > 1) {
          a.status = "waiting-for-prior-participant";
        } else {
          a.status = isAssignmentBlocking(a) ? "ready-for-action" : "waiting-for-prior-stage";
        }
      });
    });

    logActivity(wf, "workflow-created-in-demonstration", "Workflow ready for review",
      "The signing workflow was created in frontend demonstration state. No invitation, notification, or signature was created or delivered.");
    return ok(deepCopy(wf));
  }

  // ── Stages ──────────────────────────────────────────────────────────────────

  async addWorkflowStage(
    documentId: string,
    workflowId: string,
    input: AddStageInput,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningStage>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<SigningStage>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    if (wf.stages.length >= MAX_STAGES_PER_WORKFLOW) return fail("INVALID_STATE");

    const name = normalizeWorkflowText(input.name, STAGE_NAME_MAX_LENGTH);
    if (!name) return fail("REQUIRED_FIELD", "name");

    await delay(140);
    const insertAt = input.position && input.position >= 1 && input.position <= wf.stages.length + 1
      ? input.position
      : wf.stages.length + 1;

    for (const s of wf.stages) {
      if (s.position >= insertAt) s.position += 1;
    }

    const stage: SigningStage = {
      id: signingStageId(nextId("stg")),
      workflowId: wf.id,
      name,
      description: input.description
        ? normalizeWorkflowText(input.description, STAGE_DESCRIPTION_MAX_LENGTH) || null
        : null,
      position: insertAt,
      type: input.type ?? "action",
      executionMode: input.executionMode ?? "parallel",
      completionRule: "all-required-participants-complete",
      assignments: [],
      status: "draft",
      dueDateDirection: input.dueDateDirection ?? null,
      instruction: input.instruction
        ? normalizeWorkflowText(input.instruction, STAGE_INSTRUCTION_MAX_LENGTH) || null
        : null,
      notificationDirection: "notify-when-stage-becomes-ready",
    };

    wf.stages.push(stage);
    refresh(wf);
    logActivity(wf, "stage-added", "Stage added", `"${name}" was added as stage ${stage.position}.`, stage.id);
    return ok(deepCopy(stage));
  }

  async updateWorkflowStage(
    documentId: string,
    workflowId: string,
    stageId: string,
    input: UpdateStageInput,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningStage>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<SigningStage>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    const stage = wf.stages.find(s => s.id === stageId);
    if (!stage) return fail("NOT_FOUND");

    await delay(110);
    if (input.name !== undefined) {
      const name = normalizeWorkflowText(input.name, STAGE_NAME_MAX_LENGTH);
      if (!name) return fail("REQUIRED_FIELD", "name");
      stage.name = name;
    }
    if (input.description !== undefined) {
      stage.description = input.description
        ? normalizeWorkflowText(input.description, STAGE_DESCRIPTION_MAX_LENGTH) || null
        : null;
    }
    if (input.type !== undefined) stage.type = input.type;
    if (input.executionMode !== undefined) stage.executionMode = input.executionMode;
    if (input.instruction !== undefined) {
      stage.instruction = input.instruction
        ? normalizeWorkflowText(input.instruction, STAGE_INSTRUCTION_MAX_LENGTH) || null
        : null;
    }
    if (input.dueDateDirection !== undefined) stage.dueDateDirection = input.dueDateDirection;
    if (input.notificationDirection !== undefined) stage.notificationDirection = input.notificationDirection;

    refresh(wf);
    return ok(deepCopy(stage));
  }

  async duplicateWorkflowStage(
    documentId: string,
    workflowId: string,
    stageId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningStage>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<SigningStage>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    if (wf.stages.length >= MAX_STAGES_PER_WORKFLOW) return fail("INVALID_STATE");
    const source = wf.stages.find(s => s.id === stageId);
    if (!source) return fail("NOT_FOUND");

    await delay(160);
    const newStageId = signingStageId(nextId("stg"));
    const insertAt = source.position + 1;
    for (const s of wf.stages) {
      if (s.position >= insertAt) s.position += 1;
    }

    // Configuration is copied; field assignments are NOT — every copied signer must
    // be given their own fields, so readiness is deliberately reset.
    const copy: SigningStage = {
      ...deepCopy(source),
      id: newStageId,
      name: normalizeWorkflowText(`${source.name} (copy)`, STAGE_NAME_MAX_LENGTH),
      position: insertAt,
      status: "draft",
      assignments: source.assignments.map((a, i) => ({
        ...deepCopy(a),
        id: stageAssignmentId(nextId("asg")),
        stageId: newStageId,
        position: i + 1,
        status: "waiting-for-prior-stage" as const,
        completedAtDemonstration: null,
        fieldReadiness: {
          state: "unavailable" as const,
          requiredFieldCount: 0,
          assignedFieldCount: 0,
          missingFieldTypes: [],
          assignedFields: [],
          staleFieldIds: [],
          foreignFieldIds: [],
          repairActionLabel: null,
        },
      })),
    };

    wf.stages.push(copy);
    refresh(wf);
    logActivity(wf, "stage-added", "Stage duplicated",
      `"${source.name}" was duplicated. Recipients and field assignments must be reviewed.`, copy.id);
    return ok(deepCopy(copy));
  }

  async removeWorkflowStage(
    documentId: string,
    workflowId: string,
    stageId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<true>> {
    const g = guard(ctx, true);
    if (g) return g;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    const index = wf.stages.findIndex(s => s.id === stageId);
    const removed = wf.stages[index];
    if (index === -1 || !removed) return fail("NOT_FOUND");

    await delay(130);
    wf.stages.splice(index, 1);
    refresh(wf);
    logActivity(wf, "stage-removed", "Stage removed", `"${removed.name}" was removed from the draft.`);
    return ok(true);
  }

  async reorderWorkflowStages(
    documentId: string,
    workflowId: string,
    stageIds: string[],
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningStage[]>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<SigningStage[]>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");

    // The submitted order must be a permutation of the existing stage IDs — nothing
    // may be added, removed, or invented by a reorder operation.
    const existing = wf.stages.map(s => String(s.id)).sort();
    const submitted = [...stageIds].sort();
    if (existing.length !== submitted.length || existing.some((id, i) => id !== submitted[i])) {
      return fail("INVALID_INPUT");
    }

    await delay(110);
    stageIds.forEach((id, i) => {
      const stage = wf.stages.find(s => String(s.id) === id);
      if (stage) stage.position = i + 1;
    });
    refresh(wf);
    logActivity(wf, "stage-reordered", "Stages reordered", "The stage sequence was changed in the draft.");
    return ok(deepCopy(orderedStages(wf)));
  }

  // ── Participants ────────────────────────────────────────────────────────────

  async addStageParticipant(
    documentId: string,
    workflowId: string,
    stageId: string,
    input: AddStageParticipantInput,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<StageParticipantAssignment>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<StageParticipantAssignment>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    const stage = wf.stages.find(s => s.id === stageId);
    if (!stage) return fail("NOT_FOUND");
    if (stage.assignments.length >= MAX_ASSIGNMENTS_PER_STAGE) return fail("INVALID_STATE");
    if (!isSafeWorkflowIdValue(input.participantId)) return fail("INVALID_ID");

    // The same person may be in different stages, but never twice in one stage.
    if (stage.assignments.some(a => a.participantId === input.participantId)) {
      return fail("PARTICIPANT_CONFLICT");
    }

    await delay(150);
    const id = stageAssignmentId(nextId("asg"));
    const action = input.action;
    const signatureRequired = actionForbidsSignature(action)
      ? false
      : (input.signatureRequired ?? actionAlwaysRequiresSignature(action));
    const initialsRequired = actionForbidsSignature(action) ? false : (input.initialsRequired ?? false);

    const assignment: StageParticipantAssignment = {
      id,
      workflowId: wf.id,
      stageId: stage.id,
      participantId: input.participantId,
      recipientId: input.recipientId ?? null,
      participantName: normalizeWorkflowText(input.participantName, 120),
      participantEmailMasked: input.participantEmailMasked,
      participantOrganization: input.participantOrganization
        ? normalizeWorkflowText(input.participantOrganization, 120)
        : null,
      participantSource: input.participantSource,
      position: stage.assignments.length + 1,
      role: ACTION_TO_PREP_ROLE[action],
      action,
      signatureRequirement: {
        signatureRequired,
        initialsRequired,
        source: actionAlwaysRequiresSignature(action)
          ? "action-implied"
          : (signatureRequired || initialsRequired) ? "explicit-sender-choice" : "not-required",
      },
      fieldReadiness: {
        state: "unavailable",
        requiredFieldCount: 0,
        assignedFieldCount: 0,
        missingFieldTypes: [],
        assignedFields: [],
        staleFieldIds: [],
        foreignFieldIds: [],
        repairActionLabel: null,
      },
      authenticationDirection: input.authenticationDirection ?? "email-code",
      consentDirection: input.consentDirection ?? "electronic-records-consent-required",
      notificationDirection: input.notificationDirection ?? "notify-when-stage-becomes-ready",
      instruction: input.instruction
        ? normalizeWorkflowText(input.instruction, STAGE_INSTRUCTION_MAX_LENGTH) || null
        : null,
      status: "waiting-for-prior-stage",
      blocking: isBlockingAction(action),
      completedAtDemonstration: null,
    };

    stage.assignments.push(assignment);
    refresh(wf);
    logActivity(wf, "participant-assigned", "Person assigned",
      `${assignment.participantName} was assigned to "${stage.name}".`, stage.id);
    const saved = stage.assignments.find(a => a.id === id)!;
    return ok(deepCopy(saved));
  }

  async updateStageParticipant(
    documentId: string,
    workflowId: string,
    stageId: string,
    assignmentId: string,
    input: UpdateStageParticipantInput,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<StageParticipantAssignment>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<StageParticipantAssignment>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    let stage = wf.stages.find(s => s.id === stageId);
    if (!stage) return fail("NOT_FOUND");
    const assignment = stage.assignments.find(a => a.id === assignmentId);
    if (!assignment) return fail("NOT_FOUND");

    await delay(130);

    // Moving between stages is explicit, never a side effect of visual reordering.
    if (input.targetStageId && input.targetStageId !== stage.id) {
      const target = wf.stages.find(s => s.id === input.targetStageId);
      if (!target) return fail("NOT_FOUND");
      if (target.assignments.some(a => a.participantId === assignment.participantId)) {
        return fail("PARTICIPANT_CONFLICT");
      }
      stage.assignments = stage.assignments.filter(a => a.id !== assignmentId);
      assignment.stageId = target.id;
      assignment.position = target.assignments.length + 1;
      target.assignments.push(assignment);
      stage = target;
    }

    if (input.action !== undefined) {
      assignment.action = input.action;
      if (actionForbidsSignature(input.action)) {
        assignment.signatureRequirement = {
          signatureRequired: false, initialsRequired: false, source: "not-required",
        };
      } else if (actionAlwaysRequiresSignature(input.action)) {
        assignment.signatureRequirement = {
          ...assignment.signatureRequirement, signatureRequired: true, source: "action-implied",
        };
      }
    }

    if (input.signatureRequired !== undefined && !actionForbidsSignature(assignment.action)) {
      assignment.signatureRequirement = {
        ...assignment.signatureRequirement,
        signatureRequired: actionAlwaysRequiresSignature(assignment.action) ? true : input.signatureRequired,
        source: actionAlwaysRequiresSignature(assignment.action)
          ? "action-implied"
          : input.signatureRequired ? "explicit-sender-choice" : "not-required",
      };
    }

    if (input.initialsRequired !== undefined && !actionForbidsSignature(assignment.action)) {
      assignment.signatureRequirement = {
        ...assignment.signatureRequirement,
        initialsRequired: input.initialsRequired,
        source: input.initialsRequired
          ? "explicit-sender-choice"
          : assignment.signatureRequirement.source,
      };
    }

    if (input.authenticationDirection !== undefined) assignment.authenticationDirection = input.authenticationDirection;
    if (input.consentDirection !== undefined) assignment.consentDirection = input.consentDirection;
    if (input.notificationDirection !== undefined) assignment.notificationDirection = input.notificationDirection;
    if (input.instruction !== undefined) {
      assignment.instruction = input.instruction
        ? normalizeWorkflowText(input.instruction, STAGE_INSTRUCTION_MAX_LENGTH) || null
        : null;
    }

    refresh(wf);
    logActivity(wf, "participant-updated", "Assignment updated",
      `The required action for ${assignment.participantName} was updated.`, stage.id);
    return ok(deepCopy(assignment));
  }

  async removeStageParticipant(
    documentId: string,
    workflowId: string,
    stageId: string,
    assignmentId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<true>> {
    const g = guard(ctx, true);
    if (g) return g;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    const stage = wf.stages.find(s => s.id === stageId);
    if (!stage) return fail("NOT_FOUND");
    const index = stage.assignments.findIndex(a => a.id === assignmentId);
    const removed = stage.assignments[index];
    if (index === -1 || !removed) return fail("NOT_FOUND");

    await delay(120);
    stage.assignments.splice(index, 1);
    refresh(wf);
    logActivity(wf, "participant-removed", "Person removed",
      `${removed.participantName} was removed from "${stage.name}".`, stage.id);
    return ok(true);
  }

  async reorderStageParticipants(
    documentId: string,
    workflowId: string,
    stageId: string,
    assignmentIds: string[],
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<StageParticipantAssignment[]>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<StageParticipantAssignment[]>;
    const wf = findWorkflowById(workflowId);
    if (!wf || wf.documentId !== documentId) return fail("NOT_FOUND");
    const stage = wf.stages.find(s => s.id === stageId);
    if (!stage) return fail("NOT_FOUND");

    const existing = stage.assignments.map(a => String(a.id)).sort();
    const submitted = [...assignmentIds].sort();
    if (existing.length !== submitted.length || existing.some((id, i) => id !== submitted[i])) {
      return fail("INVALID_INPUT");
    }

    await delay(100);
    assignmentIds.forEach((id, i) => {
      const a = stage.assignments.find(x => String(x.id) === id);
      if (a) a.position = i + 1;
    });
    refresh(wf);
    // Reordering NEVER changes the execution mode and NEVER completes anyone.
    logActivity(wf, "participant-reordered", "Order changed",
      `The order of people in "${stage.name}" was changed. No one's status was changed.`, stage.id);
    return ok(deepCopy(stage.assignments));
  }

  // ── Candidates ──────────────────────────────────────────────────────────────

  async listParticipantCandidates(
    documentId: string,
    ctx: SigningWorkflowContext,
    documentParticipants: { id: string; name: string; emailMasked: string }[],
  ): Promise<ServiceResult<WorkflowParticipantCandidate[]>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<WorkflowParticipantCandidate[]>;
    await delay(140);
    if (ctx.signal?.aborted) return fail("CANCELLED");

    const fromDocument: WorkflowParticipantCandidate[] = documentParticipants.map(p => ({
      participantId: p.id,
      name: p.name,
      emailMasked: p.emailMasked,
      organization: null,
      source: "document-participant",
      eligible: true,
      ineligibleReason: null,
      workspaceId: ctx.workspaceId,
    }));

    // Cross-workspace members and suspended members never reach the picker.
    const others = WORKFLOW_PARTICIPANT_CANDIDATES.filter(
      c => c.workspaceId === ctx.workspaceId && c.eligible,
    );

    return ok([...fromDocument, ...others]);
  }

  async listTemplateBlueprints(
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<typeof WORKFLOW_TEMPLATE_BLUEPRINTS>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<typeof WORKFLOW_TEMPLATE_BLUEPRINTS>;
    await delay(90);
    return ok(WORKFLOW_TEMPLATE_BLUEPRINTS);
  }

  // ── Recipient-order conversion ──────────────────────────────────────────────

  /** Preview only. Never applies anything. */
  async previewRecipientOrderConversion(
    documentId: string,
    txn: TransactionDetail,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<RecipientOrderConversionPreview>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<RecipientOrderConversionPreview>;
    await delay(160);

    if (txn.participants.length === 0) {
      return ok({
        available: false,
        unavailableReason: "This document has no recipients yet.",
        stages: [], notes: [], wouldOverwriteExistingConfiguration: false,
      });
    }

    // Recipients that share a routing step become one stage.
    const byStep = new Map<number, typeof txn.participants>();
    for (const p of txn.participants) {
      const list = byStep.get(p.routingStep) ?? [];
      list.push(p);
      byStep.set(p.routingStep, list);
    }

    const steps = [...byStep.keys()].sort((a, b) => a - b);
    const stages = steps.map(step => {
      const people = byStep.get(step)!;
      return {
        proposedName: steps.length === 1 ? "Signing" : `Stage ${step}`,
        sourceStepNumber: step,
        participants: people.map(p => {
          const action = PREP_ROLE_TO_ACTION[p.role] ?? "sign";
          const signatureSuggested = action === "sign";
          return {
            participantId: p.id,
            participantName: p.name,
            role: ACTION_TO_PREP_ROLE[action],
            proposedAction: action,
            signatureSuggested,
            suggestionReason: signatureSuggested
              ? "This person is currently a Signer, so a signature requirement is suggested. Review it before applying."
              : "No signature requirement is suggested. Approval, review, and acknowledgment requirements must be set explicitly.",
          };
        }),
      };
    });

    return ok({
      available: true,
      unavailableReason: null,
      stages,
      notes: [
        "Each existing routing step becomes one stage.",
        "Recipients that already share a step stay together in the same stage.",
        "Generated stage names are editable before and after applying.",
        "Signature requirements are suggestions only and remain reviewable.",
        "Approval, review, and acknowledgment requirements are never inferred from a job title.",
      ],
      wouldOverwriteExistingConfiguration: !!findWorkflow(documentId),
    });
  }

  /** Applies a previewed conversion. Refuses to overwrite an existing configuration. */
  async applyRecipientOrderConversion(
    documentId: string,
    txn: TransactionDetail,
    workflowName: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflow>> {
    const g = guard(ctx, true);
    if (g) return g as ServiceResult<SigningWorkflow>;
    if (findWorkflow(documentId)) return fail("CONFLICT");

    const previewResult = await this.previewRecipientOrderConversion(documentId, txn, ctx);
    if (!previewResult.ok) return previewResult;
    if (!previewResult.data.available) return fail("INVALID_STATE");

    const created = await this.createWorkflowDraft(
      documentId,
      { name: workflowName, description: "", dueDateDirection: null, requestInstruction: null },
      ctx,
    );
    if (!created.ok) return created;

    const wf = findWorkflowById(String(created.data.id))!;

    for (const previewStage of previewResult.data.stages) {
      const hasOnlyCopies = previewStage.participants.every(
        p => p.proposedAction === "receive-copy" || p.proposedAction === "view",
      );
      const stageResult = await this.addWorkflowStage(
        documentId, String(wf.id),
        { name: previewStage.proposedName, type: hasOnlyCopies ? "distribution" : "action" },
        ctx,
      );
      if (!stageResult.ok) continue;

      for (const person of previewStage.participants) {
        const source = txn.participants.find(p => p.id === person.participantId);
        await this.addStageParticipant(documentId, String(wf.id), String(stageResult.data.id), {
          participantId: person.participantId,
          participantName: person.participantName,
          participantEmailMasked: source?.emailMasked ?? "",
          participantSource: "document-participant",
          action: person.proposedAction,
          signatureRequired: person.signatureSuggested,
        }, ctx);
      }
    }

    wf.origin = "converted-from-recipient-order";
    refresh(wf);
    logActivity(wf, "converted-from-recipient-order", "Stages created from recipient order",
      "Stages were created from the current recipient order. Every requirement remains reviewable.");
    return ok(deepCopy(wf));
  }

  // ── Activity (frontend demonstration records only) ──────────────────────────

  async listWorkflowActivity(
    workflowId: string,
    ctx: SigningWorkflowContext,
  ): Promise<ServiceResult<SigningWorkflowActivityRecord[]>> {
    const g = guard(ctx, false);
    if (g) return g as ServiceResult<SigningWorkflowActivityRecord[]>;
    await delay(60);
    return ok(activityLog.filter(a => String(a.workflowId) === workflowId).slice(0, 25));
  }

  // ── Lifecycle / cleanup ─────────────────────────────────────────────────────

  /** Called on workspace switch. Drops every draft created in the prior workspace. */
  clearWorkspaceScopedWorkflows(nextWorkspaceId: string): void {
    store = store.filter(w => w.origin === "fixture" || w.workspaceId === nextWorkspaceId);
    activityLog = activityLog.filter(a => store.some(w => w.id === a.workflowId));
  }

  /** Called on sign-out and account change. Returns everything to fixture state. */
  resetSigningWorkflowDemonstration(): void {
    store = deepCopy(SIGNING_WORKFLOW_FIXTURES);
    activityLog = [];
    scenario = "standard";
    idCounter = 1000;
  }

  resetWorkflowScenario(): void {
    scenario = "standard";
  }

  setWorkflowScenario(next: SigningWorkflowScenario): void {
    scenario = next;
  }
}

export const signingWorkflowService = new MockSigningWorkflowService();
export type { WorkflowParticipantCandidate };
