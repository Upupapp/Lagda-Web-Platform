// Workflow fixtures — MOCK DATA.
//
// Every record here carries `demonstrationOnly: true`. Nothing in this file is a
// real process, a real person, or a real document. Names are fictional
// organisations; no email address, phone number or address appears anywhere,
// because a workflow run never needs one to demonstrate stage progress.
//
// WORKSPACE: `ws_mls_001` — the session workspace from `MOCK_CURRENT_USER`.
// The document fixtures still carry `ws_northbridge_001`, and Bulk Send was
// once invisible at runtime for exactly that reason. Anything that must be
// visible to the signed-in user belongs in the session workspace.

import type {
  WorkflowTemplate,
  WorkflowRun,
  WorkflowTemplateStage,
  WorkflowParticipantSlot,
} from "../../models/workflow";
import { templateId, runId, stageId, slotId } from "../../models/workflow";

const WS = "ws_mls_001";

// Fixed clock. `Date.now()` would make every render produce different
// timestamps and make the fixtures untestable.
const T = (iso: string) => iso;

let slotSeq = 0;
function slot(
  label: string,
  kind: WorkflowParticipantSlot["kind"],
  action: WorkflowParticipantSlot["action"],
  required = true,
  suggestedName: string | null = null,
): WorkflowParticipantSlot {
  slotSeq += 1;
  return { id: slotId(`slot_${slotSeq}`), label, kind, action, required, suggestedName };
}

let stageSeq = 0;
function stage(
  name: string,
  kind: WorkflowTemplateStage["kind"],
  description: string,
  slots: WorkflowParticipantSlot[],
  extra: Partial<WorkflowTemplateStage> = {},
): WorkflowTemplateStage {
  stageSeq += 1;
  return {
    id: stageId(`wfs_${stageSeq}`),
    name,
    description,
    position: 0, // assigned below, so a reorder cannot leave a gap
    kind,
    slots,
    completion: "all",
    dueDateDirection: null,
    instruction: null,
    ...extra,
  };
}

function sequence(stages: WorkflowTemplateStage[]): WorkflowTemplateStage[] {
  return stages.map((s, i) => ({ ...s, position: i + 1 }));
}

// ── Templates ─────────────────────────────────────────────────────────────────
// The five sample processes named in the Workflow specification.

export const WORKFLOW_TEMPLATE_FIXTURES: WorkflowTemplate[] = [
  {
    id: templateId("wft_contract_review"),
    workspaceId: WS,
    name: "Contract Review and Signing",
    description: "Route a contract through internal review and legal approval before the client signs, then verify and archive it.",
    category: "legal",
    status: "active",
    stages: sequence([
      stage("Prepare Document", "prepare", "Add the contract and place the fields each signer will complete.",
        [slot("Document Preparer", "role", "review", true, "Ana Reyes")]),
      stage("Internal Review", "review", "The engagement team reads the contract and records a review decision.",
        [slot("Engagement Reviewer", "role", "review", true, null)]),
      stage("Legal Approval", "approval", "A lawyer gives an explicit approval decision. Approval is not a signature.",
        [slot("Approving Lawyer", "role", "approve", true, null)]),
      stage("Client Signature", "signature", "The client completes their own signing fields.",
        [slot("Client Signer", "external", "sign", true, null)]),
      stage("Final Verification", "verification", "The completed document is checked against its verification record.",
        [slot("Final Verifier", "role", "review", true, null)]),
      stage("Completed Archive", "archive", "The run is closed and retained with its audit trail.", []),
    ]),
    estimatedCompletion: "About 5 working days",
    createdBy: "Ana Reyes",
    createdAtDemonstration: T("2026-06-02T09:15:00+08:00"),
    updatedAtDemonstration: T("2026-07-28T14:02:00+08:00"),
    lastUsedAtDemonstration: T("2026-08-06T10:30:00+08:00"),
    initiationCount: 14,
    demonstrationOnly: true,
  },
  {
    id: templateId("wft_hr_onboarding"),
    workspaceId: WS,
    name: "HR Onboarding Documents",
    description: "Collect and sign a new employee's onboarding packet, with manager acknowledgment.",
    category: "hr",
    status: "active",
    stages: sequence([
      stage("Prepare Employee Packet", "prepare", "Assemble the onboarding documents for this employee.",
        [slot("HR Coordinator", "role", "review", true, null)]),
      stage("HR Review", "review", "HR checks the packet is complete and correct before it is sent.",
        [slot("HR Reviewer", "role", "review", true, null)]),
      stage("Employee Signature", "signature", "The new employee signs their onboarding documents.",
        [slot("New Employee", "external", "sign", true, null)]),
      stage("Manager Acknowledgment", "approval", "The hiring manager acknowledges the completed packet.",
        [slot("Hiring Manager", "role", "acknowledge", true, null)]),
      stage("Completed Archive", "archive", "The signed packet is retained with its audit trail.", []),
    ]),
    estimatedCompletion: "About 3 working days",
    createdBy: "Marco Santos",
    createdAtDemonstration: T("2026-05-19T11:40:00+08:00"),
    updatedAtDemonstration: T("2026-07-11T09:05:00+08:00"),
    lastUsedAtDemonstration: T("2026-08-04T16:20:00+08:00"),
    initiationCount: 27,
    demonstrationOnly: true,
  },
  {
    id: templateId("wft_procurement"),
    workspaceId: WS,
    name: "Procurement Approval",
    description: "Move a purchase through department review and finance approval before the vendor signs.",
    category: "procurement",
    status: "active",
    stages: sequence([
      stage("Upload Purchase Documents", "prepare", "Add the purchase request and supporting quotations.",
        [slot("Requesting Officer", "role", "review", true, null)]),
      stage("Department Review", "review", "The requesting department confirms the purchase details.",
        [slot("Department Head", "role", "review", true, null)]),
      stage("Finance Approval", "approval", "Finance approves the spend before any vendor is engaged.",
        [slot("Finance Approver", "role", "approve", true, null)]),
      stage("Vendor Signature", "signature", "The vendor signs the purchase agreement.",
        [slot("Vendor Signer", "external", "sign", true, null)]),
      stage("Final Verification", "verification", "The executed agreement is verified and filed.",
        [slot("Records Officer", "role", "review", true, null)]),
    ]),
    estimatedCompletion: "About 7 working days",
    createdBy: "Ana Reyes",
    createdAtDemonstration: T("2026-06-21T13:25:00+08:00"),
    updatedAtDemonstration: T("2026-06-21T13:25:00+08:00"),
    lastUsedAtDemonstration: T("2026-07-30T11:10:00+08:00"),
    initiationCount: 6,
    demonstrationOnly: true,
  },
  {
    id: templateId("wft_engagement"),
    workspaceId: WS,
    name: "Law Firm Client Engagement",
    description: "Issue an engagement letter, obtain partner review and the client's signature, then set up billing.",
    category: "legal",
    status: "active",
    stages: sequence([
      stage("Prepare Engagement Letter", "prepare", "Draft the engagement letter for this client matter.",
        [slot("Associate", "role", "review", true, null)]),
      stage("Partner Review", "review", "The responsible partner reviews the engagement terms.",
        [slot("Reviewing Partner", "role", "review", true, null)]),
      stage("Client Signature", "signature", "The client signs the engagement letter.",
        [slot("Client Signer", "external", "sign", true, null)]),
      stage("Billing Setup", "approval", "Billing confirms the matter is set up before work begins.",
        [slot("Billing Administrator", "role", "acknowledge", true, null)]),
      stage("Archive and Verify", "verification", "The signed letter is verified and archived.",
        [slot("Records Officer", "role", "review", false, null)]),
    ]),
    estimatedCompletion: "About 4 working days",
    createdBy: "Isabel Cruz",
    createdAtDemonstration: T("2026-07-01T08:50:00+08:00"),
    updatedAtDemonstration: T("2026-07-24T15:35:00+08:00"),
    lastUsedAtDemonstration: T("2026-08-05T09:45:00+08:00"),
    initiationCount: 9,
    demonstrationOnly: true,
  },
  {
    id: templateId("wft_lgu_routing"),
    workspaceId: WS,
    name: "LGU Document Routing",
    description: "Route a local government document from intake through the authorised signatory to records verification.",
    category: "government",
    status: "active",
    stages: sequence([
      stage("Document Intake", "prepare", "Receive the document and record its details.",
        [slot("Intake Officer", "role", "review", true, null)]),
      stage("Department Review", "review", "The responsible department reviews the document.",
        [slot("Department Reviewer", "role", "review", true, null)]),
      stage("Authorized Signatory", "signature", "The authorised signatory signs the document.",
        [slot("Authorized Signatory", "role", "sign", true, null)]),
      stage("Records Verification", "verification", "Records verifies the signed document against its verification record.",
        [slot("Records Verifier", "role", "review", true, null)]),
      stage("Completed Archive", "archive", "The document is archived with its audit trail.", []),
    ]),
    estimatedCompletion: "About 10 working days",
    createdBy: "Marco Santos",
    createdAtDemonstration: T("2026-07-14T10:05:00+08:00"),
    updatedAtDemonstration: T("2026-07-14T10:05:00+08:00"),
    lastUsedAtDemonstration: null,
    initiationCount: 0,
    demonstrationOnly: true,
  },
  {
    id: templateId("wft_nda_draft"),
    workspaceId: WS,
    name: "Mutual NDA — Short Form",
    description: "A two-stage NDA process. Still being designed.",
    category: "legal",
    status: "draft",
    stages: sequence([
      stage("Prepare NDA", "prepare", "Add the NDA and place the signature fields.", []),
      stage("Both Parties Sign", "signature", "Both parties sign the NDA.", []),
    ]),
    estimatedCompletion: null,
    createdBy: "Ana Reyes",
    createdAtDemonstration: T("2026-08-01T14:20:00+08:00"),
    updatedAtDemonstration: T("2026-08-01T14:20:00+08:00"),
    lastUsedAtDemonstration: null,
    initiationCount: 0,
    demonstrationOnly: true,
  },
];

// ── Runs ──────────────────────────────────────────────────────────────────────
// Deliberately varied: one mid-flight, one blocked, one overdue, one barely
// started, and two completed. A board that has only ever been seen in the happy
// path is a board whose blocked and overdue states have never been looked at.

function participants(
  entries: Array<[string, string, WorkflowRun["stages"][number]["participants"][number]["action"], WorkflowRun["stages"][number]["participants"][number]["status"], boolean?]>,
): WorkflowRun["stages"][number]["participants"] {
  return entries.map(([displayName, slotLabel, action, status, isExternal], i) => ({
    slotId: slotId(`rslot_${displayName.replace(/\s+/g, "_").toLowerCase()}_${i}`),
    displayName,
    slotLabel,
    action,
    required: action !== "receive-copy" && action !== "view",
    status,
    isExternal: !!isExternal,
  }));
}

export const WORKFLOW_RUN_FIXTURES: WorkflowRun[] = [
  {
    id: runId("wfr_001"),
    workspaceId: WS,
    templateId: templateId("wft_contract_review"),
    templateName: "Contract Review and Signing",
    name: "Contract Review — Northbridge Legal",
    status: "in-progress",
    documents: [{ id: "wdoc_001", name: "Services Agreement.pdf", pageCount: 12 }],
    stages: [
      { id: stageId("wfrs_001_1"), name: "Prepare Document", description: "Add the contract and place the fields each signer will complete.", position: 1, kind: "prepare", status: "completed", completion: "all", participants: participants([["Ana Reyes", "Document Preparer", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 3, blockedReason: null },
      { id: stageId("wfrs_001_2"), name: "Internal Review", description: "The engagement team reads the contract and records a review decision.", position: 2, kind: "review", status: "completed", completion: "all", participants: participants([["Marco Santos", "Engagement Reviewer", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 2, blockedReason: null },
      { id: stageId("wfrs_001_3"), name: "Legal Approval", description: "A lawyer gives an explicit approval decision. Approval is not a signature.", position: 3, kind: "approval", status: "in-progress", completion: "all", participants: participants([["Isabel Cruz", "Approving Lawyer", "approve", "viewed"]]), dueDateDirection: "Within 2 working days", instruction: "Confirm the indemnity clause before approving.", activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_001_4"), name: "Client Signature", description: "The client completes their own signing fields.", position: 4, kind: "signature", status: "not-started", completion: "all", participants: participants([["Northbridge Legal", "Client Signer", "sign", "not-notified", true]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
      { id: stageId("wfrs_001_5"), name: "Final Verification", description: "The completed document is checked against its verification record.", position: 5, kind: "verification", status: "not-started", completion: "all", participants: participants([["Ana Reyes", "Final Verifier", "review", "not-notified"]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
      { id: stageId("wfrs_001_6"), name: "Completed Archive", description: "The run is closed and retained with its audit trail.", position: 6, kind: "archive", status: "not-started", completion: "all", participants: [], dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
    ],
    activity: [
      { id: "wact_001_1", kind: "run-started", summary: "Ana Reyes started this workflow from Contract Review and Signing.", actorName: "Ana Reyes", stageId: null, atDemonstration: T("2026-08-06T10:30:00+08:00") },
      { id: "wact_001_2", kind: "stage-completed", summary: "Prepare Document completed.", actorName: "Ana Reyes", stageId: stageId("wfrs_001_1"), atDemonstration: T("2026-08-06T11:12:00+08:00") },
      { id: "wact_001_3", kind: "review-recorded", summary: "Marco Santos recorded a review decision on Internal Review.", actorName: "Marco Santos", stageId: stageId("wfrs_001_2"), atDemonstration: T("2026-08-07T09:40:00+08:00") },
      { id: "wact_001_4", kind: "stage-started", summary: "Legal Approval started.", actorName: null, stageId: stageId("wfrs_001_3"), atDemonstration: T("2026-08-07T09:41:00+08:00") },
    ],
    startedBy: "Ana Reyes",
    startedAtDemonstration: T("2026-08-06T10:30:00+08:00"),
    updatedAtDemonstration: T("2026-08-07T09:41:00+08:00"),
    completedAtDemonstration: null,
    dueDateDirection: "Target: within 5 working days",
    demonstrationOnly: true,
  },
  {
    id: runId("wfr_002"),
    workspaceId: WS,
    templateId: templateId("wft_hr_onboarding"),
    templateName: "HR Onboarding Documents",
    name: "HR Onboarding — J. Dela Cruz",
    status: "blocked",
    documents: [{ id: "wdoc_002", name: "Onboarding Packet.pdf", pageCount: 8 }],
    stages: [
      { id: stageId("wfrs_002_1"), name: "Prepare Employee Packet", description: "Assemble the onboarding documents for this employee.", position: 1, kind: "prepare", status: "completed", completion: "all", participants: participants([["Marco Santos", "HR Coordinator", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 2, blockedReason: null },
      { id: stageId("wfrs_002_2"), name: "HR Review", description: "HR checks the packet is complete and correct before it is sent.", position: 2, kind: "review", status: "blocked", completion: "all", participants: participants([["Isabel Cruz", "HR Reviewer", "review", "declined"]]), dueDateDirection: null, instruction: null, activityCount: 2, blockedReason: "The reviewer requested changes, so this stage cannot complete until the packet is updated." },
      { id: stageId("wfrs_002_3"), name: "Employee Signature", description: "The new employee signs their onboarding documents.", position: 3, kind: "signature", status: "not-started", completion: "all", participants: participants([["J. Dela Cruz", "New Employee", "sign", "not-notified", true]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
      { id: stageId("wfrs_002_4"), name: "Manager Acknowledgment", description: "The hiring manager acknowledges the completed packet.", position: 4, kind: "approval", status: "not-started", completion: "all", participants: participants([["Ana Reyes", "Hiring Manager", "acknowledge", "not-notified"]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
      { id: stageId("wfrs_002_5"), name: "Completed Archive", description: "The signed packet is retained with its audit trail.", position: 5, kind: "archive", status: "not-started", completion: "all", participants: [], dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
    ],
    activity: [
      { id: "wact_002_1", kind: "run-started", summary: "Marco Santos started this workflow from HR Onboarding Documents.", actorName: "Marco Santos", stageId: null, atDemonstration: T("2026-08-04T16:20:00+08:00") },
      { id: "wact_002_2", kind: "stage-completed", summary: "Prepare Employee Packet completed.", actorName: "Marco Santos", stageId: stageId("wfrs_002_1"), atDemonstration: T("2026-08-05T08:55:00+08:00") },
      { id: "wact_002_3", kind: "review-recorded", summary: "Isabel Cruz requested changes on HR Review.", actorName: "Isabel Cruz", stageId: stageId("wfrs_002_2"), atDemonstration: T("2026-08-05T14:10:00+08:00") },
    ],
    startedBy: "Marco Santos",
    startedAtDemonstration: T("2026-08-04T16:20:00+08:00"),
    updatedAtDemonstration: T("2026-08-05T14:10:00+08:00"),
    completedAtDemonstration: null,
    dueDateDirection: null,
    demonstrationOnly: true,
  },
  {
    id: runId("wfr_003"),
    workspaceId: WS,
    templateId: templateId("wft_procurement"),
    templateName: "Procurement Approval",
    name: "Procurement — Server Refresh 2026",
    status: "overdue",
    documents: [
      { id: "wdoc_003", name: "Purchase Request.pdf", pageCount: 4 },
      { id: "wdoc_004", name: "Vendor Quotation.pdf", pageCount: 6 },
    ],
    stages: [
      { id: stageId("wfrs_003_1"), name: "Upload Purchase Documents", description: "Add the purchase request and supporting quotations.", position: 1, kind: "prepare", status: "completed", completion: "all", participants: participants([["Ana Reyes", "Requesting Officer", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 2, blockedReason: null },
      { id: stageId("wfrs_003_2"), name: "Department Review", description: "The requesting department confirms the purchase details.", position: 2, kind: "review", status: "completed", completion: "all", participants: participants([["Marco Santos", "Department Head", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_003_3"), name: "Finance Approval", description: "Finance approves the spend before any vendor is engaged.", position: 3, kind: "approval", status: "overdue", completion: "all", participants: participants([["Isabel Cruz", "Finance Approver", "approve", "waiting"]]), dueDateDirection: "Was due 3 days ago", instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_003_4"), name: "Vendor Signature", description: "The vendor signs the purchase agreement.", position: 4, kind: "signature", status: "not-started", completion: "all", participants: participants([["Vendor Representative", "Vendor Signer", "sign", "not-notified", true]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
      { id: stageId("wfrs_003_5"), name: "Final Verification", description: "The executed agreement is verified and filed.", position: 5, kind: "verification", status: "not-started", completion: "all", participants: participants([["Ana Reyes", "Records Officer", "review", "not-notified"]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
    ],
    activity: [
      { id: "wact_003_1", kind: "run-started", summary: "Ana Reyes started this workflow from Procurement Approval.", actorName: "Ana Reyes", stageId: null, atDemonstration: T("2026-07-30T11:10:00+08:00") },
      { id: "wact_003_2", kind: "stage-completed", summary: "Department Review completed.", actorName: "Marco Santos", stageId: stageId("wfrs_003_2"), atDemonstration: T("2026-08-01T10:00:00+08:00") },
      { id: "wact_003_3", kind: "reminder-sent", summary: "A reminder was prepared for Finance Approval. No message was delivered in this demonstration.", actorName: "Ana Reyes", stageId: stageId("wfrs_003_3"), atDemonstration: T("2026-08-06T09:00:00+08:00") },
    ],
    startedBy: "Ana Reyes",
    startedAtDemonstration: T("2026-07-30T11:10:00+08:00"),
    updatedAtDemonstration: T("2026-08-06T09:00:00+08:00"),
    completedAtDemonstration: null,
    dueDateDirection: "Was due 3 days ago",
    demonstrationOnly: true,
  },
  {
    id: runId("wfr_004"),
    workspaceId: WS,
    templateId: templateId("wft_engagement"),
    templateName: "Law Firm Client Engagement",
    name: "Engagement — Sandoval Holdings",
    status: "not-started",
    documents: [{ id: "wdoc_005", name: "Engagement Letter.pdf", pageCount: 5 }],
    stages: [
      { id: stageId("wfrs_004_1"), name: "Prepare Engagement Letter", description: "Draft the engagement letter for this client matter.", position: 1, kind: "prepare", status: "waiting", completion: "all", participants: participants([["Isabel Cruz", "Associate", "review", "waiting"]]), dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_004_2"), name: "Partner Review", description: "The responsible partner reviews the engagement terms.", position: 2, kind: "review", status: "not-started", completion: "all", participants: participants([["Ana Reyes", "Reviewing Partner", "review", "not-notified"]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
      { id: stageId("wfrs_004_3"), name: "Client Signature", description: "The client signs the engagement letter.", position: 3, kind: "signature", status: "not-started", completion: "all", participants: participants([["Sandoval Holdings", "Client Signer", "sign", "not-notified", true]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
      { id: stageId("wfrs_004_4"), name: "Billing Setup", description: "Billing confirms the matter is set up before work begins.", position: 4, kind: "approval", status: "not-started", completion: "all", participants: participants([["Marco Santos", "Billing Administrator", "acknowledge", "not-notified"]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
      { id: stageId("wfrs_004_5"), name: "Archive and Verify", description: "The signed letter is verified and archived.", position: 5, kind: "verification", status: "not-started", completion: "all", participants: participants([["Ana Reyes", "Records Officer", "review", "not-notified"]]), dueDateDirection: null, instruction: null, activityCount: 0, blockedReason: null },
    ],
    activity: [
      { id: "wact_004_1", kind: "run-started", summary: "Isabel Cruz started this workflow from Law Firm Client Engagement.", actorName: "Isabel Cruz", stageId: null, atDemonstration: T("2026-08-05T09:45:00+08:00") },
    ],
    startedBy: "Isabel Cruz",
    startedAtDemonstration: T("2026-08-05T09:45:00+08:00"),
    updatedAtDemonstration: T("2026-08-05T09:45:00+08:00"),
    completedAtDemonstration: null,
    dueDateDirection: null,
    demonstrationOnly: true,
  },
  {
    id: runId("wfr_005"),
    workspaceId: WS,
    templateId: templateId("wft_contract_review"),
    templateName: "Contract Review and Signing",
    name: "Contract Review — Sandoval Holdings",
    status: "completed",
    documents: [{ id: "wdoc_006", name: "Consultancy Agreement.pdf", pageCount: 9 }],
    stages: [
      { id: stageId("wfrs_005_1"), name: "Prepare Document", description: "Add the contract and place the fields each signer will complete.", position: 1, kind: "prepare", status: "completed", completion: "all", participants: participants([["Ana Reyes", "Document Preparer", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 2, blockedReason: null },
      { id: stageId("wfrs_005_2"), name: "Internal Review", description: "The engagement team reads the contract and records a review decision.", position: 2, kind: "review", status: "completed", completion: "all", participants: participants([["Marco Santos", "Engagement Reviewer", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_005_3"), name: "Legal Approval", description: "A lawyer gives an explicit approval decision.", position: 3, kind: "approval", status: "completed", completion: "all", participants: participants([["Isabel Cruz", "Approving Lawyer", "approve", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_005_4"), name: "Client Signature", description: "The client completes their own signing fields.", position: 4, kind: "signature", status: "completed", completion: "all", participants: participants([["Sandoval Holdings", "Client Signer", "sign", "completed", true]]), dueDateDirection: null, instruction: null, activityCount: 2, blockedReason: null },
      { id: stageId("wfrs_005_5"), name: "Final Verification", description: "The completed document is checked against its verification record.", position: 5, kind: "verification", status: "completed", completion: "all", participants: participants([["Ana Reyes", "Final Verifier", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_005_6"), name: "Completed Archive", description: "The run is closed and retained with its audit trail.", position: 6, kind: "archive", status: "completed", completion: "all", participants: [], dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
    ],
    activity: [
      { id: "wact_005_1", kind: "run-started", summary: "Ana Reyes started this workflow from Contract Review and Signing.", actorName: "Ana Reyes", stageId: null, atDemonstration: T("2026-07-14T09:00:00+08:00") },
      { id: "wact_005_2", kind: "signature-recorded", summary: "Sandoval Holdings completed their signing fields.", actorName: "Sandoval Holdings", stageId: stageId("wfrs_005_4"), atDemonstration: T("2026-07-18T15:20:00+08:00") },
      { id: "wact_005_3", kind: "run-completed", summary: "All stages complete. The run was archived.", actorName: null, stageId: null, atDemonstration: T("2026-07-19T10:05:00+08:00") },
    ],
    startedBy: "Ana Reyes",
    startedAtDemonstration: T("2026-07-14T09:00:00+08:00"),
    updatedAtDemonstration: T("2026-07-19T10:05:00+08:00"),
    completedAtDemonstration: T("2026-07-19T10:05:00+08:00"),
    dueDateDirection: null,
    demonstrationOnly: true,
  },
  {
    id: runId("wfr_006"),
    workspaceId: WS,
    templateId: templateId("wft_hr_onboarding"),
    templateName: "HR Onboarding Documents",
    name: "HR Onboarding — R. Villanueva",
    status: "completed",
    documents: [{ id: "wdoc_007", name: "Onboarding Packet.pdf", pageCount: 8 }],
    stages: [
      { id: stageId("wfrs_006_1"), name: "Prepare Employee Packet", description: "Assemble the onboarding documents for this employee.", position: 1, kind: "prepare", status: "completed", completion: "all", participants: participants([["Marco Santos", "HR Coordinator", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_006_2"), name: "HR Review", description: "HR checks the packet is complete and correct before it is sent.", position: 2, kind: "review", status: "completed", completion: "all", participants: participants([["Isabel Cruz", "HR Reviewer", "review", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_006_3"), name: "Employee Signature", description: "The new employee signs their onboarding documents.", position: 3, kind: "signature", status: "completed", completion: "all", participants: participants([["R. Villanueva", "New Employee", "sign", "completed", true]]), dueDateDirection: null, instruction: null, activityCount: 2, blockedReason: null },
      { id: stageId("wfrs_006_4"), name: "Manager Acknowledgment", description: "The hiring manager acknowledges the completed packet.", position: 4, kind: "approval", status: "completed", completion: "all", participants: participants([["Ana Reyes", "Hiring Manager", "acknowledge", "completed"]]), dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
      { id: stageId("wfrs_006_5"), name: "Completed Archive", description: "The signed packet is retained with its audit trail.", position: 5, kind: "archive", status: "completed", completion: "all", participants: [], dueDateDirection: null, instruction: null, activityCount: 1, blockedReason: null },
    ],
    activity: [
      { id: "wact_006_1", kind: "run-started", summary: "Marco Santos started this workflow from HR Onboarding Documents.", actorName: "Marco Santos", stageId: null, atDemonstration: T("2026-06-24T08:30:00+08:00") },
      { id: "wact_006_2", kind: "run-completed", summary: "All stages complete. The run was archived.", actorName: null, stageId: null, atDemonstration: T("2026-06-27T16:45:00+08:00") },
    ],
    startedBy: "Marco Santos",
    startedAtDemonstration: T("2026-06-24T08:30:00+08:00"),
    updatedAtDemonstration: T("2026-06-27T16:45:00+08:00"),
    completedAtDemonstration: T("2026-06-27T16:45:00+08:00"),
    dueDateDirection: null,
    demonstrationOnly: true,
  },
];
