// Critical browser flows, run against the production build served by
// playwright.config.ts (`vite preview`), launch profile `enterprise-preview`.
//
// Scope: the six paths that, if broken, make the product unusable — sign in,
// global search, the command palette, an invalid deep link, a gated report's
// direct-load/reload behaviour, and sign out.
//
// Every test asserts a rendered outcome, not just a URL change: a route can
// change while the lazily-loaded chunk behind it renders nothing, and a URL-only
// assertion would pass through that.
//
// No real credentials exist in this application. The fixture identity is
// imported from tests/support/app.ts rather than restated here, so there is one
// definition of the demonstration account in the browser suite.

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  FIXTURE_EMAIL,
  FIXTURE_PASSWORD,
  failOnConsoleErrors,
  expectNoHorizontalScroll,
  expectSingleH1,
  waitForLoaded,
} from "../support/app";

// ── Locators for the authenticated shell ─────────────────────────────────────

const PLATFORM_HEADER = "header[aria-label='Platform header']";

/** The dashboard's own content heading — present only once the shell has mounted. */
const dashboardHeading = (page: Page) =>
  page.getByRole("heading", { level: 1, name: /welcome back/i });

const signInHeading = (page: Page) =>
  page.getByRole("heading", { level: 1, name: /sign in to lagda/i });

/**
 * Fills and submits the real sign-in form.
 *
 * NOT `signIn()` from tests/support/app.ts. That helper locates the password
 * field with `getByLabel(/^password$/i)`, but the field's label renders a
 * required marker — `Password <span aria-hidden>*</span>` — and Playwright's
 * label matching uses the label's text content without excluding aria-hidden
 * descendants, so the label text is "Password *" and the anchored pattern
 * matches nothing. Verified against the built app: that locator resolves to 0
 * elements and `signIn()` times out. Reported rather than edited, because
 * tests/support/app.ts is shared with the other browser specs.
 *
 * `/^password/i` (unanchored at the end) matches the field and still excludes
 * the "Show password" toggle button beside it.
 */
async function signInThroughForm(page: Page, returnTo?: string): Promise<void> {
  await page.goto(returnTo ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}` : "/sign-in");
  await submitSignInForm(page);
}

/** Submits the sign-in form that is already on screen. */
async function submitSignInForm(page: Page): Promise<void> {
  await page.getByLabel(/email address/i).fill(FIXTURE_EMAIL);
  await page.getByLabel(/^password/i).fill(FIXTURE_PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

test.describe("critical flows", () => {
  // ── 1. Sign in ─────────────────────────────────────────────────────────────

  test("signs in through the real form and lands on a rendered dashboard", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    await signInThroughForm(page);

    await expect(page).toHaveURL(/\/app\/dashboard$/);
    // The dashboard chunk actually rendered — not just a route change.
    await expect(dashboardHeading(page)).toBeVisible();
    await waitForLoaded(page);

    // The authenticated shell is mounted around it.
    await expect(page.locator(PLATFORM_HEADER)).toBeVisible();
    await expect(page.getByRole("button", { name: /open search/i })).toBeVisible();

    // Exactly one level-1 heading inside the content region.
    //
    // Deliberately scoped to <main> instead of using expectSingleH1(): the
    // platform shell renders a SECOND, document-level <h1> in its sticky header
    // for the breadcrumb title, so every signed-in page carries at least two
    // <h1> elements. That is a real heading-structure defect (reported), and
    // asserting the current document-wide count here would lock it in.
    await expect(page.locator("main h1")).toHaveCount(1);

    await expectNoHorizontalScroll(page);
    expect(consoleErrors, `console errors at ${page.url()}`).toEqual([]);
  });

  // ── 2. Global search ───────────────────────────────────────────────────────

  test("global search surfaces a Bulk Send batch and navigates to that batch", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    await signInThroughForm(page);
    await expect(dashboardHeading(page)).toBeVisible();

    await page.getByRole("button", { name: /open search/i }).click();
    const searchBox = page.getByRole("combobox", { name: /search or navigate/i });
    await expect(searchBox).toBeFocused();
    await searchBox.fill("bulk");

    // The Bulk Send preparation search provider is registered and returns rows.
    // Before Gap Closure 5 the capability declared `searchVisibility: true` with
    // no provider behind it, so this query returned nothing at all.
    const result = page.getByRole("option", { name: /^Bulk Send — / }).first();
    await expect(result).toBeVisible();

    // Preparation rows are published into the Documents group, not a group of
    // their own — a regrouping would change where users look for them.
    await expect(page.getByRole("listbox", { name: "Documents results" })).toBeVisible();

    // Capture the batch name so the destination can be checked against the row
    // that was clicked, rather than against a hard-coded fixture id.
    const [titleLine = ""] = (await result.innerText()).split("\n");
    const batchName = titleLine.replace(/^Bulk Send — /, "").trim();
    expect(batchName, "search result carried no batch name").not.toBe("");

    await result.click();

    await expect(page).toHaveURL(/\/app\/bulk-send\/[A-Za-z0-9_-]+$/);
    // The destination is the batch that was clicked, and it rendered.
    await expect(page.getByRole("heading", { name: batchName }).first()).toBeVisible();
    // The palette closed rather than being left over the new route.
    await expect(page.getByRole("dialog", { name: /command palette/i })).toHaveCount(0);

    expect(consoleErrors, `console errors at ${page.url()}`).toEqual([]);
  });

  // ── 3. Command palette ─────────────────────────────────────────────────────

  test("command palette opens with Ctrl+K and runs Open Bulk Send", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    await signInThroughForm(page);
    await expect(dashboardHeading(page)).toBeVisible();

    // Ctrl+K is registered by PlatformHeader on `document`; the header's search
    // button opens the same dialog. Using the shortcut covers both the binding
    // and the dialog.
    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog", { name: /command palette/i });
    await expect(palette).toBeVisible();

    // Exactly one command matches: "Open Saved Bulk Send Configurations" starts
    // with "Open Saved", so an ambiguous match here means a duplicate command
    // was registered.
    const openBulkSend = page.getByRole("option", { name: /^Open Bulk Send/ });
    await expect(openBulkSend).toHaveCount(1);
    await openBulkSend.click();

    await expect(page).toHaveURL(/\/app\/bulk-send$/);
    await expect(palette).toHaveCount(0);
    // The overview rendered its primary action, so the route is live, not blank.
    await expect(page.getByRole("link", { name: /new batch/i })).toBeVisible();

    expect(consoleErrors, `console errors at ${page.url()}`).toEqual([]);
  });

  // ── 4. Deep-link safety ────────────────────────────────────────────────────

  test("an unknown Bulk Send batch deep link renders a safe, recoverable state", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    await signInThroughForm(page, "/app/bulk-send/not-a-real-batch");

    await expect(page).toHaveURL(/\/app\/bulk-send\/not-a-real-batch$/);

    // Not blank and not a crash: the shell is intact and the page states why.
    await expect(page.locator(PLATFORM_HEADER)).toBeVisible();
    await expect(page.getByRole("heading", { name: /batch not found/i })).toBeVisible();
    await expect(page.getByText(/not available in this Workspace/i)).toBeVisible();

    // The safe state contributes no <h1> of its own, so the document-wide check
    // holds here — this is the one signed-in route where it does.
    await expectSingleH1(page);

    // It is a recovery path, not a dead end.
    await page.getByRole("link", { name: /return to bulk send/i }).click();
    await expect(page).toHaveURL(/\/app\/bulk-send$/);
    await expect(page.getByRole("link", { name: /new batch/i })).toBeVisible();

    expect(consoleErrors, `console errors at ${page.url()}`).toEqual([]);
  });

  // ── 5. Direct load and reload of a gated report ────────────────────────────

  test("a direct load of /app/reports/preparation is gated, honours returnTo, and re-gates on reload", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    // The session is in-memory only, so a cold load of any /app route is gated.
    // What matters is that the requested path survives the bounce and that only
    // an internal path can survive it.
    await page.goto("/app/reports/preparation");
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp%2Freports%2Fpreparation$/);
    await expect(signInHeading(page)).toBeVisible();

    await submitSignInForm(page);

    // returnTo was honoured and the report rendered.
    await expect(page).toHaveURL(/\/app\/reports\/preparation$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Bulk Send Preparation" }),
    ).toBeVisible();
    await waitForLoaded(page);
    await expect(page.locator("main h1")).toHaveCount(1);

    // A reload discards the in-memory session by design. The requirement is that
    // it lands back on the same gate with the path still preserved — never a
    // blank shell, a crash, or a silent drop to the dashboard.
    await page.reload();
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp%2Freports%2Fpreparation$/);
    await expect(signInHeading(page)).toBeVisible();
    await expect(page.locator(PLATFORM_HEADER)).toHaveCount(0);

    expect(consoleErrors, `console errors at ${page.url()}`).toEqual([]);
  });

  // ── 6. Sign out ────────────────────────────────────────────────────────────

  test("signing out returns to a public route and re-gates /app/dashboard", async ({ page }) => {
    const consoleErrors = failOnConsoleErrors(page);

    await signInThroughForm(page);
    await expect(dashboardHeading(page)).toBeVisible();

    await page.getByRole("button", { name: /account menu for/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    // Landed on a public route with the public form rendered, and the
    // authenticated shell is gone rather than merely hidden.
    await expect(page).toHaveURL(/\/sign-in(\?|$)/);
    await expect(signInHeading(page)).toBeVisible();
    await expect(page.locator(PLATFORM_HEADER)).toHaveCount(0);

    // The dashboard is not reachable again without signing in.
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp%2Fdashboard$/);
    await expect(dashboardHeading(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();

    expect(consoleErrors, `console errors at ${page.url()}`).toEqual([]);
  });
});
