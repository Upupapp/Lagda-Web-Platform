# LAGDA Logo Usage Guidelines

> Derived from official LAGDA brand guidelines (§4 Identity System) for developer reference.

## Choosing the Right Variant

| Context | Use | Avoid |
|---------|-----|-------|
| Dark/navy background (`#07111F`) | `white-horizontal`, `white-icon` | `colored-horizontal`, `colored-icon`, `stacked-colored` |
| White/light background | `colored-horizontal`, `colored-icon`, `stacked-colored` | `white-horizontal`, `white-icon` |
| Monochrome / print / B&W | `black-horizontal` | all colored variants |
| Compact space (icon only), dark bg | `white-icon` | `colored-icon` on dark |
| Compact space (icon only), light bg | `colored-icon` | `white-icon` on light |
| Hero, presentation, social | `stacked-colored` | horizontal variants where height allows stacked |

## Why Baked Backgrounds Matter

All official PNGs have **opaque, non-transparent backgrounds**. Placing a navy-background PNG on white creates a dark rectangle; placing a white-background PNG on navy creates a white rectangle. There is no universally correct PNG — choose the variant whose baked background matches the surface.

## Size Guidelines

```tsx
// Component sizes map to these approximate pixel heights:
// xs  — 24px  (icon), ~24px height (horizontal)
// sm  — 32px  (icon), ~32px height (horizontal)
// md  — 40px  (icon), ~40px height (horizontal)  ← default
// lg  — 48px  (icon), ~48px height (horizontal)
// xl  — 64px  (icon), ~64px height (horizontal)

<LagdaLogo variant="white-horizontal" size="sm" />
```

Minimum recommended size: `sm` for horizontal, `xs` for icon. Smaller than `xs` is below the brand's minimum clear space.

## Accessibility

- Always pass `decorative` when the logo is accompanied by a visible text label or when it's a duplicate (e.g., both header and sidebar show the logo).
- When the logo is the only brand identifier on the page (e.g., AuthLayout), omit `decorative` so `aria-label="LAGDA"` is present.
- The favicon uses `LagdaLogoIconFullColorSquare.png` — no accessibility requirement for favicons.

## What NOT to Do

- Do not render `colored-icon` or `stacked-colored` on a dark background.
- Do not render `white-horizontal` or `white-icon` on a light background.
- Do not crop, rotate, recolor, or add effects to the PNG files.
- Do not use old filenames (e.g., `Lagda-colored-logo-horizontal-whitebg-withtext.png`) — they were replaced by canonical names in Command 36.

## Adding a New Screen

1. Determine the surface background color.
2. Pick the appropriate variant from the table above.
3. Use `<LagdaLogo variant="..." size="..." />` — the component handles sizing and fallback.
4. Update `docs/lagda-logo-integration-audit.md` with the new screen entry.
