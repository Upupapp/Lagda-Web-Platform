// The "pass" look shared by everything about plans (093): the Free pass on
// Home, every locked feature, and the plan cards in Plan & Billing. One dark
// navy card with a faint grid, a gold plan chip, white text and a white call
// to action — so a lock anywhere in the app reads as the same offer.

import { Link } from "react-router";
import { Lock, ArrowRight, Sparkles } from "lucide-react";

export function PlanPassCard({ chip, title, body, cta, testId, compact = false, icon, aside }: {
  /** The plan it needs, e.g. "Personal plan". */
  chip: string;
  title: string;
  body: React.ReactNode;
  cta?: { to: string; label: string; testId?: string };
  testId?: string;
  compact?: boolean;
  icon?: React.ReactNode;
  /** A second column: prices, a note. Stacks under the text on narrow screens. */
  aside?: React.ReactNode;
}) {
  return (
    <section className={`pp-card${compact ? " pp-compact" : ""}`} data-testid={testId} aria-label={title}>
      <div className="pp-inner">
        <div className="pp-main">
          <div className="pp-top">
            <span className="pp-icon" aria-hidden>{icon ?? <Lock size={compact ? 17 : 20} />}</span>
            <span className="pp-chip"><Sparkles size={12} aria-hidden /> {chip}</span>
          </div>
          <h2 className="pp-title">{title}</h2>
          <div className="pp-body">{body}</div>
          {cta && (
            <Link to={cta.to} className="pp-cta" data-testid={cta.testId}>
              {cta.label} <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </div>
        {aside && <div className="pp-aside">{aside}</div>}
      </div>
      <style>{PLAN_PASS_CSS}</style>
    </section>
  );
}

/** Two small price tiles for a lock card's aside. */
export function PlanPassPrices({ highlight }: { highlight: "personal" | "business" }) {
  const tiles = [
    { id: "personal", name: "Personal", price: "₱299", unit: "/mo" },
    { id: "business", name: "Business", price: "₱799", unit: "/user/mo" },
  ] as const;
  return (
    <div className="pp-prices">
      {tiles.map(t => (
        <Link key={t.id} to={`/app/settings/plan?choose=${t.id}`} className={`pp-price${t.id === highlight ? " pp-price-on" : ""}`}>
          <span className="pp-price-name">{t.name}</span>
          <span className="pp-price-amount">{t.price}<small>{t.unit}</small></span>
        </Link>
      ))}
    </div>
  );
}

/**
 * The shared stylesheet. Also used by the plan cards in Plan & Billing
 * (`pp-tile…` classes), so every plan surface draws from one place.
 */
export const PLAN_PASS_CSS = `
.pp-card, .pp-panel { position: relative; overflow: hidden; border-radius: 20px; color: #E8EEF9; font-family: 'Geist', sans-serif;
  background:
    radial-gradient(900px 320px at -10% -40%, rgba(47,140,240,0.35), transparent 60%),
    radial-gradient(600px 320px at 110% 130%, rgba(202,138,4,0.22), transparent 60%),
    linear-gradient(135deg, #0B1B3A 0%, #10275A 55%, #0E2150 100%);
  box-shadow: 0 1px 2px rgba(7,17,31,0.08), 0 22px 44px -28px rgba(7,17,31,0.7); }
.pp-card::before, .pp-panel::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
  background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 28px 28px; mask-image: linear-gradient(90deg, #000 0%, transparent 70%); -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 70%); }
.pp-card { margin: 20px auto; max-width: 900px; }
.pp-compact { margin: 12px 0 16px; max-width: none; border-radius: 16px; }
.pp-inner { position: relative; display: flex; gap: 24px; align-items: center; padding: 24px 26px; }
.pp-compact .pp-inner { padding: 18px 20px; }
.pp-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
.pp-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pp-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); color: #FDE68A; border: 1px solid rgba(255,255,255,0.14); }
.pp-compact .pp-icon { width: 34px; height: 34px; border-radius: 10px; }
.pp-chip { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: #3B2A00; background: linear-gradient(135deg, #FDE68A, #F5C542); padding: 5px 11px 5px 9px; border-radius: 999px;
  box-shadow: 0 6px 16px -8px rgba(245,197,66,0.8); }
.pp-title { margin: 2px 0 0; font-size: 20px; line-height: 1.25; font-weight: 800; color: #FFFFFF; letter-spacing: -0.01em; }
.pp-compact .pp-title { font-size: 17px; }
.pp-body { font-size: 14px; line-height: 1.6; color: #C7D4EA; max-width: 62ch; }
.pp-body p { margin: 0; }
.pp-cta { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 20px; margin-top: 4px; border-radius: 12px; background: #FFFFFF; color: #0B1F4B; font-weight: 800; font-size: 14.5px; text-decoration: none;
  box-shadow: 0 10px 24px -12px rgba(255,255,255,0.6); transition: transform 150ms ease; }
.pp-cta:hover { transform: translateY(-1px); }
.pp-cta:focus-visible, .pp-price:focus-visible, .pp-tile-btn:focus-visible { outline: 3px solid #F5C542; outline-offset: 3px; }
.pp-aside { flex: 0 0 auto; min-width: 0; }
.pp-prices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; min-width: 260px; }
.pp-price { display: grid; gap: 4px; padding: 14px; border-radius: 14px; text-decoration: none; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); transition: border-color 150ms ease, transform 150ms ease; }
.pp-price:hover { border-color: rgba(255,255,255,0.34); transform: translateY(-1px); }
.pp-price-on { background: linear-gradient(160deg, rgba(47,140,240,0.35), rgba(255,255,255,0.06)); border-color: rgba(96,165,250,0.6); }
.pp-price-name { font-size: 12.5px; font-weight: 700; color: #A9BCDD; }
.pp-price-amount { font-size: 21px; font-weight: 800; color: #FFFFFF; }
.pp-price-amount small { font-size: 11.5px; font-weight: 600; color: #A9BCDD; margin-left: 2px; }

/* ── Plan cards (Plan & Billing) ─────────────────────────────────────────── */
.pp-panel { padding: 22px; }
.pp-panel-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.pp-panel-kicker { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #8FA3C7; }
.pp-test { display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
  color: #FDE68A; background: rgba(245,197,66,0.12); border: 1px solid rgba(245,197,66,0.4); border-radius: 999px; padding: 5px 12px; }
.pp-tiles { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.pp-tile { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 18px 16px 16px; border-radius: 16px; min-width: 0;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); color: #E8EEF9; }
.pp-tile-business { background: linear-gradient(160deg, rgba(47,140,240,0.35), rgba(255,255,255,0.06)); border-color: rgba(96,165,250,0.6); }
.pp-tile-current { box-shadow: 0 0 0 2px #F5C542; border-color: transparent; }
.pp-tile-tags { display: flex; gap: 6px; flex-wrap: wrap; min-height: 22px; }
.pp-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
.pp-tag-popular { color: #0B1F4B; background: #BFDBFE; }
.pp-tag-current { color: #3B2A00; background: #FDE68A; }
.pp-tile-name { margin: 0; font-size: 17px; font-weight: 800; color: #FFFFFF; }
.pp-tile-tagline { margin: 3px 0 0; font-size: 12.5px; line-height: 1.45; color: #A9BCDD; }
.pp-tile-price { font-size: 26px; font-weight: 800; color: #FFFFFF; line-height: 1.1; }
.pp-tile-price small { font-size: 12px; font-weight: 600; color: #A9BCDD; margin-left: 3px; }
.pp-tile-sub { font-size: 12px; color: #8FA3C7; margin-top: 4px; }
.pp-tile ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; flex: 1; align-content: start; }
.pp-tile li { display: flex; gap: 7px; align-items: flex-start; font-size: 12.5px; line-height: 1.45; color: #DCE6F7; }
.pp-tile li svg { flex-shrink: 0; margin-top: 2px; color: #86EFAC; }
.pp-tile-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; min-height: 42px; border-radius: 11px; font: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.3); background: transparent; color: #FFFFFF; transition: background 150ms ease, transform 150ms ease; }
.pp-tile-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
.pp-tile-btn-primary { background: #FFFFFF; color: #0B1F4B; border-color: #FFFFFF; }
.pp-tile-btn-primary:hover:not(:disabled) { background: #F1F5F9; }
.pp-tile-btn:disabled { cursor: default; opacity: 0.6; }
.pp-panel-foot { position: relative; margin-top: 14px; display: flex; justify-content: flex-start; }
.pp-compare-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 14px; border-radius: 10px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
  background: rgba(255,255,255,0.08); color: #E8EEF9; border: 1px solid rgba(255,255,255,0.18); }
.pp-compare-btn:focus-visible { outline: 3px solid #F5C542; outline-offset: 2px; }
@media (max-width: 1180px) { .pp-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 820px) {
  .pp-inner { flex-direction: column; align-items: stretch; }
  .pp-prices { min-width: 0; }
}
@media (max-width: 560px) {
  .pp-card { margin: 14px 0; border-radius: 16px; }
  .pp-inner, .pp-compact .pp-inner { padding: 18px 16px; gap: 16px; }
  .pp-title { font-size: 18px; }
  .pp-cta { width: 100%; justify-content: center; box-sizing: border-box; }
  .pp-panel { padding: 16px; border-radius: 16px; }
  .pp-tiles { grid-template-columns: minmax(0, 1fr); }
  .pp-tile-tags:empty { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .pp-cta, .pp-price, .pp-tile-btn { transition: none; }
  .pp-cta:hover, .pp-price:hover, .pp-tile-btn:hover:not(:disabled) { transform: none; }
}
`;
