# C25 — Final Frontend Audit

Audit date: 2026-07-16  
HEAD: 477f681 (C24 complete — all 15 settings routes live)  
Total source files: 414  
Total page components: 168 (.tsx under src/app/pages)

---

## 1. Route Coverage

### Public routes (router.tsx)

| Family | Routes | Status |
|--------|--------|--------|
| Home | / | Implemented |
| eSignature | /esignature + 5 sub-routes | Implemented |
| Features | /features + 15 sub-routes | Implemented |
| Security | /security + 9 sub-routes | Implemented |
| Solutions | /solutions + 10 sub-routes | Implemented |
| Pricing | /pricing + 7 sub-routes | Implemented |
| Resources | /resources + 7 sub-routes | Implemented |
| Legal | /legal/privacy, /legal/terms, /legal/accessibility | Implemented (3); wildcard → DevPlaceholder |
| eNotary | /enotary + 4 sub-routes | Implemented (Coming Soon) |
| Conversion | /book-a-demo, /verify | Implemented |
| 404 | * | Implemented |

### Auth/Onboarding routes

| Route | Status |
|-------|--------|
| /sign-in | Implemented |
| /create-account | Implemented |
| /verify-email | Implemented |
| /forgot-password | Implemented |
| /reset-password | Implemented |
| /mfa, /mfa/setup, /mfa/recovery | Implemented |
| /accept-invitation | Implemented |
| /auth/account-locked, /auth/link-error | Implemented |
| /onboarding/profile through /complete | Implemented (7 steps) |

### Platform routes (/app/*)

| Route family | Routes | Status |
|--------------|--------|--------|
| Dashboard | /app/dashboard | Implemented |
| Documents | /app/documents + detail (5 tabs) | Implemented |
| Prepare | /app/prepare + 8 steps + confirmation | Implemented |
| Template fields | /app/templates/:id/fields | Implemented |
| Templates | /app/templates + 5 sub-routes | Implemented |
| Contacts | /app/contacts + 6 sub-routes | Implemented |
| Verify | /app/verify | Implemented |
| Workspace admin | /app/workspace + 9 sub-routes | Implemented |
| Settings | /app/settings + 14 sub-routes | Implemented |
| Notifications | /app/notifications | PlatformPlaceholder |
| Legacy team routes | /app/team/* | PlatformPlaceholder (4 routes) |
| Error states | /app/permission-denied, /app/session-expired | Implemented |

### Recipient routes

| Route | Status |
|-------|--------|
| /sign (no requestId) | Implemented — unavailable state |
| /sign/:requestId | Implemented — 7-stage flow |

### Dev routes

| Route | Status |
|-------|--------|
| /dev/design-system | Implemented — not linked publicly |

---

## 2. Working Implementations

**Fully implemented and verifying clean build:**
- All 168 page components compile without TypeScript errors
- All lazy imports resolve correctly
- All context providers load (PlatformContext, PrepareContext, RecipientContext, FieldEditorContext, TemplateContext, WorkspaceAdminContext, ContactContext, OnboardingContext)
- sonner toast system present via `<Toaster>` in main.tsx
- motion library (Motion 12) imported in appropriate pages
- react-hook-form used in auth, onboarding, and forms
- react-dnd used in field editor (FieldsPage.tsx)

---

## 3. Known Inconsistencies and Gaps

### 3.1 Plan ID Inconsistency (Medium Priority)

`src/app/models/index.ts` exports:
```ts
type SubscriptionPlan = "personal" | "professional" | "business" | "business-plus" | "enterprise"
```

`src/app/config/pricing.config.ts` exports:
```ts
type PlanId = "personal" | "business" | "enterprise"
```

The workspace fixture (`MOCK_WORKSPACES`) uses `plan: "professional"` — a value that doesn't exist in `PlanId`.
The `BillingPage.tsx` (C24) uses `LAGDA_PLANS` (PlanId-based) for plan comparison, which doesn't include "professional" or "business-plus".
The `MOCK_SUBSCRIPTION` uses `plan: "professional"` which also won't match `PlanId`.

**Impact:** No crash (TypeScript doesn't enforce at runtime), but the billing comparison table will not highlight the current plan correctly.  
**Recommended fix:** Align `SubscriptionPlan` in models/index.ts with `PlanId` from pricing.config, or add "professional" and "business-plus" to pricing.config and LAGDA_PLANS. Defer to backend decision.  
**Documented in known limitations.**

### 3.2 Missing Documentation (Low Priority — Docs Only)

The following docs referenced in the C25 pre-flight list were not created in prior Commands:
- docs/home-page.md
- docs/solutions-pages.md
- docs/pricing-pages.md
- docs/resources-pages.md
- docs/legal-pages.md
- docs/enotary-pages.md
- docs/public-conversion-paths.md
- docs/forms-and-validation.md
- docs/authentication-flows.md
- docs/onboarding-flows.md
- docs/authentication-security-notes.md
- docs/document-details.md
- docs/document-participants.md
- docs/document-activity.md
- docs/document-evidence.md
- docs/authenticated-document-verification.md
- docs/prepare-document-workflow.md
- docs/field-placement-editor.md
- docs/recipient-signing-experience.md
- docs/contacts-and-participant-directory.md

These pages are implemented in code; documentation was simply not created in the respective commands. The C25 documentation suite (README, service layer, mock data, testing strategy, release checklist, backend handoff, known limitations) covers the cross-cutting concerns. Individual page docs may be added later without code impact.

### 3.3 Legacy Team Routes (Low Priority)

`/app/team/*` routes (4 routes) render `PlatformPlaceholder`. These existed before C23 introduced `/app/workspace/*` as the canonical workspace administration routes. They should eventually redirect to the corresponding `/app/workspace/*` routes but the placeholder behavior is harmless.

### 3.4 Notifications Route

`/app/notifications` renders `PlatformPlaceholder`. The notification system uses sonner toasts and a bell icon in the platform shell; a dedicated notifications page is not implemented. This is a known planned feature.

### 3.5 No Vitest / Test Framework Configured

The project has no test runner configured (no vitest.config.ts, no jest.config.ts). Existing `.test.*` files are from `react-day-picker` in node_modules, not app tests. The C25 testing strategy doc describes what should be added; no tests are created in this command to avoid introducing a framework without verifying the team's preference.

### 3.6 Missing Utility Files

The following utility files do not exist and are created in C25:
- `src/app/utils/logger.ts` — privacy-safe development logger
- `src/app/utils/demo-clock.ts` — deterministic demonstration clock
- `src/app/utils/analytics.ts` — no-op analytics abstraction

The following service utility is created in C25:
- `src/app/services/mock/mock-operation.ts` — cancellable mock operation helper

### 3.7 Error Taxonomy Gap

`src/app/models/index.ts` defines `ApiResponse<T>` (ApiResult | ApiError) but ApiError.code is an untyped `string`. No error code enum or taxonomy exists. Created in C25 as `src/app/models/errors.ts`.

---

## 4. Security and Privacy Audit

### Storage
- **localStorage**: Not used anywhere in app source. All references in source are comments confirming non-use.
- **sessionStorage**: Not used anywhere in app source.
- **Cookies**: Not used.
- **Memory only**: All sensitive state (signatures, field values, session, prep drafts, recipient data) is held in React context memory.

### Network
- **fetch/axios/XHR/WebSocket**: Zero live network calls in app source (confirmed via grep).
- **External assets**: Public pages load locally. No CDN scripts, no analytics pixels, no payment SDK.
- **No API keys**: None in source, none in environment variables.

### URL Safety
- **No private data in URLs**: Verified. Route parameters use opaque IDs (requestId, transactionId, etc.), not email addresses or display names.
- **No href="#"**: Zero instances found.

### eNotary Boundary
- Burgundy (#67023B) is not used in any platform, auth, onboarding, or settings file.
- eNotary is not referenced as active, billable, or enabled in any platform file.
- All platform file references to "eNotary" are comments explicitly excluding it.
- eNotary remains correctly scoped to the public `/enotary/*` family (Coming Soon pages only).

### Console Logging
- Zero `console.log/warn/error` calls in app source (confirmed via grep).
- Development tracing should use the new `src/app/utils/logger.ts` abstraction.

---

## 5. Architecture Observations

### Contexts (State Management)
Eight context providers cover distinct domains:
- `PlatformContext` — session, user, workspace, permissions, notifications
- `PrepareContext` — preparation draft, step navigation
- `FieldEditorContext` — field placement state
- `RecipientContext` — recipient flow state machine
- `TemplateContext` — template library + active template
- `WorkspaceAdminContext` — workspace admin mutations
- `ContactContext` — contact CRUD + picker state
- `OnboardingContext` — onboarding draft

Each is appropriately scoped to its feature domain. No global mutable singleton. No leakage between contexts identified.

### Service Layer
- Thin interface definitions in `src/app/services/interfaces/index.ts` (AuthService, UserService, WorkspaceService, DocumentService, TemplateService, ContactService, VerificationService, NotificationService, BillingService)
- Richer mock implementations in `src/app/services/mock/` (15 service files)
- The interface file is less comprehensive than the mock implementations; some domain services (prepare, field-editor, workspace-admin, settings) have mock implementations but no matching interface definition

### Mock Data
- Twelve mock data files in `src/app/data/mock/`
- IDs use domain-prefixed patterns: `usr_*`, `ws_*`, `mbr_*`, `txn_*`, `tmpl_*`, `contact_*`
- All fixtures are deterministic (no Math.random(), no Date.now())
- `demonstrationOnly: true` pattern used consistently in C24 settings fixtures

### Fixture Consistency Findings
- `MOCK_CURRENT_USER.workspaceId = "ws_mls_001"` ✓ matches `MOCK_CURRENT_WORKSPACE.id`
- `MOCK_SUBSCRIPTION.plan = "professional"` ✗ does not match any `PlanId` in pricing.config.ts
- Workspace admin fixture uses `WS_MLS = "ws_mls_001"` ✓ matches workspace fixture
- Member count: `MOCK_CURRENT_WORKSPACE.memberCount = 6` matches 8 members in workspace-admin fixture (6 active + 1 suspended + 1 deactivated — reasonable)
- Billing fixture (`FIXTURE_BILLING_ACCOUNT`): seats 10 total / 6 active — aligns with workspace member count

---

## 6. Performance Observations

### Bundle Splitting
- All platform pages are lazy-loaded (lazy + Suspense)
- Public pages are also lazy-loaded via PublicLayout Outlet
- Separate chunks for: auth, onboarding, public families, platform, prepare, recipient, templates, contacts, workspace, settings

### Large Dependencies
- `@mui/material` + `@emotion/react/styled`: Heavy (~150KB gzipped). Used by some public pages (Figma imports). Should be audited for replacement post-launch.
- `recharts`: ~45KB gzipped. Used in dashboard analytics widgets.
- `react-dnd` + `react-dnd-html5-backend`: ~20KB. Used only in field editor.
- `motion` (12.x): ~30KB. Used for animations.
- `canvas-confetti`: Small, used in onboarding completion.
- `cmdk`: Used in command palette / search.

### Unused-Looking Dependencies
- `react-popper` and `@popperjs/core`: May be redundant if Radix UI handles its own positioning.
- `react-slick`: Carousel. May be used by public pages; verify before removing.
- `react-responsive-masonry`: May be used by resources/gallery views.

---

## 7. Accessibility Observations

From code inspection (no automated tooling run; see testing strategy for tooling recommendations):
- `role="switch" aria-checked` present on toggle controls (settings pages)
- `role="progressbar" aria-valuenow/min/max` present on usage bars (UsagePage.tsx)
- `role="alert"` used for validation messages in auth and settings forms
- `role="status"` used for success messages
- `<main id="main-content">` landmark in platform pages
- One `<h1>` per page pattern established in settings shell
- Icon-only buttons in platform shell include `aria-label`
- Dialog focus management: Radix UI Dialog handles focus containment and restoration
- Keyboard navigation: Radix UI primitives handle keyboard interactions

Known gaps (flagged for formal a11y audit):
- Field editor (FieldsPage.tsx) uses react-dnd drag-and-drop — keyboard alternative needed
- Signature pad drawing area needs keyboard/text-input alternative
- Permission matrix table (RolesPage.tsx) needs review at narrow viewports

---

## 8. Responsive Observations

- Settings shell (SettingsShell.tsx) uses `max-width: 1100px` with a two-column layout that should stack at narrow viewports
- PlatformLayout uses CSS flex/grid sidebar + main
- Public pages were built with Tailwind responsive classes
- No full-page horizontal scroll issues identified in static analysis
- Mobile navigation in public shell: present via hamburger pattern
- Field editor: wide canvas — requires specific mobile treatment (documented)
- Permission matrix: wide table — overflow-x: auto container should be present

---

## 9. Terminology Audit

Potentially problematic terms found in source:
- `TransactionDetailPage.tsx:1154` — "legally certified audit outputs" — needs review
- Various "securely" references in security-adjacent public pages — acceptable in informational context with appropriate qualifiers
- `verified` in VerificationResult.outcome — outcome value only, not a legal claim, acceptable
- No "tamper-proof", "fraud-proof", "immutable", "blockchain" found in source

---

## 10. Dead Code and Redundancy

- `src/imports/` directory: Contains large Figma-imported design components. Used by specific public pages. Not dead code, but adds to bundle.
- `src/New folder/`: Empty directory — should be removed
- `PlatformPlaceholder` used for 5 routes: notifications, team/*, team/members, team/roles, team/invitations — these are known placeholders, not dead code
- `DevPlaceholder` used for legal/* wildcard — intentional

---

## 11. Build Status

Last verified clean build: commit 477f681  
TypeScript errors: 0  
Build time: 2.97s  
All 15 settings chunks present in dist/assets/

---

## 12. Summary Scorecard

| Area | Status | Notes |
|------|--------|-------|
| Route coverage | ✓ Complete | 5 placeholder routes known |
| TypeScript | ✓ Clean | 0 errors at 477f681 |
| eNotary boundary | ✓ Clean | No platform violations |
| Network calls | ✓ Clean | Zero live requests |
| Storage | ✓ Clean | No localStorage/sessionStorage writes |
| href="#" | ✓ Clean | Zero instances |
| Console logging | ✓ Clean | Zero in app source |
| Plan ID inconsistency | ⚠ Medium | SubscriptionPlan vs PlanId mismatch |
| Test framework | ⚠ Not configured | See testing strategy |
| Missing docs | ⚠ ~20 pre-C25 docs | Covered by C25 doc suite |
| Utility files | ⚠ Missing logger/clock/analytics | Created in C25 |
| Error taxonomy | ⚠ Untyped codes | Created in C25 |
| Legacy team routes | ℹ Low priority | Placeholder, harmless |
| Notifications page | ℹ Planned | PlatformPlaceholder |
