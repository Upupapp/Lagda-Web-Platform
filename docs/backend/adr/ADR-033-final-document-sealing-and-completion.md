# ADR-033 — Final document sealing and completion

**Status:** Accepted (BACKEND-41, 2026-08-11)
**Related:** ADR-031, ADR-032, OD-162, OD-167, `final-sealing/*`

## Context

A signing request must become a completed document exactly once, and the moment
it does is legally significant and terminal. Everything about this boundary is
shaped by a single asymmetry: **object storage and PostgreSQL cannot commit
together**, and one of the two orderings is recoverable while the other is not.

Three inputs already existed as immutable artifacts — the frozen source, the
merged candidate (BACKEND-39) and the completion certificate (BACKEND-40).
`document_seals`, `verification_records` and `signing_request_completions` had
existed since migration 003 and BACKEND-38. What did not exist was any way for a
request to *be* completed: the state CHECK admitted six values and deliberately
not `completed`, on the recorded grounds that the value should arrive with the
code that earns it.

## Decision

**Compose the two accepted artifacts, seal once through the canonical seam,
persist the final artifact, and only then transition the request — all of the
persistence in one transaction that runs after the bytes are durable.**

```
accepted merged + accepted certificate
  -> compose (inside @lagda/sealing)
  -> DocumentSealer.seal()            <- the one business caller
  -> verify both input digests
  -> upload final bytes
  -> ONE transaction: artifact + seal + verification + completion
                      + revoke credentials + completion-ready -> completed
```

Five properties carry it.

### 1. Bytes before rows, always

A row naming an object that does not exist is a completion LAGDA believes in and
cannot deliver — and §110 forbids repairing it silently, so it would require
human intervention on a legally significant record. The reverse window leaves a
private, unreferenced object: recoverable, sweepable, harmless.

Given that the two cannot be atomic, the ordering is chosen so that the failure
mode is the survivable one.

### 2. Verification happens after sealing, and the docs say so

§15 asks for the inputs to be rehashed before use. `createHash` is confined to
`@lagda/sealing` so two layers cannot disagree about encoding, and exporting a
general hash would let any caller hash a document without sealing it.

So the **sealer** returns the digests of the bytes it received, and the step
compares them against the artifact rows. Sealing is a pure function over memory,
and nothing is uploaded, recorded or completed until both match — so the
guarantee is identical while the boundary holds. The architecture doc states the
actual order rather than claiming a pre-seal rehash.

### 3. The transition is last, and conditional

`markCompleted` is a conditional UPDATE — `where state = 'completion-ready'` —
so two workers both run it and exactly one matches a row. If it returns false
the entire transaction rolls back: a completion record without the state is
worse than a retry.

Nothing before it claims completion, and a database CHECK asserts in both
directions that `completed_at` is present exactly when the state is `completed`.

### 4. Verification identity is created here, which removed a mechanism

It used to be an input to `seal()` so the certificate could print it. BACKEND-40
removed that line, leaving a value the sealer destructured and never read.
Creating it in the finalization transaction makes retry-stability a *constraint*
rather than a discipline: the completion row is unique, the verification record
is written alongside it, so exactly one identity can exist.

This works only because nothing in the final bytes references it — no QR, no
visual mark, neither of which the product has.

### 5. The lockout is two independent layers

The state check is the control: `SIGNABLE_REQUEST_STATES` is an allow-list, so
`completed` is denied by construction including on routes added later.
Revocation is defence in depth — a stolen link stops resolving at the lookup
rather than at the policy.

They are tested separately, because testing only the combination would let
either rot unnoticed.

## Alternatives rejected

**Mark COMPLETED before sealing.** Produces a request asserting a document that
does not exist, on a terminal state that cannot be walked back. This is the
failure the whole ordering exists to prevent.

**Overwrite the merged artifact with the final bytes.** Destroys the input a
retry needs and the provenance a verifier needs, to save one object.

**Call the PDF library directly from the application.** Would put pdf-lib types
in the application layer and make the remote-signer swap a rewrite instead of an
implementation. The seam has one caller precisely so it stays cheap to replace.

**Seal at signature submission.** The last signature is not the last fact: field
merge and certificate generation can each fail afterwards, which is exactly why
BACKEND-37 created `completion-ready` as a distinct state.

## Consequences

- `completed` and `completed_at` exist (migration 028), and that migration's
  `down` **refuses** when completions exist rather than reverting a terminal,
  legally significant state.
- `SealRequest` gained a certificate input and lost `verificationId`;
  `preparedDocument`/`preparedDocumentHash` were renamed to `merged*`, which
  closed the §0 trap structurally — wiring the merged digest into
  `originalDocumentHash` now reads as obviously wrong at the call site.
- The seal is described only as what it is: `hash-evidence` v1, SHA-256. No
  PAdES, X.509, PNPKI, RFC 3161 or HSM claim appears anywhere, and
  `LAGDA_SEAL_SEMANTICS.md` states the absences explicitly so a reader cannot
  infer more.
- BACKEND-42 can verify a completed document from immutable records alone.
