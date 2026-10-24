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
  // 131. Two ways forward from that very request: straight to the room (the session opened again by itself), or the
  // request alone on the desk. The notice also names its type and request, so an emailed link can find it.
  it("tells the notary the client asks to continue, with the room or the request alone on the desk", async () => {
    feed([row("ENOTARY_SESSION_REOPEN_REQUESTED", { recipientName: "Aiyana", otherName: "Christopher Oliva Cortes", invitationId: "eni_1", to: "notary" })]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Christopher Oliva Cortes asks to continue the session");
    expect(n!.body).toContain("now asks to continue it");
    expect(n!.actionLabel).toBe("Open the session again and go to the room");
    expect(n!.actionPath).toBe("/app/enotary/desk/eni_1?then=reopen");
    expect(n!.secondaryActionLabel).toBe("Show it on my desk");
    expect(n!.secondaryActionPath).toBe("/app/enotary/desk?request=eni_1");
    expect(n!.notificationType).toBe("ENOTARY_SESSION_REOPEN_REQUESTED");
    expect(n!.enotaryRequestId).toBe("eni_1");
    expect(n!.category).toBe("my-actions");
    expect(n!.workspaceName).toBe("");
  });

  it("opens the very request for the notary's other eNotary notices, with the desk filtered to it as the second way", async () => {
    feed([
      row("ENOTARY_SESSION_DOCUMENT_ADDED", { recipientName: "Aiyana", otherName: "Rosa", invitationId: "eni_2", to: "notary" }),
      row("ENOTARY_CTC_REQUESTED", { recipientName: "Aiyana", otherName: "Rosa", invitationId: "eni_3", to: "notary" }),
      row("ENOTARY_PAYMENT_PROOF_SENT", { recipientName: "Aiyana", otherName: "Rosa", invitationId: "eni_4", amount: "PHP 500.00" }),
    ]);
    const notices = await realNotificationFeedService.list();
    const byType = (type: string) => notices.find(n => n.notificationType === type)!;
    expect(byType("ENOTARY_SESSION_DOCUMENT_ADDED")).toMatchObject({ actionPath: "/app/enotary/desk/eni_2", secondaryActionPath: "/app/enotary/desk?request=eni_2" });
    expect(byType("ENOTARY_CTC_REQUESTED")).toMatchObject({ actionPath: "/app/enotary/desk/eni_3", secondaryActionPath: "/app/enotary/desk?request=eni_3" });
    expect(byType("ENOTARY_PAYMENT_PROOF_SENT")).toMatchObject({ actionPath: "/app/enotary/desk/eni_4", secondaryActionPath: "/app/enotary/desk?request=eni_4" });
  });

  it("tells the client the notary opened it again, and opens their request", async () => {
    feed([row("ENOTARY_SESSION_REOPENED", { recipientName: "Christopher", otherName: "Aiyana Yasmin A. Cruz", invitationId: "eni_1", to: "client" })]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Aiyana Yasmin A. Cruz opened the session again");
    expect(n!.actionPath).toBe("/app/enotary/requests/eni_1");
    expect(n!.secondaryActionPath).toBeUndefined();
    expect(n!.title).not.toBe("Notification");
  });
});
