// Preparation workflow domain models for /app/prepare/*.
// The preparation flow is FRONTEND-ONLY — no real uploads, no real invitations.
// Extends existing types: RoutingMode (transaction-detail), DocumentFolder/Tag (documents),
// AuthMethod/ParticipantRole (index). Do NOT duplicate stable domain types.
// Burgundy (#67023B) is ONLY for eNotary — never appears here.
// Do NOT add eNotary roles, routing steps, or authentication methods.

import type { RoutingMode } from "./transaction-detail";
import type { DocumentFolder, DocumentTag } from "./documents";

// Re-export for consumers who only import from prepare.ts
export type { RoutingMode };
export type { DocumentFolder, DocumentTag };

// ── Preparation draft identity ────────────────────────────────────────────────

export type PrepDraftId = string;
export type PrepFileId  = string;
export type PrepPaxId   = string; // participant draft ID
export type PrepGroupId = string; // routing group ID

// ── Preparation draft status (state machine) ──────────────────────────────────

export type PreparationDraftStatus =
  | "not-started"
  | "initializing"
  | "draft-created"
  | "files-required"
  | "files-configured"
  | "participants-required"
  | "participants-configured"
  | "routing-required"
  | "routing-configured"
  | "authentication-required"
  | "authentication-configured"
  | "settings-required"
  | "settings-configured"
  | "review-required"
  | "ready-for-field-placement"
  | "discarded"
  | "error";

// ── Preparation step IDs ──────────────────────────────────────────────────────

export type PreparationStepId =
  | "upload"
  | "participants"
  | "routing"
  | "authentication"
  | "settings"
  | "review"
  | "fields";

export const PREPARATION_STEPS: { id: PreparationStepId; label: string; shortLabel: string; route: string }[] = [
  { id: "upload",         label: "Documents",                  shortLabel: "Docs",     route: "/app/prepare/upload"         },
  { id: "participants",   label: "Participants",                shortLabel: "Pax",      route: "/app/prepare/participants"   },
  { id: "routing",        label: "Routing",                    shortLabel: "Route",    route: "/app/prepare/routing"        },
  { id: "authentication", label: "Authentication",             shortLabel: "Auth",     route: "/app/prepare/authentication" },
  { id: "settings",       label: "Settings",                   shortLabel: "Settings", route: "/app/prepare/settings"       },
  { id: "review",         label: "Review",                     shortLabel: "Review",   route: "/app/prepare/review"         },
  { id: "fields",         label: "Place Fields",               shortLabel: "Fields",   route: "/app/prepare/fields"         },
];

// ── Preparation step state ────────────────────────────────────────────────────

export type PreparationStepState =
  | "unavailable"          // prerequisites not met — cannot be accessed
  | "available"            // prerequisites met, not yet visited or saved
  | "current"              // the active step
  | "incomplete"           // visited but has missing required data
  | "complete"             // all required data present and valid
  | "complete-with-warning"// complete but has non-blocking warnings
  | "invalid"              // visited and has blocking errors
  | "blocked";             // explicitly blocked until a prior gate passes

// ── File models ───────────────────────────────────────────────────────────────

export type PrepFileState =
  | "ready"
  | "unsupported-type"
  | "empty-file"
  | "demonstration-size-limit"
  | "duplicate"
  | "unavailable"
  | "removed";

export const PREP_FILE_STATE_LABELS: Record<PrepFileState, string> = {
  "ready":                     "Ready",
  "unsupported-type":          "Unsupported File Type",
  "empty-file":                "Empty File",
  "demonstration-size-limit":  "File Too Large (Demonstration Limit)",
  "duplicate":                 "Duplicate File",
  "unavailable":               "File Unavailable",
  "removed":                   "Removed",
};

export interface PrepFile {
  id:            PrepFileId;
  fileName:      string;
  fileSizeBytes: number;
  mimeType:      string;
  fileState:     PrepFileState;
  order:         number;
  demoPageCount?: number; // fixture-only; never derived by parsing
}

// ── Transaction details draft ─────────────────────────────────────────────────

export interface TransactionDetailsDraft {
  title:       string;
  description: string;   // optional internal note; never exposed to participants
  folderId:    string | null;
  tagIds:      string[];
}

export const DEFAULT_TRANSACTION_DETAILS: TransactionDetailsDraft = {
  title:       "",
  description: "",
  folderId:    null,
  tagIds:      [],
};

// ── Participant roles (extended for preparation) ───────────────────────────────
// Adds reviewer and acknowledgment-recipient beyond the 4 base sent-transaction roles.
// These preparation roles map to base ParticipantRole when a transaction is finalized.

export type PrepParticipantRole =
  | "signer"
  | "approver"
  | "reviewer"
  | "acknowledgment-recipient"
  | "viewer"
  | "carbon-copy";

export const PREP_PARTICIPANT_ROLE_LABELS: Record<PrepParticipantRole, string> = {
  "signer":                    "Signer",
  "approver":                  "Approver",
  "reviewer":                  "Reviewer",
  "acknowledgment-recipient":  "Acknowledgment Recipient",
  "viewer":                    "Viewer",
  "carbon-copy":               "Copy Recipient",
};

export const PREP_PARTICIPANT_ROLE_DESCRIPTIONS: Record<PrepParticipantRole, string> = {
  "signer":                    "Must complete all required signature fields. Blocks completion until done.",
  "approver":                  "Must approve or reject before later participants in the workflow may proceed.",
  "reviewer":                  "Reviews the document before later signing or approval steps proceed.",
  "acknowledgment-recipient":  "Must acknowledge receipt or understanding where configured.",
  "viewer":                    "May view the document. Does not block completion.",
  "carbon-copy":               "Receives a copy of the completed document. Does not block completion.",
};

// Whether a role is a required blocking action (affects routing + review validation)
export const PREP_ROLE_IS_BLOCKING: Record<PrepParticipantRole, boolean> = {
  "signer":                    true,
  "approver":                  true,
  "reviewer":                  true,
  "acknowledgment-recipient":  true,
  "viewer":                    false,
  "carbon-copy":               false,
};

export const VALID_PREP_PARTICIPANT_ROLES: readonly PrepParticipantRole[] = [
  "signer", "approver", "reviewer", "acknowledgment-recipient", "viewer", "carbon-copy",
];

// ── Authentication method (preparation context) ───────────────────────────────
// Extends the base AuthMethod from models/index.ts with availability metadata.

export type PrepAuthMethodId =
  | "none"
  | "email-otp"
  | "sms-otp"
  | "knowledge-based"
  | "id-verification"
  | "account-signin";

export type PrepAuthAvailability =
  | "active"           // supported and available
  | "plan-dependent"   // may require a higher plan
  | "enterprise"       // enterprise only
  | "planned"          // not yet available
  | "unavailable";     // not supported in current config

export interface PrepAuthMethodConfig {
  id:           PrepAuthMethodId;
  label:        string;
  description:  string;
  availability: PrepAuthAvailability;
  requiresEmail: boolean;
  requiresPhone: boolean;
  privacyNote:  string;
  planNote?:    string;
}

export const PREP_AUTH_METHODS: PrepAuthMethodConfig[] = [
  {
    id:           "none",
    label:        "Secure Invitation Link",
    description:  "Each participant receives a unique invitation link. No additional authentication step is required.",
    availability: "active",
    requiresEmail: true,
    requiresPhone: false,
    privacyNote:  "Access is controlled by a unique link sent to the participant's email address.",
  },
  {
    id:           "email-otp",
    label:        "Email Code",
    description:  "After opening the invitation link, the participant must enter a one-time code sent to their email.",
    availability: "active",
    requiresEmail: true,
    requiresPhone: false,
    privacyNote:  "A temporary code is sent to the participant's email. No email content is stored in this demonstration.",
    planNote:     "Available on eligible LAGDA plans.",
  },
  {
    id:           "sms-otp",
    label:        "SMS Code",
    description:  "The participant must enter a one-time code sent by SMS. Requires a verified mobile number.",
    availability: "plan-dependent",
    requiresEmail: true,
    requiresPhone: true,
    privacyNote:  "A verified mobile number must be provided separately. SMS delivery is not available in this frontend demonstration.",
    planNote:     "Requires a mobile number collection step not yet available in this demonstration.",
  },
  {
    id:           "knowledge-based",
    label:        "Knowledge-Based Authentication",
    description:  "The participant answers knowledge-based questions to confirm their identity before proceeding.",
    availability: "enterprise",
    requiresEmail: true,
    requiresPhone: false,
    privacyNote:  "Knowledge-based questions are supplied by the issuing workspace. Not available in this frontend demonstration.",
    planNote:     "Enterprise feature — contact Sales for information.",
  },
  {
    id:           "id-verification",
    label:        "Identity Verification",
    description:  "The participant completes an identity verification process. This is separate from signature placement.",
    availability: "planned",
    requiresEmail: true,
    requiresPhone: false,
    privacyNote:  "Identity verification is a separate process and does not automatically establish the legal validity of the document.",
    planNote:     "Planned feature — not yet available in this demonstration.",
  },
  {
    id:           "account-signin",
    label:        "Account Sign-In",
    description:  "The participant must sign in to a LAGDA account matching their invitation email.",
    availability: "plan-dependent",
    requiresEmail: true,
    requiresPhone: false,
    privacyNote:  "Signing in does not automatically verify identity or establish legal capacity. Account creation is a separate flow.",
    planNote:     "Available on eligible LAGDA plans.",
  },
];

// ── Participant draft ─────────────────────────────────────────────────────────

export interface PrepParticipant {
  id:                  PrepPaxId;
  name:                string;
  email:               string;
  role:                PrepParticipantRole;
  organization:        string;
  isRequired:          boolean;
  routingGroupId:      PrepGroupId | null;
  authMethodOverride:  PrepAuthMethodId | null; // null = use default
}

export const EMPTY_PARTICIPANT: Omit<PrepParticipant, "id"> = {
  name:               "",
  email:              "",
  role:               "signer",
  organization:       "",
  isRequired:         true,
  routingGroupId:     null,
  authMethodOverride: null,
};

// ── Routing configuration ─────────────────────────────────────────────────────

export const ROUTING_MODE_DESCRIPTIONS: Record<RoutingMode, string> = {
  parallel:          "All participants in each routing group may act simultaneously, without waiting for one another.",
  sequential:        "Each routing step begins only after all required participants in the previous step complete their actions.",
  mixed:             "Multiple participants may act in parallel within ordered routing steps.",
  "approval-based":  "An Approver or Reviewer step must complete before later signing or acknowledgment steps begin.",
};

export type RoutingCompletionRule = "all" | "any";

export interface PrepRoutingGroup {
  id:                    PrepGroupId;
  stepNumber:            number;
  label:                 string;
  participantIds:        PrepPaxId[];
  requiredCompletionRule: RoutingCompletionRule;
}

export interface PrepRoutingConfig {
  mode:   RoutingMode;
  groups: PrepRoutingGroup[];
}

export const DEFAULT_ROUTING_CONFIG: PrepRoutingConfig = {
  mode:   "sequential",
  groups: [],
};

// ── Authentication configuration ──────────────────────────────────────────────

export interface PrepAuthConfig {
  defaultMethod:   PrepAuthMethodId;
  perParticipant:  Record<PrepPaxId, PrepAuthMethodId>;
}

export const DEFAULT_AUTH_CONFIG: PrepAuthConfig = {
  defaultMethod:  "none",
  perParticipant: {},
};

// ── Settings ──────────────────────────────────────────────────────────────────

export interface PrepInvitationSettings {
  subject:            string;
  message:            string;
  senderDisplayName:  string;
}

export interface PrepReminderSettings {
  enabled:            boolean;
  firstReminderDays:  number;
  repeatIntervalDays: number;
  maxReminders:       number | null;
}

export interface PrepExpirationSettings {
  enabled:   boolean;
  expiresAt: string | null;  // ISO date string or null
}

export interface PrepCompletionSettings {
  notifySenderOnComplete:              boolean;
  sendCompletionCopyToParticipants:    boolean;
  sendCompletionCopyToCCRecipients:    boolean;
  allowParticipantDownload:            boolean;
  createVerificationRecord:            boolean;
}

export interface PrepSettings {
  invitation:  PrepInvitationSettings;
  reminders:   PrepReminderSettings;
  expiration:  PrepExpirationSettings;
  completion:  PrepCompletionSettings;
}

export const DEFAULT_PREP_SETTINGS: PrepSettings = {
  invitation: {
    subject:           "Please review and complete: {title}",
    message:           "",
    senderDisplayName: "",
  },
  reminders: {
    enabled:            true,
    firstReminderDays:  3,
    repeatIntervalDays: 3,
    maxReminders:       null,
  },
  expiration: {
    enabled:   false,
    expiresAt: null,
  },
  completion: {
    notifySenderOnComplete:              true,
    sendCompletionCopyToParticipants:    true,
    sendCompletionCopyToCCRecipients:    true,
    allowParticipantDownload:            true,
    createVerificationRecord:            true,
  },
};

// ── Source context ────────────────────────────────────────────────────────────

export type PrepSource =
  | "new"
  | "template"
  | "dashboard"
  | "documents"
  | "transaction-draft"
  | "direct";

export interface PrepSourceContext {
  source:        PrepSource;
  templateId?:   string;
  transactionId?: string;
}

// ── Preparation draft (complete state object) ─────────────────────────────────

export interface PreparationDraft {
  id:            PrepDraftId;
  status:        PreparationDraftStatus;
  workspaceId:   string;
  createdAt:     string;
  updatedAt:     string;
  sourceContext: PrepSourceContext;
  files:         PrepFile[];
  details:       TransactionDetailsDraft;
  participants:  PrepParticipant[];
  routing:       PrepRoutingConfig;
  auth:          PrepAuthConfig;
  settings:      PrepSettings;
  demonstrationOnly: true;
}

// ── Validation ────────────────────────────────────────────────────────────────

export type PrepValidationSeverity = "error" | "warning";

export interface PrepValidationIssue {
  id:             string;
  stepId:         PreparationStepId;
  severity:       PrepValidationSeverity;
  code:           string;
  message:        string;
  field?:         string;
  participantId?: PrepPaxId;
  groupId?:       PrepGroupId;
}

export interface PrepValidationResult {
  isValid:                boolean;  // no blocking errors
  issues:                 PrepValidationIssue[];
  errors:                 PrepValidationIssue[];
  warnings:               PrepValidationIssue[];
  readyForFieldPlacement: boolean;
  stepValidity:           Record<PreparationStepId, boolean>;
}

// ── Resumable draft summary (for entry screen) ────────────────────────────────

export interface ResumableDraftSummary {
  id:            PrepDraftId;
  title:         string;          // transaction title or "Untitled Document"
  updatedAt:     string;
  status:        PreparationDraftStatus;
  fileCount:     number;
  participantCount: number;
  nextStep:      PreparationStepId;
  workspaceId:   string;
  demonstrationOnly: true;
}

// ── Preparation scenarios (for fixture selection) ─────────────────────────────

export type PreparationScenario =
  | "blank"
  | "single-signer"
  | "sequential-psa"
  | "parallel-acknowledgment"
  | "approval-then-signing"
  | "multi-file"
  | "template-based"
  | "invalid-draft"
  | "plan-restricted"
  | "permission-denied"
  | "partial-failure";

// ── Auth method availability helpers ─────────────────────────────────────────

export function getAuthMethodConfig(id: PrepAuthMethodId): PrepAuthMethodConfig {
  return PREP_AUTH_METHODS.find(m => m.id === id) ?? PREP_AUTH_METHODS[0]!;
}

export function isAuthMethodAvailableForParticipant(
  methodId: PrepAuthMethodId,
  participant: PrepParticipant,
): { available: boolean; reason?: string } {
  const method = getAuthMethodConfig(methodId);
  if (method.availability === "planned") {
    return { available: false, reason: "This authentication method is not yet available." };
  }
  if (method.availability === "enterprise") {
    return { available: false, reason: "This method requires an Enterprise plan." };
  }
  if (method.requiresPhone && !participant.email) {
    return { available: false, reason: "A mobile number collection step is not yet available in this demonstration." };
  }
  if (PREP_ROLE_IS_BLOCKING[participant.role] === false && methodId !== "none") {
    // Viewers and CCs don't need strong auth
    return { available: true };
  }
  return { available: true };
}
