// The Manage workspace shell in the demo build (no API base URL): the
// fictional workspace in the header, demo counts on the banners from the
// demo services, a plain "Demonstration" marker, the demo overview rendered
// as a section, and no network at all.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.setConfig({ testTimeout: 15_000 });

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: null }));

const platform = { role: "owner", currentWorkspace: { id: "ws_mabini", name: "Mabini Legal Solutions" }, workspaces: [] };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { WorkspaceShell } from "../shell/WorkspaceShell";
import { WORKSPACE_SECTIONS } from "../shell/sections";
import { WorkspaceOverviewPage } from "../WorkspaceOverviewPage";
import { MembersPage } from "../MembersPage";
import { TeamsPage } from "../TeamsPage";
import { TeamDetailPage } from "../TeamDetailPage";
import { mockWorkspaceAdminService } from "../../../../services/mock/workspace-admin.service";
import { listJoinRequests, listJoinTickets, resetDemoJoinStore } from "../../../../services/real/workspace-join.service";

const fetchSpy = vi.fn();

beforeEach(() => {
  fetchSpy.mockReset();
  vi.stubGlobal("fetch", fetchSpy);
  resetDemoJoinStore();
});

function renderShellAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/workspace" element={<WorkspaceShell />}>
          <Route index element={<WorkspaceOverviewPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="teams/:teamId" element={<TeamDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Workspace shell — demo build", () => {
  it("shows the demonstration workspace, every banner and the demo counts, with no network", async () => {
    const { workspace } = await mockWorkspaceAdminService.getWorkspace();
    const pendingRequests = (await listJoinRequests("demo", "pending")).length;
    const activeLinks = (await listJoinTickets("demo")).filter(t => t.state === "sent" && t.usedAt === null && t.request === null).length;

    renderShellAt("/app/workspace");
    await waitFor(() => expect(screen.getByTestId("workspace-name")).toHaveTextContent("Mabini Legal Solutions"));
    expect(screen.getByText("Demonstration")).toBeInTheDocument();
    const banners = within(screen.getByTestId("workspace-banners")).getAllByRole("link");
    expect(banners.map(b => b.getAttribute("data-testid"))).toEqual(WORKSPACE_SECTIONS.map(s => `banner-${s.key}`));

    await waitFor(() => expect(screen.getByTestId("banner-count-members")).toHaveTextContent(String(workspace.activeMembers)));
    expect(screen.getByTestId("banner-count-invitations")).toHaveTextContent(String(workspace.pendingInvitations));
    expect(screen.getByTestId("banner-count-join-requests")).toHaveTextContent(String(pendingRequests));
    expect(screen.getByTestId("banner-count-join-links")).toHaveTextContent(String(activeLinks));

    // The demo overview is the Overview section, still honest about being a demo.
    const section = await screen.findByTestId("workspace-section");
    expect(within(section).getByText(/Demonstration workspace/)).toBeInTheDocument();
    expect(within(section).getByText("Suspended")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("switches sections inside the shell and keeps Teams active on a team's page", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-section");
    await user.click(screen.getByTestId("banner-teams"));
    expect(await screen.findByRole("heading", { level: 2, name: "Teams" })).toBeInTheDocument();
    expect(screen.getByTestId("banner-teams")).toHaveAttribute("aria-current", "page");

    const firstTeam = await within(screen.getByTestId("workspace-section")).findAllByRole("link");
    const teamLink = firstTeam.find(l => /\/app\/workspace\/teams\/.+/.test(l.getAttribute("href") ?? ""));
    expect(teamLink).toBeDefined();
    if (teamLink) await user.click(teamLink);
    const crumbs = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Teams" })).toHaveAttribute("href", "/app/workspace/teams");
    expect(screen.getByTestId("banner-teams")).toHaveAttribute("aria-current", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
