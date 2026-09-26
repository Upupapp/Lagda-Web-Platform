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
//
// Four steps. "Intended use" and "Notifications" were removed from the flow:
// the first collected answers nothing read, the second duplicated Settings →
// Notifications with defaults that are already the recommended ones. Their old
// URLs redirect (see router.tsx) so a bookmarked link never dead-ends.

export type OnboardingStepId =
  | "profile"
  | "workspace"
  | "security"
  | "review";

export interface OnboardingStepMeta {
  id: OnboardingStepId;
  label: string;
  path: string;
  stepNumber: number;
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  { id: "profile",   label: "Profile",   path: "/onboarding/profile",   stepNumber: 1 },
  { id: "workspace", label: "Workspace", path: "/onboarding/workspace", stepNumber: 2 },
  { id: "security",  label: "Security",  path: "/onboarding/security",  stepNumber: 3 },
  { id: "review",    label: "Review",    path: "/onboarding/review",    stepNumber: 4 },
];

export interface OnboardingProgress {
  profile:   boolean;
  workspace: boolean;
  security:  boolean;
  complete:  boolean;
}

export const EMPTY_ONBOARDING_PROGRESS: OnboardingProgress = {
  profile:   false,
  workspace: false,
  security:  false,
  complete:  false,
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

/** Mirrors Lagda-Backend's DATE_FORMATS / TIME_FORMATS preference literals.
 *  "" means "not chosen" and is sent as null. */
export type DateFormatPreference = "" | "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type TimeFormatPreference = "" | "12h" | "24h";

export interface ProfileDraft {
  fullName:            string;
  displayName:         string;
  /** True once the person typed in Display name themselves — until then it
   *  follows Full name as they type. */
  displayNameEdited:   boolean;
  timeZone:            string;
  jobTitle:            string;
  department:          string;
  preferredSenderName: string;
  dateFormat:          DateFormatPreference;
  timeFormat:          TimeFormatPreference;
}

export type WorkspaceScenario = "" | "personal" | "team" | "join";

export interface JoinRequestRecord {
  workspaceName: string;
  /** "sent" — created by this onboarding; "pending" — one already existed. */
  state: "sent" | "pending";
}

export interface WorkspaceDraft {
  scenario:           WorkspaceScenario;
  workspaceName:      string;
  /** The workspace THIS onboarding created (real backend), so revisiting the
   *  step renames it instead of creating a second one. */
  createdWorkspaceId: string | null;
  /** The name last saved to the backend — a Continue with no change is not a
   *  rename. */
  savedName:          string;
  /** The account already had a workspace before onboarding; nothing was
   *  created. */
  usedExistingWorkspace: boolean;
  joinLink:           string;
  joinReason:         string;
  joinRequest:        JoinRequestRecord | null;
  /** Team workspace: join links to create once the workspace exists (078).
   *  Optional so a draft saved by an earlier version still loads. */
  teamInvites?:       TeamInviteDraft[];
}

/** One teammate to invite from onboarding with a single-use join link. */
export interface TeamInviteDraft {
  id:        string;
  label:     string;
  email:     string | null;
  /** Email the link to `email`. Without an email the link is saved as a draft. */
  sendEmail: boolean;
  status:    "queued" | "done" | "failed";
  /** Set once the link exists, so a retry never creates a second one. */
  ticketId?: string;
  error?:    string;
}

export interface SecurityDraft {
  /** The person's answer to "Two-step verification". */
  mfaChoice:  "" | "now" | "later";
  /** MFA enrollment actually completed (set by MfaSetup on success). */
  mfaEnabled: boolean;
}

export interface OnboardingDraft {
  profile:   ProfileDraft;
  workspace: WorkspaceDraft;
  security:  SecurityDraft;
}

export const FALLBACK_TIME_ZONE = "Asia/Manila";

export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function createDefaultOnboardingDraft(): OnboardingDraft {
  return {
    profile: {
      fullName: "", displayName: "", displayNameEdited: false,
      timeZone: detectTimeZone(),
      jobTitle: "", department: "", preferredSenderName: "",
      dateFormat: "", timeFormat: "",
    },
    workspace: {
      scenario: "", workspaceName: "", createdWorkspaceId: null, savedName: "",
      usedExistingWorkspace: false,
      joinLink: "", joinReason: "", joinRequest: null, teamInvites: [],
    },
    security: { mfaChoice: "", mfaEnabled: false },
  };
}

export const DEFAULT_ONBOARDING_DRAFT: OnboardingDraft = createDefaultOnboardingDraft();
