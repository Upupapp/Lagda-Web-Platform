// Free has no Workspace: opening /app/workspace goes straight back — to the
// last app page this tab showed, else the browser's Back, else Home. Personal
// and Business stay, and so does anyone whose plan is not read yet.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: false, API_BASE_URL: null }));
const platform = { role: "owner", currentWorkspace: { id: "ws_mabini", name: "Mabini Legal Solutions" }, workspaces: [] };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

let allows: boolean | null = false;
vi.mock("../../../../hooks/usePlans", () => ({ useWorkspaceAllows: () => allows }));

import { WorkspaceShell } from "../shell/WorkspaceShell";
import { rememberAppPage, forgetAppPage } from "../../../../services/last-app-page";

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname}</p>; }

function show(path = "/app/workspace") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/workspace" element={<WorkspaceShell />}>
          <Route index element={<p>workspace overview</p>} />
          <Route path="members" element={<p>members</p>} />
        </Route>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { allows = false; forgetAppPage(); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Workspace on a Free plan", () => {
  it("goes back to the last app page this tab showed", () => {
    rememberAppPage("/app/documents", "?tab=sign");
    show("/app/workspace/members");
    expect(screen.getByTestId("where")).toHaveTextContent("/app/documents");
    expect(screen.queryByText("members")).toBeNull();
  });

  it("never remembers a Workspace page as back", () => {
    rememberAppPage("/app/templates");
    rememberAppPage("/app/workspace/members");
    show();
    expect(screen.getByTestId("where")).toHaveTextContent("/app/templates");
  });

  it("a typed-in URL with nothing to go back to lands on Home", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    show();
    expect(screen.getByTestId("where")).toHaveTextContent("/app/dashboard");
  });

  it("a typed-in URL uses the browser's Back, and Home if Back stays in Workspace", () => {
    vi.useFakeTimers();
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
    show();
    expect(back).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("where")).toBeNull();
    act(() => { vi.advanceTimersByTime(1300); });
    expect(screen.getByTestId("where")).toHaveTextContent("/app/dashboard");
  });

  for (const [label, value] of [["Personal or Business", true], ["a plan not read yet", null]] as const) {
    it(`${label}: stays in Workspace`, () => {
      allows = value;
      rememberAppPage("/app/documents");
      show("/app/workspace/members");
      expect(screen.getByText("members")).toBeInTheDocument();
      expect(screen.queryByTestId("where")).toBeNull();
    });
  }
});
