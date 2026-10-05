import { describe, it, expect } from "vitest";
import { withMapRolesDefaults, MAP_ROLES_AUTH_METHOD } from "../map-roles-defaults";
import type { TemplateRoleMapping } from "../../../../models/templates";

const mapping = (over: Partial<TemplateRoleMapping> = {}): TemplateRoleMapping => ({
  placeholderId: "ph_1", placeholderLabel: "Candidate", role: "signer", required: true,
  displayName: "Maria Santos", email: "maria@example.com", organization: "",
  authMethod: "email-otp", ...over,
});

describe("withMapRolesDefaults", () => {
  it("fixes the recipient check to the invitation link", () => {
    const [out] = withMapRolesDefaults([mapping()]);
    expect(out).toMatchObject({ authMethod: MAP_ROLES_AUTH_METHOD });
    expect(MAP_ROLES_AUTH_METHOD).toBe("none");
  });

  it("does not stamp the sender's workspace on a participant as their organization", () => {
    const [blank] = withMapRolesDefaults([mapping()]);
    expect(blank?.organization).toBe("");
    const [typed] = withMapRolesDefaults([mapping({ organization: "Other Side Inc." })]);
    expect(typed?.organization).toBe("Other Side Inc.");
  });

  it("leaves names and emails untouched", () => {
    const [out] = withMapRolesDefaults([mapping()]);
    expect(out).toMatchObject({ displayName: "Maria Santos", email: "maria@example.com" });
  });
});
