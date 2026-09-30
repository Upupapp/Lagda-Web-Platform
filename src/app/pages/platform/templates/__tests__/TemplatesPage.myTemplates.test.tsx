// Templates shows one view, "My Templates", with every template whatever its
// status. The seven views filtered on data the backend does not send yet.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 15_000 });
const platform = {
  currentWorkspace: { id: "ws_1", name: "Acme" },
  sessionStatus: "authenticated", workspaceStatus: "ready",
  user: { displayName: "Ana" },
  hasPermission: () => true, hasFlag: () => true,
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));
vi.mock("../../../../hooks/usePageMeta", () => ({ usePageMeta: () => undefined }));

import { TemplatesPage } from "../TemplatesPage";

describe("Templates › My Templates", () => {
  it("shows one My Templates view, and none of the retired views", async () => {
    render(<MemoryRouter initialEntries={["/app/templates"]}><TemplatesPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "My Templates" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Template views" })).toBeNull();
    for (const retired of ["All Templates", "Workspace Templates", "Recently Used"]) {
      expect(screen.queryByRole("tab", { name: retired })).toBeNull();
    }
  });
});
