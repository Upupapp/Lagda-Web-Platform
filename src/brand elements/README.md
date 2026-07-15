# LAGDA Brand Assets

> Working digital standards — updated Command 3 (2026-07-15)

## How the Logo Component Uses These Files

Official PNG files must live in **TWO places**:

1. **Here (`src/brand elements/`)** — source archive, originals for reference
2. **`public/brand/`** — runtime serving (REQUIRED for the app to switch to official logos)

`LagdaLogo` loads images from `/brand/<filename>` at runtime via `<img>`.
Copy the official PNGs to `public/brand/` and they activate immediately — no code change needed.

---

## Official PNG Files (copy to `public/brand/` to activate)

| File | `LagdaLogo` variant |
|------|---------------------|
| `Lagda-colored-logo-horizontal-whitebg-withtext.png` | `colored-horizontal` |
| `Lagda-white-logo-horizontal-bluebg-withtext.png` | `white-horizontal` |
| `Lagda-black-logo-horizontal-whitebg-withtext.png` | `black-horizontal` |
| `Lagda-colored-logo-square-whitebg-withouttext.png` | `colored-icon` |
| `Lagda-white-logo-square-bluebg-withouttext.png` | `white-icon` |
| `Lagda-colored-logo-square-whitebg-withtext.png` | `stacked-colored` |

Until these files are present, `LagdaLogo` renders inline SVG placeholder geometry.

---

## Working SVG Files (created Command 3 — placeholder geometry)

| File | Description |
|------|-------------|
| `lagda-icon-azure.svg` | Azure icon mark (working file, not official logo geometry) |
| `lagda-icon-white-on-dark.svg` | White-on-dark icon mark (working file) |
| `lagda-icon-mono.svg` | Monochrome icon mark (working file) |

---

## Logo Treatment Rules (from brand guidelines)

- Preserve the official geometry, proportions, and icon-to-wordmark relationship
- Do not stretch, skew, squash, rotate, trace, or redraw the logo
- Do not replace the wordmark with another font
- Do not recolor individual elements outside approved brand variants
- Do not crop the icon so the gold stroke or red diamond is damaged
- Do not add bevels, outlines, drop shadows, or effects directly to the logo
- Do not place a white-background PNG over a dark background — select the correct variant
- For animation: the complete logo may fade, scale subtly, or receive a masked light sweep; it must not spin or bounce

## Clear Space (Working Rule)

Maintain at least 0.25 × icon height on all sides.
At 40px icon: 10px minimum clear space on every edge.

## Minimum Size

- Horizontal logo: 120px minimum width
- Icon only: 20×20px minimum

---

## Unresolved as of Command 3

- Official animated SVG or Lottie asset: not yet received
- CMYK/Pantone values: not finalized
- Minimum size and clear-space formula: not formally documented
- `mono-icon` variant: no official PNG (SVG placeholder used indefinitely)
