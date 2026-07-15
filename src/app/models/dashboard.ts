// Typed models for the authenticated customer Dashboard.
// Consumed by MockDashboardService and PlatformDashboard component.

import type { TransactionStatus } from "./index";

// The 9 deterministic mock scenarios for the Dashboard.
export type DashboardScenario =
  | "standard-admin"
  | "sender"
  | "viewer"
  | "auditor"
  | "new-user"
  | "partial-failure"
  | "full-error"
  | "usage-warning"
  | "restricted-workspace";

// Component-level load state, separate from scenario.
export type DashboardLoadState = "loading" | "ready" | "partial-error" | "full-error";

// Document status counts derived from the workspace transaction list.
export interface DocumentStatusCount {
  draft: number;
  sent: number;
  "awaiting-signature": number;
  "partially-completed": number;
  completed: number;
  declined: number;
  expired: number;
  total: number;
}

export type AttentionItemType = "awaiting-signature" | "expiring-soon" | "declined";

// An item in the Needs Attention section — requires user action.
export interface AttentionItem {
  id: string;
  type: AttentionItemType;
  title: string;
  detail: string;
  transactionId: string;
  expiresAt?: string;
  severity: "high" | "medium";
}

// A document entry in the Recent Documents section.
export interface DashboardDocument {
  id: string;
  title: string;
  status: TransactionStatus;
  updatedAt: string;
  participantCount: number;
  completedParticipantCount: number;
}

export type ActivityItemType =
  | "document-created"
  | "document-sent"
  | "signature-received"
  | "document-completed"
  | "document-expired";

// An entry in the Recent Activity feed.
// Never includes IP address, device, or exact-location data.
export interface ActivityItem {
  id: string;
  type: ActivityItemType;
  description: string;
  timestamp: string;
  transactionId?: string;
}

// Usage and plan snapshot for the side panel.
export interface DashboardUsage {
  sendingRequestsUsed: number;
  sendingRequestsLimit: number | null;
  storageUsedBytes: number;
  storageLimitBytes: number | null;
  planLabel: string;
  periodEndDate: string;
  isNearSendingLimit: boolean;
  isNearStorageLimit: boolean;
}

// Per-section error flags. true = that section failed to load.
export interface DashboardSectionErrors {
  attention: boolean;
  statusCounts: boolean;
  recentDocuments: boolean;
  activity: boolean;
  usage: boolean;
}

export interface DashboardData {
  statusCounts: DocumentStatusCount;
  attentionItems: AttentionItem[];
  recentDocuments: DashboardDocument[];
  activityItems: ActivityItem[];
  usage: DashboardUsage;
  sectionErrors: DashboardSectionErrors;
}
