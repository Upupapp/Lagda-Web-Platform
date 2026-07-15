// Access / landing screen for a recipient signing request.
// Shows transaction title, sender workspace, participant role, and a "Begin" button.
// Pre-checks for unavailable states happen in RecipientRoot before reaching here.

import React from "react";
import { useRecipient } from "../../context/RecipientContext";
import { RECIPIENT_ROLE_LABELS, RECIPIENT_ROLE_DESCRIPTIONS } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";

export function RequestAccessPage() {
  const { request, setStep, state } = useRecipient();

  if (!request) return null;

  const role     = request.participant.role;
  const roleLabel = RECIPIENT_ROLE_LABELS[role];
  const roleDesc  = RECIPIENT_ROLE_DESCRIPTIONS[role];
  const needsAuth = request.participant.authRequired;

  function handleBegin() {
    if (needsAuth) {
      setStep("auth");
    } else if (request!.participant.consentRequired) {
      setStep("consent");
    } else {
      setStep("review");
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
          maxWidth:     520,
          width:        "100%",
        }}
      >
        {/* Card */}
        <div
          style={{
            background:   WHITE,
            borderRadius: 14,
            border:       "1px solid #E3E8EF",
            padding:      "36px 36px 28px",
            marginBottom: 16,
          }}
        >
          {/* Sender badge */}
          <div
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          6,
              background:   "#EBF4FC",
              borderRadius: 6,
              padding:      "4px 10px",
              fontSize:     11,
              color:        "#2C5F8A",
              fontWeight:   600,
              marginBottom: 20,
            }}
          >
            <span aria-hidden="true">🏢</span>
            {request.senderWorkspaceDisplayName}
          </div>

          {/* Transaction title */}
          <h1
            style={{
              ...GF,
              fontSize:     22,
              fontWeight:   800,
              color:        NAVY,
              margin:       "0 0 6px",
              lineHeight:   1.25,
            }}
          >
            {request.transactionTitle}
          </h1>

          {/* Role indicator */}
          <div
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          6,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                display:      "inline-block",
                padding:      "2px 8px",
                borderRadius: 99,
                background:   "#EBF4FC",
                color:        AZURE,
                fontSize:     11,
                fontWeight:   700,
              }}
            >
              {roleLabel}
            </span>
            <span style={{ fontSize: 13, color: SILVER }}>
              {request.participant.displayName}
            </span>
          </div>

          {/* Role description */}
          <p
            style={{
              ...GF,
              fontSize:     13,
              color:        SILVER,
              lineHeight:   1.65,
              margin:       "0 0 24px",
            }}
          >
            {roleDesc}
          </p>

          {/* Document list */}
          {request.documents.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Documents ({request.documents.length})
              </div>
              {request.documents.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          8,
                    padding:      "8px 12px",
                    background:   "#F5F7FA",
                    borderRadius: 7,
                    marginBottom: 4,
                    fontSize:     13,
                    color:        NAVY,
                  }}
                >
                  <span aria-hidden="true">📄</span>
                  <span style={{ flex: 1 }}>{doc.displayName}</span>
                  <span style={{ color: SILVER, fontSize: 11 }}>{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}

          {/* Steps summary */}
          <div
            style={{
              borderTop:  "1px solid #E3E8EF",
              paddingTop: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Steps to complete
            </div>
            <ol
              style={{
                ...GF,
                margin:      0,
                paddingLeft: 20,
                fontSize:    13,
                color:       NAVY,
                lineHeight:  2,
              }}
            >
              {needsAuth && <li>Verify your identity</li>}
              {request.participant.consentRequired && <li>Review consent disclosure</li>}
              <li>Review the document{request.documents.length > 1 ? "s" : ""}</li>
              {role === "signer"                   && <li>Adopt your electronic signature</li>}
              {role === "approver"                 && <li>Submit an approval decision</li>}
              {role === "acknowledgment-recipient" && <li>Acknowledge receipt</li>}
              {role === "reviewer"                 && <li>Mark review as complete</li>}
              <li>Submit</li>
            </ol>
          </div>

          {/* Auth method note */}
          {needsAuth && (
            <div
              style={{
                background:   "#F5F7FA",
                borderRadius: 7,
                padding:      "10px 12px",
                fontSize:     12,
                color:        SILVER,
                marginBottom: 20,
              }}
            >
              Identity verification required: <strong style={{ color: NAVY }}>
                {request.participant.authMethod === "email-code" ? "Email verification code" :
                 request.participant.authMethod === "sms-code"   ? "SMS verification code" :
                 request.participant.authMethod === "account-signin" ? "Account sign-in" :
                 "Secure access link"}
              </strong>
            </div>
          )}

          {/* Begin button */}
          <button
            onClick={handleBegin}
            style={{
              ...GF,
              width:        "100%",
              padding:      "13px 20px",
              borderRadius: 9,
              border:       "none",
              background:   AZURE,
              color:        WHITE,
              fontSize:     15,
              fontWeight:   700,
              cursor:       "pointer",
              letterSpacing: "-0.2px",
            }}
          >
            Begin →
          </button>
        </div>

        {/* Demo disclosure */}
        <div
          style={{
            background:   "#FFF9EC",
            border:       "1px solid #F0D890",
            borderRadius: 9,
            padding:      "12px 16px",
          }}
        >
          <p
            style={{
              ...GF,
              fontSize:   11,
              color:      "#8A6F1E",
              margin:     0,
              lineHeight: 1.65,
            }}
          >
            <strong>Frontend demonstration:</strong> No signing request has been created or transmitted.
            No invitation, OTP, or email has been sent to any participant. This is a simulation of
            the LAGDA eSignature recipient experience only.
          </p>
        </div>
      </div>
    </div>
  );
}
