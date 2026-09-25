// Real recipient submission/decline service. Traced against current source
// this command (P2): signing-submission-routes.ts, signing-decline-routes.ts.
// Uses recipientApiRequest — recipient realm only, see that file's header.

import { recipientApiRequest } from "../recipient-api-client";

export type SubmittedFieldValue =
  | { kind: "signature"; fieldId: string }
  | { kind: "initials"; fieldId: string }
  | { kind: "text"; fieldId: string; text: string }
  | { kind: "checkbox"; fieldId: string; checked: boolean };

export type SignatureRepresentation =
  | { method: "typed"; text: string; styleIndex: number }
  | { method: "drawn"; base64: string }
  /**
   * "Use the mark the server was handed for this session."
   *
   * No content, deliberately. The server already holds what was prepared, and
   * a client able to supply the bytes could claim `applied-from-saved` for
   * anything — the absent payload is what makes that provenance a fact.
   */
  | { method: "saved" };

export interface SubmitSigningInput {
  fieldValues: SubmittedFieldValue[];
  signature?: SignatureRepresentation;
  initials?: SignatureRepresentation;
}

export interface SubmitSigningResult {
  submissionId: string;
  acceptedAt: string;
  acceptedFieldCount: number;
  recipientSubmissionAccepted: true;
}

// Backend's closed vocabulary (SIGNING_DECLINE_REASONS) — mirrors
// DECLINE_REASON_CATEGORIES already defined in models/recipient.ts.
export type SigningDeclineReason = "not-agree" | "not-intended" | "needs-correction" | "cannot-complete" | "other";

export interface DeclineSigningResult {
  declinedAt: number; // epoch ms
  applied: boolean;   // false if already declined
}

class RealSigningSubmissionService {
  async submit(input: SubmitSigningInput, idempotencyKey: string): Promise<SubmitSigningResult> {
    return recipientApiRequest<SubmitSigningResult>("/signing/submission", {
      method: "POST",
      body: input,
      headers: { "Idempotency-Key": idempotencyKey },
    });
  }

  // Deliberately no Idempotency-Key — the backend treats decline as
  // naturally idempotent (a retry matches zero remaining rows to update).
  async decline(reason: SigningDeclineReason): Promise<DeclineSigningResult> {
    return recipientApiRequest<DeclineSigningResult>("/signing/decline", {
      method: "POST",
      body: { reason },
    });
  }

  /**
   * 069. An APPROVER passes on approving. The backend records the approver as
   * skipped and the request moves on to the next step — the approver's
   * counterpart to a signer's decline, which approvers may not do. Empty
   * body, naturally idempotent like decline.
   */
  async skip(): Promise<{ skippedAt: number; applied: boolean }> {
    return recipientApiRequest<{ skippedAt: number; applied: boolean }>("/signing/skip", {
      method: "POST",
      body: {},
    });
  }
}

export const realSigningSubmissionService = new RealSigningSubmissionService();
