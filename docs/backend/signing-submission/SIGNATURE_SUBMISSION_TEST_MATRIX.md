# Signature submission — test matrix

68 assertions across three suites. Every status is the **actual** result of a
run.

| Suite | File | Count | Result |
|---|---|---|---|
| Use cases | `packages/application/src/signing-submission/signing-submission.test.ts` | 27 | PASS |
| Architecture | `tests/architecture/signing-submission.test.ts` | 27 | PASS |
| Integration (real PostgreSQL) | `packages/db/src/signing-submission.integration.test.ts` | 14 | PASS |

| Area | Case | Result |
|---|---|---|
| Access | valid recipient session | PASS |
| Access | expired session | PASS |
| Access | request no longer signable | PASS |
| Access | routing inactive | PASS |
| Field | assigned field accepted | PASS |
| Field | **other recipient's field** | PASS — use case AND database, independently |
| Field | cross-request field | PASS (integration, FK) |
| Field | unknown field id | PASS |
| Field | duplicate field in payload | PASS |
| Field | type mismatch | PASS |
| Required | all required present | PASS |
| Required | missing required ⇒ whole submission rejected | PASS — zero rows |
| Required | required checkbox false | PASS |
| Required | signature field with no adopted signature | PASS |
| Optional | omitted optional writes no row | PASS |
| Server-owned | `date-signed` from the submission instant | PASS |
| Server-owned | `full-name` and `email` from the snapshot | PASS |
| Server-owned | client value REJECTED, not ignored | PASS |
| Signature | TYPE accepted | PASS |
| Signature | DRAW accepted, server digest recorded | PASS |
| Signature | DRAW rejected by the validator ⇒ no submission | PASS |
| Signature | UPLOAD | **NOT APPLICABLE** — no upload path in the product |
| Signature | one representation shared by several fields | PASS |
| Signature | raster byte bound | PASS (integration, CHECK) |
| Signature | typed row carrying raster bytes | PASS (integration, CHECK) |
| Signature | two representations of one purpose | PASS (integration, unique) |
| Consent | revalidated at commit | PASS |
| CSRF | recipient CSRF required | PASS **BY CONSTRUCTION** — route calls the validator; no HTTP test |
| CSRF | user CSRF rejected | PASS **BY DERIVATION** — different digest domain |
| Idempotency | same key, same payload replays | PASS — same id, same `acceptedAt` |
| Idempotency | same key, different values ⇒ conflict | PASS — original value intact |
| Idempotency | array order does not conflict | PASS |
| Idempotency | lost response | PASS — this is the replay case |
| Idempotency | new key after acceptance ⇒ already submitted | PASS |
| Concurrency | same recipient, conflicting values | PASS — use case AND real PostgreSQL |
| Concurrency | different recipients of one request | PASS |
| Atomicity | failure ⇒ no partial values | PASS |
| Immutability | UPDATE denied | PASS — `permission denied`, not zero rows |
| Immutability | DELETE denied | PASS — all three tables |
| Immutability | second value for one field | PASS (integration, unique) |
| Timestamp | one backend instant for the act | PASS |
| Snapshot | contact mutation irrelevant | PASS |
| Snapshot | preparation mutation irrelevant | PASS |
| Workflow | no routing advancement | PASS |
| Workflow | no request completion | PASS |
| Workflow | no delivery intent | PASS |
| PDF | no mutation, no sealer | PASS (architecture) |
| Logging | no signature, value or PII in log payloads | PASS (architecture) |
| Metrics | bounded labels | PASS (architecture) |
| RLS | recipient sees only its own submission | PASS — 1 of 2 |
| RLS | policies restrictive | PASS — all three, `polpermissive = false` |
| RLS | no BYPASSRLS, not superuser | PASS |
| Migration | from zero | PASS — `lagda_zero8_test` |

## Not covered, and why

**No HTTP route suite**, for the fourth command running (33, 34, 35, 36). The
401, the 403 on a missing CSRF token, the 400 on a missing idempotency key and
the response headers are covered by reading the source and by the use case
underneath — not by a request. This is now the largest single testing gap in the
signing stack and deserves its own pass.

**No PNG validator unit suite.** `createSignatureImageValidator` is exercised
through the use case with a fake, and its own magic-byte, IHDR and bounds logic
is asserted only by reading the source (architecture). Real PNG fixtures — a
valid one, a truncated one, an SVG, an oversized header — would be cheap and are
missing. **Recorded as a genuine gap**, not as coverage.

**No storage-failure test**, because there is no storage call. NOT APPLICABLE
rather than absent.

## An observed flake

One full `test:integration` run reported 2 failures of 644 that the filtered
output did not name; the following run was green (595 passed, 49 skipped). The
same shape BACKEND-32 and BACKEND-35 each saw once, in a suite that runs
sequentially against one shared database. Recorded rather than dismissed.

## What each layer cannot prove

**The fakes** cannot prove a constraint. Every uniqueness and foreign-key claim
is in integration, as the runtime role.

**The architecture suite** greps source; two of its guards were narrowed during
the run, each with the reason recorded at the assertion — a grant assertion that
looked for a literal table name the loop never writes, and a `§193 forbidden
fields` guard that matched `acceptedAt` in the *response* schema, where it
legitimately belongs.

**The integration suite** is the only place the four-column assignment key is
exercised. Its most valuable assertion is the cross-recipient insert: R1's
session, R2's field, every application check bypassed — and PostgreSQL still
refuses the row.
