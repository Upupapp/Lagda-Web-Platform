// The draft's title reaches the server EARLY, and "Discard draft" really
// deletes.
//
// The document is created with its file's name. The title the sender types
// used to be sent only at Send, with a failure swallowed; and discarding a
// draft used to clear this browser and leave the document on the server,
// still listed under Drafts. Both are pinned here against the real provider.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";

vi.mock("../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));

const rename = vi.fn();
vi.mock("../../services/real/document.service", () => ({
  realDocumentService: { rename: (...args: unknown[]) => rename(...args) as unknown },
}));
const deleteDraftDocument = vi.fn();
vi.mock("../../services/real/document-lifecycle.service", () => ({
  documentLifecycleService: { deleteDraftDocument: (...args: unknown[]) => deleteDraftDocument(...args) as unknown },
}));
const listRecipients = vi.fn();
vi.mock("../../services/real/recipient.service", () => ({
  realRecipientService: { list: (...args: unknown[]) => listRecipients(...args) as unknown },
}));
const loadResumableDraft = vi.fn();
vi.mock("../../services/real/resume-draft.service", () => ({
  loadResumableDraft: (...args: unknown[]) => loadResumableDraft(...args) as unknown,
}));

import { PrepareProvider, usePrepare } from "../PrepareContext";
import { DRAFT_BLANK } from "../../data/mock/prepare";
import { writeJSON, readJSON, PERSISTENCE_KEYS } from "../../services/local-persistence";
import { ApiError } from "../../services/api-client";
import type { PreparationDraft, PrepFile } from "../../models/prepare";

type Ctx = ReturnType<typeof usePrepare>;
let ctx: Ctx;
function Probe() {
  ctx = usePrepare();
  return null;
}

const file = (id: string, backendDocumentId?: string): PrepFile => ({
  id, fileName: `${id}.pdf`, fileSizeBytes: 1000, mimeType: "application/pdf", fileState: "ready", order: 0,
  ...(backendDocumentId === undefined ? {} : { backendDocumentId, uploadStatus: "uploaded" as const }),
});

function seed(over: Partial<PreparationDraft> = {}): PreparationDraft {
  const draft: PreparationDraft = {
    ...DRAFT_BLANK, id: "draft_test_1",
    files: [file("f1", "doc_1")],
    details: { ...DRAFT_BLANK.details, title: "Lease" },
    ...over,
  };
  writeJSON(PERSISTENCE_KEYS.prepareDraft, draft);
  return draft;
}

function mount() {
  render(<PrepareProvider><Probe /></PrepareProvider>);
}

/** A promise the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const saved = (title: string, titleAdjusted?: boolean) => ({ documentId: "doc_1", title, ...(titleAdjusted === undefined ? {} : { titleAdjusted }) });

beforeEach(() => {
  window.localStorage.clear();
  listRecipients.mockResolvedValue([]);
  rename.mockImplementation((_ws: string, _doc: string, title: string) => Promise.resolve(saved(title)));
  deleteDraftDocument.mockResolvedValue(undefined);
});

describe("saving the title early", () => {
  it("sends the typed title to the draft's document", async () => {
    seed();
    mount();
    expect(ctx.titleNeedsSave).toBe(true);
    let outcome: Awaited<ReturnType<Ctx["saveTitle"]>> | undefined;
    await act(async () => { outcome = await ctx.saveTitle(); });
    expect(rename).toHaveBeenCalledTimes(1);
    expect(rename).toHaveBeenCalledWith("ws_1", "doc_1", "Lease");
    expect(outcome).toEqual({ status: "saved", title: "Lease", adjusted: null });
    expect(ctx.titleSave.state).toBe("saved");
    expect(ctx.titleNeedsSave).toBe(false);
    expect(ctx.draft?.details.savedTitle).toEqual({ documentId: "doc_1", title: "Lease" });
  });

  it("does not send a title that is already saved", async () => {
    seed({ details: { ...DRAFT_BLANK.details, title: "Lease", savedTitle: { documentId: "doc_1", title: "Lease" } } });
    mount();
    expect(ctx.titleNeedsSave).toBe(false);
    await act(async () => { await ctx.saveTitle(); });
    expect(rename).not.toHaveBeenCalled();
  });

  it("waits for a document: nothing is sent before the file is on the server", async () => {
    seed({ files: [file("f1")] });
    mount();
    let outcome: Awaited<ReturnType<Ctx["saveTitle"]>> | undefined;
    await act(async () => { outcome = await ctx.saveTitle(); });
    expect(outcome).toEqual({ status: "skipped" });
    expect(rename).not.toHaveBeenCalled();
  });

  it("renames as soon as the document exists, for a title typed before the upload", async () => {
    seed({ files: [file("f1")] });
    mount();
    await act(async () => { await ctx.saveTitle(); });
    expect(rename).not.toHaveBeenCalled();
    // The upload creates the document under the FILE's name…
    act(() => {
      ctx.recordServerTitle("doc_9", "f1.pdf");
      ctx.updateFiles([file("f1", "doc_9")]);
    });
    expect(ctx.titleNeedsSave).toBe(true);
    // …and the typed title replaces it.
    await act(async () => { await ctx.saveTitle(); });
    expect(rename).toHaveBeenCalledWith("ws_1", "doc_9", "Lease");
  });

  it("leaves the title field alone when the server numbered the FILE's name", async () => {
    seed({ files: [file("f1")], details: { ...DRAFT_BLANK.details, title: "" } });
    mount();
    act(() => {
      ctx.recordServerTitle("doc_9", "f1.pdf (2)");
      ctx.updateFiles([file("f1", "doc_9")]);
    });
    // Nobody typed that: the field stays empty, nothing is renamed, no note.
    expect(ctx.draft?.details.title).toBe("");
    expect(ctx.titleSave).toEqual({ state: "idle", adjusted: null });
    expect(ctx.titleNeedsSave).toBe(false);
    await act(async () => { await ctx.saveTitle(); });
    expect(rename).not.toHaveBeenCalled();
  });

  it("never sends an empty title", async () => {
    seed({ details: { ...DRAFT_BLANK.details, title: "   " } });
    mount();
    expect(ctx.titleNeedsSave).toBe(false);
    await act(async () => { await ctx.saveTitle(); });
    expect(rename).not.toHaveBeenCalled();
  });

  it("runs saves one at a time, each with the title as it then stands", async () => {
    seed();
    mount();
    const first = deferred<ReturnType<typeof saved>>();
    rename.mockImplementationOnce(() => first.promise);

    let one!: Promise<unknown>, two!: Promise<unknown>;
    act(() => { one = ctx.saveTitle(); });
    await waitFor(() => { expect(rename).toHaveBeenCalledTimes(1); });
    // Typed on while the first save is still in flight, and asked again.
    act(() => { ctx.updateDetails({ ...ctx.draft!.details, title: "Lease 2026" }); });
    act(() => { two = ctx.saveTitle(); });
    // The second waits its turn: still one request.
    await Promise.resolve();
    expect(rename).toHaveBeenCalledTimes(1);

    await act(async () => { first.resolve(saved("Lease")); await one; await two; });
    expect(rename).toHaveBeenCalledTimes(2);
    expect(rename.mock.calls[1]).toEqual(["ws_1", "doc_1", "Lease 2026"]);
    // What was typed in the meantime was not overwritten by the first answer.
    expect(ctx.draft?.details.title).toBe("Lease 2026");
    expect(ctx.draft?.details.savedTitle).toEqual({ documentId: "doc_1", title: "Lease 2026" });
  });

  it("takes the server's title when it numbered a duplicate, and says what was typed", async () => {
    seed();
    mount();
    rename.mockResolvedValue(saved("Lease (2)", true));
    let outcome: Awaited<ReturnType<Ctx["saveTitle"]>> | undefined;
    await act(async () => { outcome = await ctx.saveTitle(); });
    expect(ctx.draft?.details.title).toBe("Lease (2)");
    expect(ctx.titleSave).toEqual({ state: "saved", adjusted: { typed: "Lease", saved: "Lease (2)" } });
    expect(outcome).toEqual({ status: "saved", title: "Lease (2)", adjusted: { typed: "Lease", saved: "Lease (2)" } });
    // The numbered title is the saved one: it is not sent again.
    expect(ctx.titleNeedsSave).toBe(false);
    await act(async () => { await ctx.saveTitle(); });
    expect(rename).toHaveBeenCalledTimes(1);
    // And it is what a refresh restores.
    expect(readJSON<PreparationDraft>(PERSISTENCE_KEYS.prepareDraft)?.details.title).toBe("Lease (2)");
  });

  it("treats a server that does not say `titleAdjusted` as saved as typed", async () => {
    seed();
    mount();
    rename.mockResolvedValue({ documentId: "doc_1", title: "lease" });
    await act(async () => { await ctx.saveTitle(); });
    expect(ctx.draft?.details.title).toBe("Lease");
    expect(ctx.titleSave.adjusted).toBeNull();
    expect(ctx.titleNeedsSave).toBe(false);
  });

  it("says so when the save fails, and does not pretend it was saved", async () => {
    seed();
    mount();
    rename.mockRejectedValue(new ApiError(0, undefined, "Network error"));
    let outcome: Awaited<ReturnType<Ctx["saveTitle"]>> | undefined;
    await act(async () => { outcome = await ctx.saveTitle(); });
    expect(outcome).toEqual({ status: "failed" });
    expect(ctx.titleSave.state).toBe("failed");
    expect(ctx.titleNeedsSave).toBe(true);
    expect(ctx.draft?.details.savedTitle).toBeUndefined();
    // Trying again works, and clears the failure.
    rename.mockResolvedValue(saved("Lease"));
    await act(async () => { await ctx.saveTitle(); });
    expect(ctx.titleSave.state).toBe("saved");
  });
});

describe("reopening a draft", () => {
  it("keeps the saved title and does not rename the document to its own title", async () => {
    mount();
    loadResumableDraft.mockResolvedValue({ title: "Lease (2)", files: [file("pf_resume_doc_7", "doc_7")], participants: [] });
    let ok = false;
    await act(async () => { ok = await ctx.resumeBackendDraft("doc_7"); });
    expect(ok).toBe(true);
    expect(ctx.draft?.details.title).toBe("Lease (2)");
    expect(ctx.draft?.details.savedTitle).toEqual({ documentId: "doc_7", title: "Lease (2)" });
    expect(ctx.titleNeedsSave).toBe(false);
    await act(async () => { await ctx.saveTitle(); });
    expect(rename).not.toHaveBeenCalled();
  }, 15_000);
});

describe("Discard draft", () => {
  it("deletes the draft's document on the server, then clears the local draft", async () => {
    seed();
    mount();
    await act(async () => { await ctx.deleteDraftEverywhere(); });
    expect(deleteDraftDocument).toHaveBeenCalledTimes(1);
    expect(deleteDraftDocument).toHaveBeenCalledWith("ws_1", "doc_1");
    expect(ctx.draft).toBeNull();
    expect(readJSON(PERSISTENCE_KEYS.prepareDraft)).toBeNull();
  });

  it("deletes every document of a draft with more than one file", async () => {
    seed({ files: [file("f1", "doc_1"), file("f2", "doc_2"), file("f3")] });
    mount();
    await act(async () => { await ctx.deleteDraftEverywhere(); });
    expect(deleteDraftDocument.mock.calls.map(call => call[1] as string)).toEqual(["doc_1", "doc_2"]);
    expect(ctx.draft).toBeNull();
  });

  it("keeps the local draft when the server could not delete", async () => {
    seed();
    mount();
    deleteDraftDocument.mockRejectedValue(new ApiError(0, undefined, "Network error"));
    let failed = false;
    await act(async () => { await ctx.deleteDraftEverywhere().catch(() => { failed = true; }); });
    expect(failed).toBe(true);
    expect(ctx.draft?.id).toBe("draft_test_1");
    expect(readJSON<PreparationDraft>(PERSISTENCE_KEYS.prepareDraft)?.id).toBe("draft_test_1");
    // Trying again deletes it.
    deleteDraftDocument.mockResolvedValue(undefined);
    await act(async () => { await ctx.deleteDraftEverywhere(); });
    expect(ctx.draft).toBeNull();
  });

  it("counts a document that is already gone as deleted", async () => {
    seed();
    mount();
    deleteDraftDocument.mockRejectedValue(new ApiError(404, { code: "not_found", message: "Document not found." }, "Not found"));
    await act(async () => { await ctx.deleteDraftEverywhere(); });
    expect(ctx.draft).toBeNull();
  });

  it("just clears a draft that never reached the server", async () => {
    seed({ files: [file("f1")] });
    mount();
    await act(async () => { await ctx.deleteDraftEverywhere(); });
    expect(deleteDraftDocument).not.toHaveBeenCalled();
    expect(ctx.draft).toBeNull();
  });

  it("clearing after a send leaves the server alone", async () => {
    seed();
    mount();
    await act(async () => { await ctx.discardDraft(); });
    expect(deleteDraftDocument).not.toHaveBeenCalled();
    expect(ctx.draft).toBeNull();
  });
});
