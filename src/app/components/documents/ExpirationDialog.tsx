// Set, change or remove a sent document's expiration.
//
// The deadline is optional and belongs to the sender. It can be set only while
// the document is still out for signing; the server refuses anything else, and
// what it says is shown as it is.

import { useEffect, useId, useState, type CSSProperties } from "react";
import { X, CalendarClock, Loader2, AlertCircle } from "lucide-react";
import { realSigningRequestService } from "../../services/real/signing-request.service";
import { ApiError } from "../../services/api-client";
import { dateOfDeadline, deadlineFromDate, formatDeadline, todayInManila } from "../../services/prepare/deadline";
import { Z } from "../../utils/z-index";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SLATE = "#64748B";
const AZURE = "#0078D4";
const DANGER = "#C0392B";

export interface ExpirationDialogProps {
  workspaceId: string;
  signingRequestId: string;
  documentTitle: string;
  /** The current deadline, or null when none is set. */
  expiresAt: string | null;
  onClose: () => void;
  /** Called with the saved deadline (null when removed). */
  onSaved: (expiresAt: string | null) => void;
}

export function ExpirationDialog({
  workspaceId, signingRequestId, documentTitle, expiresAt, onClose, onSaved,
}: ExpirationDialogProps) {
  const dateId = useId();
  const [date, setDate] = useState(() => dateOfDeadline(expiresAt));
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && busy === null) onClose(); }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); };
  }, [onClose, busy]);

  async function apply(next: string | null, kind: "save" | "remove") {
    setBusy(kind);
    setError(null);
    try {
      const saved = await realSigningRequestService.setExpiry(workspaceId, signingRequestId, next);
      onSaved(saved.expiresAt);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status !== 0
        ? cause.message
        : "The expiration could not be saved. Check your connection and try again.");
      setBusy(null);
    }
  }

  function save() {
    const deadline = deadlineFromDate(date);
    if (deadline === null) { setError("Choose a date."); return; }
    if (Date.parse(deadline) <= Date.now()) { setError("Choose today or a later date."); return; }
    void apply(deadline, "save");
  }

  const button: CSSProperties = {
    ...GF, fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "9px 14px",
    cursor: busy === null ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 6,
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Expiration for ${documentTitle}`}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", alignItems: "center",
        justifyContent: "center", background: "rgba(7,17,31,0.55)", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget && busy === null) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, width: "min(440px, 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
              <CalendarClock size={16} aria-hidden style={{ color: AZURE }} /> Expiration
            </h2>
            <p title={documentTitle} style={{ ...GF, fontSize: 12, color: SLATE, margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {documentTitle}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy !== null} aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, padding: 2, flexShrink: 0 }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px", lineHeight: 1.55 }}>
            {expiresAt === null
              ? "This document has no expiration. It waits until it is signed."
              : <>Signing closes at the end of <strong style={{ color: NAVY }}>{formatDeadline(expiresAt)}</strong>, Philippine time.</>}
            {" "}When a date passes, anyone who has not acted can no longer sign, and you and the participants are emailed.
          </p>

          <label htmlFor={dateId} style={{ ...GF, display: "block", fontSize: 12.5, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
            Signing closes at the end of
          </label>
          <input
            id={dateId} type="date" value={date} min={todayInManila()} disabled={busy !== null}
            onChange={e => { setDate(e.target.value); setError(null); }}
            style={{ ...GF, width: "100%", boxSizing: "border-box", fontSize: 14, color: NAVY, padding: "9px 10px", borderRadius: 8, border: "1px solid #CBD5E1" }}
          />

          {error !== null && (
            <p role="alert" style={{ ...GF, display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12.5, color: DANGER, margin: "10px 0 0" }}>
              <AlertCircle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} /> {error}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginTop: 18 }}>
            {expiresAt !== null
              ? (
                <button type="button" disabled={busy !== null} onClick={() => { void apply(null, "remove"); }}
                  style={{ ...button, background: "#fff", color: DANGER, border: "1px solid #F1C4BE" }}>
                  {busy === "remove" && <Loader2 size={14} aria-hidden className="animate-spin" />} Remove expiration
                </button>
              )
              : <span />}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button type="button" disabled={busy !== null} onClick={onClose}
                style={{ ...button, background: "#fff", color: NAVY, border: "1px solid #CBD5E1" }}>
                Cancel
              </button>
              <button type="button" disabled={busy !== null || date === ""} onClick={save}
                style={{ ...button, background: AZURE, color: "#fff", border: `1px solid ${AZURE}`, opacity: date === "" ? 0.6 : 1 }}>
                {busy === "save" && <Loader2 size={14} aria-hidden className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
