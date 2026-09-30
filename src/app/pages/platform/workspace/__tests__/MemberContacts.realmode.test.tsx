// Adding workspace members to Contacts, with a real backend: the per-member
// button, "In contacts ✓" for anyone already there, never for yourself, the
// confirmation (personal by default, or shared with the workspace), the bulk
// action, and no button at all for a role that may not create contacts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";

vi.setConfig({ testTimeout: 15_000 });

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = {
  role: "owner" as string | null,
  user: { email: "ana@example.com", displayName: "Ana Reyes" },
  currentWorkspace: { id: "ws_1", name: "Reyes Law Office" },
  workspaces: [{ id: "ws_1", name: "Reyes Law Office", role: "owner", initials: "RL", accentColor: "#0078D4" }],
  switchWorkspace: vi.fn(),
  applyWorkspaceRename: vi.fn(),
};
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { MembersPage } from "../MembersPage";
import { MemberDetailPage } from "../MemberDetailPage";
import { ROLE_CAPABILITIES } from "../../../../models/workspace-role-policy";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const NOW = Date.now();
const MEMBERS = [
  { membershipId: "m_owner", userId: "u1", email: "ana@example.com", displayName: "Ana Reyes", role: "owner", joinedAt: NOW, isCurrentUser: true, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_maria", userId: "u2", email: "maria@example.com", displayName: "Maria Santos", role: "member", joinedAt: NOW, isCurrentUser: false, roleTitle: "Paralegal", canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_jose", userId: "u3", email: "Jose@Example.com", displayName: "Jose Cruz", role: "sender", joinedAt: NOW, isCurrentUser: false, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_lea", userId: "u4", email: "lea@example.com", displayName: "Lea Tan", role: "member", joinedAt: NOW, isCurrentUser: false, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
];

function wireContact(id: string, name: string, email: string, extra: Record<string, unknown> = {}) {
  return {
    contactId: id, name, email, phone: null, organization: null, title: null, state: "active",
    createdAt: new Date(NOW).toISOString(), updatedAt: new Date(NOW).toISOString(), archivedAt: null,
    scope: "personal", ownerUserId: "u1", note: null, tagIds: [], ...extra,
  };
}

let accessRole = "owner";
let existing: ReturnType<typeof wireContact>[] = [];
const created: Record<string, unknown>[] = [];

beforeEach(() => {
  accessRole = "owner";
  platform.role = "owner";
  existing = [wireContact("ct_jose", "Jose Cruz", "jose@example.com")];
  created.length = 0;
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("http://api.test", "").replace(/\?.*$/, "");
    const ok = (b: unknown) => Promise.resolve(json(200, b));
    if (method === "GET" && path === "/workspaces/ws_1/access") {
      return ok({ workspaceId: "ws_1", membershipId: "m_me", role: accessRole, capabilities: [...ROLE_CAPABILITIES[accessRole as keyof typeof ROLE_CAPABILITIES]], roleTitle: null });
    }
    if (method === "GET" && path === "/workspaces/ws_1/members") return ok({ members: MEMBERS });
    if (method === "GET" && path === "/workspaces/ws_1/join-requests") return ok({ requests: [] });
    if (method === "GET" && path === "/workspaces/ws_1/contacts") {
      return ok({ items: existing, total: existing.length, page: 1, perPage: 100, hasNextPage: false });
    }
    if (method === "POST" && path === "/workspaces/ws_1/contacts") {
      const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as Record<string, unknown>;
      created.push(body);
      const contact = wireContact(`ct_${String(created.length)}`, String(body.name), String(body.email), { scope: body.scope ?? "personal" });
      existing = [...existing, contact];
      return Promise.resolve(json(201, { contact, duplicates: [] }));
    }
    return Promise.resolve(json(404, { error: { code: "resource_not_found", message: `${method} ${path}` } }));
  }));
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/workspace/members" element={<MembersPage />} />
        <Route path="/app/workspace/members/:memberId" element={<MemberDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Add workspace members to contacts", () => {
  it("offers each teammate, marks anyone already a contact, and never offers you", async () => {
    renderAt("/app/workspace/members");
    const maria = await screen.findByRole("button", { name: "Add Maria Santos to contacts" });
    await waitFor(() => expect(maria).toBeEnabled());
    // Matched by email, whatever its case.
    expect(screen.getByTestId("in-contacts-m_jose")).toHaveAttribute("href", "/app/contacts/ct_jose");
    expect(screen.queryByTestId("add-contact-m_jose")).toBeNull();
    expect(screen.queryByTestId("add-contact-m_owner")).toBeNull();
    expect(screen.queryByTestId("in-contacts-m_owner")).toBeNull();
  });

  it("saves a personal contact with the member's details and the Internal tag, then shows In contacts", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/members");
    const button = await screen.findByRole("button", { name: "Add Maria Santos to contacts" });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    const dialog = screen.getByRole("dialog", { name: "Add Maria Santos to contacts" });
    expect(dialog).toHaveTextContent("maria@example.com");
    expect(dialog).toHaveTextContent("Paralegal");
    expect(dialog).toHaveTextContent("Reyes Law Office");
    expect(within(dialog).getByRole("checkbox", { name: /Share with the workspace/ })).not.toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Add to contacts" }));

    expect(await screen.findByTestId("contacts-notice")).toHaveTextContent("Added 1 to your contacts");
    expect(created).toEqual([expect.objectContaining({
      name: "Maria Santos", email: "maria@example.com", title: "Paralegal", organization: "Reyes Law Office",
      scope: "personal", tagIds: ["tag-internal"],
    })]);
    expect(screen.getByTestId("in-contacts-m_maria")).toBeInTheDocument();
  });

  it("adds the selected members in one go, shared with the workspace, skipping anyone already there", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/members");
    await screen.findByRole("button", { name: "Add Maria Santos to contacts" });
    await user.click(screen.getByRole("checkbox", { name: "Select all members" }));
    const bulk = screen.getByTestId("bulk-add-contacts");
    await waitFor(() => expect(bulk).toBeEnabled());
    await user.click(bulk);

    const dialog = screen.getByRole("dialog", { name: "Add 3 members to contacts" });
    expect(dialog).toHaveTextContent("1 is already in contacts and will be skipped");
    await user.click(within(dialog).getByRole("checkbox", { name: /Share with the workspace/ }));
    await user.click(within(dialog).getByRole("button", { name: "Add to contacts" }));

    expect(await screen.findByTestId("contacts-notice"))
      .toHaveTextContent("Added 2 to the workspace's contacts · 1 was already in contacts");
    expect(created.map(c => [c.email, c.scope]).sort()).toEqual([["lea@example.com", "workspace"], ["maria@example.com", "workspace"]]);
  });

  it("is on a member's own page too", async () => {
    const user = userEvent.setup();
    renderAt("/app/workspace/members/m_lea");
    const button = await screen.findByRole("button", { name: "Add Lea Tan to contacts" });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add to contacts" }));
    expect(await screen.findByTestId("contacts-notice")).toHaveTextContent("Added 1 to your contacts");
    expect(screen.getByTestId("in-contacts-m_lea")).toBeInTheDocument();
  });

  it("offers nothing to a role that may not create contacts", async () => {
    accessRole = "auditor";
    platform.role = "auditor";
    renderAt("/app/workspace/members");
    await screen.findByText("Maria Santos");
    await waitFor(() => expect(screen.queryByTestId("add-contact-m_maria")).toBeNull());
    expect(screen.queryByRole("checkbox", { name: "Select all members" })).toBeNull();
  });
});
