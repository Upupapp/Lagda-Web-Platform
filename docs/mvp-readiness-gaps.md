# MVP Readiness Gaps

**Version:** C35  
**Date:** 2026-07-16

This document lists all known gaps that must be addressed before the LAGDA MVP can handle real user traffic. This is distinct from the Backend Implementation Priority document — this covers gaps across all domains: backend, legal, infrastructure, and communication.

---

## Gap Classification

- 🔴 **P0** — Hard blocker, launch cannot proceed
- 🟡 **P1** — Must resolve before first real users
- 🟢 **P2** — Resolve within first 30 days of launch
- ⚪ **P3** — Post-stabilization

---

## Backend Gaps

| Gap | Priority | Description |
|---|---|---|
| No backend API exists | 🔴 P0 | Entire backend is frontend-only demonstration. No server, no database, no API. |
| No real authentication | 🔴 P0 | Login/signup is simulated. No JWT, no session, no password hashing. |
| No document storage | 🔴 P0 | Documents are not persisted. Upload is demonstrated but no files are stored. |
| No email delivery | 🔴 P0 | Invitation, signing, and completion emails are not sent. |
| No PDF generation | 🔴 P0 | Signed PDFs are referenced but not generated. |
| No cryptographic verification | 🔴 P0 | `/verify` shows results but performs no real hash check. |
| No audit log persistence | 🔴 P0 | Audit trail is in-memory only. Signing events are not durably recorded. |
| No real field-position persistence | 🔴 P0 | Field coordinates are stored in JS memory, not server-side. |
| No signing token system | 🔴 P0 | No real one-time signing tokens. `/app/sign/:token` accepts any value. |

---

## Infrastructure Gaps

| Gap | Priority | Description |
|---|---|---|
| No hosting environment | 🔴 P0 | No server, no domain, no SSL certificate. |
| No database | 🔴 P0 | No PostgreSQL, MySQL, or equivalent. |
| No file storage | 🔴 P0 | No S3, GCS, or equivalent for document storage. |
| No email service | 🔴 P0 | No SendGrid, SES, or equivalent. |
| No environment variables for real backend | 🟡 P1 | `VITE_API_BASE_URL` must be set. |
| No rate limiting (backend) | 🟡 P1 | API endpoints need rate limiting per-user and per-IP. |
| No error monitoring | 🟡 P1 | No Sentry, DataDog, or equivalent. Frontend errors go silent. |
| No analytics | 🟢 P2 | No page view, funnel, or conversion tracking. |
| No CDN for assets | 🟢 P2 | All assets served from single origin. |

---

## Legal and Compliance Gaps

| Gap | Priority | Description |
|---|---|---|
| Terms of Service is DRAFT | 🔴 P0 | `/legal/terms` shows "DRAFT" notice. Must be finalized before real users sign up. |
| Privacy Policy is DRAFT | 🔴 P0 | `/legal/privacy` shows "DRAFT" notice. Must comply with Philippine Data Privacy Act (RA 10173). |
| Cookie Policy is DRAFT | 🟡 P1 | `/legal/cookies` shows "DRAFT" notice. |
| Data Processing Agreement missing | 🟡 P1 | Required for B2B enterprise customers. |
| NPC registration | 🟡 P1 | Registration as Personal Information Controller with National Privacy Commission. |
| Electronic Commerce Act compliance | 🟡 P1 | Full RA 8792 compliance documentation. |
| Rules on Electronic Evidence compliance | 🟡 P1 | Per AM No. 01-7-01-SC. |
| eNotary disclaimer accuracy | 🟢 P2 | Current disclaimer references "Supreme Court Accreditation" — verify against latest OCA circular. |

---

## Frontend Gaps

| Gap | Priority | Description |
|---|---|---|
| No real API client wiring | 🔴 P0 | All service files use demonstration (mock) data. Real API client must replace mock services. |
| Error boundaries for API failures | 🟡 P1 | Mock services never throw. When real API fails, pages must show graceful error states. |
| Token refresh logic | 🟡 P1 | PlatformContext has no JWT refresh cycle. |
| WebSocket / polling for status updates | 🟡 P1 | Document status (Pending → Completed) requires polling or push. Currently static. |
| Loading states on network operations | 🟡 P1 | Mocks return instantly. Real network delays need loading indicators on submit actions. |
| File upload progress | 🟢 P2 | Document upload has no progress bar for large files. |
| Pagination in document list | 🟢 P2 | Documents page renders all items. Real data needs server-side pagination. |
| Offline / connectivity error handling | 🟢 P2 | No offline detection or reconnect messaging. |
| Session expiry handling | 🟢 P2 | No modal for expired sessions — user will see API failures instead of a re-login prompt. |

---

## Documentation Gaps

| Gap | Priority | Description |
|---|---|---|
| Public security claims unverified | 🟡 P1 | `/security/*` pages describe encryption, certifications, and infrastructure that don't exist yet. Should add qualifiers ("designed for", "when deployed"). |
| Pricing page shows real prices | 🟡 P1 | Pricing pages show peso amounts — confirm these are final before going live. |
| Audit trail claims | 🟡 P1 | Public pages claim "tamper-evident audit trail" — this only exists in production deployment with real persistence. |

---

## Summary Count

| Priority | Count |
|---|---|
| P0 — Hard blockers | 18 |
| P1 — Pre-launch | 14 |
| P2 — 30-day | 7 |
| P3 — Post-stabilization | 0 |
| **Total** | **39** |

The single highest-impact gap is the absence of a backend API. All P0 gaps follow from this one root gap.
