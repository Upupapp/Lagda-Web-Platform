// The live Place Fields palette offers only types the server can store.

import { describe, it, expect } from "vitest";
import { placeableFieldTypeGroups, isBackendFieldType } from "../prepare/field-sync";
import { FIELD_TYPE_GROUPS } from "../../models/field-editor";

describe("placeableFieldTypeGroups", () => {
  it("drops the unsaveable types on the live system", () => {
    const types = placeableFieldTypeGroups(FIELD_TYPE_GROUPS, true).flatMap(g => g.types);
    expect(types).not.toContain("multiline-text");
    expect(types).not.toContain("radio-group");
    expect(types).not.toContain("acknowledgment");
    expect(types.every(isBackendFieldType)).toBe(true);
    expect(types).toContain("signature");
  });

  it("never leaves an empty group", () => {
    for (const g of placeableFieldTypeGroups(FIELD_TYPE_GROUPS, true)) {
      expect(g.types.length).toBeGreaterThan(0);
    }
  });

  it("keeps every type in the demo", () => {
    expect(placeableFieldTypeGroups(FIELD_TYPE_GROUPS, false)).toEqual(FIELD_TYPE_GROUPS);
  });
});
