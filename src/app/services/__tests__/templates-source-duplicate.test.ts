// templates-source.ts's duplicateTemplate: a real copy of a real template's
// shape, never carrying the source's slot ids onto the new one (GAP 2.1 —
// this used to run against the mock service and silently do nothing to a
// real template). 071: a template's document is never an upload, so
// duplicating one with authored content means re-running generate-document
// against a copy of that content, not re-attaching a reference.

vi.mock("../backend-flag", () => ({ USE_REAL_BACKEND: true }));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTemplate, duplicateTemplate, TemplatesNotWritableError } from "../templates-source";
import type { DocumentTemplate, FlowDocument } from "../../models/templates";

const {
  mockGet, mockGetFields, mockCreate, mockGenerateDocument, mockDocumentGet,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetFields: vi.fn(),
  mockCreate: vi.fn(),
  mockGenerateDocument: vi.fn(),
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
      generateDocument: mockGenerateDocument,
    },
  };
});

vi.mock("../real/document.service", () => ({
  realDocumentService: { get: mockDocumentGet },
}));

const WORKSPACE = "ws_1";
const TEMPLATE_ID = "wft_1";

const AUTHORED: FlowDocument = {
  kind: "flowDocument",
  content: [
    {
      kind: "paragraph",
      content: [
        { kind: "text", text: "Signed: " },
        { kind: "fieldAnchor", fieldType: "signature", slotId: "wfs_client", required: true, label: "Client" },
      ],
    },
  ],
};

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
  content: AUTHORED,
  contentPageCount: 1,
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
  content: { kind: "flowDocument" as const, content: [] },
  contentPageCount: 0,
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

  it("re-generates the copy's document from the source's authored content", async () => {
    mockGenerateDocument.mockResolvedValue({
      template: { ...CREATED, content: AUTHORED, contentPageCount: 1, documentId: "doc_2", sourceArtifactId: "art_2" },
      resolvedAnchors: [],
    });
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    await duplicateTemplate(WORKSPACE, source);

    expect(mockGenerateDocument).toHaveBeenCalledWith(
      WORKSPACE, "wft_2", expect.objectContaining({ content: expect.any(Object) }));
  });

  it("rebinds a field anchor's slotId to the COPY's own fresh slot, by position", async () => {
    mockGenerateDocument.mockResolvedValue({
      template: { ...CREATED, content: AUTHORED, contentPageCount: 1 },
      resolvedAnchors: [],
    });
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    await duplicateTemplate(WORKSPACE, source);

    const sentContent = mockGenerateDocument.mock.calls[0]![2].content as FlowDocument;
    const paragraph = sentContent.content[0] as { content: { kind: string; slotId?: string }[] };
    const anchor = paragraph.content.find(r => r.kind === "fieldAnchor");
    expect(anchor?.slotId).toBe("wfs_client_2");
  });

  it("returns the copy without regenerating when the source has nothing authored", async () => {
    const noContentWire = { ...WIRE, content: { kind: "flowDocument" as const, content: [] }, contentPageCount: 0 };
    mockGet.mockResolvedValue(noContentWire);
    const source = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;

    const result = await duplicateTemplate(WORKSPACE, source);
    expect(mockGenerateDocument).not.toHaveBeenCalled();
    expect(result.id).toBe("wft_2");
  });

  it("still returns the created copy when regenerating its document fails", async () => {
    // The copy already exists and is usable — a failed regenerate must not
    // look like a failed duplicate.
    mockGenerateDocument.mockRejectedValue(new Error("network error"));
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
