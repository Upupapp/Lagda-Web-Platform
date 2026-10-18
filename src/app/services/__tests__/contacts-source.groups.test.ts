// Contact groups through the contacts source (116): a workspace's groups come
// from the server and go back to it; with no workspace the demonstration answers,
// and it starts with no groups at all.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "/api" }));
const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("../api-client", () => ({ apiRequest }));

import {
  listGroups, getGroup, createGroup, updateGroup, archiveGroup, restoreGroup, addContactsToGroup,
  removeContactsFromGroup, getContact,
} from "../contacts-source";
import { mockContactService } from "../mock/contacts.service";
import { CONTACT_GROUPS } from "../../data/mock/contacts";
import type { ContactGroupId, ContactId } from "../../models/contacts";

const WS = "ws_1";
const wireGroup = (over: Record<string, unknown> = {}) => ({
  groupId: "cgr_1", name: "Clients", description: "Ours", scope: "workspace", ownerUserId: null, state: "active",
  createdAt: "2026-10-18T00:00:00.000Z", updatedAt: "2026-10-18T01:00:00.000Z", archivedAt: null,
  contactIds: ["cnt_1", "cnt_2"], ...over,
});
const wireContact = {
  contactId: "cnt_1", name: "Maria Santos", email: "maria@example.com", phone: null, organization: null, title: null,
  state: "active", createdAt: "2026-09-25T00:00:00.000Z", updatedAt: "2026-09-25T00:00:00.000Z", archivedAt: null,
  scope: "workspace", ownerUserId: null, note: null, tagIds: [],
};

beforeEach(() => { apiRequest.mockReset(); mockContactService.clearSessionState(); });

describe("a workspace's groups, from the server", () => {
  it("lists them with a member count, and keeps archived ones marked", async () => {
    apiRequest.mockResolvedValue({ groups: [wireGroup(), wireGroup({ groupId: "cgr_2", name: "Old", state: "archived", contactIds: [] })] });
    const groups = await listGroups(WS);
    expect(apiRequest.mock.calls[0]![0]).toBe("/workspaces/ws_1/contact-groups");
    expect(groups).toEqual([
      { id: "cgr_1", name: "Clients", description: "Ours", scope: "workspace", contactCount: 2, memberCount: 2, status: "active", updatedAt: "2026-10-18T01:00:00.000Z" },
      { id: "cgr_2", name: "Old", description: "Ours", scope: "workspace", contactCount: 0, memberCount: 0, status: "archived", updatedAt: "2026-10-18T01:00:00.000Z" },
    ]);
  });

  it("reads one group with its members, as list items", async () => {
    apiRequest.mockResolvedValue({
      ...wireGroup(), members: [{ contactId: "cnt_1", name: "Maria Santos", email: "maria@example.com", organization: "Ayala", title: null, state: "active" }],
    });
    const found = await getGroup(WS, "cgr_1" as ContactGroupId);
    expect(found?.group).toMatchObject({ id: "cgr_1", name: "Clients", description: "Ours", status: "active", contactIds: ["cnt_1", "cnt_2"], demonstrationOnly: false });
    expect(found?.members).toHaveLength(1);
    expect(found?.members[0]).toMatchObject({ id: "cnt_1", name: "Maria Santos", organization: "Ayala", status: "active", groupIds: ["cgr_1"] });
  });

  it("answers null for a group the server does not have", async () => {
    apiRequest.mockRejectedValue(new Error("404"));
    expect(await getGroup(WS, "cgr_x" as ContactGroupId)).toBeNull();
  });

  it("sends what the person typed and reads back what was saved", async () => {
    apiRequest.mockResolvedValue(wireGroup({ scope: "personal", ownerUserId: "usr_1" }));
    const group = await createGroup(WS, "Clients", "Ours", "personal");
    const [url, init] = apiRequest.mock.calls[0]! as [string, { method: string; body: Record<string, unknown> }];
    expect(url).toBe("/workspaces/ws_1/contact-groups");
    expect(init).toMatchObject({ method: "POST", body: { name: "Clients", description: "Ours", scope: "personal" } });
    expect(group.scope).toBe("personal");

    await createGroup(WS, "Bare", "   ", "workspace");
    expect((apiRequest.mock.calls[1]![1] as { body: Record<string, unknown> }).body).toEqual({ name: "Bare", scope: "workspace" });
  });

  it("renames, archives, restores, adds and removes through their own routes", async () => {
    apiRequest.mockResolvedValue(wireGroup());
    await updateGroup(WS, "cgr_1" as ContactGroupId, "New", "");
    expect(apiRequest.mock.calls[0]).toEqual(["/workspaces/ws_1/contact-groups/cgr_1", { method: "PUT", body: { name: "New", description: null } }]);
    await archiveGroup(WS, "cgr_1" as ContactGroupId);
    expect(apiRequest.mock.calls[1]![0]).toBe("/workspaces/ws_1/contact-groups/cgr_1/archive");
    await restoreGroup(WS, "cgr_1" as ContactGroupId);
    expect(apiRequest.mock.calls[2]![0]).toBe("/workspaces/ws_1/contact-groups/cgr_1/restore");
    await addContactsToGroup(WS, "cgr_1" as ContactGroupId, ["cnt_3" as ContactId]);
    expect(apiRequest.mock.calls[3]).toEqual(["/workspaces/ws_1/contact-groups/cgr_1/members", { method: "POST", body: { contactIds: ["cnt_3"] } }]);
    await removeContactsFromGroup(WS, "cgr_1" as ContactGroupId, ["cnt_3" as ContactId]);
    expect(apiRequest.mock.calls[4]).toEqual(["/workspaces/ws_1/contact-groups/cgr_1/members/remove", { method: "POST", body: { contactIds: ["cnt_3"] } }]);
  });

  it("shows the groups a contact is in, active ones only, and never fails the contact for them", async () => {
    apiRequest.mockImplementation((url: string) => Promise.resolve(url.endsWith("/contact-groups")
      ? { groups: [wireGroup(), wireGroup({ groupId: "cgr_2", state: "archived" }), wireGroup({ groupId: "cgr_3", contactIds: ["cnt_9"] })] }
      : wireContact));
    expect((await getContact(WS, "cnt_1" as ContactId))?.groupIds).toEqual(["cgr_1"]);
    apiRequest.mockImplementation((url: string) => url.endsWith("/contact-groups")
      ? Promise.reject(new Error("down")) : Promise.resolve(wireContact));
    const contact = await getContact(WS, "cnt_1" as ContactId);
    expect(contact?.name).toBe("Maria Santos");
    expect(contact?.groupIds).toEqual([]);
  });
});

describe("with no workspace, the demonstration", () => {
  it("starts with no groups and no contact in one", async () => {
    expect(CONTACT_GROUPS).toEqual([]);
    expect(await listGroups(undefined)).toEqual([]);
    expect(apiRequest).not.toHaveBeenCalled();
    const contact = await getContact(undefined, "contact-ana-reyes" as ContactId);
    expect(contact?.groupIds).toEqual([]);
  });

  it("lets a visitor make a group for the session, and put a contact in it", async () => {
    const group = await createGroup(undefined, "Mine", "", "personal");
    await addContactsToGroup(undefined, group.id, ["contact-ana-reyes" as ContactId]);
    const found = await getGroup(undefined, group.id);
    expect(found?.members.map(m => m.name)).toEqual(["Ana Reyes"]);
    expect((await listGroups(undefined)).map(g => [g.name, g.contactCount])).toEqual([["Mine", 1]]);
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
