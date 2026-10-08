// A member's teams on the contact page. The card offered "Add to team"
// whatever teams the person was in, so adding them to one they had already
// joined failed, and nothing said which teams they had.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const { org, admin } = vi.hoisted(() => ({
  org: { listUnits: vi.fn(), listMembers: vi.fn(), addMember: vi.fn() },
  admin: { listMembers: vi.fn(), listInvitations: vi.fn() },
}));
vi.mock("../../../../services/real/organization.service", () => ({ realOrganizationService: org }));
vi.mock("../../../../services/real/workspace-admin.service", () => ({
  realWorkspaceAdminService: admin, ASSIGNABLE_ROLES: ["member"], REAL_ROLE_LABELS: { member: "Member" },
}));
vi.mock("../../../../hooks/useWorkspaceAccess", () => ({ useWorkspaceAccess: () => ({ can: () => true }) }));
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Reyes Law" } }) }));
vi.mock("../contacts-ui", async original => ({ ...(await original<object>()), useLiveRefresh: () => {} }));

import { ContactWorkspaceCard } from "../ContactWorkspaceCard";
import type { Contact } from "../../../../models/contacts";

const contact = { id: "c_1", name: "Bruce Wayne", email: "bruce@wayne.test", workspaceMember: { userId: "usr_bruce", displayName: "Bruce Wayne" } } as unknown as Contact;
const unit = (unitId: string, name: string, archivedAt: number | null = null) => ({ unitId, parentUnitId: null, kind: "team", name, createdAt: 0, archivedAt });
const bruce = { userId: "usr_bruce", title: "Lead", displayName: "Bruce Wayne", email: "bruce@wayne.test" };
const other = { userId: "usr_ana", title: null, displayName: "Ana", email: "ana@reyes.test" };

const renderCard = () => render(
  <MemoryRouter><ContactWorkspaceCard contact={contact} workspaceId="ws_1" onAskToPrepare={() => {}} canAskToPrepare /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  admin.listMembers.mockResolvedValue([]);
  admin.listInvitations.mockResolvedValue([]);
});

describe("a member's teams on the contact page", () => {
  it("names the teams they are in, and offers only the ones left", async () => {
    const user = userEvent.setup();
    org.listUnits.mockResolvedValue([unit("u_legal", "Legal"), unit("u_sales", "Sales"), unit("u_old", "Old team", 5)]);
    org.listMembers.mockImplementation((_ws: string, id: string) => Promise.resolve(id === "u_legal" ? [bruce, other] : [other]));
    renderCard();

    const teams = await screen.findByTestId("member-teams");
    expect(within(teams).getByText("Legal")).toBeInTheDocument();
    expect(within(teams).getByText("Lead")).toBeInTheDocument();
    expect(within(teams).queryByText("Sales")).toBeNull();
    // An archived team is neither shown nor read.
    expect(org.listMembers).not.toHaveBeenCalledWith("ws_1", "u_old");

    await user.click(screen.getByRole("button", { name: "Add to another team" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("option").map(o => o.textContent)).toEqual(["Sales"]);
  });

  it("hides the button once they are in every team", async () => {
    org.listUnits.mockResolvedValue([unit("u_legal", "Legal"), unit("u_sales", "Sales")]);
    org.listMembers.mockResolvedValue([bruce]);
    renderCard();
    const teams = await screen.findByTestId("member-teams");
    expect(within(teams).getByText("Teams")).toBeInTheDocument();
    expect(within(teams).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByTestId("add-to-team")).toBeNull();
    // Asking them to prepare a document is unaffected.
    expect(screen.getByRole("button", { name: "Ask to prepare a document" })).toBeInTheDocument();
  });

  it("after adding, shows the new team and stops offering it, with no refresh", async () => {
    const user = userEvent.setup();
    const rosters: Record<string, typeof bruce[]> = { u_legal: [] };
    org.listUnits.mockResolvedValue([unit("u_legal", "Legal")]);
    org.listMembers.mockImplementation((_ws: string, id: string) => Promise.resolve(rosters[id] ?? []));
    org.addMember.mockImplementation((_ws: string, id: string) => { rosters[id] = [bruce]; return Promise.resolve(); });
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Add to team" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add to team" }));
    await waitFor(() => { expect(org.addMember).toHaveBeenCalledWith("ws_1", "u_legal", { userId: "usr_bruce" }); });

    expect(await screen.findByText("Bruce Wayne was added to Legal.")).toBeInTheDocument();
    expect(within(await screen.findByTestId("member-teams")).getByText("Legal")).toBeInTheDocument();
    await waitFor(() => { expect(screen.queryByTestId("add-to-team")).toBeNull(); });
  });

  it("with no team in the workspace yet, the button still leads to creating one", async () => {
    org.listUnits.mockResolvedValue([]);
    renderCard();
    expect(await screen.findByRole("button", { name: "Add to team" })).toBeInTheDocument();
    expect(screen.queryByTestId("member-teams")).toBeNull();
  });
});
