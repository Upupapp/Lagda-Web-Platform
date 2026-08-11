# BACKEND-38 report — the completion pipeline foundation

**Migration:** 025 · **Date:** 2026-08-11 · **Scope:** orchestration foundation.
This run deliberately stops short of the worker and the `completed` guard.

## What was built

```
contracts/src/completion/index.ts   run states, steps, failure codes + classification,
                                    pipeline version
core/src/completion/index.ts        eligibility, run state machine, step order,
                                    failure classification. Pure
db/src/migrations/025_*.ts          runs, step ledger, authoritative completions,
                                    constraints, grants, RLS
```

No new dependency. No PDF library. No sealer adapter. No worker registration.

## The finding that shaped the command

**The step ledger the spec describes cannot exist in this architecture, and the
spec's own §288 says so.**

§70 asks for `FIELD_MERGE`, `CERTIFICATE`, `FINAL_SEAL` as separately durable,
separately retryable steps. `DocumentSealer.seal()` is one operation that
produces the sealed document *and* the certificate together — by design, since
BACKEND-09, with `mergeFields` and `renderCertificate` as private collaborators
so a future remote signer has one call site to reproduce rather than twenty.

§24 forbids bypassing it, INV-002 exists to enforce it, and
`REMOTE_SIGNER_MIGRATION.md` rejected a second seam by name. §288 resolves the
tension explicitly: *"BACKEND-38 may not create a second sealing architecture."*

The schema had already made the same call: `artifact_type` admits `original`,
`sealed` and `completion-certificate`, and no merged-candidate type — so LAGDA
has never modelled an intermediate merged PDF as a persisted artifact.

**Steps are therefore `seal` → `persist` → `finalize`**, and BACKEND-39/40
refine the inside of `@lagda/sealing` rather than owning ledger steps. This was
put to the owner as an explicit decision before any code was written.

## What the product settled

There is **no completion processing UI anywhere**. No "Finalizing", no
"Preparing your document", no failure copy, no retry control, no certificate
download; the recipient's last screen tells them to "Contact the sender directly
if you require a copy". Zero matches across every status map, model and page.

So the request stays `completion-ready` for the whole pipeline and **no
`COMPLETING` request state was invented** (§19). The `CompletionRun` carries
processing state, and a projection can derive "finalizing" the day a screen
exists for it.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass — 0 errors, 0 warnings |
| `npm test` | **1978 passed** (+29) |
| `npm run build` | Pass |
| Migration from zero | Verified — `lagda_zero38_test`, 25 migrations |
| Schema probes | run/step/completion uniqueness, grants, RLS policies, and the request CHECK all confirmed by query |

Probed and confirmed:

```
RUN_UNIQUE:          UNIQUE (workspace_id, signing_request_id)
STEP_UNIQUE:         UNIQUE (completion_run_id, step)
COMPLETION_PK:       PRIMARY KEY (workspace_id, signing_request_id)
COMPLETIONS_GRANTS:  INSERT,SELECT          -- no UPDATE. Immutable by privilege
RUNS_GRANTS:         INSERT,SELECT,UPDATE
POLICIES:            tenant_isolation(PERMISSIVE) + recipient_realm_denied(RESTRICTIVE)
                     on all three
REQUEST_STATE:       draft, sent, partially-completed, completion-ready,
                     declined, cancelled     -- `completed` deliberately absent
```

## Honest gaps — what this run does NOT contain

This was scoped as "foundation first" with the owner's agreement. Not built:

- **The worker handler and job registration.** No `signing-request.complete`
  job exists, so nothing consumes a run yet.
- **The durable trigger.** BACKEND-37's `markCompletionReady` does not yet
  create a `CompletionRun`. Until it does, §49–§55 and §300 are **unmet**: a
  request reaching `completion-ready` today gets no completion work. This is
  the single most important gap and the first thing the next run must close.
- **`EnsureCompletionRun`, `BuildCompletionInput`, the reconciler.** The
  eligibility rule exists and is tested; nothing calls it.
- **The `completed` transition guard and `VerifiedCompletionResult`.** §170–§173.
  The request-state CHECK does not admit `completed`, so the unsafe path cannot
  exist — but the guard itself is not written.
- **Repositories and ports.** No `ScopedCompletionRepository`, no step-contract
  ports. The tables exist; nothing reads or writes them.
- **Orphan cleanup and the storage failure-window choreography.** Designed and
  documented in the architecture; not implemented.
- **Integration tests.** Migration-from-zero and schema probes ran; no
  behavioural integration test exists because there is no behaviour yet.

**No fake adapter was introduced** (§22, §178, §309). Nothing can report a
successful completion, because the seal step has no implementation to succeed
from — which is the correct state for this point in the sequence.

## Product status

| | |
|---|---|
| AUTOMATIC COMPLETION START | **FOUNDATION_ONLY** — trigger not yet wired |
| COMPLETION RUN | **FOUNDATION_ONLY** — schema and domain exist, no repository |
| PROCESSING STATUS | **NOT_IN_PRODUCT** |
| AUTOMATIC RETRY | **FOUNDATION_ONLY** — classification and bounds exist, no worker |
| TERMINAL FAILURE | **FOUNDATION_ONLY** |
| MANUAL RETRY | **NOT_IN_PRODUCT** (BACKEND-59) |
| FINAL ARTIFACT | **BLOCKED UNTIL BACKEND-41** |
| CERTIFICATE | **BLOCKED UNTIL BACKEND-40** |
| FINAL SEAL | **BLOCKED UNTIL BACKEND-41** |
| REQUEST COMPLETED | **BLOCKED UNTIL BACKEND-41** — the CHECK does not admit it |

## Explicitly confirmed

- PDF FIELD MERGE IMPLEMENTATION: **NOT BACKEND-38**
- CERTIFICATE PDF IMPLEMENTATION: **NOT BACKEND-38**
- FINAL SEAL IMPLEMENTATION: **NOT BACKEND-38**
- Fake / no-op `DocumentSealer`: **not introduced**
- Redis, Kafka, workflow engine, Temporal: **not introduced**
- PDF library in the orchestrator: **not introduced**
- `BYPASSRLS`: **not introduced**
- Fake OWNER system actor: **not introduced**

## BACKEND-39 readiness

**NOT READY.** The blocker is precise: BACKEND-39 implements field rendering
*inside* `@lagda/sealing`, behind `DocumentSealer.seal()` — and there is no
executable completion path to exercise it, because the trigger, the
repositories and the worker are not built. BACKEND-39 can be written against the
existing `SealRequest` / `SealResult` contract, but it cannot be verified
end-to-end until the orchestration this command started is finished.

**The next run should close the trigger first**, then repositories, worker and
the `completed` guard — after which BACKEND-39/40/41 have something to plug into.
