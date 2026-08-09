# Login and Session Report — BACKEND-20

## What was built

| Piece | Package |
|---|---|
| `loginUser` use case, anti-enumeration, rehash policy | `@lagda/application` |
| `POST /auth/sign-in`, `POST /auth/sign-out` | `@lagda/api/auth` |

**No new dependency. No migration.** Everything reuses BACKEND-13's session
service, BACKEND-15's policies, BACKEND-19's identity and hasher.

## Measured, not assumed

- **Routes** `/auth/sign-in`, `/auth/sign-out` — the handoff service map, not
  invented as `/auth/login`.
- **Fields** email + password only — `SignIn.tsx` collects exactly these, so no
  `rememberMe` was invented.
- **Unverified accounts are BLOCKED** — the frontend calls `platform.signIn`
  only for the `standard` scenario; the verification case navigates away
  establishing nothing. This resolves OD-066.

## Numbers

- **20 login unit + 36 route + 10 integration tests**
- **578 unit tests overall**, all passing; **241 integration**
- **12 probes**, 11 catching directly, the twelfth covered by probing the schema
  that structurally prevents it

## The cross-command test

A password hashed by **BACKEND-19's registration** authenticates through
**BACKEND-20's login**, against real PostgreSQL and real Argon2id. If the two
commands ever disagreed about hashing or identity, that test would say so.

## Defects found

**The session cookie's Max-Age was 1.7 trillion seconds.**
`sessionCookieOptions` takes max-age in SECONDS; the route passed the absolute
`expiresAt` timestamp. The browser would have kept the cookie for 50 000 years,
long after the server session expired or was revoked — presenting a dead
credential on every request forever.

**Two incompatible `UserId` brands.** BACKEND-19 declared its own instead of
using the one in `@lagda/contracts` that the session service takes, so the
account id from login could not be passed to `issue()` without a cast. Unified.

**A test insertion silently shrank the suite from 36 tests to 16.** An extra
closing brace closed the `describe` early. Caught by noticing the count, not by
a failure — the orphaned tests simply stopped running.

## What does NOT exist

- **No password recovery, MFA, OTP, social login or SSO.**
- **No "sign out of all devices"** — the repository supports it; exposing it is
  a UX decision.
- **No account lockout.** Temporary rate-limit cooldown only. Permanent lockout
  is weaponizable: anyone could lock any account by guessing at it.
- **No login-attempt ledger and no `failedLoginCount` column.** The rate limiter
  owns temporary attempt state.
- **No `lastLoginAt`.** Nothing in the product displays it, and it would add a
  write to every login.
- **No workspace data in the login response.** Session identity authenticates a
  user; it implies no workspace authorization.

## eNotary

Untouched. LAGDA eNotary is Coming Soon and Subject to Supreme Court
Accreditation and applicable rules.

## Reading order

1. **LOGIN_ARCHITECTURE.md** — flow, anti-enumeration, session issuance, CSRF
2. **LOGOUT_ARCHITECTURE.md** — revocation, repeated logout, failure behaviour
3. **LOGIN_DATA_CLASSIFICATION.md** — what may be stored, logged, returned
4. **LOGIN_TEST_MATRIX.md** — what is proven, and what is not
