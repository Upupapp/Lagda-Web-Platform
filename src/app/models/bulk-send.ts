// Bulk Send domain models — Command 33.
//
// SCOPE: prepare ONE approved Template against MANY recipient rows, validate the
// mappings, and create deterministic frontend Draft Projections.
//
// Bulk Send introduces NO second role model, NO second variable model, and NO second
// participant model. It supplies only the BINDING layer plus the row/batch lifecycle:
//
//   BulkSendRoleMapping      : sourceColumnId -> TemplateRolePlaceholderId
//   BulkSendVariableMapping  : sourceColumnId -> TemplateVariable.internalKey
//
//   per row  ->  TemplateRoleMapping[] + TemplateVariableValues   (EXISTING types)
//                identical to what UseTemplatePage produces for a single document
//
// Nothing here delivers, sends, signs, consents, authenticates, or persists anything.
// Burgundy (#67023B) is eNotary-only and never appears in this feature.

import type {
  DocumentTemplateId,
  TemplateRolePlaceholderId,
  TemplateVariableId,
  TemplateVariableType,
  TemplateRoleMapping,
  TemplateVariableValues,
} from "./templates";
import type { PrepParticipantRole, PrepAuthMethodId, RoutingMode } from "./prepare";

// ── Branded identity types ────────────────────────────────────────────────────

export type BulkSendBatchId              = string & { readonly __brand: "BulkSendBatchId" };
export type BulkSendRecipientRowId       = string & { readonly __brand: "BulkSendRecipientRowId" };
export type BulkSendSourceColumnId       = string & { readonly __brand: "BulkSendSourceColumnId" };
export type BulkSendRoleMappingId        = string & { readonly __brand: "BulkSendRoleMappingId" };
export type BulkSendVariableMappingId    = string & { readonly __brand: "BulkSendVariableMappingId" };
export type BulkSendProjectionId         = string & { readonly __brand: "BulkSendProjectionId" };
export type BulkSendSavedConfigurationId = string & { readonly __brand: "BulkSendSavedConfigurationId" };
export type BulkSendRecipientGroupId     = string & { readonly __brand: "BulkSendRecipientGroupId" };

export function bulkSendBatchId(s: string): BulkSendBatchId { return s as BulkSendBatchId; }
export function bulkSendRowId(s: string): BulkSendRecipientRowId { return s as BulkSendRecipientRowId; }
export function bulkSendColumnId(s: string): BulkSendSourceColumnId { return s as BulkSendSourceColumnId; }
export function bulkSendProjectionId(s: string): BulkSendProjectionId { return s as BulkSendProjectionId; }
export function bulkSendConfigId(s: string): BulkSendSavedConfigurationId {
  return s as BulkSendSavedConfigurationId;
}

/** Opaque-ID shape guard applied to every route and query value before use. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export function isSafeBulkSendId(v: unknown): v is string {
  return typeof v === "string" && ID_PATTERN.test(v);
}

// ── Limits ────────────────────────────────────────────────────────────────────

export const BULK_SEND_MAX_ROWS              = 500;   // frontend demonstration ceiling
export const BULK_SEND_MAX_CSV_BYTES         = 512_000; // 500 KB local preview limit
export const BULK_SEND_MAX_PREVIEW_ROWS      = 25;    // rows shown in the import preview
export const BULK_SEND_MAX_COLUMNS           = 40;
export const BULK_SEND_BATCH_NAME_MAX        = 120;
export const BULK_SEND_CONFIG_NAME_MAX       = 120;
export const BULK_SEND_CELL_MAX              = 500;
export const BULK_SEND_ROWS_PER_PAGE         = 25;

/**
 * Plain-text normalisation for every user-authored and imported string.
 * Strips control characters, collapses whitespace, enforces a length cap.
 * No HTML is ever accepted, stored, or rendered as markup.
 */
export function normalizeBulkSendText(input: string, maxLength: number): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

// ── Batch status ──────────────────────────────────────────────────────────────
// "Sent", "Delivered", "Processing", and "Queued" are deliberately absent.

export type BulkSendBatchStatus =
  | "draft"
  | "recipients-added"
  | "mapping-required"
  | "validation-required"
  | "needs-review"
  | "ready-in-demonstration"
  | "draft-projections-created"
  | "partially-projected"
  | "archived"
  | "invalid"
  | "unavailable";

export const BULK_SEND_BATCH_STATUS_LABELS: Record<BulkSendBatchStatus, string> = {
  "draft":                     "Draft",
  "recipients-added":          "Recipients Added",
  "mapping-required":          "Mapping Required",
  "validation-required":       "Validation Required",
  "needs-review":              "Needs Review",
  "ready-in-demonstration":    "Ready in Demonstration",
  "draft-projections-created": "Draft Projections Created",
  "partially-projected":       "Partially Projected",
  "archived":                  "Archived",
  "invalid":                   "Invalid",
  "unavailable":               "Unavailable",
};

export const BULK_SEND_BATCH_STATUS_DESCRIPTIONS: Record<BulkSendBatchStatus, string> = {
  "draft":                     "Batch setup has started.",
  "recipients-added":          "Recipient rows exist but may not be mapped or validated.",
  "mapping-required":          "One or more required columns are not mapped.",
  "validation-required":       "Mappings exist but rows require validation.",
  "needs-review":              "Warnings, exclusions, or restrictions require review.",
  "ready-in-demonstration":    "Eligible rows can create frontend Draft Projections after explicit confirmation.",
  "draft-projections-created": "Frontend Draft Projections were created for eligible rows.",
  "partially-projected":       "Some eligible rows created Draft Projections while others remained excluded, restricted, or invalid.",
  "archived":                  "The batch is retained for frontend reference.",
  "invalid":                   "The batch contains blocking configuration errors.",
  "unavailable":               "The batch depends on restricted or unavailable references.",
};

export const VALID_BULK_SEND_BATCH_STATUSES: readonly BulkSendBatchStatus[] = [
  "draft", "recipients-added", "mapping-required", "validation-required", "needs-review",
  "ready-in-demonstration", "draft-projections-created", "partially-projected",
  "archived", "invalid", "unavailable",
];

export const TERMINAL_BATCH_STATUSES: readonly BulkSendBatchStatus[] = [
  "draft-projections-created", "partially-projected", "archived",
];

// ── Recipient row status ──────────────────────────────────────────────────────
// Lifecycle status. Kept SEPARATE from validation severity.

export type BulkSendRecipientRowStatus =
  | "ready-in-demonstration"
  | "warning"
  | "incomplete"
  | "duplicate"
  | "restricted"
  | "excluded"
  | "invalid-mapping"
  | "unavailable"
  | "draft-projection-created"
  | "projection-failed-demonstration";

export const BULK_SEND_ROW_STATUS_LABELS: Record<BulkSendRecipientRowStatus, string> = {
  "ready-in-demonstration":          "Ready in Demonstration",
  "warning":                         "Warning",
  "incomplete":                      "Incomplete",
  "duplicate":                       "Duplicate",
  "restricted":                      "Restricted",
  "excluded":                        "Excluded",
  "invalid-mapping":                 "Invalid Mapping",
  "unavailable":                     "Unavailable",
  "draft-projection-created":        "Draft Projection Created",
  "projection-failed-demonstration": "Projection Failed in Demonstration",
};

export const VALID_ROW_STATUSES: readonly BulkSendRecipientRowStatus[] = [
  "ready-in-demonstration", "warning", "incomplete", "duplicate", "restricted",
  "excluded", "invalid-mapping", "unavailable", "draft-projection-created",
  "projection-failed-demonstration",
];

/** Row statuses that may create a Draft Projection. */
export const PROJECTABLE_ROW_STATUSES: readonly BulkSendRecipientRowStatus[] = [
  "ready-in-demonstration", "warning",
];

// ── Recipient sources ─────────────────────────────────────────────────────────

export type BulkSendRecipientRowSource =
  | "contact"
  | "contact-group"
  | "structured-paste"
  | "local-csv-preview"
  | "deterministic-fixture";

export const BULK_SEND_SOURCE_LABELS: Record<BulkSendRecipientRowSource, string> = {
  "contact":               "Contact",
  "contact-group":         "Contact Group",
  "structured-paste":      "Pasted Rows",
  "local-csv-preview":     "Local CSV Preview",
  "deterministic-fixture": "Demonstration Dataset",
};

export const BULK_SEND_SOURCE_PRIVACY: Record<BulkSendRecipientRowSource, string> = {
  "contact":               "Reads permitted Contacts from your Workspace. Nothing is copied outside this session.",
  "contact-group":         "Reads permitted Contact Groups. Group membership never grants document access.",
  "structured-paste":      "Pasted text is parsed in memory only. It is never uploaded, persisted, or logged.",
  "local-csv-preview":     "The selected file is previewed locally in this frontend session. It is not uploaded or persisted.",
  "deterministic-fixture": "Fictional demonstration rows. No real person is represented.",
};

// ── Source schema ─────────────────────────────────────────────────────────────

export interface BulkSendSourceColumn {
  id:          BulkSendSourceColumnId;
  /** Header text as it appeared in the source, normalised to plain text. */
  header:      string;
  /** Lower-cased, punctuation-stripped header used for deterministic suggestions. */
  normalizedHeader: string;
  index:       number;
  /** A few safe sample values for the mapping UI. Never the full column. */
  sampleValues: string[];
  /** True when the source produced two columns with the same header. */
  duplicateHeader: boolean;
}

export interface BulkSendSourceSchema {
  columns:      BulkSendSourceColumn[];
  rowCount:     number;
  source:       BulkSendRecipientRowSource;
  /** Populated only for local CSV preview; never the file contents. */
  fileNameDirection: string | null;
  fileSizeBytes:     number | null;
  detectedDelimiter: "," | "\t" | ";" | "|" | null;
  headerDetected:    boolean;
  parseWarnings:     string[];
}

// ── Recipient row ─────────────────────────────────────────────────────────────

export type BulkSendRecipientRowValue = string;

export interface BulkSendRecipientRow {
  id:        BulkSendRecipientRowId;
  batchId:   BulkSendBatchId;
  /** 1-based position as presented to the user. */
  rowNumber: number;
  source:    BulkSendRecipientRowSource;
  /** Set when the row originated from a Contact or Contact Group. */
  contactId:      string | null;
  contactGroupId: string | null;

  /** Raw cell values keyed by source column ID. Plain text only, already neutralised. */
  values: Record<string, BulkSendRecipientRowValue>;

  /**
   * The values as they first arrived, kept so the grid can show "changed from".
   * Never re-imported and never sent anywhere.
   */
  originalValues: Record<string, BulkSendRecipientRowValue>;

  status:     BulkSendRecipientRowStatus;
  excluded:   boolean;
  exclusionReason: string | null;
  /** Set once a Draft Projection has been created for this row. */
  projectionId: BulkSendProjectionId | null;
  /** Populated by the duplicate detector. */
  duplicateGroupKey: string | null;
  editedInSession: boolean;
}

export interface BulkSendRecipientGroup {
  id:        BulkSendRecipientGroupId;
  label:     string;
  /** Permission-filtered count. Never exposes inaccessible member names. */
  accessibleMemberCount: number;
  restrictedMemberCount: number;
}

// ── Mapping ───────────────────────────────────────────────────────────────────

export type BulkSendMappingConfidence = "exact-header-match" | "known-alias" | "requires-review";

export const BULK_SEND_CONFIDENCE_LABELS: Record<BulkSendMappingConfidence, string> = {
  "exact-header-match": "Exact Header Match",
  "known-alias":        "Known Alias",
  "requires-review":    "Requires Review",
};

/** Which recipient attribute a mapped column supplies for a participant placeholder. */
export type BulkSendRoleField = "displayName" | "email" | "organization";

export const BULK_SEND_ROLE_FIELD_LABELS: Record<BulkSendRoleField, string> = {
  displayName:  "Recipient display name",
  email:        "Recipient email direction",
  organization: "Recipient organization",
};

export const BULK_SEND_REQUIRED_ROLE_FIELDS: readonly BulkSendRoleField[] = ["displayName", "email"];

export interface BulkSendRoleMapping {
  id:            BulkSendRoleMappingId;
  /** Template placeholder this binding fills. Always an approved Template role. */
  placeholderId: TemplateRolePlaceholderId;
  placeholderLabel: string;
  role:          PrepParticipantRole;
  required:      boolean;
  /** Column bound to each recipient attribute. Null = unmapped. */
  columnByField: Record<BulkSendRoleField, BulkSendSourceColumnId | null>;
  /** Authentication direction applied to this placeholder for every row. */
  authMethod:    PrepAuthMethodId;
  confidence:    Record<BulkSendRoleField, BulkSendMappingConfidence | null>;
}

export interface BulkSendVariableMapping {
  id:          BulkSendVariableMappingId;
  variableId:  TemplateVariableId;
  /** Template variable internalKey — the {{token}} target. */
  internalKey: string;
  label:       string;
  type:        TemplateVariableType;
  required:    boolean;
  /** Bound source column, or null when using a constant / left unmapped. */
  columnId:    BulkSendSourceColumnId | null;
  /** Constant applied to every row when no column is bound. */
  constantValue: string | null;
  confidence:  BulkSendMappingConfidence | null;
}

export interface BulkSendMappedValue {
  target: string;
  value:  string;
  sourceColumnId: BulkSendSourceColumnId | null;
  fromConstant: boolean;
}

// ── Validation ────────────────────────────────────────────────────────────────

export type BulkSendValidationSeverity = "blocking" | "warning" | "advisory";

export type BulkSendValidationIssueCode =
  // Batch level
  | "batch-name-required"
  | "batch-template-required"
  | "batch-template-archived"
  | "batch-template-restricted"
  | "batch-no-recipients"
  | "batch-too-many-rows"
  | "batch-sender-restricted"
  | "batch-team-restricted"
  | "batch-feature-unavailable"
  // Mapping level
  | "mapping-required-role-unmapped"
  | "mapping-required-role-field-unmapped"
  | "mapping-required-variable-unmapped"
  | "mapping-unknown-variable"
  | "mapping-unsupported-role"
  | "mapping-column-conflict"
  | "mapping-type-mismatch"
  // Row level
  | "row-missing-name"
  | "row-missing-email"
  | "row-invalid-email"
  | "row-missing-required-variable"
  | "row-invalid-variable-type"
  | "row-duplicate"
  | "row-duplicate-participant"
  | "row-contact-archived"
  | "row-contact-restricted"
  | "row-cross-workspace-contact"
  | "row-value-too-long"
  // Configuration references
  | "reference-routing-invalid"
  | "reference-auth-unavailable"
  | "reference-due-date-invalid"
  | "reference-expiration-invalid"
  | "reference-folder-archived"
  | "reference-tag-archived"
  | "reference-policy-stale"
  | "reference-automation-conflict";

export interface BulkSendRowValidationIssue {
  code:      BulkSendValidationIssueCode;
  severity:  BulkSendValidationSeverity;
  /** Plain-language sentence. Never a raw internal error. */
  message:   string;
  /** Mapping or field this issue points at, when applicable. */
  target:    string | null;
  columnId:  BulkSendSourceColumnId | null;
  rowId:     BulkSendRecipientRowId | null;
  suggestedCorrection: string | null;
  bulkCorrectionAvailable: boolean;
  mayRemainExcluded: boolean;
}

export interface BulkSendBatchValidationSummary {
  totalRows:       number;
  ready:           number;
  warning:         number;
  incomplete:      number;
  duplicate:       number;
  restricted:      number;
  excluded:        number;
  invalidMapping:  number;
  unavailable:     number;
  projected:       number;
  blockingIssues:  BulkSendRowValidationIssue[];
  nonblockingIssues: BulkSendRowValidationIssue[];
  /** Row-scoped issues keyed by row ID. */
  issuesByRow:     Record<string, BulkSendRowValidationIssue[]>;
  validatedAtDemonstration: string | null;
}

export const EMPTY_VALIDATION_SUMMARY: BulkSendBatchValidationSummary = {
  totalRows: 0, ready: 0, warning: 0, incomplete: 0, duplicate: 0, restricted: 0,
  excluded: 0, invalidMapping: 0, unavailable: 0, projected: 0,
  blockingIssues: [], nonblockingIssues: [], issuesByRow: {},
  validatedAtDemonstration: null,
};

// ── Duplicates ────────────────────────────────────────────────────────────────

export type BulkSendDuplicateType =
  | "identical-row"
  | "repeated-contact"
  | "repeated-email-in-role"
  | "participant-in-incompatible-roles";

export const BULK_SEND_DUPLICATE_LABELS: Record<BulkSendDuplicateType, string> = {
  "identical-row":                     "Identical rows",
  "repeated-contact":                  "Same Contact used more than once",
  "repeated-email-in-role":            "Same email direction repeated in one role",
  "participant-in-incompatible-roles": "Same person assigned to incompatible roles",
};

export interface BulkSendDuplicateGroup {
  key:    string;
  type:   BulkSendDuplicateType;
  rowIds: BulkSendRecipientRowId[];
  explanation: string;
}

// ── Corrections and exclusions ────────────────────────────────────────────────

export type BulkSendBulkCorrectionType =
  | "trim-whitespace"
  | "apply-organization"
  | "apply-variable-constant"
  | "apply-auth-method"
  | "exclude-duplicates"
  | "exclude-incomplete";

export const BULK_SEND_CORRECTION_LABELS: Record<BulkSendBulkCorrectionType, string> = {
  "trim-whitespace":         "Trim leading and trailing spaces",
  "apply-organization":      "Apply one organization value",
  "apply-variable-constant": "Apply one approved variable value",
  "apply-auth-method":       "Apply one authentication direction",
  "exclude-duplicates":      "Exclude duplicate rows",
  "exclude-incomplete":      "Exclude incomplete rows",
};

export interface BulkSendBulkCorrection {
  type:      BulkSendBulkCorrectionType;
  columnId?: BulkSendSourceColumnId;
  value?:    string;
  authMethod?: PrepAuthMethodId;
  /** Rows the correction would touch. Always previewed before applying. */
  targetRowIds: BulkSendRecipientRowId[];
}

export interface BulkSendCorrectionPreview {
  correction:     BulkSendBulkCorrection;
  affectedRowIds: BulkSendRecipientRowId[];
  /** Rows skipped because they already hold a different valid value. */
  skippedRowIds:  BulkSendRecipientRowId[];
  description:    string;
}

// ── Request defaults ──────────────────────────────────────────────────────────

export type BulkSendDefaultSource =
  | "user"
  | "saved-configuration"
  | "template"
  | "workflow-policy"
  | "automation-rule"
  | "workspace-default"
  | "product-default";

export const BULK_SEND_DEFAULT_SOURCE_LABELS: Record<BulkSendDefaultSource, string> = {
  "user":                "Your choice",
  "saved-configuration": "Saved configuration",
  "template":            "Template",
  "workflow-policy":     "Workflow Policy",
  "automation-rule":     "Automation Rule",
  "workspace-default":   "Workspace default",
  "product-default":     "Product default",
};

/** Precedence, highest first. Matches the C32 resolution order. */
export const BULK_SEND_DEFAULT_PRECEDENCE: readonly BulkSendDefaultSource[] = [
  "user", "saved-configuration", "template", "workflow-policy",
  "automation-rule", "workspace-default", "product-default",
];

export interface BulkSendResolvedValue<T> {
  value:  T;
  source: BulkSendDefaultSource;
  /** True when a lower-precedence source proposed a different value. */
  conflict: boolean;
  conflictExplanation: string | null;
}

export interface BulkSendRequestDefaults {
  requestTitlePattern: BulkSendResolvedValue<string>;
  senderMessage:       BulkSendResolvedValue<string>;
  routingMode:         BulkSendResolvedValue<RoutingMode>;
  authMethod:          BulkSendResolvedValue<PrepAuthMethodId>;
  consentRequired:     BulkSendResolvedValue<boolean>;
  dueDateDirection:    BulkSendResolvedValue<string | null>;
  expirationDirection: BulkSendResolvedValue<string | null>;
  completionCopyDirection: BulkSendResolvedValue<string | null>;
  verificationDirection:   BulkSendResolvedValue<string | null>;
}

export interface BulkSendOrganizationDefaults {
  folderId:   string | null;
  folderName: string | null;
  tagIds:     string[];
  tagNames:   string[];
  folderArchived: boolean;
  archivedTagNames: string[];
}

export interface BulkSendPolicyResolution {
  policyId:   string | null;
  policyName: string | null;
  stale:      boolean;
  appliedValues: string[];
}

export interface BulkSendAutomationResolution {
  ruleId:   string | null;
  ruleName: string | null;
  stale:    boolean;
  /** Preview-only projected actions. Never executed. */
  projectedActions: string[];
  conflicts: string[];
}

// ── Eligibility ───────────────────────────────────────────────────────────────

export type BulkSendEligibilityReason =
  | "eligible"
  | "eligible-with-warning"
  | "incomplete"
  | "duplicate"
  | "excluded"
  | "restricted-workspace"
  | "restricted-team"
  | "restricted-template"
  | "restricted-contact"
  | "restricted-sender"
  | "invalid-mapping"
  | "feature-unavailable"
  | "stale-reference"
  | "unavailable";

export const BULK_SEND_ELIGIBILITY_LABELS: Record<BulkSendEligibilityReason, string> = {
  "eligible":              "Eligible",
  "eligible-with-warning": "Eligible with warning",
  "incomplete":            "Incomplete",
  "duplicate":             "Duplicate",
  "excluded":              "Excluded",
  "restricted-workspace":  "Restricted — Workspace",
  "restricted-team":       "Restricted — Team",
  "restricted-template":   "Restricted — Template",
  "restricted-contact":    "Restricted — Contact",
  "restricted-sender":     "Restricted — Sender",
  "invalid-mapping":       "Invalid mapping",
  "feature-unavailable":   "Feature unavailable",
  "stale-reference":       "Stale reference",
  "unavailable":           "Unavailable",
};

export interface BulkSendEligibility {
  rowId:       BulkSendRecipientRowId;
  eligible:    boolean;
  reason:      BulkSendEligibilityReason;
  explanation: string;
}

export interface BulkSendEligibilitySummary {
  eligible:      number;
  withWarning:   number;
  ineligible:    number;
  excluded:      number;
  restricted:    number;
  byReason:      Record<string, number>;
  eligibleRowIds: BulkSendRecipientRowId[];
}

// ── Representative preview ────────────────────────────────────────────────────

export type BulkSendPreviewKind = "first-ready" | "first-warning" | "multi-participant" | "selected";

export const BULK_SEND_PREVIEW_KIND_LABELS: Record<BulkSendPreviewKind, string> = {
  "first-ready":       "First ready row",
  "first-warning":     "First warning row",
  "multi-participant": "First multi-participant row",
  "selected":          "Selected row",
};

export interface BulkSendRepresentativePreview {
  kind:      BulkSendPreviewKind;
  rowId:     BulkSendRecipientRowId | null;
  available: boolean;
  unavailableReason: string | null;

  requestTitle:   string;
  senderMessage:  string;
  templateName:   string;
  /** Reuses the EXISTING single-document role-mapping shape. */
  participants:   TemplateRoleMapping[];
  routingMode:    RoutingMode;
  routingSummary: string;
  authDirection:  string;
  consentDirection: string;
  dueDateDirection: string | null;
  expirationDirection: string | null;
  folderName:     string | null;
  tagNames:       string[];
  variableValues: TemplateVariableValues;
  defaultSources: { label: string; source: BulkSendDefaultSource }[];
  warnings:       string[];
}

// ── Draft Projection ──────────────────────────────────────────────────────────

export type BulkSendProjectionResultStatus =
  | "draft-projection-created"
  | "excluded"
  | "requires-correction"
  | "restricted"
  | "unavailable"
  | "projection-conflict"
  | "projection-failed-demonstration";

export const BULK_SEND_PROJECTION_RESULT_LABELS: Record<BulkSendProjectionResultStatus, string> = {
  "draft-projection-created":        "Draft Projection Created",
  "excluded":                        "Excluded",
  "requires-correction":             "Requires Correction",
  "restricted":                      "Restricted",
  "unavailable":                     "Unavailable",
  "projection-conflict":             "Projection Conflict",
  "projection-failed-demonstration": "Projection Failed in Demonstration",
};

/**
 * Controlled provenance attached to a projected Draft. Contains NO source-row values,
 * NO recipient names, and NO email direction — only opaque IDs and safe labels.
 */
export interface BulkSendDraftProjectionMarking {
  isDemonstrationProjection: true;
  batchId:      BulkSendBatchId;
  rowId:        BulkSendRecipientRowId;
  templateId:   DocumentTemplateId;
  templateName: string;
  sourceLabel:  string;
  noDeliveryPerformed: true;
}

export interface BulkSendDraftProjection {
  id:           BulkSendProjectionId;
  batchId:      BulkSendBatchId;
  rowId:        BulkSendRecipientRowId;
  /** ID of the Draft created in the canonical Documents store. */
  documentId:   string;
  documentTitle: string;
  participantCount: number;
  createdAtDemonstration: string;
  marking:      BulkSendDraftProjectionMarking;
}

export interface BulkSendProjectionResult {
  rowId:       BulkSendRecipientRowId;
  rowNumber:   number;
  status:      BulkSendProjectionResultStatus;
  projectionId: BulkSendProjectionId | null;
  documentId:  string | null;
  /** Safe display label. Never the raw recipient email. */
  recipientDirection: string;
  explanation: string;
}

export interface BulkSendBatchResultSummary {
  totalRows:            number;
  draftProjectionsCreated: number;
  warningRows:          number;
  excludedRows:         number;
  restrictedRows:       number;
  failedProjections:    number;
  results:              BulkSendProjectionResult[];
  createdAtDemonstration: string | null;
}

// ── Batch ─────────────────────────────────────────────────────────────────────

export interface BulkSendBatchScope {
  workspaceId:   string;
  workspaceName: string;
  teamId:        string | null;
  teamName:      string | null;
  senderId:      string;
  senderName:    string;
}

export interface BulkSendBatch {
  id:          BulkSendBatchId;
  name:        string;
  status:      BulkSendBatchStatus;
  scope:       BulkSendBatchScope;

  templateId:   DocumentTemplateId | null;
  templateName: string | null;
  templateArchived: boolean;

  schema:  BulkSendSourceSchema | null;
  rows:    BulkSendRecipientRow[];

  roleMappings:     BulkSendRoleMapping[];
  variableMappings: BulkSendVariableMapping[];

  defaults:      BulkSendRequestDefaults | null;
  organization:  BulkSendOrganizationDefaults;
  policy:        BulkSendPolicyResolution;
  automation:    BulkSendAutomationResolution;

  validation:    BulkSendBatchValidationSummary;
  duplicates:    BulkSendDuplicateGroup[];
  results:       BulkSendBatchResultSummary | null;

  appliedConfigurationId: BulkSendSavedConfigurationId | null;

  createdAtDemonstration: string;
  updatedAtDemonstration: string;

  /** Always true in this build. Present so a future adapter can flip it. */
  demonstrationOnly: true;
}

export interface BulkSendBatchSummary {
  id:        BulkSendBatchId;
  name:      string;
  status:    BulkSendBatchStatus;
  templateName: string | null;
  teamName:  string | null;
  senderName: string;
  totalRows: number;
  readyRows: number;
  warningRows: number;
  excludedRows: number;
  draftProjections: number;
  updatedAtDemonstration: string;
}

// ── Saved configuration ───────────────────────────────────────────────────────

export type BulkSendSavedConfigurationStatus = "active" | "archived" | "stale" | "restricted";

export const BULK_SEND_CONFIG_STATUS_LABELS: Record<BulkSendSavedConfigurationStatus, string> = {
  active:     "Active",
  archived:   "Archived",
  stale:      "Needs Update",
  restricted: "Restricted",
};

export type BulkSendStaleReferenceKind =
  | "template-archived"
  | "variable-removed"
  | "role-changed"
  | "team-archived"
  | "sender-removed"
  | "folder-archived"
  | "tag-archived"
  | "policy-paused"
  | "rule-archived"
  | "feature-unavailable";

export const BULK_SEND_STALE_LABELS: Record<BulkSendStaleReferenceKind, string> = {
  "template-archived":   "The Template is archived",
  "variable-removed":    "A mapped Template variable no longer exists",
  "role-changed":        "A Template participant role changed",
  "team-archived":       "The Team is archived",
  "sender-removed":      "The sender is no longer available",
  "folder-archived":     "The Folder is archived",
  "tag-archived":        "A Tag is archived",
  "policy-paused":       "The Workflow Policy is paused",
  "rule-archived":       "The Automation Rule is archived",
  "feature-unavailable": "A required feature is unavailable",
};

export interface BulkSendSavedConfigurationReference {
  kind:  BulkSendStaleReferenceKind;
  /** Generic category label only — never a restricted resource name. */
  label: string;
}

/**
 * A reusable configuration. Retains Template and mapping RULES.
 * It never retains recipient rows, imported file contents, or cell values.
 */
export interface BulkSendSavedConfiguration {
  id:           BulkSendSavedConfigurationId;
  name:         string;
  status:       BulkSendSavedConfigurationStatus;
  templateId:   DocumentTemplateId;
  templateName: string;
  teamId:       string | null;
  teamName:     string | null;

  roleMappings:     BulkSendRoleMapping[];
  variableMappings: BulkSendVariableMapping[];
  defaults:         BulkSendRequestDefaults | null;
  organization:     BulkSendOrganizationDefaults;
  policyId:         string | null;
  ruleId:           string | null;

  staleReferences:  BulkSendSavedConfigurationReference[];
  createdAtDemonstration: string;
  updatedAtDemonstration: string;
  demonstrationOnly: true;
}

// ── Import previews ───────────────────────────────────────────────────────────

export interface BulkSendImportPreview {
  schema:      BulkSendSourceSchema;
  /** Capped at BULK_SEND_MAX_PREVIEW_ROWS. Never the whole file. */
  previewRows: Record<string, string>[];
  totalRowsDetected: number;
  truncated:   boolean;
  neutralizedCellCount: number;
  errors:      string[];
}

// ── Activity ──────────────────────────────────────────────────────────────────

export type BulkSendActivityType =
  | "batch-created"
  | "recipients-added"
  | "csv-previewed-locally"
  | "mapping-updated"
  | "validation-run"
  | "rows-corrected"
  /** A request default was overridden for this draft, or returned to inheritance. */
  | "defaults-updated"
  | "rows-excluded"
  | "rows-restored"
  | "batch-reviewed"
  | "draft-projections-created"
  | "batch-archived"
  | "configuration-applied";

export interface BulkSendActivityRecord {
  id:        string;
  batchId:   BulkSendBatchId;
  type:      BulkSendActivityType;
  timestamp: string;
  title:     string;
  description: string;
  /** Always true. Never an audit trail, never Evidence. */
  demonstrationOnly: true;
}

// ── Query, filter, sort ───────────────────────────────────────────────────────

export type BulkSendSortField =
  | "recently-updated" | "name" | "status" | "ready-rows" | "warning-rows" | "created";

export const BULK_SEND_SORT_LABELS: Record<BulkSendSortField, string> = {
  "recently-updated": "Recently Updated",
  "name":             "Name",
  "status":           "Status",
  "ready-rows":       "Ready Row Count",
  "warning-rows":     "Warning Count",
  "created":          "Created Date",
};

export const VALID_BULK_SEND_SORTS: readonly BulkSendSortField[] = [
  "recently-updated", "name", "status", "ready-rows", "warning-rows", "created",
];

export interface BulkSendQuery {
  q:            string;
  status:       BulkSendBatchStatus | "all";
  templateId:   string | "all";
  teamId:       string | "all";
  senderId:     string | "all";
  hasWarnings:  boolean;
  hasExclusions: boolean;
  hasProjections: boolean;
  sort:         BulkSendSortField;
  page:         number;
}

export const DEFAULT_BULK_SEND_QUERY: BulkSendQuery = {
  q: "", status: "all", templateId: "all", teamId: "all", senderId: "all",
  hasWarnings: false, hasExclusions: false, hasProjections: false,
  sort: "recently-updated", page: 1,
};

export function parseBulkSendSort(v: unknown): BulkSendSortField {
  return VALID_BULK_SEND_SORTS.includes(v as BulkSendSortField)
    ? (v as BulkSendSortField) : "recently-updated";
}

export function parseBatchStatusFilter(v: unknown): BulkSendBatchStatus | "all" {
  return VALID_BULK_SEND_BATCH_STATUSES.includes(v as BulkSendBatchStatus)
    ? (v as BulkSendBatchStatus) : "all";
}

export function parseRowStatusFilter(v: unknown): BulkSendRecipientRowStatus | "all" {
  return VALID_ROW_STATUSES.includes(v as BulkSendRecipientRowStatus)
    ? (v as BulkSendRecipientRowStatus) : "all";
}

// ── Actions and permissions ───────────────────────────────────────────────────

export type BulkSendAction =
  | "view-bulk-send"
  | "create-bulk-send-batch"
  | "edit-bulk-send-batch"
  | "add-batch-recipients"
  | "preview-local-csv"
  | "map-batch-roles"
  | "map-batch-variables"
  | "validate-batch"
  | "correct-batch-row"
  | "exclude-batch-row"
  | "restore-batch-row"
  | "preview-batch-request"
  | "review-batch"
  | "create-draft-projections-demonstration"
  | "duplicate-batch"
  | "archive-batch"
  | "restore-batch"
  | "remove-batch-demonstration"
  | "manage-saved-batch-configurations"
  | "view-batch-results";

export interface BulkSendActionAvailability {
  action:    BulkSendAction;
  available: boolean;
  /** Always populated when unavailable — no control is silently disabled. */
  reason:    string | null;
}

/**
 * Bulk Send reuses the existing platform permissions rather than adding a parallel
 * permission system. This maps the C33 vocabulary onto them in exactly one place.
 */
export interface BulkSendPermissionContext {
  canViewBulkSend:            boolean;
  canCreateBatch:             boolean;
  canEditBatch:               boolean;
  canAddRecipients:           boolean;
  canPreviewLocalCsv:         boolean;
  canMapFields:               boolean;
  canValidate:                boolean;
  canPreviewRequests:         boolean;
  canCreateDraftProjections:  boolean;
  canManageSavedConfigurations: boolean;
  canArchiveBatch:            boolean;
  canRemoveBatchDemonstration: boolean;
  canViewResults:             boolean;
}

export const NO_BULK_SEND_PERMISSIONS: BulkSendPermissionContext = {
  canViewBulkSend: false, canCreateBatch: false, canEditBatch: false,
  canAddRecipients: false, canPreviewLocalCsv: false, canMapFields: false,
  canValidate: false, canPreviewRequests: false, canCreateDraftProjections: false,
  canManageSavedConfigurations: false, canArchiveBatch: false,
  canRemoveBatchDemonstration: false, canViewResults: false,
};

/**
 * `manage_templates` is deliberately NOT sufficient on its own, and holding Bulk Send
 * permission never grants blanket Contact access, blanket Template access, or the
 * ability to send as another member.
 */
export function buildBulkSendPermissionContext(input: {
  hasViewDocuments:    boolean;
  hasPrepareDocuments: boolean;
  hasManageContacts:   boolean;
  capabilityAvailable: boolean;
  batchArchived?:      boolean;
}): BulkSendPermissionContext {
  const view = input.capabilityAvailable && input.hasViewDocuments;
  const edit = view && input.hasPrepareDocuments && !input.batchArchived;
  return {
    canViewBulkSend:            view,
    canCreateBatch:             view && input.hasPrepareDocuments,
    canEditBatch:               edit,
    canAddRecipients:           edit && input.hasManageContacts,
    canPreviewLocalCsv:         edit,
    canMapFields:               edit,
    canValidate:                edit,
    canPreviewRequests:         view,
    canCreateDraftProjections:  edit,
    canManageSavedConfigurations: edit,
    canArchiveBatch:            view && input.hasPrepareDocuments,
    canRemoveBatchDemonstration: view && input.hasPrepareDocuments,
    canViewResults:             view,
  };
}

// ── Scenarios and errors ──────────────────────────────────────────────────────

export type BulkSendScenario =
  | "standard"
  | "team-scoped"
  | "workspace-manager"
  | "read-only-auditor"
  | "new-workspace"
  | "csv-preview"
  | "malformed-csv"
  | "duplicate-heavy"
  | "partial-projection"
  | "feature-restricted"
  | "partial-failure"
  | "full-failure";

export const VALID_BULK_SEND_SCENARIOS: readonly BulkSendScenario[] = [
  "standard", "team-scoped", "workspace-manager", "read-only-auditor", "new-workspace",
  "csv-preview", "malformed-csv", "duplicate-heavy", "partial-projection",
  "feature-restricted", "partial-failure", "full-failure",
];

export type BulkSendError =
  | "batch-not-found"
  | "configuration-not-found"
  | "row-not-found"
  | "restricted-batch"
  | "template-unavailable"
  | "import-preview-unavailable"
  | "projection-unavailable"
  | "capability-unavailable"
  | "permission-denied"
  | "invalid-input"
  | "partial-error"
  | "full-error";

// ── Honest frontend-only language ─────────────────────────────────────────────

export const BULK_SEND_DEMONSTRATION_NOTICE =
  "Bulk Send uses fictional frontend demonstration data. No request, invitation, email, SMS " +
  "message, reminder, recipient session, document package, or production transaction is sent " +
  "or created.";

export const BULK_SEND_REVIEW_NOTICE =
  "This batch uses frontend demonstration data. No request, invitation, email, SMS message, " +
  "reminder, recipient session, document package, or production transaction is sent or created.";

export const BULK_SEND_RESULTS_NOTICE =
  "These results describe frontend Draft Projections only. No request was delivered, no " +
  "recipient was notified, and no production transaction was persisted.";

export const BULK_SEND_CSV_NOTICE =
  "The selected file is previewed locally in this frontend session. It is not uploaded or persisted.";

export const BULK_SEND_ACTIVITY_NOTICE =
  "This activity is fictional frontend demonstration history and is not an immutable audit record.";

export const BULK_SEND_SCOPE_NOTICE =
  "Bulk Send prepares frontend Draft Projections only. It does not deliver requests, act for " +
  "participants, verify identity, create Evidence, or determine legal effect.";

export const BULK_SEND_LEGAL_NOTICE =
  "Legal effect depends on the document, the parties, the circumstances, and applicable " +
  "requirements. This does not constitute legal, security, records-management, or compliance advice.";

// ── New-batch step model ──────────────────────────────────────────────────────

export type BulkSendStepId =
  | "template" | "scope" | "recipients" | "mapping"
  | "validate" | "defaults" | "preview" | "review";

export const BULK_SEND_STEPS: readonly {
  id: BulkSendStepId; label: string; shortLabel: string; helper: string;
}[] = [
  { id: "template",   label: "Choose Template",      shortLabel: "Template",   helper: "Pick the approved Template every row will use." },
  { id: "scope",      label: "Scope and Sender",     shortLabel: "Scope",      helper: "Confirm the Workspace, Team, and sender." },
  { id: "recipients", label: "Add Recipients",       shortLabel: "Recipients", helper: "Bring in recipient rows from a permitted source." },
  { id: "mapping",    label: "Map Roles and Variables", shortLabel: "Mapping", helper: "Bind source columns to Template roles and variables." },
  { id: "validate",   label: "Validate and Correct", shortLabel: "Validate",   helper: "Resolve blocking issues and review warnings." },
  { id: "defaults",   label: "Configure Defaults",   shortLabel: "Defaults",   helper: "Set request, routing, and organization direction." },
  { id: "preview",    label: "Preview Requests",     shortLabel: "Preview",    helper: "Check representative rows before review." },
  { id: "review",     label: "Review Batch",         shortLabel: "Review",     helper: "Confirm the eligible rows, then create Draft Projections." },
];

export const VALID_BULK_SEND_STEPS: readonly BulkSendStepId[] =
  ["template", "scope", "recipients", "mapping", "validate", "defaults", "preview", "review"];

export function parseBulkSendStep(v: unknown): BulkSendStepId {
  return VALID_BULK_SEND_STEPS.includes(v as BulkSendStepId) ? (v as BulkSendStepId) : "template";
}

// ── Deterministic header aliases for suggested mappings ───────────────────────
// Deterministic lookup only. This is NOT AI mapping and must never be described as such.

export const BULK_SEND_ROLE_FIELD_ALIASES: Record<BulkSendRoleField, readonly string[]> = {
  displayName:  ["name", "full name", "fullname", "recipient", "recipient name", "signer", "signer name", "contact name", "person"],
  email:        ["email", "email address", "e mail", "mail", "recipient email", "signer email", "contact email"],
  organization: ["organization", "organisation", "company", "org", "employer", "business", "firm"],
};

export const BULK_SEND_VARIABLE_ALIASES: Record<string, readonly string[]> = {
  reference:      ["reference", "reference number", "ref", "ref no", "reference no"],
  department:     ["department", "dept", "division", "unit"],
  due_date:       ["due date", "due", "deadline", "due on"],
  expiration_date:["expiration date", "expires", "expiry", "expiration", "valid until"],
  title:          ["title", "request title", "subject", "document title"],
  message:        ["message", "note", "request message", "instructions"],
  amount:         ["amount", "value", "total", "fee"],
  position:       ["position", "job title", "role title", "designation"],
};

/** Normalises a header for deterministic alias lookup. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[_\-.]+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
