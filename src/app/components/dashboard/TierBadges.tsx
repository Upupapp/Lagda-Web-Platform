// The paid plan, shown with some ceremony on the Home banner (093).
//
//   TierCrystal — top-left of the banner: a faceted crystal, "Business Tier"
//                 (or Personal / Enterprise), with small stars that twinkle,
//                 and a short wiggle every three seconds.
//   TierPill    — beside the verified check: the plan's name.
//
// Motion stops for anyone who asks the system for reduced motion.

import type { PlanId } from "../../services/real/plans.service";

type PaidPlan = Exclude<PlanId, "free">;

const LABEL: Readonly<Record<PaidPlan, string>> = { personal: "Personal", business: "Business", enterprise: "Enterprise" };

/** A cut gem: four facets in two tones of the tier's colour. */
function Crystal({ tier }: { tier: PaidPlan }) {
  const id = `tc-${tier}`;
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className="tc-gem">
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--tc-light)" />
          <stop offset="1" stopColor="var(--tc-mid)" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--tc-mid)" />
          <stop offset="1" stopColor="var(--tc-deep)" />
        </linearGradient>
      </defs>
      <polygon points="6,3 18,3 22,9 2,9" fill={`url(#${id}-a)`} />
      <polygon points="2,9 12,22 7,9" fill={`url(#${id}-b)`} />
      <polygon points="7,9 12,22 17,9" fill={`url(#${id}-a)`} />
      <polygon points="17,9 12,22 22,9" fill={`url(#${id}-b)`} />
      <polyline points="6,3 7,9 12,3 17,9 18,3" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
    </svg>
  );
}

function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden className={`tc-star ${className}`}>
      <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="currentColor" />
    </svg>
  );
}

export function TierCrystal({ tier }: { tier: PaidPlan }) {
  return (
    <span className={`tc-crystal tc-${tier}`} data-testid="tier-crystal" role="img" aria-label={`${LABEL[tier]} Tier`}>
      <Star className="tc-s1" /><Star className="tc-s2" /><Star className="tc-s3" /><Star className="tc-s4" />
      <Crystal tier={tier} />
      <span className="tc-text">{LABEL[tier]} Tier</span>
      <style>{TIER_CSS}</style>
    </span>
  );
}

export function TierPill({ tier }: { tier: PaidPlan }) {
  return (
    <span className={`tp-pill tc-${tier}`} data-testid="tier-pill">
      <Crystal tier={tier} />
      {LABEL[tier]}
      <style>{TIER_CSS}</style>
    </span>
  );
}

const TIER_CSS = `
.tc-personal { --tc-light: #C4B5FD; --tc-mid: #7C3AED; --tc-deep: #4C1D95; --tc-glow: rgba(139,92,246,0.55); --tc-star: #E9D5FF; }
.tc-business { --tc-light: #FDE68A; --tc-mid: #F59E0B; --tc-deep: #B45309; --tc-glow: rgba(245,158,11,0.6); --tc-star: #FEF3C7; }
.tc-enterprise { --tc-light: #A7F3D0; --tc-mid: #10B981; --tc-deep: #065F46; --tc-glow: rgba(16,185,129,0.55); --tc-star: #D1FAE5; }

.tc-crystal { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px 6px 10px; border-radius: 999px;
  font-family: 'Geist', sans-serif; font-size: 12.5px; font-weight: 800; letter-spacing: 0.03em; color: #FFFFFF;
  background: linear-gradient(135deg, rgba(255,255,255,0.34), rgba(255,255,255,0.08) 55%, rgba(255,255,255,0.22));
  border: 1px solid rgba(255,255,255,0.55);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.08), 0 8px 22px -8px var(--tc-glow), inset 0 1px 0 rgba(255,255,255,0.6);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); text-shadow: 0 1px 2px rgba(7,17,31,0.35);
  transform-origin: 50% 60%; animation: tc-wiggle 3s ease-in-out infinite; }
.tc-crystal::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 45%, transparent 60%); background-size: 250% 100%;
  animation: tc-shine 3s ease-in-out infinite; mix-blend-mode: overlay; }
.tc-gem { flex-shrink: 0; filter: drop-shadow(0 0 6px var(--tc-glow)); }
.tc-text { white-space: nowrap; }
.tc-star { position: absolute; color: var(--tc-star); filter: drop-shadow(0 0 3px var(--tc-glow)); opacity: 0; pointer-events: none;
  animation: tc-twinkle 3s ease-in-out infinite; }
.tc-s1 { top: -6px; left: 8px; width: 9px; height: 9px; animation-delay: 0s; }
.tc-s2 { top: -8px; right: 14px; width: 11px; height: 11px; animation-delay: 0.35s; }
.tc-s3 { bottom: -6px; right: 4px; width: 8px; height: 8px; animation-delay: 0.7s; }
.tc-s4 { bottom: -7px; left: 30%; width: 7px; height: 7px; animation-delay: 1.05s; }
@keyframes tc-wiggle {
  0%, 16%, 100% { transform: rotate(0deg) scale(1); }
  3% { transform: rotate(-4deg) scale(1.04); }
  6% { transform: rotate(4deg) scale(1.04); }
  9% { transform: rotate(-3deg) scale(1.02); }
  12% { transform: rotate(2deg) scale(1.01); }
}
@keyframes tc-twinkle {
  0%, 60%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
  15% { opacity: 1; transform: scale(1.15) rotate(45deg); }
  30% { opacity: 0.85; transform: scale(0.9) rotate(90deg); }
}
@keyframes tc-shine { 0%, 50% { background-position: 150% 0; } 80%, 100% { background-position: -100% 0; } }

.tp-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px 3px 6px; border-radius: 999px; font-family: 'Geist', sans-serif;
  font-size: 12.5px; font-weight: 800; color: var(--tc-deep); background: linear-gradient(135deg, #FFFFFF, color-mix(in srgb, var(--tc-light) 45%, #FFFFFF));
  border: 1px solid color-mix(in srgb, var(--tc-mid) 45%, #FFFFFF); box-shadow: 0 4px 12px -6px var(--tc-glow); white-space: nowrap; flex-shrink: 0; }
.tp-pill .tc-gem { width: 16px; height: 16px; }

@media (max-width: 640px) {
  .tc-crystal { font-size: 11.5px; padding: 5px 11px 5px 8px; gap: 5px; }
  .tc-gem { width: 17px; height: 17px; }
}
@media (prefers-reduced-motion: reduce) {
  .tc-crystal, .tc-crystal::after, .tc-star { animation: none; }
  .tc-star { opacity: 0.8; }
}
`;
