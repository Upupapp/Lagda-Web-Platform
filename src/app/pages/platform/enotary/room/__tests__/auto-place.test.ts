// The notarial block placed for the notary: the foot of the last page when it is clear below the document's text,
// otherwise a page of its own.

import { describe, it, expect } from "vitest";
import { CLEAR_GAP, FOOTER_BAND, blockHeightOn, clearSpotAtFoot, inkRowsOf } from "../auto-place";
import { defaultBlockPoint } from "../notarial-block";

const A4 = { w: 595.28, h: 841.89 };
/** One row per point, with ink from the top of the page down to `endsAt` points. */
const page = (endsAt: number, extra: number[] = []): boolean[] =>
  Array.from({ length: Math.round(A4.h) }, (_, row) => row < endsAt || extra.includes(row));

describe("the clear space at the foot of the last page", () => {
  const room = A4.h - FOOTER_BAND - blockHeightOn(A4.w) - CLEAR_GAP;

  it("takes the foot when the text ends well above it", () => {
    expect(clearSpotAtFoot(page(400), A4.w, A4.h)).toEqual(defaultBlockPoint(A4.w, A4.h));
  });

  it("takes the foot of an empty page", () => {
    expect(clearSpotAtFoot(page(0), A4.w, A4.h)).toEqual(defaultBlockPoint(A4.w, A4.h));
  });

  it("finds no room when the text runs into the block's place", () => {
    expect(clearSpotAtFoot(page(Math.ceil(room) + 5), A4.w, A4.h)).toBeNull();
    expect(clearSpotAtFoot(page(780), A4.w, A4.h)).toBeNull();
  });

  it("does not count the footer band (a page number) as content", () => {
    expect(clearSpotAtFoot(page(400, [Math.round(A4.h - 20)]), A4.w, A4.h)).toEqual(defaultBlockPoint(A4.w, A4.h));
  });

  it("reads the same at any number of rows", () => {
    const half = page(400).filter((_, row) => row % 2 === 0);
    expect(clearSpotAtFoot(half, A4.w, A4.h)).toEqual(defaultBlockPoint(A4.w, A4.h));
  });
});

describe("rows of ink", () => {
  it("finds dark pixels between the margins only", () => {
    const width = 10, height = 3;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    const dark = (x: number, y: number) => { const i = (y * width + x) * 4; pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; };
    dark(5, 0); // inside the margins
    dark(0, 2); // in the left margin
    expect(inkRowsOf(pixels, width, height, 2, 8)).toEqual([true, false, false]);
  });
});
