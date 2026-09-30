// Shared Documents (087): Shared By Me (Approved / Pending / Rejected Access)
// and Shared With Me (Accepted / Pending / Rejected), against a faked API.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Acme" }, user: { id: "usr_me" } }),
}));
const role = { current: "member" as string };
vi.mock("../../../../hooks/useWorkspaceAccess", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../hooks/useWorkspaceAccess")>();
  return {
    ...actual,
    useWorkspaceAccess: () => ({ role: role.current, capabilities: [], roleTitle: null, confirmed: true, can: () => true }),
  };
});

import { SharedDocumentsPage, LegacySharedRedirect } from "../SharedDocumentsPage";
import { resetWorkspaceBrandingStore } from "../../../../hooks/workspace-branding-store";
import {
  mockSharingApi, reply, pdfReply, apiError, accessRequest, sharedDoc, DOC, type Routes as ApiRoutes,
} from "../../../../components/document-sharing/__tests__/sharing-test-api";

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/app/shared-documents" element={<SharedDocumentsPage />} />
        <Route path="/app/shared-documents/:tab" element={<><SharedDocumentsPage /><Where /></>} />
        <Route path="/app/documents/shared-by-me" element={<LegacySharedRedirect to="by-me" />} />
        <Route path="/app/documents/shared-with-me" element={<LegacySharedRedirect to="with-me" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const BY_ME_ITEM = { document: DOC, acceptedShares: 2, pendingShares: 1, rejectedShares: 0, approvedRequests: 1, pendingRequests: 1 };

function byMeRoutes(over: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /workspaces/ws_1/shared-by-me?scope=mine": { items: [BY_ME_ITEM] },
    "GET /workspaces/ws_1/access-requests?status=pending": { items: [accessRequest()] },
    "GET /workspaces/ws_1/access-requests?status=rejected": { items: [accessRequest({ requestId: "req_r", status: "rejected", decidedAt: "2026-09-21T00:00:00.000Z", requester: { userId: "usr_c", displayName: "Carla Diaz", email: "carla@example.com" } })] },
    ...over,
  };
}

function withMeRoutes(over: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /me/shared-documents?status=accepted": { items: [sharedDoc()] },
    "GET /me/shared-documents?status=pending": { items: [
      sharedDoc({ id: "shd_p", status: "pending", documentTitle: "NDA", actions: ["accept", "reject"], note: "Please review." }),
      sharedDoc({ id: "req_mine", kind: "access-request", status: "pending", documentTitle: "Board Minutes", actions: [], sharedBy: null, note: "Need it for audit" }),
    ] },
    "GET /me/shared-documents?status=rejected": { items: [sharedDoc({ id: "shd_r", status: "rejected", documentTitle: "Old Quote", actions: ["withdraw-rejection", "delete"] })] },
    ...over,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  resetWorkspaceBrandingStore();
  role.current = "member";
  URL.createObjectURL = vi.fn(() => "blob:shared");
  URL.revokeObjectURL = vi.fn();
});

describe("Shared Documents page", () => {
  it("has two major tabs and sends /app/shared-documents to Shared By Me", async () => {
    mockSharingApi(byMeRoutes());
    renderAt("/app/shared-documents");
    const tabs = await screen.findByRole("tablist", { name: "Shared documents" });
    expect(within(tabs).getAllByRole("tab").map(t => t.textContent)).toEqual(["Shared By Me", "Shared With Me"]);
    expect(within(tabs).getByRole("tab", { name: "Shared By Me" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("where")).toHaveTextContent("/app/shared-documents/by-me");
  });

  it("sends the backend notice links to the right tab and section", async () => {
    mockSharingApi(withMeRoutes());
    renderAt("/app/documents/shared-with-me?section=pending");
    expect(await screen.findByTestId("where")).toHaveTextContent("/app/shared-documents/with-me?section=pending");
    expect(await screen.findByRole("tab", { name: /^Pending/ })).toHaveAttribute("aria-selected", "true");
  });

  it("moves between tabs with the arrow keys", async () => {
    mockSharingApi({ ...byMeRoutes(), ...withMeRoutes() });
    renderAt("/app/shared-documents/by-me");
    const byMe = await screen.findByRole("tab", { name: "Shared By Me" });
    byMe.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/app/shared-documents/with-me"));
    expect(screen.getByRole("tab", { name: "Shared With Me" })).toHaveFocus();
  });
});

describe("Shared By Me", () => {
  it("shows counts, and Approved Access as branded cards with a burger menu", async () => {
    mockSharingApi(byMeRoutes());
    renderAt("/app/shared-documents/by-me");
    const sub = await screen.findByRole("tablist", { name: "Shared by me" });
    await waitFor(() => expect(within(sub).getAllByRole("tab").map(t => t.textContent)).toEqual(["Approved Access1", "Pending Access1", "Rejected Access1"]));
    const card = await screen.findByTestId("completed-card");
    expect(within(card).getByRole("heading", { name: "Lease Agreement" })).toBeInTheDocument();
    expect(within(card).getByTestId("completed-card-banner-name")).toHaveTextContent("Acme");
    expect(within(card).getByTestId("shared-by-me-people")).toHaveTextContent("3 people have access · 1 waiting to accept · 1 request to review");
    await userEvent.click(within(card).getByRole("button", { name: "Show actions for Lease Agreement" }));
    expect(within(card).getAllByRole("menuitem").map(i => i.textContent)).toEqual(["View people with access", "Add more"]);
  });

  it("opens View people with access (the people list) and Add more (contacts or the form) from the menu", async () => {
    mockSharingApi(byMeRoutes({
      "GET /workspaces/ws_1/documents/doc_1/shares": { document: DOC, shares: [] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
    }));
    renderAt("/app/shared-documents/by-me");
    const card = await screen.findByTestId("completed-card");
    await userEvent.click(within(card).getByRole("button", { name: /actions for Lease Agreement/ }));
    await userEvent.click(within(card).getByRole("menuitem", { name: "View people with access" }));
    const list = screen.getByRole("dialog", { name: "People with access" });
    expect(within(list).queryByLabelText(/Email address/)).toBeNull();
    await userEvent.click(within(list).getByRole("button", { name: "Done" }));

    await userEvent.click(within(card).getByRole("button", { name: /actions for Lease Agreement/ }));
    await userEvent.click(within(card).getByRole("menuitem", { name: "Add more" }));
    const add = screen.getByRole("dialog", { name: "Share document" });
    expect(within(add).getByTestId("add-way-contacts")).toHaveAttribute("aria-selected", "true");
    await userEvent.click(within(add).getByTestId("add-way-manual"));
    expect(within(add).getByLabelText(/Email address/)).toBeInTheDocument();
  });

  it("shows an empty Approved Access state", async () => {
    mockSharingApi(byMeRoutes({ "GET /workspaces/ws_1/shared-by-me?scope=mine": { items: [] } }));
    renderAt("/app/shared-documents/by-me");
    expect(await screen.findByText("No documents shared yet")).toBeInTheDocument();
  });

  it("Pending Access shows requester, email, document and note, and approves", async () => {
    const api = mockSharingApi(byMeRoutes({
      "POST /workspaces/ws_1/access-requests/req_1/approve": accessRequest({ status: "approved" }),
    }));
    renderAt("/app/shared-documents/by-me?section=pending");
    const row = await screen.findByTestId("access-request-row");
    expect(within(row).getByText("Ben Cruz")).toBeInTheDocument();
    expect(within(row).getByText(/ben@example\.com/)).toBeInTheDocument();
    expect(within(row).getByText(/Lease Agreement/)).toBeInTheDocument();
    expect(within(row).getByText(/I am the tenant's lawyer\./)).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Approve Ben Cruz" }));
    await waitFor(() => expect(api.calls.some(c => c.method === "POST" && c.path.endsWith("/req_1/approve"))).toBe(true));
    expect(await screen.findByText(/Ben Cruz can now open/)).toBeInTheDocument();
  });

  it("rejects a pending request", async () => {
    const api = mockSharingApi(byMeRoutes({
      "POST /workspaces/ws_1/access-requests/req_1/reject": accessRequest({ status: "rejected" }),
    }));
    renderAt("/app/shared-documents/by-me?section=pending");
    await userEvent.click(await screen.findByRole("button", { name: "Reject Ben Cruz" }));
    await waitFor(() => expect(api.calls.some(c => c.path.endsWith("/req_1/reject"))).toBe(true));
  });

  it("maps a conflict to a friendly message", async () => {
    mockSharingApi(byMeRoutes({ "POST /workspaces/ws_1/access-requests/req_1/approve": apiError(409, "sharing_state_conflict") }));
    renderAt("/app/shared-documents/by-me?section=pending");
    await userEvent.click(await screen.findByRole("button", { name: "Approve Ben Cruz" }));
    expect(await screen.findByText(/changed in the meantime/)).toBeInTheDocument();
  });

  it("Rejected Access withdraws a rejection, and deletes only after Continue", async () => {
    const api = mockSharingApi(byMeRoutes({
      "POST /workspaces/ws_1/access-requests/req_r/withdraw-rejection": accessRequest({ requestId: "req_r", status: "pending" }),
      "DELETE /workspaces/ws_1/access-requests/req_r": reply(204),
    }));
    renderAt("/app/shared-documents/by-me?section=rejected");
    const row = await screen.findByTestId("access-request-row");
    expect(within(row).getByText("Rejected")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Withdraw rejection for Carla Diaz" }));
    await waitFor(() => expect(api.calls.some(c => c.path.endsWith("/req_r/withdraw-rejection"))).toBe(true));

    await userEvent.click(within(await screen.findByTestId("access-request-row")).getByRole("button", { name: "Delete request from Carla Diaz" }));
    const confirm = screen.getByRole("dialog", { name: "Delete this request?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(api.calls.some(c => c.method === "DELETE")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Delete request from Carla Diaz" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Delete this request?" })).getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(api.calls.some(c => c.method === "DELETE" && c.path.endsWith("/access-requests/req_r"))).toBe(true));
  });

  it("offers owners and administrators Mine / Whole workspace", async () => {
    role.current = "administrator";
    const api = mockSharingApi(byMeRoutes({
      "GET /workspaces/ws_1/shared-by-me?scope=workspace": { items: [{ ...BY_ME_ITEM, document: { ...DOC, documentId: "doc_9", documentTitle: "Colleague Deal", owner: { userId: "usr_x", displayName: "Xavier" } } }] },
    }));
    renderAt("/app/shared-documents/by-me");
    const group = await screen.findByRole("group", { name: "Whose documents" });
    expect(within(group).getByRole("button", { name: "Mine" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(group).getByRole("button", { name: "Whole workspace" }));
    expect(await screen.findByRole("heading", { name: "Colleague Deal" })).toBeInTheDocument();
    expect(screen.getByText("Owner: Xavier")).toBeInTheDocument();
    expect(api.calls.some(c => c.path === "/workspaces/ws_1/shared-by-me?scope=workspace")).toBe(true);
  });

  it("does not offer the scope toggle to other members", async () => {
    mockSharingApi(byMeRoutes());
    renderAt("/app/shared-documents/by-me");
    await screen.findByTestId("completed-card");
    expect(screen.queryByRole("group", { name: "Whose documents" })).toBeNull();
  });

  it("reports a load failure with a retry", async () => {
    mockSharingApi(byMeRoutes({ "GET /workspaces/ws_1/shared-by-me?scope=mine": apiError(500, "internal") }));
    renderAt("/app/shared-documents/by-me");
    expect(await screen.findByText(/Couldn't load shared documents/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("Shared With Me", () => {
  it("shows counts and Accepted cards in the OWNER's branding with its logo", async () => {
    mockSharingApi(withMeRoutes());
    renderAt("/app/shared-documents/with-me");
    const sub = await screen.findByRole("tablist", { name: "Shared with me" });
    await waitFor(() => expect(within(sub).getAllByRole("tab").map(t => t.textContent)).toEqual(["Accepted1", "Pending2", "Rejected1"]));
    const card = await screen.findByTestId("completed-card");
    expect(within(card).getByTestId("completed-card-banner-name")).toHaveTextContent("Globex Legal");
    expect(within(card).getByTestId("completed-card-banner-band")).toHaveStyle({ background: "#7C2D12" });
    expect(within(card).getByAltText("Globex Legal logo")).toHaveAttribute("src", "http://api.test/me/shared-documents/shd_1/branding/logo?v=v3");
    expect(within(card).getByTestId("completed-card-progress")).toHaveTextContent("3 of 3 signed");
    await userEvent.click(within(card).getByRole("button", { name: "Show actions for Supply Contract" }));
    expect(within(card).getAllByRole("menuitem").map(i => i.textContent)).toEqual([
      "View / Download signed document", "View participants", "View audit trail", "Remove your access",
    ]);
  });

  it("opens the signed document inline with Download", async () => {
    mockSharingApi(withMeRoutes({ "GET /me/shared-documents/shd_1/document": pdfReply(new Blob(["%PDF-1.7"], { type: "application/pdf" })) }));
    renderAt("/app/shared-documents/with-me");
    const card = await screen.findByTestId("completed-card");
    await userEvent.click(within(card).getByRole("button", { name: /actions for Supply Contract/ }));
    await userEvent.click(within(card).getByRole("menuitem", { name: "View / Download signed document" }));
    const dialog = screen.getByRole("dialog", { name: "Signed document" });
    expect(await within(dialog).findByTitle("Signed document: Supply Contract")).toHaveAttribute("src", "blob:shared");
    expect(within(dialog).getByRole("button", { name: "Download signed document" })).toBeEnabled();
  });

  it("shows participants and the audit trail from the details endpoint", async () => {
    mockSharingApi(withMeRoutes({
      "GET /me/shared-documents/shd_1/details": { details: {
        documentTitle: "Supply Contract", completedAt: 1_770_000_000_000, sealedDigest: "abc123",
        participants: [{ name: "Maria Santos", maskedEmail: "m***@example.com", recipientType: "signer", status: "signed", actedAt: 1_770_000_000_000, routingOrder: 1 }],
        events: [{ type: "completed", label: "Document completed", at: 1_770_000_000_000 }],
      } },
    }));
    renderAt("/app/shared-documents/with-me");
    const card = await screen.findByTestId("completed-card");
    await userEvent.click(within(card).getByRole("button", { name: /actions for Supply Contract/ }));
    await userEvent.click(within(card).getByRole("menuitem", { name: "View participants" }));
    const people = screen.getByRole("dialog", { name: "Participants" });
    expect(await within(people).findByText("Maria Santos")).toBeInTheDocument();
    expect(within(people).getByText("Signed")).toBeInTheDocument();
    await userEvent.click(within(people).getByRole("button", { name: "Done" }));

    await userEvent.click(within(card).getByRole("button", { name: /actions for Supply Contract/ }));
    await userEvent.click(within(card).getByRole("menuitem", { name: "View audit trail" }));
    const audit = screen.getByRole("dialog", { name: "Audit trail" });
    expect(await within(audit).findByText("Document completed")).toBeInTheDocument();
    expect(within(audit).getByText("abc123")).toBeInTheDocument();
  });

  it("removes my access only after Continue", async () => {
    const api = mockSharingApi(withMeRoutes({ "POST /me/shared-documents/shd_1/remove-access": reply(204) }));
    renderAt("/app/shared-documents/with-me");
    const card = await screen.findByTestId("completed-card");
    await userEvent.click(within(card).getByRole("button", { name: /actions for Supply Contract/ }));
    await userEvent.click(within(card).getByRole("menuitem", { name: "Remove your access" }));
    const confirm = screen.getByRole("dialog", { name: "Remove your access?" });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(confirm).getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(api.calls.some(c => c.method === "POST" && c.path.endsWith("/shd_1/remove-access"))).toBe(true));
    expect(await screen.findByText(/You no longer have access to “Supply Contract”/)).toBeInTheDocument();
  });

  it("Pending accepts and rejects a share; my own request shows as waiting, without buttons", async () => {
    const api = mockSharingApi(withMeRoutes({
      "POST /me/shared-documents/shd_p/accept": sharedDoc({ id: "shd_p", status: "accepted" }),
      "POST /me/shared-documents/shd_p/reject": sharedDoc({ id: "shd_p", status: "rejected" }),
    }));
    renderAt("/app/shared-documents/with-me?section=pending");
    const rows = await screen.findAllByTestId("shared-with-me-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText(/Please review\./)).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Waiting for the owner's approval")).toBeInTheDocument();
    expect(within(rows[1]!).queryByRole("button")).toBeNull();
    await userEvent.click(within(rows[0]!).getByRole("button", { name: "Accept NDA" }));
    await waitFor(() => expect(api.calls.some(c => c.path.endsWith("/shd_p/accept"))).toBe(true));
    await userEvent.click(within((await screen.findAllByTestId("shared-with-me-row"))[0]!).getByRole("button", { name: "Reject NDA" }));
    await waitFor(() => expect(api.calls.some(c => c.path.endsWith("/shd_p/reject"))).toBe(true));
  });

  it("Rejected withdraws a rejection and deletes after Continue", async () => {
    const api = mockSharingApi(withMeRoutes({
      "POST /me/shared-documents/shd_r/withdraw-rejection": sharedDoc({ id: "shd_r", status: "pending" }),
      "DELETE /me/shared-documents/shd_r": reply(204),
    }));
    renderAt("/app/shared-documents/with-me?section=rejected");
    const row = await screen.findByTestId("shared-with-me-row");
    await userEvent.click(within(row).getByRole("button", { name: "Withdraw rejection for Old Quote" }));
    await waitFor(() => expect(api.calls.some(c => c.path.endsWith("/shd_r/withdraw-rejection"))).toBe(true));
    await userEvent.click(within(await screen.findByTestId("shared-with-me-row")).getByRole("button", { name: "Delete Old Quote" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Delete this document?" })).getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(api.calls.some(c => c.method === "DELETE" && c.path === "/me/shared-documents/shd_r")).toBe(true));
  });

  it("shows empty states", async () => {
    mockSharingApi(withMeRoutes({
      "GET /me/shared-documents?status=accepted": { items: [] },
      "GET /me/shared-documents?status=pending": { items: [] },
    }));
    renderAt("/app/shared-documents/with-me");
    expect(await screen.findByText("Nothing shared with you yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /^Pending/ }));
    expect(await screen.findByText("Nothing waiting for you")).toBeInTheDocument();
  });
});
