// Shared Playwright helpers (Gap Closure Command 6).
//
// No real credentials exist in this application. `ana.reyes@example.com` is a
// fixture email the mock auth service maps to the "standard" sign-in scenario;
// the password is never checked and is never a real secret.

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Fixture identity. Not a credential — the mock service ignores the password. */
export const FIXTURE_EMAIL = "ana.reyes@example.com";
export const FIXTURE_PASSWORD = "demonstration-only";

/**
 * Signs in through the real UI and waits for the platform shell.
 *
 * Deliberately goes through the form rather than seeding storage: the sign-in
 * path is itself a critical flow, and seeding would skip the redirect handling
 * that several tests depend on.
 */
export async function signIn(page: Page, returnTo?: string): Promise<void> {
  const target = returnTo
    ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}`
    : "/sign-in";
  await page.goto(target);

  await page.getByLabel(/email/i).fill(FIXTURE_EMAIL);
  // Anchored at the start, NOT `/^password$/i`. The rendered <label> text is
  // "Password *" — the required-field asterisk lives inside the label element,
  // so an end-anchored pattern matches nothing and the fill times out. Anchoring
  // only at the start still excludes the "Show password" toggle button, which
  // carries a matching aria-label.
  await page.getByLabel(/^password/i).fill(FIXTURE_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(new RegExp(escapeRegExp(returnTo ?? "/app/dashboard")));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fails the test if the page produced a console error or an unhandled rejection.
 *
 * Attach at the top of a spec. Filters out the two categories of noise that are
 * not defects: React DevTools' download suggestion, and Vite's HMR chatter.
 */
export function failOnConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/React DevTools|\[vite\]/i.test(text)) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(`Unhandled: ${err.message}`));
  return errors;
}

/**
 * Asserts that the page does not scroll horizontally.
 *
 * WCAG 1.4.10 reflow: content must not require two-dimensional scrolling. A
 * 1px tolerance absorbs sub-pixel rounding on scaled viewports.
 */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow, "page scrolls horizontally").toBeLessThanOrEqual(1);
}

/** Asserts exactly one level-1 heading, the anchor for assistive navigation. */
export async function expectSingleH1(page: Page): Promise<void> {
  await expect(page.locator("h1")).toHaveCount(1);
}

/** Waits until every visible loading affordance has cleared. */
export async function waitForLoaded(page: Page): Promise<void> {
  await expect(page.getByRole("status", { name: /loading/i })).toHaveCount(0, { timeout: 15_000 });
}
