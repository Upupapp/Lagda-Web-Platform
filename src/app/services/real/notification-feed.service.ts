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
import { sharedByMePath, sharedWithMePath } from "./document-sharing.service";
import { invitationRoleLabel, invitationsPath, sentInvitationPath, SENT_INVITATIONS_PATH } from "./my-invitations.service";
import {
  contactRequestsPath, type ContactRequestGroup, type ContactRequestView,
} from "../../models/contact-requests";
import type {
  NotificationRecord, NotificationId, NotificationCategory,
  NotificationSeverity, NotificationPriority, InvitationDeclineDetail,
} from "../../models/notifications";

interface FeedRow {
  readonly id: string;
  readonly type: string;
  readonly workspaceId: string | null;
  readonly sourceKind: string;
  readonly sourceId: string;
  readonly templateInput: unknown;
  readonly createdAt: string;
  /** 090. This account's own read state, persisted server-side. */
  readonly read?: boolean;
  /** 090. This account's own dismissal, persisted server-side. */
  readonly dismissed?: boolean;
}

/** 090. A change to this account's own state on feed rows. An absent key
 *  leaves that half alone. */
export interface NotificationStateChange {
  readonly read?: boolean;
  readonly dismissed?: boolean;
}

/** The most ids one state call may carry (the backend refuses more). */
export const MAX_STATE_IDS_PER_CALL = 100;

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
  /** Defaults to email-and-in-app; the in-app-only types say so. */
  readonly inAppOnly?: boolean;
  /** WORKSPACE_INVITATION_DECLINED only. */
  readonly invitationDecline?: InvitationDeclineDetail;
}

/** How a contact request's kind reads inside a sentence. */
const REQUEST_KIND_PHRASE: Record<string, { asked: string; noun: string }> = {
  "signed-document": { asked: "asked you for a signed document", noun: "a signed document" },
  upload: { asked: "asked you to upload a document", noun: "a document upload" },
  preparation: { asked: "assigned you to prepare a document", noun: "a document's preparation" },
};

function formatDue(iso: string | null): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

/** Where a contact-request notice opens: Contacts → Requests From Contacts,
 *  on the view and sub-section the request is in, focused on it. */
export function contactRequestPath(view: ContactRequestView, group: ContactRequestGroup, requestId: string): string {
  return contactRequestsPath({ view, group, requestId });
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

    // ── Invitations section: received / declined workspace invitations. ─────
    case "WORKSPACE_INVITATION_RECEIVED": {
      const input = row.templateInput;
      const inviter = str(input, "inviterDisplayName") ?? "Someone";
      const role = str(input, "role");
      const expires = formatDue(str(input, "expiresAt"));
      // The row's sourceId is the NOTICE id (089); the invitation is named in the input.
      const invitationId = str(input, "invitationId") ?? undefined;
      const target = workspaceName ?? "their workspace";
      return {
        category: "workspace", severity: "info", priority: "high",
        title: `${inviter} invited you to join ${target}`,
        body: [
          `Invitation to join ${target}${role === null ? "" : ` as ${invitationRoleLabel(role)}`}.`,
          expires === null ? null : `It expires ${expires}.`,
          "Accept or reject it in Invitations.",
        ].filter((part): part is string => part !== null).join(" "),
        actionLabel: "Open invitation",
        actionPath: invitationsPath("pending", invitationId),
        why: "You were sent this because a workspace invited your email address to join it. It was not emailed.",
        inAppOnly: true,
      };
    }

    case "WORKSPACE_INVITATION_DECLINED": {
      const input = row.templateInput;
      const who = str(input, "inviteeDisplayName") ?? str(input, "inviteeEmail") ?? str(input, "email") ?? "The invitee";
      const reason = str(input, "reason");
      const role = str(input, "role");
      // The row's sourceId is the NOTICE id (089); the invitation is named in the input.
      const invitationId = str(input, "invitationId") ?? undefined;
      const target = workspaceName ?? "the workspace";
      return {
        category: "workspace", severity: "warning", priority: "normal",
        title: `${who} declined your invitation to join ${target}`,
        body: `The invitation to join ${target}${role === null ? "" : ` as ${invitationRoleLabel(role)}`} was declined. `
          + (reason === null ? "No reason given." : `Reason: “${reason}”`),
        // Sent to the INVITER (089), so it opens the workspace's own
        // invitations list, not the invitee's Invitations section.
        actionLabel: "View invitation",
        actionPath: invitationId === undefined ? SENT_INVITATIONS_PATH : sentInvitationPath(invitationId),
        why: "You were sent this because someone declined an invitation you sent. It was not emailed.",
        inAppOnly: true,
        invitationDecline: {
          invitationId: invitationId ?? null,
          invitee: who,
          reason,
          workspaceName,
          workspaceId: row.workspaceId,
        },
      };
    }

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

    // ── 086. Contact requests — all three are in-app only (no email). ──────
    case "CONTACT_REQUEST_RECEIVED": {
      const input = row.templateInput;
      const requester = str(input, "requesterDisplayName") ?? "A colleague";
      const requestTitle = str(input, "requestTitle");
      const kind = REQUEST_KIND_PHRASE[str(input, "requestKind") ?? ""];
      const due = formatDue(str(input, "dueAt"));
      const docTitle = str(input, "documentTitle");
      const message = str(input, "message");
      const where = workspaceName === null ? "" : ` in ${workspaceName}`;
      const parts = [
        requestTitle === null ? null : `“${requestTitle}”${where}.`,
        docTitle === null ? null : `Document: ${docTitle}.`,
        due === null ? null : `Due ${due}.`,
        message === null ? null : `“${message}”`,
      ].filter((part): part is string => part !== null);
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: `${requester} ${kind?.asked ?? "sent you a request"}`,
        body: parts.length > 0 ? parts.join(" ") : `Open it in Contacts → Requests From Contacts${where}.`,
        actionLabel: "Open request",
        actionPath: contactRequestPath("received", "pending", row.sourceId),
        why: "You were sent this because a member of your workspace asked something of you. "
          + "It was not emailed.",
        inAppOnly: true,
      };
    }

    case "CONTACT_REQUEST_COMPLETED":
    case "CONTACT_REQUEST_DECLINED": {
      const input = row.templateInput;
      const responder = str(input, "responderDisplayName") ?? "Your contact";
      const requestTitle = str(input, "requestTitle");
      const kind = REQUEST_KIND_PHRASE[str(input, "requestKind") ?? ""];
      const reason = str(input, "reason");
      const completed = row.type === "CONTACT_REQUEST_COMPLETED";
      const subject = requestTitle === null ? "your request" : `“${requestTitle}”`;
      const where = workspaceName === null ? "" : ` in ${workspaceName}`;
      return {
        category: "my-actions",
        severity: completed ? "success" : "warning",
        priority: "normal",
        title: completed ? `${responder} completed ${subject}` : `${responder} declined ${subject}`,
        body: completed
          ? `Your request for ${kind?.noun ?? "a document"}${where} is complete.`
          : `Your request for ${kind?.noun ?? "a document"}${where} was declined. ${reason === null ? "No reason given." : `Reason: “${reason}”`}`,
        actionLabel: "View request",
        actionPath: contactRequestPath("sent", completed ? "approved" : "rejected", row.sourceId),
        why: "You were sent this because you asked a contact for something and they answered.",
        inAppOnly: true,
      };
    }

    // ── 087. Document sharing — all six are in-app only (no email). ─────────
    case "DOCUMENT_SHARE_RECEIVED": {
      const sharer = str(row.templateInput, "sharerDisplayName") ?? "Someone";
      const where = workspaceName === null ? "" : ` (${workspaceName})`;
      return {
        category: "documents", severity: "info", priority: "high",
        title: documentTitle === null
          ? `${sharer} shared a completed document with you`
          : `${sharer} shared “${documentTitle}” with you`,
        body: `${sharer}${where} shared a completed document with you. Accept it in Shared With Me to open it.`,
        actionLabel: "Open Shared With Me",
        actionPath: sharedWithMePath("pending"),
        why: "You were sent this because a completed document was shared with your email address. It was not emailed.",
        inAppOnly: true,
      };
    }

    case "DOCUMENT_SHARE_ACCEPTED":
    case "DOCUMENT_SHARE_REJECTED": {
      const responder = str(row.templateInput, "responderDisplayName") ?? "The recipient";
      const accepted = row.type === "DOCUMENT_SHARE_ACCEPTED";
      const subject = documentTitle === null ? "the document you shared" : `“${documentTitle}”`;
      return {
        category: "documents",
        severity: accepted ? "success" : "info",
        priority: "normal",
        title: `${responder} ${accepted ? "accepted" : "rejected"} ${subject}`,
        body: accepted
          ? `${responder} can now open ${subject}.`
          : `${responder} rejected ${subject}. They do not have access.`,
        actionLabel: "Open Shared By Me",
        actionPath: sharedByMePath("approved"),
        why: "You were sent this because someone answered a document you shared. It was not emailed.",
        inAppOnly: true,
      };
    }

    case "DOCUMENT_ACCESS_REQUESTED": {
      const requester = str(row.templateInput, "requesterDisplayName") ?? "Someone";
      const email = str(row.templateInput, "requesterEmail");
      const note = str(row.templateInput, "note");
      const subject = documentTitle === null ? "a completed document" : `“${documentTitle}”`;
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: `${requester} asked for access to ${subject}`,
        body: `${requester}${email === null ? "" : ` (${email})`} asked for access to ${subject}.${note === null ? "" : ` Their note: “${note}”`}`,
        actionLabel: "Review the request",
        actionPath: sharedByMePath("pending"),
        why: "You were sent this because someone asked to open a completed document you can share. It was not emailed.",
        inAppOnly: true,
      };
    }

    case "DOCUMENT_ACCESS_APPROVED":
    case "DOCUMENT_ACCESS_REJECTED": {
      const approved = row.type === "DOCUMENT_ACCESS_APPROVED";
      const subject = documentTitle === null ? "a completed document" : `“${documentTitle}”`;
      return {
        category: "documents",
        severity: approved ? "success" : "info",
        priority: "normal",
        title: approved
          ? `Your access request for ${subject} was approved`
          : `Your access request for ${subject} was not approved`,
        body: approved
          ? `You can now open ${subject} in Shared With Me.`
          : `The owner did not approve your request for ${subject}.`,
        actionLabel: "Open Shared With Me",
        actionPath: sharedWithMePath(approved ? "accepted" : "rejected"),
        why: "You were sent this because you asked for access to a completed document. It was not emailed.",
        inAppOnly: true,
      };
    }

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
    deliveryClass: p.inAppOnly === true ? "in-app-only" : "email-and-in-app",
    isDismissible: true,
    hasAction: p.actionPath !== null,
    actionLabel: p.actionLabel,
    actionPath: p.actionPath,
    whyReceivedReason: p.why,
    // The account's own state, persisted server-side (090). A backend that
    // predates it sends neither flag, which reads as unread.
    status: row.dismissed === true ? "dismissed" : row.read === true ? "read" : "unread",
    ...(p.invitationDecline === undefined ? {} : { invitationDecline: p.invitationDecline }),
  };
}

class RealNotificationFeedService {
  /**
   * The account's feed, INCLUDING dismissed notices: the notification
   * center shows them in their own view and must be able to restore them.
   * (The endpoint hides them by default.)
   */
  async list(): Promise<NotificationRecord[]> {
    const response = await apiRequest<FeedResponse>("/me/notifications?includeDismissed=true");
    return response.notifications.map(toRecord);
  }

  /**
   * Persists this account's state for the given notices (090). Ids that are
   * not the account's own are ignored by the server. Sent in chunks of the
   * server's bound, so "mark all read" on a long feed still lands.
   */
  async setState(ids: readonly string[], change: NotificationStateChange): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    if (change.read === undefined && change.dismissed === undefined) return;
    for (let at = 0; at < unique.length; at += MAX_STATE_IDS_PER_CALL) {
      await apiRequest<void>("/me/notifications/state", {
        method: "POST",
        body: { ids: unique.slice(at, at + MAX_STATE_IDS_PER_CALL), ...change },
      });
    }
  }

  /** Marks the notices read (or unread with `read = false`). */
  markRead(ids: readonly string[], read = true): Promise<void> {
    return this.setState(ids, { read });
  }

  /** Dismisses the notices (or restores them with `dismissed = false`). */
  dismiss(ids: readonly string[], dismissed = true): Promise<void> {
    return this.setState(ids, { dismissed });
  }
}

export const realNotificationFeedService = new RealNotificationFeedService();
