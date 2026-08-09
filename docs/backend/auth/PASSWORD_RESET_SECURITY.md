# Password reset — threat model

Each threat, and the control that answers it.

| Threat | Control | Status |
|---|---|---|
| **Account enumeration** via forgot-password | One response shape, one status, one header set for every branch; the route discards the use case's telemetry reason so no future edit can branch on it | **ENFORCED** — probed |
| **Enumeration via the rate limiter** | The account-scope limiter keys on the normalized address and applies to unknown addresses too. "Unlimited vs limited" is itself an oracle | **DEFINED, NOT BOUND** |
| **Token guessing** | 256 bits from a CSPRNG. Rate limits are defence in depth and are explicitly not what makes the token safe | **ENFORCED** — probed by shortening to 4 bytes |
| **Credential-domain confusion** | `lagda.password-reset:` digest prefix, a separate table, and a separate TypeScript brand. A verification code cannot digest to a reset challenge | **ENFORCED** — probed; the probe initially caught nothing and the test was rewritten |
| **Token theft from the database** | Only the digest is stored. A database read yields no usable credential | **ENFORCED** — a test scans the row for the raw value |
| **Token leakage into logs** | The raw token never reaches a query, an error, or a response body | **ENFORCED** — response-body tests; no log statement in the path |
| **Reset-link takeover via Host header** | The link is built from a configured base URL. Never `Host`, never `X-Forwarded-Host`, never a client return URL | **ENFORCED** — probed |
| **Email security scanners burning the token** | The link is a GET to a frontend page that renders a form. Consumption requires POST with a new password | **ENFORCED** — GET on both endpoints is 404, asserted |
| **Reset-email bombing** | Per-account and per-IP limits, tighter than verification resend because the payload is more valuable | **DEFINED, NOT BOUND** |
| **Token replay after a lost response** | Single use. `consumeIfActive` refuses an already-consumed row | **ENFORCED** — probed |
| **Two requests, one token, two passwords** | Consumption happens FIRST, conditionally, inside the transaction. The loser cannot go on to overwrite the winner's password | **ENFORCED** — 4 concurrent resets; exactly one candidate verifies against the stored hash |
| **Concurrent reset requests** | Partial unique index `password_reset_one_active`. Five concurrent requests leave exactly one active challenge | **ENFORCED** — tested |
| **Session survival after reset** | Every session revoked, in the same transaction, reason `password-change` | **ENFORCED** — probed; a pre-reset session resolves as `rejected/revoked` afterwards |
| **Argon2 CPU exhaustion** | Token shape, password policy and the challenge lookup all precede the hash | **ENFORCED** — probed and order-asserted |
| **Open redirect after reset** | No `returnUrl` parameter exists. Nothing to validate | **ENFORCED** by absence |
| **Password logging** | The plaintext is hashed and discarded; no log statement in the path; response bodies asserted clean | **ENFORCED** |
| **Silent email verification** | `replacePasswordHash` sets one column | **ENFORCED** — probed by making it also set `email_verified_at` |

## Where an attacker still has room

**Timing.** The known-account path does strictly more work than the unknown one:
a supersede, an insert, and a delivery scheduling call. No artificial delay is
added. The structural controls — identical status, body and headers, and the
same limiter pipeline — are what the design relies on, and a determined attacker
with clean network timing could likely still distinguish the branches. This is
recorded rather than claimed away; §24 asks for no gross difference, not
constant time.

**Mailbox access.** Anyone who can read the mailbox can take the account. That is
inherent to email-based recovery and is why the token expires in an hour and why
successful reset kills every session.

**Nothing is bound.** The rate limits above exist as policy and are not attached
to a running application — see the report.
