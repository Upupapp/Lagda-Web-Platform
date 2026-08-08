// Wizard shell for /app/prepare/*.
// Wraps all preparation steps with a stepper sidebar (desktop) / top bar (mobile),
// Previous/Continue navigation, Discard dialog, and unsaved-change handling.
// Each step renders via <Outlet />. The layout is NOT responsible for step business logic.
// eNotary content is NEVER shown here. Burgundy (#67023B) is NEVER used.

import React, { useState, useCallback } from "react";
import { Outlet, Navigate, useNavigate, useLocation, Link } from "react-router";
import { PrepareProvider, usePrepare } from "../../../context/PrepareContext";
import { PREPARATION_STEPS } from "../../../models/prepare";
import type { PreparationStepId, PreparationStepState } from "../../../models/prepare";
import { Z } from "../../../utils/z-index";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const GOLD   = "#C9960C";
const SILVER = "#8A9BAE";

// ── Stepper step state → visual style ────────────────────────────────────────

function stepStyle(s: PreparationStepState): { dot: string; label: string; icon: string } {
  switch (s) {
    case "complete":
    case "complete-with-warning":
      return { dot: AZURE, label: AZURE, icon: "✓" };
    case "current":
      return { dot: NAVY, label: NAVY, icon: "" };
    case "invalid":
      return { dot: "#C0392B", label: "#C0392B", icon: "!" };
    case "incomplete":
      return { dot: GOLD, label: GOLD, icon: "·" };
    case "blocked":
      return { dot: SILVER, label: SILVER, icon: "🔒" };
    case "unavailable":
      return { dot: "#D1D9E0", label: "#9AACBC", icon: "" };
    case "available":
    default:
      return { dot: SILVER, label: SILVER, icon: "" };
  }
}

// ── Step ordering for Previous/Continue logic ─────────────────────────────────

const STEP_ORDER: PreparationStepId[] = [
  "upload", "participants", "routing", "authentication", "settings", "review", "fields",
];

function currentStepFromPath(pathname: string): PreparationStepId | null {
  for (const step of PREPARATION_STEPS) {
    if (pathname === step.route || pathname.startsWith(step.route + "?")) {
      return step.id;
    }
  }
  return null;
}

function prevStep(current: PreparationStepId | null): PreparationStepId | null {
  if (!current) return null;
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER[idx - 1]! : null;
}

function nextStep(current: PreparationStepId | null): PreparationStepId | null {
  if (!current) return null;
  const idx = STEP_ORDER.indexOf(current);
  return idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1]! : null;
}

function stepRoute(id: PreparationStepId): string {
  return PREPARATION_STEPS.find(s => s.id === id)?.route ?? "/app/prepare";
}

// ── Discard confirmation dialog ───────────────────────────────────────────────

function DiscardDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z.modal,
        background: "rgba(7,17,31,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          ...GF,
          background: "#FFFFFF",
          borderRadius: 12,
          maxWidth: 420,
          width: "100%",
          padding: "32px",
          boxShadow: "0 8px 32px rgba(7,17,31,0.18)",
        }}
      >
        <h2
          id="discard-dialog-title"
          style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: NAVY }}
        >
          Discard this preparation?
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: "#4B5E70", lineHeight: 1.6 }}>
          All draft content — files, participants, routing, authentication, and settings — will be removed.
          This action cannot be undone.
        </p>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: SILVER, lineHeight: 1.5 }}>
          No files have been uploaded and no invitations have been sent. Your documents workspace
          is unaffected.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              ...GF,
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px solid #D1D9E0`,
              background: "#FFFFFF",
              color: NAVY,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Keep editing
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...GF,
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#C0392B",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Discard draft
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Desktop stepper sidebar ───────────────────────────────────────────────────

function StepperSidebar({
  activeStepId,
  stepStates,
  onStepClick,
}: {
  activeStepId: PreparationStepId | null;
  stepStates: Record<PreparationStepId, PreparationStepState>;
  onStepClick: (id: PreparationStepId) => void;
}) {
  return (
    <nav
      aria-label="Preparation steps"
      style={{
        width: 220,
        flexShrink: 0,
        background: "#F5F7FA",
        borderRight: "1px solid #E3E8EF",
        padding: "32px 0",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          padding: "0 20px 24px",
          borderBottom: "1px solid #E3E8EF",
          marginBottom: 16,
        }}
      >
        <span style={{ ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SILVER }}>
          Prepare Document
        </span>
      </div>
      {PREPARATION_STEPS.map((step, idx) => {
        const state = stepStates[step.id];
        const style = stepStyle(state);
        const isActive = step.id === activeStepId;
        const isClickable = state !== "unavailable" && state !== "blocked";

        return (
          <button
            key={step.id}
            onClick={() => isClickable && onStepClick(step.id)}
            disabled={!isClickable}
            aria-current={isActive ? "step" : undefined}
            style={{
              ...GF,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              background: isActive ? "#EBF4FC" : "transparent",
              border: "none",
              borderLeft: isActive ? `3px solid ${AZURE}` : "3px solid transparent",
              cursor: isClickable ? "pointer" : "default",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `2px solid ${style.dot}`,
                background: state === "complete" || state === "complete-with-warning"
                  ? style.dot
                  : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "#FFFFFF",
              }}
            >
              {style.icon || (state === "complete" ? "✓" : `${idx + 1}`)}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? NAVY : style.label,
              }}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Mobile top stepper bar ────────────────────────────────────────────────────

function StepperTopBar({
  activeStepId,
}: {
  activeStepId: PreparationStepId | null;
}) {
  const totalSteps = PREPARATION_STEPS.length;
  const activeIdx  = activeStepId ? STEP_ORDER.indexOf(activeStepId) + 1 : 1;
  const step = PREPARATION_STEPS.find(s => s.id === activeStepId);
  const progressPct = ((activeIdx - 1) / (totalSteps - 1)) * 100;

  return (
    <div
      style={{
        background: "#F5F7FA",
        borderBottom: "1px solid #E3E8EF",
        padding: "12px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY }}>
          {step?.label ?? "Prepare Document"}
        </span>
        <span style={{ ...GF, fontSize: 11, color: SILVER }}>
          Step {activeIdx} of {totalSteps}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Preparation progress: step ${activeIdx} of ${totalSteps}`}
        style={{
          height: 4,
          background: "#E3E8EF",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: AZURE,
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Main layout component ─────────────────────────────────────────────────────

const LAYOUT_STYLES = `
  .prep-layout-root {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #FFFFFF;
    font-family: 'Geist', sans-serif;
  }
  .prep-layout-body {
    display: flex;
    flex: 1;
  }
  .prep-sidebar {
    display: flex;
  }
  .prep-topbar {
    display: none;
  }
  .prep-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .prep-step-area {
    flex: 1;
    overflow-y: auto;
    padding: 32px 40px;
  }
  .prep-nav-bar {
    border-top: 1px solid #E3E8EF;
    padding: 16px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #FFFFFF;
    flex-shrink: 0;
  }
  @media (max-width: 768px) {
    .prep-sidebar { display: none; }
    .prep-topbar  { display: block; }
    .prep-step-area { padding: 20px 16px; }
    .prep-nav-bar   { padding: 12px 16px; }
    .prep-breadcrumb { padding: 0 16px !important; }
  }
`;

export function PrepareLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const {
    stepStates,
    isDirty,
    discardDraft,
    setStep,
    draft,
  } = usePrepare();

  const [showDiscard, setShowDiscard] = useState(false);

  const activeStepId = currentStepFromPath(location.pathname);

  const handleStepClick = useCallback((id: PreparationStepId) => {
    setStep(id);
    void navigate(stepRoute(id));
  }, [navigate, setStep]);

  const handlePrevious = useCallback(() => {
    const prev = prevStep(activeStepId);
    if (prev) {
      setStep(prev);
      void navigate(stepRoute(prev));
    } else {
      void navigate("/app/prepare");
    }
  }, [activeStepId, navigate, setStep]);

  const handleContinue = useCallback(() => {
    const next = nextStep(activeStepId);
    if (next) {
      setStep(next);
      void navigate(stepRoute(next));
    }
  }, [activeStepId, navigate, setStep]);

  const handleDiscardRequest = useCallback(() => {
    setShowDiscard(true);
  }, []);

  const handleDiscardConfirm = useCallback(async () => {
    setShowDiscard(false);
    await discardDraft();
    await navigate("/app/prepare");
  }, [discardDraft, navigate]);

  const handleDiscardCancel = useCallback(() => {
    setShowDiscard(false);
  }, []);

  // Guard: if user deep-links to a step URL without an active draft, redirect to entry.
  // Deliberately placed BELOW every hook: an early return above them made the
  // useCallback calls conditional, so hook order changed between the draft and
  // no-draft renders. None of the callbacks above read `draft`.
  if (activeStepId !== null && draft === null) {
    return <Navigate to="/app/prepare" replace />;
  }

  const prevId = prevStep(activeStepId);
  const nextId = nextStep(activeStepId);
  const continueBlocked = nextId === "fields"
    ? stepStates["fields"] === "blocked"
    : false;

  const isFieldsStep = activeStepId === "fields";

  return (
    <div className="prep-layout-root">
      <style>{LAYOUT_STYLES}</style>

      {/* Top header with breadcrumb */}
      <div
        className="prep-breadcrumb"
        style={{
          ...GF,
          borderBottom: "1px solid #E3E8EF",
          padding: "0 40px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          background: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: SILVER }}>
          <Link
            to="/app/documents"
            style={{ color: SILVER, textDecoration: "none", fontWeight: 500 }}
          >
            Documents
          </Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: NAVY, fontWeight: 600 }}>Prepare Document</span>
          {draft?.details.title && (
            <>
              <span aria-hidden="true">›</span>
              <span
                style={{
                  color: NAVY,
                  fontWeight: 400,
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {draft.details.title}
              </span>
            </>
          )}
        </div>

        {(isDirty || draft) && (
          <button
            onClick={handleDiscardRequest}
            style={{
              ...GF,
              background: "none",
              border: "none",
              color: "#C0392B",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 6,
            }}
          >
            Discard draft
          </button>
        )}
      </div>

      <div className="prep-layout-body">
        {/* Desktop sidebar */}
        <div className="prep-sidebar">
          <StepperSidebar
            activeStepId={activeStepId}
            stepStates={stepStates}
            onStepClick={handleStepClick}
          />
        </div>

        <div className="prep-content">
          {/* Mobile top bar */}
          <div className="prep-topbar">
            <StepperTopBar activeStepId={activeStepId} />
          </div>

          {/* Step content */}
          <main className="prep-step-area" id="prep-main-content">
            <Outlet />
          </main>

          {/* Previous / Continue navigation */}
          {!isFieldsStep && (
            <div className="prep-nav-bar">
              <div>
                {prevId !== null && (
                  <button
                    onClick={handlePrevious}
                    style={{
                      ...GF,
                      padding: "10px 20px",
                      borderRadius: 8,
                      border: `1px solid #D1D9E0`,
                      background: "#FFFFFF",
                      color: NAVY,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ← Previous
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {continueBlocked && (
                  <span style={{ ...GF, fontSize: 12, color: SILVER }}>
                    Complete required steps to continue to field placement
                  </span>
                )}
                {nextId && !isFieldsStep && (
                  <button
                    onClick={continueBlocked ? undefined : handleContinue}
                    disabled={continueBlocked}
                    aria-disabled={continueBlocked}
                    style={{
                      ...GF,
                      padding: "10px 24px",
                      borderRadius: 8,
                      border: "none",
                      background: continueBlocked ? "#B0BEC5" : AZURE,
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: continueBlocked ? "not-allowed" : "pointer",
                    }}
                  >
                    {nextId === "fields" ? "Continue to Place Fields →" : "Continue →"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discard confirmation */}
      {showDiscard && (
        <DiscardDialog
          onCancel={handleDiscardCancel}
          onConfirm={handleDiscardConfirm}
        />
      )}
    </div>
  );
}

// Root route element: provides PrepareProvider so all child routes share draft state.
export function PrepareRoot() {
  return (
    <PrepareProvider>
      <PrepareLayout />
    </PrepareProvider>
  );
}
