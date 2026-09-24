// Asking a contact for a document (backend 067).
//
// ── What this asks for, and what it cannot know ───────────────────────────
//
// The title is what the requester WANTS — "your signed contract", "the 2026
// permit" — not a document title, because the document does not exist yet.
// That is the whole shape of this feature.
//
// ── The refusal this dialog exists to surface honestly ────────────────────
//
// The backend resolves the contact's address to a workspace MEMBER, because
// fulfilling the request means writing into the workspace and workspace
// writes are authorized by membership. A contact whose address belongs to
// nobody is refused — and that refusal is the most likely outcome for an
// address-book full of external counterparties, so it is shown as the
// actionable sentence the server sends ("invite them first") rather than
// flattened into "something went wrong".
//
// Inline styles only. No Burgundy.

import { useState } from "react";
import { Link } from "react-router";
import { X, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { createUploadRequest } from "../../services/upload-requests-source";
import { ApiError } from "../../services/api-client";
import { Z } from "../../utils/z-index";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#0F172A";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";

const TITLE_MAX = 200;
const NOTE_MAX = 1000;

export interface RequestDocumentDialogProps {
  readonly workspaceId: string | undefined;
  readonly contactId: string;
  readonly contactName: string;
  readonly contactEmail: string;
  readonly onClose: () => void;
}

export function RequestDocumentDialog({
  workspaceId, contactId, contactName, contactEmail, onClose,
}: RequestDocumentDialogProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit = title.trim() !== "" && !busy;

  const handleSubmit = () => {
    if (!canSubmit) return;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        await createUploadRequest(workspaceId, {
          title, note, contactId,
        });
        setSent(true);
      } catch (err) {
        // The server's own sentence where it gave one. For the
        // not-a-member case that sentence names the fix; "something went
        // wrong" would strand the requester with no idea what to do.
        setError(err instanceof ApiError && err.message !== ""
          ? err.message
          : "The request could not be sent. Please try again.");
      } finally {
        setBusy(false);
      }
    })();
  };

  const field: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: `1px solid ${BORDER}`,
    borderRadius: 8, ...GF, fontSize: 13, color: NAVY, background: "white",
    boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.45)", zIndex: Z.dropdown }}
      />
      <div
        role="dialog"
        aria-modal
        aria-label={`Request a document from ${contactName}`}
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "calc(100% - 32px)", maxWidth: 460, background: "white",
          borderRadius: 12, border: `1px solid ${BORDER}`,
          boxShadow: "0 24px 64px rgba(7,17,31,0.28)", zIndex: Z.dropdown + 1,
          display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 64px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <h2 style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: 0, flex: 1 }}>
            {sent ? "Request sent" : "Request a document"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, padding: 4, display: "flex" }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto" }}>
          {sent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <CheckCircle2 size={16} color="#047857" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ ...GF, fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.6 }}>
                  {contactName} has been emailed and will see this in their
                  Document Requests.
                </p>
              </div>
              <Link
                to="/app/upload-requests"
                onClick={onClose}
                style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none", fontWeight: 600 }}
              >
                View document requests →
              </Link>
            </div>
          ) : (
            <>
              <p style={{ ...GF, fontSize: 12.5, color: SLATE, margin: "0 0 14px", lineHeight: 1.6 }}>
                {contactName} ({contactEmail}) will be emailed and asked to
                upload it. They must already be a member of this workspace.
              </p>

              {error !== null && (
                <div style={{ display: "flex", gap: 8, marginBottom: 14, padding: "10px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 }}>
                  <AlertCircle size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ ...GF, fontSize: 12.5, color: "#B91C1C", margin: 0, lineHeight: 1.55 }}>{error}</p>
                </div>
              )}

              <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                What do you need?
              </label>
              <input
                type="text"
                value={title}
                maxLength={TITLE_MAX}
                onChange={e => { setTitle(e.target.value); }}
                placeholder="e.g. Your signed employment contract"
                style={{ ...field, height: 38, marginBottom: 14 }}
              />

              <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: SLATE, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Note <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={note}
                rows={3}
                maxLength={NOTE_MAX}
                onChange={e => { setNote(e.target.value); }}
                placeholder="Which year, which format, where to find it…"
                style={{ ...field, resize: "vertical" }}
              />
            </>
          )}
        </div>

        {!sent && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: `1px solid ${BORDER}` }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{ ...GF, fontSize: 13, fontWeight: 600, color: SLATE, background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 16px", cursor: busy ? "default" : "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                ...GF, fontSize: 13, fontWeight: 700, color: "white",
                background: canSubmit ? AZURE : "#93C5FD", border: "none",
                borderRadius: 8, padding: "8px 16px",
                cursor: canSubmit ? "pointer" : "default",
              }}
            >
              <Send size={13} />
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
