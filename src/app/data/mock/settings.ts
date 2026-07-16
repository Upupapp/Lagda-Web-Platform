// Deterministic fictional fixture data for the LAGDA Settings ecosystem.
// All data is invented. Not based on real individuals or organizations.
// All records carry demonstrationOnly: true.

import type {
  UserProfile,
  UserProfileId,
  UserPreferences,
  SecurityOverview,
  ActiveSession,
  ActiveSessionId,
  SignInActivity,
  SignInActivityId,
  NotificationPreferences,
  WorkspaceBranding,
  BillingAccount,
  InvoiceId,
  UsageSummaryData,
  IntegrationDefinition,
  IntegrationId,
  DataPrivacySettings,
} from "../../models/settings";

// ── Profile ───────────────────────────────────────────────────────────────────

export const FIXTURE_USER_PROFILE: UserProfile = {
  id:                  "uprof_mls_001" as UserProfileId,
  fullName:            "Ana Reyes",
  displayName:         "Ana Reyes",
  email:               "ana.reyes@example.com",
  jobTitle:            "Managing Attorney",
  department:          "Legal Operations",
  initials:            "AR",
  preferredSenderName: "Ana Reyes — Mabini Legal Solutions",
  timezone:            "Asia/Manila",
  locale:              "en-PH",
  language:            "en",
  demonstrationOnly:   true,
};

// ── Preferences ───────────────────────────────────────────────────────────────

export const FIXTURE_USER_PREFERENCES: UserPreferences = {
  language:            "en",
  timezone:            "Asia/Manila",
  dateFormat:          "DD/MM/YYYY",
  timeFormat:          "12h",
  numberFormat:        "comma-dot",
  appearance:          "system",
  reduceMotion:        "system",
  density:             "comfortable",
  defaultDocumentView: "table",
  defaultTemplateView: "grid",
  defaultContactView:  "table",
  demonstrationOnly:   true,
};

// ── Security ──────────────────────────────────────────────────────────────────

export const FIXTURE_SECURITY_OVERVIEW: SecurityOverview = {
  passwordConfigured:     true,
  mfaStatus:              "not-enabled",
  activeSessionCount:     3,
  recentFailedAttempts:   0,
  recoveryConfigured:     false,
  securityNoticesEnabled: true,
  methods: [
    { id: "password",     label: "Password",               status: "enabled",              description: "Account password is configured." },
    { id: "totp",         label: "Authenticator App",      status: "not-enabled",          description: "Generate time-based codes with an authenticator app." },
    { id: "email-code",   label: "Email Code",             status: "not-enabled",          description: "Receive a code by email as a second factor." },
    { id: "sms-code",     label: "SMS Code",               status: "not-available",        description: "SMS authentication requires a verified phone number." },
    { id: "security-key", label: "Security Key",           status: "not-available",        description: "Hardware security key support is planned." },
  ],
  demonstrationOnly: true,
};

const S_ID = (n: string) => n as ActiveSessionId;
const A_ID = (n: string) => n as SignInActivityId;

export const FIXTURE_SESSIONS: ActiveSession[] = [
  {
    id: S_ID("sess_001"), deviceLabel: "Chrome on macOS", deviceType: "desktop",
    browser: "Chrome 124", region: "Metro Manila, PH", lastActive: "2026-07-16T08:30:00+08:00",
    isCurrent: true, status: "active", demonstrationOnly: true,
  },
  {
    id: S_ID("sess_002"), deviceLabel: "Safari on iPhone", deviceType: "mobile",
    browser: "Safari 17", region: "Metro Manila, PH", lastActive: "2026-07-15T21:10:00+08:00",
    isCurrent: false, status: "active", demonstrationOnly: true,
  },
  {
    id: S_ID("sess_003"), deviceLabel: "Firefox on Windows", deviceType: "desktop",
    browser: "Firefox 126", region: "Cebu City, PH", lastActive: "2026-07-10T14:00:00+08:00",
    isCurrent: false, status: "active", demonstrationOnly: true,
  },
  {
    id: S_ID("sess_004"), deviceLabel: "Chrome on Android", deviceType: "mobile",
    browser: "Chrome 124", region: "Quezon City, PH", lastActive: "2026-07-01T09:00:00+08:00",
    isCurrent: false, status: "expired", demonstrationOnly: true,
  },
];

export const FIXTURE_SECURITY_ACTIVITY: SignInActivity[] = [
  {
    id: A_ID("act_001"), type: "sign-in-success", description: "Signed in successfully",
    deviceLabel: "Chrome on macOS", region: "Metro Manila, PH",
    occurredAt: "2026-07-16T08:30:00+08:00", status: "success", demonstrationOnly: true,
  },
  {
    id: A_ID("act_002"), type: "sign-in-success", description: "Signed in successfully",
    deviceLabel: "Safari on iPhone", region: "Metro Manila, PH",
    occurredAt: "2026-07-15T21:10:00+08:00", status: "success", demonstrationOnly: true,
  },
  {
    id: A_ID("act_003"), type: "sign-in-failed", description: "Sign-in attempt failed — incorrect password",
    deviceLabel: "Unknown device", region: "Unknown region",
    occurredAt: "2026-07-14T03:22:00+08:00", status: "failed", demonstrationOnly: true,
  },
  {
    id: A_ID("act_004"), type: "password-update-demonstration", description: "Password updated (demonstration)",
    deviceLabel: "Chrome on macOS", region: "Metro Manila, PH",
    occurredAt: "2026-07-10T10:00:00+08:00", status: "simulated", demonstrationOnly: true,
  },
  {
    id: A_ID("act_005"), type: "sign-in-success", description: "Signed in successfully",
    deviceLabel: "Firefox on Windows", region: "Cebu City, PH",
    occurredAt: "2026-07-10T14:00:00+08:00", status: "success", demonstrationOnly: true,
  },
  {
    id: A_ID("act_006"), type: "sign-in-success", description: "Signed in successfully",
    deviceLabel: "Chrome on Android", region: "Quezon City, PH",
    occurredAt: "2026-07-01T09:00:00+08:00", status: "success", demonstrationOnly: true,
  },
];

// ── Notification Preferences ──────────────────────────────────────────────────

export const FIXTURE_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  categories: [
    {
      categoryId: "doc-requests", label: "Document Requests",
      description: "New signing requests assigned to you and status updates.",
      channels: { "in-app": true, "email": true, "sms": false },
      frequency: "immediately", required: true, isMarketing: false,
    },
    {
      categoryId: "doc-ops", label: "Document Operations",
      description: "Delivery issues, draft attention, and verification updates.",
      channels: { "in-app": true, "email": true, "sms": false },
      frequency: "immediately", required: false, isMarketing: false,
    },
    {
      categoryId: "account-security", label: "Account Security",
      description: "New sign-ins, MFA changes, and password updates.",
      channels: { "in-app": true, "email": true, "sms": false },
      frequency: "immediately", required: true, isMarketing: false,
    },
    {
      categoryId: "workspace", label: "Workspace",
      description: "Member invitations, role changes, and workspace updates.",
      channels: { "in-app": true, "email": false, "sms": false },
      frequency: "daily-digest", required: false, isMarketing: false,
    },
    {
      categoryId: "billing", label: "Billing & Plan",
      description: "Invoices available and plan threshold alerts.",
      channels: { "in-app": true, "email": true, "sms": false },
      frequency: "immediately", required: false, isMarketing: false,
    },
    {
      categoryId: "product", label: "Product Updates",
      description: "New features, guides, and promotional content.",
      channels: { "in-app": true, "email": false, "sms": false },
      frequency: "weekly-digest", required: false, isMarketing: true,
    },
  ],
  quietHours: {
    enabled: false, startTime: "22:00", endTime: "07:00",
    timezone: "Asia/Manila", allowUrgent: true,
  },
  demonstrationOnly: true,
};

// ── Workspace Branding ────────────────────────────────────────────────────────

export const FIXTURE_WORKSPACE_BRANDING: WorkspaceBranding = {
  workspaceId:       "ws_mls_001",
  displayName:       "Mabini Legal Solutions",
  primaryColor:      "#0078D4",
  logoStatus:        "default",
  logoPreviewUrl:    null,
  senderDisplayName: "Mabini Legal Solutions",
  footerTagline:     "Professional legal document management",
  lagdaAttribution:  true,
  demonstrationOnly: true,
};

// ── Billing ───────────────────────────────────────────────────────────────────

export const FIXTURE_BILLING_ACCOUNT: BillingAccount = {
  planId:         "business",
  planName:       "Business",
  status:         "active",
  billingCycle:   "annual",
  nextReviewDate: "2026-12-31",
  seatAllocation: 10,
  activeMembers:  6,
  pendingInvites: 3,
  paymentMethod: {
    type: "card", cardBrand: "Visa", lastFour: "4242",
    expiryMonth: 12, expiryYear: 2027, billingName: "Mabini Legal Solutions",
    status: "active", demonstrationOnly: true,
  },
  billingContact: {
    name: "Ana Reyes", email: "billing@example.com", poRef: "PO-2026-0042",
    demonstrationOnly: true,
  },
  invoices: [
    { id: "inv_001" as InvoiceId, billingPeriod: "Jan–Dec 2026", date: "2026-01-01", amountLabel: "Varies by plan", status: "demonstration-paid", demonstrationOnly: true },
    { id: "inv_002" as InvoiceId, billingPeriod: "Jan–Dec 2025", date: "2025-01-01", amountLabel: "Varies by plan", status: "demonstration-paid", demonstrationOnly: true },
    { id: "inv_003" as InvoiceId, billingPeriod: "Jan–Dec 2024", date: "2024-01-01", amountLabel: "Varies by plan", status: "demonstration-paid", demonstrationOnly: true },
  ],
  demonstrationOnly: true,
};

// ── Usage ─────────────────────────────────────────────────────────────────────

export const FIXTURE_USAGE_DATA: UsageSummaryData = {
  period:      "current-month",
  periodLabel: "July 2026",
  refreshedAt: "2026-07-16T08:00:00+08:00",
  metrics: [
    { id: "signing-requests-initiated", label: "Signing Requests Initiated",   value: 31, unit: "requests", limit: "varies", limitLabel: "Varies by plan", warningLevel: "none",       demonstrationOnly: true },
    { id: "signing-requests-completed", label: "Signing Requests Completed",   value: 27, unit: "requests", limit: null,     limitLabel: "",               warningLevel: "none",       demonstrationOnly: true },
    { id: "signing-requests-declined",  label: "Signing Requests Declined",    value: 2,  unit: "requests", limit: null,     limitLabel: "",               warningLevel: "none",       demonstrationOnly: true },
    { id: "storage-used",               label: "Storage Used",                 value: 1,  unit: "GB",       limit: "varies", limitLabel: "Varies by plan", warningLevel: "none",       demonstrationOnly: true },
    { id: "templates-active",           label: "Active Templates",             value: 7,  unit: "templates",limit: "varies", limitLabel: "Varies by plan", warningLevel: "none",       demonstrationOnly: true },
    { id: "templates-draft",            label: "Draft Templates",              value: 2,  unit: "templates",limit: null,     limitLabel: "",               warningLevel: "none",       demonstrationOnly: true },
    { id: "verifications",              label: "Verification Checks",          value: 14, unit: "checks",   limit: "varies", limitLabel: "Varies by plan", warningLevel: "none",       demonstrationOnly: true },
    { id: "members-active",             label: "Active Workspace Members",     value: 6,  unit: "members",  limit: 10,       limitLabel: "10 seats",       warningLevel: "approaching",demonstrationOnly: true },
    { id: "contacts-saved",             label: "Saved Contacts",               value: 42, unit: "contacts", limit: "varies", limitLabel: "Varies by plan", warningLevel: "none",       demonstrationOnly: true },
  ],
  demonstrationOnly: true,
};

// ── Integrations ──────────────────────────────────────────────────────────────

const INT = (id: string) => id as IntegrationId;

export const FIXTURE_INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: INT("int_cloud_storage"),
    name: "Cloud Storage Connector",
    category: "storage",
    description: "Synchronize completed documents to your cloud storage workspace.",
    availability: "plan-dependent",
    connectionStatus: "not-connected",
    requiredPermission: "manage_integrations",
    planNote: "Requires Business plan or higher.",
    capabilities: ["Store completed documents automatically", "Organize by folder or tag", "Access files from your storage app"],
    dataAccess: [
      { label: "Completed document files", direction: "write" },
      { label: "Transaction metadata", direction: "write" },
    ],
    configFields: [
      { id: "storage_folder", label: "Destination Folder", placeholder: "/lagda-documents", type: "text" },
      { id: "naming_pattern", label: "File Naming Pattern", placeholder: "{title}-{date}", type: "text" },
    ],
    demonstrationOnly: true,
  },
  {
    id: INT("int_productivity"),
    name: "Workspace Productivity Connector",
    category: "productivity",
    description: "Create, attach, and track signing tasks within your productivity suite.",
    availability: "planned",
    connectionStatus: "planned",
    requiredPermission: "manage_integrations",
    planNote: "Planned — availability to be confirmed.",
    capabilities: ["Create signing tasks from documents", "Track completion in your workspace"],
    dataAccess: [
      { label: "Document metadata", direction: "read" },
      { label: "Task status updates", direction: "write" },
    ],
    configFields: [],
    demonstrationOnly: true,
  },
  {
    id: INT("int_enterprise_sso"),
    name: "Enterprise Identity Provider",
    category: "identity",
    description: "Connect your SAML 2.0 or OpenID Connect identity provider for SSO.",
    availability: "enterprise",
    connectionStatus: "unavailable",
    requiredPermission: "manage_identity_integrations",
    planNote: "Enterprise plan required.",
    capabilities: ["Single sign-on (SSO)", "Centralized user management", "Identity provider–initiated login"],
    dataAccess: [
      { label: "User authentication events", direction: "read" },
      { label: "User identity claims", direction: "read" },
    ],
    configFields: [
      { id: "sso_entity_id",      label: "Entity ID",        placeholder: "https://idp.example.com/entity", type: "url" },
      { id: "sso_metadata_url",   label: "Metadata URL",     placeholder: "https://idp.example.com/metadata", type: "url" },
    ],
    demonstrationOnly: true,
  },
  {
    id: INT("int_directory_prov"),
    name: "Directory Provisioning (SCIM)",
    category: "identity",
    description: "Automatically provision and deprovision workspace members via SCIM 2.0.",
    availability: "enterprise",
    connectionStatus: "unavailable",
    requiredPermission: "manage_identity_integrations",
    planNote: "Enterprise plan required. Contact Sales.",
    capabilities: ["Automatic member provisioning", "Group-based role assignment", "Automatic deprovisioning on offboarding"],
    dataAccess: [
      { label: "Workspace member list", direction: "read-write" },
      { label: "User role assignments", direction: "write" },
    ],
    configFields: [],
    demonstrationOnly: true,
  },
  {
    id: INT("int_crm"),
    name: "CRM Connector",
    category: "crm",
    description: "Synchronize contact and transaction data with your CRM.",
    availability: "planned",
    connectionStatus: "planned",
    requiredPermission: "manage_integrations",
    planNote: "Planned — availability to be confirmed.",
    capabilities: ["Sync contacts bidirectionally", "Track signing status in CRM", "Create CRM records on completion"],
    dataAccess: [
      { label: "Contact names and emails", direction: "read-write" },
      { label: "Transaction status (no content)", direction: "read" },
    ],
    configFields: [],
    demonstrationOnly: true,
  },
  {
    id: INT("int_automation"),
    name: "Automation Connector",
    category: "automation",
    description: "Trigger workflow automations when signing events occur.",
    availability: "plan-dependent",
    connectionStatus: "not-connected",
    requiredPermission: "manage_integrations",
    planNote: "Requires Business plan or higher.",
    capabilities: ["Trigger workflows on signing events", "Send data to automation platforms", "Chain post-completion actions"],
    dataAccess: [
      { label: "Transaction event metadata", direction: "read" },
      { label: "Participant completion status", direction: "read" },
    ],
    configFields: [
      { id: "webhook_url", label: "Automation Endpoint URL", placeholder: "https://your-automation.example.com/hook", type: "url" },
      { id: "event_filter", label: "Event Filter", placeholder: "Select events", type: "select", options: ["All events", "Completion only", "Declined events"] },
    ],
    demonstrationOnly: true,
  },
  {
    id: INT("int_api"),
    name: "API Access",
    category: "developer",
    description: "Programmatic access to your workspace via the LAGDA API.",
    availability: "enterprise",
    connectionStatus: "unavailable",
    requiredPermission: "view_api_availability",
    planNote: "API access is available on Enterprise plans by arrangement.",
    capabilities: ["Full document and transaction API", "Participant management", "Webhook event delivery"],
    dataAccess: [
      { label: "All permitted workspace data", direction: "read-write" },
    ],
    configFields: [],
    demonstrationOnly: true,
  },
  {
    id: INT("int_webhooks"),
    name: "Webhooks",
    category: "developer",
    description: "Receive server-to-server event notifications from LAGDA.",
    availability: "enterprise",
    connectionStatus: "unavailable",
    requiredPermission: "view_webhook_availability",
    planNote: "Webhooks are available on Enterprise plans. Contact Sales.",
    capabilities: ["Delivery on document completion", "Delivery on participant actions", "Signed payload verification direction"],
    dataAccess: [
      { label: "Transaction event metadata", direction: "read" },
    ],
    configFields: [],
    demonstrationOnly: true,
  },
];

// ── Data and Privacy ──────────────────────────────────────────────────────────

export const FIXTURE_DATA_PRIVACY: DataPrivacySettings = {
  userId:               "usr_mls_001",
  exportRequestStatus:  "none",
  closureRequestStatus: "none",
  demonstrationOnly:    true,
};
