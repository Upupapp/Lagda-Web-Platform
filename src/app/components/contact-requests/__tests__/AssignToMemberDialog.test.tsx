import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import { AssignToMemberDialog } from "../AssignToMemberDialog";

type Handler = (url: string, init: RequestInit) => { status?: number; body: unknown } | undefined;

function mockApi(handler: Handler) {
  const fetchMock = vi.fn((url: string, init: RequestInit = {}) => {
    const hit = handler(url, init) ?? { status: 404, body: { error: { code: "not_found", message: "nope" } } };
    return Promise.resolve(new Response(JSON.stringify(hit.body), {
      status: hit.status ?? 200, headers: { "Content-Type": "application/json" },
    }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const MEMBERS = { members: [
  { membershipId: "m1", userId: "usr_me", email: "me@acme.test", displayName: "Me Owner", role: "owner", joinedAt: 1, isCurrentUser: true },
  { membershipId: "m2", userId: "usr_maria", email: "Maria@Acme.test", displayName: "Maria Santos", role: "member", joinedAt: 2, isCurrentUser: false },
] };

const contact = (id: string, email: string) => ({
  contactId: id, name: "Maria Santos", email, phone: null, organization: null, title: null, state: "active",
  createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", archivedAt: null, scope: "personal",
  ownerUserId: "usr_me", note: null, tagIds: [],
});
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, perPage: 50, hasNextPage: false });
const created = { requestId: "cr_1", workspaceId: "ws_1", workspaceName: "Acme", kind: "preparation", status: "pending", title: "Prepare NDA workflow",
  message: null, documentId: "doc_tpl", documentTitle: "NDA", dueAt: null, contact: { contactId: "con_1", name: "Maria Santos", email: "maria@acme.test" },
  delivery: "in-app", recipient: { userId: "usr_maria", displayName: "Maria Santos" }, requestedBy: { userId: "usr_me", displayName: "Me Owner" },
  responseDocumentId: null, declineReason: null, createdAt: "2026-09-20T00:00:00.000Z", updatedAt: "2026-09-20T00:00:00.000Z",
  completedAt: null, declinedAt: null, cancelledAt: null };

let calls: { url: string; method: string; body: unknown }[] = [];
const api = (contacts: unknown[]) => mockApi((url, init) => {
  const method = init.method ?? "GET";
  calls.push({ url, method, body: init.body === undefined ? undefined : JSON.parse(init.body as string) });
  if (url.endsWith("/members")) return { body: MEMBERS };
  if (url.includes("/contacts") && method === "GET") return { body: page(contacts) };
  if (url.endsWith("/contacts") && method === "POST") return { status: 201, body: { contact: contact("con_new", "Maria@Acme.test"), duplicates: [] } };
  if (url.endsWith("/contact-requests") && method === "POST") return { status: 201, body: created };
  return undefined;
});

const open = () => render(
  <AssignToMemberDialog workspaceId="ws_1" document={{ documentId: "doc_tpl", title: "NDA" }} label="NDA workflow" onClose={() => undefined} />,
);

beforeEach(() => { calls = []; });

describe("AssignToMemberDialog", () => {
  it("lists team members except the signed-in person", async () => {
    api([]);
    open();
    const picker = screen.getByLabelText(/Team member/);
    await waitFor(() => { expect(within(picker).getByRole("option", { name: /Maria Santos/ })).toBeTruthy(); });
    expect(within(picker).queryByRole("option", { name: /Me Owner/ })).toBeNull();
  });

  it("asks for a member before sending", async () => {
    api([]);
    open();
    await userEvent.click(screen.getByRole("button", { name: "Assign" }));
    expect(screen.getByText("Choose a team member.")).toBeTruthy();
    expect(calls.some(call => call.url.endsWith("/contact-requests"))).toBe(false);
  });

  it("adds a member who is not a contact first, says so, then sends the preparation request", async () => {
    api([]);
    open();
    const picker = screen.getByLabelText(/Team member/);
    await waitFor(() => { expect(within(picker).getByRole("option", { name: /Maria Santos/ })).toBeTruthy(); });
    await userEvent.selectOptions(picker, "usr_maria");
    expect(await screen.findByTestId("assign-adds-contact")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Assign" }));
    expect(await screen.findByRole("dialog", { name: "Assigned" })).toBeTruthy();
    const made = calls.find(call => call.url.endsWith("/contacts") && call.method === "POST");
    expect(made?.body).toEqual({ name: "Maria Santos", email: "Maria@Acme.test", scope: "personal" });
    const sent = calls.find(call => call.url.endsWith("/contact-requests"));
    expect(sent?.body).toEqual({ kind: "preparation", contactId: "con_new", title: "Prepare NDA workflow", documentId: "doc_tpl" });
  });

  it("uses the existing contact, matched by email in any letter case, without adding another", async () => {
    api([contact("con_old", "maria@acme.test")]);
    open();
    const picker = screen.getByLabelText(/Team member/);
    await waitFor(() => { expect(within(picker).getByRole("option", { name: /Maria Santos/ })).toBeTruthy(); });
    await userEvent.selectOptions(picker, "usr_maria");
    await userEvent.click(screen.getByRole("button", { name: "Assign" }));
    expect(await screen.findByRole("dialog", { name: "Assigned" })).toBeTruthy();
    expect(screen.queryByTestId("assign-adds-contact")).toBeNull();
    expect(calls.some(call => call.url.endsWith("/contacts") && call.method === "POST")).toBe(false);
    expect(calls.find(call => call.url.endsWith("/contact-requests"))?.body).toMatchObject({ contactId: "con_old", documentId: "doc_tpl" });
  });
});
