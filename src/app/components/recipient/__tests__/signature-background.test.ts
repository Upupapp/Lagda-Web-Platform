// Lifting a signature off its paper.
//
// These tests build real pixel buffers rather than stubbing a canvas, because
// the behaviour worth testing here is the arithmetic. A jsdom canvas cannot
// rasterise, so anything asserted through one would be asserting the stub.

import { describe, it, expect } from "vitest";
import { removeOpaqueBackground } from "../signature-background";

/** An opaque RGBA buffer filled with one colour. */
function filled(
  width: number, height: number, [r, g, b]: [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    data[p * 4] = r;
    data[p * 4 + 1] = g;
    data[p * 4 + 2] = b;
    data[p * 4 + 3] = 255;
  }
  return data;
}

function setPixel(
  data: Uint8ClampedArray, width: number, x: number, y: number,
  [r, g, b]: [number, number, number],
): void {
  const i = (y * width + x) * 4;
  data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
}

function alphaAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3] ?? 0;
}

/** A dark horizontal stroke across the middle — a crude "signature". */
function withStroke(
  data: Uint8ClampedArray, width: number, height: number,
  ink: [number, number, number] = [20, 20, 30],
): void {
  const y = Math.floor(height / 2);
  for (let x = 4; x < width - 4; x++) {
    setPixel(data, width, x, y, ink);
    setPixel(data, width, x, y + 1, ink);
  }
}

const WHITE: [number, number, number] = [255, 255, 255];
const CREAM: [number, number, number] = [242, 236, 220];
const BLUE_PAPER: [number, number, number] = [180, 205, 235];

describe("the guards", () => {
  it("declines an image that is already a cutout", () => {
    // Someone who uploads a prepared transparent PNG has said what they want,
    // and that path already works. Re-deriving a background could only spoil it.
    const data = filled(40, 40, WHITE);
    data[3] = 0; // one transparent pixel is enough to tell

    const result = removeOpaqueBackground(data, 40, 40);

    expect(result.changed).toBe(false);
    expect(result.reason).toBe("already-transparent");
  });

  it("leaves a cutout's pixels untouched", () => {
    const data = filled(40, 40, WHITE);
    data[3] = 0;
    const before = new Uint8ClampedArray(data);

    removeOpaqueBackground(data, 40, 40);

    expect(Array.from(data)).toEqual(Array.from(before));
  });

  it("declines an image too small to have a border to sample", () => {
    const data = filled(4, 4, WHITE);
    const result = removeOpaqueBackground(data, 4, 4);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe("too-small");
  });

  it("leaves a tiny image's pixels untouched", () => {
    // The existing SignatureCapture tests stub a 1x1 opaque canvas. This guard
    // is why those tests keep passing unmodified.
    const data = filled(1, 1, [0, 0, 0]);
    const before = new Uint8ClampedArray(data);

    removeOpaqueBackground(data, 1, 1);

    expect(Array.from(data)).toEqual(Array.from(before));
  });
});

describe("white paper", () => {
  it("makes the paper transparent and keeps the ink", () => {
    const data = filled(40, 40, WHITE);
    withStroke(data, 40, 40);

    const result = removeOpaqueBackground(data, 40, 40);

    expect(result.changed).toBe(true);
    expect(alphaAt(data, 40, 20, 20)).toBeGreaterThan(200); // on the stroke
    expect(alphaAt(data, 40, 20, 5)).toBe(0);               // bare paper
    expect(alphaAt(data, 40, 2, 2)).toBe(0);                // corner
  });

  it("reports roughly how much of the image survived as ink", () => {
    const data = filled(40, 40, WHITE);
    withStroke(data, 40, 40);

    const result = removeOpaqueBackground(data, 40, 40);

    // Two rows of 32 out of 1600 pixels — small, but not zero.
    expect(result.inkRatio).toBeGreaterThan(0);
    expect(result.inkRatio).toBeLessThan(0.2);
  });
});

describe("paper that is not white", () => {
  // The requirement was "white or any color", so the background is measured,
  // never assumed.
  const PAPERS: [string, [number, number, number]][] = [
    ["cream", CREAM],
    ["blue", BLUE_PAPER],
    ["grey", [200, 200, 200]],
  ];
  for (const [name, paper] of PAPERS) {
    it(`lifts a signature off ${name} paper`, () => {
      const data = filled(40, 40, paper);
      withStroke(data, 40, 40);

      const result = removeOpaqueBackground(data, 40, 40);

      expect(result.changed).toBe(true);
      expect(alphaAt(data, 40, 20, 20)).toBeGreaterThan(180);
      expect(alphaAt(data, 40, 20, 5)).toBe(0);
    });
  }
});

describe("uneven lighting", () => {
  it("does not leave the shadowed half of the page behind", () => {
    // The failure a global threshold always has: one side of the photo is
    // dimmer, so it reads as "not white" and survives as a grey slab.
    const width = 60;
    const height = 60;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Left edge in shadow at ~55% brightness, right edge fully lit.
        const lit = Math.round(140 + (115 * x) / (width - 1));
        setPixel(data, width, x, y, [lit, lit, lit]);
      }
    }
    withStroke(data, width, height, [15, 15, 15]);

    const result = removeOpaqueBackground(data, width, height);

    expect(result.changed).toBe(true);
    // Paper in the darkest region must still go.
    expect(alphaAt(data, width, 2, 10)).toBe(0);
    expect(alphaAt(data, width, 8, 50)).toBe(0);
    // And the stroke must survive on the shadowed side too.
    expect(alphaAt(data, width, 10, 30)).toBeGreaterThan(150);
  });
});

describe("edge quality", () => {
  it("ramps alpha rather than cutting a hard edge", () => {
    // A hard threshold produces aliased, stair-stepped strokes and discards
    // pen-pressure fade. That IS the "quality of the signature" being lost.
    const width = 40;
    const height = 40;
    const data = filled(width, height, WHITE);
    const y = 20;
    // A stroke whose edge fades through mid greys.
    for (let x = 4; x < width - 4; x++) {
      setPixel(data, width, x, y, [10, 10, 10]);
      setPixel(data, width, x, y - 1, [130, 130, 130]);
      setPixel(data, width, x, y + 1, [190, 190, 190]);
    }

    removeOpaqueBackground(data, width, height);

    const core = alphaAt(data, width, 20, y);
    const mid = alphaAt(data, width, 20, y - 1);

    expect(core).toBe(255);
    // The partially-inked row is partially opaque — neither dropped nor solid.
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(255);
  });
});

describe("sensitivity", () => {
  it("keeps more of a faint signature when turned up", () => {
    const make = () => {
      const data = filled(40, 40, WHITE);
      // Faint pencil: close to the paper, easy to erase entirely.
      withStroke(data, 40, 40, [205, 205, 205]);
      return data;
    };

    const timid = make();
    removeOpaqueBackground(timid, 40, 40, { sensitivity: 0 });
    const eager = make();
    removeOpaqueBackground(eager, 40, 40, { sensitivity: 1 });

    expect(alphaAt(eager, 40, 20, 20)).toBeGreaterThan(alphaAt(timid, 40, 20, 20));
  });

  it("clamps out-of-range values instead of producing nonsense", () => {
    const data = filled(40, 40, WHITE);
    withStroke(data, 40, 40);
    expect(() => removeOpaqueBackground(data, 40, 40, { sensitivity: 99 })).not.toThrow();
    expect(alphaAt(data, 40, 20, 5)).toBe(0);
  });
});

describe("noise", () => {
  it("drops isolated specks that are not part of a stroke", () => {
    const data = filled(40, 40, WHITE);
    withStroke(data, 40, 40);
    // A lone dark dot, far from the stroke — dust, or JPEG ringing.
    setPixel(data, 40, 33, 8, [30, 30, 30]);

    removeOpaqueBackground(data, 40, 40);

    expect(alphaAt(data, 40, 33, 8)).toBe(0);
    // The real stroke is untouched by despeckling.
    expect(alphaAt(data, 40, 20, 20)).toBeGreaterThan(200);
  });
});

describe("the degenerate case", () => {
  it("a blank sheet yields no ink rather than a full rectangle", () => {
    // Uploading a photo of empty paper should produce nothing, which the
    // caller's trim then reports as "no signature" — not a white block.
    const data = filled(40, 40, WHITE);

    const result = removeOpaqueBackground(data, 40, 40);

    expect(result.changed).toBe(true);
    expect(result.inkRatio).toBe(0);
    for (let y = 0; y < 40; y += 7) {
      for (let x = 0; x < 40; x += 7) {
        expect(alphaAt(data, 40, x, y)).toBe(0);
      }
    }
  });
});
