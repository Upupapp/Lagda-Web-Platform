# Signing state test matrix

**Measured, not asserted.** `npm run check` = typecheck + lint + 1949 unit
tests. `npm run test:integration` = 597 passed, 49 skipped (they need S3).
Migration from zero verified on `lagda_zero37_test`.

| Area | Case | Result | Where |
|---|---|---|---|
| Recipient | `waiting -> active` | **PASS** | workflow-state.test.ts, signing-workflow.test.ts |
| Recipient | `active -> signed` | **PASS** | workflow-state.test.ts, signing-submission.test.ts |
| Recipient | `signedAt` comes from the submission | **PASS** | signing-submission.test.ts asserts equality with `submissions[0].acceptedAt` |
| Recipient | no SIGNED without a submission | **PASS** | workflow-state.test.ts (only `active` reaches it); migration CHECK; integration test |
| Recipient | `waiting -> signed` refused | **PASS** | workflow-state.test.ts, signing-workflow.test.ts |
| Recipient | duplicate processing | **PASS** | signing-workflow.test.ts "activates the next cohort EXACTLY ONCE" |
| Request | `sent` progression | **PASS** | signing-workflow.test.ts |
| Request | `partially-completed` | **PASS** | signing-workflow.test.ts |
| Request | `completion-ready` | **PASS** | signing-workflow.test.ts, signing-submission.test.ts |
| Request | never `completed` | **PASS** | workflow-state.test.ts over EVERY state x plan; architecture guard on source |
| Parallel | one signer completes, others stay active | **PASS** | signing-workflow.test.ts |
| Parallel | final signer completes | **PASS** | signing-workflow.test.ts |
| Parallel | concurrent final signers | **NOT AVAILABLE** | see the gap below |
| Sequential | first signer activates next | **PASS** | signing-workflow.test.ts |
| Sequential | cohort not complete -> no activation | **PASS** | signing-workflow.test.ts, workflow-state.test.ts |
| Sequential | cohort complete -> activates next | **PASS** | workflow-state.test.ts (A,B at 1; C at 2) |
| Sequential | next cohort exactly once | **PASS** | signing-workflow.test.ts (three advances, one grant) |
| Routing | access provisioning reuses BACKEND-33 | **PASS** | architecture guard: calls the shared function, mints nothing itself |
| Routing | provisioning failure recovery | **PASS** | intents stay outstanding; reconciler test |
| Routing | provider failure does not roll back | **PASS** | by construction — no provider is contacted; BACKEND-45 owns dispatch |
| Participants | CC / viewer does not block | **PASS** | workflow-state.test.ts, signing-workflow.test.ts |
| Participants | optional signer does not block | **PASS** | workflow-state.test.ts |
| Participants | zero required signers refused | **PASS** | workflow-state.test.ts |
| Events | view does not sign or advance | **PASS** | signing-access.test.ts |
| Events | auth does not sign or advance | **PASS** | signing-access.test.ts |
| Events | consent does not sign or advance | **PASS** | signing-ceremony.test.ts (unchanged, still green) |
| Consistency | accepted submission recovered | **PASS** | signing-workflow.test.ts "applies an advance nobody ever ran" |
| Consistency | no manual repair | **PASS** | the reconciler is the same code path as the ordinary advance |
| Consistency | a failing intent stops starving the queue | **PASS** | signing-workflow.test.ts |
| Terminal | decline blocks and revokes | **PASS** | signing-workflow.test.ts |
| Terminal | cancel blocks and revokes | **PASS** | signing-workflow.test.ts |
| Terminal | cancel refused at completion-ready | **PASS** | signing-workflow.test.ts |
| Terminal | terminal request advances nobody | **PASS** | signing-workflow.test.ts |
| Tenant | cross-workspace transition denied | **PASS (inherited)** | every repository is workspace-bound; tenancy.integration.test.ts unchanged |
| RLS | runtime role | **PASS** | the whole integration suite runs as `lagda_app` |
| DB | SIGNED with no submission refused | **PASS** | signing-request-send.integration.test.ts |
| DB | SIGNED naming another recipient's submission refused | **PASS** | same, via the four-column FK |
| DB | unknown recipient state refused | **PASS** | same |
| API | no generic state mutation | **PASS** | architecture guard over every route file |
| API | no client `signedAt` | **PASS** | architecture guard |
| PDF | no merge | **PASS** | architecture guard on imports |
| PDF | no DocumentSealer | **PASS** | architecture guard on imports |
| Logging | PII / signature hidden | **PASS** | architecture guard |
| Metrics | bounded labels | **PASS** | architecture guard (counts, not lists) |
| Migration | from zero | **PASS** | 24 migrations applied to a fresh `lagda_zero37_test`; schema probed for the CHECK, the columns, the policies and the grants |

## The gaps, named

**Concurrent final signers (§241) and same-cohort concurrency (§242) are NOT
proven against real PostgreSQL.** The conditional-UPDATE mechanism that makes
them safe is the same one BACKEND-33's `markSentIfDraft` uses and BACKEND-36's
uniqueness relies on, and the unit tests prove convergence — but a fake cannot
demonstrate that two transactions serialize, and this matrix does not claim it
did. This is the largest single testing gap the command leaves.

**No HTTP route suite**, for the fifth command running. The decline and cancel
use cases have no route yet; see `SIGNING_STATE_REPORT.md`.

**The `down` migration is not executed by a test.** `up` from zero is proven;
the reverse path is written and reviewed but only exercised by reading.
