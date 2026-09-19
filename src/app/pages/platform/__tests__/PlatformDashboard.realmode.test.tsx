// The dashboard must never show a real account fabricated numbers.
//
// ── The bug this pins ──────────────────────────────────────────────────────
//
// Reported as: "after onboarding I was redirected to a mock-user-dash, and I
// had to refresh the page so that it render my real data."
//
// Every widget on the demo dashboard — attention items, activity feed, usage
// snapshot, template shortcuts — is built from fixtures with no real-backend
// equivalent. Rendering it unconditionally meant somebody who had just
// finished creating their genuine workspace was shown invented documents and
// invented statistics belonging to nobody, at the exact moment they were
// deciding whether this product was real.
//
// That is worse than an empty screen. An empty screen is understood; numbers
// that are wrong are trusted.
//
// ── Why this test, in this shape ───────────────────────────────────────────
//
// The fix is a single branch, which makes it exactly the kind of thing a
// later refactor removes without noticing: the mock component still exists
// and is still exported, so nothing else would fail if the gate went away.
//
// So this asserts the OUTCOME rather than the branch — that in real-backend
// mode no fixture string reaches the DOM — and, in the other direction, that
// the demo build still renders its demo. A test that only checked real mode
// would pass just as well if the dashboard rendered nothing at all in either.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

/**
 * Strings that only ever come from the demo fixtures.
 *
 * Taken from the mock dashboard's own copy rather than invented here — if
 * the demo's wording changes these stop matching, and the test starts
 * passing vacuously. That is the reason for the `mockDemoRenders` case
 * below, which fails loudly if these stop being findable at all.
 */
const FIXTURE_MARKERS = [
  /mock data only/i,
  /frontend demonstration/i,
];

/**
 * `withProvider` only for the demo case.
 *
 * The demo dashboard reads `usePlatform()` and throws without a provider.
 * The real-mode one deliberately does not touch it at all — it has no
 * account data to show — so wrapping it would start a real session bootstrap
 * (a `/me` fetch) inside a test that is not about sessions.
 */
async function renderDashboard({ withProvider = false } = {}) {
  // Imported AFTER the flag is stubbed: the module reads it at load time.
  const { PlatformDashboard } = await import("../PlatformDashboard");
  const tree = <PlatformDashboard />;

  if (!withProvider) {
    return render(<MemoryRouter>{tree}</MemoryRouter>);
  }

  // The demo dashboard sits inside the app shell in real use, so it assumes
  // the shell's providers. Mounting the two it actually reads is enough; the
  // point here is only that its fixture copy is still reachable.
  const { PlatformProvider } = await import("../../../context/PlatformContext");
  const { NotificationCenterProvider } =
    await import("../../../context/NotificationCenterContext");
  return render(
    <MemoryRouter>
      <PlatformProvider>
        <NotificationCenterProvider>{tree}</NotificationCenterProvider>
      </PlatformProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("../../../services/backend-flag");
});

describe("the dashboard in real-backend mode", () => {
  beforeEach(() => {
    vi.doMock("../../../services/backend-flag", () => ({
      API_BASE_URL: "/api",
      USE_REAL_BACKEND: true,
    }));
  });

  it("shows no fabricated content to a real account", async () => {
    await renderDashboard();

    const text = document.body.textContent ?? "";
    for (const marker of FIXTURE_MARKERS) {
      expect(marker.test(text), `fixture text leaked into real mode: ${String(marker)}`)
        .toBe(false);
    }
  });

  it("says plainly that the overview is not built yet", async () => {
    // The honest alternative to invented numbers. Asserted because "shows
    // nothing" would also satisfy the test above, and a blank dashboard
    // reads as broken rather than as unfinished.
    await renderDashboard();

    expect(await screen.findByText(/still being built out/i)).toBeTruthy();
  });

  it("points somewhere that actually works", async () => {
    // The part of the product that IS wired to a real backend. An empty
    // state that only apologises leaves someone with nothing to do.
    await renderDashboard();

    const link = screen.getByRole("link", { name: /prepare document/i });
    expect(link.getAttribute("href")).toBe("/app/prepare");
  });
});

describe("the dashboard in demo mode", () => {
  beforeEach(() => {
    vi.doMock("../../../services/backend-flag", () => ({
      API_BASE_URL: null,
      USE_REAL_BACKEND: false,
    }));
  });

  it("still renders the demo, and still labels it as one", async () => {
    // The control. Without this, the real-mode assertions above would pass
    // even if the dashboard had been reduced to an empty state everywhere —
    // and it would also pass if the fixture markers had been renamed, which
    // would silently blind the real-mode test.
    await renderDashboard({ withProvider: true });

    const text = document.body.textContent ?? "";
    expect(FIXTURE_MARKERS.some(marker => marker.test(text))).toBe(true);
  });
});
