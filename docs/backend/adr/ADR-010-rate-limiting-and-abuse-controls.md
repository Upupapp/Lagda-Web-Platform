# ADR-010 — Layered abuse controls on PostgreSQL, no Redis, no edge dependency

**Status:** Accepted · **Date:** 2026-08-09 · **Command:** BACKEND-15
**Related:** ADR-003 (PostgreSQL), ADR-008 (sessions), ADR-009 (idempotency), OD-027

## Context

LAGDA needs brute-force, OTP, enumeration and volumetric protection before the
endpoints that need them exist. The handoff specifies exact thresholds (§317,
§145, §583), so this is an implementation question, not a policy one.

Multiple API instances share one PostgreSQL database. No Redis.

## Decision

**Durable counters in PostgreSQL**, fixed window, atomic upsert.

**Typed layered scopes** — ip, user, workspace, account, recipient, challenge —
with personal-data scopes digested before storage.

**A central policy registry** carrying limit, window, scope type, failure mode
and the **source** of every threshold.

**Per-policy failure modes**: fail-closed for credential guessing, fail-open for
volumetric ceilings.

**No Redis. No `@fastify/rate-limit`. No CAPTCHA, fingerprinting, geo-blocking
or denylists.**

## Alternatives considered

**Process memory only.** Rejected. With N instances, "5 per minute" becomes "5N
per minute". For a brute-force control that is the control failing, not an
approximation.

**Redis.** Rejected, consistently with ADR-008 and ADR-009. A second datastore
to operate, back up and reason about during an outage, for a counter PostgreSQL
serves from a primary-key upsert. Redis would be justified by measured
contention on that upsert; there is none to measure yet.

**`@fastify/rate-limit` as a first-line layer.** Evaluated and rejected. Its
store is process-local by default and Redis-oriented otherwise — so it offers
either the wrong semantics or the dependency just rejected. It also emits its own
error shape, which would produce two different 429 envelopes depending on which
layer fired. A weaker, differently-shaped second control is worse than one
correct control.

**Reverse proxy / WAF only.** Rejected as the sole mechanism. An edge cannot
express "5 attempts per *account*" or "3 OTP sends per *challenge*" — it does not
know what an account is. Edge limits are complementary and belong to BACKEND-65;
they do not replace application controls.

**Sliding window or token bucket.** Rejected. Sliding needs per-request
timestamps — the request log this design avoids. Token bucket needs
read-modify-write on a balance, which is the race the atomic upsert avoids. The
cost of a fixed window is a boundary burst, documented rather than hidden.

## Consequences

**Accepted: a database write per protected request.** One indexed upsert on a
narrow table. Rate-limited endpoints already touch the database.

**Accepted: boundary bursts.** Up to 2× a threshold across a window boundary.
For limits of 5 and 20 that is acceptable, and it is written down.

**Accepted: shared-NAT false positives.** An office behind one address can
exhaust an IP limit legitimately. Mitigated by pairing IP with a semantic scope
wherever an identity exists, and by failing open on public verification.

**Accepted: IP limits are only as good as proxy trust.** `TRUST_PROXY` defaults
to trusting nothing, so today every request behind a proxy shares one bucket.
That is the safe failure — a wrong-but-convincing client IP would be worse — but
IP limits are not meaningful until BACKEND-65 configures the topology (OD-027).

**Enabled:** BACKEND-20/22/23/33/34/36/42 add a policy row and two lines of
wiring rather than an abuse mechanism each.

**Not claimed:** exactly-once anything, and no network-layer DDoS protection.

## What would trigger revisiting this

- Measured contention on the counter upsert.
- A threshold needing sub-second precision, which a fixed window cannot give.
- Sustained distributed abuse under every threshold, which would call for edge
  or reputation controls rather than a different counter.
