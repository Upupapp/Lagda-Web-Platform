import { describe, it, expect } from "vitest";
import {
  sectionKeyForPath, locateWorkspacePath, visibleParts, visibleTabs, workspaceSettingsEntry, WORKSPACE_TABS,
} from "../sections";
import { ROLE_CAPABILITIES } from "../../../../../models/workspace-role-policy";
import type { WorkspaceAccess } from "../../../../../hooks/useWorkspaceAccess";

function accessFor(role: keyof typeof ROLE_CAPABILITIES): WorkspaceAccess {
  const capabilities = ROLE_CAPABILITIES[role];
  return { role, capabilities, roleTitle: null, confirmed: true, can: c => capabilities.includes(c) };
}

describe("workspace parts and tabs", () => {
  it("places every workspace path, including detail pages, in its part and tab", () => {
    expect(locateWorkspacePath("/app/workspace")).toEqual({ part: "overview", tab: null, detail: false });
    expect(locateWorkspacePath("/app/workspace/")).toEqual({ part: "overview", tab: null, detail: false });
    expect(locateWorkspacePath("/app/workspace/people")).toEqual({ part: "people", tab: null, detail: false });
    // The old People and Organisation paths redirect to People & Teams.
    for (const old of ["members", "members/m_1", "teams", "teams/un_fin", "organization", "invitations", "join-links", "join-requests"]) {
      expect(locateWorkspacePath(`/app/workspace/${old}`).part, old).toBe("people");
    }
    // Roles moved behind the gear.
    expect(locateWorkspacePath("/app/workspace/settings/roles")).toEqual({ part: "settings", tab: "roles", detail: false });
    expect(locateWorkspacePath("/app/workspace/settings/roles/sender")).toEqual({ part: "settings", tab: "roles", detail: true });
    expect(locateWorkspacePath("/app/workspace/activity")).toEqual({ part: "activity", tab: null, detail: false });
    expect(locateWorkspacePath("/app/workspace/settings")).toEqual({ part: "settings", tab: "general", detail: false });
    expect(locateWorkspacePath("/app/workspace/settings/billing/invoices/INV-1")).toEqual({ part: "settings", tab: "billing", detail: true });
    expect(locateWorkspacePath("/app/workspace/nope").part).toBeNull();
    expect(locateWorkspacePath("/app/workspaces").part).toBeNull();
    expect(locateWorkspacePath("/app/settings").part).toBeNull();
  });

  it("gives each page a stable key for re-reading the counts", () => {
    expect(sectionKeyForPath("/app/workspace")).toBe("overview");
    expect(sectionKeyForPath("/app/workspace/people")).toBe("people");
    expect(sectionKeyForPath("/app/workspace/activity")).toBe("activity");
    expect(sectionKeyForPath("/app/settings")).toBeNull();
  });

  it("every tab path is the tab's own route", () => {
    for (const t of WORKSPACE_TABS) expect(locateWorkspacePath(t.path).tab).toBe(t.key);
  });

  it("gates parts and tabs by capability, and always keeps the current one", () => {
    const parts = (role: keyof typeof ROLE_CAPABILITIES, path = "/app/workspace") =>
      visibleParts(accessFor(role), locateWorkspacePath(path)).map(p => `${p.key}:${p.tabs.map(t => t.key).join(",")}`);
    expect(parts("owner")).toEqual(["overview:", "people:", "activity:"]);
    // A New Comer sees the teams (read-only); no activity log.
    expect(parts("member")).toEqual(["overview:", "people:"]);
    expect(parts("auditor")).toContain("activity:");
    expect(parts("reviewer")).toEqual(["overview:"]);
    expect(parts("reviewer", "/app/workspace/people")).toContain("people:");
  });

  it("puts Roles & permissions behind the gear, after Usage", () => {
    expect(visibleTabs("settings", accessFor("owner"), null).map(t => t.key)).toContain("roles");
    expect(visibleTabs("settings", accessFor("member"), null).map(t => t.key)).toContain("roles");
  });

  it("opens the gear on General for those who may change it, otherwise on Branding", () => {
    expect(workspaceSettingsEntry(accessFor("owner"))).toBe("/app/workspace/settings");
    expect(workspaceSettingsEntry(accessFor("member"))).toBe("/app/workspace/settings/branding");
    expect(visibleTabs("settings", accessFor("owner"), null).map(t => t.key).slice(0, 4))
      .toEqual(["general", "branding", "billing", "usage"]);
    expect(visibleTabs("settings", accessFor("member"), "general").map(t => t.key)).toContain("general");
  });
});
