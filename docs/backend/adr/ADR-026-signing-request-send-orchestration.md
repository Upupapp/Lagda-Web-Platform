# ADR-026 — Send as durable orchestration

**Status:** Accepted (BACKEND-33)
**Date:** 2026-08-10
**Related:** ADR-025 (immutable snapshot), ADR on secret storage (BACKEND-23),
OD-098

## Context

Sending a signing request must activate an immutable workflow reliably across
three independent failure domains: the database, the queue, and an email
provider that does not yet exist.

The naive implementation — a route that calls an email API and then marks the
request sent — fails in every direction. A provider timeout after delivery marks
nothing sent while recipients hold links. A provider outage blocks a sender
entirely. A retry mints new credentials.

## Decision

**Send is a durable, idempotent, transactional state transition. It contacts no
provider.**

1. One transaction: eligibility, activation, grants, delivery intents,
   `state = sent`, idempotency completion.
2. The transition is **last** and **conditional** on `state = 'draft'`.
3. Credentials are generated before the transaction and discarded if it fails.
4. The raw credential is **sealed** into the delivery intent with the existing
   AES-256-GCM `SecretBox`, under its own key. No key means Send fails.
5. Delivery intents are the durable record. A dispatcher finds them through a
   partial index. BACKEND-45 renders and transmits.
6. Only the earliest routing cohort activates, and only field-holding types are
   provisioned.

## Alternatives rejected

**The route sends emails directly.** Rejected: it makes a signing workflow's
correctness depend on a third party's uptime, and it puts an HTTP call inside a
database transaction or immediately outside one — both of which produce states
nobody can reconcile.

**Mark SENT, then enqueue best-effort.** Rejected: a process crash between the
two leaves a request that claims to be sent with no credential and no delivery
record. The user is told it worked and nobody ever receives anything.

**Enqueue, then mark SENT.** Rejected: the reverse failure. A worker can pick up
and deliver a job for a request that is still `draft`, and a retry of the send
then produces a second set of invitations.

**A transactional outbox table.** Rejected as *unnecessary*, not as wrong.
BACKEND-16 established that pg-boss's `send()` accepts the caller's transaction,
which is what removes the need — and the delivery intent already IS the durable
record with a workspace-scoped, RLS-protected, queryable shape. A generic outbox
beside it would be a second durable queue for one consumer.

**JWT signing links.** Rejected: verification without a database row is the
opposite of what a signing credential needs. Revocation, narrow lookup, explicit
lifecycle and server authority are each a row.

**Drop the raw credential like every other LAGDA secret.** Rejected — and this
was the decisive choice. It is what invitations do, and it is why OD-098 records
invitation delivery as blocked: the raw token exists for one transaction and no
renderer can recover it. Repeating that for signing would produce a workflow
whose links can never be built. OD-098 named the alternative and BACKEND-23
already built it.

**A shared encryption key with MFA.** Rejected: different blast radii. One
compromises second factors, the other mints signing links for pending
agreements; sharing a key means rotating both to respond to either.

**Report SIGNING DELIVERY: BLOCKED.** Considered seriously, as §62 requires. It
would have been the honest answer if no approved secret-at-rest mechanism
existed. One does.

## Consequences

**Good**

- A provider outage cannot stop a sender, corrupt a request or lose an
  invitation.
- Retries are safe at every level: the same key replays, the same intent
  redelivers, the same grant is reused.
- BACKEND-45 can be written without touching send semantics.
- OD-098's blocker is resolved for signing, with a proven mechanism the other
  three flows can adopt.

**Costs**

- A recoverable secret at rest. Encrypted, purpose-separated, key-versioned,
  and the only alternative was an unusable link.
- Delivery is at-least-once. A recipient may receive two identical invitations
  carrying the same valid credential.
- `SENT` requires explanation. It is a workflow fact, not a delivery fact, and
  every document here says so.

**Left open**

- OD-134 through OD-139 — send metadata, resend, cancel/void, provider status,
  CC delivery, and the credential lifecycle BACKEND-34 owns.
