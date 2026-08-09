# ADR-011 — Background jobs on PostgreSQL

**Status:** Accepted
**Date:** 2026-08-09
**Command:** BACKEND-16

## Context

LAGDA needs durable background work: email delivery, document sealing, evidence
generation, reminders, and the maintenance sweeps that BACKEND-14 and BACKEND-15
already require. Work must survive a process restart, retry on transient failure,
and stop retrying eventually.

The immediate need is small — two cleanup jobs. The eventual need includes work
whose loss is a compliance problem, not a UX problem: an evidence record that is
never written cannot be reconstructed later.

## Decision

**Use pg-boss on the existing PostgreSQL instance, in a separate schema
(`pgboss`), consumed by a separate worker process.**

Enqueue joins the caller's transaction by passing the open Kysely transaction to
pg-boss's `db` option, so a business write and its follow-up job commit or roll
back together. No outbox table.

## Alternatives considered

**Redis + BullMQ.** Mature, fast, good tooling. Rejected: it adds a second
datastore to operate, back up and secure, and it makes queue/state atomicity
impossible without an outbox — the exact complexity this decision avoids. LAGDA
runs one small production server (`project_servana_server`-scale infrastructure);
a second stateful dependency is a real operational cost, not a rounding error.

**A managed queue (SQS, Cloud Tasks).** Rejected for the same atomicity reason,
plus a hosting constraint: LAGDA's Philippine market and data-residency posture
make a PH-region managed queue an open question, not an assumption.

**An outbox table plus a relay process.** The general answer, and correct when
the queue is external. Rejected as unnecessary here: the queue is *in the same
database*, so the transaction can simply include the job row. An outbox would add
a table, a relay, and a second at-least-once hop for a guarantee already
available directly.

**A `setInterval` inside the API.** Rejected outright. It disappears on restart,
duplicates across replicas, has no retry, no durability, and no visibility.

## Consequences

**Good**

- One datastore. One backup story, one connection story, one place to look.
- Transactional enqueue with no outbox — proven by test, not assumed.
- Jobs are inspectable with SQL. `select * from pgboss.job where state = 'failed'`
  needs no new tooling.
- The queue inherits PostgreSQL's durability guarantees.

**Costs and constraints**

- **Queue load lands on the application database.** Polling and job churn consume
  connections and I/O on the same instance serving requests. Unmeasured
  (OD-044/BACKEND-61); pool sizes are separate and modest (`QUEUE_POOL_MAX=4`).
- **This does not scale indefinitely.** pg-boss is appropriate at LAGDA's real
  scale. At very high throughput, a dedicated broker becomes the right answer.
- **Moving the queue off PostgreSQL later breaks transactional enqueue
  silently.** The code would still compile; the atomicity would simply stop
  existing. This is the sharpest edge of the decision and the reason
  QUEUE_CONSISTENCY.md states it explicitly.
- **pg-boss owns its own schema.** LAGDA migrations do not manage those tables.
  Hand-writing another project's schema is a maintenance burden with no benefit,
  but it does mean a pg-boss upgrade can alter tables outside LAGDA's migration
  history. `QUEUE_MIGRATE=false` allows a deployment to gate that.
- **pg-boss 12 requires explicit queue creation.** Discovered by the process
  failing to boot, not by the type system.

## Revisit when

- Queue depth or job rate makes database load a measured problem.
- A job needs a guarantee PostgreSQL cannot give (sub-second fan-out to many
  consumers, cross-region delivery).
- The application database is split, at which point "same instance" stops being
  true and the atomicity argument stops holding.
