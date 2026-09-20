// The field editor's secondary controls, on a narrow screen.
//
// The toolbar carried fourteen buttons in one non-wrapping row. At 320px the
// last four sat past the edge of a clipping ancestor — unreachable, not
// merely off-screen — so undo, copy, paste and the view toggle simply could
// not be used on a phone.
//
// This takes the ones that are not the task itself. What stays in the row is
// go back, add a field, validate, continue; everything else lives here.
//
// A menu rather than a horizontally scrolling strip: a strip hides its
// contents behind a gesture with no affordance, and these are exactly the
// controls somebody goes looking for by name.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MoreHorizontal } from "lucide-react";
import { Z } from "../../utils/z-index";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SILVER = "#8A9BAE";

export interface ToolbarItem {
  readonly id: string;
  readonly label: string;
  /** Optional leading glyph, shown in the inline row and in the menu. */
  readonly glyph?: string;
  readonly title: string;
  readonly onClick: () => void;
  readonly disabled: boolean;
}

export function ToolbarOverflow({ items, zoom }: {
  items: readonly ToolbarItem[];
  /** Shown as a read-only line, because the zoom buttons are in here too. */
  zoom: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More editor actions"
        title="More actions"
        style={{
          ...GF, height: 34, minWidth: 38, padding: "0 8px", borderRadius: 6,
          border: "1px solid #D1D9E0", background: open ? "#EBF4FC" : "#FFFFFF",
          color: NAVY, cursor: "pointer", display: "inline-flex",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="More editor actions"
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            zIndex: Z.dropdown,
            minWidth: 190, padding: 6, borderRadius: 10,
            background: "#FFFFFF", border: "1px solid #E3E8EF",
            boxShadow: "0 12px 32px rgba(7,17,31,0.18)",
          }}
        >
          {items.map(item => (
            <button
              key={item.id}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              title={item.title}
              onClick={() => { item.onClick(); setOpen(false); }}
              style={{
                ...GF, display: "flex", alignItems: "center", gap: 8,
                width: "100%", textAlign: "left",
                // A menu row is a tap target like any other.
                minHeight: 44, padding: "0 10px", borderRadius: 7,
                border: "none", background: "transparent",
                color: item.disabled ? SILVER : NAVY,
                fontSize: 13, fontWeight: 600,
                cursor: item.disabled ? "not-allowed" : "pointer",
                opacity: item.disabled ? 0.55 : 1,
              }}
            >
              {item.glyph !== undefined && (
                <span aria-hidden style={{ width: 14, flexShrink: 0 }}>{item.glyph}</span>
              )}
              {item.label}
            </button>
          ))}

          {/* Read-only: the two zoom controls above change it, and a person
              needs to see what they are changing it from. */}
          <div
            style={{
              ...GF, padding: "8px 10px 4px", fontSize: 11, color: SILVER,
              borderTop: "1px solid #F1F5F9", marginTop: 4,
            }}
          >
            Zoom {zoom}%
          </div>
        </div>
      )}
    </div>
  );
}
