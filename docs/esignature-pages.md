# LAGDA eSignature Product Pages — Command 6

Six production-quality React pages replacing the Figma-import-based eSignature section. All pages are responsive, accessible, and route-driven via react-router 7.

## Routes

| Route | Component | Page |
|---|---|---|
| `/esignature` | `EsigOverview` | eSignature Overview |
| `/esignature/core-workflow` | `EsigCoreWorkflow` | Core Workflow |
| `/esignature/verification-and-audit` | `EsigVerificationAudit` | Verification & Audit |
| `/esignature/advanced-capabilities` | `EsigAdvancedCapabilities` | Advanced Capabilities |
| `/esignature/templates-and-branding` | `EsigTemplatesBranding` | Templates & Branding |
| `/esignature/team-and-enterprise` | `EsigTeamEnterprise` | Team & Enterprise |

All six are children of the `PublicLayout` in `src/router.tsx`.

## File Structure

```
src/
  app/
    components/esignature/
      EsigSubNav.tsx        Sticky sub-nav (top: 72px, below PublicHeader)
      EsigPageShell.tsx     Shared components: PageSection, SectionHeading,
                            RelatedPages, PageCTA, LegalNote, FeatureCard,
                            PageHero, AvailBadge, EsigPageShell
    pages/public/esignature/
      content.ts            All copy, data arrays, legal note strings
      EsigOverview.tsx
      EsigCoreWorkflow.tsx
      EsigVerificationAudit.tsx
      EsigAdvancedCapabilities.tsx
      EsigTemplatesBranding.tsx
      EsigTeamEnterprise.tsx
```

## Shared Architecture

### EsigPageShell
Wraps all 6 pages. Renders `<EsigSubNav />` then the page's children. The sub-nav is sticky at `top: 72px` (below the 72px fixed PublicHeader) with `z-index: 40`.

### EsigSubNav
- Active detection: exact match for `/esignature`, `startsWith` for all subroutes
- Active item: white text, 2px solid `#0078D4` bottom border, `fontWeight: 700`
- Mobile: horizontal scroll with hidden scrollbar
- Uses `useLocation()` from react-router — no prop drilling

### Shared Components (EsigPageShell.tsx)

| Component | Purpose |
|---|---|
| `PageHero` | Gradient hero with eyebrow, H1 (`clamp(28px,4.5vw,52px)`), sub-text, optional children |
| `PageSection` | Content section wrapper; `light` + `bordered` props for alternating BG |
| `SectionHeading` | Eyebrow + H2 + optional sub-text; `center` prop for centered variant |
| `AvailBadge` | Tier badge: Core=green "Available", Advanced=blue "Plan dependent", Enterprise=gold "Enterprise", Planned=gray "Planned" |
| `FeatureCard` | Icon + title + description card |
| `RelatedPages` | "Continue reading" link strip at page bottom |
| `PageCTA` | Full-width CTA section with primary + optional secondary action |
| `LegalNote` | Always-on legal disclaimer; `showEnotary` prop adds eNotary note |

### GF / GM Pattern
All pages use inline font family objects:
```tsx
const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
```
Spread alongside other inline styles. Never use Tailwind `font-*` classes for these fonts.

### Responsive Strategy
All pages use `<style>` tags with class-based media query overrides (same pattern as the Home page). Fixed-width grids collapse to single column:
- 3-col → 1-col at `720px`
- 2-col → 1-col at `760px` (content grids) or `640px` (visual comparisons)
- 2-col feature grids → 1-col at `480px`

## Content Architecture

`content.ts` owns all copy. Pages import named exports and are purely presentational.

Key exports:
- `ESIG_SUBNAV` — 6 nav items for EsigSubNav
- `OVERVIEW_FEATURES`, `LIFECYCLE_STEPS`, `PARTICIPANT_ROLES`, `AUTH_METHODS`, `TRANSACTION_STATUSES`, `AUDIT_EVENTS`, `VERIFICATION_STATES`, `ADVANCED_CAPS`, `FIELD_TYPES`, `TEMPLATE_FEATURES`, `WORKSPACE_ROLES`, `TEAM_CAPABILITIES`
- `LEGAL_NOTE` — standard legal disclaimer (shown on every page)
- `ENOTARY_NOTE` — eNotary coming-soon disclaimer (shown on Overview via `showEnotary` prop)

## Fictional Mock Data

All interactive mockups use this consistent set:
- **Workspace:** Mabini Legal Solutions
- **Document:** Professional Services Agreement
- **Participants:** Ana Reyes (Signer), Marco Santos (Approver), Lea Cruz (CC)
- **Verification ID:** LAGDA-VER-2026-004821

## Legal Safeguards

- `LegalNote` appears at the bottom of every page
- eNotary is marked as Coming Soon on Overview; eNotary routes are `DevPlaceholder`-gated in the router
- `AvailBadge` prevents overclaiming: Enterprise features are clearly labeled and gated
- No competitor screenshots, no real-company testimonials, no fake statistics
- No backend connections — all forms and mockups are presentational only
- Forbidden phrases (e.g. "Supreme Court approved", "Fully compliant", "Tamper-proof") are not present in any page copy
- Electronic notarization is never represented as live, accredited, or purchasable

## Interactive Components

| Component | Page | Interactivity |
|---|---|---|
| `RoutingDiagram` | EsigCoreWorkflow | `useState` toggle: sequential / parallel |
| `VerificationDemo` | EsigVerificationAudit | `useState` 4-state switcher: verified / mismatch / incomplete / notfound |

Both use `aria-pressed` on toggle buttons. No backend calls.

## App.tsx Changes

The 6 eSignature Figma imports (`DLagdaEsignature*`) have been removed from `App.tsx`. The esignature cases in `pathToState()` and the esignature render blocks have been removed. `App.tsx` now handles only: security, solutions, pricing, resources.
