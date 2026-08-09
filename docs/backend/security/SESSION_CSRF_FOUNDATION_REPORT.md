# Session & CSRF Foundation Report — BACKEND-13

## 1. What was built

| Artifact | Location |
|---|---|
| Session table | `packages/db/src/migrations/004_sessions.ts` |
| Ports and actor type | `packages/application/src/common/ports/session.ts` |
| Session service | `packages/application/src/security/session-service.ts` |
| PostgreSQL adapter | `packages/db/src/repositories/session.ts` |
| Crypto adapters | `packages/api/src/security/crypto.ts` |
| Cookie policy | `packages/api/src/security/cookies.ts` |
| Fastify plugins | `packages/api/src/security/session-plugin.ts` |
| Tests (45 + 16) | `packages/api/src/security.test.ts`, `packages/db/src/session.integration.test.ts` |

**One new dependency: `@fastify/cookie` 11.1.2.** No Redis, no JWT library, no
Passport, no CSRF plugin — the session-bound design does not match what the
common plugins assume, and a small reviewed implementation is clearer than
bending one to fit.

## 2. The handoff contradiction, resolved

Handoff §4 says the session "must include: userId, workspaceId, role,
permissions, plan" — and, in the same list, "must include all accessible
workspace IDs". Those cannot both describe one credential.

**Resolution:** §4 describes the **bootstrap response** after login, not the
cookie. The credential is user-scoped and opaque; the response carries the
workspace list and permissions, computed server-side per request from membership
and never trusted from the client. BACKEND-20/24 build that response.

`AuthenticatedActor` is therefore exactly `actorType`, `userId`, `sessionId` —
asserted by test, and the live schema is asserted to have no `workspace_id`
column.

## 3. Decisions taken, not deferred

**CSRF: session-bound synchronizer token.** A bare double-submit cookie verifies
only that a cookie and a header agree, and an attacker able to set a cookie
controls both.

**SHA-256, not Argon2.** Argon2 defends low-entropy passwords against offline
guessing; a 256-bit random token has no guessing attack, and a slow hash would
tax every authenticated request.

**Domain separation** on digests. Without it the readable CSRF token could be
submitted as a session cookie and match a stored session hash.

**PostgreSQL, not Redis** — behind a port, so it is revisitable on measured need.

## 4. OD-028 is not a blocker

I flagged it at the end of BACKEND-12 as blocking cookie attributes. **That was
wrong**, and checking rather than assuming is what showed it.

SameSite is evaluated per *site*, not per *origin*. `app.lagda.io` →
`api.lagda.io` is same-site, so `Lax` is correct under both candidate
deployments. The deployment question stays open for CORS and topology; it does
not block session security.

## 5. Defects found

### 5.1 The protection hook protected nothing

`requireSession` was written as a Fastify plugin and registered with
`scope.register(...)`. A plugin **not** wrapped in `fastify-plugin` gets its own
encapsulation context, so its `onRequest` hook applied only to routes declared
inside *it* — not to sibling routes in the parent scope.

**Every protected route answered 200 to an anonymous request.** It looked
correct and enforced nothing — precisely the decorative-security failure §120
warns about. Wrapping it in `fastify-plugin` would have been worse: the hook
would escape to the root and protect `/health` too.

Fixed by making it a plain function called on the scope. Caught by the tests, not
by review.

### 5.2 Getter-only decoration broke every request

`decorateRequest("auth", { getter })` made `request.auth = …` throw. Fixed with a
getter/setter pair over symbol-keyed per-request storage — a shared default value
would have been worse, giving concurrent requests one mutable object.

### 5.3 The sealer was intermittently non-deterministic

Unrelated to sessions, surfaced by a full-suite run. pdf-lib stamps a
modification date from the system clock on save, so BACKEND-09's determinism test
failed whenever two seals straddled a second boundary — an intermittent CI
failure, which is worse than a consistent one.

Fixed by pinning the modification date to the **supplied** `sealedAt`, which
removes a hidden clock read rather than papering over it.

### 5.4 An index test asserted a query plan

My own session index test read `EXPLAIN` output and asserted "no seq scan".
PostgreSQL prefers a sequential scan on a tiny table regardless of indexes, so it
failed on an empty test table for a reason unrelated to the property. Rewritten
to assert the indexes exist structurally.

### 5.5 Two architecture detectors were broader than their invariants

`createHash` was asserted to appear in exactly one file (document digesting);
session token digesting is a different domain. Widened to an explicit allowlist
of **two named files with stated domains**, so a third still fails.

The sealer's clock detector flagged `new Date(sealedAt)` — a *conversion* of a
supplied value, the opposite of a clock read. Narrowed to the argless `new
Date()`.

## 6. Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | **357 passed** (was 312) |
| `npm run build` | PASS |
| `npm run test:integration` | **111 passed** (was 95) |
| Migration from zero | PASS — 004 applies on a fresh database |

### Probes

| Violation introduced | Result |
|---|---|
| Skip CSRF validation entirely | 4 tests fail |
| Accept any well-formed CSRF token (not session-bound) | 4 fail |
| Store the raw token instead of a digest | **18 fail** |
| Drop `httpOnly` from the session cookie | 2 fail |
| Remove digest domain separation | 1 fails |
| Baseline | 45/45 pass |

## 7. Risks

**R-1 — No login exists, so rotation is never called.** The fixation defence is
implemented and tested but has no production caller until BACKEND-20. That is the
most important line of the auth handoff.

**R-2 — `user_id` has no foreign key.** The `users` table arrives with
BACKEND-19. Staged deliberately rather than inventing a fake user table.
BACKEND-19 must create `users` with `UNIQUE (user_id)` so the constraint becomes
a pure `ALTER TABLE`.

**R-3 — A stolen cookie is a working credential.** No control here prevents that,
and IP/user-agent binding was deliberately rejected as producing false logouts
while barely inconveniencing an attacker.

**R-4 — Cookie behaviour is verified structurally, not in a browser.**
`app.inject()` asserts what LAGDA sets, not what a browser does with it.
BACKEND-62/63 own real browser tests.

**R-5 — A database lookup on every authenticated request.** The accepted price of
immediate revocation. Unmeasured under load — BACKEND-61.

**R-6 — Authenticated GETs occasionally write.** `last_seen_at`, throttled to
once per five minutes. Technically a mutation on a safe method; harmless for CSRF
purposes but documented rather than hidden.

**R-7 — Origin and Fetch-Metadata checks are absent** (OD-036). The CSRF token is
the control; these would be defence in depth.

## 8. BACKEND-14 handoff — Idempotency Framework

**Available:** `request.auth` gives a resolved `AuthenticatedActor` before any
handler runs. `Idempotency-Key` is already in the CORS allowed-header list and
already treated as sensitive by the redactor.

**Requirements:**

1. **Key identity must include the authenticated actor.** A key scoped only to
   its own value lets one user replay another's operation. Compose
   `userId` + workspace + operation + key.
2. **Never treat a session token as a business key.** The session identifies
   *who*; an idempotency key identifies *which operation*. A rotated session must
   not orphan in-flight idempotent operations, so the key must not be derived
   from the credential.
3. **A request ID is not an idempotency key.** Request ID is new every attempt;
   an idempotency key is deliberately the same across retries. API_CONVENTIONS §9
   already states this.
4. **Do not log the full key** (§181). If correlation needs one, define a
   fingerprint convention — BACKEND-14 owns that decision, and BACKEND-12
   deliberately did not invent it.
5. **Reuse with different content must fail**, not silently return the first
   result (API_CONVENTIONS §9).
6. Conflicts map to the canonical `conflict` category → 409.

**Readiness: READY.** The authenticated actor boundary exists, is enforced
structurally, and is tested. No blocker.
