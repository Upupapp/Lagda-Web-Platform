// Invitations: received workspace invitations as mailbox letters, in
// Pending / Rejected / Accepted, against a faked /me/invitations API.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
const platform = { workspaces: [] as { id: string }[], currentWorkspace: null as { id: string; name: string } | null, user: { id: "u1" } };
vi.mock("../../../../context/PlatformContext", () => ({ usePlatform: () => platform }));

import { MyInvitationsPage } from "../MyInvitationsPage";
import { getPendingInvitationCount, resetPendingInvitationCount } from "../../../../hooks/usePendingInvitationCount";
import { mockSharingApi, apiError, type Routes as ApiRoutes } from "../../../../components/document-sharing/__tests__/sharing-test-api";
import { invitation } from "./invitation-fixtures";
import { resetPlanStore } from "../../../../hooks/usePlans";
import { ROLE_CAPABILITIES } from "../../../../models/workspace-role-policy";

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/app/invitations" element={<><MyInvitationsPage /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

function routes(over: ApiRoutes = {}): ApiRoutes {
  return {
    "GET /me/invitations?status=pending": { items: [
      invitation(),
      invitation({ invitationId: "inv_2", workspaceName: "Initech", role: "template_administrator", invitedBy: { displayName: "Bill L." }, branding: { displayName: "Initech", primaryColor: null, logo: null } }),
    ] },
    "GET /me/invitations?status=declined": { items: [
      invitation({ invitationId: "inv_d", workspaceName: "Umbrella", status: "declined", declinedAt: "2026-09-22T00:00:00.000Z", declineReason: "Not my department" }),
    ] },
    "GET /me/invitations?status=accepted": { items: [
      invitation({ invitationId: "inv_a", workspaceId: "ws_wait", workspaceName: "Waiting Co", status: "accepted" }),
      invitation({ invitationId: "inv_j", workspaceId: "ws_joined", workspaceName: "Joined Co", status: "accepted" }),
    ] },
    ...over,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  resetPendingInvitationCount();
  resetPlanStore();
  platform.workspaces = [{ id: "ws_joined" }];
  platform.currentWorkspace = null;
});

describe("Invitations — Received and Sent", () => {
  const ownerOnBusiness = (plan = "business") => routes({
    "GET /workspaces/ws_1/access": { workspaceId: "ws_1", membershipId: "m1", role: "owner", capabilities: [...ROLE_CAPABILITIES.owner], roleTitle: null },
    "GET /workspaces/ws_1/plan": { plan, ownerIsYou: true, ownerName: "Ana Reyes", paidUntil: null },
    "GET /workspaces/ws_1/invitations": { invitations: [] },
    "GET /workspaces/ws_1/join-requests": { requests: [] },
    "GET /workspaces/ws_1/join-tickets": { tickets: [] },
  });

  it("adds Sent and the Invite people button for someone who may invite, on Business", async () => {
    platform.currentWorkspace = { id: "ws_1", name: "Reyes Law Office" };
    mockSharingApi(ownerOnBusiness());
    const user = userEvent.setup();
    renderAt("/app/invitations");
    const sent = await screen.findByTestId("invitations-view-sent");
    expect(screen.getByTestId("invitations-view-received")).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByTestId("invite-people-toggle")).toBeInTheDocument();
    await user.click(sent);
    expect(screen.getByTestId("where")).toHaveTextContent("/app/invitations?view=sent");
    expect(await screen.findByTestId("invitations-sent")).toBeInTheDocument();
  });

  it("opens the panel on Requests from a link to the join requests", async () => {
    platform.currentWorkspace = { id: "ws_1", name: "Reyes Law Office" };
    mockSharingApi(ownerOnBusiness());
    renderAt("/app/invitations?view=sent&panel=requests");
    const panel = await screen.findByTestId("invite-people-panel");
    expect(within(panel).getByTestId("invite-tab-requests")).toHaveAttribute("aria-selected", "true");
  });

  it("shows only Received on a Free workspace", async () => {
    platform.currentWorkspace = { id: "ws_1", name: "Reyes Law Office" };
    mockSharingApi(ownerOnBusiness("free"));
    renderAt("/app/invitations?view=sent");
    await screen.findAllByTestId("invitation-card");
    expect(screen.queryByTestId("invitations-view-sent")).toBeNull();
    expect(screen.queryByTestId("invite-people-toggle")).toBeNull();
    expect(screen.queryByTestId("invitations-sent")).toBeNull();
  });
});

describe("Invitations page", () => {
  it("has Pending / Rejected / Accepted tabs with counts, and publishes the pending count", async () => {
    mockSharingApi(routes());
    renderAt("/app/invitations");
    const tabs = screen.getByRole("tablist", { name: "Invitations by status" });
    await waitFor(() => expect(within(tabs).getByRole("tab", { name: /Pending/ })).toHaveTextContent("2"));
    expect(within(tabs).getByRole("tab", { name: /Pending/ })).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: /Rejected/ })).toHaveTextContent("1");
    expect(within(tabs).getByRole("tab", { name: /Accepted/ })).toHaveTextContent("2");
    expect(getPendingInvitationCount()).toBe(2);
  });

  it("draws each invitation as a branded letter with sender, subject, dates and the workspace logo", async () => {
    mockSharingApi(routes());
    renderAt("/app/invitations?status=pending");
    const letters = await screen.findAllByTestId("invitation-card");
    expect(letters).toHaveLength(2);
    const first = letters[0]!;
    expect(within(first).getByRole("article", { name: "Invitation to join Globex Legal as Sender" })).toBeInTheDocument();
    expect(within(first).getByTestId("invitation-from")).toHaveTextContent("Olivia Owner · Globex Legal");
    expect(within(first).getByText("Received")).toBeInTheDocument();
    expect(within(first).getByText("Expires")).toBeInTheDocument();
    expect(within(first).getByAltText("Globex Legal logo")).toHaveAttribute("src", "http://api.test/me/invitations/inv_1/branding/logo?v=v2");
    expect(within(first).getByTestId("invitation-banner-band")).toHaveStyle({ background: "#7C2D12" });
    // No logo: the banner falls back to initials in the default colour.
    const second = letters[1]!;
    expect(within(second).getByRole("heading", { name: "Invitation to join Initech as Template Administrator" })).toBeInTheDocument();
    expect(within(second).queryByRole("img", { name: /logo/ })).toBeNull();
  });

  it("accepting files the request and says the owner will approve access", async () => {
    let accepted = false;
    const api = mockSharingApi(routes({
      "POST /me/invitations/inv_1/accept": () => { accepted = true; return { workspaceId: "ws_globex", workspaceName: "Globex Legal", role: "sender", joined: false, pending: true }; },
      "GET /me/invitations?status=pending": () => ({ items: accepted ? [] : [invitation()] }),
    }));
    renderAt("/app/invitations");
    await userEvent.click(await screen.findByRole("button", { name: "Accept: Invitation to join Globex Legal as Sender" }));
    expect(await screen.findByText(/Request sent — the workspace owner will approve your access\./)).toBeInTheDocument();
    expect(api.calls.some(c => c.method === "POST" && c.path === "/me/invitations/inv_1/accept")).toBe(true);
    await waitFor(() => expect(getPendingInvitationCount()).toBe(0));
  });

  it("says so when accepting finds the account already a member", async () => {
    mockSharingApi(routes({ "POST /me/invitations/inv_1/accept": { workspaceId: "ws_globex", workspaceName: "Globex Legal", role: "sender", joined: false, pending: false } }));
    renderAt("/app/invitations");
    await userEvent.click(await screen.findByRole("button", { name: "Accept: Invitation to join Globex Legal as Sender" }));
    expect(await screen.findByText("You are already a member of Globex Legal.")).toBeInTheDocument();
  });

  it("rejecting needs a reason of 1–500 characters, shows a counter, and sends the reason", async () => {
    const api = mockSharingApi(routes({ "POST /me/invitations/inv_1/decline": { invitationId: "inv_1", status: "declined" } }));
    renderAt("/app/invitations");
    await userEvent.click(await screen.findByRole("button", { name: "Reject: Invitation to join Globex Legal as Sender" }));
    const dialog = screen.getByRole("dialog", { name: "Reject this invitation" });
    const field = within(dialog).getByLabelText(/Reason for rejecting/);
    expect(field).toHaveAttribute("maxLength", "500");
    expect(within(dialog).getByTestId("decline-reason-counter")).toHaveTextContent("0/500");

    await userEvent.click(within(dialog).getByRole("button", { name: "Reject invitation" }));
    expect(within(dialog).getByText("Enter a reason for rejecting this invitation.")).toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(api.calls.some(c => c.path.endsWith("/decline"))).toBe(false);

    await userEvent.type(field, "   ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject invitation" }));
    expect(api.calls.some(c => c.path.endsWith("/decline"))).toBe(false);

    await userEvent.clear(field);
    await userEvent.type(field, " Wrong team ");
    expect(within(dialog).getByTestId("decline-reason-counter")).toHaveTextContent("12/500");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject invitation" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(api.calls.find(c => c.method === "POST" && c.path === "/me/invitations/inv_1/decline")?.body).toEqual({ reason: "Wrong team" });
    expect(screen.getByText(/You rejected the invitation to Globex Legal/)).toBeInTheDocument();
  });

  it("keeps the dialog open with the error when the backend refuses the reason", async () => {
    mockSharingApi(routes({ "POST /me/invitations/inv_1/decline": apiError(422, "validation_failed") }));
    renderAt("/app/invitations");
    await userEvent.click(await screen.findByRole("button", { name: /^Reject: Invitation to join Globex Legal/ }));
    const dialog = screen.getByRole("dialog", { name: "Reject this invitation" });
    await userEvent.type(within(dialog).getByLabelText(/Reason for rejecting/), "No");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject invitation" }));
    expect(await within(dialog).findByText("Enter a reason between 1 and 500 characters.")).toBeInTheDocument();
  });

  it("shows the reason on a rejected invitation and withdraws the rejection back to Pending", async () => {
    const api = mockSharingApi(routes({ "POST /me/invitations/inv_d/withdraw-decline": { invitationId: "inv_d", status: "pending" } }));
    renderAt("/app/invitations?status=declined");
    const letter = (await screen.findAllByTestId("invitation-card"))[0]!;
    expect(within(letter).getByTestId("invitation-reason")).toHaveTextContent("“Not my department”");
    expect(within(letter).getByText("Rejected")).toBeInTheDocument();
    await userEvent.click(within(letter).getByRole("button", { name: "Withdraw rejection: Invitation to join Umbrella as Sender" }));
    expect(await screen.findByText(/The rejection was withdrawn/)).toBeInTheDocument();
    expect(api.calls.some(c => c.method === "POST" && c.path === "/me/invitations/inv_d/withdraw-decline")).toBe(true);
  });

  it("explains a 409 when a rejection can no longer be withdrawn", async () => {
    mockSharingApi(routes({ "POST /me/invitations/inv_d/withdraw-decline": apiError(409, "invitation_state_conflict") }));
    renderAt("/app/invitations?status=rejected");
    await userEvent.click(await screen.findByRole("button", { name: /^Withdraw rejection/ }));
    expect(await screen.findByText(/can no longer be reopened/)).toBeInTheDocument();
  });

  it("an accepted invitation is read-only: waiting for approval, or joined once a member", async () => {
    mockSharingApi(routes());
    renderAt("/app/invitations?status=accepted");
    const [waiting, joined] = await screen.findAllByTestId("invitation-card");
    expect(within(waiting!).getByTestId("invitation-accepted-note")).toHaveTextContent("Waiting for approval — the workspace owner will approve your access.");
    expect(within(joined!).getByTestId("invitation-accepted-note")).toHaveTextContent("Joined");
    expect(within(waiting!).queryByRole("button")).toBeNull();
    expect(within(joined!).queryByRole("button")).toBeNull();
  });

  it("switches tabs through the URL and highlights a linked invitation", async () => {
    mockSharingApi(routes());
    renderAt("/app/invitations?status=pending&invitation=inv_2");
    const letters = await screen.findAllByTestId("invitation-card");
    expect(letters[1]).toHaveClass("inv-letter--highlighted");
    expect(letters[0]).not.toHaveClass("inv-letter--highlighted");
    await userEvent.click(screen.getByRole("tab", { name: /Rejected/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/app/invitations?status=declined");
    expect(await screen.findByText(/Not my department/)).toBeInTheDocument();
  });

  it("an expired pending invitation offers no Accept", async () => {
    mockSharingApi(routes({ "GET /me/invitations?status=pending": { items: [invitation({ expiresAt: "2020-01-01T00:00:00.000Z" })] } }));
    renderAt("/app/invitations");
    const letter = (await screen.findAllByTestId("invitation-card"))[0]!;
    expect(within(letter).getAllByText("Expired").length).toBeGreaterThan(0);
    expect(within(letter).queryByRole("button", { name: /^Accept/ })).toBeNull();
  });

  it("explains an unverified email and offers a retry when loading fails", async () => {
    mockSharingApi(routes({ "GET /me/invitations?status=pending": apiError(403, "account_email_unverified") }));
    renderAt("/app/invitations");
    expect(await screen.findByText(/Confirm your account's email address first/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows empty states per tab", async () => {
    mockSharingApi({
      "GET /me/invitations?status=pending": { items: [] },
      "GET /me/invitations?status=declined": { items: [] },
      "GET /me/invitations?status=accepted": { items: [] },
    });
    renderAt("/app/invitations");
    expect(await screen.findByText("No invitations waiting")).toBeInTheDocument();
  });
});
