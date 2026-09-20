// Colours that pass WCAG 1.4.3 AA on the product's LIGHT surfaces.
//
// ── The mistake this exists to stop ────────────────────────────────────────
//
// The public site's muted ramp was chosen against navy and measured there:
// `--lagda-on-navy-muted: #94A3B8` is 7.39:1 on #07111F, and theme.css says
// so. The same values then got reused on white and near-white panels, where
// #94A3B8 is 2.56:1 — below AA for normal text, and below the 3:1 large-text
// allowance too.
//
// Nothing in an inline `color: "#94A3B8"` records which background it was
// picked against, so the reuse looked harmless every time. The same slip
// produced the platform header's Command-K hint and the sidebar's section
// headings, both fixed earlier.
//
// ── How these were chosen ──────────────────────────────────────────────────
//
// Each is the darkest step that keeps the original hue recognisable, and each
// was measured against EVERY light background it actually appears on — not
// just white. Those backgrounds, taken from a live axe run rather than from
// the stylesheet:
//
//   #ffffff #f5fafd #f8fafb #f2f8fd #f0f8ff #f7f2f5
//   #efebef #e4f0f8 #e2f0fc #eef2f0 #f4f2e8 #f2f0f3
//   #fef6e8 #eafaf0 #e6f2fb #e7f2fb #e6f3fd
//
// The ratio quoted on each line is the WORST case across all of them, so a
// value is safe on any of these panels without checking which one it landed
// on. `on-light.test.ts` re-derives every number, so a future edit that
// breaks one fails rather than merely looking plausible.
//
// ── What this is NOT for ───────────────────────────────────────────────────
//
// Navy surfaces. On #07111F these are far too dark to read; the
// `--lagda-on-navy-*` ramp in theme.css is correct there and stays. This
// module is only for text sitting on the light panels listed above.
//
// Azure is TEXT only. As a button FILL with white text it is already correct
// and is deliberately untouched — a fill and a glyph are different problems.

/** Every light background these colours are measured against. */
export const LIGHT_SURFACES = [
  "#ffffff", "#f5fafd", "#f8fafb", "#f2f8fd", "#f0f8ff", "#f7f2f5",
  "#efebef", "#e4f0f8", "#e2f0fc", "#eef2f0", "#f4f2e8", "#f2f0f3",
  "#fef6e8", "#eafaf0", "#e6f2fb", "#e7f2fb", "#e6f3fd",
] as const;

export const ON_LIGHT = {
  /** Muted body and helper text. Was #94A3B8 (2.17:1 worst case). */
  muted: "#5B6776",
  /** Secondary text. Was #64748B (4.03:1 worst case — just under). */
  slate: "#5A6673",
  /** Success, ticks, "Included". Was #16A34A (2.79:1) / #22C55E (1.93:1). */
  success: "#166534",
  /** Azure as TEXT. Was #0078D4 (3.84:1 worst case). Not for fills. */
  azure: "#0063B1",
  /** Warning, "Planned", pending. Was #C9960C / #9A7208 / #F59E0B (1.82:1). */
  gold: "#7D5C06",
} as const;

/** Worst-case ratio across `LIGHT_SURFACES`, asserted by the test. */
export const ON_LIGHT_MEASURED = {
  muted: 4.88,
  slate: 4.97,
  success: 6.04,
  azure: 5.21,
  gold: 5.23,
} as const;
