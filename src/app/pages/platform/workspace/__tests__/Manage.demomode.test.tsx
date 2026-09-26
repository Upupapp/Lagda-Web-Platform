// The demo build (no API base URL) keeps its fictional Manage hub exactly as
// before, now with Join requests and Join links in the People section.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 15_000 });

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: null }));

const platform = { role: "owner", currentWorkspace: { id: "ws_mabini", name: "Mabini Legal Solutions" }, workspaces: [] };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { WorkspaceOverviewPage } from "../WorkspaceOverviewPage";

describe("Manage overview — demo build", () => {
  it("still shows the demonstration workspace and links the join pages", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<MemoryRouter><WorkspaceOverviewPage /></MemoryRouter>);
    expect(await screen.findByText(/Demonstration workspace/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Join requests/ })).toHaveAttribute("href", "/app/workspace/join-requests");
    expect(screen.getByRole("link", { name: /Join links/ })).toHaveAttribute("href", "/app/workspace/join-links");
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("opens with the branded card built from the mock branding service", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<MemoryRouter><WorkspaceOverviewPage /></MemoryRouter>);
    const card = await screen.findByTestId("workspace-brand-card");
    await waitFor(() => expect(card).toHaveTextContent("Professional legal document management"));
    expect(within(card).getByTestId("brand-card-name")).toHaveTextContent("Mabini Legal Solutions");
    expect(within(card).getByTestId("brand-card-sender")).toHaveTextContent("Mabini Legal Solutions");
    expect(within(card).getByTestId("edit-branding-link")).toHaveAttribute("href", "/app/settings/branding");
    expect(card).toHaveTextContent("Powered by LAGDA");
  });
});