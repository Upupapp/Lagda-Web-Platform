// Cancel, restore, the Recycle Bin, deletion requests and the notice left for
// people who had access: the confirmation every action goes through, and what
// each person is offered.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Trash2 } from "lucide-react";

const { svc, cancel } = vi.hoisted(() => ({ cancel: vi.fn(), svc: {
  recycleBin: vi.fn(), deletionRequests: vi.fn(), deleteFromBin: vi.fn(), restoreFromBin: vi.fn(),
  approveDeletion: vi.fn(), disapproveDeletion: vi.fn(), moveToTrash: vi.fn(), restore: vi.fn(),
  deleteRequest: vi.fn(), deleteDraftDocument: vi.fn(), removeFromSignedByMe: vi.fn(),
  deletedDocuments: vi.fn(), removeDeletedDocument: vi.fn(), inboxCounts: vi.fn(),
} }));
vi.mock("../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../services/real/document-lifecycle.service", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../services/real/document-lifecycle.service")>()),
  documentLifecycleService: svc,
}));
vi.mock("../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { cancel: (...a: unknown[]) => cancel(...a) as unknown },
}));

// The bin draws each document on the Completed card, which reads the workspace's branding.
vi.mock("../../../pages/platform/documents/CompletedDocumentCards", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../pages/platform/documents/CompletedDocumentCards")>()),
  useDocumentCardBranding: () => ({ displayName: "Reyes Law", primaryColor: "#1B7A3A", logoUrl: null }),
}));
vi.mock("../../../services/real/document.service", () => ({
  realDocumentService: { list: () => Promise.resolve({ items: [{ documentId: "doc_1", verificationId: "LAGDA-VER-2026-TEST" }], total: 1, page: 1, perPage: 100, hasNextPage: false }) },
}));

import { LifecycleConfirmDialog } from "../LifecycleConfirmDialog";
import { useDocumentLifecycle, lifecycleCopy, lifecycleErrorMessage, type LifecycleAction } from "../useDocumentLifecycle";
import { RecycleBinButton, RecycleBinPanel } from "../RecycleBin";
import { DeletedDocumentCard, DeletionDetailsPanel, type DeletedDocumentInfo } from "../DeletedDocument";
import { DeletedDocumentsBlock } from "../DeletedDocumentsBlock";
import { ApiError } from "../../../services/api-client";

beforeEach(() => {
  for (const fn of Object.values(svc)) { fn.mockReset(); fn.mockResolvedValue(undefined); }
  svc.recycleBin.mockResolvedValue([]); svc.deletionRequests.mockResolvedValue([]); svc.deletedDocuments.mockResolvedValue([]);
  svc.deleteFromBin.mockResolvedValue({ outcome: "deleted" });
  cancel.mockReset(); cancel.mockResolvedValue({});
});

function Host({ action, freePlan = false, onDone }: { action: LifecycleAction; freePlan?: boolean; onDone?: (a: LifecycleAction) => void }) {
  const lifecycle = useDocumentLifecycle({ freePlan, ...(onDone ? { onDone } : {}) });
  return <MemoryRouter><button onClick={() => { lifecycle.ask(action); }}>go</button>{lifecycle.element}</MemoryRouter>;
}

describe("the confirmation", () => {
  it("is centred, has exactly Cancel and Continue, and starts on Cancel", () => {
    render(<LifecycleConfirmDialog subject="NDA.pdf" onCancel={() => {}} onContinue={() => {}}
      copy={{ title: "Move to the Recycle Bin?", lead: "It leaves your lists.", icon: Trash2 }} />);
    const dialog = screen.getByRole("alertdialog", { name: "Move to the Recycle Bin?" });
    expect(within(dialog).getAllByRole("button").map(b => b.textContent)).toEqual(["Cancel", "Continue"]);
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    const scrim = screen.getByTestId("lifecycle-confirm-scrim");
    expect([scrim.style.position, scrim.style.alignItems, scrim.style.justifyContent]).toEqual(["fixed", "center", "center"]);
  });

  it("keeps Continue off until a required reason is written, and hands the reason on", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<LifecycleConfirmDialog subject="NDA.pdf" onCancel={() => {}} onContinue={onContinue}
      copy={{ title: "Delete?", lead: "Gone for good.", icon: Trash2, tone: "danger", reason: { label: "Reason for deleting", placeholder: "Why?" } }} />);
    const go = screen.getByRole("button", { name: "Continue" });
    expect(go).toBeDisabled();
    await user.type(screen.getByLabelText(/Reason for deleting/), "   ");
    expect(go).toBeDisabled();
    await user.type(screen.getByLabelText(/Reason for deleting/), "Superseded by the new version");
    await user.click(go);
    expect(onContinue).toHaveBeenCalledWith("Superseded by the new version");
  });

  it.each<[LifecycleAction["kind"], boolean]>([
    ["cancel", true], ["restore", false], ["trash", true], ["delete-draft", false], ["delete-ended", false],
    ["bin-restore", false], ["bin-delete", true], ["bin-request-deletion", true], ["approve-deletion", true],
    ["disapprove-deletion", false], ["remove-signed", false], ["remove-notice", false],
  ])("%s asks for a reason: %s", (kind, needsReason) => {
    const action = { kind, workspaceId: "ws", signingRequestId: "sr", documentId: "doc", requestId: "dr", id: "dd", title: "NDA.pdf", state: "completed", requester: "Ben" } as unknown as LifecycleAction;
    const copy = lifecycleCopy(action);
    expect(copy.reason !== undefined).toBe(needsReason);
    expect(copy.lead).toMatch(/^By choosing Continue/);
  });

  it("moving a cancelled document to the bin asks for no second reason", () => {
    const copy = lifecycleCopy({ kind: "trash", workspaceId: "ws", signingRequestId: "sr", title: "NDA.pdf", state: "cancelled" });
    expect(copy.reason).toBeUndefined();
  });

  it("an owner deleting for good is reminded that keeping records is theirs to do", () => {
    const copy = lifecycleCopy({ kind: "bin-delete", workspaceId: "ws", signingRequestId: "sr", title: "NDA.pdf" });
    expect(copy.points?.join(" ")).toMatch(/Keeping records is your responsibility/);
    expect(copy.points?.join(" ")).toMatch(/cannot be undone/);
  });
});

describe("running an action", () => {
  it("asks first, then cancels with the reason and reports back", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<Host action={{ kind: "cancel", workspaceId: "ws_1", signingRequestId: "sr_1", title: "Lease" }} onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "go" }));
    expect(cancel).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Reason for cancelling/), "Wrong version sent");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(cancel).toHaveBeenCalledWith("ws_1", "sr_1", "Wrong version sent"); });
    await waitFor(() => { expect(onDone).toHaveBeenCalled(); });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("Cancel does nothing", async () => {
    const user = userEvent.setup();
    render(<Host action={{ kind: "trash", workspaceId: "ws_1", signingRequestId: "sr_1", title: "Lease", state: "completed" }} />);
    await user.click(screen.getByRole("button", { name: "go" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(svc.moveToTrash).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("a completed document goes to the bin only with a reason, which is sent", async () => {
    const user = userEvent.setup();
    svc.moveToTrash.mockResolvedValue(undefined);
    render(<Host action={{ kind: "trash", workspaceId: "ws_1", signingRequestId: "sr_1", title: "Lease", state: "completed" }} />);
    await user.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.type(screen.getByLabelText(/Reason for moving it to the bin/), "Replaced by the signed renewal");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(svc.moveToTrash).toHaveBeenCalledWith("ws_1", "sr_1", "Replaced by the signed renewal"); });
  });

  it("on the Free plan, explains what is needed instead of asking", async () => {
    const user = userEvent.setup();
    render(<Host freePlan action={{ kind: "trash", workspaceId: "ws_1", signingRequestId: "sr_1", title: "Lease", state: "completed" }} />);
    await user.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByTestId("plan-required-dialog")).toHaveTextContent("Deleting documents needs the Personal plan");
    expect(svc.moveToTrash).not.toHaveBeenCalled();
  });

  it("the Free plan may still delete a draft and tidy its own lists", async () => {
    const user = userEvent.setup();
    render(<Host freePlan action={{ kind: "delete-draft", workspaceId: "ws_1", documentId: "doc_1", title: "Draft" }} />);
    await user.click(screen.getByRole("button", { name: "go" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(svc.deleteDraftDocument).toHaveBeenCalledWith("ws_1", "doc_1"); });
  });

  it("shows the server's refusal inside the dialog, in plain words", async () => {
    const user = userEvent.setup();
    svc.moveToTrash.mockRejectedValue(new ApiError(409, { code: "cancel_first", message: "x" }, "x"));
    render(<Host action={{ kind: "trash", workspaceId: "ws_1", signingRequestId: "sr_1", title: "Lease", state: "cancelled" }} />);
    await user.click(screen.getByRole("button", { name: "go" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("still out for signature. Cancel it first.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("says which template owns a document, in the server's own words", () => {
    const said = "This is the document of the template “Service Agreement”. To remove it, delete the template.";
    expect(lifecycleErrorMessage(new ApiError(409, { code: "document_in_use", message: said }, "x"))).toBe(said);
  });

  it("a request already waiting on the owner is said plainly", () => {
    expect(lifecycleErrorMessage(new ApiError(409, { code: "deletion_request_pending", message: "x" }, "x"))).toMatch(/already asked the owner/);
  });
});

const person = (name: string) => ({ userId: `u_${name}`, displayName: name, avatarVersion: null });
const binItem = (over: Record<string, unknown> = {}) => ({
  signingRequestId: "sr_1", documentId: "doc_1", documentTitle: "Lease Agreement", state: "completed",
  trashedAt: "2026-10-06T02:00:00.000Z", trashedBy: person("Ben"), completedAt: "2026-10-01T00:00:00.000Z", cancelledAt: null,
  participantCount: 3, deletionRequest: null, actions: ["restore", "delete"], ...over,
});
const renderBin = (isOwner: boolean) => render(
  <MemoryRouter><RecycleBinPanel workspaceId="ws_1" isOwner={isOwner} freePlan={false} onClose={() => {}} onChanged={() => {}} /></MemoryRouter>);

describe("the Recycle Bin", () => {
  it("the button is a labelled round control with a count", () => {
    render(<RecycleBinButton count={3} onClick={() => {}} />);
    const button = screen.getByRole("button", { name: "Recycle Bin, 3 items" });
    expect(button.style.borderRadius).toBe("50%");
    expect(screen.getByTestId("recycle-bin-count")).toHaveTextContent("3");
  });

  it("shows why a completed document was moved to the bin", async () => {
    svc.recycleBin.mockResolvedValue([binItem({ trashedReason: "Replaced by the signed renewal" }), binItem({ signingRequestId: "sr_2", documentId: "doc_2", state: "cancelled", trashedReason: null })]);
    renderBin(true);
    const reasons = await screen.findAllByTestId("recycle-bin-reason");
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toHaveTextContent("Reason: Replaced by the signed renewal");
  });

  it("the owner may restore or permanently delete, and deleting needs their reason", async () => {
    const user = userEvent.setup();
    svc.recycleBin.mockResolvedValue([binItem()]);
    renderBin(true);
    const item = await screen.findByTestId("recycle-bin-item");
    expect(within(item).getByText(/Moved here by Ben/)).toBeInTheDocument();
    // Drawn as the branded Completed card: banner, Verification ID, progress.
    expect(within(item).getByTestId("completed-card-banner-name")).toHaveTextContent("Reyes Law");
    expect(await within(item).findByText("LAGDA-VER-2026-TEST")).toBeInTheDocument();
    expect(within(item).getByTestId("completed-card-progress")).toHaveTextContent("3 of 3 signed");
    expect(screen.getByTestId("recycle-bin-total")).toHaveTextContent("1 document");
    await user.click(within(item).getByRole("button", { name: /Permanently Delete/ }));
    const confirm = screen.getByRole("alertdialog", { name: "Permanently delete this document?" });
    expect(within(confirm).getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.type(within(confirm).getByLabelText(/Reason for deleting/), "Superseded");
    await user.click(within(confirm).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(svc.deleteFromBin).toHaveBeenCalledWith("ws_1", "sr_1", "Superseded"); });
  });

  it("keeps the cursor in the reason box when the page behind refreshes", async () => {
    // The page re-renders on a timer, handing the panel a new `onClose`. That
    // used to move the focus to Close, and the next space typed closed the bin.
    const user = userEvent.setup();
    svc.recycleBin.mockResolvedValue([binItem()]);
    const panel = (onClose: () => void) => (
      <MemoryRouter><RecycleBinPanel workspaceId="ws_1" isOwner freePlan={false} onClose={onClose} onChanged={() => {}} /></MemoryRouter>);
    const onClose = vi.fn();
    const view = render(panel(() => { onClose(); }));
    await user.click(within(await screen.findByTestId("recycle-bin-item")).getByRole("button", { name: /Permanently Delete/ }));
    const reason = screen.getByLabelText(/Reason for deleting/);
    await user.type(reason, "No longer");
    view.rerender(panel(() => { onClose(); }));
    expect(reason).toHaveFocus();
    await user.keyboard(" needed");
    expect(reason).toHaveValue("No longer needed");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a cancelled document has its own badge and no Verification ID line; an empty bin says so in the middle", async () => {
    svc.recycleBin.mockResolvedValue([binItem({ state: "cancelled", completedAt: null, cancelledAt: "2026-10-05T00:00:00.000Z" })]);
    const view = renderBin(true);
    const item = await screen.findByTestId("recycle-bin-item");
    expect(within(item).getByText("Cancelled")).toBeInTheDocument();
    expect(within(item).queryByText("Verification ID")).toBeNull();
    expect(within(item).queryByTestId("completed-card-progress")).toBeNull();
    view.unmount();
    svc.recycleBin.mockResolvedValue([]);
    renderBin(true);
    expect(await screen.findByTestId("recycle-bin-empty")).toHaveTextContent("The Recycle Bin is empty");
  });

  it("a member's delete is a request to the owner, and a pending one says so", async () => {
    const user = userEvent.setup();
    svc.recycleBin.mockResolvedValue([
      binItem({ actions: ["restore", "request-deletion"] }),
      binItem({ signingRequestId: "sr_2", documentTitle: "NDA", actions: ["restore"], deletionRequest: { requestId: "dr_2", status: "pending", requestedAt: "2026-10-06T03:00:00.000Z", requestedBy: person("Ben"), reason: "Old" } }),
    ]);
    renderBin(false);
    const items = await screen.findAllByTestId("recycle-bin-item");
    expect(within(items[0]!).queryByRole("button", { name: /Permanently Delete/ })).toBeNull();
    expect(within(items[1]!).getByTestId("pending-owner")).toHaveTextContent("Pending the owner");
    expect(within(items[1]!).queryByTestId("bin-request-deletion")).toBeNull();
    // Members never see the owner's requests section.
    expect(screen.queryByTestId("deletion-requests")).toBeNull();
    expect(svc.deletionRequests).not.toHaveBeenCalled();

    await user.click(within(items[0]!).getByTestId("bin-request-deletion"));
    const confirm = screen.getByRole("alertdialog", { name: "Ask the owner to delete this document?" });
    expect(confirm).toHaveTextContent("Only the workspace owner can permanently delete a document");
    await user.type(within(confirm).getByLabelText(/Reason for the request/), "Duplicate");
    await user.click(within(confirm).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(svc.deleteFromBin).toHaveBeenCalledWith("ws_1", "sr_1", "Duplicate"); });
  });

  it("the owner sees deletion requests with the member's reason, and approves with their OWN reason", async () => {
    const user = userEvent.setup();
    svc.recycleBin.mockResolvedValue([binItem()]);
    svc.deletionRequests.mockResolvedValue([{
      requestId: "dr_1", signingRequestId: "sr_1", documentTitle: "Lease Agreement", state: "completed", status: "pending",
      reason: "Client asked us to remove it", requestedBy: person("Ben"), requestedAt: "2026-10-06T03:00:00.000Z", trashedAt: null, decidedAt: null,
    }]);
    renderBin(true);
    const request = await screen.findByTestId("deletion-request");
    expect(request).toHaveTextContent("Client asked us to remove it");
    // The same branded card as Records › Completed, with the owner's two decisions on it.
    expect(within(request).getByTestId("completed-card-banner-name")).toHaveTextContent("Reyes Law");
    expect(within(request).getByText("LAGDA-VER-2026-TEST")).toBeInTheDocument();
    expect(within(request).getAllByRole("button").map(b => b.textContent?.trim()).filter(Boolean)).toEqual(["Disapprove Deletion", "Approve Deletion"]);
    // Decided in its own section, so it is not listed a second time below.
    expect(screen.queryByTestId("recycle-bin-item")).toBeNull();

    await user.click(within(request).getByRole("button", { name: "Approve Deletion" }));
    const confirm = screen.getByRole("alertdialog", { name: "Approve this deletion?" });
    expect(confirm).toHaveTextContent("YOUR reason, not the requester's");
    await user.type(within(confirm).getByLabelText(/Your reason for deleting/), "Agreed, it is obsolete");
    await user.click(within(confirm).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(svc.approveDeletion).toHaveBeenCalledWith("ws_1", "dr_1", "Agreed, it is obsolete"); });
  });

  it("disapproving keeps the document, with no reason asked", async () => {
    const user = userEvent.setup();
    svc.deletionRequests.mockResolvedValue([{
      requestId: "dr_1", signingRequestId: "sr_1", documentTitle: "Lease Agreement", state: "completed", status: "pending",
      reason: "Old", requestedBy: person("Ben"), requestedAt: "2026-10-06T03:00:00.000Z", trashedAt: null, decidedAt: null,
    }]);
    renderBin(true);
    await user.click(await screen.findByRole("button", { name: "Disapprove Deletion" }));
    const confirm = screen.getByRole("alertdialog", { name: "Disapprove this deletion?" });
    expect(confirm).toHaveTextContent("stays in the Recycle Bin, where it can be restored");
    await user.click(within(confirm).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(svc.disapproveDeletion).toHaveBeenCalledWith("ws_1", "dr_1"); });
  });
});

const info: DeletedDocumentInfo = {
  id: "dd_1", title: "Service Agreement", deletedAt: "2026-10-06T03:20:00.000Z", reason: "Superseded by the new version.",
  owner: { name: "Christopher Cortes" }, workspace: { name: "Reyes Law", primaryColor: "#1B7A3A", logoUrl: null },
};

describe("what is left for people who had access", () => {
  it("the card keeps the workspace's banner, says Deleted Document, and offers View Details", async () => {
    const user = userEvent.setup();
    const onViewDetails = vi.fn();
    render(<ul><DeletedDocumentCard info={info} onViewDetails={onViewDetails} onRemove={() => {}} /></ul>);
    const card = screen.getByTestId("deleted-document-card");
    expect(card).toHaveTextContent("Reyes Law");
    expect(card).toHaveTextContent("Deleted Document");
    expect(within(card).getByRole("heading", { name: "Service Agreement" })).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "View Details" }));
    expect(onViewDetails).toHaveBeenCalled();
    expect(within(card).getByRole("button", { name: "Remove Service Agreement from my list" })).toBeInTheDocument();
  });

  it("the details show the workspace, the owner by name, and the owner's reason, in the centre", () => {
    render(<DeletionDetailsPanel info={info} onClose={() => {}} />);
    const panel = screen.getByRole("dialog", { name: "Service Agreement" });
    expect(panel).toHaveTextContent("Notice from");
    expect(panel).toHaveTextContent("Reyes Law");
    expect(panel).toHaveTextContent("Christopher Cortes");
    expect(within(panel).getByTestId("deletion-reason")).toHaveTextContent("Superseded by the new version.");
    const scrim = screen.getByTestId("deletion-details-scrim");
    expect([scrim.style.alignItems, scrim.style.justifyContent]).toEqual(["center", "center"]);
  });

  it("a list shows only the notices that belong to it, and removing one asks first", async () => {
    const user = userEvent.setup();
    const record = (id: string, origin: string, title: string) => ({
      id, documentTitle: title, kind: "completed", deletedAt: "2026-10-06T03:20:00.000Z", reason: "Old",
      workspace: { name: "Reyes Law", primaryColor: null, logo: null },
      deletedBy: { displayName: "Chris", avatarVersion: null, avatarUrl: null },
      signingRequestId: null, verificationId: null, origin,
    });
    svc.deletedDocuments.mockResolvedValue([record("dd_1", "shared-with-me", "Shared one"), record("dd_2", "signed-by-me", "Signed one")]);
    render(<MemoryRouter><DeletedDocumentsBlock origins={["shared-with-me"]} heading="Deleted by the owner" /></MemoryRouter>);
    const card = await screen.findByTestId("deleted-document-card");
    expect(card).toHaveTextContent("Shared one");
    expect(screen.queryByText("Signed one")).toBeNull();
    await user.click(within(card).getByRole("button", { name: /Remove Shared one from my list/ }));
    await user.click(within(screen.getByRole("alertdialog", { name: "Remove this notice?" })).getByRole("button", { name: "Continue" }));
    await waitFor(() => { expect(svc.removeDeletedDocument).toHaveBeenCalledWith("dd_1"); });
  });
});
