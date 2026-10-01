// Canonical LAGDA pricing configuration.
//
// The PUBLIC plans and comparison below describe what is LIVE (backend 093):
// Free, Personal and Business as they work in the product today, and
// Enterprise as Coming Soon. Nothing unbuilt is listed. The in-app catalogue
// at the end of this file carries the prices and allowances shown inside the
// app; a test (settings-config.test.ts) keeps the two from drifting.
//
// Plans belong to PEOPLE: a workspace has its owner's plan.
// LAGDA eNotary is NOT included in any plan below — it is a separate future product.

export type PlanId = "personal" | "business" | "enterprise";
export type AvailValue = "included" | "not-included" | "varies" | "enterprise" | "pending";

export interface LagdaPlan {
  id: CatalogPlanId;
  name: string;
  tagline: string;
  audience: string;
  monthlyPrice: null;
  annualPrice: null;
  currency: "PHP";
  /** No plan offers a trial: Free is how LAGDA is tried. */
  trial: false;
  freeForever: boolean;
  featured: boolean;
  enterprise: boolean;
  contactSales: boolean;
  /** Shown, but not yet offered (Enterprise). */
  comingSoon: boolean;
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
    id: "free",
    name: "Free",
    tagline: "Try LAGDA with one document",
    audience: "Anyone who wants to try LAGDA, or who mostly signs documents other people send.",
    monthlyPrice: null,
    annualPrice: null,
    currency: "PHP",
    trial: false,
    freeForever: true,
    featured: false,
    enterprise: false,
    contactSales: false,
    comingSoon: false,
    ctaLabel: "Create Free Account",
    ctaPath: "/create-account",
    availabilityStatus: "available",
    highlights: [
      "1 document sent for signing",
      "Unlimited signing of documents sent to you",
      "Secure invitation link and email code",
      "Audit trail and Document Verification",
      "Personal contacts and contact requests",
      "Two-step verification for your account",
    ],
    note: "Upgrade any time from My Settings › Plan & Billing.",
  },
  {
    id: "personal",
    name: "Personal",
    tagline: "For individuals and solo practitioners",
    audience: "Freelancers, sole practitioners, and individuals who send documents for signing on an occasional or regular basis.",
    monthlyPrice: null,
    annualPrice: null,
    currency: "PHP",
    trial: false,
    freeForever: false,
    featured: false,
    enterprise: false,
    contactSales: false,
    comingSoon: false,
    ctaLabel: "Create Account",
    ctaPath: "/create-account",
    availabilityStatus: "available",
    highlights: [
      "Everything in Free",
      "50 documents a month",
      "Your logo and colours",
      "Share completed documents",
      "Ready-made templates and the LAGDA Chatbot",
      "Join other workspaces",
    ],
    note: "Start on Free, then choose Personal in Plan & Billing.",
  },
  {
    id: "business",
    name: "Business",
    tagline: "For teams and growing organizations",
    audience: "Teams, departments, and organizations that send documents regularly and need shared workflows and administration.",
    monthlyPrice: null,
    annualPrice: null,
    currency: "PHP",
    trial: false,
    freeForever: false,
    featured: true,
    enterprise: false,
    contactSales: false,
    comingSoon: false,
    ctaLabel: "Create Account",
    ctaPath: "/create-account",
    availabilityStatus: "available",
    highlights: [
      "Everything in Personal",
      "200 documents per user a month",
      "Members and invitations",
      "Teams, roles and join links",
      "Company branding",
      "Shared contacts and the workspace activity log",
    ],
    note: "Start on Free, then choose Business in Plan & Billing.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For large organizations and institutions",
    audience: "Large organizations with high volume, complex workflows, or compliance requirements.",
    monthlyPrice: null,
    annualPrice: null,
    currency: "PHP",
    trial: false,
    freeForever: false,
    featured: false,
    enterprise: true,
    contactSales: true,
    comingSoon: true,
    ctaLabel: "Ask About Enterprise",
    ctaPath: "/contact",
    availabilityStatus: "pending",
    highlights: [
      "Everything in Business",
      "Custom document volume",
      "Dedicated onboarding and support",
    ],
    note: "Enterprise is coming soon. Contact us to be told when it opens.",
  },
];

export interface CompareRow {
  id: string;
  label: string;
  desc?: string;
  free: string;
  personal: string;
  business: string;
  enterprise: string;
}

export interface CompareGroup {
  id: string;
  title: string;
  rows: CompareRow[];
}

const ALL = { free: "included", personal: "included", business: "included", enterprise: "included" } as const;
const PAID = { free: "not-included", personal: "included", business: "included", enterprise: "included" } as const;
const TEAM = { free: "not-included", personal: "not-included", business: "included", enterprise: "included" } as const;

/**
 * Only what is live. Enterprise is Coming Soon: its column shows what it
 * will include (everything in Business), and the table marks it so.
 */
export const COMPARE_GROUPS: CompareGroup[] = [
  {
    id: "core",
    title: "Core Workflow",
    rows: [
      { id: "doc-prep",       label: "Document preparation",                            ...ALL },
      { id: "roles",          label: "Participant roles (signer, approver, viewer, CC)", ...ALL },
      { id: "parallel",       label: "Parallel signing",                                ...ALL },
      { id: "sequential",     label: "Sequential signing",                              ...ALL },
      { id: "reminders",      label: "Automatic reminders",                             ...ALL },
      { id: "expiration",     label: "Transaction expiration",                          ...ALL },
    ],
  },
  {
    id: "usage",
    title: "Usage and Limits",
    rows: [
      { id: "documents-sent", label: "Documents you send",            free: "1 in total", personal: "50 a month", business: "200 per user a month", enterprise: "Custom" },
      { id: "signing-for-you",label: "Signing documents sent to you", free: "Unlimited",  personal: "Unlimited",  business: "Unlimited",            enterprise: "Unlimited" },
      { id: "users",          label: "People in your workspace",      free: "1",          personal: "1",          business: "Up to 50",             enterprise: "Custom" },
      { id: "storage",        label: "Document storage",              free: "500 MB",     personal: "5 GB",       business: "50 GB shared",         enterprise: "Custom" },
    ],
  },
  {
    id: "trust",
    title: "Trust and Evidence",
    rows: [
      { id: "audit-trail",       label: "Audit trail",                 ...ALL },
      { id: "completion-report", label: "Completion report",           ...ALL },
      { id: "doc-verification",  label: "Document Verification",       ...ALL },
      { id: "verification-id",   label: "Verification ID and QR code", ...ALL },
    ],
  },
  {
    id: "auth",
    title: "Authentication",
    rows: [
      { id: "secure-link",  label: "Secure invitation link",               ...ALL },
      { id: "email-code",   label: "Email code for signers",               ...ALL },
      { id: "account-auth", label: "Sign from your LAGDA account",          ...ALL },
      { id: "two-step",     label: "Two-step verification for your account", ...ALL },
    ],
  },
  {
    id: "productivity",
    title: "Templates, Contacts and Branding",
    rows: [
      { id: "templates",        label: "Templates",                          free: "3, blank only", personal: "25", business: "Unlimited", enterprise: "Unlimited" },
      { id: "ready-made",       label: "Ready-made templates",               ...PAID },
      { id: "chatbot",          label: "LAGDA Chatbot",                      ...PAID },
      { id: "contacts",         label: "Personal contacts and requests",     ...ALL },
      { id: "branding",         label: "Your logo and colours",              ...PAID },
      { id: "notifications",    label: "Notification controls",              ...ALL },
    ],
  },
  {
    id: "sharing",
    title: "Sharing and Workspaces",
    rows: [
      { id: "share-docs",     label: "Share completed documents",  ...PAID },
      { id: "join-others",    label: "Join other workspaces",      ...PAID },
      { id: "members",        label: "Members and invitations",    ...TEAM },
      { id: "teams-roles",    label: "Teams, roles and join links", ...TEAM },
      { id: "shared-contacts",label: "Shared contacts",            ...TEAM },
      { id: "activity",       label: "Workspace activity log",     ...TEAM },
    ],
  },
  {
    id: "support",
    title: "Support",
    rows: [
      { id: "support", label: "Support", free: "Help Center", personal: "Email", business: "Priority email", enterprise: "Dedicated" },
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
    signerAuthentication: "Secure link + email code",
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
    signerAuthentication: "Secure link + email code",
    branding: true, teamControls: true, activityLog: true,
    support: "Priority email", trial: null,
    highlights: ["200 signing requests per user a month", "Company branding", "Members, teams, join links and roles", "Shared contacts and the workspace card", "Workspace activity log"],
  },
  {
    id: "enterprise", name: "Enterprise", tagline: "Coming soon, for large organizations",
    price: null, mostPopular: false,
    limits: {
      signingRequestsPerMonth: { value: null, label: "Custom" },
      users: { value: null, label: "Unlimited" },
      storageBytes: { value: null, label: "Custom" },
      templates: { value: null, label: "Unlimited" },
    },
    signerAuthentication: "Secure link + email code",
    branding: true, teamControls: true, activityLog: true,
    support: "Dedicated", trial: null,
    highlights: ["Everything in Business", "Custom document volume", "Dedicated onboarding and support"],
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
