// Decline request page.
// Available only when request.canDecline === true.
// No decline notice is transmitted. This is a demonstration outcome only.

import React from "react";
import { useRecipient } from "../../context/RecipientContext";
import { DECLINE_REASON_CATEGORIES } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";
const RED    = "#C0392B";

export function DeclinePage() {
  const {
    request, state, setStep,
    setDeclineReason, setDeclineNote, submitDecline,
  } = useRecipient();

  if (!request) return null;

  const canSubmit = state.declineReasonId !== "";

  return (
    <div style={{ ...GF, display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100dvh - 102px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 500, width: "100%" }}>
        {/* Back */}
        <button
          onClick={() => setStep("review")}
          style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: AZURE, fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 20 }}
        >
          ← Back to Document
        </button>

        <div style={{ background: WHITE, borderRadius: 14, border: "1px solid #E3E8EF", padding: "32px" }}>
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div
              aria-hidden="true"
              style={{ fontSize: 32, marginBottom: 12 }}
            >
              ✖
            </div>
            <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
              Decline Document Request
            </h1>
            <p style={{ ...GF, fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.65 }}>
              You are about to decline this document request. Select a reason below.
            </p>
          </div>

          {/* Transaction summary */}
          <div style={{
            background: "#F5F7FA", borderRadius: 7, padding: "10px 14px", marginBottom: 20,
            fontSize: 13, color: NAVY, borderLeft: `3px solid ${RED}`,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{request.transactionTitle}</div>
            <div style={{ fontSize: 11, color: SILVER }}>{request.senderWorkspaceDisplayName}</div>
          </div>

          {/* Reason selection */}
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px" }}>
            <legend style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "block" }}>
              Reason for Declining (required)
            </legend>
            {DECLINE_REASON_CATEGORIES.map(r => (
              <label
                key={r.id}
                style={{
                  display:      "flex",
                  alignItems:   "flex-start",
                  gap:          8,
                  cursor:       "pointer",
                  padding:      "8px 0",
                  borderBottom: "1px solid #F0F2F5",
                  fontSize:     13,
                  color:        NAVY,
                }}
              >
                <input
                  type="radio"
                  name="decline-reason"
                  value={r.id}
                  checked={state.declineReasonId === r.id}
                  onChange={() => setDeclineReason(r.id)}
                  style={{ marginTop: 2, accentColor: RED }}
                />
                {r.label}
              </label>
            ))}
          </fieldset>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="decline-note" style={{ ...GF, display: "block", fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Additional Notes (optional)
            </label>
            <textarea
              id="decline-note"
              rows={3}
              value={state.declineNote}
              onChange={e => setDeclineNote(e.target.value)}
              placeholder="Describe why you are declining this request…"
              style={{
                ...GF,
                display: "block", width: "100%", padding: "8px 10px",
                fontSize: 13, borderRadius: 7, border: "1px solid #D1D9E0",
                outline: "none", boxSizing: "border-box", resize: "vertical", color: NAVY,
              }}
            />
          </div>

          {/* Disclosure */}
          <div style={{ background: "#FFF5F5", border: "1px solid #F5C6CB", borderRadius: 7, padding: "10px 14px", marginBottom: 20 }}>
            <p style={{ ...GF, fontSize: 11, color: RED, margin: 0, lineHeight: 1.6 }}>
              <strong>Confirm this frontend demonstration outcome.</strong> No decline or rejection notice will be
              sent to the sender. No transaction update will occur. No data will be persisted.
              This decline is a simulation result only.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep("review")}
              style={{
                ...GF, padding: "11px 16px", borderRadius: 8, border: "1px solid #D1D9E0",
                background: WHITE, color: SILVER, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              disabled={!canSubmit}
              onClick={submitDecline}
              style={{
                ...GF,
                flex:       1,
                padding:    "11px 16px",
                borderRadius: 8,
                border:     "none",
                background: canSubmit ? RED : "#E8A0A0",
                color:      WHITE,
                fontSize:   14,
                fontWeight: 700,
                cursor:     canSubmit ? "pointer" : "not-allowed",
              }}
            >
              Decline Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
