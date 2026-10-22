import { describe, it, expect, vi } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import { realNotificationFeedService } from "../real/notification-feed.service";

function feed(rows: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: rows }), {
    status: 200, headers: { "Content-Type": "application/json" },
  }))));
}

const row = (type: string, templateInput: Record<string, unknown>) => ({
  id: `ntf_${type}`, type, workspaceId: null, sourceKind: "ENOTARY_INVITATION", sourceId: "apn_1",
  templateInput, createdAt: "2026-10-22T03:17:00.000Z",
});

// 122. A called-off session: the client asks to continue, and the notary opens it again. Each says who and what to do,
// never the bare "You have a new notification" that an unknown type falls back to.
describe("asking to open a called-off session again", () => {
  it("tells the notary the client asks to continue, and opens their desk", async () => {
    feed([row("ENOTARY_SESSION_REOPEN_REQUESTED", { recipientName: "Aiyana", otherName: "Christopher Oliva Cortes", invitationId: "eni_1", to: "notary" })]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Christopher Oliva Cortes asks to continue the session");
    expect(n!.body).toContain("now asks to continue it");
    expect(n!.actionPath).toBe("/app/enotary/desk");
    expect(n!.category).toBe("my-actions");
    expect(n!.workspaceName).toBe("");
  });

  it("tells the client the notary opened it again, and opens their request", async () => {
    feed([row("ENOTARY_SESSION_REOPENED", { recipientName: "Christopher", otherName: "Aiyana Yasmin A. Cruz", invitationId: "eni_1", to: "client" })]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Aiyana Yasmin A. Cruz opened the session again");
    expect(n!.actionPath).toBe("/app/enotary/requests/eni_1");
    expect(n!.title).not.toBe("Notification");
  });
});
