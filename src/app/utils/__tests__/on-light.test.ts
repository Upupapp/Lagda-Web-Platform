// The on-light palette, re-derived.
//
// A colour constant with a ratio in its comment is a claim, and a comment
// cannot fail. This computes the contrast from the hex values themselves, so
// an edit that darkens a background or lightens a token breaks the build
// rather than quietly shipping unreadable text.

import { describe, it, expect } from "vitest";
import { ON_LIGHT, ON_LIGHT_MEASURED, LIGHT_SURFACES } from "../on-light";

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel((n >> 16) & 255)
    + 0.7152 * channel((n >> 8) & 255)
    + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const hi = Math.max(first, second);
  const lo = Math.min(first, second);
  return (hi + 0.05) / (lo + 0.05);
}

/** The value it replaced, for the regression assertions below. */
const PREVIOUS = {
  muted: "#94A3B8",
  slate: "#64748B",
  success: "#16A34A",
  azure: "#0078D4",
  gold: "#C9960C",
} as const;

describe("every on-light colour clears AA on every light surface", () => {
  for (const [name, hex] of Object.entries(ON_LIGHT)) {
    it(`${name} (${hex}) is at least 4.5:1 everywhere`, () => {
      for (const surface of LIGHT_SURFACES) {
        const ratio = contrast(hex, surface);
        expect(ratio, `${name} ${hex} on ${surface} is ${ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe("the documented worst case is the real worst case", () => {
  for (const [name, hex] of Object.entries(ON_LIGHT)) {
    it(`${name} matches its recorded ratio`, () => {
      const worst = Math.min(...LIGHT_SURFACES.map(s => contrast(hex, s)));
      const claimed = ON_LIGHT_MEASURED[name as keyof typeof ON_LIGHT_MEASURED];
      // Within a rounding step of the value written in the module.
      expect(Math.abs(worst - claimed)).toBeLessThan(0.05);
    });
  }
});

describe("each replacement is an improvement, not a reshuffle", () => {
  for (const [name, hex] of Object.entries(ON_LIGHT)) {
    it(`${name} beats the value it replaced`, () => {
      const before = PREVIOUS[name as keyof typeof PREVIOUS];
      const worstNow = Math.min(...LIGHT_SURFACES.map(s => contrast(hex, s)));
      const worstBefore = Math.min(...LIGHT_SURFACES.map(s => contrast(before, s)));
      expect(worstNow).toBeGreaterThan(worstBefore);
    });
  }
});

describe("these are not for navy", () => {
  it("every one of them fails on the navy surface, which is the point", () => {
    // Stated as a test so nobody reaches for this module when styling the
    // dark public sections. theme.css's `--lagda-on-navy-*` ramp is correct
    // there; these would be dark-on-dark.
    for (const hex of Object.values(ON_LIGHT)) {
      expect(contrast(hex, "#07111F")).toBeLessThan(4.5);
    }
  });
});
