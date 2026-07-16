// Workflow Automation typed models — Command 32.
// Rules, Policies, Simulations, Conflict Detection, Activity Center.
// All automation is frontend demonstration only. No real execution, scheduling, or delivery.
// No Burgundy (#67023B). No eNotary. No auto-signing, auto-auth, or permission bypass.
// All state is module-level in-memory (workflow-automation.service.ts).
// No localStorage / sessionStorage.

// ── Branded IDs ───────────────────────────────────────────────────────────────

export type AutoRuleId      = string & { readonly __brand: "AutoRuleId" };
export type AutoConditionId = string & { readonly __brand: "AutoConditionId" };
export type AutoActionId    = string & { readonly __brand: "AutoActionId" };
export type AutoPolicyId    = string & { readonly __brand: "AutoPolicyId" };
export type AutoConflictId  = string & { readonly __brand: "AutoConflictId" };
export type AutoSimId       = string & { readonly __brand: "AutoSimId" };
export type AutoActivityId  = string & { readonly __brand: "AutoActivityId" };

// ── Result type (mirrors OrgResult<T>) ────────────────────────────────────────

export type AutoError = {
  code: string;
  message: string;
};

export type AutoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AutoError };

// ── Trigger types ─────────────────────────────────────────────────────────────

export type AutoTriggerKind =
  | "transaction_created"
  | "transaction_sent"
  | "transaction_completed"
  | "transaction_voided"
  | "transaction_expired"
  | "participant_signed"
  | "participant_declined"
  | "participant_viewed"
  | "reminder_sent"
  | "template_used"
  | "document_uploaded"
  | "folder_assigned"
  | "tag_assigned";

export interface AutoTriggerConfig {
  kind: AutoTriggerKind;
  label: string;
  description: string;
  icon: string;
  availableConditionFields: AutoConditionFieldDef[];
}

export const AUTO_TRIGGER_CONFIGS: Record<AutoTriggerKind, AutoTriggerConfig> = {
  transaction_created: {
    kind: "transaction_created",
    label: "Transaction created",
    description: "Fires when a new transaction draft is created.",
    icon: "FilePlus",
    availableConditionFields: ["transaction_title", "transaction_type", "template_used", "participant_count", "sender_role"],
  },
  transaction_sent: {
    kind: "transaction_sent",
    label: "Transaction sent",
    description: "Fires when a transaction is sent to participants.",
    icon: "Send",
    availableConditionFields: ["transaction_title", "transaction_type", "template_used", "participant_count", "sender_role"],
  },
  transaction_completed: {
    kind: "transaction_completed",
    label: "Transaction completed",
    description: "Fires when all required participants have completed their actions.",
    icon: "CheckCircle",
    availableConditionFields: ["transaction_title", "transaction_type", "template_used", "participant_count", "sender_role", "completion_time_days"],
  },
  transaction_voided: {
    kind: "transaction_voided",
    label: "Transaction voided",
    description: "Fires when a transaction is voided by the sender or workspace admin.",
    icon: "XCircle",
    availableConditionFields: ["transaction_title", "transaction_type", "sender_role"],
  },
  transaction_expired: {
    kind: "transaction_expired",
    label: "Transaction expired",
    description: "Fires when a transaction passes its expiration date without completion.",
    icon: "Clock",
    availableConditionFields: ["transaction_title", "transaction_type", "template_used", "sender_role"],
  },
  participant_signed: {
    kind: "participant_signed",
    label: "Participant signed",
    description: "Fires when a participant completes their signing action.",
    icon: "PenLine",
    availableConditionFields: ["transaction_title", "participant_role", "auth_method_used"],
  },
  participant_declined: {
    kind: "participant_declined",
    label: "Participant declined",
    description: "Fires when a participant declines to sign.",
    icon: "ThumbsDown",
    availableConditionFields: ["transaction_title", "participant_role"],
  },
  participant_viewed: {
    kind: "participant_viewed",
    label: "Participant viewed document",
    description: "Fires when a participant opens their signing link.",
    icon: "Eye",
    availableConditionFields: ["transaction_title", "participant_role"],
  },
  reminder_sent: {
    kind: "reminder_sent",
    label: "Reminder sent",
    description: "Fires when an automatic reminder is dispatched to a participant.",
    icon: "Bell",
    availableConditionFields: ["transaction_title", "participant_role", "reminder_number"],
  },
  template_used: {
    kind: "template_used",
    label: "Template used",
    description: "Fires when a sender selects a template in the Prepare workflow.",
    icon: "LayoutTemplate",
    availableConditionFields: ["template_name", "sender_role"],
  },
  document_uploaded: {
    kind: "document_uploaded",
    label: "Document uploaded",
    description: "Fires when a file is added to a transaction draft.",
    icon: "Upload",
    availableConditionFields: ["transaction_title", "file_type", "sender_role"],
  },
  folder_assigned: {
    kind: "folder_assigned",
    label: "Folder assigned",
    description: "Fires when a document is assigned to a folder.",
    icon: "Folder",
    availableConditionFields: ["folder_name", "folder_scope"],
  },
  tag_assigned: {
    kind: "tag_assigned",
    label: "Tag assigned",
    description: "Fires when a tag is applied to a document.",
    icon: "Tag",
    availableConditionFields: ["tag_name"],
  },
};

// ── Condition system ──────────────────────────────────────────────────────────

export type AutoConditionFieldDef =
  | "transaction_title"
  | "transaction_type"
  | "template_used"
  | "template_name"
  | "participant_count"
  | "participant_role"
  | "auth_method_used"
  | "sender_role"
  | "completion_time_days"
  | "reminder_number"
  | "file_type"
  | "folder_name"
  | "folder_scope"
  | "tag_name";

export type AutoConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "greater_than"
  | "less_than"
  | "is_set"
  | "is_not_set"
  | "in_list";

export interface AutoCondition {
  id: AutoConditionId;
  field: AutoConditionFieldDef;
  operator: AutoConditionOperator;
  value: string | number | string[] | null;
  label?: string;
}

export type AutoConditionLogic = "all" | "any";

// ── Action system ─────────────────────────────────────────────────────────────

export type AutoActionKind =
  | "set_reminder_defaults"
  | "set_expiration_default"
  | "set_completion_defaults"
  | "assign_folder"
  | "assign_tag"
  | "set_invitation_subject"
  | "require_auth_method"
  | "flag_for_review"
  | "add_activity_note";

export type AutoActionStatus =
  | "available"
  | "unavailable"
  | "prohibited";

export interface AutoActionConfig {
  kind: AutoActionKind;
  label: string;
  description: string;
  icon: string;
  status: AutoActionStatus;
  unavailableReason?: string;
  prohibitedReason?: string;
  paramSchema: AutoActionParamSchema[];
}

export interface AutoActionParamSchema {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "folder_id" | "tag_id";
  required: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface AutoAction {
  id: AutoActionId;
  kind: AutoActionKind;
  params: Record<string, string | number | boolean | null>;
  label?: string;
}

export const AUTO_ACTION_CONFIGS: Record<AutoActionKind, AutoActionConfig> = {
  set_reminder_defaults: {
    kind: "set_reminder_defaults",
    label: "Set reminder defaults",
    description: "Pre-fill reminder settings (enabled, first-reminder delay, repeat interval) when a transaction is prepared.",
    icon: "Bell",
    status: "available",
    paramSchema: [
      { key: "enabled", label: "Enable reminders", type: "boolean", required: true },
      { key: "firstReminderDays", label: "First reminder after (days)", type: "number", required: true, min: 1, max: 30 },
      { key: "repeatIntervalDays", label: "Repeat every (days)", type: "number", required: true, min: 1, max: 30 },
    ],
  },
  set_expiration_default: {
    kind: "set_expiration_default",
    label: "Set expiration default",
    description: "Pre-fill the expiration offset (days from send) when a transaction is prepared.",
    icon: "CalendarX",
    status: "available",
    paramSchema: [
      { key: "enabled", label: "Enable expiration", type: "boolean", required: true },
      { key: "daysFromSend", label: "Expire after (days)", type: "number", required: true, min: 1, max: 365 },
    ],
  },
  set_completion_defaults: {
    kind: "set_completion_defaults",
    label: "Set completion behavior defaults",
    description: "Pre-fill completion settings (notify sender, send copies, allow download, create verification record).",
    icon: "CheckCircle",
    status: "available",
    paramSchema: [
      { key: "notifySenderOnComplete", label: "Notify sender on complete", type: "boolean", required: true },
      { key: "sendCompletionCopyToParticipants", label: "Send copy to signers", type: "boolean", required: true },
      { key: "sendCompletionCopyToCCRecipients", label: "Send copy to CC recipients", type: "boolean", required: true },
      { key: "allowParticipantDownload", label: "Allow participant download", type: "boolean", required: true },
      { key: "createVerificationRecord", label: "Create verification record", type: "boolean", required: true },
    ],
  },
  assign_folder: {
    kind: "assign_folder",
    label: "Assign to folder",
    description: "Projects that the completed document will be placed in a specified folder.",
    icon: "Folder",
    status: "available",
    paramSchema: [
      { key: "folderId", label: "Folder", type: "folder_id", required: true },
    ],
  },
  assign_tag: {
    kind: "assign_tag",
    label: "Apply tag",
    description: "Projects that a tag will be applied to the document upon the trigger event.",
    icon: "Tag",
    status: "available",
    paramSchema: [
      { key: "tagId", label: "Tag", type: "tag_id", required: true },
    ],
  },
  set_invitation_subject: {
    kind: "set_invitation_subject",
    label: "Set invitation subject",
    description: "Pre-fill the invitation email subject line for new transactions.",
    icon: "Mail",
    status: "available",
    paramSchema: [
      { key: "subject", label: "Subject", type: "text", required: true },
    ],
  },
  require_auth_method: {
    kind: "require_auth_method",
    label: "Require authentication method",
    description: "Projects a minimum authentication requirement for a participant role. Does not bypass or auto-apply authentication to live sessions.",
    icon: "ShieldCheck",
    status: "available",
    paramSchema: [
      { key: "participantRole", label: "Participant role", type: "select", required: true, options: [
        { value: "signer", label: "Signer" },
        { value: "approver", label: "Approver" },
        { value: "cc", label: "CC Recipient" },
      ]},
      { key: "minAuthMethod", label: "Minimum auth method", type: "select", required: true, options: [
        { value: "email_otp", label: "Email OTP" },
        { value: "sms_otp", label: "SMS OTP" },
        { value: "id_verification", label: "ID Verification" },
        { value: "biometric", label: "Biometric" },
      ]},
    ],
  },
  flag_for_review: {
    kind: "flag_for_review",
    label: "Flag for review",
    description: "Adds an activity note and projected flag to the transaction for admin review.",
    icon: "Flag",
    status: "available",
    paramSchema: [
      { key: "reason", label: "Reason", type: "text", required: true },
    ],
  },
  add_activity_note: {
    kind: "add_activity_note",
    label: "Add activity note",
    description: "Records a note in the automation activity log when this rule fires.",
    icon: "StickyNote",
    status: "available",
    paramSchema: [
      { key: "note", label: "Note", type: "text", required: true },
    ],
  },
};

// Prohibited actions — never surfaced in UI, listed here for reference
export const AUTO_PROHIBITED_ACTIONS = [
  "auto_sign_on_behalf_of_participant",
  "auto_approve_on_behalf_of_participant",
  "auto_complete_field_on_behalf_of_participant",
  "bypass_authentication",
  "change_participant_permissions",
  "route_bypass",
  "send_real_email",
  "send_real_sms",
  "send_real_webhook",
] as const;

// ── Rule status ───────────────────────────────────────────────────────────────

export type AutoRuleStatus =
  | "draft"
  | "active-demonstration"
  | "paused"
  | "archived"
  | "invalid"
  | "conflict-detected"
  | "unavailable";

export const AUTO_RULE_STATUS_LABELS: Record<AutoRuleStatus, string> = {
  "draft":                 "Draft",
  "active-demonstration":  "Active in Demonstration",
  "paused":                "Paused",
  "archived":              "Archived",
  "invalid":               "Invalid",
  "conflict-detected":     "Conflict Detected",
  "unavailable":           "Unavailable",
};

export const AUTO_RULE_STATUS_COLORS: Record<AutoRuleStatus, string> = {
  "draft":                "#94A3B8",
  "active-demonstration": "#0078D4",
  "paused":               "#D97706",
  "archived":             "#64748B",
  "invalid":              "#DC2626",
  "conflict-detected":    "#DC2626",
  "unavailable":          "#94A3B8",
};

// ── Priority ──────────────────────────────────────────────────────────────────

export type AutoRulePriority = "low" | "normal" | "high" | "critical";

export const AUTO_RULE_PRIORITY_LABELS: Record<AutoRulePriority, string> = {
  low:      "Low",
  normal:   "Normal",
  high:     "High",
  critical: "Critical",
};

export const AUTO_RULE_PRIORITY_COLORS: Record<AutoRulePriority, string> = {
  low:      "#94A3B8",
  normal:   "#0078D4",
  high:     "#D97706",
  critical: "#DC2626",
};

// ── Conflict behavior ─────────────────────────────────────────────────────────

export type AutoConflictBehavior =
  | "abort"
  | "proceed_anyway"
  | "use_highest_priority"
  | "merge_non_conflicting";

export const AUTO_CONFLICT_BEHAVIOR_LABELS: Record<AutoConflictBehavior, string> = {
  abort:                  "Abort — skip all conflicting actions",
  proceed_anyway:         "Proceed anyway — apply this rule's actions",
  use_highest_priority:   "Use highest-priority rule",
  merge_non_conflicting:  "Merge — apply non-conflicting actions from both rules",
};

// ── Plan / team scope ─────────────────────────────────────────────────────────

export type AutoRuleScope = "personal" | "workspace" | "enterprise";

// ── Core Rule entity ──────────────────────────────────────────────────────────

export interface AutoRule {
  id: AutoRuleId;
  name: string;
  description: string;
  status: AutoRuleStatus;
  trigger: AutoTriggerKind;
  conditionLogic: AutoConditionLogic;
  conditions: AutoCondition[];
  actions: AutoAction[];
  priority: AutoRulePriority;
  conflictBehavior: AutoConflictBehavior;
  scope: AutoRuleScope;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastFiredAt: string | null;
  firingCount: number;
  demonstrationOnly: true;
}

// ── Rule summary (for list views) ─────────────────────────────────────────────

export interface AutoRuleSummary {
  id: AutoRuleId;
  name: string;
  status: AutoRuleStatus;
  trigger: AutoTriggerKind;
  priority: AutoRulePriority;
  conditionCount: number;
  actionCount: number;
  lastFiredAt: string | null;
  firingCount: number;
  hasConflicts: boolean;
  demonstrationOnly: true;
}

// ── Policy families ───────────────────────────────────────────────────────────

export type AutoPolicyFamily =
  | "request_defaults"
  | "participant_security"
  | "reminder_direction"
  | "completion_behavior"
  | "organization";

export const AUTO_POLICY_FAMILY_LABELS: Record<AutoPolicyFamily, string> = {
  request_defaults:      "Request Defaults",
  participant_security:  "Participant Security",
  reminder_direction:    "Reminder Direction",
  completion_behavior:   "Completion Behavior",
  organization:          "Organization",
};

export const AUTO_POLICY_FAMILY_ICONS: Record<AutoPolicyFamily, string> = {
  request_defaults:      "FileText",
  participant_security:  "ShieldCheck",
  reminder_direction:    "Bell",
  completion_behavior:   "CheckCircle",
  organization:          "Folder",
};

export const AUTO_POLICY_FAMILY_DESCRIPTIONS: Record<AutoPolicyFamily, string> = {
  request_defaults:     "Default invitation subject, message, and sender display name applied when creating new transactions.",
  participant_security: "Minimum authentication method recommendations per participant role.",
  reminder_direction:   "Default reminder settings (enabled, first reminder delay, repeat interval) pre-filled in the Prepare workflow.",
  completion_behavior:  "Default completion settings (notify sender, send copies, allow download, create verification record).",
  organization:         "Default folder and tag assignments projected for completed documents.",
};

export type AutoPolicyStatus = "active" | "inactive" | "conflict-detected";

export const AUTO_POLICY_STATUS_LABELS: Record<AutoPolicyStatus, string> = {
  "active":            "Active",
  "inactive":          "Inactive",
  "conflict-detected": "Conflict Detected",
};

export interface AutoPolicy {
  id: AutoPolicyId;
  family: AutoPolicyFamily;
  name: string;
  description: string;
  status: AutoPolicyStatus;
  settings: Record<string, string | number | boolean | null>;
  scope: AutoRuleScope;
  createdAt: string;
  updatedAt: string;
  demonstrationOnly: true;
}

// ── Conflict detection ────────────────────────────────────────────────────────

export type AutoConflictSeverity = "info" | "warning" | "error";

export type AutoConflictKind =
  | "action_type_collision"
  | "parameter_value_collision"
  | "trigger_overlap"
  | "priority_tie"
  | "policy_rule_conflict";

export const AUTO_CONFLICT_KIND_LABELS: Record<AutoConflictKind, string> = {
  action_type_collision:     "Action type collision",
  parameter_value_collision: "Parameter value collision",
  trigger_overlap:           "Trigger overlap",
  priority_tie:              "Priority tie",
  policy_rule_conflict:      "Policy–rule conflict",
};

export interface AutoConflict {
  id: AutoConflictId;
  severity: AutoConflictSeverity;
  kind: AutoConflictKind;
  description: string;
  involvedRuleIds: AutoRuleId[];
  involvedPolicyIds: AutoPolicyId[];
  detectedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  demonstrationOnly: true;
}

export type AutoConflictResolutionStrategy =
  | "disable_lower_priority"
  | "merge_non_conflicting"
  | "manual_edit_required"
  | "acknowledge_and_proceed";

// ── Simulation ────────────────────────────────────────────────────────────────

export type AutoSimTriggerContext = {
  triggerKind: AutoTriggerKind;
  transactionTitle?: string;
  templateName?: string;
  participantCount?: number;
  participantRole?: string;
  authMethodUsed?: string;
  senderRole?: string;
  folderName?: string;
  tagName?: string;
};

export type AutoSimProjectedChange = {
  field: string;
  originalValue: string | number | boolean | null;
  projectedValue: string | number | boolean | null;
  source: "rule" | "policy";
  sourceId: AutoRuleId | AutoPolicyId;
  sourceName: string;
  conflictsWith?: AutoRuleId | AutoPolicyId;
};

export interface AutoSimulation {
  id: AutoSimId;
  triggerContext: AutoSimTriggerContext;
  matchedRuleIds: AutoRuleId[];
  matchedRuleNames: string[];
  skippedRuleIds: AutoRuleId[];
  skippedReasons: Record<string, string>;
  projectedChanges: AutoSimProjectedChange[];
  conflictsDetected: AutoConflictId[];
  resolvedBy: AutoConflictBehavior | null;
  projectedNotifications: string[];
  projectedActivityNotes: string[];
  createdAt: string;
  demonstrationOnly: true;
}

// ── Activity ──────────────────────────────────────────────────────────────────

export type AutoActivityKind =
  | "rule_created"
  | "rule_updated"
  | "rule_activated"
  | "rule_paused"
  | "rule_archived"
  | "rule_restored"
  | "rule_duplicated"
  | "rule_removed"
  | "rule_fired_simulated"
  | "policy_updated"
  | "conflict_detected"
  | "conflict_resolved"
  | "simulation_run"
  | "settings_changed";

export const AUTO_ACTIVITY_KIND_LABELS: Record<AutoActivityKind, string> = {
  rule_created:          "Rule created",
  rule_updated:          "Rule updated",
  rule_activated:        "Rule activated",
  rule_paused:           "Rule paused",
  rule_archived:         "Rule archived",
  rule_restored:         "Rule restored",
  rule_duplicated:       "Rule duplicated",
  rule_removed:          "Rule removed",
  rule_fired_simulated:  "Rule fired (simulated)",
  policy_updated:        "Policy updated",
  conflict_detected:     "Conflict detected",
  conflict_resolved:     "Conflict resolved",
  simulation_run:        "Simulation run",
  settings_changed:      "Settings changed",
};

export interface AutoActivity {
  id: AutoActivityId;
  kind: AutoActivityKind;
  title: string;
  detail: string;
  relatedRuleId?: AutoRuleId;
  relatedPolicyId?: AutoPolicyId;
  relatedConflictId?: AutoConflictId;
  relatedSimId?: AutoSimId;
  performedBy: string;
  occurredAt: string;
  demonstrationOnly: true;
}

// ── Validation ────────────────────────────────────────────────────────────────

export type AutoValidationSeverity = "error" | "warning";

export interface AutoValidationIssue {
  id: string;
  field: string;
  severity: AutoValidationSeverity;
  code: string;
  message: string;
}

export interface AutoValidationResult {
  valid: boolean;
  issues: AutoValidationIssue[];
}

// ── Filter / pagination ───────────────────────────────────────────────────────

export interface AutoRuleListFilter {
  status?: AutoRuleStatus;
  trigger?: AutoTriggerKind;
  priority?: AutoRulePriority;
  query?: string;
}

export interface AutoActivityListFilter {
  kind?: AutoActivityKind;
  relatedRuleId?: AutoRuleId;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface AutoConflictListFilter {
  severity?: AutoConflictSeverity;
  resolved?: boolean;
}

// ── Aggregated overview stats ─────────────────────────────────────────────────

export interface AutoOverviewStats {
  totalRules: number;
  activeRules: number;
  draftRules: number;
  pausedRules: number;
  archivedRules: number;
  conflictCount: number;
  activePolicies: number;
  recentActivity: AutoActivity[];
  demonstrationOnly: true;
}
