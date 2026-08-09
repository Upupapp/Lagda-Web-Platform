# Email Verification Test Matrix — BACKEND-21

**21 integration tests (real PostgreSQL) + 50 auth route tests.**

## Verify

| Case | Result |
|---|---|
| Fresh registration verifies; challenge consumed | **PASS** |
| Code accepted however a human retypes it (case, spacing, `O`/`0`, `I`/`1`) | **PASS** |
| Only a digest is stored, never the code | **PASS** |
| Unknown code rejected | **PASS** |
| Malformed code rejected without a query | **PASS** |
| **Expired code rejected, never reactivated** | **PASS** |
| **Superseded code rejected** | **PASS** |
| Repeat submission → already-verified, timestamp unchanged | **PASS** |
| **8 concurrent redemptions → exactly ONE verification** | **PASS** |
| `consumeIfActive` refuses terminal or expired challenges | **PASS** |
| `markEmailVerifiedIfUnverified` never moves an existing timestamp | **PASS** |
| Digest is domain-separated from a bare hash | **PASS** |
| Database refuses consumed + superseded together | **PASS** |
| Verification issues NO session | **PASS** |

## Resend

| Case | Result |
|---|---|
| Rotates: new code works, old one does not | **PASS** |
| Repeated resends leave exactly one active challenge | **PASS** |
| **Concurrent resends cannot leave two live codes** | **PASS** |
| **Failed delivery leaves the previous code usable** | **PASS** |
| Unknown address creates nothing | **PASS** |
| Already-verified account creates nothing | **PASS** |
| Resolves the address through the canonical normalizer | **PASS** |

## API

| Case | Result |
|---|---|
| Verify returns a stable `nextAction` | **PASS** |
| Already-verified is a success, not a failure | **PASS** |
| **Every failure collapses into one public code** | **PASS** |
| No account data in any response | **PASS** |
| Unknown fields rejected (both routes) | **PASS** |
| **GET does not verify** | **PASS** |
| **Resend response identical for unknown / verified / unverified** | **PASS** |
| Rotation happens only for an eligible unverified account | **PASS** |
| Never claims an email was sent | **PASS** |
| Response schemas are closed | **PASS** |
| Code absent from trace-level logs | **PASS** |

## Cross-feature

| Case | Result |
|---|---|
| **register → login BLOCKED → verify → login SUCCEEDS** | **PASS** |
| Link built from configuration, not a Host header | **PASS** |
| Codes unique and well-formed across 50 issues | **PASS** |

## Probes — guarantees verified by breaking them

| Violation | Tests failing |
|---|---|
| Accept an expired code | **1** |
| Accept a superseded code | **1** |
| Consume without the active conditions | **1** |
| Overwrite an existing verified timestamp | **1** |
| Resend without superseding the old code | **5** |
| Resend for an already-verified account | **2** |
| Leak the resend telemetry reason | **1** |
| Expose the exact verification failure reason | **1** |
| Shorten the code to 6 characters | **2** |
| Drop the digest domain prefix | **1** |
| Open the resend request schema | **1** |
| Baseline | **0** |

Three initially caught nothing — see the report. Each was a real control masked
by a redundant application check, and each now has a direct test.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `npm test` | **PASS — 575** |
| `npm run test:integration` | **PASS — 262** |
| `npm run check` | **PASS** |
| Migration from zero | **PASS — 9 migrations** |

## Not covered

- **No delivery test** — no notification infrastructure exists.
- **No rate-limit binding on these routes.** The policies exist; attaching the
  limiter is composition work, and neither route is wired into `createApp`.
- **No frontend integration** — the frontend still uses its mock auth service.
- **No timing-equivalence measurement** on resend. The response contract is
  identical; micro-timing is not asserted, because a flaky test is worse than an
  honest gap.
- **No challenge cleanup test** — no retention policy exists to test.
