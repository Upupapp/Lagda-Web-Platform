// Enlarged-layout checks for the four highest-traffic platform routes.
//
// ─────────────────────────────────────────────────────────────────────────────
// THIS APPROXIMATES 200% ZOOM. IT DOES NOT REPRODUCE IT.
//
// Playwright cannot drive the browser's own zoom control, so the `zoom-200`
// project models it the way WCAG 1.4.10 reflow defines the requirement: halve
// the CSS viewport (1440x900 -> 720x450) and double the device scale factor.
// That reproduces the reflow consequence of zooming — half as many CSS pixels
// across — but NOT the things that only real zoom changes: rasterised text and
// icon sharpness, sticky-header height as a proportion of the shrunken
// viewport, focus-ring and outline thickness, scrollbar and hit-target growth,
// browser-chrome overlap, and per-element `zoom`/`transform: scale` behaviour.
//
// A manual 200% (and 400%) zoom pass in a real browser therefore remains
// REQUIRED before release. See the manual quality validation checklist in docs/.
// ─────────────────────────────────────────────────────────────────────────────
//
// Note on project matching: playwright.config.ts gives the mobile-320,
// mobile-390 and tablet-portrait projects `testMatch: **/responsive/**/*.spec.ts`,
// which also matches this file, while `zoom-200` matches only
// `**/responsive/zoom-*.spec.ts`. Everything here is therefore scoped to the
// zoom-200 project so the enlarged-layout claims are made about the enlarged
// layout and nothing else; the narrow viewports are covered by layout.spec.ts.

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  FIXTURE_EMAIL,
  FIXTURE_PASSWORD,
  expectNoHorizontalScroll,
  waitForLoaded,
} from "../support/app";

const ZOOM_PROJECT = "zoom-200";

const ROUTES = [
  { path: "/app/dashboard", name: "dashboard", heading: /^Welcome back,/ },
  { path: "/app/documents", name: "documents", heading: /^Documents$/ },
  { path: "/app/bulk-send", name: "bulk send", heading: /^Bulk Send$/ },
  { path: "/app/reports/preparation", name: "preparation report", heading: /^Bulk Send Preparation$/ },
] as const;

// Sign-in is done here rather than through `signIn()` in tests/support/app.ts
// for two verified reasons: that helper's `getByLabel(/^password$/i)` never
// matches (the rendered label reads "Password *", the asterisk being a child
// span), and the mock session is React state only — no cookie, no storage — so
// a later page.goto() bounces back to /sign-in. Every route must be entered
// through ?returnTo=.
async function signInTo(page: Page, route: string): Promise<void> {
  // Cold bundle load plus a real form sign-in per test does not fit the 30s
  // project default on a slower machine. Raises this file's budget only.
  test.setTimeout(90_000);

  await page.goto(`/sign-in?returnTo=${encodeURIComponent(route)}`);
  await page.getByLabel(/email/i).fill(FIXTURE_EMAIL);
  await page.getByLabel(/^password/i).fill(FIXTURE_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname === route);
}

/** Converging wait — no fixed sleeps. See layout.spec.ts for the rationale. */
async function waitForSettled(page: Page): Promise<void> {
  await waitForLoaded(page);

  let previous = -1;
  await expect
    .poll(
      async () => {
        const count = await page.evaluate(() => {
          const main = document.querySelector("#plat-main");
          if (!main) return 0;
          return main.querySelectorAll("a,button,input,select,textarea,[tabindex]").length;
        });
        const stable = count === previous && count > 0;
        previous = count;
        return stable;
      },
      { timeout: 20_000, intervals: [200, 200, 300, 500, 1000] },
    )
    .toBe(true);

  await page.waitForFunction(() => {
    const wrapper = document.querySelector(".lagda-page-enter");
    if (!wrapper) return true;
    return wrapper.getAnimations().every((a) => a.playState === "finished");
  });
}

interface Unreachable {
  description: string;
  reasons: string[];
}

/**
 * Reports controls inside the main content region that the enlarged layout has
 * put beyond reach: clipped outside the viewport with no way to scroll to them,
 * collapsed to nothing, or made transparent while still keyboard focusable.
 *
 * Content inside a real horizontal scroller (`overflow-x: auto | scroll` with
 * actual overflow) is not reported — WCAG 1.4.10 permits two-dimensional
 * scrolling for data tables. Content clipped by `overflow-x: hidden` is
 * reported, because that content can never be brought into view.
 */
async function findUnreachableControls(page: Page): Promise<Unreachable[]> {
  return page.evaluate(() => {
    const CANDIDATES = [
      "a[href]",
      "area[href]",
      "button",
      "input",
      "select",
      "textarea",
      "summary",
      "iframe",
      "audio[controls]",
      "video[controls]",
      "[contenteditable]:not([contenteditable='false'])",
      "[tabindex]",
    ].join(",");

    function isTabbable(el: Element): boolean {
      if (el.matches(":disabled")) return false;
      const tabindex = el.getAttribute("tabindex");
      if (tabindex !== null && Number(tabindex) < 0) return false;
      if (el.closest("[inert]")) return false;
      if (el.closest("[hidden]")) return false;
      if (el.getClientRects().length === 0) return false;
      if (getComputedStyle(el).visibility !== "visible") return false;
      return true;
    }

    function effectiveOpacity(el: Element): number {
      let opacity = 1;
      let node: Element | null = el;
      while (node) {
        const value = parseFloat(getComputedStyle(node).opacity);
        if (!Number.isNaN(value)) opacity *= value;
        node = node.parentElement;
      }
      return opacity;
    }

    function insideHorizontalScroller(el: Element): boolean {
      let node = el.parentElement;
      while (node) {
        const overflowX = getComputedStyle(node).overflowX;
        if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth - node.clientWidth > 1) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    function describe(el: Element): string {
      const label =
        el.getAttribute("aria-label")?.trim() ||
        (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 48) ||
        el.getAttribute("placeholder") ||
        "(no accessible name)";
      return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}> "${label}"`;
    }

    const main = document.querySelector("#plat-main");
    if (!main) throw new Error("#plat-main is not present — the platform shell did not render");

    const unreachable: { description: string; reasons: string[] }[] = [];

    for (const el of Array.from(main.querySelectorAll(CANDIDATES))) {
      if (!isTabbable(el)) continue;

      const rect = el.getBoundingClientRect();
      const reasons: string[] = [];

      if (rect.width < 2 || rect.height < 2) {
        reasons.push(`collapsed to ${rect.width.toFixed(1)}x${rect.height.toFixed(1)} px`);
      }
      if (effectiveOpacity(el) < 0.05) {
        reasons.push("effectively transparent");
      }
      if ((rect.right <= 0 || rect.left >= window.innerWidth) && !insideHorizontalScroller(el)) {
        reasons.push(
          `clipped outside the viewport (x ${Math.round(rect.left)}..${Math.round(rect.right)}, viewport 0..${window.innerWidth})`,
        );
      }

      if (reasons.length > 0) unreachable.push({ description: describe(el), reasons });
    }

    return unreachable;
  });
}

/** scrollWidth beyond clientWidth on a `overflow-x: hidden` box means content was cut off. */
async function mainRegionOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const main = document.querySelector("#plat-main");
    if (!main) throw new Error("#plat-main is not present");
    return main.scrollWidth - main.clientWidth;
  });
}

test.describe("enlarged layout (approximate 200% zoom)", () => {
  // Only meaningful in the project that supplies the enlarged viewport. This
  // runs before the per-route beforeEach below, so a skipped test never signs
  // in. `ConditionBody` receives fixtures but not TestInfo, hence the hook.
  // Playwright requires the first parameter to be an object destructuring
  // pattern even when no fixture is used.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== ZOOM_PROJECT,
      `only runs in the ${ZOOM_PROJECT} project — narrow viewports are covered by layout.spec.ts`,
    );
  });

  for (const route of ROUTES) {
    test.describe(`${route.name} (${route.path})`, () => {
      test.beforeEach(async ({ page }) => {
        await signInTo(page, route.path);
        await waitForSettled(page);
      });

      test("does not scroll the page horizontally", async ({ page }) => {
        await expectNoHorizontalScroll(page);
      });

      test("still shows its primary heading", async ({ page }) => {
        const heading = page.getByRole("heading", { level: 1, name: route.heading }).first();
        await expect(heading).toBeVisible();

        const box = await heading.boundingBox();
        expect(box, "primary heading has no layout box").not.toBeNull();
        expect(box!.height, "primary heading collapsed to zero height").toBeGreaterThan(4);
        expect(box!.x, "primary heading starts off the left edge").toBeGreaterThanOrEqual(0);
        expect(
          box!.x,
          "primary heading starts beyond the right edge",
        ).toBeLessThan(page.viewportSize()?.width ?? 0);
      });

      test("keeps every control in the content region reachable", async ({ page }) => {
        const unreachable = await findUnreachableControls(page);
        expect(
          unreachable,
          `${unreachable.length} control(s) became unreachable in the enlarged layout:\n` +
            unreachable
              .map((u, i) => `  ${i + 1}. ${u.description}\n     - ${u.reasons.join("\n     - ")}`)
              .join("\n"),
        ).toEqual([]);
      });

      test("does not clip content out of the main region", async ({ page }) => {
        // `.platform-main` is `overflow-x: hidden`, so anything wider than the
        // region is permanently cut off rather than scrollable. A 1px tolerance
        // absorbs sub-pixel layout rounding.
        const overflow = await mainRegionOverflow(page);
        expect(
          overflow,
          `the main content region overflows its box by ${overflow}px and clips it away`,
        ).toBeLessThanOrEqual(1);
      });
    });
  }
});
