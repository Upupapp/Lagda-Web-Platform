# LAGDA Logo Asset Inventory

> Last updated: Command 36 — canonical PNG integration pass.

## Official Files (all in `public/brand/`)

| File | Variant Key | Background | Use On |
|------|-------------|------------|--------|
| `LagdaLogoPrimaryHorizontalFullColor.png` | `colored-horizontal` | White (baked) | Light/white backgrounds |
| `LagdaLogoHorizontalWhiteonNavy.png` | `white-horizontal` | Deep Navy #07111F (baked) | Dark/navy backgrounds |
| `LagdaLogoHorizontalBlack.png` | `black-horizontal` | White (baked) | Monochrome, print, B&W contexts |
| `LagdaLogoIconFullColorSquare.png` | `colored-icon` | White (baked) | Compact, light backgrounds; favicon |
| `LagdaLogoIconWhiteonNavySquare.png` | `white-icon` | Deep Navy #07111F (baked) | Compact, dark/navy backgrounds |
| `LagdaLogoStackedFullColor.png` | `stacked-colored` | White (baked) | Presentations, social media, hero areas |

Source originals: `src/brand elements/` (same filenames).

## Important: No Alpha Channel

All six PNGs are **opaque RGB** — no transparency. Every file has a background baked in.
- Do **not** place a navy-background PNG on a white surface.
- Do **not** place a white-background PNG on a navy surface.
- Choose the variant that matches your surface color exactly.

## Missing Variant

`mono-icon` has no PNG. The `LagdaLogo` component renders it via the inline SVG fallback. A navy-background monochrome square PNG could be added later as `LagdaLogoIconMonoNavySquare.png`.

## Favicon

`LagdaLogoIconFullColorSquare.png` is referenced in `/index.html` as the browser tab icon.
