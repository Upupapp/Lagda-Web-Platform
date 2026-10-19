// The side panel's pop-up counts show only what is WAITING on this account:
// Documents counts what you must still act on (sign, approve, review,
// acknowledge — never a copy for information), Shared Documents counts
// pending shares plus pending access requests on your own documents,
// Contacts counts pending contact requests plus pending document requests,
// Workspace counts join requests for someone who decides them, and My
// Settings counts plan requests for the approver. Each row's bubble has its
// own icon. Plus the chatbot showcase for Free accounts (Home and My Templates).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
let role = "member";
let approver = false;
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" }, user: { id: "usr_me" }, role }),
}));
vi.mock("../../../hooks/usePlans", () => ({
  useMyPlan: () => ({ plan: { approver }, refresh: () => Promise.resolve() }),
}));
const documentRequests = vi.fn();
vi.mock("../../../services/real/contact-request.service", () => ({
  realContactRequestService: { listReceived: (s: string) => documentRequests(s) },
}));
const joinRequests = vi.fn();
vi.mock("../../../services/real/workspace-join.service", () => ({
  listJoinRequests: (ws: string, s: string) => joinRequests(ws, s),
}));
const planReviews = vi.fn();
vi.mock("../../../services/real/plans.service", () => ({
  plansService: { pendingReviews: () => planReviews() },
}));
const documentsToSign = vi.fn();
vi.mock("../../../services/real/my-signing.service", () => ({
  realMySigningService: { documentsToSign: () => documentsToSign() },
  canContinueFromApp: (i: { recipientType: string | null }) =>
    i.recipientType === null || ["signer", "approver", "reviewer", "acknowledgment-recipient"].includes(i.recipientType),
}));
const sharedWithMe = vi.fn();
const listAccessRequests = vi.fn();
vi.mock("../../../services/real/document-sharing.service", () => ({
  documentSharingService: {
    sharedWithMe: (s: string) => sharedWithMe(s),
    listAccessRequests: (ws: string, s: string) => listAccessRequests(ws, s),
  },
}));
let hasDesk = false;
vi.mock("../../../hooks/useAccountFeatures", () => ({
  useAccountFeatures: () => ({ notaryDesk: hasDesk }),
}));
const notaryDesk = vi.fn();
vi.mock("../../../services/real/enotary-invitations.service", () => ({
  realEnotaryInvitationsService: { desk: () => notaryDesk() },
}));
const connections = vi.fn();
vi.mock("../../../services/real/contact-connections.service", () => ({
  contactConnectionsService: { list: () => connections() },
}));

import { useNavCounts, resetNavCounts } from "../../../hooks/useNavCounts";
import { announceNavCountsChanged } from "../../../services/nav-counts-signal";
import { announce } from "../../../services/live/topics";
import { NavCountBubble } from "../InvitationCountBubble";
import { ChatbotShowcase } from "../../dashboard/ChatbotShowcase";

const ALL = { documents: 3, shared: 2, contacts: 5, documentRequests: 2, workspace: 0, settings: 0, notaryDesk: 0 };

beforeEach(() => {
  resetNavCounts();
  role = "member";
  approver = false;
  hasDesk = false;
  notaryDesk.mockResolvedValue({ requests: [] });
  documentRequests.mockResolvedValue([{ status: "pending" }, { status: "pending" }]);
  joinRequests.mockResolvedValue([{ state: "pending" }, { state: "pending" }, { state: "pending" }]);
  planReviews.mockResolvedValue({ requests: [{}, {}] });
  documentsToSign.mockResolvedValue([
    { recipientType: "signer" }, { recipientType: null }, { recipientType: "carbon-copy" }, { recipientType: "approver" },
  ]);
  sharedWithMe.mockResolvedValue([{ id: "sh_1" }]);
  listAccessRequests.mockResolvedValue([
    { document: { owner: { userId: "usr_me" } } }, { document: { owner: { userId: "usr_other" } } },
  ]);
  connections.mockResolvedValue({ received: [{}, {}, {}], sent: [{}] });
});

describe("side panel counts", () => {
  it("counts only what is waiting on this account", async () => {
    const { result } = renderHook(() => useNavCounts());
    // Signer, unnamed role and approver must act; the carbon copy does not.
    // Contacts: 3 contact requests + 2 document requests.
    await waitFor(() => { expect(result.current).toEqual(ALL); });
    expect(sharedWithMe).toHaveBeenCalledWith("pending");
    expect(listAccessRequests).toHaveBeenCalledWith("ws_1", "pending");
    expect(documentRequests).toHaveBeenCalledWith("pending");
  });

  it("asks for join requests and plan requests only on behalf of someone who decides them", async () => {
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current).toEqual(ALL); });
    expect(joinRequests).not.toHaveBeenCalled();
    expect(planReviews).not.toHaveBeenCalled();
  });

  it("shows an owner the join requests waiting, and the approver the plan requests", async () => {
    role = "owner";
    approver = true;
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current).toEqual({ ...ALL, workspace: 3, settings: 2 }); });
    expect(joinRequests).toHaveBeenCalledWith("ws_1", "pending");
  });

  it("counts a document request on the Contacts bubble, and drops it the moment it is answered", async () => {
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current.contacts).toBe(5); });
    documentRequests.mockResolvedValue([{ status: "pending" }]);
    announce("contacts"); // what completing, declining or cancelling a request raises
    await waitFor(() => { expect(result.current.contacts).toBe(4); });
    expect(result.current.documentRequests).toBe(1);
  });

  it("keeps the contact requests when the document requests cannot be read", async () => {
    documentRequests.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current.contacts).toBe(3); });
    expect(result.current.documentRequests).toBe(0);
  });

  it("keeps the other numbers when one source fails", async () => {
    connections.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current.documents).toBe(3); });
    // The contact requests are unknown; the document requests still count.
    expect(result.current.contacts).toBe(2);
    expect(result.current.shared).toBe(2);
  });

  it("is live: an action re-reads at once, and a count that reaches zero is gone", async () => {
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current).toEqual(ALL); });

    // The documents are signed, the shares answered, the requests accepted.
    documentRequests.mockResolvedValue([]);
    documentsToSign.mockResolvedValue([{ recipientType: "carbon-copy" }]);
    sharedWithMe.mockResolvedValue([]);
    listAccessRequests.mockResolvedValue([]);
    connections.mockResolvedValue({ received: [{}], sent: [] });
    announceNavCountsChanged();
    await waitFor(() => { expect(result.current).toEqual({ ...ALL, documents: 0, shared: 0, contacts: 1, documentRequests: 0 }); });

    const { container } = render(<NavCountBubble kind="documents" count={result.current.documents} />);
    expect(container.textContent).toBe("");
  });

  it("counts a notary's desk live: requests to answer and payments to confirm, and nothing without a desk", async () => {
    notaryDesk.mockResolvedValue({ incoming: [{ id: "n1" }], requests: [
      { status: "claimed", payment: null }, { status: "accepted", payment: { status: "proof" } }, { status: "accepted", payment: { status: "awaiting" } },
    ] });
    const view = renderHook(() => useNavCounts());
    await waitFor(() => { expect(view.result.current).toEqual(ALL); });
    expect(notaryDesk).not.toHaveBeenCalled();
    view.unmount();
    resetNavCounts();

    hasDesk = true;
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current.notaryDesk).toBe(3); });
    // A client's new request arrives while the notary has the page open.
    notaryDesk.mockResolvedValue({ incoming: [{ id: "n1" }, { id: "n2" }], requests: [
      { status: "claimed", payment: null }, { status: "claimed", payment: null }, { status: "accepted", payment: { status: "proof" } },
    ] });
    announceNavCountsChanged();
    await waitFor(() => { expect(result.current.notaryDesk).toBe(5); });
    const { container } = render(<NavCountBubble kind="notaryDesk" count={result.current.notaryDesk} />);
    expect(screen.getByTestId("notary-desk-bubble").getAttribute("aria-label")).toBe("5 requests need your answer on the notary desk");
    expect(container.textContent).toBe("5");
    // All answered: the red bubble is gone.
    notaryDesk.mockResolvedValue({ requests: [] });
    announceNavCountsChanged();
    await waitFor(() => { expect(result.current.notaryDesk).toBe(0); });
  });

  it("an action during a read still gets a fresh read after it", async () => {
    let release: () => void = () => undefined;
    documentsToSign.mockImplementationOnce(() => new Promise(r => { release = () => { r([{ recipientType: "signer" }, { recipientType: "signer" }]); }; }));
    const { result } = renderHook(() => useNavCounts());
    // The first read is still on its way when the document is signed.
    documentsToSign.mockResolvedValue([]);
    announceNavCountsChanged();
    release();
    await waitFor(() => { expect(result.current.documents).toBe(0); });
    expect(documentsToSign).toHaveBeenCalledTimes(2);
  });

  it("gives each row its own bubble, hidden at zero", () => {
    const { container } = render(
      <>
        <NavCountBubble kind="documents" count={2} />
        <NavCountBubble kind="shared" count={1} />
        <NavCountBubble kind="contacts" count={3} />
        <NavCountBubble kind="workspace" count={2} />
        <NavCountBubble kind="settings" count={1} />
        <NavCountBubble kind="invitations" count={0} />
      </>,
    );
    expect(screen.getByTestId("documents-bubble").getAttribute("aria-label")).toBe("2 documents waiting for you");
    expect(screen.getByTestId("shared-bubble").getAttribute("aria-label")).toBe("1 pending shared document");
    expect(screen.getByTestId("contacts-bubble").getAttribute("aria-label")).toBe("3 requests waiting in Contacts");
    expect(screen.getByTestId("workspace-bubble").getAttribute("aria-label")).toBe("2 join requests waiting");
    expect(screen.getByTestId("settings-bubble").getAttribute("aria-label")).toBe("1 plan request waiting");
    expect(screen.queryByTestId("invitation-bubble")).toBeNull();
    const icons = [...container.querySelectorAll("svg")].map(s => s.getAttribute("class"));
    expect(new Set(icons).size).toBe(5);
  });
});

describe("chatbot showcase", () => {
  it("is always shown on Home, with no way to hide it, and leads to the plans", () => {
    render(<MemoryRouter><ChatbotShowcase /></MemoryRouter>);
    const card = screen.getByTestId("chatbot-showcase");
    expect(card.textContent).toContain("Meet the LAGDA Chatbot");
    expect(card.textContent).toContain("Draft an NDA");
    expect(card.querySelector("button")).toBeNull();
    expect(screen.getByTestId("chatbot-showcase-cta").getAttribute("href")).toBe("/app/settings/plan?choose=personal");
  });

  it("has its own wording in My Templates", () => {
    render(<MemoryRouter><ChatbotShowcase variant="templates" /></MemoryRouter>);
    const card = screen.getByTestId("chatbot-showcase-templates");
    expect(card.textContent).toContain("Write templates with the LAGDA Chatbot");
    expect(card.textContent).toContain("service agreement");
  });
});
