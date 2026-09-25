// The document notification feed client (071): server-persisted read and
// dismissed state, the scope parameter, and the state-change request.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("../../api-client", () => ({ apiRequest }));

import { realDocumentFeedService } from "../document-feed.service";
import { hydrate, notificationCenterService } from "../../mock/notification-center.service";

const row = (over: Record<string, unknown> = {}) => ({
  id: "ev_1", type: "transaction-completed", title: "Fully signed",
  body: "\"Office Lease\"", severity: "success", actionRequired: false,
  signingRequestId: "sreq_1", documentTitle: "Office Lease & Annex",
  recipientName: null, occurredAt: Date.parse("2026-09-25T10:00:00Z"),
  read: false, dismissed: false, ...over,
});

beforeEach(() => { apiRequest.mockReset(); });

describe("realDocumentFeedService", () => {
  it("asks for the reader's own documents by default", async () => {
    apiRequest.mockResolvedValue({ notifications: [] });
    await realDocumentFeedService.list("ws_1", "Acme");
    expect(apiRequest.mock.calls[0]![0]).toContain("scope=mine");
  });

  it("passes the workspace scope through", async () => {
    apiRequest.mockResolvedValue({ notifications: [] });
    await realDocumentFeedService.list("ws_1", "Acme", "workspace");
    expect(apiRequest.mock.calls[0]![0]).toContain("scope=workspace");
  });

  it("maps the server's state instead of reporting everything unread", async () => {
    apiRequest.mockResolvedValue({ notifications: [
      row({ id: "a" }),
      row({ id: "b", read: true }),
      row({ id: "c", read: true, dismissed: true }),
    ] });
    const records = await realDocumentFeedService.list("ws_1", "Acme");
    expect(records.map(r => r.status)).toEqual(["unread", "read", "dismissed"]);
  });

  it("deep-links to the document, not the unfiltered list", async () => {
    apiRequest.mockResolvedValue({ notifications: [row()] });
    const [record] = await realDocumentFeedService.list("ws_1", "Acme");
    expect(record!.actionPath).toBe("/app/documents?q=Office%20Lease%20%26%20Annex");
  });

  it("writes a state change with only the halves it names", async () => {
    apiRequest.mockResolvedValue({ updated: 1 });
    await realDocumentFeedService.setState("ws_1", ["a", "b"], { read: true });
    const [url, init] = apiRequest.mock.calls[0]!;
    expect(url).toBe("/workspaces/ws_1/document-notifications/state");
    expect(init).toEqual({ method: "POST", body: { ids: ["a", "b"], read: true } });
  });

  it("does not call the server for an empty change", async () => {
    await realDocumentFeedService.setState("ws_1", [], { read: true });
    expect(apiRequest).not.toHaveBeenCalled();
  });
});

describe("hydrate", () => {
  const record = (id: string, status: "unread" | "read") => ({
    id, status, category: "documents",
  }) as never;

  it("lets the server's status win for rows it tracks", () => {
    hydrate([record("srv", "unread")]);
    notificationCenterService.markRead("srv");
    // The server now reports it unread again (e.g. marked unread elsewhere).
    hydrate([record("srv", "unread")], new Set(["srv"]));
    expect(notificationCenterService.getAllItems()[0]!.status).toBe("unread");
  });

  it("keeps this session's status for rows the server does not track", () => {
    hydrate([record("local", "unread")]);
    notificationCenterService.markRead("local");
    hydrate([record("local", "unread")]);
    expect(notificationCenterService.getAllItems()[0]!.status).toBe("read");
  });
});
