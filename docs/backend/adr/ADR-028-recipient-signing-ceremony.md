# ADR-028 — Recipient signing ceremony

**Status:** Accepted (BACKEND-35)
**Date:** 2026-08-10
**Related:** ADR-027 (recipient signing access), BACKEND-32 (snapshot),
BACKEND-33 (send), BACKEND-17/29 (storage)

## Context

An authenticated external recipient must see the exact document they were asked
to sign, the exact fields assigned to them, and nothing else — without workspace
membership, and without any mutable authoring state being able to change what
they see after the request was sent.

Two things make this harder than it sounds. The recipient realm has no tenant
context of its own until a session supplies one. And "nothing else" has to hold
inside a tenant, not just across tenants: the other signer on the same request
is the adversary that tenant isolation cannot see.

## Decision

**A recipient-scoped ceremony read model over the immutable snapshot, with
RESTRICTIVE row-level security narrowing the recipient realm below tenant
isolation.**

1. **The session is the only identity.** No request id, no recipient id, in any
   path, query or body. §6 offers accept-and-validate; not having the parameter
   is stronger.
2. **The repository is bound at construction** to one workspace, one request and
   one recipient, with read methods that take no identifying arguments.
3. **Six RESTRICTIVE policies** keyed off the session digest, with an `is null`
   arm that makes them inert outside the recipient realm.
4. **`getSourceArtifact()` joins from the request** and takes no parameter.
5. **Streaming**, because the storage port cannot presign.
6. **Consent before the document**, because that is the product's step order.
7. **A version, never the text.**
8. **`POST` to enter, `GET` to read** — the evidence-producing act is separated
   from the safe one.

## Alternatives rejected

**Reuse the workspace document API for recipients.** Rejected: its authorization
basis is membership, which a recipient does not have and must not be given. Any
adapter that made it work would be a second definition of who may read a
document — and the weaker one would win the first time they disagreed.

**Permissive RLS policies beside tenant isolation.** Rejected, and this is the
one that would have looked right. Permissive policies OR: adding a narrow one
would have GRANTED the recipient realm everything tenant isolation grants, which
is the whole tenant. The bug would have been invisible in every test that only
checked cross-tenant isolation.

**Repository predicates alone, without RLS.** Rejected: correct today and one
refactor from wrong. A `where` clause is a thing a person remembers; a policy is
a thing the database enforces. Both are cheap, so both.

**Live preparation for field layout.** Rejected: it would make an in-flight
signing transaction depend on the sender's editor. A sender dragging a signature
box while a counterparty has the page open would move where they sign.

**The raw signing link as the whole ceremony credential.** Rejected in ADR-027
and still rejected: a link in an inbox is not a session.

**A per-request consent version frozen at send.** Rejected for now: the
immutable recipient row has no consent column and adding one is a BACKEND-32
change. System policy is permitted by §141 provided the lifecycle point is
clear. The cost is recorded — rotation asks already-accepted recipients again —
and revisiting is an open decision.

**Storing the disclosure text.** Rejected: the product's own copy says it is for
demonstration only. A row containing it would look like a legal record, which is
worse than an obviously incomplete one.

**Server-side draft autosave.** Rejected: the product says in-memory only,
twice. A draft store would have no writer and would create partial signing state
nobody asked for.

**Writing an `evidence_events` row.** Rejected: no use case in this codebase
writes one, and the first would create a trail whose only entries are ceremony
entries.

## Consequences

**Good**

- A recipient reaches one request, one recipient row, one field set and one
  artifact — proven by counts of 1-of-2, not by argument.
- Other-recipient isolation holds *inside* a tenant, which is where it matters.
- Snapshot independence is structural: there is no method that could read a
  contact or a preparation.
- BACKEND-36 inherits a field policy that already names the server-derived
  types.

**Costs**

- Restrictive policies are a pattern nobody else in this schema uses yet.
  Someone will add a permissive one by habit; the architecture guard exists for
  that reason.
- Streaming means no Range support until the port grows an operation.
- Consent version rotation re-asks. Deliberate, documented, and still friction.
- Two settings live on one transaction is more state than one.

**Left open**

OD-145 (evidence wiring), OD-146 (consent freeze point), OD-147 (multi-document
requests), OD-148 (sender display name), OD-149 (renderers for four field
types).
