// eSignature section — shared content data.
// All page copy, feature lists, and structured data lives here.

export const ESIG_SUBNAV = [
  { label: "Overview",              path: "/esignature" },
  { label: "Core Workflow",         path: "/esignature/core-workflow" },
  { label: "Verification & Audit",  path: "/esignature/verification-and-audit" },
  { label: "Advanced Capabilities", path: "/esignature/advanced-capabilities" },
  { label: "Templates & Branding",  path: "/esignature/templates-and-branding" },
  { label: "Team & Enterprise",     path: "/esignature/team-and-enterprise" },
];

export const OVERVIEW_FEATURES = [
  { icon: "📄", title: "Document Preparation",     desc: "Upload PDFs, configure fields, set instructions, and prepare the document before it goes out." },
  { icon: "👥", title: "Recipient Management",      desc: "Add signers, approvers, reviewers, and copy recipients — each with their own role and access level." },
  { icon: "🔀", title: "Parallel & Sequential Routing", desc: "Control the order documents move through participants. Send to everyone at once or in a defined sequence." },
  { icon: "🔐", title: "Signer Authentication",     desc: "Confirm participant identity at signing using secure links, email OTP, SMS OTP, or authenticator apps." },
  { icon: "📋", title: "Audit Trail",               desc: "Every invitation, view, authentication event, signature, and completion is recorded with timestamp and evidence." },
  { icon: "🔍", title: "Document Verification",     desc: "Completed documents receive a Verification ID and QR code that anyone can use to confirm status — no account needed." },
  { icon: "📁", title: "Templates",                 desc: "Save and reuse complete signing workflows — fields, routing, authentication, and branding — as reusable templates." },
  { icon: "🏢", title: "Team Workspaces",           desc: "Manage multiple senders, shared templates, role-based access, and organization-wide settings in one workspace." },
];

export const LIFECYCLE_STEPS = [
  { num: 1,  role: "sender",    title: "Prepare",          desc: "Upload a PDF and set up the document for signing." },
  { num: 2,  role: "sender",    title: "Add Participants",  desc: "Define who signs, approves, reviews, or receives a copy." },
  { num: 3,  role: "sender",    title: "Configure Routing", desc: "Set the order and authentication requirements for each participant." },
  { num: 4,  role: "sender",    title: "Place Fields",      desc: "Position signature, initial, date, and other required fields on the document." },
  { num: 5,  role: "sender",    title: "Send",              desc: "Review the transaction summary and send secure invitations to all participants." },
  { num: 6,  role: "recipient", title: "Open Invitation",   desc: "Participant opens the secure invitation link from email." },
  { num: 7,  role: "recipient", title: "Authenticate",      desc: "Participant completes the configured identity verification step." },
  { num: 8,  role: "recipient", title: "Sign or Approve",   desc: "Participant reviews the document and completes required fields and signature." },
  { num: 9,  role: "sender",    title: "Track Progress",    desc: "Monitor who has signed, who is pending, and any incomplete actions in real time." },
  { num: 10, role: "both",      title: "Complete & Verify", desc: "When all participants complete, the verified record is available with a Verification ID." },
];

export const PARTICIPANT_ROLES = [
  { label: "Signer",          desc: "Must complete assigned signature and initial fields." },
  { label: "Approver",        desc: "Reviews the document and records approval without necessarily signing." },
  { label: "Reviewer",        desc: "Reviews the document but does not sign or approve." },
  { label: "Viewer",          desc: "Receives a copy of the document for reference." },
  { label: "Copy Recipient",  desc: "Receives the completed document automatically upon completion." },
];

export const AUTH_METHODS = [
  { label: "Secure Invitation Link",  desc: "Unique one-time link delivered to the participant's email.", available: true },
  { label: "Email OTP",               desc: "One-time passcode sent to the participant's registered email.", available: true },
  { label: "SMS OTP",                 desc: "One-time passcode delivered via SMS.", available: true },
  { label: "Authenticator App",       desc: "TOTP-based verification via the participant's authenticator application.", available: true },
  { label: "Account Authentication",  desc: "Participant authenticates through their LAGDA account.", available: true },
  { label: "Enterprise SSO",          desc: "Authentication via the organization's identity provider.", available: false, label2: "Enterprise" },
];

export const TRANSACTION_STATUSES = [
  { status: "Draft",               color: "#94A3B8", desc: "Transaction prepared but not yet sent." },
  { status: "Sent",                color: "#38BDF8", desc: "Invitations dispatched to all participants." },
  { status: "Delivered",           color: "#38BDF8", desc: "Invitation confirmed as received." },
  { status: "Viewed",              color: "#38bdf8", desc: "Participant has opened the document." },
  { status: "Awaiting Signature",  color: "#F59E0B", desc: "Participant's action is pending." },
  { status: "Awaiting Approval",   color: "#F59E0B", desc: "An approver's decision is outstanding." },
  { status: "Partially Completed", color: "#F59E0B", desc: "Some participants have completed; others are pending." },
  { status: "Completed",           color: "#22C55E", desc: "All participants have completed their actions." },
  { status: "Declined",            color: "#DC2626", desc: "A participant chose not to sign or approve." },
  { status: "Cancelled",           color: "#8A9BAE", desc: "The sender cancelled the transaction." },
  { status: "Expired",             color: "#94a3b8", desc: "The signing deadline passed before completion." },
];

export const AUDIT_EVENTS = [
  { icon: "📤", event: "Transaction created",         who: "Mabini Legal Solutions",                 time: "14 Jul · 2:00 PM" },
  { icon: "📧", event: "Invitation sent",             who: "Ana Reyes · ana@example.ph",             time: "14 Jul · 2:01 PM" },
  { icon: "👁", event: "Document viewed",             who: "Ana Reyes · IP ···.42",                  time: "14 Jul · 2:14 PM" },
  { icon: "🔑", event: "Email OTP verified",          who: "Ana Reyes",                              time: "14 Jul · 2:15 PM" },
  { icon: "✍️", event: "Signed",                      who: "Ana Reyes · signature adopted",          time: "14 Jul · 2:16 PM" },
  { icon: "📧", event: "Approval request sent",       who: "Marco Santos · marco@example.ph",        time: "14 Jul · 2:16 PM" },
  { icon: "✅", event: "Transaction completed",        who: "All 3 participants completed",           time: "14 Jul · 4:01 PM" },
  { icon: "🔍", event: "Verification record created", who: "LAGDA-VER-2026-004821",                  time: "14 Jul · 4:01 PM" },
];

export const VERIFICATION_STATES = [
  { id: "verified",   label: "Verified",      statusText: "DOCUMENT VERIFIED",        icon: "✓", color: "#22C55E", bg: "rgba(34,197,94,0.1)" },
  { id: "mismatch",   label: "File Mismatch", statusText: "FILE MISMATCH DETECTED",   icon: "✗", color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  { id: "incomplete", label: "Incomplete",    statusText: "TRANSACTION INCOMPLETE",   icon: "⏳", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  { id: "notfound",   label: "Not Found",     statusText: "NO MATCHING RECORD",       icon: "✗", color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
];

export const ADVANCED_CAPS = [
  { tier: "Core",       icon: "✓",  title: "Parallel signing",          desc: "All participants sign simultaneously. Completion requires all to respond." },
  { tier: "Core",       icon: "✓",  title: "Sequential signing",        desc: "Participants act in a defined order. Each step opens when the previous completes." },
  { tier: "Core",       icon: "✓",  title: "Mixed routing",             desc: "Groups of simultaneous signers with a defined group order between them." },
  { tier: "Core",       icon: "✓",  title: "Automated reminders",       desc: "Configurable reminder schedules dispatched automatically to pending participants." },
  { tier: "Core",       icon: "✓",  title: "Transaction expiration",    desc: "Set a deadline after which the transaction expires if not completed." },
  { tier: "Core",       icon: "✓",  title: "Manual reminders",         desc: "Send a manual reminder to a specific pending participant at any time." },
  { tier: "Core",       icon: "✓",  title: "Private instructions",      desc: "Include instructions visible only to a specific participant." },
  { tier: "Advanced",   icon: "◐",  title: "Approval steps",            desc: "Insert an approver into the workflow before or after signing steps." },
  { tier: "Advanced",   icon: "◐",  title: "Folder organization",       desc: "Group transactions into folders for easier navigation and reporting." },
  { tier: "Advanced",   icon: "◐",  title: "Tags and search",           desc: "Tag transactions and use filters to find documents quickly across your workspace." },
  { tier: "Enterprise", icon: "★",  title: "Bulk workflows",            desc: "Send the same document to many recipients as individual transactions at scale." },
  { tier: "Enterprise", icon: "★",  title: "Embedded signing",          desc: "Integrate signing into your own application or portal experience." },
  { tier: "Enterprise", icon: "★",  title: "API & webhooks",            desc: "Connect LAGDA to your systems programmatically as the platform expands." },
];

export const FIELD_TYPES = [
  { icon: "✍️",  label: "Signature",  desc: "Adopts the participant's electronic signature." },
  { icon: "🖊",  label: "Initials",   desc: "Initials at a specific page location." },
  { icon: "📝",  label: "Text",       desc: "Free-text input from the participant." },
  { icon: "📅",  label: "Date",       desc: "Auto-populated or participant-entered date." },
  { icon: "☑️",  label: "Checkbox",   desc: "Single acknowledgement or choice." },
  { icon: "👤",  label: "Full Name",  desc: "Participant's full name as recorded in their profile." },
];

export const TEMPLATE_FEATURES = [
  "Document file and page ordering",
  "Field placement for each participant role",
  "Participant roles and signing order",
  "Authentication requirements per role",
  "Approval steps",
  "Reminder schedule and expiration",
  "Email subject and message",
  "Private instructions per role",
  "Company branding settings",
  "Verification placement",
  "Tags and category",
  "Workspace-sharing permissions",
];

export const WORKSPACE_ROLES = [
  { role: "Owner",                  perms: "Full workspace control, billing, and settings." },
  { role: "Administrator",          perms: "Manage members, templates, and workspace settings." },
  { role: "Billing Administrator",  perms: "Manage billing and plan changes." },
  { role: "Template Administrator", perms: "Create, edit, and manage shared templates." },
  { role: "Sender",                 perms: "Prepare and send documents. Access own transactions." },
  { role: "Reviewer",               perms: "View transactions and audit records. Cannot send." },
  { role: "Auditor",                perms: "View audit records and verification history only." },
];

export const TEAM_CAPABILITIES = [
  { icon: "🏢", title: "Shared Workspace",     desc: "All team senders work within a single organizational workspace." },
  { icon: "📁", title: "Shared Templates",     desc: "Template administrators build once; the whole team uses." },
  { icon: "👥", title: "Contacts Library",     desc: "Shared contact directory speeds up participant setup for every sender." },
  { icon: "🎨", title: "Company Branding",     desc: "Consistent logo, header, and sender identity across all outgoing documents." },
  { icon: "🔒", title: "Role-Based Access",    desc: "Control who can send, review, administer, or audit within the workspace." },
  { icon: "📊", title: "Usage Reporting",      desc: "Monitor transaction volume, completion rates, and sender activity." },
];

export const LEGAL_NOTE = "Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction.";

export const ENOTARY_NOTE = "Electronic signing and electronic notarization are separate processes. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.";
