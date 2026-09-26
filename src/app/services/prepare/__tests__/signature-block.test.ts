import { describe, it, expect } from "vitest";
import { isBackendFieldType, placeableFieldTypeGroups } from "../field-sync";
import { preferredAssignee } from "../field-autofix";
import {
  FIELD_ELIGIBLE_ROLES, FIELD_SIZE_CONSTRAINTS, FIELD_TYPE_GROUPS, FIELD_TYPE_LABELS,
} from "../../../models/field-editor";

describe("Signature over Name in Place Fields", () => {
  it("is offered on the live system, beside the signature", () => {
    expect(isBackendFieldType("signature-block")).toBe(true);
    const identity = placeableFieldTypeGroups(FIELD_TYPE_GROUPS, true)
      .find(g => g.label === "Signature & Identity");
    expect(identity?.types).toEqual(expect.arrayContaining(["signature", "signature-block"]));
    expect(FIELD_TYPE_LABELS["signature-block"]).toBe("Signature over Name");
  });

  it("is for signers only", () => {
    expect(FIELD_ELIGIBLE_ROLES["signature-block"]).toEqual(["signer"]);
  });

  it("is tall enough for the mark, the rule and the name", () => {
    const c = FIELD_SIZE_CONSTRAINTS["signature-block"];
    expect(c.defaultHeight).toBeGreaterThan(FIELD_SIZE_CONSTRAINTS.signature.defaultHeight);
    expect(c.minHeight).toBeGreaterThanOrEqual(0.07);
  });

  it("goes to the one signer when there are several eligible roles", () => {
    expect(preferredAssignee("signature-block", [
      { id: "p_sign", role: "signer" }, { id: "p_approve", role: "approver" },
    ])).toBe("p_sign");
  });
});
