// The plan name shown under a workspace's name, in the desktop switcher and
// the phone drawer alike.

import { useWorkspacePlan } from "./usePlans";
import { USE_REAL_BACKEND } from "../services/backend-flag";
import { PLAN_NAMES } from "../services/real/plans.service";
import { PLAN_LABELS } from "../models";

/**
 * The plan name shown under a workspace's name.
 *
 * Real mode reads the workspace's plan (its owner's, 093) — the session's
 * workspace record carries only a placeholder `plan: "personal"`
 * (session-bootstrap normalizeWorkspace), which put "Personal" under a
 * Business workspace. Empty while the plan is still being read, rather than a
 * guess. The demo build keeps the fixture's own plan.
 */
export function useWorkspacePlanLabel(workspace: { id: string; plan: keyof typeof PLAN_LABELS } | null): string {
  const { plan } = useWorkspacePlan(workspace?.id ?? null);
  if (workspace === null) return "";
  if (!USE_REAL_BACKEND) return PLAN_LABELS[workspace.plan];
  return plan === null ? "" : PLAN_NAMES[plan];
}
