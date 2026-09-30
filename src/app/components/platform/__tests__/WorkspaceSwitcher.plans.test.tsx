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
vi.mock("../../../hooks/usePlans", () => ({ useMyPlan: () => ({ plan: myPlan, refresh: vi.fn() }) }));

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
