// Shared Vitest setup (Gap Closure Command 6).
//
// Runs before every test file. Its job is to make the environment deterministic
// and to make it IMPOSSIBLE for a test to accidentally reach the network or leak
// state into the next test.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi, expect } from "vitest";

import { resetAllTestServices } from "./reset-services";

// ── No network, ever ─────────────────────────────────────────────────────────
//
// LAGDA is frontend-only and makes no real network calls, but a future
// regression could introduce one silently. Failing loudly here means a test can
// never pass against a real service, and CI can never depend on one being up.
const failOnNetwork = (api: string) => (...args: unknown[]) => {
  throw new Error(
    `${api} was called during a test. LAGDA is frontend-only: tests must not ` +
      `perform network requests. Called with: ${String(args[0])}`,
  );
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(failOnNetwork("fetch")));
  vi.stubGlobal("XMLHttpRequest", class { constructor() { failOnNetwork("XMLHttpRequest")(); } });
  vi.stubGlobal("WebSocket", class { constructor() { failOnNetwork("WebSocket")(); } });
  vi.stubGlobal("EventSource", class { constructor() { failOnNetwork("EventSource")(); } });

  // sendBeacon and Notification are the two most likely accidental
  // "production behaviour" leaks in a notification feature.
  vi.stubGlobal("navigator", new Proxy(window.navigator, {
    get(target, prop) {
      if (prop === "sendBeacon") return failOnNetwork("navigator.sendBeacon");
      if (prop === "vibrate") return vi.fn(() => true);
      return Reflect.get(target, prop) as unknown;
    },
  }));
  vi.stubGlobal("Notification", undefined);
});

// ── Browser APIs jsdom does not implement ────────────────────────────────────
//
// Stubbed, not faked into returning "supported" — `matchMedia` defaults to
// `matches: false` so reduced-motion tests must opt in explicitly.
beforeEach(() => {
  if (!window.matchMedia) {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }));
  }
  if (!window.ResizeObserver) {
    vi.stubGlobal("ResizeObserver", class {
      observe() {} unobserve() {} disconnect() {}
    });
  }
  if (!window.IntersectionObserver) {
    vi.stubGlobal("IntersectionObserver", class {
      readonly root = null; readonly rootMargin = ""; readonly thresholds = [];
      observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    });
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

// ── Reset between tests ──────────────────────────────────────────────────────
//
// Every mock service in this repository holds module-level mutable state. Without
// this, a test that creates a batch changes the counts a later test asserts, and
// suites pass or fail depending on order.
afterEach(() => {
  cleanup();
  resetAllTestServices();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ── Custom matcher: privacy assertions read better as one call ───────────────
expect.extend({
  toContainNoneOf(received: string, forbidden: readonly string[]) {
    const hits = forbidden.filter((f) => received.includes(f));
    return {
      pass: hits.length === 0,
      message: () =>
        hits.length === 0
          ? `expected value to contain at least one of ${forbidden.join(", ")}`
          : `expected value to contain none of the forbidden strings, but found: ${hits.join(", ")}`,
    };
  },
});

// Type parameters must match Vitest's own `Assertion<T = any>` declaration for
// the interfaces to merge.
declare module "vitest" {
   
  interface Assertion<T = any> {
    toContainNoneOf(forbidden: readonly string[]): T;
  }
  interface AsymmetricMatchersContaining {
    toContainNoneOf(forbidden: readonly string[]): void;
  }
}
