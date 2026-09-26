// First-arrival defaults on a REAL document, the stale-document fix and the
// load-failure state — everything that depends on the real-backend load
// path of FieldsPage. The PDF reader is replaced with a controllable stand-in
// (jsdom has no canvas), which also lets these tests see exactly when the
// page re-fetches its document.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import React from "react";

type Participant = { id: string; name: string; email: string; role: string };
const baseFile = {
  id: "f1", fileName: "contract.pdf", fileSizeBytes: 1000, mimeType: "application/pdf",
  fileState: "ready", order: 0, backendDocumentId: "doc_1", backendArtifactId: "art_1",
};
function makeDraft(participants: Participant[], files = [baseFile]) {
  return {
    id: "d1",
    details: { title: "Test Contract", description: "", folderId: null, tagIds: [] },
    files,
    participants,
    routing: { mode: "sequential", groups: [
      { id: "g1", stepNumber: 1, participantIds: participants.filter(p => p.role === "signer").map(p => p.id).reverse() },
    ] },
    auth: { defaultMethod: "none", perParticipant: {} },
    settings: {},
  };
}
const EVERYONE: Participant[] = [
  { id: "pax_s1", name: "Ana Signer", email: "a@x.com", role: "signer" },
  { id: "pax_s2", name: "Ben Signer", email: "b@x.com", role: "signer" },
  { id: "pax_r1", name: "Cara Reviewer", email: "c@x.com", role: "reviewer" },
  { id: "pax_a1", name: "Dan Approver", email: "d@x.com", role: "approver" },
  { id: "pax_v1", name: "Viewer One", email: "v@x.com", role: "viewer" },
];

const prepare = {
  draft: makeDraft(EVERYONE),
  setStep: vi.fn(),
  setFieldsSnapshot: vi.fn(),
};
vi.mock("../../../../context/PrepareContext", () => ({ usePrepare: () => prepare }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1" } }),
}));
vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true }));

const getMock = vi.fn().mockResolvedValue({ revision: 0, fields: [] });
vi.mock("../../../../services/real/preparation.service", () => ({
  realPreparationService: { get: (...args: unknown[]) => getMock(...args) },
}));

const contentBlob = vi.fn((_ws: string, _doc: string) => Promise.resolve(new Blob(["%PDF"])));
vi.mock("../../../../services/real/signing-request.service", () => ({
  realSigningRequestService: { documentContentBlob: (ws: string, doc: string) => contentBlob(ws, doc) },
}));

// The PDF reader: "ready" with two A4 pages unless a test says otherwise.
const pdf = {
  state: {
    status: "ready", doc: {}, pageCount: 2,
    pageSizes: [{ width: 595, height: 842 }, { width: 595, height: 842 }],
  } as Record<string, unknown>,
};
vi.mock("../../../../components/pdf/DocumentPageSurface", () => ({
  useRealDocument: (loader: (() => Promise<Blob>) | null) => {
    React.useEffect(() => { if (loader) void loader(); }, [loader]);
    return loader ? pdf.state : { status: "idle" };
  },
  DocumentPageSurface: () => null,
}));

import { FieldsPage } from "../FieldsPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app/prepare/fields"]}>
      <FieldsPage />
    </MemoryRouter>,
  );
}

async function openList(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /show field list/i }));
  return screen.findByRole("table", { name: /field list/i });
}

beforeEach(() => {
  window.localStorage.clear();
  getMock.mockClear();
  contentBlob.mockClear();
  prepare.draft = makeDraft(EVERYONE);
  pdf.state = {
    status: "ready", doc: {}, pageCount: 2,
    pageSizes: [{ width: 595, height: 842 }, { width: 595, height: 842 }],
  };
});

describe("first-arrival auto-placement", () => {
  it("gives every signer a Signature over Name and every reviewer a Reviewed over Name — approvers nothing", async () => {
    const user = userEvent.setup();
    renderPage();
    const notice = await screen.findByTestId("placement-notice");
    expect(notice).toHaveTextContent("Placed 3 fields for 3 participants");

    const table = await openList(user);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(table).toHaveTextContent("Ana Signer");
    expect(table).toHaveTextContent("Ben Signer");
    expect(table).toHaveTextContent("Cara Reviewer");
    expect(table).not.toHaveTextContent("Dan Approver");
    expect(table).not.toHaveTextContent("Viewer One");
    // Each appears twice per row: the type column and the label column.
    expect(within(table).getAllByText("Signature over Name")).toHaveLength(4);
    expect(within(table).getAllByText("Reviewed over Name")).toHaveLength(2);
  });

  it("waits for the saved-field load, and stands down when the server already had fields", async () => {
    getMock.mockResolvedValueOnce({
      revision: 3,
      fields: [{
        fieldId: "x1", type: "text", pageNumber: 1, rect: { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
        required: false, label: "Note", layer: 1, recipientId: "pax_s1", staticValue: null,
      }],
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => { expect(getMock).toHaveBeenCalled(); });
    const table = await openList(user);
    await waitFor(() => { expect(table).toHaveTextContent("Note"); });
    expect(table).not.toHaveTextContent("Signature over Name");
    expect(screen.queryByTestId("placement-notice")).toBeNull();
  });

  it("Undo removes exactly the placed fields, and a return visit never re-adds them", async () => {
    const user = userEvent.setup();
    const { unmount: leave } = renderPage();
    await user.click(within(await screen.findByTestId("placement-notice")).getByRole("button", { name: "Undo" }));
    expect(screen.queryByTestId("placement-notice")).toBeNull();
    await user.click(await screen.findByRole("button", { name: /show field list/i }));
    expect(await screen.findByText(/no fields match/i)).toBeInTheDocument();
    leave();

    // Coming back to Place Fields for the same draft.
    renderPage();
    await waitFor(() => { expect(getMock).toHaveBeenCalledTimes(2); });
    await user.click(await screen.findByRole("button", { name: /show field list/i }));
    expect(await screen.findByText(/no fields match/i)).toBeInTheDocument();
    expect(screen.queryByTestId("placement-notice")).toBeNull();
  });

  it("does not place until the document's real page list is known", async () => {
    pdf.state = { status: "loading" };
    const user = userEvent.setup();
    const view = renderPage();
    await waitFor(() => { expect(getMock).toHaveBeenCalled(); });
    expect(screen.queryByTestId("placement-notice")).toBeNull();

    // The real file turns out to have ONE page — the block goes there, not
    // onto the placeholder's page 3 (which would then be dropped).
    pdf.state = { status: "ready", doc: {}, pageCount: 1, pageSizes: [{ width: 595, height: 842 }] };
    view.rerender(
      <MemoryRouter initialEntries={["/app/prepare/fields"]}><FieldsPage /></MemoryRouter>,
    );
    expect(await screen.findByTestId("placement-notice")).toHaveTextContent("Placed 3 fields");
    const table = await openList(user);
    expect(within(table).getAllByRole("row").slice(1)).toHaveLength(3);
  });
});

describe("the document behind Place Fields changes", () => {
  it("re-fetches the page when a new file is uploaded behind the same document", async () => {
    const view = renderPage();
    await waitFor(() => { expect(contentBlob).toHaveBeenCalledWith("ws_1", "doc_1"); });
    const before = contentBlob.mock.calls.length;

    // Replaced on the Documents step: same PrepFile and document id, new
    // artifact and name.
    prepare.draft = makeDraft(EVERYONE, [{ ...baseFile, fileName: "contract-v2.pdf", backendArtifactId: "art_2" }]);
    view.rerender(<MemoryRouter initialEntries={["/app/prepare/fields"]}><FieldsPage /></MemoryRouter>);
    await waitFor(() => { expect(contentBlob.mock.calls.length).toBeGreaterThan(before); });
    expect(await screen.findByText("contract-v2.pdf")).toBeInTheDocument();
    expect(screen.queryByText("contract.pdf")).toBeNull();
  });

  it("shows the NEW file on return after the old one was swapped out", async () => {
    const { unmount: leave } = renderPage();
    expect(await screen.findByText("contract.pdf")).toBeInTheDocument();
    leave();

    // Removed and replaced by a different upload (a new PrepFile).
    prepare.draft = makeDraft(EVERYONE, [{
      ...baseFile, id: "f2", fileName: "replacement.pdf", backendDocumentId: "doc_2", backendArtifactId: "art_9",
    }]);
    renderPage();
    expect(await screen.findByText("replacement.pdf")).toBeInTheDocument();
    expect(screen.queryByText("contract.pdf")).toBeNull();
    await waitFor(() => { expect(contentBlob).toHaveBeenCalledWith("ws_1", "doc_2"); });
  });
});

describe("when the document cannot be loaded", () => {
  it("says so formally and offers Reload document, which reloads this route", async () => {
    pdf.state = { status: "error", message: "This document could not be loaded." };
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, reload } });
    try {
      const user = userEvent.setup();
      renderPage();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("The document could not be loaded");
      await user.click(within(alert).getByRole("button", { name: "Reload document" }));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });
});
