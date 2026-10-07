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
  PUBLIC_INQUIRY_RECEIVED: { recipientName: "Chris", kindLabel: "Demo request", senderName: "Jose Cruz", senderEmail: "jose@example.ph", inquiryId: "pin_1" },
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

  it("opens a signed document in the Documents viewer, never in the demo detail page", async () => {
    const records = await realNotificationFeedService.list();
    const signed = records.find(r => r.title.includes("NDA.pdf was signed"));
    expect(signed?.actionPath).toBe("/app/documents?list=completed&open=src_4");
    for (const record of records) {
      // /app/documents/<id> is the demo build's transaction page.
      expect(record.actionPath ?? "", record.title).not.toMatch(/^\/app\/documents\/[^?]/);
    }
  });
});
