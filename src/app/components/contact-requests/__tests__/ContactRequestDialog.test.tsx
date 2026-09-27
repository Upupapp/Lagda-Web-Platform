import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import { ContactRequestDialog, dueDateToIso, DELIVERY_COPY } from "../ContactRequestDialog";
import {
  ContactRequestButtons, ContactRequestHistory, MembershipBadge, requestAvailability,
} from "../ContactRequestControls";

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

const DOCS = {
  items: [
    { documentId: "doc_lease", title: "Lease Agreement", originalFilename: "Lease.pdf", createdByUserId: "u", folderId: null, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", source: null },
  ],
  total: 1, page: 1, perPage: 100, hasNextPage: false,
};

const MEMBER = { id: "con_m", name: "Maria Santos", email: "maria@acme.test", workspaceMember: { userId: "usr_maria", displayName: "Maria" } };
const EXTERNAL = { id: "con_x", name: "Juan Cruz", email: "juan@vendor.test", workspaceMember: null };

function request(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "cr_1", workspaceId: "ws_1", workspaceName: "Acme", kind: "upload", status: "pending",
    title: "Your permit", message: null, documentId: null, documentTitle: null, dueAt: null,
    contact: { contactId: "con_m", name: "Maria Santos", email: "maria@acme.test" },
    delivery: "in-app", recipient: { userId: "usr_maria", displayName: "Maria" },
    requestedBy: { userId: "usr_me", displayName: "Paul" }, responseDocumentId: null, declineReason: null,
    createdAt: "2026-09-20T00:00:00.000Z", updatedAt: "2026-09-20T00:00:00.000Z",
    completedAt: null, declinedAt: null, cancelledAt: null, ...overrides,
  };
}

let posted: unknown[] = [];
beforeEach(() => {
  posted = [];
});

describe("ContactRequestDialog", () => {
  it("explains in-app delivery for a member and omits the picker for an upload", () => {
    mockApi(() => undefined);
    render(<ContactRequestDialog workspaceId="ws_1" kind="upload" contact={MEMBER} onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "Assign for document upload" });
    expect(within(dialog).getByText(DELIVERY_COPY.member, { exact: false })).toBeTruthy();
    expect(within(dialog).queryByLabelText(/Document/)).toBeNull();
    expect(within(dialog).getByLabelText(/Title/)).toBe(document.activeElement);
  });

  it("explains email delivery for an external contact and offers an optional picker for a signed document", async () => {
    mockApi(url => (url.includes("/documents") ? { body: DOCS } : undefined));
    render(<ContactRequestDialog workspaceId="ws_1" kind="signed-document" contact={EXTERNAL} onClose={() => undefined} />);
    const dialog = screen.getByRole("dialog", { name: "Request a signed document" });
    expect(within(dialog).getByText(DELIVERY_COPY.external, { exact: false })).toBeTruthy();
    const picker = within(dialog).getByLabelText(/Document/);
    await waitFor(() => { expect(within(picker).getByRole("option", { name: "Lease Agreement" })).toBeTruthy(); });
    expect(within(picker).getByRole("option", { name: "No specific document" })).toBeTruthy();
  });

  it("requires a title, and a document for preparation, before sending", async () => {
    const fetchMock = mockApi(url => (url.includes("/documents") ? { body: DOCS } : undefined));
    render(<ContactRequestDialog workspaceId="ws_1" kind="preparation" contact={MEMBER} onClose={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /Send request/ }));
    expect(screen.getByText("Enter what you're asking for.")).toBeTruthy();
    expect(screen.getByText("Choose the document to prepare.")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/contact-requests"))).toBe(false);
  });

  it("sends the request and confirms how it was delivered", async () => {
    const onCreated = vi.fn();
    mockApi((url, init) => {
      if (url.includes("/documents")) return { body: DOCS };
      if (url.endsWith("/contact-requests") && init.method === "POST") {
        posted.push(JSON.parse(init.body as string) as unknown);
        return { status: 201, body: request({ kind: "preparation", documentId: "doc_lease", documentTitle: "Lease Agreement" }) };
      }
      return undefined;
    });
    render(<ContactRequestDialog workspaceId="ws_1" kind="preparation" contact={MEMBER} onClose={() => undefined} onCreated={onCreated} />);
    await userEvent.type(screen.getByLabelText(/Title/), "Prepare the lease");
    const picker = screen.getByLabelText(/Document/);
    await waitFor(() => { expect(within(picker).getByRole("option", { name: "Lease Agreement" })).toBeTruthy(); });
    await userEvent.selectOptions(picker, "doc_lease");
    await userEvent.type(screen.getByLabelText(/Message/), "Before Friday");
    await userEvent.click(screen.getByRole("button", { name: /Send request/ }));
    expect(await screen.findByRole("dialog", { name: "Request sent" })).toBeTruthy();
    expect(screen.getByText(/No email was sent/)).toBeTruthy();
    expect(posted).toEqual([{ kind: "preparation", contactId: "con_m", title: "Prepare the lease", message: "Before Friday", documentId: "doc_lease" }]);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("maps a members-only refusal to a friendly sentence", async () => {
    mockApi((url, init) => {
      if (url.includes("/documents")) return { body: DOCS };
      if (init.method === "POST") return { status: 422, body: { error: { code: "contact_request_members_only", message: "raw" } } };
      return undefined;
    });
    render(<ContactRequestDialog workspaceId="ws_1" kind="signed-document" contact={EXTERNAL} onClose={() => undefined} />);
    await userEvent.type(screen.getByLabelText(/Title/), "Signed NDA");
    await userEvent.click(screen.getByRole("button", { name: /Send request/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Invite them to the workspace first/);
  });

  it("closes on Escape", async () => {
    mockApi(() => undefined);
    const onClose = vi.fn();
    render(<ContactRequestDialog workspaceId="ws_1" kind="upload" contact={MEMBER} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("turns a date into the end of that local day", () => {
    const iso = dueDateToIso("2030-03-04");
    expect(iso).not.toBeNull();
    const date = new Date(iso!);
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()]).toEqual([2030, 2, 4, 23, 59]);
    expect(dueDateToIso("nope")).toBeNull();
  });
});

describe("membership and availability", () => {
  it("badges members and externals, and says nothing when unknown", () => {
    const { rerender, container } = render(<MembershipBadge member={{ userId: "u", displayName: "Maria" }} />);
    expect(screen.getByText("Workspace member")).toBeTruthy();
    rerender(<MembershipBadge member={null} />);
    expect(screen.getByText("External")).toBeTruthy();
    rerender(<MembershipBadge member={undefined} />);
    expect(container.textContent).toBe("");
  });

  it("keeps preparation for members only, and refuses self and archived contacts", () => {
    expect(requestAvailability({ status: "active", workspaceMember: null }, "preparation", "me").enabled).toBe(false);
    expect(requestAvailability({ status: "active", workspaceMember: null }, "upload", "me").enabled).toBe(true);
    expect(requestAvailability({ status: "active", workspaceMember: { userId: "me", displayName: "Me" } }, "upload", "me").reason).toBe("This contact is you.");
    expect(requestAvailability({ status: "archived", workspaceMember: null }, "upload", "me").enabled).toBe(false);
  });

  it("disables preparation for an external contact with a visible reason", async () => {
    const onChoose = vi.fn();
    render(<ContactRequestButtons contact={{ id: "con_x", status: "active", workspaceMember: null }} currentUserId="me" onChoose={onChoose} />);
    const prep = screen.getByRole("button", { name: /Assign for document preparation/ });
    expect(prep.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(/Only workspace members can be assigned to prepare a document/)).toBeTruthy();
    await userEvent.click(prep);
    expect(onChoose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Request a signed document/ }));
    expect(onChoose).toHaveBeenCalledWith("signed-document");
  });
});

describe("ContactRequestHistory", () => {
  it("lists what was asked of the contact with its status", async () => {
    mockApi(url => (url.endsWith("/contacts/con_m/requests")
      ? { body: { items: [request({ status: "declined", declineReason: "Not mine" }), request({ requestId: "cr_2", title: "Signed NDA", kind: "signed-document", status: "completed" })] } }
      : undefined));
    render(<ContactRequestHistory workspaceId="ws_1" contactId="con_m" />);
    const list = await screen.findByRole("list", { name: "Requests sent to this contact" });
    expect(within(list).getByText("Your permit")).toBeTruthy();
    expect(within(list).getByText("Declined")).toBeTruthy();
    expect(within(list).getByText("Reason: Not mine")).toBeTruthy();
    expect(within(list).getByText("Completed")).toBeTruthy();
  });

  it("says so when there is nothing yet", async () => {
    mockApi(() => ({ body: { items: [] } }));
    render(<ContactRequestHistory workspaceId="ws_1" contactId="con_m" />);
    expect(await screen.findByText("No requests have been sent to this contact yet.")).toBeTruthy();
  });
});
