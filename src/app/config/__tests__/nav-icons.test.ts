// Navigation icon coverage.
//
// Both nav renderers key a lucide component off the `icon` string on each nav
// item, and both FAIL SOFT when the name is absent — the sidebar renders an
// empty spacer, MobileNav renders nothing at all. So a nav item with an
// unmapped icon looks like a spacing bug, on one breakpoint, and never throws.
//
// This has now happened three times: Inbox was missing from the sidebar map
// (C27), Inbox and HelpCircle were missing from MobileNav's map for longer than
// that, and Workflow's GitBranch was missing from both when the item was added.
// The maps live in two files and are edited independently, which is exactly the
// shape of problem a test should hold rather than a reviewer.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PRIMARY_NAV, UTILITY_NAV } from "../platform.nav";

const ROOT = resolve(__dirname, "../../../..");

/**
 * Reads the ICON_MAP keys straight out of the source.
 *
 * Importing the components instead would drag the whole platform shell into
 * this test for two string lists, and the map is a plain object literal that a
 * regex reads reliably.
 */
function iconMapKeys(relativePath: string): Set<string> {
  const source = readFileSync(resolve(ROOT, relativePath), "utf8");
  const start = source.indexOf("const ICON_MAP");
  expect(start, `no ICON_MAP in ${relativePath}`).toBeGreaterThan(-1);
  const open = source.indexOf("{", start);
  const close = source.indexOf("};", open);
  const body = source.slice(open + 1, close);
  return new Set(
    body
      .split(",")
      .map(entry => entry.split(":")[0]?.trim() ?? "")
      .filter(name => /^[A-Za-z][A-Za-z0-9]*$/.test(name)),
  );
}

const SIDEBAR = "src/app/components/platform/PlatformSidebar.tsx";
const MOBILE = "src/app/components/platform/MobileNav.tsx";

const ALL_NAV = [...PRIMARY_NAV, ...UTILITY_NAV];

describe("navigation icons", () => {
  it("has navigation items to check", () => {
    // Guards the test itself: an empty nav list would make every assertion
    // below pass vacuously.
    expect(ALL_NAV.length).toBeGreaterThan(5);
  });

  it("resolves every navigation icon in the sidebar map", () => {
    const keys = iconMapKeys(SIDEBAR);
    const missing = ALL_NAV.filter(item => !keys.has(item.icon)).map(i => `${i.id} -> ${i.icon}`);
    expect(missing, "sidebar ICON_MAP is missing these").toEqual([]);
  });

  it("resolves every navigation icon in the mobile map", () => {
    // MobileNav returns null for an unmapped name, so the icon simply is not
    // there — and only on small screens, where it is least likely to be seen.
    const keys = iconMapKeys(MOBILE);
    const missing = ALL_NAV.filter(item => !keys.has(item.icon)).map(i => `${i.id} -> ${i.icon}`);
    expect(missing, "mobile ICON_MAP is missing these").toEqual([]);
  });

  it("keeps the two maps able to render the same navigation", () => {
    const sidebar = iconMapKeys(SIDEBAR);
    const mobile = iconMapKeys(MOBILE);
    const used = new Set(ALL_NAV.map(i => i.icon));
    // Only names actually used by navigation have to match. Either file may
    // carry extra icons for its own chrome without failing this.
    for (const name of used) {
      expect(sidebar.has(name), `sidebar cannot render ${name}`).toBe(true);
      expect(mobile.has(name), `mobile cannot render ${name}`).toBe(true);
    }
  });

  // Workflow is no longer a primary row, and that reverses what this test
  // used to assert. The route still exists and still works; it is reached
  // from Manage as "Signing routes".
  //
  // The reason is naming, not importance. "Workflow" meant three different
  // things at once — reusable routing, one document's signing order, and the
  // automation rules engine — and this section's own second tab was also
  // called "Workflows", so the navigation read "Workflow › Workflows".
  it("does not put Workflow in the primary rail", () => {
    expect(PRIMARY_NAV.find(i => i.id === "workflow")).toBeUndefined();
  });

  // The rail is short enough to read at a glance. Eleven rows was the
  // complaint; this is the number that replaced it, pinned so it cannot creep
  // back one well-meaning addition at a time.
  it("keeps the primary rail short", () => {
    expect(PRIMARY_NAV.length).toBeLessThanOrEqual(7);
  });

  // Manage is the ONLY way into workspace administration from navigation.
  // Before it existed, /app/workspace was linked only from the settings side
  // rail, which is display:none below 1024px — so Members, Teams, Roles and
  // Invitations were unreachable on a phone.
  it("gives workspace administration a navigation entry", () => {
    const manage = UTILITY_NAV.find(i => i.id === "manage");
    expect(manage, "workspace admin must be reachable from navigation").toBeDefined();
    expect(manage?.path).toBe("/app/workspace");
    expect(manage?.showOnMobile).toBe(true);
  });

  // /app/team/* render <PlatformPlaceholder /> and always did.
  it("never points navigation at the team placeholders", () => {
    for (const item of [...PRIMARY_NAV, ...UTILITY_NAV]) {
      expect(item.path.startsWith("/app/team"), `${item.label} -> ${item.path}`).toBe(false);
    }
  });
});
