# LAGDA Logo Integration Audit

> Command 36 — full codebase sweep completed. All placement decisions verified against official brand guidelines.

## Component: `LagdaLogo.tsx`

**Status:** Official PNGs active.

The component is image-first: it checks `PNG_SRCS[variant]` and renders the official PNG if found, falling back to the inline SVG placeholder only on load error. The `PNG_SRCS` map was updated to canonical filenames as part of Command 36.

## Screen Audit

| Screen / Component | Variant Used | Background | Correct? | Notes |
|-------------------|--------------|------------|----------|-------|
| `PublicHeader.tsx` — desktop logo | `white-horizontal` | Deep Navy `#07111F` | ✅ | White wordmark on navy |
| `PublicHeader.tsx` — mobile drawer | `white-horizontal` | Deep Navy `#07111F` | ✅ | |
| `PublicFooter.tsx` | `white-horizontal` | `#060e1a` (near-navy) | ✅ | Navy baked-in is imperceptibly dark; acceptable per brand |
| `PlatformSidebar.tsx` — expanded | `white-horizontal` | Deep Navy `#07111F` | ✅ | |
| `PlatformSidebar.tsx` — collapsed | `white-icon` | Deep Navy `#07111F` | ✅ | Icon-only at `xs` |
| `MobileNav.tsx` — top bar | `white-horizontal` | Deep Navy `#07111F` | ✅ | `xs` size; logo is small but correct |
| `MobileNav.tsx` — drawer | `white-horizontal` | Deep Navy `#07111F` | ✅ | |
| `AuthLayout.tsx` | `white-horizontal` | Deep Navy `#07111F` | ✅ | Centered left panel |
| `OnboardingLayout.tsx` | `white-horizontal` | Deep Navy `#07111F` | ✅ | |
| `NotFound.tsx` | `white-icon` (fixed) | Deep Navy `#07111F` | ✅ | **Was `colored-icon` — corrected in C36** |
| `LagdaLoader.tsx` | n/a — inline SVG shield | n/a | ✅ | Loader uses its own shield geometry, not `LagdaLogo` |
| `index.html` favicon | `LagdaLogoIconFullColorSquare.png` | — | ✅ | **Was broken SVG reference — fixed in C36** |

## Issues Fixed in Command 36

1. **`PNG_SRCS` stale filenames** — All 6 paths in `LagdaLogo.tsx` pointed to old pre-delivery filenames. Updated to canonical names. PNGs now load correctly everywhere.
2. **`public/brand/` empty** — Official PNGs existed only in `src/brand elements/`. Copied all 6 to `public/brand/` where Vite serves them.
3. **File case mismatch** — `LagdalogoHorizontalWhiteonNavy.png` had lowercase 'l' in both source directories. Renamed to `LagdaLogoHorizontalWhiteonNavy.png` (case-sensitive on Linux/CI).
4. **`NotFound.tsx` wrong variant** — Used `colored-icon` (white-baked square) on dark navy background, rendering a jarring white block. Fixed to `white-icon`.
5. **Broken favicon** — `index.html` referenced `lagda-icon-azure.svg` which was already deleted. Updated to `LagdaLogoIconFullColorSquare.png`.

## No-Change Confirmed

The following were audited and required no changes:
- `PublicHeader`, `PublicFooter`, `PlatformSidebar`, `MobileNav`, `AuthLayout`, `OnboardingLayout` — all had correct variant assignments.
- `LagdaLoader` — uses its own inline shield SVG, not the `LagdaLogo` component; no change needed.
- `DesignSystemShowcase` — dev-only showcase page; all variants shown for reference, no fix needed.
