// Reduced-motion browser tests (Gap Closure Command 6).
//
// Runs under the `reduced-motion` Playwright project, which sets
// `contextOptions: { reducedMotion: "reduce" }` at the BROWSER CONTEXT level.
// That is what CSS `@media (prefers-reduced-motion: reduce)` actually reads, so
// nothing here sets the preference itself — a test that flipped it locally would
// stop testing the shipped configuration.
//
// What these tests defend, and how each one can fail:
//
//   1. The preference is genuinely in effect. Every other assertion in this file
//      is meaningless if the context option silently stopped applying, so it is
//      asserted rather than assumed.
//
//   2. `src/styles/theme.css` clamps `animation-iteration-count` to 1 for every
//      element and pseudo-element under reduced motion. That clamp is the ONLY
//      thing that stops this application's spinners and skeletons: components
//      declare `animation: … infinite` in a `style` attribute, and an inline
//      declaration outranks a plain stylesheet rule — including the several
//      local `@media (prefers-reduced-motion: reduce)` blocks that clamp only
//      `animation-duration`. Measured on the real dashboard: with the preference
//      off, its loading state has 70+ elements running forever (the refresh
//      spinner plus every skeleton block); with it on, zero. The loading-state
//      test below is what holds that line.
//
//   3. The official LAGDA logo is never animated, in any motion mode. Brand rule,
//      not a motion-preference concession: animating the mark is prohibited
//      outright, so `animationName` must be the literal `none` rather than merely
//      a clamped iteration count.
//
//   4. Reduced motion must not cost functionality. Route transitions are driven
//      by React Router, not by the entrance animation, but a CSS change that hid
//      or disabled navigation behind the media query would be invisible to every
//      other project in the suite.
//
// Navigation between authenticated routes goes through the sign-in `returnTo`
// parameter or an in-app link, never `page.goto`. The demonstration session is
// React state with no storage backing, so a full page load drops it and lands on
// /sign-in — a hard navigation would be testing the redirect, not the page.
//
// No real credentials and no network: the application is a frontend-only
// demonstration backed by mock services, and the fixture identity comes from
// `tests/support/app.ts`.

import { test, expect, type Page } from "@playwright/test";
import { failOnConsoleErrors, signIn, waitForLoaded } from "../support/app";

// ── Types shared between Node and the page ───────────────────────────────────

interface AnimationOffender {
  readonly description: string;
  readonly animationName: string;
  readonly iterationCount: string;
}

interface ResolvedAnimation {
  readonly animationName: string;
  readonly iterationCount: string;
  readonly durationSeconds: number;
}

interface MotionSnapshot {
  /** Everything running an animation that never ends. */
  readonly offenders: AnimationOffender[];
  /** The element the snapshot waited for, if the caller named one. */
  readonly trigger: ResolvedAnimation | null;
}

declare global {
  interface Window {
    /** Set by `armMotionSnapshot`; read back after the triggering action. */
    __lagdaMotionSnapshot?: Promise<MotionSnapshot>;
  }
}

// ── Page-side scanner ────────────────────────────────────────────────────────

/**
 * Installs a pending snapshot on `window` that resolves as soon as `selector`
 * appears, then records every infinitely-animating element at that instant.
 *
 * Two steps rather than one so ordering is guaranteed: this call is awaited, so
 * the MutationObserver is provably installed BEFORE the caller triggers the
 * transient state. That removes the race entirely — no polling, no sleeping, and
 * no dependence on how long a 400 ms mock delay happens to take.
 */
async function armMotionSnapshot(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    function describe(el: Element): string {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      // `className` is an SVGAnimatedString on SVG elements, so read the
      // attribute rather than the property.
      const rawClass = (el.getAttribute("class") ?? "").trim();
      const cls = rawClass ? `.${rawClass.split(/\s+/).slice(0, 2).join(".")}` : "";
      const label = el.getAttribute("aria-label");
      return `${tag}${id}${cls}${label ? `[aria-label="${label}"]` : ""}`;
    }

    function scan(): AnimationOffender[] {
      const found: AnimationOffender[] = [];
      for (const el of Array.from(document.querySelectorAll("*"))) {
        for (const pseudo of ["", "::before", "::after"]) {
          const cs = window.getComputedStyle(el, pseudo === "" ? undefined : pseudo);
          const rawName = cs.animationName;
          if (!rawName || rawName === "none") continue;

          const names = rawName.split(",").map((s) => s.trim());
          const counts = cs.animationIterationCount.split(",").map((s) => s.trim());

          for (let i = 0; i < names.length; i += 1) {
            const name = names[i];
            if (!name || name === "none") continue;
            // Per spec the shorter animation-* list repeats to match
            // animation-name, so index modulo length is the resolved value.
            const count = counts.length > 0 ? counts[i % counts.length] : undefined;
            if (count === "infinite") {
              found.push({
                description: `${describe(el)}${pseudo}`,
                animationName: name,
                iterationCount: count,
              });
            }
          }
        }
      }
      return found;
    }

    function snapshot(el: Element): MotionSnapshot {
      const cs = window.getComputedStyle(el);
      return {
        // Scan first: reading the trigger must not perturb what is on screen.
        offenders: scan(),
        trigger: {
          animationName: cs.animationName,
          iterationCount: cs.animationIterationCount,
          durationSeconds: Number.parseFloat(cs.animationDuration),
        },
      };
    }

    window.__lagdaMotionSnapshot = new Promise<MotionSnapshot>((resolve) => {
      const present = document.querySelector(sel);
      if (present) {
        resolve(snapshot(present));
        return;
      }
      const observer = new MutationObserver(() => {
        const el = document.querySelector(sel);
        if (!el) return;
        observer.disconnect();
        resolve(snapshot(el));
      });
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    });
  }, selector);
}

/** Awaits the snapshot armed by `armMotionSnapshot`. */
async function readMotionSnapshot(page: Page): Promise<MotionSnapshot> {
  return page.evaluate(() => {
    const pending = window.__lagdaMotionSnapshot;
    if (!pending) throw new Error("armMotionSnapshot was never called on this page");
    return pending;
  });
}

/**
 * Every element (plus ::before/::after) currently running an animation with an
 * infinite iteration count.
 *
 * Only entries whose `animation-name` resolves to something other than `none`
 * count: an iteration count on an element with no animation name is inert, and
 * reporting it would be noise. A name AND an infinite count together mean
 * something on screen is moving forever, which is exactly what reduced motion
 * exists to stop.
 */
async function findInfiniteAnimations(page: Page): Promise<AnimationOffender[]> {
  await armMotionSnapshot(page, "html");
  const snapshot = await readMotionSnapshot(page);
  return snapshot.offenders;
}

/** Computed `animation-name` of the first element matching `selector`. */
async function animationNameOf(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return "__ELEMENT_NOT_FOUND__";
    return window.getComputedStyle(el).animationName;
  }, selector);
}

// ── Locators ─────────────────────────────────────────────────────────────────

/** The sidebar's real navigation landmark (the <aside> around it is complementary). */
function sidebarNav(page: Page) {
  return page.getByRole("navigation", { name: "Platform sections" });
}

/**
 * The route title in the platform shell header.
 *
 * Scoped deliberately. Authenticated routes render more than one <h1> — the
 * shell header's route title plus the page's own PageHeader, and Bulk Send adds
 * a third — so an unscoped heading locator is a strict-mode violation waiting to
 * happen. That duplication is a real accessibility defect, reported separately;
 * these tests are about motion and simply address each heading precisely.
 */
function shellTitle(page: Page, name: string) {
  return page
    .getByLabel("Platform header")
    .getByRole("heading", { level: 1, name, exact: true });
}

/** The page's own <h1>, inside the main content region. */
function contentTitle(page: Page, name: string) {
  return page
    .locator("#plat-main")
    .getByRole("heading", { level: 1, name, exact: true })
    .first();
}

/**
 * Fails unless the browser context really is in reduced-motion mode.
 *
 * Guards against this whole file degrading into a no-op: if the project's
 * `contextOptions` were dropped, the app would animate normally and the
 * assertions below would either pass vacuously or fail for the wrong reason.
 */
async function expectReducedMotionActive(page: Page): Promise<void> {
  const active = await page.evaluate(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(
    active,
    "prefers-reduced-motion is not in effect — the reduced-motion project context did not apply",
  ).toBe(true);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("reduced motion", () => {
  test("/app/dashboard loads and stays usable with reduced motion", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    await signIn(page);
    await expectReducedMotionActive(page);
    await waitForLoaded(page);

    // Real content, not an empty shell.
    await expect(shellTitle(page, "Dashboard")).toBeVisible();
    await expect(sidebarNav(page)).toBeVisible();
    await expect(page.locator("#plat-main")).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh dashboard" })).toBeEnabled();

    // The route-entrance animation is switched OFF, not merely shortened. The
    // wrapper carries `.lagda-page-enter` on every /app route.
    expect(
      await animationNameOf(page, ".lagda-page-enter"),
      ".lagda-page-enter must resolve to animation:none under reduced motion",
    ).toBe("none");

    expect(consoleErrors, "console errors on /app/dashboard").toEqual([]);
  });

  test("/app/bulk-send loads and its controls still respond with reduced motion", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    // Enterprise-preview capability: arriving here at all proves CapabilityGuard
    // admitted the route in this build profile.
    await signIn(page, "/app/bulk-send");
    await expectReducedMotionActive(page);
    await expect(shellTitle(page, "Bulk Send")).toBeVisible();
    await expect(contentTitle(page, "Bulk Send")).toBeVisible();
    await waitForLoaded(page);

    // Usable, not merely painted: typing into the batch filter must take.
    const search = page.getByLabel("Search batches");
    await expect(search).toBeVisible();
    await search.fill("frontend demonstration batch");
    await expect(search).toHaveValue("frontend demonstration batch");

    expect(
      await animationNameOf(page, ".lagda-page-enter"),
      ".lagda-page-enter must resolve to animation:none under reduced motion",
    ).toBe("none");

    expect(consoleErrors, "console errors on /app/bulk-send").toEqual([]);
  });

  test("the official LAGDA logo is never animated", async ({ page }) => {
    await signIn(page);
    await expectReducedMotionActive(page);
    await waitForLoaded(page);

    // The sidebar brand link. `LagdaLogo` renders the official PNG inside a
    // wrapper <span>, and only swaps to an inline SVG placeholder if the PNG
    // fails to load — so requiring the <img> also proves the shipped asset
    // resolved.
    const brandLink = page.getByRole("link", { name: /Go to Dashboard/ });
    await expect(brandLink).toBeVisible();

    const logoImg = brandLink.locator("img");
    await expect(logoImg).toHaveCount(1);
    await expect(logoImg).toBeVisible();
    await expect(logoImg).toHaveAttribute("src", /^\/brand\/.+\.png$/);

    // naturalWidth > 0 means the browser actually decoded the file. A 404 would
    // leave it at 0 and silently fall back to the placeholder shield.
    const decodedWidth = await logoImg.evaluate((el) => (el as HTMLImageElement).naturalWidth);
    expect(decodedWidth, "the official logo PNG did not load").toBeGreaterThan(0);

    // The brand rule: the mark carries no animation at all. `none` — not a
    // clamped duration, not a single iteration.
    const imgAnimation = await logoImg.evaluate((el) => window.getComputedStyle(el).animationName);
    expect(imgAnimation, "the LAGDA logo image must not be animated").toBe("none");

    // ...and neither does the wrapper that positions it, which is where a
    // "subtle" glow or float would most naturally be added.
    const wrapperAnimation = await logoImg.evaluate((el) => {
      const parent = el.parentElement;
      return parent ? window.getComputedStyle(parent).animationName : "__NO_PARENT__";
    });
    expect(wrapperAnimation, "the LAGDA logo wrapper must not be animated").toBe("none");
  });

  test("nothing on the settled /app/dashboard runs an infinite animation", async ({ page }) => {
    await signIn(page);
    await expectReducedMotionActive(page);
    // Loading affordances are legitimately infinite while they are up, so settle
    // the page first; this measures the resting state a reader actually sits on.
    await waitForLoaded(page);
    await expect(shellTitle(page, "Dashboard")).toBeVisible();

    const offenders = await findInfiniteAnimations(page);
    expect(
      offenders,
      `elements animating forever under reduced motion: ${JSON.stringify(offenders, null, 2)}`,
    ).toEqual([]);
  });

  test("nothing on the settled /app/bulk-send runs an infinite animation", async ({ page }) => {
    await signIn(page, "/app/bulk-send");
    await expectReducedMotionActive(page);
    await expect(contentTitle(page, "Bulk Send")).toBeVisible();
    await waitForLoaded(page);

    const offenders = await findInfiniteAnimations(page);
    expect(
      offenders,
      `elements animating forever under reduced motion: ${JSON.stringify(offenders, null, 2)}`,
    ).toEqual([]);
  });

  test("the dashboard's loading state neither spins nor pulses forever", async ({ page }) => {
    await signIn(page);
    await expectReducedMotionActive(page);
    await waitForLoaded(page);

    const refresh = page.getByRole("button", { name: "Refresh dashboard" });
    await expect(refresh).toBeEnabled();

    // The refresh icon takes `.spin-icon` while the dashboard reloads, and the
    // whole body reverts to skeleton blocks. Every one of those declares
    // `animation: … infinite` inline, and the dashboard's own reduced-motion
    // block clamps only `animation-duration`. Nothing but the global
    // `animation-iteration-count: 1 !important` in theme.css stops them. With
    // the preference off this snapshot returns 70+ offenders; under reduced
    // motion it must return none.
    await armMotionSnapshot(page, ".spin-icon");
    await refresh.click();
    const snapshot = await readMotionSnapshot(page);

    const spinner = snapshot.trigger;
    expect(spinner, "did not capture the dashboard refresh spinner").not.toBeNull();
    expect(spinner?.animationName, "captured the wrong element").toBe("spin-anim");
    expect(
      spinner?.iterationCount,
      "the refresh spinner is still set to animate forever under reduced motion",
    ).toBe("1");
    expect(
      spinner?.durationSeconds,
      "the refresh spinner's duration was not collapsed under reduced motion",
    ).toBeLessThan(0.05);

    expect(
      snapshot.offenders,
      `loading-state elements animating forever: ${JSON.stringify(snapshot.offenders, null, 2)}`,
    ).toEqual([]);

    // And the page recovers: the spinner clears and the dashboard is usable again.
    await expect(page.locator(".spin-icon")).toHaveCount(0);
    await expect(refresh).toBeEnabled();
  });

  test("navigation still works with reduced motion", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    await signIn(page);
    await expectReducedMotionActive(page);
    await waitForLoaded(page);

    await sidebarNav(page).getByRole("link", { name: "Documents", exact: true }).click();

    await expect(page).toHaveURL(/\/app\/documents$/);
    await waitForLoaded(page);
    await expect(shellTitle(page, "Documents")).toBeVisible();
    await expect(contentTitle(page, "Documents")).toBeVisible();

    // Back through browser history. The entrance animation is disabled, so if
    // the content wrapper relied on that animation to become visible, this is
    // where it would surface as a blank page.
    await page.goBack();
    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await waitForLoaded(page);
    await expect(shellTitle(page, "Dashboard")).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh dashboard" })).toBeVisible();

    expect(consoleErrors, "console errors while navigating").toEqual([]);
  });
});
