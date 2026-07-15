// Transaction detail domain models for /app/documents/:transactionId routes.
// Extends base models from ./index.ts and ./documents.ts.
// Do NOT add eNotary types, notarial roles, or Burgundy colors (#67023B).
// Presentation (colors, icons) lives in the component layer.

import type { TransactionStatus, ParticipantRole, AuthMethod } from "./index";
import type { DocumentTag } from "./documents";

// ── Routing ───────────────────────────────────────────────────────────────────

export type RoutingMode = "sequential" | "parallel" | "mixed" | "approval-based";

export const ROUTING_MODE_LABELS: Record<RoutingMode, string> = {
  sequential:       "Sequential",
  parallel:         "Parallel",
  mixed:            "Mixed",
  "approval-based": "Approval-Based",
};

export interface RoutingStep {
  stepNumber:     number;
  label:          string;
  participantIds: string[];
  isCompleted:    boolean;
  isCurrent:      boolean;
  isFailed:       boolean;
}

// ── Participant delivery and action states ─────────────────────────────────────

export type ParticipantDeliveryState =
  | "not-sent"
  | "pending"
  | "sent"
  | "delivered"
  | "opened"
  | "failed"
  | "bounced";

export type ParticipantActionState =
  | "not-invited"
  | "awaiting"
  | "in-progress"
  | "completed"
  | "approved"
  | "rejected"
  | "declined"
  | "failed-delivery"
  | "expired"
  | "cancelled";

export const PARTICIPANT_DELIVERY_LABELS: Record<ParticipantDeliveryState, string> = {
  "not-sent":  "Not Sent",
  "pending":   "Pending",
  "sent":      "Sent",
  "delivered": "Delivered",
  "opened":    "Opened",
  "failed":    "Failed",
  "bounced":   "Bounced",
};

export const PARTICIPANT_ACTION_LABELS: Record<ParticipantActionState, string> = {
  "not-invited":    "Not Yet Invited",
  "awaiting":       "Awaiting Action",
  "in-progress":    "In Progress",
  "completed":      "Completed",
  "approved":       "Approved",
  "rejected":       "Rejected",
  "declined":       "Declined",
  "failed-delivery":"Failed Delivery",
  "expired":        "Expired",
  "cancelled":      "Cancelled",
};

// Semantic tones for delivery/action states
export const DELIVERY_STATE_TONE: Record<ParticipantDeliveryState, string> = {
  "not-sent":  "#94A3B8",
  "pending":   "#64748B",
  "sent":      "#1D4ED8",
  "delivered": "#1D4ED8",
  "opened":    "#0891B2",
  "failed":    "#DC2626",
  "bounced":   "#DC2626",
};

export const ACTION_STATE_TONE: Record<ParticipantActionState, string> = {
  "not-invited":    "#94A3B8",
  "awaiting":       "#854D0E",
  "in-progress":    "#1D4ED8",
  "completed":      "#166534",
  "approved":       "#166534",
  "rejected":       "#991B1B",
  "declined":       "#991B1B",
  "failed-delivery":"#991B1B",
  "expired":        "#7C3AED",
  "cancelled":      "#94A3B8",
};

// ── Participant roles (active eSignature roles only) ───────────────────────────
// Notary Public is excluded — eNotary is a separate future product.

export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  signer:       "Signer",
  approver:     "Approver",
  viewer:       "Viewer",
  "carbon-copy":"Copy Recipient",
};

export const PARTICIPANT_ROLE_DESCRIPTIONS: Record<ParticipantRole, string> = {
  signer:       "Must complete all required signature fields.",
  approver:     "Must approve or reject the transaction before later steps proceed.",
  viewer:       "May view the document but is not required to act.",
  "carbon-copy":"Receives a copy of the completed document. Does not block completion.",
};

// ── Authentication method summary ─────────────────────────────────────────────

export interface AuthMethodSummary {
  method:       AuthMethod;
  label:        string;
  state:        "configured" | "completed" | "failed" | "not-required";
  completedAt?: string;
}

export const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  "email-otp":      "Email Code",
  "sms-otp":        "SMS Code",
  "knowledge-based":"Knowledge-Based Authentication",
  "id-verification":"Identity Verification",
  "none":           "Secure Invitation Link",
};

// ── Detailed participant ───────────────────────────────────────────────────────

export interface TransactionParticipant {
  id:                 string;
  transactionId:      string;
  name:               string;
  emailMasked:        string;    // e.g. "m****@example.com" — never full email in list
  role:               ParticipantRole;
  routingStep:        number;
  isRequired:         boolean;
  deliveryState:      ParticipantDeliveryState;
  actionState:        ParticipantActionState;
  authSummary:        AuthMethodSummary[];
  assignedFieldCount: number;
  invitedAt?:         string;
  viewedAt?:          string;
  completedAt?:       string;
  declinedAt?:        string;
  failedAt?:          string;
}

// ── Transaction files ─────────────────────────────────────────────────────────

export type FileIntegrityState = "not-recorded" | "recorded" | "mismatch-demo" | "verified-demo";

export interface TransactionFile {
  id:                     string;
  transactionId:          string;
  displayTitle:           string;
  fileName:               string;    // fictional — not real customer content
  fileType:               "pdf" | "word" | "other";
  fileSizeBytesApprox:    number;
  pageCount:              number;
  uploadedAt:             string;
  isPrimary:              boolean;
  completedCopyAvailable: boolean;
  integrityState:         FileIntegrityState;
  verificationAvailable:  boolean;
}

// ── Activity events ───────────────────────────────────────────────────────────

export type ActivityEventCategory =
  | "transaction"
  | "document"
  | "participant"
  | "delivery"
  | "authentication"
  | "signing"
  | "verification"
  | "settings"
  | "security";

export type ActivityEventType =
  // Transaction lifecycle
  | "transaction-created"
  | "transaction-renamed"
  | "transaction-sent"
  | "transaction-cancelled"
  | "transaction-voided"
  | "transaction-expired"
  | "transaction-completed"
  | "transaction-archived"
  | "transaction-restored"
  // Document
  | "document-uploaded"
  | "document-prepared"
  | "fields-configured"
  | "document-viewed"
  | "completion-record-created"
  | "verification-record-created"
  // Participant
  | "participant-added"
  | "invitation-sent"
  | "invitation-delivered"
  | "invitation-failed"
  | "invitation-opened"
  | "authentication-started"
  | "authentication-completed"
  | "signature-completed"
  | "approval-completed"
  | "approval-rejected"
  | "participant-declined"
  // Delivery
  | "delivery-attempted"
  | "delivery-failed"
  | "delivery-bounced"
  // Workflow/Settings
  | "reminder-sent"
  | "expiration-updated"
  | "routing-step-started"
  | "routing-step-completed"
  // Evidence
  | "evidence-recorded"
  | "file-integrity-recorded";

export type ActivityEventSeverity = "info" | "warning" | "error" | "success";

export interface ActivityEvent {
  id:               string;
  transactionId:    string;
  type:             ActivityEventType;
  category:         ActivityEventCategory;
  timestamp:        string;
  title:            string;
  description:      string;
  actorName?:       string;
  actorType:        "user" | "system" | "participant";
  participantId?:   string;
  participantName?: string;
  fileId?:          string;
  severity:         ActivityEventSeverity;
  hasEvidence:      boolean;
}

// ── Activity query ────────────────────────────────────────────────────────────

export type ActivitySortDir = "newest" | "oldest";

export interface ActivityQuery {
  category:      ActivityEventCategory | "all";
  participantId: string | null;
  sort:          ActivitySortDir;
  page:          number;
}

export const DEFAULT_ACTIVITY_QUERY: ActivityQuery = {
  category: "all",
  participantId: null,
  sort: "newest",
  page: 1,
};

export const ACTIVITY_PAGE_SIZE = 10;

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityEventCategory | "all", string> = {
  all:            "All Events",
  transaction:    "Transaction",
  document:       "Documents",
  participant:    "Participants",
  delivery:       "Delivery",
  authentication: "Authentication",
  signing:        "Signing & Approvals",
  verification:   "Verification",
  settings:       "Settings",
  security:       "Security",
};

export const VALID_ACTIVITY_CATEGORIES: ReadonlyArray<ActivityEventCategory | "all"> = [
  "all","transaction","document","participant","delivery",
  "authentication","signing","verification","settings","security",
];

// ── Evidence ──────────────────────────────────────────────────────────────────

export type EvidencePrivacyLevel =
  | "public-summary"       // safe for public-facing components
  | "authorized-standard"  // requires view_documents
  | "authorized-audit";    // requires view_audit

export interface EvidenceSection {
  id:              string;
  title:           string;
  privacyLevel:    EvidencePrivacyLevel;
  available:       boolean;
  unavailableReason?: string;
}

export interface DeviceNetworkSummary {
  deviceCategory:  string;  // "Desktop", "Mobile", "Tablet"
  browserCategory: string;  // "Chrome", "Safari", "Firefox"
  osCategory:      string;  // "Windows", "macOS", "iOS"
  networkRegion:   string;  // "Metro Manila, Philippines" — never lat/lng or exact IP
  timestamp:       string;
}

// ── Completion record ─────────────────────────────────────────────────────────

export interface CompletionRecord {
  transactionId:             string;
  title:                     string;
  status:                    TransactionStatus;
  completedAt?:              string;
  participantCount:          number;
  completedParticipantCount: number;
  routingMode:               RoutingMode;
  fileCount:                 number;
  verificationId?:           string;
  workspaceName:             string;
  ownerName:                 string;
  evidenceAvailable:         boolean;
}

// ── Verification record ───────────────────────────────────────────────────────

export type VerificationRecordStatus =
  | "available"
  | "pending"
  | "issue"
  | "not-applicable"
  | "none";

export type FileMatchStatus =
  | "not-checked"
  | "match-demo"
  | "mismatch-demo"
  | "unavailable";

export interface VerificationRecordSummary {
  verificationId?:    string;
  recordStatus:       VerificationRecordStatus;
  fileMatchStatus:    FileMatchStatus;
  completedAt?:       string;
  publiclyVerifiable: boolean;
  lastCheckedAt?:     string;
}

// ── Reminder and expiration settings ─────────────────────────────────────────

export interface ReminderSettings {
  enabled:         boolean;
  intervalDays:    number;
  lastSentAt?:     string;
  nextScheduledAt?: string;
}

export interface ExpirationSettings {
  enabled:   boolean;
  expiresAt?: string;
  isExpired: boolean;
}

// ── Full transaction detail ───────────────────────────────────────────────────

export interface TransactionDetail {
  id:                string;
  title:             string;
  status:            TransactionStatus;
  workspaceId:       string;
  workspaceName:     string;
  ownerName:         string;
  createdAt:         string;
  updatedAt:         string;
  sentAt?:           string;
  completedAt?:      string;
  expiresAt?:        string;
  preArchiveStatus?: TransactionStatus;
  routingMode:       RoutingMode;
  routingSteps:      RoutingStep[];
  participants:      TransactionParticipant[];
  files:             TransactionFile[];
  activity:          ActivityEvent[];
  verificationRecord: VerificationRecordSummary;
  completionRecord?:  CompletionRecord;
  reminder:          ReminderSettings;
  expiration:        ExpirationSettings;
  folderIds:         string[];
  folderNames:       string[];
  tags:              DocumentTag[];
  isMyAction:        boolean;
  iAmParticipant:    boolean;
  evidenceSections:  EvidenceSection[];
  deviceNetworkSummaries: DeviceNetworkSummary[];
}

// ── Action availability ───────────────────────────────────────────────────────

export type TransactionActionId =
  | "view-overview"
  | "view-participants"
  | "view-activity"
  | "view-evidence"
  | "open-settings"
  | "continue-draft"
  | "rename"
  | "edit-reminders"
  | "edit-expiration"
  | "move-folder"
  | "edit-tags"
  | "archive"
  | "restore"
  | "cancel"
  | "void"
  | "resend-invitation"
  | "copy-verification-id"
  | "open-verification";

export interface TransactionActionAvailability {
  action:    TransactionActionId;
  available: boolean;
  reason?:   string;
}

// ── Service scenarios ─────────────────────────────────────────────────────────

export type TransactionDetailScenario =
  | "standard"
  | "full-error"
  | "not-found"
  | "permission-denied";

export const VALID_DETAIL_SCENARIOS: readonly TransactionDetailScenario[] = [
  "standard", "full-error", "not-found", "permission-denied",
];
