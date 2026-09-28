// A `matchMedia` that answers min-/max-width queries against a chosen width,
// for tests of components that switch layout at a breakpoint.

import { vi } from "vitest";

export function stubViewport(width: number): void {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  vi.stubGlobal("matchMedia", (query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    const min = /min-width:\s*(\d+)px/.exec(query);
    const matches = (!max || width <= Number(max[1])) && (!min || width >= Number(min[1]))
      && (max !== null || min !== null);
    return {
      matches, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    };
  });
}
