# LAGDA Frontend Documentation Index

Last updated: 2026-07-16 (Commands 1–35 complete)

---

## Product and Content

| Document | Description |
|----------|-------------|
| [product-terminology.md](product-terminology.md) | Canonical terminology — preferred terms, terms to avoid, status vocabulary |
| [final-content-and-claims-review.md](final-content-and-claims-review.md) | Legal and product-claim review — what is approved, what needs revision |

---

## Public Portal

| Document | Description |
|----------|-------------|
| [public-site-shell.md](public-site-shell.md) | Public layout, navigation, footer |
| [public-route-inventory.md](public-route-inventory.md) | All public routes with metadata |
| [esignature-pages.md](esignature-pages.md) | /esignature product page family |
| [features-pages.md](features-pages.md) | /features page family |
| [security-pages.md](security-pages.md) | /security page family |
| [public-content-review.md](public-content-review.md) | Public content audit |
| [public-portal-qa-matrix.md](public-portal-qa-matrix.md) | QA verification matrix |
| [public-portal-release-readiness.md](public-portal-release-readiness.md) | Public portal release readiness |

---

## Platform Architecture

| Document | Description |
|----------|-------------|
| [frontend-baseline.md](frontend-baseline.md) | Framework choices, conventions, constraints |
| [frontend-architecture.md](frontend-architecture.md) | Architecture overview, layer descriptions |
| [platform-shell.md](platform-shell.md) | Authenticated platform layout, navigation, shell |
| [platform-route-map.md](platform-route-map.md) | All authenticated platform routes |
| [design-system.md](design-system.md) | Colors, typography, spacing, component patterns |

---

## Authentication and Onboarding

| Document | Description |
|----------|-------------|
| [authentication-flows.md](authentication-flows.md) *(pending)* | Sign-in, account creation, MFA, session expiry flows |
| [onboarding-flows.md](onboarding-flows.md) *(pending)* | 7-step onboarding flow |
| [authentication-security-notes.md](authentication-security-notes.md) *(pending)* | Auth security boundary notes |

---

## Dashboard

| Document | Description |
|----------|-------------|
| [customer-dashboard.md](customer-dashboard.md) | Dashboard widgets, activity, shortcuts |

---

## Documents

| Document | Description |
|----------|-------------|
| [documents-workspace.md](documents-workspace.md) | Document list, filters, status overview |
| [document-details.md](document-details.md) *(pending)* | Transaction detail tabs |
| [document-participants.md](document-participants.md) *(pending)* | Participant tab detail |
| [document-activity.md](document-activity.md) *(pending)* | Activity tab detail |
| [document-evidence.md](document-evidence.md) *(pending)* | Evidence tab detail |

---

## Verification

| Document | Description |
|----------|-------------|
| [authenticated-document-verification.md](authenticated-document-verification.md) *(pending)* | /app/verify authenticated flow |

---

## Preparation and Field Editor

| Document | Description |
|----------|-------------|
| [prepare-document-workflow.md](prepare-document-workflow.md) *(pending)* | 6-step preparation wizard |
| [field-placement-editor.md](field-placement-editor.md) *(pending)* | Field editor canvas, field types, drag-and-drop |

---

## Recipient Experience

| Document | Description |
|----------|-------------|
| [recipient-signing-experience.md](recipient-signing-experience.md) *(pending)* | All recipient roles, signing stages |

---

## Templates

| Document | Description |
|----------|-------------|
| [templates-and-reusable-workflows.md](templates-and-reusable-workflows.md) | Template library, create, use, field editor |

---

## Contacts

| Document | Description |
|----------|-------------|
| [contacts-and-participant-directory.md](contacts-and-participant-directory.md) *(pending)* | Contact CRUD, groups, import, picker |

---

## Workspace Administration

| Document | Description |
|----------|-------------|
| [workspaces-teams-roles-administration.md](workspaces-teams-roles-administration.md) | Members, teams, roles, permissions, invitations |

---

## Settings

| Document | Description |
|----------|-------------|
| [profile-security-notifications-billing-usage-integrations.md](profile-security-notifications-billing-usage-integrations.md) | All 15 settings routes |

---

## Service Layer

| Document | Description |
|----------|-------------|
| [frontend-service-layer.md](frontend-service-layer.md) | Service interfaces, mock adapters, error taxonomy, result contracts |

---

## Mock Data

| Document | Description |
|----------|-------------|
| [mock-data-and-scenarios.md](mock-data-and-scenarios.md) | Fixture registry, ID strategy, scenario catalog, privacy rules |

---

## Security and Privacy

| Document | Description |
|----------|-------------|
| [frontend-security-and-privacy-review.md](frontend-security-and-privacy-review.md) | Storage, network, logging, sensitive state, eNotary boundary |

---

## Accessibility

| Document | Description |
|----------|-------------|
| [final-accessibility-audit.md](final-accessibility-audit.md) *(planned)* | WCAG-oriented audit findings |

---

## Responsive QA

| Document | Description |
|----------|-------------|
| [final-responsive-qa.md](final-responsive-qa.md) *(planned)* | Viewport breakpoint verification |

---

## Performance

| Document | Description |
|----------|-------------|
| [frontend-performance-review.md](frontend-performance-review.md) *(planned)* | Bundle sizes, code splitting, budget baselines |

---

## Testing

| Document | Description |
|----------|-------------|
| [frontend-testing-strategy.md](frontend-testing-strategy.md) | Unit, component, service, fixture, route, permission, integration, a11y test strategy |

---

## Release Readiness

| Document | Description |
|----------|-------------|
| [frontend-release-checklist.md](frontend-release-checklist.md) | Full release checklist — quality, content, security, a11y, responsive |
| [final-frontend-audit.md](final-frontend-audit.md) | C25 complete audit report |

---

## Backend Integration

| Document | Description |
|----------|-------------|
| [backend-integration-handoff.md](backend-integration-handoff.md) | All backend requirements — auth, documents, signing, completion, admin, billing |
| [backend-implementation-priority.md](backend-implementation-priority.md) | Prioritized backend endpoint list (P0–P3) with recommended build order |
| [frontend-known-limitations.md](frontend-known-limitations.md) | Honest list of all frontend-only limitations |

---

## MVP Consolidation (C35)

**Read these in order for a complete picture of the current product state:**

| Document | Description |
|----------|-------------|
| [lagda-esignature-mvp-scope.md](lagda-esignature-mvp-scope.md) | Definitive MVP scope — what's in, what's not, demonstration accuracy statement |
| [mvp-consolidation-audit.md](mvp-consolidation-audit.md) | Full audit through C32 — nav, routes, search, flags, gating issues found and fixed |
| [launch-feature-classification.md](launch-feature-classification.md) | Every capability classified by maturity level |
| [advanced-feature-gating.md](advanced-feature-gating.md) | 3-layer gating architecture: launch profiles, feature flags, permissions |
| [launch-readiness-matrix.md](launch-readiness-matrix.md) | Frontend/backend/legal readiness per capability — P0 blockers identified |
| [launch-route-map.md](launch-route-map.md) | Complete route inventory (~187 routes across public + authenticated) |
| [launch-navigation-model.md](launch-navigation-model.md) | Nav architecture, role-based visibility, mobile nav rules |
| [end-to-end-launch-journeys.md](end-to-end-launch-journeys.md) | 9 critical user journeys with step-by-step flows and backend deps |
| [mvp-readiness-gaps.md](mvp-readiness-gaps.md) | 39 gaps across backend, infrastructure, legal, and frontend |
| [deferred-feature-roadmap.md](deferred-feature-roadmap.md) | All deferred/future capabilities with readiness requirements |

---

## Module Docs Added C26–C35

| Document | Description |
|----------|-------------|
| [signature-library.md](signature-library.md) | Signature Library (C26) |
| [recipient-inbox.md](recipient-inbox.md) | Recipient Inbox (C27) |
| [notifications-center.md](notifications-center.md) | Notifications Center (C28) |
| [reports-center.md](reports-center.md) | Reports Center (C29) |
| [global-search-command-palette.md](global-search-command-palette.md) | Global Search + Command Palette (C30) |
| [document-organization.md](document-organization.md) | Document Organization — Folders, Tags, Views, Favorites, Bulk (C31) |
| [workflow-automation-rules-policies-simulations-and-conflicts.md](workflow-automation-rules-policies-simulations-and-conflicts.md) | Workflow Automation (C32) — enterprise-preview, gated by default |
| [signing-workflow-stage-routing-kanban-and-esignature-requirements.md](signing-workflow-stage-routing-kanban-and-esignature-requirements.md) | **Signing Workflow (C37)** — per-document stage routing, Kanban board, per-participant eSignature requirements. Launch core, enabled by default. **Not** Workflow Automation. |
| [signing-workflow-audit.md](signing-workflow-audit.md) | Pre-implementation audit of the routing surface for C37 |

---

## Notes

Documents marked *(pending)* were not created in Commands 1–25 because the implementation was completed correctly without requiring a separate doc file. They are candidates for future documentation sprints.

Documents marked *(planned)* require tooling (automated accessibility scanner, browser automation) that is outside the current frontend-only build phase.
