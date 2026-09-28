// Contacts → Requests From Contacts (086): Received and Sent, each split into
// Approved / Pending / Rejected with counts; the actions each allows; the
// REQUIRED rejection reason; cancelled requests filed under Rejected; and
// deep links that focus one request.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
const switchWorkspace = vi.fn();
vi.mock("../../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_home", name: "Home" }, user: { id: "usr_me" }, switchWorkspace }),
}));

import { RequestsFromContactsPage } from "../RequestsFromContactsPage";
import {
  contactRequestGroup, countByGroup, sortRequests, legacyContactRequestRedirect, contactRequestsPath,
  type ContactRequest,
} from "../../../../../models/contact-requests";

function request(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "cr_1", workspaceId: "ws_acme", workspaceName: "Acme", kind: "preparation", status: "pending",
    title: "Prepare the lease", message: "Before Friday", documentId: "doc_lease", documentTitle: "Lease",
    dueAt: "2030-01-10T15:59:00.000Z",
    contact: { contactId: "con_me", name: "Me", email: "me@acme.test" }, delivery: "in-app",
    recipient: { userId: "usr_me", displayName: "Me" }, requestedBy: { userId: "usr_paul", displayName: "Paul Reyes" },
    responseDocumentId: null, declineReason: null,
    createdAt: "2026-09-20T00:00:00.000Z", updatedAt: "2026-09-20T00:00:00.000Z",
    completedAt: null, declinedAt: null, cancelledAt: null, ...overrides,
  };
}

const MARIA = { contactId: "con_m", name: "Maria Santos", email: "maria@acme.test" };
const sentRequest = (overrides: Record<string, unknown> = {}) => request({
  requestedBy: { userId: "usr_me", displayName: "Me" }, contact: MARIA,
  recipient: { userId: "usr_maria", displayName: "Maria" }, ...overrides,
});

type Call = { url: string; method: string; body: unknown };
let calls: Call[] = [];
let received: unknown[] = [];
let sent: unknown[] = [];
let routes: (call: Call) => { status?: number; body: unknown } | undefined = () => undefined;

beforeEach(() => {
  calls = [];
  received = [];
  sent = [];
  routes = () => undefined;
  switchWorkspace.mockReset();
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit = {}) => {
    const call: Call = {
      url, method: init.method ?? "GET",
      body: typeof init.body === "string" ? JSON.parse(init.body) as unknown : init.body instanceof FormData ? "multipart" : undefined,
    };
    calls.push(call);
    const hit = routes(call)
      ?? (url.endsWith("/me/contact-requests") ? { body: { items: received } }
        : url.endsWith("/me/contact-requests/sent") ? { body: { items: sent } }
          : { status: 404, body: { error: { code: "not_found", message: "x" } } });
    return Promise.resolve(new Response(JSON.stringify(hit.body), { status: hit.status ?? 200, headers: { "Content-Type": "application/json" } }));
  }));
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

function renderPage(entry = "/app/contacts/requests") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/app/contacts/requests" element={<><RequestsFromContactsPage /><Where /></>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId("where").textContent ?? "";
const tab = (name: RegExp) => screen.getByRole("tab", { name });
const list = () => screen.findByRole("list");

describe("grouping", () => {
  it("files completed under Approved, pending under Pending, declined and cancelled under Rejected", () => {
    expect(contactRequestGroup("completed")).toBe("approved");
    expect(contactRequestGroup("pending")).toBe("pending");
    expect(contactRequestGroup("declined")).toBe("rejected");
    expect(contactRequestGroup("cancelled")).toBe("rejected");
    const items = [
      request({ status: "completed" }), request({ status: "pending" }), request({ status: "pending" }),
      request({ status: "declined" }), request({ status: "cancelled" }),
    ] as unknown as ContactRequest[];
    expect(countByGroup(items)).toEqual({ approved: 1, pending: 2, rejected: 2 });
  });

  it("sorts pending first, then newest", () => {
    const sorted = sortRequests([
      request({ requestId: "a", status: "completed", createdAt: "2026-09-25T00:00:00.000Z" }),
      request({ requestId: "b", status: "pending", createdAt: "2026-09-01T00:00:00.000Z" }),
      request({ requestId: "c", status: "pending", createdAt: "2026-09-10T00:00:00.000Z" }),
    ] as unknown as ContactRequest[]);
    expect(sorted.map(r => r.requestId)).toEqual(["c", "b", "a"]);
  });

  it("builds links, and maps the old Documents links onto the section", () => {
    expect(contactRequestsPath({ view: "sent", group: "rejected", requestId: "cr 1" }))
      .toBe("/app/contacts/requests?view=sent&status=rejected&request=cr+1");
    expect(legacyContactRequestRedirect(new URLSearchParams("list=requests-sent")))
      .toBe("/app/contacts/requests?view=sent");
    expect(legacyContactRequestRedirect(new URLSearchParams("list=requests-sent&request=cr_2")))
      .toBe("/app/contacts/requests?view=sent&request=cr_2");
    expect(legacyContactRequestRedirect(new URLSearchParams("list=others&request=cr_3")))
      .toBe("/app/contacts/requests?view=received&request=cr_3");
    expect(legacyContactRequestRedirect(new URLSearchParams("list=others"))).toBeNull();
    expect(legacyContactRequestRedirect(new URLSearchParams(""))).toBeNull();
  });
});

describe("views and sub-sections", () => {
  beforeEach(() => {
    received = [
      request(),
      request({ requestId: "cr_2", kind: "upload", title: "Your 2026 permit", documentId: null, documentTitle: null }),
      request({ requestId: "cr_3", status: "completed", title: "Done lease", completedAt: "2026-09-21T00:00:00.000Z" }),
      request({ requestId: "cr_4", status: "declined", title: "Wrong lease", declineReason: "Not my client", declinedAt: "2026-09-22T00:00:00.000Z" }),
      request({ requestId: "cr_5", status: "declined", title: "Old decline", declineReason: null, declinedAt: "2026-09-10T00:00:00.000Z" }),
      request({ requestId: "cr_6", status: "cancelled", title: "Withdrawn one", cancelledAt: "2026-09-23T00:00:00.000Z" }),
    ];
    sent = [sentRequest({ requestId: "cs_1", title: "Prep the NDA" })];
  });

  it("shows Received and Sent, each with Approved / Pending / Rejected and counts", async () => {
    renderPage();
    const views = screen.getByRole("tablist", { name: "Request views" });
    expect(within(views).getAllByRole("tab").map(t => t.textContent?.replace(/\d.*$/, ""))).toEqual(["Received", "Sent"]);
    expect(tab(/^Received/).getAttribute("aria-selected")).toBe("true");

    const groups = screen.getByRole("tablist", { name: "Received requests by status" });
    await waitFor(() => { expect(within(groups).getByRole("tab", { name: /Approved/ }).textContent).toBe("Approved1"); });
    expect(within(groups).getAllByRole("tab").map(t => t.textContent)).toEqual(["Approved1", "Pending2", "Rejected3"]);
    // Pending opens by default.
    expect(within(groups).getByRole("tab", { name: /Pending/ }).getAttribute("aria-selected")).toBe("true");
    const pending = await screen.findByRole("list", { name: "Received, Pending" });
    expect(within(pending).getAllByRole("listitem")).toHaveLength(2);
    // The Received tab carries its pending count for a screen reader too.
    expect(tab(/^Received/).textContent).toContain("2 pending");

    await userEvent.click(tab(/^Sent/));
    expect(where()).toContain("view=sent");
    const sentGroups = screen.getByRole("tablist", { name: "Sent requests by status" });
    expect(within(sentGroups).getAllByRole("tab").map(t => t.textContent)).toEqual(["Approved0", "Pending1", "Rejected0"]);
    const sentList = await screen.findByRole("list", { name: "Sent, Pending" });
    expect(within(sentList).getByText("To Maria Santos (maria@acme.test)")).toBeTruthy();
  });

  it("shows kind, title, requester, workspace, document, due and received dates on an item", async () => {
    renderPage();
    const item = await screen.findByRole("listitem", { name: /Prepare the lease/ });
    expect(within(item).getByText("Preparation")).toBeTruthy();
    expect(within(item).getByText("Pending")).toBeTruthy();
    expect(within(item).getByRole("heading", { name: "Prepare the lease" })).toBeTruthy();
    expect(within(item).getByText("From Paul Reyes")).toBeTruthy();
    expect(within(item).getByText("Acme")).toBeTruthy();
    expect(within(item).getByText("Document: Lease")).toBeTruthy();
    expect(within(item).getByText(/Due Jan 10, 2030/)).toBeTruthy();
    expect(within(item).getByText(/Received Sep 20, 2026/)).toBeTruthy();
    expect(within(item).getByText("Before Friday")).toBeTruthy();
  });

  it("files cancelled requests under Rejected as 'Cancelled by requester', and shows reasons read-only", async () => {
    renderPage("/app/contacts/requests?view=received&status=rejected");
    const rejected = await screen.findByRole("list", { name: "Received, Rejected" });
    const withReason = within(rejected).getByRole("listitem", { name: /Wrong lease/ });
    expect(within(withReason).getByText("Rejected")).toBeTruthy();
    expect(within(withReason).getByTestId("rejection-reason").textContent).toBe("Reason: Not my client");
    const noReason = within(rejected).getByRole("listitem", { name: /Old decline/ });
    expect(within(noReason).getByTestId("rejection-reason").textContent).toBe("Reason: No reason given");
    const cancelled = within(rejected).getByRole("listitem", { name: /Withdrawn one/ });
    expect(within(cancelled).getByText("Cancelled by requester")).toBeTruthy();
    expect(within(cancelled).getByText(/Cancelled Sep 23, 2026/)).toBeTruthy();
    // Read-only.
    expect(within(rejected).queryByRole("button")).toBeNull();
  });

  it("keeps Approved read-only", async () => {
    renderPage("/app/contacts/requests?view=received&status=approved");
    const approved = await screen.findByRole("list", { name: "Received, Approved" });
    const item = within(approved).getByRole("listitem", { name: /Done lease/ });
    expect(within(item).getByText("Approved")).toBeTruthy();
    expect(within(item).getByText(/Approved Sep 21, 2026/)).toBeTruthy();
    expect(within(approved).queryByRole("button")).toBeNull();
  });

  it("moves between tabs with the arrow keys", async () => {
    renderPage();
    await list();
    tab(/^Received/).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(tab(/^Sent/).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tab(/^Sent/));
    const groups = screen.getByRole("tablist", { name: "Sent requests by status" });
    within(groups).getByRole("tab", { name: /Pending/ }).focus();
    await userEvent.keyboard("{Home}");
    expect(within(groups).getByRole("tab", { name: /Approved/ }).getAttribute("aria-selected")).toBe("true");
    await userEvent.keyboard("{ArrowLeft}");
    expect(within(groups).getByRole("tab", { name: /Rejected/ }).getAttribute("aria-selected")).toBe("true");
    expect(where()).toContain("status=rejected");
  });

  it("explains an empty sub-section", async () => {
    renderPage("/app/contacts/requests?view=sent&status=approved");
    expect(await screen.findByText("No approved requests")).toBeTruthy();
  });
});

describe("Received → Pending actions", () => {
  it("opens a preparation in its own workspace", async () => {
    received = [request()];
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /Open document/ }));
    expect(switchWorkspace).toHaveBeenCalledWith("ws_acme");
    expect(where()).toBe("/app/prepare/upload?resumeDocumentId=doc_lease");
  });

  it("marks a preparation done and moves it to Approved", async () => {
    received = [request()];
    routes = ({ url }) => (url.endsWith("/complete")
      ? { body: request({ status: "completed", completedAt: "2026-09-27T00:00:00.000Z" }) } : undefined);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /Mark as done/ }));
    expect(await screen.findByText(/It is now under Approved/)).toBeTruthy();
    expect(calls.find(call => call.url.endsWith("/complete"))?.body).toEqual({});
    const groups = screen.getByRole("tablist", { name: "Received requests by status" });
    expect(within(groups).getAllByRole("tab").map(t => t.textContent)).toEqual(["Approved1", "Pending0", "Rejected0"]);
  });

  it("still answers an existing upload request by uploading into its workspace", async () => {
    received = [request({ kind: "upload", title: "Your 2026 permit", documentId: null, documentTitle: null })];
    routes = ({ url, method }) => {
      if (url.endsWith("/upload-capacity")) return { body: { available: true } };
      if (url.endsWith("/workspaces/ws_acme/documents") && method === "POST") return { status: 201, body: { documentId: "doc_new" } };
      if (url.endsWith("/workspaces/ws_acme/documents/doc_new/upload")) return { status: 201, body: { uploadId: "up_1" } };
      if (url.endsWith("/contact-requests/cr_1/complete")) return { body: request({ kind: "upload", status: "completed", completedAt: "2026-09-27T00:00:00.000Z" }) };
      return undefined;
    };
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /Upload and complete/ }));
    await userEvent.upload(screen.getByLabelText("Choose a file to upload"), new File(["%PDF"], "permit.pdf", { type: "application/pdf" }));
    expect(await screen.findByText(/It is now under Approved/)).toBeTruthy();
    expect(calls.find(call => call.url.endsWith("/complete"))?.body).toEqual({ documentId: "doc_new" });
  });

  it("requires a reason to reject: submit stays disabled until one is typed, with a counter", async () => {
    received = [request()];
    routes = ({ url }) => (url.endsWith("/decline")
      ? { body: request({ status: "declined", declineReason: "Not my client", declinedAt: "2026-09-27T00:00:00.000Z" }) } : undefined);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject this request" });
    const field = within(dialog).getByLabelText(/Reason for rejecting/);
    expect(field.hasAttribute("required")).toBe(true);
    expect(field.getAttribute("maxlength")).toBe("500");
    expect(document.activeElement).toBe(field);
    const submit = within(dialog).getByRole("button", { name: /Reject request/ });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).getByText("0/500")).toBeTruthy();

    // Whitespace is not a reason.
    await userEvent.type(field, "   ");
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await userEvent.clear(field);
    await userEvent.type(field, "Not my client");
    expect(within(dialog).getByText("13/500")).toBeTruthy();
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    await userEvent.click(submit);

    expect(await screen.findByText(/It is now under Rejected/)).toBeTruthy();
    expect(calls.find(call => call.url.endsWith("/decline"))?.body).toEqual({ reason: "Not my client" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(tab(/^Rejected/));
    const item = await screen.findByRole("listitem", { name: /Prepare the lease/ });
    expect(within(item).getByTestId("rejection-reason").textContent).toBe("Reason: Not my client");
  });

  it("maps the server's 422 to a friendly message and keeps the dialog open", async () => {
    received = [request()];
    routes = ({ url }) => (url.endsWith("/decline")
      ? { status: 422, body: { error: { code: "validation_failed", message: "reason: String must contain at least 1 character(s)" } } } : undefined);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject this request" });
    await userEvent.type(within(dialog).getByLabelText(/Reason for rejecting/), "x");
    await userEvent.click(within(dialog).getByRole("button", { name: /Reject request/ }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert.textContent).toBe("Please give a reason for rejecting this request, between 1 and 500 characters.");
    expect(alert.textContent).not.toContain("String must contain");
  });

  it("closes the reject dialog on Escape and returns focus", async () => {
    received = [request()];
    renderPage();
    const reject = await screen.findByRole("button", { name: "Reject" });
    await userEvent.click(reject);
    await screen.findByRole("dialog", { name: "Reject this request" });
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(reject);
    expect(calls.some(call => call.url.endsWith("/decline"))).toBe(false);
  });

  it("says a request was already answered on a 409", async () => {
    received = [request()];
    routes = ({ url }) => (url.endsWith("/complete") ? { status: 409, body: { error: { code: "resource_conflict", message: "x" } } } : undefined);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /Mark as done/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/already been answered or cancelled/);
  });
});

describe("Sent → Pending actions", () => {
  it("cancels only after Continue; Cancel keeps it", async () => {
    sent = [sentRequest()];
    routes = ({ url }) => (url.endsWith("/cancel")
      ? { body: sentRequest({ status: "cancelled", cancelledAt: "2026-09-27T00:00:00.000Z" }) } : undefined);
    renderPage("/app/contacts/requests?view=sent");
    const item = await screen.findByRole("listitem", { name: /Prepare the lease/ });
    expect(within(item).getByText("In-app, no email")).toBeTruthy();
    // In-app requests are answered by the member, not marked received here.
    expect(within(item).queryByRole("button", { name: /Mark as received/ })).toBeNull();

    await userEvent.click(within(item).getByRole("button", { name: "Cancel" }));
    let dialog = await screen.findByRole("dialog", { name: "Cancel this request?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls.some(call => call.url.endsWith("/cancel"))).toBe(false);

    await userEvent.click(within(item).getByRole("button", { name: "Cancel" }));
    dialog = await screen.findByRole("dialog", { name: "Cancel this request?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/It is now under Rejected/)).toBeTruthy();
    expect(calls.find(call => call.url.endsWith("/cancel"))?.url).toBe("http://api.test/workspaces/ws_acme/contact-requests/cr_1/cancel");
    await userEvent.click(tab(/^Rejected/));
    const cancelled = await screen.findByRole("listitem", { name: /Prepare the lease/ });
    expect(within(cancelled).getByText("Cancelled by requester")).toBeTruthy();
  });

  it("marks an emailed request received with a chosen document", async () => {
    const juan = { contactId: "con_x", name: "Juan Cruz", email: "juan@vendor.test" };
    sent = [sentRequest({ kind: "upload", delivery: "email", recipient: null, contact: juan, documentId: null, documentTitle: null })];
    routes = ({ url }) => {
      if (url.includes("/workspaces/ws_acme/documents")) {
        return { body: { items: [{ documentId: "doc_permit", title: "Permit from Juan", originalFilename: null, createdByUserId: "usr_me", folderId: null, createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z", source: null }], total: 1, page: 1, perPage: 100, hasNextPage: false } };
      }
      if (url.endsWith("/complete")) return { body: sentRequest({ kind: "upload", delivery: "email", recipient: null, contact: juan, status: "completed", completedAt: "2026-09-27T00:00:00.000Z" }) };
      return undefined;
    };
    renderPage("/app/contacts/requests?view=sent");
    const item = await screen.findByRole("listitem", { name: /Prepare the lease/ });
    expect(within(item).getByText("Emailed")).toBeTruthy();
    await userEvent.click(within(item).getByRole("button", { name: /Mark as received/ }));
    const dialog = await screen.findByRole("dialog", { name: "Mark as received" });
    const picker = within(dialog).getByLabelText("Document they sent");
    await waitFor(() => { expect(within(picker).getByRole("option", { name: "Permit from Juan" })).toBeTruthy(); });
    await userEvent.selectOptions(picker, "doc_permit");
    await userEvent.click(within(dialog).getByRole("button", { name: /Mark complete/ }));
    expect(await screen.findByText(/It is now under Approved/)).toBeTruthy();
    expect(calls.find(call => call.url.endsWith("/complete"))?.body).toEqual({ documentId: "doc_permit" });
  });
});

describe("deep links", () => {
  it("focuses the linked request in its sub-section", async () => {
    received = [request(), request({ requestId: "cr_9", title: "Other one" })];
    renderPage("/app/contacts/requests?view=received&status=pending&request=cr_9");
    const card = await screen.findByRole("listitem", { name: /Other one/ });
    await waitFor(() => { expect(document.activeElement).toBe(card); });
    expect(card.getAttribute("aria-current")).toBe("true");
  });

  it("opens the sub-section a request is actually in when its status has moved on", async () => {
    received = [request({ requestId: "cr_9", title: "Answered since", status: "completed", completedAt: "2026-09-27T00:00:00.000Z" })];
    renderPage("/app/contacts/requests?view=received&status=pending&request=cr_9");
    const card = await screen.findByRole("listitem", { name: /Answered since/ });
    await waitFor(() => { expect(document.activeElement).toBe(card); });
    expect(where()).toContain("status=approved");
    expect(tab(/^Approved/).getAttribute("aria-selected")).toBe("true");
  });

  it("finds a request in the other view when an old link does not say which", async () => {
    sent = [sentRequest({ requestId: "cs_7", title: "My sent one", status: "declined", declineReason: "No", declinedAt: "2026-09-27T00:00:00.000Z" })];
    renderPage("/app/contacts/requests?view=received&request=cs_7");
    const card = await screen.findByRole("listitem", { name: /My sent one/ });
    await waitFor(() => { expect(document.activeElement).toBe(card); });
    expect(where()).toContain("view=sent");
    expect(where()).toContain("status=rejected");
  });

  it("says so when the linked request is not available", async () => {
    renderPage("/app/contacts/requests?view=received&request=cr_missing");
    expect(await screen.findByText("The request you followed is no longer available to you.")).toBeTruthy();
  });
});
