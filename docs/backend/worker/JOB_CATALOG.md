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


## Workspace invitation delivery (BACKEND-26) — BLOCKED

**No job is registered.** `InvitationDeliveryScheduler` is an application port,
called inside the creation and rotation transactions, and it is optional — the
same seam email verification and password reset carry, for the same reason
(OD-003, BACKEND-44/45).

**Status: BLOCKED, not DURABLE INTENT ONLY.** Nothing is enqueued, because there
is nothing to enqueue into: no notification record, no template registry, no
provider adapter. Claiming a durable intent exists would overstate it.

One constraint for whoever builds this, recorded now so it is not discovered
late: **the raw invitation token exists for the length of one transaction and is
never persisted.** A background worker therefore cannot recover it to build a
link afterwards. The delivery design has to either hand the secret to the
renderer inside that window, or encrypt it at rest the way BACKEND-23 encrypts
TOTP secrets — a job payload carrying a plaintext token is the one option ruled
out (§124, §125).

A cleanup job for terminal invitations is likewise absent, pending OD-097 and
BACKEND-55.

## Signing invitation delivery - NOT YET A JOB (BACKEND-33)

**Status: DURABLE INTENT ONLY.**

BACKEND-33 writes `signing_delivery_intents` rows and registers **no job type**
and **no handler**. That is deliberate rather than incomplete:

- no email provider exists or has been chosen (OD-003);
- `createJobScheduler` is not instantiated in the API process, and no production
  code enqueues anything;
- a job definition with no handler and no provider would be a stub that made the
  catalog claim capability the system does not have.

The durable record is the intent table. Outstanding work is discoverable through
a partial index:

```sql
select * from signing_delivery_intents where dispatched_at is null
```

**BACKEND-45 adds** the job type (`signing.invitation.deliver` or its canonical
equivalent), the handler, the renderer, and the provider adapter. Its payload
must carry `workspaceId` and `deliveryIntentId` and **nothing else** - never the
raw credential, never the URL, never the recipient's address. The handler reads
the intent, unseals the credential, builds the link from configured base, and
renders.

It must also carry an explicit workspace into a system execution context rather
than fabricating an owner membership.
