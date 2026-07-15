// ── Solutions section — centralized content and navigation ─────────────────────

export const SOLUTIONS_NAV = [
  // Legal group
  { label: "Lawyers",           path: "/solutions/lawyers",             group: "Legal" },
  { label: "Law Firms",         path: "/solutions/law-firms",           group: "Legal" },
  // Business group
  { label: "Business Teams",    path: "/solutions/business-teams",      group: "Business" },
  { label: "HR & Recruitment",  path: "/solutions/hr-and-recruitment",  group: "Business" },
  { label: "Finance",           path: "/solutions/finance",             group: "Business" },
  { label: "Procurement",       path: "/solutions/procurement",         group: "Business" },
  // Property group
  { label: "Real Estate",       path: "/solutions/real-estate",         group: "Property & Services" },
  // Public group
  { label: "Government & LGU",  path: "/solutions/government-and-lgu",  group: "Public & Institutional" },
  { label: "Education",         path: "/solutions/education",           group: "Public & Institutional" },
  { label: "Healthcare",        path: "/solutions/healthcare-and-wellness", group: "Public & Institutional" },
] as const;

export type SolutionPath = typeof SOLUTIONS_NAV[number]["path"];

// ── Common workflow problems shared across industries ──────────────────────────
export const COMMON_PROBLEMS = [
  { icon: "⏱️", title: "Delayed signatures",       desc: "Physical document routing slows every process that depends on sign-off." },
  { icon: "📞", title: "Manual follow-up",          desc: "Tracking who has reviewed and signed requires constant interruptions." },
  { icon: "❓", title: "Unclear status",            desc: "It is difficult to know where a document is at any moment without asking." },
  { icon: "📋", title: "Repeated preparation",      desc: "The same document types are rebuilt from scratch every time." },
  { icon: "🗂️", title: "Scattered records",        desc: "Completed documents are distributed across email threads and local storage." },
  { icon: "🔗", title: "Distributed participants",  desc: "Signers in different offices, locations, or time zones are hard to coordinate." },
] as const;

// ── Audience groups for the Overview page ─────────────────────────────────────
export const AUDIENCE_GROUPS = [
  {
    group: "Legal",
    icon: "⚖️",
    desc: "Solo practitioners and law firms managing client agreements, engagement letters, and internal workflows.",
    solutions: [
      { label: "Lawyers",   path: "/solutions/lawyers" },
      { label: "Law Firms", path: "/solutions/law-firms" },
    ],
  },
  {
    group: "Business",
    icon: "🏢",
    desc: "Corporate teams, operations, HR, finance, and procurement managing contracts, approvals, and vendor documents.",
    solutions: [
      { label: "Business Teams",   path: "/solutions/business-teams" },
      { label: "HR & Recruitment", path: "/solutions/hr-and-recruitment" },
      { label: "Finance",          path: "/solutions/finance" },
      { label: "Procurement",      path: "/solutions/procurement" },
    ],
  },
  {
    group: "Property & Services",
    icon: "🏘️",
    desc: "Property managers, brokers, developers, and leasing teams handling tenant and transaction documentation.",
    solutions: [
      { label: "Real Estate", path: "/solutions/real-estate" },
    ],
  },
  {
    group: "Public & Institutional",
    icon: "🏛️",
    desc: "Government offices, schools, universities, and healthcare and wellness organizations managing institutional workflows.",
    solutions: [
      { label: "Government & LGU", path: "/solutions/government-and-lgu" },
      { label: "Education",        path: "/solutions/education" },
      { label: "Healthcare",       path: "/solutions/healthcare-and-wellness" },
    ],
  },
] as const;

// ── Cross-solution capability highlights ──────────────────────────────────────
export const SHARED_CAPABILITIES = [
  { icon: "📑", title: "Templates",             desc: "Save any document workflow as a reusable template.", path: "/features/templates" },
  { icon: "↕️", title: "Sequential signing",    desc: "Define who signs first — unlock each step in order.", path: "/features/sequential-signing" },
  { icon: "⚡", title: "Parallel signing",      desc: "Multiple participants sign simultaneously.", path: "/features/parallel-signing" },
  { icon: "🔑", title: "Signer authentication", desc: "OTP, authenticator app, account login, or SSO.", path: "/features/signer-authentication" },
  { icon: "📋", title: "Audit trail",            desc: "Every event — delivery, viewing, signing — timestamped.", path: "/features/audit-trail" },
  { icon: "🔍", title: "Verification",           desc: "Confirm any document matches its LAGDA record.", path: "/features/document-verification" },
  { icon: "🗂️", title: "Team workspaces",       desc: "Shared templates, contacts, and role-based access.", path: "/features/team-workspaces" },
  { icon: "🔔", title: "Notifications",          desc: "Alerts when documents are signed, viewed, or expiring.", path: "/features/notifications" },
] as const;

// ── Legal notices (used across pages) ─────────────────────────────────────────
export const LEGAL_NOTE = "Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction.";
export const ENOTARY_NOTE = "Electronic signing and electronic notarization are separate processes. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.";

export const GOVERNMENT_NOTICE = "Government use may be subject to agency policies, procurement requirements, records rules, applicable laws, and other formal approvals. LAGDA does not represent that every government document or transaction is eligible for electronic signing.";
export const FINANCE_NOTICE = "Financial workflows may require additional identity, regulatory, security, recordkeeping, or institutional controls. Organizations remain responsible for determining the controls applicable to each transaction.";
export const HEALTHCARE_NOTICE = "Healthcare and wellness workflows may involve sensitive or regulated information. Organizations must determine whether LAGDA is appropriate for the specific document, data, and legal requirements involved.";
export const FIRM_NOTICE = "Firms remain responsible for configuring access, retention, confidentiality, and document-handling practices appropriate to each matter.";

// ── Workflow step types (shared across pages) ─────────────────────────────────
export type WorkflowStep = { num: string; label: string; desc: string };

export const LAWYER_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "Select an approved template",       desc: "Choose the right starting workflow for the client engagement type." },
  { num: "02", label: "Add the client and participants",   desc: "Assign the client, internal reviewer, and any other required party." },
  { num: "03", label: "Configure authentication",          desc: "Choose the authentication method appropriate to the transaction risk level." },
  { num: "04", label: "Assign signature fields",          desc: "Place required fields on the document and bind them to each participant's role." },
  { num: "05", label: "Send the secure request",          desc: "Invitations are delivered to each participant through a secure link." },
  { num: "06", label: "Monitor and follow up",            desc: "Track delivery, viewing, and signing status. Reminders sent automatically." },
  { num: "07", label: "Download the completed record",    desc: "Download the signed document and attached audit trail." },
  { num: "08", label: "Retain the verification record",   desc: "Use the Verification ID to confirm the document matches its LAGDA record." },
];

export const FIRM_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "Lawyer selects firm-approved template", desc: "Only Template Administrators may publish templates for firm-wide use." },
  { num: "02", label: "Client and approver are assigned",       desc: "The sending lawyer assigns the client and any internal approver." },
  { num: "03", label: "Client signs first",                     desc: "The workflow routes the document to the client." },
  { num: "04", label: "Partner or authorized rep countersigns", desc: "After client completion, the internal signatory receives and acts." },
  { num: "05", label: "Completion record generated",            desc: "A Verification ID and full audit trail are produced." },
  { num: "06", label: "Activity visible to authorized members", desc: "Auditor-role members review events without accessing confidential document content." },
];

export const BUSINESS_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "Operations prepares the document",  desc: "Upload the agreement or approval form and assign participants." },
  { num: "02", label: "Legal reviews",                     desc: "Internal reviewer reads and acts before the document proceeds." },
  { num: "03", label: "Finance approves commercial terms", desc: "Approval step records that commercial terms were reviewed." },
  { num: "04", label: "Authorized representative signs",   desc: "Company signatory signs with appropriate authentication." },
  { num: "05", label: "Counterparty signs",                desc: "External party acts in parallel or sequence as configured." },
  { num: "06", label: "Completion and verification",       desc: "Completed record and audit trail are retained and accessible." },
];

export const GOVERNMENT_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "Originating office prepares",      desc: "Administrative staff upload the form and assign participants." },
  { num: "02", label: "Department reviewer checks",       desc: "Designated reviewer acts before the document proceeds." },
  { num: "03", label: "Budget or finance team approves",  desc: "Required approver acts based on authority level." },
  { num: "04", label: "Authorized officer signs",         desc: "Authorized signatory completes the document." },
  { num: "05", label: "Verification record generated",    desc: "Controlled verification information is produced on completion." },
  { num: "06", label: "Authorized staff review history",  desc: "Activity records are accessible to Auditor-role members." },
];

export const REAL_ESTATE_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "Team selects the approved workflow",       desc: "Use a saved template for the specific document type." },
  { num: "02", label: "Tenant or counterparty is assigned",       desc: "Add contact and configure signing fields." },
  { num: "03", label: "Internal approver reviews terms",          desc: "Property manager or authorized reviewer acts first." },
  { num: "04", label: "Both parties sign",                        desc: "Sequential or parallel signing based on the workflow." },
  { num: "05", label: "Completed record distributed and verified", desc: "All parties receive the completed copy." },
];

export const HR_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "HR selects an approved template",   desc: "Onboarding, acknowledgment, or agreement template chosen." },
  { num: "02", label: "Candidate or employee assigned",    desc: "Contact added with appropriate authentication configured." },
  { num: "03", label: "Manager reviews or approves",       desc: "Relevant manager or HR lead acts before or after the employee." },
  { num: "04", label: "Employee completes required fields", desc: "Employee signs or acknowledges through a secure link." },
  { num: "05", label: "HR receives completed copy",         desc: "Completed record delivered. Audit trail retained per policy." },
];

export const FINANCE_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "Requesting department submits",     desc: "Upload supporting documents and assign participants." },
  { num: "02", label: "Finance reviewer checks the request", desc: "Reviewer verifies completeness and accuracy." },
  { num: "03", label: "Authorized approver acts",          desc: "Budget-authority holder completes the approval step." },
  { num: "04", label: "Required signatory signs",          desc: "Authorized signatory acts with configured authentication." },
  { num: "05", label: "Activity and completion recorded",  desc: "Full audit trail and verification record retained." },
];

export const PROCUREMENT_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "Procurement prepares the document", desc: "Approved supplier agreement or form is uploaded." },
  { num: "02", label: "Legal reviews",                     desc: "Legal team reviews terms before the document proceeds." },
  { num: "03", label: "Finance approves",                  desc: "Budget approver acts." },
  { num: "04", label: "Company representative signs",      desc: "Authorized signatory completes the company side." },
  { num: "05", label: "Vendor signs",                      desc: "Supplier completes and signs." },
  { num: "06", label: "Completion and verification",       desc: "Completed record stored and accessible." },
];

export const EDUCATION_WORKFLOW: WorkflowStep[] = [
  { num: "01", label: "Institution prepares the form",     desc: "Approved template for the enrollment or policy acknowledgment." },
  { num: "02", label: "Student and guardian assigned",     desc: "Both assigned where guardian signature is required." },
  { num: "03", label: "Invitations sent",                  desc: "Secure signing invitations delivered." },
  { num: "04", label: "Acknowledgments completed",         desc: "Required fields completed by each participant." },
  { num: "05", label: "Records retained per policy",       desc: "Completed records accessible to authorized staff." },
];
