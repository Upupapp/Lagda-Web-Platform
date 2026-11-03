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

/** A list of non-empty strings from an unknown bag. Anything else is an empty list. */
function strings(input: unknown, key: string): string[] {
  if (typeof input !== "object" || input === null) return [];
  const value = (input as Record<string, unknown>)[key];
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
}

/** A finite number field from an unknown bag, or null. */
function num(input: unknown, key: string): number | null {
  if (typeof input !== "object" || input === null) return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** "Ana Reyes", "Ana Reyes and Ben Lim", "Ana Reyes, Ben Lim and 3 more". */
function waitingOnPhrase(names: readonly string[], more: number): string {
  if (names.length === 0) return more > 1 ? `${String(more)} participants` : "A participant";
  if (more > 0) return `${names.join(", ")} and ${String(more)} more`;
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]!}`;
}

/** A boolean field from an unknown bag, or null. */
function bool(input: unknown, key: string): boolean | null {
  if (typeof input !== "object" || input === null) return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : null;
}

/** The product's words for the reason a participant chose when declining (110). */
const DECLINE_REASON_PHRASE: Readonly<Record<string, string>> = {
  "not-agree": "they do not agree with the document",
  "not-intended": "they are not the intended participant",
  "needs-correction": "the document needs correction",
  "cannot-complete": "they cannot complete this request",
  other: "another reason",
};

/** A sender's notice about one request opens that request's Participants. */
function participantsPath(list: string, requestId: string | null): string {
  return requestId === null
    ? `/app/documents?list=${list}`
    : `/app/documents?list=${list}&participants=${encodeURIComponent(requestId)}`;
}

/** The page that lists a workspace's join requests, for its owners. */
const JOIN_REQUESTS_PATH = "/app/invitations?view=sent&panel=requests";
/** Documents, with the Recycle Bin opened. */
const RECYCLE_BIN_PATH = "/app/documents?bin=open";

interface Presentation {
  readonly category: NotificationCategory;
  readonly severity: NotificationSeverity;
  readonly priority: NotificationPriority;
  readonly title: string;
  readonly body: string;
  readonly actionLabel: string | null;
  readonly actionPath: string | null;
  /** 131. A second way forward (an eNotary notice to a notary: the request alone on the desk). */
  readonly secondaryActionLabel?: string;
  readonly secondaryActionPath?: string;
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
        // The request id. The documents page opens that request's viewer.
        actionPath: `/app/documents?list=completed&open=${encodeURIComponent(row.sourceId)}`,
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
    // ── 091. Contact connections — both in-app only (no email). ───────────
    case "CONTACT_CONNECTION_REQUESTED": {
      const requester = str(row.templateInput, "requesterDisplayName") ?? "Someone";
      const from = str(row.templateInput, "workspaceName");
      return {
        category: "workspace", severity: "info", priority: "high",
        title: `${requester} wants to add you as a contact`,
        body: `${requester}${from === null ? "" : ` (${from})`} asked to add you as a contact on LAGDA. Accept to add each other, or decline — they are not told.`,
        actionLabel: "Review request",
        actionPath: "/app/contacts/pending",
        why: "You were sent this because someone found your LAGDA account by its exact email. You can turn that off in My Settings › Data & Privacy.",
        inAppOnly: true,
      };
    }

    case "CONTACT_CONNECTION_ACCEPTED": {
      const responder = str(row.templateInput, "responderDisplayName") ?? "Someone";
      const contactId = str(row.templateInput, "contactId");
      return {
        category: "workspace", severity: "success", priority: "normal",
        title: `${responder} accepted your contact request`,
        body: `You and ${responder} are now in each other's contacts.`,
        actionLabel: contactId === null ? "Open contacts" : "View contact",
        actionPath: contactId === null ? "/app/contacts" : `/app/contacts/${encodeURIComponent(contactId)}`,
        why: "You were sent this because you asked this person to add you as a contact.",
        inAppOnly: true,
      };
    }

    // 093. Plans. Emailed too, so none is in-app only.
    case "PLAN_UPGRADE_REQUESTED": {
      const who = str(row.templateInput, "requesterDisplayName") ?? "Someone";
      const plan = str(row.templateInput, "planName") ?? "a paid plan";
      const requestId = str(row.templateInput, "requestId");
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: `${who} asked for the ${plan} plan`,
        body: "A test-mode payment is waiting for you to confirm it. No money was moved.",
        actionLabel: "Review the payment",
        actionPath: requestId === null ? "/app/plan-requests" : `/app/plan-requests/${encodeURIComponent(requestId)}`,
        why: "You were sent this because you confirm plan payments for LAGDA.",
      };
    }

    // 095. A message from the public website, to the LAGDA owner's inbox.
    case "PUBLIC_INQUIRY_RECEIVED": {
      const kind = str(row.templateInput, "kindLabel") ?? "Message";
      const who = str(row.templateInput, "senderName") ?? "A visitor";
      const email = str(row.templateInput, "senderEmail");
      const inquiryId = str(row.templateInput, "inquiryId");
      return {
        category: "my-actions", severity: "info", priority: "normal",
        title: `${kind} from ${who}`,
        body: `${who}${email === null ? "" : ` (${email})`} sent this from the LAGDA website. Open it to read it and reply.`,
        actionLabel: "Open the message",
        actionPath: inquiryId === null ? "/app/inquiries" : `/app/inquiries/${encodeURIComponent(inquiryId)}`,
        why: "You were sent this because this account reads messages from the LAGDA website.",
      };
    }

    case "PLAN_UPGRADE_APPROVED": {
      const plan = str(row.templateInput, "planName") ?? "Your plan";
      const until = str(row.templateInput, "paidUntil");
      return {
        category: "workspace", severity: "success", priority: "normal",
        title: `Your ${plan} plan is active`,
        body: until === null ? "Your payment was confirmed." : `Your payment was confirmed. It runs until ${until}.`,
        actionLabel: "Open Plan & Billing",
        actionPath: "/app/settings/plan",
        why: "You were sent this because you asked to upgrade your plan.",
      };
    }

    case "PLAN_UPGRADE_DECLINED": {
      const plan = str(row.templateInput, "planName") ?? "paid plan";
      return {
        category: "workspace", severity: "warning", priority: "normal",
        title: `Your ${plan} plan payment was not confirmed`,
        body: "You can send your payment details again from Plan & Billing.",
        actionLabel: "Open Plan & Billing",
        actionPath: "/app/settings/plan",
        why: "You were sent this because you asked to upgrade your plan.",
      };
    }

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

    // The inviter is told when their invitation is accepted. Until this, an
    // invitation simply turned "Accepted" on the Sent list and nothing said so.
    case "WORKSPACE_INVITATION_ACCEPTED": {
      const input = row.templateInput;
      const who = str(input, "inviteeDisplayName") ?? str(input, "inviteeName") ?? str(input, "inviteeEmail") ?? "The invitee";
      const role = str(input, "role");
      const invitationId = str(input, "invitationId") ?? undefined;
      const target = workspaceName ?? str(input, "workspaceName") ?? "the workspace";
      return {
        category: "workspace", severity: "success", priority: "normal",
        title: `${who} accepted your invitation to join ${target}`,
        body: `${who} is now a member of ${target}${role === null ? "" : ` as ${invitationRoleLabel(role)}`}.`,
        actionLabel: "View invitation",
        actionPath: invitationId === undefined ? SENT_INVITATIONS_PATH : sentInvitationPath(invitationId),
        why: "You were sent this because you invited this person to the workspace.",
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
        actionPath: "/app/settings/security/sessions",
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
        body: parts.length > 0 ? parts.join(" ") : `Open it in Contacts → Document requests${where}.`,
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
    // ── A document's life: completion for the people who took part, the
    //    Recycle Bin's deletion requests, deletion itself, access given up.
    //    All in-app only. ────────────────────────────────────────────────
    case "DOCUMENT_COMPLETED_FOR_PARTICIPANT": {
      const sharedId = str(row.templateInput, "sharedDocumentId");
      const where = workspaceName === null ? "" : ` from ${workspaceName}`;
      return {
        category: "documents", severity: "success", priority: "normal",
        title: documentTitle === null ? "A document you took part in is complete" : `“${documentTitle}” is complete`,
        body: `Everyone has finished${where}. The signed document is under Shared Documents › Shared with me, where you can view and download it.`,
        actionLabel: "Open the signed document",
        // Opens Shared with me AND the signed document's own panel.
        actionPath: sharedId === null ? sharedWithMePath("accepted") : `${sharedWithMePath("accepted")}&open=${encodeURIComponent(sharedId)}`,
        why: "You were sent this because you took part in this document. It was not emailed.",
        inAppOnly: true,
      };
    }

    case "DOCUMENT_DELETION_REQUESTED": {
      const who = str(row.templateInput, "requesterDisplayName") ?? "A member of your workspace";
      const reason = str(row.templateInput, "reason");
      return {
        category: "my-actions", severity: "warning", priority: "high",
        title: documentTitle === null ? `${who} asked you to delete a document` : `${who} asked you to delete “${documentTitle}”`,
        body: `Only you, the workspace owner, can delete a document permanently. ${reason === null ? "No reason was given." : `Their reason: “${reason}”`} Approve or disapprove it in the Recycle Bin.`,
        actionLabel: "Open the Recycle Bin",
        actionPath: RECYCLE_BIN_PATH,
        why: "You were sent this because you own the workspace this document belongs to.",
        inAppOnly: true,
      };
    }

    case "DOCUMENT_MOVED_TO_BIN": {
      const who = str(row.templateInput, "actorDisplayName") ?? "A member of your workspace";
      const reason = str(row.templateInput, "reason");
      const subject = documentTitle === null ? "a document" : `“${documentTitle}”`;
      return {
        category: "documents", severity: "warning", priority: "normal",
        title: "A document was moved to the Recycle Bin",
        body: `${who} moved ${subject} to the Recycle Bin.${reason === null ? "" : ` Reason: ${reason}`}`,
        actionLabel: "Open the Recycle Bin",
        actionPath: RECYCLE_BIN_PATH,
        why: "You were sent this because you own the workspace this document belongs to.",
        inAppOnly: true,
      };
    }

    case "DOCUMENT_DELETION_APPROVED":
    case "DOCUMENT_DELETION_DISAPPROVED": {
      const owner = str(row.templateInput, "ownerDisplayName") ?? "The workspace owner";
      const approved = row.type === "DOCUMENT_DELETION_APPROVED";
      const subject = documentTitle === null ? "the document" : `“${documentTitle}”`;
      return {
        category: "documents", severity: approved ? "success" : "info", priority: "normal",
        title: approved ? `${owner} approved deleting ${subject}` : `${owner} disapproved deleting ${subject}`,
        body: approved
          ? "The document was permanently deleted."
          : "The document was not deleted. It is still in the Recycle Bin, where you can restore it.",
        actionLabel: approved ? "Open Documents" : "Open the Recycle Bin",
        actionPath: approved ? "/app/documents" : RECYCLE_BIN_PATH,
        why: "You were sent this because you asked the workspace owner to delete this document.",
        inAppOnly: true,
      };
    }

    case "DOCUMENT_DELETED": {
      const by = str(row.templateInput, "deletedByDisplayName") ?? "The owner";
      const noticeId = str(row.templateInput, "deletedDocumentId");
      const reason = str(row.templateInput, "reason");
      const where = workspaceName === null ? "" : ` of ${workspaceName}`;
      return {
        category: "documents", severity: "warning", priority: "normal",
        title: documentTitle === null ? `${by} deleted a document you had access to` : `${by} deleted “${documentTitle}”`,
        body: `The owner${where} permanently deleted this document. It can no longer be opened. ${reason === null ? "" : `Reason: “${reason}”`}`.trim(),
        actionLabel: "View details",
        actionPath: noticeId === null ? "/app/documents" : `/app/documents?deletedNotice=${encodeURIComponent(noticeId)}`,
        why: "You were sent this because you had access to this document.",
        inAppOnly: true,
      };
    }

    case "DOCUMENT_ACCESS_REMOVED": {
      const person = str(row.templateInput, "personDisplayName") ?? str(row.templateInput, "personEmail") ?? "Someone";
      const message = str(row.templateInput, "message");
      const subject = documentTitle === null ? "a document" : `“${documentTitle}”`;
      return {
        category: "documents", severity: "info", priority: "normal",
        title: `${person} removed their access to ${subject}`,
        body: `They can no longer open it. ${message === null ? "No message was left." : `Their message: “${message}”`}`,
        actionLabel: "Open Shared by me",
        actionPath: sharedByMePath(),
        why: "You were sent this because you own the workspace this document belongs to.",
        inAppOnly: true,
      };
    }

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

    // ── 078. Joining a workspace ─────────────────────────────────────────
    case "WORKSPACE_JOIN_REQUESTED": {
      const who = str(row.templateInput, "requesterName") ?? "Someone";
      const email = str(row.templateInput, "requesterEmail");
      const workspace = str(row.templateInput, "workspaceName") ?? "your workspace";
      const reason = str(row.templateInput, "reason");
      return {
        category: "workspace", severity: "info", priority: "high",
        title: `${who} asked to join ${workspace}`,
        body: `${who}${email === null ? "" : ` (${email})`} is waiting for your approval.${reason === null ? "" : ` Their note: “${reason}”`}`,
        actionLabel: "Review the request",
        actionPath: JOIN_REQUESTS_PATH,
        why: "You were sent this because you manage this workspace's members.",
      };
    }

    case "WORKSPACE_JOIN_DECIDED": {
      const workspace = str(row.templateInput, "workspaceName") ?? "the workspace";
      const approved = bool(row.templateInput, "approved") === true;
      return {
        category: "workspace", severity: approved ? "success" : "info", priority: "normal",
        title: approved ? `You are now a member of ${workspace}` : `Your request to join ${workspace} was declined`,
        body: approved
          ? `Your request was approved. ${workspace} is in your workspace list now.`
          : `A manager of ${workspace} declined your request. You can ask again later.`,
        actionLabel: approved ? "Open the workspace" : "Open Invitations",
        actionPath: approved ? "/app/workspace" : "/app/invitations",
        why: "You were sent this because you asked to join this workspace.",
      };
    }

    case "WORKSPACE_JOIN_LINK": {
      const workspace = str(row.templateInput, "workspaceName") ?? "a workspace";
      const sender = str(row.templateInput, "senderDisplayName") ?? "Someone";
      return {
        category: "workspace", severity: "info", priority: "normal",
        title: `${sender} sent you a link to join ${workspace}`,
        body: `Open the link in the email to ask to join ${workspace}.`,
        actionLabel: "Open Invitations",
        actionPath: "/app/invitations",
        why: "You were sent this because a join link was emailed to your address.",
      };
    }

    // ── Documents sent to this account ─────────────────────────────────
    case "SIGNING_INVITATION": {
      const title = str(row.templateInput, "documentTitle") ?? "A document";
      const sender = str(row.templateInput, "senderDisplayName") ?? "Someone";
      const view = str(row.templateInput, "accessKind") === "view";
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: view ? `${sender} shared ${title} with you` : `${title} is waiting for your signature`,
        body: view
          ? `${sender} sent you ${title} to read. Open the link in the email to view it.`
          : `${sender} sent you ${title} to sign. It is under Needs your signature.`,
        actionLabel: view ? "Open Documents" : "Open Needs your signature",
        actionPath: view ? "/app/documents?list=others" : "/app/documents?list=to-sign",
        why: "You were sent this because the document was sent to your email address.",
      };
    }

    // 096. The in-app side of a signing invitation, to the account that holds
    // the address (decision 4): the email alone left a new account unaware.
    case "DOCUMENT_WAITING_FOR_SIGNATURE": {
      const title = str(row.templateInput, "documentTitle") ?? "A document";
      const sender = str(row.templateInput, "senderDisplayName") ?? "Someone";
      const workspace = str(row.templateInput, "workspaceName");
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: `${title} is waiting for your signature`,
        body: `${sender}${workspace === null ? "" : ` (${workspace})`} sent you ${title} to sign. Open Needs your signature to continue.`,
        actionLabel: "Open Needs your signature",
        actionPath: "/app/documents?list=to-sign",
        why: "You were sent this because the document was sent to the email address of this account.",
        inAppOnly: true,
      };
    }

    // 097. In-app only. To the sender: a signing link ended on a request
    // still waiting. Nothing is renewed; the Participants panel sends a new one.
    case "SIGNING_LINK_LAPSED": {
      const title = documentTitle ?? "a document you sent";
      const names = strings(row.templateInput, "waitingOn");
      const more = num(row.templateInput, "waitingOnMore") ?? 0;
      const who = waitingOnPhrase(names, more);
      const several = names.length + more > 1;
      const requestId = str(row.templateInput, "signingRequestId");
      return {
        category: "documents", severity: "warning", priority: "high",
        title: `A signing link for ${title} has ended`,
        body: `${who} ${several ? "have" : "has"} not acted on ${title}, and the signing link sent to ${several ? "them" : "that person"} no longer works. `
          + "Nothing is sent again automatically. Open Participants to send a new link.",
        actionLabel: "Open participants",
        actionPath: requestId === null
          ? "/app/documents?list=sent"
          : `/app/documents?list=sent&participants=${encodeURIComponent(requestId)}`,
        why: "You were sent this because you sent this document and a signing link for it ended before everyone acted.",
        inAppOnly: true,
      };
    }

    // 105. In-app only. To the sender: a participant used up the identity
    // check's attempts. Nothing is decided for them; the document's
    // Participants is where they can be allowed another way, so the notice
    // opens it directly, as the lapsed-link notice does.
    case "IDENTITY_CHECK_LOCKED": {
      const who = str(row.templateInput, "participantName") ?? "A participant";
      const subject = documentTitle === null ? "a document you sent" : `“${documentTitle}”`;
      const requestId = str(row.templateInput, "signingRequestId");
      return {
        category: "documents", severity: "warning", priority: "high",
        title: "A participant could not pass the identity check",
        body: `${who} could not pass the identity check for ${subject} after 3 attempts. `
          + "Open Participants to allow a lighter method for them.",
        actionLabel: "Open participants",
        actionPath: requestId === null
          ? "/app/documents?list=sent"
          : `/app/documents?list=sent&participants=${encodeURIComponent(requestId)}`,
        why: "You were sent this because you sent this document and asked this participant for an identity check.",
        inAppOnly: true,
      };
    }

    // In-app only. To the sender: a participant passed the identity check
    // under a name that is not the one on the document. The name read from
    // the ID is not in the notice; Participants is where it is shown and
    // where the sender decides, so the notice opens it directly.
    case "IDENTITY_NAME_MISMATCH": {
      const who = str(row.templateInput, "participantName") ?? "A participant";
      const subject = documentTitle === null ? "a document you sent" : `“${documentTitle}”`;
      const requestId = str(row.templateInput, "signingRequestId");
      return {
        category: "documents", severity: "warning", priority: "high",
        title: "The name on a participant's ID does not match",
        body: `${who} verified their identity for ${subject}, but the name on their ID is different from `
          + "the name on the document. Open Participants to decide.",
        actionLabel: "Open participants",
        actionPath: requestId === null
          ? "/app/documents?list=sent"
          : `/app/documents?list=sent&participants=${encodeURIComponent(requestId)}`,
        why: "You were sent this because you sent this document and asked this participant for an identity check.",
        inAppOnly: true,
      };
    }

    // 109. To the sender, by email and in the app: every signature is in and
    // the final document could not be produced. Participants is where Try
    // again is, so the notice opens it.
    case "SIGNING_COMPLETION_FAILED": {
      const subject = documentTitle === null ? "A document you sent" : `“${documentTitle}”`;
      return {
        category: "documents", severity: "warning", priority: "high",
        title: `${subject} could not be finalized`,
        body: `Everyone has signed ${documentTitle === null ? "it" : `“${documentTitle}”`}, but the final document `
          + "could not be produced. No signature was lost and nobody needs to sign again. Open it and choose Try again.",
        actionLabel: "Open participants",
        actionPath: participantsPath("sent", str(row.templateInput, "signingRequestId")),
        why: "You were sent this because you sent this document and its final document could not be produced.",
      };
    }

    // 110. To the sender, by email and in the app: a participant declined,
    // which ends the request. The reason is a category, never free text.
    case "SIGNING_DECLINED": {
      const who = str(row.templateInput, "participantName") ?? "A participant";
      const subject = documentTitle === null ? "a document you sent" : `“${documentTitle}”`;
      const reason = DECLINE_REASON_PHRASE[str(row.templateInput, "reason") ?? ""];
      return {
        category: "documents", severity: "warning", priority: "high",
        title: `${who} declined ${subject}`,
        body: `${who} declined to sign ${subject}${reason === undefined ? "" : `, because ${reason}`}. `
          + "The request has ended and nobody else can sign it.",
        actionLabel: "Open participants",
        actionPath: participantsPath("declined", str(row.templateInput, "signingRequestId")),
        why: "You were sent this because you sent this document and a participant declined it.",
      };
    }

    // 110. Emailed to the sender. The account feed is not expected to list
    // it, but a row that arrives reads as itself rather than as "unknown".
    case "SIGNING_EXPIRED": {
      const subject = documentTitle === null ? "A document you sent" : `“${documentTitle}”`;
      return {
        category: "documents", severity: "warning", priority: "normal",
        title: `${subject} has expired`,
        body: "The deadline you set passed before everyone signed. The request has ended and its signing links no longer work.",
        actionLabel: "Open participants",
        actionPath: participantsPath("declined", str(row.templateInput, "signingRequestId")),
        why: "You were sent this because you sent this document and set its expiration date.",
      };
    }

    // 110. To a participant, by email, and here when their verified address
    // is this account's. Each says one fact; the link it opens is their own
    // documents, never the signing link, which no longer works.
    case "SIGNING_DECLINED_FOR_PARTICIPANT":
    case "SIGNING_CANCELLED_FOR_PARTICIPANT":
    case "SIGNING_EXPIRED_FOR_PARTICIPANT": {
      const title = documentTitle ?? "A document sent to you";
      const sender = str(row.templateInput, "senderDisplayName") ?? "The sender";
      const what = row.type === "SIGNING_DECLINED_FOR_PARTICIPANT"
        ? { title: `${title} was declined`, body: `A participant declined ${title}, so it will not be completed and can no longer be signed.` }
        : row.type === "SIGNING_CANCELLED_FOR_PARTICIPANT"
          ? { title: `${title} was cancelled`, body: `${sender} cancelled ${title}. It can no longer be signed.` }
          : { title: `${title} has expired`, body: `The deadline for ${title} has passed. It can no longer be signed.` };
      return {
        category: "documents", severity: "info", priority: "normal",
        title: what.title,
        body: `${what.body} Nothing more is needed from you.`,
        actionLabel: "Open Documents",
        actionPath: "/app/documents?list=to-sign",
        why: "You were sent this because this document was sent to your email address.",
      };
    }

    // 110. To a participant: the sender lifted what was holding them (an
    // identity check), so they may continue. Their own documents list, where
    // Continue signing opens it with a fresh code.
    case "SIGNING_ACCESS_RESTORED": {
      const title = documentTitle ?? "A document";
      const sender = str(row.templateInput, "senderDisplayName") ?? "The sender";
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: `You can now continue with ${title}`,
        body: `${sender} has let you continue with ${title}. It is under Needs your signature.`,
        actionLabel: "Open Needs your signature",
        actionPath: "/app/documents?list=to-sign",
        why: "You were sent this because the sender changed what this document asks of you.",
      };
    }

    // 111. A reminder to a participant who has not acted, listed here too
    // when their verified address is this account's.
    case "SIGNING_REMINDER": {
      const title = documentTitle ?? "A document";
      const sender = str(row.templateInput, "senderDisplayName") ?? "Someone";
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: `Reminder: ${title} is waiting for you`,
        body: `${sender} sent you ${title} and it is still waiting for you. It is under Needs your signature.`,
        actionLabel: "Open Needs your signature",
        actionPath: "/app/documents?list=to-sign",
        why: "You were sent this because the document is waiting for you and the sender's reminders are on.",
      };
    }

    case "FINAL_COPY_AVAILABLE": {
      const title = str(row.templateInput, "documentTitle") ?? "A document you signed";
      const sender = str(row.templateInput, "senderDisplayName") ?? "the sender";
      return {
        category: "documents", severity: "success", priority: "normal",
        title: `Your signed copy of ${title} is ready`,
        body: `Everyone has signed ${title}, sent by ${sender}. Your copy is under Signed by me.`,
        actionLabel: "Open Signed by me",
        actionPath: "/app/documents?list=signed",
        why: "You were sent this because you signed this document.",
      };
    }

    case "DOCUMENT_UPLOAD_REQUESTED": {
      const title = str(row.templateInput, "requestTitle") ?? "A document";
      const who = str(row.templateInput, "requesterDisplayName") ?? "Someone";
      const note = str(row.templateInput, "note");
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: `${who} asked you to upload ${title}`,
        body: `${who} needs a document from you: ${title}.${note === null ? "" : ` Their note: “${note}”`}`,
        actionLabel: "Open Upload requests",
        actionPath: "/app/upload-requests",
        why: "You were sent this because the request was assigned to you.",
      };
    }

    case "CONTACT_REQUEST_EMAILED": {
      const title = str(row.templateInput, "requestTitle") ?? "A request";
      const who = str(row.templateInput, "requesterDisplayName") ?? "Someone";
      return {
        category: "my-actions", severity: "info", priority: "normal",
        title: `${who} sent you a request: ${title}`,
        body: `${who} asked you for something by email. Open the link in that email to answer.`,
        actionLabel: "Open Requests",
        actionPath: "/app/contacts/requests",
        why: "You were sent this because a request was emailed to your address.",
      };
    }

    // ── Emailed codes: the code itself is only ever in the email ───────
    case "VERIFICATION_ACCESS_CODE":
    case "SHARED_DOCUMENT_ACCESS_CODE": {
      const title = str(row.templateInput, "documentTitle") ?? "a document";
      return {
        category: "security", severity: "info", priority: "normal",
        title: `A code was emailed to you for ${title}`,
        body: "Enter the 6-digit code from the email to open the document. It expires soon. If you did not ask for it, ignore the email.",
        actionLabel: "Verify a Document",
        actionPath: "/app/verify",
        why: "You were sent this because someone entered your address to open this document.",
        inAppOnly: true,
      };
    }

    // ── Notary on-ramp (phase 1). Email and in-app. ─────────────────────────
    // To the client: where their request to a notary stands. The notice opens
    // that request's page (the request's id is the notice's source).
    case "ENOTARY_INVITATION_CLAIMED":
    case "ENOTARY_REQUEST_ACCEPTED":
    case "ENOTARY_REQUEST_DECLINED":
    case "ENOTARY_INVITATION_EXPIRING":
    case "ENOTARY_INVITATION_EXPIRED": {
      const notary = str(row.templateInput, "notaryName") ?? "The notary";
      const requestId = str(row.templateInput, "invitationId") ?? str(row.templateInput, "requestId") ?? row.sourceId;
      const path = `/app/enotary/requests/${encodeURIComponent(requestId)}`;
      const base = { category: "my-actions", priority: "high", actionLabel: "Open request", actionPath: path } as const;
      const why = "You were sent this because you asked a notary to take a request on LAGDA eNotary.";
      if (row.type === "ENOTARY_INVITATION_CLAIMED") {
        return {
          ...base, severity: "info", title: `${notary} passed the identity check`,
          body: `${notary} opened your request and passed the ID and face check. Now it waits for their answer.`, why,
        };
      }
      if (row.type === "ENOTARY_REQUEST_ACCEPTED") {
        return {
          ...base, severity: "success", title: `${notary} accepted your request`,
          body: `${notary} accepted your request. The online session opens when LAGDA eNotary does; nothing is booked or notarized yet.`, why,
        };
      }
      if (row.type === "ENOTARY_REQUEST_DECLINED") {
        return {
          ...base, severity: "warning", title: `${notary} declined your request`,
          body: `${notary} declined your request. You can ask another notary from the Notary Directory.`, why,
        };
      }
      if (row.type === "ENOTARY_INVITATION_EXPIRING") {
        return {
          ...base, severity: "warning", title: `Your request to ${notary} has a day left`,
          body: `Your request to ${notary} ends in about 24 hours. Give the notary the link or the card now, or renew it after it ends.`, why,
        };
      }
      return {
        ...base, severity: "warning", title: `Your request to ${notary} has expired`,
        body: `Nobody answered your request to ${notary} in time and its link no longer works. Open it to renew it with a new link.`, why,
      };
    }

    // To the notary: a request for them, or the outcome of their application.
    case "ENOTARY_REQUEST_RECEIVED": {
      const client = str(row.templateInput, "clientName");
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: client === null ? "A client sent you a request" : `${client} sent you a request`,
        body: "A LAGDA client asked you to take a request on LAGDA eNotary. Open your notary desk to see it, and answer once your application is approved.",
        actionLabel: "Open the notary desk", actionPath: "/app/enotary/desk",
        why: "You were sent this because a client chose you in the Notary Directory.",
      };
    }
    case "ENOTARY_APPLICATION_APPROVED":
      return {
        category: "my-actions", severity: "success", priority: "high",
        title: "Your notary application was approved",
        body: "A LAGDA reviewer approved your application. You can now accept or decline the requests clients send you.",
        actionLabel: "Open the notary desk", actionPath: "/app/enotary/desk",
        why: "You were sent this because you applied to receive notary requests on LAGDA.",
      };
    case "ENOTARY_APPLICATION_REJECTED":
      return {
        category: "my-actions", severity: "warning", priority: "high",
        title: "Your notary application was not approved",
        body: "A LAGDA reviewer did not approve your application. Open it to read the reason, correct it and send it again.",
        actionLabel: "Open my application", actionPath: "/app/enotary/apply",
        why: "You were sent this because you applied to receive notary requests on LAGDA.",
      };

    // Paying the notary. The notary is told proof arrived, to check against their
    // own bank or e-wallet app; the client is told it was confirmed or not found.
    case "ENOTARY_PAYMENT_PROOF_SENT": {
      const client = str(row.templateInput, "otherName");
      const amount = str(row.templateInput, "amount");
      const requestId = enotaryRequestOf(row);
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: client === null ? "A client says they paid you" : `${client} says they paid you`,
        body: `${client ?? "A client"} sent proof of a payment${amount === null ? "" : ` of ${amount}`}. Look for the transfer in your own bank or e-wallet app, then confirm it on your notary desk.`,
        ...(requestId === null
          ? { actionLabel: "Open the notary desk", actionPath: "/app/enotary/desk" }
          : { actionLabel: "Open the request", actionPath: notaryRequestPath(requestId), secondaryActionLabel: ON_THE_DESK, secondaryActionPath: notaryDeskFilteredPath(requestId) }),
        why: "You were sent this because a client you accepted says they paid your fee.",
      };
    }
    case "ENOTARY_PAYMENT_CONFIRMED":
    case "ENOTARY_PAYMENT_NOT_RECEIVED": {
      const notary = str(row.templateInput, "otherName") ?? "The notary";
      const amount = str(row.templateInput, "amount");
      const requestId = str(row.templateInput, "invitationId") ?? str(row.templateInput, "requestId") ?? row.sourceId;
      const path = `/app/enotary/requests/${encodeURIComponent(requestId)}`;
      const why = "You were sent this because you told LAGDA you paid a notary's fee.";
      if (row.type === "ENOTARY_PAYMENT_CONFIRMED") {
        return {
          category: "my-actions", severity: "success", priority: "high",
          title: `${notary} confirmed your payment`,
          body: `${notary} confirmed your payment${amount === null ? "" : ` of ${amount}`}. Open your request to see the next step.`,
          actionLabel: "Open request", actionPath: path, why,
        };
      }
      const note = str(row.templateInput, "reason");
      return {
        category: "my-actions", severity: "warning", priority: "high",
        title: `${notary} did not receive your payment`,
        body: `${notary} could not find your payment${amount === null ? "" : ` of ${amount}`}${note === null ? "." : `: ${note}`} Check the reference number and send it again.`,
        actionLabel: "Open request", actionPath: path, why,
      };
    }

    // The session and what follows it (117). The other party's name, the request, and a short detail.
    case "ENOTARY_SESSION_DOCUMENT_ADDED":
    case "ENOTARY_SESSION_OPENED":
    case "ENOTARY_SESSION_CANCELLED":
    case "ENOTARY_SESSION_REOPEN_REQUESTED":
    case "ENOTARY_SESSION_REOPENED":
    case "ENOTARY_NOTARIZED":
    case "ENOTARY_CTC_REQUESTED":
    case "ENOTARY_CTC_QUOTED":
    case "ENOTARY_CTC_DECLINED":
    case "ENOTARY_CTC_PROOF_SENT":
    case "ENOTARY_CTC_PAID":
    case "ENOTARY_CTC_FULFILLED": {
      const other = str(row.templateInput, "otherName") ?? "The other person";
      const detail = str(row.templateInput, "detail");
      const requestId = str(row.templateInput, "invitationId") ?? str(row.templateInput, "requestId") ?? row.sourceId;
      const toNotary = str(row.templateInput, "to") === "notary"
        || row.type === "ENOTARY_SESSION_DOCUMENT_ADDED" || row.type === "ENOTARY_SESSION_REOPEN_REQUESTED"
        || row.type === "ENOTARY_CTC_REQUESTED" || row.type === "ENOTARY_CTC_PROOF_SENT";
      // 131. A notice to the notary opens that very request on the desk, with the desk filtered to it as a second way.
      const requestPath = toNotary ? notaryRequestPath(requestId) : `/app/enotary/requests/${encodeURIComponent(requestId)}`;
      const onDesk = toNotary ? { secondaryActionLabel: ON_THE_DESK, secondaryActionPath: notaryDeskFilteredPath(requestId) } : {};
      const roomPath = `/app/enotary/room/${encodeURIComponent(requestId)}`;
      const why = toNotary
        ? "You were sent this because a client you accepted took a step in their notary session."
        : "You were sent this because you have a notary session with this notary.";
      switch (row.type) {
        case "ENOTARY_SESSION_DOCUMENT_ADDED":
          return {
            category: "my-actions", severity: "info", priority: "high",
            title: `${other} added the document`, body: `${other} added the document to be notarized. Open the request to read it and open the room when you are ready.`,
            actionLabel: "Open the request", actionPath: requestPath, ...onDesk, why,
          };
        case "ENOTARY_SESSION_OPENED":
          return {
            category: "my-actions", severity: "info", priority: "high",
            title: `${other} opened the room`, body: `${other} is ready for your session. Join now to talk and review the document together.`,
            actionLabel: "Join the session", actionPath: roomPath, why,
          };
        case "ENOTARY_SESSION_CANCELLED":
          return {
            category: "my-actions", severity: "warning", priority: "high",
            title: `${other} called off the session`, body: `${other} called off the notarization session. Nothing was notarized.`,
            actionLabel: toNotary ? "Open the request" : "Open request", actionPath: requestPath, ...onDesk, why,
          };
        // 122. The client asks the notary to open a called-off session again; the notary does. 131: straight to the
        // room (the request page opens the session again by itself), or the request alone on the desk first.
        case "ENOTARY_SESSION_REOPEN_REQUESTED":
          return {
            category: "my-actions", severity: "info", priority: "high",
            title: `${other} asks to continue the session`,
            body: `${other} called off the notarization session earlier and now asks to continue it. Open the session again to go straight to the room, or see the request on your desk first.`,
            actionLabel: "Open the session again and go to the room", actionPath: `${notaryRequestPath(requestId)}?then=reopen`,
            secondaryActionLabel: ON_THE_DESK, secondaryActionPath: notaryDeskFilteredPath(requestId), why,
          };
        case "ENOTARY_SESSION_REOPENED":
          return {
            category: "my-actions", severity: "success", priority: "high",
            title: `${other} opened the session again`,
            body: `${other} opened the called-off session again. Open your request to continue the notarization.`,
            actionLabel: "Open request", actionPath: requestPath, why,
          };
        case "ENOTARY_NOTARIZED":
          return {
            category: "my-actions", severity: "success", priority: "high",
            title: `${other} notarized your document`, body: `${other} recorded the notarial act on your document. Open your request to download it and to ask for certified true copies.`,
            actionLabel: "Open request", actionPath: requestPath, why,
          };
        case "ENOTARY_CTC_REQUESTED":
          return {
            category: "my-actions", severity: "info", priority: "high",
            title: `${other} asked for certified true copies`, body: `${other} asked for certified true copies of a notarized document. Open the request to quote the fee or decline.`,
            actionLabel: "Open the request", actionPath: requestPath, ...onDesk, why,
          };
        case "ENOTARY_CTC_QUOTED":
          return {
            category: "my-actions", severity: "info", priority: "high",
            title: `${other} quoted your copies`, body: `${other} answered your request for certified true copies${detail === null ? "." : `: ${detail}`} Open your request to go on.`,
            actionLabel: "Open request", actionPath: requestPath, why,
          };
        case "ENOTARY_CTC_DECLINED":
          return {
            category: "my-actions", severity: "warning", priority: "high",
            title: `${other} declined your request for copies`, body: `${other} declined your request for certified true copies${detail === null ? "." : `: ${detail}`}`,
            actionLabel: "Open request", actionPath: requestPath, why,
          };
        case "ENOTARY_CTC_PROOF_SENT":
          return {
            category: "my-actions", severity: "info", priority: "high",
            title: `${other} says they paid for the copies`, body: `${other} sent the reference of their payment for the copies. Check your own bank or e-wallet app, then confirm it on the request.`,
            actionLabel: "Open the request", actionPath: requestPath, ...onDesk, why,
          };
        case "ENOTARY_CTC_PAID":
          return {
            category: "my-actions", severity: "success", priority: "high",
            title: `${other} confirmed your payment for the copies`, body: `${other} confirmed your payment. Your copies are being prepared.`,
            actionLabel: "Open request", actionPath: requestPath, why,
          };
        default:
          return {
            category: "my-actions", severity: "success", priority: "high",
            title: "Your certified true copies are ready", body: `${other} issued your certified true copies${detail === null ? "." : `: ${detail}`} Open your request to see them.`,
            actionLabel: "Open request", actionPath: requestPath, why,
          };
      }
    }

    // To a LAGDA reviewer: an application is waiting. Opens that application.
    case "ENOTARY_APPLICATION_SUBMITTED": {
      const applicant = str(row.templateInput, "applicantName") ?? "A notary";
      const userId = str(row.templateInput, "applicantUserId") ?? str(row.templateInput, "userId") ?? row.sourceId;
      return {
        category: "my-actions", severity: "info", priority: "high",
        title: `${applicant} applied to be a notary`,
        body: `${applicant} sent a notary application for review. Open it to compare the name on their ID and read their documents.`,
        actionLabel: "Review the application", actionPath: `/app/admin/notary-applications/${encodeURIComponent(userId)}`,
        why: "You were sent this because your account reviews notary applications.",
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

/** 131. The eNotary request an ENOTARY_* notice is about, from what it carries; null for any other notice. */
function enotaryRequestOf(row: FeedRow): string | null {
  if (!row.type.startsWith("ENOTARY_")) return null;
  return str(row.templateInput, "invitationId") ?? str(row.templateInput, "requestId");
}

/** 131. A notary's eNotary notice opens that request; its second way forward shows the request alone on the desk. */
export const notaryRequestPath = (requestId: string): string => `/app/enotary/desk/${encodeURIComponent(requestId)}`;
export const notaryDeskFilteredPath = (requestId: string): string => `/app/enotary/desk?request=${encodeURIComponent(requestId)}`;
const ON_THE_DESK = "Show it on my desk";

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
    ...(p.secondaryActionLabel === undefined || p.secondaryActionPath === undefined ? {} : { secondaryActionLabel: p.secondaryActionLabel, secondaryActionPath: p.secondaryActionPath }),
    notificationType: row.type,
    ...(enotaryRequestOf(row) === null ? {} : { enotaryRequestId: enotaryRequestOf(row)! }),
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
