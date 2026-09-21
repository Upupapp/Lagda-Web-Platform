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
  it("runs documents → signers → order → settings → fields → authentication → review → authorization", () => {
    expect(PREPARATION_STEPS.map(s => s.id)).toEqual([
      "upload",
      "participants",
      "routing",
      "settings",
      "fields",
      "authentication",
      "review",
      "authorization",
    ]);
  });

  it("puts authorization last", () => {
    // Stated separately from the full order above, because THIS is the
    // requirement and that is merely one arrangement satisfying it.
    //
    // Authorization releases the document to real people. Nothing may come
    // after the step that does the sending — a step placed later would be one
    // a sender reaches only after the emails have already gone.
    const last = PREPARATION_STEPS[PREPARATION_STEPS.length - 1];
    expect(last?.id).toBe("authorization");
  });

  it("puts review immediately before authorization", () => {
    // The last thing you do before releasing is look at what you are
    // releasing. If something is ever inserted between them, that check stops
    // being the last one.
    const ids = PREPARATION_STEPS.map(s => s.id);
    expect(ids[ids.length - 2]).toBe("review");
  });

  it("gives every step an icon and a blurb for its card", () => {
    // The stepper renders cards, and a card with no face or no explanation is
    // a worse affordance than the row it replaced.
    for (const step of PREPARATION_STEPS) {
      expect(step.icon.length, `${step.id} icon`).toBeGreaterThan(0);
      expect(step.blurb.length, `${step.id} blurb`).toBeGreaterThan(0);
    }
  });

  it("gives every step a distinct route", () => {
    const routes = PREPARATION_STEPS.map(s => s.route);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
