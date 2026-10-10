// The Prepare entry page and the one draft slot.
//
// "Start preparation" used to replace a draft in progress without a word; it
// now asks, with three choices. And "Resume a draft" used to list only the
// requests still in `draft` state, so a document uploaded and prepared but
// never sent appeared in Documents › Draft and was missing here. It now shows
// the same drafts, read through the same shared list.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const { createDraft, deleteDraftEverywhere, saveTitle, prepare, stable } = vi.hoisted(() => {
  const createDraft = vi.fn();
  const deleteDraftEverywhere = vi.fn();
  const saveTitle = vi.fn();
  const prepare: { draft: unknown } = { draft: null };
  const stable = {
    createDraft: (...args: unknown[]) => createDraft(...args) as unknown,
    deleteDraftEverywhere: (...args: unknown[]) => deleteDraftEverywhere(...args) as unknown,
    saveTitle: (...args: unknown[]) => saveTitle(...args) as unknown,
  };
  return { createDraft, deleteDraftEverywhere, saveTitle, prepare, stable };
});
vi.mock("../../../../context/PrepareContext", () => ({
  usePrepare: () => ({ draft: prepare.draft, ...stable }),
}));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" }, hasFlag: () => true }),
}));
vi.mock("../../../../context/PendingPreparationContext", () => ({
  usePendingPreparation: () => ({ claimPending: () => null }),
}));
vi.mock("../../../../services/processing.service", async (original) => ({
  ...(await original<typeof import("../../../../services/processing.service")>()),
  useProcessing: () => ({
    run: (_options: unknown, work: (tools: { update: () => void }) => Promise<unknown>) => work({ update: () => undefined }),
  }),
}));

const listDocuments = vi.fn();
const listRequests = vi.fn();
const listTemplates = vi.fn();
vi.mock("../../../../services/real/document.service", () => ({
  realDocumentService: { list: (...args: unknown[]) => listDocuments(...args) as unknown },
}));
vi.mock("../../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { list: (...args: unknown[]) => listRequests(...args) as unknown },
}));
vi.mock("../../../../services/real/templates.service", () => ({
  realTemplatesService: { list: (...args: unknown[]) => listTemplates(...args) as unknown },
}));

import { PrepareEntryPage, draftChangedLabel } from "../PrepareEntryPage";
import { ApiError } from "../../../../services/api-client";
import { draftSources } from "../../../../services/documents/draft-list";

const doc = (id: string, title: string, updatedAt: string, originalFilename: string | null = `${id}.pdf`) => ({
  documentId: id, title, originalFilename, createdByUserId: "u1", folderId: null,
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt, source: null,
});
const request = (id: string, documentId: string, state: string, documentTitle = "") => ({
  signingRequestId: id, documentId, documentTitle, state, participantCount: 1, completedParticipantCount: 0,
  initiator: null, createdAt: "2026-10-02T00:00:00.000Z", sentAt: null, completedAt: null, expiresAt: null,
});
const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, perPage: 100, hasNextPage: false });

const unfinished = (over: { title?: string; documentId?: string } = {}) => ({
  id: "draft_a",
  details: { title: over.title ?? "Lease A", description: "", folderId: null, tagIds: [] },
  participants: [],
  files: [{
    id: "f1", fileName: "lease-a.pdf", fileSizeBytes: 10, mimeType: "application/pdf", fileState: "ready", order: 0,
    ...(over.documentId === undefined ? {} : { backendDocumentId: over.documentId }),
  }],
});

function Where() {
  const location = useLocation();
  return <span data-testid="where">{location.pathname}{location.search}</span>;
}
function open() {
  render(
    <MemoryRouter initialEntries={["/app/prepare"]}>
      <Where />
      <Routes>
        <Route path="/app/prepare" element={<PrepareEntryPage />} />
        <Route path="/app/prepare/upload" element={<p>Documents step</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const where = () => screen.getByTestId("where").textContent ?? "";
const start = () => screen.getByRole("button", { name: /Start preparation/ });

beforeEach(() => {
  prepare.draft = null;
  createDraft.mockResolvedValue("draft_new");
  deleteDraftEverywhere.mockResolvedValue(undefined);
  saveTitle.mockResolvedValue({ status: "skipped" });
  listDocuments.mockResolvedValue(page([]));
  listRequests.mockResolvedValue(page([]));
  listTemplates.mockResolvedValue([]);
});

describe("Start preparation with an unfinished draft", () => {
  it("starts at once when there is no draft", async () => {
    open();
    await userEvent.click(start());
    await waitFor(() => { expect(where()).toBe("/app/prepare/upload"); });
    expect(createDraft).toHaveBeenCalledWith({ source: "new" });
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
  });

  it("does not ask about an empty draft: no file, no participants, no title", async () => {
    prepare.draft = { id: "draft_empty", details: { title: " ", description: "", folderId: null, tagIds: [] }, participants: [], files: [] };
    open();
    await userEvent.click(start());
    await waitFor(() => { expect(createDraft).toHaveBeenCalledTimes(1); });
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
  });

  it("asks first, with three choices, and replaces nothing yet", async () => {
    prepare.draft = unfinished({ documentId: "doc_a" });
    open();
    await userEvent.click(start());
    const dialog = screen.getByTestId("unfinished-draft-dialog");
    expect(dialog.textContent ?? "").toContain("You have an unfinished document: “Lease A”.");
    expect(within(dialog).getAllByRole("button").map(button => button.textContent)).toEqual([
      "Continue that one",
      "Start a new one and keep that as a draft",
      "Discard it and start a new one",
    ]);
    // The safe choice has the focus.
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Continue that one" }));
    expect(createDraft).not.toHaveBeenCalled();
  });

  it("Continue that one: goes back to it and creates nothing", async () => {
    prepare.draft = unfinished({ documentId: "doc_a" });
    open();
    await userEvent.click(start());
    await userEvent.click(screen.getByRole("button", { name: "Continue that one" }));
    expect(where()).toBe("/app/prepare/upload");
    expect(createDraft).not.toHaveBeenCalled();
    expect(deleteDraftEverywhere).not.toHaveBeenCalled();
  });

  it("Keep as a draft: starts a new one and deletes nothing on the server", async () => {
    prepare.draft = unfinished({ documentId: "doc_a" });
    open();
    await userEvent.click(start());
    await userEvent.click(screen.getByRole("button", { name: "Start a new one and keep that as a draft" }));
    await waitFor(() => { expect(where()).toBe("/app/prepare/upload"); });
    expect(createDraft).toHaveBeenCalledWith({ source: "new" });
    expect(deleteDraftEverywhere).not.toHaveBeenCalled();
  });

  it("Discard: deletes it, then starts a new one", async () => {
    const order: string[] = [];
    deleteDraftEverywhere.mockImplementation(() => { order.push("delete"); return Promise.resolve(); });
    createDraft.mockImplementation(() => { order.push("create"); return Promise.resolve("draft_new"); });
    prepare.draft = unfinished({ documentId: "doc_a" });
    open();
    await userEvent.click(start());
    await userEvent.click(screen.getByRole("button", { name: "Discard it and start a new one" }));
    await waitFor(() => { expect(where()).toBe("/app/prepare/upload"); });
    expect(order).toEqual(["delete", "create"]);
  });

  it("Discard that fails keeps the draft, says so, and starts nothing", async () => {
    deleteDraftEverywhere.mockRejectedValue(new ApiError(0, undefined, "Network error"));
    prepare.draft = unfinished({ documentId: "doc_a" });
    open();
    await userEvent.click(start());
    await userEvent.click(screen.getByRole("button", { name: "Discard it and start a new one" }));
    expect((await screen.findByRole("alert")).textContent ?? "").toBe(
      "That draft was not deleted, so it has been kept. Check your connection and try again.");
    expect(createDraft).not.toHaveBeenCalled();
    expect(where()).toBe("/app/prepare");
    // The same button tries again.
    deleteDraftEverywhere.mockResolvedValue(undefined);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => { expect(createDraft).toHaveBeenCalledTimes(1); });
  });

  it("closing the question changes nothing", async () => {
    prepare.draft = unfinished({ documentId: "doc_a" });
    open();
    await userEvent.click(start());
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("unfinished-draft-dialog")).toBeNull();
    expect(createDraft).not.toHaveBeenCalled();
    expect(where()).toBe("/app/prepare");
  });
});

describe("Resume a draft", () => {
  it("lists the same drafts as Documents › Draft: unsent documents as well as unsent requests", async () => {
    listDocuments.mockResolvedValue(page([
      doc("doc_unsent", "Deed of Sale", "2026-10-08T06:15:00.000Z", "deed-scan.pdf"),
      doc("doc_drafted", "Lease (2)", "2026-10-09T01:00:00.000Z", "lease.pdf"),
      doc("doc_sent", "Already sent", "2026-10-09T02:00:00.000Z"),
      doc("doc_template", "A template's own document", "2026-10-09T03:00:00.000Z"),
    ]));
    listRequests.mockResolvedValue(page([
      request("sr_1", "doc_drafted", "draft", "Lease (2)"),
      request("sr_2", "doc_sent", "sent", "Already sent"),
    ]));
    listTemplates.mockResolvedValue([{ id: "t1", documentId: "doc_template" }]);
    open();

    const list = await screen.findByTestId("prep-resume-list");
    const rows = within(list).getAllByRole("listitem");
    // Newest change first; the sent one and the template's own are not drafts.
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent ?? "").toContain("Lease (2)");
    expect(rows[1]!.textContent ?? "").toContain("Deed of Sale");
    // Title, file name and when it last changed.
    expect(rows[1]!.textContent ?? "").toContain("deed-scan.pdf");
    expect(rows[1]!.textContent ?? "").toContain(`Last changed ${draftChangedLabel("2026-10-08T06:15:00.000Z")}`);
    expect(screen.queryByText("Already sent")).toBeNull();
    expect(screen.queryByText("A template's own document")).toBeNull();
  });

  it("reads the lists under the keys Documents uses, so the two cannot disagree", async () => {
    open();
    await waitFor(() => { expect(listTemplates).toHaveBeenCalled(); });
    expect(listDocuments).toHaveBeenCalledWith("ws_1", { perPage: 100 });
    expect(listRequests).toHaveBeenCalledWith("ws_1", { perPage: 100 });
    expect(draftSources.filesKey("ws_1")).toBe("documents:files:ws_1");
    expect(draftSources.requestsKey("ws_1")).toBe("documents:all:ws_1");
    expect(draftSources.templateDocumentsKey("ws_1")).toBe("documents:template-documents:ws_1");
  });

  it("resumes through the existing ?resumeDocumentId= path", async () => {
    listDocuments.mockResolvedValue(page([doc("doc unsent", "Deed of Sale", "2026-10-08T06:15:00.000Z")]));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Resume Deed of Sale" }));
    expect(where()).toBe("/app/prepare/upload?resumeDocumentId=doc%20unsent");
  });

  it("shows no section when nothing is unfinished, or the lists cannot be read", async () => {
    listDocuments.mockRejectedValue(new Error("offline"));
    open();
    await waitFor(() => { expect(listDocuments).toHaveBeenCalled(); });
    expect(screen.queryByText("Resume a draft")).toBeNull();
    expect(start()).toBeInTheDocument();
  });
});
