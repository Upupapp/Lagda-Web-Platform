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
        a: "If you send documents on your own, the Personal plan covers individual use. If you work with a team or need shared templates, branding, and administration, the Business plan is more appropriate. Organizations with high volume, complex requirements, or integration needs should contact sales to discuss Enterprise.",
      },
      {
        id: "free-plan",
        q: "Is there a free plan or free trial?",
        a: "LAGDA offers a free trial to help you evaluate the product before committing. Trial terms will be confirmed at launch. Contact sales or create an account to get started.",
      },
      {
        id: "change-plans",
        q: "Can I change plans?",
        a: "Plan-change options and any applicable adjustments will be confirmed in the product. Contact support if you have questions about changing your plan.",
      },
      {
        id: "annual-billing",
        q: "Is annual billing available?",
        a: "Annual billing options may be available. Terms will be confirmed at launch. Contact sales for information on annual pricing.",
      },
      {
        id: "taxes",
        q: "Are taxes included in the price?",
        a: "Applicable taxes will be disclosed before any billing is confirmed. LAGDA does not make definitive tax statements in advance of approved billing terms.",
      },
      {
        id: "enterprise-custom",
        q: "Is enterprise pricing customized?",
        a: "Yes. Enterprise arrangements are tailored to your organization's volume, workspace, integration, and support requirements. Contact sales to discuss.",
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
        a: "A signing request is a transaction sent to one or more participants for action. Whether a request counts toward your allowance depends on plan terms confirmed at launch. Drafts that have not been sent do not typically count.",
      },
      {
        id: "participants-count",
        q: "How many participants can a request include?",
        a: "Participant limits per transaction may vary by plan. This will be confirmed at launch.",
      },
      {
        id: "limit-reached",
        q: "What happens when a signing-request limit is reached?",
        a: "Behavior when a limit is reached — such as pausing sending, notifying administrators, or offering additional usage — will be confirmed in the product before launch.",
      },
      {
        id: "storage-measure",
        q: "How is storage measured?",
        a: "Storage may include documents, completed records, templates, and workspace assets. Measurement approach and limits will be confirmed at launch.",
      },
      {
        id: "completed-docs",
        q: "Can I still access completed documents if a limit is reached?",
        a: "Completed document records and audit trails are generally preserved regardless of active sending status. Specific access terms will be confirmed in the product.",
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
        a: "Personal templates are available on all plans. Shared workspace templates and advanced template management are available on Business and Enterprise plans.",
      },
      {
        id: "branding-which-plan",
        q: "Which plans include company branding?",
        a: "Company branding — including logo, colors, and email customization — is available on Business and Enterprise plans.",
      },
      {
        id: "auth-which-plan",
        q: "Which authentication methods are available by plan?",
        a: "Secure invitation links, verified email access, email OTP, and account authentication are available on all plans. SMS OTP and authenticator app are available on Business and Enterprise. Enterprise SSO requires an Enterprise arrangement. See the Authentication by Plan page for details.",
      },
      {
        id: "doc-verification-included",
        q: "Is Document Verification included?",
        a: "Yes. Document Verification — including Verification IDs and QR codes — is included on all plans.",
      },
      {
        id: "api-available",
        q: "Are APIs available?",
        a: "API and webhook access are available as part of Enterprise arrangements. Contact sales to discuss integration requirements.",
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
    body: "How completed, cancelled, declined, expired, or voided transactions are treated for usage counting will be confirmed in final plan terms.",
  },
  {
    icon: "📊",
    title: "Workspace visibility",
    body: "Usage toward your allowance is visible in your workspace. Administrators on Business and Enterprise plans can monitor usage across senders.",
  },
  {
    icon: "⚠️",
    title: "Limit-reached behavior",
    body: "Behavior when a limit is reached — pausing sending, notifying administrators, or offering additional usage — will be confirmed before production launch.",
  },
];

export const STORAGE_CATEGORIES = [
  { icon: "📄", label: "Draft documents",       desc: "Documents being prepared but not yet sent." },
  { icon: "📤", label: "Active transactions",    desc: "Transactions that have been sent and are awaiting participant action." },
  { icon: "✅", label: "Completed records",       desc: "Completed transactions including signed documents and audit records." },
  { icon: "📋", label: "Audit records",           desc: "Records of all transaction events, including authentication evidence." },
  { icon: "📑", label: "Templates",              desc: "Reusable document workflow configurations." },
  { icon: "📎", label: "Attachments",            desc: "Supplementary files included with transactions." },
  { icon: "🎨", label: "Branding assets",         desc: "Logos, color configurations, and email branding files." },
  { icon: "🏢", label: "Workspace assets",        desc: "Shared resources associated with your organization workspace." },
];

export const ENTERPRISE_NEEDS = [
  { icon: "📊", title: "High sending volume",        desc: "Organizations that send frequently need volume arrangements beyond standard plan limits." },
  { icon: "👥", title: "Multiple departments",        desc: "Complex organizations may need workspace structures that reflect real organizational boundaries." },
  { icon: "🔐", title: "Authentication policies",     desc: "Enterprise organizations may require consistent authentication rules applied across all senders." },
  { icon: "🔑", title: "Enterprise SSO",             desc: "Single sign-on and identity-provider integration for existing enterprise directories." },
  { icon: "⚙️", title: "API and webhook integration", desc: "Connect LAGDA to existing business systems, document management platforms, or workflows." },
  { icon: "🎨", title: "Custom workspace structure",  desc: "Workspace roles, permissions, and administrative boundaries tailored to your organization." },
  { icon: "📋", title: "Compliance and security review", desc: "Organizations with security or regulatory requirements may need a formal review process." },
  { icon: "📞", title: "Custom onboarding and support", desc: "Dedicated onboarding, training, and support aligned to your team's rollout needs." },
];
