// The Workspace shell in the demo build (no API base URL): the fictional
// workspace in the header, demo counts on the parts and tabs from the demo
// services, a plain "Demonstration" marker, the demo overview rendered
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
          <Route path="invitations" element={<div />} />
          <Route path="teams/:teamId" element={<TeamDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Workspace shell — demo build", () => {
  it("shows the demonstration workspace, every part and the demo counts, with no network", async () => {
    const { workspace } = await mockWorkspaceAdminService.getWorkspace();
    const pendingRequests = (await listJoinRequests("demo", "pending")).length;
    const activeLinks = (await listJoinTickets("demo")).filter(t => t.state === "sent" && t.usedAt === null && t.request === null).length;

    const { unmount } = renderShellAt("/app/workspace/members");
    await waitFor(() => expect(screen.getByTestId("workspace-name")).toHaveTextContent("Mabini Legal Solutions"));
    expect(screen.getByText("Demonstration")).toBeInTheDocument();
    const parts = within(screen.getByTestId("workspace-parts")).getAllByRole("link");
    expect(parts.map(b => b.getAttribute("data-testid"))).toEqual(["part-overview", "part-people", "part-organisation", "part-activity"]);

    await waitFor(() => expect(screen.getByTestId("tab-count-members")).toHaveTextContent(String(workspace.activeMembers)));
    expect(screen.getByTestId("tab-count-invite")).toHaveTextContent(String(workspace.pendingInvitations));
    expect(screen.getByTestId("tab-count-join-requests")).toHaveTextContent(String(pendingRequests));
    unmount();

    renderShellAt("/app/workspace/invitations");
    const method = await screen.findByTestId("invite-method-link");
    await waitFor(() => expect(method).toHaveAccessibleName(`Join link, ${String(activeLinks)} active`));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders the demo overview as the Overview section", async () => {
    renderShellAt("/app/workspace");
    await waitFor(() => expect(screen.getByTestId("workspace-name")).toHaveTextContent("Mabini Legal Solutions"));

    // The demo overview is the Overview section, still honest about being a demo.
    const section = await screen.findByTestId("workspace-section");
    expect(await within(section).findByText(/Demonstration workspace/)).toBeInTheDocument();
    expect(within(section).getByText("Suspended")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("switches parts inside the shell and keeps Teams active on a team's page", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-section");
    await user.click(screen.getByTestId("part-organisation"));
    expect(await screen.findByRole("heading", { level: 2, name: "Teams" })).toBeInTheDocument();
    expect(screen.getByTestId("tab-teams")).toHaveAttribute("aria-current", "page");

    const firstTeam = await within(screen.getByTestId("workspace-section")).findAllByRole("link");
    const teamLink = firstTeam.find(l => /\/app\/workspace\/teams\/.+/.test(l.getAttribute("href") ?? ""));
    expect(teamLink).toBeDefined();
    if (teamLink) await user.click(teamLink);
    const crumbs = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Teams" })).toHaveAttribute("href", "/app/workspace/teams");
    expect(screen.getByTestId("tab-teams")).toHaveAttribute("aria-current", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
