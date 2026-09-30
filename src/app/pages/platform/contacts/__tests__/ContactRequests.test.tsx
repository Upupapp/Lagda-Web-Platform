// Contacts × contact requests (086): the Organization default, the single
// "All Contacts" view, the two-item card menu, the member / external badge,
// the preparation-only request action, and a contact's history.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    currentWorkspace: { id: "ws_1", name: "Acme Holdings" },
    user: { id: "usr_me" },
  }),
}));
vi.mock("../../../../hooks/useWorkspaceAccess", () => ({
  useWorkspaceAccess: () => ({ confirmed: true, can: (capability: string) => capability === "upload-request.create", capabilities: [], role: "admin", roleTitle: null }),
}));

import { ContactsPage } from "../ContactsPage";
import { ContactDetailPage } from "../ContactDetailPage";
import { CreateContactPage } from "../CreateContactPage";

const wire = (overrides: Record<string, unknown>) => ({
  contactId: "con_m", name: "Maria Santos", email: "maria@acme.test", phone: null, organization: "Acme Holdings",
  title: null, state: "active", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
  archivedAt: null, scope: "workspace", ownerUserId: null, note: null, tagIds: [],
  workspaceMember: { userId: "usr_maria", displayName: "Maria" }, ...overrides,
});
const MEMBER = wire({});
const EXTERNAL = wire({ contactId: "con_x", name: "Juan Cruz", email: "juan@vendor.test", organization: "Vendor", workspaceMember: null });

function mockApi(extra: (url: string) => unknown = () => undefined) {
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    const body = extra(url)
      ?? (/\/contacts\/con_x\/requests$/.test(url) || /\/contacts\/con_m\/requests$/.test(url) ? { items: [] }
        : /\/contacts\/con_x$/.test(url) ? EXTERNAL
          : /\/contacts\/con_m$/.test(url) ? MEMBER
            : /\/contacts(\?|$)/.test(url) ? { items: [MEMBER, EXTERNAL], total: 2, page: 1, perPage: 20, hasNextPage: false }
              : /\/documents/.test(url) ? { items: [], total: 0, page: 1, perPage: 100, hasNextPage: false }
                : undefined);
    return Promise.resolve(new Response(JSON.stringify(body ?? { error: { code: "not_found", message: "x" } }), {
      status: body === undefined ? 404 : 200, headers: { "Content-Type": "application/json" },
    }));
  }));
}

describe("Add Contact", () => {
  it("defaults Organization to the current workspace name, and lets it be changed", async () => {
    mockApi();
    render(<MemoryRouter><CreateContactPage /></MemoryRouter>);
    const org = screen.getByLabelText("Organization");
    expect((org as HTMLInputElement).value).toBe("Acme Holdings");
    await userEvent.clear(org);
    await userEvent.type(org, "Vendor Inc.");
    expect((org as HTMLInputElement).value).toBe("Vendor Inc.");
  });
});

describe("Contacts list", () => {
  it("shows All contacts, with Pending, Document requests and Archived beside it, and no scope or status filters", async () => {
    mockApi();
    render(<MemoryRouter initialEntries={["/app/contacts"]}><ContactsPage /></MemoryRouter>);
    await screen.findByText("Maria Santos");
    const nav = screen.getByRole("navigation", { name: "Contacts sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map(link => link.textContent)).toEqual(["All contacts", "Pending", "Document requests", "Archived"]);
    expect(within(nav).getByRole("link", { name: "All contacts" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: "Document requests" }).getAttribute("href")).toBe("/app/contacts/requests");
    expect(screen.queryByRole("navigation", { name: "Contact views" })).toBeNull();
    for (const gone of ["My Contacts", "Workspace", "Archived", "Recently Used", "Potential Duplicates", "Frequently Used"]) {
      expect(screen.queryByRole("button", { name: new RegExp(`^${gone}`) })).toBeNull();
    }
    await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
    const filters = screen.getByRole("region", { name: "Filters" });
    expect(within(filters).queryByText("Scope")).toBeNull();
    expect(within(filters).queryByText("Status")).toBeNull();
    expect(within(filters).queryByRole("combobox")).toBeNull();
  });

  it("drops an old view / scope / status link and lists all contacts", async () => {
    mockApi();
    render(<MemoryRouter initialEntries={["/app/contacts?view=archived&scope=personal&status=archived"]}><ContactsPage /></MemoryRouter>);
    expect(await screen.findByText("Maria Santos")).toBeTruthy();
    expect(screen.getByText("Juan Cruz")).toBeTruthy();
    const listCall = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls
      .map(([url]) => url).find(url => /\/contacts\?/.test(url));
    expect(listCall).toContain("state=active");
  });

  it("badges each contact, and its menu holds only View Contact and Edit", async () => {
    mockApi();
    render(<MemoryRouter initialEntries={["/app/contacts"]}><ContactsPage /></MemoryRouter>);
    expect(await screen.findByText("Workspace member")).toBeTruthy();
    expect(screen.getByText("External")).toBeTruthy();

    for (const name of ["Juan Cruz", "Maria Santos"]) {
      await userEvent.click(screen.getByRole("button", { name: `Actions for ${name}` }));
      const menu = screen.getByRole("menu", { name: `Actions for ${name}` });
      const items = within(menu).getAllByRole("menuitem");
      expect(items.map(item => item.textContent)).toEqual(["View contact", "Edit"]);
      await userEvent.click(screen.getByRole("button", { name: `Actions for ${name}` }));
    }
    expect(screen.queryByRole("menuitem", { name: /Assign for document|Request a signed document|Archive|Restore/ })).toBeNull();
  });
});

describe("Contact detail", () => {
  const renderDetail = (id: string) => render(
    <MemoryRouter initialEntries={[`/app/contacts/${id}`]}>
      <Routes><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes>
    </MemoryRouter>,
  );

  it("offers only preparation, disabled with its reason for an external contact, plus the history", async () => {
    mockApi(url => (/\/contacts\/con_x\/requests$/.test(url)
      ? { items: [{
        requestId: "cr_1", workspaceId: "ws_1", workspaceName: "Acme Holdings", kind: "upload", status: "pending",
        title: "2026 permit", message: null, documentId: null, documentTitle: null, dueAt: null,
        contact: { contactId: "con_x", name: "Juan Cruz", email: "juan@vendor.test" }, delivery: "email", recipient: null,
        requestedBy: { userId: "usr_me", displayName: "Paul" }, responseDocumentId: null, declineReason: null,
        createdAt: "2026-09-20T00:00:00.000Z", updatedAt: "2026-09-20T00:00:00.000Z", completedAt: null, declinedAt: null, cancelledAt: null,
      }] }
      : undefined));
    renderDetail("con_x");
    expect(await screen.findByRole("heading", { name: "Juan Cruz" })).toBeTruthy();
    expect(screen.getByText("External")).toBeTruthy();
    const group = screen.getByRole("group", { name: "Request actions" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.textContent).toMatch(/Assign for document preparation/);
    expect(buttons[0]!.getAttribute("aria-disabled")).toBe("true");
    expect(within(group).getByText(/Only workspace members can be assigned to prepare a document/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Request a signed document/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Assign for document upload/ })).toBeNull();
    await userEvent.click(buttons[0]!);
    expect(screen.queryByRole("dialog")).toBeNull();
    // Existing requests of every kind are still shown.
    const history = await screen.findByRole("list", { name: "Requests sent to this contact" });
    expect(within(history).getByText("2026 permit")).toBeTruthy();
    expect(within(history).getByText("Pending")).toBeTruthy();
    expect(within(history).getByText("Emailed")).toBeTruthy();
  });

  it("lets a member be assigned for preparation", async () => {
    mockApi();
    renderDetail("con_m");
    await screen.findByRole("heading", { name: "Maria Santos" });
    expect(screen.getByText(/No email is sent/)).toBeTruthy();
    const group = screen.getByRole("group", { name: "Request actions" });
    expect(within(group).getAllByRole("button")).toHaveLength(1);
    expect(within(group).getByRole("button", { name: /Assign for document preparation/ }).hasAttribute("aria-disabled")).toBe(true);
    expect(within(group).getByRole("button", { name: /Assign for document preparation/ }).getAttribute("aria-disabled")).toBe("false");
    await userEvent.click(screen.getByRole("button", { name: /Assign for document preparation/ }));
    expect(await screen.findByRole("dialog", { name: "Assign for document preparation" })).toBeTruthy();
  });
});
