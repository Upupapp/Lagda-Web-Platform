# LAGDA eSignature MVP Scope

**Version:** C35  
**Date:** 2026-07-16  
**Status:** Demonstration-Complete, Backend-Pending

---

## What LAGDA Is (MVP)

LAGDA is a Philippine-market eSignature platform for individuals and organizations. The MVP scope covers end-to-end document signing workflows: create, prepare, send to recipients, track, finalize, and verify.

---

## Core Value Proposition (MVP)

1. **Send documents for signature** — upload a document, add recipients, define signing order
2. **Recipients sign electronically** — guided signing flow for each recipient
3. **Verify signed documents** — public verification of document authenticity
4. **Manage signing activity** — track document status, manage templates, organize contacts
5. **Workspace administration** — team members, roles, billing plan

---

## What Is In Scope (MVP)

### Authentication & Onboarding (C13)
- Sign up, log in, forgot password, email verification
- Workspace creation and user onboarding flow
- Role-based access: Owner, Administrator, Sender, Viewer

### Core eSignature Workflow (C14–C20, C25)
- Document upload and management
- Prepare document: recipient setup, field placement, signing configuration
- Multi-recipient signing with order enforcement
- Email invitation flow (direction only — email delivery is backend)
- Recipient signing experience: draw/type/upload signature, date, initials
- Document finalization: evidence summary, audit trail view
- Signed PDF generation direction

### Document Verification (C17)
- Public verification page at `/verify`
- Document code lookup
- Verification result display

### Supporting Modules (C21–C24, C26–C31)

| Module | Purpose |
|---|---|
| Templates | Save and reuse document configurations |
| Contacts | Manage recipients and contact groups |
| Workspace Admin | Member management, roles, audit log |
| Settings | Account, billing, integrations, API, webhooks |
| Signature Library | Store and manage saved signatures |
| Recipient Inbox | Pending signing requests for recipients |
| Notifications | Activity notifications and preferences |
| Reports | Signing activity summary, compliance export |
| Global Search | Full-text search across all content types |
| Document Organization | Folders, tags, saved views, favorites, bulk ops |

---

## What Is NOT In Scope (MVP)

| Capability | Status | When |
|---|---|---|
| Workflow Automation (C32) | Enterprise Preview | Post-MVP, enterprise tier |
| Bulk Send | Not Implemented | Future — after backend stable |
| Real-time Collaboration | Not Implemented | Future |
| Document Versioning / Redlining | Not Implemented | Future |
| eNotary / Remote Online Notarization | Future Product | Subject to Supreme Court Accreditation |
| AI Document Analysis | Not Implemented | Future |
| Mobile App | Not Implemented | Future |
| Third-party identity verification (KYC) | Not Implemented | Future |

---

## Launch Profiles

The frontend ships with three compile-time launch profiles set via `VITE_LAUNCH_PROFILE`:

| Profile | Features Available |
|---|---|
| `launch-default` (default) | launch-core + launch-supporting only |
| `enterprise-preview` | + post-launch + enterprise-preview capabilities |
| `development` | All capabilities |

**Workflow Automation is only available in `enterprise-preview` and `development` profiles**, and only when `automationEnabled` feature flag is `true`.

---

## Demonstration Accuracy Statement

All UI screens reflect complete, accurate feature behavior. No screens are placeholders. However:

- **No production data persistence** — all data is managed in-memory via demonstration services
- **No real email delivery** — invitation and signing emails are described but not sent
- **No real PDF generation** — signed PDFs are referenced but not rendered
- **No real authentication** — login flow demonstrates behavior without real credential verification
- **No real document hash verification** — verify page demonstrates the UX without real cryptographic checks

The product is in **"Active in Demonstration"** phase — not Live, not Deployed.

---

## Route Count (MVP)

- Public routes: ~84
- Authenticated routes: ~103 (excluding automation)
- **Total: ~187 routes**

---

## Backend Readiness Requirement for Launch

The frontend is decoupled and backend-ready. A backend API implementing the contracts in `docs/backend-integration-handoff.md` is required for any production deployment. The frontend will connect when `VITE_API_BASE_URL` is set to a real backend endpoint.
