// The prepare flow's step order.
//
// This pins the exact bug that shipped: STEP_ORDER was a second,
// hand-written copy of PREPARATION_STEPS' order that drifted from it —
// authentication sat right after routing instead of after fields, and
// "authorization" was missing from the list entirely, so Continue from
// Fields had no next step and Authorization was unreachable through the
// button meant to lead to it.
//
// STEP_ORDER is now DERIVED from PREPARATION_STEPS rather than duplicated,
// so these tests are really pinning PREPARATION_STEPS' order — which is the
// point: there is now exactly one place this can go wrong.

import { describe, it, expect } from "vitest";
import { PREPARATION_STEPS, type PreparationStepId } from "../../../../models/prepare";
import { STEP_ORDER, nextStep, prevStep } from "../PrepareLayout";

describe("the prepare flow's step order", () => {
  it("is exactly PREPARATION_STEPS's own order — the same array, not a copy of it", () => {
    expect(STEP_ORDER).toEqual(PREPARATION_STEPS.map(step => step.id));
  });

  it("is the 8 steps the product defines, in the stated sequence", () => {
    expect(STEP_ORDER).toEqual<readonly PreparationStepId[]>([
      "upload", "participants", "routing", "settings",
      "fields", "authentication", "review", "authorization",
    ]);
  });

  it("walks from Documents to Authorization with no repeats and no skips", () => {
    const visited: PreparationStepId[] = ["upload"];
    let current: PreparationStepId | null = "upload";
    for (let i = 0; i < STEP_ORDER.length; i++) {
      current = nextStep(current);
      if (current === null) break;
      visited.push(current);
    }
    expect(visited).toEqual(STEP_ORDER);
    // The whole point of the bug: Continue must actually reach it.
    expect(visited).toContain("authorization");
  });

  it("has no next step after Authorization — it is the end of the flow", () => {
    expect(nextStep("authorization")).toBeNull();
  });

  it("has no previous step before Documents — it is the start", () => {
    expect(prevStep("upload")).toBeNull();
  });

  it("Continue from Order goes to Settings, not Authentication", () => {
    // The exact wrong hop the bug produced.
    expect(nextStep("routing")).toBe("settings");
  });

  it("Continue from Fields goes to Authentication, matching the step it owns directly", () => {
    expect(nextStep("fields")).toBe("authentication");
  });

  it("walking backward from Authorization retraces the same path in reverse", () => {
    const forward: PreparationStepId[] = [];
    let current: PreparationStepId | null = "upload";
    while (current !== null) { forward.push(current); current = nextStep(current); }

    const backward: PreparationStepId[] = [];
    current = "authorization";
    while (current !== null) { backward.push(current); current = prevStep(current); }

    expect(backward).toEqual([...forward].reverse());
  });
});
