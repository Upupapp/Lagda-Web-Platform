// Every notification type the backend can send reads in plain words and
// leads to a page that exists.
//
// Eight types used to fall into a generic "You have a new notification on
// your account" (finding 7), and the signed-document notice linked into the
// demo build's transaction page, which answered "Transaction not found" on
// the live site (finding 6). This walks the whole vocabulary so neither can
// come back unnoticed: a type the feed does not know fails here, and so does
// a link to an address the router does not have.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { realNotificationFeedService } from "../notification-feed.service";
import { getRouteMeta } from "../../../config/routes";

vi.mock("../../backend-flag", () => ({
  USE_REAL_BACKEND: true,
  API_BASE_URL: "https://example.test/api",
}));

// The backend's NOTIFICATION_TYPES (Lagda-Backend, common/ports/notifications.ts),
// each with the template input its producer sends. Kept in step by hand: a
// type added there and not here is exactly what this test is for.
const ROWS: Record<string, Record<string, unknown>> = {
  ACCOUNT_EMAIL_VERIFICATION: { recipientName: "Ana" },
  PASSWORD_RESET: { recipientName: "Ana" },
  WORKSPACE_INVITATION: { recipientName: "Ana", inviterDisplayName: "Ben", workspaceName: "Reyes Law", role: "sender" },
  SIGNING_INVITATION: { recipientName: "Ana", documentTitle: "NDA.pdf", senderDisplayName: "Ben", workspaceName: "Reyes Law" },
  SIGNING_COMPLETED: { recipientName: "Ana", documentTitle: "NDA.pdf" },
  DOCUMENT_UPLOAD_REQUESTED: { recipientName: "Ana", requestTitle: "Valid ID", requesterDisplayName: "Ben", workspaceName: "Reyes Law" },
  FINAL_COPY_AVAILABLE: { recipientName: "Ana", documentTitle: "NDA.pdf", senderDisplayName: "Ben", workspaceName: "Reyes Law" },
  WORKSPACE_JOIN_LINK: { workspaceName: "Reyes Law", senderDisplayName: "Ben" },
  WORKSPACE_JOIN_REQUESTED: { recipientName: "Ana", requesterName: "Jose Cruz", requesterEmail: "jose@example.ph", workspaceName: "Reyes Law" },
  WORKSPACE_JOIN_DECIDED: { recipientName: "Ana", workspaceName: "Reyes Law", approved: true },
  VERIFICATION_ACCESS_CODE: { recipientName: "Ana", documentTitle: "NDA.pdf" },
  CONTACT_REQUEST_RECEIVED: { recipientName: "Ana", requestTitle: "Valid ID", requestKind: "document", requesterDisplayName: "Ben", workspaceName: "Reyes Law", requestId: "cr_1" },
  CONTACT_REQUEST_EMAILED: { recipientName: "Ana", requestTitle: "Valid ID", requestKind: "document", requesterDisplayName: "Ben", workspaceName: "Reyes Law" },
  CONTACT_REQUEST_COMPLETED: { recipientName: "Ana", requestTitle: "Valid ID", requestKind: "document", contactDisplayName: "Jose", workspaceName: "Reyes Law", requestId: "cr_1" },
  CONTACT_REQUEST_DECLINED: { recipientName: "Ana", requestTitle: "Valid ID", requestKind: "document", contactDisplayName: "Jose", workspaceName: "Reyes Law", requestId: "cr_1" },
  DOCUMENT_SHARE_RECEIVED: { recipientName: "Ana", sharerDisplayName: "Ben", workspaceName: "Reyes Law", documentTitle: "NDA.pdf", verificationId: "LAGDA-VER-2026-X" },
  DOCUMENT_SHARE_ACCEPTED: { recipientName: "Ana", responderDisplayName: "Jose", documentTitle: "NDA.pdf", verificationId: "LAGDA-VER-2026-X" },
  DOCUMENT_SHARE_REJECTED: { recipientName: "Ana", responderDisplayName: "Jose", documentTitle: "NDA.pdf", verificationId: "LAGDA-VER-2026-X" },
  DOCUMENT_ACCESS_REQUESTED: { recipientName: "Ana", requesterDisplayName: "Jose", requesterEmail: "jose@example.ph", documentTitle: "NDA.pdf", verificationId: "LAGDA-VER-2026-X", requestId: "dar_1" },
  DOCUMENT_ACCESS_APPROVED: { recipientName: "Ana", documentTitle: "NDA.pdf", verificationId: "LAGDA-VER-2026-X", approved: true },
  DOCUMENT_ACCESS_REJECTED: { recipientName: "Ana", documentTitle: "NDA.pdf", verificationId: "LAGDA-VER-2026-X", approved: false },
  SHARED_DOCUMENT_ACCESS_CODE: { recipientName: "Ana", documentTitle: "NDA.pdf" },
  WORKSPACE_INVITATION_RECEIVED: { recipientName: "Ana", invitationId: "inv_1", workspaceName: "Reyes Law", inviterDisplayName: "Ben", role: "sender", expiresAt: "2026-10-10T00:00:00.000Z" },
  DOCUMENT_COMPLETED_FOR_PARTICIPANT: { recipientName: "Ana", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", sharedDocumentId: "sh_1", signingRequestId: "sr_1", verificationId: "LAGDA-VER-2026-X" },
  DOCUMENT_DELETION_REQUESTED: { recipientName: "Chris", requesterDisplayName: "Ben", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", reason: "Superseded", deletionRequestId: "dr_1", signingRequestId: "sr_1" },
  DOCUMENT_DELETION_APPROVED: { recipientName: "Ben", ownerDisplayName: "Chris", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", deletionRequestId: "dr_1" },
  DOCUMENT_DELETION_DISAPPROVED: { recipientName: "Ben", ownerDisplayName: "Chris", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", deletionRequestId: "dr_1", signingRequestId: "sr_1" },
  DOCUMENT_DELETED: { recipientName: "Ana", deletedByDisplayName: "Chris", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", deletedDocumentId: "dd_1", kind: "completed", reason: "Superseded" },
  DOCUMENT_ACCESS_REMOVED: { recipientName: "Chris", personDisplayName: "Ana", personEmail: "ana@example.ph", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", message: "No longer involved", signingRequestId: "sr_1" },
  DOCUMENT_MOVED_TO_BIN: { recipientName: "Chris", actorDisplayName: "Ben", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", reason: "Superseded", signingRequestId: "sr_1" },
  WORKSPACE_INVITATION_ACCEPTED: { recipientName: "Ben", inviteeDisplayName: "Ana", inviteeEmail: "ana@example.ph", workspaceName: "Reyes Law", invitationId: "inv_1" },
  WORKSPACE_INVITATION_DECLINED: { recipientName: "Ben", inviteeDisplayName: "Ana", inviteeEmail: "ana@example.ph", invitationId: "inv_1" },
  CONTACT_CONNECTION_REQUESTED: { recipientName: "Ana", requesterDisplayName: "Ben", workspaceName: "Reyes Law", connectionId: "cc_1" },
  CONTACT_CONNECTION_ACCEPTED: { recipientName: "Ben", responderDisplayName: "Ana", contactId: "ct_1" },
  PLAN_UPGRADE_REQUESTED: { recipientName: "Chris", requesterDisplayName: "Ana", requesterEmail: "ana@example.ph", planName: "Business", amount: "₱799.00", expiresAt: "9 October 2026", requestId: "pur_1" },
  PLAN_UPGRADE_APPROVED: { recipientName: "Ana", planName: "Business", requestId: "pur_1", paidUntil: "3 November 2026" },
  PLAN_UPGRADE_DECLINED: { recipientName: "Ana", planName: "Business", requestId: "pur_1" },
  DOCUMENT_WAITING_FOR_SIGNATURE: { recipientName: "Ana", documentTitle: "NDA.pdf", senderDisplayName: "Ben", workspaceName: "Reyes Law", signingRequestId: "sr_1" },
  SIGNING_LINK_LAPSED: { recipientName: "Ana", documentTitle: "NDA.pdf", signingRequestId: "sr_1", waitingOn: ["Jose Cruz", "Ben Lim"], waitingOnMore: 0 },
  IDENTITY_CHECK_LOCKED: { recipientName: "Ana", participantName: "Jose Cruz", documentTitle: "NDA.pdf", signingRequestId: "sr_1", participantRecipientId: "srr_1" },
  IDENTITY_NAME_MISMATCH: { recipientName: "Ana", participantName: "Jose Cruz", documentTitle: "NDA.pdf", signingRequestId: "sr_1", participantRecipientId: "srr_1" },
  SIGNING_COMPLETION_FAILED: { recipientName: "Ana", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", signingRequestId: "sr_1" },
  SIGNING_DECLINED: { recipientName: "Ana", participantName: "Jose Cruz", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", reason: "needs-correction", signingRequestId: "sr_1", participantRecipientId: "srr_1" },
  SIGNING_EXPIRED: { recipientName: "Ana", documentTitle: "NDA.pdf", workspaceName: "Reyes Law", signingRequestId: "sr_1" },
  SIGNING_DECLINED_FOR_PARTICIPANT: { recipientName: "Jose", documentTitle: "NDA.pdf", senderDisplayName: "Ben", workspaceName: "Reyes Law", signingRequestId: "sr_1" },
  SIGNING_CANCELLED_FOR_PARTICIPANT: { recipientName: "Jose", documentTitle: "NDA.pdf", senderDisplayName: "Ben", workspaceName: "Reyes Law", signingRequestId: "sr_1" },
  SIGNING_EXPIRED_FOR_PARTICIPANT: { recipientName: "Jose", documentTitle: "NDA.pdf", senderDisplayName: "Ben", workspaceName: "Reyes Law", signingRequestId: "sr_1" },
  SIGNING_ACCESS_RESTORED: { recipientName: "Jose", documentTitle: "NDA.pdf", senderDisplayName: "Ben", workspaceName: "Reyes Law", signingRequestId: "sr_1" },
  SIGNING_REMINDER: { recipientName: "Jose", documentTitle: "NDA.pdf", senderDisplayName: "Ben", workspaceName: "Reyes Law", signingRequestId: "sr_1" },
  PUBLIC_INQUIRY_RECEIVED: { recipientName: "Chris", kindLabel: "Demo request", senderName: "Jose Cruz", senderEmail: "jose@example.ph", inquiryId: "pin_1" },
  // Notary on-ramp (phase 1). The field names are the web app's reading of the
  // contract; each falls back to the notice's source id when it is absent.
  ENOTARY_INVITATION_CLAIMED: { recipientName: "Ben", notaryName: "Ana Maria Cruz", invitationId: "eni_1" },
  ENOTARY_REQUEST_ACCEPTED: { recipientName: "Ben", notaryName: "Ana Maria Cruz", invitationId: "eni_1" },
  ENOTARY_REQUEST_DECLINED: { recipientName: "Ben", notaryName: "Ana Maria Cruz", invitationId: "eni_1" },
  ENOTARY_INVITATION_EXPIRING: { recipientName: "Ben", notaryName: "Ana Maria Cruz", invitationId: "eni_1" },
  ENOTARY_INVITATION_EXPIRED: { recipientName: "Ben", notaryName: "Ana Maria Cruz", invitationId: "eni_1" },
  ENOTARY_REQUEST_RECEIVED: { recipientName: "Ana", clientName: "Ben Lim", invitationId: "eni_1" },
  ENOTARY_APPLICATION_APPROVED: { recipientName: "Ana" },
  ENOTARY_APPLICATION_REJECTED: { recipientName: "Ana" },
  ENOTARY_APPLICATION_SUBMITTED: { recipientName: "Chris", applicantName: "Ana Maria Cruz", applicantUserId: "usr_9" },
  // Paying the notary: the other party's name, the fee as a sentence and the request.
  ENOTARY_PAYMENT_PROOF_SENT: { recipientName: "Ana", otherName: "Ben Lim", invitationId: "eni_1", amount: "PHP 1,500.00" },
  ENOTARY_PAYMENT_CONFIRMED: { recipientName: "Ben", otherName: "Ana Maria Cruz", invitationId: "eni_1", amount: "PHP 1,500.00" },
  ENOTARY_PAYMENT_NOT_RECEIVED: { recipientName: "Ben", otherName: "Ana Maria Cruz", invitationId: "eni_1", amount: "PHP 1,500.00", reason: "No transfer yet" },
};

const GENERIC = /you have a new notification/i;

beforeEach(() => {
  const rows = Object.entries(ROWS).map(([type, templateInput], i) => ({
    id: `nint_${String(i)}`, type, workspaceId: "ws_1", sourceKind: "X", sourceId: `src_${String(i)}`,
    templateInput, createdAt: "2026-10-03T09:00:00.000Z", read: false, dismissed: false,
  }));
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(
    new Response(JSON.stringify({ notifications: rows }), { status: 200, headers: { "content-type": "application/json" } }),
  )));
});

describe("the account notification feed", () => {
  it("knows every type the backend sends, and none reads as a generic notification", async () => {
    const records = await realNotificationFeedService.list();
    expect(records).toHaveLength(Object.keys(ROWS).length);
    const generic = records.filter(r => GENERIC.test(r.body) || r.title === "Notification").map(r => r.id);
    expect(generic, "types that fell into the generic fallback").toEqual([]);
    for (const record of records) {
      expect(record.title.length, record.id).toBeGreaterThan(8);
      expect(record.whyReceivedReason.length, record.id).toBeGreaterThan(20);
    }
  });

  it("links every action to a page the router has", async () => {
    const records = await realNotificationFeedService.list();
    const missing: string[] = [];
    for (const record of records) {
      if (record.actionPath === null) continue;
      const pathname = record.actionPath.split("?")[0] ?? "";
      if (getRouteMeta(pathname) === undefined) missing.push(`${record.title} → ${record.actionPath}`);
    }
    expect(missing, "actions that lead nowhere").toEqual([]);
  });

  it("tells the owner who moved a document to the Recycle Bin, and why, and opens the bin", async () => {
    const records = await realNotificationFeedService.list();
    const moved = records.find(r => r.title === "A document was moved to the Recycle Bin");
    expect(moved?.body).toBe("Ben moved “NDA.pdf” to the Recycle Bin. Reason: Superseded");
    // Where the deletion-request notice leads too.
    expect(moved?.actionPath).toBe(records.find(r => r.title.includes("asked you to delete"))?.actionPath);
    expect(moved?.actionPath).toBe("/app/documents?bin=open");
  });

  it("tells the sender who could not pass the identity check, and opens Documents", async () => {
    const records = await realNotificationFeedService.list();
    const locked = records.find(r => r.title === "A participant could not pass the identity check");
    expect(locked?.body).toBe(
      "Jose Cruz could not pass the identity check for “NDA.pdf” after 3 attempts. "
      + "Open Participants to allow a lighter method for them.");
    expect(locked?.severity).toBe("warning");
    expect(locked?.actionLabel).toBe("Open participants");
    expect(locked?.actionPath).toBe("/app/documents?list=sent&participants=sr_1");
  });

  it("tells the sender of a decline and a failed finalization, and opens that request's Participants", async () => {
    const records = await realNotificationFeedService.list();
    const declined = records.find(r => r.title === "Jose Cruz declined “NDA.pdf”");
    expect(declined?.body).toBe("Jose Cruz declined to sign “NDA.pdf”, because the document needs correction. "
      + "The request has ended and nobody else can sign it.");
    expect(declined?.actionPath).toBe("/app/documents?list=declined&participants=sr_1");
    const failed = records.find(r => r.title === "“NDA.pdf” could not be finalized");
    expect(failed?.body).toMatch(/No signature was lost and nobody needs to sign again\. Open it and choose Try again\./);
    expect(failed?.actionPath).toBe("/app/documents?list=sent&participants=sr_1");
  });

  it("tells a participant how a document ended, and opens their own documents, never a signing link", async () => {
    const records = await realNotificationFeedService.list();
    for (const title of ["NDA.pdf was declined", "NDA.pdf was cancelled", "NDA.pdf has expired"]) {
      const notice = records.find(r => r.title === title);
      expect(notice?.body, title).toMatch(/Nothing more is needed from you\.$/);
      expect(notice?.actionPath, title).toBe("/app/documents?list=to-sign");
    }
    expect(records.find(r => r.title === "Ben cancelled NDA.pdf")).toBeUndefined();
    expect(records.find(r => r.title === "NDA.pdf was cancelled")?.body).toBe("Ben cancelled NDA.pdf. It can no longer be signed. Nothing more is needed from you.");
    expect(records.find(r => r.title === "You can now continue with NDA.pdf")?.actionPath).toBe("/app/documents?list=to-sign");
    expect(records.find(r => r.title === "Reminder: NDA.pdf is waiting for you")?.actionPath).toBe("/app/documents?list=to-sign");
    for (const r of records) expect(r.actionPath ?? "", r.title).not.toMatch(/^\/sign\//);
  });

  it("tells the sender a participant's ID carries another name, and opens Participants to decide", async () => {
    const records = await realNotificationFeedService.list();
    const mismatch = records.find(r => r.title === "The name on a participant's ID does not match");
    expect(mismatch?.body).toBe(
      "Jose Cruz verified their identity for “NDA.pdf”, but the name on their ID is different from "
      + "the name on the document. Open Participants to decide.");
    expect(mismatch?.severity).toBe("warning");
    expect(mismatch?.actionLabel).toBe("Open participants");
    expect(mismatch?.actionPath).toBe("/app/documents?list=sent&participants=sr_1");
    expect(mismatch?.deliveryClass).toBe("in-app-only");
    // The name read from the ID is never in a notice.
    expect(`${mismatch?.title ?? ""} ${mismatch?.body ?? ""}`).not.toMatch(/srr_1/);
    // The same reason the locked notice gives: it is the sender's document and the sender's check.
    expect(mismatch?.whyReceivedReason).toBe(
      records.find(r => r.title === "A participant could not pass the identity check")?.whyReceivedReason);
    expect(mismatch?.whyReceivedReason).toMatch(/^You were sent this because you sent this document/);
  });

  it("opens Sent for a name-mismatch notice that names no request, and still reads without a name or title", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      notifications: [{
        id: "nint_x", type: "IDENTITY_NAME_MISMATCH", workspaceId: "ws_1", sourceKind: "X", sourceId: "src_x",
        templateInput: {}, createdAt: "2026-10-10T09:00:00.000Z", read: false, dismissed: false,
      }],
    }), { status: 200, headers: { "content-type": "application/json" } }))));
    const [record] = await realNotificationFeedService.list();
    expect(record?.actionPath).toBe("/app/documents?list=sent");
    expect(record?.body).toBe(
      "A participant verified their identity for a document you sent, but the name on their ID is different from "
      + "the name on the document. Open Participants to decide.");
  });

  it("opens a signed document in the Documents viewer, never in the demo detail page", async () => {
    const records = await realNotificationFeedService.list();
    const signed = records.find(r => r.title.includes("NDA.pdf was signed"));
    expect(signed?.actionPath).toBe("/app/documents?list=completed&open=src_4");
    for (const record of records) {
      // /app/documents/<id> is the demo build's transaction page.
      expect(record.actionPath ?? "", record.title).not.toMatch(/^\/app\/documents\/[^?]/);
    }
  });

  it("tells a client how their request to a notary stands, and opens that request", async () => {
    const records = await realNotificationFeedService.list();
    const byTitle = (title: string) => records.find(r => r.title === title);
    const cases: [string, RegExp][] = [
      ["Ana Maria Cruz passed the identity check", /passed the ID and face check/],
      ["Ana Maria Cruz accepted your request", /The online session opens when LAGDA eNotary does/],
      ["Ana Maria Cruz declined your request", /ask another notary/],
      ["Your request to Ana Maria Cruz has a day left", /about 24 hours/],
      ["Your request to Ana Maria Cruz has expired", /renew it/],
    ];
    for (const [title, body] of cases) {
      const notice = byTitle(title);
      expect(notice?.body, title).toMatch(body);
      expect(notice?.actionPath, title).toBe("/app/enotary/requests/eni_1");
      expect(notice?.actionLabel, title).toBe("Open request");
      expect(notice?.deliveryClass, title).toBe("email-and-in-app");
    }
    expect(byTitle("Ana Maria Cruz accepted your request")?.severity).toBe("success");
    expect(byTitle("Ana Maria Cruz accepted your request")?.body).not.toMatch(/video|payment|accredited/i);
  });

  it("tells a notary about a request and their application, and opens the desk or the application", async () => {
    const records = await realNotificationFeedService.list();
    expect(records.find(r => r.title === "Ben Lim sent you a request")?.actionPath).toBe("/app/enotary/desk");
    expect(records.find(r => r.title === "Your notary application was approved")?.actionPath).toBe("/app/enotary/desk");
    const rejected = records.find(r => r.title === "Your notary application was not approved");
    expect(rejected?.actionPath).toBe("/app/enotary/apply");
    expect(rejected?.severity).toBe("warning");
  });

  it("tells a reviewer an application is waiting, and opens that application", async () => {
    const records = await realNotificationFeedService.list();
    const waiting = records.find(r => r.title === "Ana Maria Cruz applied to be a notary");
    expect(waiting?.actionPath).toBe("/app/admin/notary-applications/usr_9");
    expect(waiting?.actionLabel).toBe("Review the application");
  });

  it("falls back to the notice's source id when the request id is not in the template input", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: [
      { id: "n1", type: "ENOTARY_REQUEST_ACCEPTED", workspaceId: null, sourceKind: "X", sourceId: "eni_77", templateInput: {}, createdAt: "2026-10-17T00:00:00.000Z" },
      { id: "n2", type: "ENOTARY_APPLICATION_SUBMITTED", workspaceId: null, sourceKind: "X", sourceId: "usr_5", templateInput: {}, createdAt: "2026-10-17T00:00:00.000Z" },
    ] }), { status: 200, headers: { "content-type": "application/json" } }))));
    const records = await realNotificationFeedService.list();
    expect(records[0]?.title).toBe("The notary accepted your request");
    expect(records[0]?.actionPath).toBe("/app/enotary/requests/eni_77");
    expect(records[1]?.actionPath).toBe("/app/admin/notary-applications/usr_5");
  });
});
