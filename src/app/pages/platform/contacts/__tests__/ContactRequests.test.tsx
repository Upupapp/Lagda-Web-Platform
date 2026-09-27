// Contacts × contact requests (086): the Organization default, the member /
// external badge, the three request actions, and a contact's history.

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
  it("badges each contact and offers the request actions, preparation for members only", async () => {
    mockApi();
    render(<MemoryRouter initialEntries={["/app/contacts"]}><ContactsPage /></MemoryRouter>);
    expect(await screen.findByText("Workspace member")).toBeTruthy();
    expect(screen.getByText("External")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Actions for Juan Cruz" }));
    const menu = screen.getByRole("menu", { name: "Actions for Juan Cruz" });
    const prep = within(menu).getByRole("menuitem", { name: /Assign for document preparation/ });
    expect(prep.getAttribute("aria-disabled")).toBe("true");
    expect(within(menu).getByRole("menuitem", { name: /Assign for document upload/ }).hasAttribute("aria-disabled")).toBe(false);

    await userEvent.click(within(menu).getByRole("menuitem", { name: /Request a signed document/ }));
    const dialog = await screen.findByRole("dialog", { name: "Request a signed document" });
    expect(within(dialog).getByText(/We'll email them/)).toBeTruthy();
  });

  it("opens a member's upload request with the in-app explanation", async () => {
    mockApi();
    render(<MemoryRouter initialEntries={["/app/contacts"]}><ContactsPage /></MemoryRouter>);
    await userEvent.click(await screen.findByRole("button", { name: "Actions for Maria Santos" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Assign for document upload/ }));
    const dialog = await screen.findByRole("dialog", { name: "Assign for document upload" });
    expect(within(dialog).getByText(/No email is sent/)).toBeTruthy();
  });
});

describe("Contact detail", () => {
  const renderDetail = (id: string) => render(
    <MemoryRouter initialEntries={[`/app/contacts/${id}`]}>
      <Routes><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes>
    </MemoryRouter>,
  );

  it("shows the request actions, delivery and history for an external contact", async () => {
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
    expect(screen.getByText(/We'll email them/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Assign for document preparation/ }).getAttribute("aria-disabled")).toBe("true");
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
    await userEvent.click(screen.getByRole("button", { name: /Assign for document preparation/ }));
    expect(await screen.findByRole("dialog", { name: "Assign for document preparation" })).toBeTruthy();
  });
});
