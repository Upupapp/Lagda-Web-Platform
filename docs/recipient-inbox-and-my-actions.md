# Recipient Inbox and My Actions Center

**Feature:** Authenticated Recipient Inbox and My Actions Center
**Command:** 27
**Status:** Frontend demonstration — no backend connected

---

## Overview

The Recipient Inbox ("My Actions") is a personal workspace for document requests assigned to the current user as a participant. It is accessible at `/app/inbox` within the authenticated platform shell.

Unlike the sender-side Documents page, the Inbox is specifically for the current user's role as a **recipient** — someone who has been asked to sign, approve, review, acknowledge, view, or receive a copy of a document.

---

## Routes

| Path | Purpose |
|---|---|
| `/app/inbox` | My Actions list — all assignments with filters, search, and sort |
| `/app/inbox/:requestId` | Assignment detail — full context and action for one assignment |

The inbox is accessible from the primary navigation under **My Actions**.

---

## Assignment statuses

| Status | Description |
|---|---|
| Awaiting My Action | Active request. It is the user's turn to act. |
| In Progress | The user has started their action but has not completed it. |
| Upcoming | Assigned, but not yet the user's turn (routing or scheduling). |
| Completed | The user has completed their required action. |
| Unavailable | The request is expired, cancelled, voided, or otherwise closed. |

---

## Participant roles

| Role | Action Required |
|---|---|
| Signer | Sign assigned fields |
| Approver | Review and explicitly approve |
| Reviewer | Review and leave comments |
| Acknowledgment Recipient | Read and acknowledge receipt |
| Viewer | View the document (no action required) |
| Copy Recipient | Receive a copy (no action required) |

---

## Fixture assignments (12 items)

| ID | Role | Status | C20 Handoff |
|---|---|---|---|
| `inbox-service-agreement-001` | Signer | Awaiting My Action | `req-engagement-0002-marco` |
| `inbox-vendor-nda-002` | Signer | In Progress | `req-psa-0001-lea` |
| `inbox-procurement-approval-003` | Approver | Awaiting My Action | `req-dpa-0005-ana` |
| `inbox-policy-acknowledgment-004` | Acknowledgment Recipient | Awaiting My Action | `req-policy-0004-sofia` |
| `inbox-consulting-review-005` | Reviewer | In Progress | `req-policy-review-0006` |
| `inbox-partnership-upcoming-006` | Signer | Upcoming (routing-locked) | `req-locked-0009` |
| `inbox-lease-upcoming-007` | Signer | Upcoming (not-yet-available) | null |
| `inbox-completed-agreement-008` | Signer | Completed | `req-done-0013` |
| `inbox-board-resolution-009` | Viewer | Completed | `req-viewer-0007` |
| `inbox-document-package-010` | Copy Recipient | Completed | `req-copy-0008` |
| `inbox-expired-contract-011` | Signer | Unavailable (expired) | `req-expired-0010` |
| `inbox-cancelled-filing-012` | Signer | Unavailable (cancelled) | `req-cancelled-0011` |

All 6 participant roles are covered. All 5 assignment statuses are covered.

---

## C20 signing flow integration (handoff)

When a user clicks **Sign Document**, **Continue**, **Review Document**, or similar from the detail page, they are navigated to `/sign/:handoffRequestId` — the C20 recipient signing flow. The handoff uses the existing C20 fixture IDs so the end-to-end demo is functional.

The handoff is one-way: the inbox holds the entry point, and the C20 flow handles all signing state. There is no reverse callback or status sync in this frontend demonstration.

Upcoming items with no reachable handoff (e.g., `inbox-lease-upcoming-007`) have `handoffRequestId: null` and show an informational "Not yet your turn" state instead of an action button.

---

## Signature Library integration (C26 direction)

The Assignment Detail page for Signer and Approver assignments includes a notice directing users to the Signature Library in the signing environment:

> "Your saved signatures and initials are available in the signing environment. Open the signature field, then select 'From Library' to choose a saved representation. Explicit adoption is required for each field — library entries are not applied automatically."

This is a directional notice only. The actual library selection occurs within the C20 signing flow via the `SignatureAdoptionDialog`'s "From Library" tab.

---

## Dashboard integration

The Dashboard (`/app/dashboard`) includes a **My Actions** section in the main column that shows up to 3 action-required or in-progress items sorted by due date. Each item links to its detail page. The section links to `/app/inbox` for the full list.

The section appears for all roles and is only hidden if there are no active assignments. It uses `inboxService.getActionRequiredItems(3)`.

---

## Search and filtering

| Filter | Implementation |
|---|---|
| View tabs | `?view=` query param: awaiting / in-progress / upcoming / completed / all / unavailable |
| Sort | `?sort=` query param: received (default) / due-date / alphabetical |
| Text search | Client-side: matches document title, sender name, workspace, description |
| Role filter | Client-side: matches exact role |

Text search and role filter are held in local component state (not URL params) to avoid URL churn on keystroke.

---

## Read/unread state

- Items begin as read or unread per fixture definition
- Fixture items 1, 3, 4 begin as unread (action-required, newly assigned)
- Opening a detail page calls `inboxService.markAsRead(id)`, which flips `isRead: true` in module-level state
- Unread state is never persisted: no localStorage, no sessionStorage, no backend
- Unread state resets on page reload

---

## Privacy and access boundaries

- The inbox is accessible only to the authenticated user. No cross-user access exists.
- Workspace Administrators cannot view another member's inbox or assignments.
- No email-based access grant is implemented. The inbox is session-only.
- No Contact-based access grant is implemented.
- No raw signature data is passed through inbox URLs or stored in inbox state.
- All assignment state is module-level in-memory only (`let _items`). It resets on page reload.

---

## Security properties

| Property | Value |
|---|---|
| localStorage | Not used |
| sessionStorage | Not used |
| URL storage of assignment IDs | Inbox IDs appear in the URL (`/app/inbox/:requestId`) — read-only, no private data encoded |
| Raw signature data in URL | Not present |
| Cross-user access | Not implemented |
| Admin access to member inbox | Not implemented |
| Backend | Not connected |

---

## eNotary boundary

The Inbox contains no eNotary content. The Burgundy color (`#67023B`) is not used in any inbox file. No notarial roles (e.g., "notary public", "commissioned notary") are defined. eNotary is a separate future product under Supreme Court accreditation.

---

## Backend handoff notes

When connecting to a production backend:

1. **Inbox endpoint:** `GET /api/recipients/inbox` — returns paginated recipient assignments scoped to the authenticated user. Must enforce server-side ownership (no BOLA, no cross-user access).
2. **Assignment detail:** `GET /api/recipients/inbox/:assignmentId` — returns full assignment context.
3. **Mark as read:** `PATCH /api/recipients/inbox/:assignmentId/read` — server-side read tracking.
4. **Handoff token:** Real signing flows require a time-limited, signed access token scoped to the recipient and request — not a plain ID lookup. The C20 demo uses plain fixture IDs; production must use real invitation tokens.
5. **Privacy enforcement:** The backend must verify that the requesting user is the named recipient. No admin override should allow reading another user's inbox.

---

## Related files

| File | Role |
|---|---|
| `src/app/models/inbox.ts` | Domain types: `RecipientInboxItem`, `RecipientInboxSummary`, etc. |
| `src/app/services/mock/inbox.service.ts` | In-memory service, 12 fixture assignments |
| `src/app/pages/platform/inbox/InboxPage.tsx` | `/app/inbox` list page |
| `src/app/pages/platform/inbox/AssignmentDetailPage.tsx` | `/app/inbox/:requestId` detail page |
| `src/app/config/platform.nav.ts` | "My Actions" nav item in PRIMARY_NAV |
| `src/router.tsx` | Routes: `inbox` and `inbox/:requestId` |
| `src/app/pages/platform/PlatformDashboard.tsx` | `MyActionsSection` widget |
| `docs/recipient-inbox-audit.md` | Pre-implementation audit |
