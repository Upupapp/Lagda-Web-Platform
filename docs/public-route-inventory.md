# LAGDA Public Portal — Route Inventory

Generated: 2026-07-15  
Commands completed: 1–11  
Build status: Clean (336 KB initial bundle after C11 lazy loading)

## Classification Key

| Status | Meaning |
|--------|---------|
| Complete | Useful content, correct shell, metadata, responsive layout, accessible interactions |
| Complete (minor issues) | Renders correctly; minor issues documented |
| Partial | Page exists with content but missing metadata, mobile fixes, or other items |
| Dev placeholder | Renders DevPlaceholder component — not a production page |
| Intentionally unavailable | Future product — labeled Coming Soon |
| Redirect | Issues redirect to canonical path |

---

## General

| Path | Component | Layout | Status | Indexable | Notes |
|------|-----------|--------|--------|-----------|-------|
| `/` | Home | PublicLayout | Complete | Yes | Home page, full design system |
| `/sign-in` | SignIn | AuthLayout | Complete | No | Frontend demo only, no real auth |
| `/create-account` | CreateAccount | AuthLayout | Complete | No | Frontend demo only, ?plan= preselection works |
| `/verify` | VerifyDocument | PublicLayout | Complete | Yes | Deterministic demo records, public-safe |
| `/book-a-demo` | BookADemo | PublicLayout | Complete | No | ?solution= and ?topic= context awareness |
| `/contact` | ContactPage | PublicLayout | Complete | Yes | ?category= preselection works |
| `/help` | HelpCenter | PublicLayout | Complete | Yes | Static help content |
| `/service-status` | ServiceStatus | PublicLayout | Complete | No (demo data) | Demo data only, clearly labeled |
| `/verify-email` | DevPlaceholder | AuthLayout | Dev placeholder | No | Auth flow not yet built |
| `/forgot-password` | DevPlaceholder | AuthLayout | Dev placeholder | No | Auth flow not yet built |
| `/reset-password` | DevPlaceholder | AuthLayout | Dev placeholder | No | Auth flow not yet built |
| `/mfa` | DevPlaceholder | AuthLayout | Dev placeholder | No | Auth flow not yet built |
| `/invitation` | DevPlaceholder | AuthLayout | Dev placeholder | No | Auth flow not yet built |
| `/onboarding` | DevPlaceholder | AuthLayout | Dev placeholder | No | Auth flow not yet built |

---

## eSignature

| Path | Component | Status | Indexable | Notes |
|------|-----------|--------|-----------|-------|
| `/esignature` | EsigOverview | Complete | Yes | Product overview |
| `/esignature/core-workflow` | EsigCoreWorkflow | Complete | Yes | |
| `/esignature/verification-and-audit` | EsigVerificationAudit | Complete | Yes | |
| `/esignature/advanced-capabilities` | EsigAdvancedCapabilities | Complete | Yes | |
| `/esignature/templates-and-branding` | EsigTemplatesBranding | Complete | Yes | |
| `/esignature/team-and-enterprise` | EsigTeamEnterprise | Complete | Yes | |

---

## Features

| Path | Component | Status | Indexable |
|------|-----------|--------|-----------|
| `/features` | FeaturesOverview | Complete | Yes |
| `/features/document-preparation` | DocPrep | Complete | Yes |
| `/features/participant-roles` | ParticipantRoles | Complete | Yes |
| `/features/parallel-signing` | ParallelSigning | Complete | Yes |
| `/features/sequential-signing` | SequentialSigning | Complete | Yes |
| `/features/signer-authentication` | SignerAuth | Complete | Yes |
| `/features/identity-aware-signing` | IdentityAwareSigning | Complete | Yes |
| `/features/audit-trail` | AuditTrail | Complete | Yes |
| `/features/document-verification` | DocVerification | Complete | Yes |
| `/features/templates` | Templates | Complete | Yes |
| `/features/contacts` | Contacts | Complete | Yes |
| `/features/company-branding` | CompanyBranding | Complete | Yes |
| `/features/team-workspaces` | TeamWorkspaces | Complete | Yes |
| `/features/notifications` | Notifications | Complete | Yes |
| `/features/storage-and-plan-limits` | StoragePlanLimits | Complete | Yes |
| `/features/api-and-integrations` | ApiIntegrations | Complete | Yes |

---

## Solutions

| Path | Component | Status | Indexable |
|------|-----------|--------|-----------|
| `/solutions` | SolutionsOverview | Complete | Yes |
| `/solutions/lawyers` | Lawyers | Complete | Yes |
| `/solutions/law-firms` | LawFirms | Complete | Yes |
| `/solutions/business-teams` | BusinessTeams | Complete | Yes |
| `/solutions/government-and-lgu` | GovernmentLGU | Complete | Yes |
| `/solutions/real-estate` | RealEstate | Complete | Yes |
| `/solutions/hr-and-recruitment` | HRRecruitment | Complete | Yes |
| `/solutions/finance` | Finance | Complete | Yes |
| `/solutions/procurement` | Procurement | Complete | Yes |
| `/solutions/education` | Education | Complete | Yes |
| `/solutions/healthcare-and-wellness` | HealthcareWellness | Complete | Yes |

---

## Pricing

| Path | Component | Status | Indexable |
|------|-----------|--------|-----------|
| `/pricing` | PricingOverview | Complete | Yes |
| `/pricing/compare` | ComparePlans | Complete | Yes |
| `/pricing/signing-requests` | SigningRequests | Complete | Yes |
| `/pricing/storage-limits` | StorageLimits | Complete | Yes |
| `/pricing/templates-by-plan` | TemplatesByPlan | Complete | Yes |
| `/pricing/authentication-by-plan` | AuthByPlan | Complete | Yes |
| `/pricing/enterprise` | EnterprisePricing | Complete | Yes |
| `/pricing/faq` | PricingFaq | Complete | Yes |

---

## Security

| Path | Component | Status | Indexable |
|------|-----------|--------|-----------|
| `/security` | SecurityOverview | Complete | Yes |
| `/security/trust-center` | TrustCenter | Complete | Yes |
| `/security/account-security` | AccountSecurity | Complete | Yes |
| `/security/signer-authentication` | SecuritySignerAuth | Complete | Yes |
| `/security/identity-verification` | IdentityVerification | Complete | Yes |
| `/security/audit-trail` | SecurityAuditTrail | Complete | Yes |
| `/security/document-verification` | SecurityDocVerification | Complete | Yes |
| `/security/device-and-location-evidence` | DeviceLocationEvidence | Complete | Yes |
| `/security/secure-storage` | SecureStorage | Complete | Yes |
| `/security/privacy-and-data-protection` | PrivacyDataProtection | Complete | Yes |

---

## Resources

| Path | Component | Status | Indexable |
|------|-----------|--------|-----------|
| `/resources` | ResourcesOverview | Complete | Yes |
| `/resources/guides` | GuidesOverview | Complete | Yes |
| `/resources/faq` | ResourcesFaq | Complete | Yes |
| `/resources/legal-framework` | LegalFramework | Complete | Yes |
| `/resources/document-verification-guide` | VerificationGuide | Complete | Yes |
| `/resources/authentication-guide` | AuthGuide | Complete | Yes |
| `/resources/templates-guide` | TemplatesGuide | Complete | Yes |
| `/resources/security-guide` | SecurityGuide | Complete | Yes |

---

## Legal

| Path | Component | Status | Indexable | Notes |
|------|-----------|--------|-----------|-------|
| `/legal/privacy` | Privacy | Complete (minor) | Yes | Draft notice visible — pending legal review |
| `/legal/terms` | Terms | Complete (minor) | Yes | Draft notice visible — pending legal review |
| `/legal/accessibility` | Accessibility | Complete (minor) | Yes | No formal WCAG conformance claimed |
| `/legal/*` | DevPlaceholder | Dev placeholder | No | Catch-all for unbuilt legal paths |

---

## eNotary (Intentionally Coming Soon)

| Path | Component | Status | Indexable | Notes |
|------|-----------|--------|-----------|-------|
| `/enotary` | EnotaryOverview | Intentionally unavailable | No | Coming Soon — Supreme Court accreditation pending |
| `/enotary/future-capabilities` | FutureCapabilities | Intentionally unavailable | No | |
| `/enotary/accreditation-roadmap` | AccreditationRoadmap | Intentionally unavailable | No | |
| `/enotary/waitlist` | EnotaryWaitlist | Intentionally unavailable | No | Frontend demo waitlist form |
| `/enotary/faq` | EnotaryFaq | Intentionally unavailable | No | |

---

## Platform (Authenticated — Not Part of Public Portal)

| Path | Component | Status | Indexable |
|------|-----------|--------|-----------|
| `/app` | PlatformIndex | Dev placeholder | No |
| `/app/*` | DevPlaceholder | Dev placeholder | No |

---

## Dev Only

| Path | Component | Status | Indexable | Notes |
|------|-----------|--------|-----------|-------|
| `/dev/design-system` | DesignSystemShowcase | Dev only | No | Not linked from public navigation |

---

## Navigation Fixes Applied in C11

The following nav.config.ts paths were corrected (wrong paths → correct router paths):

| Section | Was | Now |
|---------|-----|-----|
| Solutions | `/solutions/business` | `/solutions/business-teams` |
| Solutions | `/solutions/government` | `/solutions/government-and-lgu` |
| Solutions | `/solutions/hr` | `/solutions/hr-and-recruitment` |
| Pricing | `/pricing/signing` | `/pricing/signing-requests` |
| Pricing | `/pricing/storage` | `/pricing/storage-limits` |
| Pricing | `/pricing/templates` | `/pricing/templates-by-plan` |
| Security | `/security/evidence` | `/security/device-and-location-evidence` |
| Security | `/security/storage` | `/security/secure-storage` |
| Resources | `/resources/legal` | `/resources/legal-framework` |
| Resources | Guides → `/resources` | `/resources/guides` |
| eNotary | `/enotary/features` | `/enotary/future-capabilities` |
| eNotary | `/enotary/roadmap` | `/enotary/accreditation-roadmap` |
| Footer | `/solutions/business` | `/solutions/business-teams` |
| Footer | `/solutions/government` | `/solutions/government-and-lgu` |
| Footer | `/resources/legal` | `/resources/legal-framework` |
| Footer | `/enotary/roadmap` | `/enotary/accreditation-roadmap` |

---

## Known Issues / Deviations

1. **No 404 in footer/nav** — NotFound page is correctly triggered by `path: "*"` in public children.
2. **Pricing sub-pages missing from nav** — `/pricing/authentication-by-plan` not in nav menu (by design — discovered via SubNav).
3. **Features sub-pages** — not individually in the mega-menu (only overview is accessible). Individual feature pages are linked from overview and feature SubNav.
4. **eNotary in footer** — Links are present but labeled Coming Soon. Correct.
5. **Dev routes not exposed** — `/dev/design-system` is not in public navigation, not in sitemap, set noindex.
