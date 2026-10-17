// The notary on-ramp's entries in navigation: Notary requests, Notary desk and
// Review notaries appear only once the server says this account has them, in
// the sidebar and in the mobile drawer. A 404, a refusal or a failed request
// leave them hidden, silently.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

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
import { ONRAMP_NAV, PRIMARY_NAV, ACCOUNT_NAV, UTILITY_NAV, onrampNavFor } from "../../../config/platform.nav";
import { resetAccountFeatures } from "../../../hooks/useAccountFeatures";
import { resetHeldAnswers } from "../../../services/api-client";

type Answer = { status: number; body: unknown } | "network-error";
const NOT_FOUND: Answer = { status: 404, body: { error: { code: "resource_not_found", message: "no such route" } } };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let answers: Record<string, Answer>;
const asked: string[] = [];

beforeEach(() => {
  resetAccountFeatures();
  resetHeldAnswers();
  asked.length = 0;
  answers = {};
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const path = String(input).replace("http://api.test", "");
    asked.push(path);
    const reply = answers[path] ?? NOT_FOUND;
    if (reply === "network-error") return Promise.reject(new TypeError("Failed to fetch"));
    return Promise.resolve(json(reply.status, reply.body));
  }));
});
afterEach(() => { vi.unstubAllGlobals(); resetAccountFeatures(); });

const asks = (path: string) => asked.filter(item => item === path).length;
const settled = () => waitFor(() => {
  expect(asks("/me/enotary/invitations")).toBeGreaterThan(0);
  expect(asks("/me/notary/desk")).toBeGreaterThan(0);
  expect(asks("/admin/notary-applications")).toBeGreaterThan(0);
});
const OK_LIST: Answer = { status: 200, body: { invitations: [] } };
const DESK = (applicationStatus: string, requests: unknown[] = []): Answer => ({ status: 200, body: { applicationStatus, canAccept: false, requests } });
const OK_ADMIN: Answer = { status: 200, body: { applications: [] } };

describe("the configuration", () => {
  it("lists the three entries apart from the rails every account has", () => {
    expect(ONRAMP_NAV.map(item => [item.id, item.label, item.path])).toEqual([
      ["notary-requests", "Notary requests", "/app/enotary/requests"],
      ["notary-desk", "Notary desk", "/app/enotary/desk"],
      ["notary-review", "Review notaries", "/app/admin/notary-applications"],
    ]);
    expect([...PRIMARY_NAV, ...ACCOUNT_NAV, ...UTILITY_NAV].filter(item => item.account?.startsWith("notary"))).toEqual([]);
  });

  it("picks only what the account has", () => {
    const none = { notaryRequests: false, notaryDesk: false, notaryReview: false };
    expect(onrampNavFor(none)).toEqual([]);
    expect(onrampNavFor({ ...none, notaryDesk: true }).map(item => item.id)).toEqual(["notary-desk"]);
    expect(onrampNavFor({ notaryRequests: true, notaryDesk: true, notaryReview: true }).map(item => item.id)).toEqual(["notary-requests", "notary-desk", "notary-review"]);
  });
});

describe("the sidebar", () => {
  const links = () => within(screen.getByRole("navigation", { name: "Platform sections" })).getAllByRole("link").map(link => link.textContent);

  it("shows none of them while the server says nothing is offered", async () => {
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    await settled();
    expect(links()).not.toContain("Notary requests");
    expect(links()).not.toContain("Notary desk");
    expect(links()).not.toContain("Review notaries");
    expect(links()).toContain("Notary Directory");
  });

  it("shows Notary requests where requests to notaries are offered", async () => {
    answers["/me/enotary/invitations"] = OK_LIST;
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "Notary requests" })).toHaveAttribute("href", "/app/enotary/requests");
    expect(links()).not.toContain("Notary desk");
  });

  it.each([
    ["an application has been started", DESK("draft"), true],
    ["a request is waiting", DESK("none", [{ id: "eni_1" }]), true],
    ["nothing yet: no application, no request", DESK("none"), false],
  ])("Notary desk when %s", async (_why, desk, shown) => {
    answers["/me/notary/desk"] = desk;
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    await settled();
    if (shown) expect(await screen.findByRole("link", { name: "Notary desk" })).toHaveAttribute("href", "/app/enotary/desk");
    else expect(links()).not.toContain("Notary desk");
  });

  it("shows Review notaries to a reviewer only", async () => {
    answers["/admin/notary-applications"] = OK_ADMIN;
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "Review notaries" })).toHaveAttribute("href", "/app/admin/notary-applications");
  });

  it.each<[string, Answer]>([
    ["a refusal", { status: 403, body: { error: { code: "forbidden", message: "no" } } }],
    ["a failed request", "network-error"],
    ["a server error", { status: 500, body: { error: { code: "internal", message: "x" } } }],
  ])("shows none of them after %s, and no error", async (_why, reply) => {
    answers["/me/enotary/invitations"] = reply;
    answers["/me/notary/desk"] = reply;
    answers["/admin/notary-applications"] = reply;
    render(<MemoryRouter><PlatformSidebar /></MemoryRouter>);
    await settled();
    expect(links().filter(label => ["Notary requests", "Notary desk", "Review notaries"].includes(label ?? ""))).toEqual([]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("asks the server once for each, however many menus are on screen", async () => {
    answers["/me/enotary/invitations"] = OK_LIST;
    render(<MemoryRouter><PlatformSidebar /><MobileNav /></MemoryRouter>);
    await settled();
    expect(asks("/me/enotary/invitations")).toBe(1);
    expect(asks("/me/notary/desk")).toBe(1);
    expect(asks("/admin/notary-applications")).toBe(1);
  });
});

describe("the mobile drawer", () => {
  it("has the same entries, in the drawer", async () => {
    answers["/me/enotary/invitations"] = OK_LIST;
    answers["/me/notary/desk"] = DESK("approved");
    answers["/admin/notary-applications"] = OK_ADMIN;
    render(<MemoryRouter><MobileNav /></MemoryRouter>);
    await settled();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    expect(await within(drawer).findByRole("link", { name: "Notary requests" })).toHaveAttribute("href", "/app/enotary/requests");
    expect(within(drawer).getByRole("link", { name: "Notary desk" })).toHaveAttribute("href", "/app/enotary/desk");
    expect(within(drawer).getByRole("link", { name: "Review notaries" })).toHaveAttribute("href", "/app/admin/notary-applications");
  });

  it("hides them where nothing is offered", async () => {
    render(<MemoryRouter><MobileNav /></MemoryRouter>);
    await settled();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    expect(within(drawer).queryByRole("link", { name: "Notary requests" })).toBeNull();
    expect(within(drawer).queryByRole("link", { name: "Review notaries" })).toBeNull();
  });
});
