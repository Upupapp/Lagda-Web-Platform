// Accessibility of the PUBLIC site.
//
// The existing axe suite covers six `/app/*` routes and signs in to reach them.
// The public portal — the only part of the product that is indexable, and the
// only part most visitors will ever see — had none.
//
// Same shape as the platform suite: assert zero serious/critical violations,
// and hold known open defects on a ratchet so a fix passes and a regression
// fails. Anything tracked here is a real defect with a reason, not a waiver.

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

interface TrackedDefect {
  readonly rule: string;
  /** Failing-node count measured against the current build at 1440x900. */
  readonly nodes: number;
  readonly reason: string;
}

interface PublicRoute {
  readonly path: string;
  readonly name: string;
  readonly trackedDefects?: readonly TrackedDefect[];
}

/** WCAG 1.4.3 (AA). Largely FIXED by the design-system pass: 809 failing nodes
 *  across these ten routes became 26.
 *
 *  The three muted tones were replaced with a RAMP that all passes and stays
 *  visually ordered — #64748B -> #94A3B8 (3.98 -> 7.39:1), #475569 -> #8A9BAE
 *  (2.50 -> 6.65:1), #334155 -> #7C8DA4 (1.83 -> 5.59:1) — rather than being
 *  flattened to one tone, which would have collapsed heading/body/muted from
 *  three levels to two. Azure as TEXT moved to Azure Glow (#0078D4 4.18:1 ->
 *  #38BDF8 8.84:1); azure as a BUTTON FILL was left alone, since it carries
 *  white text and is correct.
 *
 *  What remains is the eNotary burgundy on navy. Burgundy is brand-reserved for
 *  the future eNotary product, so lightening it further is a brand decision
 *  rather than an accessibility one. The ratchet asserts `actual <= nodes`. */
const contrast = (nodes: number): TrackedDefect => ({
  rule: "color-contrast",
  nodes,
  reason:
    "WCAG 1.4.3 AA: remaining nodes are the eNotary burgundy (#B01262 = 2.80:1) on navy. " +
    "Burgundy is brand-reserved for the future eNotary product, so lightening it further " +
    "is a brand decision. The muted ramp and azure text were fixed: 809 nodes -> 26.",
});

// Baselines measured against this build at 1440x900.
const ROUTES: readonly PublicRoute[] = [
  { path: "/",           name: "home",       trackedDefects: [contrast(2)] },
  { path: "/esignature", name: "eSignature", trackedDefects: [contrast(2)] },
  { path: "/workflow",   name: "workflow",   trackedDefects: [contrast(2)] },
  { path: "/pricing",    name: "pricing",    trackedDefects: [contrast(2)] },
  { path: "/security",   name: "security",   trackedDefects: [contrast(2)] },
  { path: "/solutions",  name: "solutions",  trackedDefects: [contrast(3)] },
  { path: "/resources",  name: "resources",  trackedDefects: [contrast(2)] },
  { path: "/verify",     name: "verify",     trackedDefects: [contrast(2)] },
  { path: "/enotary",    name: "eNotary",    trackedDefects: [contrast(7)] },
  { path: "/contact",    name: "contact",    trackedDefects: [contrast(2)] },
];

async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
}

// Playwright's `Page` and the one AxeBuilder declares are structurally
// different even though they are the same object at runtime, so a direct
// `new AxeBuilder({ page })` fails tsc. Same cast the platform suite uses.
type AxeBuilderPage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

function analyze(page: Page, disabled: string[] = []) {
  return new AxeBuilder({ page: page as unknown as AxeBuilderPage })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(disabled)
    .analyze();
}

function describeViolations(violations: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violations
    .map(v => `  [${v.impact ?? "unknown"}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`)
    .join("\n");
}

for (const route of ROUTES) {
  test.describe(`public accessibility — ${route.name} (${route.path})`, () => {
    test.beforeEach(async ({ page }) => {
      await open(page, route.path);
    });

    test("has no serious or critical WCAG A/AA violations", async ({ page }) => {
      const tracked = (route.trackedDefects ?? []).map(d => d.rule);
      const results = await analyze(page, tracked);
      const serious = results.violations.filter(v => v.impact === "serious" || v.impact === "critical");
      expect(serious, `${route.path} has serious/critical violations:\n${describeViolations(serious)}`).toEqual([]);
    });

    test("tracked accessibility defects have not spread", async ({ page }) => {
      const defects = route.trackedDefects ?? [];
      if (defects.length === 0) {
        test.skip(true, "no tracked defects on this route");
        return;
      }
      const results = await analyze(page);
      for (const defect of defects) {
        const violation = results.violations.find(v => v.id === defect.rule);
        const count = violation?.nodes.length ?? 0;
        expect(
          count,
          `${route.path}: "${defect.rule}" now fails on ${count} node(s), was ${defect.nodes}. ` +
            `Reason it is tracked: ${defect.reason}` +
            (violation ? `\n${describeViolations([violation])}` : ""),
        ).toBeLessThanOrEqual(defect.nodes);
      }
    });

    test("exposes one main landmark and a single level-1 heading", async ({ page }) => {
      // Landmark structure is how a screen-reader user skips the navigation on
      // a marketing page, which is mostly navigation.
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveCount(1);
    });

    test("gives every link an accessible name", async ({ page }) => {
      // An icon-only or empty link reads as "link" and nothing else.
      const nameless = await page.evaluate(() => {
        const out: string[] = [];
        for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
          const r = a.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const name = (a.getAttribute("aria-label") ?? a.textContent ?? "").trim();
          if (!name) out.push(a.getAttribute("href") ?? "(no href)");
        }
        return out;
      });
      expect(nameless, `links with no accessible name: ${nameless.join(", ")}`).toEqual([]);
    });
  });
}

test.describe("public shell accessibility", () => {
  test("the skip link is the first focusable control and reveals itself", async ({ page }) => {
    await open(page, "/");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    await expect(focused).toContainText(/skip/i);
  });

  test("the header exposes a navigation landmark", async ({ page }) => {
    await open(page, "/");
    await expect(page.getByRole("navigation").first()).toBeAttached();
  });
});
