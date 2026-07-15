// Auth challenge page — email-code / invitation-access / etc.
// The demo accepts: 000000, 123456, 111111.
// No real OTP is sent. No backend call. In-memory only.

import React, { useRef } from "react";
import { useRecipient } from "../../context/RecipientContext";
import { AUTH_METHOD_LABELS } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";
const RED    = "#C0392B";

const AUTH_STATE_MESSAGES: Record<string, string> = {
  "invalid-code":     "The code you entered is incorrect. Please try again.",
  "expired":          "This code has expired in the demonstration. Please try again.",
  "too-many-attempts":"Too many incorrect attempts. Please contact the document sender.",
};

export function AuthChallengePage() {
  const { request, state, setAuthCode, submitAuth, setStep } = useRecipient();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!request) return null;

  const authMethod     = request.participant.authMethod;
  const authMethodLabel= AUTH_METHOD_LABELS[authMethod];
  const authState      = state.authState;
  const isBlocked      = authState === "too-many-attempts";
  const errorMessage   = AUTH_STATE_MESSAGES[authState] ?? null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBlocked) return;
    submitAuth();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isBlocked) submitAuth();
    }
  }

  return (
    <div
      style={{
        ...GF,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        minHeight:       "calc(100dvh - 102px)",
        padding:         "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth:     460,
          width:        "100%",
          background:   WHITE,
          borderRadius: 14,
          border:       "1px solid #E3E8EF",
          padding:      "36px",
        }}
      >
        {/* Back */}
        <button
          onClick={() => setStep("access")}
          style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: AZURE, fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 20 }}
        >
          ← Back
        </button>

        {/* Heading */}
        <h1
          style={{
            ...GF,
            fontSize:     20,
            fontWeight:   800,
            color:        NAVY,
            margin:       "0 0 6px",
          }}
        >
          Verify your identity
        </h1>

        <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 24px", lineHeight: 1.6 }}>
          {authMethodLabel} — enter the 6-digit code sent to your address to continue.
        </p>

        {/* Demo hint */}
        <div
          style={{
            background:   "#F0FAF4",
            border:       "1px solid #A8D5B5",
            borderRadius: 7,
            padding:      "9px 12px",
            marginBottom: 20,
            fontSize:     12,
            color:        "#2E7D32",
          }}
        >
          <strong>Demo:</strong> Enter <code style={{ background: "#E0F0E8", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace" }}>000000</code>, <code style={{ background: "#E0F0E8", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace" }}>123456</code>, or <code style={{ background: "#E0F0E8", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace" }}>111111</code> to pass. No real code was sent.
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              background:   "#FFF5F5",
              border:       "1px solid #F5C6CB",
              borderRadius: 7,
              padding:      "9px 12px",
              marginBottom: 16,
              fontSize:     13,
              color:        RED,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <label
            htmlFor="auth-code"
            style={{ ...GF, display: "block", fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 6 }}
          >
            Verification Code
          </label>
          <input
            id="auth-code"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={state.authCode}
            onChange={e => setAuthCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={handleKeyDown}
            disabled={isBlocked}
            aria-describedby={errorMessage ? "auth-error" : undefined}
            placeholder="000000"
            style={{
              ...GF,
              display:      "block",
              width:        "100%",
              padding:      "11px 14px",
              fontSize:     22,
              fontFamily:   "monospace",
              letterSpacing: "0.25em",
              borderRadius: 8,
              border:       `1px solid ${authState === "invalid-code" ? RED : "#D1D9E0"}`,
              outline:      "none",
              boxSizing:    "border-box",
              marginBottom: 16,
              textAlign:    "center",
              color:        NAVY,
              background:   isBlocked ? "#F5F7FA" : WHITE,
            }}
          />

          <button
            type="submit"
            disabled={isBlocked || state.authCode.length < 1}
            style={{
              ...GF,
              width:        "100%",
              padding:      "12px 20px",
              borderRadius: 8,
              border:       "none",
              background:   (isBlocked || state.authCode.length < 1) ? "#8AB8D8" : AZURE,
              color:        WHITE,
              fontSize:     14,
              fontWeight:   700,
              cursor:       (isBlocked || state.authCode.length < 1) ? "not-allowed" : "pointer",
            }}
          >
            Verify
          </button>
        </form>

        {/* Privacy note */}
        <p style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 16, lineHeight: 1.6 }}>
          This code is used for demonstration purposes only. No authentication data is stored or transmitted.
        </p>
      </div>
    </div>
  );
}
