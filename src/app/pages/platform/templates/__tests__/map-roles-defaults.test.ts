import { describe, it, expect } from "vitest";
import {
  mapRolesOrganization, withMapRolesDefaults, DEFAULT_WORKSPACE_ORGANIZATION, MAP_ROLES_AUTH_METHOD,
} from "../map-roles-defaults";
import type { TemplateRoleMapping } from "../../../../models/templates";

const mapping = (over: Partial<TemplateRoleMapping> = {}): TemplateRoleMapping => ({
  placeholderId: "ph_1", placeholderLabel: "Candidate", role: "signer", required: true,
  displayName: "Maria Santos", email: "maria@example.com", organization: "Typed Corp",
  authMethod: "email-otp", ...over,
});

describe("Map Roles organization", () => {
  it("is the sender's workspace name", () => {
    expect(mapRolesOrganization("  Acme Holdings ")).toBe("Acme Holdings");
  });

  it.each([undefined, null, "", "   "])("falls back to Default Workspace for %p", name => {
    expect(mapRolesOrganization(name)).toBe(DEFAULT_WORKSPACE_ORGANIZATION);
  });
});

describe("withMapRolesDefaults", () => {
  it("overrides whatever the mapping carried with the workspace and the invitation link", () => {
    const [out] = withMapRolesDefaults([mapping()], "Acme Holdings");
    expect(out).toMatchObject({ organization: "Acme Holdings", authMethod: MAP_ROLES_AUTH_METHOD });
    expect(MAP_ROLES_AUTH_METHOD).toBe("none");
  });

  it("leaves names and emails untouched", () => {
    const [out] = withMapRolesDefaults([mapping()], undefined);
    expect(out).toMatchObject({
      displayName: "Maria Santos", email: "maria@example.com", organization: DEFAULT_WORKSPACE_ORGANIZATION,
    });
  });
});
