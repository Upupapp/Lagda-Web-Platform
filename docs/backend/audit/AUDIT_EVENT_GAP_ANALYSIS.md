# Audit event gap analysis

**Command:** BACKEND-43 §135/§136 · **Date:** 2026-08-11
**Method:** every non-test file in `packages/application`, `packages/api` and
`packages/worker` searched for evidence-append call sites; each candidate
producer read at its authoritative transition.

## Headline

**0 of 13 declared event types have a producer.** The only `.append(` call sites
in the repository are in `packages/application/src/test-support/repository-contract.ts`.

The store is real — schema, RLS, forced privilege separation (`lagda_app` holds
INSERT and SELECT only), timeline index, closed type and actor CHECKs, an 8 KB
payload cap. It has simply never been written to by anything but its own
contract suite.

## Per-event status

`PRODUCER` = the transaction that owns the authoritative fact and must append.

| Event type | Producer (transition) | Authoritative source | Persisted today? | Transactional? | Idempotent? | Backfill possible? |
|---|---|---|---|---|---|---|
| `transaction-created` | BACKEND-32 create | `signing_requests.created_at` | **NO** | n/a | n/a | **Yes** — deterministic from the row |
| `transaction-sent` | BACKEND-33 send | `signing_requests.sent_at` | **NO** | n/a | n/a | **Yes** — from `sent_at` where non-null |
| RECIPIENT_ACTIVATED *(no type yet)* | BACKEND-37 routing activation | `signing_recipient_progress.activated_at` | **NO** | n/a | n/a | **Yes** — from the progress row |
| `invitation-sent` | BACKEND-33 send | send transaction | **NO** | n/a | n/a | Partial — per-recipient fan-out is derivable, but see §71: delivery facts are BACKEND-45's |
| `authentication-completed` | BACKEND-34 access bootstrap | authoritative session/auth record | **NO** | n/a | n/a | **Conditional** — only if the session row retains method and time |
| `document-viewed` | BACKEND-35 ceremony entry | `signing_recipient_progress.first_viewed_at` | **NO** | n/a | n/a | **Partial** — first view only; repeat views are unrecoverable |
| `consent-accepted` | BACKEND-35 consent | `signing_recipient_consents.accepted_at` | **NO** | n/a | n/a | **Yes** — the consent table is append-only |
| RECIPIENT_SUBMISSION_ACCEPTED *(no type yet)* | BACKEND-36 submission | `recipient_submissions.accepted_at` | **NO** | n/a | n/a | **Yes** |
| `signature-completed` | BACKEND-36/37 SIGNED transition | `recipient_submissions.accepted_at` (§17) | **NO** | n/a | n/a | **Yes** |
| REQUEST_COMPLETION_READY *(no type yet)* | BACKEND-38 readiness | completion-ready transition | **NO** | n/a | n/a | **Conditional** — only if a canonical `completionReadyAt` is stored |
| FIELD_MERGE_SUCCEEDED *(no type yet)* | BACKEND-39 step acceptance | completion step `succeeded_at` | **NO** | n/a | n/a | **Yes** — from the step row |
| CERTIFICATE_GENERATED *(no type yet)* | BACKEND-40 step acceptance | completion step `succeeded_at` | **NO** | n/a | n/a | **Yes** |
| FINAL_SEAL_SUCCEEDED *(no type yet)* | BACKEND-41 step acceptance | completion step `succeeded_at` | **NO** | n/a | n/a | **Yes** |
| `document-sealed` | BACKEND-41 finalization | seal row | **NO** | n/a | n/a | **Yes** — from `document_seals` |
| `verification-record-created` | BACKEND-41 finalization | `verification_records` | **NO** | n/a | n/a | **Yes** |
| `transaction-completed` | BACKEND-41 finalization | `signing_requests.completed_at` (§18) | **NO** | n/a | n/a | **Yes** |
| `transaction-cancelled` | BACKEND-37 cancel | cancel transition | **NO** | n/a | n/a | **Yes** where the state exists |
| `participant-declined` | BACKEND-37 decline | decline transition | **NO** | n/a | n/a | **Yes** |
| `transaction-expired` | — | — | **NO** | n/a | n/a | **NOT_IN_PRODUCT** — no expiration scheduler exists (BACKEND-44+) |

## Types that must be added

Five authoritative facts have no event type in the closed vocabulary. Each needs
one, added by forward migration to the CHECK constraint (§301):

- recipient activation (routing eligibility)
- recipient submission accepted — distinct from `signature-completed`, which is
  the workflow transition (§62 vs §63; both are wanted, and §248 requires them
  to share a timestamp)
- completion readiness
- the three completion-pipeline step successes (field merge, certificate, final
  seal), or one parameterised step-succeeded type

## Schema gaps blocking the command

| Requirement | Status |
|---|---|
| §12 mandatory `eventVersion` | **MISSING.** `details_version` exists but a CHECK ties it to `details` — `(details is null) = (details_version is null)` — so a payload-free event carries no version at all |
| §118 `source_type` / `source_id` | **MISSING entirely.** This is the idempotency backbone |
| §46/§119 uniqueness on event source | **MISSING.** Without it §44's idempotency can only be check-then-insert, which §46 forbids |
| §215 source dedupe index | **MISSING** |
| §10 stable opaque event ID | Present |
| §19–§23 closed actor model | Present, with the `system ⇒ actor_id IS NULL` CHECK |
| §14/§15 `occurredAt` / `recordedAt` | Present, correctly separated |
| §39/§42 deterministic ordering | Present — `(occurred_at, evidence_event_id)`, and the timeline index matches |
| §36/§279 no update/delete | Present — repository API omits them and `lagda_app` lacks the privileges |

## Backfill assessment (§303, §228, §145)

**No backfill will be performed by BACKEND-43, and the reason is measurable
rather than cautious.**

Production has never completed a signing request. The `signing_requests` table
gained its `completed` state only in migration 028 (BACKEND-41, today), so no
row can predate it. There is no historical evidence to reconstruct — there is no
history.

Had there been, the table above records what would have been reconstructible.
Three categories would have failed §228's "do not fabricate" rule outright:

- **Repeat document views.** Only `first_viewed_at` is stored. Every subsequent
  view is unrecoverable, and synthesising one would invent a fact.
- **Authentication events**, unless the session row preserves both method and
  time — §142 forbids inventing either.
- **Completion readiness**, unless a canonical `completionReadyAt` is persisted
  rather than inferred from the last signature.

**Never from logs.** §137 and §286. Pino output is not an evidence source, and
no code path in this command reads it.

## What §146 actually requires

Eight transitions, each gaining an append inside the transaction that already
owns its authoritative write (§50, §160 — an evidence failure must roll the
transition back):

1. `CreateSigningRequest` → `transaction-created`
2. `SendSigningRequest` → `transaction-sent` (+ per-recipient `invitation-sent`)
3. Routing activation → recipient activated
4. Signing access bootstrap → `authentication-completed`
5. `EnterSigningCeremony` → `document-viewed`
6. `AcceptSigningConsent` → `consent-accepted`
7. `SubmitRecipientSigning` / apply-to-workflow → submission accepted +
   `signature-completed`
8. Completion steps and `FinalizeSigningRequest` → the four completion events,
   `document-sealed`, `verification-record-created`, `transaction-completed`

Every one of them already runs inside a database transaction, so §50 is
satisfiable without restructuring any of them.
