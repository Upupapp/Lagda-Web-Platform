// Declining a request: the notary says why, and the client is shown it. A few common reasons, or one in their own
// words. Used for a request already taken and for one nobody has taken yet (131).

import { useState } from "react";
import { X } from "lucide-react";
import { ActionButton, GF } from "../../../../components/system/design-system";
import { E } from "../EnotaryChrome";

export const DECLINE_REASONS = [
  "The document is outside my notarial jurisdiction.",
  "I do not notarize this kind of document.",
  "I am not available at that time.",
  "I have a conflict of interest in this matter.",
  "The document is incomplete or unclear.",
] as const;
const OTHER = "other";
/** The server keeps at most 120 characters. */
const OTHER_MAX = 120;

export function DeclineReasonPanel({ idBase, who, busy, onDecline, onCancel }: {
  idBase: string; who: string; busy: boolean; onDecline: (reason: string) => void; onCancel: () => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const submit = () => {
    if (choice === null) { setProblem("Choose a reason. The client is shown it."); return; }
    const reason = choice === OTHER ? other.trim() : choice;
    if (reason === "") { setProblem("Write the reason in a few words. The client is shown it."); return; }
    setProblem(null);
    onDecline(reason);
  };
  const option = (value: string, label: string) => (
    <label key={value} style={{ ...GF, display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", border: `1px solid ${choice === value ? E.maroon : E.line}`, borderRadius: 10, background: choice === value ? E.maroonWash : "#FFFFFF", fontSize: 14, color: E.ink, cursor: busy ? "default" : "pointer" }}>
      <input type="radio" name={`${idBase}-reason`} value={value} checked={choice === value} disabled={busy} onChange={() => { setChoice(value); setProblem(null); }} style={{ marginTop: 3 }} />
      <span>{label}</span>
    </label>
  );
  return (
    <div data-testid="decline-panel">
      <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <legend style={{ ...GF, fontSize: 14, fontWeight: 700, color: E.ink, marginBottom: 4 }}>Why are you declining? <span style={{ color: E.maroon }}>(required)</span></legend>
        <p style={{ ...GF, margin: "0 0 10px", fontSize: 13, color: E.quiet }}>{who} is told you declined, with this reason, and can ask another notary.</p>
        <div style={{ display: "grid", gap: 8 }}>
          {DECLINE_REASONS.map(reason => option(reason, reason))}
          {option(OTHER, "Another reason")}
        </div>
        {choice === OTHER && (
          <div style={{ marginTop: 10 }}>
            <label htmlFor={`${idBase}-other`} style={{ ...GF, display: "block", fontSize: 13.5, fontWeight: 700, marginBottom: 6, color: E.ink }}>Your reason</label>
            <input
              id={`${idBase}-other`} value={other} maxLength={OTHER_MAX} disabled={busy} autoFocus
              placeholder="e.g. I can only notarize in person for this document."
              onChange={event => { setOther(event.target.value); setProblem(null); }}
              style={{ ...GF, width: "100%", boxSizing: "border-box", minHeight: 44, padding: "0 12px", border: `1px solid ${E.line}`, borderRadius: 10, fontSize: 14 }}
            />
            <p style={{ ...GF, margin: "4px 0 0", fontSize: 12.5, color: E.quiet }}>{other.length}/{OTHER_MAX} characters</p>
          </div>
        )}
      </fieldset>
      {problem !== null && <p role="alert" style={{ ...GF, margin: "10px 0 0", fontSize: 13.5, fontWeight: 600, color: "#B42318" }}>{problem}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        <ActionButton kind="danger" icon={X} disabled={busy} onClick={submit}>{busy ? "Declining…" : "Decline the request"}</ActionButton>
        <ActionButton kind="secondary" disabled={busy} onClick={onCancel}>Keep it</ActionButton>
      </div>
    </div>
  );
}
