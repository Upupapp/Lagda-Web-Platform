// Optional interaction feedback — Command 37.
//
// A typed, no-op-capable abstraction over brief tactile feedback.
//
// The repository has no approved user-facing opt-in preference for tactile feedback,
// so browser vibration is DISABLED BY DEFAULT here. Core functionality never depends
// on it, and every event below is always accompanied by visible text feedback.
//
// This wraps the existing src/app/utils/haptic.ts rather than duplicating it.
// It does not add a dependency, does not request a device permission, and does not
// introduce a Settings section.
//
// When an approved interaction-preference architecture lands, `enableInteractionFeedback`
// is the single place to wire it in.

import { haptic } from "./haptic";

/**
 * The complete set of moments this feature may acknowledge.
 * Deliberately small: no per-click, per-hover, per-scroll, or passive-update feedback.
 */
export type InteractionFeedbackEvent =
  | "reorder-committed"     // a stage or person snapped into a new position
  | "moved-between-stages"  // a person was moved to another draft stage
  | "validation-resolved"   // the last blocking issue was cleared
  | "invalid-drop"          // a drop target rejected the item
  | "important-confirmation"; // a destructive action was confirmed

/** Maps each event onto a very brief existing haptic pattern. No long patterns exist. */
const EVENT_PATTERN: Record<InteractionFeedbackEvent, Parameters<typeof haptic>[0]> = {
  "reorder-committed":     "selection",
  "moved-between-stages":  "selection",
  "validation-resolved":   "success",
  "invalid-drop":          "warning",
  "important-confirmation": "light",
};

// Off by default. Never read from a query parameter, never persisted.
let enabled = false;

/** Future opt-in hook. Nothing in the current build calls this with `true`. */
export function enableInteractionFeedback(next: boolean): void {
  enabled = next === true;
}

export function isInteractionFeedbackEnabled(): boolean {
  return enabled;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Fires brief tactile feedback if — and only if — every condition holds:
 *   1. The feature has been explicitly enabled (it is not, by default).
 *   2. The user has not asked for reduced motion.
 *   3. The platform actually supports vibration.
 *
 * Always safe to call. Always returns void. Never throws. Never blocks the interaction.
 * Must always be paired with a visible change; it never replaces text or visual status.
 */
export function interactionFeedback(event: InteractionFeedbackEvent): void {
  if (!enabled) return;
  if (prefersReducedMotion()) return;
  try {
    haptic(EVENT_PATTERN[event]);
  } catch {
    // Feedback is a progressive enhancement — failure is always silent.
  }
}
