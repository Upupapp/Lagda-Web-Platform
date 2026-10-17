// The QR card a client hands to a notary: the invitation link as a QR code with
// the LAGDA eNotary seal in the middle, the notary's name, a plain "scan only if
// you are" line, the expiry and the short link.
//
// The card is one SVG string. The page shows that SVG and the "Save the card"
// button turns the same string into a PNG, so what is saved is what is shown.
//
// ── The code ───────────────────────────────────────────────────────────────
//
// Error correction H (a quarter of the code may be lost), a quiet zone of 4
// modules, and a centre mark that covers well under a fifth of the code's
// AREA. The code is drawn as one path of dark runs, which is also what the
// tests read back and decode with a QR decoder: the proof that the card scans
// to the link is made on the card itself, not on a copy of the matrix.

import QRCode from "qrcode";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { EnotarySeal } from "../EnotaryChrome";

/** Modules of white around the code. The QR standard asks for 4. */
export const QUIET_MODULES = 4;
/** The centre mark's share of the code's area. Kept far under 20%. */
export const LOGO_AREA_SHARE = 0.16;

export interface QrMatrix {
  /** Modules along one side, without the quiet zone. */
  readonly size: number;
  readonly dark: (x: number, y: number) => boolean;
}

export function qrMatrix(text: string): QrMatrix {
  const code = QRCode.create(text, { errorCorrectionLevel: "H" });
  const { size, data } = code.modules;
  return { size, dark: (x, y) => data[y * size + x] === 1 };
}

/** The centre mark's side in modules: odd, so it sits exactly in the middle. */
export function logoModules(size: number): number {
  const side = Math.floor(size * Math.sqrt(LOGO_AREA_SHARE));
  return side % 2 === 0 ? side - 1 : side;
}

export function logoShare(size: number): number {
  const side = logoModules(size);
  return (side * side) / (size * size);
}

/**
 * The dark modules as runs of one SVG path, in module units with the quiet zone
 * included. The modules under the centre mark are left out.
 */
export function darkPath(matrix: QrMatrix): string {
  const side = logoModules(matrix.size);
  const from = Math.floor((matrix.size - side) / 2);
  const under = (x: number, y: number) => x >= from && x < from + side && y >= from && y < from + side;
  const parts: string[] = [];
  for (let y = 0; y < matrix.size; y++) {
    let x = 0;
    while (x < matrix.size) {
      if (!matrix.dark(x, y) || under(x, y)) { x += 1; continue; }
      let run = 1;
      while (x + run < matrix.size && matrix.dark(x + run, y) && !under(x + run, y)) run += 1;
      parts.push(`M${String(x + QUIET_MODULES)} ${String(y + QUIET_MODULES)}h${String(run)}v1h-${String(run)}z`);
      x += run;
    }
  }
  return parts.join("");
}

export interface QrCardInput {
  readonly link: string;
  readonly notaryName: string;
  /** "Expires Mon 20 Oct, 9:14 AM" */
  readonly expiresLabel: string;
}

const xml = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** The link without its scheme, split so both halves fit the card. */
export function shortLinkLines(link: string): [string, string] {
  const bare = link.replace(/^https?:\/\//, "");
  const cut = bare.lastIndexOf("/") + 1;
  return [bare.slice(0, cut), bare.slice(cut)];
}

export const CARD_WIDTH = 600;
export const CARD_HEIGHT = 860;
const CODE_BOX = 440;
const CODE_X = (CARD_WIDTH - CODE_BOX) / 2;
const CODE_Y = 176;

/** The card as SVG. `logoHref` is the LAGDA header logo as a data address, where there is one. */
export function buildCardSvg(input: QrCardInput, logoHref?: string): string {
  const matrix = qrMatrix(input.link);
  const total = matrix.size + QUIET_MODULES * 2;
  const cell = CODE_BOX / total;
  const side = logoModules(matrix.size);
  const centre = (QUIET_MODULES + matrix.size / 2) * cell;
  const logoBox = side * cell;
  const sealSize = logoBox * 0.92;
  const sealX = CODE_X + centre - sealSize / 2;
  const sealY = CODE_Y + centre - sealSize / 2;
  const seal = renderToStaticMarkup(createElement(EnotarySeal, { idPrefix: "qr-seal" }))
    .replace("<svg ", `<svg x="${String(sealX)}" y="${String(sealY)}" width="${String(sealSize)}" height="${String(sealSize)}" `);
  const [head, tail] = shortLinkLines(input.link);
  const name = input.notaryName.length > 44 ? `${input.notaryName.slice(0, 43)}…` : input.notaryName;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(CARD_WIDTH)} ${String(CARD_HEIGHT)}" width="${String(CARD_WIDTH)}" height="${String(CARD_HEIGHT)}" role="img" aria-label="${xml(`QR code for the request to ${input.notaryName}`)}">`,
    `<rect width="${String(CARD_WIDTH)}" height="${String(CARD_HEIGHT)}" rx="28" fill="#FFFFFF"/>`,
    `<rect x="1.5" y="1.5" width="${String(CARD_WIDTH - 3)}" height="${String(CARD_HEIGHT - 3)}" rx="27" fill="none" stroke="#DDE6EF" stroke-width="3"/>`,
    `<rect x="0" y="0" width="${String(CARD_WIDTH)}" height="10" rx="5" fill="#8C1D3F"/>`,
    logoHref === undefined ? "" : `<image href="${logoHref}" x="${String((CARD_WIDTH - 330) / 2)}" y="16" width="330" height="96" preserveAspectRatio="xMidYMid meet"/>`,
    `<text x="300" y="124" text-anchor="middle" font-family="Tinos, 'Times New Roman', Times, serif" font-size="30" font-weight="700" fill="#0B1F44">LAGDA <tspan fill="#8C1D3F">eNotary</tspan> request</text>`,
    `<text x="300" y="154" text-anchor="middle" font-family="Geist, Arial, sans-serif" font-size="15" fill="#647789">Scan this code to open the request</text>`,
    `<rect x="${String(CODE_X)}" y="${String(CODE_Y)}" width="${String(CODE_BOX)}" height="${String(CODE_BOX)}" fill="#FFFFFF"/>`,
    `<g transform="translate(${String(CODE_X)} ${String(CODE_Y)}) scale(${String(cell)})"><path data-qr="modules" d="${darkPath(matrix)}" fill="#0A1A2B" shape-rendering="crispEdges"/></g>`,
    `<circle cx="${String(CODE_X + centre)}" cy="${String(CODE_Y + centre)}" r="${String(logoBox / 2)}" fill="#FFFFFF"/>`,
    seal,
    `<text x="300" y="${String(CODE_Y + CODE_BOX + 52)}" text-anchor="middle" font-family="Geist, Arial, sans-serif" font-size="21" font-weight="700" fill="#0A1A2B">Scan only if you are Atty.</text>`,
    `<text x="300" y="${String(CODE_Y + CODE_BOX + 84)}" text-anchor="middle" font-family="Tinos, 'Times New Roman', Times, serif" font-size="28" font-weight="700" fill="#8C1D3F">${xml(name)}</text>`,
    `<text x="300" y="${String(CODE_Y + CODE_BOX + 120)}" text-anchor="middle" font-family="Geist, Arial, sans-serif" font-size="18" font-weight="600" fill="#33475B">${xml(input.expiresLabel)}</text>`,
    `<text x="300" y="${String(CODE_Y + CODE_BOX + 152)}" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="13" fill="#647789">${xml(head)}</text>`,
    `<text x="300" y="${String(CODE_Y + CODE_BOX + 172)}" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="13" fill="#647789">${xml(tail)}</text>`,
    `</svg>`,
  ].join("");
}

/** Pixels (RGBA, white and near-black) of the code in a card's SVG path, for a decoder. */
export function rasterizeModules(svg: string, scale: number): { data: Uint8ClampedArray; width: number; height: number } {
  const path = /data-qr="modules" d="([^"]*)"/.exec(svg)?.[1] ?? "";
  const runs = [...path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)].map(m => [Number(m[1]), Number(m[2]), Number(m[3])] as const);
  const total = Math.max(0, ...runs.map(([x, , w]) => x + w)) + QUIET_MODULES;
  const rows = Math.max(0, ...runs.map(([, y]) => y + 1)) + QUIET_MODULES;
  const width = Math.max(total, rows) * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  for (const [x, y, w] of runs) {
    for (let py = y * scale; py < (y + 1) * scale; py++) {
      for (let px = x * scale; px < (x + w) * scale; px++) {
        const at = (py * width + px) * 4;
        data[at] = 10; data[at + 1] = 26; data[at + 2] = 43;
      }
    }
  }
  return { data, width, height: width };
}

/** The saved file's name: no characters a file system dislikes. */
export function cardFileName(notaryName: string): string {
  const slug = notaryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `lagda-enotary-request-${slug === "" ? "card" : slug}.png`;
}

/** Fetches the header logo as a data address so the saved PNG can carry it. Null when it cannot be had. */
export async function logoDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onload = () => { resolve(typeof reader.result === "string" ? reader.result : null); };
      reader.onerror = () => { resolve(null); };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** The card as a PNG, twice the size of the SVG so it prints sharply. */
export function cardToPng(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_WIDTH * 2;
      canvas.height = CARD_HEIGHT * 2;
      const context = canvas.getContext("2d");
      if (context === null) { reject(new Error("no canvas")); return; }
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { if (blob === null) reject(new Error("no image")); else resolve(blob); }, "image/png");
    };
    image.onerror = () => { reject(new Error("The card could not be drawn.")); };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
