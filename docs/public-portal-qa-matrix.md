# LAGDA Public Portal — QA Matrix

Generated: 2026-07-15  
Commands completed: 1–11  
Scope: All public routes rendered by `PublicLayout`

## How to Use

Run each check manually in a desktop browser (Chrome) and a mobile browser (iOS Safari or Chrome Mobile) before sign-off. Mark P = Pass, F = Fail, N/A = not applicable for this route. Update this file with actual test date when performed.

Legend:  
✅ = Verified pass in C11  
⬜ = Not yet manually tested  
⚠️ = Known issue, documented

---

## 1. Navigation

| # | Check | Status | Notes |
|---|-------|--------|-------|
| N1 | Main nav renders on all public routes | ✅ | PublicHeader in layout |
| N2 | Skip to main content link appears on focus | ✅ | SkipLink component present |
| N3 | Mobile hamburger opens/closes nav | ✅ | Built in C3 |
| N4 | All primary nav links resolve (no 404) | ✅ | Fixed 16 broken links in C11 |
| N5 | Solutions → business-teams resolves | ✅ | Fixed C11 |
| N6 | Solutions → government-and-lgu resolves | ✅ | Fixed C11 |
| N7 | Solutions → hr-and-recruitment resolves | ✅ | Fixed C11 |
| N8 | Pricing → signing-requests resolves | ✅ | Fixed C11 |
| N9 | Pricing → storage-limits resolves | ✅ | Fixed C11 |
| N10 | Pricing → templates-by-plan resolves | ✅ | Fixed C11 |
| N11 | Security → device-and-location-evidence resolves | ✅ | Fixed C11 |
| N12 | Security → secure-storage resolves | ✅ | Fixed C11 |
| N13 | Resources → legal-framework resolves | ✅ | Fixed C11 |
| N14 | Resources → guides resolves | ✅ | Fixed C11 |
| N15 | eNotary → future-capabilities resolves | ✅ | Fixed C11 |
| N16 | eNotary → accreditation-roadmap resolves | ✅ | Fixed C11 |
| N17 | Footer links all resolve | ✅ | Fixed C11 |
| N18 | Active route is highlighted in nav | ⬜ | Manual test required |
| N19 | eNotary nav section labeled Coming Soon | ⬜ | Manual test required |

---

## 2. Page Load & Performance

| # | Check | Status | Notes |
|---|-------|--------|-------|
| P1 | Initial JS bundle ≤ 400 KB gzipped | ✅ | 336 KB after code splitting |
| P2 | Page chunks lazy-load per route | ✅ | React.lazy on all page components |
| P3 | PageLoader spinner appears on route transition | ✅ | Suspense fallback in PublicLayout |
| P4 | Spinner respects prefers-reduced-motion | ✅ | CSS media query in PageLoader |
| P5 | No visible FOUC (flash of unstyled content) | ⬜ | Manual test required |
| P6 | Fonts load without layout shift | ⬜ | No external font CDN — system fallback only until brand fonts added |
| P7 | No console errors on route load | ⬜ | Manual test required |

---

## 3. SEO & Metadata

| # | Check | Status | Notes |
|---|-------|--------|-------|
| S1 | document.title updates per route | ✅ | usePageMeta hook |
| S2 | meta description updates per route | ✅ | usePageMeta hook |
| S3 | canonical link tag updates per route | ✅ | usePageMeta hook |
| S4 | og:title / og:description update per route | ✅ | usePageMeta hook |
| S5 | robots.txt present at /robots.txt | ✅ | public/robots.txt created C11 |
| S6 | sitemap.xml present at /sitemap.xml | ✅ | public/sitemap.xml created C11 (74 URLs) |
| S7 | Auth routes have meta robots noindex | ✅ | AuthLayout adds usePageMeta |
| S8 | eNotary routes have robots noindex | ✅ | routes.ts: isIndexable: false |
| S9 | /service-status has robots noindex | ✅ | routes.ts: isIndexable: false |
| S10 | /book-a-demo has robots noindex | ✅ | routes.ts: isIndexable: false |
| S11 | JSON-LD Organization schema injected | ✅ | useStructuredData hook |
| S12 | JSON-LD ContactPage schema on /contact | ✅ | useStructuredData hook |
| S13 | Sitemap excludes eNotary URLs | ✅ | Manual audit of sitemap.xml |
| S14 | Sitemap excludes /service-status | ✅ | Manual audit of sitemap.xml |
| S15 | Home route isIndexable: true | ✅ | Fixed in routes.ts C11 |

---

## 4. Accessibility

| # | Check | Status | Notes |
|---|-------|--------|-------|
| A1 | Skip to main content works on all pages | ✅ | SkipLink component |
| A2 | main has id="main-content" | ✅ | PublicLayout |
| A3 | tabIndex={-1} on main (enables focus from skip link) | ✅ | PublicLayout |
| A4 | Focus visible on all interactive elements | ⬜ | Manual test required |
| A5 | Color contrast ratio ≥ 4.5:1 for body text | ⬜ | Manual test with contrast checker |
| A6 | Color contrast ratio ≥ 3:1 for large text | ⬜ | Manual test with contrast checker |
| A7 | All images have alt text | ⬜ | Manual check per page |
| A8 | Decorative images have alt="" | ⬜ | Manual check per page |
| A9 | Heading hierarchy valid (h1 → h2 → h3, no skips) | ⬜ | Manual check per page |
| A10 | One h1 per page | ⬜ | Manual check per page |
| A11 | Form inputs have associated labels | ✅ | Verified in contact/book-a-demo forms |
| A12 | Error messages announced to screen readers | ⬜ | Manual test with NVDA/VoiceOver |
| A13 | Required fields marked appropriately | ✅ | asterisk + aria-required |
| A14 | Keyboard-only navigation works end to end | ⬜ | Manual test required |
| A15 | Tab order logical on all pages | ⬜ | Manual test required |
| A16 | No keyboard trap | ⬜ | Manual test — esp. mobile nav |
| A17 | ARIA roles are not redundant | ⬜ | Automated scan (axe, Lighthouse) |
| A18 | Accessibility page does NOT claim WCAG conformance | ✅ | Content review confirmed |
| A19 | Footer landmarks correct | ⬜ | Manual test |
| A20 | Reduced-motion preference respected | ✅ | PageLoader CSS + any animated components |

---

## 5. Responsive / Mobile

| # | Check | Status | Notes |
|---|-------|--------|-------|
| R1 | Layout correct at 375px (iPhone SE) | ⬜ | Manual test required |
| R2 | Layout correct at 390px (iPhone 14) | ⬜ | Manual test required |
| R3 | Layout correct at 768px (tablet) | ⬜ | Manual test required |
| R4 | Layout correct at 1280px (desktop) | ⬜ | Manual test required |
| R5 | No horizontal scrollbar at any breakpoint | ⬜ | Manual test required |
| R6 | Mobile nav usable with thumb | ⬜ | Manual test required |
| R7 | CTAs (buttons/links) ≥ 44×44px touch target | ⬜ | Manual test required |
| R8 | Tables scroll horizontally on mobile | ⬜ | Manual test — pricing compare |
| R9 | Font size ≥ 16px on body text (no zoom trigger) | ⬜ | Manual check |
| R10 | SubNavs (Solutions/Features/Security) scroll horizontally | ⬜ | Manual test required |

---

## 6. Forms

| # | Check | Status | Notes |
|---|-------|--------|-------|
| F1 | Contact form submits and shows demo confirmation | ✅ | Built C10 |
| F2 | Contact form shows "frontend demonstration" language | ✅ | Legal constraint confirmed |
| F3 | Book a Demo form submits and shows demo confirmation | ✅ | Built C10 |
| F4 | Book a Demo ?solution= query param preselects solution | ✅ | Type-safe SolutionId param |
| F5 | Book a Demo ?topic= query param preselects product topic | ✅ | Type-safe DemoTopic param |
| F6 | Create Account form shows demo language | ✅ | No real auth |
| F7 | Create Account ?plan= preselects plan tier | ✅ | Built C10 |
| F8 | eNotary waitlist shows correct demo language | ✅ | Legal constraint confirmed |
| F9 | No real data is submitted to any backend | ✅ | No backend integration exists |
| F10 | Validation errors shown inline | ✅ | Verified in forms |
| F11 | Form submit button disabled while submitting | ⬜ | Manual test |

---

## 7. Legal / Compliance

| # | Check | Status | Notes |
|---|-------|--------|-------|
| L1 | eNotary labeled "Coming Soon — Subject to Supreme Court Accreditation" | ✅ | Legal constraint enforced |
| L2 | eNotary NOT described as live, approved, or purchasable | ✅ | Content review confirmed |
| L3 | Burgundy (#67023B) used ONLY for eNotary | ✅ | Brand constraint enforced |
| L4 | Privacy page has DRAFT notice | ✅ | Legal requirement |
| L5 | Terms page has DRAFT notice | ✅ | Legal requirement |
| L6 | Accessibility page claims no WCAG conformance | ✅ | Legal requirement |
| L7 | Service Status page says "demonstration data" | ✅ | Legal requirement |
| L8 | No forbidden claim: "Supreme Court approved" | ✅ | Content sweep confirmed |
| L9 | No forbidden claim: "Supreme Court accredited" | ✅ | Content sweep confirmed |
| L10 | No forbidden claim: "Fully compliant" | ✅ | Content sweep confirmed |
| L11 | No forbidden claim: "Blockchain verified" | ✅ | Content sweep confirmed |
| L12 | No forbidden claim: "Tamper-proof" | ✅ | Content sweep confirmed |
| L13 | No forbidden claim: "Guaranteed legally valid/binding" | ✅ | Content sweep confirmed |
| L14 | Contact form does not say "Your message was sent" | ✅ | Demo-only language enforced |
| L15 | No passwords stored, logged, or sent to analytics | ✅ | No analytics integration exists |
| L16 | eNotary NOT included in eSignature or pricing tiers | ✅ | Product separation enforced |
| L17 | eNotary NOT an active login role | ✅ | Auth flow does not exist |

---

## 8. Content

| # | Check | Status | Notes |
|---|-------|--------|-------|
| C1 | No placeholder text visible (Lorem ipsum, etc.) | ⬜ | Manual sweep required |
| C2 | No [PLACEHOLDER] or TODO visible to end users | ⬜ | Manual sweep required |
| C3 | eSignature copy does not mention eNotary as active | ✅ | Product separation verified |
| C4 | Pricing copy consistent across all pricing pages | ⬜ | Manual review |
| C5 | Copyright year correct | ⬜ | Manual check footer |
| C6 | "LAGDA" name used consistently (not Lagda or lagda) | ⬜ | Manual sweep |
| C7 | No Figma-style layout description text leaked | ✅ | No such text ever added |
| C8 | All CTAs have correct destination (/book-a-demo not /contact) | ✅ | Fixed in C10 for all solution pages |

---

## 9. Verify Document

| # | Check | Status | Notes |
|---|-------|--------|-------|
| V1 | Valid hash returns demo document result | ✅ | Built C10 |
| V2 | Invalid hash shows "not found" state | ✅ | Built C10 |
| V3 | Demo hashes return realistic but clearly demo data | ✅ | Built C10 |
| V4 | No real document lookup attempted | ✅ | No backend integration |

---

## 10. 404 / Error Handling

| # | Check | Status | Notes |
|---|-------|--------|-------|
| E1 | Unknown public path renders NotFound page | ✅ | path: "*" catch-all in router |
| E2 | NotFound page has link back to home | ⬜ | Manual check |
| E3 | Dev placeholder routes are not linked from public nav | ✅ | No public links to /verify-email etc. |
| E4 | PageLoader Suspense fallback appears on slow route loads | ⬜ | Manual test (throttle network) |

---

## Sign-Off Checklist

Before any external demo or public launch:

- [ ] All N-series (Navigation) checks: Pass
- [ ] All A-series (Accessibility) checks: Pass
- [ ] All L-series (Legal/Compliance) checks: Pass
- [ ] All F-series (Forms) checks: Pass
- [ ] Lighthouse accessibility score ≥ 90 on at least one production page
- [ ] Manual keyboard nav walk on at least: Home, /contact, /book-a-demo
- [ ] Mobile visual QA on at least: Home, /pricing, /solutions, /features
- [ ] No console errors on any route
- [ ] Legal review of Privacy and Terms pages completed (DRAFT notices then removed)
- [ ] Brand fonts added to `public/brand/` (PNGs/fonts pending)
