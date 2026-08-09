# LAGDA Domain Conventions

Rules for working in `@lagda/core`.

## Purity

No HTTP, database, storage, queue, PDF, logger, metrics, feature flag, or
environment read. No clock read and no randomness. Enforced by ESLint (INV-005)
and by an executable audit in `core-purity.test.ts` that reads core's own source.

**Time is always a parameter.** `isExpired(state, expiresAt, now)` — never an
internal `Date.now()`. A test must give the same answer in 2036 as today.

**Identity comes from outside.** Core generates no IDs and no tokens.

## Outcomes — two mechanisms, one rule for choosing

- **`PolicyResult`** — the caller could reasonably cause this and wants every
  reason. Send readiness returns all unmet conditions at once. Never throws.
- **`DomainError`** — an operation against an impossible state. Thrown.

The test: *could a well-behaved user cause this?* Then it is a policy result.

Domain error codes are internal. They carry no HTTP status, no log level, no
severity. Mapping to API codes is BACKEND-05's.

## State

No generic `setStatus`, `setState`, or `setWorkspaceId` — asserted by test.
Lifecycle changes go through named actions so every transition is auditable.

Transitions live in one table, not scattered conditionals, so the machine can be
read and tested in one place. Terminal states carry an explicit empty action set.

Use `assertNever` for exhaustiveness: a new canonical status must fail
compilation rather than fall through a `default`.

## Modelling

Plain immutable read models and pure functions are the default. Create an entity
only when something owns mutable state across a lifecycle; create a value object
only when it protects a real invariant. Not every primitive needs wrapping.

Policies take minimal read models, not full entities — a completion check needs
to know what a participant was asked to do and whether they did it, not their
name or email.

Derive rather than store. A persisted progress counter and the participant list
are two representations of one fact, and they drift.

## Contracts

Core consumes canonical serialized values from `@lagda/contracts`; it never
declares a competing union. Where a canonical union is structurally inadequate,
document it and raise an open decision — never fork it locally.

Core is **backend-only**. The frontend consumes `@lagda/contracts`, never
`@lagda/core`.

## Messages

Domain messages name states and actions, not people or documents. An error
message is a poor place for an email address and tends to reach logs.
Tests assert on codes, not prose.
