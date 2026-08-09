# Login Data Classification — BACKEND-20

| Field | Classification | Stored | Logged | Returned |
|---|---|---|---|---|
| Password (plaintext) | **SECRET / EPHEMERAL** | **NEVER** | **NEVER** | **NEVER** |
| Password hash | **SENSITIVE** | `users.password_hash` | **NEVER** | **NEVER** |
| Session token (raw) | **SECRET / CREDENTIAL** | **NEVER** — digest only | **NEVER** | cookie only |
| Session token digest | **SENSITIVE** | yes | no | **NEVER** |
| CSRF token (raw) | **SECRET / CREDENTIAL** | **NEVER** — digest only | **NEVER** | cookie only |
| Session id | Internal identifier | yes | yes (safe) | **NEVER** |
| Dummy password hash | **SENSITIVE** | config/startup | **NEVER** | **NEVER** |
| Email (display) | **PII** | yes | avoid | yes, on success |
| Normalized email | **PII / internal identity** | yes | **no** | **NEVER** |
| User id | Internal identifier | yes | yes, after success | yes, on success |
| Rate-limit scope digest | Derived identifier | counter rows | yes | **NEVER** |

## The raw credentials

A session token and a CSRF token exist in memory for exactly as long as it takes
to write two `Set-Cookie` headers. They are never persisted in raw form — only
SHA-256 digests are — never serialized into JSON, and never logged.

Asserted with markers against captured logger output at `trace` level and the
response body.

## Failure responses carry nothing

An invalid-credentials response contains no user id, no display name, no email,
no verification state, no timestamp. That is not incidental: any of them would
confirm the account exists.

## Metrics

Bounded labels only: `result` (`success` / `invalid_credentials` /
`unverified` / `rate_limited` / `error`).

Never a label: email, normalized email, IP, user id, session id, scope digest.
All are unbounded.

Password-verify duration is a valuable numeric observation for Argon2 capacity
work. Password length is never recorded.
