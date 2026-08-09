# BACKEND-22 — Password recovery report

## Routes

| Method | Path | Auth | Success | Failures |
|---|---|---|---|---|
| POST | `/auth/forgot-password` | public | **202** `{ accepted: true }` | never 404; 400 on schema violation |
| POST | `/auth/reset-password` | public, token-authorized | **200** `{ passwordReset, nextAction: "sign-in" }` | 422 `INVALID_OR_EXPIRED_RESET_TOKEN`, 422 `INVALID_PASSWORD`, 400 on schema violation |

Both bodies are closed schemas. Forgot-password takes `email` only.
Reset takes `token` and `newPassword` only — no `userId`, no `email`, no
`role`, no `emailVerified`. The token resolves the account, and accepting a
second identity claim alongside it is how account confusion starts.

## Challenge table

`password_reset_challenges` — a **separate** table, not a shared challenge
table and not a generic `tokens` table.

A shared table would need a `purpose` discriminator that every query must
remember to filter on. The day one query forgets, a verification code becomes a
reset credential. Two tables make that unwriteable rather than merely
discouraged.

| Column | Notes |
|---|---|
| `challenge_id` | PK |
| `user_id` | FK → `users`, `on delete cascade` |
| `token_digest` | unique; `^[a-f0-9]{64}$`; never the raw token |
| `created_at`, `expires_at` | `expires_at > created_at` |
| `consumed_at` | evidence of use; the row is not deleted |
| `superseded_at` | rotation, or retirement after a successful reset |

Constraints: `password_reset_single_terminal` (never both terminal states);
partial unique index `password_reset_one_active` on `(user_id)` where neither
terminal column is set.

`grant select, insert, update`; **DELETE revoked**.

## Token

43-character base64url, 32 bytes, CSPRNG. Digested with the
`lagda.password-reset:` domain prefix and stored as SHA-256 hex.

A **link** token rather than a typed code, because the product's
`ResetPassword.tsx` is reached by URL and shows a password form — there is no
token input anywhere on it. Nobody types this, so it is sized for security
rather than legibility.

**Lifetime: 1 hour**, against 24 hours for a verification code and 8 for a
session. This is the highest-value credential in the system and gets the least
time; an hour is enough to open an email and not much more.

## Anti-enumeration

Unknown address, known account, and any ineligible account produce the same
status, body and header set. The route discards the use case's telemetry reason.

## Rate limits — DEFINED, NOT BOUND

| Policy | Scope | Limit | Window |
|---|---|---|---|
| `auth.reset.request.account` | account | 3 | 15 min |
| `auth.reset.request.ip` | IP | 10 | 15 min |
| `auth.reset.submit.ip` | IP | 10 | 1 min |

Tighter per-account than verification resend, because a reset link grants the
account rather than proving an address.

Like login, registration and verification before it, **neither route is wired
into `createApp`**, so no limiter is attached in a running application.

## Session revocation

**Revoke all**, reason `password-change`, in the same transaction as the
password replacement. If revocation fails, the password does not change.

The threat this exists for is an attacker who already holds a stolen session and
is the reason the user is resetting. Changing the password while leaving that
session alive achieves nothing.

**No auto-login.** The product navigates to `/sign-in?notice=password-reset` on
success, so the backend issues no session and no CSRF token. Both cookies are
cleared as defence in depth — the sessions are already dead server-side, but a
browser that keeps presenting them shows a logged-in shell that 401s on contact.

## Email verification interaction

**Unchanged.** Reset never writes `email_verified_at`.

## Delivery — BLOCKED

No notification infrastructure exists. The lifecycle is complete and proven; a
production user still cannot receive a link. BACKEND-44/45.

## Verification

| Gate | Result |
|---|---|
| typecheck | **PASS** |
| lint | **PASS** |
| build | **PASS** |
| unit tests | **PASS** — 594 |
| `npm run check` | **PASS** |
| integration | **PASS** — 296, nothing skipped |
| migration from zero | **PASS** — 10 migrations on a fresh database |
| probes | **17 of 17 catch** |

## Honest gaps

**Delivery is blocked.** Unchanged since BACKEND-19.

**Nothing is composed.** No auth route is registered in `createApp`, so rate
limiters and CSRF plugins are not bound anywhere they run.

**The supersede-others sweep is unreachable.** `resetPassword` calls
`supersedeActiveForUser` after consuming, to satisfy §72. It can never match a
row, because `password_reset_one_active` already makes a second active challenge
impossible to insert — an attempt to force one for a test was rejected by the
index. The test therefore asserts the property §72 wants (no active challenge
remains after a reset) rather than the mechanism. If the index is ever relaxed,
the sweep is what keeps that true and the test is what notices.

**Domain separation had no real test until probed.** The first version compared
the digest function to itself and then checked that a garbage value found no
row. It passed with the domain prefix deleted. It now asserts the actual
property against a bare SHA-256 and against the verification digest.

**Timing is structurally equal, not constant.** See PASSWORD_RESET_SECURITY.md.
