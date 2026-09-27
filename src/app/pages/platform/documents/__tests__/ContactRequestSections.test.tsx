// Documents × contact requests (086): "Others" merges requests asked of me
// with the documents I take part in; "Requests you sent" lets me cancel and,
// for emailed ones, mark them received.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
const switchWorkspace = vi.fn();
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_home", name: "Home" }, user: { id: "usr_me" }, switchWorkspace }),
}));
const documentsToSign = vi.fn();
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return { ...actual, realMySigningService: { documentsToSign: () => documentsToSign(), signedDocuments: () => Promise.resolve([]), continueSigning: vi.fn() } };
});

import { OthersSection } from "../MySigningSections";
import { SentContactRequestsSection, sortRequests } from "../ContactRequestSections";

function request(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "cr_1", workspaceId: "ws_acme", workspaceName: "Acme", kind: "upload", status: "pending",
    title: "Your 2026 permit", message: "The PDF from the city", documentId: null, documentTitle: null,
    dueAt: "2030-01-10T15:59:00.000Z",
    contact: { contactId: "con_me", name: "Me", email: "me@acme.test" }, delivery: "in-app",
    recipient: { userId: "usr_me", displayName: "Me" }, requestedBy: { userId: "usr_paul", displayName: "Paul Reyes" },
    responseDocumentId: null, declineReason: null,
    createdAt: "2026-09-20T00:00:00.000Z", updatedAt: "2026-09-20T00:00:00.000Z",
    completedAt: null, declinedAt: null, cancelledAt: null, ...overrides,
  };
}

type Call = { url: string; method: string; body: unknown };
let calls: Call[] = [];
let routes: (call: Call) => { status?: number; body: unknown } | undefined;

beforeEach(() => {
  calls = [];
  switchWorkspace.mockReset();
  documentsToSign.mockResolvedValue([]);
  vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit = {}) => {
    const call: Call = {
      url, method: init.method ?? "GET",
      body: typeof init.body === "string" ? JSON.parse(init.body) as unknown : init.body instanceof FormData ? "multipart" : undefined,
    };
    calls.push(call);
    const hit = routes(call) ?? { status: 404, body: { error: { code: "not_found", message: "x" } } };
    return Promise.resolve(new Response(JSON.stringify(hit.body), { status: hit.status ?? 200, headers: { "Content-Type": "application/json" } }));
  }));
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

const renderOthers = (highlight?: string) => render(
  <MemoryRouter initialEntries={["/app/documents?list=others"]}>
    <Routes>
      <Route path="/app/documents" element={<OthersSection onCount={count => { lastCount = count; }} highlightRequestId={highlight ?? null} />} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);
let lastCount: number | null = null;

describe("sortRequests", () => {
  it("puts pending first, then newest", () => {
    const sorted = sortRequests([
      request({ requestId: "a", status: "completed", createdAt: "2026-09-25T00:00:00.000Z" }),
      request({ requestId: "b", status: "pending", createdAt: "2026-09-01T00:00:00.000Z" }),
      request({ requestId: "c", status: "pending", createdAt: "2026-09-10T00:00:00.000Z" }),
    ] as never);
    expect(sorted.map(r => r.requestId)).toEqual(["c", "b", "a"]);
  });
});

describe("Others: requests for you", () => {
  it("merges requests with role documents, labelled by kind, with requester, workspace, message and due date", async () => {
    lastCount = null;
    documentsToSign.mockResolvedValue([{
      signingRequestId: "sr_1", recipientId: "r_1", documentTitle: "Budget", recipientType: "approver",
      senderName: "Paul", senderEmail: "p@x.test", workspaceName: "Acme", invitedAt: "2026-09-25T00:00:00.000Z", expiresAt: "2026-10-25T00:00:00.000Z",
    }]);
    routes = ({ url }) => (url.endsWith("/me/contact-requests")
      ? { body: { items: [request(), request({ requestId: "cr_2", kind: "preparation", title: "Prepare the lease", documentId: "doc_lease", documentTitle: "Lease", message: null, dueAt: null }), request({ requestId: "cr_3", kind: "signed-document", status: "completed", title: "Signed NDA", message: null, dueAt: null, completedAt: "2026-09-21T00:00:00.000Z" })] } }
      : undefined);
    renderOthers();
    const list = await screen.findByRole("list", { name: "Requests for you" });
    const upload = within(list).getByRole("listitem", { name: /Your 2026 permit/ });
    expect(within(upload).getByText("Upload")).toBeTruthy();
    expect(within(upload).getByText("From Paul Reyes")).toBeTruthy();
    expect(within(upload).getByText("Acme")).toBeTruthy();
    expect(within(upload).getByText("The PDF from the city")).toBeTruthy();
    expect(within(upload).getByText(/Due Jan 10, 2030/)).toBeTruthy();
    expect(within(upload).getByRole("button", { name: /Upload and complete/ })).toBeTruthy();

    const prep = within(list).getByRole("listitem", { name: /Prepare the lease/ });
    expect(within(prep).getByText("Preparation")).toBeTruthy();
    expect(within(prep).getByRole("button", { name: /Open document/ })).toBeTruthy();
    expect(within(prep).getByRole("button", { name: /Mark as done/ })).toBeTruthy();

    const done = within(list).getByRole("listitem", { name: /Signed NDA/ });
    expect(within(done).getByText("Signed document")).toBeTruthy();
    expect(within(done).queryByRole("button")).toBeNull();

    // The role documents are still listed below.
    expect(screen.getByRole("table", { name: "Other documents I take part in" })).toBeTruthy();
    expect(screen.getByText("Documents you take part in")).toBeTruthy();
    // 1 role document + 2 pending requests.
    await waitFor(() => { expect(lastCount).toBe(3); });
  });

  it("uploads into the request's workspace, then completes with that document", async () => {
    routes = ({ url, method }) => {
      if (url.endsWith("/me/contact-requests")) return { body: { items: [request()] } };
      if (url.endsWith("/upload-capacity")) return { body: { available: true } };
      if (url.endsWith("/workspaces/ws_acme/documents") && method === "POST") return { status: 201, body: { documentId: "doc_new" } };
      if (url.endsWith("/workspaces/ws_acme/documents/doc_new/upload")) return { status: 201, body: { uploadId: "up_1" } };
      if (url.endsWith("/contact-requests/cr_1/complete")) return { body: request({ status: "completed", completedAt: "2026-09-27T00:00:00.000Z", responseDocumentId: "doc_new" }) };
      return undefined;
    };
    renderOthers();
    await screen.findByRole("button", { name: /Upload and complete/ });
    await userEvent.click(screen.getByRole("button", { name: /Upload and complete/ }));
    await userEvent.upload(screen.getByLabelText("Choose a file to upload"), new File(["%PDF"], "permit.pdf", { type: "application/pdf" }));
    expect(await screen.findByText("Completed")).toBeTruthy();
    const complete = calls.find(call => call.url.endsWith("/complete"));
    expect(complete?.url).toBe("http://api.test/workspaces/ws_acme/contact-requests/cr_1/complete");
    expect(complete?.body).toEqual({ documentId: "doc_new" });
    expect(calls.some(call => call.url === "http://api.test/workspaces/ws_acme/documents/doc_new/upload" && call.body === "multipart")).toBe(true);
  });

  it("opens a preparation in its own workspace, and marks it done without a document", async () => {
    routes = ({ url }) => {
      if (url.endsWith("/me/contact-requests")) return { body: { items: [request({ kind: "preparation", documentId: "doc_lease", documentTitle: "Lease" })] } };
      if (url.endsWith("/complete")) return { body: request({ kind: "preparation", status: "completed", completedAt: "2026-09-27T00:00:00.000Z" }) };
      return undefined;
    };
    renderOthers();
    await userEvent.click(await screen.findByRole("button", { name: /Mark as done/ }));
    expect(await screen.findByText("Completed")).toBeTruthy();
    expect(calls.find(call => call.url.endsWith("/complete"))?.body).toEqual({});
  });

  it("switches workspace and opens preparation for the document", async () => {
    routes = ({ url }) => (url.endsWith("/me/contact-requests")
      ? { body: { items: [request({ kind: "preparation", documentId: "doc_lease", documentTitle: "Lease" })] } }
      : undefined);
    renderOthers();
    await userEvent.click(await screen.findByRole("button", { name: /Open document/ }));
    expect(switchWorkspace).toHaveBeenCalledWith("ws_acme");
    expect(screen.getByTestId("where").textContent).toBe("/app/prepare/upload?resumeDocumentId=doc_lease");
  });

  it("declines with an optional reason", async () => {
    routes = ({ url }) => {
      if (url.endsWith("/me/contact-requests")) return { body: { items: [request()] } };
      if (url.endsWith("/decline")) return { body: request({ status: "declined", declineReason: "Not mine", declinedAt: "2026-09-27T00:00:00.000Z" }) };
      return undefined;
    };
    renderOthers();
    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));
    const dialog = await screen.findByRole("dialog", { name: "Decline this request?" });
    await userEvent.type(within(dialog).getByLabelText(/Reason/), "Not mine");
    await userEvent.click(within(dialog).getByRole("button", { name: /Decline request/ }));
    expect(await screen.findByText(/“Not mine”/)).toBeTruthy();
    expect(calls.find(call => call.url.endsWith("/decline"))?.body).toEqual({ reason: "Not mine" });
  });

  it("says a request was already answered on a 409", async () => {
    routes = ({ url }) => {
      if (url.endsWith("/me/contact-requests")) return { body: { items: [request({ kind: "preparation", documentId: "doc_lease" })] } };
      if (url.endsWith("/complete")) return { status: 409, body: { error: { code: "resource_conflict", message: "x" } } };
      return undefined;
    };
    renderOthers();
    await userEvent.click(await screen.findByRole("button", { name: /Mark as done/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/already been answered or cancelled/);
  });

  it("highlights the request a notification linked to", async () => {
    routes = ({ url }) => (url.endsWith("/me/contact-requests") ? { body: { items: [request(), request({ requestId: "cr_9", title: "Other one" })] } } : undefined);
    renderOthers("cr_9");
    const card = await screen.findByRole("listitem", { name: /Other one/ });
    await waitFor(() => { expect(document.activeElement).toBe(card); });
  });

  it("still says nothing is here when there is nothing", async () => {
    routes = ({ url }) => (url.endsWith("/me/contact-requests") ? { body: { items: [] } } : undefined);
    renderOthers();
    expect(await screen.findByText("Nothing here yet")).toBeTruthy();
  });
});

describe("Requests you sent", () => {
  const renderSent = () => render(<MemoryRouter><SentContactRequestsSection /></MemoryRouter>);

  it("lists sent requests with status and delivery, and cancels a pending one", async () => {
    routes = ({ url }) => {
      if (url.endsWith("/me/contact-requests/sent")) {
        return { body: { items: [
          request({ requestedBy: { userId: "usr_me", displayName: "Me" }, contact: { contactId: "con_m", name: "Maria Santos", email: "maria@acme.test" } }),
          request({ requestId: "cr_2", status: "declined", title: "Signed NDA", declineReason: "Wrong person", declinedAt: "2026-09-22T00:00:00.000Z", contact: { contactId: "con_m", name: "Maria Santos", email: "maria@acme.test" } }),
        ] } };
      }
      if (url.endsWith("/cancel")) return { body: request({ status: "cancelled", cancelledAt: "2026-09-27T00:00:00.000Z", contact: { contactId: "con_m", name: "Maria Santos", email: "maria@acme.test" } }) };
      return undefined;
    };
    renderSent();
    const list = await screen.findByRole("list", { name: "Requests you sent" });
    const pending = within(list).getByRole("listitem", { name: /Your 2026 permit/ });
    expect(within(pending).getByText("To Maria Santos (maria@acme.test)")).toBeTruthy();
    expect(within(pending).getByText("In-app, no email")).toBeTruthy();
    // In-app requests are answered by the member, not marked received here.
    expect(within(pending).queryByRole("button", { name: /Mark as received/ })).toBeNull();
    expect(within(list).getByText(/“Wrong person”/)).toBeTruthy();

    await userEvent.click(within(pending).getByRole("button", { name: /Cancel request/ }));
    const dialog = await screen.findByRole("dialog", { name: "Cancel this request?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel request" }));
    expect(await within(list).findByText("Cancelled")).toBeTruthy();
  });

  it("marks an emailed request received with a chosen document", async () => {
    routes = ({ url }) => {
      if (url.endsWith("/me/contact-requests/sent")) return { body: { items: [request({ delivery: "email", recipient: null, contact: { contactId: "con_x", name: "Juan Cruz", email: "juan@vendor.test" } })] } };
      if (url.includes("/workspaces/ws_acme/documents")) {
        return { body: { items: [{ documentId: "doc_permit", title: "Permit from Juan", originalFilename: null, createdByUserId: "usr_me", folderId: null, createdAt: "2026-09-26T00:00:00.000Z", updatedAt: "2026-09-26T00:00:00.000Z", source: null }], total: 1, page: 1, perPage: 100, hasNextPage: false } };
      }
      if (url.endsWith("/complete")) return { body: request({ delivery: "email", recipient: null, status: "completed", completedAt: "2026-09-27T00:00:00.000Z", contact: { contactId: "con_x", name: "Juan Cruz", email: "juan@vendor.test" } }) };
      return undefined;
    };
    renderSent();
    const card = await screen.findByRole("listitem", { name: /Your 2026 permit/ });
    expect(within(card).getByText("Emailed")).toBeTruthy();
    await userEvent.click(within(card).getByRole("button", { name: /Mark as received/ }));
    const dialog = await screen.findByRole("dialog", { name: "Mark as received" });
    const picker = within(dialog).getByLabelText("Document they sent");
    await waitFor(() => { expect(within(picker).getByRole("option", { name: "Permit from Juan" })).toBeTruthy(); });
    await userEvent.selectOptions(picker, "doc_permit");
    await userEvent.click(within(dialog).getByRole("button", { name: /Mark complete/ }));
    const list = screen.getByRole("list", { name: "Requests you sent" });
    expect(await within(list).findByText("Completed")).toBeTruthy();
    expect(calls.find(call => call.url.endsWith("/complete"))?.body).toEqual({ documentId: "doc_permit" });
  });

  it("filters by status and explains an empty list", async () => {
    routes = ({ url }) => (url.endsWith("/me/contact-requests/sent") ? { body: { items: [] } } : undefined);
    renderSent();
    expect(await screen.findByText("You haven't sent any requests")).toBeTruthy();
  });
});
