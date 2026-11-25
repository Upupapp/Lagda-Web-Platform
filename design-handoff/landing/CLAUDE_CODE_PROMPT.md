# Task: rebuild the LAGDA home page (`/`) to match the reference exactly

This is a pixel-match port, not a redesign. The reference page is finished and approved.
Your job is to reproduce it in this React app, wire it to the real routes, and prove it matches.

## Source of truth (read these first, in this order)

1. `design-handoff/landing/reference/index.html` — the exact page: every colour, size, spacing value, breakpoint and animation is in this file.
2. `design-handoff/landing/reference/screenshots/` — what it must look like:
   - `desktop-1440-first-screen.jpg`, `desktop-1440-full-page.jpg` (1440 × 900 viewport)
   - `mobile-390-first-screen.jpg`, `mobile-390-full-page.jpg` (390 × 844 viewport)
3. `design-handoff/landing/reference/img/` — every image the page uses.

Open `reference/index.html` in a browser before writing code, so you see it running.

## Rules that make it match (do not skip)

- **Copy values, don't reinterpret them.** Convert each inline `style="…"` to a React style object with the same values (hex colours, px, `clamp()`, letter-spacing, shadows, gradients). Do not round, do not swap in this repo's tokens, theme colours, Tailwind classes or "close enough" values.
- **Keep the `<style>` block.** Move the CSS from the reference's `<head><style>` into `src/app/pages/public/home/landing.css` (imported by the page). Prefix every class with `lgl-` (`.hero-fade` → `.lgl-hero-fade`) so nothing leaks into other pages, and update the JSX `className`s to match. Keep every media query and keyframe.
- **Keep the copy word for word.** No rewording, no extra sections, no removed sections.
- **Keep the fonts.** The page uses Geist and Geist Mono (already loaded in this repo). Do not apply the site's serif headings, wave backdrop, frosted bands, reveal animations or any other public-site theme to this page.
- **Images:** copy `reference/img/*` to `src/assets/landing/` and `import` them; keep the same `object-fit` and `object-position` values.
- **Decorative mockups stay as markup** (the signing letter, QR code, stamp, the bento tile mockups). Port them as JSX exactly; keep `aria-hidden`.

## Scope and layout

The reference has its own announcement bar, header and footer. To avoid changing every other public page:

1. Create `src/app/layouts/LandingLayout.tsx` for `/` only. Keep what `PublicLayout` does that isn't visual: `SkipLink`, `usePageMeta()`, `useStructuredData()`, scroll-to-top on route change, `<main id="main-content">`, and the `<Suspense>` around the outlet. Do NOT render `PublicHeader`, `PublicFooter` or `AppWaveBackdrop` in it.
2. Build the page as `src/app/pages/public/home/LandingPage.tsx` (split into section components if you like: `LandingHeader`, `LandingHero`, … `LandingFooter`).
3. In `src/router.tsx`, route the index `/` to `LandingLayout` + `LandingPage`. Leave `EsigOverview` in place at `/esignature`; every other public route keeps `PublicLayout`.
4. Header behaviour to keep from the real site: the mobile menu toggle (the reference already has one; make it a React state toggle with `aria-expanded`), and the signed-in state (next section).

## Wire every link (use `<Link to>` from react-router; never `href="#"`)

| Element | Goes to |
|---|---|
| Logo | `/` |
| Announcement "Join the waitlist" | `/enotary/waitlist` |
| Nav: eSignature · Solutions · Pricing · Security · Resources · eNotary | `/esignature` · `/solutions` · `/pricing` · `/security` · `/resources` · `/enotary` |
| Header "Sign in" | `/sign-in` (hide when signed in) |
| Header "Get started free", hero and final "Create a free account" | `useAccountCta()` from `src/app/hooks/useSignedIn.ts`: use its `path`; signed out keep the reference wording, signed in show its `label` ("Go to Dashboard") |
| "Book a demo" (hero and final) | `/book-a-demo` |
| Built-for tiles: Government & LGUs · Law firms · Real estate · Business teams · HR & recruitment · Finance · Education | `/solutions/government-and-lgu` · `/solutions/law-firms` · `/solutions/real-estate` · `/solutions/business-teams` · `/solutions/hr-and-recruitment` · `/solutions/finance` · `/solutions/education` |
| "See how tracking works →" | `/esignature/core-workflow` |
| "Compare plans →" | `/pricing/compare` |
| Verify form | On submit: trimmed ID → `navigate(\`/verify/${encodeURIComponent(id)}\`)`; empty → `/verify`. Make "Verify" a real `<button type="submit">` styled exactly like the reference link. |
| Footer: Verify a document → | `#verify` (scroll to the section) |
| Footer PRODUCT | eSignature `/esignature` · Core workflow `/esignature/core-workflow` · Templates & branding `/esignature/templates-and-branding` · Team & enterprise `/esignature/team-and-enterprise` · Pricing `/pricing` |
| Footer SOLUTIONS | Lawyers & law firms `/solutions/law-firms` · Business teams `/solutions/business-teams` · Government & LGUs `/solutions/government-and-lgu` · Real estate `/solutions/real-estate` · HR & finance `/solutions/hr-and-recruitment` |
| Footer TRUST | Security overview `/security` · Trust center `/security/trust-center` · Identity verification `/security/identity-verification` · Audit trail `/security/audit-trail` · Privacy & data `/security/privacy-and-data-protection` |
| Footer HELP | Help center `/help` · Guides `/resources/guides` · FAQ `/resources/faq` · Contact us `/contact` · Service status `/service-status` |
| Footer ENOTARY | Notary directory: plain `<a href={ENOTARY_DIRECTORY_PATH}>` from `src/app/config/enotary-directory.ts` (it is a static page, full load, same as `PublicFooter`) · Roadmap `/enotary/accreditation-roadmap` · Join the waitlist `/enotary/waitlist` |
| Footer bottom | Privacy Policy `/legal/privacy` · Terms of Service `/legal/terms` · Accessibility `/legal/accessibility` |

If any route above no longer exists, stop and tell me instead of guessing.

## Prove it matches (required before you say you're done)

1. `npm run dev`, then use Playwright (already in the repo) to screenshot `http://localhost:5173/` at 1440 × 900 and 390 × 844, first screen and full page, with `reducedMotion: 'reduce'` so animations sit at their end state.
2. Put each screenshot next to the matching file in `reference/screenshots/` and compare section by section: spacing, font sizes, colours, line breaks, image crops, the hero white fade, the fact strip and its thin line.
3. Fix every difference and repeat until they match. Report anything you could not match and why.
4. Click through every link in the table and confirm each lands on the right page; test the Verify form with and without an ID; test the mobile menu; sign in with the demo and confirm the CTAs switch to "Go to Dashboard".
5. Run `npm run check` (typecheck, lint, tests, build). If tests asserted the old home page content, update them to the new page; don't delete test coverage.

Work on a new branch (`landing-redesign`) and don't push until I've reviewed it.
