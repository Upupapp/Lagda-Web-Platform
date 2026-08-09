# Rate Limit Foundation Report — BACKEND-15

## 1. What was built

| Artifact | Location |
|---|---|
| Migration | `packages/db/src/migrations/006_rate_limits.ts` |
| Ports and scope model | `packages/application/src/common/ports/rate-limit.ts` |
| Policy registry | `packages/application/src/rate-limit/policies.ts` |
| Limiter | `packages/application/src/rate-limit/limiter.ts` |
| PostgreSQL adapter | `packages/db/src/repositories/rate-limit.ts` |
| Fastify integration + digester | `packages/api/src/security/rate-limit-plugin.ts` |
| Tests (34 + 13) | `packages/api/src/rate-limit.test.ts`, `packages/db/src/rate-limit.integration.test.ts` |

**No new dependency. No Redis. No CAPTCHA. No `@fastify/rate-limit`.**

## 2. Every threshold is sourced

The handoff specifies exact numbers, so none was invented:

| Policy | Limit | Source |
|---|---|---|
| `auth.signin.ip` / `.account` | 5 / min | §317 |
| `otp.deliver.account` | 3 / 10 min | §317 |
| `otp.verify.challenge` | 5 / 15 min | §145 |
| `verification.public.ip` | 20 / min | §317 |
| `api.write.user` | 100 / min | §317 |
| `search.query.user` | 120 / min | §583 |
| `commands.execute.user` | 60 / min | §583 |

Startup validation **rejects a policy with an empty source**, and a test asserts
every one cites the handoff. Eleven further operations are catalogued as **TBD**
rather than given a guessed number.

## 3. Decisions

**PostgreSQL, fixed window, atomic upsert.** A counter in one process turns "5
per minute" into "5N per minute" across N instances — for a brute-force control
that is the control failing.

**`@fastify/rate-limit` evaluated and rejected.** Process-local by default,
Redis-oriented otherwise, and it emits its own error shape — which would mean two
different 429 envelopes depending on which layer fired. A weaker,
differently-shaped second control is worse than one correct control.

**Failure modes are per policy.** Fail-closed for credential guessing;
fail-open for volumetric ceilings. A fail-closed store outage raises a
*dependency* error → 503, never a 429 — a caller must not be told "slow down"
when the truth is "the control is broken".

**Personal-data scope keys are digested.** An IP and an account key are personal
data the table only ever compares. User and workspace IDs stay plain — already
operational identifiers, and hashing them would block an investigation for no
privacy gain.

## 4. Gates

| Gate | Result |
|---|---|
| typecheck / lint / build | PASS |
| `npm test` | **424 passed** (was 390) |
| `npm run test:integration` | **144 passed** (was 131) |
| Migration from zero | PASS |
| Probes | **5/5 fire** |

The concurrency test issues ten parallel increments and asserts ten **distinct**
counts — no duplicates, no gaps. Substituting read-then-write fails it.

## 5. Risks

**R-1 — No policy has a production consumer.** Eight are implemented and
enforceable; none is wired, because no feature endpoint exists. Two lines per
route, owned by the feature command.

**R-2 — IP limits are not yet meaningful in production.** `TRUST_PROXY` defaults
to trusting nothing, so behind a proxy every request shares one bucket. The safe
failure, not a working control (OD-027).

**R-3 — Shared-NAT false positives.** An office behind one address can exhaust
an IP limit legitimately. Mitigated by pairing IP with a semantic scope wherever
an identity exists, and by failing open on public verification.

**R-4 — Boundary bursts.** A fixed window permits up to 2× a threshold across a
boundary. Acceptable at these limits, and stated rather than hidden.

**R-5 — A database write per protected request.** One indexed upsert.
Unmeasured under load (BACKEND-61).

**R-6 — Anti-enumeration and no-permanent-lockout are documented, not
enforced.** They constrain BACKEND-20/22/23 and cannot be tested before those
exist.

**R-7 — No network-layer DDoS protection**, and none is claimed.

## 6. BACKEND-16 handoff — Worker & Queue Foundation

**Workers do not pass through HTTP rate limits.** A job retry is not a user
request, and counting it against a user's quota would let a background failure
lock a customer out of their own account. Jobs need **their own** retry,
backoff and dead-letter policy — a different mechanism for a different problem.

**Three cleanup jobs are waiting**, all already implemented as bounded
repository methods and all deliberately never run on the request path:

| What | Method | Why bounded |
|---|---|---|
| Expired sessions | `user_sessions` (BACKEND-13) | partial index on `expires_at` exists |
| Expired idempotency records | `deleteExpired(before, limit)` | must not delete an unexpired in-progress row |
| Expired rate-limit counters | `deleteExpired(before, limit)` | must not delete a live counter and reset an attacker |

Each takes a `limit` so a cleanup pass cannot lock a hot security table for an
unbounded time. BACKEND-16 supplies the schedule, not the logic.

**Queue pressure must be observable** — depth and dead-letter growth are already
in the alert catalog as SIGNAL_PLANNED.

**Reuse everything.** The worker uses the same logger factory (`processRole:
"worker"`), the same redaction, the same unit of work, the same tenancy rules.
BACKEND-12 recorded the required context: `jobId`, `jobType`, `workspaceId`,
`attempt`, `duration`, `result` — and no full job payload.

**Do not initialise pg-boss anywhere but the worker process.** The API must not
start a queue; they are separate process roles.

**Readiness: READY.** No blocker.
