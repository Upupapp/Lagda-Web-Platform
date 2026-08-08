// Automated accessibility scan of the authenticated platform (axe-core, WCAG 2.1 A + AA).
//
// WHAT THIS SUITE IS FOR
// ----------------------
// Every route here is scanned in a MEANINGFUL LOADED STATE: the spec signs in
// through the real form, lands on the route, and then asserts on real fixture
// content (document rows, notification cards, report tiles) BEFORE handing the
// page to axe. Scanning an empty shell is the classic way an axe suite reports
// zero violations forever while the product regresses, so each route has an
// explicit readiness gate that fails loudly if the data never arrives.
//
// WHY THERE ARE `disableRules` CALLS
// ----------------------------------
// LAGDA has real, currently-open accessibility defects. They are enumerated per
// route in `trackedDefects` below, one rule at a time, each with the reason it
// cannot pass today. Nothing else is disabled — a NEW serious or critical
// violation of any other rule, on any route, fails the run.
//
// Disabling a rule would normally create a permanent blind spot, so each tracked
// defect also gets a RATCHET assertion: the number of failing nodes may go down
// (a fix) but may never go up (a regression or a copy-paste of the bad pattern).
// That is what stops "we already have contrast bugs" from becoming a licence to
// add more.
//
// SESSION NOTE
// ------------
// The mock platform session lives in React state only — it is never persisted.
// A full page load (`page.goto`) therefore lands unauthenticated and bounces to
// /sign-in. Every route is reached by signing in with `?returnTo=<route>`, which
// performs a single load and then a client-side navigation. Do not "simplify"
// this into sign-in-once-then-goto; that silently scans the sign-in page.

import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Result as AxeResult } from "axe-core";
import { FIXTURE_EMAIL, FIXTURE_PASSWORD, waitForLoaded } from "../support/app";

// The project's global `trace: "retain-on-failure"` records a trace for EVERY
// test and writes the temp segments into ./test-results. This checkout lives
// inside a OneDrive-synced folder, and OneDrive moves those files mid-write:
// roughly one test per full run died with `ENOENT … .playwright-artifacts-N/…`
// and then a 30s timeout. That is an environment race, not an app or spec
// defect, but it makes the suite untrustworthy.
//
// `on-first-retry` records nothing on the happy path, so there is no temp
// artifact to race. CI runs with `retries: 2`, so a genuine failure there still
// produces a full trace on the retry; locally the failure screenshot remains.
test.use({ trace: "on-first-retry" });

/** WCAG 2.0/2.1 Level A + AA. Best-practice rules are reported, never enforced. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/**
 * `@axe-core/playwright` types its `page` parameter against the hoisted
 * `playwright-core` (1.62.x) while this repository pins `@playwright/test`
 * 1.49.1, whose bundled `playwright-core` is a second, older copy. The two
 * `Page` types are structurally different even though they are the same object
 * at runtime, so a direct `new AxeBuilder({ page })` fails `tsc`.
 *
 * The duplicated `playwright-core` in node_modules is a dependency-hygiene
 * defect; this factory isolates the resulting cast to one place and changes no
 * runtime behaviour. Delete it once the two copies are deduplicated.
 */
type AxeBuilderPage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

function axeScanner(page: Page): AxeBuilder {
  return new AxeBuilder({ page: page as unknown as AxeBuilderPage }).withTags([...WCAG_TAGS]);
}

interface TrackedDefect {
  /** axe rule id, disabled for the zero-violation assertion. */
  readonly rule: string;
  /**
   * Failing-node count measured against the current build at 1440x900.
   * The ratchet asserts `actual <= nodes`, so a fix passes and a regression fails.
   */
  readonly nodes: number;
  /** Why this rule cannot pass today. */
  readonly reason: string;
}

interface RouteUnderTest {
  readonly path: string;
  /** Accessible name of the `<h1>` the platform shell renders for this route. */
  readonly shellHeading: RegExp;
  /** Proves real content loaded. Must fail if the route renders an empty shell. */
  readonly assertLoaded: (page: Page) => Promise<void>;
  readonly trackedDefects: readonly TrackedDefect[];
  /**
   * Current number of `<h1>` elements. The product target is 1; today the shell
   * header and the page body each render one. Ratcheted downward-only.
   */
  readonly h1Baseline: number;
  /**
   * Current number of `main` landmarks. The product target is 1; several pages
   * nest a second `<main>` inside the shell's `<main id="plat-main">`.
   */
  readonly mainBaseline: number;
}

// ── Tracked open defects ─────────────────────────────────────────────────────
// Each entry disables EXACTLY one axe rule on EXACTLY the routes where it fails.

/** WCAG 1.4.3 (AA). Slate-on-navy chrome and slate-on-white body copy across the
 *  platform sit between 2.2:1 and 4.0:1 against a 4.5:1 requirement. This is a
 *  palette-level defect, not a per-page one; it cannot be fixed from a spec.
 *
 *  Counts were lowered on 2026-08-08 after the two worst offenders in the shell
 *  were fixed: sidebar labels were #64748B on #07111F (3.98:1) and the plan
 *  label was #475569 on #111B28 (2.29:1), both now #94A3B8 at 7.39:1 and
 *  6.76:1. The ratchet asserts `actual <= nodes`, so leaving the old numbers
 *  would have quietly re-admitted every node the fix removed. */
const contrast = (nodes: number): TrackedDefect => ({
  rule: "color-contrast",
  nodes,
  reason:
    "WCAG 1.4.3 AA: platform palette ships text below 4.5:1 (sidebar labels #64748B on #07111F = 3.97:1; " +
    "plan label #475569 on #111B28 = 2.28:1; muted body copy #8A9BAE on white). Open brand-palette defect.",
});

const ROUTES: readonly RouteUnderTest[] = [
  {
    path: "/app/dashboard",
    shellHeading: /^Dashboard$/,
    assertLoaded: async (page) => {
      await expect(page.getByRole("region", { name: "Needs attention" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Document status summary" })).toBeVisible();
      // Recent-documents grid must actually contain fixture rows.
      await expect(page.getByRole("row")).not.toHaveCount(0);
    },
    trackedDefects: [contrast(73)],
    h1Baseline: 2,
    mainBaseline: 1,
  },
  {
    path: "/app/documents",
    shellHeading: /^Documents$/,
    assertLoaded: async (page) => {
      await expect(page.getByRole("main", { name: "Document list" })).toBeVisible();
      // 1 header row + 7 fixture documents.
      await expect(page.getByRole("row")).toHaveCount(8);
    },
    trackedDefects: [contrast(36)],
    h1Baseline: 2,
    mainBaseline: 2,
  },
  {
    path: "/app/bulk-send",
    shellHeading: /^Bulk Send$/,
    assertLoaded: async (page) => {
      await expect(
        page.getByRole("table", { name: /Bulk Send batches in this Workspace/i }),
      ).toBeVisible();
      // 1 header row + 6 fixture batches.
      await expect(page.getByRole("row")).toHaveCount(7);
    },
    trackedDefects: [contrast(5)],
    // Three: the shell header, `<PageHeader title="Bulk Send" />`, and
    // `<SectionHeading level={1} title="Bulk Send" />` in BulkSendOverviewPage.
    h1Baseline: 3,
    mainBaseline: 1,
  },
  {
    path: "/app/reports/preparation",
    shellHeading: /^Reports/,
    assertLoaded: async (page) => {
      await expect(page.getByRole("main", { name: "Bulk Send preparation report" })).toBeVisible();
      await expect(page.getByRole("article", { name: "Batches in Preparation" })).toBeVisible();
      await expect(page.getByRole("article", { name: "Validation Issues" })).toBeVisible();
    },
    trackedDefects: [contrast(16)],
    h1Baseline: 2,
    mainBaseline: 2,
  },
  {
    path: "/app/notifications",
    shellHeading: /^Notifications$/,
    assertLoaded: async (page) => {
      await expect(page.getByText("Bulk Send batch needs attention")).toBeVisible();
      await expect(page.getByRole("button", { name: /Mark all read/i })).toBeVisible();
    },
    trackedDefects: [
      contrast(62),
      {
        // WCAG 4.1.2. The unread dot is `<span aria-label="Unread">` with no
        // role, so the attribute is dropped: unread state is announced to no
        // one. Needs a real role (e.g. img) or visually-hidden text.
        rule: "aria-prohibited-attr",
        nodes: 6,
        reason:
          "WCAG 4.1.2: NotificationsPage renders the unread indicator as <span aria-label=\"Unread\"> " +
          "with no role, so assistive technology never announces unread state.",
      },
    ],
    h1Baseline: 2,
    mainBaseline: 1,
  },
  {
    path: "/app/contacts",
    shellHeading: /^Contacts$/,
    assertLoaded: async (page) => {
      await expect(page.getByRole("table", { name: "Contacts" })).toBeVisible();
      // 1 header row + 8 fixture contacts.
      await expect(page.getByRole("row")).toHaveCount(9);
    },
    trackedDefects: [contrast(26)],
    h1Baseline: 2,
    mainBaseline: 2,
  },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Signs in and lands on `route` in one page load.
 *
 * NOT `tests/support/app.ts::signIn` — that helper looks the password field up
 * with `getByLabel(/^password$/i)`, which matches zero elements because the
 * visible label is "Password *" (the required marker is `aria-hidden`, but
 * Playwright's label text is not accessible-name computation and keeps it).
 * Using the broken helper here would time out on every route. Reported upstream.
 */
async function signInAndLandOn(page: Page, route: string): Promise<void> {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(route)}`);

  await page.getByLabel(/^Email/i).fill(FIXTURE_EMAIL);
  await page.getByLabel(/^Password\b/i).fill(FIXTURE_PASSWORD);
  await page.getByRole("button", { name: /^Sign In$/i }).click();

  await expect(page).toHaveURL(new RegExp(`${route.replace(/\//g, "\\/")}$`));
  await expect(page.locator("main#plat-main")).toBeVisible();
  await waitForLoaded(page);
}

function describeViolations(violations: readonly AxeResult[]): string {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .slice(0, 5)
        .map((n) => `      • ${n.target.join(" ")}\n        ${(n.failureSummary ?? "").replace(/\s+/g, " ").trim()}`)
        .join("\n");
      const more = v.nodes.length > 5 ? `\n      • …and ${v.nodes.length - 5} more node(s)` : "";
      return `  [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))\n    ${v.helpUrl}\n${nodes}${more}`;
    })
    .join("\n");
}

/** Moderate/minor findings are informational: printed, attached, never enforced. */
async function reportNonBlocking(routePath: string, violations: readonly AxeResult[]): Promise<void> {
  const informational = violations.filter((v) => !BLOCKING_IMPACTS.has(v.impact ?? ""));
  if (informational.length === 0) {
    console.log(`[a11y] ${routePath}: no moderate/minor findings`);
    return;
  }
  const summary =
    `[a11y] ${routePath}: ${informational.length} moderate/minor finding(s) — not enforced\n` +
    describeViolations(informational);
  console.log(summary);
  await test.info().attach(`a11y-informational${routePath.replace(/\//g, "-")}.txt`, {
    body: summary,
    contentType: "text/plain",
  });
}

// ── Specs ────────────────────────────────────────────────────────────────────

for (const route of ROUTES) {
  test.describe(`accessibility — ${route.path}`, () => {
    // Sign-in plus two axe passes over a full page of fixture data.
    test.slow();

    test("has no serious or critical WCAG A/AA violations", async ({ page }) => {
      await signInAndLandOn(page, route.path);
      await route.assertLoaded(page);

      const trackedRules = route.trackedDefects.map((d) => d.rule);

      const scan = await axeScanner(page)
        // Only the rules listed in `trackedDefects` for THIS route — every one is
        // an open product defect documented above, not a suppressed check.
        .disableRules(trackedRules)
        .analyze();

      const blocking = scan.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ""));

      expect(
        blocking,
        `${route.path} introduced serious/critical accessibility violations ` +
          `outside the tracked set [${trackedRules.join(", ")}]:\n${describeViolations(blocking)}`,
      ).toHaveLength(0);

      await reportNonBlocking(route.path, scan.violations);
    });

    test("tracked accessibility defects have not spread", async ({ page }) => {
      await signInAndLandOn(page, route.path);
      await route.assertLoaded(page);

      const scan = await axeScanner(page).analyze();

      for (const defect of route.trackedDefects) {
        const violation = scan.violations.find((v) => v.id === defect.rule);
        const actual = violation?.nodes.length ?? 0;

        // Downward-only ratchet. Fixing nodes passes; adding new ones fails, so a
        // disabled rule cannot quietly become a licence to ship more of the bug.
        expect
          .soft(
            actual,
            `${route.path}: "${defect.rule}" now fails on ${actual} node(s), was ${defect.nodes}. ` +
              `The defect spread. Reason it is tracked: ${defect.reason}` +
              (violation ? `\n${describeViolations([violation])}` : ""),
          )
          .toBeLessThanOrEqual(defect.nodes);
      }
    });

    test("exposes a single top-level main landmark and a level-1 heading", async ({ page }) => {
      await signInAndLandOn(page, route.path);
      await route.assertLoaded(page);

      // Correct by design and enforced strictly: the shell's landmark exists
      // exactly once and is never nested inside another landmark.
      await expect(page.locator("main#plat-main")).toHaveCount(1);
      const shellMainIsNested = await page
        .locator("main#plat-main")
        .evaluate((el) => Boolean(el.parentElement?.closest("main, [role='main']")));
      expect(shellMainIsNested, "the platform shell <main> must be top level").toBe(false);

      // The shell must announce the route with a level-1 heading, and it must be
      // the first heading in DOM order so screen-reader users land on the page
      // name rather than a section title.
      const firstH1 = page.locator("h1").first();
      await expect(firstH1).toHaveText(route.shellHeading);

      // Ratchets toward the WCAG-recommended single h1 / single main. Both are
      // open defects (see baselines above): the counts may shrink, never grow.
      const mainCount = await page.locator("main, [role='main']").count();
      expect
        .soft(
          mainCount,
          `${route.path}: ${mainCount} main landmark(s). Target is 1 — page components ` +
            `render their own <main> inside the shell's <main id="plat-main">, producing ` +
            `nested/duplicate main landmarks.`,
        )
        .toBeLessThanOrEqual(route.mainBaseline);
      expect(mainCount).toBeGreaterThanOrEqual(1);

      const h1Count = await page.locator("h1").count();
      expect
        .soft(
          h1Count,
          `${route.path}: ${h1Count} <h1> element(s). Target is 1 — PlatformHeader and the ` +
            `page body each render one, so the page title is announced twice.`,
        )
        .toBeLessThanOrEqual(route.h1Baseline);
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });
  });
}
