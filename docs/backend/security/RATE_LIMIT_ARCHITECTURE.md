# Rate Limit Architecture — BACKEND-15

## 1. What this is, and is not

**Defence in depth.** A rate limit answers "too much, too fast". It answers
nothing about who you are or what you may touch, and it never substitutes for
authentication, authorization, tenancy, CSRF or idempotency.

It also does **not** solve network-layer DDoS. An application counting requests
in Node is already past the point where a volumetric flood does its damage; that
belongs to a provider or an edge (BACKEND-65).

## 2. Storage — PostgreSQL, no Redis, no local layer

**Durable counters in PostgreSQL.** A counter in one Node process makes "5
sign-in attempts per minute" mean "5 *per instance* per minute" — for a
brute-force control that is not a rounding error, it is the control failing.

**No Redis**, consistent with every earlier decision: a second datastore to
operate, back up and reason about during an outage, for a counter PostgreSQL
serves from a primary-key upsert.

**No `@fastify/rate-limit`, deliberately.** It was evaluated and rejected. Its
store is process-local by default and Redis-oriented otherwise, so it would
provide either the wrong semantics or the dependency just rejected. It also
produces its own error shape, which would mean two different 429 envelopes
depending on which layer fired. Adding it as a "first-line" layer buys
load-shedding at the cost of a second, weaker, differently-shaped control — and
the durable path is one indexed upsert.

## 3. Algorithm — fixed window

The window start is derived arithmetically from the timestamp, so the counter's
identity is computable without reading anything first. That is what allows the
entire check to be **one atomic statement**.

Rejected alternatives:

- **Sliding window** needs per-request timestamps — the request log this design
  explicitly avoids, and which would make the limiter the most expensive thing
  on the request path.
- **Token bucket** needs read-modify-write on a balance, which is the race the
  upsert avoids.

The cost, stated: a fixed window permits a burst across a boundary — up to 10
sign-in attempts spanning two minutes rather than 5. For thresholds of 5 and 20
that is an acceptable trade, and it is written down rather than glossed over.

## 4. The atomic increment

```sql
INSERT INTO rate_limit_counters (…, count, …) VALUES (…, 1, …)
ON CONFLICT (policy, scope_type, scope_key, window_start)
DO UPDATE SET count = rate_limit_counters.count + 1
RETURNING count
```

PostgreSQL serializes concurrent upserts on the primary key, so ten simultaneous
requests receive ten **distinct** counts. A test asserts exactly that: no
duplicates, no gaps. Replacing it with read-then-write fails the test.

## 5. Scopes

| Type | Source | Stored as |
|---|---|---|
| `ip` | `request.ip` — Fastify's proxy-aware resolution | **digest** |
| `user` | Resolved session (BACKEND-13) | plain ID |
| `workspace` | Authorized workspace context | plain ID |
| `account` | Pre-auth, self-declared. An abuse bucket, never identity | **digest** |
| `recipient` | Validated signing access (BACKEND-34) | **digest** |
| `challenge` | OTP/verification challenge (BACKEND-23) | **digest** |

IP addresses and account keys are **digested** before storage — personal data
the counter table only ever compares, so it has no need to hold it reversibly.
User and workspace IDs stay plain: they are already operational identifiers
elsewhere, and hashing them would block an investigation for no privacy gain.

Account keys are lower-cased first, or an attacker alternating case would get a
fresh counter per variant.

**Every identifier comes from trusted context.** A body field would let an
attacker choose which bucket to fill.

## 6. Layering — why one scope is never enough

A per-IP limit alone is defeated from both directions:

- **False positives.** An office NAT, a mobile carrier or a corporate VPN puts
  thousands of legitimate users behind one address.
- **False negatives.** An attacker with a botnet or a cloud account rotates
  addresses freely.

A per-account limit alone is defeated by password spraying — one attempt against
each of a thousand accounts from one host.

So sign-in carries **both**, and the operation proceeds only if every policy
allows it. The first rejection is returned, so a caller learns it was refused
without learning how close it was to the others.

## 7. Failure modes — per policy, not global

| Policy | Mode | Why |
|---|---|---|
| `auth.signin.*`, `otp.*` | **fail-closed** | Unlimited password or OTP guessing during a database blip is worse than refusing the operation during one |
| `verification.public.ip`, `api.write.user` | **fail-open** | A volumetric ceiling being briefly absent beats the page being down |

A fail-closed store outage raises `AbuseControlUnavailableError` → **503**, not
429. A caller is never told "slow down" when the truth is "the limiter is
broken".

In practice PostgreSQL is already required by the operations these guard, so a
limiter outage usually coincides with the operation failing anyway — but the
classification is explicit rather than assumed.

## 8. Ordering

```
rate limit (IP) → authenticate → CSRF → authorize → validate
                → rate limit (user/workspace) → idempotency → mutation
```

IP limits run **first**, in `onRequest`, because everything after costs
something an attacker would otherwise get free: a session lookup, an Argon2
verification, a transaction, an idempotency claim.

Semantic limits necessarily run **after** authentication — there is no user to
count against until one is resolved. Same limiter, same counters, different
position.

A test asserts a rate-limited request **never reaches the idempotency layer**:
the claim count is unchanged after the rejection.

## 9. Interaction with idempotency

They solve different problems and both apply.

- **Idempotency** stops one logical operation executing twice.
- **Rate limiting** stops too many operations.

**A replay is still a request.** It costs a database read and is counted.
Exempting replays would turn the idempotency key into a rate-limit bypass: send
the same key forever and pay nothing.

A 429 fires before the claim, so it **never creates a completed idempotency
record**.

## 10. HTTP

`429 Too Many Requests`, code `rate_limited`, the canonical envelope, with
`Retry-After` in seconds — rounded **up**, so a client that obeys it does not
return while still blocked and burn another attempt.

The response carries no policy name, no count, no remaining, no scope. "2
attempts left" is a gift to an attacker, and a policy name tells them which
dimension to rotate.

**CORS preflight is not counted.** A preflight precedes every non-simple
mutation, so counting it would halve each browser client's usable limit.
**Health and readiness are not limited** — orchestrator probes are frequent by
design.

## 11. Anti-enumeration

Pre-auth limits are keyed on a normalized account identity **whether or not the
account exists**. There is deliberately no "unknown account is unlimited" path,
which would let an attacker enumerate accounts by observing which identifiers
get throttled.

**No permanent lockout.** Only temporary windows. A permanent lockout is a
denial-of-service weapon: an attacker who knows an email can lock its owner out
indefinitely. If the product later requires one, it belongs to account state
(BACKEND-20), not to the limiter.

## 12. Telemetry

Event `security.rate_limit_triggered` with `policy`, normalized `route`,
`method`, `result` — all bounded, code-defined values.

Metrics `rate_limit_checks_total` and `rate_limit_rejections_total`, labelled by
`policy` and `route` only. **Never** the IP, the digest, the account, the user or
the count.

429s log at `info`, not `error`. A spike may equally be an attack, a broken
frontend loop, or a policy set too tight — and alerting on each one trains people
to ignore alerts.

## 13. Retention

Counters expire a full window past their reset, so a late cleanup job cannot
delete one that is still authoritative. Cleanup is bounded and scheduled by
BACKEND-16 — never on the request path.

Short operational retention, **unrelated to evidence, session or document
retention**.

## 14. What this cannot do

- **Network-layer DDoS** — provider/edge concern.
- **A distributed attacker under every threshold** — layered scopes narrow it;
  they do not eliminate it.
- **Shared-NAT fairness** — a busy office can exhaust an IP limit legitimately.
  This is why IP is always paired with a semantic scope for authenticated flows,
  and why `verification.public.ip` fails open.
- **CAPTCHA, device fingerprinting, geo-blocking, denylists** — all deliberately
  out of scope. Each carries accessibility or privacy cost that no measured
  abuse currently justifies.
