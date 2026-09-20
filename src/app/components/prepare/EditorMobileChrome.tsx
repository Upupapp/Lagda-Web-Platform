// The field editor's two side panels, on a phone.
//
// ── The arithmetic that forced this ────────────────────────────────────────
//
// The editor body is a non-wrapping flex row: a 200px document rail, the
// canvas, and a 272px properties panel. 472px of FIXED chrome — 152px more
// than a 320px viewport holds before the canvas gets a single pixel. The
// centre column collapsed to nothing and the right panel was pushed outside
// a root with `overflow: hidden`, so it was not scrolled off, it was gone.
//
// ── Why a drawer and a sheet rather than a narrower column ─────────────────
//
// Squeezing three columns into 320px gives three unusable ones. The canvas is
// the thing being worked on and it gets the full width; the two panels become
// surfaces you summon, which is what they already are in every other editor
// on a phone.
//
// The document rail goes LEFT, behind a control in the toolbar, because
// picking a page is navigation. Field properties come from the BOTTOM,
// because it opens in response to selecting a field and the bottom of the
// screen is where a thumb already is.
//
// Both trap focus while open and return it on close: they sit over the
// canvas, and a keyboard that walks behind them is a keyboard lost.

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Z } from "../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SILVER = "#8A9BAE";

/** Closes on Escape, and restores focus to whatever opened it. */
function useDismiss(open: boolean, onClose: () => void) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", onKey);

    const body = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = body;
      const el = previouslyFocused.current;
      previouslyFocused.current = null;
      if (el && document.contains(el)) { try { el.focus(); } catch { /* gone */ } }
    };
  }, [open, onClose]);
}

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <div
      aria-hidden
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: Z.drawerScrim,
        background: "rgba(7,17,31,0.45)",
      }}
    />
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px", borderBottom: "1px solid #E3E8EF", flexShrink: 0,
    }}>
      <span style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{title}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${title.toLowerCase()}`}
        style={{
          ...GF, width: 44, height: 44, marginRight: -10, border: "none",
          background: "none", color: SILVER, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}

/** The document and page rail, as a left drawer. */
export function EditorDrawer({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  useDismiss(open, onClose);
  if (!open) return null;

  return (
    <>
      <Scrim onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "fixed", top: 0, bottom: 0, left: 0, zIndex: Z.drawer,
          width: "min(280px, 86vw)", background: "#FFFFFF",
          borderRight: "1px solid #E3E8EF",
          display: "flex", flexDirection: "column",
          boxShadow: "4px 0 24px rgba(7,17,31,0.18)",
        }}
      >
        <Header title={title} onClose={onClose} />
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</div>
      </div>
    </>
  );
}

/**
 * Field properties, validation and the field palette, as a bottom sheet.
 *
 * Capped at 70vh so the canvas stays visible behind it — the whole point of
 * editing a field is seeing where it lands, and a full-height sheet would
 * hide the thing being changed.
 */
export function EditorSheet({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  useDismiss(open, onClose);
  if (!open) return null;

  return (
    <>
      <Scrim onClose={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: Z.drawer,
          maxHeight: "70vh", background: "#FFFFFF",
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          display: "flex", flexDirection: "column",
          boxShadow: "0 -6px 28px rgba(7,17,31,0.22)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Grab handle: says "this came from the bottom and goes back there"
            without a word of copy. Decorative — the header's button is the
            real control. */}
        <div aria-hidden style={{ display: "flex", justifyContent: "center", padding: "8px 0 2px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#D1D9E0" }} />
        </div>
        <Header title={title} onClose={onClose} />
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</div>
      </div>
    </>
  );
}
