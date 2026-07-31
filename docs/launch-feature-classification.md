# Launch Feature Classification

**Version:** C35  
**Date:** 2026-07-16

This document classifies every capability by `ProductCapabilityMaturity`. The canonical registry is `src/app/config/product-capability-registry.ts`.

---

## Maturity Levels

| Level | Meaning |
|---|---|
| `launch-core` | Required for MVP — blocks launch if absent |
| `launch-supporting` | Ships with MVP, enhances value |
| `post-launch` | Available in enterprise-preview profile, or shortly after launch |
| `enterprise-preview` | Enterprise tier, not part of default launch |
| `development-only` | Dev profile only, never ships to users |
| `deferred` | Decided not to ship now |
| `future-product` | Separate product requiring its own go-to-market |

---

## launch-core Capabilities

These must work end-to-end for the product to be launchable.

| Capability ID | Label | Command |
|---|---|---|
| `auth-onboarding` | Authentication & Onboarding | C13 |
| `dashboard` | Platform Dashboard | C14 |
| `documents-workspace` | Documents Workspace | C15 |
| `transaction-detail` | Transaction Detail | C16 |
| `document-verification` | Document Verification | C17 |
| `prepare-document` | Prepare Document | C18 |
| `field-placement` | Field Placement | C19 |
| `recipient-signing` | Recipient Signing | C20 |
| `templates` | Templates | C21 |
| `contacts` | Contacts | C22 |
| `workspace-admin` | Workspace Administration | C23 |
| `settings` | Settings | C24 |
| `finalization` | Document Finalization | C25 |
| `recipient-inbox` | Recipient Inbox | C27 |
| `notifications` | Notifications | C28 |

---

## launch-supporting Capabilities

These ship with the MVP but are not blockers.

| Capability ID | Label | Command |
|---|---|---|
| `signature-library` | Signature Library | C26 |
| `reports` | Reports | C29 |
| `global-search` | Global Search | C30 |
| `document-organization` | Document Organization | C31 |

---

## enterprise-preview Capabilities

Available in the `enterprise-preview` launch profile. Hidden in `launch-default`.

| Capability ID | Label | Command | Notes |
|---|---|---|---|
| `workflow-automation` | Workflow Automation | C32 | `automationEnabled: false` by default |

---

## future-product Capabilities

Separate products, not part of eSignature MVP.

| Capability ID | Label | Notes |
|---|---|---|
| `enotary` | eNotary / Remote Online Notarization | Requires Supreme Court Accreditation; separate product track; shown as "Coming Soon" |

---

## Not Implemented (Confirmed Absent)

> **Updated 2026-07-31 (HEAD `7c6713b`).** This list was accurate at C32. Bulk Send
> and Document Collaboration have since been built and are now classified
> `enterprise-preview`, not "absent".

| Capability | Status at HEAD `7c6713b` |
|---|---|
| Bulk Send | **Implemented (C33)** — `enterprise-preview`, 9 guarded routes. Still requires a backend job queue for production. |
| Document Collaboration | **Implemented (C34)** — `enterprise-preview`, 9 guarded routes. Asynchronous internal review only. |
| Real-time collaboration (presence, typing indicators, live cursors, WebSockets, SSE) | Not implemented, and explicitly out of scope. C34 is not real-time. |
| Document Versioning / Redlining | Not implemented — `deferred`. Requires a document comparison engine. |
| AI Document Analysis | Future — no AI infrastructure defined |
| Mobile App | Future — out of scope for web MVP |
| Third-party KYC | Future — vendor selection required |

---

## Per-Capability Backend Readiness

| Capability | Frontend | Backend |
|---|---|---|
| auth-onboarding | complete-demonstration | not-defined |
| dashboard | complete-demonstration | not-defined |
| documents-workspace | complete-demonstration | not-defined |
| transaction-detail | complete-demonstration | not-defined |
| document-verification | complete-demonstration | not-defined |
| prepare-document | complete-demonstration | not-defined |
| field-placement | complete-demonstration | not-defined |
| recipient-signing | complete-demonstration | not-defined |
| templates | complete-demonstration | not-defined |
| contacts | complete-demonstration | not-defined |
| workspace-admin | complete-demonstration | not-defined |
| settings | complete-demonstration | not-defined |
| finalization | complete-demonstration | not-defined |
| signature-library | complete-demonstration | not-defined |
| recipient-inbox | complete-demonstration | not-defined |
| notifications | complete-demonstration | not-defined |
| reports | complete-demonstration | not-defined |
| global-search | complete-demonstration | not-defined |
| document-organization | complete-demonstration | not-defined |
| workflow-automation | complete-demonstration | not-defined |
| enotary | not-started | not-defined |

All frontend capabilities are `complete-demonstration`. No backend is yet defined.


---

## Signing Workflow (Command 37)

| Field | Value |
|-------|-------|
| Capability ID | `signing-workflow` |
| Label | Signing Workflow |
| Group | Core |
| Maturity | `launch-core` |
| Enabled by default | Yes |
| Frontend readiness | `complete-demonstration` |
| Backend readiness | `contract-defined` |
| Public launch ready | Yes |
| Navigation visibility | No (lives inside Document Details) |
| Search visibility | Yes (document Workflow tab destinations only) |
| Command palette visibility | Yes (navigation only) |
| Dashboard visibility | No |
| Permissions | `view_documents` (read), `prepare_documents` (write) |
| Feature flag | `documentsEnabled` |
| Indexable | No |
| Sitemap | Excluded |
| Safe fallback route | `/app/documents` |
| Depends on | `documents` |
| Does NOT depend on | `workflow-automation` |

Signing Workflow is launch core and works with Workflow Automation disabled. Workflow Automation
remains `enterprise-preview` and is not a launch dependency of this feature.
