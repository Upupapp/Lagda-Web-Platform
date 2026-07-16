// Product Capability Model — C35
// Centralized typing for the LAGDA feature classification, launch profiles,
// capability resolution, and readiness tracking.
//
// Single source of truth: src/app/config/product-capability-registry.ts
// Resolver:               src/app/config/capability-resolver.ts
// Profile selection:      src/app/config/launch-profiles.ts

import type { PlatformPermission, PlatformFeatureFlag, SubscriptionPlan } from "./index";

// ── Branded ID ────────────────────────────────────────────────────────────────

export type ProductCapabilityId = string & { readonly __brand: "ProductCapabilityId" };

export function capabilityId(s: string): ProductCapabilityId {
  return s as ProductCapabilityId;
}

// ── Maturity classification ───────────────────────────────────────────────────

export type ProductCapabilityMaturity =
  | "launch-core"        // Essential to primary eSignature journey
  | "launch-supporting"  // Useful at launch, not required
  | "post-launch"        // Suitable after core engine is stable
  | "enterprise-preview" // Implemented, disabled by default, not a launch dependency
  | "development-only"   // QA, fixtures, scenario controls
  | "deferred"           // Planned, must not appear in production nav
  | "future-product";    // Separate future product (eNotary)

export const MATURITY_LABELS: Record<ProductCapabilityMaturity, string> = {
  "launch-core":        "Launch Core",
  "launch-supporting":  "Launch Supporting",
  "post-launch":        "Post-Launch",
  "enterprise-preview": "Enterprise Preview",
  "development-only":   "Development Only",
  "deferred":           "Deferred",
  "future-product":     "Future Product",
};

// ── Launch profiles ───────────────────────────────────────────────────────────

export type LaunchProfileId =
  | "launch-default"    // Focused eSignature launch experience
  | "enterprise-preview" // Internal/controlled preview of advanced modules
  | "development";       // Local QA, scenario testing, fixture inspection

export const LAUNCH_PROFILE_LABELS: Record<LaunchProfileId, string> = {
  "launch-default":    "Default Launch",
  "enterprise-preview": "Enterprise Preview",
  "development":        "Development",
};

// Which maturity levels are enabled in each profile
export const PROFILE_MATURITY_ALLOWLIST: Record<LaunchProfileId, ProductCapabilityMaturity[]> = {
  "launch-default": ["launch-core", "launch-supporting"],
  "enterprise-preview": ["launch-core", "launch-supporting", "post-launch", "enterprise-preview"],
  "development": ["launch-core", "launch-supporting", "post-launch", "enterprise-preview", "development-only"],
};

// ── Frontend / backend readiness ──────────────────────────────────────────────

export type FrontendReadiness =
  | "not-started"
  | "partial"
  | "complete-demonstration"
  | "tested-demonstration";

export type BackendReadiness =
  | "not-defined"
  | "contract-defined"
  | "adapter-ready"
  | "service-required"
  | "production-ready";

export type LaunchReadinessStatus =
  | "blocked"
  | "internal-only"
  | "preview"
  | "launch-supporting"
  | "launch-ready";

// ── Capability resolution outcome ─────────────────────────────────────────────

export type CapabilityResolutionOutcome =
  | "available"
  | "available-preview"
  | "unavailable-profile"
  | "unavailable-backend"
  | "unavailable-plan"
  | "unavailable-permission"
  | "unavailable-feature"
  | "unavailable-workspace"
  | "development-only"
  | "future-product"
  | "deferred";

export interface CapabilityResolution {
  outcome: CapabilityResolutionOutcome;
  available: boolean;       // true only for "available" or "available-preview"
  preview: boolean;         // true for "available-preview"
  reasonLabel: string;      // Human-readable reason when not available
  safeFallbackRoute: string; // Where to redirect gated direct routes
  capabilityId: ProductCapabilityId;
}

// ── Capability definition ─────────────────────────────────────────────────────

export interface ProductCapability {
  readonly id:                        ProductCapabilityId;
  readonly label:                     string;
  readonly description:               string;
  readonly group:                     string;
  readonly maturity:                  ProductCapabilityMaturity;
  readonly enabledByDefault:          boolean;   // false = disabled in launch-default
  readonly frontendReady:             FrontendReadiness;
  readonly backendReady:              BackendReadiness;
  readonly publicLaunchReady:         boolean;
  readonly navigationVisibility:      boolean;   // show in primary nav
  readonly searchVisibility:          boolean;   // include in search results
  readonly commandPaletteVisibility:  boolean;   // include in command palette
  readonly dashboardVisibility:       boolean;   // show dashboard widget/section
  readonly permissionRequirements:    PlatformPermission[];
  readonly planRequirements:          SubscriptionPlan[];
  readonly featureRequirements:       PlatformFeatureFlag[];
  readonly routeIds:                  string[];
  readonly unavailableReason:         string;
  readonly previewNotice:             string;
  readonly safeFallbackRoute:         string;
  readonly indexable:                 boolean;   // false = noindex
  readonly sitemapInclude:            boolean;
  readonly backendDependencies:       string[];  // human-readable service names
  readonly dependencies:              ProductCapabilityId[];
}

// ── Context for resolution ────────────────────────────────────────────────────

export interface CapabilityResolutionContext {
  profile:         LaunchProfileId;
  hasPermission:   (p: PlatformPermission) => boolean;
  hasPlanAccess:   (plan: SubscriptionPlan) => boolean;
  hasFeatureFlag:  (flag: PlatformFeatureFlag) => boolean;
}
