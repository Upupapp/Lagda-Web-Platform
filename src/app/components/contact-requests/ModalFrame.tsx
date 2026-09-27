// A small accessible modal for the contact-request dialogs.
//
// What it guarantees: role="dialog" + aria-modal, labelled by its heading,
// focus moved inside on open and returned to the opener on close, Tab kept
// inside while open, Escape closes, the page behind does not scroll, and the
// panel never exceeds the viewport (it scrolls internally) — so it works at
// 320px as well as on a desktop.

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Z } from "../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" } as const;

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

export function ModalFrame({ title, subtitle, onClose, children, footer, width = 520, busy = false }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  /** While true, Escape and the backdrop do not close (a request is in flight). */
  busy?: boolean;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]")
      ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!busyRef.current) { event.stopPropagation(); closeRef.current(); }
        return;
      }
      if (event.key !== "Tab" || panelRef.current === null) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) { event.preventDefault(); return; }
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault(); lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault(); firstItem.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  return (
    <div
      onMouseDown={event => { if (event.target === event.currentTarget && !busyRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7,17,31,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        style={{
          background: "#FFFFFF", borderRadius: 12, width: `min(${width}px, 100%)`,
          maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(7,17,31,0.28)", outline: "none", minWidth: 0,
        }}
      >
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 18px",
          borderBottom: "1px solid #E2E8F0", flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={headingId} style={{ ...GF, fontSize: 16, fontWeight: 700, color: "#07111F", margin: 0, overflowWrap: "anywhere" }}>
              {title}
            </h2>
            {subtitle !== undefined && (
              <p style={{ ...GF, fontSize: 12.5, color: "#475569", margin: "3px 0 0", overflowWrap: "anywhere" }}>{subtitle}</p>
            )}
          </div>
          <button
            type="button" onClick={onClose} disabled={busy} aria-label="Close"
            style={{
              background: "none", border: "none", cursor: busy ? "default" : "pointer", color: "#475569",
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, flexShrink: 0, margin: "-6px -6px 0 0",
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div style={{ padding: "16px 18px", overflowY: "auto", minHeight: 0 }}>{children}</div>
        {footer !== undefined && (
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap",
            padding: "12px 18px", borderTop: "1px solid #E2E8F0", flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function modalButtonStyle(variant: "primary" | "secondary" | "danger", disabled = false): React.CSSProperties {
  const base: React.CSSProperties = {
    ...GF, minHeight: 40, padding: "0 16px", borderRadius: 8, fontSize: 13.5, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 7, maxWidth: "100%",
  };
  if (variant === "primary") {
    return { ...base, border: "none", background: disabled ? "#7FB5E6" : "#0078D4", color: "#FFFFFF", fontWeight: 700 };
  }
  if (variant === "danger") {
    return { ...base, border: "1px solid #FECACA", background: "#FEF2F2", color: "#991B1B" };
  }
  return { ...base, border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#0F172A" };
}
