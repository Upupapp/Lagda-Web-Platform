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
}

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
    actionPath: "/app/documents",
    whyReceivedReason: whyReceived(row),
    // Read state is per-session: the backend records no per-user marker, so
    // there is nothing truer to report than "unread".
    status: "unread",
  };
}

class RealDocumentFeedService {
  async list(
    workspaceId: string, workspaceName: string, limit = 50,
  ): Promise<NotificationRecord[]> {
    const response = await apiRequest<FeedResponse>(
      `/workspaces/${encodeURIComponent(workspaceId)}/document-notifications`
      + `?limit=${String(limit)}`,
    );
    return response.notifications.map(row => toRecord(row, workspaceId, workspaceName));
  }
}

export const realDocumentFeedService = new RealDocumentFeedService();
