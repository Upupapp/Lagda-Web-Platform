# Queue Consistency — BACKEND-16

The question this document answers: **when a business write and a follow-up job
are created together, can one exist without the other?**

Answer: no, and it is proven by test rather than argued from architecture.

## The failure this prevents

A signing request is sent. The route writes the request row, then enqueues a job
to deliver the email. If the write rolls back after the job is enqueued, a worker
delivers an email about a signing request that does not exist. If the job insert
fails after the write commits, the recipient is never told.

Both are silent. Neither surfaces as an error to anyone.

## The mechanism

pg-boss's `send()` accepts `db?: IDatabase`, an interface whose only required
member is `executeSql(text, values)`. Passing an adapter backed by an open Kysely
transaction makes pg-boss insert its job row **through that transaction**.

```ts
await db.transaction().execute(async (trx) => {
  await trx.insertInto("signing_requests").values(row).execute();
  await scheduler.enqueue(SendEmailJob, { requestId }, { transaction: trx });
});
```

State and the intent to follow it up commit or roll back together. That is what
removes the need for an outbox table.

The capability was verified against the installed version's types
(`SendOptions = JobOptions & QueueOptions & ConnectionOptions`, where
`ConnectionOptions { db?: IDatabase }`) rather than assumed from documentation.

## Why this needed a test, not an argument

"Both the application and pg-boss use PostgreSQL" does **not** make two writes
atomic. Two connections to one database are two transactions. Without the `db`
override, pg-boss uses its own pool and the job commits independently of the
caller's transaction — which looks identical in code review and behaves
completely differently under failure.

So it is proven directly:

| Test | Asserts |
|---|---|
| `COMMITS the business write and the job together` | after commit: workspace row exists **and** exactly one job row exists |
| `ROLLS BACK the job with the business write` | after a thrown error: workspace row absent **and zero** job rows |
| `enqueues outside a transaction when no business write accompanies it` | omitting the handle still works, for maintenance jobs with no state to be atomic with |

Deleting the `db:` override from the adapter makes the rollback test fail. That
was checked (see WORKER_TEST_MATRIX.md), because a consistency test that passes
with the mechanism removed is testing nothing.

## When to pass the transaction, and when not to

**Pass it** whenever the job is a consequence of a write in the same request.
This is the default for feature work.

**Omit it** when there is no accompanying business state — a scheduled cleanup, a
maintenance sweep. There is nothing for the insert to be atomic with, and opening
a transaction solely to enqueue adds a lock for no gain.

## What this does NOT give you

- **Not exactly-once execution.** A job can be delivered more than once: a worker
  can crash between finishing work and marking the job complete. Every handler
  must be safe to run twice — see RETRY_POLICY.md. The transaction makes
  *enqueueing* atomic, not *executing*.
- **Not ordering.** Two jobs enqueued in one transaction may execute in either
  order, and concurrently. A job that must follow another must be enqueued by the
  first one's handler.
- **Not atomicity with anything outside PostgreSQL.** An email already sent
  cannot be rolled back. Side effects on external systems belong at the end of a
  handler, after the durable state they depend on is committed.
- **Not cross-database.** The mechanism works because the queue lives in the same
  PostgreSQL instance as the application data, in a separate schema. Moving the
  queue to a different server (Redis, SQS, a separate cluster) would break this
  property silently — the code would still compile and the tests would need a
  different design. That constraint is recorded in ADR-011.

## Payload size

Enqueue refuses a payload over 16 KiB. A payload that large means someone is
queueing a document or a resource snapshot rather than an identifier. Jobs carry
identifiers; the handler reloads authoritative state (INV-192).

This also protects the transactional property above: a large payload makes the
enclosing business transaction hold locks while a blob is written.
