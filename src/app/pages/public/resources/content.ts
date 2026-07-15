// Resources section — content, nav, FAQ data, guide metadata.

export const RESOURCES_SUBNAV = [
  { label: "Overview",               path: "/resources"                           },
  { label: "FAQ",                    path: "/resources/faq"                       },
  { label: "Guides",                 path: "/resources/guides"                    },
  { label: "Legal Framework",        path: "/resources/legal-framework"           },
  { label: "Verification Guide",     path: "/resources/document-verification-guide" },
  { label: "Authentication Guide",   path: "/resources/authentication-guide"      },
  { label: "Templates Guide",        path: "/resources/templates-guide"           },
  { label: "Security Guide",         path: "/resources/security-guide"            },
];

export const GENERAL_FAQ_GROUPS = [
  {
    id: "about-lagda",
    title: "About LAGDA",
    items: [
      {
        id: "what-is-lagda",
        q: "What is LAGDA?",
        a: "LAGDA is a Philippine-first legal-technology platform by UpUp Technologies. It currently offers LAGDA eSignature — a document workflow product that helps professionals and organizations prepare, send, sign, track, verify, and manage documents online.",
      },
      {
        id: "what-is-esig",
        q: "What is LAGDA eSignature?",
        a: "LAGDA eSignature helps Philippine professionals and organizations prepare, send, sign, track, verify, and securely manage documents online. It includes document preparation, participant management, signer authentication, audit trail, and document verification.",
      },
      {
        id: "what-is-verification",
        q: "What is Document Verification?",
        a: "Document Verification is a capability that allows anyone to confirm the status of a completed LAGDA transaction using a Verification ID or QR code — without needing a LAGDA account. It also supports comparing a supplied file against the recorded completed document where supported.",
      },
      {
        id: "philippine-first",
        q: "Is LAGDA designed for the Philippines?",
        a: "Yes. LAGDA is designed with Philippine professionals and organizations in mind. Features, workflows, and participant roles are designed to reflect common Philippine document and signature practices where electronic signing is appropriate.",
      },
    ],
  },
  {
    id: "using-esig",
    title: "Using eSignature",
    items: [
      {
        id: "prepare-doc",
        q: "How do I prepare a document?",
        a: "Upload a PDF document to LAGDA, add the required fields (signature, initials, date, and other fields), define participants and their roles, configure routing and authentication, and send. Each participant receives a secure invitation by email.",
      },
      {
        id: "recipients-need-account",
        q: "Do recipients need a LAGDA account?",
        a: "No. Signing participants can complete their action through a secure invitation link without creating a LAGDA account. Account-based authentication is an option but is not required for all participants.",
      },
      {
        id: "multiple-signers",
        q: "Can several people sign or approve one document?",
        a: "Yes. A single transaction can include multiple signers, approvers, reviewers, and copy recipients. You control whether they act simultaneously (parallel) or in a defined order (sequential), or in a combination of both.",
      },
      {
        id: "signing-order",
        q: "Can signing happen in a specific order?",
        a: "Yes. LAGDA supports sequential signing, where each participant receives and acts on the document in order. Sequential routing is useful for workflows where one person must sign before another can proceed.",
      },
      {
        id: "require-auth",
        q: "Can I require authentication for signers?",
        a: "Yes. You can configure authentication requirements for each participant — including secure invitation links, email OTP, SMS OTP, authenticator app, or account authentication. Method availability depends on your plan.",
      },
      {
        id: "use-templates",
        q: "Can I use templates?",
        a: "Yes. Templates allow you to save a complete document workflow — including document files, fields, participant roles, routing, authentication rules, and reminders — and reuse it for future transactions. Personal templates are available on all plans; shared templates require Business or Enterprise.",
      },
    ],
  },
  {
    id: "verification-evidence",
    title: "Verification and Evidence",
    items: [
      {
        id: "what-is-vid",
        q: "What is a Verification ID?",
        a: "A Verification ID is a unique identifier assigned to a completed LAGDA transaction. Anyone with the ID can check the document's verification status at lagda.io/verify — no account needed.",
      },
      {
        id: "verified-result",
        q: "What does a 'verified' result mean?",
        a: "A verified result means LAGDA found a completed transaction record matching the Verification ID. Where file comparison is also performed, it may indicate whether the file presented matches the recorded completed document. A verified record does not automatically confirm every legal requirement for the transaction has been met.",
      },
      {
        id: "file-mismatch",
        q: "What does 'file mismatch' mean in verification?",
        a: "A file mismatch means the document presented for comparison does not match the file recorded at completion. This may indicate the document was altered after completion. The original record remains accessible via Verification ID.",
      },
      {
        id: "public-info",
        q: "What information appears publicly in a verification result?",
        a: "Public verification shows the transaction status, completion date, and participant count — it does not reveal participant names, document content, or authentication details by default. Organization settings may control what is publicly visible.",
      },
      {
        id: "audit-trail-content",
        q: "What is recorded in an audit trail?",
        a: "An audit trail records significant events in a transaction: when the document was prepared, when invitations were sent, when participants opened the invitation, when authentication was completed, when the document was viewed, when signatures were adopted, and when the transaction was completed. Timestamps and contextual device evidence are recorded.",
      },
    ],
  },
  {
    id: "legal-responsible",
    title: "Legal and Responsible Use",
    items: [
      {
        id: "eligible-docs",
        q: "Are all documents eligible for eSignature?",
        a: "No. Some documents still require wet signatures, notarization, personal appearance, witnesses, or other legal formalities that electronic signing does not satisfy. Users are responsible for determining what formalities apply to each document and transaction.",
      },
      {
        id: "legal-advice",
        q: "Does LAGDA provide legal advice?",
        a: "No. LAGDA resources and content provide general product and educational information and do not constitute legal advice. For specific questions about document requirements, consult a qualified legal professional.",
      },
      {
        id: "esig-vs-notarization",
        q: "Is electronic signing the same as notarization?",
        a: "No. Electronic signing and electronic notarization are separate processes. LAGDA eSignature facilitates electronic document signatures. LAGDA eNotary — a future regulated product — would facilitate electronic notarization, subject to Supreme Court accreditation and applicable rules. They are distinct and separate.",
      },
      {
        id: "who-determines",
        q: "Who determines what legal formalities are required?",
        a: "Users and their legal advisers are responsible for determining what formalities apply to each document and transaction. LAGDA provides tools for document workflow — it does not determine or guarantee whether a given document type satisfies applicable legal requirements.",
      },
    ],
  },
  {
    id: "security-privacy",
    title: "Security and Privacy",
    items: [
      {
        id: "account-vs-signer-auth",
        q: "How is account security different from signer authentication?",
        a: "Account security controls how you log into your LAGDA account — password, multi-factor authentication, and session management. Signer authentication is configured per transaction and controls how each signing participant proves they are the intended recipient when accessing the document for signing.",
      },
      {
        id: "location-collected",
        q: "Is exact location always collected?",
        a: "Location data collection depends on device capability, participant consent, and platform settings. LAGDA may record approximate device location as part of audit evidence where available. Exact GPS precision is not guaranteed.",
      },
      {
        id: "auth-choose",
        q: "How should organizations choose authentication methods?",
        a: "The right method depends on the transaction risk, participant relationship, available channels, organizational policy, and applicable requirements. Stronger methods add more confidence but may also add friction. See the Authentication Guide for detailed guidance.",
      },
    ],
  },
  {
    id: "plans-support",
    title: "Plans and Support",
    items: [
      {
        id: "how-plans-differ",
        q: "How do plans differ?",
        a: "Plans differ primarily in signing-request allowances, number of senders, authentication options, template sharing, company branding, workspace administration, and API and integration access. All plans include document preparation, audit trail, and Document Verification.",
      },
      {
        id: "contact-sales",
        q: "How can I contact sales?",
        a: "Visit the Contact page and select 'Sales' as the contact category. You can also book a demo through the same page.",
      },
      {
        id: "where-help",
        q: "Where can I get help?",
        a: "Visit the Help Center at /help for guides and support information, or use the Contact page to reach our team.",
      },
    ],
  },
  {
    id: "enotary-faq",
    title: "LAGDA eNotary",
    items: [
      {
        id: "enotary-available",
        q: "Is LAGDA eNotary available?",
        a: "No. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. It is not currently available as a product. LAGDA does not represent the service as accredited or available.",
      },
      {
        id: "is-lagda-accredited",
        q: "Is LAGDA accredited?",
        a: "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules. LAGDA does not currently represent eNotary as accredited.",
      },
      {
        id: "notaries-apply",
        q: "Can notaries sign up or apply now?",
        a: "LAGDA eNotary is not yet available for notary registration. You may join the waitlist to receive updates. Joining the waitlist does not create eligibility, reserve accreditation, appoint a notary, or guarantee access.",
      },
    ],
  },
];

export const GUIDE_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    guides: [
      { title: "Guides Overview",               path: "/resources/guides",                      available: true  },
      { title: "Templates Guide",                path: "/resources/templates-guide",             available: true  },
    ],
  },
  {
    id: "trust-verification",
    label: "Trust and Verification",
    guides: [
      { title: "Document Verification Guide",    path: "/resources/document-verification-guide", available: true  },
      { title: "Authentication Guide",           path: "/resources/authentication-guide",        available: true  },
      { title: "Security Guide",                 path: "/resources/security-guide",              available: true  },
    ],
  },
  {
    id: "legal-policy",
    label: "Legal and Policy",
    guides: [
      { title: "Legal Framework",                path: "/resources/legal-framework",             available: true  },
      { title: "Privacy Policy",                 path: "/legal/privacy",                         available: true  },
      { title: "Terms of Service",               path: "/legal/terms",                           available: true  },
    ],
  },
  {
    id: "support",
    label: "Support",
    guides: [
      { title: "Help Center",                    path: "/help",                                  available: true  },
      { title: "Contact",                        path: "/contact",                               available: true  },
      { title: "Service Status",                 path: "/service-status",                        available: true  },
    ],
  },
];

export const RESOURCE_CARDS = [
  {
    icon: "📖",
    title: "General FAQ",
    desc: "Common questions about LAGDA eSignature, Document Verification, plans, and legal considerations.",
    path: "/resources/faq",
    category: "Reference",
    audience: "All users",
  },
  {
    icon: "🔍",
    title: "Document Verification Guide",
    desc: "How to verify a LAGDA document using a Verification ID or QR code, and how to read the result.",
    path: "/resources/document-verification-guide",
    category: "Guide",
    audience: "Senders and verifiers",
  },
  {
    icon: "🔐",
    title: "Authentication Guide",
    desc: "Understand available signer authentication methods, their differences, and how to choose.",
    path: "/resources/authentication-guide",
    category: "Guide",
    audience: "Senders and administrators",
  },
  {
    icon: "📑",
    title: "Templates Guide",
    desc: "What a LAGDA template is, how to build one, and how templates are shared and managed.",
    path: "/resources/templates-guide",
    category: "Guide",
    audience: "Senders and administrators",
  },
  {
    icon: "🛡️",
    title: "Security Guide",
    desc: "An overview of LAGDA's security layers, from account security to document integrity and verification.",
    path: "/resources/security-guide",
    category: "Guide",
    audience: "All users",
  },
  {
    icon: "⚖️",
    title: "Legal Framework",
    desc: "Educational context on electronic signatures, attribution, records, and formality requirements.",
    path: "/resources/legal-framework",
    category: "Reference",
    audience: "Legal professionals and administrators",
  },
];

export const EDU_DISCLAIMER = "LAGDA resources provide general product and educational information and do not constitute legal advice.";
