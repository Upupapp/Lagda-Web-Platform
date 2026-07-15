// Mock transaction detail fixtures for /app/documents/:transactionId.
// All names, organizations, and content are fictional.
// IDs txn_001–txn_008 match Document list fixtures (Documents workspace).
// No real document content, no real participant data, no private evidence.
// No IP addresses, exact locations, device fingerprints, or OTP values.
// Burgundy (#67023B) is NEVER used — reserved for eNotary only.

import type {
  TransactionDetail,
  TransactionParticipant,
  TransactionFile,
  ActivityEvent,
  EvidenceSection,
  DeviceNetworkSummary,
  ReminderSettings,
  ExpirationSettings,
  RoutingStep,
  CompletionRecord,
  VerificationRecordSummary,
} from "../../models/transaction-detail";
import { DOCUMENT_TAGS } from "./documents";

// ── Shared fictional participants (re-used across fixtures) ───────────────────

function mkP(
  id: string, txId: string, name: string, emailMasked: string,
  role: TransactionParticipant["role"],
  step: number,
  deliveryState: TransactionParticipant["deliveryState"],
  actionState: TransactionParticipant["actionState"],
  extra: Partial<TransactionParticipant> = {},
): TransactionParticipant {
  return {
    id, transactionId: txId, name, emailMasked, role,
    routingStep: step, isRequired: role !== "carbon-copy" && role !== "viewer",
    deliveryState, actionState,
    authSummary: [],
    assignedFieldCount: role === "signer" ? 3 : role === "approver" ? 0 : 0,
    ...extra,
  };
}

// ── Shared file helper ────────────────────────────────────────────────────────

function mkFile(
  id: string, txId: string, displayTitle: string, fileName: string,
  pages: number, bytes: number, completedCopy: boolean,
  integrityState: TransactionFile["integrityState"],
  uploadedAt: string,
): TransactionFile {
  return {
    id, transactionId: txId, displayTitle, fileName,
    fileType: "pdf", fileSizeBytesApprox: bytes, pageCount: pages,
    uploadedAt, isPrimary: true, completedCopyAvailable: completedCopy,
    integrityState, verificationAvailable: integrityState === "verified-demo",
  };
}

// ── Shared evidence sections ───────────────────────────────────────────────────

const STANDARD_EVIDENCE: EvidenceSection[] = [
  {
    id: "completion",
    title: "Transaction Record",
    privacyLevel: "authorized-standard",
    available: false,
    unavailableReason: "Transaction not yet completed.",
  },
  {
    id: "participants",
    title: "Participant Evidence",
    privacyLevel: "authorized-standard",
    available: true,
  },
  {
    id: "delivery",
    title: "Delivery Records",
    privacyLevel: "authorized-standard",
    available: true,
  },
  {
    id: "authentication",
    title: "Authentication Records",
    privacyLevel: "authorized-standard",
    available: true,
  },
  {
    id: "file-integrity",
    title: "File Integrity Summary",
    privacyLevel: "authorized-standard",
    available: true,
  },
  {
    id: "verification",
    title: "Verification Record",
    privacyLevel: "public-summary",
    available: false,
    unavailableReason: "Verification record is not yet available for this transaction.",
  },
  {
    id: "device-network",
    title: "Device and Network Summary",
    privacyLevel: "authorized-audit",
    available: false,
    unavailableReason: "Device and network summaries are not available for incomplete transactions.",
  },
];

const COMPLETED_EVIDENCE: EvidenceSection[] = [
  { id: "completion",     title: "Transaction Record",         privacyLevel: "authorized-standard", available: true },
  { id: "participants",   title: "Participant Evidence",       privacyLevel: "authorized-standard", available: true },
  { id: "delivery",       title: "Delivery Records",           privacyLevel: "authorized-standard", available: true },
  { id: "authentication", title: "Authentication Records",     privacyLevel: "authorized-standard", available: true },
  { id: "file-integrity", title: "File Integrity Summary",     privacyLevel: "authorized-standard", available: true },
  { id: "verification",   title: "Verification Record",        privacyLevel: "public-summary",      available: true },
  { id: "device-network", title: "Device and Network Summary", privacyLevel: "authorized-audit",    available: true },
];

const DEMO_DEVICE: DeviceNetworkSummary = {
  deviceCategory:  "Desktop",
  browserCategory: "Chrome",
  osCategory:      "Windows 11",
  networkRegion:   "Metro Manila, Philippines",
  timestamp:       "2026-07-09T14:20:00Z",
};

// ── txn_001 — Retainer Agreement (awaiting-signature, sequential) ─────────────

const TXN_001_PARTICIPANTS: TransactionParticipant[] = [
  mkP("par_001_maria", "txn_001", "Maria Reyes", "m****@example.com", "signer", 1, "opened", "completed", {
    invitedAt: "2026-07-10T09:14:00Z",
    viewedAt: "2026-07-10T10:05:00Z",
    completedAt: "2026-07-10T10:31:00Z",
    assignedFieldCount: 3,
    authSummary: [{ method: "email-otp", label: "Email Code", state: "completed", completedAt: "2026-07-10T10:08:00Z" }],
  }),
  mkP("par_001_antonio", "txn_001", "Antonio Tan", "a****@example.com", "signer", 2, "delivered", "awaiting", {
    invitedAt: "2026-07-10T10:32:00Z",
    assignedFieldCount: 3,
    authSummary: [{ method: "email-otp", label: "Email Code", state: "configured" }],
  }),
];

const TXN_001_FILES: TransactionFile[] = [
  mkFile("file_001", "txn_001", "Retainer Agreement", "retainer-agreement-mabini-v2.pdf", 4, 238000, false, "recorded", "2026-07-10T08:00:00Z"),
];

const TXN_001_ROUTING: RoutingStep[] = [
  { stepNumber: 1, label: "Step 1 — Initial Signatory", participantIds: ["par_001_maria"],   isCompleted: true,  isCurrent: false, isFailed: false },
  { stepNumber: 2, label: "Step 2 — Countersignature",  participantIds: ["par_001_antonio"], isCompleted: false, isCurrent: true,  isFailed: false },
];

const TXN_001_ACTIVITY: ActivityEvent[] = [
  { id: "ev_001_a", transactionId: "txn_001", type: "transaction-created",  category: "transaction",    timestamp: "2026-07-10T08:00:00Z", title: "Transaction created",         description: "Ana Reyes created the transaction.",                                         actorName: "Ana Reyes",  actorType: "user",        severity: "info",    hasEvidence: false },
  { id: "ev_001_b", transactionId: "txn_001", type: "document-uploaded",    category: "document",       timestamp: "2026-07-10T08:05:00Z", title: "Document uploaded",           description: "Retainer Agreement uploaded (4 pages).",                                     actorName: "Ana Reyes",  actorType: "user",        fileId: "file_001", severity: "info", hasEvidence: false },
  { id: "ev_001_c", transactionId: "txn_001", type: "transaction-sent",     category: "transaction",    timestamp: "2026-07-10T09:14:00Z", title: "Signing request sent",        description: "Ana Reyes sent the signing request to 2 participants.",                      actorName: "Ana Reyes",  actorType: "user",        severity: "info",    hasEvidence: false },
  { id: "ev_001_d", transactionId: "txn_001", type: "authentication-completed", category: "authentication", timestamp: "2026-07-10T10:08:00Z", title: "Authentication completed", description: "Maria Reyes completed the email code challenge.",                            actorType: "participant", participantId: "par_001_maria", participantName: "Maria Reyes", severity: "success", hasEvidence: true },
  { id: "ev_001_e", transactionId: "txn_001", type: "signature-completed",  category: "signing",        timestamp: "2026-07-10T10:31:00Z", title: "Signature completed",         description: "Maria Reyes completed all required fields (Step 1).",                        actorType: "participant", participantId: "par_001_maria", participantName: "Maria Reyes", severity: "success", hasEvidence: true },
  { id: "ev_001_f", transactionId: "txn_001", type: "routing-step-started", category: "transaction",    timestamp: "2026-07-10T10:32:00Z", title: "Step 2 started",              description: "Step 1 complete. Invitation sent to Antonio Tan (Step 2).",                  actorType: "system", severity: "info", hasEvidence: false },
];

// ── txn_002 — NDA (completed, parallel, full history) ─────────────────────────

const TXN_002_PARTICIPANTS: TransactionParticipant[] = [
  mkP("par_002_jose", "txn_002", "Jose dela Cruz", "j****@example.com", "signer", 1, "opened", "completed", {
    invitedAt: "2026-07-08T12:00:00Z", viewedAt: "2026-07-08T13:10:00Z", completedAt: "2026-07-08T14:05:00Z",
    assignedFieldCount: 2,
    authSummary: [{ method: "none", label: "Secure Invitation Link", state: "completed", completedAt: "2026-07-08T13:10:00Z" }],
  }),
  mkP("par_002_ricardo", "txn_002", "Ricardo Buenaventura", "r****@example.com", "signer", 1, "opened", "completed", {
    invitedAt: "2026-07-08T12:00:00Z", viewedAt: "2026-07-08T15:30:00Z", completedAt: "2026-07-09T09:15:00Z",
    assignedFieldCount: 2,
    authSummary: [{ method: "email-otp", label: "Email Code", state: "completed", completedAt: "2026-07-08T15:33:00Z" }],
  }),
  mkP("par_002_ana", "txn_002", "Ana Reyes", "a****@example.com", "signer", 1, "opened", "completed", {
    invitedAt: "2026-07-08T12:00:00Z", viewedAt: "2026-07-09T12:00:00Z", completedAt: "2026-07-09T14:22:00Z",
    assignedFieldCount: 2,
    authSummary: [{ method: "none", label: "Secure Invitation Link", state: "completed", completedAt: "2026-07-09T12:00:00Z" }],
  }),
];

const TXN_002_FILES: TransactionFile[] = [
  mkFile("file_002", "txn_002", "Non-Disclosure Agreement", "nda-harborline-northbridge-final.pdf", 6, 412000, true, "verified-demo", "2026-07-08T11:30:00Z"),
];

const TXN_002_ROUTING: RoutingStep[] = [
  { stepNumber: 1, label: "Step 1 — All Signatories (Parallel)", participantIds: ["par_002_jose","par_002_ricardo","par_002_ana"], isCompleted: true, isCurrent: false, isFailed: false },
];

const TXN_002_COMPLETION: CompletionRecord = {
  transactionId: "txn_002",
  title: "NDA — Harborline Properties × Northbridge Legal",
  status: "completed",
  completedAt: "2026-07-09T14:22:00Z",
  participantCount: 3,
  completedParticipantCount: 3,
  routingMode: "parallel",
  fileCount: 1,
  verificationId: "LAGDA-VER-2026-004821",
  workspaceName: "Northbridge Business Services",
  ownerName: "Ana Reyes",
  evidenceAvailable: true,
};

const TXN_002_ACTIVITY: ActivityEvent[] = [
  { id: "ev_002_a", transactionId: "txn_002", type: "transaction-created",       category: "transaction",    timestamp: "2026-07-08T11:30:00Z", title: "Transaction created",           description: "Ana Reyes created the transaction.",                           actorName: "Ana Reyes", actorType: "user",        severity: "info",    hasEvidence: false },
  { id: "ev_002_b", transactionId: "txn_002", type: "document-uploaded",         category: "document",       timestamp: "2026-07-08T11:35:00Z", title: "Document uploaded",             description: "NDA document uploaded (6 pages).",                             actorName: "Ana Reyes", actorType: "user",        fileId: "file_002", severity: "info", hasEvidence: false },
  { id: "ev_002_c", transactionId: "txn_002", type: "transaction-sent",          category: "transaction",    timestamp: "2026-07-08T12:00:00Z", title: "Signing request sent",          description: "Sent to 3 participants for parallel signing.",                  actorName: "Ana Reyes", actorType: "user",        severity: "info",    hasEvidence: false },
  { id: "ev_002_d", transactionId: "txn_002", type: "signature-completed",       category: "signing",        timestamp: "2026-07-08T14:05:00Z", title: "Signature completed",           description: "Jose dela Cruz completed all required fields.",                 actorType: "participant", participantId: "par_002_jose", participantName: "Jose dela Cruz", severity: "success", hasEvidence: true },
  { id: "ev_002_e", transactionId: "txn_002", type: "signature-completed",       category: "signing",        timestamp: "2026-07-09T09:15:00Z", title: "Signature completed",           description: "Ricardo Buenaventura completed all required fields.",           actorType: "participant", participantId: "par_002_ricardo", participantName: "Ricardo Buenaventura", severity: "success", hasEvidence: true },
  { id: "ev_002_f", transactionId: "txn_002", type: "signature-completed",       category: "signing",        timestamp: "2026-07-09T14:22:00Z", title: "Signature completed",           description: "Ana Reyes completed all required fields.",                     actorType: "participant", participantId: "par_002_ana", participantName: "Ana Reyes", severity: "success", hasEvidence: true },
  { id: "ev_002_g", transactionId: "txn_002", type: "transaction-completed",     category: "transaction",    timestamp: "2026-07-09T14:22:00Z", title: "Transaction completed",         description: "All required participants have completed their actions.",       actorType: "system", severity: "success", hasEvidence: true },
  { id: "ev_002_h", transactionId: "txn_002", type: "completion-record-created", category: "verification",   timestamp: "2026-07-09T14:23:00Z", title: "Transaction record created",    description: "A transaction record was created for this completed workflow.", actorType: "system", severity: "info",    hasEvidence: true },
  { id: "ev_002_i", transactionId: "txn_002", type: "verification-record-created", category: "verification", timestamp: "2026-07-09T14:24:00Z", title: "Verification record created",  description: "Verification record LAGDA-VER-2026-004821 is now available.",   actorType: "system", severity: "success", hasEvidence: true },
  { id: "ev_002_j", transactionId: "txn_002", type: "file-integrity-recorded",   category: "document",       timestamp: "2026-07-09T14:24:00Z", title: "File integrity recorded",       description: "A file integrity demonstration record was created.",            actorType: "system", fileId: "file_002", severity: "info", hasEvidence: true },
];

// ── txn_003 — Deed of Sale (partially-completed, parallel) ────────────────────

const TXN_003_PARTICIPANTS: TransactionParticipant[] = [
  mkP("par_003_jose", "txn_003", "Jose dela Cruz", "j****@example.com", "signer", 1, "opened", "completed", {
    invitedAt: "2026-07-12T10:00:00Z", viewedAt: "2026-07-12T11:30:00Z", completedAt: "2026-07-12T12:45:00Z",
    assignedFieldCount: 4,
    authSummary: [{ method: "email-otp", label: "Email Code", state: "completed", completedAt: "2026-07-12T11:33:00Z" }],
  }),
  mkP("par_003_remedios", "txn_003", "Remedios Santos", "r****@example.com", "signer", 1, "opened", "completed", {
    invitedAt: "2026-07-12T10:00:00Z", viewedAt: "2026-07-13T09:00:00Z", completedAt: "2026-07-13T09:45:00Z",
    assignedFieldCount: 4,
    authSummary: [{ method: "email-otp", label: "Email Code", state: "completed", completedAt: "2026-07-13T09:03:00Z" }],
  }),
  mkP("par_003_ricardo", "txn_003", "Ricardo Buenaventura", "r****@example.com", "signer", 1, "delivered", "awaiting", {
    invitedAt: "2026-07-12T10:00:00Z",
    assignedFieldCount: 4,
    authSummary: [{ method: "email-otp", label: "Email Code", state: "configured" }],
  }),
  mkP("par_003_lourdes", "txn_003", "Ma. Lourdes Villanueva", "m****@example.com", "signer", 1, "sent", "awaiting", {
    invitedAt: "2026-07-12T10:00:00Z",
    assignedFieldCount: 4,
    authSummary: [{ method: "none", label: "Secure Invitation Link", state: "configured" }],
  }),
];

const TXN_003_FILES: TransactionFile[] = [
  mkFile("file_003", "txn_003", "Deed of Sale — Lot 7 Block 3", "deed-of-sale-lot7-block3-harborline.pdf", 12, 890000, false, "recorded", "2026-07-12T09:00:00Z"),
];

const TXN_003_ROUTING: RoutingStep[] = [
  { stepNumber: 1, label: "Step 1 — All Parties (Parallel)", participantIds: ["par_003_jose","par_003_remedios","par_003_ricardo","par_003_lourdes"], isCompleted: false, isCurrent: true, isFailed: false },
];

const TXN_003_ACTIVITY: ActivityEvent[] = [
  { id: "ev_003_a", transactionId: "txn_003", type: "transaction-created", category: "transaction", timestamp: "2026-07-12T09:00:00Z", title: "Transaction created", description: "Ana Reyes created the transaction.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_003_b", transactionId: "txn_003", type: "transaction-sent",   category: "transaction", timestamp: "2026-07-12T10:00:00Z", title: "Signing request sent", description: "Sent to 4 participants for parallel signing.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_003_c", transactionId: "txn_003", type: "signature-completed",category: "signing",     timestamp: "2026-07-12T12:45:00Z", title: "Signature completed", description: "Jose dela Cruz completed all required fields.", actorType: "participant", participantId: "par_003_jose", participantName: "Jose dela Cruz", severity: "success", hasEvidence: true },
  { id: "ev_003_d", transactionId: "txn_003", type: "signature-completed",category: "signing",     timestamp: "2026-07-13T09:45:00Z", title: "Signature completed", description: "Remedios Santos completed all required fields.", actorType: "participant", participantId: "par_003_remedios", participantName: "Remedios Santos", severity: "success", hasEvidence: true },
];

// ── txn_004 — Faculty Employment Contract (draft) ─────────────────────────────

const TXN_004_PARTICIPANTS: TransactionParticipant[] = [
  mkP("par_004_caridad", "txn_004", "Dr. Caridad Lim", "c****@example.com", "signer", 1, "not-sent", "not-invited", {
    assignedFieldCount: 0,
    authSummary: [],
  }),
];

const TXN_004_FILES: TransactionFile[] = [
  mkFile("file_004", "txn_004", "Faculty Employment Contract", "faculty-employment-contract-draft.pdf", 3, 145000, false, "not-recorded", "2026-07-15T07:30:00Z"),
];

const TXN_004_ROUTING: RoutingStep[] = [
  { stepNumber: 1, label: "Step 1 — Employee Signature", participantIds: ["par_004_caridad"], isCompleted: false, isCurrent: false, isFailed: false },
];

const TXN_004_ACTIVITY: ActivityEvent[] = [
  { id: "ev_004_a", transactionId: "txn_004", type: "transaction-created", category: "transaction", timestamp: "2026-07-15T07:30:00Z", title: "Transaction created", description: "Ana Reyes created the draft transaction.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_004_b", transactionId: "txn_004", type: "document-uploaded",  category: "document",    timestamp: "2026-07-15T07:30:00Z", title: "Document uploaded",   description: "Faculty Employment Contract uploaded (3 pages, draft).", actorName: "Ana Reyes", actorType: "user", fileId: "file_004", severity: "info", hasEvidence: false },
];

// ── txn_005 — Legal Services Agreement (sent, expiring) ──────────────────────

const TXN_005_PARTICIPANTS: TransactionParticipant[] = [
  mkP("par_005_maria", "txn_005", "Maria Reyes", "m****@example.com", "signer", 1, "delivered", "awaiting", {
    invitedAt: "2026-07-13T14:05:00Z",
    assignedFieldCount: 3,
    authSummary: [{ method: "sms-otp", label: "SMS Code", state: "configured" }],
  }),
  mkP("par_005_rafael", "txn_005", "Rafael Gomez", "r****@example.com", "signer", 1, "sent", "awaiting", {
    invitedAt: "2026-07-13T14:05:00Z",
    assignedFieldCount: 3,
    authSummary: [{ method: "sms-otp", label: "SMS Code", state: "configured" }],
  }),
];

const TXN_005_FILES: TransactionFile[] = [
  mkFile("file_005", "txn_005", "Legal Services Agreement (Renewal)", "legal-services-agreement-renewal-2026.pdf", 5, 310000, false, "recorded", "2026-07-13T14:00:00Z"),
];

const TXN_005_ROUTING: RoutingStep[] = [
  { stepNumber: 1, label: "Step 1 — Both Parties (Parallel)", participantIds: ["par_005_maria","par_005_rafael"], isCompleted: false, isCurrent: true, isFailed: false },
];

const TXN_005_ACTIVITY: ActivityEvent[] = [
  { id: "ev_005_a", transactionId: "txn_005", type: "transaction-created", category: "transaction", timestamp: "2026-07-13T14:00:00Z", title: "Transaction created",   description: "Ana Reyes created the transaction.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_005_b", transactionId: "txn_005", type: "transaction-sent",   category: "transaction", timestamp: "2026-07-13T14:05:00Z", title: "Signing request sent", description: "Sent to 2 participants. Expires 27 Jul 2026.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_005_c", transactionId: "txn_005", type: "invitation-delivered",category: "delivery",   timestamp: "2026-07-13T14:06:00Z", title: "Invitation delivered", description: "Invitation delivered to Maria Reyes.", actorType: "system", participantId: "par_005_maria", participantName: "Maria Reyes", severity: "info", hasEvidence: false },
];

// ── txn_006 — Supplier Agreement (expired) ───────────────────────────────────

const TXN_006_PARTICIPANTS: TransactionParticipant[] = [
  mkP("par_006_jose", "txn_006", "Jose dela Cruz", "j****@example.com", "signer", 1, "opened", "completed", {
    invitedAt: "2026-06-01T09:30:00Z", viewedAt: "2026-06-03T10:00:00Z", completedAt: "2026-06-04T14:00:00Z",
    assignedFieldCount: 2,
    authSummary: [{ method: "none", label: "Secure Invitation Link", state: "completed", completedAt: "2026-06-03T10:00:00Z" }],
  }),
  mkP("par_006_rina", "txn_006", "Rina Evangelista", "r****@example.com", "signer", 1, "delivered", "expired", {
    invitedAt: "2026-06-01T09:30:00Z",
    assignedFieldCount: 2,
    authSummary: [{ method: "none", label: "Secure Invitation Link", state: "configured" }],
  }),
];

const TXN_006_FILES: TransactionFile[] = [
  mkFile("file_006", "txn_006", "Supplier Agreement — Harborline Properties", "supplier-agreement-harborline-2026.pdf", 8, 520000, false, "recorded", "2026-06-01T09:00:00Z"),
];

const TXN_006_ROUTING: RoutingStep[] = [
  { stepNumber: 1, label: "Step 1 — Both Parties (Parallel)", participantIds: ["par_006_jose","par_006_rina"], isCompleted: false, isCurrent: false, isFailed: true },
];

const TXN_006_ACTIVITY: ActivityEvent[] = [
  { id: "ev_006_a", transactionId: "txn_006", type: "transaction-created", category: "transaction", timestamp: "2026-06-01T09:00:00Z", title: "Transaction created",    description: "Ana Reyes created the transaction.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_006_b", transactionId: "txn_006", type: "transaction-sent",   category: "transaction", timestamp: "2026-06-01T09:30:00Z", title: "Signing request sent",  description: "Sent to 2 participants.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_006_c", transactionId: "txn_006", type: "signature-completed",category: "signing",     timestamp: "2026-06-04T14:00:00Z", title: "Signature completed",   description: "Jose dela Cruz completed all required fields.", actorType: "participant", participantId: "par_006_jose", participantName: "Jose dela Cruz", severity: "success", hasEvidence: true },
  { id: "ev_006_d", transactionId: "txn_006", type: "transaction-expired",category: "transaction", timestamp: "2026-06-15T00:00:00Z", title: "Transaction expired",   description: "The transaction expired. Rina Evangelista had not yet completed their action.", actorType: "system", severity: "error", hasEvidence: false },
];

// ── txn_007 — Vendor Service Agreement (archived, pre-archive: expired) ───────

const TXN_007_PARTICIPANTS: TransactionParticipant[] = [
  mkP("par_007_maria", "txn_007", "Maria Reyes",   "m****@example.com", "signer", 1, "sent", "expired", {
    invitedAt: "2026-05-10T09:30:00Z",
    assignedFieldCount: 2,
    authSummary: [{ method: "none", label: "Secure Invitation Link", state: "configured" }],
  }),
  mkP("par_007_luis", "txn_007", "Luis Bautista", "l****@example.com", "signer", 1, "sent", "expired", {
    invitedAt: "2026-05-10T09:30:00Z",
    assignedFieldCount: 2,
    authSummary: [{ method: "none", label: "Secure Invitation Link", state: "configured" }],
  }),
];

const TXN_007_FILES: TransactionFile[] = [
  mkFile("file_007", "txn_007", "Vendor Service Agreement", "vendor-service-agreement-mabini-2026.pdf", 6, 380000, false, "recorded", "2026-05-10T09:00:00Z"),
];

const TXN_007_ROUTING: RoutingStep[] = [
  { stepNumber: 1, label: "Step 1 — Both Parties (Parallel)", participantIds: ["par_007_maria","par_007_luis"], isCompleted: false, isCurrent: false, isFailed: true },
];

const TXN_007_ACTIVITY: ActivityEvent[] = [
  { id: "ev_007_a", transactionId: "txn_007", type: "transaction-created",  category: "transaction", timestamp: "2026-05-10T09:00:00Z", title: "Transaction created",    description: "Ana Reyes created the transaction.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_007_b", transactionId: "txn_007", type: "transaction-expired",  category: "transaction", timestamp: "2026-05-22T00:00:00Z", title: "Transaction expired",    description: "The transaction expired with no participants completing their action.", actorType: "system", severity: "error", hasEvidence: false },
  { id: "ev_007_c", transactionId: "txn_007", type: "transaction-archived", category: "transaction", timestamp: "2026-07-15T07:00:00Z", title: "Transaction archived",   description: "Ana Reyes archived the transaction.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
];

// ── txn_008 — Data Processing Addendum (failed-delivery) ─────────────────────

const TXN_008_PARTICIPANTS: TransactionParticipant[] = [
  mkP("par_008_rina", "txn_008", "Rina Evangelista", "r****@example.com", "signer", 1, "failed", "failed-delivery", {
    invitedAt: "2026-07-11T10:05:00Z",
    failedAt:  "2026-07-11T10:06:00Z",
    assignedFieldCount: 2,
    authSummary: [{ method: "none", label: "Secure Invitation Link", state: "configured" }],
  }),
  mkP("par_008_jose", "txn_008", "Jose dela Cruz", "j****@example.com", "signer", 2, "not-sent", "not-invited", {
    assignedFieldCount: 2,
    authSummary: [{ method: "email-otp", label: "Email Code", state: "configured" }],
  }),
];

const TXN_008_FILES: TransactionFile[] = [
  mkFile("file_008", "txn_008", "Data Processing Addendum", "data-processing-addendum-harborline.pdf", 2, 98000, false, "not-recorded", "2026-07-11T10:00:00Z"),
];

const TXN_008_ROUTING: RoutingStep[] = [
  { stepNumber: 1, label: "Step 1 — First Signatory",  participantIds: ["par_008_rina"], isCompleted: false, isCurrent: true, isFailed: true },
  { stepNumber: 2, label: "Step 2 — Second Signatory", participantIds: ["par_008_jose"], isCompleted: false, isCurrent: false, isFailed: false },
];

const TXN_008_ACTIVITY: ActivityEvent[] = [
  { id: "ev_008_a", transactionId: "txn_008", type: "transaction-created", category: "transaction", timestamp: "2026-07-11T10:00:00Z", title: "Transaction created",     description: "Ana Reyes created the transaction.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_008_b", transactionId: "txn_008", type: "transaction-sent",   category: "transaction", timestamp: "2026-07-11T10:05:00Z", title: "Signing request sent",   description: "Ana Reyes sent the signing request.", actorName: "Ana Reyes", actorType: "user", severity: "info", hasEvidence: false },
  { id: "ev_008_c", transactionId: "txn_008", type: "delivery-failed",    category: "delivery",    timestamp: "2026-07-11T10:06:00Z", title: "Delivery failed",        description: "Invitation to Rina Evangelista could not be delivered. Sender attention required.", actorType: "system", participantId: "par_008_rina", participantName: "Rina Evangelista", severity: "error", hasEvidence: false },
];

// ── TRANSACTION_DETAIL_FIXTURES ───────────────────────────────────────────────

export const TRANSACTION_DETAIL_FIXTURES: TransactionDetail[] = [
  {
    id: "txn_001",
    title: "Retainer Agreement — Mabini Business Services",
    status: "awaiting-signature",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Business Services",
    ownerName: "Ana Reyes",
    createdAt: "2026-07-10T08:00:00Z",
    updatedAt: "2026-07-10T10:32:00Z",
    sentAt: "2026-07-10T09:14:00Z",
    routingMode: "sequential",
    routingSteps: TXN_001_ROUTING,
    participants: TXN_001_PARTICIPANTS,
    files: TXN_001_FILES,
    activity: TXN_001_ACTIVITY,
    verificationRecord: { recordStatus: "pending", fileMatchStatus: "not-checked", publiclyVerifiable: false },
    reminder: { enabled: true, intervalDays: 3, nextScheduledAt: "2026-07-13T09:14:00Z" },
    expiration: { enabled: false, isExpired: false },
    folderIds: ["fol_001"],
    folderNames: ["Clients"],
    tags: [DOCUMENT_TAGS[0]!, DOCUMENT_TAGS[2]!],
    isMyAction: false,
    iAmParticipant: false,
    evidenceSections: STANDARD_EVIDENCE,
    deviceNetworkSummaries: [],
  },
  {
    id: "txn_002",
    title: "NDA — Harborline Properties × Northbridge Legal",
    status: "completed",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Business Services",
    ownerName: "Ana Reyes",
    createdAt: "2026-07-08T11:30:00Z",
    updatedAt: "2026-07-09T14:22:00Z",
    sentAt: "2026-07-08T12:00:00Z",
    completedAt: "2026-07-09T14:22:00Z",
    routingMode: "parallel",
    routingSteps: TXN_002_ROUTING,
    participants: TXN_002_PARTICIPANTS,
    files: TXN_002_FILES,
    activity: TXN_002_ACTIVITY,
    verificationRecord: {
      verificationId: "LAGDA-VER-2026-004821",
      recordStatus: "available",
      fileMatchStatus: "match-demo",
      completedAt: "2026-07-09T14:24:00Z",
      publiclyVerifiable: true,
      lastCheckedAt: "2026-07-15T00:00:00Z",
    },
    completionRecord: TXN_002_COMPLETION,
    reminder: { enabled: false, intervalDays: 3 },
    expiration: { enabled: false, isExpired: false },
    folderIds: ["fol_001", "fol_002"],
    folderNames: ["Clients", "Real Estate"],
    tags: [DOCUMENT_TAGS[1]!, DOCUMENT_TAGS[3]!],
    isMyAction: false,
    iAmParticipant: true,
    evidenceSections: COMPLETED_EVIDENCE,
    deviceNetworkSummaries: [DEMO_DEVICE],
  },
  {
    id: "txn_003",
    title: "Deed of Sale — Lot 7 Block 3, Harborline Residences",
    status: "partially-completed",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Business Services",
    ownerName: "Ana Reyes",
    createdAt: "2026-07-12T09:00:00Z",
    updatedAt: "2026-07-13T09:45:00Z",
    sentAt: "2026-07-12T10:00:00Z",
    routingMode: "parallel",
    routingSteps: TXN_003_ROUTING,
    participants: TXN_003_PARTICIPANTS,
    files: TXN_003_FILES,
    activity: TXN_003_ACTIVITY,
    verificationRecord: { recordStatus: "pending", fileMatchStatus: "not-checked", publiclyVerifiable: false },
    reminder: { enabled: true, intervalDays: 2, nextScheduledAt: "2026-07-15T10:00:00Z" },
    expiration: { enabled: true, expiresAt: "2026-07-26T10:00:00Z", isExpired: false },
    folderIds: ["fol_002"],
    folderNames: ["Real Estate"],
    tags: [DOCUMENT_TAGS[1]!, DOCUMENT_TAGS[3]!],
    isMyAction: false,
    iAmParticipant: false,
    evidenceSections: STANDARD_EVIDENCE,
    deviceNetworkSummaries: [],
  },
  {
    id: "txn_004",
    title: "Faculty Employment Contract — Sampaguita Learning Institute",
    status: "draft",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Business Services",
    ownerName: "Ana Reyes",
    createdAt: "2026-07-15T07:30:00Z",
    updatedAt: "2026-07-15T07:30:00Z",
    routingMode: "sequential",
    routingSteps: TXN_004_ROUTING,
    participants: TXN_004_PARTICIPANTS,
    files: TXN_004_FILES,
    activity: TXN_004_ACTIVITY,
    verificationRecord: { recordStatus: "not-applicable", fileMatchStatus: "unavailable", publiclyVerifiable: false },
    reminder: { enabled: false, intervalDays: 3 },
    expiration: { enabled: false, isExpired: false },
    folderIds: ["fol_003"],
    folderNames: ["HR & Employment"],
    tags: [DOCUMENT_TAGS[4]!],
    isMyAction: false,
    iAmParticipant: false,
    evidenceSections: [
      { id: "completion", title: "Transaction Record", privacyLevel: "authorized-standard", available: false, unavailableReason: "Draft transactions do not have a completion record." },
      { id: "participants", title: "Participant Evidence", privacyLevel: "authorized-standard", available: false, unavailableReason: "No invitations have been sent yet." },
      { id: "delivery", title: "Delivery Records", privacyLevel: "authorized-standard", available: false, unavailableReason: "No invitations have been sent yet." },
      { id: "authentication", title: "Authentication Records", privacyLevel: "authorized-standard", available: false, unavailableReason: "No invitations have been sent yet." },
      { id: "file-integrity", title: "File Integrity Summary", privacyLevel: "authorized-standard", available: false, unavailableReason: "Not yet recorded for draft documents." },
      { id: "verification", title: "Verification Record", privacyLevel: "public-summary", available: false, unavailableReason: "Verification records are not available for drafts." },
      { id: "device-network", title: "Device and Network Summary", privacyLevel: "authorized-audit", available: false, unavailableReason: "No participant activity recorded yet." },
    ],
    deviceNetworkSummaries: [],
  },
  {
    id: "txn_005",
    title: "Legal Services Agreement — Mabini Business Services (renewal)",
    status: "sent",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Business Services",
    ownerName: "Ana Reyes",
    createdAt: "2026-07-13T14:00:00Z",
    updatedAt: "2026-07-13T14:06:00Z",
    sentAt: "2026-07-13T14:05:00Z",
    expiresAt: "2026-07-27T14:05:00Z",
    routingMode: "parallel",
    routingSteps: TXN_005_ROUTING,
    participants: TXN_005_PARTICIPANTS,
    files: TXN_005_FILES,
    activity: TXN_005_ACTIVITY,
    verificationRecord: { recordStatus: "pending", fileMatchStatus: "not-checked", publiclyVerifiable: false },
    reminder: { enabled: true, intervalDays: 3, lastSentAt: "2026-07-13T14:05:00Z", nextScheduledAt: "2026-07-16T14:05:00Z" },
    expiration: { enabled: true, expiresAt: "2026-07-27T14:05:00Z", isExpired: false },
    folderIds: ["fol_001"],
    folderNames: ["Clients"],
    tags: [DOCUMENT_TAGS[0]!, DOCUMENT_TAGS[2]!, DOCUMENT_TAGS[5]!],
    isMyAction: false,
    iAmParticipant: false,
    evidenceSections: STANDARD_EVIDENCE,
    deviceNetworkSummaries: [],
  },
  {
    id: "txn_006",
    title: "Supplier Agreement — Harborline Properties",
    status: "expired",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Business Services",
    ownerName: "Ana Reyes",
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z",
    sentAt: "2026-06-01T09:30:00Z",
    expiresAt: "2026-06-15T00:00:00Z",
    routingMode: "parallel",
    routingSteps: TXN_006_ROUTING,
    participants: TXN_006_PARTICIPANTS,
    files: TXN_006_FILES,
    activity: TXN_006_ACTIVITY,
    verificationRecord: {
      verificationId: "VRF-2026-NBL-006",
      recordStatus: "available",
      fileMatchStatus: "not-checked",
      publiclyVerifiable: true,
      completedAt: "2026-06-15T00:00:00Z",
    },
    reminder: { enabled: false, intervalDays: 3 },
    expiration: { enabled: true, expiresAt: "2026-06-15T00:00:00Z", isExpired: true },
    folderIds: ["fol_004"],
    folderNames: ["Suppliers"],
    tags: [DOCUMENT_TAGS[3]!],
    isMyAction: false,
    iAmParticipant: false,
    evidenceSections: [
      { id: "completion",     title: "Transaction Record",         privacyLevel: "authorized-standard", available: false, unavailableReason: "Transaction expired before completion." },
      { id: "participants",   title: "Participant Evidence",       privacyLevel: "authorized-standard", available: true },
      { id: "delivery",       title: "Delivery Records",           privacyLevel: "authorized-standard", available: true },
      { id: "authentication", title: "Authentication Records",     privacyLevel: "authorized-standard", available: true },
      { id: "file-integrity", title: "File Integrity Summary",     privacyLevel: "authorized-standard", available: true },
      { id: "verification",   title: "Verification Record",        privacyLevel: "public-summary",      available: true },
      { id: "device-network", title: "Device and Network Summary", privacyLevel: "authorized-audit",    available: true },
    ],
    deviceNetworkSummaries: [{ ...DEMO_DEVICE, timestamp: "2026-06-04T14:00:00Z" }],
  },
  {
    id: "txn_007",
    title: "Vendor Service Agreement — Mabini Business Services",
    status: "archived",
    preArchiveStatus: "expired",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Business Services",
    ownerName: "Ana Reyes",
    createdAt: "2026-05-10T09:00:00Z",
    updatedAt: "2026-07-15T07:00:00Z",
    sentAt: "2026-05-10T09:30:00Z",
    expiresAt: "2026-05-22T00:00:00Z",
    routingMode: "parallel",
    routingSteps: TXN_007_ROUTING,
    participants: TXN_007_PARTICIPANTS,
    files: TXN_007_FILES,
    activity: TXN_007_ACTIVITY,
    verificationRecord: { recordStatus: "none", fileMatchStatus: "unavailable", publiclyVerifiable: false },
    reminder: { enabled: false, intervalDays: 3 },
    expiration: { enabled: true, expiresAt: "2026-05-22T00:00:00Z", isExpired: true },
    folderIds: ["fol_004", "fol_005"],
    folderNames: ["Suppliers", "Archive"],
    tags: [DOCUMENT_TAGS[2]!],
    isMyAction: false,
    iAmParticipant: false,
    evidenceSections: [
      { id: "completion",     title: "Transaction Record",         privacyLevel: "authorized-standard", available: false, unavailableReason: "Transaction was archived without completion." },
      { id: "participants",   title: "Participant Evidence",       privacyLevel: "authorized-standard", available: true },
      { id: "delivery",       title: "Delivery Records",           privacyLevel: "authorized-standard", available: true },
      { id: "authentication", title: "Authentication Records",     privacyLevel: "authorized-standard", available: false, unavailableReason: "No authentication activity was recorded before archival." },
      { id: "file-integrity", title: "File Integrity Summary",     privacyLevel: "authorized-standard", available: true },
      { id: "verification",   title: "Verification Record",        privacyLevel: "public-summary",      available: false, unavailableReason: "No verification record available." },
      { id: "device-network", title: "Device and Network Summary", privacyLevel: "authorized-audit",    available: false, unavailableReason: "No participant access recorded." },
    ],
    deviceNetworkSummaries: [],
  },
  {
    id: "txn_008",
    title: "Data Processing Addendum — Harborline Properties",
    status: "failed-delivery",
    workspaceId: "ws_northbridge_001",
    workspaceName: "Northbridge Business Services",
    ownerName: "Ana Reyes",
    createdAt: "2026-07-11T10:00:00Z",
    updatedAt: "2026-07-11T10:06:00Z",
    sentAt: "2026-07-11T10:05:00Z",
    routingMode: "sequential",
    routingSteps: TXN_008_ROUTING,
    participants: TXN_008_PARTICIPANTS,
    files: TXN_008_FILES,
    activity: TXN_008_ACTIVITY,
    verificationRecord: { recordStatus: "none", fileMatchStatus: "unavailable", publiclyVerifiable: false },
    reminder: { enabled: false, intervalDays: 3 },
    expiration: { enabled: false, isExpired: false },
    folderIds: ["fol_001"],
    folderNames: ["Clients"],
    tags: [DOCUMENT_TAGS[3]!],
    isMyAction: false,
    iAmParticipant: false,
    evidenceSections: [
      { id: "completion",     title: "Transaction Record",         privacyLevel: "authorized-standard", available: false, unavailableReason: "Transaction has not completed." },
      { id: "participants",   title: "Participant Evidence",       privacyLevel: "authorized-standard", available: true },
      { id: "delivery",       title: "Delivery Records",           privacyLevel: "authorized-standard", available: true },
      { id: "authentication", title: "Authentication Records",     privacyLevel: "authorized-standard", available: false, unavailableReason: "Invitation was not delivered." },
      { id: "file-integrity", title: "File Integrity Summary",     privacyLevel: "authorized-standard", available: true },
      { id: "verification",   title: "Verification Record",        privacyLevel: "public-summary",      available: false, unavailableReason: "No verification record available." },
      { id: "device-network", title: "Device and Network Summary", privacyLevel: "authorized-audit",    available: false, unavailableReason: "Invitation was not opened." },
    ],
    deviceNetworkSummaries: [],
  },
];

export const VALID_TXN_DETAIL_IDS = new Set(TRANSACTION_DETAIL_FIXTURES.map(t => t.id));
