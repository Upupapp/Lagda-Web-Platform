// A "Continue" / "Cancel" confirmation for the destructive sharing actions.
// Focus starts on Cancel (the safe choice); a failure is shown in place and
// the dialog stays open so it can be retried or cancelled.

import { useState, type ReactNode } from "react";
import { ModalFrame, modalButtonStyle } from "../contact-requests/ModalFrame";
import { GF, NAVY, SharingNotice } from "./SharingPrimitives";

export function ConfirmDialog({ title, subtitle, children, confirmLabel = "Continue", busyLabel = "Working…", onConfirm, onClose }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  confirmLabel?: string;
  busyLabel?: string;
  /** Resolve to close; resolve to a string to show it as an error and stay open. */
  onConfirm: () => Promise<string | null | void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await onConfirm();
    if (typeof result === "string") { setError(result); setBusy(false); return; }
    onClose();
  }

  return (
    <ModalFrame title={title} subtitle={subtitle} onClose={onClose} busy={busy} width={460}
      footer={<>
        <button type="button" data-autofocus onClick={onClose} disabled={busy} style={modalButtonStyle("secondary", busy)}>Cancel</button>
        <button type="button" onClick={() => { void confirm(); }} disabled={busy} style={modalButtonStyle("danger", busy)}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </>}>
      <div style={{ ...GF, fontSize: 14, color: NAVY, lineHeight: 1.6, overflowWrap: "anywhere", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>{children}</div>
        {error && <div role="alert"><SharingNotice tone="error">{error}</SharingNotice></div>}
      </div>
    </ModalFrame>
  );
}
