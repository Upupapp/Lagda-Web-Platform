# Completion certificate — architecture

**Command:** BACKEND-40 · **Read with:** the content policy, ADR-032

## Pipeline position

```
COMPLETION_READY -> CompletionRun
    field-merge   -> merged-candidate artifact        (BACKEND-39)
    certificate   -> completion-certificate artifact  (BACKEND-40)  <- here
    final-seal    -> sealed artifact                  (BACKEND-41)
    finalize      -> request COMPLETED                (BACKEND-41)
```

## The flow

```
immutable SigningRequest snapshot
  + immutable recipient snapshots
  + recipient_submissions (signedAt, authentication, consent binding)
  + ceremony progress / consents
  + frozen source artifact digest
        |
        v  listCertifiedParticipants   (ONE query)
   CertifiedParticipantFacts[]
        |
        v  buildCompletionCertificateModel   (pure, fails closed)
   CompletionCertificateModelV1
        |
        v  CompletionCertificateGenerator.generate   (port)
   bytes + SHA-256 + size + versions
        |
        v  putObject -> artifacts.insert + acceptStep   (one transaction)
   completion-certificate artifact
```

## Three seams, one package

`@lagda/sealing` exposes `DocumentSealer`, `FieldMerger` and
`CompletionCertificateGenerator` — three interfaces, one caller each, all in the
completion pipeline.

Separate rather than methods on one seam, so a remote signing service replacing
`DocumentSealer` does not also have to implement field rendering and certificate
layout, both of which stay local. A guard asserts `DocumentSealer` still
declares exactly one method.

## Why one query rather than five reads

Every certified fact must belong to the **same recipient of the same request**.
Reading recipients, submissions, consents and ceremony progress separately and
correlating them in application code is exactly how a cross-recipient or
cross-request fact reaches a certificate. The correlation is written once, as a
join, where the database enforces it.

The submission join is INNER — only actual signers are certified. Consent and
ceremony joins are LEFT, because both are genuinely optional; an inner join
would silently drop every signer with no recorded consent, producing a
certificate missing participants rather than an error.

## Immutable sources only

**Read:** the signing request snapshot, its recipient snapshots, accepted
submissions, ceremony progress, consents, and the frozen source artifact's
integrity metadata.

**Never read:** `contacts`, `preparation_recipients`, `preparation_fields`,
current user profiles, current workspace membership, the current `documents`
row. Changing any of them after signing leaves the certificate unchanged — the
property that makes it evidence rather than a report.

## Versioning

`certificateVersion` (`completion-certificate-v1`) versions the DATA SCHEMA —
which facts are certified and what they mean. `rendererVersion`
(`certificate-renderer-v1`) versions LAYOUT.

Separate on purpose: a layout fix must not claim the certified facts moved, and
a schema change must not hide behind a visual tweak. Neither is a package
version or a git SHA, because a stored certificate must stay interpretable under
the version that produced it.

## Retry and idempotency

Exactly one accepted CERTIFICATE output per CompletionRun. The step reads the
run's steps first; an already-accepted output is REUSED and the generator is not
called.

This matters more here than for field-merge: the model carries `generatedAt`, so
a second render would not even be byte-identical. Reuse is what stops one run
having two differing authoritative certificates.

## Failure windows

Storage is not transactional, so the windows are chosen rather than pretended
away — the choreography BACKEND-38 established and BACKEND-39 followed.

| Window | Outcome | Recovery |
|---|---|---|
| Render fails | No object, no row | Terminal or retryable per the renderer's own classification |
| Upload fails | No object, no row | `storage-unavailable`, retryable |
| Upload OK, DB fails | Object, no row | `database-unavailable`, retryable. Private and unreferenced — OD-160 sweeps it |
| DB OK, worker dies | Object and row | Retry finds the accepted step and reuses it |

Bytes THEN row (INV-226). A row naming an object that does not exist is a
completion the pipeline believes in and cannot deliver; the reverse is
recoverable. A test asserts the ordering rather than trusting the comment.

## Preconditions

`field-merge` must have SUCCEEDED and the artifact it named must EXIST —
resolved by identity, never by "the latest merged artifact".

Not because the certificate renders the merged document (it does not, and the
merged digest is deliberately not on the page) but because certifying a signing
whose document was never assembled is what the step ledger exists to prevent.

## What BACKEND-40 does not do

- Does not invoke `DocumentSealer`
- Does not transition the request to `completed`
- Does not create a verification record or any public verification route
- Does not send notifications
- Does not modify submissions, field values, recipient state or routing
- Does not append the certificate to the merged document — BACKEND-41 owns
  final composition

## Handoff to BACKEND-41

Two immutable artifacts on one CompletionRun, each with its own digest:

- `merged-candidate` — the signed-value document
- `completion-certificate` — with `certificateVersion` and `rendererVersion`

BACKEND-41 composes them, invokes `DocumentSealer` exactly once, and only then
transitions the request. It must not regenerate either input.
