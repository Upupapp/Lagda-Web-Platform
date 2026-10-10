// Documents step: the transaction title and the server.
//
// The step ASKS for the title to be saved (when the field loses focus, when a
// document first exists, and on the way out) and SHOWS what came of it: the
// calm note when the server numbered a duplicate, the plain failure when it
// could not be saved, and the hint in advance while typing. The saving itself
// is PrepareContext's and is pinned in PrepareContext.title-and-discard.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const { saveTitle, recordServerTitle, updateFiles, updateDetails, prepare, stable } = vi.hoisted(() => {
  const saveTitle = vi.fn();
  const recordServerTitle = vi.fn();
  const updateFiles = vi.fn();
  const updateDetails = vi.fn();
  const prepare: { draft: Record<string, unknown>; titleSave: { state: string; adjusted: { typed: string; saved: string } | null } } = {
    draft: {}, titleSave: { state: "idle", adjusted: null },
  };
  // The same functions on every render, as the real context gives.
  const stable = {
    saveTitle: (...args: unknown[]) => saveTitle(...args) as unknown,
    recordServerTitle: (...args: unknown[]) => recordServerTitle(...args) as unknown,
    updateFiles: (...args: unknown[]) => updateFiles(...args) as unknown,
    updateDetails: (...args: unknown[]) => updateDetails(...args) as unknown,
    setStep: () => undefined,
    validate: () => ({ errors: [], warnings: [], issues: [] }),
  };
  return { saveTitle, recordServerTitle, updateFiles, updateDetails, prepare, stable };
});
vi.mock("../../../../context/PrepareContext", () => ({
  usePrepare: () => ({ draft: prepare.draft, titleSave: prepare.titleSave, ...stable }),
}));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));
vi.mock("../../../../services/processing.service", async (original) => ({
  ...(await original<typeof import("../../../../services/processing.service")>()),
  useProcessing: () => ({
    run: (_options: unknown, work: (tools: { update: () => void }) => Promise<unknown>) => work({ update: () => undefined }),
  }),
}));

const titleSuggestion = vi.fn();
const create = vi.fn();
const upload = vi.fn();
const checkUploadCapacity = vi.fn();
vi.mock("../../../../services/real/document.service", () => ({
  realDocumentService: {
    titleSuggestion: (...args: unknown[]) => titleSuggestion(...args) as unknown,
    create: (...args: unknown[]) => create(...args) as unknown,
    upload: (...args: unknown[]) => upload(...args) as unknown,
    checkUploadCapacity: (...args: unknown[]) => checkUploadCapacity(...args) as unknown,
  },
}));

import { UploadStep } from "../UploadStep";
import { setFileRef, clearAllFileRefs } from "../../../../services/prepare/file-registry";
import { DEFAULT_TRANSACTION_DETAILS } from "../../../../models/prepare";

const uploaded = (documentId: string) => ({
  id: "f1", fileName: "contract.pdf", fileSizeBytes: 1200, mimeType: "application/pdf",
  fileState: "ready", order: 0, backendDocumentId: documentId, uploadStatus: "uploaded",
});

function setDraft(over: { title?: string; files?: unknown[]; savedTitle?: { documentId: string; title: string } }) {
  prepare.draft = {
    id: "draft_1",
    files: over.files ?? [],
    details: {
      ...DEFAULT_TRANSACTION_DETAILS,
      title: over.title ?? "",
      ...(over.savedTitle === undefined ? {} : { savedTitle: over.savedTitle }),
    },
  };
}

const titleField = () => screen.getByLabelText(/Transaction title/);
const note = () => screen.getByTestId("prep-title-note");

beforeEach(() => {
  clearAllFileRefs();
  prepare.titleSave = { state: "idle", adjusted: null };
  setDraft({});
  saveTitle.mockResolvedValue({ status: "skipped" });
  checkUploadCapacity.mockResolvedValue({ available: true });
  titleSuggestion.mockImplementation((_ws: string, title: string) => Promise.resolve({ requested: title, title, changed: false }));
});

describe("when the title is saved", () => {
  it("asks for a save when the title field loses focus", async () => {
    setDraft({ title: "Lease", files: [uploaded("doc_1")], savedTitle: { documentId: "doc_1", title: "Lease" } });
    render(<UploadStep />);
    saveTitle.mockClear();
    await userEvent.click(titleField());
    expect(saveTitle).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(saveTitle).toHaveBeenCalledTimes(1);
  });

  it("asks for a save the moment a document exists, for a title typed before the upload", () => {
    setDraft({ title: "Lease" });
    const { rerender } = render(<UploadStep />);
    expect(saveTitle).not.toHaveBeenCalled();
    setDraft({ title: "Lease", files: [uploaded("doc_1")] });
    rerender(<UploadStep />);
    expect(saveTitle).toHaveBeenCalledTimes(1);
  });

  it("notes the title the server gave a document it has just created", async () => {
    setFileRef("f1", new File(["%PDF-1.4"], "contract.pdf", { type: "application/pdf" }));
    create.mockResolvedValue({ documentId: "doc_new", title: "contract.pdf (2)", titleAdjusted: true });
    upload.mockResolvedValue({ artifactId: "art_1", digest: "sha", pageCount: 2 });
    setDraft({
      title: "Lease",
      files: [{ id: "f1", fileName: "contract.pdf", fileSizeBytes: 8, mimeType: "application/pdf", fileState: "ready", order: 0 }],
    });
    render(<UploadStep />);
    await waitFor(() => { expect(upload).toHaveBeenCalled(); });
    // Created under the FILE's name, as before…
    expect(create).toHaveBeenCalledWith("ws_1", "contract.pdf");
    // …and what the server called it is recorded before the id is.
    expect(recordServerTitle).toHaveBeenCalledWith("doc_new", "contract.pdf (2)");
    const patched = updateFiles.mock.calls.map(call => (call[0] as { backendDocumentId?: string }[])[0]?.backendDocumentId);
    expect(patched).toContain("doc_new");
  });

  it("does not treat a numbered FILE name as a title the sender typed", async () => {
    // The server numbers the first title too: the file's name can come back
    // as "contract.pdf (2)". Nobody typed that.
    setFileRef("f1", new File(["%PDF-1.4"], "contract.pdf", { type: "application/pdf" }));
    create.mockResolvedValue({ documentId: "doc_new", title: "contract.pdf (2)", titleAdjusted: true });
    upload.mockResolvedValue({ artifactId: "art_1", digest: "sha", pageCount: 2 });
    setDraft({
      title: "",
      files: [{ id: "f1", fileName: "contract.pdf", fileSizeBytes: 8, mimeType: "application/pdf", fileState: "ready", order: 0 }],
    });
    render(<UploadStep />);
    await waitFor(() => { expect(upload).toHaveBeenCalled(); });
    // The title field is still the sender's to fill in, and nothing is said
    // about a document "already existing".
    expect((titleField() as HTMLInputElement).value).toBe("");
    expect(updateDetails).not.toHaveBeenCalled();
    expect(note().textContent ?? "").toBe("");
    expect(screen.queryByText(/already exists here/)).toBeNull();
    expect(titleSuggestion).not.toHaveBeenCalled();
  });

  it("asks for a save on the way out of the step", () => {
    setDraft({ title: "Lease" });
    const { unmount } = render(<UploadStep />);
    saveTitle.mockClear();
    unmount();
    expect(saveTitle).toHaveBeenCalledTimes(1);
  });
});

describe("what the sender is told", () => {
  it("ties the note to the field, and keeps room for it so nothing moves", () => {
    setDraft({ title: "Lease" });
    render(<UploadStep />);
    expect(titleField().getAttribute("aria-describedby") ?? "").toContain("prep-title-note");
    expect(note().style.minHeight).toBe("44px");
    expect(note().textContent ?? "").toBe("");
    expect(note().querySelector("[role=status]")?.getAttribute("aria-live")).toBe("polite");
  });

  it("says, calmly, when the title was numbered because it already exists", () => {
    setDraft({ title: "Lease (2)", files: [uploaded("doc_1")], savedTitle: { documentId: "doc_1", title: "Lease (2)" } });
    prepare.titleSave = { state: "saved", adjusted: { typed: "Lease", saved: "Lease (2)" } };
    render(<UploadStep />);
    expect(note().textContent ?? "").toBe(
      "A document named \"Lease\" already exists here, so this one is saved as \"Lease (2)\".");
    expect((titleField() as HTMLInputElement).value).toBe("Lease (2)");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("drops that note once the title is something else", () => {
    setDraft({ title: "Lease for Unit 4", files: [uploaded("doc_1")] });
    prepare.titleSave = { state: "saved", adjusted: { typed: "Lease", saved: "Lease (2)" } };
    render(<UploadStep />);
    expect(note().textContent ?? "").toBe("");
  });

  it("says so when the title could not be saved, and offers to try again", async () => {
    setDraft({ title: "Lease", files: [uploaded("doc_1")] });
    prepare.titleSave = { state: "failed", adjusted: null };
    render(<UploadStep />);
    expect(screen.getByRole("alert").textContent ?? "").toContain(
      "The title could not be saved. Check your connection and try again.");
    saveTitle.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(saveTitle).toHaveBeenCalledTimes(1);
  });

  it("says in advance, while typing, that a title is taken and what it will be saved as", async () => {
    titleSuggestion.mockResolvedValue({ requested: "Lease", title: "Lease (2)", changed: true });
    setDraft({ title: "Lease", files: [uploaded("doc_1")] });
    render(<UploadStep />);
    expect(note().textContent ?? "").toBe("");
    await waitFor(() => {
      expect(note().textContent ?? "").toBe("\"Lease\" is already used in this workspace. It will be saved as \"Lease (2)\".");
    }, { timeout: 3000 });
    // Its own document is left out of the comparison.
    expect(titleSuggestion).toHaveBeenCalledWith("ws_1", "Lease", "doc_1");
  });

  it("does not ask about a title that is already this document's own", async () => {
    setDraft({ title: "Lease", files: [uploaded("doc_1")], savedTitle: { documentId: "doc_1", title: "Lease" } });
    render(<UploadStep />);
    await new Promise(resolve => { setTimeout(resolve, 700); });
    expect(titleSuggestion).not.toHaveBeenCalled();
  });

  it("never blocks typing", async () => {
    setDraft({ title: "Lease" });
    prepare.titleSave = { state: "saving", adjusted: null };
    render(<UploadStep />);
    expect(titleField()).not.toBeDisabled();
    await userEvent.type(titleField(), "!");
    expect(updateDetails).toHaveBeenCalledWith(expect.objectContaining({ title: "Lease!" }));
  });
});
