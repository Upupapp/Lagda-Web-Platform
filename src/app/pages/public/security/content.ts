// ── Security section — centralized content and navigation ─────────────────────

export const SECURITY_SUBNAV = [
  { label: "Overview",          path: "/security" },
  { label: "Trust Center",      path: "/security/trust-center" },
  { label: "Account Security",  path: "/security/account-security" },
  { label: "Signer Auth",       path: "/security/signer-authentication" },
  { label: "Identity",          path: "/security/identity-verification" },
  { label: "Audit Trail",       path: "/security/audit-trail" },
  { label: "Verification",      path: "/security/document-verification" },
  { label: "Evidence",          path: "/security/device-and-location-evidence" },
  { label: "Storage",           path: "/security/secure-storage" },
  { label: "Privacy",           path: "/security/privacy-and-data-protection" },
];

// ── Security layers ───────────────────────────────────────────────────────────
export const SECURITY_LAYERS = [
  { layer: "Account security",          icon: "🔐", desc: "Protects access to the LAGDA account or workspace using passwords, MFA, session management, and access history." },
  { layer: "Signing-request access",    icon: "🔗", desc: "Controls how a participant reaches a signing transaction — through a secure link, account login, or enterprise session." },
  { layer: "Signer authentication",     icon: "🔑", desc: "Increases confidence that the right participant is acting — via OTP, authenticator app, account login, or identity check." },
  { layer: "Signature adoption",        icon: "✍️", desc: "How the participant creates or applies their visible signature — type, draw, upload, or certificate-based." },
  { layer: "Audit evidence",            icon: "📋", desc: "Records of every transaction event: delivery, viewing, authentication, signing, completion, and verification." },
  { layer: "Document integrity",        icon: "🔍", desc: "Reference data that helps determine whether a document matches the recorded completed transaction." },
  { layer: "Storage and access",        icon: "💾", desc: "Secure storage, workspace separation, and controlled access to documents and evidence records." },
];

// ── Auth method comparison ────────────────────────────────────────────────────
export const AUTH_COMPARISON = [
  {
    method: "Secure link",
    experience: "Simple — just click the invitation link",
    independentChannel: false,
    evidenceRecorded: ["Link access event", "IP address", "Browser", "Time"],
    typicalUse: "Standard, low-risk transactions",
    tier: "Core",
  },
  {
    method: "Email OTP",
    experience: "Enter a code from the same email account",
    independentChannel: false,
    evidenceRecorded: ["OTP verified event", "IP address", "Browser", "Time"],
    typicalUse: "Additional friction where email confirmation is sufficient",
    tier: "Core",
  },
  {
    method: "SMS OTP",
    experience: "Enter a code received on a mobile number",
    independentChannel: true,
    evidenceRecorded: ["OTP verified event", "Channel (SMS)", "IP", "Time"],
    typicalUse: "Transactions where a separate channel increases confidence",
    tier: "Advanced",
  },
  {
    method: "Authenticator app",
    experience: "Enter a time-based code from an app",
    independentChannel: true,
    evidenceRecorded: ["TOTP verified event", "IP", "Time"],
    typicalUse: "Higher-assurance transactions for enrolled participants",
    tier: "Advanced",
  },
  {
    method: "Account login",
    experience: "Participant signs in to their LAGDA account",
    independentChannel: false,
    evidenceRecorded: ["Account auth event", "Session", "IP", "Time"],
    typicalUse: "Internal team transactions with registered users",
    tier: "Core",
  },
  {
    method: "Enterprise SSO",
    experience: "Authenticate through organization identity provider",
    independentChannel: true,
    evidenceRecorded: ["IdP auth event", "Claims", "Session", "IP"],
    typicalUse: "Enterprise workspaces with centralized identity",
    tier: "Enterprise",
  },
];

// ── Evidence types ────────────────────────────────────────────────────────────
export const EVIDENCE_TYPES = [
  { type: "IP address",        public: false, desc: "Approximate network location at time of action." },
  { type: "Browser",           public: false, desc: "Browser name and version reported by the device." },
  { type: "Operating system",  public: false, desc: "Device OS reported at the time of action." },
  { type: "Device category",   public: false, desc: "Desktop, mobile, or tablet classification." },
  { type: "User agent",        public: false, desc: "Full browser user-agent string." },
  { type: "Timestamp",         public: true,  desc: "Date and time of each transaction event." },
  { type: "Session identifier",public: false, desc: "Unique reference for the participant session." },
  { type: "Approx. location",  public: false, desc: "IP-based location estimate. May be inaccurate or VPN-affected." },
];

// ── Public vs private evidence ────────────────────────────────────────────────
export const PUBLIC_EVIDENCE = [
  "Verification ID",
  "Transaction status",
  "Completion date",
  "Document description",
  "File match result",
];

export const PRIVATE_EVIDENCE = [
  "Signer identities and email addresses",
  "Mobile numbers",
  "IP addresses and device data",
  "Authentication event details",
  "Exact location information",
  "Audit trail detail",
  "Confidential document content",
];

// ── Data categories ───────────────────────────────────────────────────────────
export const DATA_CATEGORIES = [
  { category: "Account data",      examples: "Name, email, password hash, MFA state, login history" },
  { category: "Workspace data",    examples: "Members, roles, settings, branding, billing records" },
  { category: "Document data",     examples: "Uploaded PDFs, field configuration, document status" },
  { category: "Participant data",  examples: "Name, email, mobile number, role, authentication result" },
  { category: "Authentication data", examples: "OTP events, auth method used, verification result" },
  { category: "Audit data",        examples: "Event log, timestamps, device data, IP addresses" },
  { category: "Verification data", examples: "Verification ID, record status, file comparison result" },
  { category: "Usage data",        examples: "Transaction volume, storage used, API calls" },
];

// ── Storage lifecycle stages ──────────────────────────────────────────────────
export const STORAGE_STAGES = [
  { stage: "Upload",        icon: "📤", desc: "Document is uploaded during preparation. Held in draft state until sent." },
  { stage: "Active",        icon: "⚡", desc: "Transaction is live. Participants have access. Events are recorded." },
  { stage: "Completed",     icon: "✅", desc: "All required participants have acted. Verification record is generated." },
  { stage: "Archived",      icon: "📦", desc: "Transaction closed. Document and audit records are retained per workspace policy." },
  { stage: "Expired",       icon: "⏰", desc: "Transaction expired before completion. Records retained; document locked." },
  { stage: "Deleted",       icon: "🗑️", desc: "Document removed per workspace retention policy or user request." },
];

// ── Privacy principles ────────────────────────────────────────────────────────
export const PRIVACY_PRINCIPLES = [
  { icon: "📏", title: "Data minimization",       desc: "Collect only what is needed for the transaction and workspace function." },
  { icon: "🎯", title: "Purpose limitation",       desc: "Use data only for the purpose it was collected." },
  { icon: "🔒", title: "Controlled access",        desc: "Restrict evidence access by role — not all users see all details." },
  { icon: "🔐", title: "Public/private separation", desc: "Public verification exposes only essential status. Private audit detail is access-controlled." },
  { icon: "📌", title: "Explicit permission",       desc: "Precise device location requires explicit participant permission." },
  { icon: "🧹", title: "Retention controls",        desc: "Retention periods should be defined per workspace and comply with applicable requirements." },
  { icon: "👁️", title: "User transparency",       desc: "Users should understand what is collected and how it is used." },
  { icon: "🗑️", title: "Secure deletion",          desc: "Deletion requests should result in secure and verifiable removal." },
];

// ── Trust center resources ────────────────────────────────────────────────────
export const TRUST_RESOURCES = [
  { title: "Privacy Policy",          desc: "How we collect, use, and protect your data.", path: "/legal/privacy" },
  { title: "Terms of Service",        desc: "Rights, responsibilities, and usage terms.", path: "/legal/terms" },
  { title: "Accessibility Statement", desc: "Our commitment to accessible digital experiences.", path: "/legal/accessibility" },
  { title: "Service Status",          desc: "Real-time status of LAGDA services.", path: "/service-status" },
  { title: "Contact LAGDA",           desc: "Security questions, responsible disclosure, and support.", path: "/contact" },
  { title: "Document Verification",   desc: "Verify a LAGDA-signed document using a Verification ID or QR code.", path: "/verify" },
];

// ── Legal ─────────────────────────────────────────────────────────────────────
export const SECURITY_LEGAL_NOTE = "Some documents may still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities. Users remain responsible for determining the requirements that apply to each transaction.";
export const ENOTARY_NOTE = "Electronic signing and electronic notarization are separate processes. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.";
