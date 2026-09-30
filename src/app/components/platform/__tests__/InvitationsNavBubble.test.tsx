// The Invitations row in the sidebar and the mobile drawer: a pop-up bubble
// with a mail icon and the PENDING count, named "N pending invitations",
// hidden at zero, refreshed on window focus and every 60 seconds.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../NotificationMenu", () => ({ NotificationMenu: () => <div data-testid="bell" /> }));
vi.mock("../../../tour/TourContext", () => ({ useTour: () => ({ restartTour: vi.fn() }) }));
vi.mock("../WorkspaceSwitcher", () => ({ WorkspaceSwitcher: () => <div /> }));
vi.mock("../UserMenu", () => ({ UserMenu: () => <div /> }));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({ hasPermission: () => true, hasFlag: () => true, unreadCount: 0, user: null, currentWorkspace: null }),
}));
vi.mock("../../../context/NotificationCenterContext", () => ({
  useNotificationCenter: () => ({ items: [], unreadCount: 0 }),
  useOptionalNotificationCenter: () => ({ items: [], unreadCount: 0 }),
}));
vi.mock("../../../hooks/useSignOutFlow", () => ({ useSignOutFlow: () => ({ requestSignOut: vi.fn(), confirmDialog: null }) }));
vi.mock("../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));

import { PlatformSidebar } from "../PlatformSidebar";
import { MobileNav } from "../MobileNav";
import {
  INVITATION_POLL_MS, publishPendingInvitationCount, resetPendingInvitationCount,
} from "../../../hooks/usePendingInvitationCount";

const labels = () => screen.queryAllByTestId("invitation-bubble").map(b => b.getAttribute("aria-label"));

let pending = 3;
let calls = 0;

beforeEach(() => {
  resetPendingInvitationCount();
  pending = 3;
  calls = 0;
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (String(url).startsWith("http://api.test/me/invitations?status=pending")) {
      calls += 1;
      const items = Array.from({ length: pending }, (_, i) => ({ invitationId: `inv_${String(i)}` }));
      return Promise.resolve(new Response(JSON.stringify({ items }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    return Promise.resolve(new Response("{}", { status: 404, headers: { "Content-Type": "application/json" } }));
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetPendingInvitationCount();
});

describe("Invitations navigation bubble", () => {
  it("sits directly below Shared Documents and names the pending count", async () => {
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    const bubble = await screen.findByRole("img", { name: "3 pending invitations" });
    const link = screen.getByTestId("nav-invitations");
    expect(link).toHaveAttribute("href", "/app/invitations");
    expect(link).toContainElement(bubble);
    expect(bubble).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: /Invitations.*3 pending invitations/ })).toBe(link);
    const links = within(screen.getByRole("navigation", { name: "Platform sections" })).getAllByRole("link").map(l => l.getAttribute("href"));
    expect(links.indexOf("/app/invitations")).toBe(links.indexOf("/app/shared-documents") + 1);
  });

  it("hides at zero and updates when the page publishes a new count", async () => {
    pending = 0;
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    await waitFor(() => expect(calls).toBe(1));
    expect(screen.queryByTestId("invitation-bubble")).toBeNull();
    act(() => { publishPendingInvitationCount(1); });
    expect(screen.getByRole("img", { name: "1 pending invitation" })).toBeInTheDocument();
    act(() => { publishPendingInvitationCount(0); });
    expect(screen.queryByTestId("invitation-bubble")).toBeNull();
  });

  it("the collapsed sidebar keeps the count in the link's name", async () => {
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    await screen.findByRole("img", { name: "3 pending invitations" });
    await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("link", { name: "Invitations, 3 pending invitations" })).toBeInTheDocument();
    expect(screen.getByTestId("invitation-bubble-dot")).toHaveTextContent("3");
  });

  it("refreshes on window focus and every 60 seconds, with one poll for both navigations", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MemoryRouter><PlatformSidebar /><MobileNav /></MemoryRouter>);
    await waitFor(() => expect(calls).toBe(1));
    // The drawer is closed (inert, hidden), so its bubble is found by test id.
    await waitFor(() => expect(labels()).toEqual(["3 pending invitations", "3 pending invitations"]));

    pending = 5;
    await act(async () => { window.dispatchEvent(new Event("focus")); await Promise.resolve(); });
    await waitFor(() => expect(labels()).toEqual(["5 pending invitations", "5 pending invitations"]));
    expect(calls).toBe(2);

    pending = 1;
    await act(async () => { vi.advanceTimersByTime(INVITATION_POLL_MS); await Promise.resolve(); });
    await waitFor(() => expect(labels()).toEqual(["1 pending invitation", "1 pending invitation"]));
    expect(calls).toBe(3);
  });
});
