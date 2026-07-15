// Mock Dashboard service.
// Returns deterministic DashboardData for each of the 9 demo scenarios.
// All data is fictional — no backend, no real analytics, no real usage metering.

import type {
  DashboardScenario,
  DashboardData,
  DocumentStatusCount,
  AttentionItem,
  DashboardDocument,
  ActivityItem,
  DashboardUsage,
  DashboardSectionErrors,
} from "../../models/dashboard";
import { MOCK_TRANSACTIONS, MOCK_TEMPLATES } from "../../data/mock";
import { MOCK_SUBSCRIPTION } from "../../data/mock/workspaces";
import { delay } from "./delay";

// ── Computed mock data from fixtures ─────────────────────────────────────────

const NO_ERRORS: DashboardSectionErrors = {
  attention: false,
  statusCounts: false,
  recentDocuments: false,
  activity: false,
  usage: false,
};

const STANDARD_STATUS_COUNTS: DocumentStatusCount = {
  draft: 1,
  sent: 1,
  "awaiting-signature": 1,
  "partially-completed": 1,
  completed: 1,
  declined: 0,
  expired: 1,
  total: 6,
};

const STANDARD_ATTENTION: AttentionItem[] = [
  {
    id: "att_001",
    type: "awaiting-signature",
    title: "Retainer Agreement — Mabini Business Services",
    detail: "1 of 2 participants have signed. One signer is pending.",
    transactionId: "txn_001",
    severity: "high",
  },
  {
    id: "att_002",
    type: "expiring-soon",
    title: "Legal Services Agreement — Mabini Business Services (renewal)",
    detail: "Expires July 27, 2026. 0 of 2 participants have signed.",
    transactionId: "txn_005",
    expiresAt: "2026-07-27T14:05:00Z",
    severity: "medium",
  },
];

// Most recent 5 transactions sorted by updatedAt descending.
const STANDARD_RECENT_DOCS: DashboardDocument[] = [
  { id: "txn_004", title: "Faculty Employment Contract — Sampaguita Learning Institute", status: "draft",               updatedAt: "2026-07-15T07:30:00Z", participantCount: 1, completedParticipantCount: 0 },
  { id: "txn_003", title: "Deed of Sale — Lot 7 Block 3, Harborline Residences",         status: "partially-completed", updatedAt: "2026-07-14T16:45:00Z", participantCount: 4, completedParticipantCount: 2 },
  { id: "txn_005", title: "Legal Services Agreement — Mabini Business Services (renewal)", status: "sent",             updatedAt: "2026-07-13T14:05:00Z", participantCount: 2, completedParticipantCount: 0 },
  { id: "txn_001", title: "Retainer Agreement — Mabini Business Services",                status: "awaiting-signature", updatedAt: "2026-07-10T09:14:00Z", participantCount: 2, completedParticipantCount: 1 },
  { id: "txn_002", title: "NDA — Harborline Properties × Northbridge Legal",              status: "completed",          updatedAt: "2026-07-09T14:22:00Z", participantCount: 3, completedParticipantCount: 3 },
];

const STANDARD_ACTIVITY: ActivityItem[] = [
  { id: "act_001", type: "document-created",   description: "Faculty Employment Contract was created as a draft.",                        timestamp: "2026-07-15T07:30:00Z", transactionId: "txn_004" },
  { id: "act_002", type: "document-sent",      description: "Legal Services Agreement — Mabini Business Services (renewal) was sent.",    timestamp: "2026-07-13T14:05:00Z", transactionId: "txn_005" },
  { id: "act_003", type: "signature-received", description: "Jose dela Cruz signed Deed of Sale — Lot 7 Block 3.",                       timestamp: "2026-07-14T16:45:00Z", transactionId: "txn_003" },
  { id: "act_004", type: "signature-received", description: "Maria Reyes signed Retainer Agreement — Mabini Business Services.",         timestamp: "2026-07-10T09:14:00Z", transactionId: "txn_001" },
  { id: "act_005", type: "document-sent",      description: "Retainer Agreement — Mabini Business Services was sent.",                  timestamp: "2026-07-10T09:00:00Z", transactionId: "txn_001" },
  { id: "act_006", type: "document-completed", description: "NDA — Harborline Properties × Northbridge Legal was fully signed.",         timestamp: "2026-07-09T14:22:00Z", transactionId: "txn_002" },
  { id: "act_007", type: "document-sent",      description: "NDA — Harborline Properties × Northbridge Legal was sent.",                 timestamp: "2026-07-08T12:00:00Z", transactionId: "txn_002" },
];

function standardUsage(): DashboardUsage {
  return {
    sendingRequestsUsed: MOCK_SUBSCRIPTION.sendingRequestsUsed,
    sendingRequestsLimit: MOCK_SUBSCRIPTION.sendingRequestsLimit,
    storageUsedBytes: MOCK_SUBSCRIPTION.storageUsedBytes,
    storageLimitBytes: MOCK_SUBSCRIPTION.storageLimitBytes,
    planLabel: "Professional",
    periodEndDate: MOCK_SUBSCRIPTION.currentPeriodEnd,
    isNearSendingLimit: (MOCK_SUBSCRIPTION.sendingRequestsUsed / (MOCK_SUBSCRIPTION.sendingRequestsLimit ?? 1)) >= 0.8,
    isNearStorageLimit: (MOCK_SUBSCRIPTION.storageUsedBytes / (MOCK_SUBSCRIPTION.storageLimitBytes ?? 1)) >= 0.8,
  };
}

const STANDARD_DATA: DashboardData = {
  statusCounts: STANDARD_STATUS_COUNTS,
  attentionItems: STANDARD_ATTENTION,
  recentDocuments: STANDARD_RECENT_DOCS,
  activityItems: STANDARD_ACTIVITY,
  usage: standardUsage(),
  sectionErrors: NO_ERRORS,
};

// ── Scenario variants ─────────────────────────────────────────────────────────

function newUserData(): DashboardData {
  return {
    statusCounts: { draft: 0, sent: 0, "awaiting-signature": 0, "partially-completed": 0, completed: 0, declined: 0, expired: 0, total: 0 },
    attentionItems: [],
    recentDocuments: [],
    activityItems: [],
    usage: standardUsage(),
    sectionErrors: NO_ERRORS,
  };
}

function usageWarningData(): DashboardData {
  return {
    ...STANDARD_DATA,
    usage: {
      ...standardUsage(),
      sendingRequestsUsed: 185,
      isNearSendingLimit: true,
      storageUsedBytes: 4_563_402_752,
      isNearStorageLimit: true,
    },
  };
}

function partialFailureData(): DashboardData {
  return {
    ...STANDARD_DATA,
    attentionItems: [],
    activityItems: [],
    usage: standardUsage(),
    sectionErrors: {
      attention: true,
      statusCounts: false,
      recentDocuments: false,
      activity: true,
      usage: false,
    },
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

class MockDashboardService {
  // Returns DashboardData, or throws on "full-error" scenario.
  async load(scenario: DashboardScenario): Promise<DashboardData> {
    await delay();

    if (scenario === "full-error") {
      throw new Error("Dashboard service unavailable (demo full-error scenario).");
    }

    switch (scenario) {
      case "new-user":            return newUserData();
      case "usage-warning":       return usageWarningData();
      case "partial-failure":     return partialFailureData();
      // viewer / restricted-workspace use the same data; permission gates in the
      // component control what sections are rendered.
      case "viewer":
      case "restricted-workspace":
      case "sender":
      case "auditor":
      case "standard-admin":
      default:
        return STANDARD_DATA;
    }
  }
}

export const mockDashboardService = new MockDashboardService();
export { MOCK_TEMPLATES as DASHBOARD_MOCK_TEMPLATES };
