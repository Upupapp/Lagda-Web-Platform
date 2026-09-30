// The mobile drawer: section links first, Search / Restart Tour / Help Center
// in a collapsible "Tools & help" section at the bottom, collapsed by default.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: "" }));
vi.mock("../NotificationMenu", () => ({ NotificationMenu: () => <div data-testid="bell" /> }));
vi.mock("../../../tour/TourContext", () => ({ useTour: () => ({ restartTour: vi.fn() }) }));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({ hasPermission: () => true, hasFlag: () => true, unreadCount: 0, user: null, currentWorkspace: null }),
}));
vi.mock("../../../context/NotificationCenterContext", () => ({
  useNotificationCenter: () => ({ items: [], unreadCount: 0 }),
  useOptionalNotificationCenter: () => ({ items: [], unreadCount: 0 }),
}));
vi.mock("../../../hooks/useSignOutFlow", () => ({ useSignOutFlow: () => ({ requestSignOut: vi.fn(), confirmDialog: null }) }));
vi.mock("../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));
vi.mock("../../../hooks/usePendingInvitationCount", () => ({ usePendingInvitationCount: () => 0 }));

import { MobileNav } from "../MobileNav";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))));
});
afterEach(() => { vi.unstubAllGlobals(); });

async function openDrawer() {
  render(<MemoryRouter><MobileNav /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  return screen.getByRole("dialog", { name: "Navigation" });
}

describe("MobileNav tools & help", () => {
  it("puts the section links before a collapsed Tools & help section", async () => {
    const drawer = await openDrawer();
    const toggle = within(drawer).getByRole("button", { name: /Tools & help/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "mobile-nav-tools");
    const panel = drawer.querySelector("#mobile-nav-tools");
    expect(panel).toHaveAttribute("inert");
    // Search is not reachable while collapsed.
    expect(within(drawer).queryByRole("button", { name: "Search" })).toBeNull();
    const nav = within(drawer).getByRole("navigation", { name: "Platform sections" });
    // eslint-disable-next-line no-bitwise
    expect(nav.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("expands and collapses on toggle", async () => {
    const drawer = await openDrawer();
    const toggle = within(drawer).getByRole("button", { name: /Tools & help/ });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(drawer).getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Restart Tour" })).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: /Help Center/ })).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
