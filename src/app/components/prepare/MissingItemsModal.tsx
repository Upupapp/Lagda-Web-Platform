// Friendly "here's what's left" panel for the Prepare wizard.
//
// Replaces raw red error lists with a calmer amber "reminder" tone, and —
// critically — makes every listed item clickable: each PrepValidationIssue
// already carries the `stepId` it belongs to (see validateDraftState() in
// prepare.service.ts), so clicking an item navigates straight to the exact
// step where that field lives, instead of leaving the user to hunt for it.

import { AlertCircle, X, ChevronRight } from "lucide-react";
import type { PrepValidationIssue, PreparationStepId } from "../../models/prepare";
import { PREPARATION_STEPS } from "../../models/prepare";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const SILVER = "#8A9BAE";
const AMBER_BG = "#FEF9EC";
const AMBER_BORDER = "#F0D07A";
const AMBER_TEXT = "#8A6A16";
const AMBER_ICON = "#C9960C";

function stepLabel(id: PreparationStepId): string {
  return PREPARATION_STEPS.find((s) => s.id === id)?.label ?? id;
}

export function MissingItemsModal({
  open,
  onClose,
  issues,
  onGoToStep,
}: {
  open: boolean;
  onClose: () => void;
  issues: PrepValidationIssue[];
  onGoToStep: (stepId: PreparationStepId) => void;
}) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(7,17,31,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="missing-items-heading"
        style={{
          background: "#FFFFFF",
          borderRadius: 18,
          width: "100%",
          maxWidth: 480,
          maxHeight: "min(80vh, 640px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(7,17,31,0.28)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "22px 22px 16px", borderBottom: `1px solid ${AMBER_BORDER}`, background: AMBER_BG }}>
          <div
            aria-hidden="true"
            style={{ width: 38, height: 38, borderRadius: 10, background: "#FFFFFF", border: `1px solid ${AMBER_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <AlertCircle size={19} color={AMBER_ICON} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="missing-items-heading" style={{ ...GF, fontSize: 17, fontWeight: 800, color: NAVY, margin: 0 }}>
              A few things need your attention
            </h2>
            <p style={{ ...GF, fontSize: 12.5, color: AMBER_TEXT, margin: "4px 0 0", lineHeight: 1.5 }}>
              Nothing is lost — click any item below to go straight to where it needs to be filled in.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#FFFFFF", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={14} strokeWidth={2.25} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "12px 14px", flex: 1 }}>
          {issues.length === 0 ? (
            <p style={{ ...GF, fontSize: 13, color: SILVER, padding: "12px 8px" }}>
              Everything looks complete.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => { onGoToStep(issue.stepId); onClose(); }}
                  style={{
                    ...GF,
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%", textAlign: "left",
                    padding: "12px 14px", borderRadius: 10,
                    border: `1px solid ${AMBER_BORDER}`, background: AMBER_BG,
                    cursor: "pointer",
                  }}
                  className="missing-item-row"
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: AMBER_ICON, marginBottom: 3 }}>
                      {stepLabel(issue.stepId)}
                    </div>
                    <div style={{ fontSize: 13, color: NAVY, lineHeight: 1.45 }}>
                      {issue.message}
                    </div>
                  </div>
                  <ChevronRight size={16} color={AMBER_ICON} style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <style>{`.missing-item-row:hover { filter: brightness(0.98); }`}</style>
      </div>
    </div>
  );
}
