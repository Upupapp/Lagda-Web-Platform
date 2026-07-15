// C13 — Authentication and Onboarding typed models.
// Frontend-only phase. No real tokens, passwords, or backend state represented here.
// All sensitive-value fields are clearly commented as never-logged / never-stored.

// ── Authentication status ─────────────────────────────────────────────────────

export type AuthStatus =
  | "unknown"
  | "unauthenticated"
  | "email-verification-required"
  | "mfa-required"
  | "onboarding-required"
  | "authenticated"
  | "expired"
  | "locked"
  | "error";

// ── Onboarding progress ───────────────────────────────────────────────────────

export type OnboardingStepId =
  | "profile"
  | "use-case"
  | "workspace"
  | "security"
  | "notifications"
  | "review";

export interface OnboardingStepMeta {
  id: OnboardingStepId;
  label: string;
  path: string;
  stepNumber: number;
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  { id: "profile",       label: "Profile",       path: "/onboarding/profile",       stepNumber: 1 },
  { id: "use-case",      label: "Intended Use",  path: "/onboarding/use-case",      stepNumber: 2 },
  { id: "workspace",     label: "Workspace",     path: "/onboarding/workspace",     stepNumber: 3 },
  { id: "security",      label: "Security",      path: "/onboarding/security",      stepNumber: 4 },
  { id: "notifications", label: "Notifications", path: "/onboarding/notifications", stepNumber: 5 },
  { id: "review",        label: "Review",        path: "/onboarding/review",        stepNumber: 6 },
];

export interface OnboardingProgress {
  profile:       boolean;
  useCase:       boolean;
  workspace:     boolean;
  security:      boolean;
  notifications: boolean;
  complete:      boolean;
}

export const EMPTY_ONBOARDING_PROGRESS: OnboardingProgress = {
  profile:       false,
  useCase:       false,
  workspace:     false,
  security:      false,
  notifications: false,
  complete:      false,
};

// ── Pending auth user (pre-platform-session) ──────────────────────────────────
// Holds the minimum identity context needed to pass through auth/onboarding flows.
// This is NOT a production session — it is cleared on completion or sign-out.

export interface PendingAuthUser {
  email:         string;
  displayName:   string;
  authStatus:    AuthStatus;
  invitationId?: string; // safe reference only — not the raw token
}

// ── Deterministic mock auth scenarios ────────────────────────────────────────

export type AuthScenario =
  | "standard"          // already verified + onboarding complete → /app
  | "email-verification"// needs email verification
  | "mfa-challenge"     // needs MFA code
  | "onboarding"        // authenticated but needs onboarding
  | "locked";           // account locked demonstration

export interface AuthScenarioResult {
  success:  true;
  scenario: AuthScenario;
  user:     PendingAuthUser;
}

export interface AuthErrorResult {
  success:      false;
  errorCode:    "invalid-credentials" | "network" | "locked";
  errorMessage: string;
}

export type AuthResult = AuthScenarioResult | AuthErrorResult;

// ── Link-error state ──────────────────────────────────────────────────────────

export type LinkErrorType =
  | "expired-verification"
  | "used-verification"
  | "invalid-verification"
  | "expired-reset"
  | "used-reset"
  | "invalid-reset"
  | "expired-invitation"
  | "revoked-invitation"
  | "accepted-invitation"
  | "unknown";

// ── Mock invitation ───────────────────────────────────────────────────────────

export interface MockInvitation {
  id:           string;
  workspaceName:string;
  invitedBy:    string;
  role:         string;
  invitedEmail: string;
  expiresAt:    string;
  status:       "valid" | "expired" | "revoked" | "accepted" | "mismatch";
}

// ── Password policy ───────────────────────────────────────────────────────────

export interface PasswordCheck {
  notEmpty:     boolean;
  minLength:    boolean; // ≥8 chars
  hasUppercase: boolean;
  hasNumber:    boolean;
  hasSymbol:    boolean;
}

export function checkPassword(pw: string): PasswordCheck {
  return {
    notEmpty:     pw.length > 0,
    minLength:    pw.length >= 8,
    hasUppercase: /[A-Z]/.test(pw),
    hasNumber:    /[0-9]/.test(pw),
    hasSymbol:    /[^A-Za-z0-9]/.test(pw),
  };
}

export function isPasswordAcceptable(pw: string): boolean {
  return pw.length >= 8;
}

// ── Onboarding draft types ────────────────────────────────────────────────────

export interface ProfileDraft {
  displayName: string;
  jobTitle:    string;
  timeZone:    string;
}

export type OrgType =
  | "" | "individual" | "lawyer" | "law-firm" | "business"
  | "government" | "real-estate" | "hr-recruitment" | "finance"
  | "procurement" | "education" | "healthcare" | "other";

export const ORG_TYPE_LABELS: Record<Exclude<OrgType, "">, string> = {
  individual:      "Individual professional",
  lawyer:          "Lawyer",
  "law-firm":      "Law firm",
  business:        "Business",
  government:      "Government or LGU",
  "real-estate":   "Real estate",
  "hr-recruitment":"HR and recruitment",
  finance:         "Finance or accounting",
  procurement:     "Procurement",
  education:       "Education",
  healthcare:      "Healthcare or wellness",
  other:           "Other",
};

export type PrimaryGoal =
  | "prepare-send"
  | "collect-signatures"
  | "route-approvals"
  | "verify-documents"
  | "build-templates"
  | "manage-team";

export const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  "prepare-send":      "Prepare and send documents",
  "collect-signatures":"Collect signatures",
  "route-approvals":   "Route document approvals",
  "verify-documents":  "Verify completed documents",
  "build-templates":   "Build reusable templates",
  "manage-team":       "Manage a team or workspace",
};

export interface UseCaseDraft {
  orgType:             OrgType;
  primaryGoals:        PrimaryGoal[];
  enotaryUpdates:      boolean; // never pre-selected
}

export type WorkspaceScenario = "" | "personal" | "organization" | "invitation";

export interface WorkspaceDraft {
  scenario:      WorkspaceScenario;
  workspaceName: string;
  orgName:       string;
  teamSize:      string;
}

export interface SecurityDraft {
  mfaEnabled:        boolean;
  loginAlertsEnabled:boolean;
}

export interface NotificationsDraft {
  // Transaction (may be recommended-on)
  docViewed:           boolean;
  signatureCompleted:  boolean;
  approvalCompleted:   boolean;
  participantDeclined: boolean;
  deliveryFailed:      boolean;
  requestExpiring:     boolean;
  requestCompleted:    boolean;
  // Account & security (may be recommended-on)
  newSignIn:           boolean;
  securityAlert:       boolean;
  workspaceInvitation: boolean;
  roleChanged:         boolean;
  // Product marketing — never pre-selected
  productUpdates:      boolean;
  guidesEducation:     boolean;
  enotaryUpdates:      boolean; // separate from transaction/account
}

export interface OnboardingDraft {
  profile:       ProfileDraft;
  useCase:       UseCaseDraft;
  workspace:     WorkspaceDraft;
  security:      SecurityDraft;
  notifications: NotificationsDraft;
}

export const DEFAULT_ONBOARDING_DRAFT: OnboardingDraft = {
  profile: { displayName: "", jobTitle: "", timeZone: "Asia/Manila" },
  useCase: { orgType: "", primaryGoals: [], enotaryUpdates: false },
  workspace: { scenario: "", workspaceName: "", orgName: "", teamSize: "" },
  security: { mfaEnabled: false, loginAlertsEnabled: true },
  notifications: {
    docViewed: true, signatureCompleted: true, approvalCompleted: true,
    participantDeclined: true, deliveryFailed: true, requestExpiring: true,
    requestCompleted: true,
    newSignIn: true, securityAlert: true, workspaceInvitation: true, roleChanged: true,
    productUpdates: false, guidesEducation: false, enotaryUpdates: false,
  },
};
