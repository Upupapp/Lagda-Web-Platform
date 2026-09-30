// A paid feature on a workspace whose owner's plan does not include it
// (backend 093). The page is replaced by one card that says which plan the
// feature needs and what to do: the owner upgrades from My Settings › Plan &
// Billing; anyone else asks the owner.
//
// Every lock wears the same "pass" as the Free pass on Home (PlanPass), so a
// lock anywhere reads as the same offer. Nothing is deleted when a plan
// lapses, and the card says so. While the plan is still being read the page
// waits rather than flashing a lock at a paying workspace.

import { useWorkspacePlan } from "../../hooks/usePlans";
import { planIncludes, PLAN_NAMES } from "../../services/real/plans.service";
import { PlanPassCard, PlanTiles } from "./PlanPass";

/** The tile line that IS each locked feature, and what Personal lacks of it. */
const FEATURE_LINES: Readonly<Record<string, { line: string; missing?: string }>> = {
  "Sharing documents": { line: "Share completed documents" },
  "Ready-made templates": { line: "Ready-made templates and chatbot" },
  "Branding": { line: "Your logo and colours" },
  "Workspace settings": { line: "Your logo and colours" },
  "Members": { line: "Invite your team", missing: "members" },
  "Inviting members": { line: "Invite your team", missing: "members" },
  "Join links": { line: "Teams, roles and join links", missing: "join links" },
  "Join requests": { line: "Teams, roles and join links", missing: "join requests" },
  "Teams": { line: "Teams, roles and join links", missing: "teams" },
  "Roles": { line: "Teams, roles and join links", missing: "roles" },
  "Organisation": { line: "Teams, roles and join links", missing: "organisation" },
  "The activity log": { line: "Shared contacts and activity log", missing: "the activity log" },
};

const KEPT = "Anything you set up is kept · Test mode, no money is moved";

export function PlanUpgradeCard({ minimum, feature, compact = false, title }: {
  minimum: "personal" | "business";
  feature: string;
  compact?: boolean;
  /** Replaces "<feature> is part of the <plan> plan". */
  title?: string;
}) {
  const { info } = useWorkspacePlan();
  const owner = info?.ownerIsYou ?? false;
  const name = PLAN_NAMES[minimum];
  const lit = FEATURE_LINES[feature];
  return (
    <PlanPassCard
      testId="plan-upgrade-card"
      compact={compact}
      chip={`${name} plan`}
      title={title ?? `${feature} is part of the ${name} plan`}
      body={<p>{owner
        ? `Upgrade to ${name} to use it in this workspace. Anything you set up before comes back when you upgrade.`
        : `This workspace uses its owner's plan${info?.ownerName ? ` (${info.ownerName})` : ""}. Ask the owner to upgrade to ${name}.`}</p>}
      {...(owner
        ? {
            cta: { to: `/app/settings/plan?choose=${minimum}`, label: "See plans", testId: "plan-upgrade-cta" },
            note: KEPT,
            aside: <PlanTiles requires={minimum} {...(lit ? { highlight: lit.line } : {})} {...(lit?.missing ? { missing: lit.missing } : {})} />,
          }
        : { askOwner: "Ask the owner to upgrade" })}
    />
  );
}

/**
 * Joining another workspace is part of Personal: the PERSON's own plan
 * decides, wherever they are. Shown where an invitation would be accepted.
 */
export function JoinNeedsPersonalNotice() {
  return (
    <PlanPassCard
      testId="join-needs-personal"
      compact
      chip="Personal plan"
      title="Joining another workspace is part of the Personal plan"
      body={<p>You are on Free. Upgrade to Personal or Business to accept invitations and join other workspaces. Your invitations stay here until you do.</p>}
      cta={{ to: "/app/settings/plan?choose=personal", label: "See plans", testId: "join-needs-personal-cta" }}
      note={KEPT}
      aside={<PlanTiles requires="personal" highlight="Join other workspaces" />}
    />
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
