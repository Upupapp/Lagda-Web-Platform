# Rate Limit Test Matrix — BACKEND-15

**34 application/API tests + 13 PostgreSQL integration tests.** Time is
controlled by an injected clock — no test waits for a window to elapse.

## Policy registry

| Case | Result |
|---|---|
| Registry validates | **PASS** |
| Every threshold cites the handoff | **PASS** |
| Thresholds match §317, §145, §583 exactly | **PASS** |
| Credential policies fail closed | **PASS** |
| Limit of 0 rejected | **PASS** |
| Unsourced threshold rejected | **PASS** |
| Unknown policy throws, does not skip | **PASS** |

## Counter semantics

| Case | Result |
|---|---|
| Exactly the limit allowed, next rejected | **PASS** |
| Remaining reported accurately | **PASS** |
| Next window resets | **PASS** |
| Rejected attempts keep counting | **PASS** |
| Different IPs independent | **PASS** |
| Different policies independent | **PASS** |
| Different users independent | **PASS** |
| **All policies must allow** | **PASS** |
| Scope/policy type mismatch refused | **PASS** |
| `Retry-After` rounded up | **PASS** |
| Window start deterministic | **PASS** |

## Failure modes

| Case | Result |
|---|---|
| Credential policy fails CLOSED on store failure | **PASS** |
| Volumetric policy fails OPEN | **PASS** |
| Store failure raises a dependency error, not a 429 | **PASS** |

## Scope digests

| Case | Result |
|---|---|
| IP and account digested | **PASS** |
| User and workspace kept plain | **PASS** |
| Raw value never present in the digest | **PASS** |
| Account case normalized | **PASS** |
| Scope types domain-separated | **PASS** |

## HTTP

| Case | Result |
|---|---|
| Canonical 429 with `Retry-After` | **PASS** |
| Current request ID in body and header | **PASS** |
| No policy, count or scope leaked | **PASS** |
| **CORS preflight not counted** | **PASS** |
| Health and readiness unlimited | **PASS** |
| **Spoofed forwarded header ignored when untrusted** | **PASS** |
| Forwarded IP honoured when a hop is trusted | **PASS** |
| Metric labels bounded, no identifiers | **PASS** |
| Log carries policy and route, never the address | **PASS** |

## Ordering

| Case | Result |
|---|---|
| **A rate-limited request never claims an idempotency key** | **PASS** |
| A replay is still counted | **PASS** |

## PostgreSQL

| Case | Result |
|---|---|
| Counts from one and increments | **PASS** |
| Windows, scopes, policies, scope types all independent | **PASS** |
| **Ten concurrent increments give ten distinct counts** | **PASS** |
| Count shared across independent repository instances | **PASS** |
| Negative count rejected | **PASS** |
| Unknown scope type rejected | **PASS** |
| Cleanup deletes only expired counters | **PASS** |
| Cleanup batch bounded | **PASS** |
| Stored key is a digest, not a raw value | **PASS** |
| No RLS, deliberately | **PASS** |
| Migration from zero | **PASS** |

## Probes — verified by breaking

| Violation | Result |
|---|---|
| Off-by-one (allow limit + 1) | **5 fail** |
| Fail open for every policy | 1 fails |
| Read `X-Forwarded-For` directly | 1 fails |
| Store the raw scope value | 3 fail |
| Non-atomic read-then-write counter | 1 fails (the concurrency test) |
| Baseline | 34 + 13 pass |

## Not covered

- **No production route is limited.** Eight policies are enforceable; none is
  wired, because no feature endpoint exists. The tests use test-only routes.
- **Anti-enumeration and no-permanent-lockout are untested** — they constrain
  BACKEND-20/22/23 and there is no auth endpoint to test them against.
- **No IPv6 canonicalization test.** `request.ip` returns whatever Node parsed;
  no normalization of equivalent IPv6 forms is performed, so two textual forms
  of one address would count separately. Recorded rather than assumed handled.
- **No load measurement** of the per-request upsert (BACKEND-61).
- **No edge/WAF interaction**, which does not exist (OD-040).
