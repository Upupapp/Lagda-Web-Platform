// Product Tour engine — shared types.
// Config-driven: new chapters/steps are added to tourConfig.ts without
// touching TourContext.tsx, TourOverlay.tsx, or TourCoachmark.tsx.

import type { PlatformPermission } from "../models";
import type { ProductCapabilityId } from "../models/product-capability";

export type TourStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type CoachmarkPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface GuideStep {
  /** Stable unique id, e.g. "dashboard.quick-actions". */
  id: string;
  /** Logical grouping — used for step-count display and future chapter selection. */
  chapter: string;
  /** Route this step lives on. If omitted, assumed to be the current route. */
  route?: string;
  /**
   * Value of the `data-guide="..."` attribute on the real DOM node to spotlight.
   * Omit for a centered, targetless step (e.g. a welcome/intro card).
   */
  target?: string;
  /**
   * Alternate `data-guide="..."` value to spotlight when the viewport is
   * narrower than the mobile breakpoint (see TourContext's MOBILE_BREAKPOINT).
   * Used for chrome that renders different DOM at different widths — e.g. the
   * desktop header toolbar vs. the mobile nav drawer — where both elements
   * are mounted but only one is visible at a time. Falls back to `target`
   * when omitted or when running above the breakpoint.
   */
  mobileTarget?: string;
  title: string;
  description: string;
  /** Preferred placement; the engine falls back automatically if it won't fit. */
  placement?: CoachmarkPlacement;
  /**
   * Extra eligibility check evaluated against the live DOM/app state when the
   * tour (re)computes its step list. Return false to exclude this step for the
   * current user/session. Optional-content sections (My Actions, Notifications,
   * Bulk Send, Reports, Automation) use this to mirror PlatformDashboard.tsx's
   * own conditional rendering.
   */
  condition?: () => boolean;
  /** Permission required, mirrors usePlatform().hasPermission(). */
  permission?: PlatformPermission;
  /** Eligible if the user has ANY of these permissions (mirrors `a || b` gating in PlatformDashboard.tsx). */
  anyPermission?: PlatformPermission[];
  /** Capability required, mirrors usePlatform().resolveCapability(id).available. */
  capability?: ProductCapabilityId | string;
  /** "explain" (default): target is never interactive during this step. */
  mode?: "explain" | "interact";
  /** Reserved for future "interact" steps — not used by explain-only content. */
  allowTargetInteraction?: boolean;
  /** Bounded wait (ms) for the target element to appear before giving up. */
  targetTimeoutMs?: number;
  /** What to do if the target never appears in time. Default: "skip". */
  fallback?: "skip" | "end";
}

export interface TourPersistedState {
  tourId: string;
  tourVersion: number;
  status: TourStatus;
  lastStepId?: string;
  completedAt?: string;
  skippedAt?: string;
}
