// Wizard shell for /app/prepare/*.
// Wraps all preparation steps with a stepper sidebar (desktop) / top bar (mobile),
// Previous/Continue navigation, Discard dialog, and unsaved-change handling.
// Each step renders via <Outlet />. The layout is NOT responsible for step business logic.
// eNotary content is NEVER shown here. Burgundy (#67023B) is NEVER used.

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router";
import { PrepareProvider, usePrepare } from "../../../context/PrepareContext";
import { usePlatform } from "../../../context/PlatformContext";
import { PREPARATION_STEPS } from "../../../models/prepare";
import type { PreparationStepId, PreparationStepState } from "../../../models/prepare";
import {
  FileText, Users, ListOrdered, SlidersHorizontal, PenLine,
  ShieldCheck, ClipboardCheck, BadgeCheck, Check,
} from "lucide-react";
import { Z } from "../../../utils/z-index";

/**
 * Icon name to component.
 *
 * The step model carries a NAME rather than a component so `models/prepare`
 * stays free of React imports — it is read by services and tests that have no
 * business pulling in an icon library.
 */
const STEP_ICONS: Record<string, typeof FileText> = {
  FileText, Users, ListOrdered, SlidersHorizontal, PenLine,
  ShieldCheck, ClipboardCheck, BadgeCheck,
};
import { buildSignInUrl } from "../../../utils/authReturnPath";
import { MissingItemsModal } from "../../../components/prepare/MissingItemsModal";
import { PreparationHelpFab, nudgePreparationHelp } from "../../../components/prepare/PreparationHelpFab";
// Shared with the help FAB, which needs the same answer to "which step is
// this". Two copies would be two places to update when a route moves.
import { currentStepFromPath } from "../../../components/prepare/prep-step-guides";
import { PrepareBreadcrumb, PrepareNavBar } from "../../../components/prepare/PrepareChrome";
import { useProcessing } from "../../../services/processing.service";

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";

// ── Stepper step state → visual style ────────────────────────────────────────


// ── Step ordering for Previous/Continue logic ─────────────────────────────────
//
// Derived from PREPARATION_STEPS rather than a second, hand-written list.
// It used to be one: "upload, participants, routing, authentication,
// settings, review, fields" -- authentication in the wrong slot (right after
// routing, instead of after fields) and "authorization" missing entirely.
// Continuing from Order landed on Authentication instead of Settings, and
// Continue from Fields had no next step at all, so Authorization was
// unreachable through the button that is supposed to lead to it. Deriving
// this from the one array the step cards, the unlock chain and the stepper
// count all already read means the two cannot drift apart again.
export const STEP_ORDER: readonly PreparationStepId[] = PREPARATION_STEPS.map(step => step.id);

export function prevStep(current: PreparationStepId | null): PreparationStepId | null {
  if (!current) return null;
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER[idx - 1]! : null;
}

export function nextStep(current: PreparationStepId | null): PreparationStepId | null {
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

// ── The sequence as cards ───────────────────────────────────────────────────
//
// Each step is a card with an icon, its name, and one line saying what it is
// FOR — "Who needs to sign it", not "Participants". A name alone tells
// somebody who already knows the product which step they are on; the line
// tells somebody who does not what the step is asking of them.
//
// Locked cards stay VISIBLE and are visibly locked. Hiding them would make
// the sequence look shorter than it is, and the question "why can I not get
// to Place Fields yet" is answered by seeing it sit there, dimmed, after
// Settings.
//
// Nothing is pre-selected and nothing defaults to done: a step with its
// prerequisites met but never visited reads "available", not "complete".

function StepperCards({
  activeStepId, stepStates, onStepClick,
}: {
  activeStepId: PreparationStepId | null;
  stepStates: Record<PreparationStepId, PreparationStepState>;
  onStepClick: (id: PreparationStepId) => void;
}) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Keep the current card in view. The strip scrolls when eight cards do not
  // fit, and a strip that opens at step one while you are on step six has to
  // be explored before it can be read.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeStepId]);

  return (
    <ol
      aria-label="Preparation steps"
      style={{
        display: "flex", alignItems: "stretch", gap: 8,
        listStyle: "none", margin: 0, padding: "12px 20px",
        overflowX: "auto", scrollbarWidth: "none",
      }}
    >
      {PREPARATION_STEPS.map((step, idx) => {
        const state = stepStates[step.id];
        const isActive = step.id === activeStepId;
        const locked = state === "unavailable" || state === "blocked";
        const done = state === "complete" || state === "complete-with-warning";
        const Icon = STEP_ICONS[step.icon] ?? FileText;

        return (
          <li key={step.id} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              ref={isActive ? activeRef : undefined}
              onClick={() => { if (!locked) onStepClick(step.id); }}
              disabled={locked}
              aria-current={isActive ? "step" : undefined}
              title={locked ? `${step.label} — finish the earlier steps first` : step.label}
              style={{
                ...GF, display: "flex", alignItems: "flex-start", gap: 9,
                width: 186, textAlign: "left",
                padding: "10px 12px", borderRadius: 10,
                border: isActive ? `1.5px solid ${AZURE}` : "1px solid #E3E8EF",
                background: isActive ? "#EBF4FC" : locked ? "#F8FAFC" : "#FFFFFF",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.72 : 1,
                transition: "background 120ms ease, border-color 120ms ease",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: done ? AZURE : isActive ? AZURE : "#EEF2F6",
                  color: done || isActive ? "#FFFFFF" : SILVER,
                }}
              >
                {done ? <Check size={14} /> : <Icon size={14} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{
                  display: "block", fontSize: 12.5,
                  fontWeight: isActive ? 700 : 600,
                  color: locked ? SILVER : isActive ? AZURE : NAVY,
                }}>
                  {idx + 1}. {step.label}
                </span>
                <span style={{
                  display: "block", fontSize: 11, color: SILVER,
                  marginTop: 2, lineHeight: 1.4,
                }}>
                  {step.blurb}
                </span>
              </span>
            </button>
            {idx < PREPARATION_STEPS.length - 1 && (
              <span aria-hidden style={{ width: 12, height: 1, background: "#D1D9E0", flexShrink: 0 }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// StepperSidebar removed with the vertical rail it drew. The sequence is
// now StepperCards above (desktop) and StepperTopBar below (mobile).

// ── Mobile horizontal stepper ─────────────────────────────────────────────────
//
// Replaces a label, a "Step 2 of 7" counter and a progress line. Those told
// you where you were and nothing else: not what came next, not what was
// already done, and not what was still locked. On a phone that bar WAS the
// navigation, so the sequence was invisible for the whole of preparation.
//
// A horizontal strip of steps instead. Reachable steps are buttons; locked
// ones are visibly locked rather than absent, because "why can I not get to
// Fields yet" is answered by seeing it sit there greyed after Routing.
//
// The wide-screen rail is untouched — it already shows the whole sequence
// down the side, and rebuilding it would be churn for no gain.

function StepperTopBar({
  activeStepId, stepStates, onStepClick,
}: {
  activeStepId: PreparationStepId | null;
  stepStates: Record<PreparationStepId, PreparationStepState>;
  onStepClick: (id: PreparationStepId) => void;
}) {
  const totalSteps = PREPARATION_STEPS.length;
  const activeIdx  = activeStepId ? STEP_ORDER.indexOf(activeStepId) + 1 : 1;
  const activeRef  = useRef<HTMLButtonElement | null>(null);

  // Open showing where you are. A strip that starts at step one while you are
  // on step six is a strip that has to be explored before it can be read.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeStepId]);

  return (
    <div
      style={{
        background: "#F5F7FA",
        borderBottom: "1px solid #E3E8EF",
        padding: "10px 0 10px",
      }}
    >
      <div style={{
        ...GF, display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "0 16px 8px",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>
          Prepare Document
        </span>
        <span style={{ fontSize: 11, color: SILVER }}>
          Step {activeIdx} of {totalSteps}
        </span>
      </div>

      <ol
        aria-label="Preparation steps"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          listStyle: "none", margin: 0, padding: "0 16px",
          overflowX: "auto", scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {PREPARATION_STEPS.map((step, idx) => {
          const state = stepStates[step.id];
          const isActive = step.id === activeStepId;
          const locked = state === "unavailable" || state === "blocked";
          const done = state === "complete" || state === "complete-with-warning";

          return (
            <li key={step.id} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                ref={isActive ? activeRef : undefined}
                onClick={() => { if (!locked) onStepClick(step.id); }}
                disabled={locked}
                aria-current={isActive ? "step" : undefined}
                // Says WHY it cannot be opened, rather than being inert.
                title={locked ? `${step.label} — finish the earlier steps first` : step.label}
                style={{
                  ...GF, display: "inline-flex", alignItems: "center", gap: 6,
                  minHeight: 36, padding: "0 12px", borderRadius: 999,
                  border: isActive ? `1px solid ${AZURE}` : "1px solid #E3E8EF",
                  background: isActive ? "#EBF4FC" : locked ? "#F1F5F9" : "#FFFFFF",
                  color: locked ? SILVER : isActive ? AZURE : NAVY,
                  fontSize: 12.5, fontWeight: isActive ? 700 : 600,
                  whiteSpace: "nowrap",
                  cursor: locked ? "not-allowed" : "pointer",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: done ? AZURE : isActive ? AZURE : "#E3E8EF",
                    color: done || isActive ? "#FFFFFF" : SILVER,
                  }}
                >
                  {done ? "✓" : idx + 1}
                </span>
                {step.shortLabel}
              </button>
              {idx < PREPARATION_STEPS.length - 1 && (
                <span aria-hidden style={{ width: 10, height: 1, background: "#D1D9E0", flexShrink: 0 }} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Main layout component ─────────────────────────────────────────────────────

const LAYOUT_STYLES = `
  .prep-layout-root {
    display: flex;
    flex-direction: column;
    /* height, not min-height: a flex child's overflow:auto only actually
       scrolls internally when the ancestor chain has a BOUNDED height. With
       min-height the document itself grew to fit tall step content instead,
       taking .prep-nav-bar's Previous/Continue bar down the page with it —
       the opposite of "sticks to the screen". */
    height: 100vh;
    background: #FFFFFF;
    font-family: 'Geist', sans-serif;
    overflow: hidden;
  }
  .prep-layout-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  /* The horizontal card strip. Desktop only — below 769px the existing
     mobile pill bar takes over, unchanged. */
  .prep-steprail {
    display: block;
    background: #FFFFFF;
    border-bottom: 1px solid #E3E8EF;
    flex-shrink: 0;
  }
  .prep-steprail ol::-webkit-scrollbar { display: none; }

  .prep-sidebar {
    display: flex;
    overflow-y: auto;
  }
  .prep-topbar {
    display: none;
  }
  .prep-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .prep-step-area {
    flex: 1;
    overflow-y: auto;
    padding: 32px 40px 48px;
  }
  .prep-nav-bar {
    border-top: 1px solid #E3E8EF;
    padding: 16px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #FFFFFF;
    flex-shrink: 0;
    /* Sits below the scrollable .prep-step-area rather than overlapping it,
       so it never covers the last field of a long form. */
    position: relative;
    z-index: 1;
    box-shadow: 0 -2px 8px rgba(7,17,31,0.04);
  }
  .prep-step-row:not(:disabled):hover {
    background: rgba(0,120,212,0.06) !important;
  }
  .prep-step-row:disabled {
    cursor: default;
  }
  @media (max-width: 768px) {
    .prep-layout-root { height: 100dvh; }
    .prep-sidebar  { display: none; }
    .prep-steprail { display: none; }
    .prep-topbar   { display: block; }
    .prep-step-area { padding: 20px 16px 32px; }
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
    validate,
    resumeBackendDraft,
  } = usePrepare();

  const { run: runProcessing } = useProcessing();
  const [showDiscard, setShowDiscard] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  // Reopening a draft from the Documents list.
  //
  // The link arrives as ?resumeDocumentId=<backend document id>. It is handled
  // HERE rather than on the Documents page because rebuilding the draft needs
  // PrepareProvider, which only wraps /app/prepare/*.
  //
  // Runs at most once per document id: `resumedRef` is checked and set before
  // the await, so a re-render mid-flight cannot start a second rebuild that
  // would create a second local draft against the same backend document.
  const resumeDocumentId = new URLSearchParams(location.search).get("resumeDocumentId");
  const resumedRef = useRef<string | null>(null);
  useEffect(() => {
    if (resumeDocumentId === null || resumedRef.current === resumeDocumentId) return;
    resumedRef.current = resumeDocumentId;
    void (async () => {
      await resumeBackendDraft(resumeDocumentId);
      // The id is dropped from the URL either way. On success it has done its
      // work; on failure the error is already on screen, and leaving it would
      // retry the same broken rebuild on every reload.
      void navigate(location.pathname, { replace: true });
    })();
  }, [resumeDocumentId, resumeBackendDraft, navigate, location.pathname]);

  const activeStepId = currentStepFromPath(location.pathname);

  const handleStepClick = useCallback((id: PreparationStepId) => {
    // The cards and the mobile bar both disable locked steps, so this is the
    // belt to their braces — a disabled button is a presentation choice and
    // this is the rule.
    const state = stepStates[id];
    if (state === "unavailable" || state === "blocked") {
      nudgePreparationHelp();
      return;
    }
    setStep(id);
    void navigate(stepRoute(id));
  }, [navigate, setStep, stepStates]);

  const goToStepFromReminder = useCallback((id: PreparationStepId) => {
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
    if (!next) return;

    // The gate. Continue used to navigate unconditionally, so the sequence
    // was an arrangement rather than a rule — somebody could walk past a step
    // they had not filled in and meet the consequence several screens later.
    //
    // A refusal on its own is a dead button, which is worse than no gate at
    // all: nothing happens and nothing explains why. So a blocked attempt
    // nudges the help FAB, which shakes for a second and opens the panel
    // listing exactly what is outstanding on this step.
    const nextState = stepStates[next];
    if (nextState === "unavailable" || nextState === "blocked") {
      nudgePreparationHelp();
      return;
    }

    setStep(next);
    void navigate(stepRoute(next));
  }, [activeStepId, navigate, setStep, stepStates]);

  const handleDiscardRequest = useCallback(() => {
    setShowDiscard(true);
  }, []);

  const handleDiscardConfirm = useCallback(async () => {
    setShowDiscard(false);
    // Discarding deletes uploaded files and local state. It is short, but it
    // is destructive and irreversible, so it should visibly happen rather
    // than the dialog blinking out and the page changing.
    await runProcessing(
      {
        message: "Discarding this preparation",
        detail: "Removing the draft and its uploaded files.",
      },
      async () => { await discardDraft(); },
    );
    await navigate("/app/prepare");
  }, [discardDraft, navigate, runProcessing]);

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
  // Blocked when either the upcoming "fields" gate says so, or the CURRENT
  // step itself has outstanding errors (e.g. an in-flight/failed upload) —
  // previously only the "fields" arrival was checked, so Continue would
  // silently advance past a step with real, unresolved errors.
  const currentStepBlocked = activeStepId !== null
    && validate().errors.some(issue => issue.stepId === activeStepId);
  const continueBlocked = currentStepBlocked || (nextId === "fields"
    ? stepStates["fields"] === "blocked"
    : false);

  const isFieldsStep = activeStepId === "fields";

  return (
    <div className="prep-layout-root">
      <style>{LAYOUT_STYLES}</style>

      {/* Top header with breadcrumb — see components/prepare/PrepareChrome.tsx
          for why it is one back-link on a phone. */}
      <PrepareBreadcrumb
        title={draft?.details.title ?? null}
        showDiscard={Boolean(isDirty || draft)}
        onDiscard={handleDiscardRequest}
      />

      {/* The sequence, as cards, directly under the header.
          *
          * It was a 220px vertical rail down the left. Eight steps read
          * top-to-bottom there while the work itself reads left-to-right,
          * and the rail took a fifth of the width on every screen for
          * something consulted between steps rather than during them.
          *
          * Desktop only — the mobile strip below is unchanged. */}
      <div className="prep-steprail">
        <StepperCards
          activeStepId={activeStepId}
          stepStates={stepStates}
          onStepClick={handleStepClick}
        />
      </div>

      <div className="prep-layout-body">
        <div className="prep-content">
          {/* Mobile top bar */}
          <div className="prep-topbar">
            <StepperTopBar
              activeStepId={activeStepId}
              stepStates={stepStates}
              onStepClick={handleStepClick}
            />
          </div>

          {/* Step content */}
          <main className="prep-step-area" id="prep-main-content">
            <Outlet />
          </main>

          {/* Previous / Continue navigation */}
          {!isFieldsStep && (
            <PrepareNavBar
              prevId={prevId}
              nextId={nextId}
              continueBlocked={continueBlocked}
              onPrevious={handlePrevious}
              onContinue={handleContinue}
              onShowMissing={() => setShowMissing(true)}
            />
          )}
        </div>
      </div>

      {/* Friendly reminder — what's left before Field Placement */}
      <MissingItemsModal
        open={showMissing}
        onClose={() => setShowMissing(false)}
        issues={draft ? validate().errors : []}
        onGoToStep={goToStepFromReminder}
      />

      {/* Discard confirmation */}
      {showDiscard && (
        <DiscardDialog
          onCancel={handleDiscardCancel}
          onConfirm={handleDiscardConfirm}
        />
      )}

      {/* Persistent cross-step help — what's missing, how close to ready */}
      <PreparationHelpFab />
    </div>
  );
}

// Root route element: provides PrepareProvider so all child routes share draft state.
//
// `/app/prepare` is registered as its own top-level route (see router.tsx —
// "Separate from PlatformLayout"), so it never passes through
// PlatformLayout's sessionStatus guard. Without a guard here, an
// unauthenticated visitor navigating straight to /app/prepare (including via
// the `?resumeId=` continuation link from the public upload) would reach the
// real preparation wizard — mirrors PlatformLayout's own check.
export function PrepareRoot() {
  const { sessionStatus } = usePlatform();
  const location = useLocation();

  if (sessionStatus === "initializing") {
    return null;
  }
  if (sessionStatus !== "authenticated") {
    return <Navigate to={buildSignInUrl(location.pathname + location.search)} replace />;
  }

  return (
    <PrepareProvider>
      <PrepareLayout />
    </PrepareProvider>
  );
}
