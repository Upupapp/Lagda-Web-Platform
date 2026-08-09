# Worker Architecture — BACKEND-16

The worker is a **second process role** running the same codebase and the same
release artefact as the API. It is not a second application, and it is not a
thread inside the API.

## Why a separate process

| | API | Worker |
|---|---|---|
| Started by | `npm run start:api` | `npm run start:worker` |
| Entrypoint | `packages/api/dist/server/main.js` | `packages/worker/dist/server/main.js` |
| Liveness proven by | answering a port | consuming jobs |
| Scales with | request rate | queue depth |
| Restart cost | in-flight requests | in-flight jobs, which are durable |
| Runs migrations | no | no |

The two fail for different reasons and recover on different timescales. A slow
job must not consume a connection a request is waiting for, and a worker restart
must not drop traffic. Coupling them means neither can be restarted alone.

This is enforced, not merely stated (INV-190):

- `packages/api/**` may not import `pg-boss` or `@lagda/worker`. An API process
  able to call `boss.work` is an API process that can start a consumer.
- `packages/worker/**` may not import `fastify`, `@fastify/*` or `@lagda/api`.
  The worker serves no HTTP.

Both directions are ESLint `no-restricted-imports` rules with their own
explanatory messages, and both were verified by writing a violating file and
observing the failure — including negative controls proving the ban is not so
broad that legitimate imports trip it (`worker → pg-boss`, `api → @lagda/db`,
`worker → @lagda/application` are all still allowed).

## Dependency direction

```
contracts ← core ← application ← {db, sealing, storage} ← api
                        ↑                                  worker
                        └────── ports ─────────────────────┘
```

`@lagda/application` owns the `JobScheduler` port and the job definitions. It
does not know pg-boss exists. `packages/worker` implements the port. This is the
same shape as every other adapter in the codebase, and it is what lets a use case
be called from a test with no queue running.

## What the worker does at boot

1. **Load configuration.** An invalid concurrency, batch size, pool size or cron
   expression stops the process here rather than producing a subtly wrong worker.
2. **Connect and ping the database.** Unreachable means exit, not degraded start.
3. **Start pg-boss** against its own PostgreSQL schema (`pgboss` by default).
4. **Create the queues.** pg-boss 12 does not create them implicitly.
5. **Register handlers** explicitly — no filesystem scanning, so what runs is
   what a reviewer can read.
6. **Register recurring schedules**, if enabled.

Step 4 was missing in the first implementation. Every integration test passed,
because the tests create their own queues; the built process died on boot with
`Queue idempotency.cleanup not found`. It was found by running the artefact, and
is now covered by a regression test.

## What the worker does NOT do

- **No migrations.** Migration is an explicit deployment step. A worker that
  migrated on boot would race every API replica during a rolling deploy
  (INV-199).
- **No HTTP.** No health endpoint, no port. Liveness is queue consumption.
- **No process timers.** `setInterval` disappears on restart and duplicates
  across instances. Recurring work goes through pg-boss's schedule table, which
  is keyed by queue name, so repeated registration by several workers is an
  upsert rather than a duplicate (INV-200).

## Schedules and time

Schedules are registered with `tz: "UTC"` explicitly. A server-local cron would
silently shift with the deployment's timezone.

Cleanup payloads carry a batch size and nothing else. There is deliberately no
`before` timestamp: the handler reads the clock **at execution time**. A horizon
baked in at enqueue would make a job delayed by an outage delete using a stale
cutoff (INV-201).

## Shutdown

`SIGTERM` and `SIGINT` both call one idempotent `close()`. An orchestrator
commonly sends SIGTERM then SIGINT moments later, and two concurrent shutdowns
would close the pool twice.

Shutdown is graceful: stop accepting new work, let active handlers finish within
`WORKER_SHUTDOWN_TIMEOUT_MS`. Unfinished jobs stay durable and are retried — the
queue is the recovery mechanism, not a best-effort drain.

**Signal delivery was not verified on Linux.** It was verified by calling
`close()` directly, twice, and observing `worker.stopping` / `worker.stopped`
followed by silence. Windows does not deliver `SIGTERM` to a Node process the way
production Linux will, so the signal path itself remains unproven (OD-047).

## Logging

The worker emits the same structured JSON fields as the API — `service`,
`processRole`, `event` — so a job failure is findable next to the request that
caused it. It writes them directly rather than importing `@lagda/api`, because
the import ban above is real. The duplication is a few lines; the coupling would
not be.

`processRole` is `"worker"`, distinguishing it from `"api"` and `"migration"`.
