// Route wrapper for /sign/:requestId/* — provides RecipientProvider and
// routes the current flow step to the appropriate page.
// Pre-checks unavailable states immediately on mount.
// No real backend calls. No localStorage. Demonstrated scenarios only.

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { RecipientProvider, useRecipient } from "../../context/RecipientContext";

import { RequestAccessPage   } from "./RequestAccessPage";
import { AuthChallengePage   } from "./AuthChallengePage";
import { ConsentPage         } from "./ConsentPage";
import { DocumentReviewPage  } from "./DocumentReviewPage";
import { ActionPage          } from "./ActionPage";
import { ReviewSummaryPage   } from "./ReviewSummaryPage";
import { CompletionPage      } from "./CompletionPage";
import { DeclinePage         } from "./DeclinePage";
import { UnavailablePage     } from "./UnavailablePage";
import { RECIPIENT_SCENARIOS } from "../../models/recipient";

// ── Dev scenario switcher (only in dev/preview mode) ──────────────────────────

function DevScenarioSwitcher() {
  const navigate = useNavigate();
  if (import.meta.env.PROD) return null;

  return (
    <div
      style={{
        position:  "fixed",
        bottom:    60,
        right:     12,
        zIndex:    300,
        background:"#07111F",
        borderRadius: 9,
        padding:   "10px 12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ color: "#8A9BAE", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        Demo Scenarios
      </div>
      {RECIPIENT_SCENARIOS.map(s => (
        <button
          key={s.requestId}
          onClick={() => navigate(`/sign/${s.requestId}`)}
          style={{
            display:      "block",
            width:        "100%",
            padding:      "5px 6px",
            background:   "none",
            border:       "none",
            color:        "#C8DCEE",
            fontSize:     11,
            cursor:       "pointer",
            textAlign:    "left",
            borderRadius: 5,
            fontFamily:   "'Geist', sans-serif",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── Inner component (has access to RecipientContext) ──────────────────────────

function RecipientFlowInner() {
  const { requestId } = useParams<{ requestId: string }>();
  const { loadRequest, step, state } = useRecipient();

  useEffect(() => {
    if (requestId) loadRequest(requestId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // Loading / initializing
  if (step === "initializing" || step === "error") {
    return (
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          minHeight:       "calc(100dvh - 102px)",
          fontFamily:      "'Geist', sans-serif",
          color:           "#8A9BAE",
          fontSize:        14,
        }}
      >
        {step === "error"
          ? (state.errorMessage ?? "An error occurred. Please try again.")
          : "Loading…"}
      </div>
    );
  }

  // Route to the active step
  switch (step) {
    case "unavailable": return <UnavailablePage />;
    case "access":      return <RequestAccessPage />;
    case "auth":        return <AuthChallengePage />;
    case "consent":     return <ConsentPage />;
    case "review":      return <DocumentReviewPage />;
    case "action":      return <ActionPage />;
    case "summary":     return <ReviewSummaryPage />;
    case "complete":    return <CompletionPage />;
    case "declined":    return <DeclinePage />;
    default:            return <RequestAccessPage />;
  }
}

// ── Public export ─────────────────────────────────────────────────────────────

export function RecipientRoot() {
  return (
    <RecipientProvider>
      <RecipientFlowInner />
      <DevScenarioSwitcher />
    </RecipientProvider>
  );
}
