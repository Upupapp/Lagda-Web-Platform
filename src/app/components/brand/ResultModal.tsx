// The result of an action, shown in the processing screen's place once the work is done.
//
// After the loading card the person is told how it ended, in the same white card at the centre of the page:
//   · success: a green check, a title and what happens next. It closes by itself after RESULT_SUCCESS_MS, or at once
//     with OK, Enter, Esc or a click outside the card.
//   · failure: a red mark, "It did not go through" and the reason, worded as the page words it. It stays until OK
//     (or Enter, or Esc), so it cannot be missed.
//
// The focus goes to OK, cannot walk behind the card, and returns to where it was when the card closes. Under reduced
// motion nothing moves and the countdown bar stands still.

import { useEffect, useId, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { Z } from "../../utils/z-index";

/** How long a success stays up by itself. */
export const RESULT_SUCCESS_MS = 4000;

const GF = { fontFamily: "'Geist', sans-serif" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const GOLD = "#C9960C";
const SLATE = "#5A6673";

const TONES = {
  success: { ink: "#17703C", bright: "#1F8A4C", wash: "#E3F5EA", line: "#B9E2C8", glow: "rgba(23,112,60,0.32)" },
  failure: { ink: "#B42318", bright: "#D1392B", wash: "#FDECEA", line: "#F4C1BB", glow: "rgba(180,35,24,0.3)" },
} as const;

export interface ResultModalProps {
  readonly tone: "success" | "failure";
  readonly title: string;
  /** A success: what happens next. A failure: the reason, as the page words it. */
  readonly detail?: string;
  /** The same tag as the loading screen it follows ("Notary session"). */
  readonly tag?: { label: string; icon?: LucideIcon };
  readonly onClose: () => void;
}

const STYLES = `
@keyframes lagda-result-in { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes lagda-result-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
@keyframes lagda-result-drain { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes lagda-result-scrim { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  @keyframes lagda-result-in { 0%, 100% { opacity: 1; transform: none; } }
  @keyframes lagda-result-pop { 0%, 100% { opacity: 1; transform: none; } }
  @keyframes lagda-result-drain { 0%, 100% { transform: none; } }
}
.lagda-result-ok:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0,120,212,0.35); }
`;

export function ResultModal({ tone, title, detail, tag, onClose }: ResultModalProps) {
  const t = TONES[tone];
  const titleId = useId();
  const detailId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    okRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      // One stop to tab to, so Tab stays on OK; Escape closes, as OK does.
      if (event.key === "Tab") { event.preventDefault(); okRef.current?.focus(); }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close.current(); }
    };
    document.addEventListener("keydown", onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = tone === "success" ? setTimeout(() => { close.current(); }, RESULT_SUCCESS_MS) : undefined;
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused !== null && document.contains(previouslyFocused)) {
        try { previouslyFocused.focus(); } catch { /* the trigger went with the work */ }
      }
    };
  }, [tone]);

  const failure = tone === "failure";
  return (
    <div
      data-testid="result-scrim"
      onClick={event => { if (!failure && event.target === event.currentTarget) close.current(); }}
      style={{
        position: "fixed", inset: 0, zIndex: Z.loader, display: "grid", placeItems: "center", padding: 16,
        background: "rgba(7,17,31,0.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        animation: "lagda-result-scrim 120ms ease both",
      }}
    >
      <style>{STYLES}</style>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detail === undefined ? undefined : detailId}
        data-tone={tone}
        style={{
          width: "min(340px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", boxSizing: "border-box",
          background: "#FFFFFF", borderRadius: 16, padding: "28px 24px 24px", boxShadow: "0 18px 50px rgba(7,17,31,0.28)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          animation: "lagda-result-in 200ms cubic-bezier(0.2,0,0.2,1) both",
        }}
      >
        <div aria-hidden="true" style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: t.wash, boxShadow: `0 0 0 1px ${t.line} inset` }} />
          <div style={{
            position: "absolute", inset: 9, borderRadius: "50%", display: "grid", placeItems: "center",
            background: `linear-gradient(160deg, ${t.bright}, ${t.ink})`, boxShadow: `0 6px 14px ${t.glow}`,
            animation: "lagda-result-pop 320ms cubic-bezier(0.2,0,0.2,1) both",
          }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {failure ? <><path d="M12 7v6" /><path d="M12 17h.01" /></> : <path d="M20 6 9 17l-5-5" />}
            </svg>
          </div>
          {!failure && <div style={{ position: "absolute", bottom: 6, right: 6, width: 9, height: 9, background: GOLD, transform: "rotate(45deg)" }} />}
        </div>

        {tag !== undefined && (
          <span data-testid="result-tag" style={{
            ...GF, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: -6, padding: "4px 10px", borderRadius: 999,
            background: t.wash, border: `1px solid ${t.line}`, color: t.ink, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            {tag.icon !== undefined && <tag.icon size={13} aria-hidden />}
            {tag.label}
          </span>
        )}

        <div style={{ display: "grid", gap: 6, textAlign: "center", width: "100%" }}>
          <h2 id={titleId} style={{ ...GF, margin: 0, fontSize: 18, fontWeight: 700, color: NAVY, lineHeight: 1.3, letterSpacing: "-0.01em" }}>{title}</h2>
          {detail !== undefined && !failure && (
            <p id={detailId} style={{ ...GF, margin: 0, fontSize: 13, color: SLATE, lineHeight: 1.55 }}>{detail}</p>
          )}
        </div>

        {detail !== undefined && failure && (
          <p id={detailId} style={{
            ...GF, width: "100%", boxSizing: "border-box", margin: 0, padding: "11px 13px", borderRadius: 10, background: t.wash,
            border: `1px solid ${t.line}`, color: "#8A1C12", fontSize: 13, lineHeight: 1.5, textAlign: "left",
          }}>
            {detail}
          </p>
        )}

        {!failure && (
          <div style={{ width: "100%", display: "grid", gap: 6 }}>
            <div aria-hidden="true" style={{ height: 3, borderRadius: 2, background: "#E8EEF4", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2, background: t.ink, transformOrigin: "left center",
                animation: `lagda-result-drain ${RESULT_SUCCESS_MS}ms linear both`,
              }} />
            </div>
            <small style={{ ...GF, fontSize: 11, color: SLATE, textAlign: "center" }}>Closes on its own in {RESULT_SUCCESS_MS / 1000} seconds</small>
          </div>
        )}

        <button
          ref={okRef}
          type="button"
          className="lagda-result-ok"
          onClick={() => { close.current(); }}
          style={{
            ...GF, width: "100%", height: 44, border: 0, borderRadius: 10, background: AZURE, color: "#FFFFFF",
            fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
