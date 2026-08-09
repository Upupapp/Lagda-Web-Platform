# Worker Test Matrix — BACKEND-16

**21 tests against real PostgreSQL and a real pg-boss instance.** No mocked
queue: the central claim of this command is about two libraries sharing one
connection, and a mock cannot be wrong about that in the way production can.

Time is controlled by an injected clock. No test sleeps for a window to elapse;
waits are condition-polled with a bound.

## Queue consistency — the decisive property

| Case | Result |
|---|---|
| **COMMITS the business write and the job together** | **PASS** |
| **ROLLS BACK the job with the business write** | **PASS** |
| Enqueues outside a transaction when no business write accompanies it | **PASS** |
| Refuses an oversized payload | **PASS** |

## Execution, retry, failure

| Case | Result |
|---|---|
| Delivers an enqueued job to a handler | **PASS** |
| Retries a transient failure and then succeeds | **PASS** |
| Stops retrying and records a `failed` job | **PASS** |
| **Creates its queues, carrying the declared retry bound** | **PASS** |
| **Propagates a handler failure through the worker's own registration** | **PASS** |

## Handlers

| Case | Result |
|---|---|
| Deletes only expired idempotency records | **PASS** |
| Is safe to run twice | **PASS** |
| Deletes only expired rate-limit counters | **PASS** |
| Rejects a malformed payload as terminal | **PASS** |
| Accepts a valid payload | **PASS** |
| Registers a recurring schedule idempotently | **PASS** |

## Configuration

| Case | Result |
|---|---|
| Defaults schedules OFF | **PASS** |
| Rejects a zero pool | **PASS** |
| Rejects an out-of-range batch size | **PASS** |
| Rejects a malformed cron expression | **PASS** |
| Rejects a non-numeric setting rather than defaulting | **PASS** |
| Declares every job with a retry bound and an idempotency strategy | **PASS** |

## Probes — every guarantee verified by breaking it

| Violation | Tests failing |
|---|---|
| Remove the `db:` transaction override from enqueue | **1** |
| Swallow the handler error instead of rethrowing | **1** |
| Raise the payload cap from 16 KiB to 10 MB | **1** |
| Skip payload validation | **1** |
| Baseline (all reverted) | **0** |

The second probe initially failed to fail: deleting `throw error;` broke nothing,
because every retry test drove `boss.work` directly and no test reached the
worker's own wrapper. The rethrow was a guarantee that existed only in a comment.
A test through `registerSystemHandler` now covers it, and the probe catches it.

The probe harness itself also had to be fixed before it was worth anything: its
failure-count regex tried to step over ANSI escapes inline, matched nothing, and
reported **every probe as zero failures** — a harness that always said "pass".
Stripping ANSI first was the fix. Recorded because a detector that cannot fail is
worse than no detector.

## Import boundaries — probed in both directions, with negative controls

| Case | Caught | Expected |
|---|---|---|
| `api` imports `pg-boss` (bare) | yes | yes |
| `api` imports `@lagda/worker` (bare) | yes | yes |
| `api` imports `@lagda/worker/queue` (subpath) | yes | yes |
| `worker` imports `fastify` | yes | yes |
| `worker` imports `@lagda/api` | yes | yes |
| NEGATIVE — `worker` imports `pg-boss` | no | no |
| NEGATIVE — `api` imports `@lagda/db` | no | no |
| NEGATIVE — `worker` imports `@lagda/application` | no | no |

Bare and subpath forms are both tested because `@lagda/worker/*` as a pattern
does **not** match `@lagda/worker` — the same gap class that let a bare import
slip past the sealing detector in BACKEND-09.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `npm test` (unit) | **PASS** |
| `npm run test:integration` | **PASS — 164 tests, 8 files** |
| Migration from an empty database | **PASS — 6 migrations, 11 tables** |
| Built worker boots against PostgreSQL | **PASS** |
| Graceful `close()`, called twice | **PASS — idempotent** |

## Found by running the artefact, not by the suite

The built worker died on boot: `Queue idempotency.cleanup not found`. pg-boss 12
does not create queues implicitly and `startWorker` did not create them either.
**All 20 tests passed at that moment**, because each test creates its own queue.

Fixed with `ensureQueue`, and covered by a regression test that asserts creation,
the retry bound reaching the queue row, and idempotent re-creation on restart.

## Not covered

- **No production caller.** Nothing enqueues a job from a route. The scheduler
  port is wired and proven; no feature uses it yet.
- **No workspace-scoped job.** Every job is `system`. How a worker establishes
  RLS tenant context for a job is untested (OD-045).
- **SIGTERM/SIGINT delivery is unproven.** Shutdown was verified by calling
  `close()` directly. Windows does not deliver these signals the way production
  Linux will (OD-047).
- **No dead-letter or failure alerting test**, because neither exists (OD-042).
- **No terminal-failure short-circuit test.** `TerminalJobError` sets a log field
  and does not stop retries (OD-048).
- **No concurrency or throughput measurement.** `concurrency: 1` on both jobs is
  a conservative default, not a measured one (OD-044).
- **No worker log redaction test**, because the API's redaction is not applied to
  worker output (OD-049).
