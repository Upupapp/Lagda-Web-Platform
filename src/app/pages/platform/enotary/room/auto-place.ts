// The notarial block placed for the notary (so a notarization needs no dragging): at the foot of the document's last page
// when the page has room there below its own content, else on a page of its own added at the end. The notary can still
// move it on the placing page; this only decides where it goes when they have not.
//
// The last page is drawn small and read row by row for ink between the margins. The footer band at the very bottom (a page
// number, a running footer) is not counted as content: the block sits above it, where the server draws it by default.

import type { PDFDocumentProxy } from "pdfjs-dist";
import type { BlockPlacements } from "../../../../services/real/enotary-sessions.service";
import { A4_K, BLOCK_HEIGHT, BLOCK_WIDTH, defaultBlockPoint } from "./notarial-block";

/** The band at the foot of a page kept for its footer, in points (the block's default place sits just above it). */
export const FOOTER_BAND = 52;
/** Clear space kept between the document's last line and the block, in points. */
export const CLEAR_GAP = 14;
/** The scale the last page is read at: enough to see a line of small print, cheap to draw. */
const READ_SCALE = 0.75;
/** A pixel darker than this (0 black, 255 white) is ink. */
const INK_BELOW = 200;

const marginOf = (pw: number): number => Math.min(36, pw * 0.06);

/** The block's height on a page `pw` points wide, as the server draws it. */
export function blockHeightOn(pw: number): number {
  return BLOCK_HEIGHT * Math.min(A4_K, (pw - marginOf(pw) * 2) / BLOCK_WIDTH);
}

/**
 * Where the block goes on a page `pw` by `ph` points whose rows of ink are `ink` (`ink[r]` is true when row r, of
 * `ink.length` rows spread over the page's height, has ink between the margins): its default place across the foot,
 * when that place is clear of the page's content with CLEAR_GAP to spare; null when it is not (no room on this page).
 */
export function clearSpotAtFoot(ink: readonly boolean[], pw: number, ph: number): { x: number; y: number } | null {
  const rowsPerPoint = ink.length / ph;
  const contentEnd = ph - FOOTER_BAND; // below this is the footer band, not content
  let lastInk = -1;
  for (let row = Math.min(ink.length, Math.floor(contentEnd * rowsPerPoint)) - 1; row >= 0; row -= 1) {
    if (ink[row] === true) { lastInk = row; break; }
  }
  const lastInkAt = lastInk < 0 ? 0 : (lastInk + 1) / rowsPerPoint;
  const blockTop = contentEnd - blockHeightOn(pw);
  return blockTop - lastInkAt >= CLEAR_GAP ? defaultBlockPoint(pw, ph) : null;
}

/** Rows of ink on a page drawn into `pixels` (RGBA, `width` by `height`), looking only between `left` and `right`. */
export function inkRowsOf(pixels: Uint8ClampedArray, width: number, height: number, left: number, right: number): boolean[] {
  const rows: boolean[] = [];
  for (let y = 0; y < height; y += 1) {
    let found = false;
    for (let x = Math.max(0, left); x < Math.min(width, right) && !found; x += 1) {
      const i = (y * width + x) * 4;
      // Luminance, on the white the page was drawn over.
      const lum = 0.299 * (pixels[i] ?? 255) + 0.587 * (pixels[i + 1] ?? 255) + 0.114 * (pixels[i + 2] ?? 255);
      if (lum < INK_BELOW) found = true;
    }
    rows.push(found);
  }
  return rows;
}

/** Where the block goes in this document when the notary has not placed it: the foot of the last page, or its own page. */
export async function autoPlacement(doc: PDFDocumentProxy): Promise<BlockPlacements> {
  const pageNumber = doc.numPages;
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: READ_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) return { block: { page: pageNumber, ...defaultBlockPoint(base.width, base.height) } };
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  const margin = marginOf(base.width) * READ_SCALE;
  const ink = inkRowsOf(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height,
    Math.floor(margin), Math.ceil(canvas.width - margin));
  const spot = clearSpotAtFoot(ink, base.width, base.height);
  return spot === null ? { blockOwnPage: true } : { block: { page: pageNumber, x: spot.x, y: spot.y } };
}
