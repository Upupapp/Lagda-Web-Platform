// Public form models for LAGDA conversion flows.
// Frontend-only phase — no real backend, no sensitive data storage.
// All submission results carry demonstrationOnly: true to make the mock state explicit.

// ── Shared submission state ───────────────────────────────────────────────────

export type SubmissionStatus = "idle" | "submitting" | "success" | "error" | "duplicate";

export interface FormErrors {
  [field: string]: string;
}

export interface FormSubmissionResult {
  success: boolean;
  demonstrationOnly: true;
  errorCode?: "validation" | "network" | "duplicate" | "invalid-credentials";
  errorMessage?: string;
}

// ── Plan context ──────────────────────────────────────────────────────────────

export type ValidPlanId = "personal" | "business" | "enterprise";
export const VALID_PLAN_IDS: readonly ValidPlanId[] = ["personal", "business", "enterprise"];

export const PLAN_DISPLAY_NAMES: Record<ValidPlanId, string> = {
  personal:   "Personal",
  business:   "Business",
  enterprise: "Enterprise",
};

export function parsePlanId(raw: string | null): ValidPlanId | null {
  if (!raw) return null;
  return (VALID_PLAN_IDS as readonly string[]).includes(raw) ? (raw as ValidPlanId) : null;
}

// ── Contact categories ────────────────────────────────────────────────────────

export type ContactCategory =
  | "sales"
  | "product"
  | "account-support"
  | "billing"
  | "security-privacy"
  | "verification"
  | "partnership"
  | "accessibility"
  | "enotary"
  | "other";

export const VALID_CONTACT_CATEGORIES: readonly ContactCategory[] = [
  "sales", "product", "account-support", "billing",
  "security-privacy", "verification", "partnership", "accessibility", "enotary", "other",
];

export const CONTACT_CATEGORY_LABELS: Record<ContactCategory, string> = {
  "sales":            "Sales",
  "product":          "Product question",
  "account-support":  "Account support",
  "billing":          "Billing question",
  "security-privacy": "Security or privacy",
  "verification":     "Document Verification concern",
  "partnership":      "Partnership",
  "accessibility":    "Accessibility feedback",
  "enotary":          "LAGDA eNotary question",
  "other":            "Other",
};

export function parseContactCategory(raw: string | null): ContactCategory | null {
  if (!raw) return null;
  return (VALID_CONTACT_CATEGORIES as readonly string[]).includes(raw) ? (raw as ContactCategory) : null;
}

// ── Demo topics ───────────────────────────────────────────────────────────────

export type DemoTopic =
  | "esignature"
  | "doc-preparation"
  | "participant-routing"
  | "document-verification"
  | "templates"
  | "team-workspaces"
  | "enterprise-admin"
  | "security-review"
  | "api-integrations"
  | "enotary-updates"
  | "other";

export const VALID_DEMO_TOPICS: readonly DemoTopic[] = [
  "esignature", "doc-preparation", "participant-routing", "document-verification",
  "templates", "team-workspaces", "enterprise-admin", "security-review",
  "api-integrations", "enotary-updates", "other",
];

export const DEMO_TOPIC_LABELS: Record<DemoTopic, string> = {
  "esignature":            "Electronic Signing Workflows",
  "doc-preparation":       "Document Preparation",
  "participant-routing":   "Participant and Signing Routing",
  "document-verification": "Document Verification",
  "templates":             "Templates",
  "team-workspaces":       "Team Workspaces",
  "enterprise-admin":      "Enterprise Administration",
  "security-review":       "Security and Compliance Review",
  "api-integrations":      "API and Integrations",
  "enotary-updates":       "LAGDA eNotary Updates",
  "other":                 "Other",
};

export function parseDemoTopic(raw: string | null): DemoTopic | null {
  if (!raw) return null;
  return (VALID_DEMO_TOPICS as readonly string[]).includes(raw) ? (raw as DemoTopic) : null;
}

// ── Solution context ──────────────────────────────────────────────────────────

export type SolutionId =
  | "lawyers"
  | "law-firms"
  | "business-teams"
  | "government-and-lgu"
  | "real-estate"
  | "hr-and-recruitment"
  | "finance"
  | "procurement"
  | "education"
  | "healthcare-and-wellness";

export const VALID_SOLUTION_IDS: readonly SolutionId[] = [
  "lawyers", "law-firms", "business-teams", "government-and-lgu", "real-estate",
  "hr-and-recruitment", "finance", "procurement", "education", "healthcare-and-wellness",
];

export const SOLUTION_DISPLAY_NAMES: Record<SolutionId, string> = {
  "lawyers":                "Lawyers",
  "law-firms":              "Law Firms",
  "business-teams":         "Business Teams",
  "government-and-lgu":     "Government and LGU",
  "real-estate":            "Real Estate",
  "hr-and-recruitment":     "HR and Recruitment",
  "finance":                "Finance",
  "procurement":            "Procurement",
  "education":              "Education",
  "healthcare-and-wellness":"Healthcare and Wellness",
};

export function parseSolutionId(raw: string | null): SolutionId | null {
  if (!raw) return null;
  return (VALID_SOLUTION_IDS as readonly string[]).includes(raw) ? (raw as SolutionId) : null;
}

// ── Organization and role types ───────────────────────────────────────────────

export type OrgSize = "solo" | "2-10" | "11-50" | "51-200" | "201-1000" | "1000+";
export const ORG_SIZE_LABELS: Record<OrgSize, string> = {
  "solo":     "Solo / Individual",
  "2-10":     "2–10 people",
  "11-50":    "11–50 people",
  "51-200":   "51–200 people",
  "201-1000": "201–1,000 people",
  "1000+":    "More than 1,000 people",
};

export type InquiryRole = "owner" | "decision-maker" | "it-manager" | "legal-counsel" | "hr-manager" | "finance-manager" | "developer" | "other";
export const INQUIRY_ROLE_LABELS: Record<InquiryRole, string> = {
  "owner":            "Owner / Founder",
  "decision-maker":   "Decision Maker / Manager",
  "it-manager":       "IT Manager",
  "legal-counsel":    "Legal Counsel",
  "hr-manager":       "HR Manager",
  "finance-manager":  "Finance Manager",
  "developer":        "Developer / Technical Lead",
  "other":            "Other",
};

// ── Verification types ────────────────────────────────────────────────────────

export type VerificationInputType = "id" | "file";

export type DemoVerificationOutcome =
  | "verified"
  | "file-mismatch"
  | "incomplete"
  | "cancelled"
  | "voided"
  | "no-record"
  | "unavailable";

export interface DemoVerificationResult {
  outcome: DemoVerificationOutcome;
  verificationId: string;
  documentDescription: string;
  completedAt?: string;
  workspaceName?: string;
  transactionStatus: string;
  fileMatchStatus: "not-evaluated" | "matched" | "mismatch" | "n/a";
  demonstrationOnly: true;
}

// ── Form request types ────────────────────────────────────────────────────────

export interface CreateAccountRequest {
  name: string;
  email: string;
  organization?: string;
  intendedUse?: string;
  consent: boolean;
  // planId is context only — never submitted as a backend field in this phase
}

export interface SignInRequest {
  email: string;
  password: string; // never logged, never stored
}

export interface DemoRequest {
  name: string;
  email: string;
  organization: string;
  role: InquiryRole | "";
  orgSize: OrgSize | "";
  industry: string;
  primaryInterest: DemoTopic | "";
  message: string;
  consent: boolean;
}

export interface ContactRequest {
  name: string;
  email: string;
  organization: string;
  role: string;
  category: ContactCategory | "";
  subject: string;
  message: string;
  phone: string;
  consent: boolean;
}

export interface PublicVerificationRequest {
  inputType: VerificationInputType;
  verificationId: string;
  fileName?: string;
  fileSize?: number;
}

export interface WaitlistRequest {
  name: string;
  email: string;
  organization: string;
  audience: string;
  interest: string;
  consent: boolean;
}

// ── Conversion context (safe query-param model) ───────────────────────────────

export interface ConversionContext {
  planId?: ValidPlanId;
  source?: string;
  topic?: string;
  solution?: SolutionId;
  category?: ContactCategory;
}

// ── Analytics event abstraction (no-op in this phase) ─────────────────────────

export type ConversionEventName =
  | "public_cta_selected"
  | "create_account_started"
  | "create_account_mock_completed"
  | "sign_in_started"
  | "sign_in_mock_completed"
  | "demo_request_started"
  | "demo_request_mock_completed"
  | "contact_started"
  | "contact_mock_completed"
  | "verification_started"
  | "verification_demo_completed"
  | "enotary_waitlist_started"
  | "enotary_waitlist_mock_completed"
  | "plan_selected"
  | "form_validation_failed";

export interface ConversionEvent {
  name: ConversionEventName;
  ctaId?: string;
  source?: string;
  destination?: string;
  planId?: ValidPlanId;
  solution?: SolutionId;
  topic?: DemoTopic;
  category?: ContactCategory;
  demoResultType?: DemoVerificationOutcome;
}
