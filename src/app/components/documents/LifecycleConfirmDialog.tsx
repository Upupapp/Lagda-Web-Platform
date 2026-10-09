// The question asked before a document is cancelled, restored, moved to the
// Recycle Bin or deleted.
//
// One dialog for all of them, so they read as one family: centred at every
// width, a short statement of what Continue does, the points worth knowing,
// and exactly two buttons, Cancel and Continue. Where the action must be
// explained to someone else (the owner, or the people who had access), a
// reason is asked for and Continue stays off until one is given.
//
// Cancel is focused first: Enter, or a second tap in the same spot, must
// never be what confirms something that cannot be undone.

import { useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Z } from "../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const DANGER = "#B91C1C";

export const REASON_MAX = 500;

export interface LifecycleConfirmCopy {
  readonly title: string;
  /** One sentence: what pressing Continue does. */
  readonly lead: string;
  readonly points?: readonly string[];
  /** Asks for a reason, and requires one unless it is marked `optional`. */
  readonly reason?: {
    readonly label: string; readonly placeholder: string; readonly hint?: string;
    /** The reason may be left empty. Continue is then never held back by it. */
    readonly optional?: boolean;
  };
  /** Red for what cannot be undone; blue otherwise. */
  readonly tone?: "danger" | "neutral";
  readonly icon: LucideIcon;
}

export function LifecycleConfirmDialog({ copy, subject, busy = false, error = null, onContinue, onCancel }: {
  copy: LifecycleConfirmCopy;
  /** What it is about, usually the document's title. */
  subject: string;
  busy?: boolean;
  /** Why the last attempt failed, shown inside the dialog. */
  error?: string | null;
  onContinue: (reason: string) => void;
  onCancel: () => void;
}) {
  const titleId = useId(), bodyId = useId(), reasonId = useId(), hintId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState("");
  const danger = copy.tone === "danger";
  const accent = danger ? DANGER : AZURE;
  const Icon = copy.icon;
  const reasonOptional = copy.reason?.optional === true;
  const needsReason = copy.reason !== undefined && !reasonOptional;
  const ready = !busy && (!needsReason || reason.trim().length > 0);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    return () => { opener?.focus(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); if (!busy) onCancel(); return; }
      if (e.key !== "Tab" || panelRef.current === null) return;
      // Keep Tab inside the dialog.
      const stops = [...panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), textarea")];
      if (stops.length === 0) return;
      const first = stops[0]!, last = stops[stops.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); };
  }, [busy, onCancel]);

  return (
    <div
      data-testid="lifecycle-confirm-scrim"
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, background: "rgba(7, 17, 31, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box",
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}
        style={{
          ...GF, background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 460,
          maxHeight: "calc(100dvh - 32px)", overflowY: "auto", boxSizing: "border-box",
          boxShadow: "0 12px 40px rgba(7, 17, 31, 0.30)",
        }}
      >
        <div style={{ padding: "22px 22px 6px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span aria-hidden style={{
            flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: danger ? "#FEF2F2" : "#EBF4FC",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={20} color={accent} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} style={{ ...GF, fontSize: 17, fontWeight: 800, color: NAVY, margin: 0, lineHeight: 1.3 }}>{copy.title}</h2>
            <p style={{ ...GF, fontSize: 12.5, color: "#64748B", margin: "4px 0 0", overflowWrap: "anywhere" }}>{subject}</p>
          </div>
        </div>

        <div id={bodyId} style={{ padding: "10px 22px 4px" }}>
          <p style={{ ...GF, fontSize: 14, color: "#1F2937", margin: "0 0 10px", lineHeight: 1.55 }}>{copy.lead}</p>
          {copy.points !== undefined && copy.points.length > 0 && (
            <ul style={{ ...GF, fontSize: 13, color: "#374151", margin: 0, paddingLeft: 20, lineHeight: 1.6, listStyle: "disc" }}>
              {copy.points.map(point => <li key={point} style={{ marginBottom: 4, display: "list-item", listStyle: "disc" }}>{point}</li>)}
            </ul>
          )}
        </div>

        {copy.reason !== undefined && (
          <div style={{ padding: "12px 22px 0" }}>
            <label htmlFor={reasonId} style={{ ...GF, display: "block", fontSize: 12.5, fontWeight: 700, color: NAVY, marginBottom: 5 }}>
              {copy.reason.label}{" "}
              {reasonOptional
                ? <span style={{ fontWeight: 500, color: "#64748B" }}>(optional)</span>
                : <span style={{ color: DANGER }}>*</span>}
            </label>
            <textarea
              id={reasonId} value={reason} maxLength={REASON_MAX} rows={3} disabled={busy}
              onChange={e => { setReason(e.target.value); }}
              placeholder={copy.reason.placeholder}
              aria-required={reasonOptional ? "false" : "true"} aria-describedby={hintId}
              style={{
                ...GF, width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 9,
                border: "1px solid #CBD5E1", fontSize: 13.5, color: NAVY, resize: "vertical", minHeight: 76,
              }}
            />
            <div id={hintId} style={{ ...GF, display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, color: "#64748B", marginTop: 4 }}>
              <span>{copy.reason.hint ?? (reasonOptional ? "Optional." : "Required.")}</span>
              <span>{reason.length}/{REASON_MAX}</span>
            </div>
          </div>
        )}

        {error !== null && (
          <p role="alert" style={{ ...GF, margin: "12px 22px 0", padding: "9px 12px", borderRadius: 9, background: "#FEF2F2", border: "1px solid #FECACA", color: "#7F1D1D", fontSize: 13, lineHeight: 1.45 }}>
            {error}
          </p>
        )}

        {/* Side by side, Cancel first; stacked only where two would not fit, Continue on top. */}
        <div style={{ padding: "16px 22px 22px", display: "flex", flexWrap: "wrap-reverse", gap: 10 }}>
          <button
            ref={cancelRef} type="button" onClick={onCancel} disabled={busy}
            style={{
              ...GF, flex: "1 1 130px", minHeight: 44, padding: "10px 16px", borderRadius: 9,
              border: "1px solid #CBD5E1", background: "#FFFFFF", color: NAVY,
              fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={() => { if (ready) onContinue(reason.trim()); }} disabled={!ready}
            style={{
              ...GF, flex: "1 1 130px", minHeight: 44, padding: "10px 16px", borderRadius: 9, border: "none",
              background: ready ? accent : (danger ? "#E7A8A8" : "#7FB6E3"), color: "#FFFFFF",
              fontSize: 14, fontWeight: 700, cursor: ready ? "pointer" : "not-allowed",
            }}
          >
            {busy ? "Working…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
