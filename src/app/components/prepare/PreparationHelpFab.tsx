// Floating Help/Preparation FAB — persistent across every /app/prepare/*
// step (mounted once in PrepareLayout). Gives a single always-available
// answer to "what's left before I can send this document", instead of only
// surfacing that when Continue happens to be blocked (MissingItemsModal) or
// only at the very last step (ConfirmationPage's send-readiness banner).
//
// Reuses rather than reimplements:
//   - mock/demo mode: PrepareContext.validate() (validateDraftState) —
//     the exact same PrepValidationIssue[] the sidebar dots and
//     MissingItemsModal already use.
//   - real-backend mode: computeSendReadiness(), the exact same function
//     ConfirmationPage's "not ready to send" banner uses, fed by
//     PrepareContext.fieldsSnapshot (pushed up by whichever step currently
//     has the field editor mounted — see PrepareContext's doc comment).
// No new validation rules are invented here.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { HelpCircle, X, ChevronRight, CheckCircle2 } from "lucide-react";
import { usePrepare } from "../../context/PrepareContext";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { computeSendReadiness, buildActionUrl, type SendReadinessAction } from "../../services/prepare/send-readiness";
import { PREPARATION_STEPS } from "../../models/prepare";
import type { PreparationStepId } from "../../models/prepare";
import { Z } from "../../utils/z-index";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";
const AMBER_BG = "#FEF9EC";
const AMBER_BORDER = "#F0D07A";
const GREEN  = "#2E7D32";
const GREEN_BG = "#E8F5E9";

function stepRouteFor(id: PreparationStepId): string {
  return PREPARATION_STEPS.find((s) => s.id === id)?.route ?? "/app/prepare";
}
function stepLabelFor(id: PreparationStepId): string {
  return PREPARATION_STEPS.find((s) => s.id === id)?.label ?? id;
}

interface HelpItem {
  id: string;
  stepLabel: string;
  message: string;
  action: SendReadinessAction;
}

// The 6 non-field steps validateDraftState actually gates, plus one unit for
// field placement (see below) — a simple, honest "how much of this is done"
// number. Not meant to be a precise weighted score, just an at-a-glance
// signal that moves as the user makes progress.
const PERCENT_STEP_UNITS: PreparationStepId[] = [
  "upload", "participants", "routing", "authentication", "settings", "review",
];

export function PreparationHelpFab() {
  const navigate = useNavigate();
  const {
    draft, validate, stepStates, syncError, multiDocumentSigningGap, fieldsSnapshot,
  } = usePrepare();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (fabRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Close on Escape, for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const { items, ready, percent } = useMemo(() => {
    if (!draft) return { items: [] as HelpItem[], ready: false, percent: 0 };

    let helpItems: HelpItem[];
    let isReady: boolean;
    let fieldsDone: boolean;

    if (USE_REAL_BACKEND) {
      const readiness = computeSendReadiness({
        draft, multiDocumentSigningGap, syncError, fields: fieldsSnapshot,
      });
      helpItems = readiness.blockers.map((b, i) => ({
        id: `sr_${i}`,
        stepLabel: b.action ? stepLabelFromRoute(b.action.route) : "Preparation",
        message: b.message,
        action: b.action ?? { label: "Review", route: "/app/prepare/review" },
      }));
      isReady = readiness.ready;
      // Fields count as "done" once no blocker points back at the fields
      // step — mirrors exactly what actually gates a real send.
      fieldsDone = !readiness.blockers.some((b) => b.action?.route === "/app/prepare/fields");
    } else {
      const validation = validate();
      helpItems = validation.errors.map((issue) => ({
        id: issue.id,
        stepLabel: stepLabelFor(issue.stepId),
        message: issue.message,
        action: {
          label: "Fix this",
          route: stepRouteFor(issue.stepId),
          ...(issue.participantId ? { participantId: issue.participantId } : {}),
          ...(issue.groupId ? { groupId: issue.groupId } : {}),
          ...(issue.code === "NO_TITLE" || issue.code === "TITLE_TOO_LONG" ? { route: "/app/prepare/upload?highlightField=title" } : {}),
        },
      }));
      isReady = validation.errors.length === 0;
      // Demo mode has no backend-verified field placement signal outside the
      // field editor's own session state — a non-empty snapshot is the best
      // available proxy once the visitor has actually opened Fields.
      fieldsDone = (fieldsSnapshot?.length ?? 0) > 0;
    }

    const doneStepCount = PERCENT_STEP_UNITS.filter(
      (id) => stepStates[id] === "complete" || stepStates[id] === "complete-with-warning",
    ).length;
    const totalUnits = PERCENT_STEP_UNITS.length + 1;
    const doneUnits = doneStepCount + (fieldsDone ? 1 : 0);
    const pct = Math.round((doneUnits / totalUnits) * 100);

    return { items: helpItems, ready: isReady, percent: pct };
  }, [draft, validate, stepStates, syncError, multiDocumentSigningGap, fieldsSnapshot]);

  if (!draft) return null;

  const handleItemClick = (action: SendReadinessAction) => {
    setOpen(false);
    void navigate(buildActionUrl(action));
  };

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close preparation guide" : "Open preparation guide"}
        style={{
          position: "fixed",
          right: "max(20px, env(safe-area-inset-right, 0px))",
          // Cleared above the wizard's Previous/Continue nav bar (~73px tall
          // on desktop; see PrepareLayout's .prep-nav-bar) rather than the
          // viewport edge, so the FAB never sits on top of Continue.
          bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
          zIndex: Z.helpFab,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: ready ? GREEN : NAVY,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(7,17,31,0.28)",
        }}
        className="prep-help-fab"
      >
        {open ? <X size={22} strokeWidth={2.25} /> : <HelpCircle size={24} strokeWidth={2} />}
        {!open && !ready && items.length > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              padding: "0 4px",
              borderRadius: 9,
              background: GOLD,
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #FFFFFF",
            }}
          >
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="prep-help-heading"
          className="prep-help-panel"
          style={{
            ...GF,
            position: "fixed",
            zIndex: Z.helpFab,
            right: "max(20px, env(safe-area-inset-right, 0px))",
            bottom: "calc(96px + env(safe-area-inset-bottom, 0px) + 64px)",
            width: "min(360px, calc(100vw - 32px))",
            maxHeight: "min(70vh, 560px)",
            display: "flex",
            flexDirection: "column",
            background: "#FFFFFF",
            borderRadius: 16,
            boxShadow: "0 20px 56px rgba(7,17,31,0.24)",
            border: "1px solid #E3E8EF",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #E3E8EF", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h2 id="prep-help-heading" style={{ ...GF, fontSize: 14, fontWeight: 800, color: NAVY, margin: 0 }}>
                Preparation guide
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  width: 26, height: 26, borderRadius: 8, border: "1px solid #E3E8EF",
                  background: "#FFFFFF", color: NAVY, display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", flexShrink: 0,
                }}
              >
                <X size={13} strokeWidth={2.25} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Preparation ${percent}% complete`}
                style={{ flex: 1, height: 6, borderRadius: 4, background: "#E3E8EF", overflow: "hidden" }}
              >
                <div style={{ height: "100%", width: `${percent}%`, background: ready ? GREEN : AZURE, borderRadius: 4, transition: "width 0.3s ease" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: SILVER, flexShrink: 0 }}>{percent}%</span>
            </div>

            <div
              style={{
                ...GF, marginTop: 10, display: "flex", alignItems: "center", gap: 6,
                fontSize: 12.5, fontWeight: 700, color: ready ? GREEN : GOLD,
              }}
            >
              {ready ? <CheckCircle2 size={15} strokeWidth={2.25} /> : null}
              {ready
                ? "Ready for signing / sending"
                : items.length === 1
                  ? "1 thing is stopping this from being ready"
                  : `${items.length} things are stopping this from being ready`}
            </div>
          </div>

          {/* Body */}
          <div style={{ overflowY: "auto", padding: "10px 12px", flex: 1 }}>
            {ready ? (
              <p style={{ ...GF, fontSize: 12.5, color: "#4B5E70", lineHeight: 1.6, margin: "6px 4px" }}>
                Every required step has been completed. You can continue to Review and send this
                document whenever you're ready.
              </p>
            ) : items.length === 0 ? (
              <p style={{ ...GF, fontSize: 12.5, color: SILVER, margin: "6px 4px" }}>
                Nothing to report yet — start with the Documents step.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.action)}
                    style={{
                      ...GF,
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", textAlign: "left",
                      padding: "10px 12px", borderRadius: 10,
                      border: `1px solid ${AMBER_BORDER}`, background: AMBER_BG,
                      cursor: "pointer",
                    }}
                    className="prep-help-item"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: GOLD, marginBottom: 2 }}>
                        {item.stepLabel}
                      </div>
                      <div style={{ fontSize: 12.5, color: NAVY, lineHeight: 1.4 }}>
                        {item.message}
                      </div>
                    </div>
                    <ChevronRight size={15} color={GOLD} style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .prep-help-fab:hover { filter: brightness(1.08); }
        .prep-help-item:hover { filter: brightness(0.98); }
        @media (max-width: 480px) {
          .prep-help-panel {
            left: 12px !important;
            right: 12px !important;
            width: auto !important;
            /* Mobile nav bar (.prep-nav-bar at max-width:768px) is shorter
               (~65px) than desktop's, but still cleared above it. */
            bottom: calc(80px + env(safe-area-inset-bottom, 0px) + 60px) !important;
            max-height: min(65vh, 520px) !important;
          }
          .prep-help-fab {
            width: 48px !important;
            height: 48px !important;
            right: max(16px, env(safe-area-inset-right, 0px)) !important;
            bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>
    </>
  );
}

// Best-effort label for a send-readiness blocker's target step, derived from
// its route rather than a stepId (computeSendReadiness's blockers don't
// carry one) — used only for the small uppercase kicker above each item.
function stepLabelFromRoute(route: string): string {
  const match = PREPARATION_STEPS.find((s) => route.startsWith(s.route));
  return match?.label ?? "Preparation";
}
