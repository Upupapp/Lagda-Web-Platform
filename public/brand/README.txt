LAGDA Official Logo Assets — WEB DELIVERY COPIES
================================================

IMPORTANT — these are OPTIMISED DELIVERY COPIES, not the masters.

  Masters (full resolution, never modified):  src/brand elements/
  Delivery copies (this folder, served):      public/brand/

Do NOT copy the masters back over this folder. They are 1254x1254 / 1448x1086
and ~3.7 MB in total, which is roughly 36x more than the site needs.

Optimisation applied (2026-07-31)
---------------------------------
Resized to a 256px longest edge and re-encoded as palette PNG. Only resolution
and encoding changed: exact aspect ratio preserved, no crop, no stretch, no
skew, no recolouring, no redraw — all of which the brand guidelines forbid.

  Total served:  3,668 KB  ->  103 KB   (97% smaller)

Why 256px is enough: LagdaLogo renders at most 64px for icon and horizontal
variants (ICON_SIZES.xl), and ~102px for the stacked variant (64 x 1.6). 256px
is therefore 4x for icons and 2.5x for stacked — ample for high-DPI displays.
If a future screen needs the logo larger than ~102px, regenerate from the
masters at a higher target rather than upscaling these files.

Canonical filenames (must not be renamed — code references these exactly):
  LagdaLogoPrimaryHorizontalFullColor.png  -> colored-horizontal variant (light backgrounds)
  LagdaLogoHorizontalWhiteonNavy.png       -> white-horizontal variant  (dark/navy backgrounds)
  LagdaLogoHorizontalBlack.png             -> black-horizontal variant  (monochrome/print)
  LagdaLogoIconFullColorSquare.png         -> colored-icon variant      (compact, light backgrounds)
  LagdaLogoIconWhiteonNavySquare.png       -> white-icon variant        (compact, dark/navy backgrounds)
  LagdaLogoStackedFullColor.png            -> stacked-colored variant   (presentations, social)
  favicon-96.png                           -> favicon only (see below)

Note: All PNGs have baked (opaque, non-transparent) backgrounds.
  Light-background variants (colored-horizontal, black-horizontal, colored-icon,
  stacked-colored) have a WHITE baked background — use on white/light surfaces only.
  Dark-background variants (white-horizontal, white-icon) have a NAVY (#07111F)
  baked background — use on the canonical LAGDA Deep Navy only.

The mono-icon variant has no PNG file and uses the inline SVG fallback.

Favicon
-------
/index.html points at favicon-96.png (96x96, 4 KB), NOT at the full logo asset.
The favicon is requested on every page view, so it must stay small. The full
colored-icon file is still used for rel="apple-touch-icon".