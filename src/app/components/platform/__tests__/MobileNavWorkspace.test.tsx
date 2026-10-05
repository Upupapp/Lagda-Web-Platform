// The mobile drawer's workspace switcher. The desktop sidebar always had one;
// on a phone the workspace was only a label, so there was no way to change it.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const switchWorkspace = vi.fn();
const refreshWorkspaceList = vi.fn(() => Promise.resolve());
const WORKSPACES = [
  { id: "ws_a", name: "Roronoa's Workspace", plan: "business", role: "owner" },
  { id: "ws_b", name: "Acme Legal", plan: "business", role: "sender" },
];

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: "" }));
vi.mock("../NotificationMenu", () => ({ NotificationMenu: () => <div data-testid="bell" /> }));
vi.mock("../WorkspaceBadge", () => ({ WorkspaceBadge: () => <span data-testid="badge" /> }));
vi.mock("../../../tour/TourContext", () => ({ useTour: () => ({ restartTour: vi.fn() }) }));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    hasPermission: () => true, hasFlag: () => true, unreadCount: 0, user: null,
    currentWorkspace: WORKSPACES[0], workspaces: WORKSPACES, switchWorkspace, refreshWorkspaceList,
  }),
}));
vi.mock("../../../context/NotificationCenterContext", () => ({
  useNotificationCenter: () => ({ items: [], unreadCount: 0 }),
  useOptionalNotificationCenter: () => ({ items: [], unreadCount: 0 }),
}));
vi.mock("../../../hooks/useSignOutFlow", () => ({ useSignOutFlow: () => ({ requestSignOut: vi.fn(), confirmDialog: null }) }));
vi.mock("../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));
vi.mock("../../../hooks/usePendingInvitationCount", () => ({ usePendingInvitationCount: () => 0 }));
vi.mock("../../../hooks/usePlans", async (original) => ({
  ...(await original<typeof import("../../../hooks/usePlans")>()),
  useMyPlan: () => ({ plan: { plan: "business" } }),
}));
vi.mock("../../../hooks/useWorkspacePlanLabel", () => ({ useWorkspacePlanLabel: () => "Business" }));

import { MobileNav } from "../MobileNav";

beforeEach(() => {
  switchWorkspace.mockClear(); refreshWorkspaceList.mockClear();
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))));
});
afterEach(() => { vi.unstubAllGlobals(); });

async function openDrawer() {
  render(<MemoryRouter><MobileNav /></MemoryRouter>);
  await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  return screen.getByRole("dialog", { name: "Navigation" });
}

describe("switching workspace from the mobile drawer", () => {
  it("shows the current workspace as a control that opens the list in place", async () => {
    const drawer = await openDrawer();
    const control = within(drawer).getByRole("button", { name: /Current workspace: Roronoa's Workspace/ });
    expect(control).toHaveAttribute("aria-expanded", "false");
    expect(within(drawer).queryByRole("group", { name: "Your workspaces" })).toBeNull();

    await userEvent.click(control);
    expect(control).toHaveAttribute("aria-expanded", "true");
    const list = within(drawer).getByRole("group", { name: "Your workspaces" });
    expect(within(list).getAllByRole("button").map(b => b.textContent)).toEqual([
      expect.stringContaining("Roronoa's Workspace"), expect.stringContaining("Acme Legal"),
    ]);
    // Opening it is when a newly approved workspace should appear.
    expect(refreshWorkspaceList).toHaveBeenCalledTimes(1);
    // The one you are in is marked, not just listed.
    expect(within(list).getByRole("button", { name: /Roronoa's Workspace/ })).toHaveAttribute("aria-current", "true");
  });

  it("switches to the chosen workspace and closes the drawer", async () => {
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole("button", { name: /Current workspace/ }));
    await userEvent.click(within(drawer).getByRole("button", { name: /Acme Legal/ }));
    expect(switchWorkspace).toHaveBeenCalledWith("ws_b");
    expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull();
  });

  it("choosing the workspace you are already in changes nothing", async () => {
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole("button", { name: /Current workspace/ }));
    const list = within(drawer).getByRole("group", { name: "Your workspaces" });
    await userEvent.click(within(list).getByRole("button", { name: /Roronoa's Workspace/ }));
    expect(switchWorkspace).not.toHaveBeenCalled();
  });

  it("keeps Join another workspace right below it", async () => {
    const drawer = await openDrawer();
    expect(within(drawer).getByTestId("mobile-join-workspace")).toBeInTheDocument();
  });
});
