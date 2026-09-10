// The tour's coach-mark card: title, description, Next/Back/Skip, step
// counter. Positioned near its target with a fallback order
// (below → above → side → centered bottom sheet on narrow viewports).
// role="dialog" / aria-modal="false" — this is explain-only (the target is
// never interactive during a step), so the card is focusable and
// Escape-dismissable without trapping focus away from the rest of the page.

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import type { GuideStep } from "./types";
import { Z } from "../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const CARD_WIDTH = 340;
const GAP = 14;
const MOBILE_BREAKPOINT = 640;

interface TourCoachmarkProps {
  step: GuideStep;
  stepNumber: number;
  stepCount: number;
  canGoBack: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

function useIsNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  useEffect(() => {
    function handler() { setNarrow(window.innerWidth < MOBILE_BREAKPOINT); }
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return narrow;
}

interface Position {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
  placement: "top" | "bottom" | "left" | "right" | "center";
}

function computePosition(target: string | undefined, preferred: GuideStep["placement"]): Position {
  if (typeof window === "undefined") return { placement: "center" };

  if (!target) return { placement: "center" };

  const el = document.querySelector(`[data-guide="${target}"]`);
  if (!el) return { placement: "center" };

  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const order: Array<"bottom" | "top" | "right" | "left"> =
    preferred === "top" ? ["top", "bottom", "right", "left"]
    : preferred === "left" ? ["left", "right", "bottom", "top"]
    : preferred === "right" ? ["right", "left", "bottom", "top"]
    : ["bottom", "top", "right", "left"];

  const estHeight = 220;

  for (const placement of order) {
    if (placement === "bottom" && r.bottom + GAP + estHeight <= vh) {
      return { placement, top: r.bottom + GAP, left: Math.min(Math.max(r.left, 12), vw - CARD_WIDTH - 12) };
    }
    if (placement === "top" && r.top - GAP - estHeight >= 0) {
      return { placement, bottom: vh - r.top + GAP, left: Math.min(Math.max(r.left, 12), vw - CARD_WIDTH - 12) };
    }
    if (placement === "right" && r.right + GAP + CARD_WIDTH <= vw) {
      return { placement, left: r.right + GAP, top: Math.min(Math.max(r.top, 12), vh - estHeight - 12) };
    }
    if (placement === "left" && r.left - GAP - CARD_WIDTH >= 0) {
      return { placement, left: r.left - GAP - CARD_WIDTH, top: Math.min(Math.max(r.top, 12), vh - estHeight - 12) };
    }
  }

  // Nothing fit — centered bottom sheet fallback.
  return { placement: "center" };
}

export function TourCoachmark({
  step, stepNumber, stepCount, canGoBack, isLastStep, onNext, onBack, onSkip,
}: TourCoachmarkProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const isNarrow = useIsNarrowViewport();
  const [position, setPosition] = useState<Position>({ placement: "center" });

  const recompute = useCallback(() => {
    setPosition(computePosition(step.target, step.placement));
  }, [step.target, step.placement]);

  useEffect(() => {
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    const t1 = setTimeout(recompute, 150);
    const t2 = setTimeout(recompute, 400);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [recompute]);

  // Focus moves to the coach-mark on every step change.
  useEffect(() => {
    const t = setTimeout(() => {
      nextRef.current?.focus();
    }, reducedMotion ? 0 : 30);
    return () => clearTimeout(t);
  }, [step.id, reducedMotion]);

  // Escape closes and persists as skipped.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onSkip();
      }
    }
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onSkip]);

  const useBottomSheet = isNarrow || position.placement === "center";

  const style: React.CSSProperties = useBottomSheet
    ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        maxHeight: "70vh",
        borderRadius: "16px 16px 0 0",
      }
    : {
        position: "fixed",
        top: position.top,
        left: position.left,
        bottom: position.bottom,
        right: position.right,
        width: CARD_WIDTH,
        maxWidth: "calc(100vw - 24px)",
        borderRadius: 14,
      };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-coachmark-title"
      aria-describedby="tour-coachmark-desc"
      style={{
        ...style,
        zIndex: Z.tourCoachmark,
        background: "#ffffff",
        boxShadow: "0 12px 40px rgba(7,17,31,0.28)",
        padding: "18px 18px 16px",
        overflowY: "auto",
        transition: reducedMotion ? "none" : "top 0.15s ease, left 0.15s ease",
        ...GF,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#0078D4", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          Step {stepNumber} of {stepCount}
        </span>
        <button
          onClick={onSkip}
          aria-label="Close tour"
          style={{
            background: "none", border: "none", cursor: "pointer", color: "#64748B",
            width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 6, flexShrink: 0,
          }}
          className="tour-icon-btn"
        >
          <X size={15} aria-hidden />
        </button>
      </div>

      <h2 id="tour-coachmark-title" style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", margin: "0 0 6px" }}>
        {step.title}
      </h2>
      <p id="tour-coachmark-desc" style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, margin: "0 0 16px" }}>
        {step.description}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button
          onClick={onSkip}
          style={{
            background: "none", border: "none", color: "#64748B", fontSize: 12.5, cursor: "pointer",
            padding: "8px 6px", ...GF,
          }}
          className="tour-text-btn"
        >
          Skip tour
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {canGoBack && (
            <button
              onClick={onBack}
              style={{
                background: "none", border: "1px solid #E2E8F0", color: "#334155", borderRadius: 7,
                fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer", ...GF,
              }}
              className="tour-back-btn"
            >
              Back
            </button>
          )}
          <button
            ref={nextRef}
            onClick={onNext}
            style={{
              background: "#0078D4", border: "none", color: "white", borderRadius: 7,
              fontSize: 13, fontWeight: 700, padding: "8px 16px", cursor: "pointer", ...GF,
            }}
            className="tour-next-btn"
          >
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>

      <style>{`
        .tour-icon-btn:hover { background: #F1F5F9; }
        .tour-icon-btn:focus-visible,
        .tour-text-btn:focus-visible,
        .tour-back-btn:focus-visible,
        .tour-next-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .tour-back-btn:hover { background: #F8FAFC; }
        .tour-next-btn:hover { background: #0B63AD; }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}
