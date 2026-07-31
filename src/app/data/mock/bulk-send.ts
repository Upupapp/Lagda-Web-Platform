// Bulk Send deterministic fixtures — Command 33.
//
// All names, organizations, and email direction are fictional and use reserved
// example domains. No real customer data, no signatures, no evidence, no eNotary.
// Nothing here is persisted; the service deep-copies these on reset.

import type {
  BulkSendBatch,
  BulkSendRecipientRow,
  BulkSendSavedConfiguration,
  BulkSendSourceColumn,
  BulkSendSourceSchema,
  BulkSendRecipientRowSource,
  BulkSendBatchStatus,
} from "../../models/bulk-send";
import {
  bulkSendBatchId, bulkSendColumnId, bulkSendConfigId, bulkSendRowId,
  EMPTY_VALIDATION_SUMMARY, normalizeHeader,
} from "../../models/bulk-send";

// ── Column helper ─────────────────────────────────────────────────────────────

function col(id: string, header: string, index: number, samples: string[]): BulkSendSourceColumn {
  return {
    id: bulkSendColumnId(id),
    header,
    normalizedHeader: normalizeHeader(header),
    index,
    sampleValues: samples.slice(0, 3),
    duplicateHeader: false,
  };
}

function schema(
  columns: BulkSendSourceColumn[],
  rowCount: number,
  source: BulkSendRecipientRowSource,
  extra: Partial<BulkSendSourceSchema> = {},
): BulkSendSourceSchema {
  return {
    columns, rowCount, source,
    fileNameDirection: null, fileSizeBytes: null, detectedDelimiter: null,
    headerDetected: true, parseWarnings: [],
    ...extra,
  };
}

function row(
  batchId: string,
  id: string,
  rowNumber: number,
  values: Record<string, string>,
  extra: Partial<BulkSendRecipientRow> = {},
): BulkSendRecipientRow {
  return {
    id: bulkSendRowId(id),
    batchId: bulkSendBatchId(batchId),
    rowNumber,
    source: extra.source ?? "deterministic-fixture",
    contactId: extra.contactId ?? null,
    contactGroupId: extra.contactGroupId ?? null,
    values,
    originalValues: { ...values },
    status: extra.status ?? "ready-in-demonstration",
    excluded: extra.excluded ?? false,
    exclusionReason: extra.exclusionReason ?? null,
    projectionId: extra.projectionId ?? null,
    duplicateGroupKey: extra.duplicateGroupKey ?? null,
    editedInSession: false,
  };
}

function baseBatch(
  id: string,
  name: string,
  status: BulkSendBatchStatus,
  templateId: string,
  templateName: string,
  extra: Partial<BulkSendBatch> = {},
): BulkSendBatch {
  return {
    id: bulkSendBatchId(id),
    name,
    status,
    scope: {
      workspaceId: "ws_mls_001",
      workspaceName: "Mabini Legal Solutions",
      teamId: extra.scope?.teamId ?? null,
      teamName: extra.scope?.teamName ?? null,
      senderId: "wm_ana",
      senderName: "Ana Reyes",
    },
    templateId: templateId as BulkSendBatch["templateId"],
    templateName,
    templateArchived: false,
    schema: null,
    rows: [],
    roleMappings: [],
    variableMappings: [],
    defaults: null,
    organization: {
      folderId: null, folderName: null, tagIds: [], tagNames: [],
      folderArchived: false, archivedTagNames: [],
    },
    policy: { policyId: null, policyName: null, stale: false, appliedValues: [] },
    automation: { ruleId: null, ruleName: null, stale: false, projectedActions: [], conflicts: [] },
    validation: { ...EMPTY_VALIDATION_SUMMARY },
    duplicates: [],
    results: null,
    appliedConfigurationId: null,
    createdAtDemonstration: "2026-07-20T09:00:00Z",
    updatedAtDemonstration: "2026-07-20T09:00:00Z",
    demonstrationOnly: true,
    ...extra,
  };
}

// ── Shared column sets ────────────────────────────────────────────────────────

const ENGAGEMENT_COLUMNS = [
  col("c_eng_name",  "Client Name",   0, ["Maria Santos", "Antonio Cruz", "Rosa Villanueva"]),
  col("c_eng_email", "Email",         1, ["m****@example.com", "a****@example.com"]),
  col("c_eng_org",   "Company",       2, ["Mabini Business Services", "Harborline Properties"]),
  col("c_eng_firm",  "Firm Name",     3, ["Northbridge Legal"]),
  col("c_eng_matter","Matter",        4, ["Corporate Restructuring Advisory"]),
  col("c_eng_date",  "Effective Date",5, ["2026-08-01"]),
];

const POLICY_COLUMNS = [
  col("c_pol_name",  "Employee Name", 0, ["Luis Bautista", "Rina Evangelista"]),
  col("c_pol_email", "Email",         1, ["l****@example.com"]),
  col("c_pol_dept",  "Department",    2, ["Finance", "Operations"]),
  col("c_pol_policy","Policy Name",   3, ["Code of Conduct 2026"]),
  col("c_pol_date",  "Effective Date",4, ["2026-08-15"]),
];

const VENDOR_COLUMNS = [
  col("c_ven_name",   "Vendor Contact", 0, ["Jose Reyes"]),
  col("c_ven_email",  "Email",          1, ["j****@example.com"]),
  col("c_ven_company","Vendor Company", 2, ["Acme Supplies Inc."]),
  col("c_ven_scope",  "Service Scope",  3, ["IT infrastructure maintenance"]),
  col("c_ven_date",   "Effective Date", 4, ["2026-09-01"]),
];

// ── 1. Valid service agreement batch — ready in demonstration ─────────────────

const BATCH_READY = baseBatch(
  "bsb_ready", "Q3 Engagement Letters", "ready-in-demonstration",
  "tpl-engagement-standard", "Engagement Letter — Standard",
  {
    schema: schema(ENGAGEMENT_COLUMNS, 4, "deterministic-fixture"),
    createdAtDemonstration: "2026-07-18T08:30:00Z",
    updatedAtDemonstration: "2026-07-20T10:15:00Z",
    rows: [
      row("bsb_ready", "bsr_r1", 1, {
        c_eng_name: "Maria Santos", c_eng_email: "maria.santos@example.com",
        c_eng_org: "Mabini Business Services", c_eng_firm: "Northbridge Legal",
        c_eng_matter: "Corporate Restructuring Advisory", c_eng_date: "2026-08-01",
      }),
      row("bsb_ready", "bsr_r2", 2, {
        c_eng_name: "Antonio Cruz", c_eng_email: "antonio.cruz@example.com",
        c_eng_org: "Harborline Properties", c_eng_firm: "Northbridge Legal",
        c_eng_matter: "Lease Portfolio Review", c_eng_date: "2026-08-01",
      }),
      row("bsb_ready", "bsr_r3", 3, {
        c_eng_name: "Rosa Villanueva", c_eng_email: "rosa.villanueva@example.com",
        c_eng_org: "Sampaguita Learning Institute", c_eng_firm: "Northbridge Legal",
        c_eng_matter: "Faculty Policy Advisory", c_eng_date: "2026-08-05",
      }),
      row("bsb_ready", "bsr_r4", 4, {
        c_eng_name: "Teodoro Lim", c_eng_email: "teodoro.lim@example.com",
        c_eng_org: "Mabini Business Services", c_eng_firm: "Northbridge Legal",
        c_eng_matter: "Shareholder Agreement Review", c_eng_date: "2026-08-05",
      }),
    ],
  },
);

// ── 2. Employee acknowledgment batch — warnings ───────────────────────────────

const BATCH_ACK = baseBatch(
  "bsb_ack", "Code of Conduct 2026 Acknowledgment", "needs-review",
  "tpl-policy-acknowledgment", "Policy Acknowledgment",
  {
    scope: {
      workspaceId: "ws_mls_001", workspaceName: "Mabini Legal Solutions",
      teamId: "team_hr", teamName: "Human Resources",
      senderId: "wm_ana", senderName: "Ana Reyes",
    },
    schema: schema(POLICY_COLUMNS, 4, "contact-group"),
    createdAtDemonstration: "2026-07-19T11:00:00Z",
    updatedAtDemonstration: "2026-07-21T09:40:00Z",
    rows: [
      row("bsb_ack", "bsa_r1", 1, {
        c_pol_name: "Luis Bautista", c_pol_email: "luis.bautista@example.com",
        c_pol_dept: "Finance", c_pol_policy: "Code of Conduct 2026", c_pol_date: "2026-08-15",
      }, { source: "contact-group", contactId: "ct_luis", contactGroupId: "cg_all_staff" }),
      row("bsb_ack", "bsa_r2", 2, {
        c_pol_name: "Rina Evangelista", c_pol_email: "rina.evangelista@example.com",
        c_pol_dept: "Operations", c_pol_policy: "Code of Conduct 2026", c_pol_date: "2026-08-15",
      }, { source: "contact-group", contactId: "ct_rina", contactGroupId: "cg_all_staff" }),
      // Archived contact -> warning, still eligible after review.
      row("bsb_ack", "bsa_r3", 3, {
        c_pol_name: "Teodoro Salazar", c_pol_email: "teodoro.salazar@example.com",
        c_pol_dept: "Operations", c_pol_policy: "Code of Conduct 2026", c_pol_date: "2026-08-15",
      }, { source: "contact-group", contactId: "ct_archived_teodoro", contactGroupId: "cg_all_staff" }),
      // Missing department (optional variable) but complete required values.
      row("bsb_ack", "bsa_r4", 4, {
        c_pol_name: "Carmen Ocampo", c_pol_email: "carmen.ocampo@example.com",
        c_pol_dept: "", c_pol_policy: "Code of Conduct 2026", c_pol_date: "2026-08-15",
      }, { source: "contact-group", contactId: "ct_carmen", contactGroupId: "cg_all_staff" }),
    ],
  },
);

// ── 3. Missing values + duplicates + invalid email ────────────────────────────

const BATCH_ISSUES = baseBatch(
  "bsb_issues", "Vendor Renewals — Draft", "needs-review",
  "tpl-vendor-agreement", "Vendor Services Agreement",
  {
    schema: schema(VENDOR_COLUMNS, 6, "local-csv-preview", {
      fileNameDirection: "vendor-renewals.csv",
      fileSizeBytes: 1_842,
      detectedDelimiter: ",",
      parseWarnings: ["2 rows have a different number of columns. Missing cells are treated as empty."],
    }),
    createdAtDemonstration: "2026-07-21T14:00:00Z",
    updatedAtDemonstration: "2026-07-22T08:20:00Z",
    rows: [
      row("bsb_issues", "bsi_r1", 1, {
        c_ven_name: "Jose Reyes", c_ven_email: "jose.reyes@example.com",
        c_ven_company: "Acme Supplies Inc.", c_ven_scope: "IT infrastructure maintenance",
        c_ven_date: "2026-09-01",
      }, { source: "local-csv-preview" }),
      // Duplicate of row 1.
      row("bsb_issues", "bsi_r2", 2, {
        c_ven_name: "Jose Reyes", c_ven_email: "jose.reyes@example.com",
        c_ven_company: "Acme Supplies Inc.", c_ven_scope: "IT infrastructure maintenance",
        c_ven_date: "2026-09-01",
      }, { source: "local-csv-preview" }),
      // Invalid email direction.
      row("bsb_issues", "bsi_r3", 3, {
        c_ven_name: "Beatriz Ocampo", c_ven_email: "beatriz.ocampo@@example",
        c_ven_company: "Southgate Partners", c_ven_scope: "Facilities management",
        c_ven_date: "2026-09-01",
      }, { source: "local-csv-preview" }),
      // Missing required name.
      row("bsb_issues", "bsi_r4", 4, {
        c_ven_name: "", c_ven_email: "procurement@example.com",
        c_ven_company: "Harborline Properties", c_ven_scope: "Security services",
        c_ven_date: "2026-09-01",
      }, { source: "local-csv-preview" }),
      // Missing required variable (service scope).
      row("bsb_issues", "bsi_r5", 5, {
        c_ven_name: "Ramon Aquino", c_ven_email: "ramon.aquino@example.com",
        c_ven_company: "Northwind Logistics", c_ven_scope: "", c_ven_date: "2026-09-01",
      }, { source: "local-csv-preview" }),
      // Formula-like value already neutralised by the parser.
      row("bsb_issues", "bsi_r6", 6, {
        c_ven_name: "Elena Marquez", c_ven_email: "elena.marquez@example.com",
        c_ven_company: "'=SUM(A1:A9)", c_ven_scope: "Printing and reprographics",
        c_ven_date: "2026-09-01",
      }, { source: "local-csv-preview" }),
    ],
  },
);

// ── 4. Partially projected batch ──────────────────────────────────────────────

const BATCH_PARTIAL = baseBatch(
  "bsb_partial", "Procurement Approvals — July", "partially-projected",
  "tpl-vendor-agreement", "Vendor Services Agreement",
  {
    scope: {
      workspaceId: "ws_mls_001", workspaceName: "Mabini Legal Solutions",
      teamId: "team_procurement", teamName: "Procurement",
      senderId: "wm_ana", senderName: "Ana Reyes",
    },
    schema: schema(VENDOR_COLUMNS, 3, "contact"),
    createdAtDemonstration: "2026-07-15T10:00:00Z",
    updatedAtDemonstration: "2026-07-16T16:45:00Z",
    rows: [
      row("bsb_partial", "bsp_r1", 1, {
        c_ven_name: "Jose Reyes", c_ven_email: "jose.reyes@example.com",
        c_ven_company: "Acme Supplies Inc.", c_ven_scope: "IT support",
        c_ven_date: "2026-08-01",
      }, { source: "contact", contactId: "ct_jose", status: "draft-projection-created" }),
      row("bsb_partial", "bsp_r2", 2, {
        c_ven_name: "Remedios Santos", c_ven_email: "remedios.santos@example.com",
        c_ven_company: "Sampaguita Supplies", c_ven_scope: "Office supplies",
        c_ven_date: "2026-08-01",
      }, { source: "contact", contactId: "ct_remedios", status: "draft-projection-created" }),
      row("bsb_partial", "bsp_r3", 3, {
        c_ven_name: "Beatriz Ocampo", c_ven_email: "beatriz.ocampo@example.com",
        c_ven_company: "Southgate Partners", c_ven_scope: "Consulting",
        c_ven_date: "2026-08-01",
      }, { source: "contact", contactId: "ct_other_ws", excluded: true,
           exclusionReason: "Excluded during review — Contact is outside the current Workspace." }),
    ],
  },
);

// ── 5. Empty draft batch — exercises the recipient-source picker ───────────────

const BATCH_DRAFT = baseBatch(
  "bsb_draft", "New Client Onboarding", "draft",
  "tpl-engagement-standard", "Engagement Letter — Standard",
  {
    createdAtDemonstration: "2026-07-22T13:00:00Z",
    updatedAtDemonstration: "2026-07-22T13:00:00Z",
  },
);

// ── 6. Archived batch — read-only reference ───────────────────────────────────

const BATCH_ARCHIVED = baseBatch(
  "bsb_archived", "Q2 Engagement Letters", "archived",
  "tpl-engagement-standard", "Engagement Letter — Standard",
  {
    schema: schema(ENGAGEMENT_COLUMNS, 2, "deterministic-fixture"),
    createdAtDemonstration: "2026-04-02T09:00:00Z",
    updatedAtDemonstration: "2026-06-30T17:00:00Z",
    rows: [
      row("bsb_archived", "bsx_r1", 1, {
        c_eng_name: "Maria Santos", c_eng_email: "maria.santos@example.com",
        c_eng_org: "Mabini Business Services", c_eng_firm: "Northbridge Legal",
        c_eng_matter: "Annual Retainer", c_eng_date: "2026-04-01",
      }, { status: "draft-projection-created" }),
      row("bsb_archived", "bsx_r2", 2, {
        c_eng_name: "Antonio Cruz", c_eng_email: "antonio.cruz@example.com",
        c_eng_org: "Harborline Properties", c_eng_firm: "Northbridge Legal",
        c_eng_matter: "Annual Retainer", c_eng_date: "2026-04-01",
      }, { status: "draft-projection-created" }),
    ],
  },
);

export const BULK_SEND_BATCH_FIXTURES: BulkSendBatch[] = [
  BATCH_READY, BATCH_ACK, BATCH_ISSUES, BATCH_PARTIAL, BATCH_DRAFT, BATCH_ARCHIVED,
];

export const VALID_BATCH_IDS: ReadonlySet<string> = new Set(
  BULK_SEND_BATCH_FIXTURES.map(b => String(b.id)),
);

// ── Contacts that are archived or out of scope, used by validation ────────────

export const ARCHIVED_CONTACT_IDS: ReadonlySet<string> = new Set(["ct_archived_teodoro"]);
export const RESTRICTED_CONTACT_IDS: ReadonlySet<string> = new Set(["ct_other_ws"]);

// ── Saved configurations ──────────────────────────────────────────────────────

function config(
  id: string, name: string, status: BulkSendSavedConfiguration["status"],
  templateId: string, templateName: string,
  extra: Partial<BulkSendSavedConfiguration> = {},
): BulkSendSavedConfiguration {
  return {
    id: bulkSendConfigId(id),
    name, status,
    templateId: templateId,
    templateName,
    teamId: null, teamName: null,
    roleMappings: [], variableMappings: [],
    defaults: null,
    organization: {
      folderId: null, folderName: null, tagIds: [], tagNames: [],
      folderArchived: false, archivedTagNames: [],
    },
    policyId: null, ruleId: null,
    staleReferences: [],
    createdAtDemonstration: "2026-06-01T09:00:00Z",
    updatedAtDemonstration: "2026-07-10T09:00:00Z",
    demonstrationOnly: true,
    ...extra,
  };
}

export const BULK_SEND_CONFIG_FIXTURES: BulkSendSavedConfiguration[] = [
  config("bsc_engagement", "Standard Engagement Letter Configuration", "active",
    "tpl-engagement-standard", "Engagement Letter — Standard", {
      organization: {
        folderId: "fld_client_engagements", folderName: "Client Engagements",
        tagIds: ["tag_engagement"], tagNames: ["Engagement"],
        folderArchived: false, archivedTagNames: [],
      },
    }),

  config("bsc_acknowledgment", "Employee Acknowledgment Configuration", "active",
    "tpl-policy-acknowledgment", "Policy Acknowledgment", {
      teamId: "team_hr", teamName: "Human Resources",
    }),

  config("bsc_procurement", "Procurement Approval Configuration", "archived",
    "tpl-vendor-agreement", "Vendor Services Agreement", {
      teamId: "team_procurement", teamName: "Procurement",
    }),

  // Stale: references an archived Tag and a paused Policy.
  config("bsc_stale", "Legacy Vendor Configuration", "stale",
    "tpl-vendor-agreement", "Vendor Services Agreement", {
      organization: {
        folderId: null, folderName: null,
        tagIds: ["tag_retired"], tagNames: ["Retired Programme"],
        folderArchived: false, archivedTagNames: ["Retired Programme"],
      },
      policyId: "pol_paused_vendor", ruleId: null,
      staleReferences: [
        { kind: "tag-archived", label: "An assigned Tag is archived" },
        { kind: "policy-paused", label: "The referenced Workflow Policy is paused" },
      ],
    }),

  // Restricted: belongs to a Team the demo user cannot reach.
  config("bsc_restricted", "Executive Agreements Configuration", "restricted",
    "tpl-professional-services", "Professional Services Contract", {
      teamId: "team_executive", teamName: "Executive",
      staleReferences: [{ kind: "team-archived", label: "The Team is not available to you" }],
    }),
];

export const VALID_CONFIG_IDS: ReadonlySet<string> = new Set(
  BULK_SEND_CONFIG_FIXTURES.map(c => String(c.id)),
);

// ── Demonstration recipient datasets (the "Demonstration Dataset" source) ─────

export interface BulkSendDemoDataset {
  id:      string;
  label:   string;
  description: string;
  templateId: string;
  headers: string[];
  rows:    string[][];
}

export const BULK_SEND_DEMO_DATASETS: BulkSendDemoDataset[] = [
  {
    id: "ds_engagement",
    label: "Engagement letters — 4 clients",
    description: "Four fictional client rows with firm, matter, and effective date.",
    templateId: "tpl-engagement-standard",
    headers: ["Client Name", "Email", "Company", "Firm Name", "Matter", "Effective Date"],
    rows: [
      ["Maria Santos",    "maria.santos@example.com",    "Mabini Business Services",    "Northbridge Legal", "Corporate Restructuring Advisory", "2026-08-01"],
      ["Antonio Cruz",    "antonio.cruz@example.com",    "Harborline Properties",       "Northbridge Legal", "Lease Portfolio Review",           "2026-08-01"],
      ["Rosa Villanueva", "rosa.villanueva@example.com", "Sampaguita Learning Institute","Northbridge Legal", "Faculty Policy Advisory",          "2026-08-05"],
      ["Teodoro Lim",     "teodoro.lim@example.com",     "Mabini Business Services",    "Northbridge Legal", "Shareholder Agreement Review",     "2026-08-05"],
    ],
  },
  {
    id: "ds_acknowledgment",
    label: "Policy acknowledgment — 5 employees",
    description: "Five fictional employee rows for an acknowledgment template.",
    templateId: "tpl-policy-acknowledgment",
    headers: ["Employee Name", "Email", "Department", "Policy Name", "Effective Date"],
    rows: [
      ["Luis Bautista",     "luis.bautista@example.com",     "Finance",    "Code of Conduct 2026", "2026-08-15"],
      ["Rina Evangelista",  "rina.evangelista@example.com",  "Operations", "Code of Conduct 2026", "2026-08-15"],
      ["Carmen Ocampo",     "carmen.ocampo@example.com",     "Legal",      "Code of Conduct 2026", "2026-08-15"],
      ["Ramon Aquino",      "ramon.aquino@example.com",      "Facilities", "Code of Conduct 2026", "2026-08-15"],
      ["Elena Marquez",     "elena.marquez@example.com",     "Finance",    "Code of Conduct 2026", "2026-08-15"],
    ],
  },
  {
    id: "ds_issues",
    label: "Deliberate issues — 6 rows",
    description: "Includes a duplicate, an invalid email direction, a missing name, and a formula-like cell.",
    templateId: "tpl-vendor-agreement",
    headers: ["Vendor Contact", "Email", "Vendor Company", "Service Scope", "Effective Date"],
    rows: [
      ["Jose Reyes",     "jose.reyes@example.com",     "Acme Supplies Inc.",   "IT infrastructure maintenance", "2026-09-01"],
      ["Jose Reyes",     "jose.reyes@example.com",     "Acme Supplies Inc.",   "IT infrastructure maintenance", "2026-09-01"],
      ["Beatriz Ocampo", "beatriz.ocampo@@example",    "Southgate Partners",   "Facilities management",         "2026-09-01"],
      ["",               "procurement@example.com",    "Harborline Properties","Security services",             "2026-09-01"],
      ["Ramon Aquino",   "ramon.aquino@example.com",   "Northwind Logistics",  "",                              "2026-09-01"],
      ["Elena Marquez",  "elena.marquez@example.com",  "=SUM(A1:A9)",          "Printing and reprographics",    "2026-09-01"],
    ],
  },
];

// ── Sample paste text shown as guidance (never auto-applied) ──────────────────

export const BULK_SEND_PASTE_EXAMPLE =
  "Client Name,Email,Company\n" +
  "Maria Santos,maria.santos@example.com,Mabini Business Services\n" +
  "Antonio Cruz,antonio.cruz@example.com,Harborline Properties";
