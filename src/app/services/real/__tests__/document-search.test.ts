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

  it("shows a completed document's Verification ID, so identical titles can be told apart", async () => {
    apiRequest.mockImplementation((path: string) => Promise.resolve(path.includes("/signing-requests")
      ? { ...EMPTY_PAGE, total: 2, items: [
          row({ signingRequestId: "sr_a", documentId: "doc_a", state: "completed", sentAt: "2026-09-20T01:00:00.000Z" }),
          row({ signingRequestId: "sr_b", documentId: "doc_b", state: "completed", sentAt: "2026-09-20T01:00:00.000Z" }),
        ] }
      : { items: [{ documentId: "doc_a", verificationId: "LAGDA-VER-2026-AAAA" }, { documentId: "doc_b", verificationId: "LAGDA-VER-2026-BBBB" }], total: 2, page: 1, perPage: 100, hasNextPage: false }));
    const res = await searchPaletteReal("ws_1", "employ", "documents");
    const [a, b] = res.groups.find(g => g.scope === "documents")?.results ?? [];
    expect(a?.description).toContain("LAGDA-VER-2026-AAAA");
    expect(b?.description).toContain("LAGDA-VER-2026-BBBB");
    expect(a?.description).not.toBe(b?.description);
  });

  it("asks for no Verification IDs when nothing found is completed, and survives the lookup failing", async () => {
    apiRequest.mockResolvedValue({ ...EMPTY_PAGE, items: [row()], total: 1 });
    await searchPaletteReal("ws_1", "employ", "documents");
    expect(apiRequest).toHaveBeenCalledTimes(1);

    apiRequest.mockReset();
    apiRequest.mockImplementation((path: string) => path.includes("/signing-requests")
      ? Promise.resolve({ ...EMPTY_PAGE, items: [row({ state: "completed" })], total: 1 })
      : Promise.reject(new Error("offline")));
    const res = await searchPaletteReal("ws_1", "employ", "documents");
    expect(res.groups.find(g => g.scope === "documents")?.results).toHaveLength(1);
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
