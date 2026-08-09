# Logout Architecture — BACKEND-20

## The route

`POST /auth/sign-out` — from the handoff service map.

**POST, never GET.** A GET logout can be fired by an `<img>` tag on any page on
the internet, which makes signing users out a cross-site denial of service.
Asserted by a test that `GET /auth/sign-out` is a 404.

## Authenticated and CSRF-protected

Logout is an authenticated state mutation and carries the same CSRF requirement
as every other mutation (BACKEND-13). It is not exempted for convenience.

## Server-side revocation, not just a cookie

**Clearing the cookie alone is insufficient.** A credential that was copied —
by malware, by a shared machine, by a proxy log — still authenticates until the
server refuses it. Logout revokes the session row, and a revoked credential no
longer resolves, verified against real PostgreSQL (INV-257).

## Cookie clearing

Both cookies are cleared with the **same name, path and attributes** they were
written with. A mismatched Path leaves the original cookie in place, producing a
logout that appears to work and leaves the user signed in. Asserted by comparing
the Path of the set and cleared cookies.

## Repeated logout is safe

Two browser tabs, a retry after a dropped response, a stale cookie from a
session that already expired — none of these may be an error.

| Situation | Behaviour |
|---|---|
| Valid session | Revoke, clear cookies, **204** |
| No session at all | Clear cookies, **204** |
| Session already revoked | Revoke again (idempotent), clear, **204** |
| Revocation fails (database down) | Clear cookies, **503** |

## When revocation fails

The browser credential is cleared regardless — that is locally defensive and
costs nothing.

But the response is **503, not 204**. The session may still be valid to whoever
holds a copy of the token, and reporting success would hide a real security
event behind a green checkmark. The user's browser is clean; the server's state
is not, and the operator needs to know that.

## Telemetry

`auth.logout.succeeded` / `auth.logout.failed`, with `requestId` and `sessionId`.
Never the raw session token, never the cookie, never the CSRF token.

## Not implemented

**No "sign out of all devices".** The session repository supports
`revokeAllForUser`, and BACKEND-22 will need it when a password reset must
invalidate every session. Exposing it as a product feature is a UX decision
nobody has made.
