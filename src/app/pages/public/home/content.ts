// Home-page content data.
// Keep copy, icons, paths, and structured data here — components stay presentational.

export const CAPABILITIES = [
  {
    icon: "📄",
    title: "Document Preparation",
    desc: "Upload a PDF, add required fields, place signature and initial boxes, set instructions, and configure reminders.",
    path: "/esignature/core-workflow",
    available: true,
  },
  {
    icon: "👥",
    title: "Participant Management",
    desc: "Define who signs, approves, reviews, or receives a copy — and control when each participant can act.",
    path: "/esignature/core-workflow",
    available: true,
  },
  {
    icon: "🔀",
    title: "Parallel & Sequential Routing",
    desc: "Route documents in order, simultaneously, or in a mixed sequence that matches your actual workflow.",
    path: "/esignature/advanced-capabilities",
    available: true,
  },
  {
    icon: "🔐",
    title: "Signer Authentication",
    desc: "Confirm participant identity using secure access links, email OTP, SMS OTP, authenticator apps, or enterprise SSO.",
    path: "/features/signer-authentication",
    available: true,
  },
  {
    icon: "📋",
    title: "Audit Trail",
    desc: "Every invitation, view, authentication, signature, and completion is recorded with timestamp and contextual evidence.",
    path: "/esignature/verification-and-audit",
    available: true,
  },
  {
    icon: "🔍",
    title: "Document Verification",
    desc: "Verify a completed LAGDA document using a QR code, Verification ID, or secure verification link.",
    path: "/verify",
    available: true,
  },
  {
    icon: "📁",
    title: "Templates & Branding",
    desc: "Save reusable workflows — fields, routing, authentication settings, reminders, and company branding — as templates.",
    path: "/esignature/templates-and-branding",
    available: true,
  },
  {
    icon: "🏢",
    title: "Team Workspaces",
    desc: "Manage shared senders, role-based access, activity reporting, and organization-wide settings.",
    path: "/esignature/team-and-enterprise",
    available: true,
  },
];

export const HOW_IT_WORKS = [
  {
    num: 1,
    title: "Prepare",
    short: "Upload and set up",
    desc: "Upload a PDF, add required signature and initial fields, write signing instructions, and set a deadline.",
    icon: "📄",
    mockLabel: "Professional Services Agreement",
    mockSub: "Adding signature fields on page 3 of 4",
  },
  {
    num: 2,
    title: "Add Participants",
    short: "Define who acts",
    desc: "Add participants by email. Assign each a role: signer, approver, viewer, or copy recipient.",
    icon: "👥",
    mockLabel: "3 participants added",
    mockSub: "Ana Reyes (Signer), Marco Santos (Approver), Lea Cruz (CC)",
  },
  {
    num: 3,
    title: "Configure Workflow",
    short: "Set order and auth",
    desc: "Choose signing order, select authentication requirements for each participant, and configure reminders.",
    icon: "⚙️",
    mockLabel: "Sequential → Parallel",
    mockSub: "Ana signs first, then Marco approves — Lea gets a copy",
  },
  {
    num: 4,
    title: "Authenticate & Sign",
    short: "Secure access",
    desc: "Each participant receives a secure invitation, authenticates as configured, and adopts their signature on the document.",
    icon: "✍️",
    mockLabel: "Ana Reyes signed",
    mockSub: "Email OTP verified · 14 July 2026 · 2:31 PM PHT",
  },
  {
    num: 5,
    title: "Track Progress",
    short: "Monitor in real time",
    desc: "See exactly where each transaction stands — who has signed, who is pending, and any incomplete actions.",
    icon: "📊",
    mockLabel: "Step 2 of 3",
    mockSub: "Awaiting approval from Marco Santos",
  },
  {
    num: 6,
    title: "Complete & Verify",
    short: "Finalize and confirm",
    desc: "Once all participants complete, download the signed document. Verify it at any time using the Verification ID or QR code.",
    icon: "✅",
    mockLabel: "LAGDA-VER-2026-004821",
    mockSub: "Document verified · All 3 participants completed",
  },
];

export const SOLUTIONS = [
  {
    id: "lawyers",
    title: "Lawyers",
    path: "/solutions/lawyers",
    desc: "Retainers, engagement letters, representation agreements, and client correspondence.",
    note: "Use where appropriate for the document and applicable legal formalities.",
  },
  {
    id: "law-firms",
    title: "Law Firms",
    path: "/solutions/law-firms",
    desc: "Firm-wide templates, multi-attorney routing, consistent branding, and centralized client records.",
    note: "",
  },
  {
    id: "business",
    title: "Business Teams",
    path: "/solutions/business",
    desc: "Contracts, NDAs, service agreements, HR documents, and internal approval workflows.",
    note: "",
  },
  {
    id: "government",
    title: "Government & LGU",
    path: "/solutions/government",
    desc: "Official correspondence, inter-agency forms, and controlled public-sector document workflows.",
    note: "",
  },
  {
    id: "real-estate",
    title: "Real Estate",
    path: "/solutions/real-estate",
    desc: "Property contracts, deed-related documents, broker agreements, and lease renewals.",
    note: "Consult applicable formality requirements for specific instruments.",
  },
  {
    id: "hr",
    title: "HR & Recruitment",
    path: "/solutions/hr",
    desc: "Employment contracts, onboarding forms, NDAs, and policy acknowledgements.",
    note: "",
  },
];

export const TRUST_LAYERS = [
  {
    num: "01",
    title: "Account Security",
    desc: "Multi-factor authentication, session management, and access controls for every account.",
  },
  {
    num: "02",
    title: "Signing-Request Access",
    desc: "Each participant receives a unique secure invitation. Forwarding alone does not grant signing authority.",
  },
  {
    num: "03",
    title: "Signer Authentication",
    desc: "Identity is confirmed at the moment of signing using the authentication method configured for each participant.",
  },
  {
    num: "04",
    title: "Document Integrity",
    desc: "LAGDA records a document fingerprint at completion. Any modification can be detected during verification.",
  },
  {
    num: "05",
    title: "Audit Evidence",
    desc: "Every significant event in a transaction is recorded — invitations, views, authentications, signatures, and completions.",
  },
  {
    num: "06",
    title: "Verification Records",
    desc: "Completed documents receive a Verification ID. Anyone with the ID or QR code can confirm the document's LAGDA status.",
  },
];

export const PRICING_PLANS = [
  {
    tier: "Personal",
    for: "Individuals and solo practitioners",
    highlight: false,
    features: [
      "Up to 5 signing requests per month",
      "Single sender",
      "Standard templates",
      "Email and QR verification",
      "Audit trail",
    ],
    cta: "Get Started Free",
    ctaPath: "/create-account",
  },
  {
    tier: "Business",
    for: "Teams and growing organizations",
    highlight: true,
    features: [
      "Higher monthly sending limits",
      "Multiple team senders",
      "Shared template library",
      "Company branding",
      "Team workspace and role management",
      "Usage reports",
    ],
    cta: "Start Free Trial",
    ctaPath: "/create-account",
    badge: "Recommended for Teams",
  },
  {
    tier: "Enterprise",
    for: "Large organizations and institutions",
    highlight: false,
    features: [
      "Custom sending limits",
      "Enterprise workspace controls",
      "Dedicated onboarding support",
      "API-ready architecture",
      "Custom integrations by arrangement",
      "Priority support",
    ],
    cta: "Contact Sales",
    ctaPath: "/contact",
  },
];

export const RESOURCES = [
  {
    title: "Getting Started with eSignature",
    desc: "Prepare and send your first LAGDA document in minutes.",
    path: "/resources",
    icon: "📖",
    tag: "Guide",
  },
  {
    title: "How Document Verification Works",
    desc: "Understand the QR code, Verification ID, and public verification record.",
    path: "/resources/guides",
    icon: "🔍",
    tag: "Guide",
  },
  {
    title: "eSignature Legal Framework",
    desc: "The Philippine legal context for electronic signatures and LAGDA's design approach.",
    path: "/resources/legal",
    icon: "⚖️",
    tag: "Reference",
  },
];

export const MOCK_VERIFICATION_STATES = [
  {
    id: "verified",
    label: "Verified",
    statusText: "DOCUMENT VERIFIED",
    statusColor: "#22C55E",
    statusBg: "rgba(34,197,94,0.1)",
    icon: "✓",
    fields: [
      { label: "Verification ID", value: "LAGDA-VER-2026-004821", mono: true },
      { label: "Status",          value: "Completed" },
      { label: "Completed",       value: "14 July 2026, 2:47 PM PHT" },
      { label: "Workspace",       value: "Mabini Legal Solutions" },
      { label: "Document Match",  value: "Confirmed" },
      { label: "Participants",    value: "3 of 3 completed" },
    ],
  },
  {
    id: "mismatch",
    label: "File Mismatch",
    statusText: "FILE MISMATCH DETECTED",
    statusColor: "#DC2626",
    statusBg: "rgba(220,38,38,0.1)",
    icon: "✗",
    fields: [
      { label: "Verification ID", value: "LAGDA-VER-2026-004821", mono: true },
      { label: "Record Status",   value: "Completed" },
      { label: "Warning",         value: "The submitted file does not match the LAGDA record for this Verification ID.", mono: false },
    ],
  },
  {
    id: "incomplete",
    label: "Incomplete",
    statusText: "TRANSACTION INCOMPLETE",
    statusColor: "#F59E0B",
    statusBg: "rgba(245,158,11,0.1)",
    icon: "⏳",
    fields: [
      { label: "Verification ID", value: "LAGDA-VER-2026-004788", mono: true },
      { label: "Status",          value: "Awaiting signatures" },
      { label: "Note",            value: "This document has not yet been completed and cannot be verified." },
    ],
  },
  {
    id: "notfound",
    label: "Not Found",
    statusText: "NO MATCHING RECORD",
    statusColor: "#DC2626",
    statusBg: "rgba(220,38,38,0.08)",
    icon: "✗",
    fields: [
      { label: "Searched",        value: "LAGDA-VER-2026-000000", mono: true },
      { label: "Result",          value: "No verification record was found for this ID." },
    ],
  },
];
