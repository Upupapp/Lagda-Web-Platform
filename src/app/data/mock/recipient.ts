// Deterministic mock fixtures for the recipient signing experience.
// All participant names, titles, and details are fictional.
// demonstrationOnly: true is mandatory on every record.
// No real email addresses, phone numbers, or identity data.

import type { RecipientRequest } from "../../models/recipient";

// ── Page builder helper ───────────────────────────────────────────────────────

function buildPages(docId: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id:         `${docId}-page-${i + 1}`,
    documentId: docId,
    pageNumber: i + 1,
    label:      `Page ${i + 1}`,
  }));
}

// ── Fixture: Signer — Marco Santos (Engagement Agreement) ─────────────────────

const marcoSignerRequest: RecipientRequest = {
  id:                         "req-engagement-0002-marco",
  transactionTitle:           "Engagement Agreement — Sunrise Legal Partners",
  senderWorkspaceDisplayName: "Sunrise Legal Partners",
  status:                     "active",
  participant: {
    id:              "p-marco-001",
    displayName:     "Marco Santos",
    role:            "signer",
    authMethod:      "email-code",
    authRequired:    true,
    consentRequired: true,
  },
  documents: [
    {
      id:          "doc-engagement-001",
      displayName: "Engagement Agreement.pdf",
      pageCount:   3,
      pages:       buildPages("doc-engagement-001", 3),
    },
  ],
  fields: [
    {
      id: "f-001", type: "signature",       label: "Signature",          required: true,  pageId: "doc-engagement-001-page-1", documentId: "doc-engagement-001", rect: { x: 0.55, y: 0.80, width: 0.30, height: 0.06 }, assignedToMe: true,  isSenderText: false, layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-002", type: "date",            label: "Date Signed",        required: true,  pageId: "doc-engagement-001-page-1", documentId: "doc-engagement-001", rect: { x: 0.55, y: 0.88, width: 0.20, height: 0.04 }, assignedToMe: true,  isSenderText: false, layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-003", type: "text",            label: "Full Legal Name",    required: true,  pageId: "doc-engagement-001-page-1", documentId: "doc-engagement-001", rect: { x: 0.10, y: 0.80, width: 0.38, height: 0.04 }, assignedToMe: true,  isSenderText: false, placeholder: "Your full legal name", layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-004", type: "initials",        label: "Initials",           required: false, pageId: "doc-engagement-001-page-2", documentId: "doc-engagement-001", rect: { x: 0.82, y: 0.92, width: 0.10, height: 0.04 }, assignedToMe: true,  isSenderText: false, layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-005", type: "sender-text",     label: "Sender Note",        required: false, pageId: "doc-engagement-001-page-1", documentId: "doc-engagement-001", rect: { x: 0.10, y: 0.10, width: 0.80, height: 0.08 }, assignedToMe: false, isSenderText: true,  senderText: "This Engagement Agreement is between Sunrise Legal Partners and the above-named Client. By signing, you acknowledge reading and agreeing to all terms herein.", layer: 0, demonstrationOnly: true,
    },
  ],
  routingPosition: "solo",
  routingLocked:   false,
  canDecline:      true,
  scenarioLabel:   "Signer — Marco Santos",
  demonstrationOnly: true,
};

// ── Fixture: Signer — Lea Cruz (Multi-doc PSA) ────────────────────────────────

const leaMultiDocRequest: RecipientRequest = {
  id:                         "req-psa-0001-lea",
  transactionTitle:           "Professional Services Agreement — Two Documents",
  senderWorkspaceDisplayName: "Apex Consulting Group",
  status:                     "active",
  participant: {
    id:              "p-lea-001",
    displayName:     "Lea Cruz",
    role:            "signer",
    authMethod:      "invitation-access",
    authRequired:    false,
    consentRequired: true,
  },
  documents: [
    {
      id:          "doc-psa-main",
      displayName: "Professional Services Agreement.pdf",
      pageCount:   4,
      pages:       buildPages("doc-psa-main", 4),
    },
    {
      id:          "doc-psa-exhibit",
      displayName: "Exhibit A — Scope of Work.pdf",
      pageCount:   2,
      pages:       buildPages("doc-psa-exhibit", 2),
    },
  ],
  fields: [
    {
      id: "f-l-001", type: "signature", label: "Signature", required: true, pageId: "doc-psa-main-page-4", documentId: "doc-psa-main", rect: { x: 0.10, y: 0.80, width: 0.35, height: 0.06 }, assignedToMe: true, isSenderText: false, layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-l-002", type: "date",      label: "Date",      required: true, pageId: "doc-psa-main-page-4", documentId: "doc-psa-main", rect: { x: 0.55, y: 0.80, width: 0.20, height: 0.04 }, assignedToMe: true, isSenderText: false, layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-l-003", type: "initials",  label: "Initials",  required: true, pageId: "doc-psa-exhibit-page-2", documentId: "doc-psa-exhibit", rect: { x: 0.82, y: 0.92, width: 0.10, height: 0.04 }, assignedToMe: true, isSenderText: false, layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-l-004", type: "checkbox",  label: "I confirm I have read Exhibit A", required: true, pageId: "doc-psa-exhibit-page-1", documentId: "doc-psa-exhibit", rect: { x: 0.10, y: 0.72, width: 0.03, height: 0.03 }, assignedToMe: true, isSenderText: false, layer: 1, demonstrationOnly: true,
    },
  ],
  routingPosition: "first",
  routingLocked:   false,
  canDecline:      true,
  scenarioLabel:   "Signer multi-doc — Lea Cruz",
  demonstrationOnly: true,
};

// ── Fixture: Approver — Ana Reyes (DPA) ──────────────────────────────────────

const anaApproverRequest: RecipientRequest = {
  id:                         "req-dpa-0005-ana",
  transactionTitle:           "Data Processing Agreement — Internal Approval",
  senderWorkspaceDisplayName: "Meridian Data Corp",
  status:                     "active",
  participant: {
    id:              "p-ana-001",
    displayName:     "Ana Reyes",
    role:            "approver",
    authMethod:      "account-signin",
    authRequired:    true,
    consentRequired: true,
  },
  documents: [
    {
      id:          "doc-dpa-001",
      displayName: "Data Processing Agreement.pdf",
      pageCount:   5,
      pages:       buildPages("doc-dpa-001", 5),
    },
  ],
  fields: [
    {
      id: "f-a-001", type: "text", label: "Approval Notes (optional)", required: false, pageId: "doc-dpa-001-page-5", documentId: "doc-dpa-001", rect: { x: 0.10, y: 0.60, width: 0.80, height: 0.12 }, assignedToMe: true, isSenderText: false, placeholder: "Add optional notes for the record", multiline: true, layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-a-002", type: "sender-text", label: "Instructions", required: false, pageId: "doc-dpa-001-page-1", documentId: "doc-dpa-001", rect: { x: 0.10, y: 0.08, width: 0.80, height: 0.07 }, assignedToMe: false, isSenderText: true, senderText: "Please review the data processing terms and submit your approval or rejection. Your decision will be recorded as a demonstration outcome only.", layer: 0, demonstrationOnly: true,
    },
  ],
  routingPosition: "middle",
  routingLocked:   false,
  canDecline:      false,
  scenarioLabel:   "Approver — Ana Reyes",
  demonstrationOnly: true,
};

// ── Fixture: Reviewer — Daniel Lim ───────────────────────────────────────────

const danielReviewerRequest: RecipientRequest = {
  id:                         "req-policy-review-0006",
  transactionTitle:           "Employee Handbook — Policy Review",
  senderWorkspaceDisplayName: "Horizon HR Solutions",
  status:                     "active",
  participant: {
    id:              "p-daniel-001",
    displayName:     "Daniel Lim",
    role:            "reviewer",
    authMethod:      "email-code",
    authRequired:    true,
    consentRequired: true,
  },
  documents: [
    {
      id:          "doc-handbook-001",
      displayName: "Employee Handbook 2026.pdf",
      pageCount:   6,
      pages:       buildPages("doc-handbook-001", 6),
    },
  ],
  fields: [
    {
      id: "f-r-001", type: "text", label: "Review Comments (optional)", required: false, pageId: "doc-handbook-001-page-6", documentId: "doc-handbook-001", rect: { x: 0.10, y: 0.65, width: 0.80, height: 0.15 }, assignedToMe: true, isSenderText: false, placeholder: "Your review comments", multiline: true, layer: 1, demonstrationOnly: true,
    },
  ],
  routingPosition: "last",
  routingLocked:   false,
  canDecline:      false,
  scenarioLabel:   "Reviewer — Daniel Lim",
  demonstrationOnly: true,
};

// ── Fixture: Acknowledgment Recipient — Sofia Navarro ────────────────────────

const sofiaAckRequest: RecipientRequest = {
  id:                         "req-policy-0004-sofia",
  transactionTitle:           "Workplace Safety Policy Acknowledgment",
  senderWorkspaceDisplayName: "Cebu Manufacturing Inc",
  status:                     "active",
  participant: {
    id:              "p-sofia-001",
    displayName:     "Sofia Navarro",
    role:            "acknowledgment-recipient",
    authMethod:      "none",
    authRequired:    false,
    consentRequired: true,
  },
  documents: [
    {
      id:          "doc-safety-001",
      displayName: "Workplace Safety Policy.pdf",
      pageCount:   3,
      pages:       buildPages("doc-safety-001", 3),
    },
  ],
  fields: [
    {
      id: "f-s-001", type: "checkbox", label: "I acknowledge receipt of this policy", required: true, pageId: "doc-safety-001-page-3", documentId: "doc-safety-001", rect: { x: 0.10, y: 0.78, width: 0.03, height: 0.03 }, assignedToMe: true, isSenderText: false, layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-s-002", type: "text",     label: "Employee Name",                        required: true, pageId: "doc-safety-001-page-3", documentId: "doc-safety-001", rect: { x: 0.20, y: 0.84, width: 0.40, height: 0.04 }, assignedToMe: true, isSenderText: false, placeholder: "Print your name", layer: 1, demonstrationOnly: true,
    },
    {
      id: "f-s-003", type: "date",     label: "Date",                                 required: true, pageId: "doc-safety-001-page-3", documentId: "doc-safety-001", rect: { x: 0.65, y: 0.84, width: 0.22, height: 0.04 }, assignedToMe: true, isSenderText: false, layer: 1, demonstrationOnly: true,
    },
  ],
  routingPosition: "solo",
  routingLocked:   false,
  canDecline:      false,
  scenarioLabel:   "Ack Recipient — Sofia Navarro",
  demonstrationOnly: true,
};

// ── Fixture: Viewer ───────────────────────────────────────────────────────────

const viewerRequest: RecipientRequest = {
  id:                         "req-viewer-0007",
  transactionTitle:           "Quarterly Operations Report — For Review",
  senderWorkspaceDisplayName: "Tagaytay Holdings",
  status:                     "active",
  participant: {
    id:              "p-viewer-001",
    displayName:     "Viewer Participant",
    role:            "viewer",
    authMethod:      "invitation-access",
    authRequired:    false,
    consentRequired: false,
  },
  documents: [
    {
      id:          "doc-report-001",
      displayName: "Q2 Operations Report.pdf",
      pageCount:   8,
      pages:       buildPages("doc-report-001", 8),
    },
  ],
  fields: [
    {
      id: "f-v-001", type: "sender-text", label: "Notice", required: false, pageId: "doc-report-001-page-1", documentId: "doc-report-001", rect: { x: 0.10, y: 0.08, width: 0.80, height: 0.06 }, assignedToMe: false, isSenderText: true, senderText: "This report is shared for informational purposes. No action is required from you.", layer: 0, demonstrationOnly: true,
    },
  ],
  routingPosition: "parallel",
  routingLocked:   false,
  canDecline:      false,
  scenarioLabel:   "Viewer",
  demonstrationOnly: true,
};

// ── Fixture: Copy Recipient ───────────────────────────────────────────────────

const copyRequest: RecipientRequest = {
  id:                         "req-copy-0008",
  transactionTitle:           "Service Agreement — Copy to Records",
  senderWorkspaceDisplayName: "Northern Ventures Corp",
  status:                     "active",
  participant: {
    id:              "p-copy-001",
    displayName:     "Records Office",
    role:            "copy-recipient",
    authMethod:      "none",
    authRequired:    false,
    consentRequired: false,
  },
  documents: [
    {
      id:          "doc-svc-001",
      displayName: "Service Agreement — Final.pdf",
      pageCount:   2,
      pages:       buildPages("doc-svc-001", 2),
    },
  ],
  fields: [],
  routingPosition: "last",
  routingLocked:   false,
  canDecline:      false,
  scenarioLabel:   "Copy Recipient",
  demonstrationOnly: true,
};

// ── Fixture: Routing Locked ───────────────────────────────────────────────────

const routingLockedRequest: RecipientRequest = {
  id:                         "req-locked-0009",
  transactionTitle:           "Purchase Order Approval — Pending Prior Step",
  senderWorkspaceDisplayName: "Delta Procurement PH",
  status:                     "active",
  participant: {
    id:              "p-locked-001",
    displayName:     "Second Approver",
    role:            "approver",
    authMethod:      "email-code",
    authRequired:    true,
    consentRequired: true,
  },
  documents: [
    {
      id:          "doc-po-001",
      displayName: "Purchase Order #2026-0044.pdf",
      pageCount:   2,
      pages:       buildPages("doc-po-001", 2),
    },
  ],
  fields: [],
  routingPosition: "middle",
  routingLocked:   true,
  canDecline:      false,
  scenarioLabel:   "Routing Locked",
  demonstrationOnly: true,
};

// ── Terminal state fixtures ───────────────────────────────────────────────────

const expiredRequest: RecipientRequest = {
  id: "req-expired-0010", transactionTitle: "NDA — Expired Request", senderWorkspaceDisplayName: "Test Workspace", status: "expired", participant: { id: "p-exp-001", displayName: "Recipient", role: "signer", authMethod: "none", authRequired: false, consentRequired: false }, documents: [], fields: [], routingPosition: "solo", routingLocked: false, canDecline: false, scenarioLabel: "Expired", demonstrationOnly: true,
};

const cancelledRequest: RecipientRequest = {
  id: "req-cancelled-0011", transactionTitle: "NDA — Cancelled Request", senderWorkspaceDisplayName: "Test Workspace", status: "cancelled", participant: { id: "p-can-001", displayName: "Recipient", role: "signer", authMethod: "none", authRequired: false, consentRequired: false }, documents: [], fields: [], routingPosition: "solo", routingLocked: false, canDecline: false, scenarioLabel: "Cancelled", demonstrationOnly: true,
};

const voidedRequest: RecipientRequest = {
  id: "req-voided-0012", transactionTitle: "NDA — Voided Request", senderWorkspaceDisplayName: "Test Workspace", status: "voided", participant: { id: "p-void-001", displayName: "Recipient", role: "signer", authMethod: "none", authRequired: false, consentRequired: false }, documents: [], fields: [], routingPosition: "solo", routingLocked: false, canDecline: false, scenarioLabel: "Voided", demonstrationOnly: true,
};

const alreadyActionedRequest: RecipientRequest = {
  id: "req-done-0013", transactionTitle: "NDA — Already Completed", senderWorkspaceDisplayName: "Test Workspace", status: "completed", participant: { id: "p-done-001", displayName: "Recipient", role: "signer", authMethod: "none", authRequired: false, consentRequired: false }, documents: [], fields: [], routingPosition: "solo", routingLocked: false, canDecline: false, scenarioLabel: "Already Actioned", demonstrationOnly: true,
};

// ── Registry ──────────────────────────────────────────────────────────────────

const FIXTURE_MAP = new Map<string, RecipientRequest>([
  [marcoSignerRequest.id,       marcoSignerRequest       ],
  [leaMultiDocRequest.id,       leaMultiDocRequest       ],
  [anaApproverRequest.id,       anaApproverRequest       ],
  [danielReviewerRequest.id,    danielReviewerRequest    ],
  [sofiaAckRequest.id,          sofiaAckRequest          ],
  [viewerRequest.id,            viewerRequest            ],
  [copyRequest.id,              copyRequest              ],
  [routingLockedRequest.id,     routingLockedRequest     ],
  [expiredRequest.id,           expiredRequest           ],
  [cancelledRequest.id,         cancelledRequest         ],
  [voidedRequest.id,            voidedRequest            ],
  [alreadyActionedRequest.id,   alreadyActionedRequest   ],
]);

export function getMockRecipientRequest(requestId: string): RecipientRequest | null {
  return FIXTURE_MAP.get(requestId) ?? null;
}

export function getAllMockRecipientRequests(): RecipientRequest[] {
  return Array.from(FIXTURE_MAP.values());
}
