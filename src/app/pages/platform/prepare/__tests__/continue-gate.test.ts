// Continue at the foot of a preparation step: when it is held back.

import { describe, it, expect } from "vitest";
import { isContinueBlocked } from "../continue-gate";

const base = { activeStepId: "settings", nextId: "fields", errorStepIds: [], fieldsBlocked: false, readyForFieldPlacement: true } as const;

describe("isContinueBlocked", () => {
  it("lets the sender on when nothing is outstanding", () => {
    expect(isContinueBlocked(base)).toBe(false);
  });

  it("holds back a step that has its own unresolved error", () => {
    expect(isContinueBlocked({ ...base, activeStepId: "upload", nextId: "participants", errorStepIds: ["upload"] })).toBe(true);
  });

  it("does not hold back a step for another step's error", () => {
    expect(isContinueBlocked({ ...base, activeStepId: "routing", nextId: "settings", errorStepIds: ["upload"], readyForFieldPlacement: false })).toBe(false);
  });

  it("holds back the way into Place Fields while the document is not ready for it", () => {
    expect(isContinueBlocked({ ...base, fieldsBlocked: true })).toBe(true);
  });

  it("holds back Review while the document as a whole is not ready", () => {
    // The rule Review's own button used to hold: an error on an earlier step
    // must not reach Authorization.
    expect(isContinueBlocked({ activeStepId: "review", nextId: "authorization", errorStepIds: ["participants"], fieldsBlocked: false, readyForFieldPlacement: false })).toBe(true);
  });

  it("lets Review on to Authorization once the document is ready", () => {
    expect(isContinueBlocked({ activeStepId: "review", nextId: "authorization", errorStepIds: [], fieldsBlocked: false, readyForFieldPlacement: true })).toBe(false);
  });
});
