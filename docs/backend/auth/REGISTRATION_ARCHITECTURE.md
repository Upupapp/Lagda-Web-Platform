# Registration Architecture — BACKEND-19

## The flow

```
POST /auth/register
  → schema validation        strict, closed, unknown fields rejected
  → IP + account rate limit  onRequest hooks, BEFORE the handler
  → normalize email          the canonical identity rule
  → password policy          length only, cheap and deterministic
  → duplicate pre-check      behaviour, not the guarantee
  → HASH password            Argon2id — the expensive step
  → ONE transaction          user + verification challenge
  → 201, nextAction: verify-email
```

## Two orderings that are load-bearing

**Rate limit before Argon2id.** Hashing is memory-hard by design — tens of
milliseconds and 19 MiB per attempt. Unlimited, that is a denial-of-service
primitive handed to anonymous callers. The limiter is an `onRequest` hook, so it
runs before the handler; proven by a test that observes the hasher was never
called on a rate-limited request (INV-234).

**Hash outside the transaction.** Holding a database connection and its locks
for the duration of a deliberately slow operation is how a registration spike
becomes a database outage. Hashing completes, then a short transaction opens.
Both orderings are asserted by test and both are probed.

## Contract

Measured from the real frontend (`CreateAccount.tsx`, `CreateAccountRequest`),
not invented:

**Request** — `POST /auth/register`, public, `multipart` not used:

| Field | Required | Notes |
|---|---|---|
| `email` | yes | ≤ 254 chars |
| `password` | yes | 8–1024, never altered |
| `name` | yes | ≥ 2 chars |
| `organization` | no | onboarding context |
| `intendedUse` | no | onboarding context |
| `consent` | yes | must be exactly `true` |

`additionalProperties: false`. A body carrying `role`, `isAdmin`,
`emailVerified`, `userId`, `createdAt` or `accountStatus` is **rejected**, and
the use case maps fields explicitly — never a spread of the request body
(INV-245).

**This depends on `removeAdditional: false`**, which `createApp` sets. Fastify's
default AJV *strips* unknown properties instead of rejecting them. A handler-level
guard was written and then deleted: by the time the handler runs, a stripping app
has already removed the field, so `Object.keys(body)` cannot see it. It read as
defence in depth while being incapable of firing — worse than no guard, because
it invites trusting it. Both behaviours are now measured by tests.

**Response** — `201`:

```json
{ "userId": "...", "email": "New.User@Example.com",
  "emailVerified": false, "nextAction": "verify-email" }
```

Closed schema. No password hash, no normalized email, no verification token, no
digest, no session credential. `nextAction` is a stable field rather than prose
the frontend would have to parse.

## Session behaviour: NO AUTO-LOGIN

**Registration creates no session and sets no cookie.**

Measured, not assumed: `CreateAccount.tsx` sets the user to
`authStatus: "email-verification-required"` and navigates to
`/verify-email?returnTo=/onboarding/profile`. Issuing a session would
authenticate a mailbox nobody has proven control of.

Because there is no session, there is no session-bound CSRF token to require —
BACKEND-13's CSRF is session-bound by construction. What defends this route is
the CORS allowlist (exact origins, never `*`), Origin validation, and the rate
limits. Recorded rather than silently skipped.

## Duplicate registration: 409, and it says so

`409 EMAIL_ALREADY_REGISTERED`.

A deliberate decision. At signup the user has already asserted this address is
theirs, so telling them an account exists reveals nothing they did not just
claim — and hiding it produces the far worse experience of a "successful"
registration that can never be logged into.

**This sets no precedent for login or password reset.** Those are approached by
someone who may not own the address, and BACKEND-20/22 must make their own
anti-enumeration decisions.

**An existing account is never modified.** The repository has no update path at
all, so a second registration cannot replace a password — the account takeover
this must not have. Proven: the original credential still verifies afterwards
and the attacker's does not.

## Duplicate races

The application pre-check exists only to avoid spending Argon2 work on an email
that is already taken. **The database unique constraint is the guarantee** — two
concurrent registrations both pass the pre-check. Six simultaneous registrations
for one address produce exactly one row, tested against real PostgreSQL.

A `23505` on `users_normalized_email_key` is translated to
`EmailAlreadyRegisteredError`, so no PostgreSQL constraint text or attempted
address reaches a caller or a log.

## Transaction

One transaction, two writes: the user row and the email verification challenge.

A user with no challenge could never verify their email; a challenge with no
user references nothing. Both or neither (INV-240), proven by forcing the
challenge insert to fail and asserting no user row survives.

Nothing else is inside it. No hashing, no HTTP, no email.

## Email verification

A new account is **always unverified** — `email_verified_at` is `NULL`, and
nothing in this path can set it. Verification is never implied by successful
registration (INV-241).

Registration creates the challenge:

- **32 bytes of CSPRNG output**, base64url, so it is safe in a URL;
- stored as a **SHA-256 digest** with its own domain prefix, never the raw token
  (INV-237) — the same rule sessions follow;
- domain-separated from session and CSRF tokens, so a token minted for one
  purpose can never be presented as another (INV-239);
- expiry set explicitly, never a permanent bearer link;
- `consumed_at` left null — only BACKEND-21 redeems a challenge.

The verification URL is built from **configured** base URL, never an incoming
`Host` header. A link built from an attacker-supplied Host would send the user's
token to an attacker's domain (INV-244).

## Delivery is NOT implemented

The raw token is returned from the use case for a delivery component, and there
is no delivery component: notification infrastructure is BACKEND-44/45. When no
deliverer is wired the raw token is **discarded**.

The consequence is stated plainly: **a registered account cannot currently be
verified.** The response never claims an email was sent — it returns
`nextAction: "verify-email"`, which is what the client should do, not what LAGDA
did. Asserted by a test that the response contains no "sent" claim.

The raw token is deliberately **not** parked in a generic queue payload or a
durable outbox row in the meantime. That would put a one-time credential into
general-purpose storage with weaker handling than the account it protects, which
is the workaround this command was told not to invent.

## Layering

| Concern | Lives in |
|---|---|
| Identity rule, policy, orchestration | `@lagda/application` |
| Argon2id, token generation | `@lagda/api/security` |
| Users, challenges | `@lagda/db` |
| HTTP contract | `@lagda/api/auth` |

The route hashes nothing, queries nothing and enqueues nothing — it maps fields
and calls one use case. The application layer names no library.

## Not implemented

No login, no logout, no password reset, no MFA, no OTP, no workspace creation,
no invitation acceptance, no profile editing.
