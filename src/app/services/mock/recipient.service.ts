// Mock recipient request service — frontend demonstration only.
// No HTTP calls, no backend, no persistence, no real auth.
// All "submissions" are simulated in-memory and produce no external effect.

import type {
  RecipientRequest,
  RecipientRequestId,
  UnavailableReason,
  AuthState,
  SignatureAdoptionMethod,
  RecipientCompletionSummary,
  RecipientParticipantRole,
} from "../../models/recipient";
import { AUTH_METHOD_LABELS, RECIPIENT_ROLE_LABELS } from "../../models/recipient";
import { getMockRecipientRequest } from "../../data/mock/recipient";

// ── Init result ───────────────────────────────────────────────────────────────

export type InitResult =
  | { ok: true;  request: RecipientRequest }
  | { ok: false; reason: UnavailableReason };

export function initializeRequest(requestId: RecipientRequestId): InitResult {
  if (!requestId || requestId.trim() === "") {
    return { ok: false, reason: "invalid-link" };
  }
  const request = getMockRecipientRequest(requestId);
  if (!request) {
    return { ok: false, reason: "not-found" };
  }
  if (request.routingLocked) {
    return { ok: false, reason: "routing-locked" };
  }
  if (request.status === "expired") {
    return { ok: false, reason: "expired" };
  }
  if (request.status === "cancelled") {
    return { ok: false, reason: "cancelled" };
  }
  if (request.status === "voided") {
    return { ok: false, reason: "voided" };
  }
  if (request.status === "completed") {
    return { ok: false, reason: "already-actioned" };
  }
  return { ok: true, request };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

const DEMO_VALID_CODES = new Set(["000000", "123456", "111111"]);
let authAttempts = 0;
const MAX_AUTH_ATTEMPTS = 5;

export type AuthChallengeResult =
  | { ok: true;  authState: "success" }
  | { ok: false; authState: AuthState };

export function submitAuthChallenge(code: string): AuthChallengeResult {
  authAttempts++;
  if (authAttempts > MAX_AUTH_ATTEMPTS) {
    return { ok: false, authState: "too-many-attempts" };
  }
  if (!code || code.trim() === "") {
    return { ok: false, authState: "invalid-code" };
  }
  if (DEMO_VALID_CODES.has(code.trim())) {
    authAttempts = 0;
    return { ok: true, authState: "success" };
  }
  return { ok: false, authState: "invalid-code" };
}

export function resetAuthAttempts() {
  authAttempts = 0;
}

// ── Consent ───────────────────────────────────────────────────────────────────

export type ConsentResult =
  | { ok: true  }
  | { ok: false; message: string };

export function acceptConsent(): ConsentResult {
  return { ok: true };
}

// ── Field value storage ───────────────────────────────────────────────────────
// Values are held here transiently. They are cleared on session end.
// Nothing is written to localStorage or sessionStorage.

const _fieldValues = new Map<string, string | boolean | null>();

export function updateFieldValue(fieldId: string, value: string | boolean | null): void {
  _fieldValues.set(fieldId, value);
}

export function getFieldValue(fieldId: string): string | boolean | null | undefined {
  return _fieldValues.get(fieldId);
}

export function clearAllFieldValues(): void {
  _fieldValues.clear();
}

// ── Signature adoption ────────────────────────────────────────────────────────

export type SignatureResult = { ok: true } | { ok: false; message: string };

export function validateSignatureAdoption(
  method: SignatureAdoptionMethod,
  typedText: string,
  drawnDataUrl: string | null,
): SignatureResult {
  if (method === "typed") {
    if (!typedText || typedText.trim().length < 2) {
      return { ok: false, message: "Please enter your name to adopt a signature." };
    }
    return { ok: true };
  }
  if (method === "drawn") {
    if (!drawnDataUrl) {
      return { ok: false, message: "Please draw your signature before adopting." };
    }
    return { ok: true };
  }
  return { ok: false, message: "Unknown signature method." };
}

// ── Action validation ─────────────────────────────────────────────────────────

export type ActionValidationResult =
  | { ok: true }
  | { ok: false; missingFields: string[] };

export function validateAction(
  role: RecipientParticipantRole,
  requiredFieldIds: string[],
  fieldValues: Map<string, string | boolean | null>,
  signatureAdopted: boolean,
  initialsAdopted: boolean,
): ActionValidationResult {
  const missing: string[] = [];

  for (const fieldId of requiredFieldIds) {
    const val = fieldValues.get(fieldId);
    if (val === undefined || val === null || val === "" || val === false) {
      missing.push(fieldId);
    }
  }

  if (role === "signer" && !signatureAdopted) {
    missing.push("__signature__");
  }

  return missing.length === 0
    ? { ok: true }
    : { ok: false, missingFields: missing };
}

// ── Submit action (demo outcome) ──────────────────────────────────────────────

export type SubmitResult =
  | { ok: true;  summary: RecipientCompletionSummary }
  | { ok: false; message: string };

export function submitAction(
  request: RecipientRequest,
  completedFieldCount: number,
  signatureAdopted: boolean,
  signatureMethod: SignatureAdoptionMethod | null,
  consentAccepted: boolean,
  approvalDecision: "approve" | "reject" | null,
  reviewDecision: "complete" | "request-revision" | null,
): SubmitResult {
  const role = request.participant.role;

  let actionType: string;
  if (role === "signer")                  actionType = "Signed";
  else if (role === "approver")           actionType = approvalDecision === "approve" ? "Approved" : "Rejected";
  else if (role === "reviewer")           actionType = reviewDecision === "complete" ? "Review Completed" : "Revision Requested";
  else if (role === "acknowledgment-recipient") actionType = "Acknowledged";
  else if (role === "viewer")             actionType = "Viewed";
  else                                    actionType = "Copy Received";

  const routingOutcome = buildRoutingOutcomeText(request);

  const summary: RecipientCompletionSummary = {
    requestId:               request.id,
    transactionTitle:        request.transactionTitle,
    participantRole:         role,
    participantDisplayName:  request.participant.displayName,
    actionType,
    completedFieldCount,
    signatureAdoptionMethod: signatureAdopted ? signatureMethod : null,
    authMethodLabel:         AUTH_METHOD_LABELS[request.participant.authMethod],
    consentAccepted,
    routingOutcome,
    demonstrationTimestamp:  new Date().toISOString(),
    demonstrationOnly:       true,
  };

  return { ok: true, summary };
}

function buildRoutingOutcomeText(request: RecipientRequest): string {
  const pos = request.routingPosition;
  if (pos === "solo" || pos === "last") {
    return "This was the final step in the routing sequence. In a live system, the completed document package would be compiled and distributed to all parties.";
  }
  if (pos === "first") {
    return "Your action advances the document to the next participant in the routing sequence. In a live system, the next participant would receive an invitation.";
  }
  if (pos === "middle") {
    return "Your action advances the document to the next step in the routing sequence. In a live system, the next participant would be notified.";
  }
  return "Your action has been recorded as a demonstration outcome. No routing has occurred.";
}

// ── Decline ───────────────────────────────────────────────────────────────────

export type DeclineResult =
  | { ok: true;  summary: RecipientCompletionSummary }
  | { ok: false; message: string };

export function declineRequest(
  request: RecipientRequest,
  reasonId: string,
  reasonNote: string,
): DeclineResult {
  const summary: RecipientCompletionSummary = {
    requestId:               request.id,
    transactionTitle:        request.transactionTitle,
    participantRole:         request.participant.role,
    participantDisplayName:  request.participant.displayName,
    actionType:              "Declined",
    completedFieldCount:     0,
    signatureAdoptionMethod: null,
    authMethodLabel:         AUTH_METHOD_LABELS[request.participant.authMethod],
    consentAccepted:         false,
    routingOutcome:          "You chose to decline this document request. In a live system, the sender would be notified of your decline. No document was sent, no signature was recorded, and no data was persisted as a result of this demonstration.",
    demonstrationTimestamp:  new Date().toISOString(),
    demonstrationOnly:       true,
  };
  void reasonId;
  void reasonNote;
  return { ok: true, summary };
}

// ── Session clear ─────────────────────────────────────────────────────────────

export function clearSession(): void {
  clearAllFieldValues();
  resetAuthAttempts();
}

// ── Role action labels ────────────────────────────────────────────────────────

export function getPrimaryActionLabel(role: RecipientParticipantRole): string {
  const map: Record<RecipientParticipantRole, string> = {
    "signer":                   "Complete Signing",
    "approver":                 "Submit Decision",
    "reviewer":                 "Complete Review",
    "acknowledgment-recipient": "Acknowledge",
    "viewer":                   "Mark as Viewed",
    "copy-recipient":           "Continue",
  };
  return map[role];
}

export function getCompletionHeading(
  role: RecipientParticipantRole,
  decision: "approve" | "reject" | null,
  reviewDecision: "complete" | "request-revision" | null,
  declined: boolean,
): string {
  if (declined) return "Request Declined";
  if (role === "signer")                   return "Document Signed";
  if (role === "approver")                 return decision === "approve" ? "Approved" : "Rejected";
  if (role === "reviewer")                 return reviewDecision === "complete" ? "Review Complete" : "Revision Requested";
  if (role === "acknowledgment-recipient") return "Acknowledged";
  if (role === "viewer")                   return "Document Viewed";
  return "Completed";
}

export function getRoleLabel(role: RecipientParticipantRole): string {
  return RECIPIENT_ROLE_LABELS[role];
}
