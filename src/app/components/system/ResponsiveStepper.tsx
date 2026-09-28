// One stepper for the multi-step flows (Use Template, Prepare Document).
//
// Phones (<640px) get the compact form: a "STEP n OF N" kicker, the current
// step's name, an N-segment progress bar and a "Next: …" line. Nothing in it
// can wrap into a second row of pills or run off a 320px screen. Segments for
// steps the flow already lets you return to are 44px-tall buttons.
//
// From 640px up it is a horizontal stepper. Labels never wrap — they ellipsize
// — and the connectors between steps share the leftover width equally, so the
// row reads as evenly spaced whatever the label lengths.
//
// The stepper decides nothing about the flow. Which steps are done and which
// may be revisited are the caller's answers, passed in.

import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { useMediaQuery } from "../../hooks/useViewport";

export const STEPPER_COMPACT_MAX = 639;

export interface StepperStep {
  readonly id: string;
  readonly label: string;
  /** Used by the full stepper when space is tight (many steps). */
  readonly shortLabel?: string;
}

export interface ResponsiveStepperProps {
  readonly steps: readonly StepperStep[];
  readonly currentIndex: number;
  /** Whether step i counts as done. Defaults to "every step before the current one". */
  readonly isComplete?: (index: number) => boolean;
  /** Whether step i may be selected. Omit, or return false, for a read-only step. */
  readonly canSelect?: (index: number) => boolean;
  readonly onSelect?: (index: number) => void;
  /** Accessible name for the whole sequence. */
  readonly label: string;
  /** Force a mode — tests and callers that already know their width. */
  readonly mode?: "compact" | "full";
  readonly useShortLabels?: boolean;
}

const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const INK_SOFT = "#475569";   // 7.6:1 on white
const AZURE = "#0078D4";      // 4.5:1 on white
const AZURE_DEEP = "#005A9E";
const GREY = "#CBD5E1";

export const STEPPER_STYLES = `
  .rstep-seg { position: relative; flex: 1 1 0; min-width: 0; min-height: 44px; display: flex; align-items: center; padding: 0; border: none; background: none; }
  .rstep-seg-bar { display: block; width: 100%; height: 6px; border-radius: 999px; background: ${GREY}; overflow: hidden; }
  .rstep-seg-fill { display: block; height: 100%; background: ${AZURE}; border-radius: 999px; }
  button.rstep-seg { cursor: pointer; }
  button.rstep-seg:hover .rstep-seg-bar { background: #94A3B8; }
  .rstep-seg:focus-visible, .rstep-full-btn:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; border-radius: 6px; }
  .rstep-full-btn { display: inline-flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; min-height: 44px; padding: 0 4px; border: none; background: none; cursor: pointer; font: inherit; color: inherit; }
  .rstep-full-btn:disabled { cursor: default; }
  button.rstep-full-btn:not(:disabled):hover .rstep-full-label { text-decoration: underline; }
`;

function stepName(i: number, n: number, name: string) {
  return `Step ${String(i + 1)} of ${String(n)}, ${name}`;
}

export function ResponsiveStepper({
  steps, currentIndex, isComplete, canSelect, onSelect, label, mode, useShortLabels = false,
}: ResponsiveStepperProps) {
  const phone = useMediaQuery(`(max-width: ${String(STEPPER_COMPACT_MAX)}px)`);
  const compact = mode ? mode === "compact" : phone;
  const n = steps.length;
  const done = (i: number) => (isComplete ? isComplete(i) : i < currentIndex);
  const selectable = (i: number) => i !== currentIndex && !!onSelect && !!canSelect?.(i);
  const current = steps[currentIndex];
  const next = steps[currentIndex + 1];

  if (compact) {
    return (
      <nav aria-label={label} className="rstep rstep-compact" data-mode="compact" style={{ ...GF, minWidth: 0 }}>
        <style>{STEPPER_STYLES}</style>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: INK_SOFT, textTransform: "uppercase" }}>
          Step {currentIndex + 1} of {n}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current?.label}
        </p>
        <ol style={{ display: "flex", gap: 4, listStyle: "none", margin: "2px 0", padding: 0 }}>
          {steps.map((s, i) => {
            const isCur = i === currentIndex;
            const fill = isCur ? "50%" : done(i) ? "100%" : "0%";
            const bar = (
              <span className="rstep-seg-bar" aria-hidden>
                <span className="rstep-seg-fill" style={{ width: fill }} />
              </span>
            );
            const a11y = stepName(i, n, s.label) + (done(i) && !isCur ? ", completed" : "");
            return (
              <li key={s.id} style={{ flex: "1 1 0", minWidth: 0, display: "flex" }}>
                {selectable(i) ? (
                  <button type="button" className="rstep-seg" aria-label={`${a11y}. Go back to this step`}
                    onClick={() => onSelect?.(i)}>
                    {bar}
                  </button>
                ) : (
                  <span className="rstep-seg" role="img" aria-label={a11y}
                    aria-current={isCur ? "step" : undefined}>
                    {bar}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p style={{ margin: 0, fontSize: 13, color: INK_SOFT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {next ? <>Next: <span style={{ color: NAVY, fontWeight: 600 }}>{next.label}</span></> : "Last step"}
        </p>
      </nav>
    );
  }

  // Many steps (the eight-step Prepare wizard) get tighter spacing so the
  // labels still fit between 640px and a tablet's width.
  const dense = n > 5;
  const dot = dense ? 22 : 26;
  return (
    <nav aria-label={label} className="rstep rstep-full" data-mode="full" style={{ ...GF, minWidth: 0 }}>
      <style>{STEPPER_STYLES}</style>
      <ol style={{ display: "flex", alignItems: "center", listStyle: "none", margin: 0, padding: 0, minWidth: 0 }}>
        {steps.map((s, i) => {
          const isCur = i === currentIndex;
          const isDone = done(i) && !isCur;
          const text = useShortLabels ? (s.shortLabel ?? s.label) : s.label;
          const inner = (
            <>
              <span aria-hidden style={{
                width: dot, height: dot, borderRadius: "50%", flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: isDone || isCur ? AZURE : "#FFFFFF",
                border: isDone || isCur ? `1.5px solid ${AZURE}` : `1.5px solid ${GREY}`,
                color: isDone || isCur ? "#FFFFFF" : INK_SOFT, fontSize: dense ? 11 : 12, fontWeight: 700,
              }}>
                {isDone ? <Check size={14} /> : i + 1}
              </span>
              <span className="rstep-full-label" style={{
                fontSize: dense ? 12.5 : 13.5, fontWeight: isCur ? 700 : 500,
                color: isCur ? NAVY : isDone ? AZURE_DEEP : INK_SOFT,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
              }}>
                {text}
              </span>
            </>
          );
          const a11y = stepName(i, n, s.label) + (isDone ? ", completed" : "");
          return [
            <li key={s.id} style={{ flex: "0 1 auto", minWidth: 0, display: "flex" }} title={s.label}>
              {selectable(i) ? (
                <button type="button" className="rstep-full-btn" aria-label={a11y} onClick={() => onSelect?.(i)}
                  style={dense ? { gap: 6, padding: "0 2px" } : undefined}>
                  {inner}
                </button>
              ) : (
                <span className="rstep-full-btn" role="img" aria-label={a11y}
                  aria-current={isCur ? "step" : undefined}
                  style={{ cursor: "default", ...(dense ? { gap: 6, padding: "0 2px" } : {}) }}>
                  {inner}
                </span>
              )}
            </li>,
            i < n - 1 && (
              <li key={`${s.id}-sep`} aria-hidden role="presentation"
                data-testid="rstep-connector"
                style={{ flex: "1 1 0", minWidth: dense ? 6 : 12, height: 2, margin: dense ? "0 4px" : "0 8px", borderRadius: 1, background: isDone ? AZURE : GREY }} />
            ),
          ];
        })}
      </ol>
    </nav>
  );
}
