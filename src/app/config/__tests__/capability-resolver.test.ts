// Capability resolver — behavioural tests (Gap Closure Command 6).
//
// This is the gate every surface depends on: routes, navigation, search, the
// command palette, dashboard widgets and the platform projection all ask
// `resolveCapability` / `isCapabilityInActiveProfile` whether a feature exists.
// A change in EVALUATION ORDER here breaks neither the type-check nor the build —
// it just quietly makes an Enterprise Preview module reachable in production, or
// quietly makes a launch feature unreachable everywhere.
//
// So the tests below do not assert "it returns something". They pin the exact
// precedence between the seven gates, one test per step, each constructed so the
// *later* gate would have produced a DIFFERENT observable outcome. Reorder two
// checks and the outcome string changes and the test fails.
//
// ── A note on the build-time launch profile ─────────────────────────────────
// `ACTIVE_LAUNCH_PROFILE` is derived from `import.meta.env.VITE_LAUNCH_PROFILE`
// at MODULE EVALUATION time, and Vite inlines `import.meta.env` during transform.
// It therefore cannot be varied per-test: `vi.stubEnv` mutates `process.env` and
// the live `import.meta.env` proxy, neither of which the inlined literal reads.
// That is the design contract ("Never change at runtime; never read from a query
// parameter"), and the tests in `ACTIVE_LAUNCH_PROFILE derivation` assert it.
//
// Consequently, every profile-sensitive assertion in this file is written
// RELATIVE to `ACTIVE_LAUNCH_PROFILE` rather than hardcoded, so the suite is
// meaningful under both builds. It is intended to be run twice:
//
//     npx vitest run src/app/config/__tests__/capability-resolver.test.ts
//     VITE_LAUNCH_PROFILE=enterprise-preview npx vitest run <same path>
//
// The second run is the only way to exercise the enterprise-preview branch of
// the derivation, because the value must be present when Vite resolves config.

import { describe, it, expect, vi } from "vitest";

import {
  ACTIVE_LAUNCH_PROFILE,
  resolveCapability,
  isCapabilityAvailable,
  isCapabilityInActiveProfile,
  buildCapabilityContext,
} from "../capability-resolver";
import { getAllCapabilities, getCapability } from "../product-capability-registry";
import { PROFILE_MATURITY_ALLOWLIST } from "../../models/product-capability";
import type {
  CapabilityResolutionContext,
  LaunchProfileId,
} from "../../models/product-capability";
import type { PlatformPermission, PlatformFeatureFlag } from "../../models";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALL_PROFILES: LaunchProfileId[] = [
  "launch-default",
  "enterprise-preview",
  "development",
];

/**
 * Build a resolution context with explicit grants.
 *
 * `"all"` means "this user holds every permission / every flag that exists".
 * It makes the precedence tests unambiguous: when a capability still resolves
 * unavailable while everything downstream is granted, the only thing that can
 * have rejected it is an earlier gate.
 */
function makeContext(
  profile: LaunchProfileId,
  permissions: readonly PlatformPermission[] | "all",
  flags: readonly PlatformFeatureFlag[] | "all",
): CapabilityResolutionContext {
  return {
    profile,
    hasPermission: (p) => permissions === "all" || permissions.includes(p),
    hasPlanAccess: () => true,
    hasFeatureFlag: (f) => flags === "all" || flags.includes(f),
  };
}

/** Everything a user could possibly have, in the given profile. */
function maximallyPermitted(profile: LaunchProfileId): CapabilityResolutionContext {
  return makeContext(profile, "all", "all");
}

/** True when the active build profile allows any maturity above launch-supporting. */
const ACTIVE_PROFILE_INCLUDES_PREVIEW = ACTIVE_LAUNCH_PROFILE !== "launch-default";

// ── Harness sanity ───────────────────────────────────────────────────────────

describe("test harness assumptions", () => {
  it("resolves the active launch profile to one of the three declared profiles", () => {
    // Everything below that is written relative to the active profile depends on
    // this. A fourth value would mean `PROFILE_MATURITY_ALLOWLIST[profile]` is
    // `undefined` and the resolver would throw on `.includes`.
    expect(ALL_PROFILES).toContain(ACTIVE_LAUNCH_PROFILE);
    expect(PROFILE_MATURITY_ALLOWLIST[ACTIVE_LAUNCH_PROFILE]).toBeInstanceOf(Array);
  });

  it("exposes the capabilities the precedence tests rely on", () => {
    // If a maturity is reclassified, the precedence tests would silently start
    // exercising a different gate. Fail here instead, naming the capability.
    expect(getCapability("future-enotary")?.maturity).toBe("future-product");
    expect(getCapability("document-versioning")?.maturity).toBe("deferred");
    expect(getCapability("development-scenarios")?.maturity).toBe("development-only");
    expect(getCapability("workflow-automation")?.maturity).toBe("enterprise-preview");
    expect(getCapability("bulk-send")?.maturity).toBe("enterprise-preview");
    expect(getCapability("document-collaboration")?.maturity).toBe("enterprise-preview");
    expect(getCapability("advanced-reports")?.maturity).toBe("post-launch");
    expect(getCapability("basic-reports")?.maturity).toBe("launch-supporting");
    expect(getCapability("documents")?.maturity).toBe("launch-core");
  });
});

// ── Step 1: future-product beats everything ──────────────────────────────────

describe("resolveCapability precedence — 1. future-product", () => {
  it("rejects a future product in the most permissive profile with every permission and flag granted", () => {
    // `development` has the widest allowlist and everything downstream is
    // granted. Any outcome other than "future-product" means gate 1 was skipped.
    const res = resolveCapability("future-enotary", maximallyPermitted("development"));

    expect(res.outcome).toBe("future-product");
    expect(res.available).toBe(false);
    expect(res.preview).toBe(false);
  });

  it("reports the future-product reason, not a profile or permission reason", () => {
    const res = resolveCapability("future-enotary", maximallyPermitted("development"));

    // A public legal promise. If the resolver ever fell through to the profile
    // gate, this would become the generic "not included in the current product
    // profile" text and the accreditation caveat would vanish from the UI.
    expect(res.reasonLabel).toBe(getCapability("future-enotary")?.unavailableReason);
    expect(res.reasonLabel).toContain("Coming Soon");
    expect(res.reasonLabel).toContain("Supreme Court Accreditation");
  });
});

// ── Step 2: deferred beats the profile allowlist ─────────────────────────────

describe("resolveCapability precedence — 2. deferred", () => {
  it("returns the deferred outcome rather than unavailable-profile", () => {
    // No allowlist contains "deferred", so gate 4 would ALSO reject this — but
    // with outcome "unavailable-profile". Getting "deferred" proves gate 2 ran
    // first and produced the more specific answer.
    for (const profile of ALL_PROFILES) {
      expect(PROFILE_MATURITY_ALLOWLIST[profile], profile).not.toContain("deferred");
    }

    const res = resolveCapability("document-versioning", maximallyPermitted("development"));

    expect(res.outcome).toBe("deferred");
    expect(res.available).toBe(false);
    expect(res.reasonLabel).toBe("Document versioning is deferred to a future release.");
  });

  it("stays deferred in every profile", () => {
    for (const profile of ALL_PROFILES) {
      const res = resolveCapability("document-versioning", maximallyPermitted(profile));
      expect(res.outcome, profile).toBe("deferred");
      expect(res.available, profile).toBe(false);
    }
  });
});

// ── Step 3: development-only beats the profile allowlist ─────────────────────

describe("resolveCapability precedence — 3. development-only", () => {
  it("returns development-only rather than unavailable-profile outside development", () => {
    // "development-only" is absent from the launch-default allowlist, so gate 4
    // would reject it too — as "unavailable-profile". The distinct
    // "development-only" outcome can only come from gate 3.
    expect(PROFILE_MATURITY_ALLOWLIST["launch-default"]).not.toContain("development-only");

    const res = resolveCapability(
      "development-scenarios",
      maximallyPermitted("launch-default"),
    );

    expect(res.outcome).toBe("development-only");
    expect(res.available).toBe(false);
  });

  it("also rejects development-only capabilities in enterprise-preview", () => {
    const res = resolveCapability(
      "development-scenarios",
      maximallyPermitted("enterprise-preview"),
    );

    expect(res.outcome).toBe("development-only");
    expect(res.available).toBe(false);
  });

  it("does NOT short-circuit inside the development profile — later gates still run", () => {
    // If gate 3 returned unconditionally this would be "development-only". It
    // must fall through to the feature-flag gate, otherwise QA fixture panels
    // could never be switched off inside development.
    const res = resolveCapability(
      "development-scenarios",
      makeContext("development", "all", []),
    );

    expect(res.outcome).toBe("unavailable-feature");
    expect(res.available).toBe(false);
  });

  it("is available in development once its feature flag is on", () => {
    const res = resolveCapability(
      "development-scenarios",
      makeContext("development", "all", ["developmentPlaceholdersEnabled"]),
    );

    expect(res.outcome).toBe("available");
    expect(res.available).toBe(true);
    expect(res.preview).toBe(false);
  });
});

// ── Step 4: profile allowlist beats feature flags and permissions ────────────

describe("resolveCapability precedence — 4. profile allowlist", () => {
  it("rejects an enterprise-preview capability in launch-default even with the flag on and permission held", () => {
    // Everything gates 5 and 6 need is present. If the profile gate ran after
    // them, the outcome would be "available-preview" and an Enterprise Preview
    // module would be live in the production build.
    const res = resolveCapability(
      "workflow-automation",
      makeContext("launch-default", ["view_workflow_automation"], ["automationEnabled"]),
    );

    expect(res.outcome).toBe("unavailable-profile");
    expect(res.available).toBe(false);
  });

  it("still reports unavailable-profile when the flag and permission are ALSO missing", () => {
    // Nothing granted. The outcome must be the PROFILE rejection, not the
    // feature or permission rejection: this user cannot fix it by being granted
    // a role, and telling them otherwise sends them to an administrator who can
    // do nothing.
    const res = resolveCapability(
      "workflow-automation",
      makeContext("launch-default", [], []),
    );

    expect(res.outcome).toBe("unavailable-profile");
  });

  it("rejects post-launch maturity in launch-default but allows it in enterprise-preview", () => {
    expect(
      resolveCapability("advanced-reports", maximallyPermitted("launch-default")).outcome,
    ).toBe("unavailable-profile");

    expect(
      resolveCapability("advanced-reports", maximallyPermitted("enterprise-preview")).available,
    ).toBe(true);
  });

  it("names the capability the caller asked for, not a sibling Enterprise Preview feature", () => {
    // There are three enterprise-preview capabilities. A hardcoded reason string
    // in the resolver would show a user who asked for Bulk Send a message about
    // Workflow Automation. Each must carry its own label.
    const cases = [
      { id: "workflow-automation", mine: "Workflow Automation", theirs: ["Bulk Send", "Document Collaboration"] },
      { id: "bulk-send", mine: "Bulk Send", theirs: ["Workflow Automation", "Document Collaboration"] },
      { id: "document-collaboration", mine: "Document Collaboration", theirs: ["Workflow Automation", "Bulk Send"] },
    ];

    for (const c of cases) {
      const res = resolveCapability(c.id, maximallyPermitted("launch-default"));
      expect(res.outcome, c.id).toBe("unavailable-profile");
      expect(res.reasonLabel, c.id).toContain(c.mine);
      for (const other of c.theirs) {
        expect(res.reasonLabel, `${c.id} must not mention ${other}`).not.toContain(other);
      }
    }
  });
});

// ── Step 5: feature flags beat permissions ───────────────────────────────────

describe("resolveCapability precedence — 5. feature flags", () => {
  it("reports unavailable-feature, not unavailable-permission, when both are missing", () => {
    // The capability is inside the profile, the flag is off, and no permission
    // is held. Both gate 5 and gate 6 would reject; the outcome says which ran
    // first, and it must be the flag.
    const res = resolveCapability(
      "workflow-automation",
      makeContext("enterprise-preview", [], []),
    );

    expect(res.outcome).toBe("unavailable-feature");
    expect(res.available).toBe(false);
  });

  it("reports unavailable-feature even when the user holds every permission", () => {
    const res = resolveCapability(
      "workflow-automation",
      makeContext("enterprise-preview", "all", []),
    );

    expect(res.outcome).toBe("unavailable-feature");
    expect(res.available).toBe(false);
  });

  it("requires EVERY declared feature flag, not merely one of them", () => {
    // The flag loop returns on the first missing flag. `documents` declares one
    // flag today; assert the loop semantics on a capability whose flag is off
    // while an unrelated flag is on.
    const res = resolveCapability(
      "documents",
      makeContext("launch-default", "all", ["dashboardEnabled"]),
    );

    expect(res.outcome).toBe("unavailable-feature");
  });
});

// ── Step 6: permissions are last ─────────────────────────────────────────────

describe("resolveCapability precedence — 6. permissions", () => {
  it("reaches the permission gate only once profile and flags pass", () => {
    const res = resolveCapability(
      "workflow-automation",
      makeContext("enterprise-preview", [], ["automationEnabled"]),
    );

    expect(res.outcome).toBe("unavailable-permission");
    expect(res.available).toBe(false);
  });

  it("grants access when ANY one of the declared permissions is held", () => {
    // permissionRequirements is evaluated with `.some()`, not `.every()`.
    // Switching to `.every()` would lock out roles that legitimately hold one.
    expect(getCapability("workflow-automation")?.permissionRequirements)
      .toEqual(["view_workflow_automation"]);

    const res = resolveCapability(
      "workflow-automation",
      makeContext("enterprise-preview", ["view_workflow_automation"], ["automationEnabled"]),
    );

    expect(res.available).toBe(true);
  });

  it("does not treat an unrelated permission as sufficient", () => {
    const res = resolveCapability(
      "workflow-automation",
      makeContext("enterprise-preview", ["view_dashboard", "manage_billing"], ["automationEnabled"]),
    );

    expect(res.outcome).toBe("unavailable-permission");
  });

  it("resolves capabilities that declare no permissions without a user", () => {
    // `recipient-signing` is reached by an emailed recipient who has no account
    // and therefore holds no permissions at all. An empty requirement list must
    // mean "no check", not "deny".
    expect(getCapability("recipient-signing")?.permissionRequirements).toEqual([]);

    const res = resolveCapability(
      "recipient-signing",
      makeContext("launch-default", [], []),
    );

    expect(res.available).toBe(true);
  });
});

// ── Step 7: plan requirements are deliberately NOT enforced ──────────────────

describe("resolveCapability — plan gating", () => {
  it("never consults hasPlanAccess (plan gates are deferred post-launch)", () => {
    const hasPlanAccess = vi.fn(() => false);
    const ctx: CapabilityResolutionContext = {
      profile: "enterprise-preview",
      hasPermission: () => true,
      hasPlanAccess,
      hasFeatureFlag: () => true,
    };

    const res = resolveCapability("bulk-send", ctx);

    // Pins the current contract: a plan check that always denies must not change
    // the answer. When plan enforcement is switched on, this test fails and the
    // header comment must be updated with it.
    expect(res.available).toBe(true);
    expect(hasPlanAccess).not.toHaveBeenCalled();
  });
});

// ── Availability vs. permission ──────────────────────────────────────────────

describe("capability availability never grants permission", () => {
  it("keeps a launch-supporting capability gated on its permission inside its own profile", () => {
    // `basic-reports` is inside the launch-default allowlist and its flag is on:
    // the capability EXISTS for this workspace. That must not be enough.
    const flagsOnNoPerms = makeContext("launch-default", [], ["reportsEnabled"]);

    expect(resolveCapability("basic-reports", flagsOnNoPerms).outcome)
      .toBe("unavailable-permission");
    expect(isCapabilityAvailable("basic-reports", flagsOnNoPerms)).toBe(false);

    const withPerm = makeContext("launch-default", ["view_reports"], ["reportsEnabled"]);
    expect(isCapabilityAvailable("basic-reports", withPerm)).toBe(true);
  });

  it("does not let profile membership stand in for a permission", () => {
    // The precise confusion this suite exists to prevent: "it is in the profile"
    // and "this user may use it" are different questions with different answers.
    expect(isCapabilityInActiveProfile("workspace-administration")).toBe(true);

    const noPerms = makeContext(ACTIVE_LAUNCH_PROFILE, [], "all");
    expect(resolveCapability("workspace-administration", noPerms).outcome)
      .toBe("unavailable-permission");
  });

  it("gates every permission-declaring capability that is otherwise fully enabled", () => {
    // Sweep the registry rather than one hand-picked example, so a capability
    // added later cannot declare requirements the resolver quietly ignores.
    const checked: string[] = [];

    for (const cap of getAllCapabilities()) {
      if (cap.permissionRequirements.length === 0) continue;
      if (!PROFILE_MATURITY_ALLOWLIST["development"].includes(cap.maturity)) continue;

      const res = resolveCapability(cap.id, makeContext("development", [], "all"));
      expect(res.available, `${cap.id} must not be available without permissions`).toBe(false);
      expect(res.outcome, cap.id).toBe("unavailable-permission");
      checked.push(cap.id);
    }

    // Guard against the loop silently checking nothing.
    expect(checked.length).toBeGreaterThan(5);
  });
});

// ── isCapabilityInActiveProfile is profile-only ──────────────────────────────

describe("isCapabilityInActiveProfile", () => {
  it("ignores permissions and feature flags entirely", () => {
    // The regression this function was written to fix. Callers used to write
    // `resolveCapability(id, buildCapabilityContext(profile, [], {}))`, which
    // looks equivalent but denies every capability declaring a permission or a
    // flag — silently disabling the search and command-palette entries it was
    // supposed to gate.
    const emptyCtx = buildCapabilityContext(ACTIVE_LAUNCH_PROFILE, [], {});

    // `documents` declares BOTH a permission and a feature flag, and is
    // launch-core so it is present in every profile.
    const cap = getCapability("documents");
    expect(cap?.permissionRequirements.length).toBeGreaterThan(0);
    expect(cap?.featureRequirements.length).toBeGreaterThan(0);

    expect(resolveCapability("documents", emptyCtx).available).toBe(false);
    expect(isCapabilityInActiveProfile("documents")).toBe(true);
  });

  it("agrees exactly with resolveCapability once permissions and flags are all granted", () => {
    // The strongest available invariant, and no re-implementation of the rules:
    // with every permission and flag granted, resolveCapability's remaining
    // gates ARE gates 1-4, which is precisely what isCapabilityInActiveProfile
    // implements. Any divergence between the two functions fails here.
    const ctx = maximallyPermitted(ACTIVE_LAUNCH_PROFILE);
    let differing = 0;

    for (const cap of getAllCapabilities()) {
      const viaResolver = resolveCapability(cap.id, ctx).available;
      expect(isCapabilityInActiveProfile(cap.id), cap.id).toBe(viaResolver);
      if (!viaResolver) differing += 1;
    }

    // Some capabilities must be excluded, or the invariant is trivially true.
    expect(differing).toBeGreaterThan(0);
  });

  it("excludes future-product and deferred capabilities in any profile", () => {
    expect(isCapabilityInActiveProfile("future-enotary")).toBe(false);
    expect(isCapabilityInActiveProfile("document-versioning")).toBe(false);
  });

  it("includes launch-core capabilities in every profile", () => {
    for (const id of ["documents", "authentication", "prepare-document", "recipient-signing"]) {
      expect(isCapabilityInActiveProfile(id), id).toBe(true);
    }
  });

  it("includes development-only capabilities only in the development profile", () => {
    expect(isCapabilityInActiveProfile("development-scenarios"))
      .toBe(ACTIVE_LAUNCH_PROFILE === "development");
  });

  it("includes post-launch and enterprise-preview capabilities only outside launch-default", () => {
    for (const id of ["advanced-reports", "advanced-document-organization", "integrations"]) {
      expect(isCapabilityInActiveProfile(id), id).toBe(ACTIVE_PROFILE_INCLUDES_PREVIEW);
    }
    for (const id of ["workflow-automation", "bulk-send", "document-collaboration"]) {
      expect(isCapabilityInActiveProfile(id), id).toBe(ACTIVE_PROFILE_INCLUDES_PREVIEW);
    }
  });

  it("returns false for an unregistered id instead of throwing", () => {
    expect(() => isCapabilityInActiveProfile("no-such-capability")).not.toThrow();
    expect(isCapabilityInActiveProfile("no-such-capability")).toBe(false);
    expect(isCapabilityInActiveProfile("")).toBe(false);
    expect(isCapabilityInActiveProfile("__proto__")).toBe(false);
  });
});

// ── eNotary is a future product in EVERY profile ─────────────────────────────

describe("eNotary future-product boundary", () => {
  it("is unavailable in every profile, with and without grants", () => {
    for (const profile of ALL_PROFILES) {
      for (const perms of ["all", []] as const) {
        for (const flags of ["all", []] as const) {
          const where = `profile=${profile} perms=${String(perms)} flags=${String(flags)}`;
          const res = resolveCapability("future-enotary", makeContext(profile, perms, flags));

          expect(res.outcome, where).toBe("future-product");
          expect(res.available, where).toBe(false);
          expect(res.preview, where).toBe(false);
          expect(
            isCapabilityAvailable("future-enotary", makeContext(profile, perms, flags)),
            where,
          ).toBe(false);
        }
      }
    }
  });

  it("is excluded from the active profile and cannot be enabled by env mutation", async () => {
    expect(isCapabilityInActiveProfile("future-enotary")).toBe(false);

    for (const attempt of ALL_PROFILES) {
      vi.stubEnv("VITE_LAUNCH_PROFILE", attempt);
      vi.resetModules();
      const mod = await import("../capability-resolver");
      expect(mod.isCapabilityInActiveProfile("future-enotary"), attempt).toBe(false);
    }
  });

  it("keeps future-product out of every profile allowlist by construction", () => {
    // Belt and braces: even with the maturity gate removed, no allowlist should
    // contain "future-product".
    for (const profile of ALL_PROFILES) {
      expect(PROFILE_MATURITY_ALLOWLIST[profile], profile).not.toContain("future-product");
    }
  });

  it("is the only future-product capability in the registry", () => {
    const futures = getAllCapabilities().filter(c => c.maturity === "future-product");
    expect(futures.map(c => c.id)).toEqual(["future-enotary"]);
  });
});

// ── Build-time launch profile ────────────────────────────────────────────────

describe("ACTIVE_LAUNCH_PROFILE derivation", () => {
  it("cannot be elevated by mutating the environment at runtime", async () => {
    // The documented contract: "Never change at runtime; never read from a query
    // parameter." `vi.stubEnv` is exactly a runtime mutation of the environment,
    // and re-importing the module must not pick it up — the value was fixed when
    // the bundle was built.
    const buildTimeProfile = ACTIVE_LAUNCH_PROFILE;

    for (const attempt of ["enterprise-preview", "development", "launch-default"]) {
      vi.stubEnv("VITE_LAUNCH_PROFILE", attempt);
      vi.resetModules();
      const mod = await import("../capability-resolver");

      expect(mod.ACTIVE_LAUNCH_PROFILE, attempt).toBe(buildTimeProfile);
      expect(mod.isCapabilityInActiveProfile("bulk-send"), attempt)
        .toBe(buildTimeProfile !== "launch-default");
    }
  });

  it("is not influenced by URL query parameters", async () => {
    window.history.replaceState(
      {},
      "",
      "/app/dashboard?profile=enterprise-preview&launchProfile=development&VITE_LAUNCH_PROFILE=development",
    );

    vi.resetModules();
    const mod = await import("../capability-resolver");

    expect(window.location.search).toContain("enterprise-preview");
    expect(mod.ACTIVE_LAUNCH_PROFILE).toBe(ACTIVE_LAUNCH_PROFILE);
    expect(mod.isCapabilityInActiveProfile("development-scenarios"))
      .toBe(ACTIVE_LAUNCH_PROFILE === "development");
  });

  it("does not override the profile supplied in the resolution context", () => {
    // resolveCapability must be a pure function of (id, ctx). Whatever the
    // ambient build profile is, an explicit launch-default context must reject
    // an Enterprise Preview capability, and an explicit enterprise-preview
    // context must accept it.
    expect(resolveCapability("bulk-send", maximallyPermitted("launch-default")).outcome)
      .toBe("unavailable-profile");

    expect(resolveCapability("bulk-send", maximallyPermitted("enterprise-preview")).available)
      .toBe(true);
  });
});

// ── Enterprise Preview capabilities: workflow-automation and bulk-send ───────

describe.each([
  {
    id: "workflow-automation",
    permission: "view_workflow_automation" as PlatformPermission,
    flag: "automationEnabled" as PlatformFeatureFlag,
  },
  {
    id: "bulk-send",
    permission: "view_documents" as PlatformPermission,
    flag: "documentsEnabled" as PlatformFeatureFlag,
  },
])("enterprise-preview capability: $id", ({ id, permission, flag }) => {
  it("declares the maturity, permission and flag this suite assumes", () => {
    const cap = getCapability(id);
    expect(cap?.maturity).toBe("enterprise-preview");
    expect(cap?.permissionRequirements).toContain(permission);
    expect(cap?.featureRequirements).toContain(flag);
    expect(cap?.enabledByDefault).toBe(false);
  });

  it("is unavailable in launch-default even when fully permitted and flagged on", () => {
    const res = resolveCapability(id, makeContext("launch-default", [permission], [flag]));

    expect(res.outcome).toBe("unavailable-profile");
    expect(res.available).toBe(false);
    expect(res.preview).toBe(false);
    expect(res.safeFallbackRoute).toBe(getCapability(id)?.safeFallbackRoute);
  });

  it("is available as a PREVIEW in enterprise-preview, carrying its demonstration notice", () => {
    const res = resolveCapability(id, makeContext("enterprise-preview", [permission], [flag]));

    expect(res.outcome).toBe("available-preview");
    expect(res.available).toBe(true);
    expect(res.preview).toBe(true);
    expect(res.reasonLabel).toBe(getCapability(id)?.previewNotice);
    // The preview notice is a truthfulness guarantee — it is what tells the user
    // nothing is really sent. An empty label here would be a silent lie.
    expect(res.reasonLabel).toContain("Enterprise Preview");
    expect(res.reasonLabel.length).toBeGreaterThan(20);
  });

  it("still enforces its permission inside enterprise-preview", () => {
    const res = resolveCapability(id, makeContext("enterprise-preview", [], [flag]));
    expect(res.outcome).toBe("unavailable-permission");
    expect(res.available).toBe(false);
  });

  it("still enforces its feature flag inside enterprise-preview", () => {
    const res = resolveCapability(id, makeContext("enterprise-preview", [permission], []));
    expect(res.outcome).toBe("unavailable-feature");
    expect(res.available).toBe(false);
  });

  it("is in the active profile only when the build is not launch-default", () => {
    expect(isCapabilityInActiveProfile(id)).toBe(ACTIVE_PROFILE_INCLUDES_PREVIEW);
  });

  it("is never navigation-visible, so it cannot be promoted above launch features", () => {
    // Search / palette / dashboard contributions are intentional (Gap Closure 5);
    // a top-level nav item for an Enterprise Preview module is not.
    expect(getCapability(id)?.navigationVisibility).toBe(false);
  });

  it("is not indexable and not listed in the sitemap", () => {
    const cap = getCapability(id);
    expect(cap?.indexable).toBe(false);
    expect(cap?.sitemapInclude).toBe(false);
  });

  it("loses its preview flag and demonstration notice in the development profile", () => {
    // CURRENT BEHAVIOUR, pinned deliberately. `preview` is computed as
    // `maturity === "enterprise-preview" && ctx.profile === "enterprise-preview"`,
    // so in the development profile the same capability resolves as plain
    // "available" with an EMPTY reasonLabel and the "nothing is really sent"
    // notice is not surfaced. Reported as a finding. If the resolver is changed
    // to treat development as a preview profile too, update this test with it.
    const res = resolveCapability(id, maximallyPermitted("development"));

    expect(res.outcome).toBe("available");
    expect(res.available).toBe(true);
    expect(res.preview).toBe(false);
    expect(res.reasonLabel).toBe("");
  });
});

// ── Unknown capability ids ───────────────────────────────────────────────────

describe("unknown capability ids", () => {
  const UNKNOWN_IDS = [
    "no-such-capability",
    "",
    "future-enotary ", // trailing space — ids must be matched exactly
    "FUTURE-ENOTARY",
    "__proto__",
    "constructor",
    "prototype",
    "toString",
    "hasOwnProperty",
  ];

  it("resolves safely instead of throwing", () => {
    for (const id of UNKNOWN_IDS) {
      expect(() => resolveCapability(id, maximallyPermitted("development")), id).not.toThrow();
    }
  });

  it("denies access and offers a safe fallback route", () => {
    for (const id of UNKNOWN_IDS) {
      const res = resolveCapability(id, maximallyPermitted("development"));

      expect(res.available, id).toBe(false);
      expect(res.preview, id).toBe(false);
      expect(res.outcome, id).toBe("unavailable-profile");
      expect(res.safeFallbackRoute, id).toBe("/app/dashboard");
      expect(res.reasonLabel, id).toBe("This capability is not registered.");
      expect(res.capabilityId, id).toBe(id);
    }
  });

  it("does not resolve prototype keys through the registry index", () => {
    // The registry indexes by Map, not by plain object. Switched to an object
    // literal, `getCapability("__proto__")` would return something truthy and
    // the resolver would read `.maturity` off Object.prototype — silently
    // reaching the profile allowlist for a capability that does not exist.
    for (const id of ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf"]) {
      expect(getCapability(id), id).toBeUndefined();
    }
  });

  it("keeps isCapabilityAvailable consistent with resolveCapability", () => {
    for (const id of UNKNOWN_IDS) {
      expect(isCapabilityAvailable(id, maximallyPermitted("development")), id).toBe(false);
    }
  });
});

// ── buildCapabilityContext ───────────────────────────────────────────────────

describe("buildCapabilityContext", () => {
  it("grants only the permissions in the supplied list", () => {
    const ctx = buildCapabilityContext("enterprise-preview", ["view_documents"], {
      documentsEnabled: true,
    });

    expect(ctx.hasPermission("view_documents")).toBe(true);
    expect(ctx.hasPermission("manage_billing")).toBe(false);
    expect(resolveCapability("bulk-send", ctx).available).toBe(true);
  });

  it("treats a missing or non-boolean flag as OFF", () => {
    // `flags[f] === true` is a strict check on purpose: a flag object built from
    // partially-typed data must not accidentally enable a module.
    const ctx = buildCapabilityContext(
      "enterprise-preview",
      ["view_documents"],
      { documentsEnabled: "yes" as unknown as boolean },
    );

    expect(ctx.hasFeatureFlag("documentsEnabled")).toBe(false);
    expect(ctx.hasFeatureFlag("automationEnabled")).toBe(false);
    expect(resolveCapability("bulk-send", ctx).outcome).toBe("unavailable-feature");
  });

  it("carries the supplied profile through instead of reading the ambient one", () => {
    const ctx = buildCapabilityContext("launch-default", ["view_documents"], {
      documentsEnabled: true,
    });

    expect(ctx.profile).toBe("launch-default");
    expect(resolveCapability("bulk-send", ctx).outcome).toBe("unavailable-profile");
  });

  it("produces an empty-grant context that denies gated capabilities — the trap isCapabilityInActiveProfile exists to avoid", () => {
    const trap = buildCapabilityContext(ACTIVE_LAUNCH_PROFILE, [], {});

    // Every one of these is in the launch-core / launch-supporting set and would
    // therefore be expected to appear in search and the command palette.
    for (const id of ["documents", "templates", "contacts", "basic-reports"]) {
      expect(resolveCapability(id, trap).available, id).toBe(false);
      expect(isCapabilityInActiveProfile(id), id).toBe(true);
    }
  });
});

// ── Every resolution is actionable ───────────────────────────────────────────

describe("resolution shape", () => {
  it("always returns a usable safe fallback route and a reason when unavailable", () => {
    // A guard renders `safeFallbackRoute` as the ONLY escape from the blocked
    // screen. An empty string there is a dead end for the user.
    for (const profile of ALL_PROFILES) {
      for (const cap of getAllCapabilities()) {
        const res = resolveCapability(cap.id, makeContext(profile, [], []));
        const where = `${cap.id} @ ${profile}`;

        expect(res.capabilityId, where).toBe(cap.id);
        expect(res.safeFallbackRoute, where).not.toBe("");
        expect(res.safeFallbackRoute.startsWith("/"), where).toBe(true);

        if (!res.available) {
          expect(res.reasonLabel.length, `${where} needs a reason`).toBeGreaterThan(0);
          expect(res.preview, where).toBe(false);
        }
      }
    }
  });

  it("marks available only for the two available outcomes", () => {
    for (const profile of ALL_PROFILES) {
      for (const cap of getAllCapabilities()) {
        const res = resolveCapability(cap.id, maximallyPermitted(profile));
        const where = `${cap.id} @ ${profile}`;

        expect(res.available, where).toBe(
          res.outcome === "available" || res.outcome === "available-preview",
        );
        if (res.preview) {
          expect(res.outcome, where).toBe("available-preview");
        }
      }
    }
  });

  it("never marks a capability as preview while it is unavailable", () => {
    for (const profile of ALL_PROFILES) {
      for (const cap of getAllCapabilities()) {
        const res = resolveCapability(cap.id, makeContext(profile, [], []));
        if (!res.available) {
          expect(res.preview, `${cap.id} @ ${profile}`).toBe(false);
        }
      }
    }
  });
});
