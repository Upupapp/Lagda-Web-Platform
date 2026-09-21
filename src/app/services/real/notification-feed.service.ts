// Real notifications — the messages this account was actually sent.
//
// ── What this can and cannot show ─────────────────────────────────────────
//
// The backend returns only rows whose `audience_kind` is USER and whose
// `audience_user_id` is the caller. That is an authorization boundary, not a
// filter, and it has a visible consequence worth stating plainly:
//
//   A "document sent to you for signing" notification is addressed to a
//   RECIPIENT, not to a user account. It will never appear here.
//
// That is deliberate. Those rows live in the other credential realm and each
// one carries a sealed signing-link credential. Surfacing them in the
// workspace feed is the cross-realm read migration 051 forbids.
//
// So this feed is the account holder's own mail: documents they sent
// completing, workspace invitations, and account security events.
//
// ── Why the mapping is defensive ──────────────────────────────────────────
//
// `templateInput` is bounded and schema-checked on the way in, but it is typed
// as `unknown` at the boundary and its shape varies per template. Every read
// of it goes through `str()`, so a template that changes its variables
// degrades to a generic-but-true title rather than rendering "undefined" into
// a notification.

import { apiRequest } from "../api-client";
import type {
  NotificationRecord, NotificationId, NotificationCategory,
  NotificationSeverity, NotificationPriority,
} from "../../models/notifications";

interface FeedRow {
  readonly id: string;
  readonly type: string;
  readonly workspaceId: string | null;
  readonly sourceKind: string;
  readonly sourceId: string;
  readonly templateInput: unknown;
  readonly createdAt: string;
}

interface FeedResponse { readonly notifications: readonly FeedRow[] }

/** A string field from an unknown bag, or null. Never `undefined` in output. */
function str(input: unknown, key: string): string | null {
  if (typeof input !== "object" || input === null) return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

interface Presentation {
  readonly category: NotificationCategory;
  readonly severity: NotificationSeverity;
  readonly priority: NotificationPriority;
  readonly title: string;
  readonly body: string;
  readonly actionLabel: string | null;
  readonly actionPath: string | null;
  readonly why: string;
}

/**
 * How each notification type reads in the feed.
 *
 * The unknown-type fallback is not decoration. New types are added backend-
 * first, and a frontend that threw or rendered a blank row on one it had not
 * been taught would break the whole list for the sake of one entry.
 */
function present(row: FeedRow): Presentation {
  const documentTitle = str(row.templateInput, "documentTitle")
    ?? str(row.templateInput, "title");
  const workspaceName = str(row.templateInput, "workspaceName");

  switch (row.type) {
    case "SIGNING_COMPLETED":
      return {
        category: "documents", severity: "success", priority: "normal",
        title: documentTitle === null
          ? "A document you sent was completed"
          : `${documentTitle} was signed`,
        body: documentTitle === null
          ? "Everyone has signed. The completed document is ready."
          : `Everyone has signed ${documentTitle}. The completed document is ready.`,
        actionLabel: "View document",
        // The request id, which is what the documents surface routes on.
        actionPath: `/app/documents/${row.sourceId}`,
        why: "You were sent this because a signing request you created has been "
          + "completed by every recipient.",
      };

    case "WORKSPACE_INVITATION":
      return {
        category: "workspace", severity: "info", priority: "high",
        title: workspaceName === null
          ? "You were invited to a workspace"
          : `You were invited to ${workspaceName}`,
        body: "Accept the invitation to join and start working together.",
        actionLabel: null, actionPath: null,
        why: "You were sent this because somebody invited you to their workspace.",
      };

    case "ACCOUNT_EMAIL_VERIFICATION":
      return {
        category: "security", severity: "info", priority: "high",
        title: "Confirm your email address",
        body: "We sent you a link to confirm this address belongs to you.",
        actionLabel: null, actionPath: null,
        why: "You were sent this because your account's email address needs confirming.",
      };

    case "PASSWORD_RESET":
      return {
        category: "security", severity: "warning", priority: "high",
        title: "Password reset requested",
        body: "A password reset was requested for your account. If this "
          + "wasn't you, change your password and review your sessions.",
        actionLabel: "Review sessions",
        actionPath: "/app/settings/sessions",
        why: "You were sent this because a password reset was requested for your account.",
      };

    case "MFA_OTP":
      return {
        category: "security", severity: "info", priority: "normal",
        title: "A sign-in code was sent",
        body: "A one-time code was sent to you to complete a sign-in.",
        actionLabel: null, actionPath: null,
        why: "You were sent this because a sign-in to your account required a one-time code.",
      };

    default:
      // Truthful about what it does not know, rather than guessing.
      return {
        category: "system", severity: "info", priority: "low",
        title: "Notification",
        body: "You have a new notification on your account.",
        actionLabel: null, actionPath: null,
        why: "You were sent this because it was addressed to your account.",
      };
  }
}

function toRecord(row: FeedRow): NotificationRecord {
  const p = present(row);
  return {
    id: row.id as NotificationId,
    // The model requires this literal. It is inherited from the mock's shape
    // and is NOT true of these rows — they are real messages that were really
    // sent. Removing the field means touching every settings surface that
    // reads it, which belongs in its own change.
    demonstrationOnly: true,
    category: p.category,
    severity: p.severity,
    priority: p.priority,
    title: p.title,
    body: p.body,
    detailBody: null,
    createdAt: row.createdAt,
    workspaceId: row.workspaceId ?? "",
    workspaceName: str(row.templateInput, "workspaceName") ?? "",
    // True of these rows: they were sent as email, and this is the in-app
    // rendering of that same message.
    deliveryClass: "email-and-in-app",
    isDismissible: true,
    hasAction: p.actionPath !== null,
    actionLabel: p.actionLabel,
    actionPath: p.actionPath,
    whyReceivedReason: p.why,
    // Everything arrives unread. Read state is per-session and held in the
    // store this hydrates — the backend records no per-user read marker, so
    // there is nothing truer available to report.
    status: "unread",
  };
}

class RealNotificationFeedService {
  async list(): Promise<NotificationRecord[]> {
    const response = await apiRequest<FeedResponse>("/me/notifications");
    return response.notifications.map(toRecord);
  }
}

export const realNotificationFeedService = new RealNotificationFeedService();
