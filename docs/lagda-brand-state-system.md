# LAGDA Brand State System
> Established: Command 35 (BRAND) — 2026-07-16
> Status: Implemented for all 22 capabilities

---

## Overview

Every platform screen must communicate one clear state at all times. Users must never see a blank screen, a raw JS error, or an unexplained spinner. This document defines the canonical state taxonomy and required components for each state category.

---

## State Taxonomy

### 1. Loading

The system is fetching, processing, or initializing.

| Scope | Component | Notes |
|---|---|---|
| App initialization | `LagdaLoader` (fullscreen, dark) | Shown by `SessionInitializing` in PlatformLayout |
| Route/page load | `LagdaLoader` (inline, light) | Shown by `PlatformPageLoader` in Suspense fallback |
| Section data fetch | `SkeletonBlock` | 1–4 rows of content-shaped skeleton |
| Button action | `LagdaLoader` (button, dark) | Inside the active button, disables the button |
| Background sync | No UI required | Silent refresh; show nothing unless it takes >3s |

**Rules:**
- Minimum skeleton duration: 200ms (avoids flash for fast responses)
- Never show a raw spinner without `aria-label`
- Loading state must be visually distinct from empty state

---

### 2. Error

Something went wrong. The user needs to know and ideally recover.

| Scope | Component | Notes |
|---|---|---|
| Page-level failure | `PageError` | Full page, centered, with optional retry button |
| Section-level failure | `SectionError` | Compact inline strip inside the affected section |
| Field validation | `FormField` `error` prop | Red text below field with `role="alert"` |
| Toast notification | `toastError()` | Transient; for action failures (send, delete, save) |

**PageError kinds (choose the most specific):**

| Kind | When to use |
|---|---|
| `generic` | Unknown/unexpected errors |
| `not-found` | Document/record/workspace not found |
| `permission-denied` | User lacks required role or permission |
| `session-expired` | Auth token expired; redirect to sign-in |
| `service-unavailable` | Backend 500/503 or network timeout |
| `empty-results` | Search/filter returned no matches |

**Rules:**
- Error surfaces must use `role="alert"` for screen readers
- Never display raw error messages/stack traces to users
- Always pair error state with a recovery path (retry, back to dashboard, or contact support)
- Error red (#DC2626) must not appear on non-error surfaces

---

### 3. Empty

Data exists but there's nothing to show — usually a first-run or filtered-to-zero state.

| Scope | Component | Notes |
|---|---|---|
| Module list (first run) | `EmptyState` | Icon + title + description + primary CTA |
| Module list (filtered) | `EmptyState` (muted) | Softer tone; CTA = "Clear filters" |
| Table row count = 0 | `EmptyStateLayout` | Centered in table area |
| Search no results | `PageError` kind=`empty-results` | When search returns nothing |

**Rules:**
- Empty state must always have a title and at least a one-line description
- First-run empty state must have a primary CTA (e.g., "Prepare your first document")
- Filtered-empty state must have a "Clear filters" or "Reset search" action
- Never use `EmptyState` for error states — they have separate components

---

### 4. Success

An action completed correctly.

| Scope | Component | Notes |
|---|---|---|
| Transient confirmation | `toastSuccess()` | 4s auto-dismiss; bottom-right |
| In-page confirmation | Green surface panel | `background: #DCFCE7; border: 1px solid #86EFAC` |
| Status chip | `StatusChip` or `Badge` variant=`success` | For record-level completed states |
| Verification confirmed | Dedicated `VerificationId` component + green surface | Used in public verification flow |

**Rules:**
- Success toasts auto-dismiss; do not use for states the user needs to act on
- "Completed" and "Verified" are separate states — do not conflate them
- Success surfaces must use green (#16A34A), never Azure (#0078D4)

---

### 5. Offline / Connectivity Lost

Network is unavailable or the backend is unreachable.

| Scope | Notes |
|---|---|
| Global connection lost | Future: banner at top of platform shell ("You appear to be offline") |
| Per-request failure | `SectionError` with retry button |
| Auth request failure | `PageError` kind=`service-unavailable` |

> **Note:** Frontend-only phase has no real-time connectivity detection. Offline state is approximated via request failure. Dedicated offline detection is deferred to backend integration phase.

---

### 6. Capability Unavailable

The requested feature is not available in the current launch profile.

| Scope | Component | Notes |
|---|---|---|
| Route-level block | `CapabilityGuard` → `CapabilityUnavailable` | Wraps all automation routes in router.tsx |
| Dashboard widget | Conditional render via `useCapability()` | Widget hidden when `available === false` |
| Nav item | Feature flag check in PlatformSidebar | Item hidden, not disabled |
| Search result / command | `isAutomationSearchEnabled()` | Results omitted from global search |

**CapabilityUnavailable outcome messages:**

| Outcome | Title | Notes |
|---|---|---|
| `deferred` | Feature Deferred | Not yet built; no ETA |
| `future-product` | Coming Soon | eNotary disclaimer required |
| `development-only` | Development Preview | For internal test profiles only |
| `profile-restricted` | Not Available on Your Plan | Upgrade path message |
| `feature-flag-off` | Feature Disabled | Admin/config controlled |
| `permission-denied` | Access Restricted | Contact workspace admin |

---

## State per Capability

### Core Capabilities (launch-core)

These capabilities must implement all 4 states: loading, error, empty, success.

| Capability | Loading | Error | Empty | Success |
|---|---|---|---|---|
| Workspace / Auth | `LagdaLoader fullscreen` | `PageError session-expired` | N/A | Toast or redirect |
| Document Preparation | `SkeletonBlock` (field list) | `PageError generic` + retry | `EmptyState` "Prepare your first document" | `toastSuccess` + status chip |
| Signing Workflow | `SkeletonBlock` (recipient list) | `PageError service-unavailable` | `EmptyState` "No recipients yet" | Completion animation + `toastSuccess` |
| Document Tracking | `SkeletonBlock` (table rows) | `SectionError` + retry | `EmptyState` "No documents yet" | Status chip updates |
| Document Inbox | `SkeletonBlock` | `PageError generic` | `EmptyState` "Your inbox is empty" | `toastSuccess` "Signed and submitted" |
| Public Verification | `LagdaLoader inline` | `PageError not-found` | N/A | Verified panel + gold accent |
| Team Management | `SkeletonBlock` | `PageError permission-denied` | `EmptyState` "Invite your first team member" | `toastSuccess` "Invitation sent" |
| Settings | N/A (static) | `SectionError` | N/A | `toastSuccess` "Changes saved" |

### Launch-Supporting Capabilities

| Capability | Loading | Error | Empty |
|---|---|---|---|
| Templates | `SkeletonBlock` | `SectionError` | `EmptyState` "Create your first template" |
| Contacts | `SkeletonBlock` | `SectionError` | `EmptyState` "Add your first contact" |
| Notifications | `SkeletonBlock` | `SectionError` | `EmptyState` "No notifications" |
| Reports | `SkeletonBlock` | `PageError generic` | `EmptyState` "No data yet" |

### Gated / Unavailable Capabilities

| Capability | State |
|---|---|
| Workflow Automation | `CapabilityUnavailable` (enterprise-preview) |
| eNotary | `CapabilityUnavailable` (future-product) with legal disclaimer |

---

## Implementation Notes

### Combining States

A component may need multiple states layered:
1. Loading → show `SkeletonBlock`
2. Error → replace with `SectionError` or `PageError`
3. Empty → replace with `EmptyState`
4. Data → render data

Only one state should be visible at a time; remove the others when the state resolves.

### Accessibility

- All loading states: `role="status"` + `aria-live="polite"`
- All error states: `role="alert"`
- Success toasts: Sonner handles `aria-live` automatically
- Empty states: standard heading + description (no special ARIA needed)

### Reduced Motion

All state animations (page entrance, skeleton pulse, loader) respect `prefers-reduced-motion: reduce` via the global override in `theme.css`.
