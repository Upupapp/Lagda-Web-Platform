# Idempotency Foundation Report — BACKEND-14

## 1. What was built

| Artifact | Location |
|---|---|
| Migration | `packages/db/src/migrations/005_idempotency.ts` |
| Ports, scope model, operations | `packages/application/src/common/ports/idempotency.ts` |
| Canonicalization | `packages/application/src/idempotency/canonical.ts` |
| Execution service | `packages/application/src/idempotency/service.ts` |
| PostgreSQL adapter | `packages/db/src/repositories/idempotency.ts` |
| Crypto adapters | `packages/api/src/security/crypto.ts` |
| Tests (33 + 20) | `packages/application/src/idempotency.test.ts`, `packages/db/src/idempotency.integration.test.ts` |

**No new dependency. No Redis.** `node:crypto` and the existing query layer.

## 2. The decision that shapes everything

The claim row is inserted **inside the business transaction**. Three problems
disappear rather than being solved:

- Concurrent duplicates serialize on the unique index.
- A rollback takes the claim with it — no poisoned key.
- A crash leaves nothing, because nothing committed — **no lease, no reclaim
  job, no recovery logic**.

§73 calls stale-claim recovery the hardest idempotency problem. This design does
not solve it; it arranges not to have it, for operations that fit one
transaction. Those that do not are catalogued as PLANNED rather than claimed.

## 3. What is deliberately not stored

**The raw key** — only a digest. Lookup works from the digest, so retaining a
client-supplied string has no purpose.

**The request body** — only a fingerprint. Detecting "same key, different
request" needs no plaintext. This is the largest privacy saving in the design:
the framework would otherwise duplicate every protected request payload.

Both absences are asserted against the live schema, not merely intended.

## 4. Gates

| Gate | Result |
|---|---|
| typecheck / lint / build | PASS |
| `npm test` | **390 passed** (was 357) |
| `npm run test:integration` | **131 passed** (was 111) |
| Migration from zero | PASS |
| Probes | **4/4 fire** |

The concurrency test holds one transaction open, starts a second on another
connection, and asserts the second blocks and then replays. Replacing
`ON CONFLICT` with check-then-insert fails five tests.

## 5. Risks

**R-1 — Authorization-before-replay is DOCUMENTED ONLY.** The most
security-relevant rule here, and the one the framework cannot enforce alone: a
feature route must resolve authorization before reaching the replay path. If
BACKEND-33 gets this wrong, a user who has lost workspace access could replay its
data.

**R-2 — No HTTP adapter.** Nothing reads `Idempotency-Key` yet, because no
protected product route exists. The contract and validator are ready; the wiring
is untested end to end.

**R-3 — Only single-transaction operations are covered.** Plan change and OTP
delivery need staged state.

**R-4 — A concurrent duplicate blocks.** Correct for short transactions, and a
reason long operations must not use this pattern. Unmeasured under contention.

**R-5 — Replay-body compatibility.** `version: 1` is stored and read, but no
version-2 parser exists to prove the mechanism works. It matters only when the
shape changes, within a 24-hour window.

**R-6 — External delivery is not exactly-once**, and nothing here claims it is.

## 6. BACKEND-15 handoff — Rate Limiting & Abuse Controls

**Ordering.** Rate limiting must run **before** idempotency and before the
business transaction. An attacker must not be able to open transactions or
reserve keys by flooding a protected endpoint.

```
rate limit → authenticate → CSRF → authorize → validate → idempotency → mutation
```

**A replay is still a request.** It costs a database read and must count against
limits. Exempting replays would turn the idempotency key into a rate-limit
bypass: send the same key repeatedly and pay nothing.

**Scopes must match the ones that exist.** IP for public and pre-auth endpoints;
user for authenticated ones; recipient plus signing request for signing access —
the same distinction the idempotency scope union already makes, for the same
reason.

**Client identity depends on proxy trust.** `TRUST_PROXY` defaults to trusting
nothing, so an IP-based limit today would bucket every request behind a proxy
together. BACKEND-11's default-deny is correct; BACKEND-65 must configure the
topology before IP limits mean anything, and BACKEND-15 must not silently rely on
an unconfigured value (OD-027).

**Metrics stay bounded.** `route`, `scopeType`, `result` — never the actor, the
IP or the key.

**Fingerprint conflicts are not attacks by default.** A spike may indicate a
buggy client. Metrics first; do not wire automatic blocking to it.

**Do not rate-limit `/health` or `/ready` into uselessness.** Orchestrator probes
are frequent by design.

**Readiness: READY.** The authenticated actor, the CSRF boundary and the
idempotency claim are all in place, each with a defined position in the request
pipeline. No blocker.
