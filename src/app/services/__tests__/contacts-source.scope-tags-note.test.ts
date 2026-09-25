// Regression test: the Edit/Create Contact forms showed Tags, Visibility
// and a Note, and every one of them was silently dropped on save because
// contacts-source.ts defaulted them away rather than sending them (074
// fixed the backend to actually store them; this proves the frontend now
// sends and reads them for real).

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "/api" }));
const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("../api-client", () => ({ apiRequest }));

import { createContact, updateContact, getContact } from "../contacts-source";
import type { ContactCreateInput, ContactId } from "../../models/contacts";

const WS = "ws_1";
const wireContact = (over: Record<string, unknown> = {}) => ({
  contactId: "cnt_1", name: "Maria Santos", email: "maria@example.com",
  phone: null, organization: null, title: null, state: "active",
  createdAt: "2026-09-25T00:00:00.000Z", updatedAt: "2026-09-25T00:00:00.000Z",
  archivedAt: null, scope: "workspace", ownerUserId: null, note: null, tagIds: [],
  ...over,
});

beforeEach(() => { apiRequest.mockReset(); });

const CREATE_INPUT: ContactCreateInput = {
  name: "Maria Santos", email: "maria@example.com",
  scope: "personal", tagIds: ["tag-legal", "tag-signer"], groupIds: [],
  note: "Handles renewals.",
};

describe("createContact sends scope, note and tags — not just name/email", () => {
  it("POSTs the note and the tag set in the body", async () => {
    apiRequest.mockResolvedValue({ contact: wireContact(), duplicates: [] });
    await createContact(WS, CREATE_INPUT);

    const [, init] = apiRequest.mock.calls[0]! as [string, { body: Record<string, unknown> }];
    expect(init.body["note"]).toBe("Handles renewals.");
    expect(init.body["tagIds"]).toEqual(["tag-legal", "tag-signer"]);
    expect(init.body["scope"]).toBe("personal");
  });

  it("returns the SAVED scope, note and tags from the response — not empty defaults", async () => {
    apiRequest.mockResolvedValue({
      contact: wireContact({
        scope: "personal", ownerUserId: "usr_1",
        note: "Handles renewals.", tagIds: ["tag-legal", "tag-signer"],
      }),
      duplicates: [],
    });
    const contact = await createContact(WS, CREATE_INPUT);

    expect(contact.scope).toBe("personal");
    expect(contact.note).toBe("Handles renewals.");
    expect(contact.tagIds).toEqual(["tag-legal", "tag-signer"]);
  });

  it("omits scope from a PUT — the backend refuses it as create-only", async () => {
    apiRequest.mockResolvedValue({ contact: wireContact(), duplicates: [] });
    await updateContact(WS, "cnt_1" as ContactId, {
      name: "Maria Santos", email: "maria@example.com",
      note: "Updated note.", tagIds: ["tag-hr"],
    });

    const [, init] = apiRequest.mock.calls[0]! as [string, { body: Record<string, unknown> }];
    expect(init.body["note"]).toBe("Updated note.");
    expect(init.body["tagIds"]).toEqual(["tag-hr"]);
    expect(init.body).not.toHaveProperty("scope");
  });

  it("a save that clears the note sends an explicit null, not an empty string", async () => {
    apiRequest.mockResolvedValue({ contact: wireContact(), duplicates: [] });
    await updateContact(WS, "cnt_1" as ContactId, {
      name: "Maria Santos", email: "maria@example.com", note: "",
    });

    const [, init] = apiRequest.mock.calls[0]! as [string, { body: Record<string, unknown> }];
    expect(init.body["note"]).toBeNull();
  });

  it("getContact reads back a real note and tag set after reload", async () => {
    apiRequest.mockResolvedValue(wireContact({
      note: "Handles renewals.", tagIds: ["tag-legal"],
    }));
    const contact = await getContact(WS, "cnt_1" as ContactId);
    expect(contact?.note).toBe("Handles renewals.");
    expect(contact?.tagIds).toEqual(["tag-legal"]);
  });
});
