// Banner-style section tabs for the public marketing sub-navigations
// (eSignature, Features, Solutions, Pricing, Security, Resources, eNotary).
//
// Every public section used to hand-roll the same strip of text links with a
// 2px underline. This component is the one shared implementation:
//
//   • Each tab is a small "banner card": an icon tile plus the label.
//   • The active state is a tinted card with an accent bar, drawn by ONE
//     indicator element that slides between tabs. Section pages are separate
//     lazily loaded routes, so the strip remounts on every navigation; the last
//     indicator position is remembered per strip so the new mount can start
//     where the old one ended and glide to the new tab.
//   • Wide screens get a centred row, tablets a compact row, phones a
//     horizontally scrolling, snap-aligned strip with edge fades that only
//     appear when there is more strip in that direction. The active tab is
//     scrolled into view inside the strip (never the page).
//   • All motion is ≤250ms and switched off under prefers-reduced-motion.
//
// Routing is untouched: every tab is a <Link> carrying aria-current="page"
// when active, exactly as before.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Z } from "../../utils/z-index";

export interface SectionTab {
  /** Stable key — usually the path. */
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  active: boolean;
  /** Optional group heading; a heading is rendered when the group changes. */
  group?: string;
}

export interface SectionTabsProps {
  /** Accessible name of the <nav> landmark, e.g. "eSignature pages". */
  label: string;
  tabs: SectionTab[];
  /** Accent family. eNotary alone uses its burgundy accent. */
  tone?: "azure" | "enotary";
  /** Optional colour dot per group heading (Solutions). */
  groupColors?: Record<string, string>;
}

type Indicator = { x: number; w: number; animate: boolean };

// Last indicator geometry per strip, so a remounted strip can slide from the
// previous tab instead of appearing already in place.
const lastIndicator = new Map<string, { x: number; w: number }>();

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function SectionTabs({ label, tabs, tone = "azure", groupColors }: SectionTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [fade, setFade] = useState({ l: false, r: false });

  const activeKey = tabs.find((t) => t.active)?.key ?? "";

  const measureActive = useCallback((): { x: number; w: number } | null => {
    const list = listRef.current;
    if (!list) return null;
    const el = list.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!el) return null;
    return { x: el.offsetLeft, w: el.offsetWidth };
  }, []);

  const updateFades = useCallback(() => {
    const s = scrollerRef.current;
    if (!s) return;
    const l = s.scrollLeft > 2;
    const r = s.scrollLeft + s.clientWidth < s.scrollWidth - 2;
    setFade((prev) => (prev.l === l && prev.r === r ? prev : { l, r }));
  }, []);

  // Place (and, where possible, slide) the indicator whenever the active tab
  // changes. Runs before paint so the indicator never flashes at 0,0.
  useLayoutEffect(() => {
    const target = measureActive();
    if (!target) {
      setIndicator(null);
      return;
    }
    const prev = lastIndicator.get(label);
    lastIndicator.set(label, target);
    const moved = prev && (prev.x !== target.x || prev.w !== target.w);
    if (moved && !prefersReducedMotion()) {
      setIndicator({ ...prev, animate: false });
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setIndicator({ ...target, animate: true }));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setIndicator({ ...target, animate: false });
    return undefined;
  }, [activeKey, label, measureActive]);

  // Keep the indicator glued to its tab when fonts load or the viewport
  // changes size, and keep the edge fades honest.
  useEffect(() => {
    const onResize = () => {
      const t = measureActive();
      const known = lastIndicator.get(label);
      // Only re-place when the geometry really changed — the observer's first
      // callback must not cut short the slide started above.
      if (t && (!known || known.x !== t.x || known.w !== t.w)) {
        lastIndicator.set(label, t);
        setIndicator({ ...t, animate: false });
      }
      updateFades();
    };
    onResize();
    window.addEventListener("resize", onResize);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && listRef.current) {
      ro = new ResizeObserver(onResize);
      ro.observe(listRef.current);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [label, measureActive, updateFades]);

  // Bring the active tab into view inside the strip (horizontal only — the
  // page itself is never scrolled).
  useEffect(() => {
    const s = scrollerRef.current;
    const list = listRef.current;
    if (!s || !list) return;
    const el = list.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!el) return;
    const sr = s.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (er.left >= sr.left + 8 && er.right <= sr.right - 8) return;
    const left = s.scrollLeft + (er.left - sr.left) - (sr.width - er.width) / 2;
    if (typeof s.scrollTo === "function") {
      s.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    } else {
      s.scrollLeft = left;
    }
  }, [activeKey]);

  // Pointer users on wide screens get nudge buttons when the strip overflows
  // (a mouse wheel does not scroll sideways). Keyboard users never need them:
  // tabbing to a link scrolls it into view, so the buttons are skipped (-1).
  const nudge = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft + dir * Math.max(160, el.clientWidth * 0.6);
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    } else {
      el.scrollLeft = left;
    }
  };

  // Tracks the previous tab's group while mapping, to emit one heading per group.
  let lastGroup: string | undefined;

  return (
    <nav
      aria-label={label}
      className="lsn"
      data-tone={tone}
      style={{ position: "sticky", top: 72, zIndex: Z.sticky }}
    >
      <div className="lsn-frame">
        <div
          ref={scrollerRef}
          className="lsn-scroller"
          onScroll={updateFades}
          data-testid="section-tabs-scroller"
        >
          <ul ref={listRef} role="list" className="lsn-list">
            {indicator && (
              <li
                aria-hidden="true"
                className="lsn-indicator"
                data-animate={indicator.animate ? "true" : "false"}
                style={{ width: indicator.w, transform: `translateX(${indicator.x}px)` }}
              />
            )}
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const showGroup = tab.group !== undefined && tab.group !== lastGroup;
              lastGroup = tab.group;
              return [
                showGroup ? (
                  <li key={`group-${tab.group}`} className="lsn-group">
                    <span
                      aria-hidden="true"
                      className="lsn-group-dot"
                      style={{ background: groupColors?.[tab.group as string] ?? "#94A3B8" }}
                    />
                    <span className="lsn-group-label">{tab.group}</span>
                  </li>
                ) : null,
                <li key={tab.key} className="lsn-item">
                  <Link
                    to={tab.to}
                    aria-current={tab.active ? "page" : undefined}
                    className="lsn-tab"
                    data-active={tab.active ? "true" : "false"}
                  >
                    <span className="lsn-ico" aria-hidden="true">
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="lsn-label">{tab.label}</span>
                  </Link>
                </li>,
              ];
            })}
          </ul>
        </div>
        <span className="lsn-fade lsn-fade-l" data-show={fade.l ? "true" : "false"}>
          {fade.l && (
            <button type="button" tabIndex={-1} className="lsn-nudge" aria-label="Scroll tabs left" onClick={() => nudge(-1)}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          )}
        </span>
        <span className="lsn-fade lsn-fade-r" data-show={fade.r ? "true" : "false"}>
          {fade.r && (
            <button type="button" tabIndex={-1} className="lsn-nudge" aria-label="Scroll tabs right" onClick={() => nudge(1)}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
      <style>{SECTION_TABS_CSS}</style>
    </nav>
  );
}

const SECTION_TABS_CSS = `
.lsn {
  --lsn-accent: #0078D4;
  --lsn-accent-strong: #0063B1;
  --lsn-tint: rgba(0,120,212,0.07);
  --lsn-tint-strong: rgba(0,120,212,0.12);
  --lsn-ring: rgba(0,120,212,0.24);
  --lsn-active-text: #07111F;
  background: rgba(255,255,255,0.96);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  backdrop-filter: blur(12px) saturate(160%);
  border-bottom: 1px solid rgba(7,17,31,0.08);
  box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 6px 18px -14px rgba(7,17,31,0.28);
  font-family: 'Geist', sans-serif;
}
.lsn[data-tone="enotary"] {
  --lsn-accent: #b01262;
  --lsn-accent-strong: #8F0E50;
  --lsn-tint: rgba(176,18,98,0.06);
  --lsn-tint-strong: rgba(176,18,98,0.11);
  --lsn-ring: rgba(176,18,98,0.24);
  --lsn-active-text: #67023B;
}
.lsn-frame { position: relative; max-width: 1440px; margin: 0 auto; }
.lsn-scroller {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 12px;
  overscroll-behavior-x: contain;
  padding: 0 12px;
}
.lsn-scroller::-webkit-scrollbar { display: none; }
.lsn-list {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 2px;
  width: max-content;
  margin: 0 auto;
  padding: 6px 0;
  list-style: none;
}
.lsn-item, .lsn-group { scroll-snap-align: start; }
.lsn-item { display: flex; flex-shrink: 0; }

/* The single sliding active card + accent bar. */
.lsn-indicator {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--lsn-tint) 0%, var(--lsn-tint-strong) 100%);
  box-shadow: 0 0 0 1px var(--lsn-ring) inset, 0 2px 8px -4px rgba(7,17,31,0.18);
  pointer-events: none;
  will-change: transform, width;
}
.lsn-indicator::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--lsn-accent);
}
.lsn-indicator[data-animate="true"] {
  transition: transform 240ms cubic-bezier(0.22, 0.8, 0.24, 1), width 240ms cubic-bezier(0.22, 0.8, 0.24, 1);
}

.lsn-tab {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px 0 8px;
  border-radius: 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  text-decoration: none;
  transition: color 180ms ease, background-color 180ms ease;
}
.lsn-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  flex-shrink: 0;
  background: #F1F5F9;
  color: #475569;
  transition: background-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
}
.lsn-tab:hover { color: #07111F; background: rgba(7,17,31,0.035); }
.lsn-tab:hover .lsn-ico { background: var(--lsn-tint-strong); color: var(--lsn-accent-strong); }
.lsn-tab[data-active="true"] { color: var(--lsn-active-text); font-weight: 650; background: transparent; }
.lsn-tab[data-active="true"] .lsn-ico {
  background: var(--lsn-accent);
  color: #FFFFFF;
  box-shadow: 0 3px 8px -3px var(--lsn-accent);
}
.lsn-tab:focus-visible { outline: 2px solid var(--lsn-accent); outline-offset: -2px; }

/* Group headings (Solutions). Divider + colour dot + small caps label. */
.lsn-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0 8px 0 14px;
  margin-left: 6px;
  border-left: 1px solid rgba(7,17,31,0.1);
}
.lsn-group:first-of-type, .lsn-indicator + .lsn-group { margin-left: 0; border-left: 0; padding-left: 4px; }
.lsn-group-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.lsn-group-label {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748B;
  white-space: nowrap;
}

/* Edge fades — only shown when there is more strip in that direction. */
.lsn-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40px;
  display: flex;
  align-items: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 180ms ease;
}
.lsn-fade-l { left: 0; justify-content: flex-start; padding-left: 6px; background: linear-gradient(to right, rgba(255,255,255,0.98), rgba(255,255,255,0)); }
.lsn-fade-r { right: 0; justify-content: flex-end; padding-right: 6px; background: linear-gradient(to left, rgba(255,255,255,0.98), rgba(255,255,255,0)); }
.lsn-fade[data-show="true"] { opacity: 1; }
.lsn-nudge {
  display: none;
  pointer-events: auto;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(7,17,31,0.12);
  background: #FFFFFF;
  color: #334155;
  box-shadow: 0 2px 8px rgba(7,17,31,0.12);
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease;
}
.lsn-nudge:hover { color: var(--lsn-accent-strong); border-color: var(--lsn-ring); }
@media (hover: hover) and (min-width: 768px) {
  .lsn-nudge { display: inline-flex; }
  .lsn-fade { width: 72px; }
  .lsn-fade-l { background: linear-gradient(to right, #FFFFFF 42%, rgba(255,255,255,0)); }
  .lsn-fade-r { background: linear-gradient(to left, #FFFFFF 42%, rgba(255,255,255,0)); }
}

/* Phones: compact strip, labels hidden on group headings (dot + divider remain). */
@media (max-width: 767px) {
  .lsn-group-label, .lsn-group-dot { display: none; }
  .lsn-group { padding: 0; margin: 10px 6px; }
  .lsn-indicator + .lsn-group { display: none; }
}
/* Tablets: compact row. */
@media (min-width: 768px) {
  .lsn-scroller { padding: 0 20px; scroll-padding-inline: 20px; }
}
/* Wide screens: roomier, centred banner row. */
@media (min-width: 1024px) {
  .lsn-scroller { padding: 0 32px; scroll-padding-inline: 32px; }
  .lsn-list { gap: 4px; padding: 8px 0; }
  .lsn-indicator { top: 8px; bottom: 8px; }
  .lsn-tab { min-height: 46px; padding: 0 14px 0 9px; gap: 9px; }
  .lsn-ico { width: 28px; height: 28px; border-radius: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .lsn-indicator[data-animate="true"], .lsn-tab, .lsn-ico, .lsn-fade, .lsn-nudge { transition: none; }
}
`;
