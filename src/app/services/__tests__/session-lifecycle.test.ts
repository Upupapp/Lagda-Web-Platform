// The session cleanup registry.
//
// This replaced eight direct service imports in PlatformContext. Those imports
// were the thing guaranteeing that signing out cleared every feature's session
// state; the guarantee now rests on each service registering itself. That is a
// privacy-critical inversion, so it is tested from both ends: the mechanism
// itself, and the fact that the real services actually register.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerSessionCleanup,
  runSignOutCleanup,
  runWorkspaceSwitchCleanup,
  __resetSessionCleanupRegistry,
  __registeredCleanupIds,
} from "../session-lifecycle";

// Captured at module scope, BEFORE any test resets the registry.
// `src/test/setup.ts` imports all eight services through `reset-services.ts`, so
// by the time this file is evaluated they have already registered. The mechanism
// tests below clear the registry, which would otherwise destroy the very state
// the second describe needs — and a dynamic re-import would not restore it,
// because a cache hit does not re-run a module body.
const REAL_IDS = __registeredCleanupIds().sort();
const REAL_RUN_ERROR = (() => {
  try {
    runSignOutCleanup();
    runWorkspaceSwitchCleanup("ws_mls_001");
    return null;
  } catch (error) {
    return error;
  }
})();

describe("session cleanup registry", () => {
  beforeEach(() => __resetSessionCleanupRegistry());

  it("runs every registered sign-out handler", () => {
    const a = vi.fn();
    const b = vi.fn();
    registerSessionCleanup({ id: "a", onSignOut: a });
    registerSessionCleanup({ id: "b", onSignOut: b });

    runSignOutCleanup();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("passes the entered workspace to every switch handler", () => {
    const seen: string[] = [];
    registerSessionCleanup({ id: "a", onWorkspaceSwitch: (id) => seen.push(`a:${id}`) });
    registerSessionCleanup({ id: "b", onWorkspaceSwitch: (id) => seen.push(`b:${id}`) });

    runWorkspaceSwitchCleanup("ws_mls_001");

    expect(seen).toEqual(["a:ws_mls_001", "b:ws_mls_001"]);
  });

  it("does not call a sign-out handler on a workspace switch, or the reverse", () => {
    const onSignOut = vi.fn();
    const onWorkspaceSwitch = vi.fn();
    registerSessionCleanup({ id: "a", onSignOut, onWorkspaceSwitch });

    runWorkspaceSwitchCleanup("ws_1");
    expect(onSignOut).not.toHaveBeenCalled();
    expect(onWorkspaceSwitch).toHaveBeenCalledTimes(1);

    runSignOutCleanup();
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onWorkspaceSwitch).toHaveBeenCalledTimes(1);
  });

  it("still runs the remaining handlers when one throws", () => {
    // The whole point. A half-cleared session leaks one feature's data into the
    // next account, which is worse than the original failure.
    const before = vi.fn();
    const after = vi.fn();
    registerSessionCleanup({ id: "before", onSignOut: before });
    registerSessionCleanup({ id: "boom", onSignOut: () => { throw new Error("nope"); } });
    registerSessionCleanup({ id: "after", onSignOut: after });

    expect(() => runSignOutCleanup()).toThrow(/1 sign-out cleanup handler\(s\) failed: boom/);
    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("replaces a re-registered id rather than stacking a duplicate", () => {
    const first = vi.fn();
    const second = vi.fn();
    registerSessionCleanup({ id: "same", onSignOut: first });
    registerSessionCleanup({ id: "same", onSignOut: second });

    runSignOutCleanup();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(__registeredCleanupIds()).toEqual(["same"]);
  });

  it("is a no-op when nothing has registered", () => {
    expect(() => runSignOutCleanup()).not.toThrow();
    expect(() => runWorkspaceSwitchCleanup("ws_1")).not.toThrow();
  });
});

describe("the real services register themselves", () => {
  it("every feature holding session state is registered once its module loads", () => {
    // If a service ever holds session state without registering, sign-out
    // silently stops clearing it and nothing else in the codebase would notice.
    expect(REAL_IDS).toEqual([
      "bulk-send",
      "contacts",
      "document-collaboration",
      "document-organization",
      "global-search",
      "notification-center",
      "signing-workflow",
      "workflow-automation",
    ]);
  });

  it("runs the real handlers without throwing", () => {
    // Catches a registration wired to a method that does not exist — a mistake
    // the type-checker cannot see through the optional call in the registry.
    expect(REAL_RUN_ERROR).toBeNull();
  });
});
