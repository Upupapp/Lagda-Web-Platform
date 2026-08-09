# ADR-009 — PostgreSQL-backed idempotency with in-transaction claims

**Status:** Accepted · **Date:** 2026-08-09 · **Command:** BACKEND-14
**Related:** ADR-003 (PostgreSQL), ADR-008 (sessions), OD-037

## Context

Handoff §28 requires idempotency for document send, invitations, plan changes,
signature submission and OTP delivery. These are operations where executing
twice is a real harm: two signing requests to a client, two invoices, two
signatures recorded.

LAGDA runs multiple API instances against one PostgreSQL database, with no
Redis. Retries arrive from browsers, from network layers, and later from
workers.

## Decision

**PostgreSQL-backed idempotency**, identified by
`scope + operation + key digest`, with a **SHA-256 fingerprint of the canonical
logical request**, and the claim row inserted **inside the business
transaction**.

## Alternatives considered

**In-memory deduplication.** Rejected outright. A `Map` in one process protects
nothing across instances and nothing across a restart. It would look like a
control and be none.

**Redis.** Rejected. It is a second datastore to operate, back up and reason
about during an outage — and, more importantly, it cannot participate in the
business transaction. With Redis the claim and the mutation commit separately,
which reintroduces every problem the in-transaction claim removes: a crash
between them leaves a claim with no mutation, or a mutation with no claim, and
recovering from that needs leases, reclaim windows and a decision about whether
the mutation actually committed. §73 calls that the hardest idempotency problem;
this design avoids it rather than solving it.

**Provider-level idempotency only.** Rejected as the primary mechanism. It
protects the boundary with Stripe or an email provider, not LAGDA's own state,
and three of the five required operations are primarily database mutations.
Provider idempotency remains necessary *in addition*, at a different boundary.

**Claim outside the transaction, with a lease.** Rejected for the operations
that fit in one transaction. It needs a lease duration, a reclaim rule, and an
answer to "did the mutation commit before the crash?" that cannot be derived
from the idempotency table alone. Operations that genuinely need it — external
providers — will stage durable state instead.

## Consequences

**Accepted: it covers only single-transaction mutations.** Plan change and OTP
delivery call external providers and are catalogued as PLANNED rather than
marked ready. Overstating coverage would be worse than the gap.

**Accepted: an extra INSERT and UPDATE on protected operations.** Two statements
in a transaction that was already running.

**Accepted: a concurrent duplicate blocks** on the unique index until the first
transaction resolves. For short DB transactions that is the desired
serialization; for a long one it would be a problem, which is another reason
long operations do not use this pattern.

**Enabled: no stale-claim machinery at all.** No lease, no reclaim job, no
recovery. A crash leaves nothing because nothing committed.

**Enabled: rollback frees the key**, so a transient failure or an unexpected 500
is retryable and is never cached as a completed outcome.

**Not claimed: exactly-once external delivery.** An email provider may still
send twice. That is a separate boundary with separate keys.

## What would trigger revisiting this

- An operation that must be idempotent *and* cannot be contained in one
  transaction *and* cannot be staged — none is known.
- Measured contention from duplicates blocking on the index.
- A move away from PostgreSQL, which would change far more than this.
