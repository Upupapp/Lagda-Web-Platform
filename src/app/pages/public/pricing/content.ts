// Pricing section — page content, FAQ data, and route metadata.

export const PRICING_SUBNAV = [
  { label: "Overview",              path: "/pricing"                        },
  { label: "Compare Plans",         path: "/pricing/compare"                },
  { label: "Signing Requests",      path: "/pricing/signing-requests"       },
  { label: "Storage",               path: "/pricing/storage-limits"         },
  { label: "Templates",             path: "/pricing/templates-by-plan"      },
  { label: "Authentication",        path: "/pricing/authentication-by-plan" },
  { label: "Enterprise",            path: "/pricing/enterprise"             },
  { label: "FAQ",                   path: "/pricing/faq"                    },
];

export const PRICING_FAQ_GROUPS = [
  {
    id: "plans-billing",
    title: "Plans and Billing",
    items: [
      {
        id: "which-plan",
        q: "Which plan should I choose?",
        a: "Start on Free to try LAGDA with one document. If you send documents on your own, Personal adds 50 documents a month, your branding, sharing and ready-made templates. If you work with a team, Business adds members, teams, roles and join links. Enterprise is coming soon.",
      },
      {
        id: "free-plan",
        q: "Is there a free plan?",
        a: "Yes, a free plan: every new account starts on Free, which sends one document for signing and signs anything sent to you, without limit. There is no time-limited trial. Upgrade to Personal or Business from My Settings › Plan & Billing.",
      },
      {
        id: "change-plans",
        q: "Can I change plans?",
        a: "Yes. Choose Personal or Business in My Settings › Plan & Billing. A paid plan runs month by month; when a month ends without renewal the account returns to Free, and nothing is deleted.",
      },
      {
        id: "annual-billing",
        q: "Is annual billing available?",
        a: "Not yet. Plans are monthly for now.",
      },
      {
        id: "taxes",
        q: "Are taxes included in the price?",
        a: "Applicable taxes will be disclosed before any billing is confirmed. LAGDA does not make definitive tax statements in advance of approved billing terms.",
      },
      {
        id: "enterprise-custom",
        q: "Is enterprise pricing customized?",
        a: "Enterprise is coming soon and will be priced for each organization. Contact us to be told when it opens.",
      },
    ],
  },
  {
    id: "usage",
    title: "Usage and Limits",
    items: [
      {
        id: "signing-request-def",
        q: "What counts as a signing request?",
        a: "A document you send for signing to one or more participants. It counts once it is sent; drafts never count. Signing documents other people send you never counts.",
      },
      {
        id: "participants-count",
        q: "How many participants can a request include?",
        a: "As many as the document needs, on every plan. A document with five participants still counts as one.",
      },
      {
        id: "limit-reached",
        q: "What happens when a signing-request limit is reached?",
        a: "On Free, once your one document is sent, sending pauses until you choose Personal or Business; your drafts are kept. Signing documents sent to you is never limited.",
      },
      {
        id: "storage-measure",
        q: "How is storage measured?",
        a: "Storage covers documents, completed records, templates and workspace assets: 500 MB on Free, 5 GB on Personal and 50 GB shared on Business.",
      },
      {
        id: "completed-docs",
        q: "Can I still access completed documents if a limit is reached?",
        a: "Yes. Completed documents and their audit trails stay available on every plan, including Free.",
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    items: [
      {
        id: "templates-which-plan",
        q: "Which plans include templates?",
        a: "Every plan has templates (Free: 3, blank only). Personal adds ready-made templates and the LAGDA Chatbot. On Business, templates are shared with your team.",
      },
      {
        id: "branding-which-plan",
        q: "Which plans include company branding?",
        a: "Your logo and colours are part of Personal and Business. On Business they are your company's, shown across the workspace.",
      },
      {
        id: "auth-which-plan",
        q: "Which authentication methods are available by plan?",
        a: "Every plan has the same signer authentication: a secure invitation link and an email code, or signing from a LAGDA account. Every account can also turn on two-step verification for its own sign-in.",
      },
      {
        id: "doc-verification-included",
        q: "Is Document Verification included?",
        a: "Yes. Document Verification — including Verification IDs and QR codes — is included on all plans.",
      },
      {
        id: "api-available",
        q: "Are APIs available?",
        a: "Not at the moment.",
      },
    ],
  },
  {
    id: "enotary",
    title: "LAGDA eNotary",
    items: [
      {
        id: "enotary-included",
        q: "Is LAGDA eNotary included in any plan?",
        a: "No. LAGDA eNotary is a separate future regulated product and is not included in current LAGDA eSignature plans. It is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.",
      },
      {
        id: "enotary-purchase",
        q: "Can I purchase LAGDA eNotary now?",
        a: "No. LAGDA eNotary is Coming Soon and is not currently available for purchase. It is Subject to Supreme Court Accreditation and applicable rules. You may join the waitlist for updates.",
      },
    ],
  },
];

export const SIGNING_REQUEST_NOTES = [
  {
    icon: "📤",
    title: "What is a signing request?",
    body: "A signing request is one transaction sent to one or more participants for action — signing, approving, reviewing, or acknowledging. A single request may include multiple signers, approvers, and copy recipients.",
  },
  {
    icon: "📋",
    title: "Drafts do not count",
    body: "A document in draft — prepared but not yet sent — does not count toward your signing-request allowance. Allowance is typically measured from the point a transaction is sent.",
  },
  {
    icon: "👥",
    title: "Multiple participants, one request",
    body: "A transaction with five participants still counts as one signing request. The number of participants in a single transaction does not multiply your usage.",
  },
  {
    icon: "✅",
    title: "Completed, cancelled, and voided",
    body: "A sent document counts once, whatever happens next: completing, declining, expiring or voiding it does not give it back.",
  },
  {
    icon: "📊",
    title: "Workspace visibility",
    body: "Your plan and the Free document are shown in My Settings › Plan & Billing; the workspace's monthly totals are in Workspace Settings › Usage.",
  },
  {
    icon: "⚠️",
    title: "Limit-reached behavior",
    body: "On Free, sending pauses after your one document until you choose Personal or Business. Your drafts are kept, and signing what others send you is never limited.",
  },
];

export const STORAGE_CATEGORIES = [
  { icon: "📄", label: "Draft documents",       desc: "Documents being prepared but not yet sent." },
  { icon: "📤", label: "Active transactions",    desc: "Transactions that have been sent and are awaiting participant action." },
  { icon: "✅", label: "Completed records",       desc: "Completed transactions including signed documents and audit records." },
  { icon: "📋", label: "Audit records",           desc: "Records of all transaction events, including authentication evidence." },
  { icon: "📑", label: "Templates",              desc: "Reusable document workflow configurations." },
  { icon: "📎", label: "Attachments",            desc: "Supplementary files included with transactions." },
  { icon: "🎨", label: "Branding assets",         desc: "Your logo and colours." },
  { icon: "🏢", label: "Workspace assets",        desc: "Shared resources associated with your organization workspace." },
];

export const ENTERPRISE_NEEDS = [
  { icon: "📊", title: "High sending volume",        desc: "Organizations that send frequently need volume arrangements beyond standard plan limits." },
  { icon: "👥", title: "Multiple departments",        desc: "Complex organizations may need workspace structures that reflect real organizational boundaries." },
  { icon: "🎨", title: "Custom workspace structure",  desc: "Workspace roles, permissions, and administrative boundaries tailored to your organization." },
  { icon: "📞", title: "Custom onboarding and support", desc: "Dedicated onboarding, training, and support aligned to your team's rollout needs." },
];
