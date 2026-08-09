# Session & CSRF Test Matrix — BACKEND-13

**45 API/application tests + 16 PostgreSQL integration tests.** Every
security-critical row was verified by deliberately breaking it.

## Tokens

| Test | Result |
|---|---|
| 256-bit entropy, base64url format | **PASS** |
| Distinct on every call | **PASS** |
| Session and CSRF generated independently | **PASS** |
| Digest deterministic, lowercase hex | **PASS** |
| **Domain separation** between session and CSRF digests | **PASS** |
| Timing-safe comparison, correct results | **PASS** |
| **Raw token never persisted** | **PASS** |
| Raw token rejected by the DB CHECK constraint | **PASS** |

## Session lifecycle

| Test | Result |
|---|---|
| Valid token resolves to an actor | **PASS** |
| Actor carries no workspace | **PASS** |
| Unknown token rejected | **PASS** |
| Malformed token rejected **without a DB lookup** | **PASS** |
| Absolute expiry enforced | **PASS** |
| **Idle expiry** enforced (8h, handoff §3) | **PASS** |
| Revoked session rejected | **PASS** |
| **DB failure propagates, not 401** | **PASS** |
| Rotation issues a fresh credential | **PASS** |
| Rotation invalidates the old credential | **PASS** |
| Multiple concurrent sessions per user | **PASS** |
| Revoke-all for one user only | **PASS** |
| Existing revocation not overwritten | **PASS** |
| last_seen_at throttled, not per request | **PASS** |

## Cookies

| Test | Result |
|---|---|
| HttpOnly on the session cookie | **PASS** |
| Secure by default | **PASS** |
| **Production start fails without Secure** | **PASS** |
| HttpOnly never relaxed, even in development | **PASS** |
| SameSite=Lax | **PASS** |
| Host-only (no Domain attribute) | **PASS** |
| CSRF cookie readable, same transport rules | **PASS** |
| Clearing scope matches creation scope | **PASS** |
| Unknown SameSite value rejected | **PASS** |
| Idle longer than absolute lifetime rejected | **PASS** |

## Route protection

| Test | Result |
|---|---|
| Anonymous request → 401 | **PASS** |
| Invalid cookie → 401 | **PASS** |
| Expired, revoked and unknown are indistinguishable | **PASS** |
| Valid session admits and exposes the actor | **PASS** |
| DB failure → not 401, no driver detail | **PASS** |
| Health and readiness remain public | **PASS** |
| Unrelated cookie ignored | **PASS** |
| Correct cookie selected among several | **PASS** |

## CSRF

| Test | Result |
|---|---|
| Valid token accepted | **PASS** |
| Missing token → 403 | **PASS** |
| Wrong token → 403 | **PASS** |
| **Cross-session token → 403** | **PASS** |
| Rotated session rejects the old token | **PASS** |
| GET exempt | **PASS** |
| OPTIONS preflight exempt, with credentials | **PASS** |
| Neither submitted nor expected token echoed | **PASS** |

## Leakage

| Test | Result |
|---|---|
| Session token absent from logs | **PASS** |
| CSRF token absent from logs | **PASS** |
| Token hash absent from the actor | **PASS** |
| No token in any response body | **PASS** |

## Persistence (real PostgreSQL)

| Test | Result |
|---|---|
| Round-trip | **PASS** |
| Unknown digest returns null | **PASS** |
| Duplicate digest rejected | **PASS** |
| Revocation requires a reason | **PASS** |
| Unknown revocation reason rejected | **PASS** |
| Sessions independent per device | **PASS** |
| Revoke-all scoped to one user | **PASS** |
| Runtime role has SELECT/INSERT/UPDATE/DELETE | **PASS** |
| **No RLS, deliberately** | **PASS** |
| **No workspace column** | **PASS** |
| Indexes exist for lookup, revoke-all and cleanup | **PASS** |
| Migration from zero | **PASS** |

## Probes

| Violation | Result |
|---|---|
| Skip CSRF validation | 4 fail |
| CSRF not session-bound | 4 fail |
| Store the raw token | **18 fail** |
| Drop HttpOnly | 2 fail |
| Remove domain separation | 1 fails |
| Baseline | 45/45 pass |

## Not covered

- **Real browser cookie semantics.** `app.inject()` asserts what LAGDA sets, not
  what a browser does with it — cross-site behaviour, `__Host-` prefixes,
  partitioned cookies. BACKEND-62/63.
- **Login, logout and registration.** No product endpoint exists; the protected
  routes here are registered by the test.
- **Concurrent rotation races.** Rotation is not on any request path yet.
- **Session-lookup latency under load.** BACKEND-61.
