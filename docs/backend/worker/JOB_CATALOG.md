# Job Catalog — BACKEND-16

Every job LAGDA can execute. `JOB_TYPES` is a closed union; this table is its
documentation. Two entries — this is a foundation, not a feature set.

## `idempotency.cleanup`

| | |
|---|---|
| Tenant scope | `system` |
| Payload | `{ batchSize: integer 1–10 000 }` |
| Max attempts | 3 (1 original + 2 retries) |
| Backoff | exponential from 60 s |
| Concurrency | 1 |
| Schedule | hourly, `0 * * * *` UTC, when `WORKER_SCHEDULES_ENABLED=true` |
| Idempotency strategy | Deletion by expiry horizon is naturally repeatable: a second run finds nothing left to delete and deletes nothing. |

Deletes idempotency records whose `expires_at` has passed. Reads the clock at
execution time, so a job delayed by an outage uses the horizon that is correct
when it runs, not when it was queued.

**Deletes only expired rows.** Verified by seeding one expired and one live
record and asserting the live one survives.

## `rate-limit.cleanup`

| | |
|---|---|
| Tenant scope | `system` |
| Payload | `{ batchSize: integer 1–10 000 }` |
| Max attempts | 3 |
| Backoff | exponential from 60 s |
| Concurrency | 1 |
| Schedule | hourly, `0 * * * *` UTC, when `WORKER_SCHEDULES_ENABLED=true` |
| Idempotency strategy | As above — deletion by expiry horizon. |

Deletes rate-limit counter rows for windows that have closed. Bounded by
`batchSize` so one run cannot lock the table for an unbounded period; `ctid`
batching in the repository keeps each statement small.

Counters are operational state, not signing evidence and not a request log —
deleting them destroys nothing that must be retained.

## Adding a job

1. Add the name to `JOB_TYPES` in
   `packages/application/src/common/ports/jobs.ts`. It is a **persistence
   contract** from that moment: renaming it later strands enqueued rows.
2. Define a TypeBox payload schema with `additionalProperties: false`. Carry
   identifiers, never content — see JOB_DATA_CLASSIFICATION.md.
3. Add a `JobDefinition` in `packages/application/src/jobs/definitions.ts`,
   including a real `idempotencyStrategy`. The field is required because a
   duplicate delivery *will* happen.
4. Write the handler in `packages/worker/src/handlers/`. Validate the payload at
   runtime and throw `TerminalJobError` on malformed input.
5. Register it in `startWorker` — both `ensureQueue` and `registerSystemHandler`.
   Nothing scans the filesystem; an unregistered job is silently never consumed.
6. Add it to this table.

## Not in this catalog

No feature job exists: no email delivery, no document sealing, no evidence
generation, no notification. Those arrive with the commands that need them. What
exists here is the seam they will plug into, and the two maintenance jobs that
give it something real to execute.

## Password-reset email (BACKEND-22) — NOT IMPLEMENTED

`requestPasswordReset` takes an optional `scheduleDelivery` dependency, invoked
**inside** the rotation transaction so that a scheduling failure rolls the whole
rotation back and leaves the user's existing link usable.

Where it is absent — which is everywhere today — the challenge is still created
correctly and the raw token is discarded.

Conceptual template identity: `auth.password-reset`. No template system is built
here.

When the notification foundation exists, the job payload must carry a
notification-record ID rather than the raw token wherever the approved
one-time-secret design allows, must never carry a password, and must not
regenerate a token on provider retry — retries redeliver the same challenge.

**Blocked on BACKEND-44/45.** Nothing sends a reset email today.
