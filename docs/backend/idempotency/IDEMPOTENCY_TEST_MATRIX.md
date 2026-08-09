# Idempotency Test Matrix — BACKEND-14

**33 application tests + 20 PostgreSQL integration tests.** The concurrency
tests use genuinely independent transactions on separate connections — a
single-threaded fake proves nothing about a race.

## Keys

| Case | Result |
|---|---|
| Valid UUID and base64url accepted | **PASS** |
| Missing key rejected | **PASS** |
| Too-short key rejected | **PASS** |
| Oversized key (>255) rejected | **PASS** |
| Newline / CR / space / control characters rejected | **PASS** |
| Error message never echoes the key | **PASS** |
| Raw key never persisted | **PASS** — the column does not exist |
| Raw key rejected by the digest CHECK | **PASS** |

## Canonicalization

| Case | Result |
|---|---|
| Property insertion order irrelevant | **PASS** |
| Stable at depth | **PASS** |
| Different values differ | **PASS** |
| **Array order preserved** | **PASS** |
| Explicit `null` ≠ absent key | **PASS** |
| `1` and `1.0` identical | **PASS** |
| Number ≠ its string form | **PASS** |
| `undefined` rejected | **PASS** |
| `NaN` / `Infinity` rejected | **PASS** |
| `BigInt` rejected | **PASS** |
| `Date` rejected | **PASS** |
| Function rejected | **PASS** |
| Cyclic object rejected, does not hang | **PASS** |
| Error names the offending path | **PASS** |
| Known SHA-256 vector | **PASS** |

## Scope

| Case | Result |
|---|---|
| Same key, different workspace → independent | **PASS** |
| Same key, different scope type → independent | **PASS** |
| Same key, different operation → independent | **PASS** |
| Recipient scope distinguishes signing requests | **PASS** |
| **Workspace B cannot find workspace A's record** | **PASS** |

## Execution

| Case | Result |
|---|---|
| Fresh claim executes and completes | **PASS** |
| **Completed record replays without executing** | **PASS** |
| Fingerprint conflict neither executes nor replays | **PASS** |
| In-progress reported without executing | **PASS** |
| Business failure propagates, record not completed | **PASS** |
| Oversized result rejected (64 KiB) | **PASS** |
| Non-serializable result rejected | **PASS** |
| Implausible status rejected | **PASS** |
| Key-order variation fingerprints identically | **PASS** |
| Key and request digests domain-separated | **PASS** |

## Concurrency (real PostgreSQL)

| Case | Result |
|---|---|
| **Two simultaneous claims → exactly one executes** | **PASS** |
| Second observes the completed record and replays | **PASS** |
| **Rollback frees the key** | **PASS** |
| Mutation + completion commit together | **PASS** |
| Failure rolls back BOTH the mutation and the claim | **PASS** |

## Expiry and cleanup

| Case | Result |
|---|---|
| Expired record reclaimed in place | **PASS** |
| Reclaim clears stale replay data | **PASS** |
| Unexpired record not reclaimable | **PASS** |
| Cleanup deletes only expired rows | **PASS** |
| Cleanup batch bounded | **PASS** |

## Schema

| Case | Result |
|---|---|
| Completed record without a result rejected | **PASS** |
| Implausible status rejected at the database | **PASS** |
| No request-body or raw-key column exists | **PASS** |
| No RLS, deliberately | **PASS** |
| Migration from zero | **PASS** |

## Probes — verified by breaking

| Violation | Result |
|---|---|
| Execute even when already completed | 1 fails |
| Sort array elements in canonicalization | 1 fails |
| Drop the type prefix from scope keys | 1 fails |
| Replace `ON CONFLICT` with check-then-insert | **5 fail** |
| Baseline | 33 + 20 pass |

## Not covered

- **No HTTP adapter test.** No route reads `Idempotency-Key`, because no
  protected product route exists to attach it to. The header contract and the
  validator exist; wiring is the first feature command's work.
- **Authorization-before-replay is untested**, because it needs a feature route.
  It is the most security-relevant rule here and is DOCUMENTED ONLY.
- **No multi-process test.** Two independent transactions on one database are
  what two API instances look like to PostgreSQL; launching two servers would
  add nothing.
- **No staged/external-provider path.** Plan change and OTP delivery are
  catalogued as PLANNED.
