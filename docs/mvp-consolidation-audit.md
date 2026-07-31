# MVP Consolidation Audit — C35

> **⚠️ SUPERSEDED IN PART — re-audited 2026-07-31 at HEAD `7c6713b`.**
>
> This document was written on 2026-07-16 when the repository was at C32. Commands
> 33, 34, 36 and 37 have landed since. Section 1 below is preserved as the original
> record; **the statements about Commands 33 and 34 are no longer true.**
>
> Read `docs/mvp-consolidation-reaudit.md` for the current state, including four
> capability-gating defects this original audit did not catch.

**Date:** 2026-07-16 (original) · re-audited 2026-07-31  
**Scope:** Full audit of LAGDA frontend through Command 32  
**Purpose:** Classify every existing capability and identify gating requirements

---

## 1. Repository Confirmation

### 1a. Original record (2026-07-16, HEAD `c2eac3d`) — historical

- **Location:** `C:\Users\paulg\OneDrive\Desktop\Lagda`
- **HEAD:** `c2eac3d` (C32: Workflow Automation)
- **Commands Confirmed in Repository:** C1–C32
- **Commands 33 & 34:** NOT implemented at that time.

### 1b. Current state (2026-07-31, HEAD `7c6713b`) — authoritative

| Command | Status now |
|---|---|
| C33 Bulk Send | **IMPLEMENTED** — 9 routes, `enterprise-preview`, capability-guarded |
| C34 Document Collaboration | **IMPLEMENTED** — 9 routes, `enterprise-preview`, capability-guarded. Asynchronous internal review, **not** real-time collaboration |
| C36 Logo integration | Implemented |
| C37 Signing Workflow | Implemented — `launch-core` |
| Document Versioning | Still **not** implemented — remains `deferred` |

The capability registry now holds **29** capabilities (16 launch-core, 4
launch-supporting, 3 enterprise-preview, 3 post-launch, 1 deferred, 1
future-product, 1 development-only), not the count recorded below.

The original "Evidence: Absent C33/C34 Artifacts" grep block has been removed
because re-running it today returns extensive results and reproducing it would
assert something false.

---

## 2. Public Routes (C1–C11)

| Route Family | Count | Status |
|---|---|---|
| Home + shell | 1 | ✅ Complete |
| eSignature product | 6 | ✅ Complete |
| Features | 16 | ✅ Complete |
| Security | 10 | ✅ Complete |
| Solutions | 11 | ✅ Complete |
| Pricing | 8 | ✅ Complete |
| Resources | 8 | ✅ Complete |
| Help/Contact | 3 | ✅ Complete |
| Legal | 3 | ✅ Complete (DRAFT notices) |
| eNotary | 5 | ✅ Future-product correctly labeled |
| Conversion (verify, book-demo, create-account) | 4 | ✅ Complete |

**Total public routes:** ~84

---

## 3. Authenticated Routes (C12–C32)

| Route Family | Routes | Command | Maturity |
|---|---|---|---|
| Platform shell | — | C12 | launch-core |
| Auth + onboarding | 16 | C13 | launch-core |
| Dashboard | 1 | C14 | launch-core |
| Documents workspace | 4 | C15 | launch-core |
| Transaction detail | 6 | C16 | launch-core |
| Verification | 2 | C17 | launch-core |
| Prepare Document | 8 | C18 | launch-core |
| Field Placement | 1 | C19 | launch-core |
| Recipient signing | 10 | C20 | launch-core |
| Templates | 7 | C21 | launch-core |
| Contacts | 7 | C22 | launch-core |
| Workspace Admin | 10 | C23 | launch-core |
| Settings | 15 | C24 | launch-core |
| Finalization | — | C25 | launch-core |
| Signature Library | 4 | C26 | launch-supporting |
| Recipient Inbox | 2 | C27 | launch-core |
| Notifications | 2 | C28 | launch-core |
| Reports | 8 | C29 | launch-supporting |
| Global Search | 1 | C30 | launch-supporting |
| Document Organization | 5 | C31 | launch-supporting |
| Workflow Automation | 10 | C32 | **enterprise-preview** |

---

## 4. Navigation Items (Current State)

### Primary Nav (platform.nav.ts)
```
Dashboard          — launch-core, permission: view_dashboard
Documents          — launch-core, permission: view_documents
Templates          — launch-core, permission: manage_templates
Contacts           — launch-core, permission: manage_contacts
Verify Document    — launch-core, permission: verify_documents
My Actions (Inbox) — launch-core, no permission required
Reports            — launch-supporting, permission: view_reports
Automation         — enterprise-preview, featureFlag: automationEnabled (NOW FALSE)
```

**C35 action:** `automationEnabled` set to `false` in `DEFAULT_PLATFORM_FLAGS`. Automation nav item hidden in default launch profile via the existing `featureFlag` gate.

---

## 5. Dashboard Widgets (C14 + C28 + C29 + C32)

| Widget | Capability | Default Profile |
|---|---|---|
| Quick Actions (Create Doc, Templates, Verify, Invite) | launch-core | ✅ Visible |
| Needs Attention | launch-core | ✅ Visible |
| Status Summary | launch-core | ✅ Visible |
| Recent Documents | launch-core | ✅ Visible |
| Recent Activity | launch-core | ✅ Visible |
| My Actions (C27) | launch-core | ✅ Visible |
| Notifications (C28) | launch-core | ✅ Visible |
| Template Shortcuts | launch-supporting | ✅ Visible |
| Verification Access | launch-core | ✅ Visible |
| Usage Snapshot | launch-core | ✅ Visible |
| Team Summary | launch-core | ✅ Visible |
| Reports Direction (C29) | launch-supporting | ✅ Visible |
| **Automation Direction (C32)** | **enterprise-preview** | **🚫 Gated by capability** |

**C35 action:** `AutomationDirectionSection` now gated by `automationCap.available` in PlatformDashboard.

---

## 6. Global Search Providers

| Provider | Scope | Default Profile |
|---|---|---|
| Documents | documents | ✅ Active |
| Folders | documents | ✅ Active |
| Tags | documents | ✅ Active |
| Saved Views | documents | ✅ Active |
| My Actions | my-actions | ✅ Active |
| Templates | templates | ✅ Active |
| Contacts + Groups | contacts | ✅ Active |
| Members/Teams/Roles | people-and-teams | ✅ Active |
| Verification records | verification | ✅ Active |
| Notifications | notifications | ✅ Active |
| Report definitions | reports | ✅ Active |
| **Automation rules/policies** | **reports** | **🚫 Gated by isAutomationSearchEnabled()** |
| Settings routes | settings | ✅ Active |
| Help resources | help | ✅ Active |

---

## 7. Command Palette Commands

| Group | Count | Default Profile |
|---|---|---|
| Navigate | ~12 | ✅ Active |
| Create | 6 | ✅ Active |
| Reports | 1 | ✅ Active |
| Workspace | 1 | ✅ Active |
| Settings | 8 | ✅ Active |
| Document Organization | 3 | ✅ Active |
| **Automation (5 commands)** | 5 | **🚫 Filtered by _getAvailableCommands()** |
| My Work | 1 | ✅ Active |
| Help | 2 | ✅ Active |

---

## 8. Identified Issues

| # | Issue | Severity | Resolution |
|---|---|---|---|
| 1 | `automationEnabled: true` allowed automation nav in default profile | High | Fixed: now `false` |
| 2 | `AutomationDirectionSection` appeared on dashboard for all `view_workflow_automation` roles | High | Fixed: capability-gated |
| 3 | `buildAutomationResults` ran unconditionally in search | Medium | Fixed: capability-gated |
| 4 | Automation commands always in command palette | Medium | Fixed: filtered in `_getAvailableCommands()` |
| 5 | No route guard on `/app/automation/*` — direct URL bypass | High | Fixed: `CapabilityGuard` wraps all 10 routes |
| 6 | No centralized capability registry existed | Medium | Fixed: registry + resolver created |
| 7 | docs/authentication-flows.md, docs/onboarding-flows.md missing | Low | Covered by existing docs |
| 8 | C33/C34 confirmed absent — no action needed | — | Confirmed |

---

## 9. Feature Flag Assessment

| Flag | Current Value | C35 Value | Rationale |
|---|---|---|---|
| `dashboardEnabled` | true | true | launch-core |
| `documentsEnabled` | true | true | launch-core |
| `prepareFlowEnabled` | true | true | launch-core |
| `templatesEnabled` | true | true | launch-core |
| `contactsEnabled` | true | true | launch-core |
| `verificationEnabled` | true | true | launch-core |
| `notificationsEnabled` | true | true | launch-core |
| `teamEnabled` | true | true | launch-core |
| `billingEnabled` | true | true | launch-core |
| `integrationsEnabled` | true | true | post-launch demo |
| `apiEnabled` | true | true | post-launch demo |
| `webhooksEnabled` | true | true | post-launch demo |
| `reportsEnabled` | true | true | launch-supporting |
| `automationEnabled` | **true → false** | **false** | enterprise-preview |
| `developmentPlaceholdersEnabled` | true | true | dev only |

---

## 10. Public Portal Claims Assessment

| Claim Category | Status |
|---|---|
| eSignature capabilities | ✅ Accurate — frontend demonstration |
| Document Verification | ✅ Accurate — demonstration only, no real hash processing |
| Recipient authentication | ✅ Accurate — direction only, no real auth |
| Audit Trail / Evidence | ⚠️ Needs qualification — frontend-only, no production persistence |
| eNotary | ✅ Correctly labeled "Coming Soon — Subject to Supreme Court Accreditation" |
| Automation | ✅ Not advertised on public pages |
| Bulk Send | ✅ Not mentioned on public pages. (Implemented since C33 as `enterprise-preview`; correctly absent from public claims.) |
| Collaboration | ✅ Not mentioned on public pages. (Implemented since C34 as `enterprise-preview`; correctly absent from public claims.) |

---

## 11. No Duplicate Architecture

Confirmed: No second router, shell, permission system, nav system, feature-flag service, or route metadata system was created in C35. The capability registry layers on top of existing `PlatformFlags`, `PlatformPermission`, and `PlatformNavItem` types.
