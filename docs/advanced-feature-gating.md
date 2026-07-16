# Advanced Feature Gating Architecture

**Version:** C35  
**Date:** 2026-07-16

---

## Overview

LAGDA uses a three-layer gating system to control which capabilities are visible, accessible, and executable. The layers are independent and additive — each layer provides defense in depth. A capability that passes one layer can still be blocked by another.

---

## Layer 1 — Launch Profile (Compile-Time)

**Source:** `VITE_LAUNCH_PROFILE` environment variable  
**Location:** `src/app/config/capability-resolver.ts`  
**Type:** Build-time, cannot be changed at runtime

```
VITE_LAUNCH_PROFILE=launch-default   → most restrictive
VITE_LAUNCH_PROFILE=enterprise-preview → shows Enterprise Preview capabilities
VITE_LAUNCH_PROFILE=development       → all capabilities
```

The active profile is derived once at module-load time via `deriveActiveLaunchProfile()`. It reads `import.meta.env.VITE_LAUNCH_PROFILE` and falls back to `"launch-default"`. It is **never** derived from URL parameters, query strings, cookies, or runtime config.

### Profile Allowlist

```typescript
const PROFILE_MATURITY_ALLOWLIST = {
  "launch-default":      ["launch-core", "launch-supporting"],
  "enterprise-preview":  ["launch-core", "launch-supporting", "post-launch", "enterprise-preview"],
  "development":         ["launch-core", "launch-supporting", "post-launch", "enterprise-preview", "development-only"],
};
```

Capabilities with `maturity: "future-product"` or `maturity: "deferred"` are blocked by all profiles.

---

## Layer 2 — Feature Flags (Runtime, Per-Session)

**Source:** `PlatformContext.DEFAULT_PLATFORM_FLAGS`  
**Location:** `src/app/context/PlatformContext.tsx`  
**Type:** Runtime, initialized from defaults, overridable by platform config response

Feature flags gate specific capabilities after profile allowlist passes. A capability lists its required flags in `featureRequirements: PlatformFeatureFlag[]`. **All listed flags must be `true`.**

### Current Default Flags

```typescript
const DEFAULT_PLATFORM_FLAGS = {
  dashboardEnabled: true,
  documentsEnabled: true,
  prepareFlowEnabled: true,
  templatesEnabled: true,
  contactsEnabled: true,
  verificationEnabled: true,
  notificationsEnabled: true,
  teamEnabled: true,
  billingEnabled: true,
  integrationsEnabled: true,
  apiEnabled: true,
  webhooksEnabled: true,
  reportsEnabled: true,
  automationEnabled: false,   // ← Enterprise Preview: off by default
  developmentPlaceholdersEnabled: true,
};
```

### Navigation Gate

`PlatformSidebar` reads `featureFlag` from each nav item and calls `flags[item.featureFlag]`. If false, the nav item is omitted. This means `automationEnabled: false` automatically hides the Automation nav entry without any additional code.

---

## Layer 3 — Permission System (Runtime, Per-User)

**Source:** `ROLE_PERMISSIONS` in `src/app/models/index.ts`  
**Location:** `PlatformContext.hasPermission()`  
**Type:** Runtime, role-based

Capabilities list required permissions in `permissionRequirements: PlatformPermission[]`. If any are listed, the user must have at least one matching permission. Permission is granted by role:

```
owner        → all permissions
administrator → all permissions
sender        → limited send/manage set
viewer        → read-only set
```

---

## The `resolveCapability()` Function

All three layers are evaluated together in `resolveCapability(id, ctx)`:

```
Evaluation order:
1. future-product → outcome: "future-product", available: false
2. deferred       → outcome: "deferred", available: false
3. development-only in non-development profile → outcome: "development-only", available: false
4. Profile maturity allowlist → outcome: "unavailable-profile", available: false (if not allowed)
5. Feature flag requirements → outcome: "unavailable-feature", available: false (if any missing)
6. Permission requirements → outcome: "unavailable-permission", available: false (if no match)
7. → outcome: "available", available: true
```

---

## Surface-Level Gating

### Navigation
- `PlatformSidebar` calls `flags[item.featureFlag]` — if feature flag is false, item is invisible
- `hasPermission(item.permission)` — if permission missing, item is invisible

### Routes
- `CapabilityGuard` wraps every route element for gated capabilities
- If `useCapability(id).available === false`, renders `CapabilityUnavailable` instead of the page
- Children are lazy-loaded — they are not bundled into the default profile

### Global Search
- `isAutomationSearchEnabled()` gates `buildAutomationResults` in `SCOPE_BUILDERS`
- Results from gated capabilities never appear in search output

### Command Palette
- `_getAvailableCommands()` filters `ALL_COMMANDS` — commands in `"Automation"` group are excluded when `isAutomationSearchEnabled()` returns false

### Dashboard
- `PlatformDashboard` calls `resolveCapability("workflow-automation")` before rendering `AutomationDirectionSection`

---

## Workflow Automation Gating (Concrete Example)

In `launch-default` profile with default flags:

| Surface | Gating Mechanism | Result |
|---|---|---|
| Nav sidebar | `featureFlag: "automationEnabled"` → `false` | Hidden |
| Dashboard widget | `resolveCapability("workflow-automation").available` → `false` | Not rendered |
| Search results | `isAutomationSearchEnabled()` → `false` | Rules/policies excluded |
| Command palette | `_getAvailableCommands()` filters "Automation" group | 5 commands excluded |
| `/app/automation/*` direct URL | `CapabilityGuard` → `useCapability(...)` → `false` | Shows `CapabilityUnavailable` |

In `enterprise-preview` profile with `automationEnabled: true`:

| Surface | Result |
|---|---|
| Nav sidebar | Visible (featureFlag passes) |
| Dashboard widget | Rendered |
| Search results | Automation results included |
| Command palette | Automation commands included |
| Routes | Lazy-loaded page components mount |

---

## What Cannot Be Bypassed

1. **Profile switching via URL** — `ACTIVE_LAUNCH_PROFILE` is set at module load from env var only
2. **Route access via direct URL** — `CapabilityGuard` evaluates at component render time
3. **future-product / deferred capabilities** — blocked by all profiles, no flag can override
4. **Permission escalation** — `ROLE_PERMISSIONS` is static in this demonstration build; no runtime override

---

## Adding a New Gated Capability

1. Add an entry to `PRODUCT_CAPABILITY_REGISTRY` with appropriate `maturity`, `featureRequirements`, `permissionRequirements`, and `navigationVisibility: false`
2. Set the feature flag default to `false` in `DEFAULT_PLATFORM_FLAGS`
3. Wrap the route with `<CapabilityGuard capabilityId="your-capability-id">`
4. Add a check in any dashboard widget that references the capability
5. Add a check in search builders if the capability contributes search results
6. Filter command palette commands if any commands navigate to the capability
