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

/** WCAG 1.4.3 (AA). The public palette puts three muted tones on the navy
 *  background, and all three fail: #64748B = 3.98:1 (229 uses), #475569 =
 *  2.50:1 (181 uses), #334155 = 1.83:1 (90 uses), against a 4.5:1 requirement.
 *
 *  This is deliberately tracked rather than fixed here. Raising all 500 to a
 *  passing tone collapses the type hierarchy — heading, body and muted would
 *  become two tones instead of three — so it is a palette decision for the
 *  design-system pass, not a find-and-replace. The ratchet asserts
 *  `actual <= nodes`, so the defect is bounded and can only shrink. */
const contrast = (nodes: number): TrackedDefect => ({
  rule: "color-contrast",
  nodes,
  reason:
    "WCAG 1.4.3 AA: public palette ships three muted tones below 4.5:1 on #07111F " +
    "(#64748B = 3.98:1, #475569 = 2.50:1, #334155 = 1.83:1). Open brand-palette defect; " +
    "fixing it changes the type hierarchy and belongs to the design-system pass.",
});

// Baselines measured against this build at 1440x900.
const ROUTES: readonly PublicRoute[] = [
  { path: "/",           name: "home",       trackedDefects: [contrast(135)] },
  { path: "/esignature", name: "eSignature", trackedDefects: [contrast(89)] },
  { path: "/workflow",   name: "workflow",   trackedDefects: [contrast(58)] },
  { path: "/pricing",    name: "pricing",    trackedDefects: [contrast(111)] },
  { path: "/security",   name: "security",   trackedDefects: [contrast(85)] },
  { path: "/solutions",  name: "solutions",  trackedDefects: [contrast(83)] },
  { path: "/resources",  name: "resources",  trackedDefects: [contrast(71)] },
  { path: "/verify",     name: "verify",     trackedDefects: [contrast(54)] },
  { path: "/enotary",    name: "eNotary",    trackedDefects: [contrast(70)] },
  { path: "/contact",    name: "contact",    trackedDefects: [contrast(53)] },
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
