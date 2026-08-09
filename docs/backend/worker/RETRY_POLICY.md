# Retry Policy — BACKEND-16

## Nothing retries forever

Every job declares `maxAttempts`. The bound is applied in two places, and both
are necessary:

- **On the queue**, when it is created — `retryLimit = maxAttempts - 1`.
- **On each send**, by `JobScheduler.enqueue`.

The queue-level bound is not redundant. Recurring jobs are sent by pg-boss's own
scheduler and never pass through LAGDA's `JobScheduler`, so a per-send bound
would not reach them. A failing scheduled cleanup would inherit the library
default rather than the policy this codebase declares (INV-193).

Verified against the running database:

```
name                 | retry_limit | retry_delay | retry_backoff
idempotency.cleanup  |           2 |          60 | t
rate-limit.cleanup   |           2 |          60 | t
```

`maxAttempts = 3` means one original execution plus two retries.

## Backoff

Exponential, starting at `retryBackoffSeconds`. A fixed interval means a failing
dependency is hammered at a constant rate by every retry in the queue — the
pattern that turns a brief outage into a sustained one.

## Two failure kinds

| | Meaning | Behaviour |
|---|---|---|
| `TerminalJobError` | Will not succeed on retry | Logged as `errorCategory: "terminal"` |
| `RetryableJobError` | May succeed later | Logged as `errorCategory: "retryable"` |
| Anything else | Unknown | Treated as retryable |

Malformed payload, unsupported version and tenant mismatch are terminal.
Retrying them burns the attempt budget and delays the dead-letter signal that
would tell an operator something is actually wrong.

**The classification is currently advisory.** It sets a log field. It does NOT
short-circuit the retry: a `TerminalJobError` still consumes its remaining
attempts. Making terminal failures fail immediately requires pg-boss's
`WorkerHandleError` semantics or an explicit `boss.fail()` call, and neither is
wired. This is stated rather than implied, because a reader could reasonably
assume from the type name that retries stop (OD-048).

## Failures are rethrown, always

The worker's handler wrapper logs a failure and then **rethrows it**. Catching it
and returning normally would report success to the queue and silently discard the
work — the exact failure mode this layer exists to prevent.

This was initially asserted by nothing. The retry and failure tests drove
`boss.work` directly, so deleting the `throw error;` line broke no test. A test
now exercises the real registration path, `registerSystemHandler`, and asserts
the job reaches state `failed` and that attempts are numbered from 1 (INV-195).

## Duplicate delivery is expected

A worker can crash between finishing work and marking the job complete. The job
becomes visible again and runs a second time. This is inherent to a durable
queue, not a defect.

Every job definition therefore carries a required `idempotencyStrategy` field
describing how a duplicate delivery stays safe. It is prose, not a mechanism —
the mechanism is the handler's own design. Requiring the field forces the
question to be answered at definition time rather than discovered in production
(INV-196).

Queue-level deduplication (`singletonKey`, `singletonSeconds`) collapses
duplicates within a window. It is a convenience and **not** a substitute: an
operator can always replay a job by hand.

## Attempt numbering

pg-boss counts retries from 0. Humans count attempts from 1. The wrapper adds
one, so `attempt: 1` is the first execution. `includeMetadata: true` is set on
every worker, because without it `retryCount` is unavailable and the attempt
number would have to be guessed — and "attempt 1" on every retry makes a retry
storm indistinguishable from healthy traffic.

## What happens after the last attempt

The job's state becomes `failed` and it stays in the queue table, inspectable.
Nothing deletes it, nothing alerts on it.

**There is no dead-letter handling and no alerting.** A permanently failing job
is durable and invisible: an operator would have to query
`pgboss.job where state = 'failed'` to know. That is a gap, recorded as OD-042,
not a design decision.
