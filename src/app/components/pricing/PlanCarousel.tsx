// The plans: a grid on desktop and tablet, a carousel on phones only.
//
// On a wide screen the four plans (Free, Personal, Business, Enterprise) sit
// side by side as they always have, two by two on a tablet. On a phone,
// where stacking four tall cards makes a very long page, they become a
// carousel: one card with the next one peeking, arrows and dots, and native
// swipe with snap points (touch, trackpad and keyboard all work). Announced
// as a carousel of grouped slides ("2 of 4").

import { Children, useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PlanCarousel({ label, tone = "light", children, testId = "plan-carousel" }: {
  label: string;
  tone?: "light" | "dark";
  children: React.ReactNode;
  testId?: string;
}) {
  const slides = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: slides.length <= 1 });
  const id = useId();

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    const step = first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || "0") : track.clientWidth;
    setActive(step > 0 ? Math.min(slides.length - 1, Math.round(track.scrollLeft / step)) : 0);
    setEdges({ start: track.scrollLeft <= 2, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2 });
  }, [slides.length]);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { track.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [measure]);

  const go = (index: number) => {
    const track = trackRef.current;
    const target = track?.children[Math.max(0, Math.min(slides.length - 1, index))] as HTMLElement | undefined;
    if (!track || !target) return;
    track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: "smooth" });
  };
  const step = (dir: -1 | 1) => { go(active + dir); };

  return (
    <section className={`pc-wrap pc-${tone}`} aria-roledescription="carousel" aria-label={label} data-testid={testId}>
      <div className="pc-frame">
        <div id={id} ref={trackRef} className="pc-track"
          onKeyDown={e => {
            if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
            if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
          }}>
          {slides.map((slide, i) => (
            <div key={i} className="pc-slide" role="group" aria-roledescription="slide" aria-label={`${String(i + 1)} of ${String(slides.length)}`}>
              {slide}
            </div>
          ))}
        </div>
      </div>
      {/* Under the cards, never over them: previous, the dots, next. */}
      <div className="pc-controls">
        <button type="button" className="pc-arrow" onClick={() => { step(-1); }} disabled={edges.start}
          aria-label="Previous plan" aria-controls={id}>
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div className="pc-dots" role="tablist" aria-label={`${label}: choose a plan`}>
          {slides.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === active} aria-label={`Show plan ${String(i + 1)}`}
              className={i === active ? "pc-dot pc-dot-on" : "pc-dot"} onClick={() => { go(i); }} />
          ))}
        </div>
        <button type="button" className="pc-arrow" onClick={() => { step(1); }} disabled={edges.end}
          aria-label="Next plan" aria-controls={id}>
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>
      <style>{CSS}</style>
    </section>
  );
}

const CSS = `
.pc-wrap { position: relative; min-width: 0; }
.pc-frame { position: relative; }
/* Desktop and tablet: a plain grid, every plan in view. */
.pc-track { display: grid; grid-template-columns: repeat(var(--pc-cols, 4), minmax(0, 1fr)); gap: 20px; }
.pc-slide { min-width: 0; display: flex; }
.pc-slide > * { flex: 1 1 auto; min-width: 0; }
.pc-controls { display: none; }
@media (max-width: 1100px) { .pc-track { --pc-cols: 2; } }

/* Phones: the carousel. */
@media (max-width: 700px) {
  .pc-track { display: grid; grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 86%; column-gap: 14px;
    overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; scroll-padding-inline: 4px;
    padding: 18px 4px 22px; margin: -18px -4px -22px; scrollbar-width: none; overscroll-behavior-x: contain; }
  .pc-track::-webkit-scrollbar { display: none; }
  .pc-slide { scroll-snap-align: start; }
  .pc-controls { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }
  .pc-arrow { display: flex; width: 40px; height: 40px; border-radius: 50%; align-items: center; justify-content: center; cursor: pointer;
    flex-shrink: 0; transition: opacity 150ms ease; }
  .pc-arrow:disabled { opacity: 0.35; cursor: default; }
  .pc-dots { display: flex; justify-content: center; gap: 8px; }
  .pc-dot { width: 9px; height: 9px; border-radius: 999px; border: none; padding: 0; cursor: pointer; transition: width 200ms ease, background 200ms ease; }
  .pc-dot-on { width: 26px; }
}
.pc-arrow:focus-visible, .pc-dot:focus-visible { outline: 3px solid #F5C542; outline-offset: 2px; }

.pc-light .pc-arrow { background: #FFFFFF; color: #0B1F4B; border: 1px solid rgba(7,17,31,0.14); box-shadow: 0 6px 18px -8px rgba(7,17,31,0.45); }
.pc-light .pc-dot { background: #CBD5E1; }
.pc-light .pc-dot-on { background: #0078D4; }
.pc-dark .pc-arrow { background: #FFFFFF; color: #0B1F4B; border: none; box-shadow: 0 8px 22px -10px rgba(0,0,0,0.7); }
.pc-dark .pc-dot { background: rgba(255,255,255,0.28); }
.pc-dark .pc-dot-on { background: #F5C542; }

@media (prefers-reduced-motion: reduce) {
  .pc-track { scroll-behavior: auto; }
  .pc-dot, .pc-arrow { transition: none; }
}
`;
