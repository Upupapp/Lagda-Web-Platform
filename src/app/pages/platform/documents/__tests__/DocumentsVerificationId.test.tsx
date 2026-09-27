import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ currentWorkspace: { id: "ws_1", name: "Acme" } }),
}));
vi.mock("../../../../hooks/usePrepareLaunch", () => ({ usePrepareLaunch: () => ({ onPrepareClick: () => undefined }) }));

const listRequests = vi.fn();
vi.mock("../../../../services/real/signing-request.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/signing-request.service")>();
  return {
    ...actual,
    realSigningRequestService: {
      ...actual.realSigningRequestService,
      list: (...args: unknown[]) => listRequests(...args) as unknown,
    },
  };
});
vi.mock("../../../../services/real/document.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/document.service")>();
  return {
    ...actual,
    realDocumentService: {
      ...actual.realDocumentService,
      list: () => Promise.resolve({
        items: [
          doc("doc_a", "Lease Agreement", "LAGDA-VER-2026-004821"),
          doc("doc_b", "Draft NDA", null),
        ],
        total: 2, page: 1, perPage: 100, hasNextPage: false,
      }),
    },
  };
});
vi.mock("../../../../services/real/my-signing.service", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../../services/real/my-signing.service")>();
  return { ...actual, realMySigningService: { documentsToSign: () => Promise.resolve([]), signedDocuments: () => Promise.resolve([]) } };
});

import { DocumentsPage } from "../DocumentsPage";
import { VerificationIdActions } from "../../../../components/documents/VerificationIdActions";
import { mockDocumentService } from "../../../../services/mock/document.service";
import { DEFAULT_QUERY } from "../../../../models/documents";

function doc(documentId: string, title: string, verificationId: string | null) {
  return {
    documentId, workspaceId: "ws_1", title, originalFilename: `${title}.pdf`, createdByUserId: "u",
    folderId: null, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
    source: null, verificationId,
  };
}

const requests = [
  { signingRequestId: "sr_a", documentId: "doc_a", documentTitle: "Lease Agreement", state: "completed",
    participantCount: 1, completedParticipantCount: 1, initiator: null,
    createdAt: "2026-09-02T00:00:00.000Z", sentAt: null, completedAt: null, expiresAt: null },
  { signingRequestId: "sr_b", documentId: "doc_b", documentTitle: "Draft NDA", state: "sent",
    participantCount: 1, completedParticipantCount: 0, initiator: null,
    createdAt: "2026-09-01T00:00:00.000Z", sentAt: null, completedAt: null, expiresAt: null },
];

beforeEach(() => {
  listRequests.mockReset();
  // The server's q matches names only; it never matches a Verification ID.
  listRequests.mockImplementation((_ws: string, opts: { q?: string } = {}) => {
    const q = (opts.q ?? "").toLowerCase();
    const items = requests.filter(r => q === "" || r.documentTitle.toLowerCase().includes(q));
    return Promise.resolve({ items, total: items.length, page: 1, perPage: 50, hasNextPage: false });
  });
});

describe("VerificationIdActions", () => {
  it("renders a dash when there is no id", () => {
    render(<MemoryRouter><VerificationIdActions id={null} /></MemoryRouter>);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy Verification ID" })).toBeNull();
  });

  it("copies the id and announces it, and links Verify to /app/verify/<id>", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<MemoryRouter><VerificationIdActions id="LAGDA-VER-2026-004821" /></MemoryRouter>);
    expect(screen.getByText("LAGDA-VER-2026-004821")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verify document" })).toHaveAttribute("href", "/app/verify/LAGDA-VER-2026-004821");
    await user.click(screen.getByRole("button", { name: "Copy Verification ID" }));
    expect(writeText).toHaveBeenCalledWith("LAGDA-VER-2026-004821");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});

describe("Documents list — Verification ID (real mode)", () => {
  it("shows the column, the id on the completed row and a dash on the others", async () => {
    render(<MemoryRouter initialEntries={["/app/documents"]}><DocumentsPage /></MemoryRouter>);
    const table = await screen.findByRole("table", { name: "Documents" });
    expect(within(table).getByRole("columnheader", { name: "Verification ID" })).toBeInTheDocument();
    await waitFor(() => expect(within(table).getAllByText("LAGDA-VER-2026-004821").length).toBeGreaterThan(0));
    const rows = within(table).getAllByRole("row");
    const draftRow = rows.find(r => within(r).queryByText("Draft NDA"))!;
    expect(within(draftRow).getByText("—")).toBeInTheDocument();
    // Desktop column visible; the tablet line and phone card carry the same
    // actions but are hidden by the page CSS at this (default) width.
    expect(screen.getAllByRole("link", { name: "Verify document" })).toHaveLength(1);
    const all = screen.getAllByRole("link", { name: "Verify document", hidden: true });
    expect(all).toHaveLength(3);
    for (const link of all) expect(link).toHaveAttribute("href", "/app/verify/LAGDA-VER-2026-004821");
  });

  it("finds a document by its Verification ID although the server search does not", async () => {
    render(<MemoryRouter initialEntries={["/app/documents?q=LAGDA-VER-2026-004821"]}><DocumentsPage /></MemoryRouter>);
    const table = await screen.findByRole("table", { name: "Documents" });
    await waitFor(() => expect(within(table).getByText("Lease Agreement")).toBeInTheDocument());
    expect(within(table).queryByText("Draft NDA")).toBeNull();
  });
});

describe("mock document search", () => {
  it("matches a completed document by Verification ID", async () => {
    const all = await mockDocumentService.list({ ...DEFAULT_QUERY });
    const completed = all.items.find(i => i.status === "completed" && i.verificationId);
    expect(completed).toBeDefined();
    const found = await mockDocumentService.list({ ...DEFAULT_QUERY, q: completed!.verificationId! });
    expect(found.items.map(i => i.id)).toContain(completed!.id);
  });
});
