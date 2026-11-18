// The last question before an approver, a reviewer or an acknowledgment
// recipient records their decision.
//
// Their whole act is one button. A signer adopts a signature and fills fields
// on the way to theirs; these three do not, so a stray click was enough to put
// an approval, a review or an acknowledgment on the record under their name.
// This asks once, formally, and says what will be recorded.
//
// Centred at EVERY width, a phone included: it is a decision, not a menu, and
// a sheet at the bottom of a phone sits under the thumb that just pressed the
// button. Cancel is focused first for the same reason: Enter or a second tap
// in the same spot must never be what confirms.

import { useEffect, useId, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { Z } from "../../utils/z-index";
import { useModalFocus } from "../../hooks/useModalFocus";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";

export interface ConfirmActionCopy {
  readonly title: string;
  /** One sentence: what pressing Continue does. */
  readonly lead: string;
  /** What the person should know before they do. */
  readonly points: readonly string[];
}

export function ConfirmActionDialog({ copy, documentTitle, busy, onContinue, onCancel }: {
  copy: ConfirmActionCopy;
  documentTitle: string;
  /** True while the decision is being recorded: both buttons are held. */
  busy: boolean;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalFocus(panelRef, onCancel, busy);
  useEffect(() => { cancelRef.current?.focus(); }, []);

  return (
    <div
      data-testid="confirm-action-scrim" className="recipient-confirm-layer"
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal,
        background: "rgba(7, 17, 31, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, boxSizing: "border-box",
      }}
    >
      <div
        ref={panelRef} tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={{
          ...GF, background: "#FFFFFF", borderRadius: 14,
          width: "100%", maxWidth: 440, maxHeight: "calc(100dvh - 32px)", overflowY: "auto",
          boxSizing: "border-box", boxShadow: "0 12px 40px rgba(7, 17, 31, 0.30)",
        }}
      >
        <div style={{ padding: "22px 22px 6px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span aria-hidden style={{
            flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: "#EBF4FC",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={20} color={AZURE} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} style={{ ...GF, fontSize: 17, fontWeight: 800, color: NAVY, margin: 0, lineHeight: 1.3 }}>
              {copy.title}
            </h2>
            <p style={{ ...GF, fontSize: 12.5, color: "#64748B", margin: "4px 0 0", overflowWrap: "anywhere" }}>
              {documentTitle}
            </p>
          </div>
        </div>

        <div id={bodyId} style={{ padding: "10px 22px 4px" }}>
          <p style={{ ...GF, fontSize: 14, color: "#1F2937", margin: "0 0 10px", lineHeight: 1.55 }}>
            {copy.lead}
          </p>
          <ul style={{ ...GF, fontSize: 13, color: "#374151", margin: 0, paddingLeft: 20, lineHeight: 1.6, listStyle: "disc" }}>
            {copy.points.map(point => <li key={point} style={{ marginBottom: 4, display: "list-item", listStyle: "disc" }}>{point}</li>)}
          </ul>
        </div>

        {/* Side by side, Cancel first; they stack only where two buttons
            would not fit (a very narrow phone), Continue on top. */}
        <div style={{ padding: "16px 22px 22px", display: "flex", flexWrap: "wrap-reverse", gap: 10 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              ...GF, flex: "1 1 130px", minHeight: 44, padding: "10px 16px", borderRadius: 9,
              border: "1px solid #CBD5E1", background: "#FFFFFF", color: NAVY,
              fontSize: 14, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={busy}
            style={{
              ...GF, flex: "1 1 130px", minHeight: 44, padding: "10px 16px", borderRadius: 9,
              border: "none", background: busy ? "#7FB6E3" : AZURE, color: "#FFFFFF",
              fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Recording…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
