// Canonical LAGDA pricing configuration.
// No approved numeric prices exist — monthlyPrice/annualPrice are null on the
// PUBLIC plans below. The in-app catalogue at the end of this file carries
// SAMPLE prices, shown only inside the app and always labelled as samples.
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
    secondaryCtaPath: "/book-a-demo?topic=enterprise-admin",
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
  personal: string;
  business: string;
  enterprise: string;
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

// ═════════════════════════════════════════════════════════════════════════════
// In-app plan catalogue — SAMPLE prices and limits.
//
// The single source for Settings › Billing & Plan (plan cards, comparison
// table, sample invoice) and Settings › Usage (plan limits). The figures are
// SAMPLES shown inside the signed-in app only, always under the
// SAMPLE_PRICING_NOTICE; final prices are confirmed at launch.
//
// The PUBLIC pricing pages do not read this block. They keep LAGDA_PLANS and
// COMPARE_GROUPS above, which carry no prices, so the marketing site does not
// start quoting numbers.
// ═════════════════════════════════════════════════════════════════════════════

export type CatalogPlanId = "free" | PlanId;

export const SAMPLE_PRICING_NOTICE = "SAMPLE PRICING — FINAL PRICES CONFIRMED AT LAUNCH";

/** A plan limit: a number the product can compare against, or a label only. */
export interface PlanLimit {
  /** null when the limit is unlimited or arranged per customer. */
  readonly value: number | null;
  readonly label: string;
}

export interface SamplePlanPrice {
  /** Pesos per month (per user when `perUser`). */
  readonly monthly: number;
  /** Pesos per year (per user when `perUser`). */
  readonly annual: number;
  readonly perUser: boolean;
}

export interface SamplePlan {
  readonly id: CatalogPlanId;
  readonly name: string;
  readonly tagline: string;
  /** null for Enterprise (custom pricing). Free is `{ monthly: 0, annual: 0 }`. */
  readonly price: SamplePlanPrice | null;
  readonly mostPopular: boolean;
  readonly limits: {
    readonly signingRequestsPerMonth: PlanLimit;
    readonly users: PlanLimit;
    readonly storageBytes: PlanLimit;
    readonly templates: PlanLimit;
  };
  readonly signerAuthentication: string;
  readonly branding: boolean;
  readonly teamControls: boolean;
  readonly activityLog: boolean;
  readonly support: string;
  /** "14 days", "Demo", or null for none. */
  readonly trial: string | null;
  readonly highlights: readonly string[];
}

const MB = 1_000_000;
const GB = 1_000_000_000;

export const SAMPLE_PLANS: readonly SamplePlan[] = [
  {
    id: "free", name: "Free", tagline: "Try LAGDA with one document",
    price: { monthly: 0, annual: 0, perUser: false }, mostPopular: false,
    limits: {
      signingRequestsPerMonth: { value: 1, label: "1 document in total" },
      users: { value: 1, label: "1" },
      storageBytes: { value: 500 * MB, label: "500 MB" },
      templates: { value: 3, label: "3" },
    },
    signerAuthentication: "Secure link + email code",
    branding: false, teamControls: false, activityLog: false,
    support: "Help Center", trial: null,
    highlights: ["1 document sent for signing", "Unlimited signing of documents sent to you", "Personal contacts", "Audit trail and Verification", "Help Center support"],
  },
  {
    id: "personal", name: "Personal", tagline: "For individuals and solo practitioners",
    price: { monthly: 299, annual: 2990, perUser: false }, mostPopular: false,
    limits: {
      signingRequestsPerMonth: { value: 50, label: "50" },
      users: { value: 1, label: "1" },
      storageBytes: { value: 5 * GB, label: "5 GB" },
      templates: { value: 25, label: "25" },
    },
    signerAuthentication: "+ SMS code",
    branding: true, teamControls: false, activityLog: false,
    support: "Email", trial: null,
    highlights: ["50 signing requests a month", "Personal branding", "Document sharing", "Ready-made templates and chatbot", "Email support"],
  },
  {
    id: "business", name: "Business", tagline: "For teams and growing organizations",
    price: { monthly: 799, annual: 7990, perUser: true }, mostPopular: true,
    limits: {
      signingRequestsPerMonth: { value: 200, label: "200 per user" },
      users: { value: 50, label: "Up to 50" },
      storageBytes: { value: 50 * GB, label: "50 GB shared" },
      templates: { value: null, label: "Unlimited shared" },
    },
    signerAuthentication: "+ Authenticator app",
    branding: true, teamControls: true, activityLog: true,
    support: "Priority email", trial: null,
    highlights: ["200 signing requests per user a month", "Company branding", "Members, teams, join links and roles", "Shared contacts and the workspace card", "Workspace activity log"],
  },
  {
    id: "enterprise", name: "Enterprise", tagline: "For large organizations and institutions",
    price: null, mostPopular: false,
    limits: {
      signingRequestsPerMonth: { value: null, label: "Custom" },
      users: { value: null, label: "Unlimited" },
      storageBytes: { value: null, label: "Custom" },
      templates: { value: null, label: "Unlimited" },
    },
    signerAuthentication: "+ SSO",
    branding: true, teamControls: true, activityLog: true,
    support: "Dedicated", trial: "Demo",
    highlights: ["Custom volume and storage", "Single sign-on (SSO)", "Everything in Business", "Dedicated support"],
  },
];

/** A cell of the comparison table: a tick, a dash, or text. */
export type CompareCell = boolean | string;

export interface CatalogCompareRow {
  readonly id: string;
  readonly label: string;
  readonly cell: (plan: SamplePlan) => CompareCell;
}

export interface CatalogCompareGroup {
  readonly id: string;
  readonly title: string;
  readonly rows: readonly CatalogCompareRow[];
}

/** The full comparison, derived from SAMPLE_PLANS so the two cannot drift. */
export const SAMPLE_COMPARE_GROUPS: readonly CatalogCompareGroup[] = [
  {
    id: "price", title: "Price",
    rows: [
      { id: "monthly", label: "Monthly", cell: p => p.price === null ? "Custom" : p.price.monthly === 0 ? formatPeso(0) : `${formatPeso(p.price.monthly)}${p.price.perUser ? " per user" : ""}` },
      { id: "annual", label: "Annual", cell: p => p.price === null ? "Custom" : p.price.annual === 0 ? formatPeso(0) : `${formatPeso(p.price.annual)}${p.price.perUser ? " per user" : ""}` },
    ],
  },
  {
    id: "limits", title: "Limits",
    rows: [
      { id: "signing-requests", label: "Documents you send", cell: p => p.id === "free" ? p.limits.signingRequestsPerMonth.label : `${p.limits.signingRequestsPerMonth.label} a month` },
      { id: "users", label: "Users", cell: p => p.limits.users.label },
      { id: "storage", label: "Storage", cell: p => p.limits.storageBytes.label },
      { id: "templates", label: "Templates", cell: p => p.limits.templates.label },
    ],
  },
  {
    id: "signing", title: "Signing and trust",
    rows: [
      { id: "signer-auth", label: "Signer authentication", cell: p => p.signerAuthentication },
      { id: "audit", label: "Audit trail and completion report", cell: () => true },
      { id: "verification", label: "Document Verification", cell: () => true },
    ],
  },
  {
    id: "workspace", title: "Workspace",
    rows: [
      { id: "branding", label: "Branding", cell: p => p.branding },
      { id: "sharing", label: "Document sharing", cell: p => p.id !== "free" },
      { id: "contacts", label: "Personal contacts", cell: () => true },
      { id: "team", label: "Join links, approvals and roles", cell: p => p.teamControls },
      { id: "activity", label: "Workspace activity log", cell: p => p.activityLog },
    ],
  },
  {
    id: "support", title: "Support",
    rows: [
      { id: "support", label: "Support", cell: p => p.support },
      { id: "trial", label: "Trial", cell: p => p.trial ?? false },
    ],
  },
];

/**
 * What this workspace is on today. Early Access includes every Business
 * feature, bills nothing, and applies no limits.
 */
export const CURRENT_PLAN: {
  readonly id: "early-access";
  readonly name: string;
  readonly includesPlanId: CatalogPlanId;
  readonly limitsApplied: boolean;
  readonly summary: string;
} = {
  id: "early-access",
  name: "Early Access",
  includesPlanId: "business",
  limitsApplied: false,
  summary: "Includes all Business features at no charge while LAGDA is in early access. Nothing is billed.",
};

/** The limits Usage compares against, or null while none is applied. */
export function currentPlanLimits(): SamplePlan["limits"] | null {
  if (!CURRENT_PLAN.limitsApplied) return null;
  return SAMPLE_PLANS.find(p => p.id === CURRENT_PLAN.includesPlanId)?.limits ?? null;
}

export function formatPeso(amount: number, decimals = false): string {
  return `₱${amount.toLocaleString("en-PH", decimals
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 0 })}`;
}

/** Pesos saved by paying annually (per user when the plan is per user). */
export function annualSaving(price: SamplePlanPrice): number {
  return Math.max(0, price.monthly * 12 - price.annual);
}
