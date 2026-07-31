// Command 27 — In-memory inbox service for the Authenticated Recipient Inbox.
// Module-level state. Resets on page reload. No localStorage, no sessionStorage,
// no URL storage, no network requests. All 12 fixture items carry demonstrationOnly: true.

import type {
  RecipientInboxItem, InboxAssignmentId, RecipientInboxSummary, RecipientInboxQuery,
} from "../../models/inbox";
import { ok, fail } from "../../models/errors";
import type { ServiceResult } from "../../models/errors";

// ── Fixture data ──────────────────────────────────────────────────────────────

function id(raw: string): InboxAssignmentId {
  return raw as InboxAssignmentId;
}

const FIXTURES: RecipientInboxItem[] = [
  // 1 — action-required, signer
  {
    id: id("inbox-service-agreement-001"),
    demonstrationOnly: true,
    assignmentStatus: "action-required",
    role: "signer",
    documentTitle: "Service Engagement Agreement — Q3 2026",
    documentCount: 1,
    documentDescription: "Standard services engagement agreement for consulting and advisory services.",
    senderName: "Maria Santos",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-14T09:00:00+08:00",
    dueAt: "2026-07-19T23:59:00+08:00",
    completedAt: null,
    requestStatus: "active",
    statusReason: null,
    authMethod: "email-code",
    fieldCount: 3,
    fieldCompleted: 0,
    routingPosition: 1,
    totalRoutingPositions: 2,
    handoffRequestId: "req-engagement-0002-marco",
    isRead: false,
  },

  // 2 — in-progress, signer (multi-doc)
  {
    id: id("inbox-vendor-nda-002"),
    demonstrationOnly: true,
    assignmentStatus: "in-progress",
    role: "signer",
    documentTitle: "Professional Services Agreement — 2026",
    documentCount: 2,
    documentDescription: "Professional services engagement and confidentiality addendum.",
    senderName: "Ana Reyes",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-10T11:00:00+08:00",
    dueAt: "2026-07-23T23:59:00+08:00",
    completedAt: null,
    requestStatus: "active",
    statusReason: null,
    authMethod: "email-code",
    fieldCount: 5,
    fieldCompleted: 2,
    routingPosition: null,
    totalRoutingPositions: null,
    handoffRequestId: "req-psa-0001-lea",
    isRead: true,
  },

  // 3 — action-required, approver
  {
    id: id("inbox-procurement-approval-003"),
    demonstrationOnly: true,
    assignmentStatus: "action-required",
    role: "approver",
    documentTitle: "Procurement Compliance Declaration — FY2026",
    documentCount: 1,
    documentDescription: "Annual procurement compliance statement for regulated vendor relationships.",
    senderName: "James Villanueva",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-15T08:00:00+08:00",
    dueAt: "2026-07-18T17:00:00+08:00",
    completedAt: null,
    requestStatus: "active",
    statusReason: null,
    authMethod: "authenticator",
    fieldCount: 1,
    fieldCompleted: 0,
    routingPosition: 2,
    totalRoutingPositions: 3,
    handoffRequestId: "req-dpa-0005-ana",
    isRead: false,
  },

  // 4 — action-required, acknowledgment-recipient
  {
    id: id("inbox-policy-acknowledgment-004"),
    demonstrationOnly: true,
    assignmentStatus: "action-required",
    role: "acknowledgment-recipient",
    documentTitle: "Workplace Privacy Policy — 2026 Edition",
    documentCount: 1,
    documentDescription: "Updated workplace privacy and data-handling policy for all personnel.",
    senderName: "Carmen Dela Cruz",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-15T10:00:00+08:00",
    dueAt: "2026-07-21T23:59:00+08:00",
    completedAt: null,
    requestStatus: "active",
    statusReason: null,
    authMethod: "account-signin",
    fieldCount: 1,
    fieldCompleted: 0,
    routingPosition: null,
    totalRoutingPositions: null,
    handoffRequestId: "req-policy-0004-sofia",
    isRead: false,
  },

  // 5 — in-progress, reviewer
  {
    id: id("inbox-consulting-review-005"),
    demonstrationOnly: true,
    assignmentStatus: "in-progress",
    role: "reviewer",
    documentTitle: "IT Security Policy Review — 2026",
    documentCount: 1,
    documentDescription: "Annual review and commentary on the information security framework.",
    senderName: "Ben Cruz",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-12T14:00:00+08:00",
    dueAt: "2026-07-26T23:59:00+08:00",
    completedAt: null,
    requestStatus: "active",
    statusReason: null,
    authMethod: "account-signin",
    fieldCount: 0,
    fieldCompleted: 0,
    routingPosition: 1,
    totalRoutingPositions: 1,
    handoffRequestId: "req-policy-review-0006",
    isRead: true,
  },

  // 6 — upcoming, signer, routing-locked
  {
    id: id("inbox-partnership-upcoming-006"),
    demonstrationOnly: true,
    assignmentStatus: "upcoming",
    role: "signer",
    documentTitle: "Strategic Partnership Agreement",
    documentCount: 1,
    documentDescription: "Mutual obligations and terms for a strategic business partnership arrangement.",
    senderName: "Laura Tan",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-13T09:00:00+08:00",
    dueAt: null,
    completedAt: null,
    requestStatus: "active",
    statusReason: "routing-locked",
    authMethod: "authenticator",
    fieldCount: 4,
    fieldCompleted: 0,
    routingPosition: 2,
    totalRoutingPositions: 2,
    handoffRequestId: "req-locked-0009",
    isRead: true,
  },

  // 7 — upcoming, signer, not-yet-available
  {
    id: id("inbox-lease-upcoming-007"),
    demonstrationOnly: true,
    assignmentStatus: "upcoming",
    role: "signer",
    documentTitle: "Office Lease Renewal Agreement — 2027",
    documentCount: 1,
    documentDescription: "Lease renewal for primary office premises — third party co-signers pending.",
    senderName: "Danilo Reyes",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-08T10:00:00+08:00",
    dueAt: null,
    completedAt: null,
    requestStatus: "active",
    statusReason: "not-yet-available",
    authMethod: "email-code",
    fieldCount: 6,
    fieldCompleted: 0,
    routingPosition: 3,
    totalRoutingPositions: 4,
    handoffRequestId: null,
    isRead: true,
  },

  // 8 — completed, signer
  {
    id: id("inbox-completed-agreement-008"),
    demonstrationOnly: true,
    assignmentStatus: "completed",
    role: "signer",
    documentTitle: "Employment Agreement — Executive Officer",
    documentCount: 1,
    documentDescription: "Executive employment agreement covering compensation, responsibilities, and obligations.",
    senderName: "Maria Santos",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-06-28T09:00:00+08:00",
    dueAt: "2026-07-01T23:59:00+08:00",
    completedAt: "2026-07-01T10:30:00+08:00",
    requestStatus: "completed",
    statusReason: null,
    authMethod: "email-code",
    fieldCount: 5,
    fieldCompleted: 5,
    routingPosition: 1,
    totalRoutingPositions: 1,
    handoffRequestId: "req-done-0013",
    isRead: true,
  },

  // 9 — completed, viewer
  {
    id: id("inbox-board-resolution-009"),
    demonstrationOnly: true,
    assignmentStatus: "completed",
    role: "viewer",
    documentTitle: "Board Resolution No. 2026-07 — Capital Expenditure",
    documentCount: 1,
    documentDescription: "Board resolution authorizing capital expenditure for Q3 2026 projects.",
    senderName: "James Villanueva",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-10T08:00:00+08:00",
    dueAt: null,
    completedAt: "2026-07-10T14:00:00+08:00",
    requestStatus: "active",
    statusReason: null,
    authMethod: "account-signin",
    fieldCount: 0,
    fieldCompleted: 0,
    routingPosition: null,
    totalRoutingPositions: null,
    handoffRequestId: "req-viewer-0007",
    isRead: true,
  },

  // 10 — completed, copy-recipient
  {
    id: id("inbox-document-package-010"),
    demonstrationOnly: true,
    assignmentStatus: "completed",
    role: "copy-recipient",
    documentTitle: "Contract Package — Technology Services",
    documentCount: 3,
    documentDescription: "Fully executed contract package provided for your records.",
    senderName: "Ana Reyes",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-12T09:00:00+08:00",
    dueAt: null,
    completedAt: "2026-07-12T09:01:00+08:00",
    requestStatus: "active",
    statusReason: null,
    authMethod: "none",
    fieldCount: 0,
    fieldCompleted: 0,
    routingPosition: null,
    totalRoutingPositions: null,
    handoffRequestId: "req-copy-0008",
    isRead: true,
  },

  // 11 — unavailable, expired
  {
    id: id("inbox-expired-contract-011"),
    demonstrationOnly: true,
    assignmentStatus: "unavailable",
    role: "signer",
    documentTitle: "Supplier Service Contract — Q2 2026",
    documentCount: 1,
    documentDescription: "Supplier services contract — signing window has closed.",
    senderName: "Ben Cruz",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-06-15T09:00:00+08:00",
    dueAt: "2026-06-30T23:59:00+08:00",
    completedAt: null,
    requestStatus: "expired",
    statusReason: "expired",
    authMethod: "email-code",
    fieldCount: 3,
    fieldCompleted: 0,
    routingPosition: 1,
    totalRoutingPositions: 1,
    handoffRequestId: "req-expired-0010",
    isRead: true,
  },

  // 12 — unavailable, cancelled
  {
    id: id("inbox-cancelled-filing-012"),
    demonstrationOnly: true,
    assignmentStatus: "unavailable",
    role: "signer",
    documentTitle: "Corporate Filing — Annual Compliance 2025",
    documentCount: 1,
    documentDescription: "Annual corporate compliance filing — request was cancelled by the sender.",
    senderName: "Carmen Dela Cruz",
    senderOrganization: "MoveUp Law Group",
    workspaceName: "MoveUp Law Group",
    assignedAt: "2026-07-05T11:00:00+08:00",
    dueAt: null,
    completedAt: null,
    requestStatus: "cancelled",
    statusReason: "cancelled",
    authMethod: "email-code",
    fieldCount: 2,
    fieldCompleted: 0,
    routingPosition: null,
    totalRoutingPositions: null,
    handoffRequestId: "req-cancelled-0011",
    isRead: true,
  },
];

// ── Module-level state ────────────────────────────────────────────────────────

// Deep-copy the fixtures so the service state is independent of the const array
const _items: RecipientInboxItem[] = FIXTURES.map(f => ({ ...f }));

// ── Filter and sort helpers ───────────────────────────────────────────────────

function matchesView(item: RecipientInboxItem, view: RecipientInboxQuery["view"]): boolean {
  if (view === "all") return true;
  if (view === "awaiting")    return item.assignmentStatus === "action-required";
  if (view === "in-progress") return item.assignmentStatus === "in-progress";
  if (view === "upcoming")    return item.assignmentStatus === "upcoming";
  if (view === "completed")   return item.assignmentStatus === "completed";
  if (view === "unavailable") return item.assignmentStatus === "unavailable";
  return true;
}

function matchesSearch(item: RecipientInboxItem, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    item.documentTitle.toLowerCase().includes(needle) ||
    item.senderName.toLowerCase().includes(needle) ||
    item.workspaceName.toLowerCase().includes(needle) ||
    (item.documentDescription?.toLowerCase().includes(needle) ?? false)
  );
}

function sortItems(items: RecipientInboxItem[], sort: InboxSortOrder): RecipientInboxItem[] {
  const copy = [...items];
  if (sort === "alphabetical") {
    copy.sort((a, b) => a.documentTitle.localeCompare(b.documentTitle));
  } else if (sort === "due-date") {
    copy.sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  } else {
    // received — newest first
    copy.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  }
  return copy;
}

type InboxSortOrder = RecipientInboxQuery["sort"];

// ── Service ───────────────────────────────────────────────────────────────────

export const inboxService = {
  listAssignments(query: RecipientInboxQuery): ServiceResult<RecipientInboxItem[]> {
    try {
      let results = _items
        .filter(item => matchesView(item, query.view))
        .filter(item => matchesSearch(item, query.q))
        .filter(item => !query.role || item.role === query.role);
      results = sortItems(results, query.sort);
      return ok(results);
    } catch {
      return fail("UNKNOWN");
    }
  },

  getAssignment(assignmentId: string): ServiceResult<RecipientInboxItem> {
    const item = _items.find(i => i.id === assignmentId);
    if (!item) return fail("NOT_FOUND");
    return ok({ ...item });
  },

  markAsRead(assignmentId: string): ServiceResult<void> {
    const item = _items.find(i => i.id === assignmentId);
    if (!item) return fail("NOT_FOUND");
    item.isRead = true;
    return ok(undefined);
  },

  getSummary(): ServiceResult<RecipientInboxSummary> {
    try {
      const summary: RecipientInboxSummary = {
        totalCount: _items.length,
        actionRequiredCount: _items.filter(i => i.assignmentStatus === "action-required").length,
        inProgressCount: _items.filter(i => i.assignmentStatus === "in-progress").length,
        upcomingCount: _items.filter(i => i.assignmentStatus === "upcoming").length,
        completedCount: _items.filter(i => i.assignmentStatus === "completed").length,
        unavailableCount: _items.filter(i => i.assignmentStatus === "unavailable").length,
      };
      return ok(summary);
    } catch {
      return fail("UNKNOWN");
    }
  },

  getActionRequiredItems(limit = 3): ServiceResult<RecipientInboxItem[]> {
    try {
      const items = _items
        .filter(i => i.assignmentStatus === "action-required" || i.assignmentStatus === "in-progress")
        .sort((a, b) => {
          // due-date-first, then received
          if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
          if (a.dueAt) return -1;
          if (b.dueAt) return 1;
          return new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
        })
        .slice(0, limit);
      return ok(items);
    } catch {
      return fail("UNKNOWN");
    }
  },

  getUnreadCount(): number {
    return _items.filter(i => !i.isRead).length;
  },
};
