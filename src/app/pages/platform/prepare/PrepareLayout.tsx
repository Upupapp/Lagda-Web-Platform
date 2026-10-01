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
  ShieldCheck, ClipboardCheck, BadgeCheck, Check, ChevronLeft, ChevronRight,
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
import { processScreen } from "../../../config/process-screens";

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
  activeStepId, stepStates, onStepClick, compact = false,
}: {
  activeStepId: PreparationStepId | null;
  stepStates: Record<PreparationStepId, PreparationStepState>;
  onStepClick: (id: PreparationStepId) => void;
  /** Phones and small tablets: smaller cards, the same steps and rules. */
  compact?: boolean;
}) {
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const stripRef = useRef<HTMLOListElement | null>(null);
  // Which way there is more to see: each arrow shows only when it can move.
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const measure = () => {
      setEdges({
        left: strip.scrollLeft > 2,
        right: strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2,
      });
    };
    measure();
    strip.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(strip);
    return () => {
      strip.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  /** Slides the strip most of its own width, keeping a card of overlap. */
  const slide = (dir: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollBy({ left: dir * Math.max(120, strip.clientWidth * 0.75), behavior: "smooth" });
  };

  // Keep the current card in view. The strip scrolls when eight cards do not
  // fit, and a strip that opens at step one while you are on step six has to
  // be explored before it can be read.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeStepId]);

  return (
    <div className="prep-strip">
    {edges.left && (
      <button type="button" className="prep-strip-arrow prep-strip-arrow-left" aria-label="Scroll steps left"
        data-testid="prep-steps-left" onClick={() => { slide(-1); }}>
        <ChevronLeft size={18} aria-hidden />
      </button>
    )}
    <ol
      ref={stripRef}
      aria-label="Preparation steps"
      className={compact ? "prep-cards-compact" : undefined}
      data-testid={compact ? "prep-step-cards-compact" : "prep-step-cards"}
      style={{
        display: "flex", alignItems: "stretch", gap: compact ? 6 : 8,
        listStyle: "none", margin: 0, padding: compact ? "2px 16px 4px" : "12px 20px",
        overflowX: "auto", scrollbarWidth: "none", scrollBehavior: "smooth",
        scrollSnapType: compact ? "x proximity" : undefined,
        scrollPaddingInline: compact ? 16 : undefined,
      }}
    >
      {PREPARATION_STEPS.map((step, idx) => {
        const state = stepStates[step.id];
        const isActive = step.id === activeStepId;
        const locked = state === "unavailable" || state === "blocked";
        const done = state === "complete" || state === "complete-with-warning";
        const Icon = STEP_ICONS[step.icon] ?? FileText;

        return (
          <li key={step.id} style={{ display: "flex", alignItems: "center", gap: compact ? 6 : 8, flexShrink: 0, scrollSnapAlign: compact ? "start" : undefined }}>
            <button
              type="button"
              ref={isActive ? activeRef : undefined}
              onClick={() => { if (!locked) onStepClick(step.id); }}
              disabled={locked}
              aria-current={isActive ? "step" : undefined}
              title={locked ? `${step.label} — finish the earlier steps first` : step.label}
              style={{
                ...GF, display: "flex", alignItems: "flex-start", gap: compact ? 8 : 9,
                width: compact ? 150 : 186, minHeight: 44, textAlign: "left",
                padding: compact ? "8px 10px" : "10px 12px", borderRadius: 10,
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
                <span className="prep-card-blurb" style={{
                  display: "block", fontSize: compact ? 10.5 : 11, color: SILVER,
                  marginTop: 2, lineHeight: 1.4,
                }}>
                  {step.blurb}
                </span>
              </span>
            </button>
            {idx < PREPARATION_STEPS.length - 1 && (
              <span aria-hidden style={{ width: compact ? 6 : 12, height: 1, background: "#D1D9E0", flexShrink: 0 }} />
            )}
          </li>
        );
      })}
    </ol>
    {edges.right && (
      <button type="button" className="prep-strip-arrow prep-strip-arrow-right" aria-label="Scroll steps right"
        data-testid="prep-steps-right" onClick={() => { slide(1); }}>
        <ChevronRight size={18} aria-hidden />
      </button>
    )}
    </div>
  );
}

// StepperSidebar removed with the vertical rail it drew. The sequence is
// now StepperCards above (desktop) and StepperTopBar below (mobile).

// ── Mobile stepper ────────────────────────────────────────────────────────────
//
// The same cards as the wide screen, smaller, in a strip you swipe: every
// step you can reach is a card you can tap at any time, a finished one shows
// ✓, and a locked one sits there dimmed until the steps before it are done —
// exactly the wide screen's rules. It used to be a "STEP n OF 8" bar whose
// segments were tappable but showed no names, so nobody knew they could be.
// The line above the cards still says where you are; the strip keeps the
// current card in view, and fades at the edge when there is more to see.

export function StepperTopBar({
  activeStepId, stepStates, onStepClick,
}: {
  activeStepId: PreparationStepId | null;
  stepStates: Record<PreparationStepId, PreparationStepState>;
  onStepClick: (id: PreparationStepId) => void;
}) {
  const activeIdx = activeStepId ? Math.max(0, STEP_ORDER.indexOf(activeStepId)) : 0;
  const current = PREPARATION_STEPS[activeIdx];
  return (
    <div style={{ background: "#F5F7FA", borderBottom: "1px solid #E3E8EF", padding: "8px 0 8px" }}>
      <p data-testid="prep-step-caption" style={{ ...GF, margin: "0 16px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569" }}>
        Step {activeIdx + 1} of {PREPARATION_STEPS.length}
        {current && <span style={{ color: NAVY, letterSpacing: 0, textTransform: "none", fontSize: 12.5 }}> · {current.label}</span>}
      </p>
      <StepperCards
        activeStepId={activeStepId}
        stepStates={stepStates}
        onStepClick={onStepClick}
        compact
      />
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
  /* The horizontal card strip. Desktop; below 769px the same cards come
     smaller, in the phone bar (StepperTopBar). */
  .prep-steprail {
    display: block;
    background: #FFFFFF;
    border-bottom: 1px solid #E3E8EF;
    flex-shrink: 0;
  }
  .prep-steprail ol::-webkit-scrollbar { display: none; }
  .prep-cards-compact::-webkit-scrollbar { display: none; }
  /* More cards off to the side: an arrow at that edge slides the strip. */
  .prep-strip { position: relative; }
  .prep-strip-arrow {
    position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
    width: 34px; height: 34px; border-radius: 50%; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    background: #FFFFFF; color: ${NAVY}; border: 1px solid #D1D9E0; cursor: pointer;
    box-shadow: 0 4px 12px -4px rgba(7,17,31,0.35);
    transition: background 120ms ease, border-color 120ms ease;
  }
  .prep-strip-arrow:hover { background: #EBF4FC; border-color: ${AZURE}; }
  .prep-strip-arrow:focus-visible { outline: 3px solid rgba(0,120,212,0.45); outline-offset: 2px; }
  .prep-strip-arrow-left { left: 6px; }
  .prep-strip-arrow-right { right: 6px; }
  @media (prefers-reduced-motion: reduce) {
    .prep-strip ol { scroll-behavior: auto !important; }
  }
  .prep-cards-compact .prep-card-blurb {
    display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

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
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    column-gap: 12px;
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
  /* Below a laptop width the long "see what's left" link would wrap into
     three lines beside Continue; the Guide button in the middle of the bar
     carries the same count and opens the same list. */
  @media (max-width: 1100px) {
    .prep-nav-reminder { display: none !important; }
  }
  @media (max-width: 768px) {
    .prep-layout-root { height: 100dvh; }
    .prep-sidebar  { display: none; }
    .prep-steprail { display: none; }
    .prep-topbar   { display: block; }
    .prep-step-area { padding: 20px 16px 32px; }
    .prep-nav-bar   { padding: 12px 16px; column-gap: 8px; }
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
      processScreen("discard-draft"),
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
              guide={<PreparationHelpFab />}
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
