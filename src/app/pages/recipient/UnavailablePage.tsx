// All unavailable/terminal states for the recipient flow.
// Shown for: invalid-link, not-found, expired, cancelled, voided,
// already-actioned, routing-locked, session-ended, service-unavailable, permission-denied.

import React from "react";
import { useRecipient } from "../../context/RecipientContext";
import { UNAVAILABLE_MESSAGES } from "../../models/recipient";
import type { UnavailableReason } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";

const REASON_ICONS: Record<UnavailableReason, string> = {
  "invalid-link":       "🔗",
  "not-found":          "🔍",
  "expired":            "⏰",
  "cancelled":          "✖",
  "voided":             "🚫",
  "already-actioned":   "✓",
  "routing-locked":     "🔒",
  "session-ended":      "🕐",
  "service-unavailable":"⚠",
  "permission-denied":  "🔐",
};

export function UnavailablePage() {
  const { state, loadRequest } = useRecipient();
  const reason = state.unavailableReason ?? "service-unavailable";
  const info   = UNAVAILABLE_MESSAGES[reason];
  const icon   = REASON_ICONS[reason];

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
      role="main"
    >
      <div
        style={{
          maxWidth:     480,
          width:        "100%",
          background:   "#FFFFFF",
          borderRadius: 14,
          border:       "1px solid #E3E8EF",
          padding:      "40px 36px",
          textAlign:    "center",
        }}
      >
        {/* Icon */}
        <div
          aria-hidden="true"
          style={{
            fontSize:     40,
            marginBottom: 20,
          }}
        >
          {icon}
        </div>

        {/* Heading */}
        <h1
          style={{
            ...GF,
            fontSize:     22,
            fontWeight:   800,
            color:        NAVY,
            margin:       "0 0 10px",
            lineHeight:   1.25,
          }}
        >
          {info.heading}
        </h1>

        {/* Body */}
        <p
          style={{
            ...GF,
            fontSize:     14,
            color:        SILVER,
            margin:       "0 0 28px",
            lineHeight:   1.65,
          }}
        >
          {info.body}
        </p>

        {/* Demo disclosure */}
        <div
          style={{
            background:   "#EBF4FC",
            border:       "1px solid #C8E1F5",
            borderRadius: 8,
            padding:      "10px 14px",
            marginBottom: info.canRetry ? 20 : 0,
          }}
        >
          <p
            style={{
              ...GF,
              fontSize:    11,
              color:       "#2C5F8A",
              margin:      0,
              lineHeight:  1.6,
              textAlign:   "left",
            }}
          >
            <strong>Frontend demonstration:</strong> No signing request has been created or sent.
            This state is simulated for demonstration purposes only.
          </p>
        </div>

        {/* Retry (only for retryable states) */}
        {info.canRetry && (
          <button
            onClick={() => {
              const urlParams = new URLSearchParams(window.location.search);
              const id = window.location.pathname.split("/sign/")[1]?.split("/")[0] ?? "";
              if (id) loadRequest(id);
            }}
            style={{
              ...GF,
              marginTop:    4,
              padding:      "10px 22px",
              borderRadius: 8,
              border:       "none",
              background:   AZURE,
              color:        "#FFFFFF",
              fontSize:     14,
              fontWeight:   700,
              cursor:       "pointer",
              width:        "100%",
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
