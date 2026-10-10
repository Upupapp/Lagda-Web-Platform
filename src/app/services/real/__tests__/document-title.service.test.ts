// What a title would be saved as: the request, and the answers that mean
// "nothing to say".

import { describe, it, expect, vi } from "vitest";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("../../api-client", async (original) => ({
  ...(await original<typeof import("../../api-client")>()),
  apiRequest,
}));

import { realDocumentService } from "../document.service";
import { ApiError } from "../../api-client";

describe("realDocumentService.titleSuggestion", () => {
  it("asks about the title in this workspace", async () => {
    apiRequest.mockResolvedValue({ requested: "Lease & Annex", title: "Lease & Annex (2)", changed: true });
    const answer = await realDocumentService.titleSuggestion("ws 1", "Lease & Annex");
    expect(apiRequest).toHaveBeenCalledWith("/workspaces/ws%201/documents/title-suggestion?title=Lease+%26+Annex");
    expect(answer).toEqual({ requested: "Lease & Annex", title: "Lease & Annex (2)", changed: true });
  });

  it("leaves one document out when asked to", async () => {
    apiRequest.mockResolvedValue({ requested: "Lease", title: "Lease", changed: false });
    await realDocumentService.titleSuggestion("ws_1", "Lease", "doc_1");
    expect(apiRequest.mock.calls[0]![0]).toBe("/workspaces/ws_1/documents/title-suggestion?title=Lease&excludeDocumentId=doc_1");
  });

  it("answers an older server (404) with nothing", async () => {
    apiRequest.mockRejectedValue(new ApiError(404, undefined, "Not found"));
    expect(await realDocumentService.titleSuggestion("ws_1", "Lease")).toBeNull();
  });

  it("answers a title the server refuses (422) with nothing", async () => {
    apiRequest.mockRejectedValue(new ApiError(422, undefined, "Invalid"));
    expect(await realDocumentService.titleSuggestion("ws_1", "Lease")).toBeNull();
  });

  it("lets any other failure through to the caller", async () => {
    apiRequest.mockRejectedValue(new ApiError(0, undefined, "Network error"));
    await expect(realDocumentService.titleSuggestion("ws_1", "Lease")).rejects.toBeInstanceOf(ApiError);
  });

  it("treats a missing `changed` as not changed", async () => {
    apiRequest.mockResolvedValue({ title: "Lease" });
    expect(await realDocumentService.titleSuggestion("ws_1", "Lease")).toEqual({ requested: "Lease", title: "Lease", changed: false });
  });
});
