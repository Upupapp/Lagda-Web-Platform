// When Continue at the foot of a preparation step is held back.
//
// Three rules, in one place so they can be tested without the whole layout:
//   - the step the sender is on has an unresolved error;
//   - the next step is Place Fields and the document is not ready for it;
//   - the sender is on Review and the document as a whole is not ready.
// The last one used to live on Review's own "Continue to Authorization"
// button. That button is gone, so the footer must hold the rule, or a
// document with something missing could reach Authorization.

import type { PreparationStepId } from "../../../models/prepare";

export function isContinueBlocked(input: {
  readonly activeStepId: PreparationStepId | null;
  readonly nextId: PreparationStepId | null;
  /** The step each outstanding error belongs to. */
  readonly errorStepIds: readonly (PreparationStepId | null | undefined)[];
  readonly fieldsBlocked: boolean;
  readonly readyForFieldPlacement: boolean;
}): boolean {
  const { activeStepId, nextId, errorStepIds, fieldsBlocked, readyForFieldPlacement } = input;
  if (activeStepId !== null && errorStepIds.some(id => id === activeStepId)) return true;
  if (nextId === "fields" && fieldsBlocked) return true;
  if (activeStepId === "review" && !readyForFieldPlacement) return true;
  return false;
}
