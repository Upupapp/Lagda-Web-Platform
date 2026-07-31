// Capability Resolver — C35
// Single function that determines capability availability given a context.
//
// Evaluation order:
//  1. Future-product boundary (always restricted)
//  2. Deferred boundary (always restricted)
//  3. Development-only boundary (development profile only)
//  4. Launch profile + maturity allowlist
//  5. Feature flag requirements
//  6. Permission requirements
//  7. Plan requirements (not yet enforced by plan gates, reserved for future)
//
// Rules:
//  - Feature flags do NOT replace permission checks.
//  - Plan availability does NOT grant permission.
//  - A query parameter CANNOT elevate the profile.
//  - A route ID does NOT grant capability access.

import type {
  ProductCapabilityId,
  CapabilityResolution,
  CapabilityResolutionContext,
  LaunchProfileId,
  ProductCapabilityMaturity,
} from "../models/product-capability";
import { PROFILE_MATURITY_ALLOWLIST } from "../models/product-capability";
import { getCapability } from "./product-capability-registry";

// ── Active launch profile ─────────────────────────────────────────────────────
// Determined at build time through VITE_LAUNCH_PROFILE env var.
// Never change at runtime; never read from a query parameter.
// Safe default: "launch-default".

function deriveActiveLaunchProfile(): LaunchProfileId {
  const env = (typeof import.meta !== "undefined"
    ? (import.meta as unknown as Record<string, Record<string, string> | undefined>).env?.VITE_LAUNCH_PROFILE
    : undefined) ?? "";
  if (env === "enterprise-preview") return "enterprise-preview";
  if (env === "development") return "development";
  return "launch-default";
}

export const ACTIVE_LAUNCH_PROFILE: LaunchProfileId = deriveActiveLaunchProfile();

// ── Resolver ──────────────────────────────────────────────────────────────────

export function resolveCapability(
  id: ProductCapabilityId | string,
  ctx: CapabilityResolutionContext,
): CapabilityResolution {
  const cap = getCapability(id);

  // Unknown capability — treat as unavailable
  if (!cap) {
    return {
      outcome:          "unavailable-profile",
      available:        false,
      preview:          false,
      reasonLabel:      "This capability is not registered.",
      safeFallbackRoute: "/app/dashboard",
      capabilityId:     id as ProductCapabilityId,
    };
  }

  const maturity: ProductCapabilityMaturity = cap.maturity;

  // 1. Future product
  if (maturity === "future-product") {
    return {
      outcome:          "future-product",
      available:        false,
      preview:          false,
      reasonLabel:      cap.unavailableReason || "This is a future product.",
      safeFallbackRoute: cap.safeFallbackRoute,
      capabilityId:     cap.id,
    };
  }

  // 2. Deferred
  if (maturity === "deferred") {
    return {
      outcome:          "deferred",
      available:        false,
      preview:          false,
      reasonLabel:      cap.unavailableReason || "This capability is not yet available.",
      safeFallbackRoute: cap.safeFallbackRoute,
      capabilityId:     cap.id,
    };
  }

  // 3. Development-only
  if (maturity === "development-only") {
    if (ctx.profile !== "development") {
      return {
        outcome:          "development-only",
        available:        false,
        preview:          false,
        reasonLabel:      cap.unavailableReason || "This capability is only available in development.",
        safeFallbackRoute: cap.safeFallbackRoute,
        capabilityId:     cap.id,
      };
    }
  }

  // 4. Profile + maturity allowlist
  const allowedMaturities = PROFILE_MATURITY_ALLOWLIST[ctx.profile];
  if (!allowedMaturities.includes(maturity)) {
    const isEnterprisePreview = maturity === "enterprise-preview";
    return {
      outcome:          isEnterprisePreview ? "unavailable-profile" : "unavailable-profile",
      available:        false,
      preview:          false,
      reasonLabel:      isEnterprisePreview
        ? "Workflow Automation is an Enterprise Preview capability not included in the current product profile."
        : (cap.unavailableReason || "This capability is not available in the current profile."),
      safeFallbackRoute: cap.safeFallbackRoute,
      capabilityId:     cap.id,
    };
  }

  // 5. Feature flag requirements
  for (const flag of cap.featureRequirements) {
    if (!ctx.hasFeatureFlag(flag)) {
      return {
        outcome:          "unavailable-feature",
        available:        false,
        preview:          false,
        reasonLabel:      cap.unavailableReason || `This capability requires the ${flag} feature.`,
        safeFallbackRoute: cap.safeFallbackRoute,
        capabilityId:     cap.id,
      };
    }
  }

  // 6. Permission requirements (at least one must match if any required)
  if (cap.permissionRequirements.length > 0) {
    const hasAnyPermission = cap.permissionRequirements.some(p => ctx.hasPermission(p));
    if (!hasAnyPermission) {
      return {
        outcome:          "unavailable-permission",
        available:        false,
        preview:          false,
        reasonLabel:      cap.unavailableReason || "You don't have permission to access this capability.",
        safeFallbackRoute: cap.safeFallbackRoute,
        capabilityId:     cap.id,
      };
    }
  }

  // Available — check if preview
  const isPreview = maturity === "enterprise-preview" && ctx.profile === "enterprise-preview";
  return {
    outcome:          isPreview ? "available-preview" : "available",
    available:        true,
    preview:          isPreview,
    reasonLabel:      isPreview ? (cap.previewNotice || "Enterprise Preview") : "",
    safeFallbackRoute: cap.safeFallbackRoute,
    capabilityId:     cap.id,
  };
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export function isCapabilityAvailable(
  id: ProductCapabilityId | string,
  ctx: CapabilityResolutionContext,
): boolean {
  return resolveCapability(id, ctx).available;
}

/** Build a minimal context for use outside React (e.g. service layer) */
export function buildCapabilityContext(
  profile: LaunchProfileId,
  permissions: string[],
  flags: Record<string, boolean>,
): CapabilityResolutionContext {
  return {
    profile,
    hasPermission:  (p) => permissions.includes(p),
    hasPlanAccess:  () => true, // plan gates deferred to post-launch
    hasFeatureFlag: (f) => flags[f] === true,
  };
}
