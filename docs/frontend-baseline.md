# LAGDA Frontend Baseline
> Generated: 2026-07-15 — Command 1 (Initialize and Audit)
> Updated: 2026-07-15 — Command 2 (Architecture and Route Foundation)
>
> **Architecture document:** [docs/frontend-architecture.md](frontend-architecture.md)
>
> **Command 2 changes:** React Router wired (`createBrowserRouter`), URL-based routing active for all 14 existing Figma screens, 3 layout boundaries established (PublicLayout / AuthLayout / PlatformLayout), centralized route metadata (200+ routes), foundational models, service interfaces and mock conventions, application config, fictional mock data, DevPlaceholder for unbuilt routes, NotFound page, `public/_redirects` for SPA hosting.

---

## 1. Project Location

```
C:\Users\paulg\OneDrive\Desktop\Lagda
```

Not yet connected to a remote git repository. Git was initialized during this command.

---

## 2. Detected Framework and Versions

| Tool | Version |
|---|---|
| React | 18.3.1 |
| React DOM | 18.3.1 |
| Vite | 6.3.5 |
| @vitejs/plugin-react | 4.7.0 |
| Tailwind CSS | 4.1.12 |
| @tailwindcss/vite | 4.1.12 |
| Node.js (local) | v24.15.0 |
| TypeScript | via Vite/React (no tsconfig detected — types inferred) |

**UI Component Library:** shadcn/ui (full set — 40+ Radix UI primitives pre-installed)
**Icon Library:** lucide-react 0.487.0
**Animation:** motion 12.23.24 (installed, not actively used yet), tw-animate-css 1.3.8
**Forms:** react-hook-form 7.55.0
**Charts:** recharts 2.15.2
**Drag/Drop:** react-dnd 16.0.1 + react-dnd-html5-backend 16.0.1
**State management:** React local state only (useState / useRef / useCallback / useEffect) — no Redux, Zustand, or Context API in use
**Routing:** react-router 7.13.0 (installed, NOT yet wired — navigation is currently pure state-switching inside App.tsx)
**Additional UI:** MUI (Material UI) 7.3.5 + @emotion/react 11.14.0 (installed, not used by existing screens)
**Toast:** sonner 2.0.3

---

## 3. Package Manager

**Intended:** pnpm (pnpm-workspace.yaml present, supportedArchitectures configured for linux x64/arm64)

**Actual (local Windows):** npm 11.12.1 (pnpm not installed)

**Install workaround applied:** react and react-dom added to `devDependencies` so `npm install` works without a separate step.

**Recommended going forward:** Install pnpm globally (`npm install -g pnpm`) and use `pnpm install`. The pnpm-workspace.yaml is the canonical lockfile approach for this project.

---

## 4. Start, Build, Lint, and Test Commands

```bash
# Development server (localhost:5173, starts in ~265ms)
npm run dev

# Production build (outputs to dist/)
npm run build

# Lint — NOT configured (no eslint.config or .eslintrc found)
# Test — NOT configured (no vitest, jest, or testing-library found)
```

---

## 5. Current Source Structure

```
Lagda/
├── index.html                    # Entry HTML — title "LAGDA.io", noindex/nofollow robots
├── package.json                  # Dependencies (Figma Make scaffold, name: @figma/my-make-file)
├── pnpm-workspace.yaml           # pnpm workspace config (linux x64/arm64 target)
├── vite.config.ts                # Vite + React + Tailwind + figmaAssetResolver plugin
├── postcss.config.mjs            # PostCSS (Tailwind)
├── default_shadcn_theme.css      # shadcn theme reference (not imported)
├── ATTRIBUTIONS.md               # Third-party asset attributions
├── README.md                     # Placeholder (no content)
├── guidelines/
│   └── Guidelines.md             # Figma Make AI guidelines (template, not filled in)
├── docs/
│   └── frontend-baseline.md      # THIS FILE
└── src/
    ├── main.tsx                  # React root mount
    ├── styles/
    │   ├── index.css             # @import orchestrator
    │   ├── fonts.css             # Google Fonts: Geist, Geist Mono, Inter
    │   ├── tailwind.css          # @import tailwindcss
    │   ├── theme.css             # shadcn CSS custom properties (light + dark)
    │   └── globals.css           # EMPTY
    ├── app/
    │   ├── App.tsx               # Entire app (3300+ lines) — nav, routing, page shell
    │   └── components/
    │       ├── figma/
    │       │   └── ImageWithFallback.tsx   # Image component with error fallback
    │       └── ui/               # Full shadcn/ui component library (40+ files)
    └── imports/                  # Figma Make exports — one directory per page
        ├── DLagdaEsignatureOverview/
        ├── DLagdaEsignatureCoreWorkflow/
        ├── DLagdaEsignatureVerificationAudit/
        ├── DLagdaEsignatureAdvancedCapabilities/
        ├── DLagdaEsignatureTemplatesBranding/
        ├── DLagdaEsignatureTeamEnterprise/
        ├── DLagdaSecurityOverview/
        ├── DLagdaSecurityTrustCenter/
        ├── DLagdaSolutionsAll/
        ├── DLagdaSolutionsLawyers/
        ├── DLagdaPricingMainPage/
        ├── DLagdaPricingComparePlans/
        ├── DLagdaResourcesGuides/
        ├── DLagdaResourcesFaq/
        ├── ParallelSigningTechyComparison/  # standalone feature screen
        ├── pasted_text/
        │   ├── lagda-nav-behavior.md        # Nav system design spec
        │   └── lagda-prototype-enhancement.md  # Full interactive enhancement spec
        └── image-*.png (23 loose images)   # Unorganized image assets
```

---

## 6. Existing Route Map

The application has **no URL-based routing**. Navigation is purely React state. URLs do not change on navigation; refresh always returns to the eSignature Overview screen.

State variables in App.tsx:
- `section`: `"esignature" | "security" | "solutions" | "pricing" | "resources"`
- `esigTab`: `"overview" | "core-workflow" | "verification-audit" | "advanced-capabilities" | "templates-branding" | "team-enterprise"`
- `securityTab`: `"security-overview" | "trust-center"`
- `pricingTab`: `"pricing-main" | "compare-plans"`
- `resourcesTab`: `"guides" | "faq"`
- `solutionsTab`: `"all" | "lawyers"`

**State → Screen mapping:**

| State Combination | Screen Rendered |
|---|---|
| esignature / overview | DLagdaEsignatureOverview |
| esignature / core-workflow | DLagdaEsignatureCoreWorkflow |
| esignature / verification-audit | DLagdaEsignatureVerificationAudit |
| esignature / advanced-capabilities | DLagdaEsignatureAdvancedCapabilities |
| esignature / templates-branding | DLagdaEsignatureTemplatesBranding |
| esignature / team-enterprise | DLagdaEsignatureTeamEnterprise |
| security / security-overview | DLagdaSecurityOverview |
| security / trust-center | DLagdaSecurityTrustCenter |
| solutions / all | DLagdaSolutionsAll |
| solutions / lawyers | DLagdaSolutionsLawyers |
| pricing / pricing-main | DLagdaPricingMainPage |
| pricing / compare-plans | DLagdaPricingComparePlans |
| resources / guides | DLagdaResourcesGuides |
| resources / faq | DLagdaResourcesFaq |

---

## 7. Existing Public Portal Page Inventory

| Page | Status |
|---|---|
| **Home** | MISSING — no Home screen exists; app opens directly to eSignature Overview |
| **eSignature → Overview** | Existing (Figma import, substantially complete) |
| **eSignature → Core Workflow** | Existing (Figma import, substantially complete) |
| **eSignature → Verification & Audit** | Existing (Figma import, substantially complete) |
| **eSignature → Advanced Capabilities** | Existing (Figma import, substantially complete) |
| **eSignature → Templates & Branding** | Existing (Figma import, substantially complete) |
| **eSignature → Team & Enterprise** | Existing (Figma import, substantially complete) |
| **Features** (standalone) | MISSING — nav item has no wired screen |
| **Solutions → All** | Existing (Figma import, substantially complete) |
| **Solutions → Lawyers** | Existing (Figma import, substantially complete) |
| **Solutions → Law Firms** | MISSING |
| **Solutions → Business Teams** | MISSING |
| **Solutions → Government / LGU** | MISSING |
| **Solutions → Real Estate** | MISSING |
| **Solutions → HR & Recruitment** | MISSING |
| **Solutions → Finance** | MISSING |
| **Solutions → Procurement** | MISSING |
| **Solutions → Education** | MISSING |
| **Solutions → Healthcare & Wellness** | MISSING |
| **Pricing → Plans** | Existing (Figma import, substantially complete) |
| **Pricing → Compare Plans** | Existing (Figma import, substantially complete) |
| **Pricing → Signing Requests** | MISSING |
| **Pricing → Storage Limits** | MISSING |
| **Pricing → Templates by Plan** | MISSING |
| **Pricing → Enterprise** | MISSING |
| **Pricing → FAQ** | MISSING |
| **Security → Security Overview** | Existing (Figma import, substantially complete) |
| **Security → Trust Center** | Existing (Figma import, substantially complete) |
| **Security → Identity Verification** | MISSING (section exists inside Security Overview) |
| **Security → Audit Trail** | MISSING (section exists inside Security Overview) |
| **Security → Document Verification** | MISSING |
| **Security → IP/Device/Location** | MISSING (section exists inside Security Overview) |
| **Security → Secure Storage** | MISSING |
| **Resources → Guides** | Existing (Figma import, substantially complete) |
| **Resources → FAQ** | Existing (Figma import, substantially complete) |
| **Resources → Legal Framework** | MISSING |
| **Resources → Document Verification** | MISSING |
| **Resources → Help Center** | MISSING |
| **Resources → Contact** | MISSING |
| **Resources → Service Status** | MISSING |
| **Resources → Privacy Policy** | MISSING |
| **Resources → Terms of Service** | MISSING |
| **Resources → Accessibility Statement** | MISSING |
| **eNotary → Overview (Coming Soon)** | MISSING — dropdown item exists but no screen wired |
| **eNotary → Future Capabilities** | MISSING |
| **eNotary → Accreditation Roadmap** | MISSING |
| **eNotary → Waitlist** | MISSING |
| **eNotary → FAQ** | MISSING |
| **Sign In** | MISSING |
| **Create Free Account** | MISSING |
| **Book a Demo** | MISSING |
| **Contact Sales** | MISSING |
| **Document Verification (public)** | MISSING |
| **ParallelSigningTechyComparison** | Existing (Figma import, not wired to any nav) |

**Summary:** 14 of ~50+ planned public pages exist. All 14 are Figma Make exports.

---

## 8. Existing Authenticated Customer Platform Screens

**Status: NONE.**

There are no authenticated application screens, no application shell, no dashboard, no document management screens, no signing workflow, no settings screens, no billing screens, and no profile screens.

The project is currently 100% public information portal only.

---

## 9. Brand Asset Inventory

### Official Logo Files
**`src/brand elements/` directory: DOES NOT EXIST.**

None of the expected official logo PNG files were found anywhere in the repository:
- `Lagda-black-logo-horizontal-whitebg-withtext.png` — NOT FOUND
- `Lagda-white-logo-horizontal-bluebg-withtext.png` — NOT FOUND
- `Lagda-white-logo-square-bluebg-withouttext.png` — NOT FOUND
- `Lagda-colored-logo-horizontal-whitebg-withtext.png` — NOT FOUND
- `Lagda-colored-logo-square-whitebg-withouttext.png` — NOT FOUND
- `Lagda-colored-logo-square-whitebg-withtext.png` — NOT FOUND
- No SVG, AI, EPS, favicon, or app icon files found.

### Current Logo Implementation
The logo is **hard-coded as an inline SVG** inside `App.tsx` in the `Brand()` component (line 59–73):
- A 40×40px blue rounded square (`#0078D4`) containing a white shield path
- "LAGDA" wordmark in extrabold Geist at 20px, white
- "BY UPUP TECHNOLOGIES" subline in Geist Mono 9px, azure (#0078d4)

This inline SVG will be used for all contexts: nav, mobile menu, footer. No official image file is in use.

### Brand Colors (from specs in pasted_text/)
| Token | Hex |
|---|---|
| Azure Blue | #0078D4 |
| Deep Legal Burgundy | #67023B |
| Deep Navy | #07111F |
| Midnight Azure | #0B2344 |
| Azure Glow | #38BDF8 |
| Light Azure Surface | #EAF6FF |
| Burgundy Glow | #B01262 |
| Soft Burgundy Tint | #FCE7F3 |
| Success Green | #22C55E |
| Warning Amber | #F59E0B |
| Error Red | #DC2626 |

### Logo Placement Recommendations
| Context | Recommended Version |
|---|---|
| Dark nav (current) | White wordmark + white shield (current inline SVG) |
| Light nav | Black wordmark version when official asset available |
| Footer | White wordmark (matches dark footer background) |
| Mobile nav | Same as dark nav |
| Favicon | Square blue shield only (needs proper favicon file) |
| Auth screens | Colored logo on white background |
| Loading state | Shield mark only (animated) |

**Action required:** The official brand asset files must be supplied and placed in `src/assets/brand/`. The `src/brand elements/` directory referenced in the command does not exist.

---

## 10. Reusable Existing Code

### Navigation System (App.tsx)
- `Brand()` — LAGDA inline SVG logo + wordmark
- `MainNav()` — Full sticky desktop + mobile nav with mega-dropdown, hover intent, keyboard accessibility, scroll detection, Escape close, outside-click close
- `MobileMenu()` — Full-screen slide-in panel, accordion sections, body scroll lock, Escape close, haptics
- `SubNav<T>()` — Generic pill/segmented tab bar (reusable for any section's sub-tabs)
- `MegaDropdown()` — Azure/Burgundy themed mega menu panel
- `Chevron()` — Animated chevron component

### Interaction Systems (App.tsx)
- `haptic()` — Mobile vibration utility (mobile-only, silently skips desktop)
- Scroll reveal via `IntersectionObserver` (attached on each page navigation)
- Page entry animation via CSS class `lagda-page-enter`
- Scroll detection for frosted glass navbar

### Component Library (src/app/components/ui/)
Full shadcn/ui set — all available for use in new pages:
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip

### CSS Architecture
- `globalOverrides` string in App.tsx (3000+ lines) — suppresses imported navs, fixes alignment issues, defines all animation keyframes, reduced-motion support, card/button hover states, focus rings

---

## 11. Major Frontend Gaps

1. **No URL routing** — react-router is installed but not used; deep linking and browser history broken
2. **No Home page** — app opens to eSignature Overview; there is no landing/hero home screen
3. **No Sign In or Create Account screens** — CTA buttons exist but do nothing
4. **No eNotary screens** — 5 Coming Soon pages entirely missing
5. **No Features section** — nav label exists but no screen
6. **7 of 9 Solution pages missing** — only All + Lawyers exist
7. **No public document verification page**
8. **No legal/policy pages** — Privacy Policy, Terms of Service, Accessibility Statement all missing
9. **No authenticated application screens** — entire customer platform is missing
10. **No favicon or app icons** — `<head>` has no favicon link
11. **No service/data abstraction** — all data is hardcoded in Figma imports; no service interfaces
12. **App.tsx is monolithic** — 3300+ lines; all nav, routing, CSS overrides, and page composition in one file
13. **Brand image files missing** — logo only exists as inline SVG; no official PNG/SVG files in repo
14. **No mock data layer** — required for authenticated platform development
15. **`ParallelSigningTechyComparison` screen not wired** — exists in imports but has no nav entry or state
16. **No environment configuration** — no .env, .env.example, or runtime config

---

## 12. Accessibility and Responsive Risks

### Confirmed Issues
- **Fixed 1440px width:** All page content is hard-set to `width: 1440, minWidth: 1440`. On viewports narrower than 1440px the page scrolls horizontally (enabled via `overflow-x-auto`). This is intentional for prototype fidelity but unusable on real mobile devices.
- **No real responsive breakpoints in Figma imports:** The imported screen components use fixed pixel values from Figma; they are not responsive HTML.
- **Fonts loaded from Google CDN:** `fonts.css` imports from `fonts.googleapis.com`. This requires a network connection and may fail for users with privacy/CSP restrictions.
- **`noindex, nofollow`** in `index.html` — correct for a prototype, must be removed before public launch.
- **No favicon:** `<head>` contains no `<link rel="icon">`.
- **Focus rings:** App.tsx includes `button:focus-visible` CSS globally — this is a positive. The imported Figma screens use absolute positioning with no semantic HTML, so keyboard navigation within imported screens is not functional.
- **No heading hierarchy** in imported screens (Figma generates `<p>` elements, not `<h1>`–`<h6>`).
- **No landmark elements** (`<main>`, `<header>`, `<footer>`, `<nav>`) inside imported screens.
- **No image alt text** in the majority of imported screen images.
- **Touch targets:** Nav buttons and SubNav pills meet the 44px minimum per the global CSS; internal Figma screen CTAs are unknown without runtime inspection.
- **Mobile menu:** Implements `aria-modal`, `aria-label`, body scroll lock, Escape close — these are good.

### Not Yet Verified (Needs Runtime Inspection)
- Color contrast ratios inside imported screens
- Screen reader announcement of page transitions
- Focus trap behavior inside MobileMenu
- Pinch-zoom behavior on mobile

---

## 13. Responsive Issues

- All imported screens are fixed-width Figma exports rendered inside a `width: 1440px, minWidth: 1440px` container
- `overflow-x-auto` on the root `<div>` allows horizontal scrolling as a workaround
- The nav itself IS responsive: desktop at ≥1024px, hamburger + mobile panel below that
- Imported screens will require full responsive refactoring to become real mobile-first pages

---

## 14. Performance Issues

- **23 large PNG images in `src/imports/`** — many between 272KB and 1.57MB
- **Production JS bundle: 1,714 KB** (Vite warns >500KB) — caused by all 14 screens being in one bundle with no code splitting
- **No lazy loading** of imported screens
- **No image optimization** — no WebP conversion or srcset
- **Google Fonts CDN dependency** on every page load

---

## 15. Content Inconsistencies

- **Home nav item**: listed in the nav spec (`lagda-nav-behavior.md`) as `"Home"` but not present in `NAV_DEFS` in App.tsx
- **Features nav item**: present in `lagda-nav-behavior.md` spec but missing from App.tsx `NAV_DEFS` and has no screen
- **eSignature sub-nav**: spec includes "Overview" tab; current implementation treats Overview as a top-level screen without a sub-nav tab (SubNav appears only for the other 5 tabs, not Overview)
- **Copyright year**: not yet visible (no footer implemented in App.tsx; footers live inside Figma imports)
- **eNotary disclaimer**: correctly shown in mobile menu bottom strip; needs verification it appears prominently on all eNotary screens once built

---

## 16. Missing Portal Pages (Priority Order)

### P0 — Required Before Any Demo
1. Home page (hero, features overview, trust proof, CTA)
2. Sign In screen
3. Create Free Account screen
4. eNotary Overview (Coming Soon) screen
5. Document Verification (public) screen

### P1 — Complete the Main Sections
6. Features (all features index page)
7. Solutions: Law Firms, Business Teams, Government/LGU, Real Estate, HR, Finance, Procurement
8. eNotary: Future Capabilities, Accreditation Roadmap, Waitlist, FAQ
9. Pricing sub-pages: Signing Requests, Storage Limits, Templates by Plan, Enterprise

### P2 — Resources and Legal
10. Legal Framework
11. Help Center
12. Contact
13. Privacy Policy
14. Terms of Service
15. Accessibility Statement
16. Service Status

---

## 17. Missing Customer-Platform Screens (All Missing)

Authentication: Sign In, Registration, Email Verification, MFA, Password Recovery
App shell: Sidebar, Workspace Switcher, Global Search
Dashboard: Overview, Activity Feed, Quick Actions
Documents: List, Detail, Audit Timeline
Document Verification: Search, Result, Invalid State
Prepare Document: Upload, Field Placement, Recipient Config, Review & Send
Signing Experience: Recipient View, OTP Auth, Field Completion, Signed Confirmation
Templates: Library, Create, Edit
Contacts: List, Detail, Import
Team: Members, Roles, Invitations
Workspace: Settings, Branding
Profile: Info, Security, Password, MFA Setup
Billing: Plan, Usage, Invoices
Integrations: API Keys, Webhooks

---

## 18. Recommended Frontend Architecture

```
src/
├── app/
│   ├── routes/              # One file per route (React Router v7 file-based or manual)
│   │   ├── index.tsx        # Home
│   │   ├── esignature/
│   │   ├── features/
│   │   ├── solutions/
│   │   ├── pricing/
│   │   ├── security/
│   │   ├── resources/
│   │   ├── enotary/
│   │   ├── auth/            # sign-in, register, verify, mfa, reset
│   │   └── app/             # authenticated shell + all platform screens
│   ├── layouts/
│   │   ├── PublicLayout.tsx   # Main nav + footer wrapper
│   │   └── AppLayout.tsx      # Authenticated sidebar shell
│   ├── components/
│   │   ├── nav/             # MainNav, SubNav, MegaDropdown, MobileMenu, Brand
│   │   ├── ui/              # shadcn components (already here)
│   │   └── shared/          # LegalDisclaimer, ComingSoonBadge, PageTransition, etc.
│   └── App.tsx              # Router root only
├── services/                # Service interfaces + mock implementations
│   ├── interfaces/          # TypeScript interfaces for all services
│   └── mock/                # Mock implementations returning static data
├── data/                    # Mock fixtures (JSON or TS const)
├── assets/
│   └── brand/               # Official logo files go here
└── imports/                 # Figma exports (read-only, progressively replaced)
```

---

## 19. Recommended Service and Mock Data Structure

### Service Interfaces (to create)
```typescript
// src/services/interfaces/AuthService.ts
export interface AuthService {
  signIn(email: string, password: string): Promise<User>
  register(data: RegisterData): Promise<User>
  signOut(): Promise<void>
  currentUser(): User | null
}

// Implement as MockAuthService during frontend-only phase
// Replace with RealAuthService when backend is ready
```

Pattern for all services: define interface → implement mock → inject via React Context → replace mock with real implementation at integration time.

Services to define (in order of need):
1. AuthService (sign in/out, current user)
2. DocumentService (list, get, create, status updates)
3. SigningRequestService (send, track, status)
4. VerificationService (public QR/ID lookup)
5. TemplateService (list, CRUD)
6. WorkspaceService (members, roles, settings)
7. BillingService (plan, usage, invoices)

---

## 20. Recommended Implementation Order

### Stage 1 — Baseline (DONE in Command 1)
- [x] Repository inspected and documented
- [x] React peer dependency fix applied (npm-compatible)
- [x] Build verified (production build succeeds)
- [x] Dev server confirmed (265ms startup)
- [x] Git initialized

### Stage 2 — Design Tokens and Brand Assets
- [ ] Create `src/assets/brand/` and add official logo files
- [ ] Extract LAGDA brand colors into `src/styles/tokens.css` as CSS custom properties
- [ ] Update `theme.css` to use LAGDA tokens (replace generic shadcn defaults)
- [ ] Add favicon to `public/` and wire in `index.html`

### Stage 3 — Routing and Shells
- [ ] Wire react-router v7 with URL-based routing
- [ ] Extract `MainNav`, `SubNav`, `MobileMenu`, `Brand` into `src/app/components/nav/`
- [ ] Create `PublicLayout.tsx` (nav + footer wrapper)
- [ ] Split `App.tsx` into per-route files
- [ ] Add `AppLayout.tsx` placeholder for authenticated shell

### Stage 4 — Complete Public Portal
- [ ] Build Home page (hero, feature overview, trust, CTA)
- [ ] Build Sign In and Create Account forms (frontend only, mock auth)
- [ ] Build eNotary Coming Soon section (5 pages, Burgundy theme)
- [ ] Build public Document Verification page
- [ ] Build Features index page
- [ ] Build remaining Solutions pages (7 missing)
- [ ] Build remaining Pricing sub-pages
- [ ] Build legal/policy pages (Privacy, Terms, Accessibility)

### Stage 5 — Portal Polish
- [ ] Implement proper responsive breakpoints (replace fixed-1440 with fluid layout)
- [ ] Optimize images (WebP, lazy loading, srcset)
- [ ] Add code-splitting (lazy import per route)
- [ ] Add SEO meta tags, Open Graph, structured data
- [ ] Remove `noindex` from index.html
- [ ] Fix heading hierarchy in all pages
- [ ] Verify color contrast (WCAG AA)
- [ ] Add landmark elements and ARIA labels

### Stage 6 — Authenticated Platform Shell
- [ ] Define service interfaces and mock implementations
- [ ] Build authenticated layout (sidebar, workspace switcher, header)
- [ ] Build Dashboard
- [ ] Build Document List and Detail pages

### Stages 7–17 — (Remaining authenticated platform features)
See "Missing Customer-Platform Screens" section above.

---

## 21. Backend-Dependent Features (Must Remain Mocked)

- Real authentication (JWT, sessions, MFA)
- Document upload and storage
- Signing request delivery (email/SMS to recipients)
- Real OTP verification
- PDF generation and cryptographic signing
- QR code generation tied to real document records
- Audit trail storage and retrieval
- Public document verification lookup
- Template persistence
- Team and workspace management
- Billing and subscription management
- API key issuance
- Webhook delivery
- Email notifications
- Future: eNotary workflows, secure video, accreditation status

---

## 22. Current Build and Test Status

| Step | Result |
|---|---|
| `npm install` | ✅ Succeeds (after react/react-dom devDependency fix) |
| `npm run build` | ✅ Succeeds — 1 warning (bundle >500KB, expected) |
| `npm run dev` | ✅ Succeeds — starts in 265ms at localhost:5173 |
| Type check | ⚠️ Not configured (no `tsc --noEmit` script) |
| Lint | ❌ Not configured (no ESLint config) |
| Tests | ❌ Not configured (no test framework) |
| git | ✅ Initialized (no remote) |

### 2 High Severity npm Audit Findings
Run `npm audit` to inspect. These are likely in transitive dependencies. Address before any production deploy.
