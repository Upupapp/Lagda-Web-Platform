# LAGDA Brand Implementation Log
> Command 35 (BRAND) — 2026-07-16/17
> Records all brand system additions and fixes applied during the BRAND procedure.

---

## Session: Command 35 BRAND — 2026-07-16/17

### 1. EmptyState.tsx — Rewritten to Pure Inline Styles

**File:** `src/app/components/ui/EmptyState.tsx`  
**Change type:** Bug fix (rule violation)  
**Reason:** Component used `cn()` from shadcn/ui and Tailwind class strings (`"flex flex-col items-center justify-center py-16 px-6 text-center"`). This violates the LAGDA hard rule: inline styles only in JSX, Tailwind classes never in JSX components.  
**Action:** Rewrote entire component to pure inline styles. Removed `className` prop. Kept all existing props (`icon`, `title`, `description`, `action`, `tone`).  
**Impact:** Non-breaking if no callers used the `className` prop directly.

---

### 2. BrandToast.tsx — Created (LAGDA Sonner Wrapper)

**File:** `src/app/components/brand/BrandToast.tsx` (new)  
**Reason:** `src/app/components/ui/sonner.tsx` depends on `next-themes` (`import { useTheme } from "next-themes"`) which is not installed in the LAGDA project. Using it would cause a runtime crash. Created a standalone wrapper that imports directly from `"sonner"` without any theme dependency.  
**Exports:**
- `BrandToaster` — Toaster component; mount once in `main.tsx`
- `toastSuccess(message, description?)` — green surface toast
- `toastError(message, description?)` — red surface toast, 6s duration
- `toastInfo(message, description?)` — azure surface toast
- `toastWarning(message, description?)` — amber surface toast
- `toast` — raw Sonner toast (re-exported for complex cases)
- `ExternalToast` — type re-export from sonner

---

### 3. main.tsx — BrandToaster Mounted

**File:** `src/main.tsx`  
**Change:** Added `import { BrandToaster }` and `<BrandToaster />` after `<RouterProvider>` inside the provider tree.  
**Reason:** Sonner was installed (v2.0.3) but the Toaster was never mounted. All `toast()` calls would silently fail.

---

### 4. PageError.tsx — Created

**File:** `src/app/components/platform/PageError.tsx` (new)  
**Exports:**
- `PageError` — page-level error state with 6 error kinds (generic, not-found, permission-denied, session-expired, service-unavailable, empty-results). Has `role="alert"`, branded typography, optional `onRetry` button (Azure), and "Return to Dashboard" fallback link.
- `SectionError` — compact inline error strip. Red surface (#FEE2E2, border #FECACA). Optional retry button. Optional `compact` prop.

---

### 5. PlatformLayout.tsx — SessionInitializing Upgraded

**File:** `src/app/layouts/PlatformLayout.tsx`  
**Change:** `SessionInitializing` function replaced raw spinner div with `<LagdaLoader mode="fullscreen" theme="dark" message="Preparing your secure workspace" showWordmark />`.  
**Reason:** The session initialization screen is the user's first impression of the platform. It should show the branded loading sequence, not a plain spinner.

---

### 6. PlatformLayout.tsx — Page Entrance Animation Applied

**File:** `src/app/layouts/PlatformLayout.tsx`  
**Change:** Wrapped `<Outlet />` in `<div key={location.pathname} className="lagda-page-enter">`. Added `useLocation` import.  
**Reason:** Route changes previously had no visual transition. The `key` prop forces a DOM remount on each navigation, which restarts the `lagda-page-enter` CSS animation.

---

### 7. theme.css — Page Entrance Keyframe Added

**File:** `src/styles/theme.css`  
**Change:** Added `@keyframes lagda-page-enter`, `.lagda-page-enter` rule, and `@media (prefers-reduced-motion: reduce)` override after the `@layer base` block.  
**Animation:** `opacity: 0 → 1`, `translateY(4px) → translateY(0)`, 220ms, cubic-bezier(0,0,0.2,1).

---

### 8. AppContentLayout.tsx — FormCard System Added

**File:** `src/app/components/platform/AppContentLayout.tsx`  
**Added exports:**
- `FormCard` — standard form/settings container (white, 1px #E2E8F0 border, radius 12, padding 24)
- `FormCardHeading` — title + optional description block for use at the top of a FormCard
- `FormCardDivider` — horizontal rule between FormCard sections
- `FormField` — field wrapper with visible label, required indicator, optional hint and error text

---

### 9. Barrel Exports Updated

**File:** `src/app/components/platform/index.ts`  
**Added:** `FormCard`, `FormCardHeading`, `FormCardDivider`, `FormField`, `PageError`, `SectionError`

**File:** `src/app/components/brand/index.ts`  
**Added:** `BrandToaster`, `toastSuccess`, `toastError`, `toastInfo`, `toastWarning`, `toast`, `ExternalToast`

---

### 10. Design System Documented

**File:** `docs/design-system.md`  
**Added sections:**
- §34 FormCard Standard
- §35 PageError and SectionError
- §36 BrandToaster
- §37 Page Entrance Animation

---

## Pre-existing Brand Foundation (prior commands)

| Component | Command | Notes |
|---|---|---|
| `LagdaLogo` | C3 | 6 variants, all contexts covered |
| `LagdaLoader` | C11 | fullscreen / inline / button modes; §11 animation sequence |
| `Button` variants | C3 | Azure / eNotary / Navy / Ghost / Destructive |
| `Badge` variants | C3 | Azure / Burgundy / Success / Warning / Error / Gold |
| `StatusChip` | C5 | Document transaction statuses |
| `ComingSoonBadge` | C3 | eNotary surfaces |
| `EmptyState` | C3 | Fixed C35 (Tailwind violation) |
| `VerificationId` | C7 | Geist Mono, monospaced ID display |
| `CapabilityGuard` | C35 | Route-level capability gating |
| `CapabilityUnavailable` | C35 | Blocked capability display |
| Design tokens | C3 | Full token system in theme.css |

---

## Known Deferred Brand Work

| Item | Priority | Notes |
|---|---|---|
| SkeletonBlock on all list views | P1 | Each module page needs per-row skeleton during data load |
| PageError on core workflow failures | P1 | Document prepare / sign / track error paths |
| Auth screen inline styles cleanup | P2 | Auth pages predate inline-styles rule |
| Figma import page migration | P3 | 14 legacy screens; full migration pass |
| Dark mode theme | P3 | Tokens defined; platform components not dark-mode tested |
| Self-hosted fonts | P2 | Currently loaded from Google Fonts CDN |
| Favicon package | P2 | Not finalized |
| OG image template | P3 | Not built |
