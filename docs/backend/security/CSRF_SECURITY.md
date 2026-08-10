# CSRF Security — BACKEND-13

## The strategy: session-bound synchronizer token

**Chosen, not left open.**

```
session created  →  random 256-bit CSRF token
                    ├─ digest stored in user_sessions.csrf_token_hash
                    └─ raw value in a READABLE cookie (lagda_csrf)

mutation         →  frontend reads the cookie, sends X-CSRF-Token
                    server digests it and compares to the SESSION's stored hash
```

## Why not plain double-submit

A bare double-submit cookie checks only that a cookie and a header agree. An
attacker able to set a cookie on the victim's browser — a subdomain XSS, a
network position on plain HTTP, a cookie-tossing bug — controls **both** halves,
and the check passes.

Binding the token to the session server-side removes that: a token that does not
match *this session's* stored digest fails, regardless of what an attacker can
write into a cookie. A test uses session A's cookie with session B's token and
asserts 403.

The readable cookie is only a **delivery mechanism**. It is not the authority;
the database is.

## Token properties

- 256 bits from `randomBytes(32)`, base64url, generated **independently** of the
  session token.
- Digested with domain separation (`lagda.csrf:`), so a CSRF token can never
  produce a digest matching a stored session hash.
- Compared **timing-safely** via `timingSafeEqual`. String `===` short-circuits
  at the first differing byte, leaking how much of a guess was correct.

## Names

| | Value |
|---|---|
| Header | `X-CSRF-Token` — the canonical name reserved in BACKEND-03 |
| Cookie | `lagda_csrf` — named so nobody mistakes it for the session |

A header sent **twice** arrives as an array and is refused rather than resolved
by picking one. A request supplying two different CSRF tokens is not one to
interpret charitably.

## What is protected

Every non-safe method inside the authenticated scope: `POST`, `PUT`, `PATCH`,
`DELETE`.

**Exempt:**

- `GET` and `HEAD` — because they must not change state. That is BACKEND-03's
  rule and the assumption this exemption rests on. A `GET /logout` would
  silently defeat the entire mechanism.
- `OPTIONS` — a CORS preflight carries no cookie and no CSRF token by
  definition. Requiring either would break every cross-origin request before it
  started. A test asserts preflight succeeds with neither.

## Rotation

The CSRF token is created **with** the session and dies with it. Session
rotation issues a new one, and the old stops validating immediately — a test
asserts a rotated session rejects the previous token.

There is no separate CSRF expiry. A token bound to a session cannot outlive it,
and an independent shorter lifetime would break long-lived tabs for no gain.

Multiple tabs work: the token is per-session, not per-request, so sibling tabs
share it and none invalidates the others.

## Ordering

```
cookie parsed → session resolved → CSRF validated → handler
```

Session first, deliberately. The token is checked against *the session's* stored
digest, so there is nothing to compare against until the session is known. An
anonymous request fails authentication (401) before CSRF is ever considered.

## Errors

| Situation | Status | Code |
|---|---|---|
| No session / invalid session | **401** | `auth_required` |
| Valid session, bad CSRF | **403** | `csrf_validation_failed` |

Kept distinct. Reporting a CSRF failure as 401 would send the frontend to a
re-login it does not need; reporting a missing session as 403 would hide that a
session simply expired.

**Neither the submitted nor the expected token appears in the response or the
log.** Logging the expected value would publish the secret the check exists to
protect. A test asserts both are absent from the body.

## CORS and SameSite are not substitutes

Three separate controls, and this is the most common confusion in the area:

- **CORS** governs who may *read* a response. A cross-origin `POST` is still
  **sent**; CORS only stops the attacker reading the reply.
- **SameSite=Lax** is a browser-side default, subject to browser support, and it
  does nothing against a same-site attacker.
- **CSRF tokens** are the actual control.

All three are in place. Only the third is load-bearing.

## Telemetry

`security_events_total{securityEvent="csrf_rejected"}` plus a structured warn
log carrying `event`, the normalized route **pattern**, method and result — no
token, no user-supplied content.

## Frontend handoff

Once login exists, the frontend must:

1. Send `credentials: "include"` on every API call.
2. Read `lagda_csrf` — a readable cookie, deliberately.
3. Send it as `X-CSRF-Token` on every `POST`/`PUT`/`PATCH`/`DELETE`.
4. Treat **401** as "session ended" → navigate to `/app/session-expired`, which
   already exists.
5. Treat **403 `csrf_validation_failed`** as "re-read the token and retry once",
   not as a permission error.

`X-CSRF-Token` is already in the CORS allowed-header list, so no CORS change is
needed when this is wired.

## Login and logout (BACKEND-20)

**Login (`POST /auth/sign-in`) — public, no session-bound CSRF token.**

A session-bound token cannot be required from a caller who has no session; that
is what logging in is for. Login CSRF is still a real attack - a forged login
authenticates a victim's browser as the ATTACKER'S account, who then observes
what the victim does in it - so three controls apply:

1. **SameSite=Lax** on the session cookie, so the forged login's cookie is not
   carried onward cross-site.
2. **Exact-origin CORS**, never `*`, so a scripted cross-origin login cannot
   read the response.
3. **A server-side Origin check** on the request itself. An ABSENT Origin is
   allowed, because browsers omit it on some same-origin requests and rejecting
   it would break legitimate logins; a PRESENT Origin not on the allowlist is
   refused before any credential work.

**Logout (`POST /auth/sign-out`) — authenticated, CSRF required.**

A state-changing authenticated mutation, protected exactly like every other one.
POST only: a GET logout can be fired by an image tag on any page on the
internet. The CSRF plugin is attached at composition; the route is written to be
protected by it.

Successful logout revokes the session, which invalidates the CSRF state bound to
it - a CSRF token whose session no longer resolves cannot validate anything.

## Recipient CSRF (BACKEND-34)

The recipient realm runs the same double-submit pattern with **its own
credential, its own digest domain, and its own cookie**. Nothing is shared with
the workspace realm — not the secret, not the derivation, not the name.

| | Workspace | Recipient |
|---|---|---|
| Cookie | `lagda_csrf` | `lagda_signing_csrf` |
| Digest domain | `lagda.csrf` | `lagda.recipient-signing-csrf` |
| Stored on | `user_sessions.csrf_token_digest` | `recipient_signing_sessions.csrf_token_digest` |
| Validator | the authenticated hook | `validateRecipientCsrf` |

**Independently drawn, not derived.** The session token and the CSRF token are
two separate `randomBytes(32)` calls under two domains. Deriving one from the
other would make a double-submit check whose two halves share a secret — the
attacker who can compute one can compute the other, which is the entire thing
the pattern is supposed to prevent. A database CHECK refuses a row whose two
digests are equal, so the mistake cannot be made later either.

**A workspace CSRF token cannot satisfy a recipient check** and vice versa: the
domains differ, so the digests differ, so the comparison fails. There is no
shared code path through which to write a direct test — recorded as BY
CONSTRUCTION in the test matrix rather than claimed as tested.

**Built and not yet enforced.** No recipient endpoint mutates anything, so
nothing calls the validator in production code today. Three unit tests cover it:
own token accepted, another session's token refused, and the session token
offered as its own CSRF token refused.

**BACKEND-35's first state-changing recipient route must call
`validateRecipientCsrf`.** A recipient session cookie is sent on cross-site form
posts under `Lax` for top-level navigations, and the ceremony is precisely where
a forged consent or signature would be worth forging.
