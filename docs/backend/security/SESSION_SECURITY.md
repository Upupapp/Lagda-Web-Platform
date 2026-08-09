# Session Security — BACKEND-13

## 1. The model

Opaque, server-managed sessions in PostgreSQL, transported by an httpOnly
cookie. No JWT, no localStorage, no bearer token in the browser.

```
browser cookie          lagda_session = <43-char base64url token>
                                 │
                        SHA-256("lagda.session:" + token)
                                 │
PostgreSQL              user_sessions.token_hash
```

The raw token exists in exactly two places: the browser's cookie jar, and server
memory for the duration of one request. **It is never persisted.**

## 2. What a session is, and is not

A session answers **which user is this**. Nothing else.

It does not carry a workspace, a role, a permission set or a plan. The handoff
§4 lists those as things the session *response* must include — and the same
bullet says "the session must include all accessible workspace IDs", plural,
which is precisely why the credential cannot be bound to one. Workspace access
is membership, resolved per operation (BACKEND-27).

So `AuthenticatedActor` is exactly three fields: `actorType`, `userId`,
`sessionId`. A test asserts that key set, because a `workspaceId` appearing here
later would let a stale credential carry stale authorization.

## 3. Token generation

`randomBytes(32)` from `node:crypto` — **256 bits of entropy**, base64url
encoded to 43 characters.

Stated as entropy, not length: "43 characters" says nothing about guessability,
and a 43-character timestamp would be worthless. base64url is URL- and
cookie-safe with no padding to be mangled in transport.

Session and CSRF tokens are generated **independently**. Neither is derived from
the other — the CSRF token is readable by JavaScript by design, and deriving it
from the session secret would relate a public value to a private one.

## 4. Digesting — SHA-256, not Argon2

Argon2 is deliberately slow, to defend **low-entropy** secrets — passwords —
against offline guessing. A 256-bit random token has no guessing attack to
defend against, and a slow hash on the session-lookup path would add work to
every authenticated request for no security benefit. Argon2id arrives with
passwords in BACKEND-19.

**Domain separation.** Each token type is prefixed before hashing:
`lagda.session:` and `lagda.csrf:`. Without it, a session token and a CSRF token
that happened to be the same string would digest identically — and since the
CSRF token is readable by JavaScript, it could then be submitted as a session
cookie and match a stored session hash. A test asserts the two digests differ
for the same input.

## 5. Persistence

`user_sessions`, with a CHECK constraint requiring `^[a-f0-9]{64}$` on both hash
columns. That is a **tripwire**: a bug storing a raw base64url token would fail
the constraint rather than silently persisting a working credential. An
integration test attempts exactly that insert and asserts rejection.

**No `workspace_id` column**, and a test asserts its absence.

**No RLS**, deliberately — there is no tenant column to scope by, and
authentication happens before any workspace is known. Classified
`GLOBAL_AUTHENTICATION` in TENANCY_MODEL.md so tenancy tooling does not read it
as an omission. A test asserts `relrowsecurity` is false.

## 6. Expiration — two clocks

| | Source | Default |
|---|---|---|
| **Idle** | handoff §3, "default 8 hours idle" | 8 hours |
| **Absolute** | not specified — **OD-033** | 7 days, configurable |

Both are enforced. Idle expiry alone would let an attacker with a stolen cookie
keep it alive indefinitely by using it; absolute expiry alone would ignore the
sliding-expiry requirement.

Expiry is **derived from timestamps**, never written to a status column. Nothing
has to run for a session to expire — a background job that failed would
otherwise leave sessions valid past their deadline.

`last_seen_at` slides at most once per **5 minutes**. Writing it on every
request would turn a read path into a write path and put the database on the
critical path of every page load; minutes of precision is ample for an 8-hour
window. A test counts the writes.

A failed `touch` is swallowed — and only there. A missed bookkeeping write
shortens a session by minutes; failing the request would turn it into an outage.

## 7. Revocation

`revoked_at` plus a bounded `revocation_reason`: `logout`, `rotation`,
`password-change`, `security-action`, `account-disabled`.

An existing revocation is **never overwritten**. A session killed by a password
reset must not later read as an ordinary logout — that would rewrite security
history, and the difference is unrecoverable. A test asserts it.

`revokeAllForUser` supports password reset and security actions, scoped to one
user and counting only sessions that were still active.

## 8. Rotation — the fixation defence

`rotate()` creates a **new** session and revokes the old one, rather than
updating a row in place. The old credential stops working immediately, and the
revocation stays visible in security history.

BACKEND-20 must call this on successful login. A pre-authentication credential
is never simply marked authenticated — that is session fixation.

CSRF rotates with it: a new session gets a new CSRF token, and the old one no
longer validates. A test asserts that.

## 9. Multiple sessions

Multiple concurrent sessions per user are supported and expected — one per
device. No single-session policy, which would log a user out of their laptop
when they opened their phone.

Revoking one leaves the others active; a test asserts it.

## 10. Failure behaviour

**A repository failure propagates.** The resolver does not catch it, and the
plugin does not either. A database outage must produce a dependency error, not
a mass logout — an HTTP test asserts the response is not 401 and carries no
`ECONNREFUSED` or host detail.

**Malformed credentials are rejected before any I/O.** Empty, over-length or
non-base64url tokens fail structurally, so an unauthenticated caller cannot
force a digest and a database lookup with a megabyte cookie. A test asserts the
repository is never called.

**All rejection reasons collapse to one public 401.** `expired`, `revoked`,
`unknown` and `malformed` are distinguished internally for telemetry and are
indistinguishable to a client — otherwise the endpoint is an oracle for which
tokens exist.

## 11. Telemetry

`security_events_total{securityEvent="session_invalid", result=<reason>}`.
Reasons are a bounded set, so cardinality stays fixed.

The log context is enriched with `userId` after resolution. `sessionId` is
deliberately **not** logged — it is not a credential, but it is a durable handle
to one, and `userId` plus `requestId` already answers every operational
question.

Neither token can reach a log: BACKEND-12's deep redaction removes any key
matching `*token`/`*secret`, cookie headers are never serialized, and a test
asserts both raw values are absent from captured output.

## Password reset revokes everything (BACKEND-22)

A successful password reset calls `revokeAllForUser` with reason
`password-change`, **inside the same transaction** as the password replacement.
If revocation fails, the password does not change.

The threat is specific: an attacker who already holds a stolen session is
usually the reason the user is resetting. Changing the password while leaving
that session alive achieves nothing — the intruder keeps their access and the
user believes they have removed it.

No session is created afterwards. The product navigates to
`/sign-in?notice=password-reset`, so the user authenticates with the new
password and gets a fresh session through the normal path. The reset token never
becomes a session credential.

Both cookies are cleared on success. The sessions are already dead server-side,
so this is defence in depth — without it the browser keeps presenting a revoked
credential and the user sees a logged-in shell that 401s on contact. Any CSRF
token tied to a revoked session dies with it, and no new one is issued because
there is no session for one to protect.

Proven against real PostgreSQL: a session issued before a reset resolves as
`rejected` with reason `revoked` afterwards; one issued after is unaffected.

## MFA changes when a session is issued (BACKEND-23)

An account with a verified TOTP factor gets **no session from a correct password
alone**. `loginUser` returns `mfa-required` — a distinct outcome whose type has
nowhere to put credentials, so "a session exists before MFA completed" is not a
state the code can express.

Between the factors the browser holds a **pre-authentication credential**:

| | Session | Pre-auth |
|---|---|---|
| Cookie | `lagda_session` | `lagda_pre_auth` |
| Path | `/` | **`/auth`** |
| Life | 8 hours | **10 minutes, absolute** |
| Grants | the application | finishing one MFA ceremony |
| Storage | digest | digest |

Two names, not one with status-dependent meaning: overloading a single cookie
pushes "is this browser fully authenticated?" into every middleware that reads
it.

The `Path=/auth` scoping means browsers **do not transmit** the credential to
application routes at all — stronger than rejecting it on arrival, because a
value that never reaches a handler cannot be misread by one.

On success a **fresh** session is issued and the pre-auth credential is consumed
and cleared. It is never promoted — that would be session fixation with extra
steps.

Password reset revokes pending authentications as well as sessions: a ceremony
is a proof of the OLD password.

## Account-initiated session management (BACKEND-24)

A user may list their own sessions and revoke them from settings.

The projection is `sessionId`, `createdAt`, `lastSeenAt`, `expiresAt`,
`isCurrent` — no token, no digest, no IP, no user agent. Nothing else is
selected, so nothing else can be serialized.

Every operation is scoped by `user_id` **and** `session_id`. A revoke keyed on
the session alone would let anyone who learned an identifier sign another
account out. "Not found" covers both "no such session" and "not yours", so the
endpoint is not an oracle for which identifiers exist.

**Password change** revokes every session except the caller's own, with reason
`password-change`, and revokes pending MFA ceremonies. Preserving the current
session is deliberate: signing someone out of the browser they just used to
change their password teaches them the security action breaks things.

Revoking one's OWN session returns `signedOut: true` and clears both cookies,
so the browser stops presenting a dead credential.
