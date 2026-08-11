# Final document sealing — architecture

**Command:** BACKEND-41 · **Read with:** `LAGDA_SEAL_SEMANTICS.md`,
`FINAL_COMPLETION_CONSISTENCY.md`, ADR-033

## The pipeline, complete

```
COMPLETION_READY -> CompletionRun
    field-merge   -> merged-candidate artifact         (BACKEND-39)
    certificate   -> completion-certificate artifact   (BACKEND-40)
    final-seal    -> sealed artifact + COMPLETED       (BACKEND-41)  <- here
```

`finalize` has **no separate runner**. `final-seal`'s own transaction performs
the finalization, because the request transition and the records that justify it
must commit together or not at all — a second step would be a window in which a
sealed document exists and the request does not say so.

## The flow, and §100's ordering

```
accepted FIELD_MERGE artifact + accepted CERTIFICATE artifact
        |  resolved BY IDENTITY from the run's step rows
        v
   fetch both objects
        |
        v  DocumentSealer.seal(merged, certificate)     <- outside any transaction
   final bytes + mergedDocumentHash + completionCertificateHash + signedDocumentHash
        |
        v  VERIFY both input digests against the artifact rows
        |
        v  putObject(final bytes)                       <- outside any transaction
        |
        v  THE FINALIZATION TRANSACTION
             artifact row (kind `sealed`)
             seal metadata + verification record
             accept the FINAL_SEAL step
             completion record
             revoke grants + sessions
             completion-ready -> completed
```

**Nothing before the transaction claims completion**, and the transaction runs
only once the final bytes are durably stored. The reverse order produces a
request asserting a document nobody can fetch — which §110 says must never be
silently repaired.

The transaction holds no PDF work and no storage call. Sealing takes seconds;
holding a database transaction across it would pin a connection and still not
make the two atomic, because object storage cannot enrol in a PostgreSQL
transaction.

## Where verification happens, and why not earlier

§15 asks for the input bytes to be rehashed. They are — but **after** the seal
call, not before, and the reason is a boundary rather than an oversight.

`createHash` is confined to `@lagda/sealing` by an architecture guard, so two
layers cannot disagree about hex versus base64; exporting a general `sha256`
would let any caller hash a document without sealing it. So the **sealer**
returns `mergedDocumentHash` and `completionCertificateHash` for the bytes it
received, and the step compares both against the artifact rows.

This is safe because sealing is a pure function over bytes in memory: **nothing
is uploaded, no row is written and no request is completed** until both digests
match. What it buys is that a restored object, a key collision or a partial
write cannot become the authoritative document — all three produce a readable
PDF that is not the one the request accepted.

## The only DocumentSealer caller

`packages/application/src/completion/final-seal.ts`. Verified by repository
audit: no other business path invokes it.

The seam stays library-neutral — `mergedDocument` and `completionCertificate`
are **semantic byte inputs**, never an `appendPages()` API. A remote signer
receives two documents and an instruction to seal them as one; it is never told
how to manipulate pages. Page-level composition lives inside `@lagda/sealing`.

## What the finalization transaction writes, in order

1. **The final artifact row** — kind `sealed`, new `ArtifactId`, new private
   storage key, server-observed size, server-computed SHA-256 over the exact
   stored bytes, provenance pointing at the merged candidate.
2. **Seal metadata + verification record**, together (they cannot exist
   separately — a seal nobody can look up is not verifiable).
   `originalDocumentHash` comes from the request's **frozen source artifact**,
   never from the merged digest. See the §0 trap in the inventory.
3. **The accepted FINAL_SEAL step**, naming the final artifact.
4. **The completion record** — `on conflict do nothing` against
   `UNIQUE (signing_request_id)`, so a retry converges rather than competing.
5. **Revocation** of live grants and recipient sessions.
6. **`completion-ready -> completed`**, LAST. If it returns false the request
   left `completion-ready` under us and the whole transaction rolls back: a
   completion record without the state is worse than a retry.

## `completedAt`

Generated inside the finalization transaction, by the backend clock. It is
**not** the seal start time and **not** any recipient's signing time — every
signature is necessarily earlier. A database CHECK asserts, in both directions,
that `completed_at` is non-null exactly when the state is `completed`.

## The lockout, both layers

Owner decision, recorded in `OPEN_DECISIONS.md`: **deny by state AND revoke.**

- **The state check is the control.** `SIGNABLE_REQUEST_STATES` is an allow-list
  of `["sent", "partially-completed"]`, so `completed` is denied by
  construction, including on routes added later.
- **Revocation is defence in depth and hygiene.** A live session against a
  completed request is a credential with no legitimate use; revoking means a
  stolen link stops resolving at the *lookup* rather than at the policy.

The two are tested **independently**, because asserting only the combination
would let either rot unnoticed.

## Verification identity

Created in the finalization transaction, beside the verification record it
identifies. That makes retry-stability free rather than a mechanism: the
completion row is unique per request and the verification record is written in
the same transaction, so exactly one identity can ever exist (§54, §63).

It is a **public-safe opaque lookup identifier**, not a bearer credential and
not a download token. BACKEND-42 exposes it; BACKEND-41 only creates it.

## What BACKEND-41 does not do

- No public verification route (BACKEND-42)
- No notifications or email (BACKEND-44/45)
- No audit-trail API (BACKEND-43)
- No download surface — the product has none, and building one would be a
  foundation without callers
- No modification of submissions, field values, recipient state or routing
- No regeneration of the merged candidate or the certificate
