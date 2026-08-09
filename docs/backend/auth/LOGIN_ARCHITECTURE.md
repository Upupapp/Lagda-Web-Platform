# Login Architecture — BACKEND-20

## The flow

```
POST /auth/sign-in
  → strict schema           closed, unknown fields rejected
  → ORIGIN check            login-CSRF defence
  → rate limit              IP + account, BEFORE Argon2
  → normalize email         the SAME rule registration used
  → account lookup          by normalized identity, global
  → VERIFY password         Argon2id — always, even for unknown accounts
  → eligibility             email must be verified
  → issue a FRESH session   BACKEND-13
  → Set-Cookie x2           session (HttpOnly) + CSRF (readable)
  → 200
```

## Anti-enumeration

An unknown email and a wrong password must be indistinguishable from outside.
Four things make that true, and all four are required:

**One public error.** `401 INVALID_CREDENTIALS` for both. No `EMAIL_NOT_FOUND`,
no `PASSWORD_INCORRECT`. The responses are compared byte-for-byte in a test.

**No metadata on failure.** No user id, no display name, no created-at, no
verification state. Asserted by scanning the serialized failure for every field
the account holds.

**The dummy hash.** An unknown account still runs a real Argon2id verification
against a fixed hash that authenticates nobody, so an unknown account costs
roughly what a known one costs. Returning early would turn response time into an
account-existence oracle (INV-250).

The dummy hash is derived **once at startup** from a random secret nobody keeps.
Per-request generation would double the work and defeat the purpose. It is not a
credential — no account references it — but it is not logged either.

**A malformed email takes the same path.** Returning early on a bad address
would make "is this even a valid address" measurable, and would create a second
exit for a credential failure.

## Verification is checked AFTER the password

Deliberate ordering. Checking first would let anyone learn whether an address is
verified without knowing its password.

Because the check runs only after a correct password, responding specifically
with `403 EMAIL_VERIFICATION_REQUIRED` is safe: the caller has already
demonstrated control of the credential, so it reveals nothing they could not
already confirm. A wrong password never produces that response (INV-251).

## Unverified accounts: LOGIN BLOCKED

**MEASURED from the real frontend.** `SignIn.tsx` calls `platform.signIn(...)`
— the call that establishes an authenticated session — only in the `standard`
case. The `email-verification` case navigates to `/verify-email` and establishes
nothing.

So: correct password + unverified email produces **no session**, and a distinct
response the client routes to verification. This resolves OD-066.

## Rate limiting before Argon2id

`auth.signin.ip` (5/min) and `auth.signin.account` (5/min), both from handoff
§317, both fail-closed. They run as `onRequest` hooks, before the handler and
therefore before any hashing.

Unknown accounts consume the same buckets as real ones — an unlimited
nonexistent-account path would be both a free Argon2 DoS and an enumeration
channel.

## Session issuance

**Always a fresh credential.** Never derived from an incoming cookie.

Session fixation is the attack this prevents: an attacker plants a session
cookie in a victim's browser and waits for them to log in. If login adopted that
credential, the attacker would then hold an authenticated session. Tested by
sending a planted cookie and asserting the issued token is new and different
(INV-253).

Cookies are written only after the session row exists. A cookie for a session
that does not exist would authenticate nothing.

**Multiple sessions are allowed.** Signing in on a phone does not sign out a
laptop, and revoking one leaves the other active — both verified against real
PostgreSQL.

## Cookies

| | Session | CSRF |
|---|---|---|
| HttpOnly | **yes** | **no**, by design |
| Secure | yes (production) | yes |
| SameSite | Lax | Lax |
| Path | `/` | `/` |
| Domain | host-only | host-only |

The asymmetry is deliberate: the session cookie must be unreadable to
JavaScript, while the CSRF token has to be readable so the client can echo it in
a header.

`Max-Age` is in **seconds**. Passing the absolute `expiresAt` timestamp set it
to roughly 1.7 trillion seconds — a cookie outliving its session by 50 000
years, so a revoked session would keep being presented forever. Caught by test.

## Login-CSRF

Login CSRF is a real attack, not a non-issue because the route is public: an
attacker who makes a victim's browser log in as the **attacker's** account can
then observe what the victim does inside it.

A session-bound CSRF token cannot be required — the caller has no session yet.
The defences are:

- **SameSite=Lax**, so a cross-site forged login's cookie is not sent onward;
- **exact-origin CORS**, never `*`, so a scripted cross-origin login cannot read
  the response;
- **an Origin check on the request**, enforced by LAGDA rather than the browser.

An absent `Origin` is allowed — browsers omit it on some same-origin requests,
and rejecting it would break legitimate logins. What is rejected is an Origin
that is present and not on the allowlist, which is exactly the forged shape.

## Rehash on login

If the stored hash used weaker parameters than current policy, it is upgraded
after a **successful** verification — the only moment the plaintext is available
again.

- Never on a failed login.
- Outside any transaction.
- **Never fatal**: a login that failed because a housekeeping upgrade could not
  be written would be a worse outcome than a hash staying at older parameters
  for one more login.

## Responses

| Outcome | Status | Code |
|---|---|---|
| Success | 200 | — |
| Unknown account **or** wrong password | **401** | `INVALID_CREDENTIALS` |
| Correct password, unverified email | 403 | `EMAIL_VERIFICATION_REQUIRED` |
| Cross-site origin | 403 | `FORBIDDEN_ORIGIN` |
| Rate limited | 429 | (BACKEND-15 envelope) |
| Session persistence failed | 5xx | no cookie set |

The success body carries `userId`, `email`, `displayName`, `emailVerified`.
No token, no hash, no normalized email, no session id.

## Not idempotent

Login is deliberately **not** wrapped in BACKEND-14's idempotency replay
framework. Each successful login must mint a fresh session; replaying a stored
response would replay a session credential, which is the opposite of what a
credential-issuing endpoint should do.

## No JWT, no refresh token, no localStorage

The browser credential is an opaque server-managed session cookie. Nothing here
returns an access token, a refresh token, or any value a script is expected to
store.

## Verification unblocks login (BACKEND-21)

BACKEND-20 refuses an unverified account after a correct password. BACKEND-21
completes the loop: redeeming a verification code sets `email_verified_at`, and
the same credentials then authenticate.

Proven end to end against real PostgreSQL:

```
register → login BLOCKED (403 EMAIL_VERIFICATION_REQUIRED)
         → verify        (POST /auth/verify-email)
         → login SUCCEEDS
```

Verification issues **no session**. The user signs in afterwards, which is what
the frontend does. Verification state is read from the account on every login,
so it is never a stale cookie claim.
