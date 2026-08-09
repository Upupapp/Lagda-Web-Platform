// Centralized route metadata registry.
// Every route in the application should have an entry here.
// This is the source of truth for titles, SEO, breadcrumbs, and status.

export type RouteStatus = "implemented" | "partial" | "planned";
export type ProductArea = "esignature" | "enotary" | "verification" | "platform" | "shared";
export type LayoutType = "public" | "auth" | "platform";

export interface RouteMeta {
  path: string;
  title: string;
  description?: string;
  breadcrumb?: string;
  section?: string;
  product?: ProductArea;
  layout: LayoutType;
  requiresAuth: boolean;
  isPublic: boolean;
  isIndexable: boolean;
  status: RouteStatus;
  analyticsName?: string;
  canonicalPath?: string;
  tabGroup?: string;
}

// ── Public portal routes ──────────────────────────────────────────────────────

export const PUBLIC_ROUTES: RouteMeta[] = [
  {
    path: "/",
    title: "LAGDA — Philippine Legal Document Automation",
    description: "LAGDA eSignature helps Philippine professionals and organizations prepare, send, sign, track, verify, and securely manage documents online.",
    breadcrumb: "Home",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "home",
  },

  // eSignature section
  {
    path: "/workflow",
    title: "Document Workflows | LAGDA",
    description: "Design a document process once and run it as many times as you need. Stages for review, approval, signature and verification, with every run tracked separately.",
    breadcrumb: "Workflow",
    section: "product",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "public_workflow",
  },
  {
    path: "/esignature",
    title: "LAGDA eSignature — Electronic Signing for the Philippines",
    description: "Send, sign, track, and verify documents online with LAGDA eSignature.",
    breadcrumb: "eSignature",
    section: "esignature",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "esignature_overview",
    tabGroup: "esig",
  },
  {
    path: "/esignature/core-workflow",
    title: "Core Workflow — LAGDA eSignature",
    description: "Prepare, send, verify, and sign documents with LAGDA's core workflow.",
    breadcrumb: "Core Workflow",
    section: "esignature",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "esignature_core_workflow",
    tabGroup: "esig",
  },
  {
    path: "/esignature/verification-and-audit",
    title: "Verification & Audit — LAGDA eSignature",
    description: "Audit trails, QR verification, and complete signing records.",
    breadcrumb: "Verification & Audit",
    section: "esignature",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "esignature_verification_audit",
    tabGroup: "esig",
  },
  {
    path: "/esignature/advanced-capabilities",
    title: "Advanced Capabilities — LAGDA eSignature",
    description: "Parallel signing, storage, and advanced document workflows.",
    breadcrumb: "Advanced Capabilities",
    section: "esignature",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "esignature_advanced",
    tabGroup: "esig",
  },
  {
    path: "/esignature/templates-and-branding",
    title: "Templates & Branding — LAGDA eSignature",
    description: "Reusable document templates and company branding controls.",
    breadcrumb: "Templates & Branding",
    section: "esignature",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "esignature_templates",
    tabGroup: "esig",
  },
  {
    path: "/esignature/team-and-enterprise",
    title: "Team & Enterprise — LAGDA eSignature",
    description: "Workspaces, roles, reports, and enterprise controls.",
    breadcrumb: "Team & Enterprise",
    section: "esignature",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "esignature_team",
    tabGroup: "esig",
  },

  // Features section
  {
    path: "/features",
    title: "Features — LAGDA eSignature",
    description: "Explore all LAGDA eSignature features: document preparation, signing workflows, authentication, verification, templates, and more.",
    breadcrumb: "Features",
    section: "features",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "features_index",
  },
  { path: "/features/document-preparation",    title: "Document Preparation — LAGDA eSignature",    breadcrumb: "Document Preparation",    section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_doc_prep",     description: "Prepare documents for signing with fields, placeholders, and participant assignment." },
  { path: "/features/participant-roles",        title: "Participant Roles — LAGDA eSignature",        breadcrumb: "Participant Roles",        section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_roles",        description: "Assign Signer, Approver, Reviewer, Viewer, and Copy Recipient roles to each participant." },
  { path: "/features/parallel-signing",         title: "Parallel Signing — LAGDA eSignature",         breadcrumb: "Parallel Signing",         section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_parallel",     description: "Send to multiple participants simultaneously for faster completion." },
  { path: "/features/sequential-signing",       title: "Sequential Signing — LAGDA eSignature",       breadcrumb: "Sequential Signing",       section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_sequential",   description: "Route documents in a defined order where each participant signs before the next." },
  { path: "/features/signer-authentication",    title: "Signer Authentication — LAGDA eSignature",    breadcrumb: "Signer Authentication",    section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_auth",         description: "Require email OTP, access codes, or identity verification before signing." },
  { path: "/features/identity-aware-signing",   title: "Identity-Aware Signing — LAGDA eSignature",   breadcrumb: "Identity-Aware Signing",   section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_identity",     description: "Capture verified identity evidence alongside each signature event." },
  { path: "/features/audit-trail",              title: "Audit Trail — LAGDA eSignature",              breadcrumb: "Audit Trail",              section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_audit",        description: "Every signing action is recorded with timestamp, device, and location data." },
  { path: "/features/document-verification",    title: "Document Verification — LAGDA",               breadcrumb: "Document Verification",    section: "features", product: "verification",  layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_verification", description: "Verify completed LAGDA documents via QR code or Verification ID." },
  { path: "/features/templates",                title: "Templates — LAGDA eSignature",                breadcrumb: "Templates",                section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_templates",    description: "Create and reuse document templates for recurring signing workflows." },
  { path: "/features/contacts",                 title: "Contacts — LAGDA eSignature",                 breadcrumb: "Contacts",                 section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_contacts",     description: "Store recurring participants and send invitations without re-entering details." },
  { path: "/features/company-branding",         title: "Company Branding — LAGDA eSignature",         breadcrumb: "Company Branding",         section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_branding",     description: "Apply your organization's logo and colors to signing requests." },
  { path: "/features/team-workspaces",          title: "Team Workspaces — LAGDA eSignature",          breadcrumb: "Team Workspaces",          section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_workspaces",   description: "Collaborate with your team in a shared signing workspace." },
  { path: "/features/notifications",            title: "Notifications — LAGDA eSignature",            breadcrumb: "Notifications",            section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_notifications",description: "Automatic signing reminders and completion alerts keep documents moving." },
  { path: "/features/storage-and-plan-limits",  title: "Storage & Plan Limits — LAGDA eSignature",   breadcrumb: "Storage & Plan Limits",    section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_storage",      description: "Understand document storage, signing-request limits, and plan tiers." },
  { path: "/features/api-and-integrations",     title: "API & Integrations — LAGDA eSignature",      breadcrumb: "API & Integrations",       section: "features", product: "esignature",    layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "features_api",          description: "Connect LAGDA eSignature to your existing systems via API." },

  // Solutions section
  {
    path: "/solutions",
    title: "Solutions — LAGDA",
    description: "Use LAGDA across legal, business, and institutional workflows.",
    breadcrumb: "Solutions",
    section: "solutions",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "solutions_all",
    tabGroup: "solutions",
  },
  { path: "/solutions/lawyers",              title: "Lawyers — LAGDA Solutions",                       breadcrumb: "Lawyers",              section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_lawyers",     tabGroup: "solutions", description: "LAGDA eSignature for individual legal practitioners and solo attorneys." },
  { path: "/solutions/law-firms",            title: "Law Firms — LAGDA Solutions",                     breadcrumb: "Law Firms",            section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_law_firms",   tabGroup: "solutions", description: "Multi-lawyer practices and full-service firms streamline client signatures with LAGDA." },
  { path: "/solutions/business-teams",       title: "Business Teams — LAGDA Solutions",                breadcrumb: "Business Teams",       section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_business",    tabGroup: "solutions", description: "Internal approvals, contracts, and HR documents for business teams." },
  { path: "/solutions/government-and-lgu",   title: "Government & LGU — LAGDA Solutions",              breadcrumb: "Government & LGU",    section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_gov",         tabGroup: "solutions", description: "LAGDA eSignature for official documents and public-sector internal workflows." },
  { path: "/solutions/real-estate",          title: "Real Estate — LAGDA Solutions",                   breadcrumb: "Real Estate",          section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_realestate",  tabGroup: "solutions", description: "Property contracts, deeds, and broker agreements signed online with LAGDA." },
  { path: "/solutions/hr-and-recruitment",   title: "HR & Recruitment — LAGDA Solutions",              breadcrumb: "HR & Recruitment",    section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_hr",          tabGroup: "solutions", description: "Employment contracts, NDAs, and onboarding documents processed with LAGDA eSignature." },
  { path: "/solutions/finance",              title: "Finance — LAGDA Solutions",                       breadcrumb: "Finance",              section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_finance",     tabGroup: "solutions", description: "Loan agreements, term sheets, and internal finance approvals streamlined with LAGDA." },
  { path: "/solutions/procurement",          title: "Procurement — LAGDA Solutions",                   breadcrumb: "Procurement",          section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_procurement", tabGroup: "solutions", description: "Supplier contracts and purchase agreements signed and tracked online." },
  { path: "/solutions/education",            title: "Education — LAGDA Solutions",                     breadcrumb: "Education",            section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_education",   tabGroup: "solutions", description: "Enrollment forms, consent forms, and academic documents handled with LAGDA eSignature." },
  { path: "/solutions/healthcare-and-wellness", title: "Healthcare & Wellness — LAGDA Solutions",      breadcrumb: "Healthcare & Wellness", section: "solutions", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "solutions_health",     tabGroup: "solutions", description: "Client consent forms and wellness agreements managed securely with LAGDA eSignature." },

  // Pricing section
  {
    path: "/pricing",
    title: "Pricing — LAGDA",
    description: "Transparent pricing for individuals, professionals, and enterprises.",
    breadcrumb: "Pricing",
    section: "pricing",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "pricing_main",
    tabGroup: "pricing",
  },
  { path: "/pricing/compare",                title: "Compare Plans — LAGDA Pricing",          breadcrumb: "Compare Plans",         section: "pricing", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "pricing_compare",    tabGroup: "pricing", description: "Side-by-side comparison of LAGDA Personal, Business, and Enterprise plans." },
  { path: "/pricing/signing-requests",       title: "Signing Requests — LAGDA Pricing",       breadcrumb: "Signing Requests",      section: "pricing", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "pricing_requests",   tabGroup: "pricing", description: "How monthly signing-request limits work across LAGDA plans." },
  { path: "/pricing/storage-limits",         title: "Storage Limits — LAGDA Pricing",         breadcrumb: "Storage Limits",        section: "pricing", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "pricing_storage",    tabGroup: "pricing", description: "Document storage capacity by LAGDA plan tier." },
  { path: "/pricing/templates-by-plan",      title: "Templates by Plan — LAGDA Pricing",      breadcrumb: "Templates by Plan",     section: "pricing", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "pricing_templates",  tabGroup: "pricing", description: "Which template features are available on each LAGDA plan." },
  { path: "/pricing/authentication-by-plan", title: "Authentication by Plan — LAGDA Pricing", breadcrumb: "Authentication by Plan",section: "pricing", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "pricing_auth",       tabGroup: "pricing", description: "Signer authentication options available on each LAGDA plan." },
  { path: "/pricing/enterprise",             title: "Enterprise Pricing — LAGDA",             breadcrumb: "Enterprise",            section: "pricing", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "pricing_enterprise", tabGroup: "pricing", description: "Custom LAGDA plans for large organizations with dedicated onboarding and support." },
  { path: "/pricing/faq",                    title: "Pricing FAQ — LAGDA",                    breadcrumb: "FAQ",                   section: "pricing", product: "esignature", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "pricing_faq",        tabGroup: "pricing", description: "Common questions about LAGDA billing, plan limits, and upgrades." },

  // Security section
  {
    path: "/security",
    title: "Security — LAGDA",
    description: "How LAGDA protects your documents, identity, and organization.",
    breadcrumb: "Security",
    section: "security",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "security_overview",
    tabGroup: "security",
  },
  { path: "/security/trust-center",                 title: "Trust Center — LAGDA Security",                breadcrumb: "Trust Center",               section: "security", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_trust",       tabGroup: "security", description: "LAGDA's security posture, policies, and legal compliance framework." },
  { path: "/security/account-security",             title: "Account Security — LAGDA",                     breadcrumb: "Account Security",             section: "security", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_account",     tabGroup: "security", description: "Two-factor authentication, session management, and account controls." },
  { path: "/security/signer-authentication",        title: "Signer Authentication — LAGDA Security",       breadcrumb: "Signer Authentication",        section: "security", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_signer_auth", tabGroup: "security", description: "How LAGDA verifies signer identity with email OTP and access codes." },
  { path: "/security/identity-verification",        title: "Identity Verification — LAGDA Security",       breadcrumb: "Identity Verification",        section: "security", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_identity",    tabGroup: "security", description: "Advanced identity evidence captured at each signing event." },
  { path: "/security/audit-trail",                  title: "Audit Trail — LAGDA Security",                 breadcrumb: "Audit Trail",                  section: "security", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_audit",       tabGroup: "security", description: "Complete, tamper-evident record of every action in a signing workflow." },
  { path: "/security/document-verification",        title: "Document Verification — LAGDA Security",       breadcrumb: "Document Verification",        section: "security", product: "verification", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_doc_verify",  tabGroup: "security", description: "Verify completed LAGDA documents using QR code or Verification ID." },
  { path: "/security/device-and-location-evidence", title: "Device & Location Evidence — LAGDA Security",  breadcrumb: "Device & Location Evidence",   section: "security", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_device",      tabGroup: "security", description: "Device fingerprinting and location evidence recorded at each signing event." },
  { path: "/security/secure-storage",               title: "Secure Storage — LAGDA Security",              breadcrumb: "Secure Storage",               section: "security", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_storage",     tabGroup: "security", description: "Encrypted document storage and secure data retention practices." },
  { path: "/security/privacy-and-data-protection",  title: "Privacy & Data Protection — LAGDA Security",   breadcrumb: "Privacy & Data Protection",    section: "security", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "security_privacy",     tabGroup: "security", description: "Data minimization, access controls, and privacy practices in LAGDA." },

  // Resources section
  {
    path: "/resources",
    title: "Resources — LAGDA",
    description: "Guides, legal framework, FAQ, and support for LAGDA users.",
    breadcrumb: "Resources",
    section: "resources",
    product: "esignature",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: true,
    status: "implemented",
    analyticsName: "resources_guides",
    tabGroup: "resources",
  },
  { path: "/resources/guides",                      title: "Guides — LAGDA Resources",                   breadcrumb: "Guides",                section: "resources", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "resources_guides",       tabGroup: "resources", description: "Step-by-step guides for every LAGDA eSignature workflow." },
  { path: "/resources/faq",                         title: "FAQ — LAGDA",                                breadcrumb: "FAQ",                   section: "resources", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "resources_faq",          tabGroup: "resources", description: "Answers to the most common questions about LAGDA eSignature." },
  { path: "/resources/legal-framework",             title: "Legal Framework — LAGDA Resources",          breadcrumb: "Legal Framework",       section: "resources", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "resources_legal",         tabGroup: "resources", description: "Philippine legal context for electronic signatures and document signing." },
  { path: "/resources/document-verification-guide", title: "Document Verification Guide — LAGDA",        breadcrumb: "Document Verification", section: "resources", product: "verification", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "resources_verify_guide", tabGroup: "resources", description: "How to verify a LAGDA-signed document using QR code or Verification ID." },
  { path: "/resources/authentication-guide",        title: "Authentication Guide — LAGDA Resources",     breadcrumb: "Authentication Guide",  section: "resources", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "resources_auth_guide",   tabGroup: "resources", description: "How signer authentication methods work in LAGDA eSignature." },
  { path: "/resources/templates-guide",             title: "Templates Guide — LAGDA Resources",          breadcrumb: "Templates Guide",       section: "resources", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "resources_tmpl_guide",   tabGroup: "resources", description: "How to create and reuse document templates in LAGDA eSignature." },
  { path: "/resources/security-guide",              title: "Security Guide — LAGDA Resources",           breadcrumb: "Security Guide",        section: "resources", product: "esignature",   layout: "public", requiresAuth: false, isPublic: true, isIndexable: true, status: "implemented", analyticsName: "resources_sec_guide",    tabGroup: "resources", description: "Security best practices for organizations using LAGDA eSignature." },

  // eNotary section — COMING SOON, not yet accredited
  {
    path: "/enotary",
    title: "LAGDA eNotary — Coming Soon",
    description: "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.",
    breadcrumb: "eNotary",
    section: "enotary",
    product: "enotary",
    layout: "public",
    requiresAuth: false,
    isPublic: true,
    isIndexable: false,
    status: "planned",
    analyticsName: "enotary_overview",
    tabGroup: "enotary",
  },
  { path: "/enotary/future-capabilities",   title: "Future Capabilities — LAGDA eNotary",         breadcrumb: "Future Capabilities",    section: "enotary", product: "enotary", layout: "public", requiresAuth: false, isPublic: true, isIndexable: false, status: "planned", analyticsName: "enotary_capabilities", tabGroup: "enotary" },
  { path: "/enotary/accreditation-roadmap", title: "Accreditation Roadmap — LAGDA eNotary",       breadcrumb: "Accreditation Roadmap",  section: "enotary", product: "enotary", layout: "public", requiresAuth: false, isPublic: true, isIndexable: false, status: "planned", analyticsName: "enotary_roadmap",      tabGroup: "enotary" },
  { path: "/enotary/waitlist",              title: "Join the Waitlist — LAGDA eNotary",            breadcrumb: "Waitlist",               section: "enotary", product: "enotary", layout: "public", requiresAuth: false, isPublic: true, isIndexable: false, status: "planned", analyticsName: "enotary_waitlist",     tabGroup: "enotary" },
  { path: "/enotary/faq",                   title: "FAQ — LAGDA eNotary",                          breadcrumb: "FAQ",                    section: "enotary", product: "enotary", layout: "public", requiresAuth: false, isPublic: true, isIndexable: false, status: "planned", analyticsName: "enotary_faq",          tabGroup: "enotary" },

  // Standalone public routes
  { path: "/verify",         title: "Verify a Document — LAGDA",                  description: "Verify the authenticity of a LAGDA-signed document using a Verification ID or QR code.", breadcrumb: "Verify Document",   section: "verification", product: "verification", layout: "public", requiresAuth: false, isPublic: true, isIndexable: true,  status: "implemented", analyticsName: "public_verify" },
  { path: "/book-a-demo",   title: "Book a Demo — LAGDA",                         description: "Request a personalized LAGDA eSignature demonstration for your organization.",            breadcrumb: "Book a Demo",       section: "contact",      product: "shared",       layout: "public", requiresAuth: false, isPublic: true, isIndexable: false, status: "implemented", analyticsName: "book_a_demo" },
  { path: "/help",           title: "Help Center — LAGDA",                         description: "Product documentation, guides, and support for LAGDA eSignature.",                        breadcrumb: "Help Center",       section: "help",         product: "shared",       layout: "public", requiresAuth: false, isPublic: true, isIndexable: true,  status: "implemented", analyticsName: "help" },
  { path: "/contact",        title: "Contact — LAGDA",                             description: "Contact the LAGDA team for sales, support, or partnership inquiries.",                    breadcrumb: "Contact",           section: "contact",      product: "shared",       layout: "public", requiresAuth: false, isPublic: true, isIndexable: true,  status: "implemented", analyticsName: "contact" },
  { path: "/service-status", title: "Service Status — LAGDA",                      description: "Current operational status of LAGDA eSignature services.",                               breadcrumb: "Service Status",    section: "status",       product: "shared",       layout: "public", requiresAuth: false, isPublic: true, isIndexable: false, status: "implemented", analyticsName: "service_status" },
  { path: "/legal/privacy",  title: "Privacy Policy — LAGDA",                     description: "How LAGDA and UpUp Technologies handle your personal data.",                             breadcrumb: "Privacy Policy",    section: "legal",        product: "shared",       layout: "public", requiresAuth: false, isPublic: true, isIndexable: true,  status: "implemented", analyticsName: "privacy_policy" },
  { path: "/legal/terms",    title: "Terms of Service — LAGDA",                   description: "Terms and conditions governing your use of LAGDA eSignature.",                           breadcrumb: "Terms of Service",  section: "legal",        product: "shared",       layout: "public", requiresAuth: false, isPublic: true, isIndexable: true,  status: "implemented", analyticsName: "terms_of_service" },
  { path: "/legal/accessibility", title: "Accessibility Statement — LAGDA",       description: "LAGDA's commitment to digital accessibility for all users.",                             breadcrumb: "Accessibility",     section: "legal",        product: "shared",       layout: "public", requiresAuth: false, isPublic: true, isIndexable: true,  status: "implemented", analyticsName: "accessibility" },
];

// ── Authentication routes ─────────────────────────────────────────────────────

export const AUTH_ROUTES: RouteMeta[] = [
  { path: "/sign-in",        title: "Sign In — LAGDA",                    breadcrumb: "Sign In",          section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: true,  isIndexable: false, status: "implemented", analyticsName: "sign_in" },
  { path: "/create-account", title: "Create Your LAGDA Account",          breadcrumb: "Create Account",   section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: true,  isIndexable: false, status: "implemented", analyticsName: "create_account" },
  { path: "/verify-email",   title: "Verify Your Email — LAGDA",          breadcrumb: "Verify Email",     section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "planned", analyticsName: "verify_email" },
  { path: "/forgot-password",title: "Forgot Password — LAGDA",            breadcrumb: "Forgot Password",  section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: true,  isIndexable: false, status: "planned", analyticsName: "forgot_password" },
  { path: "/reset-password", title: "Reset Password — LAGDA",             breadcrumb: "Reset Password",   section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "planned", analyticsName: "reset_password" },
  { path: "/mfa",            title: "Two-Factor Authentication — LAGDA",   breadcrumb: "Verify Identity",  section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "planned", analyticsName: "mfa" },
  { path: "/invitation",     title: "Accept Invitation — LAGDA",           breadcrumb: "Accept Invitation",section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "planned", analyticsName: "invitation" },
  { path: "/onboarding",     title: "Welcome to LAGDA",                    breadcrumb: "Get Started",      section: "auth", product: "shared", layout: "auth", requiresAuth: true,  isPublic: false, isIndexable: false, status: "planned", analyticsName: "onboarding" },

  // Routes that were live in router.tsx with no metadata here. Without an entry
  // usePageMeta falls back to the generic site title, so every one of these
  // shared one browser-tab name, one history entry name and one bookmark name.
  { path: "/accept-invitation", title: "Accept Invitation — LAGDA",           breadcrumb: "Accept Invitation", section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "accept_invitation" },
  { path: "/auth/account-locked", title: "Account Locked — LAGDA",            breadcrumb: "Account Locked",    section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "account_locked" },
  { path: "/auth/link-error",   title: "Link Problem — LAGDA",                breadcrumb: "Link Problem",      section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "link_error" },
  { path: "/mfa/setup",         title: "Set Up Two-Factor Authentication — LAGDA", breadcrumb: "Set Up MFA",   section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "mfa_setup" },
  { path: "/mfa/recovery",      title: "Recovery Codes — LAGDA",              breadcrumb: "Recovery Codes",    section: "auth", product: "shared", layout: "auth", requiresAuth: false, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "mfa_recovery" },
  { path: "/onboarding/profile",       title: "Your Profile — LAGDA",         breadcrumb: "Profile",       section: "auth", product: "shared", layout: "auth", requiresAuth: true,  isPublic: false, isIndexable: false, status: "implemented", analyticsName: "onboarding_profile" },
  { path: "/onboarding/use-case",      title: "How You Will Use LAGDA",       breadcrumb: "Use Case",      section: "auth", product: "shared", layout: "auth", requiresAuth: true,  isPublic: false, isIndexable: false, status: "implemented", analyticsName: "onboarding_use_case" },
  { path: "/onboarding/workspace",     title: "Set Up Your Workspace — LAGDA", breadcrumb: "Workspace",    section: "auth", product: "shared", layout: "auth", requiresAuth: true,  isPublic: false, isIndexable: false, status: "implemented", analyticsName: "onboarding_workspace" },
  { path: "/onboarding/security",      title: "Secure Your Account — LAGDA",  breadcrumb: "Security",      section: "auth", product: "shared", layout: "auth", requiresAuth: true,  isPublic: false, isIndexable: false, status: "implemented", analyticsName: "onboarding_security" },
  { path: "/onboarding/notifications", title: "Notification Preferences — LAGDA", breadcrumb: "Notifications", section: "auth", product: "shared", layout: "auth", requiresAuth: true,  isPublic: false, isIndexable: false, status: "implemented", analyticsName: "onboarding_notifications" },
  { path: "/onboarding/review",        title: "Review Your Setup — LAGDA",    breadcrumb: "Review",        section: "auth", product: "shared", layout: "auth", requiresAuth: true,  isPublic: false, isIndexable: false, status: "implemented", analyticsName: "onboarding_review" },
  { path: "/onboarding/complete",      title: "You Are Ready — LAGDA",        breadcrumb: "Complete",      section: "auth", product: "shared", layout: "auth", requiresAuth: true,  isPublic: false, isIndexable: false, status: "implemented", analyticsName: "onboarding_complete" },
];

// ── Platform (authenticated customer) routes ──────────────────────────────────

export const PLATFORM_ROUTES: RouteMeta[] = [
  // ── Workflow ──────────────────────────────────────────────────────────────
  { path: "/app/workflow",            title: "Workflow | LAGDA",           description: "Reusable multi-stage workflows and the runs started from them.", breadcrumb: "Workflow",       section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workflow_overview" },
  { path: "/app/workflow/templates",  title: "Workflows | LAGDA",          description: "Reusable workflow designs.",       breadcrumb: "Workflows",      section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workflow_templates" },
  { path: "/app/workflow/runs",       title: "Active Runs | LAGDA",        description: "Workflow runs currently in progress.", breadcrumb: "Active runs", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workflow_runs" },
  { path: "/app/workflow/completed",  title: "Completed Runs | LAGDA",     breadcrumb: "Completed",     section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workflow_completed" },
  { path: "/app/workflow/builder",    title: "Workflow Builder | LAGDA",   breadcrumb: "Builder",       section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workflow_builder" },
  { path: "/app/workflow/start",      title: "Start a Workflow | LAGDA",   breadcrumb: "Start",         section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workflow_start" },
  { path: "/app/workflow/templates/:workflowTemplateId", title: "Workflow | LAGDA",     breadcrumb: "Workflow",     section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workflow_template_detail" },
  { path: "/app/workflow/runs/:workflowRunId",           title: "Workflow Run | LAGDA", breadcrumb: "Workflow run", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workflow_run_detail" },
  // Live in router.tsx with no metadata until now — see the note in AUTH_ROUTES.
  { path: "/app/documents/new",   title: "New Document | LAGDA",        breadcrumb: "New Document",   section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_document_new" },
  { path: "/app/inbox",           title: "My Actions | LAGDA",          description: "Documents waiting for you to sign, approve, review or acknowledge.", breadcrumb: "My Actions", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_inbox" },
  { path: "/app/inbox/:requestId", title: "Assignment | LAGDA",         breadcrumb: "Assignment",     section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_inbox_detail" },
  { path: "/app/notifications/:notificationId", title: "Notification | LAGDA", breadcrumb: "Notification", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_notification_detail" },
  { path: "/app/reports/preparation", title: "Preparation Report | LAGDA", breadcrumb: "Preparation", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_reports_preparation" },
  // These three render PlatformPlaceholder in the router, so their status is
  // "planned". They claimed "implemented" until a STITCH pass compared the two.
  { path: "/app/team/members",     title: "Members | LAGDA",            breadcrumb: "Members",        section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_team_members" },
  { path: "/app/team/invitations", title: "Invitations | LAGDA",        breadcrumb: "Invitations",    section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_team_invitations" },
  { path: "/app/team/roles",       title: "Roles | LAGDA",              breadcrumb: "Roles",          section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_team_roles" },
  { path: "/app/settings/signatures",                 title: "Signatures & Initials | LAGDA", description: "Manage the signatures and initials you can apply to documents.", breadcrumb: "Signatures & Initials", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_signatures" },
  { path: "/app/settings/signatures/new",             title: "New Signature | LAGDA",      breadcrumb: "New Signature",  section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_signature_new" },
  { path: "/app/settings/signatures/:signatureId",     title: "Signature | LAGDA",         breadcrumb: "Signature",      section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_signature_detail" },
  { path: "/app/settings/signatures/:signatureId/edit", title: "Edit Signature | LAGDA",   breadcrumb: "Edit Signature", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_signature_edit" },
  { path: "/app/permission-denied", title: "Access Not Available | LAGDA", breadcrumb: "Access",      section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_permission_denied" },
  { path: "/app/session-expired",   title: "Session Expired | LAGDA",     breadcrumb: "Session",      section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_session_expired" },
  // /app redirects to /app/dashboard — keep for usePageMeta fallback
  { path: "/app",                             title: "Dashboard | LAGDA",                          breadcrumb: "Dashboard",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_dashboard" },
  // Canonical authenticated Dashboard route
  { path: "/app/dashboard",                   title: "Dashboard | LAGDA",                          breadcrumb: "Dashboard",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_dashboard" },
  { path: "/app/documents",                              title: "Documents | LAGDA",               description: "View, search, and manage your document transactions in LAGDA eSignature.", breadcrumb: "Documents",      section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_documents" },
  // Document Organization (Command 31)
  { path: "/app/documents/folders",                      title: "Folders | LAGDA",                 description: "Organize documents into workspace and personal folders.",  breadcrumb: "Folders",        section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_folders" },
  { path: "/app/documents/folders/:folderId",            title: "Folder | LAGDA",                  breadcrumb: "Folder",                 section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_folder_detail" },
  { path: "/app/documents/tags",                         title: "Tags | LAGDA",                    description: "Manage document tags with design-system color styles.",    breadcrumb: "Tags",           section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_tags" },
  { path: "/app/documents/saved-views",                  title: "Saved Views | LAGDA",             description: "Manage personal saved document filter and sort configurations.", breadcrumb: "Saved Views", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_saved_views" },
  { path: "/app/documents/saved-views/:viewId",          title: "Saved View | LAGDA",              breadcrumb: "Saved View",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_saved_view_detail" },
  { path: "/app/documents/:transactionId",             title: "Overview | LAGDA",                 breadcrumb: "Overview",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_overview",      tabGroup: "txn-detail" },
  // Signing Workflow (Command 37) — stage-based recipient routing for this document.
  // Not indexable, excluded from the public sitemap, document-access and permission aware.
  // Titles deliberately carry NO document title, participant name, stage name, email, or ID.
  { path: "/app/documents/:transactionId/workflow",              title: "Signing Workflow | LAGDA",        description: "Stages, people, required actions, and electronic signature requirements for this document.", breadcrumb: "Signing Workflow", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_workflow",         tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/workflow/create",       title: "Create Signing Workflow | LAGDA", description: "Guided creation of a stage-based signing workflow.",  breadcrumb: "Create Workflow",  section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_workflow_create",  tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/workflow/review",       title: "Review Signing Workflow | LAGDA", description: "Final review of the stage sequence, required actions, and field readiness.", breadcrumb: "Review Workflow", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_workflow_review",  tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/workflow/stages/:stageId", title: "Signing Stage | LAGDA",        description: "Stage configuration, people, required actions, and field readiness.", breadcrumb: "Stage",            section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_workflow_stage",   tabGroup: "txn-detail" },
  // Document Collaboration (C34). Titles are deliberately generic: no thread title,
  // comment text, member name, document name, or dynamic ID ever appears in a route
  // title, description, breadcrumb, or analytics name.
  { path: "/app/documents/:transactionId/collaboration",           title: "Collaboration | LAGDA",           description: "Internal review threads, comments, and mentions for people who already have access to this document.", breadcrumb: "Collaboration", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_collaboration",        tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/collaboration/new",       title: "Start a Discussion | LAGDA",      description: "Start an internal discussion on this document.",  breadcrumb: "New Discussion", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_collaboration_new",     tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/collaboration/:threadId", title: "Discussion | LAGDA",              breadcrumb: "Discussion",     section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_collaboration_thread",  tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/review",                  title: "Internal Review | LAGDA",         description: "Who inside this workspace is reviewing this document. Not participant approval and not legal approval.", breadcrumb: "Internal Review", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_internal_review",       tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/participants", title: "Participants | LAGDA",              breadcrumb: "Participants",          section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_participants",  tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/activity",    title: "Activity | LAGDA",                  breadcrumb: "Activity",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_activity",      tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/evidence",    title: "Evidence | LAGDA",                  breadcrumb: "Evidence",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_evidence",      tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/settings",    title: "Settings | LAGDA",                  breadcrumb: "Settings",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_settings",      tabGroup: "txn-detail" },
  // Bulk Send (Command 33) — Enterprise Preview. Non-indexable, excluded from the
  // public sitemap. Titles carry NO batch name, recipient name, email, Template name,
  // Team name, sender name, source filename, or dynamic ID.
  { path: "/app/bulk-send",                                    title: "Bulk Send | LAGDA",                                description: "Prepare one approved Template against many recipient rows and create frontend Draft Projections.", breadcrumb: "Bulk Send",            section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send" },
  { path: "/app/bulk-send/new",                                title: "Create Bulk Send Batch | LAGDA",                   description: "Guided creation of a recipient batch.",             breadcrumb: "New Batch",            section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send_new" },
  { path: "/app/bulk-send/saved-configurations",               title: "Saved Bulk Send Configurations | LAGDA",           description: "Reusable mapping and default configurations.",      breadcrumb: "Saved Configurations", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send_configs" },
  { path: "/app/bulk-send/saved-configurations/:configurationId", title: "Bulk Send Configuration Details | LAGDA",        breadcrumb: "Configuration",        section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send_config_detail" },
  { path: "/app/bulk-send/:batchId",                           title: "Bulk Send Batch Details | LAGDA",                  breadcrumb: "Batch",                section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send_batch" },
  { path: "/app/bulk-send/:batchId/recipients",                title: "Bulk Send Recipients | LAGDA",                     breadcrumb: "Recipients",           section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send_recipients" },
  { path: "/app/bulk-send/:batchId/mapping",                   title: "Bulk Send Mapping | LAGDA",                        breadcrumb: "Mapping",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send_mapping" },
  { path: "/app/bulk-send/:batchId/review",                    title: "Review Bulk Send Batch | LAGDA",                   breadcrumb: "Review",               section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send_review" },
  { path: "/app/bulk-send/:batchId/results",                   title: "Bulk Send Draft Projection Results | LAGDA",       breadcrumb: "Results",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_bulk_send_results" },

  // Collaboration Center (C34)
  { path: "/app/collaboration",           title: "Collaboration Center | LAGDA",   description: "Internal review work across documents you already have access to.", breadcrumb: "Collaboration", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_collaboration_center" },
  { path: "/app/collaboration/assigned",  title: "Assigned to Me | LAGDA",         description: "Discussions where you are listed as an internal reviewer.", breadcrumb: "Assigned to Me", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_collaboration_assigned" },
  { path: "/app/collaboration/mentions",  title: "My Mentions | LAGDA",            description: "Comments where someone mentioned you. A mention never grants access.", breadcrumb: "My Mentions", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_collaboration_mentions" },
  { path: "/app/collaboration/blocking",  title: "Blocking Discussions | LAGDA",   description: "Discussions marked as blocking in this demonstration.", breadcrumb: "Blocking", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_collaboration_blocking" },
  { path: "/app/collaboration/resolved",  title: "Resolved Discussions | LAGDA",   description: "Discussions resolved in frontend state.", breadcrumb: "Resolved", section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_collaboration_resolved" },
  { path: "/app/prepare",                     title: "Prepare a Document — LAGDA",                 breadcrumb: "Prepare",               section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare" },
  { path: "/app/prepare/upload",              title: "Documents — Prepare | LAGDA",                breadcrumb: "Documents",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare_upload" },
  { path: "/app/prepare/participants",        title: "Participants — Prepare | LAGDA",             breadcrumb: "Participants",          section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare_participants" },
  { path: "/app/prepare/routing",             title: "Routing — Prepare | LAGDA",                  breadcrumb: "Routing",               section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare_routing" },
  { path: "/app/prepare/authentication",      title: "Authentication — Prepare | LAGDA",           breadcrumb: "Authentication",        section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare_auth" },
  { path: "/app/prepare/settings",            title: "Settings — Prepare | LAGDA",                 breadcrumb: "Settings",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare_settings" },
  { path: "/app/prepare/review",              title: "Review — Prepare | LAGDA",                   breadcrumb: "Review",                section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare_review" },
  { path: "/app/prepare/fields",              title: "Place Fields — Prepare | LAGDA",             breadcrumb: "Place Fields",          section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare_fields" },
  { path: "/app/prepare/confirmation",       title: "Preparation Summary — Prepare | LAGDA",      breadcrumb: "Summary",               section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_prepare_confirmation" },
  // Templates (Command 21)
  { path: "/app/templates",                              title: "Templates — LAGDA",                            breadcrumb: "Templates",             section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_templates",          description: "Browse and manage reusable document signing templates." },
  { path: "/app/templates/new",                         title: "New Template — LAGDA",                         breadcrumb: "New Template",          section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_templates_new",       description: "Create a new template from blank, draft, or transaction." },
  { path: "/app/templates/:templateId",                 title: "Template — LAGDA",                             breadcrumb: "Template",              section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_template_detail",     description: "View template details, configuration, and usage history." },
  { path: "/app/templates/:templateId/edit",            title: "Edit Template — LAGDA",                        breadcrumb: "Edit",                  section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_template_edit",       description: "Edit template name, documents, roles, routing, and settings." },
  // layout: "platform" is a LayoutType approximation; the field editor renders its own full-screen shell in the router.
  { path: "/app/templates/:templateId/fields",          title: "Template Fields — LAGDA",                      breadcrumb: "Fields",                section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_template_fields",     description: "Place and configure signing fields for this template." },
  { path: "/app/templates/:templateId/preview",         title: "Template Preview — LAGDA",                     breadcrumb: "Preview",               section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_template_preview",    description: "Preview the template's document layout and role assignments." },
  { path: "/app/templates/:templateId/use",             title: "Use Template — LAGDA",                         breadcrumb: "Use Template",          section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_template_use",        description: "Map participants and launch a signing request from this template." },
  { path: "/app/contacts",                              title: "Contacts — LAGDA",                      breadcrumb: "Contacts",          section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_contacts",              description: "Browse, search, filter, and manage reusable participant contacts." },
  { path: "/app/contacts/new",                          title: "Add Contact — LAGDA",                   breadcrumb: "Add Contact",       section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_contacts_new",           description: "Create a new contact with name, email, scope, tags, and groups." },
  { path: "/app/contacts/import",                       title: "Import Contacts — LAGDA",               breadcrumb: "Import",            section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_contacts_import",         description: "Import readiness demonstration — fictional CSV preview rows." },
  { path: "/app/contacts/groups",                       title: "Contact Groups — LAGDA",                breadcrumb: "Groups",            section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_contact_groups",          description: "Manage contact groups for quick participant selection." },
  { path: "/app/contacts/groups/:groupId",              title: "Contact Group — LAGDA",                 breadcrumb: "Group",             section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_contact_group_detail",    description: "View and manage members of a specific contact group." },
  { path: "/app/contacts/:contactId",                   title: "Contact — LAGDA",                       breadcrumb: "Contact",           section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_contact_detail",          description: "Full contact details, tags, groups, usage summary, and duplicates." },
  { path: "/app/contacts/:contactId/edit",              title: "Edit Contact — LAGDA",                  breadcrumb: "Edit",              section: "platform", product: "esignature", layout: "platform",  requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_contact_edit",            description: "Edit contact details. Historical participant records are not affected." },
  // Workspace Administration (Command 23)
  { path: "/app/workspace",                              title: "Workspace — LAGDA",                              breadcrumb: "Workspace",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace",             description: "Workspace overview, stats, and administration navigation." },
  { path: "/app/workspace/members",                     title: "Members — LAGDA",                                breadcrumb: "Members",               section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_members",      description: "Browse and manage workspace members." },
  { path: "/app/workspace/members/:memberId",           title: "Member — LAGDA",                                 breadcrumb: "Member",                section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_member_detail",description: "Member profile, effective permissions, role and team assignment." },
  { path: "/app/workspace/invitations",                 title: "Invitations — LAGDA",                            breadcrumb: "Invitations",           section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_invitations",  description: "Manage pending and expired workspace invitations." },
  { path: "/app/workspace/teams",                       title: "Teams — LAGDA",                                  breadcrumb: "Teams",                 section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_teams",         description: "Browse and manage workspace teams." },
  { path: "/app/workspace/teams/:teamId",               title: "Team — LAGDA",                                   breadcrumb: "Team",                  section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_team_detail",   description: "Team detail, member list, and archive controls." },
  { path: "/app/workspace/roles",                       title: "Roles — LAGDA",                                  breadcrumb: "Roles",                 section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_roles",         description: "System and custom workspace roles and permissions." },
  { path: "/app/workspace/roles/:roleId",               title: "Role — LAGDA",                                   breadcrumb: "Role",                  section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_role_detail",   description: "Role permission matrix and assignment details." },
  { path: "/app/workspace/activity",                    title: "Activity — LAGDA",                               breadcrumb: "Activity",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_activity",      description: "Chronological administrative event log." },
  { path: "/app/workspace/settings",                    title: "Workspace Settings — LAGDA",                     breadcrumb: "Settings",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_workspace_settings",      description: "Workspace identity, membership, security, and session policy." },
  { path: "/app/verify",                      title: "Verify a Document — LAGDA",                  breadcrumb: "Verify",                section: "platform", product: "verification",layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_verify" },
  { path: "/app/notifications",               title: "Notifications — LAGDA",                      breadcrumb: "Notifications",         section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_notifications" },
  { path: "/app/workspaces",                  title: "Workspaces — LAGDA",                         breadcrumb: "Workspaces",            section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_workspaces" },
  { path: "/app/team",                        title: "Team — LAGDA",                               breadcrumb: "Team",                  section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_team" },
  // Settings (Command 24)
  { path: "/app/settings",                              title: "Settings — LAGDA",                             breadcrumb: "Settings",                section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_overview" },
  { path: "/app/settings/profile",                      title: "Profile Settings — LAGDA",                     breadcrumb: "Profile",                 section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_profile" },
  { path: "/app/settings/preferences",                  title: "Preferences — LAGDA",                          breadcrumb: "Preferences",             section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_preferences" },
  { path: "/app/settings/security",                     title: "Security Settings — LAGDA",                    breadcrumb: "Security",                section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_security" },
  { path: "/app/settings/security/password",            title: "Password — LAGDA",                             breadcrumb: "Password",                section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_security_password" },
  { path: "/app/settings/security/mfa",                 title: "Multi-Factor Auth — LAGDA",                    breadcrumb: "Multi-Factor Auth",       section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_security_mfa" },
  { path: "/app/settings/security/sessions",            title: "Active Sessions — LAGDA",                      breadcrumb: "Active Sessions",         section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_security_sessions" },
  { path: "/app/settings/security/activity",            title: "Security Activity — LAGDA",                    breadcrumb: "Security Activity",       section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_security_activity" },
  { path: "/app/settings/notifications",                title: "Notification Preferences — LAGDA",             breadcrumb: "Notifications",           section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_notifications" },
  { path: "/app/settings/branding",                     title: "Workspace Branding — LAGDA",                   breadcrumb: "Branding",                section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_branding" },
  { path: "/app/settings/billing",                      title: "Billing & Plan — LAGDA",                       breadcrumb: "Billing & Plan",          section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_billing" },
  { path: "/app/settings/usage",                        title: "Usage — LAGDA",                                breadcrumb: "Usage",                   section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_usage" },
  { path: "/app/settings/integrations",                 title: "Integrations — LAGDA",                         breadcrumb: "Integrations",            section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_integrations" },
  { path: "/app/settings/integrations/:integrationId",  title: "Integration — LAGDA",                          breadcrumb: "Integration",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_integration_detail" },
  { path: "/app/settings/data-and-privacy",             title: "Data & Privacy — LAGDA",                       breadcrumb: "Data & Privacy",          section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "settings_data_privacy" },
  // Reports Center (Command 29)
  { path: "/app/reports",                  title: "Reports — LAGDA",                                breadcrumb: "Reports",               section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_reports_overview",      description: "Operational insights overview across all report families." },
  { path: "/app/reports/documents",        title: "Document Operations — LAGDA Reports",             breadcrumb: "Document Operations",   section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_reports_documents",     description: "Volume, status distribution, completion direction, and delivery-issue direction." },
  { path: "/app/reports/participants",     title: "Participants & Routing — LAGDA Reports",          breadcrumb: "Participants & Routing",section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_reports_participants",  description: "Role distribution, routing-stage direction, and authentication methods." },
  { path: "/app/reports/templates",        title: "Template Adoption — LAGDA Reports",               breadcrumb: "Template Adoption",     section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_reports_templates",     description: "Template usage trends, frequently used templates, and status distribution." },
  { path: "/app/reports/verification",     title: "Verification — LAGDA Reports",                    breadcrumb: "Verification",          section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_reports_verification",  description: "Verification check direction, outcome distribution, and coverage." },
  { path: "/app/reports/teams",            title: "Workspace & Team Activity — LAGDA Reports",       breadcrumb: "Teams",                 section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_reports_teams",         description: "Workspace summary, team comparison, and member activity direction." },
  { path: "/app/reports/saved",            title: "Saved Views — LAGDA Reports",                     breadcrumb: "Saved Views",           section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_reports_saved",         description: "Saved report view configurations." },
  { path: "/app/reports/:reportId",        title: "Report — LAGDA",                                  breadcrumb: "Report",                section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_report_detail",         description: "Saved report view detail page." },
  // Workflow Automation (Command 32)
  { path: "/app/automation",                              title: "Automation | LAGDA",                    description: "Workflow rules, policies, simulations, and conflict detection.", breadcrumb: "Automation",      section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation" },
  { path: "/app/automation/rules",                        title: "Rules | LAGDA",                         description: "Browse and manage workflow automation rules.",                   breadcrumb: "Rules",           section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_rules" },
  { path: "/app/automation/rules/new",                    title: "New Rule | LAGDA",                      description: "Create a new workflow automation rule.",                          breadcrumb: "New Rule",        section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_rule_new" },
  { path: "/app/automation/rules/:ruleId",                title: "Rule | LAGDA",                          description: "View workflow rule details, conditions, and actions.",             breadcrumb: "Rule",            section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_rule_detail" },
  { path: "/app/automation/rules/:ruleId/edit",           title: "Edit Rule | LAGDA",                     description: "Edit a workflow automation rule.",                                breadcrumb: "Edit Rule",       section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_rule_edit" },
  { path: "/app/automation/rules/:ruleId/test",           title: "Test Rule | LAGDA",                     description: "Simulate a workflow rule to preview projected changes.",           breadcrumb: "Test Rule",       section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_rule_test" },
  { path: "/app/automation/conflicts",                    title: "Conflicts | LAGDA",                     description: "Review and resolve workflow rule conflicts.",                     breadcrumb: "Conflicts",       section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_conflicts" },
  { path: "/app/automation/policies",                     title: "Policies | LAGDA",                      description: "Configure workspace-level default behavior policies.",            breadcrumb: "Policies",        section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_policies" },
  { path: "/app/automation/policies/:policyId",           title: "Policy | LAGDA",                        description: "Edit a workflow automation policy.",                              breadcrumb: "Policy",          section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_policy_detail" },
  { path: "/app/automation/activity",                     title: "Automation Activity | LAGDA",           description: "Chronological log of all automation events and simulations.",    breadcrumb: "Activity",        section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_automation_activity" },
  // Global Search (Command 30)
  { path: "/app/search",                  title: "Search — LAGDA",                                  breadcrumb: "Search",                section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_search",               description: "Search across documents, my actions, templates, contacts, people, verification, reports, and settings." },
];

// ── Recipient signing routes (Command 20) ────────────────────────────────────
// All /sign/* routes are excluded from indexing and sitemap.
// requiresAuth: false — access control is handled inside the flow (invitation link + optional OTP).
// layout: "platform" is a LayoutType approximation; these use RecipientLayout in the router.

export type RecipientLayoutType = "recipient";

export const RECIPIENT_ROUTES: RouteMeta[] = [
  { path: "/sign/:requestId", title: "Document Request — LAGDA eSignature", breadcrumb: "Document Request", section: "recipient", product: "esignature", layout: "platform", requiresAuth: false, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "recipient_access"   },
  { path: "/sign",            title: "Document Request — LAGDA eSignature", breadcrumb: "Document Request", section: "recipient", product: "esignature", layout: "platform", requiresAuth: false, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "recipient_root"     },
];

// ── Utility helpers ────────────────────────────────────────────────────────────

const ALL_ROUTES = [...PUBLIC_ROUTES, ...AUTH_ROUTES, ...PLATFORM_ROUTES, ...RECIPIENT_ROUTES];

export function getRouteMeta(pathname: string): RouteMeta | undefined {
  // Patterns as well as exact paths — most of this table is parametric, and
  // comparing "/app/documents/:transactionId" to a real pathname never matched.
  const exact = ALL_ROUTES.find((r) => r.path === pathname);
  if (exact) return exact;
  const actual = pathname.split("/").filter(Boolean);
  return ALL_ROUTES
    .filter((r) => r.path.includes(":"))
    .map((r) => ({ r, segs: r.path.split("/").filter(Boolean) }))
    // Static segments beat parameters so the more specific pattern wins.
    .sort((a, b) =>
      b.segs.filter((x) => !x.startsWith(":")).length -
      a.segs.filter((x) => !x.startsWith(":")).length)
    .find(({ segs }) =>
      segs.length === actual.length &&
      segs.every((seg, i) => seg.startsWith(":") || seg === actual[i]))?.r;
}

export function getRouteTitle(pathname: string): string {
  return getRouteMeta(pathname)?.title ?? "LAGDA";
}
