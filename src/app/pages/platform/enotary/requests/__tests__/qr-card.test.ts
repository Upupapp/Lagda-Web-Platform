// The QR card: the generated code decodes to the link (proved with a QR
// decoder on the card's own path), the centre mark stays small, and the card
// says what it should.

import { describe, it, expect } from "vitest";
import jsQR from "jsqr";
import {
  buildCardSvg, rasterizeModules, qrMatrix, logoModules, logoShare, shortLinkLines, cardFileName, QUIET_MODULES,
} from "../qr-card";

const SECRET = "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MEFCQ0RFRkdISUo";
const LINK = `https://lagda.io/enotary/invite/${SECRET}`;
const INPUT = { link: LINK, notaryName: "Ana Maria Cruz", expiresLabel: "Expires Mon 20 Oct, 9:14 AM" };

describe("the QR code on the card", () => {
  it("decodes to exactly the link, at a size a phone camera reads", () => {
    const svg = buildCardSvg(INPUT);
    for (const scale of [4, 6, 10]) {
      const image = rasterizeModules(svg, scale);
      const decoded = jsQR(image.data, image.width, image.height);
      expect(decoded?.data, `scale ${String(scale)}`).toBe(LINK);
    }
  });

  it("decodes for links of other lengths and for a long notary name", () => {
    for (const link of ["https://lagda.io/enotary/invite/abc", `${LINK}?x=${"y".repeat(60)}`]) {
      const svg = buildCardSvg({ ...INPUT, link, notaryName: "A very long name ".repeat(6) });
      const image = rasterizeModules(svg, 6);
      expect(jsQR(image.data, image.width, image.height)?.data).toBe(link);
    }
  });

  it("uses error correction H: a code with a damaged corner of data still decodes", () => {
    const image = rasterizeModules(buildCardSvg(INPUT), 8);
    // Wipe a block that is far from the finder patterns and the centre mark.
    const { data, width } = image;
    const from = Math.floor(width * 0.6);
    for (let y = from; y < from + Math.floor(width * 0.12); y++) {
      for (let x = Math.floor(width * 0.35); x < Math.floor(width * 0.35) + Math.floor(width * 0.12); x++) {
        const at = (y * width + x) * 4;
        data[at] = data[at + 1] = data[at + 2] = 255;
      }
    }
    expect(jsQR(data, width, image.height)?.data).toBe(LINK);
  });

  it("keeps a quiet zone of at least 4 modules and covers well under 20% of the code with the mark", () => {
    const matrix = qrMatrix(LINK);
    expect(QUIET_MODULES).toBeGreaterThanOrEqual(4);
    expect(logoShare(matrix.size)).toBeLessThanOrEqual(0.2);
    expect(logoModules(matrix.size) % 2).toBe(1);
    const path = /data-qr="modules" d="([^"]*)"/.exec(buildCardSvg(INPUT))?.[1] ?? "";
    const coords = [...path.matchAll(/M(\d+) (\d+)h(\d+)/g)].map(m => [Number(m[1]), Number(m[2]), Number(m[3])] as const);
    expect(Math.min(...coords.map(([x]) => x))).toBeGreaterThanOrEqual(QUIET_MODULES);
    expect(Math.min(...coords.map(([, y]) => y))).toBeGreaterThanOrEqual(QUIET_MODULES);
    expect(Math.max(...coords.map(([x, , w]) => x + w))).toBeLessThanOrEqual(QUIET_MODULES + matrix.size);
  });
});

describe("the card", () => {
  it("names the notary, the expiry and the short link, with the seal and the logo", () => {
    const svg = buildCardSvg(INPUT, "data:image/svg+xml;base64,AAAA");
    expect(svg).toContain("Scan only if you are Atty.");
    expect(svg).toContain("Ana Maria Cruz");
    expect(svg).toContain("Expires Mon 20 Oct, 9:14 AM");
    expect(svg).toContain("lagda.io/enotary/invite/");
    expect(svg).toContain(SECRET);
    expect(svg).not.toContain("https://lagda.io");
    expect(svg).toContain("LAGDA IO CERTIFIED");
    expect(svg).toContain("E-Notary");
    expect(svg).toContain('href="data:image/svg+xml;base64,AAAA"');
    expect(svg).not.toMatch(/accredited|available|book/i);
  });

  it("escapes a name that has markup in it", () => {
    const svg = buildCardSvg({ ...INPUT, notaryName: 'A <b>"x"</b> & Co' });
    expect(svg).not.toContain("<b>");
    expect(svg).toContain("&lt;b&gt;");
  });

  it("splits the link without its scheme and names the file safely", () => {
    expect(shortLinkLines(LINK)).toEqual(["lagda.io/enotary/invite/", SECRET]);
    expect(cardFileName("Ana Maria Cruz")).toBe("lagda-enotary-request-ana-maria-cruz.png");
    expect(cardFileName("???")).toBe("lagda-enotary-request-card.png");
  });
});
