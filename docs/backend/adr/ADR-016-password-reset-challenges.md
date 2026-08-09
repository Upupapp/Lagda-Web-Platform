# ADR-016 — Password reset by opaque DB-backed challenge

**Status:** accepted (BACKEND-22)

## Context

Password recovery has to let someone who has lost access prove enough to replace
their password, without letting anyone else do the same. The credential is
handed to an email address and is, for its lifetime, equivalent to the account.

## Decision

An **opaque, cryptographically random, expiring, single-use, DB-backed reset
challenge**, stored only as a domain-separated digest, in its own table.

A successful reset atomically:

1. consumes the challenge (conditionally — this is the concurrency control),
2. replaces the password hash,
3. supersedes any other active challenge,
4. revokes every existing session.

Argon2id runs **outside** that transaction; the transaction revalidates.

## Alternatives

**A JWT reset link.** Stateless, and therefore not revocable and not
single-use without server state anyway — at which point the statelessness has
bought nothing and the token now carries account claims in a value the user
pastes into a URL bar. Rejected.

**A reusable reset token.** Simpler, and it means a link sitting in a mailbox
stays live after use. Anyone who later reads that mailbox owns the account.
Rejected.

**Reusing the email-verification challenge.** Same shape, one fewer table. It
requires a `purpose` discriminator that every query must filter on, and the
first query that forgets turns a code proving mailbox ownership into authority
to replace a password. The whole point of this feature is credential
separation; implementing it on shared storage undercuts that at the schema
level. Rejected.

**Storing the raw token.** Would let the reset email be resent verbatim. It also
means a database read is an account-takeover primitive for every pending reset.
Rejected.

## Consequences

- A duplicated table shape, accepted so that domain separation is enforced by
  the schema rather than by discipline.
- Reset challenge records accumulate. Retention is unresolved — OD-077.
- The one-active-challenge index makes the "supersede other challenges" step
  unreachable in practice. It is kept as defence in depth if the index is ever
  relaxed, and the test asserts the property rather than the mechanism.
