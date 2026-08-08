// Centralized navigation and footer data.
// All path-based navigation derives from these definitions.
// PublicHeader and MobileDrawer read TOP_NAV; PublicFooter reads FOOTER_COLUMNS.

export interface NavItem {
  label: string;
  path: string;
  description: string;
  isComingSoon?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  path: string;
  matchPrefix: string;
  badge?: string;
  isComingSoon?: boolean;
  accent: "azure" | "burgundy";
  menuTitle: string;
  menuDescription: string;
  menuCtaLabel: string;
  menuCtaNote?: string;
  items: NavItem[];
}

export const TOP_NAV: NavSection[] = [
  {
    id: "esignature",
    label: "eSignature",
    path: "/esignature",
    matchPrefix: "/esignature",
    accent: "azure",
    menuTitle: "LAGDA eSignature",
    menuDescription: "Send, sign, track, and verify documents online.",
    menuCtaLabel: "Explore eSignature",
    items: [
      { label: "Core Workflow",         path: "/esignature/core-workflow",          description: "Prepare, send, verify, and sign documents." },
      { label: "Document Workflows",    path: "/workflow",                          description: "Reusable multi-stage processes, started as many times as needed." },
      { label: "Verification & Audit",  path: "/esignature/verification-and-audit", description: "Audit trails, QR verification, and signing records." },
      { label: "Advanced Capabilities", path: "/esignature/advanced-capabilities",  description: "Parallel signing, storage, and advanced workflows." },
      { label: "Templates & Branding",  path: "/esignature/templates-and-branding", description: "Reusable templates and company branding controls." },
      { label: "Team & Enterprise",     path: "/esignature/team-and-enterprise",     description: "Workspaces, roles, reports, and enterprise controls." },
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    path: "/solutions",
    matchPrefix: "/solutions",
    accent: "azure",
    menuTitle: "Solutions",
    menuDescription: "Use LAGDA across legal, business, and institutional workflows.",
    menuCtaLabel: "Find Your Use Case",
    items: [
      { label: "Lawyers",          path: "/solutions/lawyers",    description: "Individual legal practitioners and solo attorneys." },
      { label: "Law Firms",        path: "/solutions/law-firms",  description: "Multi-lawyer practices and full-service firms." },
      { label: "Business Teams",   path: "/solutions/business-teams",     description: "Internal approvals, contracts, and HR documents." },
      { label: "Government / LGU", path: "/solutions/government-and-lgu", description: "Official documents and public sector workflows." },
      { label: "Real Estate",      path: "/solutions/real-estate",        description: "Property contracts, deeds, and broker agreements." },
      { label: "HR & Recruitment", path: "/solutions/hr-and-recruitment", description: "Employment contracts, NDAs, and onboarding." },
      { label: "Finance",          path: "/solutions/finance",            description: "Loan agreements, term sheets, and compliance docs." },
      { label: "Procurement",      path: "/solutions/procurement",        description: "Supplier contracts and purchase agreements." },
    ],
  },
  {
    id: "pricing",
    label: "Pricing",
    path: "/pricing",
    matchPrefix: "/pricing",
    accent: "azure",
    menuTitle: "Pricing",
    menuDescription: "Understand plans, limits, templates, storage, and enterprise options.",
    menuCtaLabel: "View Pricing",
    menuCtaNote: "Personal starts free. Business is recommended for teams.",
    items: [
      { label: "Plans",             path: "/pricing",                       description: "Personal, Professional, Business, Business Plus, Enterprise." },
      { label: "Compare Plans",     path: "/pricing/compare",               description: "Side-by-side feature and limit comparison." },
      { label: "Signing Requests",  path: "/pricing/signing-requests",      description: "How sending limits work across plans." },
      { label: "Storage Limits",    path: "/pricing/storage-limits",        description: "Document storage per plan tier." },
      { label: "Templates by Plan", path: "/pricing/templates-by-plan",     description: "Which templates are available on each plan." },
      { label: "Enterprise",        path: "/pricing/enterprise",            description: "Custom pricing and dedicated onboarding." },
      { label: "FAQ",               path: "/pricing/faq",                   description: "Common questions about billing and limits." },
    ],
  },
  {
    id: "security",
    label: "Security",
    path: "/security",
    matchPrefix: "/security",
    accent: "azure",
    menuTitle: "Security & Trust",
    menuDescription: "Understand identity, audit, verification, and document protection.",
    menuCtaLabel: "Explore Security",
    items: [
      { label: "Security Overview",               path: "/security",                                description: "High-level overview of the LAGDA security model." },
      { label: "Trust Center",                    path: "/security/trust-center",                   description: "Compliance posture, policies, and legal framework." },
      { label: "Identity Verification",           path: "/security/identity-verification",          description: "Know exactly who signed and how." },
      { label: "Audit Trail",                     path: "/security/audit-trail",                    description: "Every action recorded with timestamp and evidence." },
      { label: "Document Verification",           path: "/security/document-verification",          description: "Verify completed documents via QR or Verification ID." },
      { label: "Device & Location Evidence",      path: "/security/device-and-location-evidence",   description: "Signing evidence captured at each event." },
      { label: "Secure Storage",                  path: "/security/secure-storage",                 description: "Encrypted document storage and retention." },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    path: "/resources",
    matchPrefix: "/resources",
    accent: "azure",
    menuTitle: "Resources",
    menuDescription: "Guides, legal framework, FAQ, and support.",
    menuCtaLabel: "Visit Resources",
    items: [
      { label: "Guides",                path: "/resources/guides",            description: "Step-by-step guides for every LAGDA workflow." },
      { label: "FAQ",                   path: "/resources/faq",               description: "Answers to the most common LAGDA questions." },
      { label: "Legal Framework",       path: "/resources/legal-framework",   description: "Philippine legal context for electronic signatures." },
      { label: "Document Verification", path: "/verify",                      description: "How to verify a signed LAGDA document." },
      { label: "Help Center",           path: "/help",                        description: "Detailed product documentation and support." },
      { label: "Contact",               path: "/contact",                     description: "Reach the LAGDA team directly." },
    ],
  },
  {
    id: "enotary",
    label: "eNotary",
    path: "/enotary",
    matchPrefix: "/enotary",
    badge: "Coming Soon",
    isComingSoon: true,
    accent: "burgundy",
    menuTitle: "LAGDA eNotary",
    menuDescription: "Future electronic notarization — subject to Supreme Court accreditation.",
    menuCtaLabel: "Join Waitlist",
    items: [
      { label: "Overview",              path: "/enotary",                        description: "The future eNotary layer for Philippine legal documents.",  isComingSoon: true },
      { label: "Future Capabilities",   path: "/enotary/future-capabilities",    description: "Secure video, electronic notarial book, digital seals.",    isComingSoon: true },
      { label: "Accreditation Roadmap", path: "/enotary/accreditation-roadmap",  description: "Milestones toward Supreme Court accreditation.",            isComingSoon: true },
      { label: "Waitlist",              path: "/enotary/waitlist",               description: "Register interest for LAGDA eNotary when available.",       isComingSoon: true },
      { label: "FAQ",                   path: "/enotary/faq",                    description: "Common questions about LAGDA eNotary and accreditation.",   isComingSoon: true },
    ],
  },
];

export interface FooterLink {
  label: string;
  path: string;
  isComingSoon?: boolean;
}

export interface FooterColumn {
  heading: string;
  isComingSoon?: boolean;
  links: FooterLink[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "eSignature",            path: "/esignature" },
      { label: "Document Workflows",    path: "/workflow" },
      { label: "Core Workflow",         path: "/esignature/core-workflow" },
      { label: "Document Verification", path: "/verify" },
      { label: "Templates & Branding",  path: "/esignature/templates-and-branding" },
      { label: "Team & Enterprise",     path: "/esignature/team-and-enterprise" },
      { label: "Pricing",               path: "/pricing" },
    ],
  },
  {
    heading: "Solutions",
    links: [
      { label: "Lawyers",          path: "/solutions/lawyers" },
      { label: "Law Firms",        path: "/solutions/law-firms" },
      { label: "Business Teams",   path: "/solutions/business-teams" },
      { label: "Government / LGU", path: "/solutions/government-and-lgu" },
      { label: "Real Estate",      path: "/solutions/real-estate" },
      { label: "Finance",          path: "/solutions/finance" },
    ],
  },
  {
    heading: "Security & Trust",
    links: [
      { label: "Security Overview",     path: "/security" },
      { label: "Trust Center",          path: "/security/trust-center" },
      { label: "Identity Verification", path: "/security/identity-verification" },
      { label: "Audit Trail",           path: "/security/audit-trail" },
      { label: "Document Verification", path: "/security/document-verification" },
      { label: "Privacy",               path: "/legal/privacy" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Guides",          path: "/resources" },
      { label: "FAQ",             path: "/resources/faq" },
      { label: "Legal Framework", path: "/resources/legal-framework" },
      { label: "Help Center",     path: "/help" },
      { label: "Contact",         path: "/contact" },
      { label: "Service Status",  path: "/service-status" },
    ],
  },
  {
    heading: "eNotary",
    isComingSoon: true,
    links: [
      { label: "Overview",       path: "/enotary",          isComingSoon: true },
      { label: "Roadmap",        path: "/enotary/accreditation-roadmap",  isComingSoon: true },
      { label: "Join Waitlist",  path: "/enotary/waitlist", isComingSoon: true },
      { label: "FAQ",            path: "/enotary/faq",      isComingSoon: true },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy",   path: "/legal/privacy" },
      { label: "Terms of Service", path: "/legal/terms" },
      { label: "Accessibility",    path: "/legal/accessibility" },
    ],
  },
];
