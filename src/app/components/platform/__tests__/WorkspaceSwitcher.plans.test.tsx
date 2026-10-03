// Joining another workspace is part of Personal (093): on Free the menu item
// is shown but cannot be clicked, and says which plan it needs.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const ws = { id: "ws_1", name: "Bruce Wayne's Workspace", plan: "personal", role: "owner", initials: "BW" };
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    currentWorkspace: ws, workspaces: [ws], switchWorkspace: vi.fn(), refreshWorkspaceList: vi.fn(),
  }),
}));
let myPlan: { plan: string } | null = { plan: "free" };
let workspacePlan: string | null = "business";
vi.mock("../../../hooks/usePlans", () => ({
  useMyPlan: () => ({ plan: myPlan, refresh: vi.fn() }),
  useWorkspacePlan: () => ({ plan: workspacePlan, info: null, refresh: vi.fn() }),
}));

import { WorkspaceSwitcher } from "../WorkspaceSwitcher";

const open = async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><WorkspaceSwitcher collapsed={false} /></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: /Current workspace/ }));
  return user;
};

describe("Join another workspace in the workspace menu", () => {
  it("is locked on Free, marked Personal", async () => {
    myPlan = { plan: "free" };
    const user = await open();
    const join = screen.getByTestId("workspace-menu-join");
    expect(join).toBeDisabled();
    expect(screen.getByTestId("workspace-menu-join-plan").textContent).toBe("Personal");
    await user.click(join);
    expect(screen.queryByRole("dialog", { name: /Join another workspace/ })).toBeNull();
  });

  it("opens on a paid plan", async () => {
    myPlan = { plan: "personal" };
    await open();
    expect(screen.getByTestId("workspace-menu-join")).not.toBeDisabled();
    expect(screen.queryByTestId("workspace-menu-join-plan")).toBeNull();
  });
});

// TC-37. The session's workspace record carries a placeholder plan
// ("personal" above); the line under the name must be the workspace's real one.
describe("Plan under the workspace name", () => {
  it("shows the workspace's real plan, not the session placeholder", () => {
    workspacePlan = "business";
    render(<MemoryRouter><WorkspaceSwitcher collapsed={false} /></MemoryRouter>);
    expect(screen.getByTestId("workspace-switcher-plan").textContent).toBe("Business");
  });

  it("shows nothing while the plan is unknown", () => {
    workspacePlan = null;
    render(<MemoryRouter><WorkspaceSwitcher collapsed={false} /></MemoryRouter>);
    expect(screen.queryByTestId("workspace-switcher-plan")).toBeNull();
    expect(screen.queryByText("Personal")).toBeNull();
  });
});
