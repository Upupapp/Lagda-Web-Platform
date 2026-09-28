// Contact-request notifications (086) open Contacts → Requests From Contacts,
// focused on the request — from the bell and from the notifications page.

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
  id, type, workspaceId: "ws_1", sourceKind: "CONTACT_REQUEST", sourceId: `cr_${id}`, templateInput, createdAt,
});

beforeAll(async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ notifications: [
    row("a", "CONTACT_REQUEST_RECEIVED", { requesterDisplayName: "Paul", requestTitle: "Prepare the lease", requestKind: "preparation", workspaceName: "Acme" }, "2026-09-27T03:00:00.000Z"),
    row("b", "CONTACT_REQUEST_COMPLETED", { responderDisplayName: "Maria", requestTitle: "Permit", requestKind: "preparation", workspaceName: "Acme" }, "2026-09-27T02:00:00.000Z"),
    row("c", "CONTACT_REQUEST_DECLINED", { responderDisplayName: "Maria", requestTitle: "NDA", requestKind: "preparation", workspaceName: "Acme", reason: "Wrong client" }, "2026-09-27T01:00:00.000Z"),
  ] }), { status: 200, headers: { "Content-Type": "application/json" } }))));
  items = await realNotificationFeedService.list();
  vi.unstubAllGlobals();
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

describe("contact request notification links", () => {
  it("the bell opens each request directly, and shows the rejection reason", async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <Routes>
          <Route path="/app/dashboard" element={<NotificationMenu />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    const received = screen.getByRole("link", { name: /Paul assigned you to prepare a document/ });
    expect(received.getAttribute("href")).toBe("/app/contacts/requests?view=received&status=pending&request=cr_a");
    expect(screen.getByRole("link", { name: /Maria completed “Permit”/ }).getAttribute("href"))
      .toBe("/app/contacts/requests?view=sent&status=approved&request=cr_b");
    const declined = screen.getByRole("link", { name: /Maria declined “NDA”/ });
    expect(declined.getAttribute("href")).toBe("/app/contacts/requests?view=sent&status=rejected&request=cr_c");
    expect(within(declined).getByText(/Reason: “Wrong client”/)).toBeTruthy();
    await userEvent.click(received);
    expect(screen.getByTestId("where").textContent).toBe("/app/contacts/requests?view=received&status=pending&request=cr_a");
    unmount();
  });

  it("the notifications page links each to the same place, with the reason in the text", () => {
    render(<MemoryRouter initialEntries={["/app/notifications"]}><NotificationsPage /></MemoryRouter>);
    const hrefs = screen.getAllByRole("link", { name: /Open request|View request/ }).map(link => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/app/contacts/requests?view=received&status=pending&request=cr_a",
      "/app/contacts/requests?view=sent&status=approved&request=cr_b",
      "/app/contacts/requests?view=sent&status=rejected&request=cr_c",
    ]);
    expect(screen.getByText("Your request for a document's preparation in Acme was declined. Reason: “Wrong client”")).toBeTruthy();
  });
});
