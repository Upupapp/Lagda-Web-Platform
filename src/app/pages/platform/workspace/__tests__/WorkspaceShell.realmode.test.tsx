// The Manage workspace shell with a real backend: one header and one row of
// section banners for every /app/workspace/* page, banners gated by what the
// viewer's role may use, counts from the API, the active banner following
// the URL (detail pages keep their section active), sections rendered inside
// the shell without a second page header, focus moved to the new section's
// heading, and arrow-key movement along the banner row.

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
import { WORKSPACE_SECTIONS } from "../shell/sections";
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

const bannerKeys = () =>
  within(screen.getByTestId("workspace-banners")).getAllByRole("link").map(l => l.getAttribute("data-testid"));

describe("Workspace shell — banners by capability", () => {
  it("gives an owner every section, in order, with the overview's real counts", async () => {
    renderShellAt("/app/workspace");
    expect(await screen.findByTestId("workspace-name")).toHaveTextContent("Reyes Law Office");
    expect(bannerKeys()).toEqual(WORKSPACE_SECTIONS.map(s => `banner-${s.key}`));

    await waitFor(() => expect(screen.getByTestId("banner-count-members")).toHaveTextContent("3"));
    await waitFor(() => expect(screen.getByTestId("banner-count-join-requests")).toHaveTextContent("2"));
    await waitFor(() => expect(screen.getByTestId("banner-count-invitations")).toHaveTextContent("2"));
    await waitFor(() => expect(screen.getByTestId("banner-count-join-links")).toHaveTextContent("1"));
    // Waiting join requests are flagged; totals are not.
    expect(screen.getByTestId("banner-count-join-requests")).toHaveAttribute("data-tone", "attention");
    expect(screen.getByTestId("banner-count-members")).not.toHaveAttribute("data-tone");
    // The count is part of the banner's accessible name.
    expect(screen.getByRole("link", { name: /Join requests, 2 waiting/ })).toHaveAttribute("href", "/app/workspace/join-requests");
    expect(screen.getByTestId("banner-roles")).toHaveAttribute("title", "Who can do what");
    expect(screen.getByTestId("banner-documents")).toHaveAttribute("title", "All workspace documents");
  });

  it("gives a New Comer only what their role reaches and never calls admin-only endpoints", async () => {
    platform.role = "viewer";
    accessRole = "member";
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-name");
    await waitFor(() => expect(screen.getByTestId("your-role")).toHaveTextContent("New Comer"));
    expect(bannerKeys()).toEqual(["banner-overview", "banner-teams", "banner-roles"]);
    const forbidden = ["/members", "/join-requests", "/join-tickets", "/invitations", "/activity"];
    expect(calls.filter(c => forbidden.some(f => c.path.endsWith(f)))).toEqual([]);
  });

  it("shows an auditor the activity log and documents are for administrators", async () => {
    platform.role = "auditor";
    accessRole = "auditor";
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-name");
    await waitFor(() => expect(bannerKeys()).toContain("banner-activity"));
    expect(bannerKeys()).not.toContain("banner-members");
    expect(bannerKeys()).not.toContain("banner-documents");
    expect(bannerKeys()).not.toContain("banner-settings");
  });

  it("keeps the current section's banner when a direct link reaches a section the role does not list", async () => {
    platform.role = "sender";
    accessRole = "sender";
    renderShellAt("/app/workspace/settings");
    expect(await screen.findByTestId("workspace-name-readonly")).toHaveTextContent("Reyes Law Office");
    expect(screen.getByTestId("banner-settings")).toHaveAttribute("aria-current", "page");
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

describe("Workspace shell — the active banner follows the URL", () => {
  it("marks the current section and moves with a banner click, keeping the header mounted", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/teams");
    await screen.findByTestId("team-un_fin");
    const header = screen.getByTestId("workspace-name");
    expect(screen.getByTestId("banner-teams")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("banner-teams")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("banner-members")).not.toHaveAttribute("aria-current");

    await user.click(screen.getByTestId("banner-members"));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/workspace/members");
    expect(await screen.findByRole("heading", { level: 2, name: "Member Directory" })).toBeInTheDocument();
    expect(screen.getByTestId("banner-members")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("banner-teams")).toHaveAttribute("data-active", "false");
    // Same element: the shell was not rebuilt by the section change.
    expect(screen.getByTestId("workspace-name")).toBe(header);
  });

  it("moves focus to the new section's heading, but not on first arrival", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/teams");
    const first = await screen.findByRole("heading", { level: 2, name: "Teams" });
    expect(document.activeElement).not.toBe(first);

    await user.click(screen.getByTestId("banner-roles"));
    const heading = await screen.findByRole("heading", { level: 2, name: "Who can do what" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("keeps the parent section active on a detail page, with a way back", async () => {
    renderShellAt("/app/workspace/teams/un_fin");
    expect(await screen.findByRole("heading", { level: 2, name: "Finance" })).toBeInTheDocument();
    expect(screen.getByTestId("banner-teams")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("banner-teams")).toHaveAttribute("aria-current", "true");
    const crumbs = within(screen.getByTestId("workspace-section")).getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Teams" })).toHaveAttribute("href", "/app/workspace/teams");
    expect(within(crumbs).getByText("Finance")).toHaveAttribute("aria-current", "page");
  });

  it("keeps Members active on a member's page and Roles on a role's page", async () => {
    const { unmount } = renderShellAt("/app/workspace/members/m_sender");
    expect(await screen.findByRole("heading", { level: 2, name: "Jose Cruz" })).toBeInTheDocument();
    expect(screen.getByTestId("banner-members")).toHaveAttribute("data-active", "true");
    unmount();

    renderShellAt("/app/workspace/roles/sender");
    expect(await screen.findByTestId("role-abilities")).toBeInTheDocument();
    expect(screen.getByTestId("banner-roles")).toHaveAttribute("data-active", "true");
  });
});

describe("Workspace shell — keyboard", () => {
  it("is one tab stop, and the arrow keys, Home and End move along the row", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace/teams");
    await screen.findByTestId("team-un_fin");
    const links = within(screen.getByTestId("workspace-banners")).getAllByRole("link");
    expect(links.filter(l => l.tabIndex === 0)).toEqual([screen.getByTestId("banner-teams")]);

    screen.getByTestId("banner-teams").focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByTestId("banner-roles"));
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(screen.getByTestId("banner-invitations"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(screen.getByTestId("banner-overview"));
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(screen.getByTestId("banner-settings"));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(screen.getByTestId("banner-settings"));
    // The roving stop follows focus, so Tab out and back returns here.
    expect(screen.getByTestId("banner-settings").tabIndex).toBe(0);

    await user.keyboard("{Enter}");
    expect(screen.getByTestId("location")).toHaveTextContent("/app/workspace/settings");
  });
});
