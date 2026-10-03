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

/** A boolean field from an unknown bag, or null. */
function bool(input: unknown, key: string): boolean | null {
  if (typeof input !== "object" || input === null) return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : null;
}

/** The page that lists a workspace's join requests, for its owners. */
const JOIN_REQUESTS_PATH = "/app/invitations?view=sent&panel=requests";

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
        body: "A test-mode upgrade request is waiting for your approval. No money was moved.",
        actionLabel: "Review the request",
        actionPath: requestId === null ? "/app/plan-requests" : `/app/plan-requests/${encodeURIComponent(requestId)}`,
        why: "You were sent this because you approve plan upgrades for LAGDA.",
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
        body: until === null ? "Your upgrade was approved." : `Your upgrade was approved. It runs until ${until}.`,
        actionLabel: "Open Plan & Billing",
        actionPath: "/app/settings/plan",
        why: "You were sent this because you asked to upgrade your plan.",
      };
    }

    case "PLAN_UPGRADE_DECLINED": {
      const plan = str(row.templateInput, "planName") ?? "paid plan";
      return {
        category: "workspace", severity: "warning", priority: "normal",
        title: `Your ${plan} plan request was declined`,
        body: "You can send a new request from Plan & Billing.",
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
        actionLabel: "Check a Document",
        actionPath: "/app/verify",
        why: "You were sent this because someone entered your address to open this document.",
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
