// The account feed's read / dismissed state (090): read from the feed,
// written through POST /me/notifications/state.

import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

import { realNotificationFeedService, MAX_STATE_IDS_PER_CALL } from "../real/notification-feed.service";

const row = (id: string, state: { read?: boolean; dismissed?: boolean } = {}) => ({
  id, type: "SIGNING_COMPLETED", workspaceId: "ws_1", sourceKind: "SIGNING_REQUEST", sourceId: "sr_1",
  templateInput: { documentTitle: "Lease" }, createdAt: "2026-09-27T00:00:00.000Z", ...state,
});

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(
    status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  ));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("account feed state", () => {
  it("asks for dismissed notices too, and maps the server's read / dismissed onto status", async () => {
    const fetchMock = stubFetch({
      notifications: [
        row("n_unread", { read: false, dismissed: false }),
        row("n_read", { read: true, dismissed: false }),
        row("n_dismissed", { read: true, dismissed: true }),
        row("n_legacy"),
      ],
    });
    const items = await realNotificationFeedService.list();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("http://api.test/me/notifications?includeDismissed=true");
    expect(items.map(n => [n.id, n.status])).toEqual([
      ["n_unread", "unread"], ["n_read", "read"], ["n_dismissed", "dismissed"], ["n_legacy", "unread"],
    ]);
  });

  it("markRead and dismiss POST to /me/notifications/state with only the flag given", async () => {
    const fetchMock = stubFetch(null, 204);
    await realNotificationFeedService.markRead(["n1", "n1", "n2"]);
    await realNotificationFeedService.dismiss(["n3"]);
    await realNotificationFeedService.markRead(["n4"], false);
    const calls = fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url), method: init?.method, body: JSON.parse(init?.body as string) as unknown,
    }));
    expect(calls).toEqual([
      { url: "http://api.test/me/notifications/state", method: "POST", body: { ids: ["n1", "n2"], read: true } },
      { url: "http://api.test/me/notifications/state", method: "POST", body: { ids: ["n3"], dismissed: true } },
      { url: "http://api.test/me/notifications/state", method: "POST", body: { ids: ["n4"], read: false } },
    ]);
  });

  it("sends nothing for no ids or no change, and chunks a long list to the server's bound", async () => {
    const fetchMock = stubFetch(null, 204);
    await realNotificationFeedService.setState([], { read: true });
    await realNotificationFeedService.setState(["n1"], {});
    expect(fetchMock).not.toHaveBeenCalled();

    const many = Array.from({ length: MAX_STATE_IDS_PER_CALL + 5 }, (_, i) => `n${String(i)}`);
    await realNotificationFeedService.setState(many, { read: true });
    const sizes = fetchMock.mock.calls.map(([, init]) =>
      (JSON.parse(init?.body as string) as { ids: string[] }).ids.length);
    expect(sizes).toEqual([MAX_STATE_IDS_PER_CALL, 5]);
  });

  it("rejects when the server refuses, so the caller can revert", async () => {
    stubFetch({ error: { code: "EMPTY_STATE_CHANGE", message: "x" } }, 422);
    await expect(realNotificationFeedService.dismiss(["n1"])).rejects.toBeTruthy();
  });
});
