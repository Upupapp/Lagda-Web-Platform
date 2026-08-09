# ADR-014 — Account identity and password hashing

**Status:** Accepted
**Date:** 2026-08-09
**Command:** BACKEND-19

## Context

LAGDA needs user accounts. The handoff specifies email verification for new
accounts, password reset by time-limited token, session cookies rather than
localStorage, and OAuth/OIDC as a *recommendation* for production — not a
requirement for now. The real frontend has a complete `/create-account` flow
collecting name, email, optional organization, optional intended use, a Terms
and Privacy consent checkbox, and a password with an 8-character minimum.

Everything downstream depends on two decisions: what identifies an account, and
how a credential is stored.

## Decision

**Normalized email as canonical identity, enforced unique by PostgreSQL, with
Argon2id password hashes and server-side email verification state.**

- Normalization is **trim + lowercase**, and nothing else.
- `users.normalized_email` carries a UNIQUE constraint.
- Passwords are hashed with Argon2id at RFC 9106's second recommended
  parameters, stored as one PHC-encoded string.
- A new account is **unverified**; `email_verified_at` is NULL until someone
  proves control of the mailbox.
- Registration issues **no session**.

## Alternatives considered

### Identity

**Raw, case-sensitive email.** Formally correct — RFC 5321 makes the local part
case-sensitive. Rejected: no mail provider distinguishes case in practice, users
type their own address inconsistently, and the result would be silent duplicate
accounts and failed logins. The formal correctness buys nothing real and costs a
support burden.

**Aggressive normalization** (Gmail dot-stripping, plus-address folding,
`googlemail.com` mapping). Rejected firmly: each rewrite can merge two mailboxes
that different servers treat as different people. In an authentication system
that is an account takeover primitive dressed as a convenience.

**A separate opaque login identifier.** Rejected: the product signs users in by
email, and inventing a second identifier would need its own recovery flow.

### Password hashing

**bcrypt.** Widely deployed and battle-tested. Rejected: not memory-hard, so GPU
cracking is cheap relative to Argon2id, and it **silently truncates at 72
bytes** — two different long passwords would authenticate one account, which is
a correctness bug and not merely a strength question.

**PBKDF2.** Available in Node's standard library with no dependency. Rejected:
cheap to parallelise on GPUs; its only real advantage is FIPS availability,
which LAGDA does not need.

**scrypt.** Also memory-hard and also in Node's standard library. A genuinely
reasonable choice. Rejected narrowly: Argon2id is the current RFC recommendation
for password storage and has clearer parameter guidance, and the dependency cost
is one well-maintained package.

**Argon2id.** Chosen.

**Passwordless / magic links only.** Rejected: the product has a password field,
a sign-in page, and a password reset flow in the handoff. Removing passwords
would be inventing product direction.

## Consequences

**Good**

- One identity rule that login, reset, verification and invitations can all
  reuse — which is what keeps them from disagreeing about who a user is.
- Duplicate accounts are impossible under concurrency, proven rather than
  assumed.
- Password parameters are explicit and floored, so a deployment cannot quietly
  weaken them.
- Raising Argon2 parameters later is non-breaking: `verify` reads them from the
  stored hash, and `needsRehash` marks old hashes for upgrade at login.

**Costs and constraints**

- **Argon2id is expensive on purpose** — tens of milliseconds and 19 MiB per
  hash. Registration must be rate limited before it, and capacity planning has
  to account for it (BACKEND-61).
- **A native dependency.** `argon2` compiles or downloads a prebuilt binary,
  which is a deployment consideration Node-only alternatives would not have.
- **Lowercasing is a deliberate deviation from RFC 5321.** Documented, not
  accidental.
- **`password_hash` is NOT NULL**, which assumes every account has a password. If
  SSO or passwordless identities arrive, that becomes nullable in an additive
  migration — deliberately not pre-loosened for a feature that does not exist.
- **Verification cannot happen yet.** The challenge is created; delivery is
  BACKEND-44/45. That is a real gap and is labelled as one.

## Revisit when

- OAuth/OIDC becomes a requirement rather than a recommendation, at which point
  `password_hash` nullability and a provider-identity table are needed.
- BACKEND-61 measures Argon2 cost under real concurrency.
- A breached-password check is wanted, which needs a data source and a privacy
  decision about how a hash prefix is queried.
