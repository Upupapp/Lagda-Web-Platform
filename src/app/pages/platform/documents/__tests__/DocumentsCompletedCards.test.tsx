// Documents › Completed, real mode: last section after Declined, shown as
// branded cards whose banner follows the shared branding store, with the
// card's other actions behind a menu button.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 20_000 });
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Acme", accentColor: "#0078D4" } }),
}));
vi.mock("../../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));

const listRequests = vi.fn();
vi.mock("../../../../services/real/signing-request.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/signing-request.service")>();
  return { ...actual, realSigningRequestService: { ...actual.realSigningRequestService, list: (...args: unknown[]) => listRequests(...args) as unknown, audit: () => Promise.reject(new Error("offline")) } };
});
vi.mock("../../../../services/real/document.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document.service")>();
  return {
    ...actual,
    realDocumentService: {
      ...actual.realDocumentService,
      list: () => Promise.resolve({
        items: [{ documentId: "doc_a", workspaceId: "ws_1", title: "Lease Agreement", originalFilename: "Lease.pdf", createdByUserId: "u",
          folderId: null, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", source: null, verificationId: "LAGDA-VER-2026-004821" }],
        total: 1, page: 1, perPage: 100, hasNextPage: false,
      }),
    },
  };
});
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return { ...actual, realMySigningService: { documentsToSign: () => Promise.resolve([]), signedDocuments: () => Promise.resolve([]) } };
});

import { DocumentsPage } from "../DocumentsPage";
import { resetWorkspaceBrandingStore, setWorkspaceBrandingSnapshot } from "../../../../hooks/workspace-branding-store";

const COMPLETED = {
  signingRequestId: "sr_a", documentId: "doc_a", documentTitle: "Lease Agreement", state: "completed",
  participantCount: 3, completedParticipantCount: 3, initiator: null,
  createdAt: "2026-09-02T00:00:00.000Z", sentAt: null, completedAt: null, expiresAt: null,
};

beforeEach(() => {
  resetWorkspaceBrandingStore();
  listRequests.mockReset();
  listRequests.mockImplementation((_ws: string, opts: { states?: string[] } = {}) => {
    const items = !opts.states || opts.states.includes("completed") ? [COMPLETED] : [];
    return Promise.resolve({ items, total: items.length, page: 1, perPage: 50, hasNextPage: false });
  });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
});

const renderCompleted = () => render(<MemoryRouter initialEntries={["/app/documents?list=completed"]}><DocumentsPage /></MemoryRouter>);

describe("Documents › Completed", () => {
  it("is the last section of Records, right after Declined", () => {
    render(<MemoryRouter initialEntries={["/app/documents?list=completed"]}><DocumentsPage /></MemoryRouter>);
    const groups = within(screen.getByRole("tablist", { name: "Document groups" })).getAllByRole("tab");
    expect(groups.map(g => g.textContent?.trim())).toEqual(["Correspondence", "Records"]);
    expect(groups[1]).toHaveAttribute("aria-selected", "true");
    const tabs = within(screen.getByRole("tablist", { name: "Document lists" })).getAllByRole("tab").map(t => t.textContent?.trim());
    expect(tabs).toEqual(["Signed by me", "Others", "Draft", "Declined", "Completed"]);
  });

  it("shows each completed document as a card with name, badge, Verification ID, progress and date", async () => {
    renderCompleted();
    const card = await screen.findByTestId("completed-card");
    expect(within(card).getByRole("heading", { name: "Lease Agreement" })).toBeInTheDocument();
    expect(within(card).getByText("Completed")).toBeInTheDocument();
    await waitFor(() => expect(within(card).getByText("LAGDA-VER-2026-004821")).toBeInTheDocument());
    expect(within(card).getByRole("button", { name: "Copy Verification ID" })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Verify document" })).toHaveAttribute("href", "/app/verify/LAGDA-VER-2026-004821");
    expect(within(card).getByTestId("completed-card-progress")).toHaveTextContent("3 of 3 signed");
    expect(within(card).getByText(/Created/)).toBeInTheDocument();
    // No table for this section.
    expect(screen.queryByRole("table", { name: "Documents" })).toBeNull();
  });

  it("tops each card with the workspace banner and follows a branding save at once", async () => {
    setWorkspaceBrandingSnapshot("ws_1", { displayName: "Acme Legal", senderDisplayName: null, footerTagline: null, primaryColor: "#0A4B8C", logoUrl: null, canEdit: true });
    renderCompleted();
    const card = await screen.findByTestId("completed-card");
    expect(within(card).getByTestId("completed-card-banner-name")).toHaveTextContent("Acme Legal");
    expect(within(card).getByTestId("completed-card-banner-band")).toHaveStyle({ background: "#0A4B8C" });
    act(() => {
      setWorkspaceBrandingSnapshot("ws_1", { displayName: "Acme & Co", senderDisplayName: null, footerTagline: null, primaryColor: "#7C2D12", logoUrl: "http://api.test/logo.png", canEdit: true });
    });
    // Re-queried: the list may have re-rendered in between.
    await waitFor(() => expect(screen.getByTestId("completed-card-banner-name")).toHaveTextContent("Acme & Co"));
    expect(screen.getByTestId("completed-card-banner-band")).toHaveStyle({ background: "#7C2D12" });
    expect(screen.getByAltText("Acme & Co logo")).toHaveAttribute("src", "http://api.test/logo.png");
  });

  it("falls back to the workspace name before any branding is known", async () => {
    renderCompleted();
    expect(within(await screen.findByTestId("completed-card")).getByTestId("completed-card-banner-name")).toHaveTextContent("Acme");
  });

  it("keeps the other actions in a menu that opens, moves by keyboard, closes on Esc and outside click", async () => {
    const user = userEvent.setup();
    renderCompleted();
    const card = await screen.findByTestId("completed-card");
    const toggle = within(card).getByRole("button", { name: "Show actions for Lease Agreement" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const menu = within(card).getByTestId("doc-card-menu");
    expect(toggle).toHaveAttribute("aria-controls", menu.id);
    expect(menu).not.toBeVisible();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(menu).toBeVisible();
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map(i => i.textContent)).toEqual(["View", "Participants", "History", "Send again"]);
    expect(items[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{End}");
    expect(items[3]).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(menu).not.toBeVisible();
    expect(within(card).getByRole("button", { name: "Show actions for Lease Agreement" })).toHaveFocus();

    await user.click(within(card).getByRole("button", { name: /actions for Lease Agreement/ }));
    expect(menu).toBeVisible();
    await user.click(document.body);
    expect(menu).not.toBeVisible();
  });

  it("has a Share button at the card's bottom-right that opens the share panel for that document", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit = {}) => {
      calls.push(`${init.method ?? "GET"} ${url}`);
      const body = url.includes("/shares") ? { document: {}, shares: [] } : { items: [] };
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
    }));
    renderCompleted();
    const card = await screen.findByTestId("completed-card");
    const share = within(card).getByRole("button", { name: "Share Lease Agreement" });
    // The last control in the card: nothing follows it in the tab order.
    const focusables = within(card).getAllByRole("button");
    expect(focusables[focusables.length - 1]).toBe(share);
    await user.click(share);
    const dialog = await screen.findByRole("dialog", { name: "Share document" });
    expect(within(dialog).getByText("Lease Agreement")).toBeInTheDocument();
    // Opens on "From your contacts"; the manual form is one tab away.
    expect(within(dialog).getByTestId("add-way-contacts")).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByTestId("share-contacts-picker")).toBeInTheDocument();
    await user.click(within(dialog).getByTestId("add-way-manual"));
    expect(within(dialog).getByLabelText(/Email address/)).toBeInTheDocument();
    expect(within(dialog).getByText(/No email is sent/)).toBeInTheDocument();
    await waitFor(() => expect(calls).toContain("GET http://api.test/workspaces/ws_1/documents/doc_a/shares"));
  });

  it("runs an action from the menu and closes it", async () => {
    const user = userEvent.setup();
    renderCompleted();
    const card = await screen.findByTestId("completed-card");
    await user.click(within(card).getByRole("button", { name: /actions for Lease Agreement/ }));
    await user.click(within(card).getByRole("menuitem", { name: "History" }));
    expect(within(card).getByTestId("doc-card-menu")).not.toBeVisible();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
