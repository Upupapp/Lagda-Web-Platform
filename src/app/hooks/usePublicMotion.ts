// Motion on the public site (the rules are in styles/public-shell.css).
//
//   usePublicMotion()      marks <html data-motion> while a public shell is on
//                          screen, for the opening of each page (the main
//                          heading rising, the waves easing in)
//   usePublicReveal(key)   makes each section below the fold rise into view as
//                          the page scrolls; its cards and list items follow
//                          one another
//
// Safe by design:
//   · Nothing is ever hidden unless this script ran: the "pending" state is a
//     mark this code adds, never the page's default.
//   · A section already on screen (the hero, a short page) is never touched.
//   · No motion for visitors who ask for less (prefers-reduced-motion), and
//     none for automated browsers (navigator.webdriver): every test, audit and
//     capture sees the still page.
//   · Keyboard focus moving into a waiting section shows it at once, and so
//     does printing.

import { useEffect, useLayoutEffect } from "react";

/** Whether this visitor gets motion at all. */
export function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.webdriver) return false;
  return !(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** <html data-motion> while the calling shell is mounted, when motion is allowed. */
export function usePublicMotion(): void {
  useLayoutEffect(() => {
    if (!motionAllowed()) return;
    const root = document.documentElement;
    root.setAttribute("data-motion", "");
    return () => { root.removeAttribute("data-motion"); };
  }, []);
}

/** Groups whose children arrive one after another: card grids and lists. */
const GROUPS = '[style*="display: grid"], [class*="grid"], ul, ol';
/** How far apart the arrivals in one group can get (× 70 ms). */
const MAX_STEP = 7;

/**
 * Sections rise into view as the page scrolls. `key` re-runs it for a new page
 * (the route); `rootSelector` is the container whose sections move.
 */
export function usePublicReveal(key: string, rootSelector = "#main-content"): void {
  useEffect(() => {
    if (!motionAllowed() || typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return;
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (root === null) return;

    const seen = new WeakSet<Element>();
    const show = (section: HTMLElement) => {
      if (section.dataset.reveal === "pending") section.dataset.reveal = "shown";
    };

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target as HTMLElement);
        io.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

    // A section is set up once, when it first appears: pages load in pieces
    // (lazy routes, data that arrives later), so new sections are picked up
    // as they are added.
    const scan = () => {
      const fold = window.innerHeight * 0.94;
      for (const section of Array.from(root.querySelectorAll<HTMLElement>("section"))) {
        if (seen.has(section)) continue;
        seen.add(section);
        // Only the outermost sections move; a section inside one moves with it.
        const outer = section.parentElement?.closest("section");
        if (outer !== null && outer !== undefined && root.contains(outer)) continue;
        // On screen already, or not laid out (a closed panel): left as it is.
        const box = section.getBoundingClientRect();
        if (box.height === 0 || box.top < fold) continue;

        for (const group of Array.from(section.querySelectorAll<HTMLElement>(GROUPS))) {
          let step = 0;
          for (const item of Array.from(group.children) as HTMLElement[]) {
            // An item inside an item already moving moves with it.
            if (item.parentElement?.closest("[data-reveal-item]") !== null) continue;
            item.dataset.revealItem = "";
            item.style.setProperty("--reveal-i", String(Math.min(step, MAX_STEP)));
            step += 1;
          }
        }
        section.dataset.reveal = "pending";
        io.observe(section);
      }
    };

    let frame = 0;
    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => { frame = 0; scan(); });
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });

    // Keyboard focus never lands in an invisible section, and paper gets it all.
    const onFocus = (event: FocusEvent) => {
      const section = (event.target as Element | null)?.closest?.('[data-reveal="pending"]');
      if (section instanceof HTMLElement) show(section);
    };
    const onPrint = () => {
      for (const section of Array.from(root.querySelectorAll<HTMLElement>('[data-reveal="pending"]'))) show(section);
    };
    root.addEventListener("focusin", onFocus);
    window.addEventListener("beforeprint", onPrint);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      mo.disconnect();
      io.disconnect();
      root.removeEventListener("focusin", onFocus);
      window.removeEventListener("beforeprint", onPrint);
    };
  }, [key, rootSelector]);
}
