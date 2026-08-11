# The signing request completion record

**Command:** BACKEND-41 · **Table:** `signing_request_completions`

The immutable fact that a request completed.

## Fields

| Field | Meaning |
|---|---|
| `signing_request_id` | The request. **UNIQUE** — one completion, ever |
| `completion_run_id` | The run that produced it |
| `merged_artifact_id` | The merged candidate composed into the final document |
| `certificate_artifact_id` | The certificate composed into it |
| `final_artifact_id` | **The completed document.** Authoritative |
| `completed_at` | Backend finalization time |
| `seal_scheme` / `seal_version` / `digest_algorithm` | How it was sealed |
| `pipeline_version` | The orchestration version that produced it |

`merged_artifact_id` was added by migration 028. Without it the provenance chain
`source -> merged -> final` could not be read from the completion row alone — it
had to be inferred from the run's step rows, which are operational records
rather than the completion's own evidence.

The source artifact is reached through the request's immutable
`sourceArtifactId`, so it is not duplicated here.

## Immutability

- `UNIQUE (signing_request_id)` — a second completion is a constraint violation,
  not an application check.
- The runtime role holds **no UPDATE and no DELETE grant** on the table. A
  completion cannot be repointed at a different final artifact after the fact,
  even by code that tries.
- Written with `on conflict do nothing`, so a retry whose response was lost
  converges on the existing row (§109) instead of failing.

## Relationship to the request

`signing_requests.completed_at` and `state = 'completed'` are set in the same
transaction, and a CHECK asserts in **both directions** that the timestamp is
present exactly when the state is `completed`.

So the completion row and the request state cannot disagree: they commit
together, or neither exists.

## Why request-scoped rather than a pointer on the document

§74/§75. A `Document` may have more than one signing request over its life. A
single `document.final_artifact_id` would be ambiguous — and worse, a second
request completing would overwrite the first request's result.

The completion is therefore **request-scoped**, and a document exposes its
completed artifacts by relation rather than by a single mutable pointer. The
document's `original_artifact_id` is never touched.

## What reads it

- BACKEND-41 itself, to discover an existing completion on retry and return
  `already-completed` rather than sealing again.
- BACKEND-42, to answer public verification from the immutable record rather
  than from mutable signing state.
- Any future sender-facing download, which must resolve `final_artifact_id` —
  never `source_artifact_id` and never `merged_artifact_id` (§306).
