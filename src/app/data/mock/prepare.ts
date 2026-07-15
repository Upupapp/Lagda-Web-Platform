// Mock preparation draft fixtures for the /app/prepare workflow.
// All names, organizations, and content are fictional.
// No real participant data, no real files, no real invitations.
// demonstrationOnly: true on all fixtures.

import type {
  PreparationDraft,
  PrepFile,
  PrepParticipant,
  PrepRoutingConfig,
  PrepAuthConfig,
  PrepSettings,
  ResumableDraftSummary,
  TransactionDetailsDraft,
} from "../../models/prepare";
import {
  DEFAULT_TRANSACTION_DETAILS,
  DEFAULT_ROUTING_CONFIG,
  DEFAULT_AUTH_CONFIG,
  DEFAULT_PREP_SETTINGS,
} from "../../models/prepare";

// ── Shared workspace context ──────────────────────────────────────────────────

const WS_ID = "ws_northbridge_001";
const NOW    = "2026-07-15T10:00:00Z";

// ── File fixtures ─────────────────────────────────────────────────────────────

const FILE_PSA: PrepFile = {
  id:            "pf_001",
  fileName:      "Professional-Services-Agreement.pdf",
  fileSizeBytes: 284000,
  mimeType:      "application/pdf",
  fileState:     "ready",
  order:         1,
  demoPageCount: 4,
};

const FILE_NDA: PrepFile = {
  id:            "pf_002",
  fileName:      "Non-Disclosure-Agreement.pdf",
  fileSizeBytes: 142000,
  mimeType:      "application/pdf",
  fileState:     "ready",
  order:         1,
  demoPageCount: 2,
};

const FILE_SCHEDULE: PrepFile = {
  id:            "pf_003",
  fileName:      "Schedule-of-Fees.pdf",
  fileSizeBytes: 98000,
  mimeType:      "application/pdf",
  fileState:     "ready",
  order:         2,
  demoPageCount: 1,
};

const FILE_MOU: PrepFile = {
  id:            "pf_004",
  fileName:      "Memorandum-of-Understanding.pdf",
  fileSizeBytes: 195000,
  mimeType:      "application/pdf",
  fileState:     "ready",
  order:         1,
  demoPageCount: 3,
};

const FILE_LEASE: PrepFile = {
  id:            "pf_005",
  fileName:      "Lease-Agreement.pdf",
  fileSizeBytes: 421000,
  mimeType:      "application/pdf",
  fileState:     "ready",
  order:         1,
  demoPageCount: 8,
};

// ── Participant fixtures ───────────────────────────────────────────────────────

const PAX_MARIA: PrepParticipant = {
  id:                 "pp_maria_001",
  name:               "Maria Santos",
  email:              "msantos@example.com",
  role:               "signer",
  organization:       "Rivera Consulting",
  isRequired:         true,
  routingGroupId:     "rg_001",
  authMethodOverride: null,
};

const PAX_ANTONIO: PrepParticipant = {
  id:                 "pp_antonio_001",
  name:               "Antonio Cruz",
  email:              "acruz@example.com",
  role:               "signer",
  organization:       "Northbridge Business Services",
  isRequired:         true,
  routingGroupId:     "rg_001",
  authMethodOverride: null,
};

const PAX_ANA_APPROVER: PrepParticipant = {
  id:                 "pp_ana_001",
  name:               "Ana Reyes",
  email:              "areyes@northbridgelegal.com",
  role:               "approver",
  organization:       "Northbridge Business Services",
  isRequired:         true,
  routingGroupId:     "rg_001",
  authMethodOverride: null,
};

const PAX_LENA: PrepParticipant = {
  id:                 "pp_lena_001",
  name:               "Lena Torres",
  email:              "ltorres@example.com",
  role:               "signer",
  organization:       "Harborline Properties",
  isRequired:         true,
  routingGroupId:     "rg_002",
  authMethodOverride: null,
};

const PAX_TEAM_LEAD: PrepParticipant = {
  id:                 "pp_teamlead_001",
  name:               "Carlo Manalo",
  email:              "cmanalo@example.com",
  role:               "reviewer",
  organization:       "Northbridge Business Services",
  isRequired:         true,
  routingGroupId:     "rg_001",
  authMethodOverride: null,
};

const PAX_CC_RECIPIENT: PrepParticipant = {
  id:                 "pp_cc_001",
  name:               "Finance Team",
  email:              "finance@example.com",
  role:               "carbon-copy",
  organization:       "Northbridge Business Services",
  isRequired:         false,
  routingGroupId:     null,
  authMethodOverride: null,
};

const PAX_ACK_RECIPIENT1: PrepParticipant = {
  id:                 "pp_ack_001",
  name:               "Paulo Dela Cruz",
  email:              "pdelacruz@example.com",
  role:               "acknowledgment-recipient",
  organization:       "Example Corp",
  isRequired:         true,
  routingGroupId:     "rg_001",
  authMethodOverride: null,
};

const PAX_ACK_RECIPIENT2: PrepParticipant = {
  id:                 "pp_ack_002",
  name:               "Rosa Ignacio",
  email:              "rignacio@example.com",
  role:               "acknowledgment-recipient",
  organization:       "Example Corp",
  isRequired:         true,
  routingGroupId:     "rg_001",
  authMethodOverride: null,
};

const PAX_ACK_RECIPIENT3: PrepParticipant = {
  id:                 "pp_ack_003",
  name:               "Juanita Macapagal",
  email:              "jmacapagal@example.com",
  role:               "acknowledgment-recipient",
  organization:       "Example Corp",
  isRequired:         true,
  routingGroupId:     "rg_001",
  authMethodOverride: null,
};

// ── Routing configurations ────────────────────────────────────────────────────

const ROUTING_SINGLE_SIGNER: PrepRoutingConfig = {
  mode:   "sequential",
  groups: [
    { id: "rg_001", stepNumber: 1, label: "Step 1", participantIds: [PAX_MARIA.id], requiredCompletionRule: "all" },
  ],
};

const ROUTING_SEQUENTIAL_PSA: PrepRoutingConfig = {
  mode:   "sequential",
  groups: [
    { id: "rg_001", stepNumber: 1, label: "Internal Approval", participantIds: [PAX_ANA_APPROVER.id], requiredCompletionRule: "all" },
    { id: "rg_002", stepNumber: 2, label: "Signing",           participantIds: [PAX_MARIA.id, PAX_LENA.id], requiredCompletionRule: "all" },
  ],
};

const ROUTING_PARALLEL: PrepRoutingConfig = {
  mode:   "parallel",
  groups: [
    { id: "rg_001", stepNumber: 1, label: "Acknowledgment", participantIds: [PAX_ACK_RECIPIENT1.id, PAX_ACK_RECIPIENT2.id, PAX_ACK_RECIPIENT3.id], requiredCompletionRule: "all" },
  ],
};

const ROUTING_APPROVAL_THEN_SIGN: PrepRoutingConfig = {
  mode:   "approval-based",
  groups: [
    { id: "rg_001", stepNumber: 1, label: "Review",      participantIds: [PAX_TEAM_LEAD.id, PAX_ANA_APPROVER.id], requiredCompletionRule: "all" },
    { id: "rg_002", stepNumber: 2, label: "Signatories", participantIds: [PAX_MARIA.id, PAX_ANTONIO.id], requiredCompletionRule: "all" },
  ],
};

// ── Auth configurations ───────────────────────────────────────────────────────

const AUTH_EMAIL_OTP: PrepAuthConfig = {
  defaultMethod:  "email-otp",
  perParticipant: {},
};

const AUTH_DEFAULT: PrepAuthConfig = {
  defaultMethod:  "none",
  perParticipant: {},
};

// ── Settings ──────────────────────────────────────────────────────────────────

const SETTINGS_STANDARD: PrepSettings = {
  ...DEFAULT_PREP_SETTINGS,
  invitation: {
    subject:           "Please review and complete: {title}",
    message:           "",
    senderDisplayName: "Ana Reyes",
  },
  expiration: {
    enabled:   true,
    expiresAt: "2026-08-15",
  },
};

// ── Fixture drafts ────────────────────────────────────────────────────────────

// SCENARIO 1: Blank draft
export const DRAFT_BLANK: PreparationDraft = {
  id:            "draft_blank_001",
  status:        "files-required",
  workspaceId:   WS_ID,
  createdAt:     NOW,
  updatedAt:     NOW,
  sourceContext: { source: "new" },
  files:         [],
  details:       DEFAULT_TRANSACTION_DETAILS,
  participants:  [],
  routing:       DEFAULT_ROUTING_CONFIG,
  auth:          DEFAULT_AUTH_CONFIG,
  settings:      DEFAULT_PREP_SETTINGS,
  demonstrationOnly: true,
};

// SCENARIO 2: Single signer agreement
export const DRAFT_SINGLE_SIGNER: PreparationDraft = {
  id:            "draft_single_001",
  status:        "review-required",
  workspaceId:   WS_ID,
  createdAt:     "2026-07-14T09:00:00Z",
  updatedAt:     "2026-07-14T09:45:00Z",
  sourceContext: { source: "new" },
  files:         [FILE_NDA],
  details:       { title: "NDA — Example Agreement", description: "Standard confidentiality agreement.", folderId: "fol_001", tagIds: ["tag_002"] },
  participants:  [PAX_MARIA, PAX_CC_RECIPIENT],
  routing:       ROUTING_SINGLE_SIGNER,
  auth:          AUTH_EMAIL_OTP,
  settings:      SETTINGS_STANDARD,
  demonstrationOnly: true,
};

// SCENARIO 3: Sequential professional services agreement
export const DRAFT_SEQUENTIAL_PSA: PreparationDraft = {
  id:            "draft_psa_001",
  status:        "review-required",
  workspaceId:   WS_ID,
  createdAt:     "2026-07-13T14:00:00Z",
  updatedAt:     "2026-07-13T15:30:00Z",
  sourceContext: { source: "new" },
  files:         [FILE_PSA, FILE_SCHEDULE],
  details:       { title: "Professional Services Agreement — Rivera Consulting", description: "Includes fee schedule.", folderId: "fol_001", tagIds: ["tag_001", "tag_002"] },
  participants:  [PAX_ANA_APPROVER, PAX_MARIA, PAX_LENA, PAX_CC_RECIPIENT],
  routing:       ROUTING_SEQUENTIAL_PSA,
  auth:          AUTH_EMAIL_OTP,
  settings:      SETTINGS_STANDARD,
  demonstrationOnly: true,
};

// SCENARIO 4: Parallel acknowledgment
export const DRAFT_PARALLEL_ACK: PreparationDraft = {
  id:            "draft_parallel_001",
  status:        "review-required",
  workspaceId:   WS_ID,
  createdAt:     "2026-07-12T11:00:00Z",
  updatedAt:     "2026-07-12T11:30:00Z",
  sourceContext: { source: "new" },
  files:         [FILE_MOU],
  details:       { title: "Policy Acknowledgment — Q3 2026", description: "", folderId: "fol_003", tagIds: [] },
  participants:  [PAX_ACK_RECIPIENT1, PAX_ACK_RECIPIENT2, PAX_ACK_RECIPIENT3],
  routing:       ROUTING_PARALLEL,
  auth:          AUTH_DEFAULT,
  settings:      DEFAULT_PREP_SETTINGS,
  demonstrationOnly: true,
};

// SCENARIO 5: Approval before signing
export const DRAFT_APPROVAL_SIGN: PreparationDraft = {
  id:            "draft_approval_001",
  status:        "review-required",
  workspaceId:   WS_ID,
  createdAt:     "2026-07-11T13:00:00Z",
  updatedAt:     "2026-07-11T14:00:00Z",
  sourceContext: { source: "new" },
  files:         [FILE_LEASE],
  details:       { title: "Lease Agreement — Harborline Office Space", description: "Requires internal review before signing.", folderId: "fol_002", tagIds: ["tag_001"] },
  participants:  [PAX_TEAM_LEAD, PAX_ANA_APPROVER, PAX_MARIA, PAX_ANTONIO, PAX_CC_RECIPIENT],
  routing:       ROUTING_APPROVAL_THEN_SIGN,
  auth:          AUTH_EMAIL_OTP,
  settings:      SETTINGS_STANDARD,
  demonstrationOnly: true,
};

// SCENARIO 6: Multi-file transaction
export const DRAFT_MULTI_FILE: PreparationDraft = {
  id:            "draft_multi_001",
  status:        "participants-required",
  workspaceId:   WS_ID,
  createdAt:     "2026-07-15T08:00:00Z",
  updatedAt:     "2026-07-15T08:30:00Z",
  sourceContext: { source: "new" },
  files:         [FILE_PSA, FILE_SCHEDULE, FILE_NDA],
  details:       { title: "Engagement Package — Sampaguita Partners", description: "", folderId: "fol_001", tagIds: ["tag_005"] },
  participants:  [],
  routing:       DEFAULT_ROUTING_CONFIG,
  auth:          DEFAULT_AUTH_CONFIG,
  settings:      DEFAULT_PREP_SETTINGS,
  demonstrationOnly: true,
};

// SCENARIO 7: Template-based draft
export const DRAFT_TEMPLATE_BASED: PreparationDraft = {
  id:            "draft_tpl_001",
  status:        "participants-required",
  workspaceId:   WS_ID,
  createdAt:     "2026-07-15T09:00:00Z",
  updatedAt:     "2026-07-15T09:15:00Z",
  sourceContext: { source: "template", templateId: "tpl-engagement-standard" },
  files:         [{ ...FILE_PSA, id: "pf_tpl_001", order: 1 }],
  details:       { title: "Engagement Letter — New Client", description: "From template: Standard Engagement Letter", folderId: null, tagIds: [] },
  participants:  [],
  routing:       DEFAULT_ROUTING_CONFIG,
  auth:          { defaultMethod: "email-otp", perParticipant: {} },
  settings:      SETTINGS_STANDARD,
  demonstrationOnly: true,
};

// SCENARIO 8: Invalid draft (missing title, duplicate email)
export const DRAFT_INVALID: PreparationDraft = {
  id:            "draft_invalid_001",
  status:        "review-required",
  workspaceId:   WS_ID,
  createdAt:     "2026-07-14T16:00:00Z",
  updatedAt:     "2026-07-14T16:30:00Z",
  sourceContext: { source: "new" },
  files:         [FILE_NDA],
  details:       { title: "", description: "", folderId: null, tagIds: [] }, // missing title
  participants:  [
    { ...PAX_MARIA, id: "pp_dup_001" },
    { ...PAX_MARIA, id: "pp_dup_002", name: "Maria Santos 2" }, // duplicate email
  ],
  routing:       {
    mode: "sequential",
    groups: [
      { id: "rg_001", stepNumber: 1, label: "Step 1", participantIds: ["pp_dup_001", "pp_dup_002"], requiredCompletionRule: "all" },
    ],
  },
  auth:          AUTH_DEFAULT,
  settings:      DEFAULT_PREP_SETTINGS,
  demonstrationOnly: true,
};

// SCENARIO 9: Plan-restricted draft
export const DRAFT_PLAN_RESTRICTED: PreparationDraft = {
  id:            "draft_plan_001",
  status:        "authentication-required",
  workspaceId:   WS_ID,
  createdAt:     "2026-07-14T12:00:00Z",
  updatedAt:     "2026-07-14T12:15:00Z",
  sourceContext: { source: "new" },
  files:         [FILE_PSA],
  details:       { title: "Agreement Requiring Advanced Authentication", description: "", folderId: null, tagIds: [] },
  participants:  [PAX_MARIA, PAX_ANTONIO],
  routing:       ROUTING_SINGLE_SIGNER,
  auth:          { defaultMethod: "id-verification", perParticipant: {} }, // planned — will show restriction
  settings:      DEFAULT_PREP_SETTINGS,
  demonstrationOnly: true,
};

// ── Resumable drafts (entry screen) ──────────────────────────────────────────

export const RESUMABLE_DRAFTS: ResumableDraftSummary[] = [
  {
    id:               "draft_psa_001",
    title:            "Professional Services Agreement — Rivera Consulting",
    updatedAt:        "2026-07-13T15:30:00Z",
    status:           "review-required",
    fileCount:        2,
    participantCount: 4,
    nextStep:         "review",
    workspaceId:      WS_ID,
    demonstrationOnly: true,
  },
  {
    id:               "draft_parallel_001",
    title:            "Policy Acknowledgment — Q3 2026",
    updatedAt:        "2026-07-12T11:30:00Z",
    status:           "review-required",
    fileCount:        1,
    participantCount: 3,
    nextStep:         "review",
    workspaceId:      WS_ID,
    demonstrationOnly: true,
  },
  {
    id:               "draft_multi_001",
    title:            "Engagement Package — Sampaguita Partners",
    updatedAt:        "2026-07-15T08:30:00Z",
    status:           "participants-required",
    fileCount:        3,
    participantCount: 0,
    nextStep:         "participants",
    workspaceId:      WS_ID,
    demonstrationOnly: true,
  },
];

// ── Fixture map ───────────────────────────────────────────────────────────────

export const DRAFT_FIXTURES: Record<string, PreparationDraft> = {
  draft_blank_001:    DRAFT_BLANK,
  draft_single_001:   DRAFT_SINGLE_SIGNER,
  draft_psa_001:      DRAFT_SEQUENTIAL_PSA,
  draft_parallel_001: DRAFT_PARALLEL_ACK,
  draft_approval_001: DRAFT_APPROVAL_SIGN,
  draft_multi_001:    DRAFT_MULTI_FILE,
  draft_tpl_001:      DRAFT_TEMPLATE_BASED,
  draft_invalid_001:  DRAFT_INVALID,
  draft_plan_001:     DRAFT_PLAN_RESTRICTED,
};

// ── Mock contacts (for "add from contacts" flow) ──────────────────────────────

export interface MockContact {
  id:           string;
  name:         string;
  email:        string;
  organization: string;
  lastUsedAt:   string;
}

export const MOCK_CONTACTS: MockContact[] = [
  { id: "cnt_001", name: "Maria Santos",      email: "msantos@example.com",       organization: "Rivera Consulting",    lastUsedAt: "2026-07-10" },
  { id: "cnt_002", name: "Antonio Cruz",      email: "acruz@example.com",         organization: "Northbridge Business", lastUsedAt: "2026-07-08" },
  { id: "cnt_003", name: "Lena Torres",       email: "ltorres@harborline.com",    organization: "Harborline Properties", lastUsedAt: "2026-07-05" },
  { id: "cnt_004", name: "Carlo Manalo",      email: "cmanalo@example.com",       organization: "Northbridge Business", lastUsedAt: "2026-06-30" },
  { id: "cnt_005", name: "Paulo Dela Cruz",   email: "pdelacruz@example.com",     organization: "Example Corp",         lastUsedAt: "2026-06-25" },
  { id: "cnt_006", name: "Rosa Ignacio",      email: "rignacio@example.com",      organization: "Example Corp",         lastUsedAt: "2026-06-20" },
];

// ── Mock templates ────────────────────────────────────────────────────────────

export interface MockTemplateSummary {
  id:          string;
  name:        string;
  description: string;
  roleCount:   number;
  fileCount:   number;
}

export const MOCK_TEMPLATES: MockTemplateSummary[] = [
  { id: "tpl-engagement-standard",  name: "Standard Engagement Letter",  description: "One signer, expiration enabled, email OTP.", roleCount: 1, fileCount: 1 },
  { id: "tpl-nda-bilateral",        name: "Bilateral NDA",               description: "Two signers, sequential, copy recipient.",  roleCount: 2, fileCount: 1 },
  { id: "tpl-lease-internal-review", name: "Lease with Internal Review", description: "Reviewer then two signers, approval-based.", roleCount: 3, fileCount: 1 },
];
