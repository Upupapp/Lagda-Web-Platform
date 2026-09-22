// Template domain models for /app/templates/*.
// FRONTEND-ONLY — no backend, no real storage, no real sharing, no real publishing.
// Reuses stable types from prepare.ts, field-editor.ts, and documents.ts.
// Burgundy (#67023B) is NEVER used here — reserved for future LAGDA eNotary.
// No eNotary roles, notarial routing stages, or notarial certificate templates.

import type {
  PrepParticipantRole,
  PrepAuthMethodId,
  PrepParticipant,
  PrepRoutingConfig,
} from "./prepare";
import type { RoutingMode }     from "./transaction-detail";
import type { FieldDefinition } from "./field-editor";

// ── Re-exports for consumers ──────────────────────────────────────────────────
export type { PrepParticipantRole, PrepAuthMethodId, RoutingMode };

// ── Identity types ────────────────────────────────────────────────────────────

export type DocumentTemplateId         = string;
export type TemplateRolePlaceholderId  = string;
export type TemplateDocumentId         = string;
export type TemplateVariableId         = string;
export type TemplateFieldId            = string;
export type TemplateGroupId            = string;

// ── Template status ───────────────────────────────────────────────────────────

export type TemplateStatus = "draft" | "available" | "archived" | "unavailable" | "invalid";

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  draft:       "Draft",
  available:   "Available",
  archived:    "Archived",
  unavailable: "Unavailable",
  invalid:     "Invalid",
};

export const TEMPLATE_STATUS_DESCRIPTIONS: Record<TemplateStatus, string> = {
  draft:       "This template is still being configured and is not yet available for use.",
  available:   "This template is available in the current frontend demonstration.",
  archived:    "This template has been archived and is excluded from normal use flows.",
  unavailable: "This template is not currently available.",
  invalid:     "This template has blocking configuration errors that must be resolved.",
};

export const TEMPLATE_STATUS_TONE: Record<TemplateStatus, "neutral" | "success" | "warning" | "error" | "muted"> = {
  draft:       "warning",
  available:   "success",
  archived:    "muted",
  unavailable: "neutral",
  invalid:     "error",
};

// ── Template scope ─────────────────────────────────────────────────────────────

export type TemplateScope = "personal" | "workspace";

export const TEMPLATE_SCOPE_LABELS: Record<TemplateScope, string> = {
  personal:  "Personal",
  workspace: "Workspace",
};

// ── Template source ───────────────────────────────────────────────────────────

export type TemplateSource =
  | "blank"
  | "from-draft"
  | "from-transaction"
  | "duplicated"
  | "example";

// ── Template categories ───────────────────────────────────────────────────────

export type TemplateCategory =
  | "legal-services"
  | "contracts"
  | "human-resources"
  | "procurement"
  | "vendor-management"
  | "internal-approvals"
  | "other";

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  "legal-services":    "Legal Services",
  "contracts":         "Contracts",
  "human-resources":   "Human Resources",
  "procurement":       "Procurement",
  "vendor-management": "Vendor Management",
  "internal-approvals":"Internal Approvals",
  "other":             "Other",
};

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "legal-services",
  "contracts",
  "human-resources",
  "procurement",
  "vendor-management",
  "internal-approvals",
  "other",
];

// ── Role placeholder ──────────────────────────────────────────────────────────

/**
 * How a slot's PERSON is found automatically (061), instead of a sender
 * typing a name and email at apply time. One strategy today: whoever
 * CURRENTLY holds a title inside an organization unit — "the Department
 * Head of Records" — resolved live every time the template is applied, not
 * pinned to whoever held it when the template was authored.
 */
export interface TemplateRoleResolution {
  mode: "unit-title";
  unitId: string;
  title: string;
}

/** What a slot with a `resolution` means RIGHT NOW (061) — read fresh at
 *  apply time, never cached. Three states rather than a nullable person:
 *  "manual" (no resolution on this slot), "unresolved" (configured, but
 *  nobody currently holds the title), "resolved" (exactly one person). */
export type TemplateRoleAssignment =
  | { placeholderId: TemplateRolePlaceholderId; status: "manual" }
  | { placeholderId: TemplateRolePlaceholderId; status: "unresolved" }
  | {
      placeholderId: TemplateRolePlaceholderId; status: "resolved";
      userId: string; displayName: string; email: string;
    };

export interface TemplateRolePlaceholder {
  id:                  TemplateRolePlaceholderId;
  label:               string;               // e.g. "Client Signer"
  role:                PrepParticipantRole;
  required:            boolean;
  routingStep:         number;               // 1-based; same step = same group
  defaultAuthMethod:   PrepAuthMethodId;
  description:         string;               // shown during role mapping
  mustMapToParticipant:boolean;              // false = optional placeholder
  /** 060. Present only for a slot that came from a REAL stored template —
   *  the backend's own stable id for this role, used to address the field
   *  placements endpoint (keyed by slot, not by this object's positional
   *  `id`) and round-tripped on save so a field survives an edit. */
  backendSlotId?:      string;
  /** 061. Absent means MANUAL — a sender types a name and email when the
   *  template is used, exactly as every slot worked before this existed. */
  resolution?:         TemplateRoleResolution;
}

// ── Template document ─────────────────────────────────────────────────────────

export interface TemplateDocument {
  id:          TemplateDocumentId;
  displayName: string;
  pageCount:   number;
  order:       number;
  /**
   * `true` for every fixture template — there is no file behind the name.
   *
   * `false` only for a document a workspace has genuinely attached (backend
   * migration 059): a real document and a real artifact, uploaded through
   * the ordinary path and merely referenced by the template. Applying such a
   * template pre-fills the Upload step instead of leaving it empty.
   */
  isPlaceholder: boolean;
  /** Present only when `isPlaceholder` is `false` — the ids the apply path
   *  needs to seed a draft's Upload step without asking the sender to
   *  re-upload a file the template already has. */
  backendDocumentId?: string;
  backendArtifactId?: string;
  /** Also present only when `isPlaceholder` is `false` — carried alongside
   *  the ids so the apply path can build a truthful `PrepFile` (real size,
   *  real media type) rather than a guessed one. */
  sizeBytes?: number;
  mimeType?: string;
}

// ── Template variable ─────────────────────────────────────────────────────────

export type TemplateVariableType =
  | "short-text"
  | "multiline-text"
  | "date"
  | "number"
  | "select"
  | "yes-no";

export const TEMPLATE_VARIABLE_TYPE_LABELS: Record<TemplateVariableType, string> = {
  "short-text":    "Short Text",
  "multiline-text":"Multiline Text",
  "date":          "Date",
  "number":        "Number",
  "select":        "Select Option",
  "yes-no":        "Yes / No",
};

export interface TemplateVariable {
  id:          TemplateVariableId;
  label:       string;
  internalKey: string;    // normalized, e.g. "client_name"; used for {{client_name}} token
  type:        TemplateVariableType;
  required:    boolean;
  helpText:    string;
  placeholder: string;
  options?:    { id: string; label: string }[]; // for "select" type
  defaultDirection?: string;
}

// ── Template field ────────────────────────────────────────────────────────────
// Like FieldDefinition but assigned to a placeholder ID, not a real participant.

export interface TemplateField extends Omit<FieldDefinition, "participantId"> {
  placeholderId: TemplateRolePlaceholderId | null; // null = sender-prefill
  variableRef?:  string;                            // internalKey of a template variable
}

// ── Routing configuration ─────────────────────────────────────────────────────

export interface TemplateRoutingConfiguration {
  mode:         RoutingMode;
  groups:       { id: TemplateGroupId; label: string; step: number; placeholderIds: TemplateRolePlaceholderId[] }[];
}

// ── Authentication defaults ───────────────────────────────────────────────────

export interface TemplateAuthenticationConfiguration {
  globalDefault:       PrepAuthMethodId;
  placeholderOverrides:Record<TemplateRolePlaceholderId, PrepAuthMethodId>;
}

// ── Request settings defaults ─────────────────────────────────────────────────

export interface TemplateRequestSettings {
  invitationSubject:   string;
  invitationMessage:   string;   // may include {{variable}} tokens — no HTML
  reminderEnabled:     boolean;
  reminderIntervalDays:number;
  expirationEnabled:   boolean;
  expirationDays:      number;
  completionCopySender:boolean;
  completionCopyParticipants: boolean;
  verificationEnabled: boolean;
}

// ── Usage summary ─────────────────────────────────────────────────────────────

export interface TemplateUsageSummary {
  timesUsed:          number;
  lastUsedDate:       string | null;
  recentDraftStarts:  number;
  relatedFixtureIds:  string[];
  demonstrationOnly:  true;
}

// ── Validation issue ──────────────────────────────────────────────────────────

export interface TemplateValidationIssue {
  id:        string;
  severity:  "error" | "warning";
  message:   string;
  area:      "details" | "documents" | "placeholders" | "routing" | "auth" | "settings" | "variables" | "fields";
  fieldId?:  string;
  placeholderId?: TemplateRolePlaceholderId;
}

export interface TemplateValidationResult {
  isValid:          boolean;
  canMakeAvailable: boolean;
  errors:           TemplateValidationIssue[];
  warnings:         TemplateValidationIssue[];
}

// ── Template action types ─────────────────────────────────────────────────────

export type TemplateAction =
  | "view"
  | "use"
  | "edit"
  | "edit-fields"
  | "preview"
  | "duplicate"
  | "make-available"
  | "return-to-draft"
  | "archive"
  | "restore";

export interface TemplateActionAvailability {
  action:    TemplateAction;
  available: boolean;
  reason?:   string;
}

// ── Full template definition ──────────────────────────────────────────────────

export interface DocumentTemplate {
  id:             DocumentTemplateId;
  name:           string;
  description:    string;
  category:       TemplateCategory;
  status:         TemplateStatus;
  scope:          TemplateScope;
  source:         TemplateSource;
  ownerLabel:     string;
  workspaceLabel: string;
  tags:           string[];
  documents:      TemplateDocument[];
  placeholders:   TemplateRolePlaceholder[];
  routing:        TemplateRoutingConfiguration;
  authentication: TemplateAuthenticationConfiguration;
  settings:       TemplateRequestSettings;
  variables:      TemplateVariable[];
  fields:         TemplateField[];
  usageSummary:   TemplateUsageSummary;
  validation?:    TemplateValidationResult;
  createdAt:      string;
  updatedAt:      string;
  demonstrationOnly: true;
}

// ── List item (lightweight) ───────────────────────────────────────────────────

export interface TemplateListItem {
  id:              DocumentTemplateId;
  name:            string;
  category:        TemplateCategory;
  status:          TemplateStatus;
  scope:           TemplateScope;
  ownerLabel:      string;
  placeholderCount:number;
  routingMode:     RoutingMode;
  documentCount:   number;
  fieldCount:      number;
  variableCount:   number;
  lastUsedDate:    string | null;
  updatedAt:       string;
  usageCount:      number;
  hasErrors:       boolean;
  hasWarnings:     boolean;
}

// ── Library query ─────────────────────────────────────────────────────────────

export type TemplateView =
  | "all"
  | "workspace"
  | "personal"
  | "drafts"
  | "recent"
  | "available"
  | "archived";

export const TEMPLATE_VIEWS: { id: TemplateView; label: string }[] = [
  { id: "all",       label: "All Templates"        },
  { id: "workspace", label: "Workspace Templates"  },
  { id: "personal",  label: "My Templates"         },
  { id: "drafts",    label: "Drafts"               },
  { id: "recent",    label: "Recently Used"        },
  { id: "available", label: "Available"            },
  { id: "archived",  label: "Archived"             },
];

export type TemplateSortField =
  | "updatedAt"
  | "lastUsed"
  | "name"
  | "category"
  | "status"
  | "usageCount";

export interface TemplateListQuery {
  view:      TemplateView;
  q:         string;
  status?:   TemplateStatus;
  scope?:    TemplateScope;
  category?: TemplateCategory;
  role?:     PrepParticipantRole;
  routing?:  RoutingMode;
  sort:      TemplateSortField;
  direction: "asc" | "desc";
  page:      number;
}

export const DEFAULT_TEMPLATE_QUERY: TemplateListQuery = {
  view:      "all",
  q:         "",
  sort:      "updatedAt",
  direction: "desc",
  page:      1,
};

// ── Use-template flow ─────────────────────────────────────────────────────────

/**
 * What applying a template produces: a self-contained participants + routing
 * snapshot, with no link of any kind back to the template it came from.
 *
 * Declared here, in the model layer, rather than in the service that builds it
 * — `services/prepare/template-apply.ts` — so that neither models nor the
 * result type has to import from `services/`.
 */
export interface TemplateApplication {
  participants: PrepParticipant[];
  routing:      PrepRoutingConfig;
}

export interface TemplateRoleMapping {
  placeholderId: TemplateRolePlaceholderId;
  placeholderLabel: string;
  role:          PrepParticipantRole;
  required:      boolean;
  // Mapped participant info (kept only in-session; never stored in the template)
  displayName:   string;
  email:         string;
  organization?: string;
  authMethod:    PrepAuthMethodId;
}

export interface TemplateVariableValues {
  [internalKey: string]: string | boolean | null;
}

export interface TemplateInstantiationResult {
  ok:              boolean;
  /**
   * The resolved participants and routing, SNAPSHOTTED at the moment of
   * application — see services/prepare/template-apply.ts for why this carries
   * no template id and no placeholder id. A draft built from it is
   * self-contained, and editing or deleting the template afterwards cannot
   * change it.
   *
   * Present only when `ok`.
   */
  application?:    TemplateApplication;
  /** Copied, not referenced, for the same reason. */
  variableValues?: TemplateVariableValues;
  /**
   * Roles whose template-specified authentication method the server does not
   * enforce, and which therefore fell back to the secure invitation link.
   *
   * Present and possibly empty when `ok`. A caller that ignores this shows the
   * sender a workflow implying a stronger identity check than will occur.
   */
  authDowngrades?: { label: string; requested: PrepAuthMethodId }[];
  prepDraftId?:    string;
  prepStartRoute?: string;
  errorMessage?:   string;
  demonstrationOnly: true;
}

// ── Create-template context ───────────────────────────────────────────────────

export type CreateTemplateSource =
  | "blank"
  | "from-draft"
  | "from-transaction"
  | "duplicate"
  | "example";

export interface TemplateCreateContext {
  source:        CreateTemplateSource;
  sourceDraftId?:       string;
  sourceTransactionId?: string;
  sourceTemplateId?:    string;
  exampleId?:           string;
}

// ── Scenario registry ─────────────────────────────────────────────────────────

export const TEMPLATE_SCENARIOS = [
  { id: "tpl-engagement-standard", label: "Engagement Letter — Workspace, Available"  },
  { id: "tpl-vendor-agreement",    label: "Vendor Agreement — Workspace, Available"   },
  { id: "tpl-policy-acknowledgment",label:"Policy Acknowledgment — Workspace, Available"},
  { id: "tpl-professional-services",label:"Professional Services — Personal, Draft"   },
  { id: "tpl-procurement-approval", label: "Procurement Approval — Workspace, Available"},
  { id: "tpl-onboarding-package",   label: "Onboarding Package — Workspace, Draft"   },
  { id: "tpl-nda-archived",         label: "Confidentiality Template — Archived"     },
] as const;

export type TemplateScenarioId = typeof TEMPLATE_SCENARIOS[number]["id"];
