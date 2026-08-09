# Worker Foundation Report — BACKEND-16

## What was built

A second process role — `packages/worker` — that consumes durable background
jobs from pg-boss running on the existing PostgreSQL instance in its own schema.

| Layer | What it owns |
|---|---|
| `@lagda/application` | `JobScheduler` port, `JOB_TYPES` closed union, `JobDefinition`, payload schemas, `TerminalJobError` / `RetryableJobError`, the two job definitions |
| `@lagda/worker` | pg-boss adapter, configuration, handlers, the process entrypoint |

The application does not know pg-boss exists. That is what lets a use case be
called from a test with no queue running.

## The decisive property

A job enqueued alongside a business write **joins that write's transaction**.
Both commit or neither does. No outbox table.

The mechanism is pg-boss's `db?: IDatabase` send option, given an adapter backed
by an open Kysely transaction. It was verified against the installed version's
types rather than assumed from documentation, and then proven by a test that
rolls back and asserts zero job rows — because "both use PostgreSQL" does not
make two connections atomic, and the difference is invisible in code review.

Deleting the override makes that test fail. That was checked.

## Numbers

- **21 worker tests**, all against real PostgreSQL and real pg-boss
- **164 integration tests** across 8 files, all passing
- **4 guarantee probes**, each catching exactly what it should
- **8 import-boundary probes** — 5 violations caught, 3 negative controls clean
- **6 migrations from an empty database**, 11 tables — BACKEND-16 adds none
- **2 jobs**, both `system`-scoped maintenance sweeps

## Three things the tests did not catch

**The worker could not start.** pg-boss 12 does not create queues implicitly and
`startWorker` did not create them. The built process died with
`Queue idempotency.cleanup not found` — while all 20 tests passed, because each
test creates its own queue. Found by running the artefact, fixed with
`ensureQueue`, now covered by a regression test.

**The rethrow guarantee was asserted by nothing.** Deleting `throw error;` from
the handler wrapper broke no test: every retry test drove `boss.work` directly
and none reached the code that runs in production. A comment claimed the
guarantee; nothing enforced it. Now tested through `registerSystemHandler`.

**The probe harness always said "pass".** Its failure-count regex tried to step
over ANSI escapes inline and matched nothing, so every probe reported zero
failures — including the three that genuinely were catching violations. Stripping
ANSI first was the fix. A detector that cannot fail is worse than no detector,
and this one nearly certified four guarantees on no evidence.

All three are the same shape as `RouteMeta.status`: something that existed,
looked right, and executed nothing.

## Also corrected

`packages/api` could import `pg-boss` and `@lagda/worker` — everything needed to
start a queue consumer inside a web process. The composition-root ESLint block
covered api and worker together and banned only PDF libraries. Split into two
blocks with their own messages, and probed in both directions.

## What does NOT exist

- **No production caller.** No route enqueues anything. The port is wired and
  proven; the first feature command will be its first user.
- **No workspace-scoped job**, so RLS tenant context inside a worker is
  unanswered (OD-045).
- **No dead-letter handling or alerting.** A permanently failed job is durable
  and invisible (OD-042).
- **No metrics.** Log fields only (OD-043).
- **No terminal short-circuit.** `TerminalJobError` sets a log field; it does not
  stop retries (OD-048).
- **No worker log redaction** (OD-049).
- **Signal delivery unproven** — shutdown verified by calling `close()` directly,
  on Windows (OD-047).

## eNotary

Nothing in this command touches eNotary. No job, schema, route or document
references it. LAGDA eNotary is Coming Soon and Subject to Supreme Court
Accreditation and applicable rules.

## Reading order

1. **ADR-011** — why PostgreSQL rather than Redis or a managed queue
2. **WORKER_ARCHITECTURE.md** — the two process roles and what each may import
3. **QUEUE_CONSISTENCY.md** — the atomicity mechanism and its limits
4. **RETRY_POLICY.md** — bounds, backoff, duplicate delivery
5. **JOB_DATA_CLASSIFICATION.md** — what may go in a payload
6. **JOB_CATALOG.md** — the two jobs, and how to add a third
7. **WORKER_TEST_MATRIX.md** — what is proven, and what is not
