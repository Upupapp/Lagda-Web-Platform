// Pure-logic coverage for the PreparationHelpFab panel — item mapping,
// completion percentage, and step-label resolution (extracted into
// ../preparation-help so they are unit-testable without rendering the FAB).

import { describe, it, expect } from "vitest";
import {
  stepRouteFor,
  stepLabelFor,
  stepLabelFromRoute,
  helpItemsFromReadiness,
  fieldsDoneFromReadiness,
  helpItemsFromValidation,
  completionPercent,
  PERCENT_STEP_UNITS,
} from "../preparation-help";
import type { SendReadinessResult } from "../../../services/prepare/send-readiness";
import type { PreparationStepId, PreparationStepState, PrepValidationIssue } from "../../../models/prepare";

describe("step label / route helpers", () => {
  it("resolves a known step's route and label", () => {
    expect(stepRouteFor("participants")).toBe("/app/prepare/participants");
    expect(stepLabelFor("participants")).toBe("Participants");
  });
  it("labels a route by its prefix", () => {
    expect(stepLabelFromRoute("/app/prepare/fields?showValidation=1")).toBe("Place Fields");
  });
  it("falls back to 'Preparation' for an unknown route", () => {
    expect(stepLabelFromRoute("/somewhere/else")).toBe("Preparation");
  });
});

describe("helpItemsFromReadiness", () => {
  it("maps each blocker to an item, keeping its action", () => {
    const readiness: SendReadinessResult = {
      ready: false,
      blockers: [
        { message: "no docs", action: { label: "Go to Upload", route: "/app/prepare/upload" } },
        { message: "architectural gap" }, // action-less
      ],
    };
    const items = helpItemsFromReadiness(readiness);
    expect(items).toHaveLength(2);
    expect(items[0]!.stepLabel).toBe("Documents");
    expect(items[0]!.action.route).toBe("/app/prepare/upload");
    // action-less blocker gets a safe default action + "Preparation" label
    expect(items[1]!.stepLabel).toBe("Preparation");
    expect(items[1]!.action.route).toBe("/app/prepare/review");
  });
});

describe("fieldsDoneFromReadiness", () => {
  it("is false while a blocker points at the fields step", () => {
    const r: SendReadinessResult = { ready: false, blockers: [{ message: "x", action: { label: "y", route: "/app/prepare/fields" } }] };
    expect(fieldsDoneFromReadiness(r)).toBe(false);
  });
  it("is true when no blocker points at the fields step", () => {
    const r: SendReadinessResult = { ready: false, blockers: [{ message: "x", action: { label: "y", route: "/app/prepare/upload" } }] };
    expect(fieldsDoneFromReadiness(r)).toBe(true);
  });
});

describe("helpItemsFromValidation", () => {
  const issue = (over: Partial<PrepValidationIssue>): PrepValidationIssue => ({
    id: "vi_1", stepId: "participants", severity: "error", code: "X", message: "m", ...over,
  });

  it("routes a normal issue to its step", () => {
    const [item] = helpItemsFromValidation([issue({ stepId: "routing" })]);
    expect(item!.action.route).toBe("/app/prepare/routing");
    expect(item!.action.label).toBe("Fix this");
  });
  it("routes a title issue to the highlighted title field", () => {
    const [item] = helpItemsFromValidation([issue({ stepId: "upload", code: "NO_TITLE" })]);
    expect(item!.action.route).toBe("/app/prepare/upload?highlightField=title");
  });
  it("carries participantId and groupId into the action when present", () => {
    const [item] = helpItemsFromValidation([issue({ participantId: "pax_1", groupId: "grp_1" })]);
    expect(item!.action.participantId).toBe("pax_1");
    expect(item!.action.groupId).toBe("grp_1");
  });
});

describe("completionPercent", () => {
  const allState = (s: PreparationStepState): Record<PreparationStepId, PreparationStepState> => ({
    upload: s, participants: s, routing: s, authentication: s, settings: s, review: s, fields: s,
  });

  it("is 0 when nothing is complete and fields aren't done", () => {
    expect(completionPercent(allState("available"), false)).toBe(0);
  });
  it("counts the field-placement unit on top of the gated steps", () => {
    // all 6 step-units complete + fields done = 7/7 = 100
    expect(completionPercent(allState("complete"), true)).toBe(100);
  });
  it("treats complete-with-warning as done", () => {
    // 6/7 complete steps, fields not done → round(6/7*100) = 86
    expect(completionPercent(allState("complete-with-warning"), false)).toBe(86);
  });
  it("counts only the fields unit when steps are incomplete", () => {
    expect(completionPercent(allState("available"), true)).toBe(Math.round((1 / (PERCENT_STEP_UNITS.length + 1)) * 100));
  });
});
