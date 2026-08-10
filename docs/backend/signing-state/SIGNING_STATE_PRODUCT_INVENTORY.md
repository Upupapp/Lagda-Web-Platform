# Signing state — product inventory

**Read before the architecture.** Every state BACKEND-37 implements was found in
the frontend first, with one deliberate exception that is named as such.

Sources read: `models/recipient.ts`, `models/signing-workflow.ts`,
`models/transaction-detail.ts`, `data/status-map.ts`,
`services/mock/recipient.service.ts`, `services/mock/transaction-detail.service.ts`,
`services/signing-workflow.resolver.ts`, `pages/recipient/DeclinePage.tsx`,
`pages/platform/documents/TransactionDetailPage.tsx`.

| Concept | Verdict | Where the product says so |
|---|---|---|
| RECIPIENT WAITING | **IMPLEMENT_NOW** | `StageParticipantStatus` has `waiting-for-prior-stage` / `waiting-for-prior-participant`; BACKEND-33 already persists `waiting` |
| RECIPIENT ACTIVE | **IMPLEMENT_NOW** | `ready-for-action` ("Action Required"); BACKEND-33 persists `active` |
| RECIPIENT VIEWED | **FOUNDATION_ONLY** | A `viewed` status exists, but a recipient who opened the document is still awaiting action. Stored as `signing_recipient_progress.first_entered_at` (BACKEND-35), never as a state |
| RECIPIENT AUTHENTICATED | **FOUNDATION_ONLY** | `recipient_signing_sessions.authenticated_at` (BACKEND-34). An event about a session, not a position in the workflow |
| RECIPIENT SIGNED | **IMPLEMENT_NOW** | `COMPLETED_ASSIGNMENT_STATUSES`; `getCompletionHeading` returns "Document Signed" |
| RECIPIENT DECLINED | **IMPLEMENT_NOW** | `pages/recipient/DeclinePage.tsx` is a complete page: `canDecline` on the request, five closed reason categories, required selection |
| REQUEST SENT | **IMPLEMENT_NOW** | BACKEND-33 |
| REQUEST IN_PROGRESS | **IMPLEMENT_NOW**, as `partially-completed` | `status-map.ts:104` — "Partially Signed / Some but not all recipients have completed their actions." The product's own name is used; `in-progress` is not invented beside it |
| REQUEST COMPLETION_READY | **IMPLEMENT_NOW — NOT IN THE PRODUCT** | The one deviation, and the reason is in `SIGNING_STATE_ARCHITECTURE.md` §"The state the product does not have" |
| REQUEST COMPLETED | **DEFER (BACKEND-38)** | `status-map.ts:113` "All parties have completed the required actions", `isTerminal: true`. BACKEND-37 cannot produce it |
| REQUEST CANCELLED | **IMPLEMENT_NOW** | `transaction-detail.service.ts:60` — `avail("cancel", isActive && canPrepare)`, with a required reason trimmed to 200 characters |
| REQUEST VOIDED | **DEFER** | `avail("void", isCompleted && canAudit)` — it requires `completed`, which nothing can produce yet. `voidTransaction` has no implementation in the mock service either |
| REQUEST EXPIRED | **FOUNDATION_ONLY** | The lifecycle table has the edge; BACKEND-46 owns the schedule (OD-014). Nothing here reads a deadline |
| SEQUENTIAL ROUTING | **IMPLEMENT_NOW** | Distinct `routing_order` values, persisted by BACKEND-31 |
| PARALLEL ROUTING | **IMPLEMENT_NOW** | Equal `routing_order` values. The product's default is `routingOrder: 1` for everyone |
| MIXED ROUTING | **IMPLEMENT_NOW** | Falls out of the same integer; no third code path |

## Two things the product has and this command deliberately does not store

**The decline note.** `DeclinePage.tsx` offers an optional textarea beside the
five reason categories. The CODE is stored; the note is not. It is unbounded
text authored by an external party, it would land in a legal record with no
redaction path, and the page's own copy tells the recipient that nothing is
persisted. §78 warns about exactly this. The code carries everything the
sender's screen renders.

**The cancellation reason IS stored**, bounded at 200 characters as the product
bounds it. Different risk class: it is workspace-authored content about the
workspace's own document, the same category as a document title, and the
product requires it rather than offering it.

## What the product calls a state and this does not

`StageParticipantStatus` has thirteen values. Nine are events
(`viewed`, `in-progress`), facts about a different subject
(`waiting-for-prior-stage`), or outcomes of machines that do not exist
(`authentication-failed`, `no-longer-required`, `skipped-unavailable`).

A status field with one slot cannot hold a history — the finding `lifecycle.ts`
recorded for the request, applied a second time to the recipient. The events are
stored as their own timestamps; only the mutually exclusive positions are states.
