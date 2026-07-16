// Deterministic fixture contacts for the LAGDA Contacts module.
// All names, organizations, emails, and usage data are entirely fictional.
// Reserved example.com domains only. No real individuals, customers, or competitors.
// demonstrationOnly: true on every record.

import type {
  Contact,
  ContactId,
  ContactTagId,
  ContactGroupId,
  ContactGroup,
  ContactUsageSummary,
  ContactImportPreview,
  ContactImportRow,
  ContactListItem,
} from "../../models/contacts";

// ── Workspace / owner constants ───────────────────────────────────────────────

const WS_ID    = "ws_northbridge_001";
const OWNER_ID = "user_ana_reyes_001";

// ── Tag IDs ───────────────────────────────────────────────────────────────────

const T_CLIENT     = "tag-client"      as ContactTagId;
const T_VENDOR     = "tag-vendor"      as ContactTagId;
const T_INTERNAL   = "tag-internal"    as ContactTagId;
const T_LEGAL      = "tag-legal"       as ContactTagId;
const T_HR         = "tag-hr"          as ContactTagId;
const T_APPROVER   = "tag-approver"    as ContactTagId;
const T_REVIEWER   = "tag-reviewer"    as ContactTagId;
const T_SIGNER     = "tag-signer"      as ContactTagId;
const T_ACK        = "tag-ack"         as ContactTagId;
const T_PROCUREMENT = "tag-procurement" as ContactTagId;

// ── Group IDs ─────────────────────────────────────────────────────────────────

export const GRP_CLIENTS       = "grp-clients"         as ContactGroupId;
export const GRP_VENDORS       = "grp-vendors"         as ContactGroupId;
export const GRP_INTERNAL      = "grp-internal-reviewers" as ContactGroupId;
export const GRP_HR            = "grp-hr-participants" as ContactGroupId;
export const GRP_PROCUREMENT   = "grp-procurement-approvers" as ContactGroupId;
export const GRP_EXTERNAL      = "grp-external-signers" as ContactGroupId;

// ── Contact ID constants ──────────────────────────────────────────────────────

export const CID_ANA         = "contact-ana-reyes"              as ContactId;
export const CID_MARCO       = "contact-marco-santos"           as ContactId;
export const CID_LEA         = "contact-lea-cruz"               as ContactId;
export const CID_DANIEL      = "contact-daniel-lim"             as ContactId;
export const CID_SOFIA       = "contact-sofia-navarro"          as ContactId;
export const CID_EMILIO      = "contact-emilio-garcia-archived" as ContactId;
export const CID_MARCO_ALT   = "contact-marco-santos-alt"       as ContactId;
export const CID_INVALID     = "contact-invalid-email"          as ContactId;

// ── Core fixture contacts ─────────────────────────────────────────────────────

export const CONTACT_ANA_REYES: Contact = {
  id:           CID_ANA,
  status:       "active",
  scope:        "workspace",
  source:       "fixture",
  workspaceId:  WS_ID,
  ownerId:      OWNER_ID,
  name:         "Ana Reyes",
  email:        "ana.reyes@example.com",
  phone:        "+63 917 555 0101",
  organization: "Mabini Legal Solutions",
  title:        "Senior Legal Counsel",
  tagIds:       [T_LEGAL, T_APPROVER],
  groupIds:     [GRP_CLIENTS, GRP_INTERNAL],
  note:         "Primary contact for Mabini Legal engagement work.",
  createdAt:    "2026-05-01T09:00:00Z",
  updatedAt:    "2026-07-14T11:30:00Z",
  lastUsedAt:   "2026-07-14T11:30:00Z",
  usageCount:   14,
  demonstrationOnly: true,
};

export const CONTACT_MARCO_SANTOS: Contact = {
  id:           CID_MARCO,
  status:       "active",
  scope:        "workspace",
  source:       "fixture",
  workspaceId:  WS_ID,
  ownerId:      OWNER_ID,
  name:         "Marco Santos",
  email:        "marco.santos@example.com",
  phone:        "+63 918 555 0202",
  organization: "Santos Advisory Group",
  title:        "Managing Consultant",
  tagIds:       [T_CLIENT, T_SIGNER],
  groupIds:     [GRP_CLIENTS, GRP_EXTERNAL],
  createdAt:    "2026-04-15T10:00:00Z",
  updatedAt:    "2026-07-10T09:00:00Z",
  lastUsedAt:   "2026-07-10T09:00:00Z",
  usageCount:   22,
  demonstrationOnly: true,
};

export const CONTACT_LEA_CRUZ: Contact = {
  id:           CID_LEA,
  status:       "active",
  scope:        "personal",
  source:       "manually-created",
  workspaceId:  WS_ID,
  ownerId:      OWNER_ID,
  name:         "Lea Cruz",
  email:        "lea.cruz@example.com",
  organization: "Cruz & Co.",
  title:        "Operations Director",
  tagIds:       [T_VENDOR, T_SIGNER],
  groupIds:     [GRP_VENDORS],
  createdAt:    "2026-05-20T14:00:00Z",
  updatedAt:    "2026-06-30T10:00:00Z",
  lastUsedAt:   "2026-06-28T15:00:00Z",
  usageCount:   8,
  demonstrationOnly: true,
};

export const CONTACT_DANIEL_LIM: Contact = {
  id:           CID_DANIEL,
  status:       "active",
  scope:        "workspace",
  source:       "fixture",
  workspaceId:  WS_ID,
  ownerId:      OWNER_ID,
  name:         "Daniel Lim",
  email:        "daniel.lim@example.com",
  organization: "Mabini Legal Solutions",
  title:        "Compliance Reviewer",
  tagIds:       [T_INTERNAL, T_REVIEWER],
  groupIds:     [GRP_INTERNAL],
  createdAt:    "2026-05-10T08:00:00Z",
  updatedAt:    "2026-07-01T14:00:00Z",
  lastUsedAt:   "2026-07-01T14:00:00Z",
  usageCount:   11,
  demonstrationOnly: true,
};

export const CONTACT_SOFIA_NAVARRO: Contact = {
  id:           CID_SOFIA,
  status:       "active",
  scope:        "workspace",
  source:       "fixture",
  workspaceId:  WS_ID,
  ownerId:      OWNER_ID,
  name:         "Sofia Navarro",
  email:        "sofia.navarro@example.com",
  phone:        "+63 999 555 0505",
  organization: "Navarro Holdings",
  title:        "Human Resources Manager",
  tagIds:       [T_HR, T_ACK],
  groupIds:     [GRP_HR],
  createdAt:    "2026-06-01T09:30:00Z",
  updatedAt:    "2026-07-05T11:00:00Z",
  lastUsedAt:   "2026-07-05T11:00:00Z",
  usageCount:   7,
  demonstrationOnly: true,
};

export const CONTACT_EMILIO_ARCHIVED: Contact = {
  id:           CID_EMILIO,
  status:       "archived",
  scope:        "personal",
  source:       "fixture",
  workspaceId:  WS_ID,
  ownerId:      OWNER_ID,
  name:         "Emilio Garcia",
  email:        "emilio.garcia@example.com",
  organization: "Garcia & Partners",
  title:        "Associate",
  tagIds:       [T_CLIENT],
  groupIds:     [],
  createdAt:    "2026-03-01T09:00:00Z",
  updatedAt:    "2026-05-15T16:00:00Z",
  lastUsedAt:   "2026-05-10T10:00:00Z",
  usageCount:   3,
  demonstrationOnly: true,
};

export const CONTACT_MARCO_ALT: Contact = {
  id:           CID_MARCO_ALT,
  status:       "active",
  scope:        "workspace",
  source:       "fictional-import-review",
  workspaceId:  WS_ID,
  ownerId:      OWNER_ID,
  name:         "Marco G. Santos",
  email:        "marco.santos@example.com", // same email — potential duplicate
  organization: "Santos Advisory Services", // slightly different org name
  title:        "Senior Consultant",
  tagIds:       [T_CLIENT],
  groupIds:     [GRP_EXTERNAL],
  createdAt:    "2026-07-01T12:00:00Z",
  updatedAt:    "2026-07-01T12:00:00Z",
  lastUsedAt:   undefined,
  usageCount:   0,
  demonstrationOnly: true,
};

export const CONTACT_INVALID_EMAIL: Contact = {
  id:           CID_INVALID,
  status:       "invalid",
  scope:        "personal",
  source:       "manually-created",
  workspaceId:  WS_ID,
  ownerId:      OWNER_ID,
  name:         "Roberto Alvarez",
  email:        "roberto.alvarez@@example.com", // intentionally invalid
  organization: "Alvarez Realty",
  title:        "Property Manager",
  tagIds:       [],
  groupIds:     [],
  createdAt:    "2026-07-10T15:00:00Z",
  updatedAt:    "2026-07-10T15:00:00Z",
  lastUsedAt:   undefined,
  usageCount:   0,
  demonstrationOnly: true,
};

// ── Groups ────────────────────────────────────────────────────────────────────

export const CONTACT_GROUPS: ContactGroup[] = [
  {
    id:          GRP_CLIENTS,
    name:        "Clients",
    description: "External client contacts used for signing engagements.",
    scope:       "workspace",
    workspaceId: WS_ID,
    contactIds:  [CID_ANA, CID_MARCO],
    status:      "active",
    createdAt:   "2026-04-01T09:00:00Z",
    updatedAt:   "2026-07-10T09:00:00Z",
    demonstrationOnly: true,
  },
  {
    id:          GRP_VENDORS,
    name:        "Vendors",
    description: "Vendor and supplier contacts.",
    scope:       "workspace",
    workspaceId: WS_ID,
    contactIds:  [CID_LEA],
    status:      "active",
    createdAt:   "2026-05-20T14:00:00Z",
    updatedAt:   "2026-06-30T10:00:00Z",
    demonstrationOnly: true,
  },
  {
    id:          GRP_INTERNAL,
    name:        "Internal Reviewers",
    description: "Internal staff who review and approve documents.",
    scope:       "workspace",
    workspaceId: WS_ID,
    contactIds:  [CID_ANA, CID_DANIEL],
    status:      "active",
    createdAt:   "2026-05-10T08:00:00Z",
    updatedAt:   "2026-07-01T14:00:00Z",
    demonstrationOnly: true,
  },
  {
    id:          GRP_HR,
    name:        "HR Participants",
    description: "Human resources contacts for onboarding and policy acknowledgment.",
    scope:       "workspace",
    workspaceId: WS_ID,
    contactIds:  [CID_SOFIA],
    status:      "active",
    createdAt:   "2026-06-01T09:30:00Z",
    updatedAt:   "2026-07-05T11:00:00Z",
    demonstrationOnly: true,
  },
  {
    id:          GRP_PROCUREMENT,
    name:        "Procurement Approvers",
    description: "Contacts for procurement approval workflows.",
    scope:       "workspace",
    workspaceId: WS_ID,
    contactIds:  [CID_DANIEL],
    status:      "active",
    createdAt:   "2026-06-15T10:00:00Z",
    updatedAt:   "2026-07-02T09:00:00Z",
    demonstrationOnly: true,
  },
  {
    id:          GRP_EXTERNAL,
    name:        "External Signers",
    description: "External parties invited as signers on active transactions.",
    scope:       "workspace",
    workspaceId: WS_ID,
    contactIds:  [CID_MARCO, CID_MARCO_ALT, CID_LEA],
    status:      "active",
    createdAt:   "2026-04-20T11:00:00Z",
    updatedAt:   "2026-07-10T09:00:00Z",
    demonstrationOnly: true,
  },
];

// ── Usage summaries ───────────────────────────────────────────────────────────

export const CONTACT_USAGE_SUMMARIES: Record<ContactId, ContactUsageSummary> = {
  [CID_ANA]: {
    contactId:         CID_ANA,
    totalTransactions: 14,
    totalTemplates:    3,
    totalDrafts:       2,
    roleHistory: [
      { role: "approver", count: 10, lastUsedAt: "2026-07-14T11:30:00Z", sampleTransactionTitle: "Professional Services Agreement — Rivera Consulting" },
      { role: "reviewer", count: 4,  lastUsedAt: "2026-07-01T14:00:00Z", sampleTransactionTitle: "Lease Agreement — Harborline Office Space" },
    ],
    mostFrequentRole: "approver",
    lastUsedAt:       "2026-07-14T11:30:00Z",
    demonstrationOnly: true,
  },
  [CID_MARCO]: {
    contactId:         CID_MARCO,
    totalTransactions: 22,
    totalTemplates:    5,
    totalDrafts:       1,
    roleHistory: [
      { role: "signer",   count: 18, lastUsedAt: "2026-07-10T09:00:00Z", sampleTransactionTitle: "Vendor Agreement — Santos Advisory Group" },
      { role: "approver", count: 4,  lastUsedAt: "2026-06-15T09:00:00Z", sampleTransactionTitle: "Client Engagement Agreement" },
    ],
    mostFrequentRole: "signer",
    lastUsedAt:       "2026-07-10T09:00:00Z",
    demonstrationOnly: true,
  },
  [CID_LEA]: {
    contactId:         CID_LEA,
    totalTransactions: 8,
    totalTemplates:    2,
    totalDrafts:       0,
    roleHistory: [
      { role: "signer", count: 8, lastUsedAt: "2026-06-28T15:00:00Z", sampleTransactionTitle: "Service Contract — Cruz & Co." },
    ],
    mostFrequentRole: "signer",
    lastUsedAt:       "2026-06-28T15:00:00Z",
    demonstrationOnly: true,
  },
  [CID_DANIEL]: {
    contactId:         CID_DANIEL,
    totalTransactions: 11,
    totalTemplates:    4,
    totalDrafts:       1,
    roleHistory: [
      { role: "reviewer", count: 9, lastUsedAt: "2026-07-01T14:00:00Z", sampleTransactionTitle: "Procurement Approval Chain" },
      { role: "approver", count: 2, lastUsedAt: "2026-06-20T10:00:00Z", sampleTransactionTitle: "Policy Acknowledgment Form" },
    ],
    mostFrequentRole: "reviewer",
    lastUsedAt:       "2026-07-01T14:00:00Z",
    demonstrationOnly: true,
  },
  [CID_SOFIA]: {
    contactId:         CID_SOFIA,
    totalTransactions: 7,
    totalTemplates:    2,
    totalDrafts:       0,
    roleHistory: [
      { role: "acknowledgment-recipient", count: 7, lastUsedAt: "2026-07-05T11:00:00Z", sampleTransactionTitle: "Policy Acknowledgment — Q3 2026" },
    ],
    mostFrequentRole: "acknowledgment-recipient",
    lastUsedAt:       "2026-07-05T11:00:00Z",
    demonstrationOnly: true,
  },
  [CID_EMILIO]: {
    contactId:         CID_EMILIO,
    totalTransactions: 3,
    totalTemplates:    0,
    totalDrafts:       0,
    roleHistory: [
      { role: "signer", count: 3, lastUsedAt: "2026-05-10T10:00:00Z", sampleTransactionTitle: "Service Agreement — Garcia & Partners" },
    ],
    mostFrequentRole: "signer",
    lastUsedAt:       "2026-05-10T10:00:00Z",
    demonstrationOnly: true,
  },
  [CID_MARCO_ALT]: {
    contactId:         CID_MARCO_ALT,
    totalTransactions: 0,
    totalTemplates:    0,
    totalDrafts:       0,
    roleHistory:       [],
    demonstrationOnly: true,
  },
  [CID_INVALID]: {
    contactId:         CID_INVALID,
    totalTransactions: 0,
    totalTemplates:    0,
    totalDrafts:       0,
    roleHistory:       [],
    demonstrationOnly: true,
  },
};

// ── All base fixtures ─────────────────────────────────────────────────────────

export const ALL_BASE_CONTACTS: Contact[] = [
  CONTACT_ANA_REYES,
  CONTACT_MARCO_SANTOS,
  CONTACT_LEA_CRUZ,
  CONTACT_DANIEL_LIM,
  CONTACT_SOFIA_NAVARRO,
  CONTACT_EMILIO_ARCHIVED,
  CONTACT_MARCO_ALT,
  CONTACT_INVALID_EMAIL,
];

export function getMockContact(id: ContactId): Contact | undefined {
  return ALL_BASE_CONTACTS.find(c => c.id === id);
}

export function toListItem(c: Contact): ContactListItem {
  return {
    id:           c.id,
    status:       c.status,
    scope:        c.scope,
    name:         c.name,
    email:        c.email,
    phone:        c.phone,
    organization: c.organization,
    title:        c.title,
    tagIds:       c.tagIds,
    groupIds:     c.groupIds,
    lastUsedAt:   c.lastUsedAt,
    usageCount:   c.usageCount,
    updatedAt:    c.updatedAt,
    workspaceId:  c.workspaceId,
    demonstrationOnly: c.demonstrationOnly,
  };
}

// ── Import preview fixtures ───────────────────────────────────────────────────

const IMPORT_ROWS: ContactImportRow[] = [
  {
    rowNumber:     1,
    name:          "Patricia Soriano",
    email:         "p.soriano@example.com",
    organization:  "Soriano Law Office",
    title:         "Managing Partner",
    scope:         "workspace",
    rawTags:       "Legal, Client",
    status:        "valid-new",
    issues:        [],
    proposedAction: "include",
  },
  {
    rowNumber:     2,
    name:          "Marco G. Santos",
    email:         "marco.santos@example.com",
    organization:  "Santos Advisory Group",
    title:         "Managing Consultant",
    scope:         "workspace",
    rawTags:       "Client",
    status:        "duplicate",
    issues:        [{ field: "email", message: "Email matches existing contact: Marco Santos (workspace)." }],
    proposedAction: "review",
    matchingContactId: CID_MARCO,
  },
  {
    rowNumber:     3,
    name:          "Luis Bautista",
    email:         "l.bautista@@invalid", // intentionally broken
    organization:  "Bautista Holdings",
    title:         "CFO",
    scope:         "workspace",
    rawTags:       "Finance",
    status:        "invalid-email",
    issues:        [{ field: "email", message: "Email address format is not valid." }],
    proposedAction: "exclude",
  },
  {
    rowNumber:     4,
    name:          "",
    email:         "unnamed.person@example.com",
    organization:  "Unknown Corp",
    scope:         "workspace",
    rawTags:       "",
    status:        "missing-name",
    issues:        [{ field: "name", message: "Full name is required." }],
    proposedAction: "exclude",
  },
  {
    rowNumber:     5,
    name:          "Renata Villanueva",
    email:         "r.villanueva@example.com",
    organization:  "Villanueva Procurement",
    title:         "Procurement Lead",
    scope:         "workspace",
    rawTags:       "Procurement, Future-Tag",
    status:        "unknown-tag",
    issues:        [{ field: "tags", message: "Tag 'Future-Tag' is not recognized. Row will import without it." }],
    proposedAction: "include",
  },
  {
    rowNumber:     6,
    name:          "Jose Mendoza",
    email:         "jose.mendoza@example.com",
    organization:  "Mendoza & Associates",
    title:         "Senior Associate",
    scope:         "organization", // not a valid scope
    rawTags:       "Legal",
    status:        "invalid-scope",
    issues:        [{ field: "scope", message: "Scope 'organization' is not supported. Valid values: personal, workspace." }],
    proposedAction: "exclude",
  },
  {
    rowNumber:     7,
    name:          "Carmela Tan",
    email:         "carmela.tan@example.com",
    organization:  "Tan Holdings",
    title:         "HR Director",
    scope:         "personal",
    rawTags:       "HR",
    status:        "valid-new",
    issues:        [],
    proposedAction: "include",
  },
];

export const MOCK_IMPORT_PREVIEW: ContactImportPreview = {
  rows:               IMPORT_ROWS,
  validCount:         3,
  duplicateCount:     1,
  invalidCount:       3,
  demonstrationOnly:  true,
};
