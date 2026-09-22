// Confirming the deletion of a template.
//
// ── Why a typed confirmation rather than a yes/no ──────────────────────────
//
// Deleting a template is irreversible and the backend keeps no tombstone: the
// row is gone, and with it the role slots and routing somebody authored. A
// single "Are you sure?" is dismissed reflexively — the muscle memory is to
// click the blue button.
//
// So the destructive control stays disabled until the template's NAME has
// been typed. That is deliberately slower. It is the one interaction on this
// page where slowing the person down is the correct design.
//
// ── What deletion does NOT affect ─────────────────────────────────────────
//
// Documents already prepared from this template are untouched. Applying a
// template SNAPSHOTS its participants and routing into the draft — no foreign
// key points at the template, which migration 058 keeps true and an
// integration test asserts against the live catalogue. The dialog says so,
// because "will this cancel the contracts I already sent?" is the first
// question a reasonable person asks.

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Z } from "../../utils/z-index";
import { useViewport } from "../../hooks/useViewport";

const GF = { fontFamily: "'Geist', sans-serif" };
const RED = "#DC2626";

export interface ConfirmDeleteTemplateProps {
  templateName: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteTemplate({
  templateName, busy = false, onCancel, onConfirm,
}: ConfirmDeleteTemplateProps) {
  const { isNarrow } = useViewport();
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Compared trimmed and case-insensitively. Requiring an exact match on
  // capitalisation tests transcription, not intent, and a name ending in a
  // space would be impossible to satisfy.
  const matches = typed.trim().toLowerCase() === templateName.trim().toLowerCase();

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Escape closes, as every dialog should. Not while the delete is in flight:
  // the request has already left and dismissing would imply it was cancelled.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [busy, onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Delete ${templateName}`}
      onClick={() => { if (!busy) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: Z.modalScrim,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: isNarrow ? "flex-end" : "center",
        justifyContent: "center",
        padding: isNarrow ? 0 : 24,
      }}
    >
      <div
        onClick={e => { e.stopPropagation(); }}
        style={{
          position: "relative", zIndex: Z.modal,
          background: "white",
          borderRadius: isNarrow ? "16px 16px 0 0" : 14,
          width: "100%", maxWidth: 460,
          maxHeight: isNarrow ? "92vh" : "88vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          padding: isNarrow ? "18px 18px 24px" : "22px 24px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: "#FEF2F2",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <AlertTriangle size={18} color={RED} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ ...GF, fontSize: 16, fontWeight: 800, color: "#0F172A", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
              Delete this template?
            </h3>
            <p style={{ ...GF, fontSize: 12.5, color: "#64748B", margin: 0, lineHeight: 1.55, wordBreak: "break-word" }}>
              <strong style={{ color: "#0F172A" }}>{templateName}</strong> will be
              removed permanently. This cannot be undone.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            style={{
              background: "none", border: "none", cursor: busy ? "default" : "pointer",
              color: "#94A3B8", width: 32, height: 32, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          ...GF, background: "#F8FAFC", border: "1px solid #E2E8F0",
          borderRadius: 9, padding: "10px 13px", marginBottom: 16,
        }}>
          <p style={{ fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.6 }}>
            Documents already sent using this template are not affected. Each one
            keeps its own copy of the roles and routing.
          </p>
        </div>

        <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>
          Type <strong style={{ color: "#0F172A" }}>{templateName}</strong> to confirm
        </label>
        <input
          ref={inputRef}
          type="text"
          value={typed}
          disabled={busy}
          onChange={e => { setTyped(e.target.value); }}
          onKeyDown={e => { if (e.key === "Enter" && matches && !busy) onConfirm(); }}
          placeholder={templateName}
          style={{
            width: "100%", height: 40, padding: "0 12px",
            border: `1px solid ${typed !== "" && !matches ? "#FECACA" : "#E2E8F0"}`,
            borderRadius: 8, ...GF, fontSize: 13, color: "#0F172A",
            boxSizing: "border-box", outline: "none", marginBottom: 18,
          }}
        />

        <div style={{
          display: "flex", gap: 10,
          flexDirection: isNarrow ? "column-reverse" : "row",
          justifyContent: "flex-end",
        }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              ...GF, padding: "11px 18px", borderRadius: 8,
              background: "#F1F5F9", color: "#0F172A", border: "none",
              fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches || busy}
            style={{
              ...GF, padding: "11px 18px", borderRadius: 8,
              background: matches && !busy ? RED : "#FCA5A5",
              color: "white", border: "none",
              fontSize: 13, fontWeight: 700,
              cursor: matches && !busy ? "pointer" : "default",
            }}
          >
            {busy ? "Deleting…" : "Delete template"}
          </button>
        </div>
      </div>
    </div>
  );
}
