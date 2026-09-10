// Dimmed backdrop with a spotlight cutout over the current tour target.
// Plain CSS trick: a full-viewport fixed div sized/positioned to the
// target's getBoundingClientRect(), using a huge box-shadow as the dim layer
// so the cutout itself stays fully transparent (and thus not click-blocking
// in a way that traps the user — clicks on the dimmed area still just do
// nothing, this is an explain-only tour).

import { useEffect, useState } from "react";
import { Z } from "../utils/z-index";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const RADIUS = 10;

export function TourOverlay({ target }: { target?: string }) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector(`[data-guide="${target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // Layout can keep shifting briefly after mount (fonts, images); a short
    // bounded re-measure covers that without an unbounded observer loop.
    const t1 = setTimeout(measure, 150);
    const t2 = setTimeout(measure, 400);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [target]);

  // Centered/targetless step: uniform dim, no cutout.
  if (!target || !rect) {
    return (
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: Z.tourOverlay,
          background: "rgba(7,17,31,0.6)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        zIndex: Z.tourOverlay,
        borderRadius: RADIUS,
        boxShadow: "0 0 0 9999px rgba(7,17,31,0.6)",
        pointerEvents: "none",
        transition: "top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease",
      }}
    />
  );
}
