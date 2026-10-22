// 127. The notarial block: the one mark a notarized page carries (the notary's firm, name, commission, register place,
// signature and seal, drawn together), and where it goes. The server draws it; these are the same measures, so the place
// the notary sees is the place it will have.
//
// The block is BLOCK_WIDTH design pixels across (an A4 page is 794): the full width of an A4 page less its margins, 523
// points. On a narrower page it is drawn smaller, to fit between the margins. Its centre is where the notary put it, kept
// inside the margins and clear of the page's footer; with no place, it sits across the foot of the last page.

import type { BlockPlacements, PagePoint } from "../../../../services/real/enotary-sessions.service";

export const A4_K = 595.28 / 794;
export const BLOCK_WIDTH = 698;
/** Its height for a name on one line, as the server measures it (a long name adds a few pixels). */
export const BLOCK_HEIGHT = 127;

const marginOf = (pw: number): number => Math.min(36, pw * 0.06);

/** The block's scale and box on a page `pw` by `ph` points, with its centre at `point` (fractions of the page). */
export function blockBox(point: { x: number; y: number }, pw: number, ph: number): { k: number; left: number; top: number; width: number; height: number } {
  const margin = marginOf(pw);
  const k = Math.min(A4_K, (pw - margin * 2) / BLOCK_WIDTH);
  const width = BLOCK_WIDTH * k, height = BLOCK_HEIGHT * k;
  const cx = Math.min(Math.max(point.x * pw, margin + width / 2), pw - margin - width / 2);
  const cy = Math.min(Math.max(point.y * ph, height / 2 + 6), ph - height / 2 - 40);
  return { k, left: cx - width / 2, top: cy - height / 2, width, height };
}

/** Where the block goes when the notary has not placed it: across the foot of the page, clear of its footer. */
export function defaultBlockPoint(pw: number, ph: number): { x: number; y: number } {
  const k = Math.min(A4_K, (pw - marginOf(pw) * 2) / BLOCK_WIDTH);
  return { x: 0.5, y: (ph - 52 - (BLOCK_HEIGHT * k) / 2) / ph };
}

/** The block's place as the act will use it: its own, else (a session saved before it) the seal's page and height. */
export function blockOf(placements: BlockPlacements): PagePoint | undefined {
  if (placements.block !== undefined) return placements.block;
  return placements.seal === undefined ? undefined : { page: placements.seal.page, x: 0.5, y: placements.seal.y };
}

/** Where the block goes, in words, for the notary. */
export function blockWords(placements: BlockPlacements): string {
  if (placements.blockOwnPage === true) return "On a page of its own at the end";
  const point = blockOf(placements);
  if (point === undefined) return "Across the foot of the last page";
  const row = point.y < 0.34 ? "top" : point.y > 0.66 ? "foot" : "middle";
  return `Page ${String(point.page)}, ${row === "foot" ? "at the foot" : row === "top" ? "at the top" : "in the middle"}`;
}

/** Two letters at most, as the server picks them: "Del Rosario & Del Rosario" is "DR". */
export function initialsOf(name: string): string {
  const words = name.replace(/\([^)]*\)/g, " ").split(/[\s&,.-]+/).filter(word => /^[A-Za-z]/.test(word) && !/^(and|of|the|law|office|offices|firm)$/i.test(word));
  const unique = [...new Set(words.map(word => word.charAt(0).toUpperCase()))];
  return unique.length === 0 ? "N" : unique.slice(0, 2).join("");
}

/** The name as the seal prints it: short names whole, longer ones as initials and the surname. */
export function sealName(name: string): string {
  const plain = name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  if (plain.length <= 14) return plain;
  const words = plain.split(" ");
  if (words.length < 2) return plain.slice(0, 14);
  return `${words.slice(0, -1).map(word => `${word.charAt(0)}.`).join(" ")} ${words.at(-1) ?? ""}`;
}
