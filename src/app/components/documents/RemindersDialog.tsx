import { useModalFocus } from "../../hooks/useModalFocus";
// Switch a sent document's reminders on or off, or change their days (111).
//
// Opened from the same line of the Sent card as the expiration. The server
// takes a change only while the document is out for signature and before its
// deadline; it answers anything else with a code, and each code has its own
// sentence here (signing-progress-copy.ts), never the server's own text.
//
// The current settings are read from the participants view, which is the
// only place the server reports them; the list row does not carry them.

import { useRef, useEffect, useId, useState, type CSSProperties } from "react";
import { X, BellRing, Loader2, AlertCircle } from "lucide-react";
import {
  realSigningRequestService, REMINDER_DEFAULTS, REMINDER_DAYS_MIN, REMINDER_DAYS_MAX,
  type ReminderSettings,
} from "../../services/real/signing-request.service";
import { REMINDER_RULE, describeReminderSettingsError } from "./signing-progress-copy";
import { Z } from "../../utils/z-index";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SLATE = "#64748B";
const AZURE = "#0078D4";
const DANGER = "#C0392B";

export interface RemindersDialogProps {
  workspaceId: string;
  signingRequestId: string;
  documentTitle: string;
  onClose: () => void;
  /** Called with what the server saved. */
  onSaved: (reminders: ReminderSettings) => void;
}

const clampDays = (n: number) => Math.max(REMINDER_DAYS_MIN, Math.min(REMINDER_DAYS_MAX, Math.round(n)));

export function RemindersDialog({
  workspaceId, signingRequestId, documentTitle, onClose, onSaved,
}: RemindersDialogProps) {
  const firstId = useId();
  const everyId = useId();
  const enabledId = useId();
  // Null until read. A request that does not report them is read as the
  // server's defaults — what it was sent with, unless it predates reminders.
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void realSigningRequestService.signatures(workspaceId, signingRequestId)
      .then(result => {
        if (cancelled) return;
        const r = result.reminders;
        setSettings(r === undefined ? REMINDER_DEFAULTS
          : { enabled: r.enabled, firstAfterDays: r.firstAfterDays, everyDays: r.everyDays });
      })
      .catch(() => { if (!cancelled) setError("The current reminder settings could not be loaded. Close this and try again."); });
    return () => { cancelled = true; };
  }, [workspaceId, signingRequestId]);

  useModalFocus(dialogRef, onClose, busy);

  async function save() {
    if (settings === null) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await realSigningRequestService.setReminders(workspaceId, signingRequestId, settings);
      onSaved(saved.reminders);
    } catch (cause) {
      setError(describeReminderSettingsError(cause));
      setBusy(false);
    }
  }

  const button: CSSProperties = {
    ...GF, fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "9px 14px",
    cursor: busy ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  };
  const input: CSSProperties = {
    ...GF, width: 70, fontSize: 14, color: NAVY, padding: "7px 9px", borderRadius: 8, border: "1px solid #CBD5E1", textAlign: "right",
  };
  const off = settings !== null && !settings.enabled;

  return (
    <div
      ref={dialogRef} tabIndex={-1} className="platform-task-dialog" role="dialog" aria-modal="true" aria-label={`Reminders for ${documentTitle}`}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", alignItems: "center",
        justifyContent: "center", background: "rgba(7,17,31,0.55)", padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 12, width: "min(440px, 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
              <BellRing size={16} aria-hidden style={{ color: AZURE }} /> Reminders
            </h2>
            <p title={documentTitle} style={{ ...GF, fontSize: 12, color: SLATE, margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {documentTitle}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, padding: 2, flexShrink: 0 }}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          {settings === null && error === null && (
            <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Loading…</p>
          )}
          {settings !== null && (
            <>
              <label htmlFor={enabledId} style={{ ...GF, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: NAVY, cursor: "pointer" }}>
                <input id={enabledId} type="checkbox" checked={settings.enabled} disabled={busy}
                  onChange={e => { setSettings({ ...settings, enabled: e.target.checked }); setError(null); }} />
                Remind participants who have not acted
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <label htmlFor={firstId} style={{ ...GF, fontSize: 13, color: off ? SLATE : NAVY, flex: "1 1 180px" }}>First reminder after</label>
                <input id={firstId} type="number" min={REMINDER_DAYS_MIN} max={REMINDER_DAYS_MAX} value={settings.firstAfterDays}
                  disabled={busy || off} style={input}
                  onChange={e => { setSettings({ ...settings, firstAfterDays: clampDays(Number(e.target.value) || REMINDER_DAYS_MIN) }); setError(null); }} />
                <span style={{ ...GF, fontSize: 12, color: SLATE }}>days</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <label htmlFor={everyId} style={{ ...GF, fontSize: 13, color: off ? SLATE : NAVY, flex: "1 1 180px" }}>Then every</label>
                <input id={everyId} type="number" min={REMINDER_DAYS_MIN} max={REMINDER_DAYS_MAX} value={settings.everyDays}
                  disabled={busy || off} style={input}
                  onChange={e => { setSettings({ ...settings, everyDays: clampDays(Number(e.target.value) || REMINDER_DAYS_MIN) }); setError(null); }} />
                <span style={{ ...GF, fontSize: 12, color: SLATE }}>days</span>
              </div>
              <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "12px 0 0", lineHeight: 1.55 }}>
                {REMINDER_RULE} Days count from when it became each participant&apos;s turn.
              </p>
            </>
          )}

          {error !== null && (
            <p role="alert" style={{ ...GF, display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12.5, color: DANGER, margin: "10px 0 0" }}>
              <AlertCircle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} /> {error}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <button type="button" disabled={busy} onClick={onClose}
              style={{ ...button, background: "#fff", color: NAVY, border: "1px solid #CBD5E1" }}>
              Cancel
            </button>
            <button type="button" disabled={busy || settings === null} onClick={() => { void save(); }}
              style={{ ...button, background: AZURE, color: "#fff", border: `1px solid ${AZURE}`, opacity: settings === null ? 0.6 : 1 }}>
              {busy && <Loader2 size={14} aria-hidden className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
