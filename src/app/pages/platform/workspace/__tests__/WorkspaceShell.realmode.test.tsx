// The Workspace shell with a real backend: one header for every
// /app/workspace/* page, with the gear to Workspace Settings at its top
// right, three parts (Overview, People & Teams, Activity log) — gated by what
// the viewer's role may use, the requests waiting shown on People & Teams —
// sections rendered inside the shell without a second page header, focus
// moved to the new section's heading, and Roles & permissions behind the gear.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.setConfig({ testTimeout: 15_000 });

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  role: "owner" as string | null,
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" } as { id: string; name: string } | null,
  workspaces: [
    { id: "ws_1", name: "Reyes Law Office", role: "owner", initials: "RL", accentColor: "#0078D4" },
  ],
  switchWorkspace: vi.fn(),
  applyWorkspaceRename: vi.fn(),
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { WorkspaceShell } from "../shell/WorkspaceShell";
import { WorkspaceOverviewPage } from "../WorkspaceOverviewPage";
import { PeopleTeamsPage } from "../PeopleTeamsPage";
import { RolesPage } from "../RolesPage";
import { RoleDetailPage } from "../RoleDetailPage";
import { SignedDocumentsPage } from "../SignedDocumentsPage";
import { ActivityPage } from "../ActivityPage";
import { WorkspaceSettingsPage } from "../WorkspaceSettingsPage";
import { ROLE_CAPABILITIES } from "../../../../models/workspace-role-policy";
import { resetPlanStore } from "../../../../hooks/usePlans";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const MEMBERS = [
  { membershipId: "m_owner", userId: "u1", email: "ana@example.com", displayName: "Ana Reyes", role: "owner", joinedAt: NOW - 90 * DAY, isCurrentUser: true, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_new", userId: "u2", email: "maria@example.com", displayName: "Maria Santos", role: "member", joinedAt: NOW - 3 * DAY, isCurrentUser: false, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_sender", userId: "u3", email: "jose@example.com", displayName: "Jose Cruz", role: "sender", joinedAt: NOW - 30 * DAY, isCurrentUser: false, roleTitle: "Paralegal", canRequestDocuments: false, canAssignSigners: false },
];
const REQUESTS = [
  { requestId: "jr_1", sourceKind: "ticket", ticketLabel: "Front desk", fullName: "Liza Tan", email: "liza@example.com", reason: null, requestedRole: "member", state: "pending", createdAt: NOW - DAY, decidedAt: null },
  { requestId: "jr_2", sourceKind: "invitation", ticketLabel: null, fullName: "Ramon Diaz", email: "ramon@example.com", reason: null, requestedRole: "member", state: "pending", createdAt: NOW - 2 * DAY, decidedAt: null },
];
const INVITATIONS = [
  { invitationId: "inv_1", email: "soon@example.com", role: "sender", state: "pending", createdAt: NOW - 6 * DAY, expiresAt: NOW + DAY },
  { invitationId: "inv_2", email: "later@example.com", role: "reviewer", state: "pending", createdAt: NOW - DAY, expiresAt: NOW + 6 * DAY },
  { invitationId: "inv_3", email: "gone@example.com", role: "member", state: "revoked", createdAt: NOW - 9 * DAY, expiresAt: NOW - DAY },
];
const TICKETS = [
  { ticketId: "jt_live", label: "Finance", recipientEmail: null, state: "sent", linkUrl: "https://x/join/a", sentAt: NOW, withdrawnAt: null, usedAt: null, request: null, createdAt: NOW, updatedAt: NOW },
  { ticketId: "jt_used", label: "Front desk", recipientEmail: null, state: "sent", linkUrl: null, sentAt: NOW, withdrawnAt: null, usedAt: NOW, request: { requestId: "jr_1", fullName: "Liza Tan", state: "pending" }, createdAt: NOW, updatedAt: NOW },
];
const UNITS = [
  { unitId: "un_fin", parentUnitId: null, kind: "department", name: "Finance", createdAt: NOW - 20 * DAY, archivedAt: null },
  { unitId: "un_cebu", parentUnitId: "un_fin", kind: "office", name: "Cebu Office", createdAt: NOW - 10 * DAY, archivedAt: null },
];

let accessRole = "owner";
const calls: { method: string; path: string }[] = [];

beforeEach(() => {
  resetPlanStore();
  calls.length = 0;
  platform.role = "owner";
  accessRole = "owner";
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("http://api.test", "").replace(/\?.*$/, "");
    calls.push({ method, path });
    const ok = (b: unknown) => Promise.resolve(json(200, b));
    if (method === "GET" && path === "/workspaces/ws_1") return ok({ workspaceId: "ws_1", name: "Reyes Law Office", role: accessRole, createdAt: Date.UTC(2026, 0, 15) });
    if (method === "GET" && path === "/workspaces/ws_1/access") {
      return ok({ workspaceId: "ws_1", membershipId: "m_me", role: accessRole, capabilities: [...ROLE_CAPABILITIES[accessRole as keyof typeof ROLE_CAPABILITIES]], roleTitle: null });
    }
    if (method === "GET" && path === "/workspaces/ws_1/members") return ok({ members: MEMBERS });
    if (method === "GET" && path === "/workspaces/ws_1/join-requests") return ok({ requests: REQUESTS });
    if (method === "GET" && path === "/workspaces/ws_1/invitations") return ok({ invitations: INVITATIONS });
    if (method === "GET" && path === "/workspaces/ws_1/join-tickets") return ok({ tickets: TICKETS });
    if (method === "GET" && path === "/workspaces/ws_1/units") return ok({ units: UNITS });
    if (method === "GET" && /\/units\/[^/]+\/members$/.test(path)) return ok({ members: [] });
    if (method === "GET" && path === "/workspaces/ws_1/activity") return ok({ events: [], nextCursor: null });
    if (method === "GET" && path === "/workspaces/ws_1/plan") return ok({ plan: "business", ownerIsYou: true, ownerName: "Ana Reyes", paidUntil: null });
    if (method === "GET" && path === "/workspaces/ws_1/people") return ok({ people: [] });
    return Promise.resolve(json(404, { error: { code: "resource_not_found", message: `${method} ${path}` } }));
  }));
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderShellAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/workspace" element={<WorkspaceShell />}>
          <Route index element={<WorkspaceOverviewPage />} />
          <Route path="people" element={<PeopleTeamsPage />} />
          <Route path="documents" element={<SignedDocumentsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<WorkspaceSettingsPage />} />
          <Route path="settings/roles" element={<RolesPage />} />
          <Route path="settings/roles/:roleId" element={<RoleDetailPage />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

const partKeys = () =>
  within(screen.getByTestId("workspace-parts")).getAllByRole("link").map(l => l.getAttribute("data-testid"));
const tabKeys = () =>
  within(screen.getByTestId("workspace-tabs")).getAllByRole("link").map(l => l.getAttribute("data-testid"));

describe("Workspace shell — parts by capability", () => {
  it("gives an owner the three parts, with the requests waiting on People & Teams", async () => {
    renderShellAt("/app/workspace/people");
    expect(await screen.findByTestId("workspace-name")).toHaveTextContent("Reyes Law Office");
    expect(partKeys()).toEqual(["part-overview", "part-people", "part-activity"]);
    expect(screen.getByTestId("part-people")).toHaveTextContent("People & Teams");
    // No row of tabs outside Workspace settings any more.
    expect(screen.queryByTestId("workspace-tabs")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("part-count-people")).toHaveTextContent("2"));
    expect(screen.getByRole("link", { name: /People & Teams, 2 waiting/ })).toHaveAttribute("href", "/app/workspace/people");
  });

  it("draws the teams as one tree, newest first, with sub-teams inside their team", async () => {
    renderShellAt("/app/workspace/people");
    const tree = await screen.findByTestId("team-tree");
    const finance = within(tree).getByRole("region", { name: "Finance" });
    expect(within(finance).getByRole("region", { name: "Cebu Office" })).toBeInTheDocument();
    expect(screen.getByTestId("part-people")).toHaveAttribute("data-active", "true");
  });

  it("gives a New Comer only what their role reaches and never calls admin-only endpoints", async () => {
    platform.role = "viewer";
    accessRole = "member";
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-name");
    await waitFor(() => expect(screen.getByTestId("your-role")).toHaveTextContent("New Comer"));
    expect(partKeys()).toEqual(["part-overview", "part-people"]);
    // The gear opens the settings a New Comer may read.
    expect(screen.getByTestId("workspace-settings-gear")).toHaveAttribute("href", "/app/workspace/settings/branding");
    const forbidden = ["ws_1/members", "/join-requests", "/join-tickets", "/invitations", "/activity"];
    expect(calls.filter(c => forbidden.some(f => c.path.endsWith(f)))).toEqual([]);
  });

  it("shows an auditor the activity log, and People & Teams is for those who may see people or teams", async () => {
    platform.role = "auditor";
    accessRole = "auditor";
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-name");
    await waitFor(() => expect(partKeys()).toContain("part-activity"));
    expect(partKeys()).not.toContain("part-people");
  });

  it("keeps the current tab when a direct link reaches a page the role does not list", async () => {
    platform.role = "sender";
    accessRole = "sender";
    renderShellAt("/app/workspace/settings");
    expect(await screen.findByTestId("workspace-name-readonly")).toHaveTextContent("Reyes Law Office");
    expect(screen.getByTestId("tab-general")).toHaveAttribute("aria-current", "page");
  });
});

describe("Workspace shell — Workspace Settings behind the gear", () => {
  it("is a gear at the top right, labelled Workspace Settings, opening General for an owner", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-name");
    const gear = screen.getByRole("link", { name: "Workspace Settings" });
    expect(gear).toBe(screen.getByTestId("workspace-settings-gear"));
    expect(gear).toHaveAttribute("href", "/app/workspace/settings");
    expect(gear).toHaveTextContent("Workspace Settings");
    expect(partKeys()).not.toContain("part-settings");

    await user.click(gear);
    expect(screen.getByTestId("location")).toHaveTextContent("/app/workspace/settings");
    expect(await screen.findByTestId("workspace-settings-heading")).toHaveTextContent("Workspace Settings");
    expect(tabKeys()).toEqual(["tab-general", "tab-branding", "tab-billing", "tab-usage", "tab-roles"]);
    expect(screen.getByTestId("tab-roles")).toHaveTextContent("Roles & permissions");
    expect(screen.getByTestId("workspace-settings-gear")).toHaveAttribute("data-active", "true");
    expect(within(screen.getByTestId("workspace-parts")).getAllByRole("link").filter(l => l.getAttribute("data-active") === "true")).toEqual([]);
    expect(screen.getByTestId("workspace-settings-close")).toHaveAttribute("href", "/app/workspace");
  });

  it("keeps Roles & permissions active on a role's page", async () => {
    renderShellAt("/app/workspace/settings/roles/sender");
    expect(await screen.findByTestId("role-abilities")).toBeInTheDocument();
    expect(screen.getByTestId("tab-roles")).toHaveAttribute("data-active", "true");
  });
});

describe("Workspace shell — Invite people", () => {
  it("is one button at the lower right, opening email invitations, join links and requests", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/people");
    const toggle = await screen.findByTestId("invite-people-toggle");
    await waitFor(() => expect(screen.getByTestId("invite-people-pending")).toHaveTextContent("2"));
    await user.click(toggle);
    const panel = screen.getByTestId("invite-people-panel");
    expect(within(panel).getAllByRole("tab").map(t => t.textContent?.replace(/\d+$/, "").trim())).toEqual(["Invite by email", "Join links", "Requests"]);
    await user.click(within(panel).getByTestId("invite-tab-links"));
    expect(await within(panel).findByTestId("join-links-section")).toBeInTheDocument();
    await user.click(within(panel).getByTestId("invite-tab-requests"));
    expect(await within(panel).findByTestId("join-requests-section")).toBeInTheDocument();
  });
});

describe("Workspace shell — sections render inside it", () => {
  it("renders the overview as a section: one page heading, no second header", async () => {
    renderShellAt("/app/workspace");
    await waitFor(() => expect(screen.getByTestId("stat-members")).toHaveTextContent("3"));
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByTestId("workspace-name")).toHaveLength(1);
    const section = screen.getByTestId("workspace-section");
    expect(within(section).getByRole("heading", { level: 2, name: "Overview" })).toBeInTheDocument();
    expect(within(section).getByTestId("needs-attention")).toHaveTextContent("Liza Tan asked to join");
    expect(within(section).queryByRole("link", { name: /^Members/ })).toBeNull();
    expect(within(section).getByRole("link", { name: /Signing routes/ })).toHaveAttribute("href", "/app/workflow");
    expect(calls.filter(c => c.path === "/workspaces/ws_1/members")).toHaveLength(1);
  });

  it.each([
    ["/app/workspace/people", "People & Teams"],
    ["/app/workspace/settings/roles", "Who can do what"],
    ["/app/workspace/activity", "Activity log"],
  ])("renders %s under the shell's header with its own section heading", async (path, heading) => {
    renderShellAt(path);
    const section = await screen.findByTestId("workspace-section");
    expect(await within(section).findByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(section).queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
  });
});

describe("Workspace shell — the active part follows the URL", () => {
  it("moves with a part click, keeping the header mounted", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/people");
    await screen.findByTestId("team-tree");
    const header = screen.getByTestId("workspace-name");
    expect(screen.getByTestId("part-people")).toHaveAttribute("data-active", "true");

    await user.click(screen.getByTestId("part-activity"));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/workspace/activity");
    expect(await screen.findByRole("heading", { level: 2, name: "Activity log" })).toBeInTheDocument();
    expect(screen.getByTestId("part-activity")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("part-people")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("workspace-name")).toBe(header);
  });

  it("moves focus to the new section's heading, but not on first arrival", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/people");
    const first = await screen.findByRole("heading", { level: 2, name: "People & Teams" });
    expect(document.activeElement).not.toBe(first);

    await user.click(screen.getByTestId("part-activity"));
    const heading = await screen.findByRole("heading", { level: 2, name: "Activity log" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("opens a person's panel from a link to them", async () => {
    renderShellAt("/app/workspace/people?member=m_sender");
    const panel = await screen.findByTestId("member-panel");
    expect(within(panel).getByRole("heading", { level: 2 })).toHaveTextContent("Jose Cruz");
  });
});
