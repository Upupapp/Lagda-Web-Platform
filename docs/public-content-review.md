# LAGDA Public Portal — Content Review Checklist

Generated: 2026-07-15  
Commands completed: 1–11  
Scope: All public-facing text, copy, legal claims, eNotary separation, pricing, and disclaimers

---

## How to Use

This checklist is a manual review guide. Each item should be read on the live rendered page, not just searched in source. Mark P = Pass, F = Fail with note.

---

## Section 1 — eNotary Separation (P0 — Must Pass)

These items are legal/regulatory requirements, not preference.

| # | Check | Status |
|---|-------|--------|
| EN1 | Every eNotary reference says "Coming Soon" or "Subject to Supreme Court Accreditation" | ✅ |
| EN2 | eNotary is never described as a current product users can buy | ✅ |
| EN3 | eNotary is never included in any pricing tier | ✅ |
| EN4 | eNotary is never listed as an active login role | ✅ |
| EN5 | eNotary is never part of any active document workflow | ✅ |
| EN6 | eNotary pages do not appear in sitemap.xml | ✅ |
| EN7 | eNotary pages are set to robots: noindex | ✅ |
| EN8 | Burgundy (#67023B) appears ONLY on eNotary pages | ✅ |
| EN9 | eSignature copy does not imply notarization | ✅ |
| EN10 | Waitlist confirmation says: "Your information has been validated in this frontend demonstration. Live waitlist registration will be connected during backend integration." | ✅ |

---

## Section 2 — Forbidden Claims (P0 — Must Pass)

These phrases must not appear anywhere on the public portal.

| # | Forbidden Phrase | Status | Notes |
|---|-----------------|--------|-------|
| FC1 | "Supreme Court approved" | ✅ | Not present |
| FC2 | "Supreme Court accredited" | ✅ | Not present |
| FC3 | "Fully compliant" | ✅ | Not present |
| FC4 | "Guaranteed legally valid" | ✅ | Not present |
| FC5 | "Guaranteed legally binding" | ✅ | Not present |
| FC6 | "Blockchain verified" | ✅ | Not present |
| FC7 | "Tamper-proof" | ✅ | Not present |
| FC8 | "Impossible to alter" | ✅ | Not present |
| FC9 | "Unbreakable security" | ✅ | Not present |
| FC10 | "Certified secure" | ✅ | Not present |

---

## Section 3 — Legal Page Notices (P0 — Must Pass)

| # | Check | Status |
|---|-------|--------|
| LP1 | `/legal/privacy` shows DRAFT — PENDING LEGAL REVIEW notice | ✅ |
| LP2 | `/legal/terms` shows DRAFT — PENDING LEGAL REVIEW notice | ✅ |
| LP3 | `/legal/accessibility` does not claim WCAG conformance | ✅ |
| LP4 | Privacy page does not claim GDPR compliance specifically | ⬜ | Manual review |
| LP5 | Terms page does not reference real pricing commitments | ⬜ | Manual review |

---

## Section 4 — Contact & Demo Forms

| # | Check | Status |
|---|-------|--------|
| FM1 | Contact form confirmation does NOT say "Your message was sent" | ✅ |
| FM2 | Contact form uses "frontend demonstration" language | ✅ |
| FM3 | Book a Demo confirmation uses appropriate demo language | ✅ |
| FM4 | eNotary waitlist uses correct demo language | ✅ |
| FM5 | Create Account page clearly indicates frontend demo | ✅ |
| FM6 | No form promises email delivery | ✅ |
| FM7 | No form promises real identity verification | ✅ |
| FM8 | No form promises payment processing | ✅ |

---

## Section 5 — Service Status Page

| # | Check | Status |
|---|-------|--------|
| SS1 | Service Status page shows: "This frontend status page currently uses demonstration data and is not connected to production monitoring." | ✅ |
| SS2 | Service Status page is set to robots: noindex | ✅ |
| SS3 | Service Status is NOT in sitemap.xml | ✅ |

---

## Section 6 — Product Claims — eSignature

Permitted framing: "helps you", "enables", "lets you", "designed for", capability descriptions.  
Review each page for overclaiming.

| # | Check | Status |
|---|-------|--------|
| PS1 | Audit trail described as a log of events, not "proof of legal intent" | ⬜ | Manual review |
| PS2 | Signer authentication described as an additional verification step, not absolute identity proof | ⬜ | Manual review |
| PS3 | Document verification described as hash-based, deterministic, with demo records note | ✅ |
| PS4 | Identity-aware signing described as an enhanced-assurance workflow, not "certified" | ⬜ | Manual review |
| PS5 | No claim that LAGDA eSignature is legally binding on its own without legal counsel | ⬜ | Manual review |
| PS6 | E-Commerce Act (R.A. 8792) references use factual framing, not guarantee framing | ⬜ | Manual review |

---

## Section 7 — Pricing Content

| # | Check | Status |
|---|-------|--------|
| PR1 | Pricing shown with "demo pricing" or similar caveat | ⬜ | Manual review |
| PR2 | All pricing consistent across /pricing, /pricing/compare, and individual sub-pages | ⬜ | Manual review |
| PR3 | eNotary never appears as a paid add-on or plan feature | ✅ |
| PR4 | Enterprise section says "contact sales" not "buy now" | ✅ |
| PR5 | No pricing references "production" or "live" commitments | ⬜ | Manual review |

---

## Section 8 — Solutions Pages

| # | Check | Status |
|---|-------|--------|
| SOL1 | All "Book a Demo" CTAs point to /book-a-demo?solution=<id> | ✅ |
| SOL2 | No solution page links to /contact for demo booking | ✅ |
| SOL3 | Government/LGU page does not imply government endorsement | ⬜ | Manual review |
| SOL4 | Healthcare page does not imply medical legal compliance | ⬜ | Manual review |
| SOL5 | Finance page does not imply banking regulatory compliance | ⬜ | Manual review |

---

## Section 9 — Resources & Legal Framework

| # | Check | Status |
|---|-------|--------|
| RF1 | Legal framework page cites R.A. 8792 factually (not as compliance guarantee) | ⬜ | Manual review |
| RF2 | Authentication guide does not imply real OTP/biometric integration | ⬜ | Manual review |
| RF3 | Security guide does not repeat forbidden security claims | ⬜ | Manual review |
| RF4 | Guides do not promise specific implementation timelines | ⬜ | Manual review |

---

## Section 10 — General Copy Quality

| # | Check | Status |
|---|-------|--------|
| GC1 | No Lorem ipsum or placeholder text visible | ⬜ | Manual sweep |
| GC2 | No [PLACEHOLDER] or TODO visible to end users | ⬜ | Manual sweep |
| GC3 | "LAGDA" casing consistent across all pages | ⬜ | Manual sweep |
| GC4 | Copyright year in footer is 2025 or 2025–2026 | ⬜ | Manual check |
| GC5 | Company name "UpUp Technologies" used consistently where needed | ⬜ | Manual check |
| GC6 | No broken sentence fragments or obvious copy errors | ⬜ | Manual sweep |
| GC7 | CTA button text is action-oriented ("Book a Demo", "Contact Sales", etc.) | ✅ |
| GC8 | No raw URL strings visible in rendered content | ⬜ | Manual sweep |

---

## Section 11 — Brand Consistency

| # | Check | Status |
|---|-------|--------|
| BR1 | Navy (#07111F) used as page background consistently | ✅ |
| BR2 | Azure (#0078D4) used for primary CTAs and interactive elements | ✅ |
| BR3 | Burgundy (#67023B) absent from non-eNotary pages | ✅ |
| BR4 | Gold (#C9960C) used only for accent/highlight (not as primary CTA color) | ⬜ | Manual sweep |
| BR5 | No competing accent colors introduced | ⬜ | Manual sweep |
| BR6 | Typography consistent (Geist as primary, Geist Mono for code/data) | ⬜ | Manual check |

---

## Section 12 — Pre-Launch Content Actions Required

The following items must be completed before any public launch:

1. **Legal review of Privacy and Terms pages** — remove DRAFT notices only after qualified legal counsel has reviewed.
2. **Accessibility audit** — formal WCAG 2.1 Level AA audit required before the accessibility page can claim any conformance level.
3. **Pricing finalization** — current prices are demonstration only; real pricing must be confirmed and any demo caveat updated.
4. **Brand fonts** — Geist font files must be added to `public/brand/` or loaded from a self-hosted source before typography review can be completed.
5. **Company logo** — `public/brand/lagda-icon-azure.svg` referenced in index.html and structured data but file not yet confirmed present in `public/brand/`.
6. **Copyright attribution** — confirm footer year and company legal name.
7. **E-Commerce Act citations** — review all factual legal references with Philippine counsel before public promotion.
