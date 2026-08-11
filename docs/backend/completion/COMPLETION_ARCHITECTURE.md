# Completion pipeline architecture

**Backend:** BACKEND-38 · **Migration:** 025 · **Status:** orchestration
foundation. **NOT end-to-end** — the `seal` step becomes executable at
BACKEND-41.

```
SigningRequest.state = completion-ready        (BACKEND-37 wrote this)
        |
        v
   CompletionRun            one per request, enforced by a unique constraint
        |
        v
   eligibility revalidated  against submissions and values, not against state
        |
        v
   seal      -> persist -> finalize            three steps, one fixed order
        |
        v
   signing_request_completions                 the immutable completion fact
        |
        v
   SigningRequest.state = completed            BACKEND-41 earns this
```

## The decision that shapes everything: three steps, not five

§70 proposes `FIELD_MERGE`, `CERTIFICATE`, `FINAL_SEAL`, `FINAL_PERSIST`. LAGDA
cannot have the first two as durable steps, and the reason is BACKEND-09's seam.

`DocumentSealer.seal()` is **one operation**. `SEALING_ARCHITECTURE.md` §2 —
*"Not `mergeFields`, `hashDocument`, `renderCertificate`, `appendPage`. Those
exist as private collaborators inside the package."* A single call takes the
source bytes and returns **both** the sealed document and the completion
certificate, with `preparedDocumentHash` and `signedDocumentHash`.

Splitting that into separately retryable steps would mean splitting the seam.
§24 forbids it, INV-002 exists to prevent it, and `REMOTE_SIGNER_MIGRATION.md`
rejected an extra `CertificateRenderer` port by name as *"the
decorative-architecture failure this codebase has already been bitten by once"*.
§288 settles it: *"Final completion uses the established high-level
DocumentSealer seam; BACKEND-38 may not create a second sealing architecture."*

**The database agrees independently.** `document_artifacts.artifact_type` has
admitted `original`, `sealed` and `completion-certificate` since migration 003.
There is no merged-candidate type, because LAGDA has never modelled an
intermediate merged PDF as a persisted artifact.

So the ledger records the steps this architecture has, and §81's rule — *names
must reflect reality* — is honoured literally:

| Step | What it does | Who makes it executable |
|---|---|---|
| `seal` | one `DocumentSealer.seal()` call → sealed document + certificate + both digests | **BACKEND-41** |
| `persist` | upload both objects, then record both artifacts | BACKEND-41 |
| `finalize` | verify every output, then transition the request | BACKEND-41 |

BACKEND-39 (field rendering) and BACKEND-40 (certificate layout) refine what
happens **inside** `@lagda/sealing`, where `mergeFields` and `renderCertificate`
already live. They do not acquire durable steps, and they do not touch the
orchestrator.

## Three tables, three different jobs

| Table | Job | Grants |
|---|---|---|
| `signing_request_completion_runs` | OPERATIONAL — processing state, attempts, failure classification | select, insert, **update** |
| `signing_request_completion_steps` | the step ledger — one accepted result per logical step | select, insert, **update** |
| `signing_request_completions` | AUTHORITATIVE — the immutable fact that a request completed | select, insert **only** |

§107 asks whether the third is worth having separately from the run's
`succeeded` state. It is. A run is operational debris an operator may one day
prune; *"this request completed, here is its final artifact"* is a legal record
that must outlive it. And the runtime role holds **no UPDATE grant** on it, so
"a completed request's final artifact cannot be repointed" is a privilege rather
than a rule somebody remembers.

## The request's state does not change while the pipeline runs

`SigningRequest.state` stays `completion-ready` throughout, and migration 025
**does not widen the CHECK to admit `completed`**.

That is the product's answer, not a preference. `COMPLETION_PRODUCT_INVENTORY.md`
records the search: there is no "Finalizing", no processing status in
`status-map.ts`, no failure copy, no retry control. A request-level `COMPLETING`
state would be a value nothing can render and nobody decided (§19).

Leaving `completed` out of the CHECK is the same discipline BACKEND-33 used when
it added `sent` alongside the send that writes it: a CHECK admitting a state
nothing can reach is a permission granted in advance of the thing it permits.
**BACKEND-41 adds the value with the code path that earns it.**

A sender-facing projection can derive "finalizing" from
`request = completion-ready` + `run = processing` the day the product grows a
screen for it (§146).

## Eligibility is revalidated, never trusted

`assessCompletionEligibility` re-derives every fact behind `completion-ready`
before anything expensive happens (§6):

1. the request is in exactly `completion-ready` — one state, not a list;
2. the **exact** source artifact the request froze still exists (never the
   document's current artifact — §9);
3. every required participant is `signed`;
4. every recipient the workflow *calls* signed has an accepted submission —
   the check that catches a `signed` row whose submission vanished (§246);
5. every required field has an accepted value;
6. every value names the recipient its assignment names (§247).

Cheapest-first: a request that is not `completion-ready` is rejected in one
comparison rather than after two passes.

`completion-ready` is a projection BACKEND-37 wrote from durable facts, and a
projection can be wrong — through a bug, a partial restore, or a hand-edited
row. A disagreement is an integrity failure, not something to work around.

## Failure classification is a total record

Thirteen codes, each mapped to `retryable` or `terminal` by a frozen `Record`.
Adding a code without deciding is a **compile error**, which is the point:
defaulting to retryable retries corruption forever, and defaulting to terminal
gives up on an outage.

Retries are bounded on top of that (§46) — a retryable cause that exhausts its
attempts becomes terminal, because unbounded retry is how a broken dependency
turns into a queue nobody can drain.

**No raw exception is ever persisted.** §42 — the failure column is CHECK-
constrained to the closed vocabulary, so unbounded text cannot carry a field
value or a document title into a business table. Operational detail lives in
logs, under the redaction policy that already applies.

## What the recipient realm can see

Nothing. All three tables carry a restrictive `recipient_realm_denied` policy —
the same one-line denial migration 024 applied to grants and delivery intents. A
recipient has no business knowing that completion is running, how often it has
failed, or what it produced.

## What is NOT built yet

The worker handler, the job registration, the `VerifiedCompletionResult` guard
on the `completed` transition, and orphan cleanup. See
`COMPLETION_REPORT.md` — this command is the foundation, and it deliberately
contains **no fake adapter** (§22, §178): nothing can report success, because
the sealer step has no executable implementation to report success from.
