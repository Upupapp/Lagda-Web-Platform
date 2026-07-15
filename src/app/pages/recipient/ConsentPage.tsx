// Electronic consent / disclosure page.
// The checkbox is never pre-selected. User must actively opt in.
// No consent data is persisted. Burgundy is never used here.

import React, { useState } from "react";
import { useRecipient } from "../../context/RecipientContext";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";

export function ConsentPage() {
  const { request, acceptConsentAction, setStep } = useRecipient();
  const [checked, setChecked] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!request) return null;

  function handleAccept() {
    if (!checked) { setAttempted(true); return; }
    acceptConsentAction();
  }

  return (
    <div
      style={{
        ...GF,
        display:         "flex",
        alignItems:      "flex-start",
        justifyContent:  "center",
        minHeight:       "calc(100dvh - 102px)",
        padding:         "40px 20px",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        {/* Back */}
        <button
          onClick={() => setStep("access")}
          style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: AZURE, fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 20 }}
        >
          ← Back
        </button>

        <div
          style={{
            background:   WHITE,
            borderRadius: 14,
            border:       "1px solid #E3E8EF",
            padding:      "36px",
          }}
        >
          <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
            Electronic Disclosure and Consent
          </h1>
          <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 24px", lineHeight: 1.6 }}>
            Before you proceed, please review and agree to the following disclosure.
          </p>

          {/* Disclosure body */}
          <div
            style={{
              background:   "#F5F7FA",
              borderRadius: 9,
              border:       "1px solid #E3E8EF",
              padding:      "18px 20px",
              fontSize:     13,
              color:        NAVY,
              lineHeight:   1.75,
              marginBottom: 24,
              maxHeight:    300,
              overflowY:    "auto",
            }}
            tabIndex={0}
            aria-label="Consent disclosure text"
          >
            <p style={{ margin: "0 0 12px", fontWeight: 700 }}>Electronic Signature Disclosure</p>
            <p style={{ margin: "0 0 10px" }}>
              By clicking "I Agree and Continue" below, you agree to use electronic signatures and
              electronic records for this transaction, and to conduct this transaction electronically.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Your right to paper documents:</strong> You may request a paper copy of any
              documents presented to you for signature. Paper copies may be requested by contacting
              the sender workspace directly.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>System requirements:</strong> To receive and retain electronic documents, you
              need a device with internet access and a browser capable of displaying PDF-format
              documents. You may retain copies by printing or saving to your own device.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Withdrawal of consent:</strong> You may decline to use electronic signatures
              by choosing "Decline" on any step of this process. Withdrawal does not affect the
              validity of any prior electronic signatures.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <strong>Data handling:</strong> During this session, your responses and signature
              are held in memory only. No data is written to your device's local storage.
            </p>
            <p style={{ margin: 0, fontStyle: "italic", color: SILVER }}>
              This disclosure is provided for demonstration purposes only. No legally binding
              electronic signature transaction is created by participating in this demonstration.
            </p>
          </div>

          {/* Checkbox */}
          <label
            htmlFor="consent-checkbox"
            style={{
              display:       "flex",
              alignItems:    "flex-start",
              gap:           10,
              cursor:        "pointer",
              marginBottom:  6,
            }}
          >
            <input
              id="consent-checkbox"
              type="checkbox"
              checked={checked}
              onChange={e => { setChecked(e.target.checked); setAttempted(false); }}
              style={{
                width:    18,
                height:   18,
                marginTop: 2,
                cursor:   "pointer",
                accentColor: AZURE,
                flexShrink: 0,
              }}
            />
            <span style={{ ...GF, fontSize: 13, color: NAVY, lineHeight: 1.6 }}>
              I have read and agree to use electronic records and signatures for this transaction.
            </span>
          </label>

          {/* Validation message */}
          {attempted && !checked && (
            <p role="alert" style={{ ...GF, fontSize: 12, color: "#C0392B", margin: "4px 0 0 28px" }}>
              You must check this box to continue.
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            <button
              onClick={handleAccept}
              style={{
                ...GF,
                flex:         "1 1 200px",
                padding:      "12px 20px",
                borderRadius: 8,
                border:       "none",
                background:   checked ? AZURE : "#8AB8D8",
                color:        WHITE,
                fontSize:     14,
                fontWeight:   700,
                cursor:       "pointer",
              }}
            >
              I Agree and Continue →
            </button>
            <button
              onClick={() => setStep("declined")}
              style={{
                ...GF,
                padding:      "12px 16px",
                borderRadius: 8,
                border:       "1px solid #D1D9E0",
                background:   WHITE,
                color:        SILVER,
                fontSize:     13,
                fontWeight:   600,
                cursor:       "pointer",
              }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
