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
import { PeopleTeamsPage } from "../PeopleTeamsPage";
import { TeamsPage } from "../TeamsPage";
import { TeamDetailPage } from "../TeamDetailPage";
import { listJoinRequests, resetDemoJoinStore } from "../../../../services/real/workspace-join.service";

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
          <Route path="people" element={<PeopleTeamsPage />} />
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
  it("shows the demonstration workspace, its three parts and the requests waiting, with no network", async () => {
    const pendingRequests = (await listJoinRequests("demo", "pending")).length;
    renderShellAt("/app/workspace/people");
    await waitFor(() => expect(screen.getByTestId("workspace-name")).toHaveTextContent("Mabini Legal Solutions"));
    expect(screen.getByText("Demonstration")).toBeInTheDocument();
    const parts = within(screen.getByTestId("workspace-parts")).getAllByRole("link");
    expect(parts.map(b => b.getAttribute("data-testid"))).toEqual(["part-overview", "part-people", "part-activity"]);
    if (pendingRequests > 0) {
      await waitFor(() => expect(screen.getByTestId("part-count-people")).toHaveTextContent(String(pendingRequests)));
    }
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

  it("switches to People & Teams inside the shell: the demo members and teams", async () => {
    const user = userEvent.setup();
    renderShellAt("/app/workspace");
    await screen.findByTestId("workspace-section");
    await user.click(screen.getByTestId("part-people"));
    expect(await screen.findByRole("heading", { level: 2, name: "Member Directory" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Teams" })).toBeInTheDocument();
    expect(screen.getByTestId("part-people")).toHaveAttribute("data-active", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
