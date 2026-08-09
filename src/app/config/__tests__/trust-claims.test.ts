// Repo-wide trust invariants.
//
// WHY THIS EXISTS. LAGDA is a frontend demonstration of a legaltech product in
// a regulated space. Two kinds of sentence are dangerous here: one that implies
// eNotary is available (it is not accredited), and one that asserts a security
// or legal absolute the frontend cannot support. A scan of the whole codebase
// found ZERO of either — the copy is genuinely careful.
//
// The problem was that nothing kept it that way. The only guard was in
// RouteErrorBoundary.test.tsx, which checks one component's error copy, while
// 165 files mention eNotary and 36 places state the disclaimer. Every one of
// those was correct by review, not by construction. This suite promotes that
// review into a gate, so a future page cannot quietly introduce the claim.
//
// These tests read source files. Line endings are normalised because the repo
// is developed on Windows and checked out with CRLF, and a regex written with
// \n would otherwise match differently here than in CI.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ENOTARY_DISCLAIMER,
  ENOTARY_STATUS,
  ENOTARY_QUALIFIER,
} from "../enotary-disclaimer";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Source files that can put words in front of a user. */
function userFacingFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Tests describe forbidden strings in order to ban them; the dev-only
        // showcase renders every component for inspection. Neither ships as copy.
        if (entry.name === "__tests__" || entry.name === "dev") continue;
        walk(p);
      } else if (/\.tsx?$/.test(p)) {
        out.push(p);
      }
    }
  };
  for (const dir of ["pages", "components", "data", "config", "models", "services"]) {
    walk(path.join(APP_ROOT, dir));
  }
  return out;
}

function read(file: string): string {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function rel(file: string): string {
  return path.relative(APP_ROOT, file).split(path.sep).join("/");
}

const FILES = userFacingFiles();

describe("trust invariants", () => {
  it("has files to check", () => {
    // Guards the whole suite: if the walk breaks, every other test below would
    // pass vacuously over an empty list and report the codebase as clean.
    expect(FILES.length).toBeGreaterThan(100);
  });

  // ── eNotary availability ───────────────────────────────────────────────────

  // Phrases that state or imply LAGDA can notarise. eNotary is not accredited,
  // so these are claims about a regulated activity, not marketing tone.
  const AVAILABILITY_CLAIMS = [
    "notarize online today",
    "notarise online today",
    "online notarization now",
    "instant notarization",
    "instantly notarized",
    "legally notarized instantly",
    "remote notarization active",
    "book a notary session",
    "start notarizing",
    "get it notarized now",
  ];

  it.each(AVAILABILITY_CLAIMS)("never claims eNotary is available: %s", phrase => {
    const offenders = FILES.filter(f => read(f).toLowerCase().includes(phrase));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("never claims Supreme Court accreditation affirmatively", () => {
    // "Supreme Court approved" is banned outright, EXCEPT where the text is
    // explicitly disclaiming it — the confirmation and completion pages both
    // say LAGDA does not make that claim, which is the honest form.
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = read(file);
      for (const m of src.matchAll(/supreme court (approved|accredited|certified)/gi)) {
        const before = src.slice(Math.max(0, (m.index ?? 0) - 120), m.index ?? 0);
        const isDisclaimed = /\b(not|no|never|does not|doesn't|without)\b/i.test(before);
        if (!isDisclaimed) {
          offenders.push(`${rel(file)}: …${src.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 40).replace(/\s+/g, " ")}…`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // ── Absolute security and legal claims ─────────────────────────────────────

  // Verbatim the list RouteErrorBoundary.test.tsx already enforces for its own
  // copy, applied here to every user-facing file.
  const ABSOLUTE_CLAIMS =
    /\b(legally binding|legally valid|fully compliant|tamper-proof|tamper proof|bank-grade|military-grade|unbreakable|100% secure|impossible to tamper|court-admissible|legally enforceable|legally guaranteed)\b/gi;

  // A negation turns a forbidden claim into the honest denial the product wants:
  // "this is not legally binding" must stay legal to write.
  const NEGATORS =
    /\b(not|never|no|nothing|none|cannot|can't|doesn't|does not|isn't|is not|aren't|without|neither|nor|claim|claims|guarantee|guarantees|imply|implies|constitute|constitutes|assert|asserts)\b/i;
  const HEDGES =
    /\b(may|might|could|generally|typically|intended|aims|designed to|subject to|depending|where applicable|in general|can be)\b/i;

  it("makes no affirmative absolute security or legal claim", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = read(file);
      for (const m of src.matchAll(ABSOLUTE_CLAIMS)) {
        const i = m.index ?? 0;
        // Look back only to the start of the sentence, so a negation two
        // sentences earlier cannot launder an affirmative claim here.
        let before = src.slice(Math.max(0, i - 150), i);
        const stop = before.lastIndexOf(". ");
        if (stop !== -1) before = before.slice(stop);

        if (NEGATORS.test(before) || HEDGES.test(before)) continue;
        offenders.push(
          `${rel(file)} [${m[0]}]: …${src.slice(Math.max(0, i - 70), i + m[0].length + 50).replace(/\s+/g, " ")}…`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  // ── Disclaimer integrity ───────────────────────────────────────────────────

  it("keeps the split constants identical to the full sentence", () => {
    // Surfaces that emphasise the status render STATUS + QUALIFIER. If those
    // drift apart from the canonical sentence, some pages silently say
    // something slightly different about accreditation.
    expect(`${ENOTARY_STATUS}${ENOTARY_QUALIFIER}`).toBe(ENOTARY_DISCLAIMER);
  });

  it("states the disclaimer's three required elements", () => {
    expect(ENOTARY_DISCLAIMER).toContain("Coming Soon");
    expect(ENOTARY_DISCLAIMER).toContain("Supreme Court Accreditation");
    expect(ENOTARY_DISCLAIMER).toContain("applicable rules");
  });

  // NOT TESTED HERE: "the eNotary status never appears without the accreditation
  // condition". That invariant is real and important, but it cannot be checked
  // against source text. Two attempts were made and both produced only false
  // positives — first exact-match against the constant (17 hits, nearly all
  // correct copy that simply reads differently in context, like the em-dash form
  // or the waitlist's longer sentence), then a proximity check (comments such as
  // `// eNotary coming soon`, search-keyword arrays, and the "Coming Soon" badge
  // label, which is a status chip rather than a claim).
  //
  // The distinction between a badge and a bare claim only exists once rendered,
  // so the invariant lives in tests/trust/enotary-disclosure.spec.ts, which reads
  // the visible text of each page in a browser.
});
