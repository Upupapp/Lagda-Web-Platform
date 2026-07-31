// Playwright configuration (Gap Closure Command 6).
//
// ONE browser-test framework. Cypress is deliberately not added.
//
// Runs against the PRODUCTION BUILD via `vite preview`, not the dev server, so
// browser tests exercise the same bundle, the same capability gating, and the
// same lazy-route splitting that ships. A dev-server run would test a different
// artifact.
//
// The launch profile is pinned to `enterprise-preview` because that is the only
// profile where the gated features under test (Bulk Send, Collaboration,
// Workflow Automation) are reachable. Tests that assert the LAUNCH gate — that
// these features are absent — build the other profile explicitly.

import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",

  fullyParallel: true,
  forbidOnly: IS_CI,
  // Retries in CI only. Locally a flaky test should fail loudly and get fixed,
  // not be papered over by a retry.
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 2 : undefined,

  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: IS_CI
    ? [["html", { open: "never" }], ["list"], ["junit", { outputFile: "test-results/playwright-junit.xml" }]]
    : [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    // Traces and screenshots only on failure — they are the failure artifacts CI
    // uploads. Video is off by default because it is large and rarely adds
    // anything a trace does not already show.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",

    // Deterministic locale and timezone. LAGDA formats dates as en-PH /
    // Asia/Manila; without pinning these a date assertion passes on one machine
    // and fails on another.
    locale: "en-PH",
    timezoneId: "Asia/Manila",

    // No real credentials, no stored session, no recipient links. Every spec
    // signs in through the demonstration UI with fixture data.
    storageState: undefined,
  },

  projects: [
    // ── Primary critical-flow suite ─────────────────────────────────────────
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: ["**/responsive/**", "**/reduced-motion/**"],
    },

    // ── Accessibility (axe) ─────────────────────────────────────────────────
    {
      name: "accessibility",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testMatch: ["**/accessibility/**/*.spec.ts"],
    },

    // ── Responsive ──────────────────────────────────────────────────────────
    // Four representative widths, not an exhaustive matrix: the narrowest
    // supported phone, a common phone, a large phone, and tablet portrait.
    {
      name: "mobile-320",
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 720 }, isMobile: false, hasTouch: true },
      testMatch: ["**/responsive/**/*.spec.ts"],
    },
    {
      name: "mobile-390",
      use: { ...devices["iPhone 13"] },
      testMatch: ["**/responsive/**/*.spec.ts"],
    },
    {
      name: "tablet-portrait",
      use: { ...devices["iPad (gen 7)"] },
      testMatch: ["**/responsive/**/*.spec.ts"],
    },

    // ── Reduced motion ──────────────────────────────────────────────────────
    {
      name: "reduced-motion",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Applied at the browser-context level so it reaches
        // `prefers-reduced-motion` in CSS, which is what the app actually reads.
        contextOptions: { reducedMotion: "reduce" },
      },
      testMatch: ["**/reduced-motion/**/*.spec.ts"],
    },

    // ── Enlarged layout (200% zoom equivalent) ──────────────────────────────
    // Playwright cannot set browser zoom, so this approximates it the way WCAG
    // 1.4.10 reflow does: a viewport at 50% of the logical width with a matching
    // device scale factor. It is an approximation, and the manual 200% zoom
    // review in docs/manual-quality-validation-checklist.md remains required.
    {
      name: "zoom-200",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 720, height: 450 },
        deviceScaleFactor: 2,
      },
      testMatch: ["**/responsive/zoom-*.spec.ts"],
    },
  ],

  // Build once, then serve the built artifact.
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 180_000,
    env: { VITE_LAUNCH_PROFILE: "enterprise-preview" },
    stdout: "ignore",
    stderr: "pipe",
  },
});
