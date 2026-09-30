// The Workspace shell with a real backend: one header for every
// /app/workspace/* page, with the gear to Workspace Settings at its top
// right, four parts (Overview, People, Organisation, Activity log) and a row
// of tabs for the parts that have them — gated by what the viewer's role may
// use, counts from the API, the active part and tab following the URL
// (detail pages keep theirs active), sections rendered inside the shell
// without a second page header, and focus moved to the new section's heading.

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
import { MembersPage } from "../MembersPage";
import { MemberDetailPage } from "../MemberDetailPage";
import { JoinRequestsPage } from "../JoinRequestsPage";
import { JoinLinksPage } from "../JoinLinksPage";
import { InvitationsPage } from "../InvitationsPage";
import { TeamsPage } from "../TeamsPage";
import { TeamDetailPage } from "../TeamDetailPage";
import { RolesPage } from "../RolesPage";
import { RoleDetailPage } from "../RoleDetailPage";
import { SignedDocumentsPage } from "../SignedDocumentsPage";
import { ActivityPage } from "../ActivityPage";
import { WorkspaceSettingsPage } from "../WorkspaceSettingsPage";
import { ROLE_CAPABILITIES } from "../../../../models/workspace-role-policy";

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
          <Route path="members" element={<MembersPage />} />
          <Route path="join-requests" element={<JoinRequestsPage />} />
          <Route path="join-links" element={<JoinLinksPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="documents" element={<SignedDocumentsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<WorkspaceSettingsPage />} />
          <Route path="members/:memberId" element={<MemberDetailPage />} />
          <Route path="teams/:teamId" element={<TeamDetailPage />} />
          <Route path="roles/:roleId" element={<RoleDetailPage />} />
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

describe("Workspace shell — parts and tabs by capability", () => {
  it("gives an owner every part and tab, in order, with the overview's real counts", async () => {
    renderShellAt("/app/workspace/members");
    expect(await screen.findByTestId("workspace-name")).toHaveTextContent("Reyes Law Office");
    expect(partKeys()).toEqual(["part-overview", "part-people", "part-organisation", "part-activity"]);
    expect(tabKeys()).toEqual(["tab-members", "tab-invite", "tab-join-requests"]);

    await waitFor(() => expect(screen.getByTestId("tab-count-members")).toHaveTextContent("3"));
    await waitFor(() => expect(screen.getByTestId("tab-count-join-requests")).toHaveTextContent("2"));
    await waitFor(() => expect(screen.getByTestId("tab-count-invite")).toHaveTextContent("2"));
    // Waiting join requests are flagged, on the tab and on People; totals are not.
    expect(screen.getByTestId("tab-count-join-requests")).toHaveAttribute("data-tone", "attention");
    expect(screen.getByTestId("tab-count-members")).not.toHaveAttribute("data-tone");
    expect(screen.getByTestId("part-count-people")).toHaveTextContent("2");
    // The count is part of the accessible name.
    expect(screen.getByRole("link", { name: /Requests, 2 waiting/ })).toHaveAttribute("href", "/app/workspace/join-requests");
    expect(screen.getByRole("link", { name: /People, 2 waiting/ })).toHaveAttribute("href", "/app/workspace/members");
  });

  it("puts Teams, Organization units and Roles & permissions under Organisation", async () => {
    renderShellAt("/app/workspace/teams");
    await screen.findByTestId("team-un_fin");
    expect(tabKeys()).toEqual(["tab-teams", "tab-organization", "tab-roles"]);
    expect(screen.getByTestId("tab-roles")).toHaveTextContent("Roles & permissions");
    expect(screen.getByTestId("part-organisation")).toHaveAttribute("data-active", "true");
  });

  it("gives a New Comer only what their role reaches and never calls admin-only endpoints", async () => {
    platform.role = "viewer";
    accessRole = "member";
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-name");
    await waitFor(() => expect(screen.getByTestId("your-role")).toHaveTextContent("New Comer"));
    expect(partKeys()).toEqual(["part-overview", "part-organisation"]);
    // The gear opens the settings a New Comer may read.
    expect(screen.getByTestId("workspace-settings-gear")).toHaveAttribute("href", "/app/workspace/settings/branding");
    const forbidden = ["/members", "/join-requests", "/join-tickets", "/invitations", "/activity"];
    expect(calls.filter(c => forbidden.some(f => c.path.endsWith(f)))).toEqual([]);
  });

  it("shows an auditor the activity log, and People is for administrators", async () => {
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
    // No part is "Workspace settings": the gear is its only way in.
    expect(partKeys()).not.toContain("part-settings");

    await user.click(gear);
    expect(screen.getByTestId("location")).toHaveTextContent("/app/workspace/settings");
    expect(await screen.findByTestId("workspace-settings-heading")).toHaveTextContent("Workspace Settings");
    expect(tabKeys().slice(0, 4)).toEqual(["tab-general", "tab-branding", "tab-billing", "tab-usage"]);
    expect(screen.getByTestId("workspace-settings-gear")).toHaveAttribute("data-active", "true");
    expect(within(screen.getByTestId("workspace-parts")).getAllByRole("link").filter(l => l.getAttribute("data-active") === "true")).toEqual([]);
    expect(screen.getByTestId("workspace-settings-close")).toHaveAttribute("href", "/app/workspace");
  });
});

describe("Workspace shell — Invite people", () => {
  it("is one tab over email invitations and join links, with a switch between them", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/invitations");
    const email = await screen.findByTestId("invite-method-email");
    expect(email).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("tab-invite")).toHaveAttribute("data-active", "true");

    await user.click(screen.getByTestId("invite-method-link"));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/workspace/join-links");
    expect(screen.getByTestId("invite-method-link")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("tab-invite")).toHaveAttribute("data-active", "true");
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
    // The banners replace the hub's list of Manage pages.
    expect(within(section).queryByRole("link", { name: /^Members/ })).toBeNull();
    expect(within(section).getByRole("link", { name: /Signing routes/ })).toHaveAttribute("href", "/app/workflow");
    // The overview reads the shell's figures instead of asking again.
    expect(calls.filter(c => c.path === "/workspaces/ws_1/members")).toHaveLength(1);
  });

  it.each([
    ["/app/workspace/teams", "Teams"],
    ["/app/workspace/roles", "Who can do what"],
    ["/app/workspace/activity", "Activity log"],
    ["/app/workspace/join-requests", "Join requests"],
  ])("renders %s under the shell's header with its own section heading", async (path, heading) => {
    renderShellAt(path);
    const section = await screen.findByTestId("workspace-section");
    expect(within(section).getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(section).queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
  });
});

describe("Workspace shell — the active part and tab follow the URL", () => {
  it("marks the current tab and moves with a part click, keeping the header mounted", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/teams");
    await screen.findByTestId("team-un_fin");
    const header = screen.getByTestId("workspace-name");
    expect(screen.getByTestId("tab-teams")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("tab-teams")).toHaveAttribute("data-active", "true");

    await user.click(screen.getByTestId("part-people"));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/workspace/members");
    expect(await screen.findByRole("heading", { level: 2, name: "Member Directory" })).toBeInTheDocument();
    expect(screen.getByTestId("tab-members")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("part-people")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("part-organisation")).toHaveAttribute("data-active", "false");
    // Same element: the shell was not rebuilt by the section change.
    expect(screen.getByTestId("workspace-name")).toBe(header);
  });

  it("moves focus to the new section's heading, but not on first arrival", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/teams");
    const first = await screen.findByRole("heading", { level: 2, name: "Teams" });
    expect(document.activeElement).not.toBe(first);

    await user.click(screen.getByTestId("tab-roles"));
    const heading = await screen.findByRole("heading", { level: 2, name: "Who can do what" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("keeps the parent tab active on a detail page, with a way back", async () => {
    renderShellAt("/app/workspace/teams/un_fin");
    expect(await screen.findByRole("heading", { level: 2, name: "Finance" })).toBeInTheDocument();
    expect(screen.getByTestId("tab-teams")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("tab-teams")).toHaveAttribute("aria-current", "true");
    const crumbs = within(screen.getByTestId("workspace-section")).getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Teams" })).toHaveAttribute("href", "/app/workspace/teams");
    expect(within(crumbs).getByText("Finance")).toHaveAttribute("aria-current", "page");
  });

  it("keeps Members active on a member's page and Roles on a role's page", async () => {
    const { unmount } = renderShellAt("/app/workspace/members/m_sender");
    expect(await screen.findByRole("heading", { level: 2, name: "Jose Cruz" })).toBeInTheDocument();
    expect(screen.getByTestId("tab-members")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("part-people")).toHaveAttribute("data-active", "true");
    unmount();

    renderShellAt("/app/workspace/roles/sender");
    expect(await screen.findByTestId("role-abilities")).toBeInTheDocument();
    expect(screen.getByTestId("tab-roles")).toHaveAttribute("data-active", "true");
  });
});
