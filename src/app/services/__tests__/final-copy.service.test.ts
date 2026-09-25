import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../backend-flag", () => ({ API_BASE_URL: "/api", USE_REAL_BACKEND: true }));

import { downloadFinalCopy, filenameFromDisposition } from "../real/final-copy.service";

afterEach(() => { vi.unstubAllGlobals(); });

describe("final-copy service", () => {
  it("posts the credential in the body, never the URL, and sends no cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["%PDF"]), {
      status: 200, headers: { "Content-Disposition": 'attachment; filename="Lease (signed).pdf"' },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await downloadFinalCopy("abc");
    expect(fetchMock).toHaveBeenCalledWith("/api/final-copies/download", expect.objectContaining({
      method: "POST", credentials: "omit", body: JSON.stringify({ token: "abc" }),
    }));
    expect(result).toMatchObject({ kind: "ok", filename: "Lease (signed).pdf" });
  });

  it.each([401, 422])("reads %i as an unusable link", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    expect(await downloadFinalCopy("abc")).toEqual({ kind: "invalid" });
  });

  it("reads a 500 or a network failure as a retryable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    expect(await downloadFinalCopy("abc")).toEqual({ kind: "error" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await downloadFinalCopy("abc")).toEqual({ kind: "error" });
  });

  it("falls back to a safe filename", () => {
    expect(filenameFromDisposition(null)).toBe("signed-document.pdf");
  });
});
