// Reject an invitation — the reason is REQUIRED (1–500 characters) and is
// passed to the workspace that sent it. A failure is shown in place and the
// dialog stays open so it can be retried or cancelled.

import { useId, useState } from "react";
import { Ban } from "lucide-react";
import { ModalFrame, modalButtonStyle } from "../../../components/contact-requests/ModalFrame";
import { SharingNotice } from "../../../components/document-sharing/SharingPrimitives";
import {
  DECLINE_REASON_MAX, DECLINE_REASON_MIN, invitationErrorMessage, myInvitationsService, type MyInvitation,
} from "../../../services/real/my-invitations.service";
import { invitationSubject } from "./InvitationLetter";
import { withProcess } from "../../../config/process-screens";

const GF = { fontFamily: "'Geist', sans-serif" } as const;
const NAVY = "#07111F";
const SLATE = "#475569";

export function DeclineInvitationDialog({ item, onClose, onDeclined }: {
  item: MyInvitation; onClose: () => void; onDeclined: () => void;
}) {
  const ids = { field: useId(), counter: useId(), hint: useId(), error: useId() };
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = reason.trim();
  const valid = trimmed.length >= DECLINE_REASON_MIN && trimmed.length <= DECLINE_REASON_MAX;
  const fieldError = touched && !valid
    ? (trimmed.length === 0 ? "Enter a reason for rejecting this invitation." : `Keep the reason to ${String(DECLINE_REASON_MAX)} characters or fewer.`)
    : null;

  const submit = () => {
    setTouched(true);
    if (busy || !valid) return;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        await withProcess("invitation-decline", "", () => myInvitationsService.decline(item.invitationId, trimmed));
        onDeclined();
        onClose();
      } catch (err) {
        setError(invitationErrorMessage(err, "decline"));
        setBusy(false);
      }
    })();
  };

  const inviter = item.invitedBy?.displayName;
  const describedBy = [ids.hint, ids.counter, fieldError ? ids.error : null].filter(Boolean).join(" ");

  return (
    <ModalFrame title="Reject this invitation" subtitle={invitationSubject(item)} onClose={onClose} busy={busy} width={500}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} style={modalButtonStyle("secondary", busy)}>Cancel</button>
        <button type="submit" form={ids.field + "-form"} disabled={busy} style={modalButtonStyle("danger", busy)}>
          <Ban size={14} aria-hidden /> {busy ? "Rejecting…" : "Reject invitation"}
        </button>
      </>}>
      <form id={ids.field + "-form"} noValidate onSubmit={event => { event.preventDefault(); submit(); }}>
        <p style={{ ...GF, fontSize: 13.5, color: "#1E293B", margin: "0 0 12px", lineHeight: 1.55 }}>
          {inviter ? <>{inviter} and </> : null}<strong>{item.workspaceName}</strong> will see that you rejected this invitation, together with your reason.
          You can withdraw the rejection later while the invitation is still valid.
        </p>
        {error && <div role="alert" style={{ marginBottom: 12 }}><SharingNotice tone="error">{error}</SharingNotice></div>}
        <label htmlFor={ids.field} style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
          Reason for rejecting <span style={{ fontWeight: 500, color: "#991B1B" }}>(required)</span>
        </label>
        <textarea
          id={ids.field} data-autofocus value={reason} maxLength={DECLINE_REASON_MAX} rows={4}
          required aria-required="true" aria-invalid={fieldError ? true : undefined} aria-describedby={describedBy}
          onChange={event => { setReason(event.target.value); }}
          onBlur={() => { if (reason !== "") setTouched(true); }}
          style={{
            ...GF, width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, fontSize: 14, color: NAVY,
            border: `1px solid ${fieldError ? "#DC2626" : "#94A3B8"}`, resize: "vertical", minHeight: 96,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <p id={ids.hint} style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>
            Between {DECLINE_REASON_MIN} and {DECLINE_REASON_MAX} characters.
          </p>
          <p id={ids.counter} data-testid="decline-reason-counter" style={{ ...GF, fontSize: 12, color: reason.length >= DECLINE_REASON_MAX ? "#991B1B" : SLATE, margin: 0 }}>
            {reason.length}/{DECLINE_REASON_MAX}
          </p>
        </div>
        {fieldError && <p id={ids.error} role="alert" style={{ ...GF, fontSize: 12.5, color: "#B91C1C", margin: "6px 0 0" }}>{fieldError}</p>}
      </form>
    </ModalFrame>
  );
}
