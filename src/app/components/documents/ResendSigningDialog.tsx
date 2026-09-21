// Send this document out for signing again.
//
// ── What the sender needs to understand before pressing send ─────────────
//
// This is not "resend the same email". It creates a NEW signing request over
// the same document, with its own audit trail, and it repoints the document's
// recipient list at the addresses typed here. The original request keeps its
// own snapshot and stays exactly as it was.
//
// Both of those are stated on the panel rather than buried here, because the
// consequence lands on people outside the product: an email goes to every
// address in that box, immediately, containing a link that can sign a legal
// document. There is no undo and no preview step.

import { useState, type CSSProperties } from "react";
import { X, Send, AlertCircle, Loader2 } from "lucide-react";
import {
  resendSigningService, parseRecipients, looksLikeEmail, MAX_RESEND_RECIPIENTS,
} from "../../services/real/resend-signing.service";
import { Z } from "../../utils/z-index";

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SLATE = "#64748B";
const SILVER = "#8A9BAE";
const AZURE = "#0078D4";
const DANGER = "#C0392B";

export function ResendSigningDialog({
  workspaceId, documentId, documentTitle, onClose, onSent,
}: {
  workspaceId: string;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  onSent: (signingRequestId: string, sentTo: number) => void;
}) {
  const [raw, setRaw] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addresses = parseRecipients(raw);
  const invalid = addresses.filter(a => !looksLikeEmail(a));
  const overLimit = addresses.length > MAX_RESEND_RECIPIENTS;
  const canSend = addresses.length > 0 && invalid.length === 0 && !overLimit && !sending;

  const submit = () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    void (async () => {
      try {
        const result = await resendSigningService.resend(
          workspaceId, documentId,
          addresses.map(email => ({ name: "", email })),
        );
        onSent(result.signingRequestId, result.sentTo);
      } catch (err) {
        // The sequence mutates the document before it sends, so a failure
        // partway is possible and the message must not imply nothing
        // happened. It says what to check rather than "try again".
        setError(err instanceof Error && err.message.length > 0
          ? err.message
          : "That could not be sent. Check the document's recipients before trying again.");
        setSending(false);
      }
    })();
  };

  return (
    <>
      <div
        onClick={sending ? undefined : onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.45)", zIndex: Z.drawerScrim }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Send ${documentTitle} for signing again`}
        style={{
          position: "fixed", zIndex: Z.drawer,
          left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: "min(560px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 32px)", overflowY: "auto",
          background: "#FFFFFF", borderRadius: 14,
          boxShadow: "0 24px 60px rgba(7,17,31,0.28)",
        }}
      >
        <header style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, padding: "16px 18px 12px", borderBottom: "1px solid #E3E8EF",
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 800, color: NAVY }}>
              Send for signing again
            </h2>
            <p style={{
              ...GF, margin: "3px 0 0", fontSize: 12, color: SILVER,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            style={{
              ...GF, border: "none", background: "none", cursor: sending ? "not-allowed" : "pointer",
              color: SILVER, padding: 4, lineHeight: 0,
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div style={{ padding: "14px 18px" }}>
          <label
            htmlFor="resend-emails"
            style={{ ...GF, display: "block", fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 6 }}
          >
            Email addresses
          </label>
          <textarea
            id="resend-emails"
            value={raw}
            disabled={sending}
            onChange={e => { setRaw(e.target.value); }}
            rows={4}
            placeholder={"name@example.com, another@example.com\nor one per line"}
            style={{
              ...GF, width: "100%", boxSizing: "border-box", padding: "10px 12px",
              borderRadius: 8, border: "1px solid #D1D9E0", fontSize: 13,
              color: NAVY, resize: "vertical", lineHeight: 1.5,
            }}
          />
          <p style={{ ...GF, margin: "6px 0 0", fontSize: 11.5, color: SILVER, lineHeight: 1.5 }}>
            Separate with commas, semicolons, spaces or new lines. Up to{" "}
            {MAX_RESEND_RECIPIENTS}.
          </p>

          {addresses.length > 0 && invalid.length === 0 && !overLimit && (
            <p role="status" style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: SLATE }}>
              {addresses.length === 1
                ? "1 recipient will be emailed a signing link."
                : `${addresses.length} recipients will each be emailed a signing link.`}
            </p>
          )}

          {invalid.length > 0 && (
            <p role="alert" style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: DANGER, lineHeight: 1.5 }}>
              {/* Names the offenders rather than saying "invalid email", so a
                  long paste does not have to be re-read line by line. */}
              Not valid email addresses: {invalid.join(", ")}
            </p>
          )}

          {overLimit && (
            <p role="alert" style={{ ...GF, margin: "8px 0 0", fontSize: 12, color: DANGER }}>
              {addresses.length} addresses — the limit for one send is {MAX_RESEND_RECIPIENTS}.
            </p>
          )}

          {/* Said before sending, not after. Both consequences reach outside
              the product, and neither can be undone. */}
          <div style={{
            marginTop: 14, padding: "10px 12px", borderRadius: 8,
            background: "#FFF8E6", border: "1px solid #EBD9A6",
          }}>
            <p style={{ ...GF, margin: 0, fontSize: 11.5, color: "#7A5B00", lineHeight: 1.6 }}>
              This creates a <strong>new signing request</strong> with its own audit
              trail. The original stays exactly as it is. The document&rsquo;s current
              recipient list is replaced by the addresses above, and emails are sent
              immediately.
            </p>
          </div>

          {error !== null && (
            <p role="alert" style={{
              ...GF, margin: "12px 0 0", display: "flex", gap: 6, alignItems: "flex-start",
              fontSize: 12, color: DANGER, lineHeight: 1.5,
            }}>
              <AlertCircle size={14} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </p>
          )}
        </div>

        <footer style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          padding: "12px 18px 16px", borderTop: "1px solid #F1F5F9",
        }}>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              ...GF, minHeight: 38, padding: "0 16px", borderRadius: 8,
              border: "1px solid #D1D9E0", background: "#FFFFFF", color: NAVY,
              fontSize: 13, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSend}
            style={{
              ...GF, minHeight: 38, padding: "0 18px", borderRadius: 8, border: "none",
              background: canSend ? AZURE : "#9DBBD6", color: "#FFFFFF",
              fontSize: 13, fontWeight: 700, cursor: canSend ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", gap: 7,
            }}
          >
            {sending
              ? <><Loader2 size={14} aria-hidden /> Sending…</>
              : <><Send size={14} aria-hidden /> Send links</>}
          </button>
        </footer>
      </div>
    </>
  );
}
