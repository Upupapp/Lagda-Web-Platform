// Frontend service interfaces for the LAGDA customer platform.
// All interfaces are backend-agnostic; implementations may be mock or real.
// Replace MockXxxService with RealXxxService at integration time without
// changing any consumer component.

import type {
  ApiResponse,
  ContactSummary,
  DocumentTransactionSummary,
  MockSession,
  NotificationSummary,
  Paginated,
  SubscriptionSummary,
  TemplateSummary,
  UsageSummary,
  UserSummary,
  VerificationResult,
  WorkspaceSummary,
} from "../../models";

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface SignInPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthService {
  signIn(payload: SignInPayload): Promise<ApiResponse<MockSession>>;
  register(payload: RegisterPayload): Promise<ApiResponse<MockSession>>;
  signOut(): Promise<void>;
  getSession(): MockSession;
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface UserService {
  getProfile(): Promise<ApiResponse<UserSummary>>;
  updateProfile(data: Partial<UserSummary>): Promise<ApiResponse<UserSummary>>;
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export interface WorkspaceService {
  list(): Promise<ApiResponse<WorkspaceSummary[]>>;
  get(id: string): Promise<ApiResponse<WorkspaceSummary>>;
}

// ── Documents ─────────────────────────────────────────────────────────────────

export interface ListDocumentsOptions {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
}

export interface DocumentService {
  list(options?: ListDocumentsOptions): Promise<ApiResponse<Paginated<DocumentTransactionSummary>>>;
  get(id: string): Promise<ApiResponse<DocumentTransactionSummary>>;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export interface TemplateService {
  list(): Promise<ApiResponse<TemplateSummary[]>>;
  get(id: string): Promise<ApiResponse<TemplateSummary>>;
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export interface ContactService {
  list(): Promise<ApiResponse<ContactSummary[]>>;
  get(id: string): Promise<ApiResponse<ContactSummary>>;
}

// ── Verification ─────────────────────────────────────────────────────────────

export interface VerificationService {
  verify(verificationId: string): Promise<ApiResponse<VerificationResult>>;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationService {
  list(): Promise<ApiResponse<NotificationSummary[]>>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface BillingService {
  getSubscription(): Promise<ApiResponse<SubscriptionSummary>>;
  getUsage(): Promise<ApiResponse<UsageSummary>>;
}
