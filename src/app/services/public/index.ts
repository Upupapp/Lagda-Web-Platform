// What the DEMO build (no server) uses for the public pages: the demo-request
// form, the sample verification records, and a no-op conversion tracker.
// On the live site the forms call services/real/public-inquiries.service.ts.

import type {
  DemoRequest,
  PublicVerificationRequest,
  FormSubmissionResult,
  DemoVerificationResult,
  DemoVerificationOutcome,
  ConversionEvent,
} from "../../models/forms";
import { delay } from "../mock/delay";

// ── Service interfaces ─────────────────────────────────────────────────────────

export interface IDemoRequestService {
  submitDemoRequest(req: DemoRequest): Promise<FormSubmissionResult>;
}

export interface IPublicVerificationService {
  verify(req: PublicVerificationRequest): Promise<DemoVerificationResult>;
}

export interface IConversionTrackingService {
  track(event: ConversionEvent): void;
}

// ── Demo verification data ────────────────────────────────────────────────────

// Deterministic demo records keyed by a known fictional Verification ID.
// Any unrecognized ID returns "no-record".
const DEMO_VERIFICATION_RECORDS: Record<string, Omit<DemoVerificationResult, "verificationId" | "demonstrationOnly">> = {
  "LAGDA-VER-2026-004821": {
    outcome: "verified",
    documentDescription: "Professional Services Agreement — Northbridge Legal / Rivera Consulting",
    completedAt: "14 Jul 2026 11:47 PHT",
    workspaceName: "Northbridge Legal",
    transactionStatus: "Completed",
    fileMatchStatus: "matched",
  },
  "LAGDA-VER-2026-003102": {
    outcome: "file-mismatch",
    documentDescription: "Contract for Services — Illustration",
    completedAt: "02 Jun 2026 09:15 PHT",
    workspaceName: "Demonstration Workspace",
    transactionStatus: "Completed",
    fileMatchStatus: "mismatch",
  },
  "LAGDA-VER-2026-001455": {
    outcome: "incomplete",
    documentDescription: "Memorandum of Understanding — Draft",
    completedAt: undefined,
    workspaceName: "Demonstration Workspace",
    transactionStatus: "Awaiting Signatures",
    fileMatchStatus: "not-evaluated",
  },
  "LAGDA-VER-2026-000874": {
    outcome: "cancelled",
    documentDescription: "Non-Disclosure Agreement — Cancelled",
    completedAt: undefined,
    workspaceName: "Demonstration Workspace",
    transactionStatus: "Cancelled",
    fileMatchStatus: "n/a",
  },
  "LAGDA-VER-2026-000312": {
    outcome: "voided",
    documentDescription: "Employment Contract — Voided",
    completedAt: undefined,
    workspaceName: "Demonstration Workspace",
    transactionStatus: "Voided",
    fileMatchStatus: "n/a",
  },
  "LAGDA-VER-2026-UNAVAIL": {
    outcome: "unavailable",
    documentDescription: "Verification service temporarily unavailable",
    completedAt: undefined,
    workspaceName: undefined,
    transactionStatus: "Unavailable",
    fileMatchStatus: "n/a",
  },
};

const VER_ID_RE = /^LAGDA-VER-\d{4}-\w{4,10}$/i;

// ── Mock implementations ───────────────────────────────────────────────────────

class MockDemoRequestService implements IDemoRequestService {
  async submitDemoRequest(_req: DemoRequest): Promise<FormSubmissionResult> {
    // The demo build has no server. It never pretends to fail at random.
    await delay(900);
    return { success: true, demonstrationOnly: true };
  }
}

class MockPublicVerificationService implements IPublicVerificationService {
  async verify(req: PublicVerificationRequest): Promise<DemoVerificationResult> {
    await delay(1000);
    const normalizedId = req.verificationId.trim().toUpperCase().replace(/\s+/g, "");
    const record = DEMO_VERIFICATION_RECORDS[normalizedId];
    if (record) {
      return { ...record, verificationId: normalizedId, demonstrationOnly: true };
    }
    // Any unrecognized ID → no-record
    return {
      outcome: "no-record" as DemoVerificationOutcome,
      verificationId: normalizedId,
      documentDescription: "No matching verification record found",
      completedAt: undefined,
      workspaceName: undefined,
      transactionStatus: "Not Found",
      fileMatchStatus: "n/a",
      demonstrationOnly: true,
    };
  }
}

class MockConversionTrackingService implements IConversionTrackingService {
  track(_event: ConversionEvent): void {
    // No-op during frontend-only phase.
    // Replace with real analytics client at integration time.
    // Never log sensitive form values here.
  }
}

// ── Exported singleton instances ───────────────────────────────────────────────
// Replace these with real service instances at backend integration time.

export const demoRequestService: IDemoRequestService = new MockDemoRequestService();
export const publicVerificationService: IPublicVerificationService = new MockPublicVerificationService();
export const conversionTracker: IConversionTrackingService = new MockConversionTrackingService();

export { VER_ID_RE };
