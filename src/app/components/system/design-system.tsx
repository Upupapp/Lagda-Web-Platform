// The shared design system.
//
// ── Why this exists ────────────────────────────────────────────────────────
//
// These primitives were written for the signer (`recipient/signer-ui.tsx`),
// where the constraints were sharpest: a stranger, on a phone, from an email,
// about to do something legally consequential. Designing for that reader
// produced tokens and components that turned out to be right for every
// surface a person meets before they are fluent in the product — onboarding,
// the preparation guide, anywhere the job is to explain rather than to house
// an expert's dense controls.
//
// The alternative was a second palette. The preparation FAB had already
// started one: NAVY, AZURE, SILVER, GOLD as local hex constants, drifting
// from the signer's by a few points of lightness with nothing recording which
// was intended. Two systems that are ALMOST the same is worse than two that
// are plainly different, because nobody can tell a mistake from a decision.
//
// So this module holds the tokens and the domain-neutral primitives, and
// `signer-ui.tsx` re-exports them so no existing recipient-side import had to
// move. What stays in `signer-ui.tsx` is only what is genuinely about
// SIGNING — the ceremony's three-step rail, the card sized for a document.
//
// ── Mobile S is the design target, not an afterthought ─────────────────────
//
// 320px is the narrowest real device still in use. Every size here is fluid
// (`clamp`) rather than switched at a breakpoint, so there is no width at
// which the layout is merely tolerated. `useViewport` exists for the few
// decisions that genuinely cannot be fluid — stacking a row into a column,
// dropping a label to its icon.

import React, { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// ── Tokens ──────────────────────────────────────────────────────────────────

export const T = {
  ink: "#07111F",
  inkSoft: "#33414F",
  silver: "#8A9BAE",
  azure: "#0078D4",
  azureDeep: "#005A9E",
  azureWash: "#EAF4FC",
  surface: "#FFFFFF",
  canvas: "#F5F7FA",
  border: "#E3E8EF",
  borderStrong: "#D1D9E0",

  success: "#1E7F4F",
  successWash: "#EAF7EF",
  warn: "#9A6B00",
  warnWash: "#FFF8E6",
  danger: "#C0392B",
  dangerWash: "#FEF2F2",
} as const;

export const GF: CSSProperties = { fontFamily: "'Geist', sans-serif" };

export type Tone = "neutral" | "info" | "success" | "warn" | "danger";

/**
 * Exported, unlike in the signer's original.
 *
 * The preparation FAB needs the same amber a warning uses, and the only
 * alternative to reading it from here is writing `#FFF8E6` into a second
 * file — which is exactly the drift this module exists to end.
 */
export const TONE: Record<Tone, { fg: string; wash: string; edge: string }> = {
  neutral: { fg: T.inkSoft, wash: "#F3F6F9", edge: T.border },
  info: { fg: T.azureDeep, wash: T.azureWash, edge: "#B7DAF5" },
  success: { fg: T.success, wash: T.successWash, edge: "#B7E3CA" },
  warn: { fg: T.warn, wash: T.warnWash, edge: "#EBD9A6" },
  danger: { fg: T.danger, wash: T.dangerWash, edge: "#F3C4BF" },
};

/**
 * Minimum comfortable touch target.
 *
 * 44px, which is the smallest size a finger hits reliably. Applied to every
 * control rather than only the obvious ones: the "small" controls on these
 * screens are things like a decline reason or a consent checkbox, and a
 * mis-tap there is not a cosmetic problem.
 */
export const TAP = 44;

// ── Viewport ────────────────────────────────────────────────────────────────

export interface Viewport {
  readonly width: number;
  /** 360px and under — Mobile S through small Android. */
  readonly isMobileS: boolean;
  /** Phone-ish. Rows stack, secondary labels drop to icons. */
  readonly isCompact: boolean;
}

export function useViewport(): Viewport {
  const [width, setWidth] = useState(
    () => (typeof window === "undefined" ? 1024 : window.innerWidth));

  useEffect(() => {
    const measure = () => { setWidth(window.innerWidth); };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return { width, isMobileS: width <= 360, isCompact: width <= 560 };
}

// ── Shell ───────────────────────────────────────────────────────────────────

/**
 * The one-column surface these screens sit on.
 *
 * `wide` for a surface carrying a document; the default for single-decision
 * screens, which read better narrow.
 */
export function SurfaceCard({
  children, wide = false,
}: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      style={{
        ...GF,
        width: "100%",
        maxWidth: wide ? 860 : 560,
        margin: "0 auto",
        // Fluid rather than switched: there is no width at which this is
        // merely tolerated.
        padding: "clamp(16px, 4vw, 40px) clamp(12px, 4vw, 24px) 64px",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

// ── Banner ──────────────────────────────────────────────────────────────────

export interface PhaseBannerProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: ReactNode;
  readonly tone?: Tone;
  /** A short status word shown as a pill — "Step 2 of 3", "Required". */
  readonly badge?: string;
  /**
   * Heading level. Defaults to `h1`, which is right when the banner IS the
   * screen's identity. Onboarding renders its own page title above the
   * banner, and two `h1`s on one screen is a real accessibility defect, not
   * a stylistic one — so those callers pass `h2`.
   */
  readonly as?: "h1" | "h2";
}

/**
 * A screen's identity, as a banner rather than a heading.
 *
 * The plain `<h1>Submitted</h1>` it replaces told a reader what happened only
 * if they read it. A tone, an icon and a wash say the same thing before the
 * sentence is read, which matters most in exactly the states someone is
 * anxious about.
 */
export function PhaseBanner({
  icon: Icon, title, description, tone = "info", badge, as = "h1",
}: PhaseBannerProps) {
  const { isMobileS } = useViewport();
  const palette = TONE[tone];
  const Heading = as;

  return (
    <div
      style={{
        display: "flex",
        gap: isMobileS ? 12 : 16,
        alignItems: "flex-start",
        padding: isMobileS ? "14px" : "18px 20px",
        borderRadius: 14,
        background: palette.wash,
        border: `1px solid ${palette.edge}`,
        marginBottom: 20,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          width: isMobileS ? 36 : 44,
          height: isMobileS ? 36 : 44,
          borderRadius: 11,
          background: T.surface,
          border: `1px solid ${palette.edge}`,
          color: palette.fg,
        }}
      >
        <Icon size={isMobileS ? 18 : 22} />
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Heading
            style={{
              ...GF, margin: 0, color: T.ink, fontWeight: 800,
              fontSize: "clamp(17px, 4.6vw, 21px)", lineHeight: 1.25,
            }}
          >
            {title}
          </Heading>
          {badge !== undefined && (
            <span
              style={{
                ...GF, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                textTransform: "uppercase", color: palette.fg,
                background: T.surface, border: `1px solid ${palette.edge}`,
                borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {description !== undefined && (
          <p
            style={{
              ...GF, margin: "6px 0 0", color: T.inkSoft, lineHeight: 1.55,
              fontSize: "clamp(13px, 3.4vw, 14px)",
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Notice ──────────────────────────────────────────────────────────────────

/**
 * An inline message tied to something the reader just did.
 *
 * `role="alert"` for the tones that report a problem, so a screen reader
 * announces a rejected submission instead of leaving it to be discovered.
 */
export function Notice({
  icon: Icon, tone = "info", children,
}: { icon?: LucideIcon; tone?: Tone; children: ReactNode }) {
  const palette = TONE[tone];
  const urgent = tone === "danger" || tone === "warn";

  return (
    <div
      role={urgent ? "alert" : undefined}
      style={{
        ...GF, display: "flex", gap: 10, alignItems: "flex-start",
        padding: "11px 13px", borderRadius: 10, marginBottom: 16,
        background: palette.wash, border: `1px solid ${palette.edge}`,
        color: palette.fg, fontSize: "clamp(12px, 3.2vw, 13px)", lineHeight: 1.5,
      }}
    >
      {Icon !== undefined && (
        <Icon size={16} aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
      )}
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────

export type ButtonKind = "primary" | "secondary" | "danger";

export interface ActionButtonProps {
  readonly kind?: ButtonKind;
  readonly icon?: LucideIcon;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly type?: "button" | "submit";
  readonly full?: boolean;
  readonly children: ReactNode;
}

export function ActionButton({
  kind = "primary", icon: Icon, onClick, disabled = false,
  type = "button", full = false, children,
}: ActionButtonProps) {
  const base: CSSProperties = {
    ...GF,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: TAP,
    padding: "0 clamp(16px, 4vw, 24px)",
    borderRadius: 10,
    fontSize: "clamp(13px, 3.4vw, 14px)",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    width: full ? "100%" : undefined,
    // A long label must wrap the button, never overflow the screen.
    whiteSpace: "nowrap",
    transition: "background 120ms ease, border-color 120ms ease",
  };

  const skin: Record<ButtonKind, CSSProperties> = {
    primary: { background: T.azure, color: T.surface, border: "none" },
    secondary: {
      background: T.surface, color: T.ink, border: `1px solid ${T.borderStrong}`,
    },
    danger: { background: T.danger, color: T.surface, border: "none" },
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...skin[kind] }}>
      {Icon !== undefined && <Icon size={16} aria-hidden />}
      {children}
    </button>
  );
}

/**
 * The action row.
 *
 * Stacks on a phone, and the PRIMARY action is first in the DOM either way —
 * so it is also first for a screen reader and for a keyboard, rather than
 * being reachable only after the destructive one.
 */
export function ActionRow({ children }: { children: ReactNode }) {
  const { isCompact } = useViewport();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isCompact ? "column" : "row",
        gap: 10,
        marginTop: 20,
      }}
    >
      {children}
    </div>
  );
}

// ── Progress ────────────────────────────────────────────────────────────────

export interface RailStep {
  readonly id: string;
  readonly label: string;
  /** What replaces the label at Mobile S — usually the step's number. */
  readonly short: string;
}

/**
 * Where someone is in a multi-step flow.
 *
 * Generalised from the signer's three-step ceremony rail, because onboarding
 * asks the same question and had answered it with an unrelated dot strip.
 * "How much more of this is there" is the first thing a person asks when a
 * wizard appears on their phone, and an unanswered one is a reason to close
 * the tab.
 */
export function ProgressRail({
  steps, current, label = "Progress", scrollOnMobile = false,
}: {
  steps: readonly RailStep[]; current: string; label?: string;
  /** On a phone, keep the rail on ONE line and let it scroll sideways
   *  instead of wrapping — for short rails (the signing ceremony's three
   *  steps) where a wrapped second row reads as a separate list. */
  scrollOnMobile?: boolean;
}) {
  const { isMobileS, isCompact } = useViewport();
  const index = steps.findIndex(step => step.id === current);
  const oneLine = scrollOnMobile && isCompact;

  return (
    <ol
      aria-label={label}
      style={{
        ...GF, display: "flex", alignItems: "center", gap: isMobileS ? 4 : 8,
        listStyle: "none", margin: "0 0 18px", padding: 0,
        // A seven-step onboarding rail does not fit 320px even with the
        // labels dropped. Wrapping keeps every dot reachable rather than
        // pushing the last ones off-screen. A rail that opts into one line
        // scrolls sideways instead, so every step stays reachable that way.
        ...(oneLine
          ? { flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }
          : { flexWrap: "wrap", rowGap: 6 }),
      }}
    >
      {steps.map((step, position) => {
        const done = position < index;
        const active = position === index;
        const fg = done || active ? T.azureDeep : T.silver;

        return (
          <li key={step.id} style={{ display: "flex", alignItems: "center", gap: isMobileS ? 4 : 8, minWidth: 0, ...(oneLine ? { flexShrink: 0 } : {}) }}>
            <span
              aria-current={active ? "step" : undefined}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: isMobileS ? "4px 8px" : "5px 11px",
                borderRadius: 999,
                background: active ? T.azureWash : "transparent",
                border: `1px solid ${active ? "#B7DAF5" : done ? "#CFE6F7" : T.border}`,
                color: fg, fontSize: isMobileS ? 11 : 12, fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "grid", placeItems: "center",
                  width: 16, height: 16, borderRadius: 999, fontSize: 10,
                  background: done || active ? T.azure : T.border,
                  color: done || active ? T.surface : T.silver,
                }}
              >
                {done ? "✓" : step.short}
              </span>
              {/* At Mobile S the labels alone would consume the row, so the
                  numbered dot carries the meaning and only the CURRENT step
                  is named. */}
              {(!isMobileS || active) && step.label}
            </span>
            {position < steps.length - 1 && (
              <span
                aria-hidden="true"
                style={{
                  width: isMobileS ? 8 : 18, height: 1,
                  background: done ? T.azure : T.border, flexShrink: 0,
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Meta ────────────────────────────────────────────────────────────────────

/**
 * A labelled fact, in a bordered holder.
 *
 * Used for "who is signing" on the ceremony and for the workspace/plan
 * summary in onboarding — the same shape, because they are the same thing:
 * something the product knows about you, shown rather than assumed.
 */
export function IdentityStrip({
  name, role, documentTitle, label = "Signing as",
}: { name: string; role: string; documentTitle: string; label?: string }) {
  return (
    <div
      style={{
        ...GF, display: "flex", flexDirection: "column", gap: 4,
        padding: "12px 14px", borderRadius: 12,
        background: T.surface, border: `1px solid ${T.border}`, marginBottom: 18,
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
        textTransform: "uppercase", color: T.silver,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "clamp(14px, 3.6vw, 15px)", fontWeight: 700, color: T.ink,
        overflowWrap: "anywhere",
      }}>
        {name} <span style={{ fontWeight: 500, color: T.silver }}>· {role}</span>
      </span>
      <span style={{
        fontSize: "clamp(12px, 3.2vw, 13px)", color: T.inkSoft,
        overflowWrap: "anywhere",
      }}>
        {documentTitle}
      </span>
    </div>
  );
}

// ── Info rows ───────────────────────────────────────────────────────────────

export interface InfoRowProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly info?: ReactNode;
  /**
   * Shown as a pill on the right. The preparation guide uses it for
   * "Required"/"Optional", which is the whole reason this component exists:
   * a list of field names does not tell anyone which ones they must fill.
   */
  readonly badge?: string;
  readonly tone?: Tone;
  /** Satisfied — ticked and muted rather than removed, so the list is stable. */
  readonly done?: boolean;
}

/**
 * One requirement, explained.
 *
 * Icon, label, a line of information, and what it is worth — in a holder, so
 * a list of them reads as a checklist rather than as prose. Deliberately not
 * a button: several of these describe things that cannot be jumped to.
 */
export function InfoRow({
  icon: Icon, label, info, badge, tone = "neutral", done = false,
}: InfoRowProps) {
  const palette = TONE[done ? "success" : tone];

  return (
    <div
      style={{
        ...GF, display: "flex", gap: 10, alignItems: "flex-start",
        padding: "10px 12px", borderRadius: 10,
        background: done ? T.successWash : palette.wash,
        border: `1px solid ${done ? "#B7E3CA" : palette.edge}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0, display: "grid", placeItems: "center",
          width: 26, height: 26, borderRadius: 8,
          background: T.surface, border: `1px solid ${done ? "#B7E3CA" : palette.edge}`,
          color: palette.fg,
        }}
      >
        <Icon size={14} />
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: "clamp(12px, 3.2vw, 13px)", fontWeight: 700, color: T.ink,
            overflowWrap: "anywhere",
          }}>
            {label}
          </span>
          {badge !== undefined && (
            <span style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: "0.04em",
              textTransform: "uppercase", color: palette.fg,
              background: T.surface, border: `1px solid ${palette.edge}`,
              borderRadius: 999, padding: "2px 7px", whiteSpace: "nowrap",
            }}>
              {badge}
            </span>
          )}
        </div>
        {info !== undefined && (
          <div style={{
            fontSize: "clamp(11px, 3vw, 12px)", color: T.inkSoft,
            lineHeight: 1.45, marginTop: 2, overflowWrap: "anywhere",
          }}>
            {info}
          </div>
        )}
      </div>
    </div>
  );
}
