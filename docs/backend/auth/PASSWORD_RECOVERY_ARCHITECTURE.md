# Password recovery architecture

BACKEND-22. Two operations, one credential domain.

## Why this credential is treated differently

A session token grants the access its owner already had. A verification code
proves someone can read a mailbox. A **password-reset token grants the account**
— to whoever holds it, with no password required.

That is why it is the shortest-lived credential in the system, single use,
stored only as a digest, in its own domain, and why a successful reset revokes
every existing session.

## Request flow

```
POST /auth/forgot-password  { email }
    |
    v
canonical email normalization        the SAME normalizer as registration/login
    |
    v
rate limits                          per IP and per normalized account
    |                                (unknown addresses are limited too)
    v
account lookup                       by normalized_email
    |
    +-- not found ------------------> 202 { accepted: true }   [no challenge]
    |
    v
BEGIN TRANSACTION
    supersede active challenges
    create challenge (digest, expiry)
    persist delivery intent          <-- inside, deliberately
COMMIT
    |
    v
202 { accepted: true }               identical to the not-found branch
```

The token is generated **before** the transaction. It is cheap, and a rolled
back transaction simply discards it — an unsent raw token is inert.

Delivery scheduling is **inside** the transaction. If it fails, the rotation
rolls back and the user keeps the link they already had. Scheduling after commit
would produce the worst available outcome: the previous link invalidated and the
replacement never sent, leaving a locked-out user with no recovery path at all.

## Reset flow

```
POST /auth/reset-password  { token, newPassword }
    |
    v
token SHAPE check                    43 chars, base64url; no digest, no query
    |
    v
password policy                      the registration policy, imported
    |
    v
digest -> indexed lookup             advisory read, outside any transaction
    |
    +-- dead --------------------> 422 INVALID_OR_EXPIRED_RESET_TOKEN
    |
    v
Argon2id hash                        OUTSIDE the transaction (~50ms)
    |
    v
BEGIN TRANSACTION
    consumeIfActive  <-- CONDITIONAL: the TOCTOU boundary
    |     |
    |     +-- 0 rows -----------> 422 (a concurrent request won)
    v
    replace password_hash            one column; cannot reach email_verified_at
    supersede other challenges
    revoke ALL sessions              reason = password-change
COMMIT
    |
    v
200 { passwordReset: true, nextAction: "sign-in" }
    + clear session and CSRF cookies
```

### The ordering is the design

Everything before the hash costs microseconds. The hash costs ~50ms of dedicated
CPU and 19MB of memory, by design. An endpoint that hashes before checking
anything is a one-request-per-core denial of service against an unauthenticated
route.

And the hash must not run **inside** a transaction: holding row locks for 50ms
per request is how a recovery endpoint takes the connection pool down.

The cost of hashing outside is that everything checked beforehand may have
become false. That is handled rather than assumed away — `consumeIfActive` is a
conditional UPDATE whose conditions PostgreSQL evaluates at write time. A
concurrent reset, a newer request that superseded the token, and plain expiry
during the hash all produce the same answer: zero rows matched.

## Eligibility

An **unverified** account may reset. A reset link proves possession of the
registered mailbox, which is exactly what verification asks for — refusing
protects nothing and strands a real user who registered, never verified, and has
now forgotten the password.

It does **not** follow that reset verifies the email. It does not. Such a user
resets, then still has to verify before login succeeds. Two account facts, kept
separate.

## What reset does not touch

Workspace memberships, roles, ownership, documents, signing requests, recipient
signing links, API keys, and `email_verified_at`. `replacePasswordHash` sets one
column, which is what makes that a property of the code rather than a promise.

## Delivery — BLOCKED

There is no notification infrastructure. `scheduleDelivery` is an optional
dependency; where it is absent the challenge is still created correctly and the
raw token is discarded. **A production user cannot currently receive a reset
link.** Unchanged since BACKEND-19. BACKEND-44/45.
