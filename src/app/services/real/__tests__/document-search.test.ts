// Document search: the list client's filters, and the command palette's
// real-mode search built on them.
//
// The claims that matter:
//   the filters go to the SERVER, so a search covers every document and not
//   just the page already loaded;
//   the real palette never shows fixture records (contacts, members,
//   notifications...) as though they were the user's own;
//   a failed document search degrades to "unavailable", never to "no match".

import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../../api-client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args) as unknown,
  ApiError: class extends Error {},
}));

const { realSigningRequestService } = await import("../signing-request.service");
const { searchPaletteReal, REAL_PALETTE_SCOPES } = await import("../palette-search");

const EMPTY_PAGE = { items: [], total: 0, page: 1, perPage: 5, hasNextPage: false };

const row = (over: Record<string, unknown> = {}) => ({
  signingRequestId: "sr_1", documentId: "doc_1",
  documentTitle: "James Employment Agreement.pdf", state: "sent",
  participantCount: 1, completedParticipantCount: 0, initiator: null,
  createdAt: "2026-09-20T00:00:00.000Z", sentAt: null, completedAt: null, expiresAt: null,
  ...over,
});

beforeEach(() => { apiRequest.mockReset(); });

describe("the list client's filters", () => {
  it("sends name, states and signer as query parameters", async () => {
    apiRequest.mockResolvedValue(EMPTY_PAGE);
    await realSigningRequestService.list("ws_1", {
      perPage: 50, q: " lease ", states: ["sent", "partially-completed"], signer: "maria@",
    });
    const url = new URL(String(apiRequest.mock.calls[0]?.[0]), "https://x.test");
    expect(url.pathname).toBe("/workspaces/ws_1/signing-requests");
    expect(url.searchParams.get("q")).toBe("lease");
    expect(url.searchParams.get("state")).toBe("sent,partially-completed");
    expect(url.searchParams.get("signer")).toBe("maria@");
    expect(url.searchParams.get("perPage")).toBe("50");
  });

  it("omits blank filters rather than sending empty ones", async () => {
    apiRequest.mockResolvedValue(EMPTY_PAGE);
    await realSigningRequestService.list("ws_1", { q: "   ", states: [], signer: "" });
    expect(String(apiRequest.mock.calls[0]?.[0])).toBe("/workspaces/ws_1/signing-requests");
  });
});

describe("the real command palette search", () => {
  it("returns real documents from the server's title search", async () => {
    apiRequest.mockResolvedValue({ ...EMPTY_PAGE, items: [row()], total: 1 });
    const res = await searchPaletteReal("ws_1", "employ", "all");

    expect(String(apiRequest.mock.calls[0]?.[0])).toContain("q=employ");
    const documents = res.groups.find(g => g.scope === "documents");
    expect(documents?.results.map(r => r.title)).toEqual(["James Employment Agreement.pdf"]);
    // Opens the Documents page filtered to it, where the row's actions live.
    expect(documents?.results[0]?.destination.path)
      .toBe("/app/documents?q=James%20Employment%20Agreement.pdf");
  });

  it("never returns fixture records as results", async () => {
    // "a" matches something in nearly every mock provider.
    apiRequest.mockResolvedValue(EMPTY_PAGE);
    const res = await searchPaletteReal("ws_1", "an", "all");
    const scopes = res.groups.map(g => g.scope);
    expect(scopes.every(s => (REAL_PALETTE_SCOPES as readonly string[]).includes(s))).toBe(true);
    expect(scopes).not.toContain("contacts");
    expect(scopes).not.toContain("people-and-teams");
    expect(scopes).not.toContain("notifications");
  });

  it("still offers settings and help when the document search fails", async () => {
    apiRequest.mockRejectedValue(new Error("network"));
    const res = await searchPaletteReal("ws_1", "security", "all");
    expect(res.groups.some(g => g.scope === "settings")).toBe(true);
    expect(res.sourceStatuses.find(s => s.scope === "documents")?.status).toBe("unavailable");
  });

  it("does not call the server for a settings-only search", async () => {
    await searchPaletteReal("ws_1", "security", "settings");
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
