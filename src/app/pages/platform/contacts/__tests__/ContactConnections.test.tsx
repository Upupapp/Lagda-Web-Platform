// Contacts × connections (091), against a mocked backend: Find people (found,
// not found, already a contact, send and cancel), Pending (accept into a
// chosen workspace, decline quietly, cancel a sent request), the live account
// behind a contact (its own name and photo), the contact's Workspace card,
// and the discovery switch.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({
    currentWorkspace: { id: "ws_1", name: "Acme Holdings" },
    workspaces: [{ id: "ws_1", name: "Acme Holdings" }, { id: "ws_2", name: "Side Firm" }],
    user: { id: "usr_me", email: "me@acme.test" },
  }),
}));
const capabilities = new Set(["contact.create", "contact.view", "invitation.view", "invitation.create", "unit.member.manage", "upload-request.create"]);
vi.mock("../../../../hooks/useWorkspaceAccess", () => ({
  useWorkspaceAccess: () => ({ confirmed: true, can: (c: string) => capabilities.has(c), capabilities: [...capabilities], role: "owner", roleTitle: null }),
}));

import { FindPeoplePage } from "../FindPeoplePage";
import { PendingContactsPage } from "../PendingContactsPage";
import { ContactDetailPage } from "../ContactDetailPage";
import { DataPrivacyPage } from "../../settings/DataPrivacyPage";
import { getContact } from "../../../../services/contacts-source";

const BEN = { userId: "usr_ben", displayName: "Ben Lim", jobTitle: "Counsel", organization: "Lim Law", avatarVersion: "v1" };

interface Call { method: string; url: string; body: unknown }
let calls: Call[] = [];
let routes: (call: Call) => { status?: number; body?: unknown } | undefined;

beforeEach(() => {
  calls = [];
  routes = () => undefined;
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    const call: Call = { method: init?.method ?? "GET", url: url.replace("http://api.test", ""), body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const answer = routes(call);
    const status = answer?.status ?? (answer === undefined ? 404 : 200);
    return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(answer?.body ?? { error: { code: "resource_not_found", message: "Not found." } }), {
      status, headers: { "Content-Type": "application/json" },
    }));
  }));
});

const lists = (received: unknown[] = [], sent: unknown[] = []) => ({ received, sent });

describe("Find people", () => {
  function renderFind() {
    render(<MemoryRouter initialEntries={["/app/contacts/new"]}><Routes><Route path="/app/contacts/new" element={<FindPeoplePage />} /></Routes></MemoryRouter>);
  }

  it("shows the one person an exact email finds, and sends then cancels a request", async () => {
    routes = c => {
      if (c.url.endsWith("/contact-connections/lookup")) return { body: { person: { ...BEN, relationship: "none", connectionId: null }, existingContactId: null } };
      if (c.method === "POST" && c.url === "/workspaces/ws_1/contact-connections") {
        return { status: 201, body: { connectionId: "cc_1", person: BEN, workspaceName: "Acme Holdings", status: "pending", createdAt: "2026-09-30T00:00:00.000Z" } };
      }
      if (c.url === "/me/contact-connections/cc_1/cancel") return { status: 204 };
      return undefined;
    };
    renderFind();
    await userEvent.type(screen.getByTestId("find-email"), "ben@lim.test");
    await userEvent.click(screen.getByTestId("find-button"));

    const person = await screen.findByTestId("find-person");
    expect(person).toHaveTextContent("Ben Lim");
    expect(person).toHaveTextContent("Counsel · Lim Law");
    expect(within(person).getByRole("img", { name: "Ben Lim's profile photo" })).toHaveAttribute("src", "http://api.test/me/people/usr_ben/avatar?v=v1");
    expect(calls.find(c => c.url.endsWith("/lookup"))?.body).toEqual({ email: "ben@lim.test" });

    await userEvent.click(screen.getByTestId("send-request"));
    expect(await screen.findByTestId("request-sent")).toHaveTextContent("Requested");
    await userEvent.click(screen.getByRole("button", { name: /Cancel request/ }));
    expect(await screen.findByTestId("send-request")).toBeInTheDocument();
  });

  it("offers an external contact, prefilled, when no account is found", async () => {
    routes = c => c.url.endsWith("/lookup") ? { body: { person: null, existingContactId: null } } : undefined;
    renderFind();
    await userEvent.type(screen.getByTestId("find-email"), "client@outside.test");
    await userEvent.click(screen.getByTestId("find-button"));
    expect(await screen.findByTestId("find-none")).toHaveTextContent("No LAGDA account found for client@outside.test");
    expect(screen.getByTestId("add-external")).toHaveAttribute("href", "/app/contacts/new/external?email=client%40outside.test");
  });

  it("says when the address is already a contact, and refuses a half-typed email without calling the server", async () => {
    routes = c => c.url.endsWith("/lookup") ? { body: { person: { ...BEN, relationship: "none", connectionId: null }, existingContactId: "con_ben" } } : undefined;
    renderFind();
    await userEvent.type(screen.getByTestId("find-email"), "ben@");
    await userEvent.click(screen.getByTestId("find-button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a complete email address");
    expect(calls).toHaveLength(0);

    await userEvent.type(screen.getByTestId("find-email"), "lim.test");
    await userEvent.click(screen.getByTestId("find-button"));
    const existing = await screen.findByTestId("find-existing");
    expect(within(existing).getByRole("link", { name: "View contact" })).toHaveAttribute("href", "/app/contacts/con_ben");
  });
});

describe("Pending", () => {
  const request = { connectionId: "cc_9", person: BEN, workspaceName: "Lim Law", status: "pending", createdAt: "2026-09-29T00:00:00.000Z" };

  it("accepts into the chosen workspace and offers the next steps", async () => {
    routes = c => {
      if (c.url === "/me/contact-connections" && c.method === "GET") return { body: lists([request]) };
      if (c.url === "/me/contact-connections/cc_9/accept") return { body: { contactId: "con_new", workspaceId: "ws_1" } };
      return undefined;
    };
    render(<MemoryRouter><PendingContactsPage /></MemoryRouter>);
    const card = await screen.findByTestId("received-cc_9");
    expect(card).toHaveTextContent("From Lim Law");
    expect(screen.getByTestId("contacts-tab-pending")).toHaveAccessibleName("Pending, 1 waiting");
    await userEvent.click(within(card).getByRole("button", { name: "Accept Ben Lim's request" }));
    const banner = await screen.findByTestId("accepted-banner");
    expect(banner).toHaveTextContent("You and Ben Lim are now contacts.");
    expect(within(banner).getByRole("link", { name: /Invite to workspace/ })).toHaveAttribute("href", "/app/contacts/con_new#workspace");
    expect(calls.find(c => c.url.endsWith("/accept"))?.body).toEqual({ workspaceId: "ws_1" });
  });

  it("can accept into another workspace, decline quietly, and cancel what you sent", async () => {
    routes = c => {
      if (c.url === "/me/contact-connections" && c.method === "GET") return { body: lists([request], [{ ...request, connectionId: "cc_sent" }]) };
      if (c.url.endsWith("/decline") || c.url.endsWith("/cancel")) return { status: 204 };
      return undefined;
    };
    render(<MemoryRouter><PendingContactsPage /></MemoryRouter>);
    const card = await screen.findByTestId("received-cc_9");
    await userEvent.selectOptions(within(card).getByLabelText("Add to"), "ws_2");
    await userEvent.click(within(card).getByRole("button", { name: "Decline Ben Lim's request" }));
    expect(await screen.findByText(/Declined\. Ben Lim isn't told\./)).toBeInTheDocument();
    await userEvent.click(within(screen.getByTestId("sent-cc_sent")).getByRole("button", { name: /Cancel your request/ }));
    await waitFor(() => { expect(calls.some(c => c.url === "/me/contact-connections/cc_sent/cancel")).toBe(true); });
  });
});

describe("the account behind a contact", () => {
  const contact = {
    contactId: "con_ben", name: "Benjamin (old)", email: "ben@lim.test", phone: null, organization: "Lim Law", title: "Associate",
    state: "active", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", archivedAt: null,
    scope: "personal", ownerUserId: "usr_me", note: null, tagIds: [], workspaceMember: null,
    account: { userId: "usr_ben", displayName: "Ben Lim", jobTitle: "Counsel", avatarVersion: "abc", connected: true },
  };

  it("uses the account's own name, title and photo as they are now", async () => {
    routes = c => c.url === "/workspaces/ws_1/contacts/con_ben" ? { body: contact } : undefined;
    const read = await getContact("ws_1", "con_ben" as never);
    expect(read).toMatchObject({
      name: "Ben Lim", title: "Counsel",
      avatarUrl: "http://api.test/workspaces/ws_1/contacts/con_ben/avatar?v=abc",
      account: { userId: "usr_ben", connected: true },
    });
  });

  it("shows the profile with its photo, and invites a contact who is not in the workspace", async () => {
    routes = c => {
      if (c.url === "/workspaces/ws_1/contacts/con_ben") return { body: contact };
      if (c.url.startsWith("/workspaces/ws_1/contacts/con_ben/requests")) return { body: { items: [] } };
      if (c.url === "/workspaces/ws_1/invitations" && c.method === "GET") return { body: { invitations: [] } };
      if (c.url === "/workspaces/ws_1/invitations" && c.method === "POST") {
        return { status: 201, body: { invitationId: "inv_1", email: "ben@lim.test", role: "member", state: "pending", createdAt: Date.now(), expiresAt: Date.now() + 86_400_000 } };
      }
      return undefined;
    };
    render(<MemoryRouter initialEntries={["/app/contacts/con_ben"]}><Routes><Route path="/app/contacts/:contactId" element={<ContactDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { level: 1, name: "Ben Lim" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ben Lim's profile photo" })).toHaveAttribute("src", "http://api.test/workspaces/ws_1/contacts/con_ben/avatar?v=abc");
    expect(screen.getByText("On LAGDA")).toBeInTheDocument();

    const card = await screen.findByTestId("contact-workspace-card");
    await waitFor(() => { expect(card).toHaveAttribute("data-status", "outside"); });
    await userEvent.click(within(card).getByTestId("invite-contact"));
    await userEvent.click(screen.getByTestId("confirm-invite-contact"));
    await waitFor(() => { expect(calls.some(c => c.method === "POST" && c.url === "/workspaces/ws_1/invitations")).toBe(true); });
    expect(calls.find(c => c.method === "POST" && c.url === "/workspaces/ws_1/invitations")?.body).toEqual({ email: "ben@lim.test", role: "member" });
  });
});

describe("being found", () => {
  it("reads and saves the discovery switch", async () => {
    let discoverable = true;
    routes = c => {
      if (c.url !== "/me/contact-discovery") return undefined;
      if (c.method === "PUT") discoverable = (c.body as { discoverableByEmail: boolean }).discoverableByEmail;
      return { body: { discoverableByEmail: discoverable } };
    };
    render(<MemoryRouter><DataPrivacyPage /></MemoryRouter>);
    const toggle = await screen.findByRole("switch", { name: "Let people find me by email" });
    await waitFor(() => { expect(toggle).toBeEnabled(); });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await userEvent.click(toggle);
    await waitFor(() => { expect(toggle).toHaveAttribute("aria-checked", "false"); });
    expect(discoverable).toBe(false);
  });
});
