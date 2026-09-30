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
    expect(locateWorkspacePath("/app/workspace/members")).toEqual({ part: "people", tab: "members", detail: false });
    expect(locateWorkspacePath("/app/workspace/members/m_1")).toEqual({ part: "people", tab: "members", detail: true });
    expect(locateWorkspacePath("/app/workspace/invitations")).toEqual({ part: "people", tab: "invite", detail: false });
    expect(locateWorkspacePath("/app/workspace/join-links")).toEqual({ part: "people", tab: "invite", detail: false });
    expect(locateWorkspacePath("/app/workspace/join-requests")).toEqual({ part: "people", tab: "join-requests", detail: false });
    expect(locateWorkspacePath("/app/workspace/teams/un_fin")).toEqual({ part: "organisation", tab: "teams", detail: true });
    expect(locateWorkspacePath("/app/workspace/organization")).toEqual({ part: "organisation", tab: "organization", detail: false });
    expect(locateWorkspacePath("/app/workspace/roles/sender")).toEqual({ part: "organisation", tab: "roles", detail: true });
    expect(locateWorkspacePath("/app/workspace/activity")).toEqual({ part: "activity", tab: null, detail: false });
    expect(locateWorkspacePath("/app/workspace/settings")).toEqual({ part: "settings", tab: "general", detail: false });
    expect(locateWorkspacePath("/app/workspace/settings/billing/invoices/INV-1")).toEqual({ part: "settings", tab: "billing", detail: true });
    expect(locateWorkspacePath("/app/workspace/nope").part).toBeNull();
    expect(locateWorkspacePath("/app/workspaces").part).toBeNull();
    expect(locateWorkspacePath("/app/settings").part).toBeNull();
  });

  it("gives each page a stable key for re-reading the counts", () => {
    expect(sectionKeyForPath("/app/workspace")).toBe("overview");
    expect(sectionKeyForPath("/app/workspace/members/m_1")).toBe("members");
    expect(sectionKeyForPath("/app/workspace/activity")).toBe("activity");
    expect(sectionKeyForPath("/app/settings")).toBeNull();
  });

  it("every tab path is the tab's own route", () => {
    for (const t of WORKSPACE_TABS) expect(locateWorkspacePath(t.path).tab).toBe(t.key);
  });

  it("gates parts and tabs by capability, and always keeps the current one", () => {
    const parts = (role: keyof typeof ROLE_CAPABILITIES, path = "/app/workspace") =>
      visibleParts(accessFor(role), locateWorkspacePath(path)).map(p => `${p.key}:${p.tabs.map(t => t.key).join(",")}`);
    expect(parts("owner")).toEqual([
      "overview:", "people:members,invite,join-requests", "organisation:teams,organization,roles", "activity:",
    ]);
    expect(parts("member")).toEqual(["overview:", "organisation:teams,organization,roles"]);
    expect(parts("auditor")).toContain("activity:");
    expect(parts("member", "/app/workspace/members")).toContain("people:members");
  });

  it("opens the gear on General for those who may change it, otherwise on Branding", () => {
    expect(workspaceSettingsEntry(accessFor("owner"))).toBe("/app/workspace/settings");
    expect(workspaceSettingsEntry(accessFor("member"))).toBe("/app/workspace/settings/branding");
    expect(visibleTabs("settings", accessFor("owner"), null).map(t => t.key).slice(0, 4))
      .toEqual(["general", "branding", "billing", "usage"]);
    expect(visibleTabs("settings", accessFor("member"), "general").map(t => t.key)).toContain("general");
  });
});
