// Mock settings service for the LAGDA Settings ecosystem (Command 24).
// All operations are frontend-only. No real password changes, MFA enrollment,
// session revocation, notification delivery, payment processing, or integration
// connections occur. All state resets on page reload.

import type {
  UserProfile,
  UserPreferences,
  SecurityOverview,
  ActiveSession,
  ActiveSessionId,
  SignInActivity,
  SignInActivityType,
  NotificationPreferences,
  WorkspaceBranding,
  BillingAccount,
  BillingContactInfo,
  PaymentMethodSummary,
  UsageSummaryData,
  UsagePeriod,
  IntegrationDefinition,
  IntegrationId,
  DataPrivacySettings,
  ExportRequestStatus,
  ClosureRequestStatus,
} from "../../models/settings";
import {
  FIXTURE_USER_PROFILE,
  FIXTURE_USER_PREFERENCES,
  FIXTURE_SECURITY_OVERVIEW,
  FIXTURE_SESSIONS,
  FIXTURE_SECURITY_ACTIVITY,
  FIXTURE_NOTIFICATION_PREFERENCES,
  FIXTURE_WORKSPACE_BRANDING,
  FIXTURE_BILLING_ACCOUNT,
  FIXTURE_USAGE_DATA,
  FIXTURE_INTEGRATIONS,
  FIXTURE_DATA_PRIVACY,
} from "../../data/mock/settings";

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── Session-local mutation stores (reset on reload) ────────────────────────────

let SESSION_PROFILE:         UserProfile           = { ...FIXTURE_USER_PROFILE };
let SESSION_PREFERENCES:     UserPreferences       = { ...FIXTURE_USER_PREFERENCES };
let SESSION_SECURITY:        SecurityOverview      = { ...FIXTURE_SECURITY_OVERVIEW };
let SESSION_SESSIONS:        ActiveSession[]       = [...FIXTURE_SESSIONS];
let SESSION_ACTIVITY:        SignInActivity[]      = [...FIXTURE_SECURITY_ACTIVITY];
let SESSION_NOTIFICATIONS:   NotificationPreferences = { ...FIXTURE_NOTIFICATION_PREFERENCES, categories: [...FIXTURE_NOTIFICATION_PREFERENCES.categories] };
let SESSION_BRANDING:        WorkspaceBranding     = { ...FIXTURE_WORKSPACE_BRANDING };
let SESSION_BILLING:         BillingAccount        = { ...FIXTURE_BILLING_ACCOUNT };
let SESSION_INTEGRATIONS:    IntegrationDefinition[] = FIXTURE_INTEGRATIONS.map(i => ({ ...i }));
let SESSION_PRIVACY:         DataPrivacySettings   = { ...FIXTURE_DATA_PRIVACY };

// ── Account Settings ───────────────────────────────────────────────────────────

export const mockAccountSettingsService = {
  async getUserProfile(): Promise<UserProfile> {
    await delay(180);
    return { ...SESSION_PROFILE };
  },

  async updateUserProfile(changes: Partial<Pick<UserProfile, "fullName" | "displayName" | "jobTitle" | "department" | "preferredSenderName">>): Promise<UserProfile> {
    await delay(250);
    SESSION_PROFILE = { ...SESSION_PROFILE, ...changes };
    if (changes.fullName) {
      const parts = changes.fullName.trim().split(/\s+/);
      SESSION_PROFILE.initials = parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return { ...SESSION_PROFILE };
  },

  async getUserPreferences(): Promise<UserPreferences> {
    await delay(150);
    return { ...SESSION_PREFERENCES };
  },

  async updateUserPreferences(changes: Partial<UserPreferences>): Promise<UserPreferences> {
    await delay(200);
    SESSION_PREFERENCES = { ...SESSION_PREFERENCES, ...changes };
    return { ...SESSION_PREFERENCES };
  },
};

// ── Security Settings ─────────────────────────────────────────────────────────

let _mfaDemoEnabled = false;

export const mockSecuritySettingsService = {
  async getSecurityOverview(): Promise<SecurityOverview> {
    await delay(200);
    return { ...SESSION_SECURITY, methods: [...SESSION_SECURITY.methods] };
  },

  async validatePasswordUpdateDemonstration(_current: string, _newPwd: string): Promise<{ valid: boolean; reason?: string }> {
    await delay(400);
    if (!_current || _current.length < 1) return { valid: false, reason: "Current demonstration value required." };
    if (_newPwd.length < 8) return { valid: false, reason: "New value must be at least 8 characters." };
    if (_current === _newPwd) return { valid: false, reason: "New value must differ from current value." };
    return { valid: true };
  },

  async simulatePasswordUpdate(): Promise<{ success: true; message: string }> {
    await delay(500);
    const event = {
      id: `act_${Date.now()}` as typeof SESSION_ACTIVITY[0]["id"],
      type: "password-update-demonstration" as SignInActivityType,
      description: "Password updated (demonstration)",
      deviceLabel: "Current browser", region: "Current session",
      occurredAt: new Date().toISOString(),
      status: "simulated" as const,
      demonstrationOnly: true as const,
    };
    SESSION_ACTIVITY = [event, ...SESSION_ACTIVITY];
    return { success: true, message: "Password update simulated in frontend state." };
  },

  async listMfaMethods() {
    await delay(150);
    return SESSION_SECURITY.methods.map(m => ({
      ...m,
      status: m.id === "totp" && _mfaDemoEnabled ? "demonstration-enabled" as const : m.status,
    }));
  },

  async beginMfaEnrollmentDemonstration(_method: string): Promise<{ setupLabel: string }> {
    await delay(300);
    return { setupLabel: "DEMO-LAGDA-SETUP-7F3K2N" };
  },

  async confirmMfaEnrollmentDemonstration(_code: string): Promise<{ success: true; message: string }> {
    await delay(400);
    _mfaDemoEnabled = true;
    SESSION_SECURITY = { ...SESSION_SECURITY, mfaStatus: "demonstration-enabled" };
    const event = {
      id: `act_${Date.now()}` as typeof SESSION_ACTIVITY[0]["id"],
      type: "mfa-update-demonstration" as SignInActivityType,
      description: "MFA enabled (demonstration)",
      deviceLabel: "Current browser", region: "Current session",
      occurredAt: new Date().toISOString(),
      status: "simulated" as const,
      demonstrationOnly: true as const,
    };
    SESSION_ACTIVITY = [event, ...SESSION_ACTIVITY];
    return { success: true, message: "Authenticator setup simulated in frontend state." };
  },

  async disableMfaDemonstration(): Promise<{ success: true }> {
    await delay(300);
    _mfaDemoEnabled = false;
    SESSION_SECURITY = { ...SESSION_SECURITY, mfaStatus: "not-enabled" };
    return { success: true };
  },

  async listActiveSessions(): Promise<ActiveSession[]> {
    await delay(200);
    return SESSION_SESSIONS.map(s => ({ ...s }));
  },

  async revokeSessionDemonstration(sessionId: ActiveSessionId): Promise<{ success: true }> {
    await delay(300);
    SESSION_SESSIONS = SESSION_SESSIONS.map(s =>
      s.id === sessionId && !s.isCurrent
        ? { ...s, status: "revoked-demonstration" as const }
        : s
    );
    const event = {
      id: `act_${Date.now()}` as typeof SESSION_ACTIVITY[0]["id"],
      type: "session-revoke-demonstration" as SignInActivityType,
      description: "Session revoked (demonstration)",
      deviceLabel: "Remote session", region: "Unknown",
      occurredAt: new Date().toISOString(),
      status: "simulated" as const,
      demonstrationOnly: true as const,
    };
    SESSION_ACTIVITY = [event, ...SESSION_ACTIVITY];
    return { success: true };
  },

  async revokeOtherSessionsDemonstration(): Promise<{ success: true; count: number }> {
    await delay(400);
    let count = 0;
    SESSION_SESSIONS = SESSION_SESSIONS.map(s => {
      if (!s.isCurrent && s.status === "active") { count++; return { ...s, status: "revoked-demonstration" as const }; }
      return s;
    });
    return { success: true, count };
  },

  async listSignInActivity(filter?: { type?: SignInActivityType }): Promise<typeof SESSION_ACTIVITY> {
    await delay(200);
    if (filter?.type) return SESSION_ACTIVITY.filter(a => a.type === filter.type);
    return [...SESSION_ACTIVITY];
  },
};

// ── Notification Settings ─────────────────────────────────────────────────────

export const mockNotificationSettingsService = {
  async getPersonalNotificationPreferences() {
    await delay(180);
    return { ...SESSION_NOTIFICATIONS, categories: SESSION_NOTIFICATIONS.categories.map(c => ({ ...c, channels: { ...c.channels } })) };
  },

  async updatePersonalNotificationPreferences(changes: Partial<Omit<typeof SESSION_NOTIFICATIONS, "demonstrationOnly">>) {
    await delay(250);
    SESSION_NOTIFICATIONS = { ...SESSION_NOTIFICATIONS, ...changes, demonstrationOnly: true };
    return { ...SESSION_NOTIFICATIONS };
  },
};

// ── Branding Settings ─────────────────────────────────────────────────────────

export const mockBrandingSettingsService = {
  async getWorkspaceBranding(): Promise<WorkspaceBranding> {
    await delay(200);
    return { ...SESSION_BRANDING };
  },

  async updateWorkspaceBranding(changes: Partial<Omit<WorkspaceBranding, "workspaceId" | "lagdaAttribution" | "demonstrationOnly">>): Promise<WorkspaceBranding> {
    await delay(300);
    SESSION_BRANDING = { ...SESSION_BRANDING, ...changes };
    return { ...SESSION_BRANDING };
  },

  applyLocalLogoPreview(objectUrl: string | null): WorkspaceBranding {
    SESSION_BRANDING = {
      ...SESSION_BRANDING,
      logoStatus: objectUrl ? "local-preview" : "default",
      logoPreviewUrl: objectUrl,
    };
    return { ...SESSION_BRANDING };
  },

  async resetBrandingDemonstration(): Promise<WorkspaceBranding> {
    await delay(200);
    SESSION_BRANDING = { ...FIXTURE_WORKSPACE_BRANDING };
    return { ...SESSION_BRANDING };
  },
};

// ── Billing Settings ──────────────────────────────────────────────────────────

export const mockBillingSettingsService = {
  async getBillingAccount(): Promise<BillingAccount> {
    await delay(220);
    return { ...SESSION_BILLING, invoices: [...SESSION_BILLING.invoices] };
  },

  async updateBillingContact(changes: Partial<BillingContactInfo>): Promise<BillingAccount> {
    await delay(250);
    SESSION_BILLING = { ...SESSION_BILLING, billingContact: { ...SESSION_BILLING.billingContact, ...changes, demonstrationOnly: true } };
    return { ...SESSION_BILLING };
  },

  async simulatePaymentMethodUpdate(summary: Partial<PaymentMethodSummary>): Promise<BillingAccount> {
    await delay(300);
    if (SESSION_BILLING.paymentMethod) {
      SESSION_BILLING = { ...SESSION_BILLING, paymentMethod: { ...SESSION_BILLING.paymentMethod, ...summary, demonstrationOnly: true } };
    }
    return { ...SESSION_BILLING };
  },

  async simulatePlanChange(planId: string, planName: string): Promise<{ success: true; message: string }> {
    await delay(500);
    SESSION_BILLING = { ...SESSION_BILLING, planId, planName };
    return { success: true, message: "Plan change simulated in frontend state. No subscription, invoice, or payment was changed by a backend." };
  },
};

// ── Usage Service ─────────────────────────────────────────────────────────────

const USAGE_PERIOD_LABELS: Record<UsagePeriod, string> = {
  "current-month":  "July 2026",
  "previous-month": "June 2026",
  "last-90-days":   "Last 90 Days",
  "current-year":   "Year to Date (2026)",
};

export const mockUsageService = {
  async getUsageSummary(period: UsagePeriod = "current-month"): Promise<UsageSummaryData> {
    await delay(250);
    return {
      ...FIXTURE_USAGE_DATA,
      period,
      periodLabel: USAGE_PERIOD_LABELS[period],
      metrics: FIXTURE_USAGE_DATA.metrics.map(m => ({ ...m })),
    };
  },
};

// ── Integration Service ───────────────────────────────────────────────────────

export const mockIntegrationService = {
  async listIntegrations(query?: { category?: string; availability?: string }): Promise<IntegrationDefinition[]> {
    await delay(200);
    let result = SESSION_INTEGRATIONS.map(i => ({ ...i }));
    if (query?.category) result = result.filter(i => i.category === query.category);
    if (query?.availability) result = result.filter(i => i.availability === query.availability);
    return result;
  },

  async getIntegration(id: IntegrationId): Promise<IntegrationDefinition | null> {
    await delay(150);
    return SESSION_INTEGRATIONS.find(i => i.id === id) ?? null;
  },

  async beginConnectionDemonstration(id: IntegrationId): Promise<{ message: string }> {
    await delay(300);
    return { message: "Connection demonstration ready. Enter configuration values below." };
  },

  async updateIntegrationConfiguration(id: IntegrationId, _config: Record<string, string>): Promise<{ success: true; message: string }> {
    await delay(400);
    SESSION_INTEGRATIONS = SESSION_INTEGRATIONS.map(i =>
      i.id === id ? { ...i, connectionStatus: "configured-demonstration" as const } : i
    );
    return { success: true, message: "Connection demonstration configured. No third-party authorization, OAuth exchange, credential storage, or data synchronization occurs." };
  },

  async testConnectionDemonstration(id: IntegrationId): Promise<{ result: "success-demonstration" | "warning-demonstration"; message: string }> {
    await delay(600);
    const integration = SESSION_INTEGRATIONS.find(i => i.id === id);
    if (!integration || integration.connectionStatus !== "configured-demonstration") {
      return { result: "warning-demonstration", message: "Configure the integration before testing." };
    }
    return { result: "success-demonstration", message: "Frontend validation passed. Production testing requires a live backend connection." };
  },

  async disconnectIntegrationDemonstration(id: IntegrationId): Promise<{ success: true }> {
    await delay(300);
    SESSION_INTEGRATIONS = SESSION_INTEGRATIONS.map(i =>
      i.id === id ? { ...i, connectionStatus: "not-connected" as const } : i
    );
    return { success: true };
  },
};

// ── Data and Privacy Service ──────────────────────────────────────────────────

export const mockDataPrivacyService = {
  async getDataPrivacySettings(): Promise<DataPrivacySettings> {
    await delay(150);
    return { ...SESSION_PRIVACY };
  },

  async createDataExportRequestDemonstration(): Promise<{ status: ExportRequestStatus; message: string }> {
    await delay(400);
    SESSION_PRIVACY = { ...SESSION_PRIVACY, exportRequestStatus: "demonstration-requested" };
    return { status: "demonstration-requested", message: "Export request created in frontend state. No archive is generated and no data is delivered." };
  },

  async createAccountClosureRequestDemonstration(_reason: string): Promise<{ status: ClosureRequestStatus; message: string }> {
    await delay(400);
    SESSION_PRIVACY = { ...SESSION_PRIVACY, closureRequestStatus: "demonstration-requested" };
    return { status: "demonstration-requested", message: "Account closure request created in frontend state. No account, workspace, document, or data is deleted." };
  },

  async cancelAccountClosureRequestDemonstration(): Promise<{ success: true }> {
    await delay(200);
    SESSION_PRIVACY = { ...SESSION_PRIVACY, closureRequestStatus: "none" };
    return { success: true };
  },
};
