// ── Features section — centralized content and navigation ─────────────────────

export const FEATURES_GROUPS = [
  {
    label: "Overview",
    groupKey: "overview",
    paths: ["/features"],
    linkTo: "/features",
  },
  {
    label: "Core Workflow",
    groupKey: "core",
    paths: [
      "/features/document-preparation",
      "/features/participant-roles",
      "/features/parallel-signing",
      "/features/sequential-signing",
    ],
    linkTo: "/features/document-preparation",
  },
  {
    label: "Trust & Evidence",
    groupKey: "trust",
    paths: [
      "/features/signer-authentication",
      "/features/identity-aware-signing",
      "/features/audit-trail",
      "/features/document-verification",
    ],
    linkTo: "/features/signer-authentication",
  },
  {
    label: "Productivity",
    groupKey: "productivity",
    paths: [
      "/features/templates",
      "/features/contacts",
      "/features/company-branding",
      "/features/notifications",
    ],
    linkTo: "/features/templates",
  },
  {
    label: "Team & Scale",
    groupKey: "team",
    paths: [
      "/features/team-workspaces",
      "/features/storage-and-plan-limits",
      "/features/api-and-integrations",
    ],
    linkTo: "/features/team-workspaces",
  },
] as const;

// ── Feature capability cards (for Overview) ───────────────────────────────────
export const OVERVIEW_CAPABILITIES = [
  // Core Workflow
  { icon: "📄", title: "Document Preparation", desc: "Upload PDFs, place fields, assign participants, and review before sending.", path: "/features/document-preparation", group: "Core Workflow" },
  { icon: "👥", title: "Participant Roles", desc: "Assign Signers, Approvers, Reviewers, Viewers, and Copy Recipients.", path: "/features/participant-roles", group: "Core Workflow" },
  { icon: "⚡", title: "Parallel Signing", desc: "Several participants act at the same time. Useful when order doesn't matter.", path: "/features/parallel-signing", group: "Core Workflow" },
  { icon: "↕️", title: "Sequential Signing", desc: "Participants act in a defined order, one step unlocking the next.", path: "/features/sequential-signing", group: "Core Workflow" },
  // Trust & Evidence
  { icon: "🔑", title: "Signer Authentication", desc: "Increase confidence with email OTP, SMS OTP, authenticator app, and more.", path: "/features/signer-authentication", group: "Trust & Evidence" },
  { icon: "🪪", title: "Identity-Aware Signing", desc: "Layers access, authentication, intent, and document-integrity evidence.", path: "/features/identity-aware-signing", group: "Trust & Evidence" },
  { icon: "📋", title: "Audit Trail", desc: "Every transaction event — delivery, viewing, authentication, signing — recorded.", path: "/features/audit-trail", group: "Trust & Evidence" },
  { icon: "🔍", title: "Document Verification", desc: "QR code, Verification ID, or link to confirm a document matches its record.", path: "/features/document-verification", group: "Trust & Evidence" },
  // Productivity
  { icon: "📑", title: "Templates", desc: "Save any workflow as a reusable template. Build once. Use every time.", path: "/features/templates", group: "Productivity" },
  { icon: "📇", title: "Contacts", desc: "Save participants for recurring document workflows. Reduce setup time.", path: "/features/contacts", group: "Productivity" },
  { icon: "🏢", title: "Company Branding", desc: "Apply workspace logo and identity to signing invitations and pages.", path: "/features/company-branding", group: "Productivity" },
  { icon: "🔔", title: "Notifications", desc: "Stay informed when documents are signed, viewed, declined, or expiring.", path: "/features/notifications", group: "Productivity" },
  // Team & Scale
  { icon: "🗂️", title: "Team Workspaces", desc: "Multiple senders, shared templates, roles, and unified administration.", path: "/features/team-workspaces", group: "Team & Scale" },
  { icon: "📊", title: "Storage & Plan Limits", desc: "Understand capacity, storage, and what to expect as volume grows.", path: "/features/storage-and-plan-limits", group: "Team & Scale" },
  { icon: "🔌", title: "API & Integrations", desc: "Enterprise integration direction for embedded signing and system connections.", path: "/features/api-and-integrations", group: "Team & Scale" },
];

// ── Participant roles ─────────────────────────────────────────────────────────
export const PARTICIPANT_ROLES = [
  { role: "Signer",           icon: "✍️", desc: "Completes required signature and initials fields assigned to them." },
  { role: "Approver",         icon: "✅", desc: "Reviews and approves the document without necessarily applying a signature." },
  { role: "Reviewer",         icon: "👁️", desc: "Reviews before or during the workflow, depending on routing configuration." },
  { role: "Viewer",           icon: "📖", desc: "Can access and read the document without taking a signing or approval action." },
  { role: "Copy Recipient",   icon: "📬", desc: "Receives a copy or completion notice after the transaction is finished." },
  { role: "Sender",           icon: "📤", desc: "Prepares the document, assigns participants, configures routing, and manages the transaction." },
];

// ── Authentication methods ────────────────────────────────────────────────────
export const AUTH_METHODS = [
  { method: "Secure invitation link", tier: "Core",       desc: "Recipient accesses the transaction via a time-limited secure link delivered to their email address.", channel: "Email" },
  { method: "Verified email access",  tier: "Core",       desc: "Confirms the recipient can access the email account where the invitation was sent.", channel: "Email" },
  { method: "Email OTP",              tier: "Core",       desc: "One-time code sent to the participant's email address before they can proceed.", channel: "Email" },
  { method: "SMS OTP",                tier: "Advanced",   desc: "One-time code sent to a verified mobile number — a separate channel from the invitation email.", channel: "SMS" },
  { method: "Authenticator app",      tier: "Advanced",   desc: "Time-based code from the participant's authenticator application.", channel: "App" },
  { method: "Account authentication", tier: "Core",       desc: "Participant signs in to their LAGDA account to access the transaction.", channel: "Account" },
  { method: "Identity-document validation", tier: "Enterprise", desc: "Additional check using a government-issued ID where configured.", channel: "Identity" },
  { method: "Enterprise SSO",         tier: "Enterprise", desc: "Authenticate through the organization's identity provider.", channel: "SSO" },
] as const;

// ── Audit events ──────────────────────────────────────────────────────────────
export const AUDIT_EVENTS = [
  { icon: "📄", event: "Transaction created",    who: "Ana Reyes · Sender",        time: "09:00 AM, 14 Jul 2026" },
  { icon: "📎", event: "Document uploaded",       who: "System",                    time: "09:00 AM, 14 Jul 2026" },
  { icon: "📧", event: "Invitation sent",         who: "Marco Santos · Signer",     time: "09:01 AM, 14 Jul 2026" },
  { icon: "✉️", event: "Delivery confirmed",     who: "System",                    time: "09:01 AM, 14 Jul 2026" },
  { icon: "👁️", event: "Document viewed",       who: "Marco Santos · Signer",     time: "10:14 AM, 14 Jul 2026" },
  { icon: "🔑", event: "Authentication completed", who: "Marco Santos · Signer",   time: "10:14 AM, 14 Jul 2026" },
  { icon: "✍️", event: "Signature adopted",     who: "Marco Santos · Signer",     time: "10:16 AM, 14 Jul 2026" },
  { icon: "✅", event: "Transaction completed",  who: "System",                    time: "10:16 AM, 14 Jul 2026" },
  { icon: "🔍", event: "Verification ID generated", who: "System",                 time: "10:16 AM, 14 Jul 2026" },
];

// ── Verification states ───────────────────────────────────────────────────────
export const VERIFICATION_STATES = [
  {
    id: "verified",
    label: "Verified",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
    desc: "The uploaded file matches the record for LAGDA-VER-2026-004821. The transaction was completed on 14 July 2026.",
    public: ["Verification ID: LAGDA-VER-2026-004821", "Status: Completed", "Completed: 14 Jul 2026", "Document: Professional Services Agreement", "File match: Confirmed"],
  },
  {
    id: "mismatch",
    label: "File Mismatch",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    desc: "A record exists for LAGDA-VER-2026-004821, but the uploaded file does not match the recorded completed document.",
    public: ["Verification ID: LAGDA-VER-2026-004821", "Status: Completed", "Completed: 14 Jul 2026", "File match: Not confirmed — file may have been altered"],
  },
  {
    id: "incomplete",
    label: "Incomplete Transaction",
    color: "#94A3B8",
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.25)",
    desc: "A transaction matching this ID exists, but it has not yet been completed. Verification is not available until all required participants have acted.",
    public: ["Verification ID: LAGDA-VER-2026-PENDING", "Status: In progress", "File match: Not available"],
  },
  {
    id: "notfound",
    label: "No Record Found",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    desc: "No LAGDA transaction was found matching the supplied Verification ID. The ID may be incorrect, or the transaction may not exist.",
    public: ["Verification ID: Not found", "Recommendation: Verify the ID is correct and retry"],
  },
];

// ── Notification events ───────────────────────────────────────────────────────
export const NOTIFICATION_EVENTS = [
  { icon: "✍️", title: "Signature completed",    desc: "Marco Santos signed Professional Services Agreement.", time: "Just now",   action: true },
  { icon: "👁️", title: "Document viewed",       desc: "Lea Cruz opened the NDA — Standard document.",       time: "3 min ago",  action: false },
  { icon: "⚠️", title: "Request expiring",      desc: "Board Resolution Template expires in 2 days.",       time: "1 hr ago",   action: true },
  { icon: "❌", title: "Participant declined",  desc: "Juan Reyes declined to sign Engagement Letter.",      time: "2 hrs ago",  action: true },
  { icon: "📬", title: "Delivery failed",       desc: "Invitation to unknown@example.com could not be delivered.", time: "Yesterday", action: true },
  { icon: "✅", title: "Transaction completed", desc: "NDA — Standard is now fully signed by all parties.",  time: "Yesterday",  action: false },
];

// ── Template data ─────────────────────────────────────────────────────────────
export const TEMPLATE_FIELDS = [
  "Stored documents and document order",
  "Field placement and field types",
  "Participant role placeholders",
  "Routing — parallel or sequential",
  "Authentication requirements per role",
  "Approval step configuration",
  "Reminder schedule",
  "Expiration policy",
  "Invitation message",
  "Company branding settings",
  "Verification ID placement",
  "Template version and status",
];

// ── Contact fields ────────────────────────────────────────────────────────────
export const CONTACT_INFO = [
  "Full name",
  "Email address",
  "Mobile number",
  "Organization",
  "Position or title",
  "Preferred authentication method",
  "Tags",
  "Notes",
  "Last transaction date",
  "Workspace visibility",
];

// ── Workspace roles ───────────────────────────────────────────────────────────
export const WORKSPACE_ROLES = [
  { role: "Owner",                  perms: "Full control over workspace, billing, and member management." },
  { role: "Administrator",          perms: "Manages members, templates, branding, and workspace settings." },
  { role: "Billing Administrator",  perms: "Manages subscription, payment, and plan details." },
  { role: "Security Administrator", perms: "Configures authentication requirements and access controls." },
  { role: "Template Administrator", perms: "Creates, edits, and manages shared templates." },
  { role: "Sender",                 perms: "Prepares and sends document transactions." },
  { role: "Reviewer",               perms: "Reviews transactions as an internal step in workflows." },
  { role: "Viewer",                 perms: "Views transaction status and documents without sending." },
  { role: "Auditor",                perms: "Access to audit records and usage reports." },
];

// ── Plan limit categories ─────────────────────────────────────────────────────
export const PLAN_LIMIT_CATEGORIES = [
  { icon: "📤", title: "Signing requests",       desc: "Monthly or annual transaction volume. Varies by plan." },
  { icon: "👤", title: "Senders",                desc: "Number of users who can send document transactions." },
  { icon: "🗂️", title: "Workspace seats",       desc: "Total members across all workspace roles." },
  { icon: "💾", title: "Storage",                desc: "Document and transaction data storage. Varies by plan." },
  { icon: "📑", title: "Templates",              desc: "Number of saved reusable workflows per workspace." },
  { icon: "📎", title: "File size per document", desc: "Maximum size per uploaded PDF. Varies by plan." },
  { icon: "🔑", title: "Authentication methods", desc: "Access to advanced methods like SMS OTP may be plan-gated." },
  { icon: "🏢", title: "Branding",               desc: "Logo and custom email branding may be plan-dependent." },
  { icon: "📊", title: "Audit access",           desc: "Duration and detail level of accessible audit records." },
  { icon: "🔌", title: "API and webhooks",       desc: "Enterprise integration access. Contact Sales." },
];

// ── Legal ─────────────────────────────────────────────────────────────────────
export const FEATURES_LEGAL_NOTE = "Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction.";
export const ENOTARY_NOTE = "Electronic signing and electronic notarization are separate processes. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.";
