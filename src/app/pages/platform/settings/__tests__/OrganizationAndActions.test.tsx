// Settings revamp: the shared bottom-right action row, and the Organization
// Units page (branded header, outline of units, unit settings, roster).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 15_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
const platform = { currentWorkspace: { id: "ws_1", name: "Reyes Law Office" }, workspaces: [] };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { SettingsActions } from "../SettingsActions";
import { OrganizationUnitsPage } from "../organization/OrganizationUnitsPage";
import { resetWorkspaceBrandingStore, setWorkspaceBrandingSnapshot } from "../../../../hooks/workspace-branding-store";

const NOW = Date.UTC(2026, 8, 1);
let units: Record<string, unknown>[];
let unitMembers: Record<string, Record<string, unknown>[]>;
const calls: { method: string; path: string; body: unknown }[] = [];

function json(status: number, body?: unknown) {
  return Promise.resolve(status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body ?? {}), { status, headers: { "content-type": "application/json" } }));
}

beforeEach(() => {
  calls.length = 0;
  resetWorkspaceBrandingStore();
  units = [
    { unitId: "un_fin", parentUnitId: null, kind: "department", name: "Finance", createdAt: NOW, archivedAt: null },
    { unitId: "un_cebu", parentUnitId: "un_fin", kind: "office", name: "Cebu Office", createdAt: NOW, archivedAt: null },
    { unitId: "un_old", parentUnitId: null, kind: "team", name: "Old Project", createdAt: NOW, archivedAt: NOW },
  ];
  unitMembers = {
    un_fin: [{ userId: "u1", title: "Department Head", displayName: "Ana Reyes", email: "ana@x.com" }],
    un_cebu: [],
    un_old: [],
  };
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = String(url).replace("http://api.test", "").replace(/\?.*$/, "");
    const body: unknown = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body });
    if (path === "/workspaces/ws_1/units" && method === "GET") return json(200, { units });
    if (path === "/workspaces/ws_1/units" && method === "POST") return json(201, { unitId: "un_new", parentUnitId: null, archivedAt: null, createdAt: NOW, ...(body as object) });
    if (path === "/workspaces/ws_1/members") {
      return json(200, { members: [
        { userId: "u1", displayName: "Ana Reyes", email: "ana@x.com", role: "owner" },
        { userId: "u2", displayName: "Jose Cruz", email: "jose@x.com", role: "sender" },
      ] });
    }
    const unit = /^\/workspaces\/ws_1\/units\/([^/]+)$/.exec(path);
    if (unit && method === "PATCH") {
      const found = units.find(u => u.unitId === unit[1])!;
      return json(200, { ...found, ...(body as object) });
    }
    if (/\/archive$/.test(path)) return json(204);
    const members = /^\/workspaces\/ws_1\/units\/([^/]+)\/members$/.exec(path);
    if (members && method === "GET") return json(200, { members: unitMembers[members[1] ?? ""] ?? [] });
    if (members && method === "POST") return json(204);
    if (/\/members\/[^/]+$/.test(path)) return json(204);
    return json(404, { error: { code: "resource_not_found", message: path } });
  }));
});

describe("SettingsActions", () => {
  it("keeps the status on the left and the buttons at the bottom-right, primary last", () => {
    render(
      <SettingsActions status={<span role="status">Saved.</span>}>
        <button type="button">Reset to defaults</button>
        <button type="submit">Save branding</button>
      </SettingsActions>,
    );
    const row = screen.getByTestId("settings-actions");
    const buttons = within(row).getAllByRole("button");
    expect(buttons.map(b => b.textContent)).toEqual(["Reset to defaults", "Save branding"]);
    expect(buttons[1]?.parentElement).toHaveClass("settings-actions-buttons");
    expect(within(row).getByRole("status")).toHaveTextContent("Saved.");
  });
});

describe("Organization Units", () => {
  const renderPage = () => render(<MemoryRouter><OrganizationUnitsPage /></MemoryRouter>);

  it("opens with the workspace branding banner and an outline of the units", async () => {
    renderPage();
    const header = await screen.findByTestId("org-brand-header");
    expect(within(header).getByTestId("org-banner-name")).toHaveTextContent("Reyes Law Office");
    await waitFor(() => expect(header).toHaveTextContent("2 units"));
    expect(header).toHaveTextContent("1 archived");
    const outline = screen.getByRole("list", { name: "Units" });
    const finance = within(outline).getByTestId("org-unit-un_fin");
    expect(finance).toHaveAttribute("aria-current", "true");
    // Cebu Office is drawn INSIDE Finance's branch.
    expect(finance.closest("li")?.querySelector("[data-testid=org-unit-un_cebu]")).not.toBeNull();
    expect(within(outline).getByTestId("org-unit-un_old")).toHaveTextContent("Team · Archived");
    expect(await screen.findByTestId("org-member-u1")).toHaveTextContent("Department Head");
  });

  it("follows a branding change at once", async () => {
    renderPage();
    const band = await screen.findByTestId("org-banner-band");
    act(() => { setWorkspaceBrandingSnapshot("ws_1", { displayName: "Reyes & Co", primaryColor: "#14532D", logoUrl: null, senderDisplayName: null, footerTagline: null } as never); });
    await waitFor(() => expect(band).toHaveStyle({ background: "#14532D" }));
  });

  it("renames from the unit settings card, whose actions sit in the bottom-right row", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("org-member-u1");
    const actions = screen.getByTestId("org-unit-actions");
    const buttons = within(actions).getAllByRole("button");
    // Finance still has a live sub-unit, so only Rename is offered.
    expect(buttons.map(b => b.textContent?.trim())).toEqual(["Rename"]);
    const field = screen.getByLabelText("Name");
    await user.clear(field);
    await user.type(field, "Finance & Treasury");
    await user.click(within(actions).getByRole("button", { name: "Rename" }));
    await waitFor(() => expect(calls.find(c => c.method === "PATCH" && c.path === "/workspaces/ws_1/units/un_fin")?.body).toEqual({ name: "Finance & Treasury" }));
    expect(await screen.findByTestId("org-unit-title")).toHaveTextContent("Finance & Treasury");
  });

  it("archives a unit with no live sub-units", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId("org-unit-un_cebu"));
    await user.click(within(screen.getByTestId("org-unit-actions")).getByRole("button", { name: "Archive unit" }));
    await waitFor(() => expect(calls.some(c => c.method === "POST" && c.path === "/workspaces/ws_1/units/un_cebu/archive")).toBe(true));
    expect(await screen.findByTestId("org-unit-un_cebu")).toHaveTextContent("Office · Archived");
  });

  it("adds a person with a title and removes one", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("org-member-u1");
    await user.selectOptions(await screen.findByLabelText("Person"), "u2");
    await user.type(screen.getByLabelText("Title (optional)"), "Treasurer");
    await user.click(screen.getByRole("button", { name: "Add to unit" }));
    await waitFor(() => expect(calls.find(c => c.method === "POST" && c.path === "/workspaces/ws_1/units/un_fin/members")?.body).toEqual({ userId: "u2", title: "Treasurer" }));
    await user.click(screen.getByRole("button", { name: "Remove Ana Reyes from unit" }));
    await waitFor(() => expect(calls.some(c => c.method === "DELETE" && c.path === "/workspaces/ws_1/units/un_fin/members/u1")).toBe(true));
  });

  it("creates a unit under a parent", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("org-member-u1");
    await user.click(screen.getByRole("button", { name: "New unit" }));
    const form = screen.getByRole("form", { name: "New unit" });
    await user.type(within(form).getByLabelText("Name"), "Payroll");
    await user.selectOptions(within(form).getByLabelText("Part of"), "un_fin");
    await user.click(within(form).getByRole("button", { name: "Create unit" }));
    await waitFor(() => expect(calls.find(c => c.method === "POST" && c.path === "/workspaces/ws_1/units")?.body)
      .toEqual({ name: "Payroll", kind: "department", parentUnitId: "un_fin" }));
  });

  it("an archived unit is read-only", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId("org-unit-un_old"));
    await waitFor(() => expect(screen.getByTestId("org-unit-title")).toHaveTextContent("Old Project"));
    expect(screen.queryByTestId("org-unit-actions")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add to unit" })).toBeNull();
  });
});
