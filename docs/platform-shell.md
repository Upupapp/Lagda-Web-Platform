# LAGDA Platform Shell — Architecture Reference

Command 12 · Commit: TBD

---

## 1. Overview

The authenticated customer platform shell wraps all `/app/*` routes in a persistent, permission-aware layout. It provides:

- **Auth guard** — redirects unauthenticated users to `/sign-in?returnTo=...` with safe returnTo validation
- **Desktop sidebar** — 240px expanded / 60px collapsed, with workspace switcher, nav, Prepare CTA, and user menu
- **Mobile navigation** — fixed 56px top bar + 280px slide-in drawer with focus trap
- **Platform header** — sticky 52px desktop top bar with Ctrl+K search, notifications, and help link
- **Global search** — Ctrl+K overlay searching documents, templates, contacts, and help
- **Workspace switcher** — in-sidebar dropdown to switch between workspaces
- **Notification panel** — bell icon with unread badge, mark-read, 5 recent entries
- **User menu** — initials avatar, role, profile/security/billing/settings links, sign-out
- **Suspense** — every lazy page wrapped in Suspense; platform shell itself is synchronous in the bundle
- **Skip link** — `#plat-main` for keyboard and screen reader users

---

## 2. Provider Tree

```
main.tsx
└── LagdaLoadingProvider
    └── PlatformProvider          ← in-memory session, mock data, permission model
        └── RouterProvider
            └── /app/* → PlatformLayout (auth guard)
                ├── PlatformSidebar  (desktop ≥768px)
                ├── MobileNav        (mobile <768px)
                ├── PlatformHeader   (desktop only)
                └── <Outlet>         (Suspense-wrapped lazy pages)
```

---

## 3. Session State Machine

```
initializing (350ms)
    ↓ timeout (no restore)
unauthenticated  ←── signOut() / guard redirect
    ↓ signIn()
authenticated
    ↓ expireSession()
expired  →  redirect to /sign-in?returnTo=... with state.reason="expired"
```

State is stored in `PlatformContext` (React Context). No localStorage, no cookies, no real tokens.

---

## 4. Permission Model

| Role | Key Permissions |
|------|----------------|
| `owner` | All 17 permissions |
| `administrator` | All except manage_billing, manage_api, manage_webhooks |
| `billing_administrator` | view_dashboard, view/manage_billing, view_usage |
| `security_administrator` | view_dashboard, manage_security, view_audit |
| `template_administrator` | view_documents, prepare, manage_templates, manage_contacts |
| `sender` | prepare_documents, manage_contacts, verify_documents |
| `reviewer` | view_documents, verify_documents |
| `viewer` | view_dashboard, view_documents |
| `auditor` | view_dashboard, view_documents, view_audit |

**Mock user:** Ana Reyes / Mabini Legal Solutions / role: `owner` (all permissions active)

---

## 5. Feature Flags

All 13 flags are `true` in the C12 demo. Override in `PlatformContext.tsx → DEFAULT_PLATFORM_FLAGS`.

| Flag | Controls |
|------|---------|
| `dashboardEnabled` | /app/dashboard |
| `documentsEnabled` | /app/documents |
| `prepareFlowEnabled` | Prepare Document CTA + /app/documents/new |
| `templatesEnabled` | /app/templates |
| `contactsEnabled` | /app/contacts |
| `verificationEnabled` | /app/verify |
| `notificationsEnabled` | Bell + /app/notifications |
| `teamEnabled` | /app/team |
| `billingEnabled` | Billing in settings |
| `integrationsEnabled` | /app/settings/api |
| `apiEnabled` | API settings |
| `webhooksEnabled` | Webhooks |
| `developmentPlaceholdersEnabled` | Show PlatformPlaceholder for deferred routes |

---

## 6. Component Inventory

| File | Purpose |
|------|---------|
| `src/app/context/PlatformContext.tsx` | Session, user, workspaces, notifications, permissions, flags |
| `src/app/layouts/PlatformLayout.tsx` | Auth guard + shell wiring |
| `src/app/components/platform/PlatformSidebar.tsx` | Desktop sidebar (240/60px toggle) |
| `src/app/components/platform/MobileNav.tsx` | Mobile top bar + drawer |
| `src/app/components/platform/WorkspaceSwitcher.tsx` | Workspace dropdown in sidebar |
| `src/app/components/platform/PlatformHeader.tsx` | Desktop sticky top bar |
| `src/app/components/platform/UserMenu.tsx` | Avatar dropdown with links + sign-out |
| `src/app/components/platform/NotificationMenu.tsx` | Bell + notification panel |
| `src/app/components/platform/SearchDialog.tsx` | Ctrl+K global search overlay |
| `src/app/components/platform/PageHeader.tsx` | Reusable in-page header (title, breadcrumbs, actions) |
| `src/app/components/platform/AppContentLayout.tsx` | Layout primitives (AppContent, StatCard, EmptyStateLayout, etc.) |
| `src/app/config/platform.nav.ts` | Nav configuration (PRIMARY_NAV, UTILITY_NAV, SETTINGS_NAV) |
| `src/app/data/mock/workspaces.ts` | MOCK_CURRENT_USER (Ana Reyes), MOCK_WORKSPACES, MOCK_SUBSCRIPTION |
| `src/app/services/mock/workspace.service.ts` | MockWorkspaceService |
| `src/app/services/mock/notification.service.ts` | MockNotificationService (mark-read in session) |
| `src/app/services/mock/search.service.ts` | MockSearchService (Ctrl+K) |

---

## 7. Accessibility

- Skip link to `#plat-main` (visible on focus)
- All interactive elements have `aria-label` or visible text
- Sidebar collapsed state: `aria-expanded`, tooltips via `title`
- WorkspaceSwitcher: `role="listbox"`, `aria-selected`
- UserMenu, NotificationMenu: `role="menu"` / `role="dialog"`, Escape to close
- SearchDialog: `role="combobox"`, Arrow key navigation, `aria-activedescendant`
- MobileNav drawer: focus trap, body scroll lock, `aria-modal`
- Reduced motion: all `transition` and `animation` statements respect `@media (prefers-reduced-motion: reduce)`

---

## 8. Responsive Breakpoints

| Screen | Layout |
|--------|--------|
| `≥768px` | Sidebar (240px/60px collapsed) + content | 
| `<768px` | Fixed top bar (56px) + slide-in drawer (280px) |

---

## 9. eNotary Boundary

eNotary is NOT present in the platform shell. The nav config (`platform.nav.ts`) has no eNotary item. No eNotary route exists under `/app`. The "Coming Soon" disclaimer must be shown only on the public `/enotary` pages. Burgundy (`#67023B`) is not used anywhere in the platform shell.

---

## 10. Security Properties

- `returnTo` parameter is validated: only `/app/*` paths accepted; any other value defaults to `/app/dashboard`
- No passwords stored, logged, or passed to analytics
- Session is in-memory only; clears on page reload or `signOut()`
- No real tokens or credentials
- No eNotary as an active module

---

## 11. Frontend-Only Restrictions (inherited from C12 spec)

- No production backend wiring
- No real authentication (Firebase, Supabase, JWT, etc.)
- No real email/SMS/OTP delivery
- No real PDF signing, identity verification, or payment processing
- All data is mock; all services simulate network delay
