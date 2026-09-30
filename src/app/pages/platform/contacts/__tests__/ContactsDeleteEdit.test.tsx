// Contacts (092 and after): permanent delete from Archived only, behind a
// Cancel / Continue confirmation; the two Edit modes (read-only identity for
// someone with a LAGDA account, everything for an external contact); a
// member's access shown read-only on the Workspace card; and a contact's
// Document role pre-selecting the participant role in Prepare.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    currentWorkspace: { id: "ws_1", name: "Acme Holdings" },
    workspaces: [{ id: "ws_1", name: "Acme Holdings" }],
    user: { id: "usr_me", email: "me@acme.test" },
  }),
}));
const capabilities = new Set(["contact.create", "contact.view", "contact.archive", "membership.view", "membership.role.change", "invitation.view"]);
vi.mock("../../../../hooks/useWorkspaceAccess", () => ({
  useWorkspaceAccess: () => ({ confirmed: true, can: (c: string) => capabilities.has(c), capabilities: [...capabilities], role: "owner", roleTitle: null }),
}));

import { ArchivedContactsPage } from "../ContactsPage";
import { ContactDetailPage } from "../ContactDetailPage";
import { EditContactPage } from "../EditContactPage";
import { roleFromContactTags } from "../../prepare/ParticipantsStep";
import { brandGradient } from "../contacts-ui";

const base = {
  phone: null, organization: "Lim Law", title: "Counsel", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
  scope: "personal", ownerUserId: "usr_me", note: null, tagIds: [] as string[], workspaceMember: null, account: null,
};
const ARCHIVED = { ...base, contactId: "con_old", name: "Old Client", email: "old@client.test", state: "archived", archivedAt: "2026-09-20T00:00:00.000Z" };
const LINKED = {
  ...base, contactId: "con_ben", name: "Ben Lim", email: "ben@lim.test", state: "active", archivedAt: null,
  tagIds: ["tag-client"], workspaceMember: { userId: "usr_ben", displayName: "Ben Lim" },
  account: { userId: "usr_ben", displayName: "Ben Lim", jobTitle: "Counsel", avatarVersion: null, connected: true, brandColor: "#0B5E3C" },
};
const EXTERNAL = { ...base, contactId: "con_x", name: "Juan Cruz", email: "juan@vendor.test", state: "active", archivedAt: null };

interface Call { method: string; url: string; body: unknown }
let calls: Call[] = [];
let routes: (c: Call) => { status?: number; body?: unknown } | undefined;

beforeEach(() => {
  calls = [];
  routes = () => undefined;
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const call: Call = { method: init?.method ?? "GET", url: url.replace("http://api.test", ""), body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const a = routes(call);
    const status = a?.status ?? (a === undefined ? 404 : 200);
    return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(a?.body ?? { error: { code: "resource_not_found", message: "x" } }), {
      status, headers: { "Content-Type": "application/json" },
    }));
  }));
});

describe("permanent delete", () => {
  it("is offered only on an archived contact, and asks before it deletes", async () => {
    let archived = [ARCHIVED];
    routes = c => {
      if (c.method === "GET" && c.url.startsWith("/workspaces/ws_1/contacts?")) return { body: { items: archived, total: archived.length, page: 1, perPage: 20, hasNextPage: false } };
      if (c.method === "DELETE" && c.url === "/workspaces/ws_1/contacts/con_old") { archived = []; return { status: 204 }; }
      if (c.url === "/me/contact-connections") return { body: { received: [], sent: [] } };
      return undefined;
    };
    render(<MemoryRouter><ArchivedContactsPage /></MemoryRouter>);
    await userEvent.click(await screen.findByRole("button", { name: "Actions for Old Client" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete permanently" }));

    const dialog = screen.getByRole("dialog", { name: /Delete this contact permanently/ });
    expect(dialog).toHaveTextContent("This can't be undone");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(calls.some(c => c.method === "DELETE")).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Actions for Old Client" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete permanently" }));
    await userEvent.click(screen.getByTestId("confirm-delete-contact"));
    await waitFor(() => { expect(calls.some(c => c.method === "DELETE" && c.url === "/workspaces/ws_1/contacts/con_old")).toBe(true); });
    expect(await screen.findByText(/No archived contacts/)).toBeInTheDocument();
  });

  it("is on an archived contact's profile, and not on an active one's", async () => {
    routes = c => {
      if (c.url === "/workspaces/ws_1/contacts/con_old") return { body: ARCHIVED };
      if (c.url === "/workspaces/ws_1/contacts/con_x") return { body: EXTERNAL };
      if (c.url.includes("/requests")) return { body: { items: [] } };
      return undefined;
    };
    const { unmount } = render(<MemoryRouter initialEntries={["/app/contacts/con_old"]}><Routes><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByTestId("delete-contact")).toHaveTextContent("Delete permanently");
    unmount();
    render(<MemoryRouter initialEntries={["/app/contacts/con_x"]}><Routes><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes></MemoryRouter>);
    await screen.findByRole("heading", { level: 1, name: "Juan Cruz" });
    expect(screen.queryByTestId("delete-contact")).toBeNull();
  });
});

describe("editing", () => {
  function renderEdit(id: string) {
    render(<MemoryRouter initialEntries={[`/app/contacts/${id}/edit`]}><Routes>
      <Route path="/app/contacts/:contactId/edit" element={<EditContactPage />} />
      <Route path="/app/contacts/:contactId" element={<p>profile</p>} />
    </Routes></MemoryRouter>);
  }

  it("keeps a LAGDA account's identity read-only and edits only roles, category, phone, note and sharing", async () => {
    routes = c => {
      if (c.method === "GET" && c.url === "/workspaces/ws_1/contacts/con_ben") return { body: LINKED };
      if (c.method === "PUT" && c.url === "/workspaces/ws_1/contacts/con_ben") return { body: { contact: LINKED, duplicates: [] } };
      return undefined;
    };
    renderEdit("con_ben");
    expect(await screen.findByRole("heading", { level: 1, name: "Edit roles & notes" })).toBeInTheDocument();
    expect(screen.getByTestId("linked-identity")).toHaveTextContent("ben@lim.test");
    expect(screen.queryByText("Full Name")).toBeNull();
    expect(screen.queryByText("Email Address")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Signer/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => { expect(calls.some(c => c.method === "PUT")).toBe(true); });
    const body = calls.find(c => c.method === "PUT")?.body as { tagIds: string[]; email: string };
    expect(body.tagIds.sort()).toEqual(["tag-client", "tag-signer"]);
    expect(body.email).toBe("ben@lim.test");
  });

  it("keeps every field editable for an external contact", async () => {
    routes = c => c.url === "/workspaces/ws_1/contacts/con_x" ? { body: EXTERNAL } : undefined;
    renderEdit("con_x");
    expect(await screen.findByRole("heading", { level: 1, name: "Edit contact" })).toBeInTheDocument();
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("Email Address")).toBeInTheDocument();
  });
});

describe("a member's access, shown not edited", () => {
  it("shows role and privileges read-only, with Manage access for administrators", async () => {
    routes = c => {
      if (c.url === "/workspaces/ws_1/contacts/con_ben") return { body: LINKED };
      if (c.url.includes("/requests")) return { body: { items: [] } };
      if (c.url === "/workspaces/ws_1/members") {
        return { body: { members: [{ membershipId: "m_ben", userId: "usr_ben", email: "ben@lim.test", displayName: "Ben Lim", role: "sender",
          joinedAt: Date.now(), isCurrentUser: false, roleTitle: "Paralegal", canRequestDocuments: true, canAssignSigners: false }] } };
      }
      return undefined;
    };
    render(<MemoryRouter initialEntries={["/app/contacts/con_ben"]}><Routes><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes></MemoryRouter>);
    const access = await screen.findByTestId("member-access");
    expect(access).toHaveTextContent("✓ Request documents");
    expect(access).toHaveTextContent("— Assign signers");
    expect(within(access).getByRole("link", { name: /Manage access/ })).toHaveAttribute("href", "/app/workspace/members/m_ben");
    expect(screen.getByTestId("contact-workspace-card")).toHaveTextContent("Paralegal");
    // The profile banner wears the brand colour of Ben's workspace.
    expect(screen.getByTestId("contact-profile-band").style.backgroundImage).toBe(brandGradient("#0B5E3C"));
    expect(brandGradient("#0B5E3C")).not.toBe(brandGradient(null));
  });
});

describe("Prepare", () => {
  it("turns a contact's Document role into the participant role", () => {
    expect(roleFromContactTags(["tag-client", "tag-approver"])).toBe("approver");
    expect(roleFromContactTags(["tag-signer", "tag-reviewer"])).toBe("signer");
    expect(roleFromContactTags(["tag-ack"])).toBe("acknowledgment-recipient");
    expect(roleFromContactTags(["tag-client"])).toBeNull();
    expect(roleFromContactTags(undefined)).toBeNull();
  });
});
