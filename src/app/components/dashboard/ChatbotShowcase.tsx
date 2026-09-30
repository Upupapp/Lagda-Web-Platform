// "Meet the LAGDA Chatbot": a showcase for Free accounts (093) — under the
// Free pass on Home, and above My Templates, where the chatbot would be used.
//
// The chatbot is a Personal and Business feature that a Free account never
// meets (it lives in the template editor), so this shows it working: the bot
// hops and sparkles every few seconds while a made-up chat plays in a loop.
// The sample wording is invented here — never ready-made template text, which
// the server keeps for paid plans.
//
// Always shown to a Free account (it is part of the offer, like the Free
// pass). All motion stops for anyone who asks for reduced motion.
//
// Two layouts: `home` puts the bot first, the chat in the middle and the
// benefits last; `templates` leads with the chat, a template being written,
// and gives the bot the right-hand side on wide screens — on a phone the
// bot tucks in beside the heading so the list below stays close.

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import botImage from "../../../assets/chatbot/lagda-bot.webp";

const STEP_MS = 1400;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** 0 the request, 1 typing, 2 the answer, 3 a pause — then again. */
function useChatLoop(): number {
  const [step, setStep] = useState(() => (prefersReducedMotion() ? 2 : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => { setStep(s => (s + 1) % 4); }, STEP_MS);
    return () => { window.clearInterval(timer); };
  }, []);
  return step;
}

function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden className={`cs-star ${className}`}>
      <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="currentColor" />
    </svg>
  );
}

const COPY = {
  home: {
    kicker: "Meet the LAGDA Chatbot",
    ask: "Draft an NDA between Reyes Law and Maria Santos. Both sign.",
    answer: "Done! Two signers, signing order set, and ready for you to edit.",
    label: "Example: you ask the chatbot to draft an NDA for two signers, and it writes the template with the signers and signing order set.",
    points: ["Describe it, and it writes the template", "Signers and roles set for you", "Signing order ready to send"],
  },
  templates: {
    kicker: "Write templates with the LAGDA Chatbot",
    ask: "A service agreement for a web design project. The client and the designer sign.",
    answer: "Your template is ready: two signers, roles and order set. Edit anything you like.",
    label: "Example: you describe a service agreement, and the chatbot writes the template with its signers, roles and order set.",
    points: ["A new template in seconds", "Roles and signing order included", "Edit it like any template"],
  },
} as const;

export function ChatbotShowcase({ variant = "home" }: { variant?: "home" | "templates" }) {
  const step = useChatLoop();
  const copy = COPY[variant];

  const bot = (
    <div className="cs-bot" aria-hidden>
      <Star className="cs-s1" /><Star className="cs-s2" /><Star className="cs-s3" /><Star className="cs-s4" />
      <img src={botImage} alt="" width={112} height={112} className="cs-bot-img" />
    </div>
  );

  return (
    <section className={`cs-card cs-${variant}`} aria-label={copy.kicker} data-testid={`chatbot-showcase${variant === "home" ? "" : `-${variant}`}`}>
      <div className="cs-head">
        <span className="cs-kicker">
          {variant === "templates" && <span className="cs-mini-bot" aria-hidden><img src={botImage} alt="" width={40} height={40} /></span>}
          <Sparkles size={13} aria-hidden /> {copy.kicker}
        </span>
        <span className="cs-chip"><Sparkles size={11} aria-hidden /> Personal plan</span>
      </div>

      <div className="cs-body">
        {variant === "home" && bot}

        <div className="cs-chat" role="img" aria-label={copy.label}>
          <div className="cs-msg cs-you">
            <span className="cs-who">You</span>
            {copy.ask}
          </div>
          {step === 1 && (
            <div className="cs-msg cs-bot-msg cs-typing"><span /><span /><span /></div>
          )}
          {step >= 2 && (
            <div className="cs-msg cs-bot-msg cs-answer">
              <span className="cs-who">LAGDA Bot</span>
              {copy.answer}
            </div>
          )}
        </div>

        <ul className="cs-points">
          {copy.points.map(p => <li key={p}><Check size={15} aria-hidden /> {p}</li>)}
        </ul>

        {variant === "templates" && bot}
      </div>

      <div className="cs-foot">
        <span className="cs-note">Included with Personal and Business</span>
        <Link to="/app/settings/plan?choose=personal" className="cs-cta" data-testid="chatbot-showcase-cta">
          Unlock the Chatbot <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      <style>{CSS}</style>
    </section>
  );
}

const CSS = `
.cs-card { position: relative; overflow: hidden; margin: 14px 0 8px; border-radius: 20px; color: #E8EEF9; font-family: 'Geist', sans-serif;
  background:
    radial-gradient(700px 260px at 8% 120%, rgba(245,197,66,0.20), transparent 60%),
    radial-gradient(800px 300px at 100% -30%, rgba(47,140,240,0.35), transparent 60%),
    linear-gradient(135deg, #0B1B3A 0%, #10275A 55%, #0E2150 100%);
  box-shadow: 0 1px 2px rgba(7,17,31,0.08), 0 22px 44px -28px rgba(7,17,31,0.7); }
.cs-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
  background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 28px 28px; mask-image: linear-gradient(90deg, #000 0%, transparent 70%); -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 70%); }
.cs-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px 0; }
.cs-kicker { display: inline-flex; align-items: center; gap: 7px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11.5px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: #FDE68A; }
.cs-chip { display: inline-flex; align-items: center; gap: 5px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: #3B2A00; background: linear-gradient(135deg, #FDE68A, #F5C542); padding: 4px 10px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
.cs-cta:focus-visible { outline: 3px solid #F5C542; outline-offset: 2px; }

.cs-body { position: relative; display: grid; grid-template-columns: auto minmax(0, 1.4fr) minmax(0, 1fr); gap: 24px; align-items: center; padding: 16px 24px 18px; }
.cs-bot { position: relative; width: 132px; height: 132px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cs-bot::before { content: ""; position: absolute; width: 110px; height: 110px; border-radius: 50%; background: radial-gradient(circle, rgba(96,165,250,0.45), transparent 70%); }
.cs-bot-img { position: relative; width: 112px; height: 112px; filter: drop-shadow(0 12px 18px rgba(7,17,31,0.55)); transform-origin: 50% 85%;
  animation: cs-hop 2.5s ease-in-out infinite; }
.cs-star { position: absolute; width: 12px; height: 12px; color: #FDE68A; filter: drop-shadow(0 0 4px rgba(245,197,66,0.9)); opacity: 0;
  animation: cs-twinkle 2.5s ease-in-out infinite; }
.cs-s1 { top: 6px; left: 10px; animation-delay: 0.1s; }
.cs-s2 { top: 0; right: 14px; width: 15px; height: 15px; animation-delay: 0.5s; }
.cs-s3 { bottom: 14px; right: 2px; width: 10px; height: 10px; animation-delay: 0.9s; }
.cs-s4 { bottom: 4px; left: 18px; width: 9px; height: 9px; animation-delay: 1.3s; }
@keyframes cs-hop {
  0%, 30%, 100% { transform: translateY(0) rotate(0deg); }
  8% { transform: translateY(-12px) rotate(-6deg); }
  16% { transform: translateY(0) rotate(4deg); }
  22% { transform: translateY(-4px) rotate(-2deg); }
}
@keyframes cs-twinkle {
  0%, 55%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
  15% { opacity: 1; transform: scale(1.2) rotate(45deg); }
  30% { opacity: 0.8; transform: scale(0.9) rotate(90deg); }
}

.cs-chat { display: flex; flex-direction: column; gap: 8px; min-width: 0; min-height: 128px; justify-content: center; }
.cs-msg { max-width: 92%; padding: 9px 12px; border-radius: 14px; font-size: 13.5px; line-height: 1.45; animation: cs-in 300ms ease-out; }
.cs-who { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; margin-bottom: 2px; opacity: 0.8; }
.cs-you { align-self: flex-end; background: #FFFFFF; color: #0B1F4B; border-bottom-right-radius: 4px; }
.cs-bot-msg { align-self: flex-start; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.16); color: #FFFFFF; border-bottom-left-radius: 4px; }
.cs-answer { box-shadow: 0 0 0 1.5px rgba(245,197,66,0.55); }
.cs-typing { display: inline-flex; gap: 5px; padding: 12px 14px; }
.cs-typing span { width: 7px; height: 7px; border-radius: 50%; background: #FDE68A; animation: cs-dot 900ms ease-in-out infinite; }
.cs-typing span:nth-child(2) { animation-delay: 150ms; }
.cs-typing span:nth-child(3) { animation-delay: 300ms; }
@keyframes cs-dot { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }
@keyframes cs-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.cs-points { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; min-width: 0; }
.cs-points li { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; line-height: 1.45; color: #DCE6F7; }
.cs-points svg { flex-shrink: 0; margin-top: 2px; color: #86EFAC; }

.cs-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  padding: 14px 24px 18px; border-top: 1px solid rgba(255,255,255,0.1); }
.cs-note { font-size: 12.5px; color: #8FA3C7; }
.cs-cta { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 20px; border-radius: 12px; background: #FFFFFF;
  color: #0B1F4B; font-weight: 800; font-size: 14.5px; text-decoration: none; box-shadow: 0 10px 24px -12px rgba(255,255,255,0.6); transition: transform 150ms ease; }
.cs-cta:hover { transform: translateY(-1px); }

.cs-mini-bot { display: none; }

/* My Templates: the chat leads, the bot takes the right-hand side, lifted
   over the card's edge on a speech tail, as if it had just answered. */
.cs-templates { margin: 16px 0 4px; }
.cs-templates .cs-body { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) auto; }
.cs-templates .cs-bot { width: 150px; height: 150px; margin: -24px 0 -12px; }
.cs-templates .cs-bot::before { width: 136px; height: 136px; }
.cs-templates .cs-bot-img { width: 132px; height: 132px; }

@media (max-width: 1100px) {
  .cs-body { grid-template-columns: auto minmax(0, 1fr); }
  .cs-points { grid-column: 1 / -1; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cs-templates .cs-body { grid-template-columns: minmax(0, 1fr) auto; }
  .cs-templates .cs-bot { grid-row: 1; grid-column: 2; margin: 0; width: 120px; height: 120px; }
  .cs-templates .cs-bot-img { width: 104px; height: 104px; }
}
@media (max-width: 640px) {
  .cs-card { border-radius: 18px; }
  .cs-head { padding: 16px 16px 0; }
  .cs-chip { display: none; }
  /* Templates on a phone: the bot tucks in beside the heading. */
  .cs-templates .cs-bot { display: none; }
  .cs-templates .cs-mini-bot { display: inline-flex; width: 40px; height: 40px; margin-right: 4px; animation: cs-hop 2.5s ease-in-out infinite; transform-origin: 50% 85%; }
  .cs-templates .cs-mini-bot img { width: 40px; height: 40px; filter: drop-shadow(0 6px 10px rgba(7,17,31,0.5)); }
  .cs-templates .cs-body { grid-template-columns: minmax(0, 1fr); }
  .cs-templates .cs-points { display: none; }
  .cs-body { grid-template-columns: minmax(0, 1fr); gap: 14px; padding: 12px 16px 14px; justify-items: center; }
  .cs-chat { width: 100%; min-height: 150px; }
  .cs-points { grid-template-columns: minmax(0, 1fr); width: 100%; }
  .cs-foot { padding: 14px 16px 16px; flex-direction: column; align-items: stretch; gap: 10px; }
  .cs-note { text-align: center; }
  .cs-cta { margin-left: 0; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .cs-bot-img, .cs-star, .cs-typing span, .cs-msg, .cs-templates .cs-mini-bot { animation: none; }
  .cs-star { opacity: 0.8; }
  .cs-cta { transition: none; }
  .cs-cta:hover { transform: none; }
}
`;
