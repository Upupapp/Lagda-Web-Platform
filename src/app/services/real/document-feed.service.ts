// Real DOCUMENT notifications — what has happened to this workspace's
// documents.
//
// ── Why this exists next to notification-feed.service.ts ──────────────────
//
// That one reads the email substrate: rows this account was actually SENT.
// Its own header explains the consequence — a signing invitation is
// addressed to a RECIPIENT, not to a user account, so it never appears
// there, and no status transition produces a row there at all. The result
// was a bell that rendered nothing.
//
// This one reads the backend's evidence projection instead: sent, signed,
// approved, skipped, declined, expired, cancelled, completed, and whose turn
// it now is. Those are the status changes a sender actually wants to know
// about, and they are derived from the record each transition already
// writes, so a notification here cannot claim something that did not happen.
//
// Workspace-scoped, because the capability behind it (`signing-request.view`)
// is held per workspace.
//
// ── One row per document, and state that survives a reload (071) ──────────
//
// The backend returns each document's CURRENT state, not every event — three
// completed documents are three rows, where they used to be sixteen. Each row
// carries this reader's own `read` and `dismissed` state, persisted
// server-side, so marking something read or dismissing it lasts past the
// page it was done on. `scope` narrows to the reader's own documents (sent by
// them, or ones they take part in) or widens to the whole workspace.

import { apiRequest } from "../api-client";
import type {
  NotificationRecord, NotificationId,
  NotificationSeverity, NotificationPriority,
} from "../../models/notifications";

/** One row, exactly as the closed response schema publishes it. */
interface FeedRow {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly severity: "info" | "success" | "warning" | "critical";
  readonly actionRequired: boolean;
  readonly signingRequestId: string;
  readonly documentTitle: string;
  readonly recipientName: string | null;
  readonly occurredAt: number;
  readonly read: boolean;
  readonly dismissed: boolean;
}

export type DocumentFeedScope = "mine" | "workspace";

interface FeedResponse { readonly notifications: readonly FeedRow[] }

/**
 * Action-required rows sort and badge above the rest.
 *
 * A decline stops the request for everyone and an expiry needs a resend;
 * "someone signed" is good news that can wait.
 */
function priorityOf(row: FeedRow): NotificationPriority {
  if (row.severity === "critical") return "high";
  return row.actionRequired ? "high" : "normal";
}

/** Why this reader is seeing it. Shown verbatim on the detail page. */
function whyReceived(row: FeedRow): string {
  return row.actionRequired
    ? "You are seeing this because a document in this workspace needs attention."
    : "You are seeing this because a document in this workspace changed status.";
}

function toRecord(row: FeedRow, workspaceId: string, workspaceName: string): NotificationRecord {
  return {
    // The evidence event's own id. Stable across reloads, which is what lets
    // the store keep per-session read state keyed on it.
    id: row.id as NotificationId,
    // NOT a demonstration. These are real transitions of real documents —
    // unlike the email feed's rows, which carry this flag only because the
    // shared model still requires the literal.
    demonstrationOnly: false,
    // Always `documents`: every row is derived from evidence, and evidence is
    // scoped to a signing request by construction. Nothing else can arrive.
    category: "documents",
    severity: row.severity as NotificationSeverity,
    priority: priorityOf(row),
    title: row.title,
    body: row.body,
    detailBody: null,
    createdAt: new Date(row.occurredAt).toISOString(),
    workspaceId,
    workspaceName,
    // In-app only. The email substrate sends its own messages separately;
    // claiming this row was emailed would be untrue.
    deliveryClass: "in-app-only",
    isDismissible: true,
    hasAction: true,
    actionLabel: "View document",
    // The same deep link real-mode search uses: the documents list, filtered
    // to this document. Every row used to open the unfiltered list.
    actionPath: `/app/documents?q=${encodeURIComponent(row.documentTitle)}`,
    whyReceivedReason: whyReceived(row),
    // The reader's own state, persisted server-side (071).
    status: row.dismissed ? "dismissed" : row.read ? "read" : "unread",
  };
}

class RealDocumentFeedService {
  async list(
    workspaceId: string, workspaceName: string,
    scope: DocumentFeedScope = "mine", limit = 50,
  ): Promise<NotificationRecord[]> {
    const response = await apiRequest<FeedResponse>(
      `/workspaces/${encodeURIComponent(workspaceId)}/document-notifications`
      + `?limit=${String(limit)}&scope=${scope}`,
    );
    return response.notifications.map(row => toRecord(row, workspaceId, workspaceName));
  }

  /**
   * Persists this reader's state for the given rows. An absent key leaves that
   * half alone: `{ read: true }` marks read without touching dismissal.
   */
  async setState(
    workspaceId: string, ids: readonly string[],
    change: { read?: boolean; dismissed?: boolean },
  ): Promise<void> {
    if (ids.length === 0) return;
    await apiRequest<{ updated: number }>(
      `/workspaces/${encodeURIComponent(workspaceId)}/document-notifications/state`,
      { method: "POST", body: { ids: [...ids], ...change } },
    );
  }
}

export const realDocumentFeedService = new RealDocumentFeedService();
