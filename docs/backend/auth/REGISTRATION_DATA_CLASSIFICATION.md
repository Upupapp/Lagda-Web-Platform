# Registration Data Classification — BACKEND-19

| Field | Classification | Stored | Logged | Returned |
|---|---|---|---|---|
| Password (plaintext) | **SECRET / EPHEMERAL** | **NEVER** | **NEVER** | **NEVER** |
| Password hash | **SENSITIVE** | yes, `users.password_hash` | **NEVER** | **NEVER** |
| Verification token (raw) | **SECRET / EPHEMERAL** | **NEVER** | **NEVER** | **NEVER** |
| Verification token digest | **SENSITIVE** | yes | no | **NEVER** |
| Email (display) | **PII** | yes, `users.email` | avoid | yes |
| Normalized email | **PII / internal identity** | yes, unique key | avoid | **no** |
| Display name | **PII** | yes | avoid | no |
| Organization | PII-adjacent | yes, nullable | no | no |
| Intended use | Low sensitivity | yes, nullable | no | no |
| User ID | Internal identifier | yes | yes | yes |
| Terms version + accepted at | Legal record | yes | yes | no |
| Registration IP | **PII** | **not stored** | per BACKEND-12 policy | no |
| User agent | **PII-adjacent** | **not stored** | per BACKEND-12 policy | no |

## Plaintext password

Exists for the length of one request. It is read from the validated body, checked
for length, handed to the hasher, and dropped. It is never written to a database,
never placed in an error, and never logged (INV-233).

Tested with the marker `DO_NOT_LOG_REGISTRATION_PASSWORD` against logger output
captured at `trace` level, the response body, and every column of the stored row.

## Verification token

The raw token is a **bearer credential**: whoever holds it can verify the
account. Only its SHA-256 digest is stored, with its own domain prefix, so a
database read cannot verify anybody's account (INV-237).

The raw value leaves the use case for delivery and goes nowhere else. Today
nothing consumes it, so it is discarded — see REGISTRATION_ARCHITECTURE.md.

It is deliberately NOT parked in a queue payload or an outbox row: a one-time
credential in general-purpose storage has weaker handling than the account it
protects.

## Email

PII. LAGDA stores two forms, which serve different purposes and must not drift:
the display form the user typed, and the normalized lookup key.

**Avoid logging raw email.** After account creation, prefer the user id. Before
creation there is no id, so a registration attempt is correlated by request id
alone rather than by address. The rate limiter uses a DIGESTED account scope
(BACKEND-15), which is a different representation from the normalized email and
must not be confused with it.

## Registration IP and user agent

**Not persisted.** The product has not asked for them, and account-security
history is BACKEND-24's question. They may be observed in operational logs under
BACKEND-12's existing policy. No device fingerprint is constructed.

## Terms acceptance

`terms_version` and `terms_accepted_at`, both server-authoritative. A bare
`termsAccepted: true` would be worthless the day the documents change: it records
that someone agreed to something without recording what.

The registration checkbox reads "I agree to LAGDA's Terms of Service and Privacy
Policy." The Privacy Policy is acknowledged, not consented to in the legal sense
— LAGDA does not claim consent as a lawful basis here, and no field asserts one.

## Metrics

Safe labels: `result` only. Never workspace, user, email, IP or digest — all
unbounded, and an unbounded label is how a metrics backend falls over.

Password hash duration is a useful numeric observation for capacity. Password
LENGTH is never recorded, as a label or otherwise.
