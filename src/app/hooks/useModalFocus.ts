import { useEffect, useRef, type RefObject } from "react";
let modalCount = 0;
let previousOverflow = "";
/** Focus containment for the application dialogs, including nested panels. */
export function useModalFocus(ref: RefObject<HTMLDivElement | null>, onClose: () => void, busy = false, enabled = true) {
  const latest = useRef({ onClose, busy });
  useEffect(() => { latest.current = { onClose, busy }; }, [onClose, busy]);
  useEffect(() => {
    if (!enabled) return;
    const panel = ref.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    if (modalCount++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
    const controls = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')).filter(el => !el.closest('[hidden], [inert]') && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden");
    const active = () => Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]')).at(-1) === panel;
    const first = () => (controls()[0] ?? panel).focus();
    first();
    const focus = (event: FocusEvent) => { if (active() && !panel.contains(event.target as Node)) first(); };
    const key = (event: KeyboardEvent) => {
      if (!active() || event.defaultPrevented) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!latest.current.busy) latest.current.onClose(); return; }
      if (event.key !== "Tab") return;
      const items = controls(), start = items[0], end = items.at(-1);
      if (!start || !end) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === start || document.activeElement === panel)) { event.preventDefault(); end.focus(); }
      else if (!event.shiftKey && (document.activeElement === end || !panel.contains(document.activeElement))) { event.preventDefault(); start.focus(); }
    };
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("keydown", key); document.removeEventListener("focusin", focus);
      if (--modalCount === 0) document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, enabled]);
}
