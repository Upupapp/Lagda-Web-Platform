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
];

// ── Platform (authenticated customer) routes ──────────────────────────────────

export const PLATFORM_ROUTES: RouteMeta[] = [
  // /app redirects to /app/dashboard — keep for usePageMeta fallback
  { path: "/app",                             title: "Dashboard | LAGDA",                          breadcrumb: "Dashboard",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_dashboard" },
  // Canonical authenticated Dashboard route
  { path: "/app/dashboard",                   title: "Dashboard | LAGDA",                          breadcrumb: "Dashboard",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_dashboard" },
  { path: "/app/documents",                              title: "Documents | LAGDA",               description: "View, search, and manage your document transactions in LAGDA eSignature.", breadcrumb: "Documents",      section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_documents" },
  { path: "/app/documents/:transactionId",             title: "Overview | LAGDA",                 breadcrumb: "Overview",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_overview",      tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/participants", title: "Participants | LAGDA",              breadcrumb: "Participants",          section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_participants",  tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/activity",    title: "Activity | LAGDA",                  breadcrumb: "Activity",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_activity",      tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/evidence",    title: "Evidence | LAGDA",                  breadcrumb: "Evidence",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_evidence",      tabGroup: "txn-detail" },
  { path: "/app/documents/:transactionId/settings",    title: "Settings | LAGDA",                  breadcrumb: "Settings",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_doc_settings",      tabGroup: "txn-detail" },
  { path: "/app/prepare",                     title: "Prepare a Document — LAGDA",                 breadcrumb: "Prepare",               section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_prepare" },
  { path: "/app/prepare/upload",              title: "Upload Document — LAGDA",                    breadcrumb: "Upload",                section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_upload" },
  { path: "/app/templates",                   title: "Templates — LAGDA",                          breadcrumb: "Templates",             section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_templates" },
  { path: "/app/contacts",                    title: "Contacts — LAGDA",                           breadcrumb: "Contacts",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_contacts" },
  { path: "/app/verify",                      title: "Verify a Document — LAGDA",                  breadcrumb: "Verify",                section: "platform", product: "verification",layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "implemented", analyticsName: "platform_verify" },
  { path: "/app/notifications",               title: "Notifications — LAGDA",                      breadcrumb: "Notifications",         section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_notifications" },
  { path: "/app/workspaces",                  title: "Workspaces — LAGDA",                         breadcrumb: "Workspaces",            section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_workspaces" },
  { path: "/app/team",                        title: "Team — LAGDA",                               breadcrumb: "Team",                  section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "platform_team" },
  { path: "/app/settings/profile",            title: "Profile Settings — LAGDA",                   breadcrumb: "Profile",               section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_profile" },
  { path: "/app/settings/security",           title: "Security Settings — LAGDA",                  breadcrumb: "Security",              section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_security" },
  { path: "/app/settings/notifications",      title: "Notification Settings — LAGDA",              breadcrumb: "Notifications",         section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_notifications" },
  { path: "/app/settings/branding",           title: "Branding Settings — LAGDA",                  breadcrumb: "Branding",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_branding" },
  { path: "/app/settings/billing",            title: "Billing — LAGDA",                            breadcrumb: "Billing",               section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_billing" },
  { path: "/app/settings/usage",              title: "Usage — LAGDA",                              breadcrumb: "Usage",                 section: "platform", product: "shared",     layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_usage" },
  { path: "/app/settings/integrations",       title: "Integrations — LAGDA",                       breadcrumb: "Integrations",          section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_integrations" },
  { path: "/app/settings/api",                title: "API Keys — LAGDA",                           breadcrumb: "API Keys",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_api" },
  { path: "/app/settings/webhooks",           title: "Webhooks — LAGDA",                           breadcrumb: "Webhooks",              section: "platform", product: "esignature", layout: "platform", requiresAuth: true, isPublic: false, isIndexable: false, status: "planned", analyticsName: "settings_webhooks" },
];

// ── Utility helpers ────────────────────────────────────────────────────────────

const ALL_ROUTES = [...PUBLIC_ROUTES, ...AUTH_ROUTES, ...PLATFORM_ROUTES];

export function getRouteMeta(pathname: string): RouteMeta | undefined {
  return ALL_ROUTES.find((r) => r.path === pathname);
}

export function getRouteTitle(pathname: string): string {
  return getRouteMeta(pathname)?.title ?? "LAGDA";
}
