// The QR card: the generated code decodes to the link (proved with a QR
// decoder on the card's own path), the centre mark stays small, and the card
// says, formally, whom it is for and that anyone else is refused.

import { describe, it, expect } from "vitest";
import jsQR from "jsqr";
import {
  buildCardSvg, rasterizeModules, qrMatrix, logoModules, logoShare, shortLinkLines, cardFileName, cardHeading, cardSize,
  cardStatement, philippineDate, philippineDateTime, shortRequestId, wrapLines, NO_BREAK_SPACE, QUIET_MODULES, CARD_WIDTH,
  type QrCardInput,
} from "../qr-card";

const SECRET = "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MEFCQ0RFRkdISUo";
const LINK = `https://lagda.io/enotary/invite/${SECRET}`;
const INPUT: QrCardInput = {
  link: LINK, notaryName: "Ana Maria Cruz", reference: "EN-2026-000004",
  issuedLabel: "4 November 2026", validUntilLabel: "7 November 2026, 9:14 AM (Philippine time)",
};
const STATEMENT = "This QR code is issued for the exclusive use of Atty. Ana Maria Cruz, Notary Public. It opens a private notarial "
  + "request on LAGDA eNotary and may be opened only by that notary after identity verification. Any other person will be refused access.";

/** The text of every <text> on the card, markup undone, in order. */
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
  .map(m => (m[1] ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
/** The statement as the card prints it, its lines joined again (a no-break space read as a space). */
const printedStatement = (svg: string) => [...svg.matchAll(/<text data-card="statement"[^>]*>([^<]*)<\/text>/g)]
  .map(m => (m[1] ?? "").replace(/&amp;/g, "&").split(NO_BREAK_SPACE).join(" ")).join(" ");
/** The statement's lines as the card prints them. */
const statementLines = (svg: string) => [...svg.matchAll(/<text data-card="statement"[^>]*>([^<]*)<\/text>/g)].map(m => m[1] ?? "");

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

  it("is drawn 440 units wide, dark on a white box that holds the quiet zone, with nothing printed over the box", () => {
    const svg = buildCardSvg(INPUT);
    expect(svg).toMatch(/<rect x="80" y="184" width="440" height="440" fill="#FFFFFF"\/>/);
    expect(svg).toMatch(/data-qr="modules" d="[^"]+" fill="#0A1A2B"/);
    // Every line of the card's own text sits above the code (the heading) or below it (the statement and the facts);
    // the seal in the centre is a picture of its own, in its own units.
    const own = svg.replace(/<svg x="[\s\S]*?<\/svg>/, "");
    const ys = [...own.matchAll(/<text[^>]* y="([\d.]+)"/g)].map(m => Number(m[1]));
    expect(ys.length).toBeGreaterThan(8);
    expect(ys.every(y => y <= 184 - 8 || y >= 184 + 440 + 20)).toBe(true);
  });
});

describe("the card", () => {
  it("is headed for the named notary and says it is for that notary's exclusive use, refusing anyone else", () => {
    const svg = buildCardSvg(INPUT, "data:image/svg+xml;base64,AAAA");
    expect(cardHeading(INPUT)).toBe("Notarial request for Atty. Ana Maria Cruz");
    expect(cardStatement(INPUT)).toBe(STATEMENT);
    const lines = texts(svg);
    expect(lines.slice(0, 2)).toEqual(["Notarial request for", "Atty. Ana Maria Cruz"]);
    expect(lines).toContain("FOR THE NAMED NOTARY ONLY");
    expect(printedStatement(svg)).toBe(STATEMENT);
    expect(svg).toContain(`aria-label="Notarial request for Atty. Ana Maria Cruz. ${STATEMENT}"`);
    expect(svg).toContain("LAGDA IO CERTIFIED");
    expect(svg).toContain("E-Notary");
    expect(svg).toContain('href="data:image/svg+xml;base64,AAAA"');
    expect(svg).not.toMatch(/accredited|available|book/i);
  });

  it("carries the request's reference, the date it was issued, how long it is valid, and the short link", () => {
    const lines = texts(buildCardSvg(INPUT));
    expect(lines).toEqual(expect.arrayContaining([
      "REQUEST REFERENCE", "EN-2026-000004", "DATE ISSUED", "4 November 2026",
      "VALID UNTIL", "7 November 2026, 9:14 AM (Philippine time)", "lagda.io/enotary/invite/", SECRET,
    ]));
    expect(buildCardSvg(INPUT)).not.toContain("https://lagda.io");
    // Without a known expiry the card says nothing about one.
    const open = texts(buildCardSvg({ ...INPUT, validUntilLabel: null }));
    expect(open).not.toContain("VALID UNTIL");
    expect(open).toContain("EN-2026-000004");
  });

  it("speaks of an office's notaries for an office's listing, which names no person", () => {
    const office: QrCardInput = { ...INPUT, notaryName: "HYG Law Office & Notary Public", listing: "office", office: "HYG Law Office" };
    expect(cardHeading(office)).toBe("Notarial request for HYG Law Office & Notary Public");
    expect(cardStatement(office)).toBe("This QR code is issued for the exclusive use of the notaries public of HYG Law Office. It opens a "
      + "private notarial request on LAGDA eNotary and may be opened only by a notary public of that office after identity "
      + "verification. Any other person will be refused access.");
    const svg = buildCardSvg(office);
    expect(texts(svg)).toContain("FOR THE NAMED OFFICE ONLY");
    expect(svg).not.toContain("Atty.");
  });

  it("grows to hold the statement for a long name, and the PNG takes the card's own size", () => {
    const short = cardSize(buildCardSvg(INPUT));
    const long = buildCardSvg({ ...INPUT, notaryName: "Margarita Ignacia B. Nograles - Almario" });
    expect(short.width).toBe(CARD_WIDTH);
    expect(cardSize(long).height).toBeGreaterThanOrEqual(short.height);
    expect(printedStatement(long)).toContain("Atty. Margarita Ignacia B. Nograles - Almario, Notary Public.");
    // A name too long for one heading line is shortened there, and kept whole in the statement.
    const huge = buildCardSvg({ ...INPUT, notaryName: "A very long name ".repeat(6).trim() });
    expect(texts(huge)[1]?.endsWith("…")).toBe(true);
    expect(printedStatement(huge)).toContain(`Atty. ${"A very long name ".repeat(6).trim()}, Notary Public.`);
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

describe("the card's words", () => {
  it("writes the dates in the Philippines, whatever this device's zone", () => {
    expect(philippineDate("2026-11-04T01:00:00.000Z")).toBe("4 November 2026");
    // 4:30 PM in UTC is already the next day in Manila.
    expect(philippineDate("2026-11-04T16:30:00.000Z")).toBe("5 November 2026");
    expect(philippineDateTime("2026-11-07T01:14:00.000Z")).toBe("7 November 2026, 9:14 AM (Philippine time)");
    expect(philippineDateTime("2026-11-07T12:05:00.000Z")).toBe("7 November 2026, 8:05 PM (Philippine time)");
    expect(philippineDate("nonsense")).toBe("");
    expect(philippineDateTime("nonsense")).toBe("");
  });

  it("shortens a request's id for one that has no number yet", () => {
    expect(shortRequestId("eni_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d")).toBe("ENI-1A2B3C4D");
    expect(shortRequestId("eni_1")).toBe("ENI-1");
    expect(shortRequestId("plain")).toBe("PLAIN");
  });

  it("wraps words into lines no longer than asked, cuts a word longer than a line, and keeps no-break spaces", () => {
    expect(wrapLines("one two three four", 9)).toEqual(["one two", "three", "four"]);
    expect(wrapLines("abcdefghij kl", 4)).toEqual(["abcd", "efgh", "ij", "kl"]);
    expect(wrapLines(`use of Atty.${NO_BREAK_SPACE}Ana`, 10)).toEqual(["use of", `Atty.${NO_BREAK_SPACE}Ana`]);
    for (const line of wrapLines(STATEMENT, 62)) expect(line.length).toBeLessThanOrEqual(62);
    expect(wrapLines(STATEMENT, 62).join(" ")).toBe(STATEMENT);
  });

  it("never leaves Atty. at the end of a line, apart from the name", () => {
    for (const notaryName of ["Aiyana Yasmin A. Cruz", "Jake Smith (TEST ACCOUNT)", "Margarita Ignacia B. Nograles - Almario", "Ana Maria Cruz"]) {
      const lines = statementLines(buildCardSvg({ ...INPUT, notaryName }));
      expect(lines.some(line => /Atty\.$/.test(line)), notaryName).toBe(false);
      expect(lines.join(" "), notaryName).toContain(`Atty.${NO_BREAK_SPACE}${notaryName.split(" ")[0] ?? ""}`);
    }
  });
});
