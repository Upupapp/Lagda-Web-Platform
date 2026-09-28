// Manage → Teams revamp: branded team cards, and a team's people as a
// hierarchy tree ordered by workspace role (owner → … → New Comer), with
// sub-teams as branches, three layouts and full tree keyboard support.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.setConfig({ testTimeout: 15_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
const platform = { role: "owner", currentWorkspace: { id: "ws_1", name: "Reyes Law Office" }, workspaces: [] };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { TeamsPage } from "../TeamsPage";
import { TeamDetailPage } from "../TeamDetailPage";
import { TeamHierarchyTree } from "../real/TeamHierarchyTree";
import { buildLevels, ladderRole, personRoleLine } from "../real/team-hierarchy";
import { ROLE_CAPABILITIES } from "../../../../models/workspace-role-policy";
import { resetWorkspaceBrandingStore, setWorkspaceBrandingSnapshot } from "../../../../hooks/workspace-branding-store";

const NOW = Date.now();
const MEMBERS = [
  { membershipId: "m1", userId: "u1", email: "ana@x.com", displayName: "Ana Reyes", role: "owner", joinedAt: NOW, isCurrentUser: true, roleTitle: null },
  { membershipId: "m2", userId: "u2", email: "maria@x.com", displayName: "Maria Santos", role: "member", joinedAt: NOW, isCurrentUser: false, roleTitle: "Finance Associate" },
  { membershipId: "m3", userId: "u3", email: "jose@x.com", displayName: "Jose Cruz", role: "sender", joinedAt: NOW, isCurrentUser: false, roleTitle: "Paralegal" },
  { membershipId: "m4", userId: "u4", email: "rita@x.com", displayName: "Rita Lim", role: "administrator", joinedAt: NOW, isCurrentUser: false, roleTitle: null },
  { membershipId: "m5", userId: "u5", email: "ben@x.com", displayName: "Ben Uy", role: "auditor", joinedAt: NOW, isCurrentUser: false, roleTitle: null },
];
const UNITS = [
  { unitId: "un_fin", parentUnitId: null, kind: "department", name: "Finance", createdAt: NOW, archivedAt: null },
  { unitId: "un_cebu", parentUnitId: "un_fin", kind: "office", name: "Cebu Office", createdAt: NOW, archivedAt: null },
  { unitId: "un_desk", parentUnitId: "un_cebu", kind: "team", name: "Front Desk", createdAt: NOW, archivedAt: null },
];
const UNIT_MEMBERS: Record<string, unknown[]> = {
  un_fin: [
    { userId: "u2", title: null, displayName: "Maria Santos", email: "maria@x.com" },
    { userId: "u3", title: null, displayName: "Jose Cruz", email: "jose@x.com" },
    { userId: "u1", title: "Department Head", displayName: "Ana Reyes", email: "ana@x.com" },
    { userId: "u5", title: null, displayName: "Ben Uy", email: "ben@x.com" },
    { userId: "u4", title: "Deputy", displayName: "Rita Lim", email: "rita@x.com" },
  ],
  un_cebu: [{ userId: "u3", title: "Lead", displayName: "Jose Cruz", email: "jose@x.com" }],
  un_desk: [],
};

let role = "owner";
let membersStatus = 200;

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

beforeEach(() => {
  role = "owner";
  membersStatus = 200;
  resetWorkspaceBrandingStore();
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    const path = String(url).replace("http://api.test", "").replace(/\?.*$/, "");
    if (path === "/workspaces/ws_1/access") return json(200, { workspaceId: "ws_1", membershipId: "m1", role, capabilities: [...ROLE_CAPABILITIES[role as keyof typeof ROLE_CAPABILITIES]], roleTitle: null });
    if (path === "/workspaces/ws_1/members") return membersStatus === 200 ? json(200, { members: MEMBERS }) : json(membersStatus, { error: { code: "forbidden", message: "no" } });
    if (path === "/workspaces/ws_1/units") return json(200, { units: UNITS });
    const m = /^\/workspaces\/ws_1\/units\/([^/]+)\/members$/.exec(path);
    if (m) return json(200, { members: UNIT_MEMBERS[m[1] ?? ""] ?? [] });
    return json(404, { error: { code: "resource_not_found", message: path } });
  }));
});

/** Testing Library only reads `level` for headings, so filter aria-level directly. */
const atLevel = (items: HTMLElement[], level: number) => items.filter(i => i.getAttribute("aria-level") === String(level));

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname}</p>; }

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/workspace/teams" element={<TeamsPage />} />
        <Route path="/app/workspace/teams/:teamId" element={<><TeamDetailPage /><Where /></>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("team hierarchy helpers", () => {
  it("orders levels owner → administrator → template administrator → sender → reviewer → auditor → New Comer", () => {
    const people = ["member", "auditor", "reviewer", "sender", "template_administrator", "administrator", "owner"]
      .map((r, i) => ({ id: String(i), name: `P${String(i)}`, role: ladderRole(r) }));
    expect(buildLevels(people).map(l => l.title)).toEqual([
      "Owner", "Administrator", "Template Administrator", "Sender", "Reviewer", "Auditor", "New Comer",
    ]);
  });

  it("maps the demo role ids onto the same ladder and names typed titles", () => {
    expect(ladderRole("role_owner")).toBe("owner");
    expect(ladderRole("role_billing_admin")).toBe("administrator");
    expect(ladderRole("role_template_manager")).toBe("template_administrator");
    expect(ladderRole("role_c_compliance_auditor")).toBe("auditor");
    expect(ladderRole("something_else")).toBe("member");
    expect(personRoleLine({ id: "a", name: "A", role: "member", roleTitle: "Paralegal" })).toBe("Paralegal");
    expect(personRoleLine({ id: "a", name: "A", role: "sender", roleTitle: "Paralegal" })).toBe("Sender · Paralegal");
    expect(personRoleLine({ id: "a", name: "A", role: null })).toBeNull();
  });

  it("puts everyone on one level when roles cannot be read", () => {
    const levels = buildLevels([{ id: "a", name: "Zed", role: null }, { id: "b", name: "Amy", role: null, unitTitle: "Head" }]);
    expect(levels).toHaveLength(1);
    expect(levels[0]?.people.map(p => p.name)).toEqual(["Amy", "Zed"]);
  });
});

describe("Teams list — branded cards", () => {
  it("tops each card with the workspace banner, live from the branding store", async () => {
    renderAt("/app/workspace/teams");
    const finance = await screen.findByTestId("team-un_fin");
    await waitFor(() => expect(finance).toHaveTextContent("5 members"));
    expect(finance).toHaveAttribute("href", "/app/workspace/teams/un_fin");
    expect(finance).toHaveTextContent("1 sub-team");
    expect(finance).toHaveTextContent("View hierarchy");
    expect(screen.getByTestId("team-un_cebu")).toHaveTextContent("in Finance");
    const band = within(finance).getByTestId("team-un_fin-banner-band");
    act(() => { setWorkspaceBrandingSnapshot("ws_1", { displayName: "Reyes & Co", primaryColor: "#14532D", logoUrl: null, senderDisplayName: null, footerTagline: null } as never); });
    await waitFor(() => expect(band).toHaveStyle({ background: "#14532D" }));
    expect(within(band).getByTestId("team-un_fin-banner-name")).toHaveTextContent("Reyes & Co");
  });
});

describe("Team detail — hierarchy tree", () => {
  it("draws levels from the highest workspace role down, with titles, and sub-teams as branches", async () => {
    renderAt("/app/workspace/teams/un_fin");
    const tree = await screen.findByRole("tree", { name: "Hierarchy of Finance" });
    await waitFor(() => expect(atLevel(within(tree).getAllByRole("treeitem"), 2).map(l => l.getAttribute("aria-label"))).toEqual([
      "Owner, 1", "Administrator, 1", "Sender, 1", "Auditor, 1", "New Comer, 1", "Sub-teams, 2",
    ]));
    expect(within(tree).getByRole("treeitem", { name: "Ana Reyes, Owner, team title Department Head" })).toHaveAttribute("aria-level", "3");
    expect(within(tree).getByRole("treeitem", { name: "Jose Cruz, Sender · Paralegal" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Maria Santos, Finance Associate" })).toBeInTheDocument();
    const cebu = within(tree).getByRole("treeitem", { name: "Cebu Office, Office, 1 member" });
    expect(within(cebu).getByRole("treeitem", { name: "Front Desk, Team, 0 members" })).toHaveAttribute("aria-level", "4");
    // The existing actions stay.
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add member" })).toBeInTheDocument();
    expect(screen.getByTestId("team-member-u1")).toHaveTextContent("Department Head");
    expect(screen.getByTestId("team-banner-band")).toBeInTheDocument();
  });

  it("is one Tab stop and moves, opens and closes with the keyboard", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/teams/un_fin");
    const tree = await screen.findByRole("tree", { name: "Hierarchy of Finance" });
    await waitFor(() => expect(within(tree).getByRole("treeitem", { name: "Owner, 1" })).toBeInTheDocument());
    const root = within(tree).getByRole("treeitem", { name: /^Finance, Department/ });
    expect(root).toHaveAttribute("tabindex", "0");
    expect(within(tree).getAllByRole("treeitem").filter(i => i.getAttribute("tabindex") === "0")).toHaveLength(1);
    root.focus();
    await user.keyboard("{ArrowDown}");
    const owner = within(tree).getByRole("treeitem", { name: "Owner, 1" });
    expect(owner).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(owner).toHaveAttribute("aria-expanded", "false");
    expect(within(tree).queryByRole("treeitem", { name: /^Ana Reyes/ })).toBeNull();
    await user.keyboard("{ArrowRight}");
    expect(owner).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowRight}");
    const ana = within(tree).getByRole("treeitem", { name: /^Ana Reyes/ });
    expect(ana).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(owner).toHaveFocus();
    await user.keyboard("{End}");
    expect(within(tree).getByRole("treeitem", { name: /^Front Desk/ })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(root).toHaveFocus();
    // Enter on a person opens their profile.
    ana.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("/app/workspace/members/m1");
  });

  it("collapse all / expand all", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/teams/un_fin");
    const tree = await screen.findByRole("tree");
    await waitFor(() => expect(within(tree).getByRole("treeitem", { name: /^Ana Reyes/ })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(within(tree).queryByRole("treeitem", { name: /^Ana Reyes/ })).toBeNull();
    expect(within(tree).getByRole("treeitem", { name: "Owner, 1" })).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(within(tree).getByRole("treeitem", { name: /^Ana Reyes/ })).toBeInTheDocument();
  });

  it("falls back to titles only when the roster cannot be read", async () => {
    membersStatus = 403;
    renderAt("/app/workspace/teams/un_fin");
    const tree = await screen.findByRole("tree");
    expect(atLevel(within(tree).getAllByRole("treeitem"), 2).map(l => l.getAttribute("aria-label"))).toEqual(["Members, 5", "Sub-teams, 2"]);
    expect(within(tree).getByRole("treeitem", { name: "Ana Reyes, team title Department Head" })).toBeInTheDocument();
    expect(screen.getByText(/Workspace roles are visible to owners and administrators/)).toBeInTheDocument();
  });
});

describe("TeamHierarchyTree layouts", () => {
  const levels = buildLevels([
    { id: "a", name: "Ana", role: "owner" },
    { id: "b", name: "Ben", role: "sender" },
  ]);
  for (const layout of ["wide", "compact", "vertical"] as const) {
    it(`renders the ${layout} layout as the same accessible tree`, () => {
      render(<MemoryRouter><TeamHierarchyTree teamName="Ops" teamKind="Team" brandColor="#0078D4" logoUrl={null}
        levels={levels} subTeams={[]} layout={layout} /></MemoryRouter>);
      expect(screen.getByTestId("team-hierarchy")).toHaveAttribute("data-layout", layout);
      expect(atLevel(screen.getAllByRole("treeitem"), 3)).toHaveLength(2);
    });
  }
});
