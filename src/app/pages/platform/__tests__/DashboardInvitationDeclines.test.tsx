// The real dashboard's Needs attention also lists invitations this account
// sent that were DECLINED (WORKSPACE_INVITATION_DECLINED notices from the
// account feed): unread ones from the last 14 days, with the invitee, the
// reason and the date, and "Review invitation" into Manage → Invitations —
// switching workspace first when the invitation belongs to another one, and
// marking the notice read — and a Dismiss (×) per row. Both go through the
// notification center, which persists them server-side (090).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import type { NotificationRecord, NotificationId } from "../../../models/notifications";
import { invitationDeclinesNeedingAttention } from "../../../services/dashboard/invitation-declines";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const listMock = vi.fn();
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { list: (...args: unknown[]) => listMock(...args), signatures: vi.fn() },
}));

const platform = {
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" },
  user: { displayName: "Ana Reyes" },
  workspaces: [{ id: "ws_1", name: "Reyes Law Office" }, { id: "ws_2", name: "Cebu Branch" }],
  switchWorkspace: vi.fn(),
};
vi.mock("../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

let noticeItems: NotificationRecord[] = [];
const markRead = vi.fn((id: string) => {
  noticeItems = noticeItems.map(n => (n.id === id ? { ...n, status: "read" } : n));
});
const dismiss = vi.fn((id: string) => {
  noticeItems = noticeItems.map(n => (n.id === id ? { ...n, status: "dismissed" } : n));
});
vi.mock("../../../context/NotificationCenterContext", () => ({
  useOptionalNotificationCenter: () => ({ items: noticeItems, markRead, dismiss }),
}));

import { RealDashboard } from "../../../components/dashboard/RealDashboard";

const DAY = 86_400_000;

function decline(id: string, overrides: Partial<NotificationRecord> & { invitationId?: string | null; reason?: string | null; workspaceId?: string; ageDays?: number } = {}): NotificationRecord {
  const { invitationId = `inv_${id}`, reason = "Wrong team", workspaceId = "ws_1", ageDays = 1, ...rest } = overrides;
  return {
    id: id as NotificationId, demonstrationOnly: true, category: "workspace", severity: "warning", priority: "normal",
    title: "t", body: "b", detailBody: null, createdAt: new Date(Date.now() - ageDays * DAY).toISOString(),
    workspaceId, workspaceName: workspaceId === "ws_2" ? "Cebu Branch" : "Reyes Law Office",
    deliveryClass: "in-app-only", isDismissible: true, hasAction: true, actionLabel: "View invitation",
    actionPath: null, whyReceivedReason: "w", status: "unread",
    invitationDecline: {
      invitationId, invitee: "Paul Cruz", reason,
      workspaceName: workspaceId === "ws_2" ? "Cebu Branch" : "Reyes Law Office", workspaceId,
    },
    ...rest,
  };
}

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}{location.search}</div>;
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/app" element={<RealDashboard />} />
        <Route path="/app/workspace/invitations" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listMock.mockReset();
  markRead.mockClear();
  dismiss.mockClear();
  platform.switchWorkspace.mockReset();
  platform.currentWorkspace = { id: "ws_1", name: "Reyes Law Office" };
  noticeItems = [];
});

describe("which declines need attention", () => {
  it("keeps unread declines from the last 14 days, newest first, and nothing else", () => {
    const now = Date.now();
    const items = [
      decline("old", { ageDays: 15 }),
      decline("read", { status: "read" }),
      decline("dismissed", { status: "dismissed" }),
      decline("recent", { ageDays: 1 }),
      decline("newest", { ageDays: 0.1 }),
      { ...decline("other"), invitationDecline: undefined },
    ];
    expect(invitationDeclinesNeedingAttention(items, now).map(e => e.notice.id)).toEqual(["newest", "recent"]);
  });
});

describe("dashboard Needs attention — declined invitations", () => {
  it("lists the decline with the invitee, workspace, reason, date and a Review invitation action", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false });
    noticeItems = [decline("n1", { invitationId: "inv_7" })];
    renderDashboard();
    const attention = await screen.findByRole("region", { name: "Needs attention" });
    const row = within(attention).getByTestId("decline-n1");
    expect(row.textContent).toContain("Paul Cruz declined your invitation to Reyes Law Office");
    expect(row.textContent).toContain("Reason: “Wrong team”");
    expect(row.querySelector("time")).not.toBeNull();
    const link = within(row).getByRole("link", { name: "Review invitation declined by Paul Cruz" });
    expect(link.getAttribute("href")).toBe("/app/workspace/invitations?invitation=inv_7");
    // Shown even when the workspace has no signing requests yet.
    expect(screen.getByText("Send your first document")).toBeTruthy();
  });

  it("says so when no reason was given", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false });
    noticeItems = [decline("n1", { reason: null })];
    renderDashboard();
    expect(await screen.findByText("No reason given.")).toBeTruthy();
  });

  it("marks the notice read and opens Manage → Invitations on it, in the same workspace", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false });
    noticeItems = [decline("n1", { invitationId: "inv_7" })];
    renderDashboard();
    await userEvent.click(await screen.findByRole("link", { name: /Review invitation/ }));
    expect(markRead).toHaveBeenCalledWith("n1");
    expect(platform.switchWorkspace).not.toHaveBeenCalled();
    expect(screen.getByTestId("where").textContent).toBe("/app/workspace/invitations?invitation=inv_7");
  });

  it("dismisses a decline with its × without opening it", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false });
    noticeItems = [decline("n1"), decline("n2", { ageDays: 2 })];
    const view = renderDashboard();
    const row = await screen.findByTestId("decline-n1");
    await userEvent.click(within(row).getByRole("button", { name: "Dismiss the decline from Paul Cruz" }));
    expect(dismiss).toHaveBeenCalledWith("n1");
    expect(markRead).not.toHaveBeenCalled();
    expect(screen.queryByTestId("where")).toBeNull();
    // The server-backed status now says dismissed: the row leaves the list.
    view.rerender(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes><Route path="/app" element={<RealDashboard />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("decline-n1")).toBeNull();
    expect(screen.getByTestId("decline-n2")).toBeTruthy();
  });

  it("switches to the invitation's workspace first when it is another one", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false });
    noticeItems = [decline("n2", { invitationId: "inv_9", workspaceId: "ws_2" })];
    renderDashboard();
    const row = await screen.findByTestId("decline-n2");
    expect(row.textContent).toContain("declined your invitation to Cebu Branch");
    await userEvent.click(within(row).getByRole("link", { name: /Review invitation/ }));
    expect(platform.switchWorkspace).toHaveBeenCalledWith("ws_2");
    expect(markRead).toHaveBeenCalledWith("n2");
    expect(screen.getByTestId("where").textContent).toBe("/app/workspace/invitations?invitation=inv_9");
  });

  it("sits beside document attention items and counts them together", async () => {
    listMock.mockResolvedValue({
      items: [{
        signingRequestId: "sr_1", documentId: "doc_1", documentTitle: "Lease Agreement",
        state: "declined", participantCount: 2, completedParticipantCount: 0,
        createdAt: new Date().toISOString(), sentAt: new Date().toISOString(),
        completedAt: null, expiresAt: null,
      }],
      total: 1, page: 1, perPage: 100, hasNextPage: false,
    });
    noticeItems = [decline("n1"), decline("stale", { ageDays: 20 })];
    renderDashboard();
    const attention = await screen.findByRole("region", { name: "Needs attention" });
    expect(attention.textContent).toContain("Lease Agreement");
    expect(within(attention).getByTestId("decline-n1")).toBeTruthy();
    expect(within(attention).queryByTestId("decline-stale")).toBeNull();
    expect(within(attention).getByRole("heading", { name: "Needs attention" }).parentElement?.textContent).toContain("2");
  });
});
