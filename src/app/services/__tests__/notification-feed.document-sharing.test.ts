import { describe, it, expect, vi } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import { realNotificationFeedService } from "../real/notification-feed.service";

function feed(rows: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: rows }), {
    status: 200, headers: { "Content-Type": "application/json" },
  }))));
}

const shared = { documentTitle: "Lease Agreement", workspaceName: "Acme", verificationId: "LAGDA-VER-2026-000111", recipientName: "Paul" };
const row = (type: string, templateInput: Record<string, unknown>) => ({
  id: `ntf_${type}`, type, workspaceId: "ws_1", sourceKind: "DOCUMENT_SHARE", sourceId: "shr_1",
  templateInput: { ...shared, ...templateInput }, createdAt: "2026-09-27T00:00:00.000Z",
});

describe("document sharing notifications (087)", () => {
  it("links each of the six types into Shared Documents, in-app only", async () => {
    feed([
      row("DOCUMENT_SHARE_RECEIVED", { sharerDisplayName: "Olivia" }),
      row("DOCUMENT_SHARE_ACCEPTED", { responderDisplayName: "Ana", answer: "accepted" }),
      row("DOCUMENT_SHARE_REJECTED", { responderDisplayName: "Ana", answer: "rejected" }),
      row("DOCUMENT_ACCESS_REQUESTED", { requesterDisplayName: "Ben", requesterEmail: "ben@example.com", note: "For the audit" }),
      row("DOCUMENT_ACCESS_APPROVED", { deciderDisplayName: "Olivia", decision: "approved" }),
      row("DOCUMENT_ACCESS_REJECTED", { deciderDisplayName: "Olivia", decision: "rejected" }),
    ]);
    const [received, accepted, rejected, requested, approved, denied] = await realNotificationFeedService.list();

    expect(received!.title).toBe("Olivia shared “Lease Agreement” with you");
    expect(received!.actionPath).toBe("/app/shared-documents/with-me?section=pending");
    expect(accepted!.title).toBe("Ana accepted “Lease Agreement”");
    expect(accepted!.actionPath).toBe("/app/shared-documents/by-me?section=approved");
    expect(rejected!.title).toBe("Ana rejected “Lease Agreement”");
    expect(requested!.title).toBe("Ben asked for access to “Lease Agreement”");
    expect(requested!.body).toBe("Ben (ben@example.com) asked for access to “Lease Agreement”. Their note: “For the audit”");
    expect(requested!.actionPath).toBe("/app/shared-documents/by-me?section=pending");
    expect(approved!.title).toBe("Your access request for “Lease Agreement” was approved");
    expect(approved!.actionPath).toBe("/app/shared-documents/with-me?section=accepted");
    expect(denied!.title).toBe("Your access request for “Lease Agreement” was not approved");
    expect(denied!.actionPath).toBe("/app/shared-documents/with-me?section=rejected");

    for (const n of [received, accepted, rejected, requested, approved, denied]) {
      expect(n!.deliveryClass).toBe("in-app-only");
      expect(n!.hasAction).toBe(true);
      expect(n!.workspaceName).toBe("Acme");
    }
  });

  it("degrades to true, generic wording when the template input is missing", async () => {
    feed([{ id: "n", type: "DOCUMENT_SHARE_RECEIVED", workspaceId: null, sourceKind: "DOCUMENT_SHARE", sourceId: "s", templateInput: null, createdAt: "2026-09-27T00:00:00.000Z" }]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Someone shared a completed document with you");
    expect(n!.title).not.toMatch(/undefined|null/);
  });
});
