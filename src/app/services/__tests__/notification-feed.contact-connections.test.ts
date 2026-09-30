import { describe, it, expect, vi } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import { realNotificationFeedService } from "../real/notification-feed.service";

function feed(rows: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: rows }), {
    status: 200, headers: { "Content-Type": "application/json" },
  }))));
}

const row = (type: string, templateInput: Record<string, unknown>) => ({
  id: `ntf_${type}`, type, workspaceId: "ws_1", sourceKind: "CONTACT_CONNECTION", sourceId: "cc_1",
  templateInput, createdAt: "2026-09-30T00:00:00.000Z",
});

describe("contact connection notifications (091)", () => {
  it("asks the recipient to review a request, in the app only", async () => {
    feed([row("CONTACT_CONNECTION_REQUESTED", { recipientName: "Ben", requesterDisplayName: "Ana Reyes", workspaceName: "Reyes Law", connectionId: "cc_1" })]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Ana Reyes wants to add you as a contact");
    expect(n!.body).toContain("Ana Reyes (Reyes Law) asked to add you");
    expect(n!.actionPath).toBe("/app/contacts/pending");
    expect(n!.deliveryClass).toBe("in-app-only");
  });

  it("tells the requester it was accepted, linking to the new contact", async () => {
    feed([row("CONTACT_CONNECTION_ACCEPTED", { recipientName: "Ana", responderDisplayName: "Ben Lim", connectionId: "cc_1", contactId: "con_9" })]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Ben Lim accepted your contact request");
    expect(n!.actionLabel).toBe("View contact");
    expect(n!.actionPath).toBe("/app/contacts/con_9");
  });
});
