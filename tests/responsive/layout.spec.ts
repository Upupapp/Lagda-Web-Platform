// Responsive layout guarantees for the four highest-traffic platform routes.
//
// Runs under the mobile-320, mobile-390 and tablet-portrait projects. The
// viewport comes from the project — nothing here calls setViewportSize.
//
// Three guarantees are asserted per route:
//   1. WCAG 1.4.10 reflow — the page itself never scrolls sideways.
//   2. The route's own level-1 heading is rendered and visible.
//   3. Nothing that is hidden by CSS is still reachable with the Tab key.
//
// (3) is the assertion that actually finds bugs. A control pushed outside a
// clipping container, shrunk to nothing, or faded to zero opacity disappears
// for sighted users but stays in the tab order for keyboard and screen-reader
// users, who then land on something they cannot see or act on.

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  FIXTURE_EMAIL,
  FIXTURE_PASSWORD,
  expectNoHorizontalScroll,
  waitForLoaded,
} from "../support/app";

// ── Routes under test ────────────────────────────────────────────────────────
// `heading` is the accessible name of the level-1 heading the route itself
// renders. Several routes render more than one h1 (the sticky platform header
// repeats the page title at >=768px, and Bulk Send renders both a PageHeader
// and a SectionHeading at level 1), so every heading assertion uses .first().
const ROUTES = [
  { path: "/app/dashboard", name: "dashboard", heading: /^Welcome back,/ },
  { path: "/app/documents", name: "documents", heading: /^Documents$/ },
  { path: "/app/bulk-send", name: "bulk send", heading: /^Bulk Send$/ },
  { path: "/app/reports/preparation", name: "preparation report", heading: /^Bulk Send Preparation$/ },
] as const;

/** The `@media (max-width: 767px)` boundary in PlatformLayout's own stylesheet. */
const MOBILE_NAV_BREAKPOINT = 768;

// ── Sign-in ──────────────────────────────────────────────────────────────────
// Deliberately NOT `signIn()` from tests/support/app.ts. Two reasons, both
// verified against the built app rather than assumed:
//
//   1. The shared helper looks the password box up with `getByLabel(/^password$/i)`.
//      The rendered label text is "Password *" (the required-field asterisk is a
//      child span), so the anchored regex matches nothing and the helper times
//      out. `/^password/i` matches exactly one element. Reported, not patched —
//      tests/support/app.ts is not this file's to change.
//   2. The mock session lives in React state only (no cookie, no localStorage,
//      no sessionStorage). A full page load after signing in therefore lands
//      back on /sign-in, so every route has to be reached through ?returnTo=
//      rather than a later page.goto().
async function signInTo(page: Page, route: string): Promise<void> {
  // Every test loads the production bundle from cold and signs in through the
  // real form, which does not fit the 30s project default on a slower machine.
  // This raises only this file's budget; playwright.config.ts is untouched.
  test.setTimeout(90_000);

  await page.goto(`/sign-in?returnTo=${encodeURIComponent(route)}`);
  await page.getByLabel(/email/i).fill(FIXTURE_EMAIL);
  await page.getByLabel(/^password/i).fill(FIXTURE_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname === route);
}

/**
 * Waits until the route has finished rendering, without sleeping.
 *
 * Three converging conditions, in order: no loading affordance left; the number
 * of focusable controls *inside the content region* non-zero and unchanged
 * across two consecutive samples (the shell alone renders first, and several
 * routes fill their sections from async mock services afterwards); and the
 * route entrance animation finished — it animates opacity 0 -> 1, which a scan
 * taken mid-flight would read as "transparent".
 */
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

// ── The hidden-but-tabbable scan ─────────────────────────────────────────────

interface HiddenControl {
  description: string;
  reasons: string[];
}

interface ScanResult {
  candidates: number;
  hidden: HiddenControl[];
}

interface ScanOptions {
  /** Only consider elements inside this selector. */
  within?: string;
  /** Ignore elements inside any of these selectors. */
  notWithin?: string[];
}

/**
 * Returns every element that the browser will hand keyboard focus to but that a
 * sighted user cannot see.
 *
 * Tabbability is decided the way the browser decides it: disabled, negative
 * tabindex, `inert`, `hidden`, `display:none` and `visibility:hidden` elements
 * are not in the tab order and are not reported.
 *
 * Of the elements that ARE in the tab order, one is reported when it is
 * smaller than 2x2 CSS pixels, effectively transparent, or lies entirely
 * outside the viewport horizontally.
 *
 * The horizontal check exempts anything inside an ancestor that is genuinely
 * horizontally scrollable (`overflow-x: auto | scroll` with real overflow) —
 * a wide data table in a scroller is an accepted pattern under WCAG 1.4.10.
 * `overflow-x: hidden` is NOT exempt: that clips content away permanently,
 * which is precisely the failure worth catching.
 */
async function scanForHiddenTabbables(page: Page, options: ScanOptions = {}): Promise<ScanResult> {
  return page.evaluate((opts: ScanOptions) => {
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
      // No client rects covers display:none, detached subtrees and the closed
      // half of a <details>. Such elements are not focusable.
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
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const label =
        el.getAttribute("aria-label")?.trim() ||
        (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 48) ||
        el.getAttribute("placeholder") ||
        "(no accessible name)";
      const container = el.closest("[id]");
      const where = container && container !== el ? ` in #${container.id}` : "";
      return `<${tag}${id}> "${label}"${where}`;
    }

    const scope = opts.within ? document.querySelector(opts.within) : document.body;
    if (!scope) throw new Error(`scan scope "${opts.within}" is not present in the DOM`);

    const hidden: { description: string; reasons: string[] }[] = [];
    let candidates = 0;

    for (const el of Array.from(scope.querySelectorAll(CANDIDATES))) {
      if (opts.notWithin?.some((selector) => el.closest(selector))) continue;
      if (!isTabbable(el)) continue;
      candidates += 1;

      const rect = el.getBoundingClientRect();
      const reasons: string[] = [];

      if (rect.width < 2 || rect.height < 2) {
        reasons.push(`smaller than 2x2 px (${rect.width.toFixed(1)}x${rect.height.toFixed(1)})`);
      }
      if (effectiveOpacity(el) < 0.05) {
        reasons.push("effectively transparent");
      }
      if ((rect.right <= 0 || rect.left >= window.innerWidth) && !insideHorizontalScroller(el)) {
        reasons.push(
          `clipped outside the viewport horizontally (x ${Math.round(rect.left)}..${Math.round(
            rect.right,
          )}, viewport 0..${window.innerWidth})`,
        );
      }

      if (reasons.length > 0) hidden.push({ description: describe(el), reasons });
    }

    return { candidates, hidden };
  }, options);
}

function formatViolations(result: ScanResult): string {
  return result.hidden
    .map((v, i) => `  ${i + 1}. ${v.description}\n     - ${v.reasons.join("\n     - ")}`)
    .join("\n");
}

// ── Per-route guarantees ─────────────────────────────────────────────────────

for (const route of ROUTES) {
  test.describe(`${route.name} (${route.path})`, () => {
    test.beforeEach(async ({ page }) => {
      await signInTo(page, route.path);
      await waitForSettled(page);
    });

    test("does not scroll the page horizontally", async ({ page }) => {
      await expectNoHorizontalScroll(page);
    });

    test("renders its primary heading visibly", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 1, name: route.heading }).first();
      await expect(heading).toBeVisible();
      // A heading present but collapsed to nothing would still satisfy
      // toBeVisible in some layouts; require real painted height.
      const box = await heading.boundingBox();
      expect(box, "primary heading has no layout box").not.toBeNull();
      expect(box!.height, "primary heading collapsed to zero height").toBeGreaterThan(4);
    });

    test("keeps every keyboard-reachable control in the content region visible", async ({ page }) => {
      const width = page.viewportSize()?.width ?? 0;

      // KNOWN DEFECT — LAGDA-RESP-1 (reported, not patched here).
      // PlatformDashboard's `.dashboard-layout` uses `grid-template-columns: 1fr`.
      // A `1fr` track floors at min-content, and a `white-space: nowrap`
      // document title inside it forces that floor to ~533px, so the whole main
      // column overflows any viewport narrower than that. `.platform-main` has
      // `overflow-x: hidden`, so the surplus is clipped away rather than
      // scrollable — yet the links inside it ("All documents", "View all",
      // "Manage", "Open Bulk Send", ...) stay in the tab order at x >= 427.
      // Fix is `grid-template-columns: minmax(0, 1fr)` in PlatformDashboard.tsx.
      // 500px is used as the threshold rather than the measured 533px so the
      // condition does not straddle the failure point on a machine with
      // slightly different font metrics.
      test.fail(
        route.path === "/app/dashboard" && width < 500,
        "LAGDA-RESP-1: dashboard main column overflows and is clipped below ~533px",
      );

      const result = await scanForHiddenTabbables(page, { within: "#plat-main" });

      expect(result.candidates, "no focusable controls were scanned — the route did not render")
        .toBeGreaterThan(0);
      expect(
        result.hidden,
        `${result.hidden.length} keyboard-reachable control(s) are hidden at ${width}px:\n${formatViolations(result)}`,
      ).toEqual([]);
    });
  });
}

// ── Shell-level guarantees ───────────────────────────────────────────────────
// The platform shell is identical on every route, so these run once. /app/documents
// is used because it is the one route in the set with no known layout defect.

test.describe("platform shell", () => {
  test.beforeEach(async ({ page }) => {
    await signInTo(page, "/app/documents");
    await waitForSettled(page);
  });

  test("exposes no hidden keyboard-reachable control in the header or navigation", async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0;

    const result = await scanForHiddenTabbables(page, {
      notWithin: [
        "#plat-main", // covered per-route above
        "#mobile-nav-drawer", // covered by the closed-drawer test below
        ".platform-skip-link", // reveal-on-focus by design; covered by its own test below
      ],
    });

    expect(result.candidates, "no shell controls were scanned — the shell did not render")
      .toBeGreaterThan(0);
    expect(
      result.hidden,
      `${result.hidden.length} shell control(s) are hidden at ${width}px:\n${formatViolations(result)}`,
    ).toEqual([]);
  });

  test("reveals the skip link when it receives focus", async ({ page }) => {
    const skipLink = page.locator("a.platform-skip-link");
    await expect(skipLink).toHaveAttribute("href", "#plat-main");

    const parked = await skipLink.boundingBox();
    expect(parked, "skip link has no layout box").not.toBeNull();
    expect(parked!.x, "skip link should be parked off-screen until focused").toBeLessThan(0);

    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    const revealed = await skipLink.boundingBox();
    expect(revealed, "focused skip link has no layout box").not.toBeNull();
    expect(revealed!.x, "focused skip link is still off-screen").toBeGreaterThanOrEqual(0);
    expect(revealed!.x, "focused skip link is off the right edge").toBeLessThan(viewportWidthOf(page));
    expect(revealed!.width, "focused skip link did not expand to a usable size").toBeGreaterThan(40);
    expect(revealed!.height, "focused skip link did not expand to a usable size").toBeGreaterThan(12);
  });

  test("keeps the closed mobile navigation drawer out of the tab order", async ({ page }) => {
    const viewportWidth = page.viewportSize()?.width ?? 0;
    test.skip(
      viewportWidth >= MOBILE_NAV_BREAKPOINT,
      "the drawer only exists below the 768px breakpoint",
    );

    // KNOWN DEFECT — LAGDA-RESP-2 (reported, not patched here).
    // MobileNav renders #mobile-nav-drawer unconditionally and hides it with
    // `transform: translateX(-100%)` alone. Transform does not remove anything
    // from the tab order, so all 14 drawer controls (Prepare Document,
    // Dashboard ... Settings, Sign Out, Close navigation) stay tabbable while
    // the drawer is shut, sitting at x -270..-11. A keyboard user tabbing off
    // the hamburger disappears into an invisible menu. The element also carries
    // role="dialog" + aria-modal permanently.
    // Fix: gate rendering on `drawerOpen`, or add `inert` / `visibility: hidden`
    // while closed. Remove this annotation once fixed — Playwright then reports
    // the unexpected pass and forces the update.
    test.fail(true, "LAGDA-RESP-2: closed mobile drawer keeps 14 controls in the tab order");

    await expect(page.getByRole("button", { name: /open navigation/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    const result = await scanForHiddenTabbables(page, { within: "#mobile-nav-drawer" });
    expect(
      result.hidden,
      `the closed drawer keeps ${result.hidden.length} control(s) reachable:\n${formatViolations(result)}`,
    ).toEqual([]);
  });
});

function viewportWidthOf(page: Page): number {
  return page.viewportSize()?.width ?? Number.MAX_SAFE_INTEGER;
}
