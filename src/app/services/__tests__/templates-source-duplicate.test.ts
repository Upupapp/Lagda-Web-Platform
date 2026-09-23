// templates-source.ts's duplicateTemplate: a real copy of a real template's
// shape, never carrying the source's slot ids onto the new one (GAP 2.1 —
// this used to run against the mock service and silently do nothing to a
// real template).

vi.mock("../backend-flag", () => ({ USE_REAL_BACKEND: true }));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTemplate, duplicateTemplate, TemplatesNotWritableError } from "../templates-source";
import type { DocumentTemplate } from "../../models/templates";

const {
  mockGet, mockGetFields, mockCreate, mockAttachDocument, mockDocumentGet,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetFields: vi.fn(),
  mockCreate: vi.fn(),
  mockAttachDocument: vi.fn(),
  mockDocumentGet: vi.fn(),
}));

vi.mock("../real/templates.service", async () => {
  const actual = await vi.importActual<typeof import("../real/templates.service")>(
    "../real/templates.service");
  return {
    ...actual,
    realTemplatesService: {
      get: mockGet,
      getFields: mockGetFields,
      create: mockCreate,
      attachDocument: mockAttachDocument,
    },
  };
});

vi.mock("../real/document.service", () => ({
  realDocumentService: { get: mockDocumentGet },
}));

const WORKSPACE = "ws_1";
const TEMPLATE_ID = "wft_1";

const WIRE = {
  workflowTemplateId: TEMPLATE_ID,
  name: "Engagement Letter",
  routingMode: "sequential" as const,
  roleSlots: [
    { slotId: "wfs_client", label: "Client", role: "signer" as const, required: true, routingStep: 1, defaultAuthMethod: "none" as const },
  ],
  completionSettings: { notifySenderOnComplete: true },
  variables: [],
  documentId: "doc_1",
  sourceArtifactId: "art_1",
  createdAt: "2026-09-22T09:00:00.000Z",
  updatedAt: "2026-09-22T09:00:00.000Z",
};

const CREATED = {
  workflowTemplateId: "wft_2",
  name: "Engagement Letter (Copy)",
  routingMode: "sequential" as const,
  roleSlots: [
    { slotId: "wfs_client_2", label: "Client", role: "signer" as const, required: true, routingStep: 1, defaultAuthMethod: "none" as const },
  ],
  completionSettings: { notifySenderOnComplete: true },
  variables: [],
  documentId: null,
  sourceArtifactId: null,
  createdAt: "2026-09-22T10:00:00.000Z",
  updatedAt: "2026-09-22T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(WIRE);
  mockGetFields.mockResolvedValue([]);
  mockCreate.mockResolvedValue(CREATED);
  mockDocumentGet.mockResolvedValue({
    documentId: "doc_1", title: "Engagement Letter", originalFilename: "eng.pdf",
    createdByUserId: "usr_1", folderId: null, createdAt: "", updatedAt: "",
    source: { mediaType: "application/pdf", sizeBytes: 1024, pageCount: 3, uploadedAt: "" },
  });
});

describe("duplicateTemplate", () => {
  it("names the copy and preserves routing mode and slot shape", async () => {
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    await duplicateTemplate(WORKSPACE, source);

    const sent = mockCreate.mock.calls[0]![1];
    expect(sent.name).toBe("Engagement Letter (Copy)");
    expect(sent.routingMode).toBe("sequential");
    expect(sent.roleSlots).toHaveLength(1);
    expect(sent.roleSlots[0].label).toBe("Client");
  });

  it("never sends the SOURCE template's slotId — a copy gets fresh slots", async () => {
    // The one that matters: reusing the source's slotId would try to
    // overwrite the ORIGINAL template's role, not create a new one.
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    await duplicateTemplate(WORKSPACE, source);

    const sent = mockCreate.mock.calls[0]![1];
    expect(sent.roleSlots[0]).not.toHaveProperty("slotId");
  });

  it("re-attaches the source's document to the new template", async () => {
    mockAttachDocument.mockResolvedValue({ ...CREATED, documentId: "doc_1", sourceArtifactId: "art_1" });
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    await duplicateTemplate(WORKSPACE, source);

    expect(mockAttachDocument).toHaveBeenCalledWith(
      WORKSPACE, "wft_2", { documentId: "doc_1", artifactId: "art_1" });
  });

  it("returns the copy without a document when the source has none", async () => {
    const noDocWire = { ...WIRE, documentId: null, sourceArtifactId: null };
    mockGet.mockResolvedValue(noDocWire);
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;

    const result = await duplicateTemplate(WORKSPACE, source);
    expect(mockAttachDocument).not.toHaveBeenCalled();
    expect(result.id).toBe("wft_2");
  });

  it("still returns the created copy when re-attaching its document fails", async () => {
    // The copy already exists and is usable — a failed attach must not look
    // like a failed duplicate.
    mockAttachDocument.mockRejectedValue(new Error("network error"));
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;

    const result = await duplicateTemplate(WORKSPACE, source);
    expect(result.id).toBe("wft_2");
  });

  it("refuses without a workspace", async () => {
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    await expect(duplicateTemplate(undefined, source))
      .rejects.toBeInstanceOf(TemplatesNotWritableError);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
