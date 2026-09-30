// The Home header for a person on the Free plan (backend 093).
//
// Free has no branding, so the workspace banner has nothing of its own to
// show. In its place: a "Free pass" — who you are, that you are on Free, how
// much of the one free document is left, and what Personal and Business add,
// with the way to Plan & Billing always one click away.
//
// ── States ─────────────────────────────────────────────────────────────────
//
//   fresh    — the free document is still unused
//   used     — it has been sent; upgrading is the way to send more
//   pending  — a request is waiting for approval; the tiles give way to it
//   lapsed   — a paid month ended; nothing was deleted
//
// A Free person working in a PAID owner's workspace is told they have that
// owner's features here, so the card never contradicts what the page offers.

import { Link } from "react-router";
import { Sparkles, Check, ArrowRight, Hourglass, Crown, Gem, Pencil, FileSignature, Infinity as InfinityIcon } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";
import { useWorkspacePlan } from "../../hooks/usePlans";
import { PLAN_NAMES, PLAN_PRICES, type MyPlan } from "../../services/real/plans.service";
import { PersonAvatar } from "../../pages/platform/contacts/contacts-ui";

const TILES = [
  {
    id: "personal" as const, icon: Gem, tag: null,
    lines: ["50 documents a month", "Your logo and colours", "Share completed documents"],
  },
  {
    id: "business" as const, icon: Crown, tag: "Most popular",
    lines: ["Invite your team", "Teams, roles and join links", "Shared contacts and activity log"],
  },
];

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function Meter({ used, limit }: { used: number; limit: number }) {
  const left = Math.max(0, limit - used);
  const ratio = limit === 0 ? 1 : Math.min(1, used / limit);
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <div className="fp-meter" role="img" aria-label={`${used} of ${limit} free document used`} data-testid="free-hero-meter">
      <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden>
        <circle cx="42" cy="42" r={R} className="fp-meter-track" />
        <circle cx="42" cy="42" r={R} className="fp-meter-fill"
          strokeDasharray={`${C * ratio} ${C}`} transform="rotate(-90 42 42)" />
      </svg>
      <div className="fp-meter-text">
        <strong>{left}</strong>
        <span>left</span>
      </div>
    </div>
  );
}

export function FreePlanHero({ plan }: { plan: MyPlan }) {
  const { user, currentWorkspace } = usePlatform();
  const { info: workspace } = useWorkspacePlan();
  const name = user?.fullName?.trim() || user?.displayName || "there";
  const used = Math.min(plan.freeDocumentsUsed, plan.freeDocumentLimit);
  const spent = used >= plan.freeDocumentLimit;
  const lapsed = plan.storedPlan !== "free";
  const pending = plan.pendingRequest;
  const hostedPaid = workspace !== null && workspace.plan !== "free" && !workspace.ownerIsYou;

  const headline = lapsed
    ? `Your ${PLAN_NAMES[plan.storedPlan]} month has ended`
    : spent ? "You've used your free document" : "Your free document is ready";
  const lead = lapsed
    ? "Nothing was deleted. Your members, teams and branding come back the moment you upgrade again."
    : spent
      ? "Upgrade to keep sending. Signing documents other people send you stays free, always."
      : "Send one document for signing on us. Signing documents other people send you is always free.";

  return (
    <section className="fp-card" aria-label="Your plan" data-testid="free-hero">
      <div className="fp-glow" aria-hidden />
      <div className="fp-grid">
        <div className="fp-main">
          <div className="fp-who">
            <span className="fp-avatar"><PersonAvatar name={name} avatarUrl={user?.avatarUrl} size={52} /></span>
            <div className="fp-who-text">
              <span className="fp-hello">Hi, {firstName(name)}</span>
              <Link to="/app/settings/profile" className="fp-edit"><Pencil size={12} aria-hidden /> Edit profile</Link>
            </div>
            <span className="fp-pass" data-testid="free-hero-badge"><Sparkles size={13} aria-hidden /> Free plan</span>
          </div>

          <div className="fp-status">
            <Meter used={used} limit={plan.freeDocumentLimit} />
            <div className="fp-status-text">
              <h1 className="fp-title">{headline}</h1>
              <p className="fp-lead">{lead}</p>
            </div>
          </div>

          <ul className="fp-facts">
            <li><FileSignature size={15} aria-hidden /> {used} of {plan.freeDocumentLimit} document sent</li>
            <li><InfinityIcon size={15} aria-hidden /> Unlimited signing for you</li>
          </ul>

          {hostedPaid && (
            <p className="fp-hosted" data-testid="free-hero-hosted">
              In {currentWorkspace?.name ?? "this workspace"} you have {workspace.ownerName ?? "the owner"}&apos;s {PLAN_NAMES[workspace.plan]} features.
            </p>
          )}

          <div className="fp-actions">
            <Link to="/app/settings/plan" className="fp-cta" data-testid="free-hero-plan-link">
              Plan &amp; Billing <ArrowRight size={16} aria-hidden />
            </Link>
            <span className="fp-note">Test mode: no money is moved</span>
          </div>
        </div>

        <div className="fp-side">
          {pending ? (
            <div className="fp-pending" role="status" data-testid="free-hero-pending">
              <Hourglass size={22} aria-hidden />
              <div>
                <strong>{PLAN_NAMES[pending.plan]} is waiting for approval</strong>
                <p>We&apos;ll email you and send a notification as soon as LAGDA decides. It usually takes a day.</p>
                <Link to="/app/settings/plan">View your request <ArrowRight size={14} aria-hidden /></Link>
              </div>
            </div>
          ) : (
            <>
              <div className="fp-side-head">Unlock more</div>
              <div className="fp-tiles">
                {TILES.map(t => {
                  const Icon = t.icon;
                  return (
                    <Link key={t.id} to={`/app/settings/plan?choose=${t.id}`} className={`fp-tile fp-tile-${t.id}`} data-testid={`free-hero-tile-${t.id}`}>
                      <div className="fp-tile-top">
                        <span className="fp-tile-icon"><Icon size={18} aria-hidden /></span>
                        {t.tag && <span className="fp-tile-tag">{t.tag}</span>}
                      </div>
                      <div className="fp-tile-name">{PLAN_NAMES[t.id]}</div>
                      <div className="fp-tile-price">₱{PLAN_PRICES[t.id]}<span>{t.id === "business" ? "/user/mo" : "/mo"}</span></div>
                      <ul>
                        {t.lines.map(l => <li key={l}><Check size={13} aria-hidden /> {l}</li>)}
                      </ul>
                      <span className="fp-tile-go">Choose {PLAN_NAMES[t.id]} <ArrowRight size={14} aria-hidden /></span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <style>{CSS}</style>
    </section>
  );
}

const CSS = `
.fp-card { position: relative; overflow: hidden; margin: 20px 0 8px; border-radius: 22px; color: #E8EEF9;
  background:
    radial-gradient(1200px 400px at -10% -40%, rgba(47,140,240,0.35), transparent 60%),
    radial-gradient(700px 360px at 110% 120%, rgba(202,138,4,0.22), transparent 60%),
    linear-gradient(135deg, #0B1B3A 0%, #10275A 55%, #0E2150 100%);
  box-shadow: 0 1px 2px rgba(7,17,31,0.08), 0 24px 48px -28px rgba(7,17,31,0.7); font-family: 'Geist', sans-serif; }
.fp-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
  background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 28px 28px; mask-image: linear-gradient(90deg, #000 0%, transparent 70%); -webkit-mask-image: linear-gradient(90deg, #000 0%, transparent 70%); }
.fp-glow { position: absolute; width: 260px; height: 260px; right: 34%; top: -140px; border-radius: 50%; background: rgba(250,204,21,0.12); filter: blur(40px); pointer-events: none; }
.fp-grid { position: relative; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 28px; padding: 26px 28px; }
.fp-main { min-width: 0; display: flex; flex-direction: column; gap: 18px; }
.fp-who { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.fp-avatar { line-height: 0; border-radius: 50%; box-shadow: 0 0 0 3px rgba(255,255,255,0.18); }
.fp-who-text { display: grid; gap: 2px; min-width: 0; }
.fp-hello { font-size: 17px; font-weight: 700; color: #FFFFFF; }
.fp-edit { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: #A9BCDD; text-decoration: none; }
.fp-edit:hover { color: #FFFFFF; }
.fp-pass { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11.5px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: #3B2A00; background: linear-gradient(135deg, #FDE68A, #F5C542); padding: 6px 12px 6px 10px; border-radius: 999px;
  box-shadow: 0 6px 16px -8px rgba(245,197,66,0.8); }
.fp-status { display: flex; align-items: center; gap: 18px; }
.fp-meter { position: relative; width: 84px; height: 84px; flex-shrink: 0; }
.fp-meter-track { fill: none; stroke: rgba(255,255,255,0.14); stroke-width: 8; }
.fp-meter-fill { fill: none; stroke: #F5C542; stroke-width: 8; stroke-linecap: round; transition: stroke-dasharray 600ms ease; }
.fp-meter-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; }
.fp-meter-text strong { font-size: 26px; font-weight: 800; color: #FFFFFF; }
.fp-meter-text span { font-size: 11px; color: #A9BCDD; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.08em; }
.fp-status-text { min-width: 0; }
.fp-title { margin: 0; font-size: 24px; line-height: 1.2; font-weight: 800; color: #FFFFFF; letter-spacing: -0.01em; }
.fp-lead { margin: 6px 0 0; font-size: 14.5px; line-height: 1.55; color: #C7D4EA; max-width: 52ch; }
.fp-facts { list-style: none; margin: 0; padding: 0; display: flex; gap: 8px; flex-wrap: wrap; }
.fp-facts li { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #DCE6F7; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 6px 12px; }
.fp-hosted { margin: 0; font-size: 13px; color: #BFE3C9; background: rgba(22,163,74,0.14); border: 1px solid rgba(74,222,128,0.25); border-radius: 10px; padding: 8px 12px; }
.fp-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: auto; }
.fp-cta { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 22px; border-radius: 12px; background: #FFFFFF; color: #0B1F4B; font-weight: 800; font-size: 15px; text-decoration: none;
  box-shadow: 0 10px 24px -12px rgba(255,255,255,0.6); transition: transform 150ms ease, box-shadow 150ms ease; }
.fp-cta:hover { transform: translateY(-1px); box-shadow: 0 14px 28px -12px rgba(255,255,255,0.7); }
.fp-cta:focus-visible, .fp-tile:focus-visible, .fp-edit:focus-visible, .fp-pending a:focus-visible { outline: 3px solid #F5C542; outline-offset: 3px; }
.fp-note { font-size: 12px; color: #8FA3C7; }
.fp-side { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.fp-side-head { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #8FA3C7; }
.fp-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; flex: 1; }
.fp-tile { display: flex; flex-direction: column; gap: 6px; padding: 16px; border-radius: 16px; text-decoration: none; color: #E8EEF9; min-width: 0;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(6px); transition: transform 150ms ease, border-color 150ms ease, background 150ms ease; }
.fp-tile:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.32); background: rgba(255,255,255,0.1); }
.fp-tile-business { background: linear-gradient(160deg, rgba(47,140,240,0.35), rgba(255,255,255,0.06)); border-color: rgba(96,165,250,0.55); }
.fp-tile-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.fp-tile-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.12); color: #FDE68A; }
.fp-tile-tag { font-size: 10.5px; font-weight: 700; color: #0B1F4B; background: #BFDBFE; border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
.fp-tile-name { font-size: 16px; font-weight: 800; color: #FFFFFF; margin-top: 4px; }
.fp-tile-price { font-size: 22px; font-weight: 800; color: #FFFFFF; }
.fp-tile-price span { font-size: 12px; font-weight: 600; color: #A9BCDD; margin-left: 2px; }
.fp-tile ul { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 5px; }
.fp-tile li { display: flex; gap: 6px; align-items: flex-start; font-size: 12.5px; line-height: 1.4; color: #DCE6F7; }
.fp-tile li svg { flex-shrink: 0; margin-top: 2px; color: #86EFAC; }
.fp-tile-go { margin-top: auto; padding-top: 8px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #FDE68A; }
.fp-pending { display: flex; gap: 14px; align-items: flex-start; padding: 18px; border-radius: 16px; background: rgba(245,197,66,0.12); border: 1px solid rgba(245,197,66,0.4); color: #FDE68A; height: 100%; box-sizing: border-box; }
.fp-pending strong { display: block; font-size: 16px; color: #FFFFFF; }
.fp-pending p { margin: 6px 0 10px; font-size: 13.5px; line-height: 1.55; color: #C7D4EA; }
.fp-pending a { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 700; color: #FDE68A; text-decoration: none; }
@media (max-width: 1100px) {
  .fp-grid { grid-template-columns: minmax(0, 1fr); gap: 22px; }
}
@media (max-width: 640px) {
  .fp-card { border-radius: 18px; margin-top: 14px; }
  .fp-grid { padding: 20px 16px; }
  .fp-pass { margin-left: 0; }
  .fp-status { align-items: flex-start; gap: 14px; }
  .fp-meter { width: 72px; height: 72px; }
  .fp-meter svg { width: 72px; height: 72px; }
  .fp-meter-text strong { font-size: 22px; }
  .fp-title { font-size: 20px; }
  .fp-lead { font-size: 13.5px; }
  .fp-tiles { grid-template-columns: minmax(0, 1fr); }
  .fp-cta { width: 100%; justify-content: center; box-sizing: border-box; }
  .fp-actions { gap: 8px; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .fp-cta, .fp-tile, .fp-meter-fill { transition: none; }
  .fp-cta:hover, .fp-tile:hover { transform: none; }
}
`;
