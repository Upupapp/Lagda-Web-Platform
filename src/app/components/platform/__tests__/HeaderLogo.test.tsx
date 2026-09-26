// The LAGDA logo sits at the far left of the platform header, not at the
// top of the sidebar; the sidebar opens with the workspace switcher.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../NotificationMenu", () => ({ NotificationMenu: () => <div data-testid="bell" /> }));
vi.mock("../../../tour/TourContext", () => ({ useTour: () => ({ restartTour: vi.fn() }) }));
vi.mock("../WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: ({ collapsed }: { collapsed: boolean }) => <div data-testid="workspace-switcher" data-collapsed={String(collapsed)} />,
}));
vi.mock("../UserMenu", () => ({ UserMenu: () => <div /> }));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({ hasPermission: () => true, hasFlag: () => true }),
}));
vi.mock("../../../context/NotificationCenterContext", () => ({
  useNotificationCenter: () => ({ items: [], unreadCount: 0 }),
}));
vi.mock("../../../hooks/useSignOutFlow", () => ({ useSignOutFlow: () => ({ requestSignOut: vi.fn(), confirmDialog: null }) }));
vi.mock("../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));

import { PlatformHeader } from "../PlatformHeader";
import { PlatformSidebar } from "../PlatformSidebar";

describe("platform header logo", () => {
  it("shows the full-colour logo first, linking to the dashboard, before the title", () => {
    render(<MemoryRouter initialEntries={["/app/documents"]}><PlatformHeader /></MemoryRouter>);
    const header = screen.getByRole("banner", { name: "Platform header" });
    const link = within(header).getByRole("link", { name: "LAGDA — Go to Dashboard" });
    expect(link).toHaveAttribute("href", "/app/dashboard");
    expect(within(link).getByRole("img", { name: "LAGDA" }).getAttribute("src")).toMatch(/LagdaLogoPrimaryHorizontalFullColor/);
    const title = within(header).getByRole("heading", { level: 1 });
    expect(title).toHaveTextContent("Documents");
    expect(title).toHaveStyle({ textOverflow: "ellipsis", whiteSpace: "nowrap" });
    expect(link.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("the sidebar no longer carries the logo and starts with the switcher, collapsed or not", async () => {
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    const nav = screen.getByRole("complementary", { name: "Platform navigation" });
    expect(within(nav).queryByRole("link", { name: /Go to Dashboard/ })).toBeNull();
    expect(within(nav).queryByRole("img", { name: "LAGDA" })).toBeNull();
    const switcher = within(nav).getByTestId("workspace-switcher");
    const toggle = within(nav).getByRole("button", { name: "Collapse sidebar" });
    // Switcher and toggle share the first row: nothing sits above them.
    expect(within(screen.getByTestId("sidebar-top-row")).getByTestId("workspace-switcher")).toBe(switcher);
    expect(within(screen.getByTestId("sidebar-top-row")).getByRole("button", { name: "Collapse sidebar" })).toBe(toggle);
    await userEvent.click(toggle);
    expect(within(nav).getByTestId("workspace-switcher")).toHaveAttribute("data-collapsed", "true");
    expect(within(nav).getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });
});
