// The signer's design system.
//
// ── Why the signer gets its own ────────────────────────────────────────────
//
// A signer is not a user of this product. They arrived from an email, they may
// never see LAGDA again, and they are about to do something legally
// consequential on someone else's say-so. The sender's platform chrome —
// sidebars, workspace switchers, dense tables — is built for people who live
// here. None of it helps someone who needs to understand one document, one
// obligation, and one decision.
//
// So this is deliberately quieter and larger than the platform: one column,
// one action in view at a time, and every state announced rather than
// inferred.
//
// ── What moved, and why this file still exists ─────────────────────────────
//
// Designing for the signer produced tokens and primitives that turned out to
// be right for every surface someone meets before they are fluent in the
// product. Those now live in `components/system/design-system.tsx` and are
// shared with onboarding and the preparation guide — see that file's header
// for the reasoning.
//
// This file re-exports them unchanged, so no recipient-side import had to
// move, and keeps what is genuinely about SIGNING: the ceremony's three-step
// rail, and the card sized to carry a document.

import { ProgressRail, SurfaceCard, type RailStep } from "../system/design-system";

// ── Re-exports ──────────────────────────────────────────────────────────────
//
// The signer surfaces import these from here; they are defined once, in the
// shared module. Re-exporting rather than re-declaring is the point — two
// copies of a palette that drift by a few points of lightness is exactly the
// failure the extraction was for.

export {
  T, GF, TONE, TAP,
  useViewport,
  PhaseBanner,
  Notice,
  ActionButton,
  ActionRow,
  IdentityStrip,
  InfoRow,
  ProgressRail,
  SurfaceCard,
} from "../system/design-system";

export type {
  Tone, Viewport, PhaseBannerProps, ButtonKind, ActionButtonProps,
  RailStep, InfoRowProps,
} from "../system/design-system";

// ── Shell ───────────────────────────────────────────────────────────────────

/**
 * The one-column surface every signer screen sits on.
 *
 * `wide` for the ceremony, which carries a document; the default for the
 * single-decision screens, which read better narrow.
 *
 * Kept as a named alias rather than replaced at every call site: `SignerCard`
 * says what it is for, and the rename would have touched every signer screen
 * to no benefit.
 */
export const SignerCard = SurfaceCard;

// ── Progress ────────────────────────────────────────────────────────────────

export type SignerStep = "consent" | "sign" | "done";

const STEPS: readonly RailStep[] = [
  { id: "consent", label: "Consent", short: "1" },
  { id: "sign", label: "Review & sign", short: "2" },
  { id: "done", label: "Done", short: "3" },
];

/**
 * Where the signer is in the ceremony.
 *
 * Present on every screen that is part of the flow, because "how much more of
 * this is there" is the first question someone asks when a legal document
 * appears on their phone — and an unanswered one is a reason to close the tab.
 *
 * The rail itself is shared; what stays here is the ceremony's own three
 * steps, which mean nothing to any other flow.
 */
export function StepRail({ current }: { current: SignerStep }) {
  return <ProgressRail steps={STEPS} current={current} label="Signing progress" />;
}
