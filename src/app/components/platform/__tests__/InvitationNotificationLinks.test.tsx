// Workspace-invitation notifications open the Invitations section on the
// invitation itself — from the bell and from the notifications page.

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import type { NotificationRecord } from "../../../models/notifications";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../services/backend-flag", () => ({ API_BASE_URL: "http://api.test", USE_REAL_BACKEND: true }));

let items: NotificationRecord[] = [];
vi.mock("../../../context/NotificationCenterContext", () => ({
  useNotificationCenter: () => ({
    items, unreadCount: items.length,
    markRead: vi.fn(), markUnread: vi.fn(), markAllRead: vi.fn(), dismiss: vi.fn(), restore: vi.fn(), reload: vi.fn(),
    scope: "workspace", setScope: vi.fn(), scopeAvailable: false,
  }),
}));

import { realNotificationFeedService } from "../../../services/real/notification-feed.service";
import { NotificationMenu } from "../NotificationMenu";
import { NotificationsPage } from "../../../pages/platform/notifications/NotificationsPage";

const row = (id: string, type: string, templateInput: Record<string, unknown>, createdAt: string) => ({
  id, type, workspaceId: null, sourceKind: "WORKSPACE_INVITATION_NOTICE", sourceId: `ntc_${id}`, templateInput, createdAt,
});

beforeAll(async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: [
    row("a", "WORKSPACE_INVITATION_RECEIVED", { invitationId: "inv_a", workspaceName: "Globex Legal", inviterDisplayName: "Olivia", role: "sender", expiresAt: "2026-10-04T00:00:00.000Z" }, "2026-09-27T03:00:00.000Z"),
    row("b", "WORKSPACE_INVITATION_DECLINED", { invitationId: "inv_b", workspaceName: "Acme", inviterDisplayName: "Olivia", role: "reviewer", inviteeDisplayName: "Ben", reason: "Wrong team" }, "2026-09-27T02:00:00.000Z"),
  ] }), { status: 200, headers: { "Content-Type": "application/json" } }))));
  items = await realNotificationFeedService.list();
  vi.unstubAllGlobals();
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

describe("invitation notification links", () => {
  it("the bell opens a received invitation in Invitations, and a decline in the sender's list with its reason", async () => {
    render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <Routes>
          <Route path="/app/dashboard" element={<NotificationMenu />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    const received = screen.getByRole("link", { name: /Olivia invited you to join Globex Legal/ });
    expect(received.getAttribute("href")).toBe("/app/invitations?status=pending&invitation=inv_a");
    const declined = screen.getByRole("link", { name: /Ben declined your invitation to join Acme/ });
    expect(declined.getAttribute("href")).toBe("/app/workspace/invitations?invitation=inv_b");
    expect(within(declined).getByText(/Reason: “Wrong team”/)).toBeTruthy();
    await userEvent.click(received);
    expect(screen.getByTestId("where").textContent).toBe("/app/invitations?status=pending&invitation=inv_a");
  });

  it("the notifications page links each to the same place", () => {
    render(<MemoryRouter initialEntries={["/app/notifications"]}><NotificationsPage /></MemoryRouter>);
    const hrefs = screen.getAllByRole("link", { name: /Open invitation|View invitation/ }).map(link => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/app/invitations?status=pending&invitation=inv_a",
      "/app/workspace/invitations?invitation=inv_b",
    ]);
  });
});
