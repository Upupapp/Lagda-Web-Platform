// Review, and fields past the first page.
//
// Review never reads the PDF, so its page list is the editor's guess from the
// file's size: a small 3-page PDF is "1 page". The signatures LAGDA places at
// the bottom of the LAST page were dropped when Review loaded them, so it said
// "Fields (0 total)" and refused to send any document of two or more pages.
// The server's page count comes with the fields, and it is the one used now.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../../../services/backend-flag", () => ({ USE_REAL_BACKEND: true, API_BASE_URL: "http://api.test" }));

const { stable } = vi.hoisted(() => {
  const stable = {
    draft: null as unknown,
    setStep: () => undefined,
    setFieldsSnapshot: () => undefined,
    syncError: null,
    multiDocumentSigningGap: false,
    saveTitle: () => Promise.resolve({ status: "skipped" }),
    discardDraft: () => Promise.resolve(undefined),
  };
  return { stable };
});
vi.mock("../../../../context/PrepareContext", () => ({ usePrepare: () => stable }));
vi.mock("../../../../context/PlatformContext", () => ({
  usePlatform: () => ({ user: { displayName: "Sender" }, currentWorkspace: { id: "ws_1" } }),
}));
vi.mock("../../../../hooks/usePlans", () => ({
  useMyPlan: () => ({ plan: null }),
  useWorkspacePlan: () => ({ plan: "business" }),
  announcePlanChanged: () => undefined,
}));
vi.mock("../../../../services/real/signing-request.service", () => ({ realSigningRequestService: {} }));
const preparation = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../../../services/real/preparation.service", () => ({ realPreparationService: preparation }));
vi.mock("../../../../components/brand/BrandToast", () => ({ toastInfo: vi.fn(), toastWarning: vi.fn() }));

import { ConfirmationPage } from "../ConfirmationPage";

let draftNumber = 0;
/** A fresh draft id each time: the editor keeps one session per draft id. */
function draftWithSmallThreePagePdf() {
  draftNumber += 1;
  return {
    id: `draft_mp_${String(draftNumber)}`,
    details: { title: "Service Agreement", description: "", folderId: null, tagIds: [] },
    files: [{
      id: "f1", fileName: "service-agreement.pdf", fileSizeBytes: 1796, mimeType: "application/pdf",
      fileState: "ready", order: 0, backendDocumentId: "doc_1", uploadStatus: "uploaded",
      // What intake guesses for a 1.8 KB PDF: one page per 40 KB, at least one.
      demoPageCount: 1,
    }],
    participants: [
      { id: "rcp_1", name: "Mario Dela Cruz", email: "mario@example.com", role: "signer" },
      { id: "rcp_2", name: "Aiyana Cruz", email: "aiyana@example.com", role: "signer" },
    ],
    routing: { mode: "sequential", groups: [] },
    auth: { defaultMethod: "none", perParticipant: {} },
    settings: { expiration: { enabled: false, expiresAt: null } },
  };
}

/** The two signatures LAGDA auto-places, at the bottom of the last page. */
const signatureOnPage = (fieldId: string, recipientId: string, pageNumber: number) => ({
  fieldId, type: "signature-block", pageNumber, recipientId, staticValue: null,
  rect: { x: 0.1, y: 0.82, width: 0.3, height: 0.08 }, required: true, label: "Signature", layer: 1,
});

const open = () => render(<MemoryRouter><ConfirmationPage /></MemoryRouter>);

beforeEach(() => {
  preparation.get.mockReset();
});

describe("Review loads fields on every page of the document", () => {
  it("counts the signatures on page 3 of a PDF its size guess calls one page", async () => {
    stable.draft = draftWithSmallThreePagePdf();
    preparation.get.mockResolvedValue({
      preparationId: "prep_1", documentId: "doc_1", pageCount: 3, state: "editable", revision: 2,
      fields: [signatureOnPage("fld_1", "rcp_1", 3), signatureOnPage("fld_2", "rcp_2", 3)],
      createdAt: "2026-11-03T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z",
    });
    open();
    expect(await screen.findByText("Fields (2 total)")).toBeInTheDocument();
    expect(screen.queryByText("No fields placed.")).toBeNull();
  });

  it("keeps fields spread over several pages", async () => {
    stable.draft = draftWithSmallThreePagePdf();
    preparation.get.mockResolvedValue({
      preparationId: "prep_1", documentId: "doc_1", pageCount: 5, state: "editable", revision: 2,
      fields: [signatureOnPage("fld_1", "rcp_1", 1), signatureOnPage("fld_2", "rcp_2", 4), signatureOnPage("fld_3", "rcp_1", 5)],
      createdAt: "2026-11-03T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z",
    });
    open();
    expect(await screen.findByText("Fields (3 total)")).toBeInTheDocument();
  });

  it("still counts a one-page document's field (the case that always worked)", async () => {
    stable.draft = draftWithSmallThreePagePdf();
    preparation.get.mockResolvedValue({
      preparationId: "prep_1", documentId: "doc_1", pageCount: 1, state: "editable", revision: 2,
      fields: [signatureOnPage("fld_1", "rcp_1", 1)],
      createdAt: "2026-11-03T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z",
    });
    open();
    expect(await screen.findByText("Fields (1 total)")).toBeInTheDocument();
  });

  it("does not invent a page the server does not have", async () => {
    // A field numbered past the server's own count cannot be real; it is left
    // out rather than shown on a page the document does not have.
    stable.draft = draftWithSmallThreePagePdf();
    preparation.get.mockResolvedValue({
      preparationId: "prep_1", documentId: "doc_1", pageCount: 2, state: "editable", revision: 2,
      fields: [signatureOnPage("fld_1", "rcp_1", 2), signatureOnPage("fld_2", "rcp_2", 7)],
      createdAt: "2026-11-03T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z",
    });
    open();
    expect(await screen.findByText("Fields (1 total)")).toBeInTheDocument();
  });
});
