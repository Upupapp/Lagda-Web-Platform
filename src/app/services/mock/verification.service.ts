// Authenticated verification service mock for /app/verify.
// No file upload, hashing, or cryptography. Comparison is deterministic by filename.
// Replace MockVerificationService with RealVerificationService at integration time.

import type {
  VerificationLookupRequest,
  VerificationLookupResult,
  FileComparisonRequest,
  FileComparisonResult,
  VerificationHistoryQuery,
  VerificationHistoryResult,
  VerificationPermission,
} from "../../models/verification";
import {
  MOCK_VERIFICATION_RECORDS,
  MOCK_VERIFICATION_HISTORY,
  VER_ID_RE,
} from "../../data/mock/verification";
import { delay } from "./delay";

// ── Service interface ─────────────────────────────────────────────────────────

export interface IVerificationService {
  lookupVerificationRecord(req: VerificationLookupRequest): Promise<VerificationLookupResult>;
  compareSelectedFile(req: FileComparisonRequest): Promise<FileComparisonResult>;
  getVerificationHistory(query: VerificationHistoryQuery): Promise<VerificationHistoryResult>;
  getVerificationPermissions(): VerificationPermission;
}

// ── Mock implementation ───────────────────────────────────────────────────────

class MockVerificationService implements IVerificationService {

  async lookupVerificationRecord(req: VerificationLookupRequest): Promise<VerificationLookupResult> {
    await delay(800);

    const normalized = req.verificationId.trim().toUpperCase().replace(/\s+/g, "");

    if (!normalized) {
      return {
        record: null,
        error: { code: "invalid-id-format", message: "Please enter a Verification ID." },
        demonstrationOnly: true,
      };
    }

    if (!VER_ID_RE.test(normalized)) {
      return {
        record: null,
        error: {
          code: "invalid-id-format",
          message: "The ID entered does not match the expected LAGDA Verification ID format (e.g. LAGDA-VER-2026-004821).",
        },
        demonstrationOnly: true,
      };
    }

    const record = MOCK_VERIFICATION_RECORDS[normalized];

    if (!record) {
      return {
        record: {
          verificationId: normalized,
          transactionRecordStatus: "record-not-found",
          fileMatchStatus: "file-not-provided",
          documentDescription: "No matching signing record found for this Verification ID.",
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
        demonstrationOnly: true,
      };
    }

    return { record, demonstrationOnly: true };
  }

  async compareSelectedFile(req: FileComparisonRequest): Promise<FileComparisonResult> {
    await delay(600);

    const normalized = req.verificationId.trim().toUpperCase().replace(/\s+/g, "");
    const record = MOCK_VERIFICATION_RECORDS[normalized];

    if (!record) {
      return { fileMatchStatus: "comparison-unavailable", simulatedOnly: true, demonstrationOnly: true };
    }

    if (record.transactionRecordStatus === "record-unavailable" || record.transactionRecordStatus === "record-restricted") {
      return { fileMatchStatus: "comparison-unavailable", simulatedOnly: true, demonstrationOnly: true };
    }

    // File validation checks
    const maxBytes = 20 * 1024 * 1024; // 20 MB demo limit
    if (req.fileSizeBytes > maxBytes) {
      return { fileMatchStatus: "file-too-large", simulatedOnly: true, demonstrationOnly: true };
    }

    const supportedTypes = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!supportedTypes.includes(req.fileType)) {
      return { fileMatchStatus: "unsupported-file", simulatedOnly: true, demonstrationOnly: true };
    }

    // Deterministic: if the record has a pre-set file match outcome, honour it.
    // Otherwise derive from filename pattern (for demo flexibility).
    if (record.fileMatchStatus === "match" || record.fileMatchStatus === "mismatch") {
      return { fileMatchStatus: record.fileMatchStatus, simulatedOnly: true, demonstrationOnly: true };
    }

    // Records that were never complete cannot produce a meaningful comparison.
    if (record.transactionRecordStatus !== "record-found-completed") {
      return { fileMatchStatus: "comparison-unavailable", simulatedOnly: true, demonstrationOnly: true };
    }

    // Fallback: derive from filename hint for any other completed record.
    const lower = req.fileName.toLowerCase();
    if (lower.includes("mismatch") || lower.includes("wrong") || lower.includes("other")) {
      return { fileMatchStatus: "mismatch", simulatedOnly: true, demonstrationOnly: true };
    }

    return { fileMatchStatus: "match", simulatedOnly: true, demonstrationOnly: true };
  }

  async getVerificationHistory(query: VerificationHistoryQuery): Promise<VerificationHistoryResult> {
    await delay(400);
    const limit = query.limit ?? 5;
    return {
      items: MOCK_VERIFICATION_HISTORY.slice(0, limit),
      demonstrationOnly: true,
    };
  }

  getVerificationPermissions(): VerificationPermission {
    return {
      canLookup: true,
      canCompareFile: true,
      canViewEvidenceLinks: true,
      canFollowTransactionLinks: true,
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const verificationService: IVerificationService = new MockVerificationService();
