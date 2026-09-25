// Pure-logic coverage for the Fields-page auto-fix decisions and the
// real-backend field-issue list (extracted from FieldsPage's component
// closures into ../prepare/field-autofix so they are unit-testable).

import { describe, it, expect } from "vitest";
import {
  clampRectOntoPage,
  pushInsideSafeMargin,
  nudgeOffOverlap,
  eligibleParticipants,
  resolveAssignment,
  resolveAssignmentFor,
  computeBackendFieldIssues,
  preferredAssignee,
} from "../prepare/field-autofix";
import { SAFE_MARGIN } from "../../models/field-editor";
import type { FieldDefinition } from "../../models/field-editor";
import type { PrepParticipant } from "../../models/prepare";

const rect = (over: Partial<{ x: number; y: number; width: number; height: number }> = {}) => ({
  x: 0.4, y: 0.4, width: 0.2, height: 0.05, ...over,
});

function makeField(over: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    id: "bf_1", type: "signature", documentId: "d1", pageId: "p1",
    rect: rect(), participantId: "rcp_1", label: "Signature",
    required: true, layer: 1, demonstrationOnly: false, ...over,
  };
}

function pax(id: string, role: PrepParticipant["role"]): PrepParticipant {
  return { id, name: id, email: `${id}@x.com`, role, organization: "", isRequired: true, routingGroupId: null, authMethodOverride: null };
}

describe("clampRectOntoPage", () => {
  it("leaves an in-bounds rect unchanged", () => {
    expect(clampRectOntoPage(rect())).toEqual(rect());
  });
  it("pulls a rect back when it overflows the right/bottom", () => {
    const r = clampRectOntoPage(rect({ x: 0.95, y: 0.98, width: 0.2, height: 0.05 }));
    expect(r.x + r.width).toBeLessThanOrEqual(1);
    expect(r.y + r.height).toBeLessThanOrEqual(1);
  });
  it("pulls a rect back from negative coordinates", () => {
    const r = clampRectOntoPage(rect({ x: -0.3, y: -0.1 }));
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });
  it("caps oversized dimensions at the page size", () => {
    const r = clampRectOntoPage(rect({ x: 0, y: 0, width: 2, height: 3 }));
    expect(r.width).toBe(1);
    expect(r.height).toBe(1);
  });
});

describe("pushInsideSafeMargin", () => {
  it("moves a near-edge rect inside the safe margin", () => {
    const r = pushInsideSafeMargin(rect({ x: 0, y: 0 }));
    expect(r.x).toBeGreaterThanOrEqual(SAFE_MARGIN);
    expect(r.y).toBeGreaterThanOrEqual(SAFE_MARGIN);
  });
  it("pulls a rect off the far edge back inside the margin", () => {
    const r = pushInsideSafeMargin(rect({ x: 0.99, y: 0.99, width: 0.05, height: 0.05 }));
    expect(r.x + r.width).toBeLessThanOrEqual(1 - SAFE_MARGIN + 1e-9);
  });
});

describe("nudgeOffOverlap", () => {
  it("nudges a mid-page field downward", () => {
    const r = nudgeOffOverlap(rect({ y: 0.4 }));
    expect(r.y).toBeCloseTo(0.47, 5);
  });
  it("nudges upward instead when moving down would overflow", () => {
    const r = nudgeOffOverlap(rect({ y: 0.97, height: 0.05 }));
    expect(r.y).toBeLessThan(0.97);
  });
});

describe("eligibleParticipants / resolveAssignment", () => {
  const signer = pax("rcp_s", "signer");
  const viewer = pax("rcp_v", "viewer");

  it("filters to role-eligible participants for the field type", () => {
    const eligible = eligibleParticipants("signature", [signer, viewer]);
    expect(eligible.map((p) => p.id)).toEqual(["rcp_s"]);
  });
  it("assigns to the sole eligible participant", () => {
    expect(resolveAssignment("signature", [signer, viewer])).toBe("rcp_s");
  });
  it("returns null when there is no eligible participant", () => {
    expect(resolveAssignment("signature", [viewer])).toBeNull();
  });
  it("returns null (never guesses) when several are eligible", () => {
    expect(resolveAssignment("signature", [pax("rcp_a", "signer"), pax("rcp_b", "signer")])).toBeNull();
  });
  it("resolveAssignmentFor accepts full participant records", () => {
    expect(resolveAssignmentFor("signature", [signer, viewer])).toBe("rcp_s");
  });
});

describe("computeBackendFieldIssues", () => {
  it("returns no issues for saved, supported fields", () => {
    expect(computeBackendFieldIssues([makeField()])).toEqual([]);
  });
  it("flags an unsupported field type", () => {
    const issues = computeBackendFieldIssues([makeField({ id: "bf_x", type: "multiline-text" })]);
    expect(issues.some((i) => i.code === "UNSUPPORTED_BACKEND_TYPE" && i.fieldId === "bf_x")).toBe(true);
  });
  it("flags locally-unsaved fields (id without bf_ prefix)", () => {
    const issues = computeBackendFieldIssues([makeField({ id: "local_1" })]);
    expect(issues.some((i) => i.code === "UNSAVED_EDITS")).toBe(true);
  });
  it("reports both an unsupported type and unsaved edits together", () => {
    const issues = computeBackendFieldIssues([makeField({ id: "local_ml", type: "radio-group" })]);
    expect(issues.map((i) => i.code).sort()).toEqual(["UNSAVED_EDITS", "UNSUPPORTED_BACKEND_TYPE"]);
  });
});

// ── Approvers and reviewers may hold a signature ───────────────────────────
describe("preferredAssignee", () => {
  const signer   = { id: "p_signer", role: "signer" as const };
  const approver = { id: "p_approver", role: "approver" as const };
  const reviewer = { id: "p_reviewer", role: "reviewer" as const };

  it("still gives a signature to the only signer when an approver is also present", () => {
    // The everyday document. Allowing approvers a signature must not stop it
    // auto-assigning the way it always has.
    expect(preferredAssignee("signature", [signer, approver])).toBe("p_signer");
  });

  it("gives a signature to the only approver when there is no signer", () => {
    expect(preferredAssignee("signature", [approver])).toBe("p_approver");
  });

  it("does not guess between two signers", () => {
    expect(preferredAssignee("signature", [signer, { id: "p_s2", role: "signer" as const }, approver])).toBeNull();
  });

  it("leaves a non-signature field ambiguous when several may hold it", () => {
    expect(preferredAssignee("checkbox", [signer, reviewer])).toBeNull();
  });
});
