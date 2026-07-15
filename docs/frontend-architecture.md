# LAGDA Frontend Architecture
> Established: 2026-07-15 — Command 2 (Architecture and Route Foundation)

---

## 1. Framework and Router

| Item | Value |
|---|---|
| Framework | React 18.3.1 |
| Build tool | Vite 6.3.5 + @vitejs/plugin-react 4.7.0 |
| Router | react-router 7.13.0 (`createBrowserRouter` + `RouterProvider`) |
| Styling | Tailwind CSS 4.1.12 + custom CSS-in-JS (globalOverrides in App.tsx) |
| UI components | shadcn/ui (40+ Radix UI primitives, pre-installed) |
| TypeScript | Via Vite (no explicit tsconfig.json; tsc in strict mode not yet configured) |
| Package manager | npm (pnpm intended; see baseline) |

**Routing approach:** `createBrowserRouter` with `RouterProvider`. Real browser URL routing. All routes serve `index.html` via Vite's SPA fallback in dev and the `public/_redirects` rule in production.

---

## 2. Application Boundaries

```
src/
  main.tsx                    ← Router entry point (RouterProvider)
  router.tsx                  ← createBrowserRouter — all route definitions
  app/
    App.tsx                   ← Public portal shell (state machine + URL sync)
    config/
      app.config.ts           ← Global application configuration and feature flags
      routes.ts               ← Centralized route metadata registry (200+ routes)
    models/
      index.ts                ← All typed frontend models
    services/
      interfaces/
        index.ts              ← Service contracts (AuthService, DocumentService, etc.)
      mock/
        delay.ts              ← Simulated network latency for mock services
        session.service.ts    ← MockAuthService example
    data/
      mock/
        index.ts              ← Typed mock data (fictional Philippine organizations)
    layouts/
      PublicLayout.tsx        ← Public portal shell (scroll restoration, future footer)
      AuthLayout.tsx          ← Auth pages shell (no marketing nav)
      PlatformLayout.tsx      ← Customer platform shell (stub)
    pages/
      public/
        NotFound.tsx          ← 404 page
      auth/
        SignIn.tsx            ← Auth page stub
      platform/
        PlatformIndex.tsx     ← Platform landing stub
      shared/
        DevPlaceholder.tsx    ← Shared dev placeholder for unbuilt routes
    components/
      figma/                  ← ImageWithFallback (Figma Make helper)
      ui/                     ← Full shadcn/ui component library (unchanged)
  imports/                    ← Figma Make exports (14 screens, read-only)
  styles/                     ← CSS (index, fonts, tailwind, theme, globals)
```

---

## 3. Public Portal Route Structure

All public routes nest under `path: "/"` with `element: <PublicLayout />`.

### Implemented (Figma screens routed through App.tsx)

| URL | Screen |
|---|---|
| `/` | → redirect to `/esignature` |
| `/esignature` | eSignature Overview |
| `/esignature/core-workflow` | eSignature Core Workflow |
| `/esignature/verification-and-audit` | Verification & Audit |
| `/esignature/advanced-capabilities` | Advanced Capabilities |
| `/esignature/templates-and-branding` | Templates & Branding |
| `/esignature/team-and-enterprise` | Team & Enterprise |
| `/security` | Security Overview |
| `/security/trust-center` | Trust Center |
| `/solutions` | Solutions — All |
| `/solutions/lawyers` | Solutions — Lawyers |
| `/pricing` | Pricing — Main |
| `/pricing/compare` | Pricing — Compare Plans |
| `/resources` | Resources — Guides |
| `/resources/faq` | Resources — FAQ |

### Defined with DevPlaceholder (planned, not yet built)

eNotary (5 routes), Features (16 routes), Solutions (8 remaining), Security sub-pages (7), Pricing sub-pages (5), Resources sub-pages (5), Help, Contact, Service Status, Legal (3 routes).

Full list: see `src/app/config/routes.ts`.

---

## 4. Authentication Route Structure

All auth routes are top-level (not nested under public layout) using `<AuthLayout>` wrapper.

| URL | Status |
|---|---|
| `/sign-in` | Stub |
| `/create-account` | Stub |
| `/verify-email` | Stub |
| `/forgot-password` | Stub |
| `/reset-password` | Stub |
| `/mfa` | Stub |
| `/invitation` | Stub |
| `/onboarding` | Stub |

Auth layout intentionally excludes the public marketing nav.

---

## 5. Customer-Platform Route Structure

All platform routes nest under `path: "/app"` with `element: <PlatformLayout />`.

| URL | Status |
|---|---|
| `/app` | PlatformIndex stub |
| `/app/*` | DevPlaceholder stub |

Planned platform routes (all returning `planned` status in registry):
- `/app/documents`, `/app/documents/:transactionId/*`
- `/app/prepare/*`
- `/app/templates`, `/app/templates/:templateId/*`
- `/app/contacts`, `/app/contacts/:contactId`
- `/app/verify`, `/app/notifications`, `/app/workspaces`, `/app/team`
- `/app/settings/*` (profile, security, notifications, branding, billing, usage, integrations, api, webhooks)

---

## 6. Layout Hierarchy

```
RouterProvider
├── AuthLayout             ← /sign-in, /create-account, /verify-email, etc.
│   └── [AuthPage]
│
├── PlatformLayout         ← /app, /app/*
│   └── Outlet → [PlatformPage]
│
└── PublicLayout           ← /, /esignature/*, /security/*, etc.
    └── Outlet
        ├── App            ← Handles implemented sections via state machine
        ├── DevPlaceholder ← Planned public routes not yet built
        └── NotFound       ← path: "*"
```

**Key design decision:** `App.tsx` acts as the public portal shell. It contains `MainNav`, `SubNav`, all global CSS overrides, and the section/tab state machine. It was not refactored in Command 2 to minimize risk to the working UI. The navigation components will be extracted into `src/app/components/nav/` in Command 3.

---

## 7. URL ↔ State Synchronization (App.tsx)

`App.tsx` bridges the React Router URL and its internal state machine using two effects:

**State → URL** (user-initiated navigation):
- Fires when `section`, `esigTab`, `securityTab`, `pricingTab`, `resourcesTab`, or `solutionsTab` changes
- Computes the canonical URL with `stateToPath()` and calls `navigate(path)`
- Skips `navigate` if the computed path already equals `location.pathname`

**URL → State** (browser back/forward, direct links):
- Fires when `location.pathname` changes
- Parses path with `pathToState()` and calls only the setters that would change
- React bails out of re-render if setter is called with the same value (no loop)

**Initial state:**
- `useState()` calls use `initialStateFromUrl()` (reads `window.location.pathname` synchronously)
- Prevents the state→URL effect from emitting a navigate call on first mount

---

## 8. Navigation Configuration

Navigation configuration currently lives inside `App.tsx` as `NAV_DEFS` (the array of top-level nav items with dropdown definitions). It is not yet extracted to `src/app/config/nav.config.ts`.

**Reason:** Extracting `NAV_DEFS` requires also updating all dropdown `onItemClick` callbacks in `MainNav`. This will be done in Command 3 when nav components are extracted.

**Navigation connection to routes:** Dropdown items are connected to the router via the state sync described in Section 7. When a dropdown item is clicked, it sets section/tab state, which triggers the State→URL effect to `navigate()` to the correct URL.

**eNotary navigation:** The eNotary nav item correctly shows "Coming Soon" badge. eNotary dropdown items all have `isComingSoon: true` and navigate to `/enotary/*` routes which render `DevPlaceholder` with the mandatory legal disclaimer.

---

## 9. Route Metadata Strategy

Centralized in `src/app/config/routes.ts`.

Each route entry includes:
- `path` — canonical URL path
- `title` — page title (for future `<title>` tag management)
- `description` — meta description (for future SEO, Command 11)
- `breadcrumb` — human-readable label
- `section` — navigation group
- `product` — product classification (`esignature`, `enotary`, `verification`, `platform`, `shared`)
- `layout` — layout type (`public`, `auth`, `platform`)
- `requiresAuth` — whether route requires authentication
- `isPublic` — whether route is accessible without login
- `isIndexable` — whether route should be indexed by search engines
- `status` — `implemented`, `partial`, or `planned`
- `analyticsName` — stable analytics identifier (Command 11)
- `canonicalPath` — optional canonical URL override

**Note:** eNotary routes have `isIndexable: false` — they should not appear in search engines until accreditation is confirmed.

---

## 10. Shared Model Strategy

All frontend models are in `src/app/models/index.ts`.

### Model areas established
- `Paginated<T>`, `SortState`, `FilterState` — collection utilities
- `ApiResult<T>`, `ApiError`, `ApiResponse<T>` — service response contracts
- `NavItem` — navigation item shape
- `UserSummary`, `UserRole`, `WorkspaceSummary`, `WorkspaceMembership` — identity
- `TransactionStatus`, `TRANSACTION_STATUS_LABELS`, `DocumentTransactionSummary` — documents
- `ParticipantRole`, `ParticipantStatus`, `AuthMethod`, `ParticipantSummary` — participants
- `TemplateSummary` — templates
- `ContactSummary` — contacts
- `VerificationOutcome`, `VerificationResult` — verification
- `NotificationType`, `NotificationSummary` — notifications
- `SubscriptionPlan`, `BillingCycle`, `PLAN_LABELS`, `SubscriptionSummary`, `UsageSummary` — billing
- `MockSession`, `EMPTY_SESSION` — frontend mock session

### Design principles
- No visual colors or CSS in models
- Status labels are separate from status identifiers (`TRANSACTION_STATUS_LABELS`)
- Models are intentionally not over-specified — additional fields added per screen

---

## 11. Service-Contract Strategy

Service interfaces in `src/app/services/interfaces/index.ts`.

Established interfaces: `AuthService`, `UserService`, `WorkspaceService`, `DocumentService`, `TemplateService`, `ContactService`, `VerificationService`, `NotificationService`, `BillingService`.

**Pattern:**
1. Define `interface XxxService { ... }`
2. Implement `class MockXxxService implements XxxService { ... }`
3. Export singleton: `export const mockXxxService: XxxService = new MockXxxService()`
4. At integration time: replace mock with `class RealXxxService implements XxxService`

Example implementation: `src/app/services/mock/session.service.ts` — `MockAuthService`.

Mock delay utility: `src/app/services/mock/delay.ts` — respects `APP_CONFIG.mockDelayMs`.

---

## 12. Mock-Data Strategy

Location: `src/app/data/mock/index.ts`

### Conventions
- All persons, organizations, emails, and document details are **fictional**
- Philippine-relevant scenarios (property deeds, legal retainers, LGU workflows)
- Stable IDs (prefixed: `txn_`, `tmpl_`, `con_`, `notif_`, `usr_`, `ws_`)
- Realistic ISO 8601 dates relative to 2026-07-15
- Cover all `TransactionStatus` variants across fixture set
- No competitor screenshots or private real identities

### Fictional organizations
- `Northbridge Legal` — law firm (Business plan)
- `Mabini Business Services` — accounting / corporate services (Professional)
- `Harborline Properties` — real estate developer (Business Plus)
- `Sampaguita Learning Institute` — education (Personal)

### What mock data does NOT do
- Imply backend services are operational
- Use real verification IDs from a live system
- Include real API responses or tokens

---

## 13. Application Configuration

`src/app/config/app.config.ts` — `APP_CONFIG` (const, typed).

Key flags:
- `mockMode: true` — all services return mock data
- `mockDelayMs: 400` — simulated API latency
- `features.enotaryWaitlist: true` — waitlist visible
- `features.publicVerification: false` — not yet built
- `features.platformDashboard: false` — not yet built
- `features.devPlaceholders: true` — unbuilt routes show DevPlaceholder
- `analytics.enabled: false` — analytics off during development
- `legal.enotaryDisclaimer` — canonical eNotary disclaimer string

No secrets, tokens, API keys, or production credentials in this file.

---

## 14. State Management Approach

**Current:** React local state only (`useState`, `useRef`, `useCallback`, `useEffect`).

No Redux, Zustand, or React Context in use. This is intentional — the existing state machine in App.tsx is self-contained and working. Additional state management will be added if and when authenticated platform screens require cross-component shared state.

---

## 15. Loading and Error State Conventions

Not yet implemented at a system level. Individual screens (Figma imports) contain their own static content. The convention for future screens:

- **Loading:** Skeleton components (shadcn `skeleton.tsx` already installed)
- **Error:** Minimal error message with retry action; never expose stack traces
- **Empty:** Dedicated empty-state component with clear CTA
- **Not Found (404):** `src/app/pages/public/NotFound.tsx` — clean LAGDA-branded 404

Route error boundary: not yet added — add in Command 3 when building the first dynamic page.

---

## 16. Accessibility Conventions

- Keyboard navigation: existing App.tsx nav supports Escape, Enter/Space/ArrowDown for dropdown open
- Focus management: focus rings via CSS `button:focus-visible` in globalOverrides
- ARIA: `aria-label`, `aria-expanded`, `aria-haspopup`, `aria-modal`, `role="dialog"` on mobile menu
- Screen reader: page title updates are deferred to Command 11 (SEO + meta)
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables all animations/transitions
- Landmark elements: to be added when Figma screens are replaced with real HTML
- eNotary disclaimer: visible in mobile menu bottom strip, required on all eNotary DevPlaceholders

---

## 17. Backend-Replacement Strategy

1. Define service interface (done in `interfaces/index.ts`)
2. Implement mock service (example: `mock/session.service.ts`)
3. Use mock service in component or hook
4. At integration time: implement `RealXxxService implements XxxService`
5. Swap the import — zero consumer changes required

Configuration flag: `APP_CONFIG.mockMode` signals to any factory/selector which implementation to use.

No real API URLs, tokens, or credentials in any frontend file.

---

## 18. File and Naming Conventions

- Component files: `PascalCase.tsx`
- Service files: `kebab-case.service.ts`
- Config files: `kebab-case.config.ts`
- Model/interface files: `index.ts` (barrel export from logical group)
- Mock data files: `index.ts` under `data/mock/`
- CSS: global overrides stay in `App.tsx` until moved to a design-system command
- Imports: always use `@/` alias (`@` → `src/`)

---

## 19. Areas Intentionally Deferred

| Area | Target Command |
|---|---|
| Extract nav components from App.tsx | Command 3 (Design System) |
| Full Home page | Command 4 |
| Sign In / Register forms | Command 5 (Auth) |
| eNotary Coming Soon pages | Command 6 |
| Remaining solution/pricing pages | Commands 4–8 |
| Authenticated platform screens | Commands 9–17 |
| Responsive layout (replace fixed-1440px) | Command 3 |
| SEO meta tags and page titles | Command 11 |
| TypeScript strict mode | Command 3 |
| Code splitting / lazy loading | Command 11 |
| Real route guards (auth-required) | Command 5 |
| Error boundaries | Command 3 |
| PWA / favicon | Command 3 |
| Full test suite | Command 11 |

---

## 20. Architectural Decisions Made in Command 2

**AD-001: Keep App.tsx intact, add URL sync.**
Rationale: App.tsx is 3,300+ lines and contains the entire working public portal. A full rewrite would risk regressions across 14 Figma screens and all interaction patterns. Instead, `useNavigate` + `useLocation` are added as a thin sync layer. Nav extraction deferred to Command 3.

**AD-002: State initialized from URL in useState (not in useEffect).**
Rationale: Prevents state→URL effect from calling `navigate()` with default values before URL→state effect can correct them. Avoids flash to `/esignature` on deep link to `/pricing/compare`.

**AD-003: App.tsx renders for all implemented section routes (`esignature/*`, `security/*`, etc.).**
Rationale: React reconciles `<App />` as the same component instance across section route changes (same type, same position in outlet). State persists across section changes. No flicker on navigation.

**AD-004: Platform and auth routes defined before public wildcard.**
Rationale: Ensures `/app/*` and `/sign-in` are matched by their specific routes before the public layout's wildcard child catches them.

**AD-005: DevPlaceholder for unbuilt routes instead of 45+ empty page files.**
Rationale: One shared component with a required `title` prop. Clearly marked as in-development. Prevents accidentally shipping placeholder content as if it were production.

**AD-006: eNotary disclaimer required on all eNotary DevPlaceholders.**
Rationale: Enforces the legal constraint at the component level. Every eNotary route passes `isEnotary={true}` to DevPlaceholder, which displays the mandatory disclaimer string from APP_CONFIG.

**AD-007: `public/_redirects` for Netlify SPA hosting.**
Rationale: Without this rule, direct navigation to `/esignature/core-workflow` returns 404 from the server. The redirect ensures all paths serve index.html.

---

## Validation Results (Command 2)

| Test | Result |
|---|---|
| Production build | ✅ `npm run build` — 1.20s, no errors |
| Dev server | ✅ Starts in 290ms |
| HTTP 200 on all route paths | ✅ Verified with curl: /, /esignature, /esignature/core-workflow, /security, /pricing, /sign-in, /app, /bogus-route |
| URL-based routing (SPA) | ✅ All paths serve index.html |
| Lint | ⚠️ ESLint not configured (deferred to Command 3) |
| Type check (`tsc --noEmit`) | ⚠️ tsconfig not present (deferred to Command 3) |
| Unit tests | ⚠️ Test framework not configured (deferred) |
