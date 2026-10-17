// What the server offers this ACCOUNT, in navigation: the eNotary entry in the
// sidebar and the mobile drawer, the Identity verification section in My
// Settings, and the "Verified" badge beside the person's own name.
//
// Pinned here: each appears only once the server says so; a 404, a plain
// "not available" or a failed request all leave it hidden, silently; and the
// server is asked once, however many menus are on screen.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../NotificationMenu", () => ({ NotificationMenu: () => <div data-testid="bell" /> }));
vi.mock("../../../tour/TourContext", () => ({ useTour: () => ({ restartTour: vi.fn() }) }));
vi.mock("../WorkspaceSwitcher", () => ({ WorkspaceSwitcher: () => <div />, WorkspacePlanLine: () => null }));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    hasPermission: () => true, hasFlag: () => true, unreadCount: 0, role: "owner",
    user: { id: "u1", email: "ana@example.com", displayName: "Ana Reyes", fullName: "Ana Reyes" },
    currentWorkspace: null,
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
import { ACCOUNT_NAV, PRIMARY_NAV, UTILITY_NAV } from "../../../config/platform.nav";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { IDENTITY_SECTION, SETTINGS_SECTIONS, settingsSectionForPath, settingsSectionsFor } from "../../../pages/platform/settings/sections";
import { resetAccountFeatures, publishAccountIdentity } from "../../../hooks/useAccountFeatures";
import { resetHeldAnswers } from "../../../services/api-client";
import { runSignOutCleanup } from "../../../services/session-lifecycle";
import { act } from "@testing-library/react";

type Answer = { status: number; body: unknown } | "network-error";

let identity: Answer;
let enotary: Answer;
const asked: string[] = [];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const IDENTITY = {
  available: true, status: "unverified", verifiedName: null, verifiedAt: null, validUntil: null,
  pendingReview: false, canUseFaceCheck: false, nameMatchesProfile: null,
};
const ACCESS = {
  available: true, role: "client", attorneyApproved: null,
  account: { status: "unverified", verifiedName: null, validUntil: null },
  required: "full", granted: false, grantedUntil: null, pendingReview: false, nameMatchesProfile: null,
};
const NOT_FOUND: Answer = { status: 404, body: { error: { code: "resource_not_found", message: "no such route" } } };

beforeEach(() => {
  resetAccountFeatures();
  resetHeldAnswers();
  asked.length = 0;
  identity = NOT_FOUND;
  enotary = NOT_FOUND;
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const path = url.replace("http://api.test", "");
    asked.push(path);
    const reply = path === "/me/identity" ? identity : path === "/me/enotary/access?role=client" ? enotary : NOT_FOUND;
    if (reply === "network-error") return Promise.reject(new TypeError("Failed to fetch"));
    return Promise.resolve(json(reply.status, reply.body));
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAccountFeatures();
});

const askedFor = (path: string) => asked.filter(item => item === path).length;
const settled = () => waitFor(() => {
  expect(askedFor("/me/identity")).toBeGreaterThan(0);
  expect(askedFor("/me/enotary/access?role=client")).toBeGreaterThan(0);
});

describe("the Notary Directory entry", () => {
  it("is in the configuration, open to every signed-in person", () => {
    expect(ACCOUNT_NAV).toHaveLength(1);
    expect(ACCOUNT_NAV[0]).toMatchObject({ id: "enotary", label: "Notary Directory", path: "/app/enotary", icon: "Stamp" });
    // Nothing in any rail depends on what the account is offered.
    expect([...PRIMARY_NAV, ...ACCOUNT_NAV, ...UTILITY_NAV].filter(entry => entry.account !== undefined)).toEqual([]);
    // Both menus can draw its icon.
    for (const file of ["PlatformSidebar.tsx", "MobileNav.tsx"]) {
      const source = readFileSync(resolve(__dirname, "..", file), "utf8");
      const map = source.slice(source.indexOf("const ICON_MAP"), source.indexOf("};", source.indexOf("const ICON_MAP")));
      expect(map, file).toContain(" Stamp,");
    }
  });

  it.each<[string, Answer]>([
    ["the eNotary gate is switched off (404)", NOT_FOUND],
    ["the server says it is not available", { status: 200, body: { ...ACCESS, available: false } }],
    ["the server cannot be reached", "network-error"],
    ["the gate is on", { status: 200, body: ACCESS }],
  ])("is in the sidebar when %s", async (_why, reply) => {
    enotary = reply;
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    const link = await screen.findByRole("link", { name: "Notary Directory" });
    expect(link).toHaveAttribute("href", "/app/enotary");
    expect(within(screen.getByRole("navigation", { name: "Platform sections" })).getAllByRole("link")).toContain(link);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is in the mobile drawer too", async () => {
    render(<MemoryRouter><MobileNav /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    expect(within(drawer).getByRole("link", { name: "Notary Directory" })).toHaveAttribute("href", "/app/enotary");
  });
});

describe("the Identity verification section in My Settings", () => {
  function renderSettings() {
    return render(
      <MemoryRouter initialEntries={["/app/settings/preferences"]}>
        <Routes>
          <Route path="/app/settings" element={<SettingsLayout />}>
            <Route path="preferences" element={<div>preferences</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }
  const banners = () => within(screen.getByTestId("settings-banners")).getAllByRole("link").map(link => link.getAttribute("href"));

  it("has its own place in the list only where it is offered, after Security", () => {
    expect(settingsSectionsFor(false)).toBe(SETTINGS_SECTIONS);
    const offered = settingsSectionsFor(true).map(section => section.key);
    expect(offered.indexOf("identity")).toBe(offered.indexOf("security") + 1);
    expect(offered.filter(key => key !== "identity")).toEqual(SETTINGS_SECTIONS.map(section => section.key));
    expect(IDENTITY_SECTION).toMatchObject({ label: "Identity verification", path: "/app/settings/identity", group: "personal" });
    expect(settingsSectionForPath("/app/settings/identity")?.key).toBe("identity");
  });

  it("is in the carousel once the server says it is available", async () => {
    identity = { status: 200, body: IDENTITY };
    renderSettings();
    const banner = await screen.findByTestId("settings-banner-identity");
    expect(banner).toHaveAttribute("href", "/app/settings/identity");
    expect(banner.textContent ?? "").toContain("Identity verification");
    expect(banners().indexOf("/app/settings/identity")).toBe(banners().indexOf("/app/settings/security") + 1);
  });

  it.each<[string, Answer]>([
    ["the route is not there (404)", NOT_FOUND],
    ["the server says it is not available", { status: 200, body: { ...IDENTITY, available: false } }],
    ["the server cannot be reached", "network-error"],
  ])("is not in the carousel when %s", async (_why, reply) => {
    identity = reply;
    renderSettings();
    await settled();
    expect(screen.queryByTestId("settings-banner-identity")).toBeNull();
    expect(banners()).toEqual(SETTINGS_SECTIONS.map(section => section.path));
    expect(screen.queryByTestId("settings-verified-badge")).toBeNull();
  });
});

describe("the Verified badge beside the person's own name", () => {
  it("is in the My Settings header and the account menu when the account is verified", async () => {
    identity = { status: 200, body: { ...IDENTITY, status: "verified", verifiedName: "Ana Maria Reyes", verifiedAt: "2026-10-12T02:00:00.000Z" } };
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
    const inSettings = await screen.findByTestId("settings-verified-badge");
    expect(inSettings.textContent ?? "").toBe("Verified");
    expect(inSettings).toHaveAttribute("title", "Your identity is verified");
    await userEvent.click(screen.getByRole("button", { name: "Account menu for Ana Reyes" }));
    const inMenu = within(screen.getByRole("menu", { name: "Account menu" })).getByTestId("account-menu-verified-badge");
    expect(inMenu.textContent ?? "").toBe("Verified");
    // Never the name read from the ID: only that the account is verified.
    expect(document.body.textContent ?? "").not.toContain("Ana Maria Reyes");
  });

  it.each<[string, Answer]>([
    ["not verified", { status: 200, body: IDENTITY }],
    ["expired", { status: 200, body: { ...IDENTITY, status: "expired" } }],
    ["not offered", NOT_FOUND],
  ])("is absent when the account is %s", async (_why, reply) => {
    identity = reply;
    render(<MemoryRouter><UserMenu collapsed={false} onSignOut={vi.fn()} /></MemoryRouter>);
    await settled();
    await userEvent.click(screen.getByRole("button", { name: "Account menu for Ana Reyes" }));
    expect(screen.getByRole("menu", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.queryByTestId("account-menu-verified-badge")).toBeNull();
  });

  it("is beside the name in the mobile drawer too, and absent there when not verified", async () => {
    identity = { status: 200, body: { ...IDENTITY, status: "verified", verifiedAt: "2026-10-12T02:00:00.000Z" } };
    render(<MemoryRouter><MobileNav /></MemoryRouter>);
    await settled();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const badge = await within(screen.getByRole("dialog", { name: "Navigation" })).findByTestId("mobile-nav-verified-badge");
    expect(badge.textContent ?? "").toBe("Verified");
    act(() => { publishAccountIdentity(null); });
    expect(screen.queryByTestId("mobile-nav-verified-badge")).toBeNull();
  });

  it("follows what the Identity verification page has just learnt", async () => {
    identity = { status: 200, body: IDENTITY };
    render(<MemoryRouter><UserMenu collapsed={false} onSignOut={vi.fn()} /></MemoryRouter>);
    await settled();
    await userEvent.click(screen.getByRole("button", { name: "Account menu for Ana Reyes" }));
    expect(screen.queryByTestId("account-menu-verified-badge")).toBeNull();
    act(() => {
      publishAccountIdentity({
        available: true, status: "verified", verifiedName: "Ana Maria Reyes", verifiedAt: "2026-10-12T02:00:00.000Z",
        validUntil: null, pendingReview: false, canUseFaceCheck: true, nameMatchesProfile: "match",
      });
    });
    expect(screen.getByTestId("account-menu-verified-badge")).toBeInTheDocument();
    act(() => { publishAccountIdentity(null); });
    expect(screen.queryByTestId("account-menu-verified-badge")).toBeNull();
  });
});
