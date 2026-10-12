// The mobile bottom bar: Home, Documents, Prepare Document in the middle,
// Shared Documents and Templates, always shown. The drawer keeps the rest,
// and the avatar in the top bar opens the profile.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const platform = vi.hoisted(() => ({
  user: null as { id: string; displayName: string; email: string } | null,
  canPrepare: true,
}));

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: "" }));
vi.mock("../NotificationMenu", () => ({ NotificationMenu: () => <div data-testid="bell" /> }));
vi.mock("../../../tour/TourContext", () => ({ useTour: () => ({ restartTour: vi.fn() }) }));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    hasPermission: (permission: string) => permission !== "prepare_documents" || platform.canPrepare,
    hasFlag: () => true, unreadCount: 0, user: platform.user, currentWorkspace: null,
  }),
}));
vi.mock("../../../context/NotificationCenterContext", () => ({
  useNotificationCenter: () => ({ items: [], unreadCount: 0 }),
  useOptionalNotificationCenter: () => ({ items: [], unreadCount: 0 }),
}));
vi.mock("../../../hooks/useSignOutFlow", () => ({ useSignOutFlow: () => ({ requestSignOut: vi.fn(), confirmDialog: null }) }));
vi.mock("../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => () => undefined }) }));
vi.mock("../../../hooks/usePendingInvitationCount", () => ({ usePendingInvitationCount: () => 0 }));

import { MobileNav } from "../MobileNav";

beforeEach(() => {
  platform.user = null;
  platform.canPrepare = true;
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))));
});
afterEach(() => { vi.unstubAllGlobals(); });

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><MobileNav /></MemoryRouter>);
const bar = () => screen.getByRole("navigation", { name: "Main sections" });

describe("MobileNav bottom bar", () => {
  it("holds the four places with Prepare Document in the middle", () => {
    renderAt("/app/dashboard");
    const links = within(bar()).getAllByRole("link");
    expect(links.map(link => link.getAttribute("aria-label"))).toEqual([
      "Home", "Documents", "Prepare Document", "Shared Documents", "Templates",
    ]);
    expect(links.map(link => link.getAttribute("href"))).toEqual([
      "/app/dashboard", "/app/documents", "/app/prepare", "/app/shared-documents", "/app/templates",
    ]);
  });

  it("marks the place the page is in, and rests the circle on it", () => {
    renderAt("/app/shared-documents");
    expect(within(bar()).getByRole("link", { name: "Shared Documents" })).toHaveAttribute("aria-current", "page");
    expect(within(bar()).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    const pill = screen.getByTestId("mobile-bottom-pill");
    // The fourth of five places: its centre is at 70% of the bar.
    expect(pill.style.left).toBe("calc(70% - 26px)");
    expect(pill.style.opacity).toBe("1");
  });

  it("brings the circle to the middle while a document is being prepared", () => {
    renderAt("/app/prepare/upload");
    const pill = screen.getByTestId("mobile-bottom-pill");
    expect(pill.style.left).toBe("calc(50% - 26px)");
    expect(pill.style.opacity).toBe("1");
  });

  it("hides the circle on a page the bar does not list", () => {
    renderAt("/app/contacts");
    expect(screen.getByTestId("mobile-bottom-pill").style.opacity).toBe("0");
    expect(within(bar()).queryByRole("link", { current: "page" })).toBeNull();
  });

  it("leaves Prepare Document out for someone who cannot prepare", () => {
    platform.canPrepare = false;
    renderAt("/app/dashboard");
    expect(within(bar()).queryByRole("link", { name: "Prepare Document" })).toBeNull();
    expect(within(bar()).getAllByRole("link")).toHaveLength(4);
  });

  it("keeps only the remaining places in the drawer", async () => {
    renderAt("/app/dashboard");
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    const names = within(drawer).getAllByRole("link").map(link => link.textContent ?? "");
    for (const moved of ["Home", "Documents", "Shared Documents", "Templates", "Prepare Document"]) {
      expect(names).not.toContain(moved);
    }
    for (const kept of ["Contacts", "Verify a Document", "Workspace", "My Settings"]) {
      expect(names).toContain(kept);
    }
  });

  it("opens the profile from the avatar in the top bar", () => {
    platform.user = { id: "usr_1", displayName: "Angela Ramos", email: "angela@example.test" };
    renderAt("/app/dashboard");
    expect(screen.getByRole("link", { name: "Your profile" })).toHaveAttribute("href", "/app/settings/profile");
  });
});
