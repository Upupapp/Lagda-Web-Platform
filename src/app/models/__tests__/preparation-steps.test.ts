// The order of preparation, pinned.
//
// Nothing else in the suite asserted this, so moving Authentication from
// fourth to last changed the product's flow and every one of 1015 tests still
// passed. The order is a product decision — Authentication asks how signers
// prove who they are, which cannot be answered before the signers exist — and
// a decision nothing checks is one that drifts back silently.

import { describe, it, expect } from "vitest";
import { PREPARATION_STEPS } from "../prepare";

describe("PREPARATION_STEPS", () => {
  it("runs documents → participants → routing → settings → fields → review → authentication", () => {
    expect(PREPARATION_STEPS.map(s => s.id)).toEqual([
      "upload",
      "participants",
      "routing",
      "settings",
      "fields",
      "review",
      "authentication",
    ]);
  });

  it("puts authentication last", () => {
    // Stated separately from the full order above, because THIS is the
    // requirement and that is merely one arrangement satisfying it. If the
    // middle is rearranged later, this should still hold.
    const last = PREPARATION_STEPS[PREPARATION_STEPS.length - 1];
    expect(last?.id).toBe("authentication");
  });

  it("gives every step a distinct route", () => {
    const routes = PREPARATION_STEPS.map(s => s.route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
