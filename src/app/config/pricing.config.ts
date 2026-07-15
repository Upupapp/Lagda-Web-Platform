// Canonical LAGDA pricing configuration.
// No approved numeric prices exist — monthlyPrice/annualPrice are null.
// Never substitute competitor prices or invent limits.
// LAGDA eNotary is NOT included in any plan below — it is a separate future product.

export type PlanId = "personal" | "business" | "enterprise";
export type AvailValue = "included" | "not-included" | "varies" | "enterprise" | "pending";

export interface LagdaPlan {
  id: PlanId;
  name: string;
  tagline: string;
  audience: string;
  monthlyPrice: null;
  annualPrice: null;
  currency: "PHP";
  trial: boolean;
  freeForever: boolean;
  featured: boolean;
  enterprise: boolean;
  contactSales: boolean;
  ctaLabel: string;
  ctaPath: string;
  secondaryCtaLabel?: string;
  secondaryCtaPath?: string;
  availabilityStatus: "available" | "pending";
  highlights: string[];
  note?: string;
}

export const LAGDA_PLANS: LagdaPlan[] = [
  {
    id: "personal",
    name: "Personal",
    tagline: "For individuals and solo practitioners",
    audience: "Freelancers, sole practitioners, and individuals who send documents for signing on an occasional or regular basis.",
    monthlyPrice: null,
    annualPrice: null,
    currency: "PHP",
    trial: true,
    freeForever: false,
    featured: false,
    enterprise: false,
    contactSales: false,
    ctaLabel: "Create Free Account",
    ctaPath: "/create-account",
    availabilityStatus: "available",
    highlights: [
      "Document preparation and sending",
      "Signing-request allowance",
      "Secure invitation access",
      "Email OTP authentication",
      "Audit trail and completion report",
      "Document Verification",
      "Personal templates",
      "Saved contacts",
    ],
    note: "Signing-request allowances and feature availability are subject to plan terms confirmed at launch.",
  },
  {
    id: "business",
    name: "Business",
    tagline: "For teams and growing organizations",
    audience: "Teams, departments, and organizations that send documents regularly and need shared workflows and administration.",
    monthlyPrice: null,
    annualPrice: null,
    currency: "PHP",
    trial: true,
    freeForever: false,
    featured: true,
    enterprise: false,
    contactSales: false,
    ctaLabel: "Start Free Trial",
    ctaPath: "/create-account",
    availabilityStatus: "available",
    highlights: [
      "Everything in Personal",
      "Higher signing-request allowances",
      "Multiple senders in one workspace",
      "Shared template library",
      "Company branding",
      "SMS OTP and authenticator app authentication",
      "Role-based access control",
      "Usage reports and workspace administration",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large organizations and institutions",
    audience: "Large organizations with high volume, complex workflows, compliance requirements, or integration needs.",
    monthlyPrice: null,
    annualPrice: null,
    currency: "PHP",
    trial: false,
    freeForever: false,
    featured: false,
    enterprise: true,
    contactSales: true,
    ctaLabel: "Contact Sales",
    ctaPath: "/contact",
    secondaryCtaLabel: "Book a Demo",
    secondaryCtaPath: "/contact",
    availabilityStatus: "available",
    highlights: [
      "Everything in Business",
      "Custom signing-request volume",
      "Custom workspace administration",
      "Enterprise SSO and identity provider",
      "API and webhook integration by arrangement",
      "Custom onboarding and support",
      "Security and compliance review",
    ],
    note: "Enterprise arrangements are tailored to your organization's requirements. Contact sales to discuss.",
  },
];

export interface CompareRow {
  id: string;
  label: string;
  desc?: string;
  personal: AvailValue | string;
  business: AvailValue | string;
  enterprise: AvailValue | string;
}

export interface CompareGroup {
  id: string;
  title: string;
  rows: CompareRow[];
}

export const COMPARE_GROUPS: CompareGroup[] = [
  {
    id: "core",
    title: "Core Workflow",
    rows: [
      { id: "doc-prep",        label: "Document preparation",                          personal: "included",     business: "included",     enterprise: "included"     },
      { id: "roles",           label: "Participant roles (signer, approver, viewer, CC)", personal: "included",  business: "included",     enterprise: "included"     },
      { id: "parallel",        label: "Parallel signing",                              personal: "included",     business: "included",     enterprise: "included"     },
      { id: "sequential",      label: "Sequential signing",                            personal: "included",     business: "included",     enterprise: "included"     },
      { id: "mixed-routing",   label: "Mixed routing",                                 personal: "included",     business: "included",     enterprise: "included"     },
      { id: "reminders",       label: "Automatic reminders",                           personal: "included",     business: "included",     enterprise: "included"     },
      { id: "expiration",      label: "Transaction expiration",                        personal: "included",     business: "included",     enterprise: "included"     },
    ],
  },
  {
    id: "usage",
    title: "Usage and Limits",
    rows: [
      { id: "signing-requests", label: "Signing requests per period",                  personal: "varies",       business: "varies",       enterprise: "varies"       },
      { id: "senders",          label: "Senders",                                      personal: "1",            business: "varies",       enterprise: "varies"       },
      { id: "participants",     label: "Participants per transaction",                  personal: "varies",       business: "varies",       enterprise: "varies"       },
      { id: "storage",          label: "Document storage",                             personal: "varies",       business: "varies",       enterprise: "varies"       },
    ],
  },
  {
    id: "trust",
    title: "Trust and Evidence",
    rows: [
      { id: "audit-trail",      label: "Audit trail",                                  personal: "included",     business: "included",     enterprise: "included"     },
      { id: "completion-report",label: "Completion report",                            personal: "included",     business: "included",     enterprise: "included"     },
      { id: "doc-verification", label: "Document Verification",                        personal: "included",     business: "included",     enterprise: "included"     },
      { id: "verification-id",  label: "Verification ID and QR code",                  personal: "included",     business: "included",     enterprise: "included"     },
    ],
  },
  {
    id: "auth",
    title: "Authentication Methods",
    rows: [
      { id: "secure-link",     label: "Secure invitation link",                        personal: "included",     business: "included",     enterprise: "included"     },
      { id: "verified-email",  label: "Verified email access",                         personal: "included",     business: "included",     enterprise: "included"     },
      { id: "email-otp",       label: "Email OTP",                                     personal: "included",     business: "included",     enterprise: "included"     },
      { id: "sms-otp",         label: "SMS OTP",                                       personal: "not-included", business: "included",     enterprise: "included"     },
      { id: "auth-app",        label: "Authenticator app (TOTP)",                      personal: "not-included", business: "included",     enterprise: "included"     },
      { id: "account-auth",    label: "Account authentication",                        personal: "included",     business: "included",     enterprise: "included"     },
      { id: "identity-verify", label: "Identity-document verification",                personal: "pending",      business: "pending",      enterprise: "enterprise"   },
      { id: "enterprise-sso",  label: "Enterprise SSO / identity provider",            personal: "not-included", business: "not-included", enterprise: "enterprise"   },
    ],
  },
  {
    id: "productivity",
    title: "Productivity",
    rows: [
      { id: "tmpl-personal",   label: "Personal templates",                            personal: "included",     business: "included",     enterprise: "included"     },
      { id: "tmpl-shared",     label: "Shared workspace templates",                   personal: "not-included", business: "included",     enterprise: "included"     },
      { id: "contacts",        label: "Saved contacts",                                personal: "included",     business: "included",     enterprise: "included"     },
      { id: "branding",        label: "Company branding",                              personal: "not-included", business: "included",     enterprise: "included"     },
      { id: "notifications",   label: "Notification controls",                         personal: "included",     business: "included",     enterprise: "included"     },
    ],
  },
  {
    id: "team",
    title: "Team and Enterprise",
    rows: [
      { id: "workspace",       label: "Shared workspace",                              personal: "not-included", business: "included",     enterprise: "included"     },
      { id: "rbac",            label: "Role-based access control",                    personal: "not-included", business: "included",     enterprise: "included"     },
      { id: "usage-admin",     label: "Usage administration",                          personal: "not-included", business: "included",     enterprise: "included"     },
      { id: "api",             label: "API access",                                    personal: "not-included", business: "not-included", enterprise: "enterprise"   },
      { id: "webhooks",        label: "Webhooks",                                      personal: "not-included", business: "not-included", enterprise: "enterprise"   },
      { id: "embedded",        label: "Embedded signing",                              personal: "not-included", business: "not-included", enterprise: "enterprise"   },
      { id: "user-prov",       label: "User provisioning",                             personal: "not-included", business: "not-included", enterprise: "enterprise"   },
      { id: "onboarding",      label: "Custom onboarding",                             personal: "not-included", business: "not-included", enterprise: "enterprise"   },
      { id: "priority-support",label: "Priority support",                              personal: "not-included", business: "not-included", enterprise: "enterprise"   },
    ],
  },
];
