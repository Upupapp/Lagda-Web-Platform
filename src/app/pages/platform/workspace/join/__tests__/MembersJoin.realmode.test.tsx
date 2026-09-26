// Members and Join requests pages with a real backend (078): join requests
// (approve sends the typed title and chosen privileges) on their own page,
// the Members page's summary card, "New Comer" labelling, Edit access, and
// the owner/administrator gate.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 15_000 });

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const platform = { role: "owner" as string | null, currentWorkspace: { id: "ws_1", name: "Mabini" } };
vi.mock("../../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { MembersPage } from "../../MembersPage";
import { JoinRequestsPage } from "../../JoinRequestsPage";
import { memberRoleLabel, type WorkspaceRoleId } from "../../../../../models/workspace-admin";

const role = (id: string) => id as WorkspaceRoleId;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const NOW = Date.UTC(2026, 8, 1);
const MEMBERS = [
  { membershipId: "m_owner", userId: "u1", email: "paul@example.com", displayName: "Paul Reyes", role: "owner", joinedAt: NOW, isCurrentUser: true, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_new", userId: "u2", email: "maria@example.com", displayName: "Maria Santos", role: "member", joinedAt: NOW, isCurrentUser: false, roleTitle: null, canRequestDocuments: false, canAssignSigners: false },
  { membershipId: "m_fa", userId: "u3", email: "jose@example.com", displayName: "Jose Cruz", role: "member", joinedAt: NOW, isCurrentUser: false, roleTitle: "Finance Associate", canRequestDocuments: true, canAssignSigners: false },
];
const REQUESTS = [
  { requestId: "jr_1", sourceKind: "ticket", ticketLabel: "Front desk", fullName: "Liza Tan", email: "liza@example.com", reason: "Client intake", requestedRole: "member", state: "pending", createdAt: NOW, decidedAt: null },
  { requestId: "jr_2", sourceKind: "invitation", ticketLabel: null, fullName: "Ramon Diaz", email: "ramon@example.com", reason: null, requestedRole: "member", state: "pending", createdAt: NOW, decidedAt: null },
  { requestId: "jr_3", sourceKind: "ticket", ticketLabel: "Old", fullName: "Ana Lim", email: "ana@example.com", reason: null, requestedRole: "member", state: "declined", createdAt: NOW, decidedAt: NOW },
];

const calls: { method: string; path: string; body: unknown }[] = [];

beforeEach(() => {
  calls.length = 0;
  platform.role = "owner";
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace("http://api.test", "").replace(/\?.*$/, "");
    const body: unknown = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, path, body });
    if (method === "GET" && path === "/workspaces/ws_1/members") return Promise.resolve(json(200, { members: MEMBERS }));
    if (method === "GET" && path === "/workspaces/ws_1/join-requests") return Promise.resolve(json(200, { requests: REQUESTS }));
    if (method === "GET" && path === "/workspaces/ws_1/join-tickets") return Promise.resolve(json(200, { tickets: [] }));
    if (method === "POST" && path === "/workspaces/ws_1/join-requests/jr_1/approve") return Promise.resolve(json(200, { memberId: "m_liza" }));
    if (method === "POST" && path === "/workspaces/ws_1/join-requests/jr_2/decline") return Promise.resolve(json(200, { declined: true }));
    if (method === "PATCH" && path === "/workspaces/ws_1/members/m_new/access") return Promise.resolve(json(200, { updated: true }));
    return Promise.resolve(json(404, { error: { code: "not_found", message: `${method} ${path}` } }));
  }));
});

function renderPage() {
  return render(<MemoryRouter initialEntries={["/app/workspace/members"]}><MembersPage /></MemoryRouter>);
}

function renderRequests() {
  return render(<MemoryRouter initialEntries={["/app/workspace/join-requests"]}><JoinRequestsPage /></MemoryRouter>);
}

describe("memberRoleLabel", () => {
  it("calls a plain member with no title a New Comer", () => {
    expect(memberRoleLabel({ roleId: role("member"), roleName: "Member", roleTitle: null })).toBe("New Comer");
    expect(memberRoleLabel({ roleId: role("role_member"), roleName: "Member" })).toBe("New Comer");
    expect(memberRoleLabel({ roleId: role("member"), roleName: "Member", roleTitle: "  Finance Associate " })).toBe("Finance Associate");
    expect(memberRoleLabel({ roleId: role("sender"), roleName: "Sender", roleTitle: null })).toBe("Sender");
  });
});

describe("Members page — join requests and access", () => {
  it("labels members and shows privilege chips", async () => {
    renderPage();
    expect(await screen.findByTestId("member-role-m_new")).toHaveTextContent("New Comer");
    expect(screen.getByTestId("member-role-m_fa")).toHaveTextContent("Finance Associate");
    const faRow = screen.getByTestId("member-access-m_fa");
    expect(faRow).toHaveTextContent("Requests documents");
    expect(faRow).not.toHaveTextContent("Assigns signers");
    // Owners hold both privileges and are never edited here.
    expect(screen.getByTestId("member-access-m_owner")).toHaveTextContent("Assigns signers");
    expect(screen.queryByRole("button", { name: "Edit access for Paul Reyes" })).toBeNull();
    expect(screen.getByRole("button", { name: "Edit access for Maria Santos" })).toBeInTheDocument();
  });

  it("summarises waiting requests on the Members page and links to their pages", async () => {
    renderPage();
    expect(await screen.findByTestId("pending-requests-badge")).toHaveTextContent("2 pending requests");
    const summary = screen.getByTestId("join-summary");
    expect(summary).toHaveTextContent("2 people are waiting for approval.");
    expect(within(summary).getByRole("link", { name: /Review join requests/ })).toHaveAttribute("href", "/app/workspace/join-requests");
    expect(within(summary).getByRole("link", { name: /Join links/ })).toHaveAttribute("href", "/app/workspace/join-links");
    // The full lists live on their own pages now.
    expect(screen.queryByTestId("join-requests-section")).toBeNull();
    expect(screen.queryByTestId("join-links-section")).toBeNull();
  });

  it("lists pending requests first with source, and a waiting badge", async () => {
    renderRequests();
    const liza = await screen.findByTestId("join-request-jr_1");
    expect(liza).toHaveTextContent("liza@example.com");
    expect(liza).toHaveTextContent("Client intake");
    expect(liza).toHaveTextContent("Join link: Front desk");
    expect(screen.getByTestId("join-request-jr_2")).toHaveTextContent("Email invitation");
    expect(screen.queryByTestId("join-request-jr_3")).toBeNull(); // history collapsed
    expect(await screen.findByTestId("pending-requests-badge")).toHaveTextContent("2 waiting");
  });

  it("approve sends the typed role title and the chosen privileges", async () => {
    const user = userEvent.setup();
    renderRequests();
    await user.click(await screen.findByRole("button", { name: "Approve Liza Tan" }));
    const dialog = screen.getByRole("dialog", { name: "Approve Liza Tan" });
    expect(dialog).toHaveTextContent('Without a role title, they appear as "New Comer"');
    const title = within(dialog).getByLabelText(/Role title/);
    expect(title).toHaveAttribute("placeholder", "New Comer");
    expect(title.tagName).toBe("INPUT");
    await user.type(title, "Finance Associate");
    await user.click(within(dialog).getByLabelText("Privileges"));
    await user.click(within(dialog).getByLabelText("Request documents from others"));
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));

    const approve = calls.find((c) => c.path === "/workspaces/ws_1/join-requests/jr_1/approve");
    expect(approve?.method).toBe("POST");
    expect(approve?.body).toEqual({ roleTitle: "Finance Associate", canRequestDocuments: true, canAssignSigners: false });
    expect(await screen.findByTestId("pending-requests-badge")).toHaveTextContent("1 waiting");
  });

  it("approve with no title sends roleTitle null", async () => {
    const user = userEvent.setup();
    renderRequests();
    await user.click(await screen.findByRole("button", { name: "Approve Liza Tan" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve" }));
    expect(calls.find((c) => c.path.endsWith("/jr_1/approve"))?.body).toEqual({
      roleTitle: null, canRequestDocuments: false, canAssignSigners: false,
    });
  });

  it("decline asks for confirmation", async () => {
    const user = userEvent.setup();
    renderRequests();
    await user.click(await screen.findByRole("button", { name: "Decline Ramon Diaz" }));
    expect(calls.some((c) => c.path.endsWith("/decline"))).toBe(false);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Decline request" }));
    expect(calls.find((c) => c.path.endsWith("/jr_2/decline"))?.body).toEqual({});
  });

  it("Edit access patches the member's title and privileges", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Edit access for Maria Santos" }));
    const dialog = screen.getByRole("dialog", { name: "Edit access — Maria Santos" });
    await user.type(within(dialog).getByLabelText(/Role title/), "Paralegal");
    await user.click(within(dialog).getByLabelText("Privileges"));
    await user.click(within(dialog).getByLabelText("Assign someone for document signing"));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(calls.find((c) => c.method === "PATCH")).toEqual({
      method: "PATCH", path: "/workspaces/ws_1/members/m_new/access",
      body: { roleTitle: "Paralegal", canRequestDocuments: false, canAssignSigners: true },
    });
  });

  it("hides join links, requests and Edit access from non-administrators", async () => {
    platform.role = "sender";
    renderPage();
    await screen.findByTestId("member-role-m_new");
    expect(screen.queryByTestId("join-summary")).toBeNull();
    expect(screen.queryByRole("button", { name: /Edit access/ })).toBeNull();
    expect(calls.some((c) => c.path.includes("join-"))).toBe(false);
  });

  it("the Join requests page says so to non-administrators and asks nothing", async () => {
    platform.role = "sender";
    renderRequests();
    expect(await screen.findByText(/Only the workspace's owner and administrators can review join requests/)).toBeInTheDocument();
    expect(screen.queryByTestId("join-requests-section")).toBeNull();
    expect(calls.some((c) => c.path.includes("join-"))).toBe(false);
  });

  it("hides suspend-era filters and bulk selection with a real backend", async () => {
    renderPage();
    await screen.findByTestId("member-role-m_new");
    expect(screen.queryByLabelText("Filter by status")).toBeNull();
    expect(screen.queryByLabelText("Select all members")).toBeNull();
    const roleFilter = screen.getByLabelText("Filter by role");
    expect(within(roleFilter).getByRole("option", { name: "New Comer" })).toHaveValue("member");
    expect(within(roleFilter).queryByRole("option", { name: "Billing Admin" })).toBeNull();
  });
});
