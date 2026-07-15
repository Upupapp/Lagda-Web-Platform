# LAGDA Design System
> Established: 2026-07-15 — Command 3 (Design System and Brand Assets)
> Status: Working digital standards. Formal brand book pending.

---

## 1. Brand Identity

**Product:** LAGDA — Philippine Legal Document Automation Platform  
**Company:** UpUp Technologies  
**Domain:** lagda.io  
**Products:** LAGDA eSignature (active), LAGDA eNotary (future — pending Supreme Court accreditation)

---

## 2. Brand Personality

| Trait | Expression |
|---|---|
| Precise | Measured layout, tabular data, specific labels |
| Calm | Restrained motion, low-saturation secondary surfaces |
| Responsible | Consistent legal disclaimers, no ambiguous claims |
| Authoritative | Navy and Azure, structured type, minimal decoration |
| Contemporary | Geist typeface, clean radii, modern card system |
| Accessible | Focus rings, contrast-verified combinations, reduced-motion support |

---

## 3. Official Product Names

Use exactly:
- **LAGDA eSignature** (not "e-Signature", "Esign", "electronic signature platform")
- **LAGDA eNotary** (not "e-Notary", "enotary service", "notarization") — always with Coming Soon context
- **LAGDA** (standalone, for the platform brand)
- **UpUp Technologies** (company)

---

## 4. Official Brand Asset Inventory

**Location:** `src/brand elements/`

| File | Type | Status | Usage |
|---|---|---|---|
| `lagda-icon-azure.svg` | SVG (working) | Created Command 3 | Compact nav, app icon, loaders |
| `lagda-icon-white-on-dark.svg` | SVG (working) | Created Command 3 | Dark compact contexts |
| `lagda-icon-mono.svg` | SVG (working) | Created Command 3 | Monochrome/print |
| `Lagda-colored-logo-horizontal-whitebg-withtext.png` | PNG (official) | ⚠️ Not yet received | Light background horizontal logo |
| `Lagda-white-logo-horizontal-bluebg-withtext.png` | PNG (official) | ⚠️ Not yet received | Dark/navy horizontal logo |
| `Lagda-white-logo-square-bluebg-withouttext.png` | PNG (official) | ⚠️ Not yet received | Square icon, dark bg |
| `Lagda-colored-logo-square-whitebg-withouttext.png` | PNG (official) | ⚠️ Not yet received | Square icon, light bg |
| `Lagda-black-logo-horizontal-whitebg-withtext.png` | PNG (official) | ⚠️ Not yet received | Monochrome/print |

> When official PNG files are received, update `LagdaLogo.tsx` to use them as `<img>` assets.
> The SVG working files were derived from the canonical `SHIELD_PATH` constant in `App.tsx`.

---

## 5. Logo Variants

| Variant | Component Prop | Usage |
|---|---|---|
| Colored horizontal | `colored-horizontal` | Light backgrounds, corporate pages, auth shell (light) |
| White horizontal | `white-horizontal` | Deep Navy nav, dark hero, dark footer, platform shell |
| Black horizontal | `black-horizontal` | Monochrome output, grayscale documents, print |
| Colored icon | `colored-icon` | Compact mobile, loading indicator, app icon |
| White icon | `white-icon` | Dark compact navigation, dark loading contexts |
| Mono icon | `mono-icon` | Monochrome compact |

---

## 6. Logo Usage Rules

**DO:**
- Use `LagdaLogo` component for all logo rendering — never raw SVG inline in page code
- Use `white-horizontal` on navy/dark backgrounds
- Use `colored-horizontal` on white/light backgrounds
- Use icon-only variants at compact sizes (below 120px width)
- Preserve aspect ratio at all times

**DO NOT:**
- Stretch or squash the logo
- Rotate the complete logo
- Recolor the shield mark or wordmark outside approved variants
- Place white-background logo files over dark backgrounds
- Place colored logo over colored backgrounds without checking contrast
- Crop the logo mark with `overflow: hidden`
- Use Azure-background icon on Azure surface without contrast check
- Create unapproved AI-generated variations

---

## 7. Working Clear-Space Rule (Digital Standard)

- Maintain clear space equal to approximately **0.25 × icon height** on all four sides
- For the 40px default icon: **10px minimum clear space on every edge**
- Adjacent text, borders, buttons, or viewport edges must not touch the mark
- This is a working frontend standard, not a formally approved print specification

---

## 8. Working Minimum Size Guidance

- **Horizontal logo:** minimum display width **120px** (wordmark must remain legible)
- **Icon only:** minimum display size **20×20px**
- Use icon-only variant instead of shrinking the horizontal wordmark below 120px

---

## 9. Color Tokens

All tokens defined in `src/styles/theme.css`.

### LAGDA Brand Tokens

```css
/* Azure (eSignature — active product) */
--lagda-azure: #0078D4;
--lagda-azure-hover: #006CC1;
--lagda-azure-active: #005BA9;
--lagda-azure-glow: #38BDF8;
--lagda-azure-surface: #EAF6FF;
--lagda-azure-border: #BAE0FA;

/* Navy */
--lagda-navy: #07111F;
--lagda-navy-mid: #0B2344;

/* Burgundy (eNotary — future regulated capability) */
--lagda-burgundy: #67023B;
--lagda-burgundy-hover: #B01262;
--lagda-burgundy-surface: #FCE7F3;
--lagda-burgundy-border: #F9A8D4;

/* Gold (verification, completion, premium accents) */
--lagda-gold: #C9960C;
--lagda-gold-light: #FCD34D;
--lagda-gold-surface: #FFFBEB;

/* Semantic */
--lagda-success: #16A34A;       /* success-surface: #DCFCE7 */
--lagda-warning: #D97706;       /* warning-surface: #FEF3C7 */
--lagda-error: #DC2626;         /* error-surface: #FEE2E2 */
--lagda-info: #0078D4;          /* info-surface: #EAF6FF */
```

### Tailwind Utilities (via `@theme inline`)

The following Tailwind utilities are available after the `@theme inline` block:

```
text-lagda-azure, bg-lagda-azure, border-lagda-azure
text-lagda-navy, bg-lagda-navy
text-lagda-burgundy, bg-lagda-burgundy
bg-lagda-azure-surface, bg-lagda-burgundy-surface
```

---

## 10. Semantic Color Usage

### Azure (#0078D4) — "Available Now"
- Active eSignature capabilities
- Primary action buttons
- Links and interactive controls
- Active navigation state
- Document verification UI
- Security and trust messaging
- Focus rings

### Burgundy (#67023B) — "Future Regulated Capability"
- eNotary Coming Soon labels
- eNotary waitlist actions
- Accreditation and future roadmap messaging
- Locked future capability
- **Never for ordinary active-product primary actions**

### Gold (#C9960C) — Sparingly
- Signature and completion moments
- Logo orbit element
- Verification confirmation
- Loading animation accent
- Premium tier accents

### Success Green (#16A34A)
- Completed transactions
- Verified status
- Successful actions
- **Never as decoration — only when semantically correct**

### Error Red (#DC2626)
- Invalid form states
- Failed actions
- Verification mismatch
- **Not interchangeable with Burgundy**

### Deep Navy (#07111F)
- Page and navigation backgrounds
- Dark surfaces
- High-contrast text on light

---

## 11. eSignature and eNotary Visual Separation

| Attribute | eSignature | eNotary |
|---|---|---|
| Status | Active product | Future regulated capability |
| Primary color | Azure (#0078D4) | Burgundy (#67023B) |
| Surface | #EAF6FF | #FCE7F3 |
| Badge | azure / azure-subtle | burgundy / burgundy-subtle |
| Button variant | `primary` | `enotary` |
| Must display | Active features | Coming Soon disclaimer |
| Legal note | — | "Coming Soon and Subject to Supreme Court Accreditation and applicable rules." |

**Rule:** Burgundy must **never** be the default primary button color across the active eSignature product. It is reserved for eNotary CTAs only.

---

## 12. Typography

### Font Stack
- **Geist** — primary portal and product interface (loaded via Google Fonts CDN)
- **Geist Mono** — verification IDs, timestamps, technical values, monospaced data
- **Inter** — acceptable fallback if Geist is unavailable
- **Note:** Fonts load from `https://fonts.googleapis.com`. For production, consider self-hosting to eliminate CDN dependency.

### Type Scale

| Role | Size | Weight | Use |
|---|---|---|---|
| Display | 40px | 700 | Hero headings, splash screens |
| Hero Heading | 32px | 700 | Primary page headings |
| Page Title | 24px | 700 | Section headers |
| Section Heading | 20px | 600 | Subsections |
| Card Heading | 16px | 600 | Card titles |
| Body Large | 17px | 400 | Marketing body text |
| Body | 15px | 400 | Default body text |
| Body Small | 13px | 400 | Supporting copy |
| Label | 13px | 600 | Form labels, metadata |
| Caption | 11px | 500 | Timestamps, attribution |
| Navigation | 14px | 500 | Nav items |
| Legal | 12px | 400 | Disclaimers (never below 11px) |
| Technical | 13–15px | 400 | Geist Mono, verification IDs |

### Typography Principles
- Avoid script, decorative, or narrow typefaces
- Never use very light body weights (below 400)
- Legal disclaimers must remain legible (11px minimum)
- Uppercase labels use modest letter-spacing (`0.08em`)
- Avoid uppercase body paragraphs

---

## 13. Spacing

Scale defined as CSS variables in `theme.css`:

```
--lagda-sp-1: 4px    --lagda-sp-5: 20px   --lagda-sp-12: 48px
--lagda-sp-2: 8px    --lagda-sp-6: 24px   --lagda-sp-16: 64px
--lagda-sp-3: 12px   --lagda-sp-8: 32px   --lagda-sp-20: 80px
--lagda-sp-4: 16px   --lagda-sp-10: 40px  --lagda-sp-24: 96px
                                           --lagda-sp-30: 120px
```

---

## 14. Layout Containers

```css
--lagda-page-max: 1440px;     /* Full design width */
--lagda-content-max: 1280px;  /* Standard content max */
--lagda-reading-max: 680px;   /* Reading / paragraph width */
--lagda-header-h: 64px;       /* Desktop header height */
--lagda-header-h-mobile: 56px;
```

---

## 15. Breakpoints

| Name | Value | Description |
|---|---|---|
| xs | 375px | Small mobile (iPhone SE) |
| sm | 640px | Mobile landscape |
| md | 768px | Tablet portrait |
| lg | 1024px | Small desktop |
| xl | 1280px | Standard desktop |
| 2xl | 1440px | Full design width |

**Note:** All Figma-imported screens use fixed 1440px layouts. Full responsive refactoring is deferred to later commands. New components built from Command 3 onward are mobile-first.

---

## 16. Border Radii

```css
--lagda-radius-xs: 4px      /* Minimal: chip dots, input corners */
--lagda-radius-sm: 6px      /* Tags, small badges */
--lagda-radius-md: 8px      /* Buttons, inputs, standard cards */
--lagda-radius-lg: 12px     /* Cards, panels, notification tiles */
--lagda-radius-xl: 16px     /* Modals, large cards */
--lagda-radius-2xl: 20px    /* Full-bleed hero panels */
--lagda-radius-pill: 9999px /* Chips, status badges, pills */
--lagda-radius-dialog: 16px /* Modal and drawer corners */
```

---

## 17. Borders

```css
--lagda-border-default: rgba(0,0,0,0.09)   /* Standard component borders */
--lagda-border-strong:  rgba(0,0,0,0.16)   /* Emphasized borders, dividers */
--lagda-border-subtle:  rgba(0,0,0,0.05)   /* Faint structural separators */
```

Dark mode variants flip these to white-based opacity values.

---

## 18. Shadows

```css
--lagda-shadow-subtle:    0 1px 2px rgba(7,17,31,0.05)
--lagda-shadow-card:      0 1px 4px rgba(7,17,31,0.07), 0 0 1px rgba(7,17,31,0.04)
--lagda-shadow-elevated:  0 4px 16px rgba(7,17,31,0.10), 0 1px 4px rgba(7,17,31,0.05)
--lagda-shadow-dialog:    0 8px 40px rgba(7,17,31,0.18), 0 2px 8px rgba(7,17,31,0.07)
--lagda-shadow-azure-glow: 0 4px 20px rgba(0,120,212,0.22)
--lagda-shadow-gold-glow:  0 4px 16px rgba(201,150,12,0.30)
```

Design should feel **premium and structured, not soft and cartoonish**. Avoid floating shadows everywhere, heavy glassmorphism, neon glows, or thick borders.

---

## 19. Surfaces

| Surface | Background | Use |
|---|---|---|
| Page | #ffffff | Default page |
| Raised card | #ffffff + card shadow | Elevated cards |
| Muted card | #f8fafb | Subdued or secondary cards |
| Azure info | #EAF6FF + #BAE0FA border | Information panels, eSignature features |
| Burgundy eNotary | #FCE7F3 + #F9A8D4 border | eNotary coming soon, waitlist panels |
| Success | #DCFCE7 + #86EFAC border | Verification confirmed, completed |
| Warning | #FEF3C7 + #FDE68A border | Needs attention, expiring |
| Error | #FEE2E2 + #FECACA border | Failed, mismatch |
| Navy dark | #07111F | Navigation, footers, auth shell |
| Midnight Azure | #0B2344 | Platform sidebar, dark secondary |
| Code | #f3f3f5 | Verification IDs, technical values |

---

## 20. Button Variants

**File:** `src/app/components/ui/button.tsx`

| Variant | Color | Usage |
|---|---|---|
| `primary` | Azure #0078D4 | Active eSignature and current-product primary actions |
| `primary-outline` | Azure outline | Secondary active-product CTAs |
| `enotary` | Burgundy #67023B | **Only for eNotary waitlist / future-product actions** |
| `enotary-outline` | Burgundy outline | Learn About eNotary, secondary eNotary |
| `navy` | Deep Navy #07111F | Dark CTA on light backgrounds |
| `destructive` | Error Red | Irreversible or destructive actions |
| `ghost` | Transparent | Tertiary / low-emphasis |
| `link` | Text link | Inline navigation |

**Sizes:** `sm` (h-8), `default` (h-9), `md` (h-10), `lg` (h-12), `xl` (h-14), `icon`, `icon-sm`, `icon-lg`

**Accessibility:** All buttons have minimum 44px touch targets at `lg` and above. All use visible `focus-visible` ring styles.

---

## 21. Badge Variants

**File:** `src/app/components/ui/badge.tsx`

| Variant | Use |
|---|---|
| `azure` | Active eSignature feature, current product |
| `azure-subtle` | Secondary active state, soft info |
| `navy` | Enterprise, platform tier |
| `burgundy` | eNotary label (always with context) |
| `burgundy-subtle` | Soft Coming Soon label |
| `success` / `success-subtle` | Verified, completed |
| `warning` / `warning-subtle` | Needs review, expiring |
| `error` / `error-subtle` | Failed, mismatch |
| `gold` / `gold-subtle` | Premium tier, Gold plan |
| `muted` | Archived, inactive, neutral |

---

## 22. Status System

**Files:** `src/app/data/status-map.ts`, `src/app/components/ui/StatusChip.tsx`

### Document Transaction Statuses
draft, ready-to-send, sent, delivered, viewed, auth-completed, awaiting-signature, awaiting-approval, partially-completed, completed, declined, cancelled, expired, failed-delivery, voided, needs-attention, archived

Each status has: label, tone, bgColor, textColor, borderColor, icon indicator, description, isTerminal flag.

**Color is never the only signal** — every status has a human-readable label.

### Verification Statuses (separate from transaction)
verified, mismatch, pending, not-found

**Rule:** "Verified" ≠ "Completed" — a transaction may be completed without the document file matching its verification record.

---

## 23. Form Primitives (Conventions)

Forms use the existing shadcn/ui primitives (`input.tsx`, `label.tsx`, `checkbox.tsx`, etc.) with LAGDA token overrides via `--primary` and `--ring`. Full form system (validation states, helper text, field error) will be built in Command 5 (Auth flows).

**Conventions established:**
- Visible labels (never placeholder-only)
- Required indicator distinct from label
- Error text below field
- `focus-visible` ring using Azure (#0078D4)
- Minimum 44px touch targets for interactive controls

---

## 24. Iconography

- **Primary icon library:** `lucide-react` (already installed, consistent stroke weight)
- **Supplementary:** `@mui/icons-material` (already installed, used by Figma imports)
- **Rule:** Use Lucide for all new components; never mix unrelated families without justification
- **Accessibility:** Decorative icons use `aria-hidden="true"`; status icons are paired with visible text labels
- **No emoji** as production interface icons
- **Logo shield** is never to be used as a generic icon — use only via `LagdaLogo` component

---

## 25. Motion

**File:** `src/styles/theme.css` — `--lagda-dur-*` and `--lagda-ease*` variables

| Token | Value | Use |
|---|---|---|
| `--lagda-dur-fast` | 100ms | Hover, focus, selection |
| `--lagda-dur-std` | 200ms | Most transitions |
| `--lagda-dur-reveal` | 350ms | Route change, content load |
| `--lagda-dur-dialog` | 250ms | Modal/drawer open/close |
| `--lagda-dur-load` | 2600ms | Brand loading sequence |
| `--lagda-ease` | cubic-bezier(0.4,0,0.2,1) | Standard easing |
| `--lagda-ease-out` | cubic-bezier(0,0,0.2,1) | Reveal, entrance |

**Motion principles:** Motion communicates progress, routing, completion, verification, hierarchy. It is not decorative clutter. No scroll-jacking, heavy parallax, or constant glowing.

---

## 26. Loading Animation

**File:** `src/app/components/brand/LagdaLoader.tsx`

### Modes
- `fullscreen` — Fixed overlay, brand sequence (~2.6s), optional wordmark
- `inline` — Small icon area with subtle pulse
- `button` — Ring spinner for loading button states

### Fullscreen Animation Sequence
1. Icon fades in + scales 94% → 100% (0.8s entrance)
2. Gold sweep overlay passes across the icon (left-to-right, 25° angle)
3. Azure illumination radiates from behind the icon
4. Optional wordmark fades up (after 900ms delay)
5. Optional message fades in below wordmark

### Reduced Motion
All animations disabled via `@media (prefers-reduced-motion: reduce)`.
Reduced motion mode shows a static icon (no sweeps, no pulses, no transitions).

### Integration Pattern
```tsx
// Fullscreen brand load
<LagdaLoader mode="fullscreen" theme="dark" message="Preparing your secure workspace" />

// Inline spinner
<LagdaLoader mode="inline" theme="dark" message="Verifying document record" size={32} />

// Inside a button
<Button disabled>
  <LagdaLoader mode="button" theme="dark" />
  Sending…
</Button>
```

---

## 27. Accessibility

- All interactive elements have visible `focus-visible` rings
- Focus ring color: Azure (#0078D4), 3px width
- Status chips: never color-only; every status has a text label
- Logos: use `role="img"` and `aria-label` by default; pass `decorative={true}` when adjacent text covers it
- Loaders: `role="status"` + `aria-live="polite"` + `aria-label`
- Coming Soon badge: visible text "Coming Soon", never just a color or icon
- eNotary disclaimer: minimum 11px font, must remain legible
- MUI Icons and Lucide icons: `aria-hidden="true"` on decorative use

---

## 28. Reduced Motion

Global rule in `theme.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

LagdaLoader respects this via scoped keyframe overrides inside the component's `<style>` tag.

---

## 29. Dark and Light Contexts

The primary portal (App.tsx) uses a fixed deep navy background for the navigation. Pages render on white. Auth shell (`AuthLayout`) uses navy. The `LagdaLogo` component selects the correct variant for each context.

- **Light context:** `colored-horizontal`, `colored-icon` — navy wordmark
- **Dark context:** `white-horizontal`, `white-icon` — white wordmark

Full dark mode (`.dark` class) tokens are defined in `theme.css` for future platform screens. The public portal does not currently use system dark mode.

---

## 30. Content and Legal Restrictions

### Approved Labels
- "Prepare Document" (not "Upload Document")
- "Verify Document"
- "Create Free Account"
- "Book a Demo"
- "Contact Sales"
- "Join the eNotary Waitlist"
- "Loading LAGDA"
- "Preparing your secure workspace"
- "Verifying document record"
- "No documents yet"
- "No matching verification record"
- "Document record verified"
- "Verification mismatch detected"

### Prohibited Claims
- "Guaranteed legally valid"
- "Fully compliant"
- "Supreme Court approved / accredited"
- "Unbreakable security"
- "Blockchain verified"
- "Legally binding in every situation"
- "Zero risk"

### eNotary Legal Constraint (HARD RULE)
Every eNotary page, card, or feature must display:
> "LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules."

eNotary must **NEVER** be represented as: Live, Accredited, Supreme Court approved, Purchasable, Included in eSignature, An active login role, or An active document-workflow option.

---

## 31. Component Locations

| Component | Path |
|---|---|
| `LagdaLogo` | `src/app/components/brand/LagdaLogo.tsx` |
| `LagdaLoader` | `src/app/components/brand/LagdaLoader.tsx` |
| `Button` (extended) | `src/app/components/ui/button.tsx` |
| `Badge` (extended) | `src/app/components/ui/badge.tsx` |
| `StatusChip` | `src/app/components/ui/StatusChip.tsx` |
| `ComingSoonBadge` | `src/app/components/ui/ComingSoonBadge.tsx` |
| `EmptyState` | `src/app/components/ui/EmptyState.tsx` |
| `VerificationId` | `src/app/components/ui/VerificationId.tsx` |
| Status map | `src/app/data/status-map.ts` |
| Design tokens | `src/styles/theme.css` |
| Brand asset SVGs | `src/brand elements/` |
| Design showcase | `src/app/pages/dev/DesignSystemShowcase.tsx` → `/dev/design-system` |

---

## 32. Known Unresolved Brand Decisions

| Item | Status |
|---|---|
| Official PNG logo files | ⚠️ Not yet received; SVG working files in use |
| Exact mathematical clear-space formula | Pending formal brand book |
| CMYK / Pantone values | Pending formal brand book |
| Print minimum sizes | Pending formal brand book |
| Trademark rules | Legal review pending |
| Official photography direction | Not established |
| Official illustration system | Not established |
| Lottie or SVG animation source files | Not available |
| Favicon export package | Not finalized |
| Social preview / OG image template | Not built |

---

## 33. Migration Guidance for Legacy Generated Pages

All 14 Figma-imported screens (`src/imports/`) are legacy generated code and do not use the design system tokens. They will be progressively replaced with real component-based pages in later commands.

**Legacy screens still requiring migration:**

| Screen | URL | Status |
|---|---|---|
| eSignature Overview | /esignature | Figma import — migrate in Command 4 |
| eSignature Core Workflow | /esignature/core-workflow | Figma import — migrate in Command 4 |
| eSignature Verification & Audit | /esignature/verification-and-audit | Figma import — migrate later |
| eSignature Advanced Capabilities | /esignature/advanced-capabilities | Figma import — migrate later |
| eSignature Templates & Branding | /esignature/templates-and-branding | Figma import — migrate later |
| eSignature Team & Enterprise | /esignature/team-and-enterprise | Figma import — migrate later |
| Security Overview | /security | Figma import — migrate later |
| Security Trust Center | /security/trust-center | Figma import — migrate later |
| Solutions All | /solutions | Figma import — migrate later |
| Solutions Lawyers | /solutions/lawyers | Figma import — migrate later |
| Pricing Main | /pricing | Figma import — migrate later |
| Pricing Compare Plans | /pricing/compare | Figma import — migrate later |
| Resources Guides | /resources | Figma import — migrate later |
| Resources FAQ | /resources/faq | Figma import — migrate later |

**The fixed-1440px layout** affects all 14 Figma screens. Full responsive refactoring deferred to Command 3+ cleanup pass.

---

## Validation Results (Command 3)

| Check | Result |
|---|---|
| Production build | ✅ `npm run build` — 1.18s, no errors |
| Dev server | ✅ Starts correctly |
| Logo component renders all 6 variants | ✅ Verified in showcase at `/dev/design-system` |
| Loader (fullscreen, inline, button modes) | ✅ Verified in showcase |
| Reduced-motion keyframe overrides | ✅ Declared in LagdaLoader and theme.css |
| AuthLayout uses LagdaLogo | ✅ `white-horizontal` variant |
| PlatformLayout uses LagdaLogo | ✅ `white-horizontal` variant |
| NotFound uses LagdaLogo | ✅ `colored-icon` variant |
| App.tsx Brand() uses LagdaLogo | ✅ `white-horizontal` variant |
| Build size | ⚠️ 1.89MB JS (pre-existing — Figma imports; deferred to Command 11) |
| TypeScript strict | ⚠️ tsconfig not yet configured (deferred to Command 3 cleanup) |
| ESLint | ⚠️ Not yet configured (deferred) |
| Unit tests | ⚠️ Test framework not configured (deferred to Command 11) |
| Google Fonts CDN dependency | ⚠️ Fonts loaded from CDN; self-hosting recommended for production |
