// Lifting a signature off the paper it was photographed on.
//
// ── The defect this exists to fix ─────────────────────────────────────────
//
// `trimmedPng` finds the signature by scanning for non-transparent pixels —
// correct for the drawn pad it was written for, where the canvas starts
// transparent and the only opaque pixels are ink. Its own comment says so:
// "anything non-transparent is ink by definition".
//
// A photograph is opaque everywhere. So the bounding box came back as the
// whole rectangle, the entire sheet of paper was submitted as the signature,
// and it was scaled so the PAPER's longest side was 512px — leaving the
// signature a few pixels tall inside a white block that then covers whatever
// it is placed over on the document.
//
// ── Why this is a pure function over pixels ───────────────────────────────
//
// No canvas, no DOM. The interesting behaviour here is arithmetic, and
// arithmetic that can only be tested through a jsdom canvas stub is
// arithmetic that is not really tested. The caller does the getImageData /
// putImageData glue.
//
// ── Why it refuses more often than you might expect ───────────────────────
//
// Two guards, both of which return "changed nothing" rather than guessing:
//
//   1. An image that ALREADY has transparent pixels is already a cutout.
//      Someone who uploads a prepared transparent PNG has told us exactly
//      what they want, and that path works correctly today. Re-deriving a
//      background for it could only make it worse.
//
//   2. An image too small to have a border ring has nowhere to sample a
//      background from. Guessing from a handful of pixels is worse than
//      leaving it alone.

/** Below this, there is no meaningful border to sample. */
const MIN_DIMENSION_FOR_SAMPLING = 16;

/** Width of the ring sampled to estimate the paper colour. */
const BORDER_RING = 2;

/** Illumination is estimated on a coarse grid of this many cells per axis. */
const FIELD_CELLS = 12;

/**
 * How far from the local paper colour a pixel must be before it counts as ink
 * at all. Below this it is paper, full stop — this is the noise floor.
 */
const DEFAULT_SOFT_FLOOR = 0.10;

/**
 * Full opacity is pinned to this percentile of the distances actually present,
 * not to a fixed number.
 *
 * A fixed ceiling was the first thing I tried and it was wrong: with the band
 * at 0.10-0.30, a pixel halfway between paper and ink sat far past the top and
 * came out fully opaque. That thickens every stroke and throws away precisely
 * the pen-pressure and anti-aliasing this is supposed to protect.
 *
 * Measuring the ink instead makes alpha approximate INK COVERAGE: a pixel that
 * is half paper and half stroke ends up around half opaque, which is what it
 * physically is.
 *
 * Taken over the pixels ABOVE the floor, not over the whole image. A signature
 * covers a few percent of the page, so a percentile of every pixel is still
 * paper — measuring that way declared "no ink here" on images that plainly had
 * some. A percentile rather than the maximum, so one speck darker than the pen
 * cannot rescale everything else.
 */
const INK_PERCENTILE = 0.9;

/** Below this much spread, there is no ink here — just paper. */
const MIN_INK_DISTANCE = 0.06;

/** Resolution of the histogram used to find the percentile. */
const HISTOGRAM_BINS = 256;

export interface BackgroundRemovalOptions {
  /**
   * 0 removes only what is clearly not paper; 1 is aggressive. 0.5 is neutral.
   * Exposed because auto-detection genuinely fails on faint pencil and on dark
   * paper, and one honest control beats five guesses.
   */
  sensitivity?: number;
}

export interface BackgroundRemovalResult {
  /** False when a guard declined. The caller should leave the pixels alone. */
  changed: boolean;
  /** Why, for the preview to explain itself. */
  reason?: "already-transparent" | "too-small";
  /** Share of pixels that survived as at least partly opaque. */
  inkRatio?: number;
}

/** Perceptually weighted distance, 0..1. Green dominates luminance. */
function colourDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const dr = (r1 - r2) / 255;
  const dg = (g1 - g2) / 255;
  const db = (b1 - b2) / 255;
  return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
}

function median(values: number[]): number {
  if (values.length === 0) return 255;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  // Even-length: take the lower of the two middles rather than averaging.
  // Averaging invents a colour that was never in the image, which for a
  // two-tone scan can land exactly between paper and ink.
  return sorted[middle] ?? 255;
}

/**
 * The paper colour, from the border ring.
 *
 * Median rather than mean: a signature that runs off the edge of the crop, or
 * a dark scanner shadow down one side, would drag a mean towards the ink. A
 * median ignores a minority of outliers entirely, which is what those are.
 */
function estimateBackground(
  data: Uint8ClampedArray, width: number, height: number,
): [number, number, number] {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];

  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    reds.push(data[i] ?? 255);
    greens.push(data[i + 1] ?? 255);
    blues.push(data[i + 2] ?? 255);
  };

  for (let ring = 0; ring < BORDER_RING; ring++) {
    for (let x = ring; x < width - ring; x++) {
      sample(x, ring);
      sample(x, height - 1 - ring);
    }
    for (let y = ring; y < height - ring; y++) {
      sample(ring, y);
      sample(width - 1 - ring, y);
    }
  }

  return [median(reds), median(greens), median(blues)];
}

/**
 * A coarse map of how bright the paper is in each region.
 *
 * This is what makes a phone photo work. A single global paper colour fails
 * the moment a shadow falls across the page or the flash brightens one
 * corner: the dim half of the paper is then "far from white" and survives as
 * a grey slab. Taking the brightest value in each cell approximates the paper
 * locally, because within any small cell the paper is the brightest thing
 * present — ink is darker, by definition of ink.
 */
function estimateIlluminationField(
  data: Uint8ClampedArray, width: number, height: number,
): { cells: Float32Array; cols: number; rows: number; cellW: number; cellH: number } {
  const cols = Math.max(1, Math.min(FIELD_CELLS, Math.floor(width / 8)));
  const rows = Math.max(1, Math.min(FIELD_CELLS, Math.floor(height / 8)));
  const cellW = width / cols;
  const cellH = height / rows;
  const cells = new Float32Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * cellW);
      const y0 = Math.floor(row * cellH);
      const x1 = Math.min(width, Math.floor((col + 1) * cellW));
      const y1 = Math.min(height, Math.floor((row + 1) * cellH));

      let brightest = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          const luma =
            0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
          if (luma > brightest) brightest = luma;
        }
      }
      cells[row * cols + col] = brightest;
    }
  }

  return { cells, cols, rows, cellW, cellH };
}

/** Bilinear read of the illumination field, so cell edges do not show. */
function sampleField(
  field: ReturnType<typeof estimateIlluminationField>, x: number, y: number,
): number {
  const { cells, cols, rows, cellW, cellH } = field;
  const fx = Math.min(cols - 1, Math.max(0, x / cellW - 0.5));
  const fy = Math.min(rows - 1, Math.max(0, y / cellH - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(cols - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;

  const c00 = cells[y0 * cols + x0] ?? 255;
  const c10 = cells[y0 * cols + x1] ?? 255;
  const c01 = cells[y1 * cols + x0] ?? 255;
  const c11 = cells[y1 * cols + x1] ?? 255;

  return (
    c00 * (1 - tx) * (1 - ty) +
    c10 * tx * (1 - ty) +
    c01 * (1 - tx) * ty +
    c11 * tx * ty
  );
}

/** True when any pixel is even slightly transparent. */
function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 255) < 255) return true;
  }
  return false;
}

/**
 * Drops specks: opaque pixels with almost no opaque neighbours.
 *
 * JPEG compression noise and dust on a scanner bed both survive the alpha
 * ramp as isolated dots, and at signature scale they read as freckles around
 * the writing.
 */
function despeckle(alpha: Uint8ClampedArray, width: number, height: number): void {
  const original = new Uint8ClampedArray(alpha);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      if ((original[index] ?? 0) === 0) continue;

      let neighbours = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if ((original[(y + dy) * width + (x + dx)] ?? 0) > 0) neighbours++;
        }
      }
      // Fewer than two of eight neighbours is not a stroke.
      if (neighbours < 2) alpha[index] = 0;
    }
  }
}

/**
 * Makes the paper transparent, in place.
 *
 * `data` is RGBA as `getImageData` returns it, and is modified directly.
 */
export function removeOpaqueBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: BackgroundRemovalOptions = {},
): BackgroundRemovalResult {
  if (width < MIN_DIMENSION_FOR_SAMPLING || height < MIN_DIMENSION_FOR_SAMPLING) {
    return { changed: false, reason: "too-small" };
  }
  if (hasTransparency(data)) {
    return { changed: false, reason: "already-transparent" };
  }

  const sensitivity = Math.min(1, Math.max(0, options.sensitivity ?? 0.5));
  // Higher sensitivity lowers the noise floor, so fainter marks survive.
  const floor = DEFAULT_SOFT_FLOOR * (1.6 - sensitivity * 1.2);

  const [bgR, bgG, bgB] = estimateBackground(data, width, height);
  const field = estimateIlluminationField(data, width, height);
  const globalPaperLuma = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

  // ── Pass one: how far is every pixel from its LOCAL paper colour ────────
  const pixels = width * height;
  const distances = new Float32Array(pixels);
  const histogram = new Uint32Array(HISTOGRAM_BINS);
  let candidates = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Normalise against the local paper brightness, so a shadowed region is
      // judged against shadowed paper rather than against white.
      const localLuma = Math.max(1, sampleField(field, x, y));
      const gain = globalPaperLuma / localLuma;

      const distance = colourDistance(
        Math.min(255, (data[i] ?? 0) * gain),
        Math.min(255, (data[i + 1] ?? 0) * gain),
        Math.min(255, (data[i + 2] ?? 0) * gain),
        bgR, bgG, bgB,
      );
      distances[y * width + x] = distance;
      if (distance > floor) {
        const bin = Math.min(HISTOGRAM_BINS - 1, Math.floor(distance * HISTOGRAM_BINS));
        histogram[bin] = (histogram[bin] ?? 0) + 1;
        candidates++;
      }
    }
  }

  // ── What counts as fully inked, measured rather than assumed ────────────
  let seen = 0;
  const target = candidates * INK_PERCENTILE;
  let inkDistance = 0;
  for (let bin = 0; bin < HISTOGRAM_BINS; bin++) {
    seen += histogram[bin] ?? 0;
    if (candidates > 0 && seen >= target) {
      inkDistance = (bin + 1) / HISTOGRAM_BINS;
      break;
    }
  }

  const alpha = new Uint8ClampedArray(pixels);
  let inkPixels = 0;

  // A sheet with nothing on it has no spread to speak of. Without this, the
  // span collapses and ordinary paper noise gets stretched into "ink".
  const hasInk = inkDistance > Math.max(MIN_INK_DISTANCE, floor);
  if (hasInk) {
    const span = inkDistance - floor;
    for (let p = 0; p < pixels; p++) {
      const ramp = ((distances[p] ?? 0) - floor) / span;
      const a = Math.round(Math.min(1, Math.max(0, ramp)) * 255);
      alpha[p] = a;
      if (a > 0) inkPixels++;
    }
  }

  despeckle(alpha, width, height);

  for (let p = 0; p < width * height; p++) {
    data[p * 4 + 3] = alpha[p] ?? 0;
  }

  return { changed: true, inkRatio: inkPixels / (width * height) };
}
