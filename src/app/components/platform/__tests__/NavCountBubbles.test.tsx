// The side panel's pop-up counts show only what is WAITING on this account:
// Documents counts "I must sign" (signers only), Shared Documents counts
// pending shares plus pending access requests on your own documents, and
// Contacts counts pending contact requests. Each row's bubble has its own
// icon. Plus the chatbot showcase for Free accounts (Home and My Templates).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" }, user: { id: "usr_me" } }),
}));
const documentsToSign = vi.fn();
vi.mock("../../../services/real/my-signing.service", () => ({
  realMySigningService: { documentsToSign: () => documentsToSign() },
  isSignerEntry: (i: { recipientType: string | null }) => i.recipientType === null || i.recipientType === "signer",
}));
const sharedWithMe = vi.fn();
const listAccessRequests = vi.fn();
vi.mock("../../../services/real/document-sharing.service", () => ({
  documentSharingService: {
    sharedWithMe: (s: string) => sharedWithMe(s),
    listAccessRequests: (ws: string, s: string) => listAccessRequests(ws, s),
  },
}));
const connections = vi.fn();
vi.mock("../../../services/real/contact-connections.service", () => ({
  contactConnectionsService: { list: () => connections() },
}));

import { useNavCounts, resetNavCounts } from "../../../hooks/useNavCounts";
import { announceNavCountsChanged } from "../../../services/nav-counts-signal";
import { NavCountBubble } from "../InvitationCountBubble";
import { ChatbotShowcase } from "../../dashboard/ChatbotShowcase";

beforeEach(() => {
  resetNavCounts();
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
    await waitFor(() => { expect(result.current).toEqual({ documents: 2, shared: 2, contacts: 3 }); });
    expect(sharedWithMe).toHaveBeenCalledWith("pending");
    expect(listAccessRequests).toHaveBeenCalledWith("ws_1", "pending");
  });

  it("keeps the other numbers when one source fails", async () => {
    connections.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current.documents).toBe(2); });
    expect(result.current.contacts).toBe(0);
    expect(result.current.shared).toBe(2);
  });

  it("is live: an action re-reads at once, and a count that reaches zero is gone", async () => {
    const { result } = renderHook(() => useNavCounts());
    await waitFor(() => { expect(result.current).toEqual({ documents: 2, shared: 2, contacts: 3 }); });

    // The documents are signed, the shares answered, the requests accepted.
    documentsToSign.mockResolvedValue([{ recipientType: "carbon-copy" }]);
    sharedWithMe.mockResolvedValue([]);
    listAccessRequests.mockResolvedValue([]);
    connections.mockResolvedValue({ received: [{}], sent: [] });
    announceNavCountsChanged();
    await waitFor(() => { expect(result.current).toEqual({ documents: 0, shared: 0, contacts: 1 }); });

    const { container } = render(<NavCountBubble kind="documents" count={result.current.documents} />);
    expect(container.textContent).toBe("");
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
        <NavCountBubble kind="invitations" count={0} />
      </>,
    );
    expect(screen.getByTestId("documents-bubble").getAttribute("aria-label")).toBe("2 documents to sign");
    expect(screen.getByTestId("shared-bubble").getAttribute("aria-label")).toBe("1 pending shared document");
    expect(screen.getByTestId("contacts-bubble").getAttribute("aria-label")).toBe("3 pending contact requests");
    expect(screen.queryByTestId("invitation-bubble")).toBeNull();
    const icons = [...container.querySelectorAll("svg")].map(s => s.getAttribute("class"));
    expect(new Set(icons).size).toBe(3);
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
