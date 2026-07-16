// Typed models for the LAGDA Settings ecosystem (Command 24).
// Frontend-only. No CSS, colors, or component references.
// All session-created records carry demonstrationOnly: true.

// ── Branded ID types ──────────────────────────────────────────────────────────

export type UserProfileId    = string & { readonly __brand: "UserProfileId" };
export type ActiveSessionId  = string & { readonly __brand: "ActiveSessionId" };
export type SignInActivityId = string & { readonly __brand: "SignInActivityId" };
export type IntegrationId    = string & { readonly __brand: "IntegrationId" };
export type InvoiceId        = string & { readonly __brand: "InvoiceId" };

// ── User Profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id:                  UserProfileId;
  fullName:            string;
  displayName:         string;
  email:               string;
  jobTitle:            string;
  department:          string;
  initials:            string;
  preferredSenderName: string;
  timezone:            string;
  locale:              string;
  language:            string;
  demonstrationOnly:   true;
}

// ── User Preferences ──────────────────────────────────────────────────────────

export type AppearanceMode   = "system" | "light" | "dark";
export type DateFormatPref   = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type TimeFormatPref   = "12h" | "24h";
export type NumberFormatPref = "comma-dot" | "dot-comma" | "space-dot";
export type DocumentListView = "table" | "grid";
export type DensityPref      = "comfortable" | "compact";

export interface UserPreferences {
  language:            string;
  timezone:            string;
  dateFormat:          DateFormatPref;
  timeFormat:          TimeFormatPref;
  numberFormat:        NumberFormatPref;
  appearance:          AppearanceMode;
  reduceMotion:        "system" | "on" | "off";
  density:             DensityPref;
  defaultDocumentView: DocumentListView;
  defaultTemplateView: DocumentListView;
  defaultContactView:  DocumentListView;
  demonstrationOnly:   true;
}

// ── Security ──────────────────────────────────────────────────────────────────

export type SecurityMethodStatus = "enabled" | "not-enabled" | "demonstration-enabled" | "not-available";

export interface SecurityMethodSummary {
  id:          string;
  label:       string;
  status:      SecurityMethodStatus;
  description: string;
}

export interface SecurityOverview {
  passwordConfigured:     boolean;
  mfaStatus:              SecurityMethodStatus;
  activeSessionCount:     number;
  recentFailedAttempts:   number;
  recoveryConfigured:     boolean;
  securityNoticesEnabled: boolean;
  methods:                SecurityMethodSummary[];
  demonstrationOnly:      true;
}

export type DeviceType = "desktop" | "mobile" | "tablet";

export interface ActiveSession {
  id:          ActiveSessionId;
  deviceLabel: string;
  deviceType:  DeviceType;
  browser:     string;
  region:      string;
  lastActive:  string;
  isCurrent:   boolean;
  status:      "active" | "expired" | "revoked-demonstration";
  demonstrationOnly: true;
}

export type SignInActivityType =
  | "sign-in-success"
  | "sign-in-failed"
  | "password-update-demonstration"
  | "mfa-update-demonstration"
  | "session-revoke-demonstration"
  | "recovery-update-demonstration";

export const SIGN_IN_ACTIVITY_LABELS: Record<SignInActivityType, string> = {
  "sign-in-success":               "Successful sign-in",
  "sign-in-failed":                "Failed sign-in attempt",
  "password-update-demonstration": "Password update (simulated)",
  "mfa-update-demonstration":      "MFA update (simulated)",
  "session-revoke-demonstration":  "Session revocation (simulated)",
  "recovery-update-demonstration": "Recovery update (simulated)",
};

export interface SignInActivity {
  id:          SignInActivityId;
  type:        SignInActivityType;
  description: string;
  deviceLabel: string;
  region:      string;
  occurredAt:  string;
  status:      "success" | "failed" | "simulated";
  demonstrationOnly: true;
}

// ── Notification Preferences ──────────────────────────────────────────────────

export type NotificationChannel   = "in-app" | "email" | "sms";
export type NotificationFrequency = "immediately" | "daily-digest" | "weekly-digest" | "off";

export interface NotificationCategoryPreference {
  categoryId:  string;
  label:       string;
  description: string;
  channels:    Record<NotificationChannel, boolean>;
  frequency:   NotificationFrequency;
  required:    boolean;
  isMarketing: boolean;
}

export interface QuietHoursPreference {
  enabled:     boolean;
  startTime:   string;
  endTime:     string;
  timezone:    string;
  allowUrgent: boolean;
}

export interface NotificationPreferences {
  categories:   NotificationCategoryPreference[];
  quietHours:   QuietHoursPreference;
  demonstrationOnly: true;
}

// ── Workspace Branding ────────────────────────────────────────────────────────

export type BrandingAssetStatus = "default" | "local-preview" | "none";

export interface WorkspaceBranding {
  workspaceId:       string;
  displayName:       string;
  primaryColor:      string;
  logoStatus:        BrandingAssetStatus;
  logoPreviewUrl:    string | null;
  senderDisplayName: string;
  footerTagline:     string;
  lagdaAttribution:  true;
  demonstrationOnly: true;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export type BillingAccountStatus = "active" | "past-due" | "suspended" | "cancelled";
export type InvoiceStatus        = "demonstration-paid" | "demonstration-open" | "demonstration-voided";

export interface PaymentMethodSummary {
  type:        "card" | "bank-direction";
  cardBrand:   string;
  lastFour:    string;
  expiryMonth: number;
  expiryYear:  number;
  billingName: string;
  status:      "active" | "expiring-soon" | "expired";
  demonstrationOnly: true;
}

export interface BillingContactInfo {
  name:  string;
  email: string;
  poRef: string;
  demonstrationOnly: true;
}

export interface InvoiceSummary {
  id:            InvoiceId;
  billingPeriod: string;
  date:          string;
  amountLabel:   string;
  status:        InvoiceStatus;
  demonstrationOnly: true;
}

export interface BillingAccount {
  planId:         string;
  planName:       string;
  status:         BillingAccountStatus;
  billingCycle:   "monthly" | "annual";
  nextReviewDate: string;
  seatAllocation: number;
  activeMembers:  number;
  pendingInvites: number;
  paymentMethod:  PaymentMethodSummary | null;
  billingContact: BillingContactInfo;
  invoices:       InvoiceSummary[];
  demonstrationOnly: true;
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export type UsagePeriod = "current-month" | "previous-month" | "last-90-days" | "current-year";

export type UsageMetricId =
  | "signing-requests-initiated"
  | "signing-requests-completed"
  | "signing-requests-declined"
  | "storage-used"
  | "templates-active"
  | "templates-draft"
  | "verifications"
  | "members-active"
  | "contacts-saved";

export interface UsageMetric {
  id:           UsageMetricId;
  label:        string;
  value:        number;
  unit:         string;
  limit:        number | "varies" | null;
  limitLabel:   string;
  warningLevel: "none" | "approaching" | "exceeded";
  demonstrationOnly: true;
}

export interface UsageSummaryData {
  period:      UsagePeriod;
  periodLabel: string;
  refreshedAt: string;
  metrics:     UsageMetric[];
  demonstrationOnly: true;
}

// ── Integrations ──────────────────────────────────────────────────────────────

export type IntegrationCategory     = "storage" | "productivity" | "identity" | "crm" | "automation" | "developer";
export type IntegrationAvailability = "available" | "plan-dependent" | "enterprise" | "planned" | "unavailable";
export type IntegrationConnectionStatus =
  | "not-connected"
  | "connection-demonstration"
  | "configured-demonstration"
  | "attention-required"
  | "planned"
  | "unavailable";

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  storage:      "Cloud Storage",
  productivity: "Productivity",
  identity:     "Identity & Access",
  crm:          "CRM",
  automation:   "Automation",
  developer:    "Developer Tools",
};

export const INTEGRATION_AVAILABILITY_LABELS: Record<IntegrationAvailability, string> = {
  "available":      "Available",
  "plan-dependent": "Plan Dependent",
  "enterprise":     "Enterprise",
  "planned":        "Planned",
  "unavailable":    "Unavailable",
};

export const INTEGRATION_CONNECTION_STATUS_LABELS: Record<IntegrationConnectionStatus, string> = {
  "not-connected":             "Not Connected",
  "connection-demonstration":  "Connection Demonstration",
  "configured-demonstration":  "Configured (Demonstration)",
  "attention-required":        "Attention Required",
  "planned":                   "Planned",
  "unavailable":               "Unavailable",
};

export interface IntegrationDataAccess {
  label:     string;
  direction: "read" | "write" | "read-write";
}

export interface IntegrationConfigField {
  id:          string;
  label:       string;
  placeholder: string;
  type:        "text" | "url" | "select";
  options?:    string[];
}

export interface IntegrationDefinition {
  id:                 IntegrationId;
  name:               string;
  category:           IntegrationCategory;
  description:        string;
  availability:       IntegrationAvailability;
  connectionStatus:   IntegrationConnectionStatus;
  requiredPermission: string;
  planNote:           string;
  capabilities:       string[];
  dataAccess:         IntegrationDataAccess[];
  configFields:       IntegrationConfigField[];
  demonstrationOnly:  true;
}

// ── Data and Privacy ──────────────────────────────────────────────────────────

export type ExportRequestStatus  = "none" | "demonstration-requested" | "demonstration-processing";
export type ClosureRequestStatus = "none" | "demonstration-requested";

export interface DataPrivacySettings {
  userId:               string;
  exportRequestStatus:  ExportRequestStatus;
  closureRequestStatus: ClosureRequestStatus;
  demonstrationOnly:    true;
}

// ── Settings Action Availability ──────────────────────────────────────────────

export type SettingsActionId =
  | "edit-profile"
  | "edit-preferences"
  | "update-password-demonstration"
  | "enroll-mfa-demonstration"
  | "disable-mfa-demonstration"
  | "revoke-session-demonstration"
  | "revoke-other-sessions-demonstration"
  | "edit-personal-notifications"
  | "edit-workspace-notification-defaults"
  | "view-branding"
  | "edit-branding"
  | "reset-branding"
  | "view-billing"
  | "view-invoices"
  | "preview-plan-change"
  | "update-payment-method-demonstration"
  | "edit-billing-contact"
  | "view-usage"
  | "preview-usage-export"
  | "view-integrations"
  | "configure-integration-demonstration"
  | "test-integration-demonstration"
  | "disconnect-integration-demonstration"
  | "view-api-direction"
  | "view-webhook-direction"
  | "request-export-demonstration"
  | "request-account-closure-demonstration";

export interface SettingsActionAvailability {
  actionId:  SettingsActionId;
  available: boolean;
  reason?:   string;
}
