# LAGDA Public-Site Shell

**Command 4 — Delivered at commit `02e3bcf`**

The public-site shell is the shared frame that wraps every public portal route: header, footer, skip link, and the scroll/focus infrastructure. All components live in `src/app/components/shell/`.

---

## Architecture

```
PublicLayout (src/app/layouts/PublicLayout.tsx)
├── SkipLink           — keyboard skip to #main-content
├── PublicHeader       — fixed 72px nav (mega menu, mobile drawer)
├── <main id="main-content" style={{ paddingTop: 72 }}>
│   └── <Outlet />     — App.tsx (Figma imports) or DevPlaceholder
└── PublicFooter       — canonical 6-column footer
```

### Navigation data source

All nav and footer link data lives in **`src/app/config/nav.config.ts`**:
- `TOP_NAV` — array of `NavSection` objects (label, path, matchPrefix, accent, items)
- `FOOTER_COLUMNS` — array of `FooterColumn` objects

When adding a new section or page, update this file. Components re-render automatically.

---

## Components

### `PublicHeader`

**File:** `src/app/components/shell/PublicHeader.tsx`

- Fixed 72px header at `z-50`
- Logo → `<Link to="/esignature">`
- Desktop nav: each top-level button toggles the mega dropdown (`aria-expanded`, `aria-haspopup="menu"`)
- Active state: `pathname.startsWith(section.matchPrefix)` via `useLocation()`
- Hover-intent: 420ms to open, 240ms to close (same UX as before)
- Keyboard: `ArrowDown`/`Enter`/`Space` on the trigger opens the menu; `Escape` closes it; `Tab` moves naturally
- Mega menu items: `<Link>` components — navigation happens without callbacks
- Dropdown closes on route change via `useEffect([pathname])`
- Mobile: hamburger button reveals `MobileDrawer`
- Scroll detection: `scrolled` state adds backdrop blur + azure border-bottom at `window.scrollY > 24`
- Right actions: Sign In (`/sign-in`), Create Free Account (`/create-account`)

### `PublicFooter`

**File:** `src/app/components/shell/PublicFooter.tsx`

- 7-column grid: brand area + 6 link columns (Product, Solutions, Security & Trust, Resources, eNotary, Legal)
- eNotary compliance notice bar at top (burgundy, required legal statement)
- UpUp Technologies attribution in brand column
- Bottom bar: copyright year (auto-derived) + legal links
- Replaces all Figma-import footers (suppressed via `[data-name="footer"], [data-name="Footer"] { display: none !important }` in `App.tsx`'s `globalOverrides`)

### `SkipLink`

**File:** `src/app/components/shell/SkipLink.tsx`

- `href="#main-content"` targeting the `<main>` element in PublicLayout
- Fixed position, slides down from above on `:focus` (CSS transition)
- First focusable element in the DOM — screen readers and keyboard users hit it before the header
- z-index 10100 (above everything)

### `AnnouncementBanner`

**File:** `src/app/components/shell/AnnouncementBanner.tsx`

- Dismissible (session-only via React state)
- Three tones: `info` (azure), `warning` (amber), `enotary` (burgundy)
- Optional `linkLabel` + `linkPath` for a CTA
- Not rendered by PublicLayout by default — import and add as needed
- Usage: `<AnnouncementBanner message="..." linkLabel="Learn more" linkPath="/resources" tone="info" />`

### `Breadcrumb`

**File:** `src/app/components/shell/Breadcrumb.tsx`

- URL-derived: splits `pathname` into segments, maps via `SEGMENT_LABELS` dict
- `minDepth` prop (default 2): breadcrumbs hidden on root-level pages (e.g., `/esignature`)
- `aria-current="page"` on the last crumb
- Usage: add `<Breadcrumb />` to page-level components where appropriate

---

## App.tsx — simplified

`App.tsx` no longer owns navigation. Changes from the old version:

| Old | New |
|-----|-----|
| `useState` for section/tab | Derived from `useLocation().pathname` via `pathToState()` |
| `useNavigate` + bidirectional sync effects | Removed entirely |
| `MainNav`, `MobileMenu`, `MegaDropdown` components | Moved to `PublicHeader` |
| Scroll detection in App | Moved to `PublicHeader` |
| `stateToPath`, `initialStateFromUrl` | Removed |
| `haptic` function | Extracted to `src/app/utils/haptic.ts` |

`App.tsx` now only: reads URL → renders the correct Figma import → applies `globalOverrides` CSS.

### contentPullUp (unchanged behavior)

Figma imports embed their own nav/sub-nav at the top. To hide them behind the fixed PublicHeader, `App.tsx` applies a negative `marginTop` to the content block. `PublicLayout`'s `<main>` adds 72px `paddingTop`; the negative margin slides the Figma nav area behind the fixed header.

| Route | pullUp | Net (72 - pullUp) |
|-------|--------|-------------------|
| `/esignature` | 80px | –8px (Figma nav behind header) |
| `/esignature/core-workflow` | 136px | –64px (Figma nav + sub-nav behind header) |
| `/security/trust-center` | 0px | +72px (no Figma nav in flow) |
| `/solutions/lawyers` | 144px | –72px (Figma nav + sub-nav) |

---

## Accessibility

- **Landmark structure:** `<header role="banner">`, `<nav aria-label="Main navigation">`, `<main id="main-content">`, `<footer role="contentinfo">`
- **Skip link:** always-present, visible on keyboard focus
- **Active page:** `aria-current="page"` on nav buttons matching current route
- **Mega menu:** `aria-expanded`, `aria-haspopup="menu"` on triggers; `role="menu"` + `role="menuitem"` on panel items
- **Mobile drawer:** `role="dialog"`, `aria-modal="true"`, Escape closes, body scroll lock
- **Focus ring:** `button:focus-visible, a:focus-visible` — 2px azure outline, 3px offset (in `globalOverrides`)
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables all CSS animations

---

## Adding content to the shell

**New nav section:**
1. Add to `TOP_NAV` in `nav.config.ts` — `id`, `label`, `path`, `matchPrefix`, `items[]`
2. Add a route in `router.tsx` (or use the existing `*` DevPlaceholder wildcard)
3. If it's a Figma import section, add to `pathToState()` in `App.tsx` and render in the JSX

**New footer column:**
1. Add to `FOOTER_COLUMNS` in `nav.config.ts`

**Announcement banner:**
Add in `PublicLayout.tsx` between `<SkipLink />` and `<PublicHeader />`:
```tsx
<AnnouncementBanner
  message="Maintenance scheduled for Sunday 10pm–12am PHT."
  tone="warning"
  dismissible
/>
```

---

## Files

| Path | Purpose |
|------|---------|
| `src/app/config/nav.config.ts` | Centralized nav + footer data |
| `src/app/utils/haptic.ts` | Mobile haptic feedback utility |
| `src/app/components/shell/SkipLink.tsx` | Keyboard skip link |
| `src/app/components/shell/PublicHeader.tsx` | Fixed nav + mega menu + mobile drawer |
| `src/app/components/shell/PublicFooter.tsx` | 6-column footer |
| `src/app/components/shell/Breadcrumb.tsx` | URL-derived breadcrumb nav |
| `src/app/components/shell/AnnouncementBanner.tsx` | Dismissible announcement bar |
| `src/app/components/shell/index.ts` | Barrel exports |
| `src/app/layouts/PublicLayout.tsx` | Root public shell (imports shell components) |
| `src/app/App.tsx` | Figma-import renderer (simplified — no nav) |
