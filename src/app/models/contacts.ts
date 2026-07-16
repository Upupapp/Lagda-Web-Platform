// Contact domain models for the LAGDA Contacts and Participant Directory.
// Frontend-only — no backend persistence, no real sync, no real identity verification.
// All values are for signing workflow participant management only.
// No government IDs, biometrics, passwords, OTPs, or notarial credentials collected.

import type { PrepParticipantRole } from "./prepare";

// ── Branded ID types ──────────────────────────────────────────────────────────

export type ContactId      = string & { readonly __brand: "ContactId" };
export type ContactTagId   = string & { readonly __brand: "ContactTagId" };
export type ContactGroupId = string & { readonly __brand: "ContactGroupId" };

// ── Enumerations ──────────────────────────────────────────────────────────────

export type ContactStatus =
  | "active"
  | "archived"
  | "invalid"
  | "restricted";

export type ContactScope =
  | "personal"
  | "workspace";

export type ContactSource =
  | "manually-created"
  | "added-from-participant"
  | "fictional-import-review"
  | "workspace-directory-reference"
  | "fixture";

export type ContactView =
  | "all"
  | "workspace"
  | "personal"
  | "recent"
  | "frequent"
  | "duplicates"
  | "archived";

export type ContactSortField =
  | "name"
  | "organization"
  | "updatedAt"
  | "lastUsedAt"
  | "usageCount";

export type ContactActionId =
  | "view"
  | "use-as-participant"
  | "edit"
  | "add-tag"
  | "remove-tag"
  | "add-to-group"
  | "remove-from-group"
  | "archive"
  | "restore"
  | "review-duplicate"
  | "merge-demonstration"
  | "add-participant-as-contact"
  | "import-readiness";

// ── Constants ─────────────────────────────────────────────────────────────────

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  active:     "Active",
  archived:   "Archived",
  invalid:    "Invalid",
  restricted: "Restricted",
};

export const CONTACT_SCOPE_LABELS: Record<ContactScope, string> = {
  personal:  "Personal",
  workspace: "Workspace",
};

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  "manually-created":              "Added manually",
  "added-from-participant":        "Added from participant",
  "fictional-import-review":       "Import preview",
  "workspace-directory-reference": "Workspace directory",
  "fixture":                       "Demonstration fixture",
};

export const CONTACT_VIEW_LABELS: Record<ContactView, string> = {
  all:        "All Contacts",
  workspace:  "Workspace",
  personal:   "My Contacts",
  recent:     "Recently Used",
  frequent:   "Frequently Used",
  duplicates: "Potential Duplicates",
  archived:   "Archived",
};

export const CONTACT_VIEWS: ContactView[] = ["all", "workspace", "personal", "recent", "frequent", "duplicates", "archived"];

// ── Tags ──────────────────────────────────────────────────────────────────────

export interface ContactTag {
  id:    ContactTagId;
  label: string;
  color: string; // hex accent, never Burgundy
}

export const SYSTEM_CONTACT_TAGS: ContactTag[] = [
  { id: "tag-client"    as ContactTagId, label: "Client",          color: "#0078D4" },
  { id: "tag-vendor"    as ContactTagId, label: "Vendor",          color: "#6C4BA8" },
  { id: "tag-internal"  as ContactTagId, label: "Internal",        color: "#2E7D32" },
  { id: "tag-legal"     as ContactTagId, label: "Legal",           color: "#1A6B9E" },
  { id: "tag-hr"        as ContactTagId, label: "HR",              color: "#C9960C" },
  { id: "tag-finance"   as ContactTagId, label: "Finance",         color: "#5F7D8E" },
  { id: "tag-approver"  as ContactTagId, label: "Approver",        color: "#856404" },
  { id: "tag-reviewer"  as ContactTagId, label: "Reviewer",        color: "#9C3B3B" },
  { id: "tag-signer"    as ContactTagId, label: "Signer",          color: "#06796C" },
  { id: "tag-ack"       as ContactTagId, label: "Acknowledgment",  color: "#495E74" },
  { id: "tag-procurement" as ContactTagId, label: "Procurement",   color: "#4A5568" },
];

export function getContactTagById(id: ContactTagId): ContactTag | undefined {
  return SYSTEM_CONTACT_TAGS.find(t => t.id === id);
}

// ── Core contact record ───────────────────────────────────────────────────────

export interface Contact {
  id:           ContactId;
  status:       ContactStatus;
  scope:        ContactScope;
  source:       ContactSource;
  workspaceId:  string;
  ownerId:      string; // fictional user ID

  // Identity (no verification claims, no auth claims, no government IDs)
  name:         string;
  email:        string;
  phone?:       string;   // optional, never implies SMS auth capability
  organization?: string;
  title?:       string;

  // Organization
  tagIds:       ContactTagId[];
  groupIds:     ContactGroupId[];
  note?:        string; // internal note, never stored in real persistence

  // Lifecycle
  createdAt:    string;
  updatedAt:    string;

  // Usage (fictional/deterministic)
  lastUsedAt?:  string;
  usageCount:   number;

  // Traceability
  sourceParticipantId?: string; // from which PrepParticipant was this derived
  demonstrationOnly:    boolean;
}

// ── List item (lighter) ───────────────────────────────────────────────────────

export interface ContactListItem {
  id:           ContactId;
  status:       ContactStatus;
  scope:        ContactScope;
  name:         string;
  email:        string;
  phone?:       string;
  organization?: string;
  title?:       string;
  tagIds:       ContactTagId[];
  groupIds:     ContactGroupId[];
  lastUsedAt?:  string;
  usageCount:   number;
  updatedAt:    string;
  workspaceId:  string;
  demonstrationOnly: boolean;
}

// ── Contact Group ─────────────────────────────────────────────────────────────

export interface ContactGroup {
  id:          ContactGroupId;
  name:        string;
  description: string;
  scope:       ContactScope;
  workspaceId: string;
  contactIds:  ContactId[];
  status:      "active" | "archived";
  createdAt:   string;
  updatedAt:   string;
  demonstrationOnly: boolean;
}

export interface ContactGroupSummary {
  id:           ContactGroupId;
  name:         string;
  description?: string;
  scope:        ContactScope;
  contactCount: number;
  memberCount:  number; // alias for contactCount — both are valid in UI code
  status:       "active" | "archived";
  updatedAt:    string;
}

// ── Queries and filtering ─────────────────────────────────────────────────────

export interface ContactListQuery {
  view:        ContactView;
  search:      string;
  scopeFilter: ContactScope | "all";
  statusFilter: ContactStatus | "all";
  tagFilter:   ContactTagId[];
  groupFilter: ContactGroupId[];
  sort:        ContactSortField;
  direction:   "asc" | "desc";
  page:        number;
  perPage:     number;
}

export const DEFAULT_CONTACT_QUERY: ContactListQuery = {
  view:         "all",
  search:       "",
  scopeFilter:  "all",
  statusFilter: "all",
  tagFilter:    [],
  groupFilter:  [],
  sort:         "updatedAt",
  direction:    "desc",
  page:         1,
  perPage:      20,
};

export interface ContactListResult {
  items:        ContactListItem[];
  total:        number;
  page:         number;
  perPage:      number;
  hasNextPage:  boolean;
  hasPrevPage:  boolean;
  viewCounts:   Record<ContactView, number>;
}

// ── Action availability ───────────────────────────────────────────────────────

export interface ContactActionAvailability {
  action:   ContactActionId;
  enabled:  boolean;
  reason?:  string;
}

// ── Validation ────────────────────────────────────────────────────────────────

export type ContactValidationSeverity = "error" | "warning" | "info";

export interface ContactValidationIssue {
  field:    string;
  severity: ContactValidationSeverity;
  message:  string;
}

export interface ContactValidationResult {
  valid:  boolean;
  issues: ContactValidationIssue[];
}

// ── Duplicate detection ───────────────────────────────────────────────────────

export type ContactDuplicateReason =
  | "exact-email-match"
  | "case-insensitive-email-match"
  | "same-name-same-org"
  | "same-name-similar-email-domain"
  | "similar-name-same-email";

export interface ContactDuplicateCandidate {
  existingContactId: ContactId;
  existingName:      string;
  existingEmail:     string;
  existingOrg?:      string;
  existingScope:     ContactScope;
  reasons:           ContactDuplicateReason[];
  severity:          "high" | "medium" | "low";
}

export interface ContactMergePreview {
  primaryId:     ContactId;
  secondaryId:   ContactId;
  resolvedName:  string;
  resolvedEmail: string;
  resolvedPhone?: string;
  resolvedOrg?:  string;
  resolvedTitle?: string;
  mergedTagIds:  ContactTagId[];
  mergedGroupIds: ContactGroupId[];
  demonstrationOnly: boolean;
}

// ── Create / update inputs ────────────────────────────────────────────────────

export interface ContactCreateInput {
  name:         string;
  email:        string;
  phone?:       string;
  organization?: string;
  title?:       string;
  scope:        ContactScope;
  tagIds:       ContactTagId[];
  groupIds:     ContactGroupId[];
  note?:        string;
}

export interface ContactUpdateInput extends Partial<ContactCreateInput> {
  // all fields optional
}

// ── Contact picker ────────────────────────────────────────────────────────────

export type ContactSelectionContext =
  | "prepare-participant"
  | "template-role-mapping"
  | "group-membership"
  | "general";

export interface ContactPickerResult {
  contactId?:       ContactId;
  name:             string;
  email:            string;
  phone?:           string;
  organization?:    string;
  title?:           string;
  scope?:           ContactScope;
  source:           "selected-contact" | "new-contact" | "manual-entry";
  createdNewContact: boolean;
  usedWithoutSaving: boolean;
  suggestedRole?:   PrepParticipantRole;
}

// ── Usage summary ─────────────────────────────────────────────────────────────

export interface ContactParticipantRoleUsage {
  role:             PrepParticipantRole;
  count:            number;
  lastUsedAt?:      string;
  sampleTransactionTitle?: string;
}

export interface ContactUsageSummary {
  contactId:        ContactId;
  totalTransactions: number;
  totalTemplates:   number;
  totalDrafts:      number;
  roleHistory:      ContactParticipantRoleUsage[];
  mostFrequentRole?: PrepParticipantRole;
  lastUsedAt?:      string;
  demonstrationOnly: boolean;
}

// ── Import preview ────────────────────────────────────────────────────────────

export type ContactImportRowStatus =
  | "valid-new"
  | "duplicate"
  | "invalid-email"
  | "missing-name"
  | "invalid-scope"
  | "unknown-tag"
  | "excluded";

export const CONTACT_IMPORT_ROW_STATUS_LABELS: Record<string, string> = {
  "valid-new":        "Ready",
  "duplicate":        "Possible Duplicate",
  "invalid-email":    "Invalid Email",
  "missing-name":     "Missing Name",
  "invalid-scope":    "Invalid Scope",
  "unknown-tag":      "Unknown Tag",
  "excluded":         "Excluded",
  "duplicate_override": "Import Anyway",
};

export interface ContactImportIssue {
  field:   string;
  message: string;
}

export interface ContactImportRow {
  rowNumber:     number;
  name:          string;
  email:         string;
  organization?: string;
  phone?:        string;
  title?:        string;
  scope?:        string;
  rawTags?:      string;
  status:        ContactImportRowStatus;
  issues:        ContactImportIssue[];
  proposedAction: "include" | "exclude" | "use-existing" | "review";
  matchingContactId?: ContactId;
}

export interface ContactImportPreview {
  rows:               ContactImportRow[];
  validCount:         number;
  duplicateCount:     number;
  invalidCount:       number;
  demonstrationOnly:  boolean;
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

export type ContactScenario =
  | "standard-workspace"
  | "new-workspace"
  | "personal-only"
  | "contact-manager"
  | "read-only-viewer"
  | "invalid-data"
  | "partial-failure";

export const CONTACT_SCENARIOS: Record<ContactScenario, { label: string; description: string }> = {
  "standard-workspace": { label: "Standard Workspace",   description: "Personal and workspace contacts, groups, tags, duplicates, archived." },
  "new-workspace":      { label: "New Workspace",        description: "No contacts yet. Empty states." },
  "personal-only":      { label: "Personal Only",        description: "Personal contacts only, no workspace management." },
  "contact-manager":    { label: "Contact Manager",      description: "Create, edit, organize, archive, review duplicates." },
  "read-only-viewer":   { label: "Read-Only Viewer",     description: "View permitted summaries, no mutations." },
  "invalid-data":       { label: "Invalid Contact Data", description: "Missing name, invalid email, duplicate email." },
  "partial-failure":    { label: "Partial Failure",      description: "Contacts load, usage/group data fails." },
};
