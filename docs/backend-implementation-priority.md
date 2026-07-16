# Backend Implementation Priority

**Version:** C35  
**Date:** 2026-07-16

This document lists all backend dependencies for the LAGDA MVP, grouped by priority. The frontend is decoupled and will connect to a backend when `VITE_API_BASE_URL` is configured. Full endpoint contracts are in `docs/backend-integration-handoff.md`.

---

## Priority Levels

- **P0** — Hard launch blockers. Product cannot function without these.
- **P1** — Required before any real-user traffic.
- **P2** — Deliver shortly after launch (week 1–4).
- **P3** — Post-stabilization enhancements.

---

## P0 — Core Authentication

| # | Endpoint | Notes |
|---|---|---|
| P0-1 | `POST /auth/signup` | Create account + workspace |
| P0-2 | `POST /auth/login` | Return JWT |
| P0-3 | `POST /auth/logout` | Invalidate token |
| P0-4 | `POST /auth/refresh` | Refresh JWT |
| P0-5 | `POST /auth/forgot-password` | Send reset email |
| P0-6 | `POST /auth/reset-password` | Apply new password |
| P0-7 | `POST /auth/verify-email` | Confirm email token |
| P0-8 | `GET  /auth/me` | Return current user + workspace |

---

## P0 — Workspace & Onboarding

| # | Endpoint | Notes |
|---|---|---|
| P0-9  | `POST /workspaces` | Create workspace |
| P0-10 | `GET  /workspaces/:id` | Get workspace |
| P0-11 | `PUT  /workspaces/:id` | Update name, settings |
| P0-12 | `POST /workspaces/:id/members/invite` | Send invitation |
| P0-13 | `GET  /workspaces/:id/members` | List members |
| P0-14 | `DELETE /workspaces/:id/members/:memberId` | Remove member |
| P0-15 | `POST /invitations/:token/accept` | Accept invitation |

---

## P0 — Documents (Core)

| # | Endpoint | Notes |
|---|---|---|
| P0-16 | `POST /documents` | Upload document, return document ID |
| P0-17 | `GET  /documents` | List with filters (status, date, search) |
| P0-18 | `GET  /documents/:id` | Get document detail |
| P0-19 | `DELETE /documents/:id` | Soft-delete document |
| P0-20 | `GET  /documents/:id/file` | Serve signed/original PDF |

---

## P0 — Prepare Flow

| # | Endpoint | Notes |
|---|---|---|
| P0-21 | `POST /documents/:id/recipients` | Add recipient + signing order |
| P0-22 | `PUT  /documents/:id/recipients` | Update recipients list |
| P0-23 | `POST /documents/:id/fields` | Save field positions (bulk) |
| P0-24 | `GET  /documents/:id/fields` | Retrieve field positions |
| P0-25 | `POST /documents/:id/send` | Trigger send — generates signing tokens, sends emails |
| P0-26 | `PUT  /documents/:id/configuration` | Update signing config (order, expiry, reminders) |

---

## P0 — Recipient Signing

| # | Endpoint | Notes |
|---|---|---|
| P0-27 | `GET  /sign/:token` | Validate token, return document + recipient context |
| P0-28 | `POST /sign/:token/signature` | Submit signed signature |
| P0-29 | `POST /sign/:token/complete` | Mark recipient's signing as complete |
| P0-30 | `POST /sign/:token/decline` | Decline to sign |

---

## P0 — Document Finalization

| # | Endpoint | Notes |
|---|---|---|
| P0-31 | `GET  /documents/:id/status` | Polling endpoint for completion status |
| P0-32 | `GET  /documents/:id/audit-trail` | Event log |
| P0-33 | `GET  /documents/:id/signed-pdf` | Download completed signed PDF |

---

## P0 — Document Verification

| # | Endpoint | Notes |
|---|---|---|
| P0-34 | `GET  /verify/:code` | Look up document by verification code |
| P0-35 | `POST /verify/hash` | Compare uploaded document hash |
| P0-36 | `GET  /verify/:code/certificate` | Download verification certificate (PDF) |

---

## P0 — Email Delivery (Infrastructure)

| Trigger | Notes |
|---|---|
| Signup verification | Welcome + verify email link |
| Signing invitation | Per-recipient with unique signing token |
| Signing reminder | Manual or scheduled reminder |
| Document completed | Notifies all parties |
| Member invitation | Workspace invite link |
| Declined notification | Notifies sender |

---

## P1 — Templates

| # | Endpoint |
|---|---|
| P1-1 | `GET  /templates` |
| P1-2 | `POST /templates` |
| P1-3 | `GET  /templates/:id` |
| P1-4 | `PUT  /templates/:id` |
| P1-5 | `DELETE /templates/:id` |
| P1-6 | `POST /templates/:id/use` — create document from template |

---

## P1 — Contacts

| # | Endpoint |
|---|---|
| P1-7  | `GET  /contacts` |
| P1-8  | `POST /contacts` |
| P1-9  | `GET  /contacts/:id` |
| P1-10 | `PUT  /contacts/:id` |
| P1-11 | `DELETE /contacts/:id` |
| P1-12 | `GET  /contact-groups` |
| P1-13 | `POST /contact-groups` |
| P1-14 | `POST /contact-groups/:id/members` |

---

## P1 — Notifications

| # | Endpoint |
|---|---|
| P1-15 | `GET  /notifications` (with cursor pagination) |
| P1-16 | `POST /notifications/:id/read` |
| P1-17 | `POST /notifications/read-all` |
| P1-18 | `GET  /notification-preferences` |
| P1-19 | `PUT  /notification-preferences` |

---

## P1 — Recipient Inbox

| # | Endpoint |
|---|---|
| P1-20 | `GET  /inbox` — documents where current user is a recipient |
| P1-21 | `GET  /inbox/:id` |

---

## P2 — Signature Library

| # | Endpoint |
|---|---|
| P2-1 | `GET  /signatures` |
| P2-2 | `POST /signatures` |
| P2-3 | `DELETE /signatures/:id` |

---

## P2 — Reports

| # | Endpoint |
|---|---|
| P2-4 | `GET  /reports/signing-activity` |
| P2-5 | `GET  /reports/completion-rates` |
| P2-6 | `GET  /reports/turnaround-time` |
| P2-7 | `GET  /reports/recipient-performance` |
| P2-8 | `GET  /reports/template-usage` |
| P2-9 | `GET  /reports/team-performance` |
| P2-10 | `GET  /reports/compliance` |
| P2-11 | `GET  /reports/:type/export` (CSV/PDF) |

---

## P2 — Global Search

| # | Endpoint |
|---|---|
| P2-12 | `GET  /search?q=&scope=` |

---

## P2 — Document Organization

| # | Endpoint |
|---|---|
| P2-13 | Folders CRUD |
| P2-14 | Tags CRUD + `POST /documents/:id/tags` |
| P2-15 | `GET  /saved-views`, `POST /saved-views` |
| P2-16 | `POST /documents/:id/favorite` |
| P2-17 | `POST /bulk-actions` |

---

## P3 — Settings

| # | Endpoint |
|---|---|
| P3-1 | `PUT  /user/profile` |
| P3-2 | `PUT  /user/security` (change password, 2FA) |
| P3-3 | `GET/PUT /user/notification-settings` |
| P3-4 | `GET/POST/DELETE /api-keys` |
| P3-5 | `GET/POST/DELETE /webhooks` |
| P3-6 | `GET/PUT /billing` |

---

## P3 — Workflow Automation (Enterprise Preview)

Full contract in `docs/backend-integration-handoff.md` §38.

| # | Endpoint |
|---|---|
| P3-7  | Rules CRUD |
| P3-8  | Policies CRUD |
| P3-9  | Conflict detection |
| P3-10 | Simulation |
| P3-11 | Activity log |

---

## Implementation Order (Recommended)

```
Week 1: P0-Auth (P0-1–P0-8)
Week 2: P0-Workspace + P0-Documents (P0-9–P0-20)
Week 3: P0-Prepare + P0-Signing (P0-21–P0-30)
Week 4: P0-Finalization + P0-Verification + Email (P0-31–P0-36)
Week 5: P1-Templates + P1-Contacts
Week 6: P1-Notifications + P1-Inbox
Week 7+: P2 supporting capabilities
Week 10+: P3 settings, API, webhooks, automation
```
