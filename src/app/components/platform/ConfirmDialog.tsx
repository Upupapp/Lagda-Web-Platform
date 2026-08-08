// The platform's confirmation dialog.
//
// This is the canonical one. Three feature-scoped copies already existed
// (WorkflowPrimitives, CollaborationKit, BulkSendKit), each tied to its own
// stylesheet — `WorkflowConfirmDialog` needs the `wf-*` classes, so Settings
// could not reuse it without importing the workflow stylesheet. Rather than add
// a fourth private copy, this one is styled from brand tokens only and depends
// on nothing outside `utils/z-index`.
//
// It replaces the last native `window.confirm()` calls in the product. A native
// dialog cannot be brand-aligned, cannot be focus-managed by the app, renders
// the origin ("this page says…") above the message, is suppressed outright in
// some embedded contexts, and on several mobile browsers is dismissible in ways
// the caller never learns about. For "revoke every other session" and "disable
// multi-factor authentication" that is not an acceptable last line of defence.

import { useEffect, useRef, useState, useCallback } from "react";
import { Z } from "../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };

const NAVY   = "#07111F";
const SLATE  = "#475569";
const BORDER = "#E2E8F0";
const AZURE  = "#0078D4";
const RED    = "#DC2626";

export interface ConfirmRequest {
  /** Short, specific question. "Revoke all other sessions?" beats "Are you sure?". */
  title: string;
  /** What will actually happen. State consequences plainly; no hedging. */
  body: string;
  /** Names the action, never "OK" — the button should read as the thing it does. */
  confirmLabel: string;
  cancelLabel?: string;
  /** Renders the confirm button in the destructive style. */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Drives a single dialog instance. Returns the element to render plus `confirm`
 * to open it. Kept as a hook so a page needs one line at the call site and one
 * in its JSX, which is what makes replacing `window.confirm` cheap.
 */
export function useConfirm(): {
  confirm: (request: ConfirmRequest) => void;
  confirmDialog: React.ReactElement | null;
} {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirm = useCallback((next: ConfirmRequest) => setRequest(next), []);
  const close = useCallback(() => setRequest(null), []);
  return {
    confirm,
    confirmDialog: <ConfirmDialog request={request} onClose={close} />,
  };
}

export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  // Focus moves to the confirm button on open and returns to whatever opened
  // the dialog on close, so keyboard users are never dropped at the top of the
  // document.
  useEffect(() => {
    if (!request) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    return () => previousFocus.current?.focus?.();
  }, [request]);

  useEffect(() => {
    if (!request) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [request, onClose]);

  // The page behind must not scroll while a decision is pending.
  useEffect(() => {
    if (!request) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [request]);

  if (!request) return null;

  const accent = request.destructive ? RED : AZURE;

  async function handleConfirm() {
    if (!request || busy) return;
    try {
      setBusy(true);
      await request.onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="lagda-confirm-title"
      aria-describedby="lagda-confirm-body"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z.modal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(7,17,31,0.42)",
          animation: "lagda-confirm-fade var(--lagda-dur-fast) var(--lagda-ease-out)",
        }}
      />
      <div
        ref={panelRef}
        style={{
          position: "relative",
          background: "#FFFFFF",
          borderRadius: "var(--lagda-radius-dialog)",
          padding: "24px 26px",
          maxWidth: 440,
          width: "100%",
          boxShadow: "var(--lagda-shadow-dialog)",
          animation: "lagda-confirm-in var(--lagda-dur-dialog) var(--lagda-ease-out)",
        }}
      >
        <h2
          id="lagda-confirm-title"
          style={{ ...GF, margin: "0 0 10px", fontSize: 17, fontWeight: 700, color: NAVY }}
        >
          {request.title}
        </h2>
        <p
          id="lagda-confirm-body"
          style={{ ...GF, margin: "0 0 22px", fontSize: 14, color: SLATE, lineHeight: 1.65 }}
        >
          {request.body}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              ...GF,
              minHeight: 44,
              padding: "0 18px",
              borderRadius: "var(--lagda-radius-md)",
              border: `1px solid ${BORDER}`,
              background: "#FFFFFF",
              color: SLATE,
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {request.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            aria-busy={busy}
            style={{
              ...GF,
              minHeight: 44,
              padding: "0 18px",
              borderRadius: "var(--lagda-radius-md)",
              border: "none",
              background: busy ? "#94A3B8" : accent,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Working…" : request.confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes lagda-confirm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lagda-confirm-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98) }
          to   { opacity: 1; transform: none }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes lagda-confirm-in { from { opacity: 0 } to { opacity: 1 } }
        }
      `}</style>
    </div>
  );
}
