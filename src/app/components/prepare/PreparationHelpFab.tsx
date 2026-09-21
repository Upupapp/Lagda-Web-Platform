// Floating Help/Preparation FAB — persistent across every /app/prepare/*
// step (mounted once in PrepareLayout).
//
// ── What it answers, and in what order ─────────────────────────────────────
//
// It used to answer one question: "what is left before I can send this".
// That is the right question at the END of preparation and the wrong one at
// the start, where somebody looking at "Routing" for the first time mostly
// needs to know what routing IS. A panel that only ever lists faults is a
// panel that only ever speaks to correct you.
//
// So the panel now leads with the step you are ON:
//
//   1. this step's guide     — what it decides, what it requires
//   2. this step's blockers  — what is wrong HERE, right now
//   3. everything else       — collapsed, because it is a different question
//
// The cross-step list is kept rather than dropped: "can I send yet" is still
// worth asking, just not first. MissingItemsModal, which answers exactly
// that when Continue is blocked, is untouched — this does not reimplement it.
//
// ── Reuses rather than reimplements ────────────────────────────────────────
//
//   - mock/demo mode: PrepareContext.validate() (validateDraftState) —
//     the exact same PrepValidationIssue[] the sidebar dots and
//     MissingItemsModal already use.
//   - real-backend mode: computeSendReadiness(), the exact same function
//     ConfirmationPage's "not ready to send" banner uses.
//   - the shared design system's tokens, instead of the four local hex
//     constants this file used to carry, which had already drifted from the
//     signer's palette by a few points with nothing recording whether that
//     was a decision.
//
// No new validation rules are invented here.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { HelpCircle, X, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { usePrepare } from "../../context/PrepareContext";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { computeSendReadiness, buildActionUrl, type SendReadinessAction } from "../../services/prepare/send-readiness";
import {
  type HelpItem,
  helpItemsFromReadiness, fieldsDoneFromReadiness, helpItemsFromValidation,
  completionPercent, partitionByStep,
} from "./preparation-help";
import { PREP_STEP_GUIDES, currentStepFromPath } from "./prep-step-guides";
import { T, GF, TONE, TAP, useViewport, InfoRow } from "../system/design-system";
import { Z } from "../../utils/z-index";

/**
 * The height of `.prep-nav-bar` plus a gap, or the fallback when there is no
 * bar (the Fields step hides it). Re-measured on resize and, where the
 * browser has it, whenever the bar itself changes size — its height depends
 * on whether a blocker is showing, which changes without the window moving.
 */
function useNavBarClearance(fallback: number): number {
  const [clearance, setClearance] = useState(fallback);

  useEffect(() => {
    const GAP = 16;
    const bar = document.querySelector<HTMLElement>(".prep-nav-bar");
    if (!bar) { setClearance(fallback); return; }

    const measure = () => { setClearance(Math.round(bar.getBoundingClientRect().height) + GAP); };
    measure();

    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(bar);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [fallback]);

  return clearance;
}

/**
 * How a blocked action asks the FAB for attention.
 *
 * A DOM event rather than context, deliberately: the callers are scattered
 * across step pages that have no relationship to this component, and threading
 * a callback through every one of them would put a prop about help panels into
 * files that are otherwise about routing and fields.
 *
 * Exported as a function so no caller has to remember the event name.
 */
export function nudgePreparationHelp(): void {
  window.dispatchEvent(new CustomEvent(PREP_HELP_NUDGE));
}

const PREP_HELP_NUDGE = "lagda:prep-help-nudge";

export function PreparationHelpFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCompact } = useViewport();
  const {
    draft, validate, stepStates, syncError, multiDocumentSigningGap, fieldsSnapshot,
  } = usePrepare();

  const [open, setOpen] = useState(false);
  // Drives the 1s shake. Cleared by a timer so the class can be re-applied on
  // the next blocked attempt — an animation that is never removed plays once
  // and then never again.
  const [nudging, setNudging] = useState(false);

  // Shake, then show. The order matters: opening first would cover the FAB
  // with the very panel the shake is pointing at.
  useEffect(() => {
    const onNudge = () => {
      setNudging(true);
      window.setTimeout(() => { setNudging(false); }, 1000);
      // Long enough for the movement to register as coming FROM the button,
      // short enough that it still feels like one action.
      window.setTimeout(() => { setOpen(true); }, 420);
    };
    window.addEventListener(PREP_HELP_NUDGE, onNudge);
    return () => { window.removeEventListener(PREP_HELP_NUDGE, onNudge); };
  }, []);
  const [showOthers, setShowOthers] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const stepId = currentStepFromPath(location.pathname);

  // Geometry that used to live in a `@media (max-width: 480px)` block at the
  // bottom of this file. Driven by `useViewport` instead, so there is ONE
  // breakpoint vocabulary in the app rather than a CSS one here and a JS one
  // everywhere else — and so these values can be derived from each other
  // (the panel sits a fixed gap above the FAB) instead of being three
  // hand-kept numbers that silently disagree after an edit.
  const fabSize = isCompact ? 48 : 52;

  // Clearance above the wizard's Previous/Continue bar is MEASURED, not
  // assumed. The previous constants (80/96px) were calibrated against a bar
  // that, at 320px, actually reached 131px on two steps — so the FAB sat on
  // top of Continue at exactly the widths it was meant to clear. The bar is
  // shorter now, but the lesson is that a fixed number here is a guess about
  // someone else's layout; measuring it is the only version that stays true.
  const navBarClearance = useNavBarClearance(isCompact ? 80 : 96);

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

  // Moving to another step makes the previous step's disclosure state
  // meaningless — collapse it rather than carrying it across.
  useEffect(() => { setShowOthers(false); }, [stepId]);

  const { items, ready, percent } = useMemo(() => {
    if (!draft) return { items: [] as HelpItem[], ready: false, percent: 0 };

    if (USE_REAL_BACKEND) {
      const readiness = computeSendReadiness({
        draft, multiDocumentSigningGap, syncError, fields: fieldsSnapshot,
      });
      return {
        items: helpItemsFromReadiness(readiness),
        ready: readiness.ready,
        percent: completionPercent(stepStates, fieldsDoneFromReadiness(readiness)),
      };
    }
    const validation = validate();
    // Demo mode has no backend-verified field signal — a non-empty snapshot
    // is the best proxy once the visitor has actually opened Fields.
    const fieldsDone = (fieldsSnapshot?.length ?? 0) > 0;
    return {
      items: helpItemsFromValidation(validation.errors),
      ready: validation.errors.length === 0,
      percent: completionPercent(stepStates, fieldsDone),
    };
  }, [draft, validate, stepStates, syncError, multiDocumentSigningGap, fieldsSnapshot]);

  const { here, elsewhere } = useMemo(
    () => partitionByStep(items, stepId), [items, stepId]);

  if (!draft) return null;

  const guide = stepId === null ? null : PREP_STEP_GUIDES[stepId];

  const handleItemClick = (action: SendReadinessAction) => {
    setOpen(false);
    void navigate(buildActionUrl(action));
  };

  const blockerRow = (item: HelpItem, showStep: boolean) => (
    <button
      key={item.id}
      type="button"
      onClick={() => handleItemClick(item.action)}
      style={{
        ...GF,
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", textAlign: "left",
        // A blocker is a tap target like any other, and these sit in a
        // scrolling list where a mis-tap navigates somewhere unexpected.
        minHeight: TAP,
        padding: "10px 12px", borderRadius: 10,
        border: `1px solid ${TONE.warn.edge}`, background: TONE.warn.wash,
        cursor: "pointer",
      }}
      className="prep-help-item"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {showStep && (
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em",
            textTransform: "uppercase", color: TONE.warn.fg, marginBottom: 2,
          }}>
            {item.stepLabel}
          </div>
        )}
        <div style={{
          fontSize: 12.5, color: T.ink, lineHeight: 1.4,
          // A long blocker message must wrap, not widen the panel.
          overflowWrap: "anywhere",
        }}>
          {item.message}
        </div>
      </div>
      <ChevronRight size={15} color={TONE.warn.fg} style={{ flexShrink: 0 }} />
    </button>
  );

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
          right: `max(${String(isCompact ? 16 : 20)}px, env(safe-area-inset-right, 0px))`,
          // Cleared above the wizard's Previous/Continue nav bar rather than
          // the viewport edge, so the FAB never sits on top of Continue.
          // That bar is ~73px on desktop and ~65px on mobile (see
          // PrepareLayout's .prep-nav-bar and its own media query).
          bottom: `calc(${String(navBarClearance)}px + env(safe-area-inset-bottom, 0px))`,
          zIndex: Z.helpFab,
          width: fabSize,
          height: fabSize,
          borderRadius: "50%",
          border: "none",
          background: ready ? T.success : T.ink,
          color: T.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(7,17,31,0.28)",
        }}
        className={`prep-help-fab${nudging ? " prep-help-fab--nudge" : ""}`}
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
              background: T.warn,
              color: T.surface,
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${T.surface}`,
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
            // On a phone the panel spans the width rather than hanging off
            // the FAB: a 360px popover anchored right has nowhere to go at
            // 320px, and clamping it to the viewport leaves it touching both
            // edges anyway.
            ...(isCompact
              ? { left: 12, right: 12, width: "auto" }
              : { right: "max(20px, env(safe-area-inset-right, 0px))", width: 360 }),
            bottom: `calc(${String(navBarClearance + fabSize + 12)}px + env(safe-area-inset-bottom, 0px))`,
            maxHeight: isCompact ? "min(65vh, 520px)" : "min(70vh, 560px)",
            display: "flex",
            flexDirection: "column",
            background: T.surface,
            borderRadius: 16,
            boxShadow: "0 20px 56px rgba(7,17,31,0.24)",
            border: `1px solid ${T.border}`,
            overflow: "hidden",
          }}
        >
          {/* Header — progress, which is the one cross-step fact worth
              keeping in view at all times. */}
          <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h2 id="prep-help-heading" style={{ ...GF, fontSize: 14, fontWeight: 800, color: T.ink, margin: 0 }}>
                Preparation guide
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  width: 26, height: 26, borderRadius: 8, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.ink, display: "flex", alignItems: "center",
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
                aria-label={`Preparation ${String(percent)}% complete`}
                style={{ flex: 1, height: 6, borderRadius: 4, background: T.border, overflow: "hidden" }}
              >
                <div style={{
                  height: "100%", width: `${String(percent)}%`,
                  background: ready ? T.success : T.azure,
                  borderRadius: 4, transition: "width 0.3s ease",
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.silver, flexShrink: 0 }}>
                {percent}%
              </span>
            </div>

            <div
              style={{
                ...GF, marginTop: 10, display: "flex", alignItems: "center", gap: 6,
                fontSize: 12.5, fontWeight: 700, color: ready ? T.success : T.warn,
              }}
            >
              {ready ? <CheckCircle2 size={15} strokeWidth={2.25} /> : null}
              {ready
                ? "Ready for signing / sending"
                : items.length === 1
                  ? "1 thing is stopping this from being ready"
                  : `${String(items.length)} things are stopping this from being ready`}
            </div>
          </div>

          {/* Body */}
          <div style={{ overflowY: "auto", padding: "12px", flex: 1 }}>
            {/* 1 — where you are. Shown even when the step is clean: the
                point is to explain the step, not only to fault it. */}
            {guide && (
              <section style={{ marginBottom: elsewhere.length > 0 || here.length > 0 ? 14 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0, display: "grid", placeItems: "center",
                      width: 30, height: 30, borderRadius: 9,
                      background: T.azureWash, border: `1px solid ${TONE.info.edge}`,
                      color: T.azureDeep,
                    }}
                  >
                    <guide.icon size={16} />
                  </span>
                  <h3 style={{
                    ...GF, margin: 0, fontSize: 14, fontWeight: 800, color: T.ink,
                  }}>
                    {guide.banner}
                  </h3>
                </div>

                <p style={{
                  ...GF, margin: "0 0 10px", fontSize: 12.5, color: T.inkSoft,
                  lineHeight: 1.5,
                }}>
                  {guide.description}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {guide.requirements.map(requirement => (
                    <InfoRow
                      key={requirement.label}
                      icon={guide.icon}
                      label={requirement.label}
                      info={requirement.info}
                      badge={requirement.required ? "Required" : "Optional"}
                      tone={requirement.required ? "info" : "neutral"}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 2 — what is wrong here. */}
            {here.length > 0 && (
              <section style={{ marginBottom: elsewhere.length > 0 ? 12 : 0 }}>
                <h3 style={{
                  ...GF, margin: "0 0 7px", fontSize: 11, fontWeight: 800,
                  letterSpacing: "0.05em", textTransform: "uppercase", color: T.warn,
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <AlertCircle size={13} aria-hidden />
                  Needs attention on this step
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {here.map(item => blockerRow(item, false))}
                </div>
              </section>
            )}

            {/* 3 — everything else, behind a disclosure. A different
                question, so not competing with the two above. */}
            {elsewhere.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setShowOthers(v => !v)}
                  aria-expanded={showOthers}
                  style={{
                    ...GF, display: "flex", alignItems: "center", gap: 6,
                    width: "100%", minHeight: TAP, padding: "8px 10px",
                    borderRadius: 9, border: `1px solid ${T.border}`,
                    background: T.canvas, color: T.inkSoft,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <ChevronRight
                    size={14}
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      transform: showOthers ? "rotate(90deg)" : undefined,
                      transition: "transform 120ms ease",
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    {elsewhere.length === 1
                      ? "1 item on another step"
                      : `${String(elsewhere.length)} items on other steps`}
                  </span>
                </button>

                {showOthers && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                    {elsewhere.map(item => blockerRow(item, true))}
                  </div>
                )}
              </section>
            )}

            {/* Nothing wrong anywhere, and no step guide to show (a route
                outside the wizard's steps). */}
            {guide === null && items.length === 0 && (
              <p style={{ ...GF, fontSize: 12.5, color: T.silver, margin: "6px 4px" }}>
                Nothing to report yet — start with the Documents step.
              </p>
            )}

            {ready && guide !== null && (
              <p style={{
                ...GF, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6,
                margin: "12px 2px 0",
              }}>
                Every required step has been completed. You can continue to Review and send
                this document whenever you&rsquo;re ready.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Only what inline styles genuinely cannot express. The geometry that
          used to live here is now derived from `useViewport` above. */}
      <style>{`
        .prep-help-fab:hover { filter: brightness(1.08); }

        /* The nudge, when somebody tries to move on with work outstanding.
           *
           * A shake is an interruption, so it has to be worth one: it fires
           * only on a blocked attempt to advance, never on arrival at a step
           * and never on a timer. One second, once per attempt.
           *
           * prefers-reduced-motion turns the movement off entirely and
           * keeps the ring. Shaking is exactly the motion that makes a
           * vestibular disorder worse, and the guide panel opens either way —
           * the animation is the pointer, not the message. */
        @keyframes prep-fab-wiggle {
          0%, 100% { rotate: 0deg; }
          15%      { rotate: -11deg; }
          30%      { rotate: 9deg; }
          45%      { rotate: -7deg; }
          60%      { rotate: 5deg; }
          75%      { rotate: -3deg; }
        }
        @keyframes prep-fab-ring {
          0%   { box-shadow: 0 0 0 0 rgba(0,120,212,0.45); }
          100% { box-shadow: 0 0 0 14px rgba(0,120,212,0); }
        }
        .prep-help-fab--nudge {
          animation: prep-fab-wiggle 1s ease-in-out, prep-fab-ring 1s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .prep-help-fab--nudge { animation: prep-fab-ring 1s ease-out; }
        }
        .prep-help-item:hover { filter: brightness(0.98); }
      `}</style>
    </>
  );
}
