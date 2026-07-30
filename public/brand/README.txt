LAGDA Official Logo Assets
==========================

All six official PNG files are present. The LagdaLogo component serves them
automatically from this directory via Vite's public folder (/brand/<filename>).

Canonical filenames (must not be renamed — code references these exactly):
  LagdaLogoPrimaryHorizontalFullColor.png  → colored-horizontal variant (light backgrounds)
  LagdaLogoHorizontalWhiteonNavy.png       → white-horizontal variant  (dark/navy backgrounds)
  LagdaLogoHorizontalBlack.png             → black-horizontal variant  (monochrome/print)
  LagdaLogoIconFullColorSquare.png         → colored-icon variant      (compact, light backgrounds)
  LagdaLogoIconWhiteonNavySquare.png       → white-icon variant        (compact, dark/navy backgrounds)
  LagdaLogoStackedFullColor.png            → stacked-colored variant   (presentations, social)

Note: All PNGs have baked (opaque, non-transparent) backgrounds.
  Light-background variants (colored-horizontal, black-horizontal, colored-icon,
  stacked-colored) have a WHITE baked background — use on white/light surfaces only.
  Dark-background variants (white-horizontal, white-icon) have a NAVY (#07111F)
  baked background — use on the canonical LAGDA Deep Navy only.

The mono-icon variant has no PNG file and uses the inline SVG fallback.

Favicon: LagdaLogoIconFullColorSquare.png (referenced in /index.html).
