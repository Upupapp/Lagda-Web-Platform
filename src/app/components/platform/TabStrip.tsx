// A horizontally scrolling tab bar.
//
// Twenty-six surfaces in this codebase render a row of tabs inside a div with
// `overflowX: "auto"`. That makes them scroll, and stops there — which leaves
// three problems that only show up on a narrow screen:
//
//   1. Nothing indicates that more tabs exist. The row simply ends at the
//      viewport edge and looks complete.
//   2. The active tab is not scrolled into view. Open a document straight onto
//      its Settings tab on a phone and the strip shows "Overview, Workflow…"
//      with the tab you are actually on off-screen, so the interface cannot
//      answer "where am I".
//   3. Tab hit areas are around 40px tall. LAGDA's accessibility rules require
//      44px, and these are the primary means of moving around an object.
//
// This component owns those three concerns and nothing else. It deliberately
// does not dictate what a tab looks like or whether it is a Link, a button or
// an anchor — the surfaces differ, and forcing one item shape on all of them
// would be a much larger and riskier change than the problem warrants.

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

export interface TabStripProps {
  /** Accessible name for the tab row, e.g. "Transaction sections". */
  label: string;
  /**
   * Changes whenever the selected tab changes — usually the current pathname or
   * the active view key. Used to re-run the scroll-into-view, since the active
   * child is found in the DOM rather than passed as a prop.
   */
  activeKey?: string;
  /**
   * `"navigation"` (default) for strips of links that change the URL, wrapped in
   * a <nav>. `"tablist"` for strips of buttons that switch a view in place, in
   * which case the scroller itself takes the role — a tablist must be the direct
   * parent of its tabs, so it cannot be nested inside a <nav> wrapper.
   * `"scroller"` renders the scrolling element ONLY, for callers that already
   * own their landmark — the public sub-navs put sticky positioning and the
   * page background on their <nav> and constrain width on the scroller inside
   * it, so wrapping them in a second <nav> would both duplicate the landmark
   * and break the layout.
   */
  as?: "navigation" | "tablist" | "scroller";
  children: ReactNode;
  className?: string;
  /** Merged onto the scrolling element. For width and padding constraints. */
  style?: CSSProperties;
}

// Both ARIA conventions in use here mark the active item, but differently:
// links carry `aria-current="page"`, tabs carry `aria-selected="true"`.
const ACTIVE_SELECTOR = '[aria-current]:not([aria-current="false"]), [aria-selected="true"]';

export function TabStrip({
  label,
  activeKey,
  as = "navigation",
  children,
  className,
  style,
}: TabStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Bring the selected tab into view. The active child is found from the ARIA
  // state that already has to be correct, so no surface has to pass an index.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const active = scroller.querySelector<HTMLElement>(ACTIVE_SELECTOR);
    if (!active) return;

    // Only scroll when the tab is genuinely out of view. Calling this
    // unconditionally would yank a strip that already shows the active tab, and
    // on a wide screen that is every strip.
    const strip = scroller.getBoundingClientRect();
    const tab = active.getBoundingClientRect();
    if (tab.left >= strip.left && tab.right <= strip.right) return;

    active.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activeKey]);

  const cls = `lagda-tabstrip${className ? ` ${className}` : ""}`;

  if (as === "tablist") {
    return (
      <div ref={scrollerRef} role="tablist" aria-label={label} className={cls} style={style}>
        {children}
      </div>
    );
  }

  if (as === "scroller") {
    // The caller owns the landmark, so `label` is not rendered here — it would
    // be a second, conflicting accessible name for the same navigation.
    return (
      <div ref={scrollerRef} className={cls} style={style}>
        {children}
      </div>
    );
  }

  return (
    <nav aria-label={label} className={className}>
      <div ref={scrollerRef} className="lagda-tabstrip" style={style}>
        {children}
      </div>
    </nav>
  );
}
