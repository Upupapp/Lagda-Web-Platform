// Viewport width, as a React value.
//
// ── Why a hook and not a media query ───────────────────────────────────────
//
// These pages style with inline objects, not classes, so `@media` has nothing
// to attach to. The choices that matter here are structural rather than
// cosmetic — a modal becomes a bottom sheet, a toolbar becomes a stack, a
// table becomes cards — and those need a value in JavaScript, not a rule in
// CSS.
//
// One listener per mount, on `matchMedia` rather than `resize`: a resize
// handler fires continuously through a drag and re-renders the tree on every
// pixel, while a media query fires only when a threshold is actually crossed.
//
// Rendered for the SERVER-SIDE / first paint as the wide layout, because a
// phone correcting itself on mount is a smaller jolt than a desktop briefly
// rendering as a phone.

import { useEffect, useState } from "react";

/** Phone. Below this, side-by-side layouts stop fitting. */
export const NARROW_MAX = 767;
/** Tablet and small laptop — fits two columns, not three. */
export const MEDIUM_MAX = 1023;

function matches(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
}

function useMediaQuery(query: string): boolean {
  const [active, setActive] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const list = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => { setActive(e.matches); };

    // Re-read on mount: the query may have changed between the initial render
    // and the effect, and on the server the initial value was a guess.
    setActive(list.matches);
    list.addEventListener("change", onChange);
    return () => { list.removeEventListener("change", onChange); };
  }, [query]);

  return active;
}

export interface Viewport {
  /** Phone. Stack everything, full-bleed panels, bottom sheets. */
  isNarrow: boolean;
  /** Tablet. Two columns where desktop has three; toolbars still fit. */
  isMedium: boolean;
}

export function useViewport(): Viewport {
  const isNarrow = useMediaQuery(`(max-width: ${String(NARROW_MAX)}px)`);
  const isMedium = useMediaQuery(
    `(min-width: ${String(NARROW_MAX + 1)}px) and (max-width: ${String(MEDIUM_MAX)}px)`,
  );
  return { isNarrow, isMedium };
}
