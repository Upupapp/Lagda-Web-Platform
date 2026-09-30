// Share a completed document, and manage who it is shared with (087).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

import { ShareDocumentDialog } from "../ShareDocumentDialog";
import { mockSharingApi, apiError, reply, share, accessRequest, DOC } from "./sharing-test-api";

const SHARES = "/workspaces/ws_1/documents/doc_1/shares";
const target = { documentId: "doc_1", title: "Lease Agreement" };

/** "add" opens on "From your contacts"; these tests use the manual form. */
async function renderDialog(mode: "add" | "list" = "add") {
  const onChanged = vi.fn();
  const onClose = vi.fn();
  render(<ShareDocumentDialog workspaceId="ws_1" target={target} mode={mode} onClose={onClose} onChanged={onChanged} />);
  if (mode === "add") await userEvent.click(screen.getByTestId("add-way-manual"));
  return { onChanged, onClose };
}

beforeEach(() => { vi.unstubAllGlobals(); });

describe("ShareDocumentDialog", () => {
  it("shares with an email and optional name, says nothing is emailed, and lists the new person", async () => {
    const api = mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
      [`POST ${SHARES}`]: reply(201, share({ shareId: "shr_new", email: "new@example.com", fullName: "New Person", status: "pending", recipient: null })),
    });
    const { onChanged } = await renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Share document" });
    expect(within(dialog).getByText(/No email is sent\. They'll find it in Shared Documents → Shared With Me once they have a LAGDA account\./)).toBeInTheDocument();
    expect(await within(dialog).findByText(/Not shared with anyone yet/)).toBeInTheDocument();

    // Email is required.
    await userEvent.click(within(dialog).getByRole("button", { name: "Share" }));
    expect(within(dialog).getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(api.calls.some(c => c.method === "POST")).toBe(false);

    await userEvent.type(within(dialog).getByLabelText(/Email address/), "new@example.com");
    await userEvent.type(within(dialog).getByLabelText(/Full name/), "New Person");
    await userEvent.click(within(dialog).getByRole("button", { name: "Share" }));

    await waitFor(() => expect(api.calls.find(c => c.method === "POST")?.body).toEqual({ email: "new@example.com", fullName: "New Person" }));
    const people = await within(dialog).findByTestId("share-people");
    expect(within(people).getByText("New Person")).toBeInTheDocument();
    expect(within(people).getByText("Waiting to accept")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it("omits an empty full name from the request", async () => {
    const api = mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
      [`POST ${SHARES}`]: reply(201, share({ status: "pending" })),
    });
    await renderDialog();
    await userEvent.type(screen.getByLabelText(/Email address/), "ana@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(api.calls.find(c => c.method === "POST")?.body).toEqual({ email: "ana@example.com" }));
  });

  it.each([
    ["document_share_exists", /already shared with that email address/],
    ["document_share_recipient_has_access", /already has access to this document/],
    ["account_email_unverified", /Confirm your account's email address first/],
    ["document_not_completed", /Only a completed document/],
  ])("explains %s", async (code, text) => {
    mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
      [`POST ${SHARES}`]: apiError(code === "account_email_unverified" ? 403 : 409, code),
    });
    await renderDialog();
    await userEvent.type(screen.getByLabelText(/Email address/), "ana@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it("lists shares and approved requests; edits a name only", async () => {
    const api = mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [share(), share({ shareId: "shr_gone", status: "removed", fullName: "Gone" })] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [accessRequest({ status: "approved", decidedAt: "2026-09-21T00:00:00.000Z" }), accessRequest({ requestId: "req_other", document: { ...DOC, documentId: "doc_2" }, requester: { userId: "u", displayName: "Other Doc", email: "o@x.com" } })] },
      [`PATCH ${SHARES}/shr_1`]: { share: share({ fullName: "Ana Reyes-Santos" }), previous: null },
    });
    await renderDialog("list");
    const dialog = screen.getByRole("dialog", { name: "People with access" });
    const people = await within(dialog).findByTestId("share-people");
    expect(within(people).getAllByTestId("share-person")).toHaveLength(2);
    expect(within(people).queryByText("Gone")).toBeNull();
    expect(within(people).queryByText("Other Doc")).toBeNull();
    expect(within(people).getByText("Approved request")).toBeInTheDocument();
    expect(within(people).getByText("Has access")).toBeInTheDocument();
    // The ways to add someone are behind "Add more" in this mode.
    expect(within(dialog).queryByLabelText(/Email address/)).toBeNull();

    await userEvent.click(within(people).getByRole("button", { name: "Edit Ana Reyes" }));
    const edit = screen.getByRole("dialog", { name: "Edit shared person" });
    expect(within(edit).getByText(/hands access to a different person/)).toBeInTheDocument();
    const name = within(edit).getByLabelText(/Full name/);
    await userEvent.clear(name);
    await userEvent.type(name, "Ana Reyes-Santos");
    await userEvent.click(within(edit).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.calls.find(c => c.method === "PATCH")?.body).toEqual({ fullName: "Ana Reyes-Santos" }));
    expect(await screen.findByText("Ana Reyes-Santos")).toBeInTheDocument();
  });

  it("changing the email starts a new pending share and says the new person must accept", async () => {
    const api = mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [share()] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
      [`PATCH ${SHARES}/shr_1`]: {
        share: share({ shareId: "shr_2", email: "ana.new@example.com", status: "pending", recipient: null, replacesShareId: "shr_1" }),
        previous: share({ status: "removed", removedBy: "email-changed" }),
      },
    });
    await renderDialog("list");
    await userEvent.click(await screen.findByRole("button", { name: "Edit Ana Reyes" }));
    const email = screen.getByLabelText(/Email address/);
    await userEvent.clear(email);
    await userEvent.type(email, "ana.new@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.calls.find(c => c.method === "PATCH")?.body).toEqual({ email: "ana.new@example.com" }));
    expect(await screen.findByText(/ana\.new@example\.com must now accept the share/)).toBeInTheDocument();
    const people = screen.getByTestId("share-people");
    expect(within(people).getAllByTestId("share-person")).toHaveLength(1);
    expect(within(people).getByText("Waiting to accept")).toBeInTheDocument();
  });

  it("asks before removing: Cancel keeps the person, Continue removes them", async () => {
    const api = mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [share()] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
      [`DELETE ${SHARES}/shr_1`]: share({ status: "removed", removedBy: "owner" }),
    });
    await renderDialog("list");
    await userEvent.click(await screen.findByRole("button", { name: "Remove Ana Reyes" }));
    let confirm = screen.getByRole("dialog", { name: "Remove access?" });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(api.calls.some(c => c.method === "DELETE")).toBe(false);
    expect(await screen.findByText("Ana Reyes")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove Ana Reyes" }));
    confirm = screen.getByRole("dialog", { name: "Remove access?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(api.calls.some(c => c.method === "DELETE" && c.path === `${SHARES}/shr_1`)).toBe(true));
    expect(await screen.findByText("Ana Reyes no longer has access.")).toBeInTheDocument();
  });

  it("removes an approved request through /remove", async () => {
    const api = mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [accessRequest({ status: "approved" })] },
      "POST /workspaces/ws_1/access-requests/req_1/remove": accessRequest({ status: "removed" }),
    });
    await renderDialog("list");
    await userEvent.click(await screen.findByRole("button", { name: "Remove Ben Cruz" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(api.calls.some(c => c.method === "POST" && c.path.endsWith("/req_1/remove"))).toBe(true));
  });

  it("closes on Escape", async () => {
    mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
    });
    const { onClose } = await renderDialog();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("lists the participants, read-only, below the people with access", async () => {
    mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [share({})], participants: [
        { name: "Maria Santos", email: "maria@example.com", organization: "Acme", role: "SIGNER" },
        { name: "Jose Cruz", email: "jose@example.com", organization: null, role: "APPROVER" },
      ] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
    });
    await renderDialog("list");
    const list = await screen.findByTestId("share-participants");
    expect(within(list).getAllByRole("listitem").map(li => li.textContent)).toEqual([
      expect.stringContaining("Maria Santos"), expect.stringContaining("Jose Cruz"),
    ]);
    expect(within(list).getByText("Signer")).toBeInTheDocument();
    expect(within(list).getByText("Approver")).toBeInTheDocument();
    expect(within(list).queryByRole("button")).toBeNull();
  });

  it("adds a contact who has no access yet in one click, leaving out anyone who already has it", async () => {
    const contact = (id: string, name: string, email: string) => ({
      contactId: id, name, email, phone: null, organization: null, title: null, state: "active",
      createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", archivedAt: null,
      scope: "personal", ownerUserId: "usr_me", note: null, tagIds: [], workspaceMember: null, account: null,
    });
    const api = mockSharingApi({
      [`GET ${SHARES}`]: { document: DOC, shares: [share({ email: "shared@example.com" })], participants: [
        { name: "Maria Santos", email: "maria@example.com", organization: null, role: "SIGNER" },
      ] },
      "GET /workspaces/ws_1/access-requests?status=approved": { items: [] },
      "GET /workspaces/ws_1/contacts": { items: [
        contact("con_1", "Maria Santos", "Maria@Example.com"),
        contact("con_2", "Already Shared", "shared@example.com"),
        contact("con_3", "Ben Lim", "ben@example.com"),
      ], total: 3, page: 1, perPage: 100, hasNextPage: false },
      [`POST ${SHARES}`]: reply(201, share({ shareId: "shr_ben", email: "ben@example.com", fullName: "Ben Lim", status: "pending", recipient: null })),
    });
    render(<ShareDocumentDialog workspaceId="ws_1" target={target} mode="add" onClose={vi.fn()} onChanged={vi.fn()} />);
    const picker = await screen.findByTestId("share-contacts-picker");
    const give = await within(picker).findByRole("button", { name: "Give Ben Lim access" });
    expect(within(picker).queryByText("Maria Santos")).toBeNull();
    expect(within(picker).queryByText("Already Shared")).toBeNull();
    await userEvent.click(give);
    await waitFor(() => { expect(api.calls.find(c => c.method === "POST")?.body).toEqual({ email: "ben@example.com", fullName: "Ben Lim" }); });
    expect(await screen.findByText(/Shared with Ben Lim\./)).toBeInTheDocument();
    await waitFor(() => { expect(within(picker).queryByRole("button", { name: "Give Ben Lim access" })).toBeNull(); });
  });
});
