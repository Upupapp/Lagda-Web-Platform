// The demo build (no backend): none of the account-verification or eNotary
// calls are made, and none of their menu entries, sections or badges appear.
// A direct visit to one of the new pages says "not available" and asks the
// network nothing.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: null }));
vi.mock("../NotificationMenu", () => ({ NotificationMenu: () => <div data-testid="bell" /> }));
vi.mock("../../../tour/TourContext", () => ({ useTour: () => ({ restartTour: vi.fn() }) }));
vi.mock("../WorkspaceSwitcher", () => ({ WorkspaceSwitcher: () => <div />, WorkspacePlanLine: () => null }));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    hasPermission: () => true, hasFlag: () => true, unreadCount: 0, role: "owner", sessionStatus: "authenticated",
    user: { id: "u1", email: "ana@example.com", displayName: "Ana Reyes", fullName: "Ana Reyes" },
    currentWorkspace: { id: "ws_demo", name: "Reyes & Partners" },
  }),
}));
vi.mock("../../../context/NotificationCenterContext", () => ({
  useNotificationCenter: () => ({ items: [], unreadCount: 0 }),
  useOptionalNotificationCenter: () => ({ items: [], unreadCount: 0 }),
}));
vi.mock("../../../hooks/useSignOutFlow", () => ({ useSignOutFlow: () => ({ requestSignOut: vi.fn(), confirmDialog: null }) }));
vi.mock("../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));
vi.mock("../../../hooks/usePendingInvitationCount", () => ({ usePendingInvitationCount: () => 0 }));

import { PlatformSidebar } from "../PlatformSidebar";
import { MobileNav } from "../MobileNav";
import { UserMenu } from "../UserMenu";
import { SettingsLayout } from "../../../pages/platform/settings/SettingsShell";
import { IdentityVerificationPage } from "../../../pages/platform/settings/IdentityVerificationPage";
import { EnotaryAccessPage } from "../../../pages/platform/enotary/EnotaryAccessPage";
import { EnotarySessionPage } from "../../../pages/platform/enotary/EnotarySessionPage";
import { SETTINGS_SECTIONS } from "../../../pages/platform/settings/sections";
import { resetAccountFeatures } from "../../../hooks/useAccountFeatures";
import { providerReturnState } from "../../../models/identity-check";

const fetchSpy = vi.fn();

beforeEach(() => {
  resetAccountFeatures();
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
  window.sessionStorage.clear();
});

afterEach(() => { vi.unstubAllGlobals(); });

/** Lets anything that would have been asked be asked. */
const settle = () => new Promise(resolve => { setTimeout(resolve, 50); });

describe("the demo build", () => {
  it("shows no eNotary entry in the sidebar or the mobile drawer, and asks the network nothing", async () => {
    render(<MemoryRouter><PlatformSidebar /><MobileNav /></MemoryRouter>);
    await settle();
    expect(screen.getAllByRole("link", { name: "Documents" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "eNotary" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(within(screen.getByRole("dialog", { name: "Navigation" })).queryByRole("link", { name: "eNotary" })).toBeNull();
    expect(document.querySelector('a[href="/app/enotary"]')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows no Identity verification section and no Verified badge", async () => {
    render(
      <MemoryRouter initialEntries={["/app/settings/preferences"]}>
        <Routes>
          <Route path="/app/settings" element={<SettingsLayout />}>
            <Route path="preferences" element={<div>preferences</div>} />
          </Route>
        </Routes>
        <UserMenu collapsed={false} onSignOut={vi.fn()} />
      </MemoryRouter>,
    );
    await settle();
    expect(screen.queryByTestId("settings-banner-identity")).toBeNull();
    expect(within(screen.getByTestId("settings-banners")).getAllByRole("link").map(link => link.getAttribute("href")))
      .toEqual(SETTINGS_SECTIONS.map(section => section.path));
    expect(screen.queryByTestId("settings-verified-badge")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Account menu for Ana Reyes" }));
    expect(screen.queryByTestId("account-menu-verified-badge")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("says 'not available' on a direct visit to Identity verification, even one that claims a return", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/app/settings/identity", state: providerReturnState(Date.now()) }]}>
        <Routes><Route path="/app/settings/identity" element={<IdentityVerificationPage />} /></Routes>
      </MemoryRouter>,
    );
    await settle();
    expect(screen.getByTestId("identity-unavailable").textContent ?? "").toBe("Not available on this account yet.");
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["/app/enotary/access", <EnotaryAccessPage key="gate" />],
    ["/app/enotary/session", <EnotarySessionPage key="session" />],
  ])("says 'not available' on a direct visit to %s", async (path, element) => {
    render(
      <MemoryRouter initialEntries={[{ pathname: path, search: "?role=client", state: providerReturnState(Date.now()) }]}>
        <Routes><Route path={path} element={element} /></Routes>
      </MemoryRouter>,
    );
    await settle();
    expect(screen.getByText("Not available on this account yet.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("link", { name: /Enter eNotary|notarized|notary public/ })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
