import { describe, it, expect, vi } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import { realNotificationFeedService } from "../real/notification-feed.service";

function feed(rows: unknown[]) {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: rows }), {
    status: 200, headers: { "Content-Type": "application/json" },
  }))));
}

const row = (type: string, templateInput: unknown) => ({
  id: `ntf_${type}`, type, workspaceId: "ws_1", sourceKind: "WORKSPACE_INVITATION_NOTICE", sourceId: "ntc_1",
  templateInput, createdAt: "2026-09-27T00:00:00.000Z",
});

describe("workspace invitation notifications (Invitations section)", () => {
  it("links a received invitation to its item in Invitations, and a decline to the sender's list", async () => {
    feed([
      row("WORKSPACE_INVITATION_RECEIVED", { invitationId: "inv_7", workspaceName: "Globex Legal", inviterDisplayName: "Olivia", role: "sender", expiresAt: "2026-10-04T00:00:00.000Z" }),
      row("WORKSPACE_INVITATION_DECLINED", { invitationId: "inv_7", workspaceName: "Globex Legal", inviterDisplayName: "Olivia", role: "reviewer", inviteeDisplayName: "Paul", inviteeEmail: "paul@x.com", reason: "Wrong team" }),
    ]);
    const [received, declined] = await realNotificationFeedService.list();
    expect(received!.title).toBe("Olivia invited you to join Globex Legal");
    expect(received!.body).toMatch(/^Invitation to join Globex Legal as Sender\. It expires Oct 4, 2026\./);
    expect(received!.actionPath).toBe("/app/invitations?status=pending&invitation=inv_7");
    expect(received!.hasAction).toBe(true);
    expect(declined!.title).toBe("Paul declined your invitation to join Globex Legal");
    expect(declined!.body).toBe("The invitation to join Globex Legal as Reviewer was declined. Reason: “Wrong team”");
    // 089 sends the decline to the INVITER, so it opens Manage → Invitations.
    expect(declined!.actionPath).toBe("/app/workspace/invitations?invitation=inv_7");
    for (const n of [received, declined]) expect(n!.deliveryClass).toBe("in-app-only");
  });

  it("carries the decline's facts for Needs attention and Manage → Invitations", async () => {
    feed([
      row("WORKSPACE_INVITATION_DECLINED", { invitationId: "inv_7", workspaceName: "Globex Legal", inviteeDisplayName: "Paul", inviteeEmail: "paul@x.com", reason: "Wrong team" }),
      row("WORKSPACE_INVITATION_RECEIVED", { invitationId: "inv_8", workspaceName: "Acme" }),
    ]);
    const [declined, received] = await realNotificationFeedService.list();
    expect(declined!.invitationDecline).toEqual({
      invitationId: "inv_7", invitee: "Paul", reason: "Wrong team", workspaceName: "Globex Legal", workspaceId: "ws_1",
    });
    expect(received!.invitationDecline).toBeUndefined();
  });

  it("opens the list itself when the input names no invitation (the source id is the notice's own)", async () => {
    feed([row("WORKSPACE_INVITATION_RECEIVED", { workspaceName: "Acme" }), row("WORKSPACE_INVITATION_DECLINED", { workspaceName: "Acme" })]);
    const [n, d] = await realNotificationFeedService.list();
    expect(n!.actionPath).toBe("/app/invitations?status=pending");
    expect(d!.actionPath).toBe("/app/workspace/invitations");
  });

  it("degrades to true, generic wording when the template input is missing", async () => {
    feed([row("WORKSPACE_INVITATION_RECEIVED", null), row("WORKSPACE_INVITATION_DECLINED", null)]);
    const [received, declined] = await realNotificationFeedService.list();
    expect(received!.title).toBe("Someone invited you to join their workspace");
    expect(declined!.body).toMatch(/No reason given\.$/);
    for (const n of [received, declined]) expect(`${n!.title} ${n!.body}`).not.toMatch(/undefined|null/);
  });
});
