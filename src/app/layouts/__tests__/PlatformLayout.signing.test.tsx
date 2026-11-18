import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { PlatformLayout } from "../PlatformLayout";

const state = vi.hoisted(() => ({ sessionStatus: "authenticated", workspaceStatus: "empty" }));
vi.mock("../../context/PlatformContext", () => ({ usePlatform: () => state }));
vi.mock("../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));
vi.mock("../../hooks/useWorkspaceBrandingSync", () => ({ useWorkspaceBrandingSync: () => undefined }));
vi.mock("../../hooks/useNavCounts", () => ({ refreshNavCountsOnNavigation: () => undefined }));
vi.mock("../../services/last-app-page", () => ({ rememberAppPage: () => undefined }));
vi.mock("../../context/NotificationCenterContext", () => ({ NotificationCenterProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("../../tour/TourContext", () => ({ TourProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("../../components/platform/PlatformSidebar", () => ({ PlatformSidebar: () => null }));
vi.mock("../../components/platform/MobileNav", () => ({ MobileNav: () => null }));
vi.mock("../../components/platform/PlatformHeader", () => ({ PlatformHeader: () => null }));

function SignInDestination() {
  const location = useLocation();
  return <p>Sign in destination: {location.search}</p>;
}
function setup(path = "/app/link-signing?code=qa-handoff") {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/app" element={<PlatformLayout />}>
      <Route path="link-signing" element={<h1>Confirm signing account</h1>} />
      <Route path="dashboard" element={<h1>Workspace dashboard</h1>} />
    </Route>
    <Route path="/sign-in" element={<SignInDestination />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { state.sessionStatus = "authenticated"; state.workspaceStatus = "empty"; });
describe("recipient account confirmation is independent of workspace access", () => {
  it.each(["empty", "error", "ready"])("opens confirmation with workspace state %s", (workspaceStatus) => {
    state.workspaceStatus = workspaceStatus;
    setup();
    expect(screen.getByRole("heading", { name: "Confirm signing account" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Create your workspace" })).not.toBeInTheDocument();
  });
  it.each(["anonymous", "expired"])("still requires authentication for %s sessions", (sessionStatus) => {
    state.sessionStatus = sessionStatus;
    setup();
    expect(screen.queryByRole("heading", { name: "Confirm signing account" })).not.toBeInTheDocument();
    expect(screen.getByText(/Sign in destination:/)).toHaveTextContent("returnTo=%2Fapp%2Flink-signing%3Fcode%3Dqa-handoff");
  });
  it("waits for session initialization before showing confirmation", () => {
    state.sessionStatus = "initializing";
    setup();
    expect(screen.queryByRole("heading", { name: "Confirm signing account" })).not.toBeInTheDocument();
  });
  it("keeps workspace creation required for the dashboard", () => {
    setup("/app/dashboard");
    expect(screen.getByRole("heading", { name: "Create your workspace" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Workspace dashboard" })).not.toBeInTheDocument();
  });
  it("keeps workspace load errors recoverable on the dashboard", () => {
    state.workspaceStatus = "error";
    setup("/app/dashboard");
    expect(screen.getByRole("heading", { name: "Couldn't load your workspaces" })).toBeInTheDocument();
  });
});
