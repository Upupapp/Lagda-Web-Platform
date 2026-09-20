// The saved-signature client.
//
// What matters here is the shape of what goes over the wire and what comes
// back, because the server's contract is closed: an extra property is a 400,
// and a data-URL prefix is refused by a regex rather than stripped.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const apiRequest = vi.fn();
vi.mock("../../api-client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args) as unknown,
  ApiError: class extends Error {},
}));

const {
  realUserSignatureService, toSignatureValue, toPreviewDataUrl,
} = await import("../user-signatures.service");

beforeEach(() => { apiRequest.mockReset(); });
afterEach(() => { vi.clearAllMocks(); });

describe("saving", () => {
  it("PUTs to the purpose, so saving twice replaces", async () => {
    // The server keeps at most one per purpose, enforced by a UNIQUE
    // constraint. PUT is the verb that matches: idempotent, addressed.
    apiRequest.mockResolvedValue({ purpose: "signature", digest: "x" });

    await realUserSignatureService.save(
      "signature", { method: "drawn", base64: "AAAA" });

    expect(apiRequest).toHaveBeenCalledWith("/me/signatures/signature", {
      method: "PUT",
      body: { representation: { method: "drawn", base64: "AAAA" } },
    });
  });

  it("sends initials to their own slot", async () => {
    apiRequest.mockResolvedValue({ purpose: "initials", digest: "x" });
    await realUserSignatureService.save(
      "initials", { method: "typed", text: "RU", styleIndex: 0 });
    expect(apiRequest).toHaveBeenCalledWith(
      "/me/signatures/initials", expect.anything());
  });

  it("does not wrap the representation in anything the contract refuses", async () => {
    // additionalProperties: false — a stray field is a 400, not a warning.
    apiRequest.mockResolvedValue({ purpose: "signature", digest: "x" });
    await realUserSignatureService.save(
      "signature", { method: "typed", text: "Real User", styleIndex: 2 });
    const [, init] = apiRequest.mock.calls[0] as [string, { body: unknown }];
    expect(init.body).toEqual({
      representation: { method: "typed", text: "Real User", styleIndex: 2 },
    });
  });
});

describe("listing", () => {
  it("unwraps the envelope", async () => {
    apiRequest.mockResolvedValue({ signatures: [{ purpose: "signature" }] });
    const result = await realUserSignatureService.list();
    expect(result).toEqual([{ purpose: "signature" }]);
  });

  it("returns an empty list rather than undefined for a new account", async () => {
    apiRequest.mockResolvedValue({ signatures: [] });
    expect(await realUserSignatureService.list()).toEqual([]);
  });
});

describe("removing", () => {
  it("DELETEs the purpose", async () => {
    apiRequest.mockResolvedValue(undefined);
    await realUserSignatureService.remove("initials");
    expect(apiRequest).toHaveBeenCalledWith(
      "/me/signatures/initials", { method: "DELETE" });
  });
});

describe("turning a saved entry back into a signature value", () => {
  it("rebuilds a typed one", () => {
    expect(toSignatureValue({
      purpose: "signature", method: "typed", text: "Real User", styleIndex: 1,
      digest: "d", validatedAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    })).toEqual({ method: "typed", text: "Real User", styleIndex: 1 });
  });

  it("rebuilds a drawn one without a data-URL prefix", () => {
    // The server's regex refuses a prefixed payload outright rather than
    // stripping it, so putting one back would fail at submission.
    const value = toSignatureValue({
      purpose: "signature", method: "drawn", base64: "AAAA",
      digest: "d", validatedAt: null, updatedAt: "2026-01-01T00:00:00Z",
    });
    expect(value).toEqual({ method: "drawn", base64: "AAAA" });
    expect(JSON.stringify(value)).not.toContain("data:");
  });

  it("returns null for an entry missing the field its method needs", () => {
    // Rather than producing a half-built value that fails later, at signing.
    expect(toSignatureValue({
      purpose: "signature", method: "drawn",
      digest: "d", validatedAt: null, updatedAt: "2026-01-01T00:00:00Z",
    })).toBeNull();
    expect(toSignatureValue({
      purpose: "signature", method: "typed", text: "x",
      digest: "d", validatedAt: null, updatedAt: "2026-01-01T00:00:00Z",
    })).toBeNull();
  });
});

describe("previewing", () => {
  it("builds a data URL for a drawn entry", () => {
    expect(toPreviewDataUrl({
      purpose: "signature", method: "drawn", base64: "AAAA",
      digest: "d", validatedAt: null, updatedAt: "2026-01-01T00:00:00Z",
    })).toBe("data:image/png;base64,AAAA");
  });

  it("has no image to show for a typed entry", () => {
    expect(toPreviewDataUrl({
      purpose: "signature", method: "typed", text: "Real User", styleIndex: 0,
      digest: "d", validatedAt: null, updatedAt: "2026-01-01T00:00:00Z",
    })).toBeNull();
  });
});
