// A picked picture becomes what the server keeps as a signature: small ones go as they are, large ones are shrunk to a PNG.

import { describe, it, expect, vi, afterEach } from "vitest";
import { prepareSignature, signatureFileProblem, SIGNATURE_MAX_BYTES } from "../signature-image";

const file = (size: number, type: string) => new File([new Uint8Array(size)], "sig", { type });

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("signatureFileProblem", () => {
  it("takes a PNG, JPEG or WebP of up to 8 MB, and says why it cannot take anything else", () => {
    expect(signatureFileProblem(file(10, "image/png"))).toBeNull();
    expect(signatureFileProblem(file(2_000_000, "image/webp"))).toBeNull();
    expect(signatureFileProblem(file(10, "image/gif"))).toContain("PNG, JPEG or WebP");
    expect(signatureFileProblem(file(0, "image/png"))).toContain("empty");
    expect(signatureFileProblem(file(8 * 1024 * 1024 + 1, "image/png"))).toContain("8 MB");
  });
});

describe("prepareSignature", () => {
  it("sends a small PNG or JPEG exactly as it is", async () => {
    const out = await prepareSignature(new File([new Uint8Array([1, 2, 3])], "s.png", { type: "image/png" }));
    expect(out).toEqual({ mediaType: "image/png", base64: "AQID" });
  });

  it("shrinks a large picture to a PNG that fits, drawing it smaller until it does", async () => {
    class FakeImage { naturalWidth = 3000; naturalHeight = 1200; onload: (() => void) | null = null; onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => { this.onload?.(); }); } }
    vi.stubGlobal("Image", FakeImage);
    URL.createObjectURL = vi.fn(() => "blob:x"); URL.revokeObjectURL = vi.fn();
    const sizes: number[] = [];
    const big = "A".repeat(Math.ceil((SIGNATURE_MAX_BYTES * 4) / 3) + 100);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag !== "canvas") return document.createElementNS("http://www.w3.org/1999/xhtml", tag);
      const canvas = { width: 0, height: 0,
        getContext: () => ({ drawImage: () => { sizes.push(canvas.width); } }),
        toDataURL: () => `data:image/png;base64,${sizes.length < 2 ? big : "AQID"}` };
      return canvas;
    }) as never);
    const out = await prepareSignature(file(SIGNATURE_MAX_BYTES + 1, "image/jpeg"));
    expect(out).toEqual({ mediaType: "image/png", base64: "AQID" });
    expect(sizes[0]).toBe(700);
    expect(sizes[1]).toBeLessThan(sizes[0] ?? 0);
  });
});
