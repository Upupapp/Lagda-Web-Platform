// Authenticated verification models for /app/verify.
// These types are separate from the public DemoVerificationResult in forms.ts —
// the authenticated view carries richer private context but shares the same legal constraints.
// NEVER equate: found record ≠ matching file; matching file ≠ legal validity; signing ≠ notarization.

// ── Verification ID ───────────────────────────────────────────────────────────

export type VerificationId = string;

// ── Transaction record status ─────────────────────────────────────────────────
// Describes what was found in LAGDA's signing record, not whether the file is valid.

export type TransactionRecordStatus =
  | "record-found-completed"
  | "record-found-in-progress"
  | "record-found-draft"
  | "record-found-cancelled"
  | "record-found-voided"
  | "record-found-expired"
  | "record-found-declined"
  | "record-found-archived"
  | "record-not-found"
  | "record-unavailable"
  | "record-restricted";

export const TRANSACTION_RECORD_STATUS_LABELS: Record<TransactionRecordStatus, string> = {
  "record-found-completed":    "Signing Record Found — Completed",
  "record-found-in-progress":  "Signing Record Found — In Progress",
  "record-found-draft":        "Signing Record Found — Draft",
  "record-found-cancelled":    "Signing Record Found — Cancelled",
  "record-found-voided":       "Signing Record Found — Voided",
  "record-found-expired":      "Signing Record Found — Expired",
  "record-found-declined":     "Signing Record Found — Declined",
  "record-found-archived":     "Signing Record Found — Archived",
  "record-not-found":          "No Matching Signing Record",
  "record-unavailable":        "Verification Service Temporarily Unavailable",
  "record-restricted":         "Signing Record Found — Access Restricted",
};

export const TRANSACTION_RECORD_STATUS_GUIDANCE: Record<TransactionRecordStatus, string> = {
  "record-found-completed":
    "A completed signing record exists for this Verification ID. This indicates that all required participants completed their signing actions in LAGDA. This frontend demonstration does not confirm the legal validity of the document.",
  "record-found-in-progress":
    "A signing record exists for this Verification ID and signing is still in progress. Not all participants have completed their signing actions.",
  "record-found-draft":
    "A signing record exists for this Verification ID but the transaction has not yet been sent to participants.",
  "record-found-cancelled":
    "A signing record exists for this Verification ID, but the transaction was cancelled before completion. The document should not be treated as fully executed.",
  "record-found-voided":
    "A signing record exists for this Verification ID, but it has been voided. A voided transaction is no longer valid.",
  "record-found-expired":
    "A signing record exists for this Verification ID, but it expired before all participants completed signing.",
  "record-found-declined":
    "A signing record exists for this Verification ID, but it was declined by one or more participants and did not proceed.",
  "record-found-archived":
    "A signing record exists for this Verification ID and has been archived. Archived transactions are preserved but considered closed.",
  "record-not-found":
    "No signing record matching this Verification ID was found in this demonstration. The ID may be incorrect or may not be from LAGDA.",
  "record-unavailable":
    "The verification service is temporarily unavailable in this demonstration. Please try again in a moment.",
  "record-restricted":
    "A signing record may exist for this Verification ID, but your workspace does not have access to its details. Contact the document owner for more information.",
};

// ── File match status ─────────────────────────────────────────────────────────
// Describes the simulated comparison between the selected local file and the record.
// This is a frontend demonstration — no file is uploaded, hashed, or stored.

export type FileMatchStatus =
  | "not-evaluated"
  | "match"
  | "mismatch"
  | "comparison-unavailable"
  | "file-not-provided"
  | "unsupported-file"
  | "file-too-large"
  | "file-invalid"
  | "comparison-error";

export const FILE_MATCH_STATUS_LABELS: Record<FileMatchStatus, string> = {
  "not-evaluated":          "File Comparison Not Evaluated",
  "match":                  "File Comparison — Simulated Match",
  "mismatch":               "File Comparison — Simulated Mismatch",
  "comparison-unavailable": "File Comparison Unavailable",
  "file-not-provided":      "No File Selected for Comparison",
  "unsupported-file":       "File Type Not Supported for Comparison",
  "file-too-large":         "File Too Large for Comparison",
  "file-invalid":           "Selected File Could Not Be Read",
  "comparison-error":       "File Comparison Error",
};

// ── Evidence availability summary ─────────────────────────────────────────────

export interface EvidenceAvailabilitySummary {
  hasAuditEvents: boolean;
  hasDeviceSummary: boolean;
  hasTimestamps: boolean;
  participantCount: number;
  fileCount: number;
  restrictedToVerifiers: boolean;
}

// ── Verification record ────────────────────────────────────────────────────────
// The authenticated lookup result. Richer than the public DemoVerificationResult.

export interface VerificationRecord {
  verificationId: VerificationId;
  transactionRecordStatus: TransactionRecordStatus;
  fileMatchStatus: FileMatchStatus;

  // Public-safe fields (same data public /verify would show)
  documentDescription: string;
  workspaceName?: string;
  completedAt?: string;
  publiclyVerifiable: boolean;

  // Authenticated-only fields
  associatedTransactionId?: string;
  canLinkToTransaction: boolean;
  evidenceAvailability: EvidenceAvailabilitySummary;

  demonstrationOnly: true;
}

// ── Verification lookup ───────────────────────────────────────────────────────

export interface VerificationLookupRequest {
  verificationId: VerificationId;
  sourceContext?: VerificationSourceContext;
}

export interface VerificationLookupResult {
  record: VerificationRecord | null;
  error?: VerificationError;
  demonstrationOnly: true;
}

// ── File comparison ───────────────────────────────────────────────────────────
// Simulated comparison only. No file upload, hashing, or storage.

export interface FileComparisonRequest {
  verificationId: VerificationId;
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
}

export interface FileComparisonResult {
  fileMatchStatus: FileMatchStatus;
  simulatedOnly: true;
  demonstrationOnly: true;
}

export interface FileSelectionSummary {
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  selectionTimestamp: string;
  demonstrationOnly: true;
}

// ── History ───────────────────────────────────────────────────────────────────

export interface VerificationHistoryItem {
  id: string;
  verificationId: VerificationId;
  checkedAt: string;
  transactionRecordStatus: TransactionRecordStatus;
  documentDescription: string;
  workspaceName?: string;
}

export interface VerificationHistoryQuery {
  limit?: number;
}

export interface VerificationHistoryResult {
  items: VerificationHistoryItem[];
  demonstrationOnly: true;
}

// ── Source context ────────────────────────────────────────────────────────────
// Populated from query params: ?source=transaction&transactionId=txn_002

export type VerificationSource =
  | "direct"
  | "transaction"
  | "document"
  | "email"
  | "qr"
  | "dashboard";

export interface VerificationSourceContext {
  source: VerificationSource;
  transactionId?: string;
  documentId?: string;
}

export function parseVerificationSource(raw: string | null): VerificationSource {
  const valid: readonly VerificationSource[] = ["direct", "transaction", "document", "email", "qr", "dashboard"];
  if (!raw) return "direct";
  return (valid as readonly string[]).includes(raw) ? (raw as VerificationSource) : "direct";
}

// ── Permissions ───────────────────────────────────────────────────────────────
// UI-gate only — not a security enforcement boundary.

export interface VerificationPermission {
  canLookup: boolean;
  canCompareFile: boolean;
  canViewEvidenceLinks: boolean;
  canFollowTransactionLinks: boolean;
}

// ── Errors ────────────────────────────────────────────────────────────────────

export type VerificationErrorCode =
  | "invalid-id-format"
  | "service-unavailable"
  | "network-error"
  | "permission-denied"
  | "rate-limited";

export interface VerificationError {
  code: VerificationErrorCode;
  message: string;
}

// ── Action IDs ────────────────────────────────────────────────────────────────

export type VerificationActionId =
  | "copy-verification-id"
  | "view-transaction"
  | "view-evidence"
  | "view-activity"
  | "view-participants"
  | "open-public-verify";

// ── Scenario enum (for mock fixture keys) ────────────────────────────────────

export type VerificationScenario =
  | "completed-match"
  | "completed-mismatch"
  | "in-progress"
  | "cancelled"
  | "voided"
  | "expired"
  | "declined"
  | "archived"
  | "not-found"
  | "unavailable"
  | "restricted";
