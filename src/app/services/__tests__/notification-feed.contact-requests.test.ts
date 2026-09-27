import { describe, it, expect, vi } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import { realNotificationFeedService } from "../real/notification-feed.service";

function feed(rows: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: rows }), {
    status: 200, headers: { "Content-Type": "application/json" },
  }))));
}

const row = (type: string, templateInput: Record<string, unknown>) => ({
  id: `ntf_${type}`, type, workspaceId: "ws_1", sourceKind: "CONTACT_REQUEST", sourceId: "cr_1",
  templateInput, createdAt: "2026-09-27T00:00:00.000Z",
});

describe("contact request notifications", () => {
  it("renders a received request with its details, linking to Others", async () => {
    feed([row("CONTACT_REQUEST_RECEIVED", {
      recipientName: "Maria", requestTitle: "Prepare the lease", requestKind: "preparation",
      requesterDisplayName: "Paul Reyes", workspaceName: "Acme", message: "Before Friday",
      documentTitle: "Lease", dueAt: "2030-01-10T15:59:00.000Z",
    })]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Paul Reyes assigned you to prepare a document");
    expect(n!.body).toBe("“Prepare the lease” in Acme. Document: Lease. Due Jan 10, 2030. “Before Friday”");
    expect(n!.actionLabel).toBe("Open in Others");
    expect(n!.actionPath).toBe("/app/documents?list=others&request=cr_1");
    expect(n!.hasAction).toBe(true);
    expect(n!.deliveryClass).toBe("in-app-only");
    expect(n!.workspaceName).toBe("Acme");
  });

  it("words each kind of request", async () => {
    feed([
      row("CONTACT_REQUEST_RECEIVED", { requestKind: "signed-document", requesterDisplayName: "Paul", requestTitle: "NDA", workspaceName: "Acme" }),
      row("CONTACT_REQUEST_RECEIVED", { requestKind: "upload", requesterDisplayName: "Paul", requestTitle: "Permit", workspaceName: "Acme" }),
    ]);
    const [signed, upload] = await realNotificationFeedService.list();
    expect(signed!.title).toBe("Paul asked you for a signed document");
    expect(upload!.title).toBe("Paul asked you to upload a document");
  });

  it("renders completed and declined answers, linking to Requests you sent", async () => {
    feed([
      row("CONTACT_REQUEST_COMPLETED", { recipientName: "Paul", responderDisplayName: "Maria", requestTitle: "Permit", requestKind: "upload", workspaceName: "Acme" }),
      row("CONTACT_REQUEST_DECLINED", { recipientName: "Paul", responderDisplayName: "Maria", requestTitle: "NDA", requestKind: "signed-document", workspaceName: "Acme", reason: "Wrong person" }),
    ]);
    const [done, declined] = await realNotificationFeedService.list();
    expect(done!.title).toBe("Maria completed “Permit”");
    expect(done!.body).toBe("Your request for a document upload in Acme is complete.");
    expect(done!.severity).toBe("success");
    expect(done!.actionPath).toBe("/app/documents?list=requests-sent&request=cr_1");
    expect(declined!.title).toBe("Maria declined “NDA”");
    expect(declined!.body).toBe("Your request for a signed document in Acme was declined. Reason: “Wrong person”");
    expect(declined!.severity).toBe("warning");
    expect(declined!.deliveryClass).toBe("in-app-only");
  });

  it("degrades to true, generic wording when the template input is missing", async () => {
    feed([row("CONTACT_REQUEST_RECEIVED", {}), row("CONTACT_REQUEST_DECLINED", {})]);
    const [received, declined] = await realNotificationFeedService.list();
    expect(received!.title).toBe("A colleague sent you a request");
    expect(received!.body).not.toContain("undefined");
    expect(declined!.title).toBe("Your contact declined your request");
  });
});
