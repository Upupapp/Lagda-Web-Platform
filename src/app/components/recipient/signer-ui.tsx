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
// ── Mobile S is the design target, not an afterthought ─────────────────────
//
// Signing links are opened on phones, from email, wherever the signer happens
// to be. 320px is the narrowest real device still in use, and a signature pad
// that needs a horizontal scroll is a signature that does not get made.
//
// Every size here is fluid (`clamp`) rather than switched at a breakpoint, so
// there is no width at which the layout is merely tolerated. `useViewport`
// exists for the few decisions that genuinely cannot be fluid — stacking a row
// into a column, dropping a label to its icon.

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

const TONE: Record<Tone, { fg: string; wash: string; edge: string }> = {
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
 * control here rather than only the obvious ones: on a signing page the
 * "small" controls are things like a decline reason, and a mis-tap there is
 * not a cosmetic problem.
 */
const TAP = 44;

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
 * The one-column surface every signer screen sits on.
 *
 * `wide` for the ceremony, which carries a document; the default for the
 * single-decision screens, which read better narrow.
 */
export function SignerCard({
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
}

/**
 * A screen's identity, as a banner rather than a heading.
 *
 * The plain `<h1>Submitted</h1>` it replaces told a signer what happened only
 * if they read it. A tone, an icon and a wash say the same thing before the
 * sentence is read, which matters most in exactly the states a signer is
 * anxious about.
 */
export function PhaseBanner({
  icon: Icon, title, description, tone = "info", badge,
}: PhaseBannerProps) {
  const { isMobileS } = useViewport();
  const palette = TONE[tone];

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
          <h1
            style={{
              ...GF, margin: 0, color: T.ink, fontWeight: 800,
              fontSize: "clamp(17px, 4.6vw, 21px)", lineHeight: 1.25,
            }}
          >
            {title}
          </h1>
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
 * An inline message tied to something the signer just did.
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

export type SignerStep = "consent" | "sign" | "done";

const STEPS: readonly { id: SignerStep; label: string; short: string }[] = [
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
 */
export function StepRail({ current }: { current: SignerStep }) {
  const { isMobileS } = useViewport();
  const index = STEPS.findIndex(step => step.id === current);

  return (
    <ol
      aria-label="Signing progress"
      style={{
        ...GF, display: "flex", alignItems: "center", gap: isMobileS ? 4 : 8,
        listStyle: "none", margin: "0 0 18px", padding: 0,
      }}
    >
      {STEPS.map((step, position) => {
        const done = position < index;
        const active = position === index;
        const fg = done || active ? T.azureDeep : T.silver;

        return (
          <li key={step.id} style={{ display: "flex", alignItems: "center", gap: isMobileS ? 4 : 8, minWidth: 0 }}>
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
            {position < STEPS.length - 1 && (
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
 * Who the signer is, on the request they are looking at.
 *
 * Shown rather than assumed: a signing link can be forwarded, and a person who
 * opens someone else's link should see whose it is before they sign anything.
 */
export function IdentityStrip({
  name, role, documentTitle,
}: { name: string; role: string; documentTitle: string }) {
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
        Signing as
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
