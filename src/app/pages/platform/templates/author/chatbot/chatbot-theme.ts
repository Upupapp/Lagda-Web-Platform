// Tokens, timings, the animation stylesheet and the reduced-motion hook for
// the LAGDA Chatbot. Kept apart from the components so fast refresh works.
//
// Every animation is dropped under `prefers-reduced-motion`, both by the
// hook (so JS timings shorten too) and by the media query in CHATBOT_CSS.

import { useEffect, useState } from "react";
import botImage from "../../../../../../assets/chatbot/lagda-bot.webp";

export const BOT_IMAGE = botImage;

export const GF = { fontFamily: "'Geist', sans-serif" } as const;
export const AZURE = "#0078D4";
export const NAVY = "#07111F";
export const SILVER = "#64748B";
export const BLUE_DEEP = "#1E40AF";
export const BLUE_SKY = "#38BDF8";
export const BLUE_SOFT = "#93C5FD";
export const HAIR = "#E2E8F0";

/** Opening loader and the page loader before the draft is typed. */
export const LOADER_MS = 3000;
export const LOADER_MS_REDUCED = 1000;
/** Thinking time before the very first reply. */
export const FIRST_THINK_MS = 2000;

/** Later replies think 0.8–1.5s, longer for longer replies. */
export function thinkingMs(replyLength: number): number {
  return Math.round(Math.min(1500, Math.max(800, 800 + replyLength * 3)));
}

/** Streaming speed: 15–25ms a character, never more than ~1.2s a bubble. */
export function streamMsPerChar(length: number): number {
  if (length <= 0) return 0;
  return Math.max(4, Math.min(20, 1200 / length));
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const list = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e: MediaQueryListEvent) => { setReduced(e.matches); };
    setReduced(list.matches);
    list.addEventListener?.("change", on);
    return () => { list.removeEventListener?.("change", on); };
  }, []);
  return reduced;
}

export const CHATBOT_CSS = `
@keyframes lagda-cb-wiggle {
  0%, 76%, 100% { transform: rotate(0deg) scale(1); }
  80% { transform: rotate(-14deg) scale(1.06); }
  85% { transform: rotate(11deg) scale(1.06); }
  90% { transform: rotate(-7deg) scale(1.03); }
  95% { transform: rotate(4deg) scale(1.01); }
}
.lagda-cb-wiggle { animation: lagda-cb-wiggle 3s ease-in-out infinite; transform-origin: 50% 70%; }
@keyframes lagda-cb-orbit { to { transform: rotate(360deg); } }
.lagda-cb-orbit { position: absolute; inset: 0; animation: lagda-cb-orbit var(--lagda-cb-dur, 2s) linear infinite; }
.lagda-cb-orbit.rev { animation-direction: reverse; }
@keyframes lagda-cb-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 10px rgba(0,120,212,0.18)); }
  50% { transform: scale(1.06); filter: drop-shadow(0 6px 22px rgba(0,120,212,0.45)); }
}
.lagda-cb-pulse { animation: lagda-cb-pulse 1.6s ease-in-out infinite; }
@keyframes lagda-cb-glow { 0%, 100% { opacity: 0.35; transform: scale(0.9); } 50% { opacity: 0.7; transform: scale(1.08); } }
.lagda-cb-glow { animation: lagda-cb-glow 1.6s ease-in-out infinite; }
@keyframes lagda-cb-morph {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--lagda-cb-mx, -38%), var(--lagda-cb-my, 60%)) scale(0.34); opacity: 0; }
}
.lagda-cb-morph { animation: lagda-cb-morph 420ms cubic-bezier(.5,0,.2,1) forwards; }
@keyframes lagda-cb-bot-in {
  0% { opacity: 0; transform: translate(-10px, 14px) scale(0.9); }
  60% { opacity: 1; transform: translate(0, -3px) scale(1.015); }
  100% { opacity: 1; transform: none; }
}
.lagda-cb-bot-in { animation: lagda-cb-bot-in 460ms cubic-bezier(.34,1.56,.64,1) both; transform-origin: 0% 100%; }
@keyframes lagda-cb-user-in { 0% { opacity: 0; transform: translateX(26px); } 100% { opacity: 1; transform: none; } }
.lagda-cb-user-in { animation: lagda-cb-user-in 280ms cubic-bezier(.2,.8,.2,1) both; }
@keyframes lagda-cb-chip-pop { 0% { opacity: 0; transform: scale(0.6); } 70% { opacity: 1; transform: scale(1.07); } 100% { opacity: 1; transform: scale(1); } }
.lagda-cb-chip { animation: lagda-cb-chip-pop 320ms cubic-bezier(.34,1.56,.64,1) both; }
@keyframes lagda-cb-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.45; } 30% { transform: translateY(-6px); opacity: 1; } }
.lagda-cb-dot { animation: lagda-cb-dot 1s ease-in-out infinite; }
@keyframes lagda-cb-shimmer { from { background-position: -160% 0; } to { background-position: 260% 0; } }
.lagda-cb-shimmer {
  background-image: linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 70%);
  background-size: 60% 100%; background-repeat: no-repeat;
  animation: lagda-cb-shimmer 1.3s linear infinite;
}
@keyframes lagda-cb-tilt { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-9deg); } }
.lagda-cb-tilt { animation: lagda-cb-tilt 1.2s ease-in-out infinite; transform-origin: 50% 80%; }
@keyframes lagda-cb-fade { from { opacity: 0; } to { opacity: 1; } }
.lagda-cb-fade { animation: lagda-cb-fade 380ms ease-out both; }
@keyframes lagda-cb-sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
.lagda-cb-sheet-in { animation: lagda-cb-sheet-in 320ms cubic-bezier(.2,.8,.2,1) both; }
@keyframes lagda-cb-panel-in { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: none; } }
.lagda-cb-panel-in { animation: lagda-cb-panel-in 260ms cubic-bezier(.2,.8,.2,1) both; }
@keyframes lagda-cb-spin { to { transform: rotate(360deg); } }
.lagda-cb-spin { animation: lagda-cb-spin 0.9s linear infinite; }
@keyframes lagda-cb-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.lagda-cb-bob { animation: lagda-cb-bob 0.5s ease-in-out infinite; }
@keyframes lagda-cb-bubble-in { from { opacity: 0; transform: translateY(6px) scale(0.96); } to { opacity: 1; transform: none; } }
.lagda-cb-bubble-in { animation: lagda-cb-bubble-in 300ms cubic-bezier(.2,.8,.2,1) both; }
.lagda-cb-draft-fade .ProseMirror { animation: lagda-cb-fade 600ms ease-out both; }
.lagda-cb-scroll { scrollbar-width: thin; }
.lagda-cb-focus:focus-visible { outline: 2px solid ${AZURE}; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .lagda-cb-wiggle, .lagda-cb-orbit, .lagda-cb-pulse, .lagda-cb-glow, .lagda-cb-morph, .lagda-cb-bot-in,
  .lagda-cb-user-in, .lagda-cb-chip, .lagda-cb-dot, .lagda-cb-shimmer, .lagda-cb-tilt, .lagda-cb-sheet-in,
  .lagda-cb-panel-in, .lagda-cb-bob, .lagda-cb-bubble-in { animation: none !important; }
}
`;

