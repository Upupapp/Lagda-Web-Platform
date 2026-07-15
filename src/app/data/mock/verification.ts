// Mock verification fixtures for /app/verify.
// Deterministic by Verification ID. All results carry demonstrationOnly: true.
// txn_002 ("LAGDA-VER-2026-004821") is the bridge to the Documents workspace fixture.
// No real file is compared; no real record is fetched.

import type {
  VerificationRecord,
  VerificationHistoryItem,
} from "../../models/verification";

// Re-export the canonical pattern so services can use it.
export { VER_ID_RE } from "../../services/public";

// ── Fixture records keyed by normalized Verification ID ──────────────────────

export const MOCK_VERIFICATION_RECORDS: Record<string, VerificationRecord> = {

  // ── Completed + match demo — bridges to txn_002 in Documents workspace ──────
  "LAGDA-VER-2026-004821": {
    verificationId: "LAGDA-VER-2026-004821",
    transactionRecordStatus: "record-found-completed",
    fileMatchStatus: "match",
    documentDescription: "Professional Services Agreement — Northbridge Legal / Rivera Consulting",
    workspaceName: "Northbridge Business Services",
    completedAt: "14 Jul 2026 11:47 PHT",
    publiclyVerifiable: true,
    associatedTransactionId: "txn_002",
    canLinkToTransaction: true,
    evidenceAvailability: {
      hasAuditEvents: true,
      hasDeviceSummary: true,
      hasTimestamps: true,
      participantCount: 2,
      fileCount: 1,
      restrictedToVerifiers: false,
    },
    demonstrationOnly: true,
  },

  // ── Completed + mismatch demo ────────────────────────────────────────────────
  "LAGDA-VER-2026-003102": {
    verificationId: "LAGDA-VER-2026-003102",
    transactionRecordStatus: "record-found-completed",
    fileMatchStatus: "mismatch",
    documentDescription: "Contract for Services — Illustration",
    workspaceName: "Demonstration Workspace",
    completedAt: "02 Jun 2026 09:15 PHT",
    publiclyVerifiable: true,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: true,
      hasDeviceSummary: true,
      hasTimestamps: true,
      participantCount: 3,
      fileCount: 1,
      restrictedToVerifiers: true,
    },
    demonstrationOnly: true,
  },

  // ── In progress ──────────────────────────────────────────────────────────────
  "LAGDA-VER-2026-001455": {
    verificationId: "LAGDA-VER-2026-001455",
    transactionRecordStatus: "record-found-in-progress",
    fileMatchStatus: "not-evaluated",
    documentDescription: "Memorandum of Understanding — Draft",
    workspaceName: "Demonstration Workspace",
    completedAt: undefined,
    publiclyVerifiable: false,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: true,
      hasDeviceSummary: false,
      hasTimestamps: true,
      participantCount: 2,
      fileCount: 1,
      restrictedToVerifiers: true,
    },
    demonstrationOnly: true,
  },

  // ── Cancelled ────────────────────────────────────────────────────────────────
  "LAGDA-VER-2026-000874": {
    verificationId: "LAGDA-VER-2026-000874",
    transactionRecordStatus: "record-found-cancelled",
    fileMatchStatus: "not-evaluated",
    documentDescription: "Non-Disclosure Agreement — Cancelled",
    workspaceName: "Demonstration Workspace",
    completedAt: undefined,
    publiclyVerifiable: false,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: true,
      hasDeviceSummary: false,
      hasTimestamps: false,
      participantCount: 2,
      fileCount: 1,
      restrictedToVerifiers: true,
    },
    demonstrationOnly: true,
  },

  // ── Voided ───────────────────────────────────────────────────────────────────
  "LAGDA-VER-2026-000312": {
    verificationId: "LAGDA-VER-2026-000312",
    transactionRecordStatus: "record-found-voided",
    fileMatchStatus: "not-evaluated",
    documentDescription: "Employment Contract — Voided",
    workspaceName: "Demonstration Workspace",
    completedAt: undefined,
    publiclyVerifiable: false,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: true,
      hasDeviceSummary: false,
      hasTimestamps: false,
      participantCount: 2,
      fileCount: 1,
      restrictedToVerifiers: true,
    },
    demonstrationOnly: true,
  },

  // ── Expired ──────────────────────────────────────────────────────────────────
  "LAGDA-VER-2026-009901": {
    verificationId: "LAGDA-VER-2026-009901",
    transactionRecordStatus: "record-found-expired",
    fileMatchStatus: "not-evaluated",
    documentDescription: "Lease Agreement — Expired",
    workspaceName: "Demonstration Workspace",
    completedAt: undefined,
    publiclyVerifiable: false,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: true,
      hasDeviceSummary: false,
      hasTimestamps: false,
      participantCount: 2,
      fileCount: 1,
      restrictedToVerifiers: true,
    },
    demonstrationOnly: true,
  },

  // ── Declined ─────────────────────────────────────────────────────────────────
  "LAGDA-VER-2026-007732": {
    verificationId: "LAGDA-VER-2026-007732",
    transactionRecordStatus: "record-found-declined",
    fileMatchStatus: "not-evaluated",
    documentDescription: "Partnership Agreement — Declined",
    workspaceName: "Demonstration Workspace",
    completedAt: undefined,
    publiclyVerifiable: false,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: true,
      hasDeviceSummary: false,
      hasTimestamps: false,
      participantCount: 3,
      fileCount: 1,
      restrictedToVerifiers: true,
    },
    demonstrationOnly: true,
  },

  // ── Archived ─────────────────────────────────────────────────────────────────
  "LAGDA-VER-2025-008840": {
    verificationId: "LAGDA-VER-2025-008840",
    transactionRecordStatus: "record-found-archived",
    fileMatchStatus: "not-evaluated",
    documentDescription: "Supplier Agreement — Archived",
    workspaceName: "Northbridge Business Services",
    completedAt: "03 Dec 2025 14:22 PHT",
    publiclyVerifiable: false,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: true,
      hasDeviceSummary: true,
      hasTimestamps: true,
      participantCount: 2,
      fileCount: 2,
      restrictedToVerifiers: true,
    },
    demonstrationOnly: true,
  },

  // ── Restricted (access control demo) ─────────────────────────────────────────
  "LAGDA-VER-2026-RESTRICT": {
    verificationId: "LAGDA-VER-2026-RESTRICT",
    transactionRecordStatus: "record-restricted",
    fileMatchStatus: "comparison-unavailable",
    documentDescription: "Record access is restricted for this workspace",
    workspaceName: undefined,
    completedAt: undefined,
    publiclyVerifiable: false,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: false,
      hasDeviceSummary: false,
      hasTimestamps: false,
      participantCount: 0,
      fileCount: 0,
      restrictedToVerifiers: true,
    },
    demonstrationOnly: true,
  },

  // ── Unavailable (service error demo) ─────────────────────────────────────────
  "LAGDA-VER-2026-UNAVAIL": {
    verificationId: "LAGDA-VER-2026-UNAVAIL",
    transactionRecordStatus: "record-unavailable",
    fileMatchStatus: "comparison-unavailable",
    documentDescription: "Verification service temporarily unavailable",
    workspaceName: undefined,
    completedAt: undefined,
    publiclyVerifiable: false,
    associatedTransactionId: undefined,
    canLinkToTransaction: false,
    evidenceAvailability: {
      hasAuditEvents: false,
      hasDeviceSummary: false,
      hasTimestamps: false,
      participantCount: 0,
      fileCount: 0,
      restrictedToVerifiers: false,
    },
    demonstrationOnly: true,
  },
};

// ── Demo IDs exposed to the user ──────────────────────────────────────────────

export interface DemoVerificationId {
  id: string;
  label: string;
  scenario: string;
}

export const DEMO_VERIFICATION_IDS: DemoVerificationId[] = [
  { id: "LAGDA-VER-2026-004821", label: "Completed PSA — simulated match", scenario: "completed-match" },
  { id: "LAGDA-VER-2026-003102", label: "Completed contract — simulated mismatch", scenario: "completed-mismatch" },
  { id: "LAGDA-VER-2026-001455", label: "MOU — in progress", scenario: "in-progress" },
  { id: "LAGDA-VER-2026-000874", label: "NDA — cancelled", scenario: "cancelled" },
  { id: "LAGDA-VER-2026-000312", label: "Employment contract — voided", scenario: "voided" },
  { id: "LAGDA-VER-2026-009901", label: "Lease agreement — expired", scenario: "expired" },
  { id: "LAGDA-VER-2026-007732", label: "Partnership agreement — declined", scenario: "declined" },
  { id: "LAGDA-VER-2025-008840", label: "Supplier agreement — archived", scenario: "archived" },
  { id: "LAGDA-VER-2026-RESTRICT", label: "Restricted access demo", scenario: "restricted" },
  { id: "LAGDA-VER-2026-UNAVAIL", label: "Service unavailable demo", scenario: "unavailable" },
];

// ── Recent verification history fixtures ──────────────────────────────────────

export const MOCK_VERIFICATION_HISTORY: VerificationHistoryItem[] = [
  {
    id: "vh_001",
    verificationId: "LAGDA-VER-2026-004821",
    checkedAt: "15 Jul 2026 09:12 PHT",
    transactionRecordStatus: "record-found-completed",
    documentDescription: "Professional Services Agreement — Northbridge Legal / Rivera Consulting",
    workspaceName: "Northbridge Business Services",
  },
  {
    id: "vh_002",
    verificationId: "LAGDA-VER-2026-003102",
    checkedAt: "12 Jul 2026 16:44 PHT",
    transactionRecordStatus: "record-found-completed",
    documentDescription: "Contract for Services — Illustration",
    workspaceName: "Demonstration Workspace",
  },
  {
    id: "vh_003",
    verificationId: "LAGDA-VER-2026-001455",
    checkedAt: "10 Jul 2026 11:05 PHT",
    transactionRecordStatus: "record-found-in-progress",
    documentDescription: "Memorandum of Understanding — Draft",
    workspaceName: "Demonstration Workspace",
  },
  {
    id: "vh_004",
    verificationId: "LAGDA-VER-2026-000874",
    checkedAt: "08 Jul 2026 14:30 PHT",
    transactionRecordStatus: "record-found-cancelled",
    documentDescription: "Non-Disclosure Agreement — Cancelled",
    workspaceName: "Demonstration Workspace",
  },
  {
    id: "vh_005",
    verificationId: "LAGDA-VER-2025-008840",
    checkedAt: "05 Jul 2026 10:18 PHT",
    transactionRecordStatus: "record-found-archived",
    documentDescription: "Supplier Agreement — Archived",
    workspaceName: "Northbridge Business Services",
  },
];
