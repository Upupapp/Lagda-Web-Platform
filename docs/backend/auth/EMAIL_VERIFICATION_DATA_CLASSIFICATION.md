# Email Verification Data Classification — BACKEND-21

| Field | Classification | Stored | Logged | Returned |
|---|---|---|---|---|
| Verification code (raw) | **SECRET / EPHEMERAL** | **NEVER** | **NEVER** | **NEVER** |
| Full verification URL | **SECRET / EPHEMERAL** | **NEVER** | **NEVER** | **NEVER** |
| Code digest | **SENSITIVE** | yes | no | **NEVER** |
| Challenge id | Internal identifier | yes | yes (safe) | **NEVER** |
| User id | Internal identifier | yes | after the challenge resolves | **NEVER** |
| Email | **PII** | `users` | avoid; never on public resend failure | **NEVER** |
| `expires_at`, `created_at` | Operational | yes | yes | no |
| `consumed_at`, `superseded_at` | Account-security history | yes | yes | no |
| `email_verified_at` | **Account-security state** | yes | yes | no |

## The raw code

Exists in memory from generation until it is handed to delivery. It is never
written to any table, never placed in an error, never logged, and never returned
in a response — including the response to the person who just requested it.

Asserted with markers against captured logger output at `trace` level.

## Why the digest and not the code

A database read must not be able to verify anybody's account. Storing the code
would mean a leaked backup, a misconfigured replica or an over-broad query grants
verification for every pending user.

SHA-256 rather than Argon2id: 60 bits of uniform randomness has no guessing
attack for a slow hash to defend against, and redemption sits on a request path.

## Public failure logging

A resend for an unknown address must not log the address by default — routine
logging of arbitrary submitted emails turns the log into a list of addresses
someone probed.

After a challenge resolves, `userId` and `challengeId` are safe and preferable
to an email address.

## Metrics

Bounded labels only: `result`. Never user id, challenge id, email, IP or digest
— all unbounded.

## Not signing evidence

Email verification is **account-security history**, not eSignature evidence.
Nothing in this flow writes to `evidence_events`. That boundary matters: signing
evidence is append-only, legally significant and surfaced in public
verification. An email verification is none of those.
