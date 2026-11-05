// The QR card a client hands to a notary: the invitation link as a QR code with
// the LAGDA eNotary seal in the middle, under a formal heading that names the
// notary ("Notarial request for Atty. …"), a statement that the code is for that
// notary's exclusive use and that anyone else is refused, the request's
// reference, the date it was issued, how long it is valid, and the short link.
//
// The card is one SVG string. The page shows that SVG and the "Save the card"
// button turns the same string into a PNG, so what is saved is what is shown.
//
// The statement is a promise the server keeps: the request opens only for the
// listed notary (the account bound to the listing, or else an account whose
// verified ID is the listed name) and refuses everyone else.
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
  /** The notary as the Notary Directory lists them: a lawyer's name, or an office's. */
  readonly notaryName: string;
  /** A lawyer's listing names one notary; an office's names no person. Absent: a lawyer's. */
  readonly listing?: "lawyer" | "office";
  /** For an office's listing, the office the notary must belong to ("BCF Law Offices"). */
  readonly office?: string;
  /** The request's number ("EN-2026-000004"), or a short form of its id while it has none. */
  readonly reference: string;
  /** "4 November 2026": the day the request was made, in the Philippines. */
  readonly issuedLabel: string;
  /** "7 November 2026, 9:14 AM (Philippine time)", or null when the expiry is not known. */
  readonly validUntilLabel: string | null;
}

const xml = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** Who the card is for: "Atty. Ana Maria Cruz", or an office by its own name. */
export function cardAddressee(input: Pick<QrCardInput, "notaryName" | "listing">): string {
  return input.listing === "office" ? input.notaryName : `Atty. ${input.notaryName}`;
}

/** "Notarial request for Atty. Ana Maria Cruz" */
export function cardHeading(input: Pick<QrCardInput, "notaryName" | "listing">): string {
  return `Notarial request for ${cardAddressee(input)}`;
}

/** The card's statement that the code is for the named notary alone, and refuses anyone else. */
export function cardStatement(input: Pick<QrCardInput, "notaryName" | "listing" | "office">): string {
  if (input.listing === "office") {
    const office = input.office !== undefined && input.office.trim() !== "" ? input.office.trim() : input.notaryName;
    return `This QR code is issued for the exclusive use of the notaries public of ${office}. It opens a private notarial request `
      + "on LAGDA eNotary and may be opened only by a notary public of that office after identity verification. "
      + "Any other person will be refused access.";
  }
  return `This QR code is issued for the exclusive use of Atty. ${input.notaryName}, Notary Public. It opens a private notarial `
    + "request on LAGDA eNotary and may be opened only by that notary after identity verification. "
    + "Any other person will be refused access.";
}

/** Joins two words so that a line never breaks between them; drawn as a space. */
export const NO_BREAK_SPACE = String.fromCharCode(0xa0);

/** Words into lines of at most `width` characters; a word longer than a line is cut. A no-break space joins two words. */
export function wrapLines(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const raw of text.split(/[ \t\r\n]+/).filter(word => word !== "")) {
    let word = raw;
    while (word.length > width) {
      if (line !== "") { lines.push(line); line = ""; }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (word === "") continue;
    if (line === "") line = word;
    else if (line.length + 1 + word.length <= width) line = `${line} ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line !== "") lines.push(line);
  return lines;
}

/** "ENI-1A2B3C4D": a short form of a request's id, for a request that has no number yet. */
export function shortRequestId(id: string): string {
  const cut = id.indexOf("_");
  const prefix = cut > 0 ? id.slice(0, cut).toUpperCase() : "";
  const tail = (cut > 0 ? id.slice(cut + 1) : id).replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
  return prefix === "" ? tail : `${prefix}-${tail}`;
}

const PHILIPPINE_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
});

function philippineParts(iso: string): Record<string, string> | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return Object.fromEntries(PHILIPPINE_PARTS.formatToParts(at).map(part => [part.type, part.value]));
}

/** "4 November 2026": the day in the Philippines. Empty for a time that cannot be read. */
export function philippineDate(iso: string): string {
  const parts = philippineParts(iso);
  return parts === null ? "" : `${parts["day"] ?? ""} ${parts["month"] ?? ""} ${parts["year"] ?? ""}`;
}

/** "7 November 2026, 9:14 AM (Philippine time)". Empty for a time that cannot be read. */
export function philippineDateTime(iso: string): string {
  const parts = philippineParts(iso);
  if (parts === null) return "";
  return `${philippineDate(iso)}, ${parts["hour"] ?? ""}:${parts["minute"] ?? ""} ${(parts["dayPeriod"] ?? "").toUpperCase()} (Philippine time)`;
}

/** The link without its scheme, split so both halves fit the card. */
export function shortLinkLines(link: string): [string, string] {
  const bare = link.replace(/^https?:\/\//, "");
  const cut = bare.lastIndexOf("/") + 1;
  return [bare.slice(0, cut), bare.slice(cut)];
}

export const CARD_WIDTH = 600;
const CODE_BOX = 440;
const CODE_X = (CARD_WIDTH - CODE_BOX) / 2;
const CODE_Y = 184;
const TEXT_X = 56;
/** Characters of the statement on one line: 15px sans over 488px, with room for wide capitals. */
const STATEMENT_CHARS = 62;
const STATEMENT_LEADING = 22;
const SANS = "Geist, Arial, sans-serif";
const SERIF = "Tinos, 'Times New Roman', Times, serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

/** The card's width and height in its own units, as its SVG says. */
export function cardSize(svg: string): { width: number; height: number } {
  const root = /^<svg[^>]*>/.exec(svg)?.[0] ?? "";
  const read = (name: string, fallback: number) => Number(new RegExp(`\\s${name}="([\\d.]+)"`).exec(root)?.[1] ?? fallback);
  return { width: read("width", CARD_WIDTH), height: read("height", CARD_WIDTH) };
}

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

  // The heading names the notary on one line, as large as fits.
  const whole = cardAddressee(input);
  const addressee = whole.length > 56 ? `${whole.slice(0, 55)}…` : whole;
  const addresseeSize = Math.max(18, Math.min(30, Math.floor(1040 / Math.max(1, addressee.length))));
  // "Atty." stays on the line of the name it belongs to.
  const statement = wrapLines(cardStatement(input).replace(/\bAtty\. /g, `Atty.${NO_BREAK_SPACE}`), STATEMENT_CHARS);

  // Below the code, top to bottom: the statement in its panel, the reference and the dates, the short link.
  const panelTop = CODE_Y + CODE_BOX + 20;
  const panelLabelY = panelTop + 28;
  const firstLineY = panelTop + 54;
  const panelBottom = firstLineY + (statement.length - 1) * STATEMENT_LEADING + 18;
  const factsLabelY = panelBottom + 30;
  const factsValueY = factsLabelY + 24;
  const validLabelY = factsValueY + 32;
  const validValueY = validLabelY + 24;
  const ruleY = (input.validUntilLabel === null ? factsValueY : validValueY) + 22;
  const linkY = ruleY + 24;
  const height = linkY + 20 + 28;

  const label = (x: number, y: number, text: string) =>
    `<text x="${String(x)}" y="${String(y)}" font-family="${SANS}" font-size="11.5" font-weight="700" letter-spacing="1.2" fill="#647789">${xml(text)}</text>`;
  const value = (x: number, y: number, text: string, family = SANS) =>
    `<text x="${String(x)}" y="${String(y)}" font-family="${family}" font-size="16" font-weight="700" fill="#0A1A2B">${xml(text)}</text>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(CARD_WIDTH)} ${String(height)}" width="${String(CARD_WIDTH)}" height="${String(height)}" role="img" aria-label="${xml(`${cardHeading(input)}. ${cardStatement(input)}`)}">`,
    `<rect width="${String(CARD_WIDTH)}" height="${String(height)}" rx="28" fill="#FFFFFF"/>`,
    `<rect x="1.5" y="1.5" width="${String(CARD_WIDTH - 3)}" height="${String(height - 3)}" rx="27" fill="none" stroke="#DDE6EF" stroke-width="3"/>`,
    `<rect x="0" y="0" width="${String(CARD_WIDTH)}" height="10" rx="5" fill="#8C1D3F"/>`,
    logoHref === undefined ? "" : `<image href="${logoHref}" x="${String((CARD_WIDTH - 330) / 2)}" y="16" width="330" height="96" preserveAspectRatio="xMidYMid meet"/>`,
    `<text x="300" y="134" text-anchor="middle" font-family="${SERIF}" font-size="22" font-weight="700" fill="#0B1F44">Notarial request for</text>`,
    `<text x="300" y="170" text-anchor="middle" font-family="${SERIF}" font-size="${String(addresseeSize)}" font-weight="700" fill="#8C1D3F">${xml(addressee)}</text>`,
    // The code: a white box holding the quiet zone, dark modules on white, the seal over the centre.
    `<rect x="${String(CODE_X)}" y="${String(CODE_Y)}" width="${String(CODE_BOX)}" height="${String(CODE_BOX)}" fill="#FFFFFF"/>`,
    `<g transform="translate(${String(CODE_X)} ${String(CODE_Y)}) scale(${String(cell)})"><path data-qr="modules" d="${darkPath(matrix)}" fill="#0A1A2B" shape-rendering="crispEdges"/></g>`,
    `<circle cx="${String(CODE_X + centre)}" cy="${String(CODE_Y + centre)}" r="${String(logoBox / 2)}" fill="#FFFFFF"/>`,
    seal,
    `<rect x="40" y="${String(panelTop)}" width="${String(CARD_WIDTH - 80)}" height="${String(panelBottom - panelTop)}" rx="14" fill="#F6F8FB" stroke="#DDE6EF" stroke-width="1.5"/>`,
    `<text x="${String(TEXT_X)}" y="${String(panelLabelY)}" font-family="${SANS}" font-size="12" font-weight="800" letter-spacing="1.6" fill="#8C1D3F">${input.listing === "office" ? "FOR THE NAMED OFFICE ONLY" : "FOR THE NAMED NOTARY ONLY"}</text>`,
    ...statement.map((line, index) =>
      `<text data-card="statement" x="${String(TEXT_X)}" y="${String(firstLineY + index * STATEMENT_LEADING)}" font-family="${SANS}" font-size="15" fill="#1B2B3D">${xml(line)}</text>`),
    label(TEXT_X, factsLabelY, "REQUEST REFERENCE"),
    value(TEXT_X, factsValueY, input.reference, MONO),
    label(320, factsLabelY, "DATE ISSUED"),
    value(320, factsValueY, input.issuedLabel),
    input.validUntilLabel === null ? "" : label(TEXT_X, validLabelY, "VALID UNTIL"),
    input.validUntilLabel === null ? "" : value(TEXT_X, validValueY, input.validUntilLabel),
    `<line x1="${String(TEXT_X)}" y1="${String(ruleY)}" x2="${String(CARD_WIDTH - TEXT_X)}" y2="${String(ruleY)}" stroke="#DDE6EF" stroke-width="1.5"/>`,
    `<text x="300" y="${String(linkY)}" text-anchor="middle" font-family="${MONO}" font-size="12.5" fill="#647789">${xml(head)}</text>`,
    `<text x="300" y="${String(linkY + 20)}" text-anchor="middle" font-family="${MONO}" font-size="12.5" fill="#647789">${xml(tail)}</text>`,
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
  const { width, height } = cardSize(svg);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
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
