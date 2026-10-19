// Choosing a completed (signed) document for the notary session, instead of uploading a PDF: the list, the
// search, the pick, and what is said when a file is too big or empty.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const list = vi.fn();
const blobOf = vi.fn();
vi.mock("../../../../../services/real/signing-request.service", () => ({
  realSigningRequestService: {
    list: (...a: unknown[]) => list(...a) as unknown,
    completedDocumentBlob: (...a: unknown[]) => blobOf(...a) as unknown,
  },
}));

import { CompletedDocumentPicker, PickProblem, completedDocumentFile, SESSION_FILE_MAX_BYTES } from "../CompletedDocumentPicker";

const item = (id: string, title: string) => ({
  signingRequestId: id, documentId: `doc_${id}`, documentTitle: title, state: "completed", participantCount: 2, completedParticipantCount: 2,
  initiator: null, createdAt: "2026-10-01T00:00:00.000Z", sentAt: null, completedAt: "2026-10-05T03:00:00.000Z", expiresAt: null,
});

beforeEach(() => {
  list.mockReset();
  blobOf.mockReset();
  list.mockResolvedValue({ items: [item("sr_1", "Deed of Sale"), item("sr_2", "Lease Agreement")], total: 2, page: 1, perPage: 30, hasNextPage: false });
});

describe("the completed document picker", () => {
  it("lists only completed documents, and offers nothing to use until one is chosen", async () => {
    render(<CompletedDocumentPicker workspaceId="ws_1" busy={false} onPick={() => Promise.resolve()} />);
    expect(await screen.findAllByTestId("completed-option")).toHaveLength(2);
    expect(list).toHaveBeenCalledWith("ws_1", expect.objectContaining({ states: ["completed"] }));
    expect(screen.getByText("Deed of Sale")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use this document" })).toBeDisabled();
  });

  it("hands the chosen document to the page when it is used", async () => {
    const onPick = vi.fn().mockResolvedValue(undefined);
    render(<CompletedDocumentPicker workspaceId="ws_1" busy={false} onPick={onPick} />);
    const options = await screen.findAllByTestId("completed-option");
    await userEvent.click(options[1]!);
    await userEvent.click(screen.getByRole("button", { name: "Use this document" }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ signingRequestId: "sr_2", documentTitle: "Lease Agreement" }));
  });

  it("searches by name, and says so when nothing matches or there is nothing at all", async () => {
    render(<CompletedDocumentPicker workspaceId="ws_1" busy={false} onPick={() => Promise.resolve()} />);
    await screen.findAllByTestId("completed-option");
    list.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 30, hasNextPage: false });
    await userEvent.type(screen.getByLabelText("Find a completed document"), "zzz");
    expect(await screen.findByTestId("completed-empty")).toHaveTextContent("No completed document matches that search.");
    expect(list).toHaveBeenLastCalledWith("ws_1", expect.objectContaining({ q: "zzz" }));
  });

  it("says plainly when the list cannot be loaded, and points to uploading instead", async () => {
    list.mockRejectedValue(new Error("down"));
    render(<CompletedDocumentPicker workspaceId="ws_1" busy={false} onPick={() => Promise.resolve()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  });

  it("shows a busy label while the document is being added", async () => {
    render(<CompletedDocumentPicker workspaceId="ws_1" busy onPick={() => Promise.resolve()} />);
    await screen.findAllByTestId("completed-option");
    expect(within(screen.getByTestId("completed-picker")).getByRole("button", { name: "Adding…" })).toBeDisabled();
  });
});

describe("the file made from a completed document", () => {
  const choice = { signingRequestId: "sr_1", documentTitle: "Deed of Sale", completedAt: null };

  it("is a PDF named after the document", async () => {
    blobOf.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    const file = await completedDocumentFile("ws_1", choice);
    expect(file.name).toBe("Deed of Sale.pdf");
    expect(file.type).toBe("application/pdf");
    expect(blobOf).toHaveBeenCalledWith("ws_1", "sr_1");
  });

  it("is refused in words when it is empty or larger than the session takes", async () => {
    blobOf.mockResolvedValueOnce(new Blob([]));
    await expect(completedDocumentFile("ws_1", choice)).rejects.toThrow(PickProblem);
    blobOf.mockResolvedValueOnce({ size: SESSION_FILE_MAX_BYTES + 1 } as Blob);
    await expect(completedDocumentFile("ws_1", choice)).rejects.toThrow(/larger than 20 MB/);
  });
});

describe("waiting for the list", () => {
  it("does not show the picker's list before it is read", async () => {
    let release: (value: unknown) => void = () => undefined;
    list.mockReturnValue(new Promise(resolve => { release = resolve; }));
    render(<CompletedDocumentPicker workspaceId="ws_1" busy={false} onPick={() => Promise.resolve()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your completed documents");
    release({ items: [], total: 0, page: 1, perPage: 30, hasNextPage: false });
    await waitFor(() => { expect(screen.queryByRole("status")).toBeNull(); });
  });
});
