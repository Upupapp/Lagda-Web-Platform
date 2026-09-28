// Contacts → Archived: the third section beside All Contacts and Requests
// From Contacts. It lists the backend's `state=archived` contacts in the same
// cards, with a menu of View Contact and Restore, and an empty state. All
// Contacts keeps asking for active contacts only.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    currentWorkspace: { id: "ws_1", name: "Acme Holdings" },
    user: { id: "usr_me" },
  }),
}));

import { ContactsPage, ArchivedContactsPage } from "../ContactsPage";

const wire = (overrides: Record<string, unknown>) => ({
  contactId: "con_a", name: "Rosa Lim", email: "rosa@old.test", phone: null, organization: "Old Vendor",
  title: null, state: "archived", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-09-20T00:00:00.000Z",
  archivedAt: "2026-09-20T00:00:00.000Z", scope: "workspace", ownerUserId: null, note: null, tagIds: [],
  workspaceMember: null, ...overrides,
});
const ARCHIVED = wire({});
const ACTIVE = wire({ contactId: "con_m", name: "Maria Santos", email: "maria@acme.test", state: "active", archivedAt: null });

let archivedRows: unknown[] = [];
type Call = { url: string; method: string };
const calls: Call[] = [];

beforeEach(() => {
  calls.length = 0;
  archivedRows = [ARCHIVED];
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    let body: unknown;
    if (method === "POST" && /\/contacts\/con_a\/restore$/.test(url)) {
      archivedRows = [];
      body = { ...ARCHIVED, state: "active", archivedAt: null };
    } else if (/\/contacts\?/.test(url)) {
      const rows = url.includes("state=archived") ? archivedRows : [ACTIVE];
      body = { items: rows, total: rows.length, page: 1, perPage: 20, hasNextPage: false };
    }
    return Promise.resolve(new Response(JSON.stringify(body ?? { error: { code: "not_found", message: "x" } }), {
      status: body === undefined ? 404 : 200, headers: { "Content-Type": "application/json" },
    }));
  }));
});

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/contacts" element={<ContactsPage />} />
        <Route path="/app/contacts/archived" element={<ArchivedContactsPage />} />
        <Route path="/app/contacts/:contactId" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const listUrls = () => calls.filter(c => c.method === "GET" && /\/contacts\?/.test(c.url)).map(c => c.url);

describe("Contacts → Archived", () => {
  it("is the third section in the nav, current on its own route", async () => {
    renderAt("/app/contacts/archived");
    await screen.findByText("Rosa Lim");
    const nav = screen.getByRole("navigation", { name: "Contacts sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map(link => link.textContent)).toEqual(["All Contacts", "Requests From Contacts", "Archived"]);
    expect(within(nav).getByRole("link", { name: "Archived" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: "Archived" }).getAttribute("href")).toBe("/app/contacts/archived");
    expect(within(nav).getByRole("link", { name: "All Contacts" })).not.toHaveAttribute("aria-current");
  });

  it("lists only archived contacts, from the backend's archived listing", async () => {
    renderAt("/app/contacts/archived");
    expect(await screen.findByText("Rosa Lim")).toBeTruthy();
    expect(screen.queryByText("Maria Santos")).toBeNull();
    expect(screen.getByText("1 archived contact")).toBeTruthy();
    expect(listUrls().every(url => url.includes("state=archived"))).toBe(true);
    // No selection or bulk actions in the archived section.
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("All Contacts still asks for active contacts only", async () => {
    renderAt("/app/contacts");
    expect(await screen.findByText("Maria Santos")).toBeTruthy();
    expect(screen.queryByText("Rosa Lim")).toBeNull();
    expect(listUrls().length).toBeGreaterThan(0);
    expect(listUrls().every(url => url.includes("state=active"))).toBe(true);
  });

  it("offers View Contact and Restore in the card menu", async () => {
    renderAt("/app/contacts/archived");
    await screen.findByText("Rosa Lim");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Rosa Lim" }));
    const menu = screen.getByRole("menu", { name: "Actions for Rosa Lim" });
    expect(within(menu).getAllByRole("menuitem").map(item => item.textContent)).toEqual(["View Contact", "Restore"]);
    await userEvent.click(within(menu).getByRole("menuitem", { name: "View Contact" }));
    expect(screen.getByTestId("where").textContent).toBe("/app/contacts/con_a");
  });

  it("restores through the existing restore action, then shows the empty state", async () => {
    renderAt("/app/contacts/archived");
    await screen.findByText("Rosa Lim");
    await userEvent.click(screen.getByRole("button", { name: "Actions for Rosa Lim" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Restore" }));
    await waitFor(() => expect(calls.some(c => c.method === "POST" && c.url.endsWith("/contacts/con_a/restore"))).toBe(true));
    expect(await screen.findByText("Contact restored.")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "No archived contacts" })).toBeTruthy();
    expect(screen.queryByText("Rosa Lim")).toBeNull();
  });

  it("shows an empty state with a way back when nothing is archived", async () => {
    archivedRows = [];
    renderAt("/app/contacts/archived");
    expect(await screen.findByRole("heading", { name: "No archived contacts" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "View All Contacts" }));
    expect(await screen.findByText("Maria Santos")).toBeTruthy();
  });
});
