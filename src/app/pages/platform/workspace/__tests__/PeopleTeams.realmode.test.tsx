// People & Teams with a real backend: one tree of teams, newest first; the
// people not in a team yet; a person's panel to move them, swap positions,
// change their role and remove them; and contacts added straight into a team
// (members) or invited first (everyone else).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  role: "owner" as string | null,
  user: { id: "u1" },
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" },
  workspaces: [{ id: "ws_1", name: "Reyes Law Office", role: "owner", initials: "RL", accentColor: "#0078D4" }],
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { RealPeopleTeamsPage, buildTeamTree } from "../real/RealPeopleTeamsPage";
import { ROLE_CAPABILITIES } from "../../../../models/workspace-role-policy";
import { resetPlanStore } from "../../../../hooks/usePlans";
import type { OrganizationUnit } from "../../../../models/organization";

function json(status: number, body: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const NOW = Date.now();
const DAY = 86_400_000;
const MEMBERS = [
  { membershipId: "m_owner", userId: "u1", email: "ana@example.com", displayName: "Ana Reyes", role: "owner", joinedAt: NOW - 90 * DAY, isCurrentUser: true, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_jose", userId: "u3", email: "jose@example.com", displayName: "Jose Cruz", role: "sender", joinedAt: NOW - 30 * DAY, isCurrentUser: false, roleTitle: "Paralegal", canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_lea", userId: "u4", email: "lea@example.com", displayName: "Lea Santos", role: "member", joinedAt: NOW - 2 * DAY, isCurrentUser: false, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
];
const UNITS = [
  { unitId: "un_old", parentUnitId: null, kind: "department", name: "Finance", createdAt: NOW - 40 * DAY, archivedAt: null },
  { unitId: "un_new", parentUnitId: null, kind: "office", name: "Cebu Office", createdAt: NOW - DAY, archivedAt: null },
  { unitId: "un_sub", parentUnitId: "un_old", kind: "team", name: "Payroll", createdAt: NOW - 10 * DAY, archivedAt: null },
];
let unitMembers: Record<string, { userId: string; title: string | null; displayName: string; email: string }[]>;
const calls: { method: string; path: string; body: unknown }[] = [];

beforeEach(() => {
  resetPlanStore();
  calls.length = 0;
  unitMembers = {
    un_old: [
      { userId: "u1", title: "Department Head", displayName: "Ana Reyes", email: "ana@example.com" },
      { userId: "u3", title: "Analyst", displayName: "Jose Cruz", email: "jose@example.com" },
    ],
    un_new: [],
    un_sub: [],
  };
  vi.stubGlobal("BroadcastChannel", class { postMessage() {} close() {} onmessage = null; });
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("http://api.test", "").replace(/\?.*$/, "");
    const body: unknown = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body });
    const ok = (b: unknown) => Promise.resolve(json(200, b));
    if (path === "/workspaces/ws_1/access") return ok({ workspaceId: "ws_1", membershipId: "m_owner", role: "owner", capabilities: [...ROLE_CAPABILITIES.owner], roleTitle: null });
    if (path === "/workspaces/ws_1/plan") return ok({ plan: "business", ownerIsYou: true, ownerName: "Ana Reyes", paidUntil: null });
    if (path === "/workspaces/ws_1/people") return ok({ people: [{ userId: "u1", avatarVersion: "v1" }, { userId: "u3", avatarVersion: null }] });
    if (path === "/workspaces/ws_1/units" && method === "GET") return ok({ units: UNITS });
    const unitList = /^\/workspaces\/ws_1\/units\/([^/]+)\/members$/.exec(path);
    if (unitList && method === "GET") return ok({ members: unitMembers[unitList[1]!] ?? [] });
    if (unitList && method === "POST") return Promise.resolve(json(204, null));
    if (/^\/workspaces\/ws_1\/units\/[^/]+\/members\/[^/]+$/.test(path)) return Promise.resolve(json(204, null));
    if (path === "/workspaces/ws_1/members") return ok({ members: MEMBERS });
    if (path === "/workspaces/ws_1/invitations" && method === "GET") return ok({ invitations: [] });
    if (path === "/workspaces/ws_1/invitations" && method === "POST") {
      return ok({ invitationId: "inv_new", email: (body as { email: string }).email, role: "member", state: "pending", createdAt: NOW, expiresAt: NOW + 7 * DAY });
    }
    if (path === "/workspaces/ws_1/join-requests") return ok({ requests: [] });
    if (path === "/workspaces/ws_1/contacts") {
      return ok({ items: [
        { contactId: "c_lea", name: "Lea Santos", email: "lea@example.com", phone: null, organization: null, title: null, state: "active", createdAt: "", updatedAt: "", archivedAt: null, scope: "workspace", ownerUserId: null, note: null },
        { contactId: "c_out", name: "Pia Lim", email: "pia@example.com", phone: null, organization: null, title: null, state: "active", createdAt: "", updatedAt: "", archivedAt: null, scope: "workspace", ownerUserId: null, note: null },
      ], total: 2, page: 1, perPage: 25, hasNextPage: false });
    }
    return Promise.resolve(json(404, { error: { code: "resource_not_found", message: `${method} ${path}` } }));
  }));
});

const show = () => render(<MemoryRouter initialEntries={["/app/workspace/people"]}><RealPeopleTeamsPage workspaceId="ws_1" /></MemoryRouter>);

describe("the team tree", () => {
  it("is newest first at every level, and leaves archived teams out", () => {
    const units = [
      ...UNITS,
      { unitId: "un_gone", parentUnitId: null, kind: "team", name: "Old", createdAt: NOW, archivedAt: NOW },
    ] as unknown as OrganizationUnit[];
    const tree = buildTeamTree(units, new Map());
    expect(tree.map(n => n.unit.name)).toEqual(["Cebu Office", "Finance"]);
    expect(tree[1]!.children.map(n => n.unit.name)).toEqual(["Payroll"]);
  });

  it("shows teams with their people and titles, and who is not in a team yet", async () => {
    show();
    const tree = await screen.findByTestId("team-tree");
    const finance = within(tree).getByRole("region", { name: "Finance" });
    expect(within(finance).getByTestId("person-u3")).toHaveTextContent("Analyst");
    expect(within(finance).getByTestId("person-u1")).toHaveTextContent("You");
    expect(within(finance).getByRole("region", { name: "Payroll" })).toBeInTheDocument();
    expect(within(screen.getByTestId("not-in-team")).getByTestId("person-u4")).toHaveTextContent("Lea Santos");
    // The owner's photo, from the workspace's people.
    expect(within(finance).getByTestId("person-u1").querySelector("img")?.getAttribute("src"))
      .toBe("http://api.test/workspaces/ws_1/members/u1/avatar?v=v1");
  });
});

describe("a person's panel", () => {
  it("moves them to another team: added there, then removed from this one", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByTestId("person-u3"));
    const panel = screen.getByTestId("member-panel");
    expect(within(panel).getByText("jose@example.com")).toBeInTheDocument();
    await user.selectOptions(within(panel).getByTestId("move-to"), "un_new");
    await user.click(within(panel).getByTestId("move-member"));
    await waitFor(() => expect(calls.some(c => c.method === "DELETE" && c.path === "/workspaces/ws_1/units/un_old/members/u3")).toBe(true));
    const added = calls.find(c => c.method === "POST" && c.path === "/workspaces/ws_1/units/un_new/members");
    expect(added?.body).toEqual({ userId: "u3", title: "Analyst" });
    expect(await screen.findByText("Jose Cruz is now in Cebu Office.")).toBeInTheDocument();
  });

  it("swaps positions with a teammate: both titles change", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByTestId("person-u3"));
    const panel = screen.getByTestId("member-panel");
    await user.selectOptions(within(panel).getByTestId("swap-with"), "u1");
    await user.click(within(panel).getByTestId("swap-member"));
    await waitFor(() => expect(calls.filter(c => c.method === "PATCH" && c.path.startsWith("/workspaces/ws_1/units/un_old/members/"))).toHaveLength(2));
    const patches = calls.filter(c => c.method === "PATCH").map(c => [c.path.split("/").pop(), (c.body as { title: string }).title]);
    expect(patches).toEqual([["u3", "Department Head"], ["u1", "Analyst"]]);
  });

  it("removes them from the team after confirming, and keeps the owner un-removable", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByTestId("person-u3"));
    let panel = screen.getByTestId("member-panel");
    await user.click(within(panel).getByTestId("remove-from-team"));
    await user.click(within(panel).getByTestId("confirm-remove"));
    await waitFor(() => expect(calls.some(c => c.method === "DELETE" && c.path === "/workspaces/ws_1/units/un_old/members/u3")).toBe(true));
    await waitFor(() => expect(screen.queryByTestId("member-panel")).toBeNull());

    await user.click(screen.getAllByTestId("person-u1")[0]!);
    panel = screen.getByTestId("member-panel");
    expect(within(panel).queryByTestId("remove-from-workspace")).toBeNull();
    expect(within(panel).queryByTestId("member-role")).toBeNull();
  });
});

describe("contacts into a team", () => {
  it("adds a contact who is a member straight in, and invites one who is not", async () => {
    const user = userEvent.setup();
    show();
    const panel = await screen.findByTestId("contacts-panel").catch(async () => {
      await user.click(await screen.findByTestId("open-contacts"));
      return screen.findByTestId("contacts-panel");
    });
    await user.selectOptions(within(panel).getByTestId("contacts-team"), "un_new");
    const lea = await within(panel).findByTestId("contact-c_lea");
    expect(lea).toHaveTextContent("Member");
    await user.click(within(lea).getByRole("button", { name: /Add/ }));
    await waitFor(() => expect(calls.some(c => c.method === "POST" && c.path === "/workspaces/ws_1/units/un_new/members")).toBe(true));
  });

  it("invites a contact who is not a member yet", async () => {
    const user = userEvent.setup();
    show();
    const panel = await screen.findByTestId("contacts-panel").catch(async () => {
      await user.click(await screen.findByTestId("open-contacts"));
      return screen.findByTestId("contacts-panel");
    });
    const pia = await within(panel).findByTestId("contact-c_out");
    await user.click(within(pia).getByRole("button", { name: /Invite/ }));
    await waitFor(() => expect(calls.find(c => c.method === "POST" && c.path === "/workspaces/ws_1/invitations")?.body).toMatchObject({ email: "pia@example.com", role: "member" }));
  });
});
