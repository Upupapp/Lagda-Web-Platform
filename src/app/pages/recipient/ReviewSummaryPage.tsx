// Final review summary before a recipient submits their action.
// Shows field completion status, signature adoption, role decision, and the submit button.
// Mandatory disclosure that no backend submission occurs.

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

export function ReviewSummaryPage() {
  const {
    request, state, myFields, allRequiredComplete,
    submitFinalAction, setStep, completionHeading,
  } = useRecipient();

  if (!request) return null;

  const role      = request.participant.role;
  const roleLabel = RECIPIENT_ROLE_LABELS[role];

  // Build summary rows
  const myFilledCount = myFields.filter(f => {
    const val = state.fieldValues[f.id];
    return val !== undefined && val !== null && val !== "" && val !== false;
  }).length;

  const isSigner  = role === "signer";
  const isApprover = role === "approver";
  const isReviewer = role === "reviewer";

  const actionLabel = isApprover
    ? (state.approvalDecision === "approve" ? "Approve" : state.approvalDecision === "reject" ? "Reject" : "No decision selected")
    : isReviewer
    ? (state.reviewDecision === "complete" ? "Review Complete" : state.reviewDecision === "request-revision" ? "Request Revision" : "No decision selected")
    : null;

  const canSubmit = allRequiredComplete && (
    !isApprover || state.approvalDecision !== null
  ) && (
    !isReviewer || state.reviewDecision !== null
  );

  return (
    <div style={{ ...GF, display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100dvh - 102px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 540, width: "100%" }}>
        {/* Back */}
        <button
          onClick={() => setStep("review")}
          style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: AZURE, fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 20 }}
        >
          ← Back to Document
        </button>

        <div style={{ background: WHITE, borderRadius: 14, border: "1px solid #E3E8EF", padding: "32px" }}>
          {/* Header */}
          <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 4px" }}>
            Review &amp; Submit
          </h1>
          <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 24px", lineHeight: 1.6 }}>
            Review the summary below, then submit your demonstration action.
          </p>

          {/* Transaction */}
          <SummaryRow label="Transaction" value={request.transactionTitle} />
          <SummaryRow label="Role"        value={roleLabel} />
          <SummaryRow label="Name"        value={request.participant.displayName} />

          {/* Field completion */}
          <SummaryRow
            label="Fields completed"
            value={`${myFilledCount} / ${myFields.length}`}
            ok={myFilledCount >= myFields.filter(f => f.required).length}
          />

          {/* Signature */}
          {isSigner && (
            <SummaryRow
              label="Signature adopted"
              value={state.signature.adopted ? `Yes (${state.signature.method})` : "Not yet adopted"}
              ok={state.signature.adopted}
              missing={!state.signature.adopted}
            />
          )}

          {/* Decision */}
          {(isApprover || isReviewer) && actionLabel && (
            <SummaryRow label="Decision" value={actionLabel} ok={true} />
          )}

          {/* Consent */}
          <SummaryRow
            label="Consent"
            value={state.consentAccepted ? "Accepted" : "Not required"}
          />

          {/* Auth */}
          <SummaryRow
            label="Identity verification"
            value={state.authState === "success" ? "Verified (demonstration)" : "Not required"}
          />

          {/* Documents */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Documents ({request.documents.length})
            </div>
            {request.documents.map(doc => (
              <div key={doc.id} style={{ fontSize: 12, color: NAVY, padding: "3px 0" }}>
                📄 {doc.displayName} — {doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}
              </div>
            ))}
          </div>

          {/* Missing items warning */}
          {!canSubmit && (
            <div
              role="alert"
              style={{
                background: "#FFF5F5", border: "1px solid #F5C6CB", borderRadius: 7,
                padding: "10px 14px", marginBottom: 16, fontSize: 12, color: RED,
              }}
            >
              Please complete all required fields before submitting.
            </div>
          )}

          {/* Demo disclosure */}
          <div
            style={{
              background: "#EBF4FC", border: "1px solid #C8E1F5", borderRadius: 7,
              padding: "10px 14px", marginBottom: 20,
            }}
          >
            <p style={{ ...GF, fontSize: 11, color: "#2C5F8A", margin: 0, lineHeight: 1.6 }}>
              <strong>Frontend demonstration:</strong> Clicking Submit records a demonstration outcome only.
              No document is transmitted, no backend action occurs, and no participant receives any notification.
              Your signature, field values, and personal data are held in memory only and are cleared when
              you leave this page.
            </p>
          </div>

          {/* Submit */}
          <button
            disabled={!canSubmit}
            onClick={submitFinalAction}
            style={{
              ...GF,
              width:        "100%",
              padding:      "13px 20px",
              borderRadius: 9,
              border:       "none",
              background:   canSubmit ? AZURE : "#8AB8D8",
              color:        WHITE,
              fontSize:     15,
              fontWeight:   700,
              cursor:       canSubmit ? "pointer" : "not-allowed",
            }}
          >
            Submit →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Summary row ────────────────────────────────────────────────────────────────

function SummaryRow({
  label, value, ok, missing,
}: {
  label: string;
  value: string;
  ok?: boolean;
  missing?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F0F2F5" }}>
      <span style={{ fontSize: 12, color: SILVER }}>{label}</span>
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: missing ? RED : ok === true ? GREEN : NAVY,
      }}>
        {missing ? "⚠ " : ok ? "✓ " : ""}{value}
      </span>
    </div>
  );
}
