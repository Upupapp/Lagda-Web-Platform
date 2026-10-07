// Documents, real mode: Cancel on a document that is out for signature, the
// Cancelled section with Restore and Move to Trash, and the Recycle Bin button.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.setConfig({ testTimeout: 20_000 });

const { svc, listRequests, cancel, plan, docs } = vi.hoisted(() => ({
  listRequests: vi.fn(), cancel: vi.fn(), plan: { paid: true }, docs: { items: [] as unknown[], templates: [] as unknown[] },
  svc: { inboxCounts: vi.fn(), recycleBin: vi.fn(), deletionRequests: vi.fn(), deletedDocuments: vi.fn(), restore: vi.fn(), moveToTrash: vi.fn() },
}));

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Acme", accentColor: "#0078D4", role: "owner" } }),
}));
vi.mock("../../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));
vi.mock("../../../../hooks/usePlans", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../../hooks/usePlans")>()),
  useWorkspaceAllows: () => plan.paid,
}));
vi.mock("../../../../services/real/signing-request.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/signing-request.service")>();
  return { ...actual, realSigningRequestService: {
    ...actual.realSigningRequestService,
    list: (...args: unknown[]) => listRequests(...args) as unknown,
    cancel: (...args: unknown[]) => cancel(...args) as unknown,
    audit: () => Promise.reject(new Error("offline")),
  } };
});
vi.mock("../../../../services/real/document.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document.service")>();
  return { ...actual, realDocumentService: { ...actual.realDocumentService, list: () => Promise.resolve({ items: docs.items, total: docs.items.length, page: 1, perPage: 100, hasNextPage: false }) } };
});
vi.mock("../../../../services/real/templates.service", () => ({
  realTemplatesService: { list: () => Promise.resolve(docs.templates) },
}));
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return { ...actual, realMySigningService: { documentsToSign: () => Promise.resolve([]), signedDocuments: () => Promise.resolve([]) } };
});
vi.mock("../../../../services/real/document-lifecycle.service", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../../services/real/document-lifecycle.service")>()),
  documentLifecycleService: svc,
}));

import { DocumentsPage } from "../DocumentsPage";

const request = (state: string, title: string, id: string) => ({
  signingRequestId: id, documentId: `doc_${id}`, documentTitle: title, state,
  participantCount: 2, completedParticipantCount: 0, initiator: null,
  createdAt: "2026-10-02T00:00:00.000Z", sentAt: "2026-10-02T00:00:00.000Z", completedAt: null, expiresAt: null,
});
const ALL = [request("sent", "Lease out for signature", "sr_out"), request("cancelled", "Withdrawn offer", "sr_can")];

beforeEach(() => {
  plan.paid = true; docs.items = []; docs.templates = [];
  for (const fn of Object.values(svc)) { fn.mockReset(); fn.mockResolvedValue(undefined); }
  svc.inboxCounts.mockResolvedValue({ sign: 0, approve: 2, review: 0, acknowledge: 1 });
  svc.recycleBin.mockResolvedValue([]); svc.deletionRequests.mockResolvedValue([]); svc.deletedDocuments.mockResolvedValue([]);
  cancel.mockReset(); cancel.mockResolvedValue({});
  listRequests.mockReset();
  listRequests.mockImplementation((_ws: string, opts: { states?: string[] } = {}) => {
    const items = ALL.filter(r => !opts.states || opts.states.includes(r.state));
    return Promise.resolve({ items, total: items.length, page: 1, perPage: 50, hasNextPage: false });
  });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
});

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><DocumentsPage /></MemoryRouter>);

describe("Documents: cancel, restore and the Recycle Bin", () => {
  it("each inbox shows how many documents wait there", async () => {
    renderAt("/app/documents");
    const tabs = screen.getByRole("tablist", { name: "Document lists" });
    await waitFor(() => { expect(within(tabs).getByRole("tab", { name: /I must approve/ }).textContent?.trim()).toBe("I must approve2"); });
    expect(within(tabs).getByRole("tab", { name: /Acknowledgement/ }).textContent?.trim()).toBe("Acknowledgement1");
    expect(within(tabs).getByRole("tab", { name: /I must review/ }).textContent?.trim()).toBe("I must review");
  });

  it("a sent document that is still out can be cancelled, with a reason, and no cancelled one sits in Sent", async () => {
    const user = userEvent.setup();
    renderAt("/app/documents?list=sent");
    await user.click(await screen.findByRole("button", { name: "Cancel Lease out for signature" }));
    expect(screen.queryByText("Withdrawn offer")).toBeNull();
    const confirm = screen.getByRole("alertdialog");
    expect(cancel).not.toHaveBeenCalled();
    await user.type(within(confirm).getByLabelText(/Reason for cancelling/), "Wrong version");
    await user.click(within(confirm).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(cancel).toHaveBeenCalledWith("ws_1", "sr_out", "Wrong version"); });
  });

  it("Cancelled lists what was cancelled, with Move to Trash in the card's corner", async () => {
    const user = userEvent.setup();
    renderAt("/app/documents?list=cancelled");
    expect(screen.getByRole("tab", { name: /Cancelled/ })).toHaveAttribute("aria-selected", "true");
    await screen.findByText("Withdrawn offer");
    expect(screen.queryByText("Lease out for signature")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Move to Trash: Withdrawn offer" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(svc.moveToTrash).toHaveBeenCalledWith("ws_1", "sr_can"); });
  });

  it("the Recycle Bin button counts what is in the bin and opens it; a bell link opens it too", async () => {
    const user = userEvent.setup();
    svc.recycleBin.mockResolvedValue([{
      signingRequestId: "sr_t", documentId: "doc_t", documentTitle: "Old NDA", state: "completed", trashedAt: "2026-10-06T02:00:00.000Z",
      trashedBy: { userId: "u_1", displayName: "Ben", avatarVersion: null }, completedAt: null, cancelledAt: null, participantCount: 2,
      deletionRequest: null, actions: ["restore", "delete"],
    }]);
    const view = renderAt("/app/documents");
    await user.click(await screen.findByRole("button", { name: "Recycle Bin, 1 item" }));
    expect(await screen.findByTestId("recycle-bin-item")).toHaveTextContent("Old NDA");
    view.unmount();
    renderAt("/app/documents?bin=open");
    expect(await screen.findByTestId("recycle-bin-item")).toHaveTextContent("Old NDA");
  });

  it("a template's own document is not listed among the drafts", async () => {
    // It is what every use of the template is copied from. Shown as a draft it
    // had a Delete button that could never work.
    const doc = (id: string, title: string) => ({
      documentId: id, workspaceId: "ws_1", title, originalFilename: null, createdByUserId: "u", folderId: null,
      createdAt: "2026-10-05T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z", source: null, verificationId: null,
    });
    docs.items = [doc("doc_draft", "Lease draft"), doc("doc_tpl", "Service Agreement (generated)")];
    docs.templates = [{ workflowTemplateId: "wft_1", name: "Service Agreement", documentId: "doc_tpl" }, { workflowTemplateId: "wft_2", name: "No document yet", documentId: null }];
    renderAt("/app/documents?list=draft");
    expect(await screen.findByText("Lease draft")).toBeInTheDocument();
    expect(screen.queryByText("Service Agreement (generated)")).toBeNull();
    expect(screen.getByRole("button", { name: "Delete draft: Lease draft" })).toBeInTheDocument();
  });

  it("the Free plan has no Recycle Bin, and Move to Trash explains what is needed", async () => {
    const user = userEvent.setup();
    plan.paid = false;
    renderAt("/app/documents?list=cancelled");
    await screen.findByText("Withdrawn offer");
    expect(screen.queryByRole("button", { name: /Recycle Bin/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Move to Trash: Withdrawn offer" }));
    expect(screen.getByTestId("plan-required-dialog")).toBeInTheDocument();
    expect(svc.moveToTrash).not.toHaveBeenCalled();
  });
});
