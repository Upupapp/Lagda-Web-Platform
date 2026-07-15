// Role-specific action page shown before the final summary.
// Approvers select approve/reject. Reviewers select complete/revision.
// Signers and Ack recipients confirm their intent.
// Viewers and Copy recipients proceed without a blocking choice.
// No actions are transmitted to any backend.

import React from "react";
import { useRecipient } from "../../context/RecipientContext";
import { DECLINE_REASON_CATEGORIES, REJECTION_REASON_CATEGORIES } from "../../models/recipient";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const WHITE  = "#FFFFFF";
const RED    = "#C0392B";

export function ActionPage() {
  const {
    request, state, setStep,
    setApprovalDecision, setApprovalNotes,
    setReviewDecision,   setReviewNotes,
    goToSummary, allRequiredComplete,
  } = useRecipient();

  if (!request) return null;

  const role = request.participant.role;

  // ── Viewer / Copy recipient ─────────────────────────────────────────────────
  if (role === "viewer" || role === "copy-recipient") {
    return (
      <PageShell onBack={() => setStep("review")}>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
          {role === "viewer" ? "Document Review Complete" : "Copy Receipt"}
        </h1>
        <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 24px", lineHeight: 1.65 }}>
          {role === "viewer"
            ? "You have been invited to view this document. No further action is required from you."
            : "You have been included as a copy recipient. You may view the document above. No action is required."}
        </p>
        <button
          onClick={goToSummary}
          style={{ ...GF, padding: "12px 24px", borderRadius: 8, border: "none", background: AZURE, color: WHITE, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Continue →
        </button>
      </PageShell>
    );
  }

  // ── Approver ────────────────────────────────────────────────────────────────
  if (role === "approver") {
    return (
      <PageShell onBack={() => setStep("review")}>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
          Submit Your Decision
        </h1>
        <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 24px", lineHeight: 1.65 }}>
          Review the document and select your approval decision. This decision is a demonstration outcome only.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {(["approve", "reject"] as const).map(d => (
            <button
              key={d}
              onClick={() => setApprovalDecision(d)}
              aria-pressed={state.approvalDecision === d}
              style={{
                ...GF,
                display:      "flex",
                alignItems:   "center",
                gap:          10,
                padding:      "14px 16px",
                borderRadius: 9,
                border:       `1.5px solid ${state.approvalDecision === d ? (d === "approve" ? "#4CAF50" : RED) : "#E3E8EF"}`,
                background:   state.approvalDecision === d ? (d === "approve" ? "#F0FBF3" : "#FFF5F5") : WHITE,
                cursor:       "pointer",
                textAlign:    "left",
              }}
            >
              <span style={{ fontSize: 18 }}>{d === "approve" ? "✓" : "✗"}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: d === "approve" ? "#2E7D32" : RED }}>
                  {d === "approve" ? "Approve" : "Reject"}
                </div>
                <div style={{ fontSize: 11, color: SILVER }}>
                  {d === "approve"
                    ? "Approve this document and advance the workflow"
                    : "Reject and stop this document workflow"}
                </div>
              </div>
            </button>
          ))}
        </div>

        {state.approvalDecision === "reject" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Rejection Reason
            </div>
            {REJECTION_REASON_CATEGORIES.map(r => (
              <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginBottom: 6, fontSize: 13, color: NAVY }}>
                <input type="radio" name="reject-reason" value={r.id} style={{ accentColor: RED }} />
                {r.label}
              </label>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="approval-notes" style={{ ...GF, display: "block", fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Notes (optional)
          </label>
          <textarea
            id="approval-notes"
            rows={3}
            value={state.approvalNotes}
            onChange={e => setApprovalNotes(e.target.value)}
            placeholder="Add notes for your decision record…"
            style={{ ...GF, display: "block", width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 7, border: "1px solid #D1D9E0", outline: "none", boxSizing: "border-box", resize: "vertical", color: NAVY }}
          />
        </div>

        <button
          disabled={!state.approvalDecision}
          onClick={goToSummary}
          style={{
            ...GF, width: "100%", padding: "12px 20px", borderRadius: 8, border: "none",
            background: state.approvalDecision ? AZURE : "#8AB8D8",
            color: WHITE, fontSize: 14, fontWeight: 700,
            cursor: state.approvalDecision ? "pointer" : "not-allowed",
          }}
        >
          Review & Submit →
        </button>
      </PageShell>
    );
  }

  // ── Reviewer ────────────────────────────────────────────────────────────────
  if (role === "reviewer") {
    return (
      <PageShell onBack={() => setStep("review")}>
        <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
          Complete Your Review
        </h1>
        <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 24px", lineHeight: 1.65 }}>
          Indicate your review outcome. This is a demonstration result only.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {(["complete", "request-revision"] as const).map(d => (
            <button
              key={d}
              onClick={() => setReviewDecision(d)}
              aria-pressed={state.reviewDecision === d}
              style={{
                ...GF,
                display:    "flex",
                alignItems: "center",
                gap:        10,
                padding:    "14px 16px",
                borderRadius: 9,
                border:     `1.5px solid ${state.reviewDecision === d ? AZURE : "#E3E8EF"}`,
                background: state.reviewDecision === d ? "#EBF4FC" : WHITE,
                cursor:     "pointer",
                textAlign:  "left",
              }}
            >
              <span style={{ fontSize: 18 }}>{d === "complete" ? "✓" : "↩"}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
                  {d === "complete" ? "Review Complete" : "Request Revision"}
                </div>
                <div style={{ fontSize: 11, color: SILVER }}>
                  {d === "complete" ? "I have reviewed this document" : "This document requires changes before proceeding"}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="review-notes" style={{ ...GF, display: "block", fontSize: 11, fontWeight: 700, color: SILVER, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Review Notes (optional)
          </label>
          <textarea
            id="review-notes"
            rows={3}
            value={state.reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            placeholder="Add review comments…"
            style={{ ...GF, display: "block", width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 7, border: "1px solid #D1D9E0", outline: "none", boxSizing: "border-box", resize: "vertical", color: NAVY }}
          />
        </div>

        <button
          disabled={!state.reviewDecision}
          onClick={goToSummary}
          style={{
            ...GF, width: "100%", padding: "12px 20px", borderRadius: 8, border: "none",
            background: state.reviewDecision ? AZURE : "#8AB8D8",
            color: WHITE, fontSize: 14, fontWeight: 700,
            cursor: state.reviewDecision ? "pointer" : "not-allowed",
          }}
        >
          Review & Submit →
        </button>
      </PageShell>
    );
  }

  // ── Signer / Acknowledgment Recipient ────────────────────────────────────────
  return (
    <PageShell onBack={() => setStep("review")}>
      <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
        {role === "signer" ? "Ready to Sign?" : "Confirm Acknowledgment"}
      </h1>
      <p style={{ ...GF, fontSize: 13, color: SILVER, margin: "0 0 20px", lineHeight: 1.65 }}>
        {role === "signer"
          ? "You have completed all required signature fields. Review the summary below before submitting."
          : "You have completed all required fields. Review the summary below before submitting your acknowledgment."}
      </p>

      {!allRequiredComplete && (
        <div
          role="alert"
          style={{
            background: "#FFF5F5", border: "1px solid #F5C6CB", borderRadius: 7,
            padding: "10px 14px", marginBottom: 16, fontSize: 13, color: RED,
          }}
        >
          Please complete all required fields before continuing.
          <button
            onClick={() => setStep("review")}
            style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: RED, fontSize: 12, textDecoration: "underline", padding: "0 0 0 6px" }}
          >
            Return to document →
          </button>
        </div>
      )}

      <button
        disabled={!allRequiredComplete}
        onClick={goToSummary}
        style={{
          ...GF, width: "100%", padding: "12px 20px", borderRadius: 8, border: "none",
          background: allRequiredComplete ? AZURE : "#8AB8D8",
          color: WHITE, fontSize: 14, fontWeight: 700,
          cursor: allRequiredComplete ? "pointer" : "not-allowed",
        }}
      >
        Review & Submit →
      </button>
    </PageShell>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

function PageShell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div style={{ ...GF, display: "flex", alignItems: "flex-start", justifyContent: "center", minHeight: "calc(100dvh - 102px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <button
          onClick={onBack}
          style={{ ...GF, background: "none", border: "none", cursor: "pointer", color: AZURE, fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 20 }}
        >
          ← Back to Document
        </button>
        <div style={{ background: WHITE, borderRadius: 14, border: "1px solid #E3E8EF", padding: "32px" }}>
          {children}
          <div style={{ marginTop: 24, padding: "12px 0", borderTop: "1px solid #E3E8EF" }}>
            <p style={{ ...GF, fontSize: 11, color: SILVER, margin: 0, lineHeight: 1.6 }}>
              Frontend demonstration only. No document has been transmitted and no action will be recorded in any backend system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
