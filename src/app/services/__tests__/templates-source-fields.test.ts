// templates-source.ts's field-placement facade (060): the slotId <->
// placeholderId translation is the one place a bug here would silently
// misplace a signature onto the wrong role, so it gets its own direct tests
// rather than relying only on the page that calls it.

vi.mock("../backend-flag", () => ({ USE_REAL_BACKEND: true }));

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTemplate, saveTemplateFields } from "../templates-source";
import type { DocumentTemplate } from "../../models/templates";

// Plain standalone `vi.fn()`s, hoisted so `vi.mock` below (itself hoisted)
// can close over them. Calling `mockGet.mockResolvedValue(...)` on one of
// these directly — rather than on a property read off the mocked service
// object at each call site — is what keeps `@typescript-eslint/unbound-
// method` quiet: the rule flags a bare method reference detached from its
// object, and a standalone `vi.fn()` was never a method to begin with.
const { mockGet, mockGetFields, mockSaveFields, mockDocumentGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetFields: vi.fn(),
  mockSaveFields: vi.fn(),
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
      saveFields: mockSaveFields,
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
    { slotId: "wfs_witness", label: "Witness", role: "signer" as const, required: false, routingStep: 2, defaultAuthMethod: "none" as const },
  ],
  completionSettings: { notifySenderOnComplete: true },
  variables: [],
  documentId: "doc_1",
  sourceArtifactId: "art_1",
  createdAt: "2026-09-22T09:00:00.000Z",
  updatedAt: "2026-09-22T09:00:00.000Z",
};

beforeEach(() => {
  mockGet.mockResolvedValue(WIRE);
  mockDocumentGet.mockResolvedValue({
    documentId: "doc_1", title: "Engagement Letter", originalFilename: "eng.pdf",
    createdByUserId: "usr_1", folderId: null, createdAt: "", updatedAt: "",
    source: { mediaType: "application/pdf", sizeBytes: 1024, pageCount: 3, uploadedAt: "" },
  });
});

describe("getTemplate: enriching a stored template's fields (060)", () => {
  it("maps a field's slotId to the matching placeholder's id", async () => {
    mockGetFields.mockResolvedValue([
      {
        fieldId: "wff_1", slotId: "wfs_client", type: "signature",
        pageNumber: 1, rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
        required: true, label: "Sign here", layer: 0,
      },
    ]);

    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;

    expect(t.fields).toHaveLength(1);
    const clientPlaceholder = t.placeholders.find(p => p.backendSlotId === "wfs_client");
    expect(t.fields[0]!.placeholderId).toBe(clientPlaceholder!.id);
    expect(t.fields[0]!.pageId).toBe("page-1");
    expect(t.fields[0]!.demonstrationOnly).toBe(false);
  });

  it("drops a field whose slotId names no current placeholder", async () => {
    mockGetFields.mockResolvedValue([
      {
        fieldId: "wff_orphan", slotId: "wfs_removed", type: "text",
        pageNumber: 1, rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
        required: false, label: "Orphaned", layer: 0,
      },
    ]);

    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    expect(t.fields).toEqual([]);
  });

  it("is empty when the template has no fields, with no crash", async () => {
    mockGetFields.mockResolvedValue([]);
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    expect(t.fields).toEqual([]);
  });
});

describe("saveTemplateFields: translating placeholderId to slotId (060)", () => {
  it("maps a field's placeholderId to the matching slot's slotId", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    const clientPlaceholder = t.placeholders.find(p => p.backendSlotId === "wfs_client")!;

    mockSaveFields.mockResolvedValue([
      {
        fieldId: "wff_1", slotId: "wfs_client", type: "signature",
        pageNumber: 1, rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
        required: true, label: "Sign here", layer: 0,
      },
    ]);

    await saveTemplateFields(WORKSPACE, TEMPLATE_ID, [{
      id: "local-1", type: "signature", documentId: "doc_1", pageId: "page-1",
      rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      placeholderId: clientPlaceholder.id, required: true, label: "Sign here",
      layer: 0, demonstrationOnly: true,
    }], t.placeholders);

    const sent = mockSaveFields.mock.calls[0]![2];
    expect(sent[0]!.slotId).toBe("wfs_client");
    expect(sent[0]!.pageNumber).toBe(1);
    // A locally-generated id is never sent back as an identity to preserve.
    expect(sent[0]!.fieldId).toBeUndefined();
  });

  it("skips a Sender Prefill field (placeholderId: null) and reports it", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    mockSaveFields.mockResolvedValue([]);

    const result = await saveTemplateFields(WORKSPACE, TEMPLATE_ID, [{
      id: "local-1", type: "signature", documentId: "doc_1", pageId: "page-1",
      rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      placeholderId: null, required: true, label: "Prefill", layer: 0,
      demonstrationOnly: true,
    }], t.placeholders);

    expect(result.skipped).toBe(1);
    expect(mockSaveFields.mock.calls[0]![2]).toEqual([]);
  });

  it("PRESERVES a backend-issued field id across a save", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    const clientPlaceholder = t.placeholders.find(p => p.backendSlotId === "wfs_client")!;
    mockSaveFields.mockResolvedValue([]);

    await saveTemplateFields(WORKSPACE, TEMPLATE_ID, [{
      id: "wff_1", type: "signature", documentId: "doc_1", pageId: "page-1",
      rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
      placeholderId: clientPlaceholder.id, required: true, label: "Sign here",
      layer: 0, demonstrationOnly: false,
    }], t.placeholders);

    const sent = mockSaveFields.mock.calls[0]![2];
    expect(sent[0]!.fieldId).toBe("wff_1");
  });

  it("maps the SAVED response's slotId back to placeholderId", async () => {
    const t = await getTemplate(WORKSPACE, TEMPLATE_ID) as DocumentTemplate;
    const witnessPlaceholder = t.placeholders.find(p => p.backendSlotId === "wfs_witness")!;

    mockSaveFields.mockResolvedValue([
      {
        fieldId: "wff_2", slotId: "wfs_witness", type: "initials",
        pageNumber: 2, rect: { x: 0.2, y: 0.2, width: 0.1, height: 0.03 },
        required: false, label: "Initial here", layer: 1,
      },
    ]);

    const result = await saveTemplateFields(WORKSPACE, TEMPLATE_ID, [], t.placeholders);
    expect(result.fields[0]!.placeholderId).toBe(witnessPlaceholder.id);
  });
});
