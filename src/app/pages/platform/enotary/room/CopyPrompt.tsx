// Step 7 (Notarized): a prompt that tells the client they may ask the notary for a certified true copy, and that the
// request then moves on to step 8. On a wide screen it is a bubble right above step 8 on the rail; on a phone or a
// narrow window (where that bubble would cover the heading), a round button just above the audit trail's at the bottom
// right, with a short bubble beside it. Both wiggle until the
// request's dialog is opened, and either opens it. "Not now" hides the bubbles for this tab; the phone's button stays.
//
// The location button uses the same corner, but only before the act, so the two never meet.

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileCheck2, X } from "lucide-react";
import { GF } from "../../../../components/system/design-system";
import { Z } from "../../../../utils/z-index";
import { E } from "../EnotaryChrome";
import { OPEN_COPY_REQUEST_EVENT, copyPromptKey, openCopyRequest } from "./copy-request";

const STYLES = `
@keyframes eno-ctc-pop { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes eno-ctc-nudge { 0%, 11%, 100% { transform: none; } 2% { transform: rotate(-2.2deg); } 4% { transform: rotate(1.8deg); }
  6% { transform: rotate(-1.2deg); } 8% { transform: rotate(0.6deg); } }
@keyframes eno-ctc-wiggle { 0%, 100% { transform: rotate(0); } 4% { transform: rotate(-14deg) scale(1.06); } 8% { transform: rotate(12deg) scale(1.06); }
  12% { transform: rotate(-9deg); } 16% { transform: rotate(6deg); } 20% { transform: rotate(0); } }
@keyframes eno-ctc-pulse { 0% { box-shadow: 0 0 0 0 rgba(10,132,214,0.35); } 70% { box-shadow: 0 0 0 12px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
.eno-ctc-callout { animation: eno-ctc-pop 0.28s ease-out; transform-origin: 93.75% 100%; }
.eno-ctc-callout.is-asking { animation: eno-ctc-pop 0.28s ease-out, eno-ctc-nudge 6.5s ease-in-out 0.9s infinite; }
.eno-ctc-fab.is-asking { animation: eno-ctc-wiggle 3.2s ease-in-out 0.6s infinite; }
.eno-ctc-fab.is-asking::after { content: ""; position: absolute; inset: 0; border-radius: 999px; animation: eno-ctc-pulse 1.6s ease-out infinite; }
.eno-ctc-mbubble { animation: eno-ctc-pop 0.22s ease-out; }
.eno-ctc-callout button:focus-visible, .eno-ctc-fab:focus-visible, .eno-ctc-mbubble button:focus-visible { outline: 3px solid ${E.skyDeep}; outline-offset: 2px; }
@media (max-width: 960px) { .eno-ctc-callout { display: none !important; } }
@media (min-width: 961px) { .eno-ctc-phone { display: none !important; } }
@media (prefers-reduced-motion: reduce) { .eno-ctc-callout, .eno-ctc-callout.is-asking, .eno-ctc-fab.is-asking, .eno-ctc-fab.is-asking::after, .eno-ctc-mbubble { animation: none; } }
`;

/** The corner the audit trail's button sits in, and the room this button keeps above it (as the location button's). */
const EDGE = "clamp(12px, 3vw, 24px)";
const ABOVE_TRAIL = `calc(${EDGE} + 58px)`;

const hiddenInTab = (sessionId: string): boolean => {
  try { return window.sessionStorage.getItem(copyPromptKey(sessionId)) === "1"; } catch { return false; }
};

/**
 * Whether the prompt's bubbles show for `sessionId` (null until the room has loaded), and whether the client has opened
 * the dialog, which stops the wiggle. Hiding is kept for the tab, and in memory where the tab cannot keep it.
 */
export function useCopyPrompt(sessionId: string | null): { bubble: boolean; quiet: boolean; hide: () => void } {
  const [hidden, setHidden] = useState<readonly string[]>([]);
  const [quiet, setQuiet] = useState(false);
  useEffect(() => {
    const heard = () => { setQuiet(true); };
    window.addEventListener(OPEN_COPY_REQUEST_EVENT, heard);
    return () => { window.removeEventListener(OPEN_COPY_REQUEST_EVENT, heard); };
  }, []);
  const hide = useCallback(() => {
    if (sessionId === null) return;
    setHidden(list => [...list, sessionId]);
    try { window.sessionStorage.setItem(copyPromptKey(sessionId), "1"); } catch { /* this tab only, when it can */ }
  }, [sessionId]);
  const bubble = sessionId !== null && !hidden.includes(sessionId) && !hiddenInTab(sessionId);
  return { bubble, quiet, hide };
}

const notaryTitle = (name: string) => (/^atty\.?\s/i.test(name) ? name : `Atty. ${name}`);

/** The wide screen's bubble, drawn over the rail with its pointer on step 8 (the last of eight equal steps). */
export function CopyPromptCallout({ notaryName, quiet, onHide }: { notaryName: string; quiet: boolean; onHide: () => void }) {
  return (
    <div className={quiet ? "eno-ctc-callout" : "eno-ctc-callout is-asking"} data-testid="copy-prompt"
      style={{ position: "absolute", left: 0, right: 0, bottom: "calc(100% + 12px)", zIndex: 1, display: "flex", justifyContent: "flex-end", pointerEvents: "none" }}>
      <style>{STYLES}</style>
      <div role="status" style={{ ...GF, position: "relative", pointerEvents: "auto", width: "min(350px, 100%)", boxSizing: "border-box", display: "grid", gridTemplateColumns: "38px minmax(0, 1fr) 24px", gap: 10, alignItems: "start",
        padding: "13px 12px 13px 14px", borderRadius: 14, background: "#FFFFFF", border: `1px solid ${E.skyLine}`, boxShadow: "0 18px 40px -16px rgba(10,26,43,0.45)" }}>
        <span aria-hidden="true" style={{ position: "relative", width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: E.skyWash, color: E.skyDeep }}>
          <FileCheck2 size={20} />
          <span style={{ position: "absolute", right: -4, top: -4, width: 14, height: 14, boxSizing: "border-box", borderRadius: 999, background: E.maroon, border: "2px solid #FFFFFF" }} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 3px", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: E.maroon }}>Step 8 &middot; Optional</p>
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: E.navy }}>Need a certified true copy?</p>
          <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.5, color: E.text }}>
            Ask {notaryTitle(notaryName)} for a certified true copy of your notarized document. Once you ask, your request moves on to step 8.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={openCopyRequest} data-testid="copy-prompt-open"
              style={{ ...GF, display: "inline-flex", alignItems: "center", gap: 7, minHeight: 38, padding: "0 14px", border: 0, borderRadius: 10, background: E.sky, color: "#FFFFFF", fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 16px -8px rgba(10,132,214,0.8)" }}>
              Request a copy <ArrowRight size={15} aria-hidden />
            </button>
            <button type="button" onClick={onHide} data-testid="copy-prompt-later"
              style={{ ...GF, minHeight: 38, padding: "0 6px", border: 0, background: "transparent", color: E.quiet, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={onHide} aria-label="Hide this message"
          style={{ width: 24, height: 24, display: "grid", placeItems: "center", padding: 0, border: 0, borderRadius: 6, background: "transparent", color: E.quiet, cursor: "pointer" }}>
          <X size={14} aria-hidden />
        </button>
      </div>
      <span aria-hidden="true" style={{ position: "absolute", right: "calc(6.25% - 8px)", bottom: -8, width: 16, height: 16, boxSizing: "border-box", background: "#FFFFFF",
        borderRight: `1px solid ${E.skyLine}`, borderBottom: `1px solid ${E.skyLine}`, transform: "rotate(45deg)" }} />
    </div>
  );
}

/** The phone's round button above the audit trail's, with its short bubble while it is not hidden. */
export function CopyPromptFab({ bubble, quiet, onHide }: { bubble: boolean; quiet: boolean; onHide: () => void }) {
  return (
    <div className="eno-ctc-phone">
      <style>{STYLES}</style>
      {bubble && (
        <div className="eno-ctc-mbubble" role="status" data-testid="copy-prompt-phone-bubble"
          style={{ ...GF, position: "fixed", right: `calc(${EDGE} + 60px)`, bottom: ABOVE_TRAIL, zIndex: Z.sticky, width: "max-content", maxWidth: "min(280px, calc(100vw - 96px))",
            display: "flex", alignItems: "flex-start", gap: 6, padding: "9px 8px 9px 12px", borderRadius: 12, background: "#FFFFFF", border: `1px solid ${E.skyLine}`,
            boxShadow: "0 14px 34px -14px rgba(10,26,43,0.45)", boxSizing: "border-box" }}>
          <button type="button" onClick={openCopyRequest}
            style={{ ...GF, flex: "1 1 auto", minWidth: 0, padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: "pointer", color: E.ink }}>
            <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: E.maroon }}>Step 8 &middot; Optional</span>
            <strong style={{ display: "block", marginTop: 2, fontSize: 13.5, color: E.navy }}>Need a certified true copy?</strong>
            <span style={{ display: "block", marginTop: 2, fontSize: 12.5, lineHeight: 1.4, color: E.text }}>Tap to ask the notary. Your request then moves on to step 8.</span>
          </button>
          <button type="button" onClick={onHide} aria-label="Hide this message" data-testid="copy-prompt-phone-hide"
            style={{ flex: "0 0 auto", width: 24, height: 24, display: "grid", placeItems: "center", padding: 0, border: 0, borderRadius: 6, background: "transparent", color: E.quiet, cursor: "pointer" }}>
            <X size={14} aria-hidden />
          </button>
        </div>
      )}
      <button type="button" onClick={openCopyRequest} data-testid="copy-prompt-fab" aria-haspopup="dialog" aria-label="Ask the notary for a certified true copy (step 8)"
        className={quiet ? "eno-ctc-fab" : "eno-ctc-fab is-asking"}
        style={{ position: "fixed", right: EDGE, bottom: ABOVE_TRAIL, zIndex: Z.sticky, width: 48, height: 48, padding: 0, borderRadius: 999, display: "grid", placeItems: "center",
          border: `2px solid ${E.sky}`, background: "#FFFFFF", color: E.skyDeep, cursor: "pointer", boxShadow: "0 10px 26px -10px rgba(10,26,43,0.55)" }}>
        <FileCheck2 size={21} aria-hidden />
        <span aria-hidden="true" style={{ position: "absolute", right: -3, top: -3, width: 18, height: 18, boxSizing: "border-box", borderRadius: 999, display: "grid", placeItems: "center",
          background: E.maroon, color: "#FFFFFF", border: "2px solid #FFFFFF", fontSize: 10.5, fontWeight: 800, lineHeight: 1 }}>8</span>
      </button>
    </div>
  );
}
