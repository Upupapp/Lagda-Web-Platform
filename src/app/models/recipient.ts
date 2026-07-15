// Recipient-facing signing/review/acknowledgment domain models.
// PRIVACY: No recipient values, signatures, initials, authentication codes, or
// personal data are persisted in localStorage or sessionStorage.
// All state is in-memory and cleared on session end.
// Burgundy (#67023B) is NEVER used here — eNotary-only.
// No eNotary roles, seals, notarial certificates, or accreditation workflows.

// ── Identity types ────────────────────────────────────────────────────────────

export type RecipientRequestId = string;
export type RecipientParticipantId = string;
export type RecipientFieldId = string;

// ── Request lifecycle status ──────────────────────────────────────────────────

export type RecipientRequestStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "voided"
  | "completed";

// ── Participant roles (mirrors PrepParticipantRole) ───────────────────────────

export type RecipientParticipantRole =
  | "signer"
  | "approver"
  | "reviewer"
  | "acknowledgment-recipient"
  | "viewer"
  | "copy-recipient";

export const RECIPIENT_ROLE_LABELS: Record<RecipientParticipantRole, string> = {
  "signer":                  "Signer",
  "approver":                "Approver",
  "reviewer":                "Reviewer",
  "acknowledgment-recipient":"Acknowledgment Recipient",
  "viewer":                  "Viewer",
  "copy-recipient":          "Copy Recipient",
};

export const RECIPIENT_ROLE_DESCRIPTIONS: Record<RecipientParticipantRole, string> = {
  "signer":                  "You are required to review the document and adopt an electronic signature.",
  "approver":                "You are required to review the document and submit an approval or rejection decision.",
  "reviewer":                "You are invited to review the document and indicate completion.",
  "acknowledgment-recipient":"You are required to review the document and acknowledge receipt.",
  "viewer":                  "You are permitted to view this document. No action is required.",
  "copy-recipient":          "You have been included as a copy recipient. No blocking action is required.",
};

// ── Recipient flow steps ──────────────────────────────────────────────────────

export type RecipientFlowStep =
  | "initializing"
  | "access"
  | "auth"
  | "consent"
  | "review"
  | "action"
  | "summary"
  | "complete"
  | "declined"
  | "unavailable"
  | "error";

// ── Unavailable reasons ───────────────────────────────────────────────────────

export type UnavailableReason =
  | "invalid-link"
  | "not-found"
  | "expired"
  | "cancelled"
  | "voided"
  | "already-actioned"
  | "routing-locked"
  | "session-ended"
  | "service-unavailable"
  | "permission-denied";

export const UNAVAILABLE_MESSAGES: Record<UnavailableReason, { heading: string; body: string; canRetry: boolean }> = {
  "invalid-link":       { heading: "Invalid Request Link",        body: "This link does not match any document request. Please check that you opened the correct link.",                                         canRetry: false },
  "not-found":          { heading: "Request Not Found",           body: "This document request could not be found. It may have been removed or the link may be incorrect.",                                      canRetry: false },
  "expired":            { heading: "Request Has Expired",         body: "This document request expired before your action was completed. Please contact the sender if you need a new request.",                  canRetry: false },
  "cancelled":          { heading: "Request Was Cancelled",       body: "The sender cancelled this document request. No further action is required.",                                                             canRetry: false },
  "voided":             { heading: "Request Is Voided",           body: "This document request has been voided. No further action is possible.",                                                                  canRetry: false },
  "already-actioned":   { heading: "Action Already Completed",    body: "Your demonstration action for this request has already been recorded. No further action is required.",                                  canRetry: false },
  "routing-locked":     { heading: "Not Yet Available",           body: "Your action on this request is not yet available because an earlier routing step is still pending.",                                    canRetry: true  },
  "session-ended":      { heading: "Session Ended",               body: "Your frontend demonstration session has ended. Unsaved participant responses were cleared.",                                             canRetry: true  },
  "service-unavailable":{ heading: "Service Unavailable",         body: "The document request service is temporarily unavailable in this demonstration. Please try again.",                                      canRetry: true  },
  "permission-denied":  { heading: "Access Not Available",        body: "You do not have permission to access this document request.",                                                                            canRetry: false },
};

// ── Authentication ────────────────────────────────────────────────────────────

export type AuthMethod =
  | "invitation-access"
  | "email-code"
  | "sms-code"
  | "authenticator"
  | "account-signin"
  | "enterprise-idp"
  | "none";

export const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  "invitation-access": "Secure Invitation Access",
  "email-code":        "Email Verification Code",
  "sms-code":          "SMS Verification Code",
  "authenticator":     "Authenticator Application",
  "account-signin":    "Account Sign-In",
  "enterprise-idp":    "Enterprise Identity Provider",
  "none":              "No Authentication Required",
};

export type AuthState =
  | "idle"
  | "pending"
  | "success"
  | "invalid-code"
  | "expired"
  | "too-many-attempts";

// ── Signature adoption ────────────────────────────────────────────────────────

export type SignatureAdoptionMethod = "typed" | "drawn";

export interface SignatureAdoption {
  method:       SignatureAdoptionMethod;
  typedText:    string;
  styleIndex:   number;
  drawnDataUrl: string | null; // in-memory only; never stored or uploaded
  adopted:      boolean;
}

export const TYPED_SIGNATURE_STYLES = [
  { label: "Classic Script",  fontStyle: "italic",      fontFamily: "Georgia, serif",          fontSize: 26 },
  { label: "Modern Print",    fontStyle: "normal",      fontFamily: "Segoe UI, sans-serif",    fontSize: 22 },
  { label: "Formal Italic",   fontStyle: "italic",      fontFamily: "'Times New Roman', serif",fontSize: 24 },
  { label: "Clean Sans",      fontStyle: "normal",      fontFamily: "Arial, sans-serif",       fontSize: 22 },
];

// ── Recipient field value ─────────────────────────────────────────────────────

export interface RecipientFieldValue {
  fieldId:  RecipientFieldId;
  value:    string | boolean | null;
  // demonstrationTimestamp is set at demo-submit time, not field-entry time
}

// ── Recipient documents and fields ────────────────────────────────────────────

export interface RecipientPage {
  id:          string;
  documentId:  string;
  pageNumber:  number;
  label:       string;
}

export interface RecipientDocument {
  id:          string;
  displayName: string;
  pageCount:   number;
  pages:       RecipientPage[];
}

export interface RecipientField {
  id:            RecipientFieldId;
  type:          string;
  label:         string;
  required:      boolean;
  pageId:        string;
  documentId:    string;
  rect:          { x: number; y: number; width: number; height: number };
  assignedToMe:  boolean;   // true = current participant's field
  isSenderText:  boolean;   // true = read-only sender content
  placeholder?:  string;
  multiline?:    boolean;
  options?:      { id: string; label: string }[];
  senderText?:   string;
  layer:         number;
  demonstrationOnly: true;
}

// ── Participant definition ────────────────────────────────────────────────────

export interface RecipientParticipant {
  id:              RecipientParticipantId;
  displayName:     string;
  role:            RecipientParticipantRole;
  authMethod:      AuthMethod;
  authRequired:    boolean;
  consentRequired: boolean;
}

// ── Top-level request ─────────────────────────────────────────────────────────

export interface RecipientRequest {
  id:                          RecipientRequestId;
  transactionTitle:            string;
  senderWorkspaceDisplayName:  string;
  status:                      RecipientRequestStatus;
  participant:                 RecipientParticipant;
  documents:                   RecipientDocument[];
  fields:                      RecipientField[];
  routingPosition:             "first" | "middle" | "last" | "parallel" | "solo";
  routingLocked:               boolean;
  canDecline:                  boolean;
  scenarioLabel:               string;
  demonstrationOnly:           true;
}

// ── Decisions ─────────────────────────────────────────────────────────────────

export type ApprovalDecision = "approve" | "reject" | null;
export type ReviewDecision = "complete" | "request-revision" | null;

// ── Decline / rejection reasons ───────────────────────────────────────────────

export const DECLINE_REASON_CATEGORIES = [
  { id: "not-agree",       label: "I do not agree with the document" },
  { id: "not-intended",    label: "I am not the intended participant" },
  { id: "needs-correction",label: "The document requires correction" },
  { id: "cannot-complete", label: "I cannot complete this request" },
  { id: "other",           label: "Other" },
] as const;

export const REJECTION_REASON_CATEGORIES = [
  { id: "changes-required", label: "Changes are required" },
  { id: "incomplete",       label: "Information is incomplete" },
  { id: "not-approved",     label: "Not approved" },
  { id: "other",            label: "Other" },
] as const;

// ── Completion summary ────────────────────────────────────────────────────────

export interface RecipientCompletionSummary {
  requestId:              RecipientRequestId;
  transactionTitle:       string;
  participantRole:        RecipientParticipantRole;
  participantDisplayName: string;
  actionType:             string;
  completedFieldCount:    number;
  signatureAdoptionMethod: SignatureAdoptionMethod | null;
  authMethodLabel:        string;
  consentAccepted:        boolean;
  routingOutcome:         string;
  demonstrationTimestamp: string;
  demonstrationOnly:      true;
}

// ── Scenario registry (dev only) ──────────────────────────────────────────────

export type RecipientScenario = {
  requestId: RecipientRequestId;
  label:     string;
  role:      RecipientParticipantRole;
};

export const RECIPIENT_SCENARIOS: RecipientScenario[] = [
  { requestId: "req-engagement-0002-marco", label: "Signer — Marco Santos",              role: "signer"                  },
  { requestId: "req-psa-0001-lea",          label: "Signer multi-doc — Lea Cruz",        role: "signer"                  },
  { requestId: "req-dpa-0005-ana",          label: "Approver — Ana Reyes",               role: "approver"                },
  { requestId: "req-policy-review-0006",    label: "Reviewer — Daniel Lim",              role: "reviewer"                },
  { requestId: "req-policy-0004-sofia",     label: "Ack Recipient — Sofia Navarro",      role: "acknowledgment-recipient" },
  { requestId: "req-viewer-0007",           label: "Viewer",                             role: "viewer"                  },
  { requestId: "req-copy-0008",             label: "Copy Recipient",                     role: "copy-recipient"          },
  { requestId: "req-locked-0009",           label: "Routing Locked",                     role: "signer"                  },
  { requestId: "req-expired-0010",          label: "Expired",                            role: "signer"                  },
  { requestId: "req-cancelled-0011",        label: "Cancelled",                          role: "signer"                  },
  { requestId: "req-voided-0012",           label: "Voided",                             role: "signer"                  },
  { requestId: "req-done-0013",             label: "Already Actioned",                   role: "signer"                  },
];
