# LAGDA Brand Assets

> Working digital standards — Command 3 (2026-07-15)
> These are frontend working files. Official print-ready files pending formal brand book.

## Current Asset Inventory

| File | Description | Status |
|---|---|---|
| `lagda-icon-azure.svg` | Shield icon, Azure bg, white mark | Working SVG from App.tsx geometry |
| `lagda-icon-white-on-dark.svg` | Shield icon, frosted white bg, white mark | Working SVG |
| `lagda-icon-mono.svg` | Shield icon, Deep Navy bg, white mark | Working SVG |

## Missing Official Files (pending from brand team)

The following official PNG exports were specified in Command 3 but are not yet available.
When received, replace the SVG files and update `LagdaLogo.tsx` to reference them.

- `Lagda-black-logo-horizontal-whitebg-withtext.png`
- `Lagda-white-logo-horizontal-bluebg-withtext.png`
- `Lagda-white-logo-square-bluebg-withouttext.png`
- `Lagda-colored-logo-horizontal-whitebg-withtext.png`
- `Lagda-colored-logo-square-whitebg-withouttext.png`
- `Lagda-colored-logo-square-whitebg-withtext.png`

## Working Logo Rules

The `LagdaLogo` React component (`src/app/components/brand/LagdaLogo.tsx`) is the
canonical source of truth until official PNG files are available.

**Use LagdaLogo, not raw SVG files, in all UI code.**

## Clear Space (Working Rule)

Maintain clear space of at least 0.25 × icon height on all sides.
For the 40px icon: 10px minimum clear space on every edge.

## Minimum Size

- Horizontal logo: minimum display width 120px (wordmark must remain legible)
- Icon only: minimum display size 20×20px

## What NOT to Do

- Do not stretch or squash the logo
- Do not rotate the complete logo
- Do not recolor the shield or wordmark outside approved variants
- Do not place white-background logos over dark backgrounds
- Do not use the azure-bg icon on an azure surface without ensuring contrast
- Do not crop the logo mark with overflow-hidden containers
