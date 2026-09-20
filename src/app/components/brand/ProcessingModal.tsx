// The modal shown while the product is doing something the user must wait for.
//
// ── Why this is not LagdaLoader's fullscreen mode ──────────────────────────
//
// That mode is the application's boot splash: an opaque, full-bleed takeover
// running a one-shot 2.6s brand sequence with the wordmark. Two properties
// make it wrong for processing work. It is OPAQUE, so the page the user was
// working on vanishes and returns — for a three-second upload that reads as a
// navigation, not as progress. And its animation ENDS: after 2.6s the keyframes
// settle and the user is left staring at a still image, which is precisely the
// moment a slow operation most needs to look alive.
//
// So this is a modal over the page, not instead of it: the work stays visible
// behind a blurred scrim, and every animation here loops indefinitely.
//
// ── The animation ─────────────────────────────────────────────────────────
//
// Four layers, all built from the brand's own vocabulary rather than a generic
// spinner:
//
//   1. The shield mark, held steady — the thing being protected.
//   2. An azure arc orbiting it. This is the honest "still working" signal;
//      it is the only element whose motion is strictly constant.
//   3. A scan line sweeping down the shield, which is what verifying a
//      document looks like.
//   4. The gold diamond pulsing at the corner — LAGDA's authenticity mark.
//
// Under reduced-motion every one of these collapses to a static mark plus a
// slow opacity breath, so the modal still reads as "busy" without any movement.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Z } from "../../utils/z-index";

/** The official LAGDA shield, shared with LagdaLoader. */
const SHIELD_PATH =
  "M20 9C20.1761 9 20.3347 9.03884 20.4609 9.09766L20.5762 9.16211C23.3215 11.0792 27.2476 12.5996 30.5 12.5996C30.6958 12.5996 30.8502 12.6643 30.9355 12.7324C30.9755 12.7644 30.9926 12.7903 30.998 12.8008C30.9989 12.8024 30.9996 12.8037 31 12.8047V21.1982C31 23.8536 29.8587 25.8341 27.9609 27.3916C26.0274 28.9784 23.3127 30.1167 20.248 30.9717C20.1003 31.0116 19.9352 31.0087 19.791 30.9658L19.7812 30.9629L19.7715 30.9609L19.1992 30.7979C16.3603 29.9677 13.8563 28.8766 12.041 27.3896C10.1418 25.8338 9 23.8536 9 21.1982V12.8047C9.00042 12.8037 9.00111 12.8024 9.00195 12.8008C9.00738 12.7903 9.02447 12.7644 9.06445 12.7324C9.14978 12.6643 9.3042 12.5996 9.5 12.5996C12.7531 12.5996 16.6943 11.0667 19.4238 9.16211C19.561 9.06836 19.7652 9 20 9ZM18.5 21.1162L16.125 19.2168L14.875 20.7793L17.875 23.1787L18.5 23.6777L19.125 23.1787L25.125 18.3789L24.5 17.5986L23.875 16.8174L18.5 21.1162Z";

const GF = { fontFamily: "'Geist', sans-serif" };
const MONO = { fontFamily: "'Geist Mono', monospace" };

const NAVY = "#07111F";
const AZURE = "#0078D4";
const GOLD = "#C9960C";
// Body copy on white. ON_LIGHT.slate — 4.97:1, the accessible ramp.
const SLATE = "#5A6673";

/** A phase of a multi-step operation, for the optional checklist. */
export interface ProcessingStep {
  id: string;
  label: string;
  state: "done" | "active" | "pending";
}

export interface ProcessingModalProps {
  /** What is happening, in the user's terms. Announced politely. */
  message: string;
  /** Optional second line: why it is worth waiting, or what happens next. */
  detail?: string;
  /** Optional phase checklist for operations with distinct stages. */
  steps?: ProcessingStep[];
  /** Fades the modal out. The parent unmounts after EXIT_MS. */
  isExiting?: boolean;
  children?: ReactNode;
}

export const PROCESSING_EXIT_MS = 200;

const STYLES = `
@keyframes lagda-proc-orbit   { to { transform: rotate(360deg); } }
@keyframes lagda-proc-scan {
  0%        { transform: translateY(-120%); opacity: 0; }
  15%, 85%  { opacity: 1; }
  100%      { transform: translateY(120%); opacity: 0; }
}
@keyframes lagda-proc-diamond {
  0%, 100% { opacity: 0.25; transform: rotate(45deg) scale(0.85); }
  50%      { opacity: 1;    transform: rotate(45deg) scale(1.1); }
}
@keyframes lagda-proc-shimmer { to { transform: translateX(300%); } }
@keyframes lagda-proc-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
@keyframes lagda-proc-scrim-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes lagda-proc-out      { to   { opacity: 0; } }
@keyframes lagda-proc-breathe  { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  /* No travel, no rotation. The breath alone carries "still working". */
  @keyframes lagda-proc-orbit   { 0%, 100% { transform: rotate(0deg); } }
  @keyframes lagda-proc-scan    { 0%, 100% { opacity: 0; } }
  @keyframes lagda-proc-diamond { 0%, 100% { opacity: 0.8; transform: rotate(45deg); } }
  @keyframes lagda-proc-shimmer { 0%, 100% { transform: none; } }
  @keyframes lagda-proc-in      { 0%, 100% { opacity: 1; transform: none; } }
}
`;

/**
 * The animated brand mark: logo, orbiting arc, scan line, gold diamond.
 *
 * The brand guide permits the logo to "fade, scale subtly, or receive a masked
 * light sweep" and forbids spinning or bouncing it. So the logo itself never
 * moves: the arc that carries the motion orbits OUTSIDE the mark, and the only
 * thing crossing the logo is the sanctioned light sweep.
 */
function ProcessingMark() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: 72,
        height: 72,
        flexShrink: 0,
        animation: "lagda-proc-breathe 2.4s ease-in-out infinite",
      }}
    >
      {/* The orbiting arc. A conic sweep masked to a ring, so it reads as one
          bright comet travelling the circle rather than a spinning border. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `conic-gradient(from 0deg, transparent 0deg, transparent 240deg, ${AZURE} 340deg, transparent 360deg)`,
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          animation: "lagda-proc-orbit 1.15s linear infinite",
        }}
      />

      {/* The logo, and the light sweep clipped to it.
          The real artwork ships with a baked opaque background, which is
          exactly why it can sit on this white card unmodified. If it fails to
          load we fall back to the placeholder shield rather than showing a
          hole — a loader that cannot draw itself is worse than an approximate
          one. */}
      <div
        style={{
          position: "absolute",
          inset: 11,
          borderRadius: 11,
          background: AZURE,
          overflow: "hidden",
        }}
      >
        {logoFailed ? (
          <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" style={{ display: "block" }}>
            <path d={SHIELD_PATH} stroke="#FFFFFF" strokeWidth="2" />
          </svg>
        ) : (
          <img
            src="/brand/LagdaLogoIconFullColorSquare.png"
            alt=""
            draggable={false}
            onError={() => { setLogoFailed(true); }}
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "38%",
            background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.55), transparent)",
            animation: "lagda-proc-scan 1.9s cubic-bezier(0.45,0,0.55,1) infinite",
          }}
        />
      </div>

      {/* Authenticity mark. */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          right: 6,
          width: 9,
          height: 9,
          background: GOLD,
          animation: "lagda-proc-diamond 1.9s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/** Indeterminate bar. Deliberately not a percentage: we do not know one. */
function Shimmer() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        height: 3,
        borderRadius: 2,
        background: "#E8EEF4",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "33%",
          height: "100%",
          borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${AZURE}, transparent)`,
          transform: "translateX(-100%)",
          animation: "lagda-proc-shimmer 1.4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function StepList({ steps }: { steps: ProcessingStep[] }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, width: "100%", display: "grid", gap: 6 }}>
      {steps.map(step => {
        const color = step.state === "pending" ? "#98A4B3" : step.state === "active" ? NAVY : SLATE;
        return (
          <li
            key={step.id}
            style={{ ...GF, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 14,
                height: 14,
                flexShrink: 0,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 9,
                color: "#FFFFFF",
                background:
                  step.state === "done" ? "#166534" : step.state === "active" ? AZURE : "#D6DEE7",
              }}
            >
              {step.state === "done" ? "✓" : ""}
            </span>
            <span style={{ fontWeight: step.state === "active" ? 600 : 400 }}>{step.label}</span>
            {/* The state has to reach a screen reader too; the colour and the
                tick are both invisible to one. */}
            <span className="sr-only">
              {step.state === "done" ? " — complete" : step.state === "active" ? " — in progress" : " — pending"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ProcessingModal({
  message,
  detail,
  steps,
  isExiting = false,
  children,
}: ProcessingModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // The modal blocks the page, so the keyboard must not be able to walk behind
  // it into controls that are about to change under the user.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    cardRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      // Tab is swallowed rather than cycled: there is nothing in here to tab
      // between, and this is not dismissible, so a trap with one stop is the
      // honest shape. Escape is swallowed too — cancelling the modal would not
      // cancel the request behind it, and a modal that closes on a work that
      // keeps running is a lie.
      if (event.key === "Tab" || event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cardRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      const el = previouslyFocused.current;
      previouslyFocused.current = null;
      if (el && document.contains(el)) {
        try { el.focus(); } catch { /* the trigger unmounted with the work */ }
      }
    };
  }, []);

  const exiting = isExiting
    ? { animation: `lagda-proc-out ${PROCESSING_EXIT_MS}ms ease forwards` }
    : {};

  return (
    <div
      // `alertdialog` rather than `dialog`: this demands attention and cannot
      // be dismissed, which is what the role is for.
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={message}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z.loader,
        // Grid centring, so the card is centred on every viewport without a
        // transform or a magic height — including short landscape phones,
        // where the padding keeps it off the edges.
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgba(7,17,31,0.55)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        animation: "lagda-proc-scrim-in 160ms ease both",
        ...exiting,
      }}
    >
      <style>{STYLES}</style>

      <div
        ref={cardRef}
        tabIndex={-1}
        style={{
          width: "min(340px, 100%)",
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          boxSizing: "border-box",
          background: "#FFFFFF",
          borderRadius: 16,
          padding: "28px 24px 24px",
          boxShadow: "0 18px 50px rgba(7,17,31,0.28)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          outline: "none",
          animation: "lagda-proc-in 220ms cubic-bezier(0.2,0,0.2,1) both",
        }}
      >
        <ProcessingMark />

        <div style={{ display: "grid", gap: 6, textAlign: "center", width: "100%" }}>
          {/* The single live region for the whole modal. The message is the
              only thing that changes as the work progresses. */}
          <p
            aria-live="polite"
            style={{ ...GF, margin: 0, fontSize: 15, fontWeight: 600, color: NAVY, lineHeight: 1.35 }}
          >
            {message}
          </p>
          {detail && (
            <p style={{ ...MONO, margin: 0, fontSize: 11, color: SLATE, letterSpacing: "0.03em", lineHeight: 1.5 }}>
              {detail}
            </p>
          )}
        </div>

        {steps && steps.length > 0 ? <StepList steps={steps} /> : <Shimmer />}

        {children}
      </div>
    </div>
  );
}
