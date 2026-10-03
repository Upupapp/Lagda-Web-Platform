// Documents › Correspondence: "I must sign" and "Sent" as mail cards.
//
// I must sign: the SENDER's banner (colour + logo) with "Received" in its
// corner, the title and sender centred, "See the sender" at the bottom-left
// and "Continue signing" at the bottom-right; the default colour and the
// workspace name when no branding reached us.
// Sent: this workspace's own banner, "Sent" in the corner, the status in
// words, who it went to and how far signing has got, and the same actions.
// Documents always opens on Sent, inside Correspondence.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 15_000 });
import { resetLiveCache } from "../../../../services/live/live-query";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Reyes Law", accentColor: "#0078D4" } }),
}));
vi.mock("../../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));

const listRequests = vi.fn();
vi.mock("../../../../services/real/signing-request.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/signing-request.service")>();
  return { ...actual, realSigningRequestService: { ...actual.realSigningRequestService, list: (...a: unknown[]) => listRequests(...a) as unknown } };
});
vi.mock("../../../../services/real/document.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document.service")>();
  return { ...actual, realDocumentService: { ...actual.realDocumentService, list: () => Promise.resolve({ items: [], total: 0, page: 1, perPage: 100, hasNextPage: false }) } };
});
const toSign = vi.fn();
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return {
    ...actual,
    realMySigningService: {
      documentsToSign: () => toSign() as unknown,
      signedDocuments: () => Promise.resolve([]),
      completedOtherDocuments: () => Promise.resolve([]),
      continueSigning: vi.fn(),
    },
  };
});

import { DocumentsPage } from "../DocumentsPage";

const SENT = {
  signingRequestId: "sr_sent", documentId: "doc_s", documentTitle: "Employment Agreement 2026", state: "partially-completed",
  participantCount: 3, completedParticipantCount: 1, initiator: null,
  createdAt: "2026-09-26T00:00:00.000Z", sentAt: "2026-09-28T00:00:00.000Z", completedAt: null, expiresAt: "2026-10-28T00:00:00.000Z",
};

const inboxRow = (over: Record<string, unknown> = {}) => ({
  signingRequestId: "sr_in", recipientId: "srr_in", documentTitle: "Office Lease", recipientType: "signer",
  senderName: "Maria Santos", senderEmail: "maria@acme.test", workspaceName: "Acme Legal",
  invitedAt: "2026-09-28T00:00:00.000Z", expiresAt: "2026-10-28T00:00:00.000Z",
  branding: { displayName: "Acme Legal", primaryColor: "#7C2D12", logo: { version: "v9", width: 10, height: 5 } },
  ...over,
});

beforeEach(() => {
  listRequests.mockReset();
  listRequests.mockResolvedValue({ items: [SENT], total: 1, page: 1, perPage: 50, hasNextPage: false });
  toSign.mockReset();
  toSign.mockResolvedValue([inboxRow()]);
});

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><DocumentsPage /></MemoryRouter>);

describe("Documents › Correspondence", () => {
  it("always opens on Sent, inside Correspondence, even with something waiting to sign", async () => {
    renderAt("/app/documents");
    const groups = within(screen.getByRole("tablist", { name: "Document groups" })).getAllByRole("tab");
    expect(groups[0]).toHaveAttribute("aria-selected", "true");
    // The badge says something is waiting; the page does not jump to it.
    expect(await within(groups[0]!).findByText("1")).toBeInTheDocument();
    const tabs = within(screen.getByRole("tablist", { name: "Document lists" })).getAllByRole("tab");
    expect(tabs.map(t => t.textContent?.trim())).toEqual(["Sent", "I must sign1"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("shows Sent as outbox mail cards under this workspace's banner, with its actions", async () => {
    renderAt("/app/documents");
    const card = await screen.findByTestId("outbox-card");
    expect(within(card).getByTestId("outbox-card-banner-name")).toHaveTextContent("Reyes Law");
    expect(within(card).getByText("Partially signed")).toBeInTheDocument();
    expect(within(card).getByText(/Sent Sep 28, 2026/)).toBeInTheDocument();
    expect(within(card).getByRole("heading", { name: "Employment Agreement 2026" })).toBeInTheDocument();
    expect(within(card).getByText(/To 3 participants/)).toBeInTheDocument();
    expect(within(card).getByText("1 of 3 signed")).toBeInTheDocument();
    for (const name of ["Participants of", "History of", "View", "to a new email address"]) {
      expect(within(card).getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(within(card).getByText("Send to new email")).toBeInTheDocument();
  });

  it("draws a single letter narrow and centred, several in the wider column", async () => {
    const { unmount } = renderAt("/app/documents");
    const list = await screen.findByRole("list", { name: "Sent documents" });
    expect(list.className).toContain("mail-card-list-single");
    unmount();
    // The list is held across mounts (live-query); empty it so the second
    // render reads the new rows instead of showing the held one.
    resetLiveCache();

    listRequests.mockResolvedValue({
      items: [SENT, { ...SENT, signingRequestId: "sr_two", documentTitle: "NDA" }],
      total: 2, page: 1, perPage: 50, hasNextPage: false,
    });
    renderAt("/app/documents");
    await screen.findByRole("heading", { name: "NDA" });
    expect(screen.getByRole("list", { name: "Sent documents" }).className).not.toContain("mail-card-list-single");
  });

  it("offers Send to new email only while the document is still out for signing", async () => {
    listRequests.mockResolvedValue({
      items: [{ ...SENT, state: "expired" }], total: 1, page: 1, perPage: 50, hasNextPage: false,
    });
    renderAt("/app/documents");
    const card = await screen.findByTestId("outbox-card");
    expect(within(card).queryByText("Send to new email")).toBeNull();
    expect(within(card).getByRole("button", { name: /View/ })).toBeInTheDocument();
  });

  it("opens the send dialog from Sent without re-sending to the same participants", async () => {
    const user = userEvent.setup();
    renderAt("/app/documents");
    await user.click(await screen.findByText("Send to new email"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("tab", { name: /Re-send to same participants/ })).toBeNull();
  });

  it("shows I must sign as mail cards under the SENDER's banner, actions at the bottom corners", async () => {
    renderAt("/app/documents?list=to-sign");
    const card = await screen.findByTestId("to-sign-card");
    expect(within(card).getByTestId("to-sign-card-banner-band")).toHaveStyle({ background: "#7C2D12" });
    expect(within(card).getByTestId("to-sign-card-banner-name")).toHaveTextContent("Acme Legal");
    expect(within(card).getByAltText("Acme Legal logo"))
      .toHaveAttribute("src", "http://api.test/me/documents-to-sign/sr_in/branding/logo?v=v9");
    expect(within(card).getByText(/Received Sep 28, 2026/)).toBeInTheDocument();
    expect(within(card).getByRole("heading", { name: "Office Lease" })).toBeInTheDocument();
    expect(within(card).getByText("Maria Santos")).toBeInTheDocument();
    const buttons = within(card).getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("See the sender");
    expect(buttons[buttons.length - 1]).toHaveTextContent("Continue signing");
  });

  it("falls back to the default colour and the workspace name when no branding reached us", async () => {
    toSign.mockResolvedValue([inboxRow({ branding: null })]);
    renderAt("/app/documents?list=to-sign");
    const card = await screen.findByTestId("to-sign-card");
    expect(within(card).getByTestId("to-sign-card-banner-band")).toHaveStyle({ background: "#0078D4" });
    expect(within(card).getByTestId("to-sign-card-banner-name")).toHaveTextContent("Acme Legal");
    expect(within(card).queryByRole("img")).toBeNull();
  });

  it("keeps the empty message when nothing is waiting", async () => {
    toSign.mockResolvedValue([]);
    renderAt("/app/documents?list=to-sign");
    expect(await screen.findByText("Nothing waiting for your signature")).toBeInTheDocument();
  });

  it("switches groups: Records opens on Signed by me, Correspondence back on Sent", async () => {
    const user = userEvent.setup();
    renderAt("/app/documents");
    const groups = () => within(screen.getByRole("tablist", { name: "Document groups" })).getAllByRole("tab");
    await user.click(groups()[1]!);
    expect(groups()[1]).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tablist", { name: "Document lists" })).getByRole("tab", { name: /Signed by me/ }))
      .toHaveAttribute("aria-selected", "true");
    await user.click(groups()[0]!);
    expect(within(screen.getByRole("tablist", { name: "Document lists" })).getByRole("tab", { name: /Sent/ }))
      .toHaveAttribute("aria-selected", "true");
  });
});
