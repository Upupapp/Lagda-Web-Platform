# Test matrix — public verification

**Command:** BACKEND-42 · **Date:** 2026-08-11
**83 tests across four files**, all passing in the full gate (2291 total).

| File | Tests |
|---|---|
| `packages/application/src/verification/public-verification.test.ts` | 38 |
| `packages/api/src/verification/public-verification-routes.test.ts` | 23 |
| `packages/api/src/verification/verification-file.test.ts` | 13 |
| `packages/api/src/security/verification-id.test.ts` | 9 |

## Disclosure

| Property | How it is tested |
|---|---|
| No internal identifier in the response | Substring sweep over the **entire wire body** for 11 forbidden terms — a shape assertion misses a nested field |
| No overclaim | Substring sweep for `pades`, `x.509`, `pnpki`, `rfc 3161`, `timestamp authority`, `hsm`, `notarized`, `legally binding`, `identity verified` |
| Malformed ≡ unknown | Two responses asserted **byte-identical**, not merely both 404 |
| Not-completed ≡ unknown | Use case returns the same `not-found` member; the type has only two |
| No PII on the file-check path | The same sweep against that response |

## The oracle

| Property | How it is tested |
|---|---|
| A malformed reference never reaches the database | The lookup dependency is asserted **not to have been called** |
| A short suffix never resolves | The frontend's regex admits 4 characters; ours requires 10 — asserted rejected before lookup |
| Case is not normalized | Lowercasing would map two distinct references onto one |
| Surrounding whitespace is tolerated | A reference gets pasted out of a PDF |

## What the surface cannot do

| Property | How it is tested |
|---|---|
| No download route | `/document`, `/download`, `/certificate`, `/file` under the reference all 404 |
| No listing or search | `/public/verifications` and `?q=` both 404 |
| No mutating verb | PUT, PATCH, DELETE all 404; POST on the lookup route 404 |
| No cookie | `set-cookie` asserted undefined |
| Not cached | `cache-control: no-store` on both routes |
| No credential needed | The request that returns 200 here returns 401 on every other route |

## Hashing and the bound

| Property | How it is tested |
|---|---|
| Correct SHA-256 | Pinned to the **published vector** for `"abc"` — the same vector `@lagda/sealing`'s suite asserts, so both hashers are pinned to the standard rather than to each other |
| Chunk-boundary independence | Same bytes split three ways vs. whole; catches a hasher that resets per chunk or hashes only the first |
| Multi-megabyte correctness | Compared against an independently computed digest |
| Accepts exactly at 25 MB | 25 × 1 MB chunks succeed |
| Refuses over 25 MB | 26 × 1 MB rejects |
| **Stops reading** rather than draining | Endless stream; producer asked for fewer than 40 chunks |
| Does not trust a declared length | A stream declaring nothing is still bounded |
| Empty body refused | Would otherwise answer "no match" to someone who sent nothing |
| Broken upload leaks nothing | `ECONNRESET` and `/var/tmp` asserted absent from the error |
| No parse/persist surface exists | `Object.keys(module)` asserted to be exactly two names |

## Comparison semantics

| Property | How it is tested |
|---|---|
| Match on identical bytes | Fixture digest computed from the exact payload |
| **No match on one differing byte** | Final character case-flipped |
| A client-supplied digest is ignored | Correct digest in `X-SHA256`, wrong bytes → `matches: false` |
| A mismatch is a 200 | Status asserted 200, not 4xx |
| Reference resolved before hashing | Unknown reference + 1 KB body → 404 |

## The identifier

| Property | How it is tested |
|---|---|
| Matches the product's parser | Generated values tested against `VER_ID_RE` |
| Ten characters, always | The top of the permitted range, not the bottom |
| Alphabet excludes `0 O 1 I l _` | Measured over generated output, not asserted from the constant alone |
| No collisions in bulk | Large sample, all distinct |
| **Workspace not encoded** | Two ids from the same workspace share no suffix structure |

## Known gaps

- **The upload-succeeds / DB-fails window** (carried from BACKEND-41) remains
  code-complete but untested: the fake transaction manager cannot fail
  mid-transaction. Unchanged by this command.
- **No integration test against real PostgreSQL** for
  `PublicVerificationLookup`. The query is a single indexed read on the
  completion join, materially simpler than BACKEND-39's and BACKEND-40's
  certified-facts queries, both of which were proven against real PostgreSQL
  because they aggregate. Recorded as OD-169 rather than claimed as covered.
