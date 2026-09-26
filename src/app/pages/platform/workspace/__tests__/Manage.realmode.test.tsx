// The Manage hub and its pages with a real backend: nothing fictional is
// shown, counts and "Needs attention" come from the API, teams are the
// backend's organization units, "Who can do what" is read-only, the
// workspace name saves through PATCH, the activity log filters and pages,
// and suspend / deactivate never appear.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.setConfig({ testTimeout: 15_000 });

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  role: "owner" as string | null,
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" } as { id: string; name: string } | null,
  workspaces: [
    { id: "ws_1", name: "Reyes Law Office", role: "owner", initials: "RL", accentColor: "#0078D4" },
    { id: "ws_2", name: "Cebu Branch", role: "viewer", initials: "CB", accentColor: "#15803D" },
  ],
  switchWorkspace: vi.fn(),
  applyWorkspaceRename: vi.fn(),
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { WorkspaceOverviewPage } from "../WorkspaceOverviewPage";
import { TeamsPage } from "../TeamsPage";
import { TeamDetailPage } from "../TeamDetailPage";
import { RolesPage } from "../RolesPage";
import { RoleDetailPage } from "../RoleDetailPage";
import { WorkspaceSettingsPage } from "../WorkspaceSettingsPage";
import { ActivityPage } from "../ActivityPage";
import { MemberDetailPage } from "../MemberDetailPage";
import { EMPTY_ACTIVITY_MESSAGE } from "../real/RealActivityPage";
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
  { ticketId: "jt_draft", label: "Draft", recipientEmail: null, state: "draft", linkUrl: null, sentAt: null, withdrawnAt: null, usedAt: null, request: null, createdAt: NOW, updatedAt: NOW },
];
const UNITS = [
  { unitId: "un_fin", parentUnitId: null, kind: "department", name: "Finance", createdAt: NOW - 20 * DAY, archivedAt: null },
  { unitId: "un_cebu", parentUnitId: "un_fin", kind: "office", name: "Cebu Office", createdAt: NOW - 10 * DAY, archivedAt: null },
  { unitId: "un_old", parentUnitId: null, kind: "team", name: "Old Project", createdAt: NOW - 50 * DAY, archivedAt: NOW - 5 * DAY },
];
const UNIT_MEMBERS: Record<string, unknown[]> = {
  un_fin: [
    { userId: "u1", title: "Department Head", displayName: "Ana Reyes", email: "ana@example.com" },
    { userId: "u3", title: null, displayName: "Jose Cruz", email: "jose@example.com" },
  ],
  un_cebu: [],
  un_old: [],
};

let accessRole = "owner";
let accessTitle: string | null = null;
let activityPages: Record<string, unknown> = {};
let activityStatus = 200;
const calls: { method: string; url: string; path: string; body: unknown }[] = [];

beforeEach(() => {
  calls.length = 0;
  platform.role = "owner";
  platform.currentWorkspace = { id: "ws_1", name: "Reyes Law Office" };
  platform.switchWorkspace.mockReset();
  platform.applyWorkspaceRename.mockReset();
  accessRole = "owner";
  accessTitle = null;
  activityStatus = 200;
  activityPages = {};
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const full = url.replace("http://api.test", "");
    const path = full.replace(/\?.*$/, "");
    const body: unknown = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, url: full, path, body });
    const ok = (b: unknown) => Promise.resolve(json(200, b));
    if (method === "GET" && path === "/workspaces/ws_1") return ok({ workspaceId: "ws_1", name: "Reyes Law Office", role: accessRole, createdAt: Date.UTC(2026, 0, 15) });
    if (method === "PATCH" && path === "/workspaces/ws_1") return ok({ workspaceId: "ws_1", name: (body as { name: string }).name, role: "owner", createdAt: Date.UTC(2026, 0, 15) });
    if (method === "GET" && path === "/workspaces/ws_1/access") {
      return ok({ workspaceId: "ws_1", membershipId: "m_me", role: accessRole, capabilities: [...ROLE_CAPABILITIES[accessRole as keyof typeof ROLE_CAPABILITIES]], roleTitle: accessTitle });
    }
    if (method === "GET" && path === "/workspaces/ws_1/members") return ok({ members: MEMBERS });
    if (method === "GET" && path === "/workspaces/ws_1/join-requests") return ok({ requests: REQUESTS });
    if (method === "GET" && path === "/workspaces/ws_1/invitations") return ok({ invitations: INVITATIONS });
    if (method === "GET" && path === "/workspaces/ws_1/join-tickets") return ok({ tickets: TICKETS });
    if (method === "GET" && path === "/workspaces/ws_1/units") return ok({ units: UNITS });
    if (method === "POST" && path === "/workspaces/ws_1/units") return Promise.resolve(json(201, { unitId: "un_new", parentUnitId: null, archivedAt: null, createdAt: NOW, ...(body as object) }));
    const unitMembers = /^\/workspaces\/ws_1\/units\/([^/]+)\/members$/.exec(path);
    if (method === "GET" && unitMembers) return ok({ members: UNIT_MEMBERS[unitMembers[1] ?? ""] ?? [] });
    if (method === "POST" && unitMembers) return Promise.resolve(new Response(null, { status: 204 }));
    if (method === "POST" && /\/units\/[^/]+\/archive$/.test(path)) return Promise.resolve(new Response(null, { status: 204 }));
    if (method === "GET" && path === "/workspaces/ws_1/activity") {
      if (activityStatus !== 200) return Promise.resolve(json(activityStatus, { error: { code: "server_error", message: "Boom" } }));
      const params = new URL(`http://x${full}`).searchParams;
      const key = `${params.get("category") ?? "all"}|${params.get("before") ?? ""}`;
      return ok(activityPages[key] ?? { events: [], nextCursor: null });
    }
    return Promise.resolve(json(404, { error: { code: "resource_not_found", message: `${method} ${path}` } }));
  }));
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/workspace" element={<WorkspaceOverviewPage />} />
        <Route path="/app/workspace/teams" element={<TeamsPage />} />
        <Route path="/app/workspace/teams/:teamId" element={<TeamDetailPage />} />
        <Route path="/app/workspace/roles" element={<RolesPage />} />
        <Route path="/app/workspace/roles/:roleId" element={<RoleDetailPage />} />
        <Route path="/app/workspace/settings" element={<WorkspaceSettingsPage />} />
        <Route path="/app/workspace/activity" element={<ActivityPage />} />
        <Route path="/app/workspace/members/:memberId" element={<MemberDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const DEMO_TEXT = /Demonstration|demonstration|fictional|Mabini|session-local/;

describe("Manage overview — real backend", () => {
  it("shows the real workspace, real counts and no demonstration content", async () => {
    const { container } = renderAt("/app/workspace");
    expect(await screen.findByTestId("workspace-name")).toHaveTextContent("Reyes Law Office");
    await waitFor(() => expect(screen.getByTestId("stat-members")).toHaveTextContent("3"));
    await waitFor(() => expect(screen.getByTestId("stat-join-requests")).toHaveTextContent("2"));
    expect(screen.getByTestId("stat-invitations")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-join-links")).toHaveTextContent("1");
    await waitFor(() => expect(screen.getByTestId("stat-teams")).toHaveTextContent("2"));
    expect(screen.getByTestId("stat-join-requests").getAttribute("href")).toBe("/app/workspace/join-requests");
    expect(screen.getByTestId("stat-join-links").getAttribute("href")).toBe("/app/workspace/join-links");

    expect(container.textContent).not.toMatch(DEMO_TEXT);
    expect(screen.queryByText("Suspended")).toBeNull();
    expect(screen.queryByText(/Billing email/)).toBeNull();
    expect(screen.queryByText(/Plan/)).toBeNull();
    expect(screen.getByTestId("your-role")).toHaveTextContent("Owner");
    expect(screen.getByTestId("workspace-facts")).toHaveTextContent("January 15, 2026");
  });

  it("builds Needs attention from pending join requests and invitations about to expire", async () => {
    renderAt("/app/workspace");
    const attention = await screen.findByTestId("needs-attention");
    expect(attention).toHaveTextContent("Liza Tan asked to join");
    expect(attention).toHaveTextContent("Ramon Diaz asked to join");
    expect(attention).toHaveTextContent("Join link: Front desk");
    const reviews = within(attention).getAllByRole("link", { name: "Review" });
    expect(reviews[0]).toHaveAttribute("href", "/app/workspace/join-requests");
    await waitFor(() => expect(attention).toHaveTextContent("Invitation to soon@example.com expires soon"));
    expect(attention).not.toHaveTextContent("later@example.com");
  });

  it("lists every workspace, marks the current one and switches", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace");
    const panel = await screen.findByTestId("your-workspaces");
    expect(within(panel).getByTestId("workspace-row-ws_1")).toHaveTextContent("CURRENT");
    expect(within(panel).getByTestId("workspace-row-ws_2")).toHaveTextContent("New Comer");
    expect(panel).toHaveTextContent("ask one of its owners or administrators for a join link");
    await user.click(within(panel).getByRole("button", { name: "Switch to Cebu Branch" }));
    expect(platform.switchWorkspace).toHaveBeenCalledWith("ws_2");
  });

  it("shows a plain member their own typed title from the access answer", async () => {
    platform.role = "viewer";
    accessRole = "member";
    accessTitle = "Finance Associate";
    renderAt("/app/workspace");
    await waitFor(() => expect(screen.getByTestId("your-role")).toHaveTextContent("Finance Associate"));
  });

  it("gives a New Comer a reduced overview and never calls admin-only endpoints", async () => {
    platform.role = "viewer";
    accessRole = "member";
    const { container } = renderAt("/app/workspace");
    expect(await screen.findByTestId("workspace-name")).toHaveTextContent("Reyes Law Office");
    expect(screen.getByTestId("your-role")).toHaveTextContent("New Comer");
    await waitFor(() => expect(screen.getByTestId("stat-teams")).toHaveTextContent("2"));
    expect(screen.queryByTestId("stat-members")).toBeNull();
    expect(screen.queryByTestId("stat-join-requests")).toBeNull();
    expect(screen.queryByRole("link", { name: /Activity log/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Who can do what/ })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(DEMO_TEXT);
    const forbidden = ["/members", "/join-requests", "/join-tickets", "/invitations", "/activity"];
    expect(calls.filter(c => forbidden.some(f => c.path.endsWith(f)))).toEqual([]);
  });

  it("shows the activity log link to an auditor", async () => {
    platform.role = "auditor";
    accessRole = "auditor";
    renderAt("/app/workspace");
    expect(await screen.findByRole("link", { name: /Activity log/ })).toHaveAttribute("href", "/app/workspace/activity");
  });
});

describe("Teams — backend organization units", () => {
  it("maps units to teams with kind, parent and headcount; archived hidden until asked", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/teams");
    const finance = await screen.findByTestId("team-un_fin");
    expect(finance).toHaveTextContent("Finance");
    expect(finance).toHaveTextContent("Department");
    await waitFor(() => expect(finance).toHaveTextContent("2 members"));
    expect(screen.getByTestId("team-un_cebu")).toHaveTextContent("in Finance");
    expect(screen.queryByTestId("team-un_old")).toBeNull();
    await user.click(screen.getByLabelText("Show archived"));
    expect(screen.getByTestId("team-un_old")).toHaveTextContent("Archived");
  });

  it("creates a team as a unit with a name and kind", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/teams");
    await screen.findByTestId("team-un_fin");
    await user.click(screen.getByRole("button", { name: "+ Create team" }));
    const dialog = screen.getByRole("dialog", { name: "Create team" });
    await user.type(within(dialog).getByLabelText("Name"), "Legal");
    await user.selectOptions(within(dialog).getByLabelText("Kind"), "department");
    await user.click(within(dialog).getByRole("button", { name: "Create team" }));
    await waitFor(() => expect(calls.find(c => c.method === "POST" && c.path === "/workspaces/ws_1/units")?.body)
      .toEqual({ name: "Legal", kind: "department" }));
  });

  it("team page shows titles, archives with confirmation and offers no restore", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/teams/un_fin");
    expect(await screen.findByTestId("team-member-u1")).toHaveTextContent("Department Head");
    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Archive team" }));
    await waitFor(() => expect(calls.some(c => c.method === "POST" && c.path === "/workspaces/ws_1/units/un_fin/archive")).toBe(true));
  });

  it("an archived team is read-only", async () => {
    renderAt("/app/workspace/teams/un_old");
    expect(await screen.findByText("Archived", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
  });
});

describe("Who can do what — read-only", () => {
  it("shows the seven fixed roles as a matrix with no custom-role controls", async () => {
    const { container } = renderAt("/app/workspace/roles");
    const matrix = await screen.findByTestId("roles-matrix");
    for (const label of ["Owner", "Administrator", "Template Administrator", "Sender", "Reviewer", "Auditor", "New Comer"]) {
      expect(within(matrix).getByRole("columnheader", { name: label })).toBeInTheDocument();
    }
    const sendRow = within(matrix).getByRole("row", { name: /Prepare and send documents for signing/ });
    // owner, admin, template admin, sender: yes; reviewer, auditor, New Comer: no
    expect(within(sendRow).getAllByLabelText("Yes")).toHaveLength(4);
    expect(within(sendRow).getAllByLabelText("No")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Create Custom Role/i })).toBeNull();
    expect(screen.queryByText(/Custom roles/)).toBeNull();
    expect(screen.getByTestId("roles-read-only")).toHaveTextContent("cannot be created or changed");
    await waitFor(() => expect(screen.getByTestId("role-card-member")).toHaveTextContent("1 member"));
    expect(container.textContent).not.toMatch(DEMO_TEXT);
  });

  it("a role page lists its abilities and who holds it, with no edit or archive", async () => {
    renderAt("/app/workspace/roles/sender");
    const abilities = await screen.findByTestId("role-abilities");
    expect(abilities).toHaveTextContent("Prepare and send documents for signing");
    const holders = await screen.findByTestId("role-holders");
    expect(holders).toHaveTextContent("Jose Cruz");
    expect(holders).not.toHaveTextContent("Maria Santos");
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
  });
});

describe("Workspace settings — rename", () => {
  it("renames through PATCH and updates the session, with no fake toggles", async () => {
    const user = userEvent.setup();
    const { container } = renderAt("/app/workspace/settings");
    const input = await screen.findByLabelText("Name");
    await waitFor(() => expect(input).toHaveValue("Reyes Law Office"));
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByText(/Session timeout|Billing email|Slug/)).toBeNull();
    expect(container.textContent).not.toMatch(DEMO_TEXT);
    await user.clear(input);
    await user.type(input, "Reyes & Partners");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Workspace name saved.");
    expect(calls.find(c => c.method === "PATCH")).toMatchObject({ path: "/workspaces/ws_1", body: { name: "Reyes & Partners" } });
    expect(platform.applyWorkspaceRename).toHaveBeenCalledWith("ws_1", "Reyes & Partners");
  });

  it("is read-only for someone who cannot rename", async () => {
    platform.role = "sender";
    accessRole = "sender";
    renderAt("/app/workspace/settings");
    expect(await screen.findByTestId("workspace-name-readonly")).toHaveTextContent("Reyes Law Office");
    expect(screen.queryByRole("button", { name: "Save name" })).toBeNull();
  });
});

describe("Activity log — real backend", () => {
  const event = (id: string, category: string, summary: string, occurredAt: number) =>
    ({ eventId: id, occurredAt, category, action: "x", actorName: "Ana Reyes", summary, subjectLabel: null });

  it("shows the empty state", async () => {
    renderAt("/app/workspace/activity");
    expect(await screen.findByTestId("activity-empty")).toHaveTextContent(EMPTY_ACTIVITY_MESSAGE);
  });

  it("groups by day, filters by category and loads more with the cursor", async () => {
    const user = userEvent.setup();
    activityPages = {
      "all|": { events: [
        event("e1", "people", "Ana Reyes approved Liza Tan's join request as Finance Associate", NOW),
        event("e2", "teams", "Ana Reyes created the team Finance", NOW - 3 * DAY),
      ], nextCursor: "cur_2" },
      "all|cur_2": { events: [event("e3", "workspace", "Ana Reyes created the workspace", NOW - 40 * DAY)], nextCursor: null },
      "links|": { events: [event("e9", "links", "Ana Reyes sent a join link", NOW)], nextCursor: null },
    };
    renderAt("/app/workspace/activity");
    expect(await screen.findByTestId("activity-e1")).toHaveTextContent("Ana Reyes approved Liza Tan's join request as Finance Associate");
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByTestId("activity-e2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByTestId("activity-e3")).toHaveTextContent("created the workspace");
    expect(calls.some(c => c.url.includes("before=cur_2"))).toBe(true);
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Join links" }));
    expect(await screen.findByTestId("activity-e9")).toBeInTheDocument();
    expect(screen.queryByTestId("activity-e1")).toBeNull();
    expect(calls.some(c => c.url.includes("category=links"))).toBe(true);
    expect(screen.getByRole("button", { name: "Join links" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows an error with a retry", async () => {
    activityStatus = 500;
    renderAt("/app/workspace/activity");
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText("We couldn't load the activity log.")).toBeInTheDocument();
  });

  it("is not requested for roles without the activity log", async () => {
    platform.role = "sender";
    accessRole = "sender";
    renderAt("/app/workspace/activity");
    expect(await screen.findByText(/owner, administrators and auditors can read the activity log/)).toBeInTheDocument();
    expect(calls.some(c => c.path.endsWith("/activity"))).toBe(false);
  });
});

describe("Member detail — real backend", () => {
  it("never offers suspend, reactivate or deactivate, and shows teams and abilities", async () => {
    renderAt("/app/workspace/members/m_sender");
    expect(await screen.findByRole("heading", { name: "Jose Cruz" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reactivate" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Deactivate" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    const teams = await screen.findByTestId("member-teams");
    await waitFor(() => expect(within(teams).getByRole("link", { name: "Finance" })).toHaveAttribute("href", "/app/workspace/teams/un_fin"));
    expect(screen.getByTestId("member-abilities")).toHaveTextContent("Prepare and send documents for signing");
  });

  it("changes teams through unit membership", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/members/m_sender");
    const teams = await screen.findByTestId("member-teams");
    await user.click(await within(teams).findByRole("button", { name: "Change teams" }));
    const dialog = screen.getByRole("dialog", { name: "Teams" });
    await user.click(within(dialog).getByLabelText(/Cebu Office/));
    await user.click(within(dialog).getByRole("button", { name: "Save teams" }));
    await waitFor(() => expect(calls.find(c => c.method === "POST" && c.path === "/workspaces/ws_1/units/un_cebu/members")?.body)
      .toEqual({ userId: "u3" }));
  });
});
