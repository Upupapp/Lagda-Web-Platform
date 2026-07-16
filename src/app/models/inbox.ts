// Command 27 — Authenticated Recipient Inbox and My Actions Center.
// All types are frontend-only. No backend, no storage, no real recipient tokens.

import type { RecipientParticipantRole, RecipientRequestStatus, AuthMethod } from "./recipient";

// ── Branded ID ────────────────────────────────────────────────────────────────

export type InboxAssignmentId = string & { readonly __brand: "InboxAssignmentId" };

// ── Status types ──────────────────────────────────────────────────────────────

export type RecipientInboxStatus =
  | "action-required"  // Active request, user's turn, action needed now
  | "in-progress"      // User has started but not completed their action
  | "upcoming"         // Assigned but not yet user's turn (routing / scheduling)
  | "completed"        // User completed their required action
  | "unavailable";     // Request is expired, cancelled, voided, or otherwise closed

export type InboxFilterView =
  | "awaiting"     // action-required items
  | "in-progress"
  | "upcoming"
  | "completed"
  | "all"
  | "unavailable";

export type InboxSortOrder = "received" | "due-date" | "alphabetical";

// Why an item is upcoming or unavailable
export type StatusReason =
  | "routing-locked"     // Another participant must act first
  | "not-yet-available"  // Scheduled for a future date
  | "expired"
  | "cancelled"
  | "voided";

// ── Core inbox item ───────────────────────────────────────────────────────────

export interface RecipientInboxItem {
  readonly id: InboxAssignmentId;
  readonly demonstrationOnly: true;

  // Assignment classification
  assignmentStatus: RecipientInboxStatus;
  role: RecipientParticipantRole;

  // Document info
  documentTitle: string;
  documentCount: number;
  documentDescription: string | null;

  // Sender and workspace
  senderName: string;
  senderOrganization: string | null;
  workspaceName: string;

  // Timing
  assignedAt: string;         // ISO 8601
  dueAt: string | null;
  completedAt: string | null;

  // Underlying request state
  requestStatus: RecipientRequestStatus;

  // Reason status is upcoming or unavailable (null for action-required/in-progress/completed)
  statusReason: StatusReason | null;

  // Auth method required to proceed
  authMethod: AuthMethod;

  // Field progress (for signers / approvers; 0/0 for viewers / copy-recipients)
  fieldCount: number;
  fieldCompleted: number;

  // Routing context — null for parallel flows
  routingPosition: number | null;
  totalRoutingPositions: number | null;

  // Handoff → maps to a C20 fixture ID so demo navigation works end-to-end
  // null for upcoming items that are not yet reachable
  handoffRequestId: string | null;

  // Read state — module-level only, never persisted to any storage
  isRead: boolean;
}

// ── Summary counts ────────────────────────────────────────────────────────────

export interface RecipientInboxSummary {
  totalCount: number;
  actionRequiredCount: number;
  inProgressCount: number;
  upcomingCount: number;
  completedCount: number;
  unavailableCount: number;
}

// ── Query parameters ──────────────────────────────────────────────────────────

export interface RecipientInboxQuery {
  view: InboxFilterView;
  q: string;
  role: RecipientParticipantRole | "";
  sort: InboxSortOrder;
}
