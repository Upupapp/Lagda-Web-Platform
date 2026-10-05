// The Full name input for a participant, with where the name came from.
//
// When the name is the account's (or a contact's) the input is read-only and
// carries an Edit button INSIDE its right edge: no extra row, nothing beside
// it moves, and the form is the same width on a phone. One line of small text
// under the input says where the name came from, and offers the way back after
// an edit.

import { useId, useRef, type CSSProperties } from "react";
import { Pencil } from "lucide-react";
import type { AccountNameAssist } from "../../hooks/useAccountNameAssist";

const GF = { fontFamily: "'Geist', sans-serif" };
const AZURE = "#0078D4";
const NOTE: CSSProperties = { ...GF, fontSize: 11, color: "#64748B", marginTop: 4, lineHeight: 1.45 };

export function ParticipantNameField({ value, onChange, assist, inputStyle, placeholder, invalid, describedBy, id }: {
  value: string;
  onChange: (value: string) => void;
  assist: AccountNameAssist;
  /** The form's own input style: this field must look like its neighbours. */
  inputStyle: CSSProperties;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  id?: string;
}) {
  const noteId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { origin, locked } = assist;

  const unlock = () => {
    assist.edit();
    // After the field is editable again, not before: a read-only input takes
    // focus but shows no caret.
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
  };

  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          readOnly={locked}
          aria-readonly={locked || undefined}
          onChange={e => { onChange(e.target.value); }}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, origin === "manual" ? undefined : noteId].filter(Boolean).join(" ") || undefined}
          style={{
            ...inputStyle,
            ...(locked ? { background: "#F1F5F9", color: "#334155", paddingRight: 40, cursor: "default" } : {}),
          }}
        />
        {locked && (
          <button
            type="button"
            onClick={unlock}
            aria-label="Edit name"
            title="Edit the name for this document"
            style={{
              position: "absolute", top: 1, right: 1, bottom: 1, width: 36,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "none", borderLeft: "1px solid #D1D9E0", borderRadius: "0 6px 6px 0",
              background: "#FFFFFF", color: AZURE, cursor: "pointer", padding: 0,
            }}
          >
            <Pencil size={14} aria-hidden />
          </button>
        )}
      </div>

      {origin === "checking" && <div id={noteId} role="status" style={NOTE}>Checking for a LAGDA account…</div>}
      {origin === "account" && <div id={noteId} style={NOTE}>From their LAGDA account</div>}
      {origin === "contact" && <div id={noteId} style={NOTE}>From your contacts</div>}
      {origin === "no-account" && (
        <div id={noteId} role="status" style={NOTE}>No LAGDA account for this email yet. Enter their full name.</div>
      )}
      {origin === "edited" && (
        <div id={noteId} style={NOTE}>
          Edited for this document.{" "}
          <button
            type="button"
            onClick={assist.revertToAccountName}
            style={{ ...GF, fontSize: 11, color: AZURE, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
          >
            Use account name
          </button>
        </div>
      )}
    </div>
  );
}
