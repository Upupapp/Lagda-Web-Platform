// Contact groups, the pages: the list, creating one, and one group's page with its
// members, adding and removing contacts, renaming, archiving and restoring. Against
// a faked server, so what is asserted is what the pages send and show.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
const platform = {
  workspaces: [{ id: "ws_1" }], currentWorkspace: { id: "ws_1", name: "Reyes Law" } as { id: string; name: string } | null,
  user: { id: "u1" },
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { ContactGroupsPage } from "../ContactGroupsPage";
import { ContactGroupDetailPage } from "../ContactGroupDetailPage";
import { mockSharingApi, apiError, type Routes as ApiRoutes } from "../../../../components/document-sharing/__tests__/sharing-test-api";

const T = "2026-10-18T00:00:00.000Z";
const group = (over: Record<string, unknown> = {}) => ({
  groupId: "cgr_1", name: "Clients", description: "Ours", scope: "workspace", ownerUserId: null, state: "active",
  createdAt: T, updatedAt: T, archivedAt: null, contactIds: ["cnt_1"], ...over,
});
const member = (id: string, name: string) => ({
  contactId: id, name, email: `${name.split(" ")[0]!.toLowerCase()}@example.com`, organization: null, title: null, state: "active",
});
const detail = (over: Record<string, unknown> = {}) => ({ ...group(), members: [member("cnt_1", "Ana Cruz")], ...over });
const wireContact = (id: string, name: string, scope = "workspace") => ({
  contactId: id, name, email: `${name.split(" ")[0]!.toLowerCase()}@example.com`, phone: null, organization: null, title: null,
  state: "active", createdAt: T, updatedAt: T, archivedAt: null, scope, ownerUserId: scope === "personal" ? "u1" : null, note: null, tagIds: [],
});
const contactPage = (items: unknown[]) => ({ items, total: items.length, page: 1, perPage: 25, hasNextPage: false });

function openDetail(routes: ApiRoutes) {
  const api = mockSharingApi(routes);
  render(
    <MemoryRouter initialEntries={["/app/contacts/groups/cgr_1"]}>
      <Routes><Route path="/app/contacts/groups/:groupId" element={<ContactGroupDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  return api;
}

beforeEach(() => { vi.unstubAllGlobals(); platform.currentWorkspace = { id: "ws_1", name: "Reyes Law" }; });

describe("the groups list", () => {
  it("starts empty and invites the first group, with nothing made up", async () => {
    mockSharingApi({ "GET /workspaces/ws_1/contact-groups": { groups: [] } });
    render(<MemoryRouter><ContactGroupsPage /></MemoryRouter>);
    expect(await screen.findByText("No groups yet")).toBeInTheDocument();
    expect(screen.queryByText("Clients")).toBeNull();
    expect(screen.getByRole("button", { name: "Create First Group" })).toBeInTheDocument();
  });

  it("lists the server's groups with their member counts and archived ones on request", async () => {
    mockSharingApi({
      "GET /workspaces/ws_1/contact-groups": { groups: [group({ contactIds: ["a", "b"] }), group({ groupId: "cgr_2", name: "Old", state: "archived", contactIds: [] })] },
    });
    render(<MemoryRouter><ContactGroupsPage /></MemoryRouter>);
    const card = await screen.findByRole("link", { name: /Clients/ });
    expect(card).toHaveTextContent("2 contacts");
    expect(card).toHaveAttribute("href", "/app/contacts/groups/cgr_1");
    expect(screen.queryByText("Old")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Show 1 archived group/ }));
    expect(await screen.findByText("Old")).toBeInTheDocument();
  });

  it("creates a group on the server with the visibility chosen, then lists it", async () => {
    let created = false;
    const api = mockSharingApi({
      "GET /workspaces/ws_1/contact-groups": () => ({ groups: created ? [group({ name: "Vendors", scope: "personal", ownerUserId: "u1", contactIds: [] })] : [] }),
      "POST /workspaces/ws_1/contact-groups": () => { created = true; return { __reply: true, status: 201, body: group({ name: "Vendors", scope: "personal" }) }; },
    });
    render(<MemoryRouter><ContactGroupsPage /></MemoryRouter>);
    await userEvent.click(await screen.findByRole("button", { name: "Create First Group" }));
    await userEvent.type(screen.getByLabelText(/Group Name/), "Vendors");
    await userEvent.click(screen.getByRole("button", { name: "Create Group" }));
    expect(await screen.findByRole("link", { name: /Vendors/ })).toBeInTheDocument();
    const post = api.calls.find(c => c.method === "POST");
    expect(post?.body).toEqual({ name: "Vendors", scope: "personal" });
  });
});

describe("one group", () => {
  it("shows the group, its scope and its members, linked to their contacts", async () => {
    openDetail({ "GET /workspaces/ws_1/contact-groups/cgr_1": detail() });
    expect(await screen.findByRole("heading", { level: 1, name: "Clients" })).toBeInTheDocument();
    expect(screen.getByText("Ours")).toBeInTheDocument();
    expect(screen.getByText("Members (1)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ana Cruz" })).toHaveAttribute("href", "/app/contacts/cnt_1");
    expect(screen.getByText(/seen by everyone in the workspace/)).toBeInTheDocument();
  });

  it("says plainly when the group is not found", async () => {
    openDetail({ "GET /workspaces/ws_1/contact-groups/cgr_1": apiError(404, "resource_not_found") });
    expect(await screen.findByText(/Group not found/)).toBeInTheDocument();
  });

  it("removes a member on the server and shows the group again", async () => {
    let removed = false;
    const api = openDetail({
      "GET /workspaces/ws_1/contact-groups/cgr_1": () => (removed ? detail({ members: [], contactIds: [] }) : detail()),
      "POST /workspaces/ws_1/contact-groups/cgr_1/members/remove": () => { removed = true; return group({ contactIds: [] }); },
    });
    await userEvent.click(await screen.findByRole("button", { name: "Remove Ana Cruz from group" }));
    expect(await screen.findByText("No members yet.")).toBeInTheDocument();
    expect(api.calls.find(c => c.path.endsWith("/members/remove"))?.body).toEqual({ contactIds: ["cnt_1"] });
  });

  it("adds the contacts picked, leaving out members, and offers only shareable contacts for a workspace group", async () => {
    let added = false;
    const api = openDetail({
      "GET /workspaces/ws_1/contact-groups/cgr_1": () => (added ? detail({ members: [member("cnt_1", "Ana Cruz"), member("cnt_2", "Ben Lim")], contactIds: ["cnt_1", "cnt_2"] }) : detail()),
      "GET /workspaces/ws_1/contacts": contactPage([
        wireContact("cnt_1", "Ana Cruz"), wireContact("cnt_2", "Ben Lim"), wireContact("cnt_3", "Private Person", "personal"),
      ]),
      "POST /workspaces/ws_1/contact-groups/cgr_1/members": () => { added = true; return group({ contactIds: ["cnt_1", "cnt_2"] }); },
    });
    await userEvent.click(await screen.findByRole("button", { name: "Add contacts" }));
    const panel = await screen.findByTestId("add-contacts-panel");
    const options = await within(panel).findAllByRole("checkbox");
    expect(options).toHaveLength(1);
    expect(within(panel).getByText("Ben Lim")).toBeInTheDocument();
    expect(within(panel).queryByText("Ana Cruz")).toBeNull();
    expect(within(panel).queryByText("Private Person")).toBeNull();
    const add = within(panel).getByRole("button", { name: "Add contacts" });
    expect(add).toBeDisabled();
    await userEvent.click(options[0]!);
    await userEvent.click(within(panel).getByRole("button", { name: "Add 1 contact" }));
    expect(await screen.findByText("The contacts were added.")).toBeInTheDocument();
    expect(screen.getByText("Members (2)")).toBeInTheDocument();
    expect(api.calls.find(c => c.method === "POST" && c.path.endsWith("/members"))?.body).toEqual({ contactIds: ["cnt_2"] });
    expect(screen.queryByTestId("add-contacts-panel")).toBeNull();
  });

  it("offers a person's own contacts for a personal group", async () => {
    openDetail({
      "GET /workspaces/ws_1/contact-groups/cgr_1": detail({ scope: "personal", ownerUserId: "u1", members: [], contactIds: [] }),
      "GET /workspaces/ws_1/contacts": contactPage([wireContact("cnt_3", "Private Person", "personal")]),
    });
    await userEvent.click(await screen.findByRole("button", { name: "Add contacts" }));
    expect(await screen.findByText("Private Person")).toBeInTheDocument();
    expect(screen.getByText(/seen only by you/)).toBeInTheDocument();
  });

  it("explains a refusal to add, and keeps the panel open", async () => {
    openDetail({
      "GET /workspaces/ws_1/contact-groups/cgr_1": detail(),
      "GET /workspaces/ws_1/contacts": contactPage([wireContact("cnt_2", "Ben Lim")]),
      "POST /workspaces/ws_1/contact-groups/cgr_1/members": apiError(422, "validation_failed"),
    });
    await userEvent.click(await screen.findByRole("button", { name: "Add contacts" }));
    await userEvent.click(await screen.findByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Add 1 contact" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/archived contacts cannot be added/);
    expect(screen.getByTestId("add-contacts-panel")).toBeInTheDocument();
  });

  it("renames the group, and refuses a blank name before asking the server", async () => {
    let renamed = false;
    const api = openDetail({
      "GET /workspaces/ws_1/contact-groups/cgr_1": () => (renamed ? detail({ name: "Key clients", description: null }) : detail()),
      "PUT /workspaces/ws_1/contact-groups/cgr_1": () => { renamed = true; return group({ name: "Key clients", description: null }); },
    });
    await userEvent.click(await screen.findByRole("button", { name: "Rename" }));
    const name = screen.getByLabelText("Group name");
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Give the group a name.");
    expect(api.calls.some(c => c.method === "PUT")).toBe(false);
    await userEvent.type(name, "Key clients");
    await userEvent.clear(screen.getByLabelText("Description"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Key clients" })).toBeInTheDocument();
    expect(api.calls.find(c => c.method === "PUT")?.body).toEqual({ name: "Key clients", description: null });
    expect(screen.getByText("The group was updated.")).toBeInTheDocument();
  });

  it("archives the group, which then cannot be changed, and restores it", async () => {
    let archived = false;
    openDetail({
      "GET /workspaces/ws_1/contact-groups/cgr_1": () => detail(archived ? { state: "archived", archivedAt: T } : {}),
      "POST /workspaces/ws_1/contact-groups/cgr_1/archive": () => { archived = true; return group({ state: "archived" }); },
      "POST /workspaces/ws_1/contact-groups/cgr_1/restore": () => { archived = false; return group(); },
    });
    await userEvent.click(await screen.findByRole("button", { name: "Archive Group" }));
    expect(await screen.findByRole("button", { name: "Restore Group" })).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add contacts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove Ana Cruz/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Restore Group" }));
    expect(await screen.findByRole("button", { name: "Archive Group" })).toBeInTheDocument();
  });
});

describe("with no workspace open", () => {
  it("shows the demonstration with no groups made up", async () => {
    platform.currentWorkspace = null;
    mockSharingApi({});
    render(<MemoryRouter><ContactGroupsPage /></MemoryRouter>);
    await waitFor(() => { expect(screen.getByText("No groups yet")).toBeInTheDocument(); });
  });
});
