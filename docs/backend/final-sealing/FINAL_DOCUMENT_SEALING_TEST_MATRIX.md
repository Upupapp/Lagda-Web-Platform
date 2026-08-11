# Final document sealing — test matrix

**Command:** BACKEND-41 · **Measured 2026-08-11**

Results are what the suites actually assert. Where a row is narrower than its
name suggests, the scope is stated rather than rounded up.

| Area | Case | Result | Where |
|---|---|---|---|
| Eligibility | request is COMPLETION_READY | **PASS** | refuses `sent` before sealing |
| Input | FIELD_MERGE succeeded | **PASS** | refuses, sealer not called |
| Input | CERTIFICATE succeeded | **PASS** | refuses, sealer not called |
| Input | same CompletionRun | **PASS** | resolved by identity from the run's step rows |
| Input | merged digest valid | **PASS** | mismatch refused, nothing uploaded |
| Input | certificate digest valid | **PASS** | mismatch refused, nothing uploaded |
| Input | newer artifact NOT picked up | **PASS** | a later merged-candidate is ignored |
| Composition | certificate appended last | **PASS** | 2 + 1 pages → 3 |
| Composition | pages really copied | **PASS** | positive control: 3-page certificate → 5 |
| Composition | not appended twice | **PASS** | two seals from one input both give 3 |
| Composition | bad certificate refused | **PASS** | not-a-PDF, empty, zero-page |
| Seal | canonical DocumentSealer called | **PASS** | both inputs handed over |
| Seal | exactly one business caller | **PASS** | repository audit |
| Seal | scheme / version / digest algorithm | **PASS** | `hash-evidence` / 1 / sha-256 |
| Seal | no PAdES/PKI/TSA claim | **PASS (structural)** | none implemented; nothing references them |
| Seal | empty output refused | **PASS** | before upload |
| Output | new final ArtifactId | **PASS** | kind `sealed` |
| Output | source unchanged | **PASS** | byte-identical before/after |
| Output | merged unchanged | **PASS** | as above |
| Output | certificate unchanged | **PASS** | as above |
| Output | exact SHA-256 recorded | **PASS** | from the seal result |
| Output | size server-observed | **PASS** | from the bytes |
| Integrity | original hash is the SOURCE digest | **PASS** | the §0 trap, with an explicit not-equal assertion |
| Completion | record written | **PASS** | one row |
| Completion | one per request | **PASS** | three runs → one row, one sealed artifact |
| Completion | COMPLETION_READY → COMPLETED | **PASS** | state and `completed_at` set |
| Completion | completedAt ≠ signedAt | **PASS** | fixture signs a full day earlier |
| Completion | no early completion | **PASS** | upload failure, seal failure, empty output, and ordering |
| Verification | one VerificationId | **PASS** | returned by the step |
| Verification | non-secret identity | **PASS (structural)** | stored plainly, authorizes nothing |
| Retry | existing completion reused | **PASS** | sealer not called on the second run |
| Retry | duplicate worker | **PASS** | three runs, one completion |
| Storage | upload failure | **PASS** | request stays completion-ready |
| Storage | upload success / DB fail | **PARTIAL** | the code path returns `database-unavailable` and writes nothing; **not exercised by a test** — the fake transaction manager has no injectable mid-transaction failure |
| Recovery | response lost after completion | **PASS** | second run returns `already-completed` |
| Integrity | completed request missing object | **NOT APPLICABLE** | no code path exists from `completed` to any other state; asserted by absence, not by test |
| State | no signing after completion | **PASS** | allow-list check, asserted independently of revocation |
| State | no routing after completion | **PASS (structural)** | the step performs no activation |
| State | credentials revoked | **PASS** | grants and sessions gone after finalization |
| Tenant | cross-workspace input denied | **PASS (inherited)** | workspace-scoped repositories + RLS |
| RLS | runtime worker role | **PASS (inherited)** | no new grant, scope or role introduced |
| Boundary | no completion email | **PASS (structural)** | no notification code |
| Boundary | no public verification endpoint | **PASS (structural)** | no route added |
| Logging | sensitive content hidden | **PASS (structural)** | bounded failure codes only |
| Metrics | bounded labels | **N/A** | no final-seal metric added; §197 is optional and nothing consumes one |
| Migration | from zero | **PASS** | fresh database, constraints verified |
| Migration | reverse | **PASS** | reverses clean when empty; **refuses** when completions exist |

## Scope notes, stated rather than rounded up

**"PASS (structural)"** means the property is guaranteed by a type, an
allow-list or the absence of a code path rather than by an executed assertion —
for example, no notification test exists because no notification code exists.
Stronger than a runtime check, but a different kind of evidence.

**The upload-success/DB-failure window is PARTIAL and I have not claimed
otherwise.** The code returns `database-unavailable`, writes no completion and
leaves the object as a reconciliation candidate — but the fake transaction
manager offers no way to fail *inside* the finalization transaction, so no test
drives it. Proving it needs either an injectable failure in the fake or a real
PostgreSQL integration test. It is the largest untested path in this command.

**"Completed request missing object"** is not applicable rather than passing:
there is no code path from `completed` to anything else, so there is nothing to
assert against. The guarantee is the absence itself, plus the missing
UPDATE/DELETE grant and migration 028's refusing `down`.
