// Foundational frontend models for the LAGDA customer platform.
// These are typed interfaces for the frontend data layer.
// Do NOT embed visual colors or presentation logic here.
// Presentation mapping lives in the component/style layer.

// ── Primitives ────────────────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterState {
  [key: string]: string | string[] | boolean | null | undefined;
}

export interface ApiResult<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export type ApiResponse<T> = ApiResult<T> | ApiError;

// ── Navigation ────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  path: string;
  description?: string;
  icon?: string;
  group?: string;
  children?: NavItem[];
  isActive?: boolean;
  isComingSoon?: boolean;
  isExternal?: boolean;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  requiresAuth?: boolean;
  badge?: string;
  product?: "esignature" | "enotary" | "shared";
}

// ── Identity ──────────────────────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  workspaceId?: string;
}

export type UserRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  plan: SubscriptionPlan;
}

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  isDefault: boolean;
}

// ── Document transactions ─────────────────────────────────────────────────────

export type TransactionStatus =
  | "draft"
  | "ready-to-send"
  | "sent"
  | "delivered"
  | "viewed"
  | "authentication-completed"
  | "awaiting-signature"
  | "awaiting-approval"
  | "partially-completed"
  | "completed"
  | "declined"
  | "cancelled"
  | "expired"
  | "failed-delivery"
  | "voided"
  | "needs-attention"
  | "archived";

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  "draft":                    "Draft",
  "ready-to-send":            "Ready to Send",
  "sent":                     "Sent",
  "delivered":                "Delivered",
  "viewed":                   "Viewed",
  "authentication-completed": "Authentication Completed",
  "awaiting-signature":       "Awaiting Signature",
  "awaiting-approval":        "Awaiting Approval",
  "partially-completed":      "Partially Completed",
  "completed":                "Completed",
  "declined":                 "Declined",
  "cancelled":                "Cancelled",
  "expired":                  "Expired",
  "failed-delivery":          "Failed Delivery",
  "voided":                   "Voided",
  "needs-attention":          "Needs Attention",
  "archived":                 "Archived",
};

export interface DocumentTransactionSummary {
  id: string;
  title: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  sentAt?: string;
  completedAt?: string;
  participantCount: number;
  completedParticipantCount: number;
  workspaceId: string;
  createdById: string;
  verificationId?: string;
  pageCount?: number;
}

// ── Participants ──────────────────────────────────────────────────────────────

export type ParticipantRole = "signer" | "approver" | "viewer" | "carbon-copy";
export type ParticipantStatus = "pending" | "delivered" | "viewed" | "completed" | "declined" | "expired";

export type AuthMethod =
  | "email-otp"
  | "sms-otp"
  | "knowledge-based"
  | "id-verification"
  | "none";

export interface ParticipantSummary {
  id: string;
  transactionId: string;
  name: string;
  email: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  authMethod: AuthMethod;
  signedAt?: string;
  order?: number;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  pageCount: number;
  participantCount: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  createdById: string;
  isShared: boolean;
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export interface ContactSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  workspaceId: string;
  lastUsedAt?: string;
  transactionCount: number;
}

// ── Verification ──────────────────────────────────────────────────────────────

export type VerificationOutcome = "verified" | "not-found" | "tampered" | "expired" | "voided";

export interface VerificationResult {
  outcome: VerificationOutcome;
  verificationId?: string;
  documentTitle?: string;
  completedAt?: string;
  participantCount?: number;
  issuerName?: string;
  qrCodeUrl?: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | "document-sent"
  | "signature-completed"
  | "document-completed"
  | "document-declined"
  | "document-expiring"
  | "document-expired"
  | "team-invitation"
  | "workspace-update"
  | "billing-alert";

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  linkPath?: string;
  transactionId?: string;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export type SubscriptionPlan = "personal" | "professional" | "business" | "business-plus" | "enterprise";
export type BillingCycle = "monthly" | "annual";

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  personal:        "Personal",
  professional:    "Professional",
  business:        "Business",
  "business-plus": "Business Plus",
  enterprise:      "Enterprise",
};

export interface SubscriptionSummary {
  plan: SubscriptionPlan;
  cycle: BillingCycle;
  status: "active" | "past-due" | "cancelled" | "trialing";
  currentPeriodEnd: string;
  sendingRequestsUsed: number;
  sendingRequestsLimit: number | null;
  storageUsedBytes: number;
  storageLimitBytes: number | null;
}

export interface UsageSummary {
  period: string;
  sendingRequestsUsed: number;
  sendingRequestsLimit: number | null;
  storageUsedBytes: number;
  storageLimitBytes: number | null;
  teamMemberCount: number;
  teamMemberLimit: number | null;
  apiCallsThisMonth?: number;
}

// ── Session (frontend mock) ───────────────────────────────────────────────────

export interface MockSession {
  isAuthenticated: boolean;
  user: UserSummary | null;
  workspace: WorkspaceSummary | null;
  subscription: SubscriptionSummary | null;
}

export const EMPTY_SESSION: MockSession = {
  isAuthenticated: false,
  user: null,
  workspace: null,
  subscription: null,
};

// ── Platform (authenticated shell) ────────────────────────────────────────────

export type PlatformSessionStatus =
  | "initializing"
  | "authenticated"
  | "unauthenticated"
  | "expired"
  | "error";

export type PlatformRole =
  | "owner"
  | "administrator"
  | "billing_administrator"
  | "security_administrator"
  | "template_administrator"
  | "sender"
  | "reviewer"
  | "viewer"
  | "auditor";

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  owner:                    "Owner",
  administrator:            "Administrator",
  billing_administrator:    "Billing Administrator",
  security_administrator:   "Security Administrator",
  template_administrator:   "Template Administrator",
  sender:                   "Sender",
  reviewer:                 "Reviewer",
  viewer:                   "Viewer",
  auditor:                  "Auditor",
};

export type PlatformPermission =
  | "view_dashboard"
  | "view_documents"
  | "prepare_documents"
  | "manage_templates"
  | "manage_contacts"
  | "verify_documents"
  | "manage_team"
  | "manage_workspace"
  | "view_billing"
  | "manage_billing"
  | "view_usage"
  | "manage_security"
  | "manage_branding"
  | "manage_integrations"
  | "manage_api"
  | "manage_webhooks"
  | "view_audit";

export const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  owner: [
    "view_dashboard","view_documents","prepare_documents","manage_templates","manage_contacts",
    "verify_documents","manage_team","manage_workspace","view_billing","manage_billing",
    "view_usage","manage_security","manage_branding","manage_integrations","manage_api",
    "manage_webhooks","view_audit",
  ],
  administrator: [
    "view_dashboard","view_documents","prepare_documents","manage_templates","manage_contacts",
    "verify_documents","manage_team","manage_workspace","view_billing","view_usage",
    "manage_security","manage_branding","view_audit",
  ],
  billing_administrator: [
    "view_dashboard","view_documents","view_billing","manage_billing","view_usage",
  ],
  security_administrator: [
    "view_dashboard","view_documents","manage_security","view_audit",
  ],
  template_administrator: [
    "view_dashboard","view_documents","prepare_documents","manage_templates","manage_contacts",
    "verify_documents","view_usage",
  ],
  sender: [
    "view_dashboard","view_documents","prepare_documents","manage_contacts","verify_documents","view_usage",
  ],
  reviewer: [
    "view_dashboard","view_documents","verify_documents",
  ],
  viewer: [
    "view_dashboard","view_documents",
  ],
  auditor: [
    "view_dashboard","view_documents","view_audit",
  ],
};

export type WorkspaceType = "personal" | "team" | "enterprise";

export interface PlatformWorkspace extends WorkspaceSummary {
  type: WorkspaceType;
  role: PlatformRole;
  memberCount: number;
  initials: string;
  accentColor: string;
}

export type PlatformFeatureFlag =
  | "dashboardEnabled"
  | "documentsEnabled"
  | "prepareFlowEnabled"
  | "templatesEnabled"
  | "contactsEnabled"
  | "verificationEnabled"
  | "notificationsEnabled"
  | "teamEnabled"
  | "billingEnabled"
  | "integrationsEnabled"
  | "apiEnabled"
  | "webhooksEnabled"
  | "developmentPlaceholdersEnabled";

export interface PlatformFlags {
  dashboardEnabled: boolean;
  documentsEnabled: boolean;
  prepareFlowEnabled: boolean;
  templatesEnabled: boolean;
  contactsEnabled: boolean;
  verificationEnabled: boolean;
  notificationsEnabled: boolean;
  teamEnabled: boolean;
  billingEnabled: boolean;
  integrationsEnabled: boolean;
  apiEnabled: boolean;
  webhooksEnabled: boolean;
  developmentPlaceholdersEnabled: boolean;
}

export interface SearchResult {
  id: string;
  type: "document" | "template" | "contact" | "help";
  title: string;
  subtitle?: string;
  path: string;
}

export interface SearchResultGroup {
  type: SearchResult["type"];
  label: string;
  items: SearchResult[];
}
