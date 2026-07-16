# LAGDA Brand Screen Audit
> Command 35 (BRAND) — 2026-07-16
> Status: Baseline audit. Re-run when screens are updated.

---

## Audit Scope

This document audits each of the 22 capabilities for brand system compliance: state system coverage, inline-styles-only rule, font stack, color usage, and component conformance.

**Audit criteria:**
- [ ] Loading state implemented (SkeletonBlock or LagdaLoader)
- [ ] Error state implemented (PageError or SectionError)
- [ ] Empty state implemented (EmptyState)
- [ ] Inline styles only in JSX (no Tailwind class strings)
- [ ] Geist font applied via GF constant or inline fontFamily
- [ ] Azure (#0078D4) for primary actions (not Burgundy)
- [ ] eNotary disclaimer on all eNotary surfaces
- [ ] CapabilityGuard on all restricted capability routes

---

## Capability Compliance Table

### 1. Workspace / Authentication
**Routes:** `/sign-in`, `/sign-up`, `/verify-email`, `/app/dashboard`  
**Status:** Partial — auth shell uses LagdaLoader for session init; individual auth screens use basic layout  

| Check | Status | Notes |
|---|---|---|
| Loading | ✅ | SessionInitializing → LagdaLoader fullscreen (upgraded C35 BRAND) |
| Error | ⚠️ | No PageError on sign-in failure (shows inline field errors only) |
| Empty | N/A | — |
| Inline styles | ⚠️ | Auth pages built pre-C35; some use className strings |
| Geist font | ✅ | Theme.css applies globally |
| Azure primary | ✅ | Sign-in CTA uses primary variant |

**Action:** Auth page inline styles cleanup is P2 (post-launch).

---

### 2. Document Preparation
**Routes:** `/app/documents/prepare/*`  
**Status:** Demonstration state (mock flows)

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | PlatformPageLoader covers route load; no per-step skeleton |
| Error | ⚠️ | No PageError on prepare failure |
| Empty | ⚠️ | No EmptyState on empty document list |
| Inline styles | ⚠️ | Partial — mixed |
| Geist font | ✅ | Global via theme.css |
| Azure primary | ✅ | |

---

### 3. Signing Workflow
**Routes:** `/app/documents/sign/*`, `/sign/*` (public signing)  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | Basic spinner; LagdaLoader not used |
| Error | ⚠️ | No PageError |
| Empty | N/A | — |
| Inline styles | ⚠️ | Mixed |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 4. Document Tracking / Status
**Routes:** `/app/documents`, `/app/documents/:id`  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | SkeletonBlock not yet used |
| Error | ⚠️ | No PageError |
| Empty | ⚠️ | Basic text only |
| Inline styles | ⚠️ | Mixed |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 5. Recipient Inbox
**Routes:** `/app/inbox`  
**Status:** Demonstration state (built C27)

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | Basic spinner |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState implemented |
| Inline styles | ✅ | C27 used inline styles |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 6. Public Verification Portal
**Routes:** `/verify`, `/verify/:code`  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | ✅ | LagdaLoader inline during check |
| Error | ⚠️ | Uses custom error surface; not PageError |
| Empty | N/A | — |
| Inline styles | ✅ | |
| Geist font | ✅ | |
| Azure primary | ✅ | Verified uses gold; action buttons use azure |

---

### 7. Template Library
**Routes:** `/app/templates`  
**Status:** Demonstration state (built C24)

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "Create your first template" |
| Inline styles | ✅ | |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 8. Contact Directory
**Routes:** `/app/contacts`  
**Status:** Demonstration state (built C25)

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "Add your first contact" |
| Inline styles | ✅ | |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 9. Signature Library
**Routes:** `/app/signature-library`  
**Status:** Demonstration state (built C26)

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "No saved signatures" |
| Inline styles | ✅ | |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 10. Notification Center
**Routes:** `/app/notifications`  
**Status:** Demonstration state (built C28)

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "No notifications" |
| Inline styles | ✅ | |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 11. Compliance Reports
**Routes:** `/app/reports`  
**Status:** Demonstration state (built C29)

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "No report data" |
| Inline styles | ✅ | |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 12. Global Search / Command Palette
**Routes:** Header search trigger, `/app/search`  
**Status:** Built C30; automation results gated

| Check | Status | Notes |
|---|---|---|
| Loading | ✅ | Debounce + inline indicator |
| Error | ✅ | "No results" state |
| Empty | ✅ | "Start typing to search" |
| Inline styles | ✅ | |
| Geist font | ✅ | |
| Automation gating | ✅ | `isAutomationSearchEnabled()` gates results |

---

### 13. Document Organization
**Routes:** `/app/documents/folders`  
**Status:** Demonstration state (built C31)

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "No folders yet" |
| Inline styles | ✅ | |
| Geist font | ✅ | |
| Azure primary | ✅ | |

---

### 14. Workspace Management
**Routes:** `/app/settings/workspace`  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | N/A | Static settings |
| Error | ⚠️ | No SectionError on save failure |
| Empty | N/A | — |
| Inline styles | ⚠️ | Mixed |
| Geist font | ✅ | |

---

### 15. Team / User Management
**Routes:** `/app/settings/team`  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock for member list |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "Invite your first team member" |
| Inline styles | ⚠️ | Mixed |
| Geist font | ✅ | |

---

### 16. Audit Logs
**Routes:** `/app/audit-logs`  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "No audit events" |
| Inline styles | ⚠️ | Mixed |
| Geist font | ✅ | |

---

### 17. API Access (Developer)
**Routes:** `/app/settings/api`  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | N/A | Static |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "No API keys yet" |
| Inline styles | ⚠️ | Mixed |
| Geist font | ✅ | |

---

### 18. Billing / Subscription
**Routes:** `/app/settings/billing`  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | N/A | — |
| Inline styles | ⚠️ | Mixed |
| Azure primary | ✅ | |

---

### 19. Enterprise Organization
**Routes:** `/app/org`  
**Status:** Demonstration state

| Check | Status | Notes |
|---|---|---|
| Loading | ⚠️ | No SkeletonBlock |
| Error | ⚠️ | None |
| Empty | ✅ | EmptyState: "No org units" |
| Inline styles | ⚠️ | Mixed |
| Geist font | ✅ | |

---

### 20. Workflow Automation (Enterprise Preview)
**Routes:** `/app/automation/*` — ALL gated by CapabilityGuard

| Check | Status | Notes |
|---|---|---|
| Route guard | ✅ | `<CapabilityGuard capabilityId="workflow-automation">` on all 10 routes |
| Dashboard widget | ✅ | Hidden when `canAutomation === false` |
| Nav item | ✅ | Hidden via `automationEnabled: false` feature flag |
| Search results | ✅ | `isAutomationSearchEnabled()` returns false in launch-default |
| CapabilityUnavailable | ✅ | Shows "Not Available on Your Plan" message |

---

### 21. eNotary (Future Product)
**Routes:** `/esignature/*` and eNotary-specific pages

| Check | Status | Notes |
|---|---|---|
| Legal disclaimer | ✅ | "Coming Soon and Subject to Supreme Court Accreditation" on all eNotary surfaces |
| Burgundy isolation | ✅ | Burgundy (#67023B) only on eNotary surfaces |
| Never live | ✅ | No active signing flow, no purchasable tier |
| CapabilityGuard | ⚠️ | eNotary routes do not yet use CapabilityGuard (deferred — no /app/enotary/* routes exist yet) |

---

### 22. Public Marketing Portal
**Routes:** `/`, `/about`, `/pricing`, `/security`, `/esignature/*`, `/solutions/*`, `/resources/*`

| Check | Status | Notes |
|---|---|---|
| Loading | ✅ | Public pages render statically |
| Error | ⚠️ | No consistent PageError on public 404 |
| Azure primary | ✅ | All primary CTAs use Azure |
| eNotary disclaimer | ✅ | Present on eNotary marketing surfaces |
| Inline styles | ⚠️ | Many public pages are Figma imports with className strings |

---

## Summary

| Category | Compliant | Partial | Missing |
|---|---|---|---|
| Loading states | 4 | 12 | 6 |
| Error states | 2 | 4 | 16 |
| Empty states | 14 | 2 | 6 |
| Inline styles | 10 | 8 | 4 |
| Font stack | 22 | 0 | 0 |
| Color usage | 20 | 2 | 0 |
| Capability gating | 2 | 0 | 0 |

**Priority for post-launch brand polish:**
1. P1: Error states on all core document workflow screens (prepare, sign, track, inbox)
2. P1: SkeletonBlock on all list/table views
3. P2: Inline-styles cleanup on mixed-mode screens
4. P3: Figma import page cleanup (deferred to full migration pass)
