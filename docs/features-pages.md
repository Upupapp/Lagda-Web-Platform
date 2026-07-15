# LAGDA Features Pages — Architecture Reference (Command 7)

## Overview

16 production React pages under `/features` — built as part of Command 7.
All pages use `PublicLayout` (fixed 72px header) via react-router 7 `createBrowserRouter`.

## Navigation

`FeaturesSubNav` uses **5 group tabs** (not 16 individual links):

| Group Key    | Label          | Paths covered                                                        | Link-to                       |
|:-------------|:---------------|:---------------------------------------------------------------------|:------------------------------|
| `overview`   | Overview       | `/features`                                                          | `/features`                   |
| `core`       | Core Workflow  | `/features/document-preparation`, `/participant-roles`, `/parallel-signing`, `/sequential-signing` | `/features/document-preparation` |
| `trust`      | Trust & Evidence | `/features/signer-authentication`, `/identity-aware-signing`, `/audit-trail`, `/document-verification` | `/features/signer-authentication` |
| `productivity` | Productivity | `/features/templates`, `/contacts`, `/company-branding`, `/notifications` | `/features/templates`       |
| `team`       | Team & Scale   | `/features/team-workspaces`, `/storage-and-plan-limits`, `/api-and-integrations` | `/features/team-workspaces` |

## Shared components

All pages import from:
- `EsigPageShell.tsx` — `PageHero`, `PageSection`, `SectionHeading`, `RelatedPages`, `PageCTA`, `LegalNote`, `AvailBadge`, `FeatureCard`
- `FeaturesSubNav.tsx` — `FeaturesPageShell` (wraps every features page)
- `content.ts` — centralized content arrays and constants

## Pages

| Route                                | Component file          | Key interactive element       |
|:-------------------------------------|:------------------------|:------------------------------|
| `/features`                          | `FeaturesOverview.tsx`  | `LifecycleStrip`, `CapabilityMap` |
| `/features/document-preparation`     | `DocPrep.tsx`           | `DocWorkspaceMockup`          |
| `/features/participant-roles`        | `ParticipantRoles.tsx`  | `RoleAssignmentMockup`, eNotary callout |
| `/features/parallel-signing`         | `ParallelSigning.tsx`   | `ParallelDiagram` (useState) — click participants |
| `/features/sequential-signing`       | `SequentialSigning.tsx` | `SequentialDiagram` (useState) — step selector |
| `/features/signer-authentication`    | `SignerAuth.tsx`        | `AuthMethodSelector` (useState) |
| `/features/identity-aware-signing`   | `IdentityAwareSigning.tsx` | `IdentityLayerDiagram` — vertical spine |
| `/features/audit-trail`              | `AuditTrail.tsx`        | `AuditTimeline` — expandable rows (aria-expanded) |
| `/features/document-verification`    | `DocVerification.tsx`   | `VerificationDemo` (useState) — 4 states |
| `/features/templates`                | `Templates.tsx`         | `TemplateLibraryMockup` |
| `/features/contacts`                 | `Contacts.tsx`          | `ContactListMockup` |
| `/features/company-branding`         | `CompanyBranding.tsx`   | `BrandingPreview` (useState) — before/after toggle |
| `/features/notifications`            | `Notifications.tsx`     | `NotificationCenter` — dismissible events |
| `/features/team-workspaces`          | `TeamWorkspaces.tsx`    | `WorkspaceMockup` |
| `/features/storage-and-plan-limits`  | `StoragePlanLimits.tsx` | static — limit categories |
| `/features/api-and-integrations`     | `ApiIntegrations.tsx`   | `ApiEndpointMockup` — illustrative endpoints |

## Patterns

```tsx
// Every features page follows this shell:
import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import { PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote } from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function PageName() {
  return (
    <FeaturesPageShell>
      <PageHero eyebrow="..." headingId="..." heading="..." sub="..." />
      <PageSection id="..." light bordered>...</PageSection>
      <RelatedPages links={[...]} />
      <PageCTA heading="..." primaryLabel="..." primaryPath="..." />
      <LegalNote />
    </FeaturesPageShell>
  );
}
```

## Legal constraints

- `<LegalNote />` appears on every page
- `<LegalNote showEnotary />` used on pages referencing eNotary
- eNotary is referenced only in: `ParticipantRoles.tsx` (NOT AN ACTIVE ROLE callout, Burgundy), `FeaturesOverview.tsx`
- No certification claims, no usage statistics, no customer logos
- `AvailBadge` tiers: `Core` | `Advanced` | `Enterprise`

## Fictional data used

- Company: Mabini Legal Solutions, Santos & Cruz Law, Cruz Ventures Inc., Lim & Associates
- Participants: Ana Reyes, Marco Santos, Lea Cruz, Pedro Lim
- Verification ID: LAGDA-VER-2026-004821
- Document: Professional Services Agreement.pdf
