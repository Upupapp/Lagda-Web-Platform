// The notification center writes the ACCOUNT feed's state through to the
// server (090): optimistic on screen, reverted when the write fails, and the
// unread count taken from the server's `read`.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import type { NotificationRecord, NotificationId } from "../../models/notifications";

vi.mock("../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Reyes Law Office" } }),
}));

const accountList = vi.fn<() => Promise<NotificationRecord[]>>();
const accountSetState = vi.fn<(ids: readonly string[], change: { read?: boolean; dismissed?: boolean }) => Promise<void>>();
vi.mock("../../services/real/notification-feed.service", () => ({
  realNotificationFeedService: {
    list: () => accountList(),
    setState: (ids: readonly string[], change: { read?: boolean; dismissed?: boolean }) => accountSetState(ids, change),
  },
}));

const documentSetState = vi.fn<(...args: unknown[]) => Promise<void>>();
vi.mock("../../services/real/document-feed.service", () => ({
  realDocumentFeedService: {
    list: () => Promise.resolve([]),
    setState: (...args: unknown[]) => documentSetState(...args),
  },
}));

import { NotificationCenterProvider, useNotificationCenter } from "../NotificationCenterContext";

function notice(id: string, status: NotificationRecord["status"]): NotificationRecord {
  return {
    id: id as NotificationId, demonstrationOnly: true, category: "workspace", severity: "info", priority: "normal",
    title: `Notice ${id}`, body: "b", detailBody: null, createdAt: "2026-09-27T00:00:00.000Z",
    workspaceId: "ws_1", workspaceName: "Reyes Law Office", deliveryClass: "in-app-only",
    isDismissible: true, hasAction: false, actionLabel: null, actionPath: null, whyReceivedReason: "w", status,
  };
}

let api: ReturnType<typeof useNotificationCenter> | null = null;
function Probe() {
  api = useNotificationCenter();
  return (
    <div>
      <span data-testid="unread">{api.unreadCount}</span>
      {api.items.map(n => <span key={n.id} data-testid={`status-${n.id}`}>{n.status}</span>)}
    </div>
  );
}

async function mount() {
  render(<NotificationCenterProvider><Probe /></NotificationCenterProvider>);
  await waitFor(() => { expect(screen.getByTestId("status-a")).toBeTruthy(); });
}

beforeEach(() => {
  api = null;
  accountList.mockReset();
  accountSetState.mockReset();
  documentSetState.mockReset();
  // Fresh objects per read, as the network gives: the store mutates status in place.
  accountList.mockImplementation(() => Promise.resolve(
    [notice("a", "unread"), notice("b", "read"), notice("c", "dismissed")]));
});

describe("NotificationCenterContext — account feed state (090)", () => {
  it("counts unread from the server's state", async () => {
    await mount();
    expect(screen.getByTestId("status-b").textContent).toBe("read");
    expect(screen.getByTestId("status-c").textContent).toBe("dismissed");
    expect(screen.getByTestId("unread").textContent).toBe("1");
  });

  it("markRead, dismiss and markAllRead write to the account endpoint", async () => {
    accountSetState.mockResolvedValue(undefined);
    await mount();
    act(() => { api!.markRead("a"); });
    expect(screen.getByTestId("status-a").textContent).toBe("read");
    expect(accountSetState).toHaveBeenLastCalledWith(["a"], { read: true });

    act(() => { api!.dismiss("b"); });
    expect(accountSetState).toHaveBeenLastCalledWith(["b"], { dismissed: true });

    act(() => { api!.markUnread("a"); });
    act(() => { api!.markAllRead(); });
    expect(accountSetState).toHaveBeenLastCalledWith(["a"], { read: true });
    // None of these is a document-feed row.
    expect(documentSetState).not.toHaveBeenCalled();
  });

  it("reverts the optimistic change when the write fails", async () => {
    accountSetState.mockRejectedValue(new Error("offline"));
    await mount();
    // The re-sync after a failure reads the server again: still unread.
    act(() => { api!.dismiss("a"); });
    expect(screen.getByTestId("status-a").textContent).toBe("dismissed");
    await waitFor(() => { expect(screen.getByTestId("status-a").textContent).toBe("unread"); });
    expect(screen.getByTestId("unread").textContent).toBe("1");
  });
});
