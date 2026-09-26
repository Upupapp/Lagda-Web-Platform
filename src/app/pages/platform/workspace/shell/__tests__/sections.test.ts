import { describe, it, expect } from "vitest";
import { sectionKeyForPath, isSectionDetailPath, visibleSections, WORKSPACE_SECTIONS } from "../sections";
import { ROLE_CAPABILITIES } from "../../../../../models/workspace-role-policy";
import type { WorkspaceAccess } from "../../../../../hooks/useWorkspaceAccess";

function accessFor(role: keyof typeof ROLE_CAPABILITIES): WorkspaceAccess {
  const capabilities = ROLE_CAPABILITIES[role];
  return { role, capabilities, roleTitle: null, confirmed: true, can: c => capabilities.includes(c) };
}

describe("workspace sections", () => {
  it("maps every Manage path, including detail pages, to its section", () => {
    expect(sectionKeyForPath("/app/workspace")).toBe("overview");
    expect(sectionKeyForPath("/app/workspace/")).toBe("overview");
    expect(sectionKeyForPath("/app/workspace/members")).toBe("members");
    expect(sectionKeyForPath("/app/workspace/members/m_1")).toBe("members");
    expect(sectionKeyForPath("/app/workspace/teams/un_fin")).toBe("teams");
    expect(sectionKeyForPath("/app/workspace/roles/sender")).toBe("roles");
    expect(sectionKeyForPath("/app/workspace/join-requests")).toBe("join-requests");
    expect(sectionKeyForPath("/app/workspace/nope")).toBeNull();
    expect(sectionKeyForPath("/app/workspaces")).toBeNull();
    expect(sectionKeyForPath("/app/settings")).toBeNull();
  });

  it("tells a detail page from a section page", () => {
    expect(isSectionDetailPath("/app/workspace")).toBe(false);
    expect(isSectionDetailPath("/app/workspace/teams")).toBe(false);
    expect(isSectionDetailPath("/app/workspace/teams/un_fin")).toBe(true);
  });

  it("every section path is the section's own route", () => {
    for (const s of WORKSPACE_SECTIONS) expect(sectionKeyForPath(s.path)).toBe(s.key);
  });

  it("gates banners by capability and always keeps the current section", () => {
    const keys = (role: keyof typeof ROLE_CAPABILITIES, current: Parameters<typeof visibleSections>[1] = "overview") =>
      visibleSections(accessFor(role), current).map(s => s.key);
    expect(keys("owner")).toEqual(WORKSPACE_SECTIONS.map(s => s.key));
    expect(keys("member")).toEqual(["overview", "teams", "roles"]);
    expect(keys("auditor")).toEqual(["overview", "roles", "activity"]);
    expect(keys("sender", "settings")).toContain("settings");
    expect(keys("sender")).not.toContain("settings");
  });
});
