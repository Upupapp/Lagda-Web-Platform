# ADR-008 — Opaque server sessions in PostgreSQL, with session-bound CSRF

**Status:** Accepted · **Date:** 2026-08-09 · **Command:** BACKEND-13
**Related:** ADR-003 (PostgreSQL), OD-028, OD-033, OD-034

## Context

LAGDA is a browser application handling legally significant documents. Users
belong to several workspaces. The stack is Node and PostgreSQL, with no Redis.

Handoff §3 is explicit: "Session tokens must be HTTP-only secure cookies (not
localStorage)", "Session expiry: configurable; default 8 hours idle", "CSRF
protection required for all mutation endpoints".

Handoff §4 says the session "must include: userId, workspaceId, role,
permissions, plan" — and in the same list, "the session must include all
accessible workspace IDs". Those cannot both describe one credential. The
resolution: §4 describes the **bootstrap response** the frontend receives after
login, not what the cookie carries.

## Decision

**Opaque server-managed sessions, stored in PostgreSQL, transported by an
httpOnly cookie.** The database holds a SHA-256 digest; the raw token exists
only in the browser.

**The session identifies a user, never a workspace.**

**CSRF: session-bound synchronizer token**, delivered by a readable cookie and
submitted in `X-CSRF-Token`.

**No JWT. No Redis. No development auth bypass.**

## Alternatives considered

**JWT in localStorage.** Rejected outright — the handoff forbids it, and any XSS
reads it directly.

**Stateless JWT in a cookie.** Rejected. It cannot be revoked: a logout, a
password reset or a compromised account leaves every issued token valid until it
expires. For a product whose core action is legally binding, "we cannot end that
session for another 8 hours" is not acceptable. Short expiry plus refresh tokens
recreates server state while pretending not to. A JWT also invites embedding
roles and workspace claims — exactly the stale-authorization problem a
user-scoped session avoids.

**Server sessions in Redis.** Rejected for now. Redis is a second datastore to
operate, back up, secure and reason about during an outage, for a lookup
PostgreSQL serves from a unique index. The `SessionRepository` port means this
can be revisited on measured need rather than anticipation.

**Server sessions in PostgreSQL.** Chosen.

**Double-submit CSRF cookie.** Rejected as the primary mechanism. It verifies
only that a cookie and a header agree, and an attacker who can set a cookie —
subdomain XSS, cookie tossing, plain-HTTP injection — controls both. Binding to
the session removes that, and the readable cookie remains only a delivery
mechanism.

**Argon2 for session tokens.** Rejected. Argon2 is slow by design, to defend
low-entropy passwords against offline guessing. A 256-bit random token has no
guessing attack, and a slow hash on the session-lookup path taxes every
authenticated request for nothing. Argon2id arrives with passwords in
BACKEND-19.

## Consequences

**Accepted: a database lookup on every authenticated request.** That is the
price of immediate revocation, and it is the right trade for this product. It is
one indexed lookup on a narrow table.

**Accepted: `last_seen_at` makes authenticated GETs occasionally write.**
Throttled to once per five minutes, so not a write per request. Documented
because it is technically a mutation on a safe method.

**Accepted: cookie and CSRF handling is more complex than a bearer header.** The
frontend must send credentials and read a cookie. That complexity buys httpOnly.

**Enabled:** revoke-one, revoke-all, rotation and multi-device sessions all fall
out of a stored session.

**Enabled:** moving to Redis later changes one adapter behind an existing port.

## What would trigger revisiting this

- Measured session-lookup latency that matters at real traffic.
- A non-browser API client needing a different credential — which is a
  **separate** mechanism, not a reason to reopen browser auth.
- A requirement for offline-verifiable tokens across services.
