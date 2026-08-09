// eNotary is never presented as available — checked against RENDERED text.
//
// WHY IN A BROWSER. LAGDA eNotary is not accredited, so any page that presents
// it must carry the accreditation condition. Enforcing that by scanning source
// was tried and abandoned: source cannot tell a "Coming Soon" status BADGE from
// a bare claim, and it flags comments, search-keyword arrays and JSX headings
// that no visitor ever reads. What a visitor actually sees is the only thing
// worth asserting, so these tests read `innerText` of the rendered page.
//
// The rule being enforced is substantive, not stylistic: the wording may differ
// between pages (an em dash instead of "and", a longer sentence on the waitlist),
// but wherever the status appears the accreditation condition must appear too.

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Public routes that mention eNotary, plus the eNotary section itself. */
const ROUTES = [
  "/",
  "/enotary",
  "/enotary/future-capabilities",
  "/enotary/accreditation-roadmap",
  "/enotary/waitlist",
  "/enotary/faq",
  "/pricing",
  "/security",
  "/solutions",
  "/resources",
  "/resources/legal-framework",
  "/verify",
  "/contact",
  "/demo",
];

/** States or implies LAGDA can notarise today. None of these may ever render. */
const AVAILABILITY_CLAIMS = [
  /notari[sz]e (online )?(today|now)/i,
  /instant(ly)? notari[sz]ed/i,
  /instant notari[sz]ation/i,
  /start notari[sz]ing/i,
  /book a notary session/i,
  /remote notari[sz]ation (is )?(active|available|live)/i,
  /eNotary is (now )?(live|available|active)/i,
];

/** The condition that must accompany the status. Any of these phrasings counts. */
const ACCREDITATION_CONDITION =
  /Supreme Court Accreditation|subject to .{0,40}accreditation|pending accreditation|not (currently )?available/i;

/**
 * Two readings of the same page, and the difference between them matters.
 *
 * `visible` is innerText — what a visitor reads without interacting.
 * `all` is textContent — including copy inside collapsed accordions.
 *
 * The split was found by probe, not by reasoning. An availability claim was
 * deliberately injected into an eNotary FAQ answer and the suite passed, because
 * FAQ answers are collapsed by default: innerText saw 2,871 characters of that
 * page where textContent saw 7,201. More than half the copy was unchecked.
 *
 * So the two rules read different text, deliberately:
 *   - a forbidden CLAIM counts wherever it can be revealed  → `all`
 *   - a required DISCLAIMER only counts if it is on screen  → `visible`
 * A disclaimer the visitor must click to discover is not a disclaimer.
 */
async function readPage(page: Page, path: string): Promise<{ visible: string; all: string }> {
  // Same wait the accessibility suites use: `main` visible means the route has
  // rendered. `networkidle` is banned by lint and would be the wrong signal
  // anyway — the copy is in the bundle, not waiting on a request.
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  const body = page.locator("body");
  return {
    visible: (await body.innerText()).replace(/\s+/g, " "),
    all: ((await body.textContent()) ?? "").replace(/\s+/g, " "),
  };
}

for (const path of ROUTES) {
  test.describe(`eNotary disclosure on ${path}`, () => {
    test("makes no claim that eNotary is available", async ({ page }) => {
      // Checked against ALL copy, including collapsed FAQ answers.
      const { all } = await readPage(page, path);
      for (const claim of AVAILABILITY_CLAIMS) {
        const match = all.match(claim);
        expect(
          match,
          match
            ? `"${match[0]}" presents eNotary as available. It is not accredited.`
            : undefined,
        ).toBeNull();
      }
    });

    test("states the accreditation condition wherever eNotary status appears", async ({ page }) => {
      const { visible } = await readPage(page, path);

      // Only pages that actually raise the status are governed by the rule.
      if (!/eNotary/i.test(visible)) return;
      if (!/Coming Soon|future product|not (currently )?available/i.test(visible)) return;

      expect(
        ACCREDITATION_CONDITION.test(visible),
        `${path} presents eNotary's status but never states that it is subject to ` +
          `Supreme Court Accreditation. A visitor reads "Coming Soon" as a shipping ` +
          `date for a regulated service that has not been accredited.`,
      ).toBe(true);
    });
  });
}

test.describe("eNotary is not purchasable", () => {
  // A purchase affordance is a stronger availability claim than any sentence.
  test("pricing offers no eNotary plan to buy", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();

    // Any control whose accessible name pairs a buy verb with eNotary.
    const buyEnotary = page.getByRole("link", { name: /(buy|subscribe|purchase|get started).*eNotary|eNotary.*(buy|subscribe|purchase)/i });
    await expect(buyEnotary).toHaveCount(0);

    const buyButton = page.getByRole("button", { name: /(buy|subscribe|purchase).*eNotary|eNotary.*(buy|subscribe|purchase)/i });
    await expect(buyButton).toHaveCount(0);
  });
});
