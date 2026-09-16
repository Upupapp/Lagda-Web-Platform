// Pure logic behind the PreparationHelpFab panel — what to list, whether the
// document is ready, and the completion percentage. Extracted from the FAB
// component's useMemo so the mapping/percentage rules are unit-testable pure
// logic rather than living inside a React closure.

import type { PreparationStepId, PreparationStepState, PrepValidationIssue } from "../../models/prepare";
import { PREPARATION_STEPS } from "../../models/prepare";
import type { SendReadinessAction, SendReadinessResult } from "../../services/prepare/send-readiness";

export interface HelpItem {
  id: string;
  stepLabel: string;
  message: string;
  action: SendReadinessAction;
}

export function stepRouteFor(id: PreparationStepId): string {
  return PREPARATION_STEPS.find((s) => s.id === id)?.route ?? "/app/prepare";
}

export function stepLabelFor(id: PreparationStepId): string {
  return PREPARATION_STEPS.find((s) => s.id === id)?.label ?? id;
}

// Best-effort label for a send-readiness blocker's target step, derived from
// its route (send-readiness blockers don't carry a stepId).
export function stepLabelFromRoute(route: string): string {
  return PREPARATION_STEPS.find((s) => route.startsWith(s.route))?.label ?? "Preparation";
}

// The 6 non-field steps validateDraftState gates, plus one unit for field
// placement — a simple, honest "how much is done" signal, not a weighted score.
export const PERCENT_STEP_UNITS: PreparationStepId[] = [
  "upload", "participants", "routing", "authentication", "settings", "review",
];

/** Real-backend mode: one help item per send-readiness blocker. */
export function helpItemsFromReadiness(readiness: SendReadinessResult): HelpItem[] {
  return readiness.blockers.map((b, i) => ({
    id: `sr_${i}`,
    stepLabel: b.action ? stepLabelFromRoute(b.action.route) : "Preparation",
    message: b.message,
    action: b.action ?? { label: "Review", route: "/app/prepare/review" },
  }));
}

/** Fields are "done" once no blocker still points back at the fields step. */
export function fieldsDoneFromReadiness(readiness: SendReadinessResult): boolean {
  return !readiness.blockers.some((b) => b.action?.route === "/app/prepare/fields");
}

/** Mock/demo mode: one help item per placement validation error. */
export function helpItemsFromValidation(errors: PrepValidationIssue[]): HelpItem[] {
  return errors.map((issue) => ({
    id: issue.id,
    stepLabel: stepLabelFor(issue.stepId),
    message: issue.message,
    action: {
      label: "Fix this",
      route: issue.code === "NO_TITLE" || issue.code === "TITLE_TOO_LONG"
        ? "/app/prepare/upload?highlightField=title"
        : stepRouteFor(issue.stepId),
      ...(issue.participantId ? { participantId: issue.participantId } : {}),
      ...(issue.groupId ? { groupId: issue.groupId } : {}),
    },
  }));
}

/** 0–100 completion, counting the gated steps plus a field-placement unit. */
export function completionPercent(
  stepStates: Record<PreparationStepId, PreparationStepState>,
  fieldsDone: boolean,
): number {
  const doneStepCount = PERCENT_STEP_UNITS.filter(
    (id) => stepStates[id] === "complete" || stepStates[id] === "complete-with-warning",
  ).length;
  const totalUnits = PERCENT_STEP_UNITS.length + 1;
  const doneUnits = doneStepCount + (fieldsDone ? 1 : 0);
  return Math.round((doneUnits / totalUnits) * 100);
}
