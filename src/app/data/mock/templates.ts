// 7 deterministic fixture templates for /app/templates/* demonstration.
// demonstrationOnly: true on every record — no real legal or signing status.
// No real PDF documents. No real participant PII. No localStorage writes.
// Burgundy (#67023B) never appears here — eNotary boundary.

import type { DocumentTemplate, TemplateField } from "../../models/templates";
import type { FieldType } from "../../models/field-editor";

// ── Helper to build a simple TemplateField ────────────────────────────────────

function makeField(
  id: string,
  type: FieldType,
  label: string,
  placeholderId: string | null,
  page: number,
  options: {
    x?: number; y?: number; w?: number; h?: number; required?: boolean; layer?: number; documentId?: string;
  } = {}
): TemplateField {
  return {
    id,
    type,
    label,
    placeholderId,
    required:      options.required ?? true,
    layer:         options.layer   ?? 1,
    pageId:        `page-${page}`,
    documentId:    options.documentId ?? "doc-1",
    rect:          { x: options.x ?? 0.10, y: options.y ?? 0.10, width: options.w ?? 0.35, height: options.h ?? 0.04 },
    demonstrationOnly: true,
  };
}

// ── tpl-engagement-standard ───────────────────────────────────────────────────

const TPL_ENGAGEMENT_STANDARD: DocumentTemplate = {
  id:             "tpl-engagement-standard",
  name:           "Engagement Letter — Standard",
  description:    "Standard client engagement letter for Legal Services. Covers scope of work, fee schedule, and governing terms. Routed for attorney review then client signature.",
  category:       "legal-services",
  status:         "available",
  scope:          "workspace",
  source:         "example",
  ownerLabel:     "Legal Services Team",
  workspaceLabel: "LAGDA Demo Workspace",
  tags:           ["engagement", "legal", "client", "fee-schedule"],
  documents: [
    { id: "doc-1", displayName: "Engagement Letter.pdf", pageCount: 3, order: 1, isPlaceholder: true },
    { id: "doc-2", displayName: "Fee Schedule Exhibit A.pdf", pageCount: 1, order: 2, isPlaceholder: true },
  ],
  placeholders: [
    {
      id:                   "ph-attorney",
      label:                "Reviewing Attorney",
      role:                 "approver",
      required:             true,
      routingStep:          1,
      defaultAuthMethod:    "email-otp",
      description:          "Internal attorney who must approve the engagement letter before it is sent to the client.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-client",
      label:                "Client Signer",
      role:                 "signer",
      required:             true,
      routingStep:          2,
      defaultAuthMethod:    "email-otp",
      description:          "External client who will sign the engagement letter.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-billing",
      label:                "Billing Contact (Copy)",
      role:                 "carbon-copy",
      required:             false,
      routingStep:          2,
      defaultAuthMethod:    "none",
      description:          "Optional billing contact who receives a copy of the completed letter.",
      mustMapToParticipant: false,
    },
  ],
  routing: {
    mode: "sequential",
    groups: [
      { id: "grp-1", label: "Step 1 — Internal Review", step: 1, placeholderIds: ["ph-attorney"] },
      { id: "grp-2", label: "Step 2 — Client Signing",  step: 2, placeholderIds: ["ph-client", "ph-billing"] },
    ],
  },
  authentication: {
    globalDefault:        "email-otp",
    placeholderOverrides: { "ph-billing": "none" },
  },
  settings: {
    invitationSubject:         "Your Engagement Letter from {{firm_name}} — Action Required",
    invitationMessage:         "Dear {{client_name}},\n\nPlease review and sign the attached engagement letter for {{matter_description}}.\n\nIf you have any questions, do not hesitate to contact our office.",
    reminderEnabled:           true,
    reminderIntervalDays:      3,
    expirationEnabled:         true,
    expirationDays:            14,
    completionCopySender:      true,
    completionCopyParticipants:true,
    verificationEnabled:       true,
  },
  variables: [
    { id: "var-firm",    label: "Firm / Practice Name", internalKey: "firm_name",         type: "short-text",    required: true,  helpText: "Official firm or practice name as it should appear on the letter.",   placeholder: "e.g. Smith & Associates" },
    { id: "var-client",  label: "Client Full Name",     internalKey: "client_name",        type: "short-text",    required: true,  helpText: "Full legal name of the client as it should appear on the letter.",   placeholder: "e.g. Maria Santos" },
    { id: "var-matter",  label: "Matter Description",   internalKey: "matter_description", type: "short-text",    required: true,  helpText: "Brief description of the matter covered by this engagement.",       placeholder: "e.g. Corporate Restructuring Advisory" },
    { id: "var-date",    label: "Effective Date",        internalKey: "effective_date",     type: "date",          required: true,  helpText: "Date from which this engagement takes effect.",                     placeholder: "" },
    { id: "var-fee",     label: "Estimated Fee Range",   internalKey: "fee_range",          type: "short-text",    required: false, helpText: "Optional fee range for this engagement.",                           placeholder: "e.g. PHP 50,000 – PHP 120,000" },
  ],
  fields: [
    makeField("f-client-sig",    "signature",   "Client Signature",         "ph-client",   3, { x: 0.10, y: 0.72, w: 0.35, h: 0.06 }),
    makeField("f-client-date",   "date-signed", "Date Signed",              "ph-client",   3, { x: 0.55, y: 0.72, w: 0.25, h: 0.04 }),
    makeField("f-client-name",   "text",        "Client Printed Name",      "ph-client",   3, { x: 0.10, y: 0.80, w: 0.35, h: 0.04 }),
    makeField("f-client-init",   "initials",    "Client Initials — Fees",   "ph-client",   2, { x: 0.82, y: 0.90, w: 0.10, h: 0.04 }),
    makeField("f-attorney-sig",  "signature",   "Attorney Approval",        "ph-attorney", 1, { x: 0.10, y: 0.82, w: 0.35, h: 0.06 }),
    makeField("f-sender-firm",   "text",        "Firm Name (Prefill)",      null,          1, { x: 0.55, y: 0.15, w: 0.35, h: 0.04, required: false }),
  ],
  usageSummary: { timesUsed: 24, lastUsedDate: "2026-07-10", recentDraftStarts: 3, relatedFixtureIds: ["txn-demo-001"], demonstrationOnly: true },
  createdAt: "2025-09-01T08:00:00Z",
  updatedAt: "2026-07-10T14:30:00Z",
  demonstrationOnly: true,
};

// ── tpl-vendor-agreement ──────────────────────────────────────────────────────

const TPL_VENDOR_AGREEMENT: DocumentTemplate = {
  id:             "tpl-vendor-agreement",
  name:           "Vendor Services Agreement",
  description:    "Standard vendor services agreement for procurement-approved suppliers. Internal Procurement Manager approves terms before the vendor counter-signs.",
  category:       "vendor-management",
  status:         "available",
  scope:          "workspace",
  source:         "example",
  ownerLabel:     "Procurement Team",
  workspaceLabel: "LAGDA Demo Workspace",
  tags:           ["vendor", "services", "procurement", "contract"],
  documents: [
    { id: "doc-1", displayName: "Vendor Services Agreement.pdf", pageCount: 5, order: 1, isPlaceholder: true },
  ],
  placeholders: [
    {
      id:                   "ph-procurement",
      label:                "Procurement Manager",
      role:                 "approver",
      required:             true,
      routingStep:          1,
      defaultAuthMethod:    "email-otp",
      description:          "Procurement Manager who approves vendor terms before external counter-signature.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-vendor",
      label:                "Vendor Authorized Signer",
      role:                 "signer",
      required:             true,
      routingStep:          2,
      defaultAuthMethod:    "email-otp",
      description:          "Authorized representative of the vendor company.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-finance",
      label:                "Finance Reviewer",
      role:                 "reviewer",
      required:             false,
      routingStep:          1,
      defaultAuthMethod:    "email-otp",
      description:          "Optional finance team reviewer during the approval stage.",
      mustMapToParticipant: false,
    },
  ],
  routing: {
    mode: "approval-based",
    groups: [
      { id: "grp-1", label: "Step 1 — Internal Approval", step: 1, placeholderIds: ["ph-procurement", "ph-finance"] },
      { id: "grp-2", label: "Step 2 — Vendor Signature",  step: 2, placeholderIds: ["ph-vendor"] },
    ],
  },
  authentication: {
    globalDefault:        "email-otp",
    placeholderOverrides: {},
  },
  settings: {
    invitationSubject:         "Vendor Agreement — {{vendor_company}} — Counter-Signature Required",
    invitationMessage:         "Dear {{vendor_contact_name}},\n\nPlease review and counter-sign the enclosed vendor services agreement on behalf of {{vendor_company}}.\n\nScope: {{service_scope}}.",
    reminderEnabled:           true,
    reminderIntervalDays:      5,
    expirationEnabled:         true,
    expirationDays:            30,
    completionCopySender:      true,
    completionCopyParticipants:true,
    verificationEnabled:       false,
  },
  variables: [
    { id: "var-vco",   label: "Vendor Company",      internalKey: "vendor_company",      type: "short-text", required: true,  helpText: "Full legal name of the vendor company.", placeholder: "e.g. Acme Supplies Inc." },
    { id: "var-vcn",   label: "Vendor Contact Name", internalKey: "vendor_contact_name", type: "short-text", required: true,  helpText: "Name of the vendor's authorized representative.", placeholder: "e.g. Jose Reyes" },
    { id: "var-sco",   label: "Service Scope",       internalKey: "service_scope",       type: "multiline-text", required: true, helpText: "Brief description of the contracted services.", placeholder: "e.g. IT infrastructure maintenance and support" },
    { id: "var-val",   label: "Contract Value",      internalKey: "contract_value",      type: "short-text", required: false, helpText: "Total contract value.", placeholder: "e.g. PHP 480,000 / year" },
    { id: "var-eff",   label: "Effective Date",      internalKey: "effective_date",      type: "date",       required: true,  helpText: "Date from which services commence.", placeholder: "" },
  ],
  fields: [
    makeField("f-pm-approval",  "signature",   "Procurement Manager Approval", "ph-procurement", 1, { x: 0.10, y: 0.88, w: 0.35, h: 0.06 }),
    makeField("f-pm-date",      "date-signed", "Approval Date",                "ph-procurement", 1, { x: 0.55, y: 0.88, w: 0.25, h: 0.04 }),
    makeField("f-vendor-sig",   "signature",   "Vendor Authorized Signature",  "ph-vendor",      4, { x: 0.10, y: 0.80, w: 0.35, h: 0.06 }),
    makeField("f-vendor-title", "text",        "Vendor Signer Title",          "ph-vendor",      4, { x: 0.10, y: 0.88, w: 0.30, h: 0.04 }),
    makeField("f-vendor-date",  "date-signed", "Vendor Signature Date",        "ph-vendor",      4, { x: 0.55, y: 0.88, w: 0.25, h: 0.04 }),
    makeField("f-vendor-init-1","initials",    "Vendor Initials — Page 2",     "ph-vendor",      2, { x: 0.82, y: 0.92, w: 0.10, h: 0.04 }),
    makeField("f-vendor-init-2","initials",    "Vendor Initials — Page 3",     "ph-vendor",      3, { x: 0.82, y: 0.92, w: 0.10, h: 0.04 }),
  ],
  usageSummary: { timesUsed: 11, lastUsedDate: "2026-06-28", recentDraftStarts: 1, relatedFixtureIds: [], demonstrationOnly: true },
  createdAt: "2025-11-15T09:00:00Z",
  updatedAt: "2026-06-28T11:20:00Z",
  demonstrationOnly: true,
};

// ── tpl-policy-acknowledgment ─────────────────────────────────────────────────

const TPL_POLICY_ACKNOWLEDGMENT: DocumentTemplate = {
  id:             "tpl-policy-acknowledgment",
  name:           "Policy Acknowledgment",
  description:    "HR policy receipt and acknowledgment workflow. Employee confirms receipt and understanding of company policy. CC to HR file contact on completion.",
  category:       "human-resources",
  status:         "available",
  scope:          "workspace",
  source:         "example",
  ownerLabel:     "Human Resources",
  workspaceLabel: "LAGDA Demo Workspace",
  tags:           ["policy", "hr", "acknowledgment", "compliance"],
  documents: [
    { id: "doc-1", displayName: "Company Policy Document.pdf", pageCount: 4, order: 1, isPlaceholder: true },
  ],
  placeholders: [
    {
      id:                   "ph-employee",
      label:                "Employee",
      role:                 "acknowledgment-recipient",
      required:             true,
      routingStep:          1,
      defaultAuthMethod:    "email-otp",
      description:          "Employee who must acknowledge receipt and understanding of this policy.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-hr-cc",
      label:                "HR File Contact (Copy)",
      role:                 "carbon-copy",
      required:             false,
      routingStep:          1,
      defaultAuthMethod:    "none",
      description:          "HR representative who receives a copy of the acknowledged policy for file records.",
      mustMapToParticipant: false,
    },
  ],
  routing: {
    mode: "parallel",
    groups: [
      { id: "grp-1", label: "Acknowledgment", step: 1, placeholderIds: ["ph-employee", "ph-hr-cc"] },
    ],
  },
  authentication: {
    globalDefault:        "email-otp",
    placeholderOverrides: { "ph-hr-cc": "none" },
  },
  settings: {
    invitationSubject:         "Action Required: {{policy_name}} — Please Acknowledge",
    invitationMessage:         "Dear {{employee_name}},\n\nPlease review and acknowledge the {{policy_name}} (effective {{effective_date}}).\n\nThis acknowledgment confirms your receipt and understanding of the policy.",
    reminderEnabled:           true,
    reminderIntervalDays:      2,
    expirationEnabled:         true,
    expirationDays:            7,
    completionCopySender:      true,
    completionCopyParticipants:false,
    verificationEnabled:       false,
  },
  variables: [
    { id: "var-pname",  label: "Policy Name",        internalKey: "policy_name",    type: "short-text", required: true,  helpText: "Official name of the policy being acknowledged.", placeholder: "e.g. Code of Conduct 2026" },
    { id: "var-pver",   label: "Policy Version",     internalKey: "policy_version", type: "short-text", required: false, helpText: "Version number or revision date of the policy.", placeholder: "e.g. v2.1 — January 2026" },
    { id: "var-ename",  label: "Employee Name",      internalKey: "employee_name",  type: "short-text", required: true,  helpText: "Full name of the employee.", placeholder: "e.g. Ana Dela Cruz" },
    { id: "var-edate",  label: "Effective Date",     internalKey: "effective_date", type: "date",       required: true,  helpText: "Date from which the policy takes effect.", placeholder: "" },
    { id: "var-dept",   label: "Department",         internalKey: "department",     type: "short-text", required: false, helpText: "Employee department.", placeholder: "e.g. Finance" },
  ],
  fields: [
    makeField("f-emp-ack",  "checkbox",    "I have read and understood this policy",   "ph-employee", 4, { x: 0.10, y: 0.70, w: 0.02, h: 0.025, required: true }),
    makeField("f-emp-name", "text",        "Employee Full Name",                       "ph-employee", 4, { x: 0.10, y: 0.76, w: 0.35, h: 0.04 }),
    makeField("f-emp-date", "date-signed", "Acknowledgment Date",                      "ph-employee", 4, { x: 0.55, y: 0.76, w: 0.25, h: 0.04 }),
    makeField("f-emp-dept", "text",        "Department",                               "ph-employee", 4, { x: 0.10, y: 0.82, w: 0.25, h: 0.04, required: false }),
  ],
  usageSummary: { timesUsed: 47, lastUsedDate: "2026-07-14", recentDraftStarts: 6, relatedFixtureIds: [], demonstrationOnly: true },
  createdAt: "2025-08-10T07:00:00Z",
  updatedAt: "2026-07-14T09:15:00Z",
  demonstrationOnly: true,
};

// ── tpl-professional-services ─────────────────────────────────────────────────

const TPL_PROFESSIONAL_SERVICES: DocumentTemplate = {
  id:             "tpl-professional-services",
  name:           "Professional Services Contract",
  description:    "Professional services contract for freelance and consulting engagements. Currently in draft — deliverables appendix and IP assignment clause pending review.",
  category:       "contracts",
  status:         "draft",
  scope:          "personal",
  source:         "blank",
  ownerLabel:     "You (Demo User)",
  workspaceLabel: "LAGDA Demo Workspace",
  tags:           ["consulting", "freelance", "ip-assignment", "draft"],
  documents: [
    { id: "doc-1", displayName: "Professional Services Contract.pdf", pageCount: 4, order: 1, isPlaceholder: true },
  ],
  placeholders: [
    {
      id:                   "ph-client-co",
      label:                "Client Company Representative",
      role:                 "signer",
      required:             true,
      routingStep:          2,
      defaultAuthMethod:    "email-otp",
      description:          "Authorized representative of the client company.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-service-provider",
      label:                "Service Provider",
      role:                 "signer",
      required:             true,
      routingStep:          1,
      defaultAuthMethod:    "none",
      description:          "The individual or entity providing the professional services.",
      mustMapToParticipant: true,
    },
  ],
  routing: {
    mode: "sequential",
    groups: [
      { id: "grp-1", label: "Step 1 — Service Provider", step: 1, placeholderIds: ["ph-service-provider"] },
      { id: "grp-2", label: "Step 2 — Client Signature",  step: 2, placeholderIds: ["ph-client-co"] },
    ],
  },
  authentication: {
    globalDefault:        "email-otp",
    placeholderOverrides: { "ph-service-provider": "none" },
  },
  settings: {
    invitationSubject:         "Professional Services Contract — Please Review and Sign",
    invitationMessage:         "Please review and sign the enclosed professional services contract.",
    reminderEnabled:           true,
    reminderIntervalDays:      5,
    expirationEnabled:         true,
    expirationDays:            21,
    completionCopySender:      true,
    completionCopyParticipants:true,
    verificationEnabled:       false,
  },
  variables: [
    { id: "var-pvname", label: "Provider Name",      internalKey: "provider_name",  type: "short-text", required: true, helpText: "Full name of the service provider.", placeholder: "e.g. Juan Garcia" },
    { id: "var-cname",  label: "Client Company",     internalKey: "client_company", type: "short-text", required: true, helpText: "Client company's legal name.", placeholder: "e.g. Metro Solutions Corp." },
    { id: "var-scope",  label: "Service Scope",      internalKey: "service_scope",  type: "multiline-text", required: true, helpText: "Description of services.", placeholder: "" },
    { id: "var-fee2",   label: "Contract Fee",       internalKey: "contract_fee",   type: "short-text", required: false, helpText: "Total fee or rate.", placeholder: "" },
  ],
  fields: [
    makeField("f-prov-sig",    "signature",   "Service Provider Signature", "ph-service-provider", 4, { x: 0.10, y: 0.78, w: 0.35, h: 0.06 }),
    makeField("f-prov-date",   "date-signed", "Provider Signature Date",    "ph-service-provider", 4, { x: 0.55, y: 0.78, w: 0.25, h: 0.04 }),
    makeField("f-client-sig2", "signature",   "Client Signature",           "ph-client-co",        4, { x: 0.10, y: 0.86, w: 0.35, h: 0.06 }),
    makeField("f-client-date2","date-signed", "Client Signature Date",      "ph-client-co",        4, { x: 0.55, y: 0.86, w: 0.25, h: 0.04 }),
  ],
  validation: {
    isValid:          false,
    canMakeAvailable: false,
    errors: [
      { id: "ve-1", severity: "error", message: "Deliverables appendix is pending review before this template can be made available.", area: "documents" },
      { id: "ve-2", severity: "error", message: "IP assignment clause has not been verified by Legal.", area: "details" },
    ],
    warnings: [
      { id: "vw-1", severity: "warning", message: "Contract fee variable is optional but recommended for completeness.", area: "variables" },
    ],
  },
  usageSummary: { timesUsed: 0, lastUsedDate: null, recentDraftStarts: 2, relatedFixtureIds: [], demonstrationOnly: true },
  createdAt: "2026-06-15T10:00:00Z",
  updatedAt: "2026-07-09T16:45:00Z",
  demonstrationOnly: true,
};

// ── tpl-procurement-approval ──────────────────────────────────────────────────

const TPL_PROCUREMENT_APPROVAL: DocumentTemplate = {
  id:             "tpl-procurement-approval",
  name:           "Procurement Request Approval",
  description:    "Sequential multi-level approval for procurement requests. Department Head approves first, then Finance Controller, then CFO countersigns for high-value items.",
  category:       "procurement",
  status:         "available",
  scope:          "workspace",
  source:         "example",
  ownerLabel:     "Finance & Procurement",
  workspaceLabel: "LAGDA Demo Workspace",
  tags:           ["procurement", "approval", "multi-level", "finance"],
  documents: [
    { id: "doc-1", displayName: "Procurement Request Form.pdf", pageCount: 2, order: 1, isPlaceholder: true },
  ],
  placeholders: [
    {
      id:                   "ph-dept-head",
      label:                "Department Head",
      role:                 "approver",
      required:             true,
      routingStep:          1,
      defaultAuthMethod:    "email-otp",
      description:          "Department head who initiates the approval chain.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-finance-ctrl",
      label:                "Finance Controller",
      role:                 "approver",
      required:             true,
      routingStep:          2,
      defaultAuthMethod:    "email-otp",
      description:          "Finance Controller who approves the budget allocation.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-cfo",
      label:                "CFO",
      role:                 "signer",
      required:             true,
      routingStep:          3,
      defaultAuthMethod:    "account-signin",
      description:          "CFO who provides final countersignature for procurement orders.",
      mustMapToParticipant: true,
    },
  ],
  routing: {
    mode: "sequential",
    groups: [
      { id: "grp-1", label: "Step 1 — Dept Head",         step: 1, placeholderIds: ["ph-dept-head"]    },
      { id: "grp-2", label: "Step 2 — Finance Controller", step: 2, placeholderIds: ["ph-finance-ctrl"] },
      { id: "grp-3", label: "Step 3 — CFO",                step: 3, placeholderIds: ["ph-cfo"]           },
    ],
  },
  authentication: {
    globalDefault:        "email-otp",
    placeholderOverrides: { "ph-cfo": "account-signin" },
  },
  settings: {
    invitationSubject:         "Procurement Approval Required — {{item_description}}",
    invitationMessage:         "Please review and approve the attached procurement request for {{item_description}} (estimated value: {{estimated_value}}).",
    reminderEnabled:           true,
    reminderIntervalDays:      1,
    expirationEnabled:         true,
    expirationDays:            5,
    completionCopySender:      true,
    completionCopyParticipants:true,
    verificationEnabled:       true,
  },
  variables: [
    { id: "var-item",  label: "Item / Service Description", internalKey: "item_description", type: "short-text",    required: true, helpText: "Brief description of what is being procured.", placeholder: "e.g. Office Equipment — 10 Laptops" },
    { id: "var-val2",  label: "Estimated Value",            internalKey: "estimated_value",  type: "short-text",    required: true, helpText: "Total estimated procurement value.", placeholder: "e.g. PHP 350,000" },
    { id: "var-jus",   label: "Business Justification",     internalKey: "justification",    type: "multiline-text",required: true, helpText: "Reason for procurement and expected business impact.", placeholder: "" },
    { id: "var-dept2", label: "Requesting Department",      internalKey: "department",       type: "short-text",    required: true, helpText: "Department making the request.", placeholder: "e.g. IT" },
    { id: "var-reqdate","label": "Required By",             internalKey: "required_by",      type: "date",          required: false, helpText: "Date by which the item must be received.", placeholder: "" },
  ],
  fields: [
    makeField("f-dh-approve",  "signature",   "Department Head Approval",  "ph-dept-head",    1, { x: 0.10, y: 0.82, w: 0.30, h: 0.06 }),
    makeField("f-dh-date",     "date-signed", "Dept Head Date",            "ph-dept-head",    1, { x: 0.50, y: 0.82, w: 0.20, h: 0.04 }),
    makeField("f-fc-approve",  "signature",   "Finance Controller Approval","ph-finance-ctrl", 1, { x: 0.10, y: 0.90, w: 0.30, h: 0.04 }),
    makeField("f-fc-date",     "date-signed", "Finance Controller Date",    "ph-finance-ctrl", 1, { x: 0.50, y: 0.90, w: 0.20, h: 0.04 }),
    makeField("f-cfo-sig",     "signature",   "CFO Countersignature",       "ph-cfo",          2, { x: 0.10, y: 0.82, w: 0.35, h: 0.06 }),
    makeField("f-cfo-date",    "date-signed", "CFO Signature Date",         "ph-cfo",          2, { x: 0.55, y: 0.82, w: 0.25, h: 0.04 }),
  ],
  usageSummary: { timesUsed: 38, lastUsedDate: "2026-07-12", recentDraftStarts: 4, relatedFixtureIds: [], demonstrationOnly: true },
  createdAt: "2025-10-05T06:00:00Z",
  updatedAt: "2026-07-12T13:10:00Z",
  demonstrationOnly: true,
};

// ── tpl-onboarding-package ────────────────────────────────────────────────────

const TPL_ONBOARDING_PACKAGE: DocumentTemplate = {
  id:             "tpl-onboarding-package",
  name:           "Employee Onboarding Package",
  description:    "Multi-document onboarding package for new hires. Includes offer letter, employment contract, and data privacy acknowledgment. Draft pending final legal review.",
  category:       "human-resources",
  status:         "draft",
  scope:          "workspace",
  source:         "example",
  ownerLabel:     "Human Resources",
  workspaceLabel: "LAGDA Demo Workspace",
  tags:           ["onboarding", "hr", "employment", "multi-document", "draft"],
  documents: [
    { id: "doc-1", displayName: "Offer Letter.pdf",                  pageCount: 2, order: 1, isPlaceholder: true },
    { id: "doc-2", displayName: "Employment Contract.pdf",           pageCount: 6, order: 2, isPlaceholder: true },
    { id: "doc-3", displayName: "Data Privacy Acknowledgment.pdf",   pageCount: 1, order: 3, isPlaceholder: true },
  ],
  placeholders: [
    {
      id:                   "ph-hr-rep",
      label:                "HR Representative",
      role:                 "approver",
      required:             true,
      routingStep:          1,
      defaultAuthMethod:    "email-otp",
      description:          "HR Representative who reviews and approves the package before sending to the new hire.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-new-hire",
      label:                "New Hire",
      role:                 "signer",
      required:             true,
      routingStep:          2,
      defaultAuthMethod:    "email-otp",
      description:          "Incoming employee who signs the onboarding documents.",
      mustMapToParticipant: true,
    },
  ],
  routing: {
    mode: "sequential",
    groups: [
      { id: "grp-1", label: "Step 1 — HR Review",        step: 1, placeholderIds: ["ph-hr-rep"]   },
      { id: "grp-2", label: "Step 2 — New Hire Signing", step: 2, placeholderIds: ["ph-new-hire"] },
    ],
  },
  authentication: {
    globalDefault:        "email-otp",
    placeholderOverrides: {},
  },
  settings: {
    invitationSubject:         "Welcome to the Team — Please Complete Your Onboarding Documents",
    invitationMessage:         "Dear {{employee_name}},\n\nWelcome! Please review and sign your onboarding package for your {{job_title}} role, effective {{start_date}}.\n\nPlease complete all documents within 3 business days.",
    reminderEnabled:           true,
    reminderIntervalDays:      2,
    expirationEnabled:         true,
    expirationDays:            7,
    completionCopySender:      true,
    completionCopyParticipants:true,
    verificationEnabled:       false,
  },
  variables: [
    { id: "var-ename2", label: "Employee Name",    internalKey: "employee_name", type: "short-text", required: true,  helpText: "Full name of the new hire.", placeholder: "e.g. Maria Reyes" },
    { id: "var-title",  label: "Job Title",        internalKey: "job_title",     type: "short-text", required: true,  helpText: "Official job title.", placeholder: "e.g. Senior Software Engineer" },
    { id: "var-dept3",  label: "Department",       internalKey: "department",    type: "short-text", required: true,  helpText: "Department the employee is joining.", placeholder: "e.g. Engineering" },
    { id: "var-start",  label: "Start Date",       internalKey: "start_date",    type: "date",       required: true,  helpText: "Employee's first day.", placeholder: "" },
    { id: "var-comp",   label: "Compensation",     internalKey: "compensation",  type: "short-text", required: false, helpText: "Salary or compensation package details.", placeholder: "e.g. PHP 75,000 / month" },
  ],
  fields: [
    makeField("f-hr-approve",   "signature",   "HR Rep Approval",              "ph-hr-rep",  1, { x: 0.55, y: 0.88, w: 0.30, h: 0.06, documentId: "doc-1" }),
    makeField("f-nh-offer-sig", "signature",   "New Hire — Offer Letter",      "ph-new-hire",1, { x: 0.10, y: 0.88, w: 0.35, h: 0.06, documentId: "doc-1" }),
    makeField("f-nh-ec-sig",    "signature",   "New Hire — Employment Contract","ph-new-hire",6, { x: 0.10, y: 0.84, w: 0.35, h: 0.06, documentId: "doc-2" }),
    makeField("f-nh-ec-date",   "date-signed", "Contract Signature Date",      "ph-new-hire",6, { x: 0.55, y: 0.84, w: 0.25, h: 0.04, documentId: "doc-2" }),
    makeField("f-nh-dp-ack",    "checkbox",    "I acknowledge the Data Privacy Policy", "ph-new-hire", 1, { x: 0.10, y: 0.80, w: 0.02, h: 0.025, documentId: "doc-3" }),
    makeField("f-nh-dp-date",   "date-signed", "Acknowledgment Date",          "ph-new-hire",1, { x: 0.55, y: 0.80, w: 0.25, h: 0.04,  documentId: "doc-3" }),
  ],
  validation: {
    isValid:          false,
    canMakeAvailable: false,
    errors: [
      { id: "ve-3", severity: "error", message: "Employment contract template is pending final Legal review.", area: "documents" },
    ],
    warnings: [
      { id: "vw-2", severity: "warning", message: "Compensation variable is optional but should be reviewed for sensitive data handling.", area: "variables" },
    ],
  },
  usageSummary: { timesUsed: 0, lastUsedDate: null, recentDraftStarts: 1, relatedFixtureIds: [], demonstrationOnly: true },
  createdAt: "2026-05-20T08:30:00Z",
  updatedAt: "2026-07-01T10:00:00Z",
  demonstrationOnly: true,
};

// ── tpl-nda-archived ──────────────────────────────────────────────────────────

const TPL_NDA_ARCHIVED: DocumentTemplate = {
  id:             "tpl-nda-archived",
  name:           "Mutual Non-Disclosure Agreement (Legacy)",
  description:    "Legacy mutual NDA template. Archived after adoption of the updated NDA-2026 template. Available for reference and duplication only.",
  category:       "legal-services",
  status:         "archived",
  scope:          "personal",
  source:         "example",
  ownerLabel:     "You (Demo User)",
  workspaceLabel: "LAGDA Demo Workspace",
  tags:           ["nda", "confidentiality", "archived", "legacy"],
  documents: [
    { id: "doc-1", displayName: "Mutual NDA (Legacy).pdf", pageCount: 3, order: 1, isPlaceholder: true },
  ],
  placeholders: [
    {
      id:                   "ph-party-a",
      label:                "Party A (Disclosing)",
      role:                 "signer",
      required:             true,
      routingStep:          1,
      defaultAuthMethod:    "email-otp",
      description:          "The party disclosing confidential information.",
      mustMapToParticipant: true,
    },
    {
      id:                   "ph-party-b",
      label:                "Party B (Receiving)",
      role:                 "signer",
      required:             true,
      routingStep:          2,
      defaultAuthMethod:    "email-otp",
      description:          "The party receiving and protecting confidential information.",
      mustMapToParticipant: true,
    },
  ],
  routing: {
    mode: "sequential",
    groups: [
      { id: "grp-1", label: "Step 1 — Party A", step: 1, placeholderIds: ["ph-party-a"] },
      { id: "grp-2", label: "Step 2 — Party B", step: 2, placeholderIds: ["ph-party-b"] },
    ],
  },
  authentication: {
    globalDefault:        "email-otp",
    placeholderOverrides: {},
  },
  settings: {
    invitationSubject:         "Mutual NDA — Please Review and Sign",
    invitationMessage:         "Please review and sign the enclosed Mutual Non-Disclosure Agreement.",
    reminderEnabled:           false,
    reminderIntervalDays:      7,
    expirationEnabled:         false,
    expirationDays:            30,
    completionCopySender:      true,
    completionCopyParticipants:true,
    verificationEnabled:       false,
  },
  variables: [
    { id: "var-pa", label: "Party A Name", internalKey: "party_a_name", type: "short-text", required: true, helpText: "Full legal name of Party A.", placeholder: "" },
    { id: "var-pb", label: "Party B Name", internalKey: "party_b_name", type: "short-text", required: true, helpText: "Full legal name of Party B.", placeholder: "" },
    { id: "var-pd", label: "Effective Date",internalKey: "effective_date",type: "date",     required: true, helpText: "Date on which the NDA takes effect.", placeholder: "" },
  ],
  fields: [
    makeField("f-pa-sig",  "signature",   "Party A Signature", "ph-party-a", 3, { x: 0.10, y: 0.78, w: 0.35, h: 0.06 }),
    makeField("f-pa-name", "text",        "Party A Name",      "ph-party-a", 3, { x: 0.10, y: 0.86, w: 0.35, h: 0.04 }),
    makeField("f-pa-date", "date-signed", "Party A Date",      "ph-party-a", 3, { x: 0.55, y: 0.86, w: 0.25, h: 0.04 }),
    makeField("f-pb-sig",  "signature",   "Party B Signature", "ph-party-b", 3, { x: 0.10, y: 0.78, w: 0.35, h: 0.06 }),
    makeField("f-pb-name", "text",        "Party B Name",      "ph-party-b", 3, { x: 0.10, y: 0.86, w: 0.35, h: 0.04 }),
    makeField("f-pb-date", "date-signed", "Party B Date",      "ph-party-b", 3, { x: 0.55, y: 0.86, w: 0.25, h: 0.04 }),
  ],
  usageSummary: { timesUsed: 8, lastUsedDate: "2025-12-10", recentDraftStarts: 0, relatedFixtureIds: [], demonstrationOnly: true },
  createdAt: "2024-03-01T09:00:00Z",
  updatedAt: "2025-12-10T11:30:00Z",
  demonstrationOnly: true,
};

// ── Export map ────────────────────────────────────────────────────────────────

const ALL_TEMPLATES: DocumentTemplate[] = [
  TPL_ENGAGEMENT_STANDARD,
  TPL_VENDOR_AGREEMENT,
  TPL_POLICY_ACKNOWLEDGMENT,
  TPL_PROFESSIONAL_SERVICES,
  TPL_PROCUREMENT_APPROVAL,
  TPL_ONBOARDING_PACKAGE,
  TPL_NDA_ARCHIVED,
];

const FIXTURE_MAP = new Map<string, DocumentTemplate>(
  ALL_TEMPLATES.map(t => [t.id, t])
);

export function getMockTemplate(id: string): DocumentTemplate | null {
  return FIXTURE_MAP.get(id) ?? null;
}

export function getAllMockTemplates(): DocumentTemplate[] {
  return ALL_TEMPLATES;
}
