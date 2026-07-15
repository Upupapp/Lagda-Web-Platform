# LAGDA Security Pages — Architecture Reference (Command 7)

## Overview

10 production React pages under `/security` — built as part of Command 7.
Replaces the previous `security/*` catch-all route that rendered Figma imports via `App.tsx`.
All pages use `PublicLayout` (fixed 72px header) via react-router 7 `createBrowserRouter`.

## Navigation

`SecuritySubNav` uses **10 individual links** (same pattern as `EsigSubNav`):

| Label           | Path                                      |
|:----------------|:------------------------------------------|
| Overview        | `/security`                               |
| Trust Center    | `/security/trust-center`                  |
| Account Security| `/security/account-security`              |
| Signer Auth     | `/security/signer-authentication`         |
| Identity        | `/security/identity-verification`         |
| Audit Trail     | `/security/audit-trail`                   |
| Verification    | `/security/document-verification`         |
| Evidence        | `/security/device-and-location-evidence`  |
| Storage         | `/security/secure-storage`                |
| Privacy         | `/security/privacy-and-data-protection`   |

## Shared components

All pages import from:
- `EsigPageShell.tsx` — `PageHero`, `PageSection`, `SectionHeading`, `RelatedPages`, `PageCTA`, `LegalNote`, `AvailBadge`
- `SecuritySubNav.tsx` — `SecurityPageShell` (wraps every security page)
- `content.ts` — centralized content arrays: `SECURITY_LAYERS`, `AUTH_COMPARISON`, `EVIDENCE_TYPES`, `DATA_CATEGORIES`, `STORAGE_STAGES`, `PRIVACY_PRINCIPLES`, `TRUST_RESOURCES`, `PUBLIC_EVIDENCE`, `PRIVATE_EVIDENCE`

## Pages

| Route                                         | Component file                | Key content / approach                     |
|:----------------------------------------------|:------------------------------|:-------------------------------------------|
| `/security`                                   | `SecurityOverview.tsx`        | 7-layer model, section map with links, no-guarantees callout |
| `/security/trust-center`                      | `TrustCenter.tsx`             | `TRUST_RESOURCES` grid, responsible disclosure form |
| `/security/account-security`                  | `AccountSecurity.tsx`         | `AccountSecurityDiagram` mockup, MFA grid, workspace enforcement |
| `/security/signer-authentication`             | `SecuritySignerAuth.tsx`      | `AUTH_COMPARISON` table (overflow-x scroll), channel concept, risk model |
| `/security/identity-verification`             | `IdentityVerification.tsx`    | 4-layer spine diagram, provides/does-not table, eNotary separation |
| `/security/audit-trail`                       | `SecurityAuditTrail.tsx`      | Write-once integrity, 3-tier access (Public/Workspace/Legal), retention |
| `/security/document-verification`             | `SecurityDocVerification.tsx` | 4-step flow, public/private split from `PUBLIC_EVIDENCE`/`PRIVATE_EVIDENCE` |
| `/security/device-and-location-evidence`      | `DeviceLocationEvidence.tsx`  | `EVIDENCE_TYPES` table, IP accuracy caveats, precise-location permission |
| `/security/secure-storage`                    | `SecureStorage.tsx`           | `STORAGE_STAGES` lifecycle, access-by-role grid, deletion behavior |
| `/security/privacy-and-data-protection`       | `PrivacyDataProtection.tsx`   | `DATA_CATEGORIES`, `PRIVACY_PRINCIPLES`, data subject rights |

## Patterns

```tsx
// Every security page follows this shell:
import { SecurityPageShell } from "../../../components/security/SecuritySubNav";
import { PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote } from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function PageName() {
  return (
    <SecurityPageShell>
      <PageHero eyebrow="..." headingId="..." heading="..." sub="..." />
      <PageSection id="..." light bordered>...</PageSection>
      <RelatedPages links={[...]} />
      <PageCTA heading="..." primaryLabel="..." primaryPath="..." />
      <LegalNote />
    </SecurityPageShell>
  );
}
```

## App.tsx cleanup

The following were removed from `App.tsx` as part of Command 7:
- `DLagdaSecurityOverview` import
- `DLagdaSecurityTrustCenter` import
- `SecurityTab` type and `securityTab` state
- `"security"` from `Section` type
- Security rendering lines from JSX
- Security-specific CSS rules from `globalOverrides`
- Security cases from `pathToState()`

## Legal constraints

- `<LegalNote />` on every page; `<LegalNote showEnotary />` on pages that reference eNotary
- eNotary referenced in: `SecurityOverview.tsx`, `IdentityVerification.tsx`
- Forbidden claims NOT used: "Supreme Court approved", "Tamper-proof", "Blockchain verified", "Certified secure", "Guaranteed legally valid"
- No certification badges, no compliance attestations, no partner logos
- `TrustCenter.tsx` explicitly calls out what the page does NOT do
