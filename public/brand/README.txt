LAGDA Official Logo Assets
==========================

Drop the six official PNG files here. The LagdaLogo component will use them
automatically — no code change required.

Expected files (exact names):
  Lagda-colored-logo-horizontal-whitebg-withtext.png  → colored-horizontal variant
  Lagda-white-logo-horizontal-bluebg-withtext.png     → white-horizontal variant
  Lagda-black-logo-horizontal-whitebg-withtext.png    → black-horizontal variant
  Lagda-colored-logo-square-whitebg-withouttext.png   → colored-icon variant
  Lagda-white-logo-square-bluebg-withouttext.png      → white-icon variant
  Lagda-colored-logo-square-whitebg-withtext.png      → stacked-colored variant

These are served at runtime as /brand/<filename>.png via Vite's public folder.
Until the files are present, LagdaLogo falls back to its inline SVG placeholder.
