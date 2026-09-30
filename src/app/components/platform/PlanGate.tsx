// A paid feature on a workspace whose owner's plan does not include it
// (backend 093). The page is replaced by one card that says which plan the
// feature needs and what to do: the owner upgrades from My Settings › Plan &
// Billing; anyone else asks the owner.
//
// Nothing is deleted when a plan lapses, and the card says so. While the plan
// is still being read the page waits rather than flashing a lock at a paying
// workspace.

import { Link } from "react-router";
import { Lock, ArrowRight } from "lucide-react";
import { useWorkspacePlan } from "../../hooks/usePlans";
import { planIncludes, PLAN_NAMES } from "../../services/real/plans.service";

export function PlanUpgradeCard({ minimum, feature, compact = false }: {
  minimum: "personal" | "business";
  feature: string;
  compact?: boolean;
}) {
  const { info } = useWorkspacePlan();
  const owner = info?.ownerIsYou ?? false;
  const name = PLAN_NAMES[minimum];
  return (
    <section className={`pg-card${compact ? " pg-compact" : ""}`} data-testid="plan-upgrade-card" aria-label={`${feature} needs the ${name} plan`}>
      <span className="pg-icon" aria-hidden><Lock size={compact ? 18 : 22} /></span>
      <div className="pg-text">
        <h2 className="pg-title">{feature} is part of the {name} plan</h2>
        <p className="pg-body">
          {owner
            ? `Upgrade to ${name} to use it in this workspace. Anything you set up before is kept and comes back when you upgrade.`
            : `This workspace uses its owner's plan${info?.ownerName ? ` (${info.ownerName})` : ""}. Ask the owner to upgrade to ${name}.`}
        </p>
        {owner && (
          <Link to={`/app/settings/plan?choose=${minimum}`} className="pg-cta" data-testid="plan-upgrade-cta">
            See plans <ArrowRight size={15} aria-hidden />
          </Link>
        )}
      </div>
      <style>{CSS}</style>
    </section>
  );
}

/**
 * Joining another workspace is part of Personal: the PERSON's own plan
 * decides, wherever they are. Shown where an invitation would be accepted.
 */
export function JoinNeedsPersonalNotice() {
  return (
    <section className="pg-card pg-compact" data-testid="join-needs-personal" aria-label="Joining needs the Personal plan">
      <span className="pg-icon" aria-hidden><Lock size={18} /></span>
      <div className="pg-text">
        <h2 className="pg-title">Joining another workspace is part of the Personal plan</h2>
        <p className="pg-body">You are on Free. Upgrade to Personal or Business to accept invitations and join other workspaces. Your invitations stay here until you do.</p>
        <Link to="/app/settings/plan?choose=personal" className="pg-cta" data-testid="join-needs-personal-cta">
          See plans <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
      <style>{CSS}</style>
    </section>
  );
}

/** Children only when the workspace's plan includes `minimum` (or is unread). */
export function WhenPlan({ minimum, children }: { minimum: "personal" | "business"; children: React.ReactNode }) {
  const { plan } = useWorkspacePlan();
  return plan !== null && !planIncludes(plan, minimum) ? null : <>{children}</>;
}

export function PlanGate({ minimum, feature, children }: {
  minimum: "personal" | "business";
  feature: string;
  children: React.ReactNode;
}) {
  const { plan } = useWorkspacePlan();
  if (plan === null) return <div aria-busy="true" data-testid="plan-gate-loading" style={{ minHeight: 120 }} />;
  if (!planIncludes(plan, minimum)) return <PlanUpgradeCard minimum={minimum} feature={feature} />;
  return <>{children}</>;
}

const CSS = `
.pg-card { display: flex; gap: 16px; align-items: flex-start; background: #FFFFFF; border: 1px solid #E6EBF2; border-radius: 18px; padding: 24px; margin: 20px auto; max-width: 720px; box-shadow: 0 1px 2px rgba(7,17,31,0.04), 0 16px 34px -26px rgba(7,17,31,0.4); font-family: 'Geist', sans-serif; box-sizing: border-box; }
.pg-compact { margin: 12px 0; padding: 16px; border-radius: 14px; max-width: none; }
.pg-icon { width: 48px; height: 48px; border-radius: 14px; background: #FEF3C7; color: #92400E; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pg-compact .pg-icon { width: 38px; height: 38px; border-radius: 11px; }
.pg-text { min-width: 0; }
.pg-title { font-size: 18px; font-weight: 800; color: #0B1F4B; margin: 0; line-height: 1.3; }
.pg-compact .pg-title { font-size: 15px; }
.pg-body { font-size: 14px; color: #475569; line-height: 1.6; margin: 6px 0 0; }
.pg-cta { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; min-height: 42px; padding: 0 18px; border-radius: 10px; background: #0B63D1; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; }
.pg-cta:hover { background: #0A57B8; }
.pg-cta:focus-visible { outline: 3px solid rgba(0,120,212,0.35); outline-offset: 2px; }
@media (max-width: 560px) {
  .pg-card { flex-direction: column; padding: 18px 16px; margin: 14px 0; }
  .pg-cta { width: 100%; justify-content: center; box-sizing: border-box; }
}
`;
