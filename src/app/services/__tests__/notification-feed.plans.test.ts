import { describe, it, expect, vi } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import { realNotificationFeedService } from "../real/notification-feed.service";

function feed(rows: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: rows }), {
    status: 200, headers: { "Content-Type": "application/json" },
  }))));
}

const row = (type: string, templateInput: Record<string, unknown>) => ({
  id: `ntf_${type}`, type, workspaceId: null, sourceKind: "PLAN_UPGRADE_REQUEST", sourceId: "pur_1",
  templateInput, createdAt: "2026-09-30T00:00:00.000Z",
});

describe("plan notifications (093)", () => {
  it("asks the approver to review the request", async () => {
    feed([row("PLAN_UPGRADE_REQUESTED", { recipientName: "Chris", requesterDisplayName: "Ana Reyes", requesterEmail: "ana@example.com", planName: "Business", amount: "₱799.00", expiresAt: "7 October 2026", requestId: "pur_1" })]);
    const [n] = await realNotificationFeedService.list();
    expect(n!.title).toBe("Ana Reyes asked for the Business plan");
    expect(n!.body).toContain("No money was moved");
    expect(n!.actionPath).toBe("/app/plan-requests/pur_1");
  });

  it("tells the requester it was approved, or declined", async () => {
    feed([
      row("PLAN_UPGRADE_APPROVED", { recipientName: "Ana", planName: "Business", requestId: "pur_1", paidUntil: "30 October 2026" }),
      row("PLAN_UPGRADE_DECLINED", { recipientName: "Ana", planName: "Personal", requestId: "pur_2" }),
    ]);
    const [approved, declined] = await realNotificationFeedService.list();
    expect(approved!.title).toBe("Your Business plan is active");
    expect(approved!.body).toContain("30 October 2026");
    expect(approved!.actionPath).toBe("/app/settings/plan");
    expect(declined!.title).toBe("Your Personal plan request was declined");
  });
});
