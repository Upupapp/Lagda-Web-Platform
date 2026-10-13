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
  // "layouts" holds the auth shell copy (sign-in intro, phone info modal).
  for (const dir of ["pages", "components", "layouts", "data", "config", "models", "services"]) {
    walk(path.join(APP_ROOT, dir));
  }
  // The LAGDA Chatbot says whatever its knowledge base says: every reply,
  // clause and fallback lives in JSON, not in a .tsx file, so it is scanned
  // explicitly. Its UI copy is already covered by the "pages" walk.
  const chatbotAssets = path.join(APP_ROOT, "..", "assets", "chatbot");
  if (fs.existsSync(chatbotAssets)) {
    for (const entry of fs.readdirSync(chatbotAssets)) {
      if (entry.endsWith(".json")) out.push(path.join(chatbotAssets, entry));
    }
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

/**
 * The copy a visitor reads before they have an account: the public pages, the
 * Help Center's articles, and the three config files those pages are built
 * from (plan comparison rows, menu descriptions, page descriptions).
 */
function publicFiles(): string[] {
  const out = FILES.filter(f => rel(f).startsWith("pages/public/"));
  const content = path.join(APP_ROOT, "content");
  for (const entry of fs.readdirSync(content, { withFileTypes: true })) {
    if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(path.join(content, entry.name));
  }
  for (const name of ["pricing.config.ts", "nav.config.ts", "routes.ts"]) {
    out.push(path.join(APP_ROOT, "config", name));
  }
  return out;
}

const PUBLIC_FILES = publicFiles();

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

  it("scans the LAGDA Chatbot's knowledge base and its UI copy", () => {
    // Its replies and clauses are generated drafting text — exactly where an
    // unhedged "legally binding" could slip in.
    const names = FILES.map(rel);
    expect(names).toContain("../assets/chatbot/lagda-chatbot.json");
    expect(names).toContain("pages/platform/templates/author/chatbot/ChatPanel.tsx");
    expect(names).toContain("pages/platform/templates/author/chatbot/engine.ts");
  });

  it("scans the sign-in shell and carousel copy", () => {
    // The carousel lead and intro are the first words a signed-out user reads;
    // make sure the walk above actually reaches them.
    const names = FILES.map(rel);
    expect(names).toContain("layouts/AuthLayout.tsx");
    expect(names).toContain("components/auth/AuthCarousel.tsx");
  });

  // ── Claims about what the product does ─────────────────────────────────────
  //
  // A different kind of sentence from the two above: not a legal absolute, but
  // a plain statement of a feature the server does not have. An audit of the
  // live system against the public pages found six kinds, all since reworded.
  // Each invariant below is one of those kinds, so none can come back quietly.
  //
  // They read the PUBLIC copy only. The demo build still has reminder settings
  // and mock notifications inside the app, and those are labelled as a
  // demonstration where they appear; a visitor deciding whether to trust LAGDA
  // reads the pages below.

  it("has public copy to check", () => {
    // Same guard as "has files to check": an empty list would pass everything.
    expect(PUBLIC_FILES.length).toBeGreaterThan(60);
    const names = PUBLIC_FILES.map(rel);
    expect(names).toContain("pages/public/features/Notifications.tsx");
    expect(names).toContain("pages/public/security/content.ts");
    expect(names).toContain("content/help-articles.ts");
    expect(names).toContain("config/pricing.config.ts");
  });

  /**
   * Every match of `claim` in the public copy that `allowed` does not excuse.
   * `allowed` sees the sentence leading up to the match, the match and the 200
   * characters after it, because an honest denial may sit on either side:
   * "does not record an IP address", or a table row whose label is "IP address"
   * and whose description is "Not recorded".
   */
  function publicOffenders(claim: RegExp, allowed: RegExp, skip: readonly string[] = []): string[] {
    const offenders: string[] = [];
    for (const file of PUBLIC_FILES) {
      if (skip.includes(rel(file))) continue;
      const src = read(file);
      for (const m of src.matchAll(claim)) {
        const i = m.index ?? 0;
        let before = src.slice(Math.max(0, i - 150), i);
        const stop = before.lastIndexOf(". ");
        if (stop !== -1) before = before.slice(stop);
        const after = src.slice(i, i + m[0].length + 200);
        // Joined, so a denial that straddles the match ("no reminders") counts.
        if (allowed.test(before + after)) continue;
        offenders.push(
          `${rel(file)} [${m[0]}]: …${src.slice(Math.max(0, i - 70), i + m[0].length + 50).replace(/\s+/g, " ")}…`,
        );
      }
    }
    return offenders;
  }

  it("never says a signing step records an IP address, device, browser or location", () => {
    // The audit trail holds the step, the server's time and who acted. Nothing
    // about the network or the machine is recorded for a signing step.
    const claim =
      /\b(IP address(es)?|IP (information|context|location)|IP-based|device (data|details|context|evidence|information|fingerprinting|category|location)|device and browser|device, browser|browser context|network (context|location|address)|location (data|information|estimate)|approximate (device )?location|user[- ]agent|geolocation)\b/gi;
    const denied =
      /\b(does not (record|collect|estimate|hold|ask)|not recorded|not collected|no (IP|device|location))\b/i;
    // The Privacy Policy states a different and true fact: the web SERVER logs
    // the address each request came from. That is not signing evidence.
    expect(publicOffenders(claim, denied, ["pages/public/legal/Privacy.tsx"])).toEqual([]);
  });

  it("never offers reminders", () => {
    // The server sends none, automatic or manual.
    const claim = /\bremind(er|ers|ed|s)?\b/gi;
    // "Legal formalities reminder" is a heading addressed to the reader, not a
    // feature.
    const denied = /\b(does not (send|remind)|no (automatic )?reminders?)\b|formalities reminder/i;
    expect(publicOffenders(claim, denied)).toEqual([]);
  });

  // Notices nobody is sent: a decline, a cancellation, an expiry (or its
  // approach), an invitation that could not be delivered. The sender is
  // emailed on completion and told in the app when a signing link lapses, and
  // that is all.
  const ABSENT_NOTICES = [
    "delivery failed",
    "delivery confirmed",
    "confirmed as received",
    "track delivery",
    "bounce",
    "request expiring",
    "expiry notification",
    "viewed, declined",
    "viewed, or expiring",
    "declined or expired, and when",
    "the sender is told at once",
    "you are told in lagda when it does",
  ];

  it.each(ABSENT_NOTICES)("never promises a notice that is not sent: %s", phrase => {
    const offenders = PUBLIC_FILES.filter(f => read(f).toLowerCase().includes(phrase));
    expect(offenders.map(rel)).toEqual([]);
  });

  it("never describes the seal as a digital signature", () => {
    // The seal is a SHA-256 digest LAGDA keeps and checks at /verify. Nothing
    // is embedded in the PDF and no certificate is involved, so the words for
    // that technology may appear only where the copy says LAGDA is not it.
    const claim =
      /\b(digitally signed|certificate-based|PKI|public key infrastructure|digital signature embedded|embedded digital signature)\b/gi;
    expect(publicOffenders(claim, NEGATORS)).toEqual([]);
  });

  it("never offers a completion report or certificate", () => {
    // One is generated when a document completes, and there is no way to
    // download it. What a sender does get is the sealed document itself.
    const claim = /\b(completion (report|certificate)s?|certificate of completion|audit reports?)\b/gi;
    expect(publicOffenders(claim, NEGATORS)).toEqual([]);
  });

  // The invitation email is LAGDA's own wording. A sender cannot change its
  // subject, add a message or attach instructions for a participant.
  const CUSTOM_INVITATION_CLAIMS = [
    "email subject and message",
    "invitation message",
    "subject line",
    "personal note",
    "private instructions",
    "signing instructions",
    "instructions visible",
    "set instructions",
    "any instructions",
  ];

  it.each(CUSTOM_INVITATION_CLAIMS)("never offers a custom invitation: %s", phrase => {
    const offenders = PUBLIC_FILES.filter(f => read(f).toLowerCase().includes(phrase));
    expect(offenders.map(rel)).toEqual([]);
  });

  // Every participant signs in to a LAGDA account, or creates a free one, to
  // sign. CHECKING a document at /verify needs no account, and the copy may
  // go on saying so ("no account needed"), which is why these are whole
  // phrases about signing rather than a pattern.
  const NO_ACCOUNT_SIGNING_CLAIMS = [
    "no lagda account required",
    "no lagda account needed",
    "no account is needed",
    "sign without an account",
    "signed without an account",
    "signing without an account",
    "without creating an account",
  ];

  it.each(NO_ACCOUNT_SIGNING_CLAIMS)("never says signing needs no account: %s", phrase => {
    const offenders = PUBLIC_FILES.filter(f => read(f).toLowerCase().includes(phrase));
    expect(offenders.map(rel)).toEqual([]);
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
