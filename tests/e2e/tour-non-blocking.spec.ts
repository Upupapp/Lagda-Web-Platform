// Regression suite for the Product Tour's "explain-only" contract.
//
// The tour is deliberately NON-modal: `aria-modal="false"`, no focus trap, and
// a spotlight backdrop that is purely visual. The rest of the page must stay
// fully operable while a coach-mark is on screen.
//
// It was not. Two defects, both of which had to be fixed for the page to be
// usable during a tour step:
//
//   1. TourCoachmark rendered a full-bleed bottom sheet whenever the step had
//      no anchor (`placement: "center"`), at EVERY width. On a 1440x900 window
//      that is a 1440px-wide, 164px-tall card pinned to the bottom edge, sitting
//      directly on top of the sidebar footer — i.e. on top of the account menu.
//   2. TourOverlay's targetless branch omitted `pointerEvents: "none"` (the
//      anchored branch had it), so even with the card moved out of the way the
//      full-viewport dim swallowed every click.
//
// Four specs in critical-flows.spec.ts failed because of this, all with
// "<div> from <div role=\"dialog\"> subtree intercepts pointer events". Those
// failures were a true product defect, not test flake.
//
// What this file asserts, at 1440x900 AND at 375x667, for EVERY tour step:
//   - `document.elementFromPoint` at the centre of each persistent chrome
//     control returns that control (or a descendant), never the coach-mark and
//     never the backdrop;
//   - a real click on a control genuinely works while a step is showing;
//   - Escape dismisses, and focus lands somewhere sensible rather than <body>.
//
// Hit-testing rather than `toBeVisible()` is the point: an overlay stacked on
// top of a control leaves it perfectly "visible" to both Playwright and a
// screen reader while making it unclickable. Only elementFromPoint catches it.

import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { FIXTURE_EMAIL, FIXTURE_PASSWORD, failOnConsoleErrors } from "../support/app";

// ── Locators ─────────────────────────────────────────────────────────────────

const coachmark = (page: Page) =>
  page.locator('[role="dialog"][aria-labelledby="tour-coachmark-title"]');

const stepCounter = (page: Page) => coachmark(page).getByText(/^Step \d+ of \d+$/);

interface Control {
  name: string;
  locator: Locator;
  /**
   * When true, the control scrolling out of the viewport is not a failure —
   * only being covered is. See the header note below.
   */
  mayScrollAway?: boolean;
}

/** Persistent chrome on a wide viewport. */
const wideControls = (page: Page): Control[] => [
  {
    // In the sidebar <aside>, which is `position: sticky; top: 0; height: 100vh`
    // and genuinely stays put — so this one is asserted unconditionally.
    name: "account menu (sidebar footer)",
    locator: page.getByRole("button", { name: /account menu for/i }),
  },
  {
    name: "primary nav — Documents link",
    locator: page.locator('aside[aria-label="Platform navigation"] a[href="/app/documents"]'),
  },
  {
    // PlatformHeader is `position: sticky; top: 0`, but it does NOT stay pinned:
    // measured at y = -87 on step 2, after TourContext's
    // scrollIntoView({block:"center"}) scrolled the dashboard to centre the
    // Quick Actions card. That is a shell bug (the header's sticky ancestor is
    // not the element that scrolls), not the tour covering anything, and it is
    // out of scope here — so this control is asserted only while it is on
    // screen. Remove `mayScrollAway` once the header actually sticks.
    name: "header search button",
    locator: page.getByRole("button", { name: /open search/i }),
    mayScrollAway: true,
  },
];

/**
 * Persistent chrome on a narrow viewport.
 *
 * Deliberately only the fixed 56px top bar (MobileNav.tsx). Below 768px the
 * desktop sidebar — and with it the account menu — is `display: none`, and the
 * page's own content is not persistent chrome: a bottom sheet covering the
 * lower 70vh of scrollable page content is the intended mobile treatment, not
 * a defect. See the findings note at the bottom of this file.
 */
const narrowControls = (page: Page): Control[] => [
  {
    name: "hamburger (Open navigation)",
    locator: page.getByRole("button", { name: /open navigation/i }),
  },
  {
    name: "mobile notification bell",
    locator: page.locator('[data-guide="mobile-notification-bell"]'),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

interface HitResult {
  /** The control (or a descendant of it) is what a click at its centre hits. */
  hit: boolean;
  /** The centre point lies outside the viewport, so elementFromPoint says nothing. */
  offscreen: boolean;
  /** Human-readable "(x,y) -> TAG[role][label]", for the failure message. */
  detail: string;
}

/**
 * Runs `document.elementFromPoint` at the centre of `locator` and reports what
 * a real click there would land on.
 *
 * `el.contains(at)` rather than `at === el`: a button's centre is usually its
 * inner label span or icon, which is still the button being hit.
 */
async function hitTestCentre(locator: Locator): Promise<HitResult> {
  return locator.evaluate((el): HitResult => {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);

    if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) {
      return { hit: false, offscreen: true, detail: `centre (${x},${y}) is outside the viewport` };
    }

    const at = document.elementFromPoint(x, y);
    const describe = (n: Element | null): string => {
      if (!n) return "null";
      const role = n.getAttribute("role");
      const label = n.getAttribute("aria-label") ?? n.getAttribute("aria-labelledby");
      return `${n.tagName}${role ? `[role=${role}]` : ""}${label ? `[label=${label}]` : ""}`;
    };

    return {
      hit: at !== null && (at === el || el.contains(at)),
      offscreen: false,
      detail: `(${x},${y}) -> ${describe(at)}`,
    };
  });
}

async function submitSignInForm(page: Page): Promise<void> {
  await page.getByLabel(/email address/i).fill(FIXTURE_EMAIL);
  await page.getByLabel(/^password/i).fill(FIXTURE_PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

/** Signs in and waits for the tour to auto-start on its first step. */
async function signInAndOpenTour(page: Page): Promise<number> {
  await page.goto("/sign-in");
  await submitSignInForm(page);
  await expect(page).toHaveURL(/\/app\/dashboard/);

  // The tour auto-starts for an account whose stored status is "not_started",
  // which every fresh browser context is. It settles for up to 1.5s first
  // (TourContext.start) before the first coach-mark renders.
  await expect(coachmark(page)).toBeVisible({ timeout: 15_000 });

  const counter = await stepCounter(page).textContent();
  const total = Number(/of (\d+)$/.exec(counter ?? "")?.[1]);
  expect(total, `could not read the step count from "${counter}"`).toBeGreaterThan(0);
  return total;
}

/**
 * Asserts every named control is hit-testable, then names the step in the
 * failure message so a regression points at the step that reintroduced it.
 */
async function expectControlsReachable(
  controls: Control[],
  stepLabel: string,
): Promise<void> {
  for (const control of controls) {
    await expect(
      control.locator,
      `${stepLabel}: expected exactly one "${control.name}"`,
    ).toHaveCount(1);

    const result = await hitTestCentre(control.locator);
    if (result.offscreen && control.mayScrollAway) continue;

    expect(
      result.hit,
      `${stepLabel}: a click at the centre of "${control.name}" does not reach it — ${result.detail}`,
    ).toBe(true);
  }
}

/** Advances the tour one step, or finishes it. Returns false once it has ended. */
async function advance(page: Page): Promise<boolean> {
  const next = coachmark(page).getByRole("button", { name: /^(Next|Finish)$/ });
  const isLast = (await next.textContent())?.trim() === "Finish";
  await next.click();
  if (isLast) {
    await expect(coachmark(page)).toHaveCount(0);
    return false;
  }
  await expect(coachmark(page)).toBeVisible();
  return true;
}

// ── Wide viewport: 1440x900 ──────────────────────────────────────────────────

test.describe("product tour never blocks the page — 1440x900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("every step leaves the persistent chrome hit-testable", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);
    const total = await signInAndOpenTour(page);

    let seen = 0;
    for (let i = 0; i < total + 2; i += 1) {
      const counter = (await stepCounter(page).textContent())?.trim() ?? `step ${i + 1}`;
      await expectControlsReachable(wideControls(page), counter);
      seen += 1;
      if (!(await advance(page))) break;
    }

    // Guards against a silently-truncated tour passing vacuously.
    expect(seen, "walked fewer steps than the counter advertised").toBe(total);
    expect(consoleErrors, consoleErrors.join("\n")).toHaveLength(0);
  });

  test("a control really is clickable during the targetless welcome step", async ({ page }) => {
    await signInAndOpenTour(page);

    // Step 1 (dashboard.welcome) has no `target`, so this exercises the
    // uniform-dim backdrop branch and the centered-card branch together —
    // exactly the combination that used to intercept the click.
    await expect(stepCounter(page)).toHaveText(/^Step 1 of/);

    await page.getByRole("button", { name: /account menu for/i }).click();
    await expect(page.getByRole("menu", { name: /account menu/i })).toBeVisible();

    // …and the tour is still running: the click went to the page, not through
    // some dismiss-on-outside-click path.
    await expect(coachmark(page)).toBeVisible();
  });

  test("the targetless backdrop does not capture pointer events", async ({ page }) => {
    await signInAndOpenTour(page);
    await expect(stepCounter(page)).toHaveText(/^Step 1 of/);

    const backdropPointerEvents = await page.evaluate(() => {
      const dim = Array.from(document.querySelectorAll<HTMLElement>("div[aria-hidden]")).find(
        (el) => {
          const s = getComputedStyle(el);
          return s.position === "fixed" && el.getBoundingClientRect().width === window.innerWidth
            && el.getBoundingClientRect().height === window.innerHeight
            && s.backgroundColor.startsWith("rgba(7, 17, 31");
        },
      );
      return dim ? getComputedStyle(dim).pointerEvents : "no-backdrop-found";
    });

    expect(backdropPointerEvents).toBe("none");
  });

  test("a real modal opened during a step renders ABOVE the coach-mark", async ({ page }) => {
    await signInAndOpenTour(page);
    await expect(stepCounter(page)).toHaveText(/^Step 1 of/);

    // Sign-out's confirmation is the case that caught this: both it and the
    // step-1 coach-mark are centred, so they overlap exactly. The tour is
    // `aria-modal="false"` and explain-only; the confirmation is
    // `aria-modal="true"` and is asking for a decision, so it must win.
    await page.getByRole("button", { name: /account menu for/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    const confirm = page.getByRole("alertdialog", { name: /sign out of lagda/i });
    await expect(confirm).toBeVisible();

    const confirmButton = confirm.getByRole("button", { name: /^sign out$/i });
    const result = await hitTestCentre(confirmButton);
    expect(
      result.hit,
      `the tour covers the confirmation's confirm button — ${result.detail}`,
    ).toBe(true);

    // And it genuinely completes, rather than merely being hit-testable.
    await confirmButton.click();
    await expect(page).toHaveURL(/\/sign-in(\?|$)/);
  });

  test("the centered card is a card, not a full-bleed sheet", async ({ page }) => {
    await signInAndOpenTour(page);
    await expect(stepCounter(page)).toHaveText(/^Step 1 of/);

    const box = await coachmark(page).boundingBox();
    expect(box, "coach-mark has no box").not.toBeNull();
    // CARD_WIDTH is 340. The regression was width === viewport width.
    expect(box!.width).toBeLessThanOrEqual(400);
    expect(box!.width).toBeLessThan(1440 * 0.5);
    // And it is not pinned to the bottom edge, where the sidebar footer lives.
    expect(box!.y + box!.height).toBeLessThan(900);
  });
});

// ── Narrow viewport: 375x667 ─────────────────────────────────────────────────

test.describe("product tour never blocks the page — 375x667", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("every step leaves the fixed top bar hit-testable", async ({ page }) => {
    const total = await signInAndOpenTour(page);

    let seen = 0;
    for (let i = 0; i < total + 2; i += 1) {
      const counter = (await stepCounter(page).textContent())?.trim() ?? `step ${i + 1}`;
      await expectControlsReachable(narrowControls(page), counter);
      seen += 1;
      if (!(await advance(page))) break;
    }
    expect(seen).toBe(total);
  });

  test("the bottom sheet is still the narrow-viewport treatment", async ({ page }) => {
    await signInAndOpenTour(page);

    const box = await coachmark(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(375 * 0.9);
    expect(box!.y + box!.height).toBeGreaterThanOrEqual(666);
    // It must not reach the fixed 56px top bar.
    expect(box!.y).toBeGreaterThan(56);
  });

  test("the hamburger really opens the drawer during a step", async ({ page }) => {
    await signInAndOpenTour(page);

    await page.getByRole("button", { name: /open navigation/i }).click();
    await expect(page.locator("#mobile-nav-drawer")).toBeVisible();
  });
});

// ── Accessibility contract ───────────────────────────────────────────────────

test.describe("product tour accessibility contract", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("is non-modal and does not trap focus", async ({ page }) => {
    await signInAndOpenTour(page);

    await expect(coachmark(page)).toHaveAttribute("aria-modal", "false");

    // No focus trap: Tab out of the card and into the page beneath it. If a
    // trap existed, focus would cycle back inside the dialog.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const escapedCard = await page.evaluate(() => {
      const card = document.querySelector('[role="dialog"][aria-labelledby="tour-coachmark-title"]');
      const active = document.activeElement;
      return !!card && !!active && active !== document.body && !card.contains(active);
    });
    expect(escapedCard, "focus never left the coach-mark — a trap was introduced").toBe(true);
  });

  test("Escape dismisses the tour and returns focus to a real element", async ({ page }) => {
    await signInAndOpenTour(page);

    await page.keyboard.press("Escape");
    await expect(coachmark(page)).toHaveCount(0);

    const focus = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body || a === document.documentElement) return null;
      return { tag: a.tagName, label: a.getAttribute("aria-label"), text: a.textContent?.slice(0, 40) };
    });
    expect(focus, "focus was dropped onto <body> after Escape").not.toBeNull();

    // Dismissal persists: reloading the dashboard does not reopen it.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: /welcome back/i })).toBeVisible();
    await expect(coachmark(page)).toHaveCount(0);
  });
});

// ── Findings recorded here deliberately ──────────────────────────────────────
//
// Narrow-viewport bottom-sheet audit (the question this suite was asked to
// answer): the authenticated app shell has NO bottom tab bar. Mobile chrome is
// a fixed 56px TOP bar plus a left slide-in drawer (MobileNav.tsx), and there
// is no account-menu button below 768px at all — account actions live inside
// the drawer. So the bottom sheet covers page content only, which is the
// intended bottom-sheet treatment, and it blocks no essential control. That is
// what the "fixed top bar hit-testable" spec above pins down.
//
// Two bottom-anchored bars DO exist, both route-scoped and neither reachable
// from a tour step today (every step's route is /app/dashboard, and the
// routeless steps only ever render on whatever page the tour is already on):
//   - SettingsShell.tsx SettingsBottomNav — fixed, z-index 30, shown <=1023px.
//   - EditorMobileChrome.tsx EditorSheet — fixed, Z.drawer (50).
// The coach-mark is Z.tourCoachmark (96), so a future tour chapter routed to
// /app/settings or /app/prepare WOULD cover them. Flagged, not fixed: fixing it
// properly means offsetting the sheet by the page's own bottom inset, and
// nothing requires it yet.
