// Role-specific completion screen shown after a successful submit or decline.
// Includes: heading variant, routing outcome, verification direction, and
// a mandatory legal disclaimer.
// Burgundy (#67023B) is NEVER used here — eNotary-only.
// No verification certificate, no "court-admissible" claims, no "blockchain" claims.

import React from "react";
import { useRecipient } from "../../context/RecipientContext";
import { RECIPIENT_ROLE_LABELS } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";
const GREEN  = "#2E7D32";
const RED    = "#C0392B";

export function CompletionPage() {
  const { state, completionHeading, endSession } = useRecipient();
  const summary = state.completionSummary;

  if (!summary) return null;

  const declined   = state.completionDeclined;
  const iconColor  = declined ? RED : GREEN;
  const icon       = declined ? "✖" : "✓";

  const roleLabel  = RECIPIENT_ROLE_LABELS[summary.participantRole];

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
      <div style={{ maxWidth: 540, width: "100%" }}>

        {/* Main card */}
        <div
          style={{
            background:   WHITE,
            borderRadius: 14,
            border:       "1px solid #E3E8EF",
            padding:      "36px 36px 28px",
            marginBottom: 16,
          }}
        >
          {/* Status icon */}
          <div
            aria-hidden="true"
            style={{
              width:         52,
              height:        52,
              borderRadius:  26,
              background:    declined ? "#FFF5F5" : "#F0FBF3",
              border:        `2px solid ${iconColor}`,
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              fontSize:      22,
              color:         iconColor,
              marginBottom:  20,
            }}
          >
            {icon}
          </div>

          {/* Heading */}
          <h1
            style={{
              ...GF,
              fontSize:     24,
              fontWeight:   800,
              color:        NAVY,
              margin:       "0 0 6px",
              lineHeight:   1.2,
            }}
          >
            {completionHeading}
          </h1>

          <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 24px", lineHeight: 1.65 }}>
            {declined
              ? `You have declined the document request "${summary.transactionTitle}" as a demonstration outcome.`
              : `Your ${summary.actionType.toLowerCase()} for "${summary.transactionTitle}" has been recorded as a demonstration outcome.`}
          </p>

          {/* Summary rows */}
          <div style={{ marginBottom: 24 }}>
            <CompRow label="Transaction"  value={summary.transactionTitle} />
            <CompRow label="Your role"    value={roleLabel} />
            <CompRow label="Action"       value={summary.actionType} />
            {summary.signatureAdoptionMethod && (
              <CompRow label="Signature method" value={summary.signatureAdoptionMethod === "typed" ? "Typed" : "Drawn"} />
            )}
            {summary.completedFieldCount > 0 && (
              <CompRow label="Fields completed" value={String(summary.completedFieldCount)} />
            )}
            <CompRow label="Auth method"  value={summary.authMethodLabel} />
            <CompRow label="Consent"      value={summary.consentAccepted ? "Accepted" : "Not required"} />
            <CompRow label="Demo timestamp" value={new Date(summary.demonstrationTimestamp).toLocaleString()} />
          </div>

          {/* Routing outcome */}
          <div
            style={{
              background:   "#F5F7FA",
              borderRadius: 8,
              padding:      "12px 16px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Routing Outcome
            </div>
            <p style={{ ...GF, fontSize: 12, color: NAVY, margin: 0, lineHeight: 1.65 }}>
              {summary.routingOutcome}
            </p>
          </div>

          {/* Verification direction */}
          {!declined && (
            <div
              style={{
                background:   "#EBF4FC",
                border:       "1px solid #C8E1F5",
                borderRadius: 8,
                padding:      "12px 16px",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2C5F8A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Verification (Production Context)
              </div>
              <p style={{ ...GF, fontSize: 12, color: "#2C5F8A", margin: 0, lineHeight: 1.65 }}>
                In a live production system, a signed completion record would be provided by the sending
                workspace for verification purposes. The sender's workspace administrator manages access to
                completed document packages. Contact the sender directly if you require a copy of this document.
              </p>
            </div>
          )}

          {/* Session end */}
          <button
            onClick={endSession}
            style={{
              ...GF,
              width:        "100%",
              padding:      "12px 20px",
              borderRadius: 8,
              border:       "none",
              background:   AZURE,
              color:        WHITE,
              fontSize:     14,
              fontWeight:   700,
              cursor:       "pointer",
            }}
          >
            Close Session
          </button>
        </div>

        {/* Legal footer card */}
        <div
          style={{
            background:   WHITE,
            borderRadius: 10,
            border:       "1px solid #E3E8EF",
            padding:      "16px 20px",
          }}
        >
          <p
            style={{
              ...GF,
              fontSize:   11,
              color:      SILVER,
              lineHeight: 1.7,
              margin:     0,
            }}
          >
            <strong>Legal disclaimer:</strong> This demonstration does not constitute a legally binding
            electronic signature, approval, acknowledgment, or legal record of any kind. No document has been
            transmitted, modified, stored, or sent to any party. LAGDA does not claim this demonstration
            workflow is "Supreme Court approved", "tamper-proof", "blockchain-verified", or "legally
            guaranteed" in any jurisdiction. eNotary services are a separate product under separate
            applicable law and are not part of this eSignature demonstration. All participant names,
            transaction titles, and document details shown are fictional.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Summary row ────────────────────────────────────────────────────────────────

function CompRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0F2F5" }}>
      <span style={{ fontSize: 12, color: SILVER }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: NAVY, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}
