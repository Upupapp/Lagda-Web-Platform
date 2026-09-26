import { describe, it, expect, vi, beforeEach } from "vitest";

const createTemplate = vi.fn();
const generateTemplateDocument = vi.fn();
const saveResolvedFieldAnchors = vi.fn();
vi.mock("../templates-source", () => ({
  createTemplate: (...a: unknown[]) => createTemplate(...a),
  generateTemplateDocument: (...a: unknown[]) => generateTemplateDocument(...a),
  saveResolvedFieldAnchors: (...a: unknown[]) => saveResolvedFieldAnchors(...a),
}));

import { ApiError } from "../api-client";
import { copyReadyMadeTemplate, readyMadeCopyName } from "../ready-made-create";
import { READY_MADE_TEMPLATES, readyMadePlaceholders } from "../ready-made-templates";

const source = READY_MADE_TEMPLATES[0]!;
const saved = (name: string) => ({
  id: "tpl_1", name,
  placeholders: readyMadePlaceholders(source).map((p, i) => ({ ...p, backendSlotId: `slot_${String(i)}` })),
});

beforeEach(() => {
  createTemplate.mockReset(); generateTemplateDocument.mockReset(); saveResolvedFieldAnchors.mockReset();
});

describe("copyReadyMadeTemplate", () => {
  it("creates the roles, generates the document and saves its fields", async () => {
    createTemplate.mockImplementation((_ws, draft: { name: string }) => Promise.resolve(saved(draft.name)));
    generateTemplateDocument.mockResolvedValue({ template: { id: "tpl_1", generated: true }, resolvedAnchors: [{ fieldType: "signature" }] });
    saveResolvedFieldAnchors.mockResolvedValue([]);

    const result = await copyReadyMadeTemplate("ws_1", source);

    const draft = createTemplate.mock.calls[0]![1] as { name: string; routingMode: string; placeholders: unknown[] };
    expect(draft).toMatchObject({ name: source.title, routingMode: "sequential" });
    expect(draft.placeholders).toHaveLength(source.roles.length);
    const content = (generateTemplateDocument.mock.calls[0]![2] as { content: unknown }).content;
    expect(JSON.stringify(content)).toContain("fieldAnchor");
    expect(saveResolvedFieldAnchors).toHaveBeenCalledWith("ws_1", "tpl_1", [{ fieldType: "signature" }]);
    expect(result.documentGenerated).toBe(true);
  });

  it("numbers the name when the workspace already has one by that name", async () => {
    createTemplate
      .mockRejectedValueOnce(new ApiError(409, undefined, "taken"))
      .mockRejectedValueOnce(new ApiError(409, undefined, "taken"))
      .mockImplementation((_ws, draft: { name: string }) => Promise.resolve(saved(draft.name)));
    generateTemplateDocument.mockResolvedValue({ template: { id: "tpl_1" }, resolvedAnchors: [] });

    await copyReadyMadeTemplate("ws_1", source);

    expect(createTemplate.mock.calls.map(c => (c[1] as { name: string }).name))
      .toEqual([source.title, `${source.title} (2)`, `${source.title} (3)`]);
    expect(saveResolvedFieldAnchors).not.toHaveBeenCalled();
  });

  it("does not retry an error that is not a name clash", async () => {
    createTemplate.mockRejectedValue(new ApiError(422, undefined, "bad"));
    await expect(copyReadyMadeTemplate("ws_1", source)).rejects.toThrow("bad");
    expect(createTemplate).toHaveBeenCalledTimes(1);
  });

  it("keeps the created template when only the document step fails", async () => {
    createTemplate.mockImplementation((_ws, draft: { name: string }) => Promise.resolve(saved(draft.name)));
    generateTemplateDocument.mockRejectedValue(new Error("render failed"));
    const result = await copyReadyMadeTemplate("ws_1", source);
    expect(result).toMatchObject({ documentGenerated: false, template: { id: "tpl_1" } });
  });

  it("caps a long name so the suffix still fits", () => {
    expect(readyMadeCopyName("x".repeat(300), 12).length).toBeLessThanOrEqual(200);
  });
});
