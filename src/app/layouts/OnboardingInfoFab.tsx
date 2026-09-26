// "About this step" — the round information button on every onboarding step.
//
// Two presentations of the same three answers (why we ask, where it's saved,
// can I change it later):
//
//   panel  (≥ 900px) — a NON-modal side panel docked right, below the
//                      stepper. The page stays usable; OnboardingLayout
//                      narrows the form column while it is open so the card
//                      is never underneath it.
//   sheet  (< 900px) — a bottom sheet over a scrim. Modal: focus is trapped
//                      inside it, and tap-outside, × and Esc all close it.
//
// Focus returns to the button whenever either closes.

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Info, X } from "lucide-react";
import { Z } from "../utils/z-index";
import type { OnboardingStepHelp } from "../pages/onboarding/onboarding-help";

const GF = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const NAVY = "#07111F";

export const INFO_PANEL_WIDTH = 340;

interface OnboardingInfoFabProps {
  help: OnboardingStepHelp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "panel" | "sheet";
  /** Distance from the top of the viewport to the bottom of the stepper. */
  panelTop: number;
  /** CSS `bottom` for the button — above the sticky action bar on phones. */
  fabBottom: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function HelpSections({ help }: { help: OnboardingStepHelp }) {
  const sections = [
    { heading: "Why we ask", body: help.why },
    { heading: "Where it's saved", body: help.where },
    { heading: "You can change it later", body: help.later },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {sections.map((s) => (
        <section key={s.heading}>
          <h3 style={{ ...GF, margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: NAVY }}>{s.heading}</h3>
          <p style={{ ...GF, margin: 0, fontSize: 14, lineHeight: 1.6, color: "#33414F" }}>{s.body}</p>
        </section>
      ))}
    </div>
  );
}

export function OnboardingInfoFab({
  help, open, onOpenChange, mode, panelTop, fabBottom,
}: OnboardingInfoFabProps) {
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);
  const titleId = useId();
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  // Focus in on open, back to the button on close.
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    } else if (wasOpen.current) {
      fabRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // Esc closes either presentation, wherever focus is.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Focus trap — sheet only. The panel is non-modal on purpose: the form next
  // to it must stay reachable.
  function trapTab(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (mode !== "sheet" || e.key !== "Tab" || !surfaceRef.current) return;
    const items = Array.from(surfaceRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const header = (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ ...GF, margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: AZURE }}>
          About this step
        </p>
        <h2 id={titleId} style={{ ...GF, margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: NAVY }}>
          {help.title}
        </h2>
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={() => onOpenChange(false)}
        aria-label="Close"
        style={{
          width: 44, height: 44, flexShrink: 0, borderRadius: 10,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "#F1F5F9", border: "none", cursor: "pointer", color: NAVY,
        }}
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className="ob-info-fab"
        aria-label="About this step"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        style={{
          position: "fixed", right: mode === "panel" ? 24 : 16, bottom: fabBottom,
          width: 44, height: 44, borderRadius: "50%",
          display: open && mode === "panel" ? "none" : "inline-flex",
          alignItems: "center", justifyContent: "center",
          background: AZURE, color: "#FFFFFF", border: "none", cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,120,212,0.30)", zIndex: Z.helpFab,
        }}
      >
        <Info size={20} aria-hidden />
      </button>

      {open && mode === "panel" && (
        <aside
          aria-labelledby={titleId}
          className="ob-info-panel"
          data-testid="onboarding-info-panel"
          style={{
            position: "fixed", right: 0, top: panelTop, bottom: 0,
            width: INFO_PANEL_WIDTH, boxSizing: "border-box", overflowY: "auto",
            background: "#FFFFFF", borderLeft: "1px solid #DBEAFE",
            boxShadow: "-8px 0 24px rgba(7,17,31,0.06)",
            padding: "20px 20px 28px", zIndex: Z.drawer,
          }}
        >
          <div ref={surfaceRef}>
            {header}
            <HelpSections help={help} />
          </div>
        </aside>
      )}

      {open && mode === "sheet" && (
        <>
          <div
            data-testid="onboarding-info-scrim"
            onClick={() => onOpenChange(false)}
            aria-hidden
            style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.40)", zIndex: Z.modalScrim }}
          />
          <div
            ref={surfaceRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="ob-info-sheet"
            data-testid="onboarding-info-panel"
            onKeyDown={trapTab}
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0,
              height: "60vh", maxHeight: "calc(100vh - 48px)", boxSizing: "border-box",
              display: "flex", flexDirection: "column",
              background: "#FFFFFF", borderRadius: "18px 18px 0 0",
              boxShadow: "0 -10px 30px rgba(7,17,31,0.16)",
              padding: "8px 20px calc(20px + env(safe-area-inset-bottom))",
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              zIndex: Z.modal,
            }}
          >
            {/* Drag handle — pull down to close. Pointer only; × and Esc are
                the keyboard routes. */}
            <div
              aria-hidden
              onPointerDown={(e) => { dragStart.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); }}
              onPointerMove={(e) => {
                if (dragStart.current === null) return;
                setDragY(Math.max(0, e.clientY - dragStart.current));
              }}
              onPointerUp={() => {
                const moved = dragY;
                dragStart.current = null;
                setDragY(0);
                if (moved > 80) onOpenChange(false);
              }}
              onPointerCancel={() => { dragStart.current = null; setDragY(0); }}
              style={{ padding: "8px 0 14px", cursor: "grab", touchAction: "none", flexShrink: 0 }}
            >
              <div style={{ width: 40, height: 5, borderRadius: 3, background: "#CBD5E1", margin: "0 auto" }} />
            </div>
            <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
              {header}
              <HelpSections help={help} />
            </div>
          </div>
        </>
      )}

      <style>{`
        .ob-info-fab:hover { background: #006BBE !important; }
        .ob-info-fab:focus-visible { outline: 3px solid #9CCBF2; outline-offset: 2px; }
        .ob-info-panel { animation: ob-info-slide-in 180ms ease-out; }
        .ob-info-sheet { animation: ob-info-rise 200ms ease-out; }
        @keyframes ob-info-slide-in { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes ob-info-rise { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .ob-info-panel, .ob-info-sheet { animation: none !important; transition: none !important; }
        }
      `}</style>
    </>
  );
}
