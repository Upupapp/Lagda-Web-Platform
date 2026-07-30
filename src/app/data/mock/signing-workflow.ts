// Signing Workflow deterministic fixtures — Command 37.
//
// Every name, organization, and document title is fictional and matches the existing
// transaction fixtures (txn_001–txn_008) so the Workflow tab lines up with the rest of
// Document Details.
//
// Contains NO signature representations, NO Evidence payloads, NO authentication codes,
// NO access tokens, NO recipient links, NO field values, and NO legal-validity claims.
// Field references carry a type and a page number only.

import type {
  SigningWorkflow,
  SigningStage,
  SigningStageId,
  SigningWorkflowId,
  StageParticipantAssignment,
  StageParticipantAssignmentId,
  StageParticipantAction,
  StageParticipantStatus,
  SigningStageStatus,
  StageAssignedFieldRef,
  SigningStageExecutionMode,
  SigningStageType,
} from "../../models/signing-workflow";
import {
  signingWorkflowId,
  signingStageId,
  stageAssignmentId,
  ACTION_TO_PREP_ROLE,
  isBlockingAction,
} from "../../models/signing-workflow";
import type { FieldType } from "../../models/field-editor";

// ── Builders ──────────────────────────────────────────────────────────────────

interface FieldSpec {
  id:   string;
  type: FieldType;
  page: number;
  /** When set, the field is owned by a DIFFERENT assignment (used by the issue fixture). */
  foreignOwner?: string;
  /** When false, the field no longer exists on the document (stale reference). */
  present?: boolean;
}

interface AssignmentSpec {
  id:      string;
  participantId: string;
  name:    string;
  emailMasked: string;
  organization?: string | null;
  action:  StageParticipantAction;
  signatureRequired?: boolean;
  initialsRequired?:  boolean;
  status?: StageParticipantStatus;
  position?: number;
  fields?: FieldSpec[];
  auth?:   StageParticipantAssignment["authenticationDirection"];
  consent?: StageParticipantAssignment["consentDirection"];
  notify?: StageParticipantAssignment["notificationDirection"];
  completedAt?: string | null;
}

function mkAssignment(
  workflowId: SigningWorkflowId,
  stageId: SigningStageId,
  spec: AssignmentSpec,
  index: number,
): StageParticipantAssignment {
  const id = stageAssignmentId(spec.id);
  const action = spec.action;

  const sigRequired = spec.signatureRequired ?? action === "sign";
  const initRequired = spec.initialsRequired ?? false;

  const assignedFields: StageAssignedFieldRef[] = (spec.fields ?? []).map(f => ({
    fieldId:   f.id,
    fieldType: f.type,
    pageNumber: f.page,
    ownerAssignmentId: stageAssignmentId(f.foreignOwner ?? spec.id),
    present:   f.present !== false,
  }));

  return {
    id,
    workflowId,
    stageId,
    participantId: spec.participantId,
    recipientId:   null,
    participantName: spec.name,
    participantEmailMasked: spec.emailMasked,
    participantOrganization: spec.organization ?? null,
    participantSource: "document-participant",
    position: spec.position ?? index + 1,
    role: ACTION_TO_PREP_ROLE[action],
    action,
    signatureRequirement: {
      signatureRequired: sigRequired,
      initialsRequired:  initRequired,
      source: action === "sign"
        ? "action-implied"
        : (sigRequired || initRequired) ? "explicit-sender-choice" : "not-required",
    },
    // Placeholder — recomputed by computeFieldReadiness() in the service on load.
    fieldReadiness: {
      state: "unavailable",
      requiredFieldCount: 0,
      assignedFieldCount: 0,
      missingFieldTypes: [],
      assignedFields,
      staleFieldIds: [],
      foreignFieldIds: [],
      repairActionLabel: null,
    },
    authenticationDirection: spec.auth ?? "email-code",
    consentDirection:        spec.consent ?? "electronic-records-consent-required",
    notificationDirection:   spec.notify ?? "notify-when-stage-becomes-ready",
    instruction: null,
    status: spec.status ?? "waiting-for-prior-stage",
    blocking: isBlockingAction(action),
    completedAtDemonstration: spec.completedAt ?? null,
  };
}

interface StageSpec {
  id:   string;
  name: string;
  description?: string | null;
  type?: SigningStageType;
  executionMode?: SigningStageExecutionMode;
  status?: SigningStageStatus;
  instruction?: string | null;
  dueDateDirection?: string | null;
  assignments: AssignmentSpec[];
}

function mkStage(workflowId: SigningWorkflowId, spec: StageSpec, position: number): SigningStage {
  const id = signingStageId(spec.id);
  return {
    id,
    workflowId,
    name: spec.name,
    description: spec.description ?? null,
    position,
    type: spec.type ?? "action",
    executionMode: spec.executionMode ?? "parallel",
    completionRule: "all-required-participants-complete",
    assignments: spec.assignments.map((a, i) => mkAssignment(workflowId, id, a, i)),
    status: spec.status ?? "draft",
    dueDateDirection: spec.dueDateDirection ?? null,
    instruction: spec.instruction ?? null,
    notificationDirection: "notify-when-stage-becomes-ready",
  };
}

interface WorkflowSpec {
  id:          string;
  documentId:  string;
  name:        string;
  description?: string | null;
  configurationStatus: SigningWorkflow["configurationStatus"];
  status:      SigningWorkflow["status"];
  origin?:     SigningWorkflow["origin"];
  createdAt:   string;
  updatedAt:   string;
  stages:      StageSpec[];
}

function mkWorkflow(spec: WorkflowSpec): SigningWorkflow {
  const id = signingWorkflowId(spec.id);
  return {
    id,
    documentId:  spec.documentId,
    workspaceId: "ws_northbridge_001",
    teamId:      null,
    name:        spec.name,
    description: spec.description ?? null,
    stages:      spec.stages.map((s, i) => mkStage(id, s, i + 1)),
    configurationStatus: spec.configurationStatus,
    status:      spec.status,
    dueDateDirection:   null,
    requestInstruction: null,
    createdAtDemonstration: spec.createdAt,
    updatedAtDemonstration: spec.updatedAt,
    origin: spec.origin ?? "fixture",
    demonstrationOnly: true,
  };
}

// ── txn_001 — Sequential two-stage signing, stage 1 complete, stage 2 current ──

const WF_001 = mkWorkflow({
  id: "wf_001",
  documentId: "txn_001",
  name: "Retainer Agreement Workflow",
  description: "Client signs first, then the firm countersigns.",
  configurationStatus: "ready-in-demonstration",
  status: "in-progress",
  createdAt: "2026-07-10T08:10:00Z",
  updatedAt: "2026-07-10T10:32:00Z",
  stages: [
    {
      id: "stg_001_client",
      name: "Client Signing",
      description: "The client signs the retainer agreement.",
      status: "completed",
      assignments: [
        {
          id: "asg_001_maria",
          participantId: "par_001_maria",
          name: "Maria Reyes",
          emailMasked: "m****@example.com",
          organization: "Mabini Business Services",
          action: "sign",
          status: "completed",
          completedAt: "2026-07-10T10:31:00Z",
          fields: [
            { id: "fld_001_sig_maria",  type: "signature",   page: 4 },
            { id: "fld_001_name_maria", type: "full-name",   page: 4 },
            { id: "fld_001_date_maria", type: "date-signed", page: 4 },
          ],
        },
      ],
    },
    {
      id: "stg_001_firm",
      name: "Company Signing",
      description: "Northbridge Legal countersigns.",
      status: "in-progress",
      assignments: [
        {
          id: "asg_001_antonio",
          participantId: "par_001_antonio",
          name: "Antonio Tan",
          emailMasked: "a****@example.com",
          organization: "Northbridge Legal",
          action: "sign",
          status: "ready-for-action",
          notify: "notify-when-assignment-becomes-ready",
          fields: [
            { id: "fld_001_sig_antonio",  type: "signature",   page: 4 },
            { id: "fld_001_name_antonio", type: "full-name",   page: 4 },
            { id: "fld_001_date_antonio", type: "date-signed", page: 4 },
          ],
        },
      ],
    },
  ],
});

// ── txn_002 — Review → Approval → Signing → Distribution, fully completed ─────

const WF_002 = mkWorkflow({
  id: "wf_002",
  documentId: "txn_002",
  name: "NDA Workflow",
  description: "Legal review, management approval, parallel signing, then distribution.",
  configurationStatus: "ready-in-demonstration",
  status: "completed",
  createdAt: "2026-07-08T11:40:00Z",
  updatedAt: "2026-07-09T14:24:00Z",
  stages: [
    {
      id: "stg_002_review",
      name: "Legal Review",
      description: "Reviewed for form and content. A review is not an approval.",
      status: "completed",
      assignments: [
        {
          id: "asg_002_ana_review",
          participantId: "par_002_ana",
          name: "Ana Reyes",
          emailMasked: "a****@example.com",
          organization: "Northbridge Legal",
          action: "review",
          signatureRequired: false,
          status: "completed",
          completedAt: "2026-07-08T15:10:00Z",
        },
      ],
    },
    {
      id: "stg_002_approval",
      name: "Approval",
      description: "Explicit approval with an electronic signature.",
      status: "completed",
      assignments: [
        {
          id: "asg_002_ricardo_approve",
          participantId: "par_002_ricardo",
          name: "Ricardo Buenaventura",
          emailMasked: "r****@example.com",
          organization: "Harborline Properties",
          action: "approve",
          signatureRequired: true,
          status: "completed",
          completedAt: "2026-07-09T09:15:00Z",
          fields: [
            { id: "fld_002_sig_ricardo", type: "signature", page: 6 },
          ],
        },
      ],
    },
    {
      id: "stg_002_signing",
      name: "Signing",
      description: "Both parties sign at the same time.",
      executionMode: "parallel",
      status: "completed",
      assignments: [
        {
          id: "asg_002_jose",
          participantId: "par_002_jose",
          name: "Jose dela Cruz",
          emailMasked: "j****@example.com",
          organization: "Harborline Properties",
          action: "sign",
          status: "completed",
          completedAt: "2026-07-08T14:05:00Z",
          fields: [
            { id: "fld_002_sig_jose",  type: "signature",   page: 6 },
            { id: "fld_002_init_jose", type: "initials",    page: 3 },
            { id: "fld_002_date_jose", type: "date-signed", page: 6 },
          ],
          initialsRequired: true,
        },
        {
          id: "asg_002_ana_sign",
          participantId: "par_002_ana",
          name: "Ana Reyes",
          emailMasked: "a****@example.com",
          organization: "Northbridge Legal",
          action: "sign",
          status: "completed",
          completedAt: "2026-07-09T14:22:00Z",
          fields: [
            { id: "fld_002_sig_ana",  type: "signature",   page: 6 },
            { id: "fld_002_date_ana", type: "date-signed", page: 6 },
          ],
        },
      ],
    },
    {
      id: "stg_002_distribution",
      name: "Distribution",
      description: "Completion copies after the approved transaction point.",
      type: "distribution",
      status: "completed",
      assignments: [
        {
          id: "asg_002_records",
          participantId: "par_002_records",
          name: "Harborline Records Desk",
          emailMasked: "r****@example.com",
          organization: "Harborline Properties",
          action: "receive-copy",
          status: "completed",
          notify: "notify-on-completion-only",
        },
      ],
    },
  ],
});

// ── txn_003 — Parallel signing in progress ────────────────────────────────────

const WF_003 = mkWorkflow({
  id: "wf_003",
  documentId: "txn_003",
  name: "Deed of Sale Workflow",
  description: "All four parties sign together.",
  configurationStatus: "ready-in-demonstration",
  status: "in-progress",
  createdAt: "2026-07-12T09:10:00Z",
  updatedAt: "2026-07-13T09:45:00Z",
  stages: [
    {
      id: "stg_003_signing",
      name: "Parallel Signing",
      description: "Everyone signs at the same time.",
      executionMode: "parallel",
      status: "in-progress",
      assignments: [
        {
          id: "asg_003_jose",
          participantId: "par_003_jose",
          name: "Jose dela Cruz",
          emailMasked: "j****@example.com",
          action: "sign",
          status: "completed",
          completedAt: "2026-07-12T12:45:00Z",
          fields: [{ id: "fld_003_sig_jose", type: "signature", page: 8 }],
        },
        {
          id: "asg_003_remedios",
          participantId: "par_003_remedios",
          name: "Remedios Santos",
          emailMasked: "r****@example.com",
          action: "sign",
          status: "completed",
          completedAt: "2026-07-13T09:45:00Z",
          fields: [{ id: "fld_003_sig_remedios", type: "signature", page: 8 }],
        },
        {
          id: "asg_003_ricardo",
          participantId: "par_003_ricardo",
          name: "Ricardo Buenaventura",
          emailMasked: "r****@example.com",
          action: "sign",
          status: "ready-for-action",
          fields: [{ id: "fld_003_sig_ricardo", type: "signature", page: 8 }],
        },
        {
          id: "asg_003_lourdes",
          participantId: "par_003_lourdes",
          name: "Ma. Lourdes Villanueva",
          emailMasked: "m****@example.com",
          action: "sign",
          status: "ready-for-action",
          fields: [{ id: "fld_003_sig_lourdes", type: "signature", page: 8 }],
        },
      ],
    },
    {
      id: "stg_003_distribution",
      name: "Distribution",
      type: "distribution",
      status: "waiting-for-prior-stage",
      assignments: [
        {
          id: "asg_003_registry",
          participantId: "par_003_registry",
          name: "Harborline Registry Office",
          emailMasked: "r****@example.com",
          action: "receive-copy",
          status: "waiting-for-prior-stage",
          notify: "notify-on-completion-only",
        },
      ],
    },
  ],
});

// ── txn_004 — Draft workflow with deliberate configuration issues ─────────────
// Demonstrates: missing signature field, field owned by another participant,
// an empty stage, and an ordered stage. Used by the field-readiness matrix.

const WF_004 = mkWorkflow({
  id: "wf_004",
  documentId: "txn_004",
  name: "Faculty Employment Contract Workflow",
  description: "Draft configuration with unresolved issues.",
  configurationStatus: "needs-attention",
  status: "waiting",
  origin: "built-from-scratch",
  createdAt: "2026-07-15T07:40:00Z",
  updatedAt: "2026-07-15T08:05:00Z",
  stages: [
    {
      id: "stg_004_review",
      name: "Internal Review",
      description: "Department review before approval.",
      executionMode: "ordered",
      status: "draft",
      assignments: [
        {
          id: "asg_004_caridad",
          participantId: "par_004_caridad",
          name: "Dr. Caridad Lim",
          emailMasked: "c****@example.com",
          organization: "Sampaguita Learning Institute",
          action: "review",
          signatureRequired: true, // explicit sender choice → needs a Signature field
          status: "waiting-for-prior-stage",
          position: 1,
          fields: [], // deliberately missing → missing-signature-field
        },
        {
          id: "asg_004_registrar",
          participantId: "par_004_registrar",
          name: "Office of the Registrar",
          emailMasked: "r****@example.com",
          organization: "Sampaguita Learning Institute",
          action: "acknowledge",
          signatureRequired: false,
          status: "waiting-for-prior-stage",
          position: 2,
        },
      ],
    },
    {
      id: "stg_004_signing",
      name: "Signing",
      description: "Employer and faculty member sign.",
      status: "draft",
      assignments: [
        {
          id: "asg_004_employer",
          participantId: "par_004_employer",
          name: "Rafael Gomez",
          emailMasked: "r****@example.com",
          organization: "Sampaguita Learning Institute",
          action: "sign",
          status: "waiting-for-prior-stage",
          fields: [
            // Deliberately owned by a different assignment → blocking issue.
            { id: "fld_004_sig_shared", type: "signature", page: 3, foreignOwner: "asg_004_faculty" },
          ],
        },
        {
          id: "asg_004_faculty",
          participantId: "par_004_faculty",
          name: "Luis Bautista",
          emailMasked: "l****@example.com",
          action: "sign",
          status: "waiting-for-prior-stage",
          fields: [
            { id: "fld_004_sig_shared", type: "signature", page: 3 },
            // A stale reference: this field no longer exists on the document.
            { id: "fld_004_init_removed", type: "initials", page: 2, present: false },
          ],
        },
      ],
    },
    {
      id: "stg_004_distribution",
      name: "Distribution",
      description: "No one has been added yet.",
      type: "distribution",
      status: "draft",
      assignments: [], // deliberately empty → blocking issue
    },
  ],
});

// ── txn_006 — Expired workflow ────────────────────────────────────────────────

const WF_006 = mkWorkflow({
  id: "wf_006",
  documentId: "txn_006",
  name: "Supplier Agreement Workflow",
  configurationStatus: "ready-in-demonstration",
  status: "expired",
  createdAt: "2026-06-01T09:10:00Z",
  updatedAt: "2026-06-15T00:00:00Z",
  stages: [
    {
      id: "stg_006_signing",
      name: "Signing",
      executionMode: "parallel",
      status: "expired",
      assignments: [
        {
          id: "asg_006_jose",
          participantId: "par_006_jose",
          name: "Jose dela Cruz",
          emailMasked: "j****@example.com",
          action: "sign",
          status: "completed",
          completedAt: "2026-06-04T14:00:00Z",
          fields: [{ id: "fld_006_sig_jose", type: "signature", page: 5 }],
        },
        {
          id: "asg_006_rina",
          participantId: "par_006_rina",
          name: "Rina Evangelista",
          emailMasked: "r****@example.com",
          action: "sign",
          status: "expired",
          fields: [{ id: "fld_006_sig_rina", type: "signature", page: 5 }],
        },
      ],
    },
  ],
});

// ── txn_008 — Blocked workflow (delivery failure) ─────────────────────────────

const WF_008 = mkWorkflow({
  id: "wf_008",
  documentId: "txn_008",
  name: "Consultancy Agreement Workflow",
  configurationStatus: "ready-in-demonstration",
  status: "blocked",
  createdAt: "2026-07-11T10:10:00Z",
  updatedAt: "2026-07-11T10:06:00Z",
  stages: [
    {
      id: "stg_008_first",
      name: "Consultant Signing",
      status: "blocked",
      assignments: [
        {
          id: "asg_008_rina",
          participantId: "par_008_rina",
          name: "Rina Evangelista",
          emailMasked: "r****@example.com",
          action: "sign",
          status: "authentication-failed",
          fields: [{ id: "fld_008_sig_rina", type: "signature", page: 2 }],
        },
      ],
    },
    {
      id: "stg_008_second",
      name: "Company Signing",
      status: "waiting-for-prior-stage",
      assignments: [
        {
          id: "asg_008_jose",
          participantId: "par_008_jose",
          name: "Jose dela Cruz",
          emailMasked: "j****@example.com",
          action: "sign",
          status: "waiting-for-prior-stage",
          fields: [{ id: "fld_008_sig_jose", type: "signature", page: 2 }],
        },
      ],
    },
  ],
});

// ── Registry ──────────────────────────────────────────────────────────────────

export const SIGNING_WORKFLOW_FIXTURES: SigningWorkflow[] = [
  WF_001, WF_002, WF_003, WF_004, WF_006, WF_008,
];

/**
 * Documents that deliberately have NO workflow configured, so the empty state and
 * the "create from current recipient order" path can both be exercised.
 *   txn_005 — sent, parallel, 2 participants
 *   txn_007 — archived/expired
 */
export const DOCUMENTS_WITHOUT_WORKFLOW: readonly string[] = ["txn_005", "txn_007"];

export const VALID_WORKFLOW_DOCUMENT_IDS: ReadonlySet<string> = new Set([
  "txn_001", "txn_002", "txn_003", "txn_004", "txn_005", "txn_006", "txn_007", "txn_008",
]);

// ── Deterministic demonstration document previews ─────────────────────────────
// Page counts only. No rendered document content, no file bytes, no PDF parsing.

export const WORKFLOW_PREVIEW_PAGE_COUNTS: Record<string, number> = {
  txn_001: 4,
  txn_002: 6,
  txn_003: 8,
  txn_004: 3,
  txn_005: 5,
  txn_006: 5,
  txn_007: 4,
  txn_008: 2,
};

/** Documents whose preview is deliberately unavailable, to exercise the fallback. */
export const PREVIEW_UNAVAILABLE_DOCUMENT_IDS: readonly string[] = ["txn_007"];

// ── Candidate people for "Add Person" ─────────────────────────────────────────
// Contacts and workspace members remain distinct from document participants.
// A contact is not an authenticated user. A member is not automatically a participant.

export interface WorkflowParticipantCandidate {
  participantId: string;
  name:          string;
  emailMasked:   string;
  organization:  string | null;
  source:        StageParticipantAssignment["participantSource"];
  /** Suspended or removed members are excluded from this list entirely. */
  eligible:      boolean;
  ineligibleReason: string | null;
  workspaceId:   string;
}

export const WORKFLOW_PARTICIPANT_CANDIDATES: WorkflowParticipantCandidate[] = [
  // Contacts (external people — never workspace members)
  { participantId: "ct_maria",    name: "Maria Reyes",            emailMasked: "m****@example.com", organization: "Mabini Business Services", source: "contact", eligible: true, ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "ct_jose",     name: "Jose dela Cruz",         emailMasked: "j****@example.com", organization: "Harborline Properties",    source: "contact", eligible: true, ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "ct_remedios", name: "Remedios Santos",        emailMasked: "r****@example.com", organization: null,                       source: "contact", eligible: true, ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "ct_ricardo",  name: "Ricardo Buenaventura",   emailMasked: "r****@example.com", organization: "Harborline Properties",    source: "contact", eligible: true, ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "ct_lourdes",  name: "Ma. Lourdes Villanueva", emailMasked: "m****@example.com", organization: null,                       source: "contact", eligible: true, ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "ct_caridad",  name: "Dr. Caridad Lim",        emailMasked: "c****@example.com", organization: "Sampaguita Learning Institute", source: "contact", eligible: true, ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "ct_luis",     name: "Luis Bautista",          emailMasked: "l****@example.com", organization: null,                       source: "contact", eligible: true, ineligibleReason: null, workspaceId: "ws_northbridge_001" },

  // Workspace members (internal — being a member does not make someone a participant)
  { participantId: "wm_ana",      name: "Ana Reyes",              emailMasked: "a****@example.com", organization: "Northbridge Legal", source: "workspace-member", eligible: true,  ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "wm_antonio",  name: "Antonio Tan",            emailMasked: "a****@example.com", organization: "Northbridge Legal", source: "workspace-member", eligible: true,  ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "wm_rafael",   name: "Rafael Gomez",           emailMasked: "r****@example.com", organization: "Northbridge Legal", source: "workspace-member", eligible: true,  ineligibleReason: null, workspaceId: "ws_northbridge_001" },
  { participantId: "wm_suspended", name: "Teodoro Salazar",       emailMasked: "t****@example.com", organization: "Northbridge Legal", source: "workspace-member", eligible: false, ineligibleReason: "This member's access is suspended.", workspaceId: "ws_northbridge_001" },

  // Another workspace — must never appear in the picker.
  { participantId: "wm_other_ws", name: "Beatriz Ocampo",         emailMasked: "b****@example.com", organization: "Southgate Partners", source: "workspace-member", eligible: true, ineligibleReason: null, workspaceId: "ws_southgate_002" },
];

// ── Template signing-workflow structures ──────────────────────────────────────
// Role placeholders only — no real people, because the people are not yet known.

export interface WorkflowTemplateStageBlueprint {
  name: string;
  description: string;
  type: SigningStageType;
  executionMode: SigningStageExecutionMode;
  roles: {
    rolePlaceholder: string;
    action: StageParticipantAction;
    signatureRequired: boolean;
    initialsRequired: boolean;
  }[];
}

export interface WorkflowTemplateBlueprint {
  templateId: string;
  templateName: string;
  description: string;
  stages: WorkflowTemplateStageBlueprint[];
}

export const WORKFLOW_TEMPLATE_BLUEPRINTS: WorkflowTemplateBlueprint[] = [
  {
    templateId: "tpl_two_party_signing",
    templateName: "Two-Party Signing",
    description: "Company signs, then the client signs.",
    stages: [
      {
        name: "Company Signing", description: "The company signatory signs first.",
        type: "action", executionMode: "parallel",
        roles: [{ rolePlaceholder: "Company Signatory", action: "sign", signatureRequired: true, initialsRequired: false }],
      },
      {
        name: "Client Signing", description: "The client countersigns.",
        type: "action", executionMode: "parallel",
        roles: [{ rolePlaceholder: "Client Signatory", action: "sign", signatureRequired: true, initialsRequired: false }],
      },
    ],
  },
  {
    templateId: "tpl_approval_then_signing",
    templateName: "Approval, then Signing",
    description: "Management approves with a signature, then both parties sign together.",
    stages: [
      {
        name: "Management Approval", description: "Explicit approval with an electronic signature.",
        type: "action", executionMode: "parallel",
        roles: [{ rolePlaceholder: "Department Head", action: "approve", signatureRequired: true, initialsRequired: false }],
      },
      {
        name: "Signing", description: "Both parties sign at the same time.",
        type: "action", executionMode: "parallel",
        roles: [
          { rolePlaceholder: "Company Signatory", action: "sign", signatureRequired: true, initialsRequired: false },
          { rolePlaceholder: "Client Signatory",  action: "sign", signatureRequired: true, initialsRequired: false },
        ],
      },
    ],
  },
  {
    templateId: "tpl_review_approve_sign_distribute",
    templateName: "Review, Approve, Sign, Distribute",
    description: "Legal review without a signature, approval with a signature, parallel signing, then distribution.",
    stages: [
      {
        name: "Legal Review", description: "A review is not an approval.",
        type: "action", executionMode: "parallel",
        roles: [{ rolePlaceholder: "Legal Reviewer", action: "review", signatureRequired: false, initialsRequired: false }],
      },
      {
        name: "Approval", description: "Explicit approval with an electronic signature.",
        type: "action", executionMode: "parallel",
        roles: [{ rolePlaceholder: "Department Head", action: "approve", signatureRequired: true, initialsRequired: false }],
      },
      {
        name: "Signing", description: "Employer and employee sign together.",
        type: "action", executionMode: "parallel",
        roles: [
          { rolePlaceholder: "Employer Signatory", action: "sign", signatureRequired: true, initialsRequired: false },
          { rolePlaceholder: "Employee",           action: "sign", signatureRequired: true, initialsRequired: false },
        ],
      },
      {
        name: "Distribution", description: "Completion copies only.",
        type: "distribution", executionMode: "parallel",
        roles: [
          { rolePlaceholder: "HR Records", action: "receive-copy", signatureRequired: false, initialsRequired: false },
          { rolePlaceholder: "Employee",   action: "receive-copy", signatureRequired: false, initialsRequired: false },
        ],
      },
    ],
  },
];
