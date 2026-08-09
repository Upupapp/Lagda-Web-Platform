# Remote Signer Migration

What it actually costs to replace `NodeDocumentSealer` with a call to a dedicated
Java or .NET signing service — the claim BACKEND-00 built this package around.

## The honest answer

**The seam holds. The surrounding assumptions are where the work is.**

Anyone reading "swap the implementation, nothing else changes" should read the
rest of this page, because three of the five assumptions below are load-bearing
and only two are free.

## What genuinely does not change

Write `RemoteDocumentSealer implements DocumentSealer`, change one line in the
composition root, and every caller compiles unchanged. This is real, and it is
enforced rather than hoped for:

- `DocumentSealer` is declared in exactly **one** file — a test asserts it.
- The port names no pdf-lib type and uses `Uint8Array`, not Node's `Buffer` — a
  test asserts both, on comment-stripped source.
- `DocumentSealer` has exactly **one** method — a test asserts the count.
- No package outside `packages/sealing` imports a PDF library — lint blocks it,
  a test backs it up, and both were verified by deliberately violating them.
- `@lagda/application` never imports `@lagda/sealing` — asserted, and probed.

## Assumption 1 — bytes are passed, not fetched — **free**

`SealRequest` carries the document. The sealer never touches object storage, so a
remote service needs no knowledge of LAGDA's storage topology or credentials.

If sealing had taken a storage key, the remote service would need read access to
LAGDA's bucket, and the migration would include a security review.

The cost of this choice is paid today: documents are held in memory. For very
large PDFs that becomes a streaming problem, which is a real limitation recorded
in the foundation report — but it is the limitation that keeps the seam clean.

## Assumption 2 — no clock, no randomness — **free**

`sealedAt` and `verificationId` are inputs. A remote signer inherits no
responsibility for LAGDA's identifier namespace and cannot drift from LAGDA's
clock.

## Assumption 3 — `seal()` is synchronous from the caller's view — **costly**

`seal(request): Promise<SealResult>` returns the artifacts. A local call returns
in milliseconds.

A remote signing service — especially one talking to an HSM or a timestamp
authority — may take seconds, may be rate-limited, may be briefly unavailable,
and may need an async submit/poll protocol.

The interface can absorb latency: it is already a `Promise`, and callers already
await it. What it cannot absorb is a service that **cannot answer within one
request** and needs a callback.

Mitigations already in place:

- Sealing must never run inside a database transaction. This is documented as an
  invariant, so no transaction is held open across a slow remote call.
- Errors already carry `retryable`, so a caller can distinguish a timeout from a
  malformed document without inspecting messages.

Still required at migration: a timeout policy, a retry budget, and a decision on
whether completion becomes a durable job. That last one is the real cost, and it
belongs with the job system (BACKEND-16) rather than here.

## Assumption 4 — the certificate is produced by the sealer — **moderate**

`SealResult` returns both the sealed document and the certificate.

A signing service that only signs — the likely shape of a PAdES implementation —
would not render LAGDA's certificate. Then either the certificate renderer stays
in Node while signing moves out, splitting one operation across two runtimes, or
the remote service takes on LAGDA-specific layout and copy.

Not resolved here, deliberately. The choice depends on the service, and inventing
a `CertificateRenderer` port now would add a second seam that today has exactly
one implementation and one caller — the decorative-architecture failure this
codebase has already been bitten by once.

What *is* protected: the certificate is a separate artifact, so moving its
production later does not alter the sealed document's bytes.

## Assumption 5 — the seal scheme is recorded — **this is what makes it possible**

Every artifact carries `sealScheme`, `sealVersion`, `digestAlgorithm`.

Without them, introducing certificate-backed signing would leave every existing
artifact ambiguous, with no way to tell which rules produced it. With them, the
old and new schemes coexist and verification can branch on the discriminant.

This field group is the single most important thing in this package for the
migration, and it costs nothing today.

## What a remote signer must still satisfy

- Return the **exact bytes** it produced, because LAGDA hashes what it returns.
- Not require `Buffer`, Node streams, or any Node-specific type.
- Fail with information rich enough to map onto LAGDA's error taxonomy —
  specifically, enough to decide `retryable`.
- Be callable outside a database transaction.

## What would break the seam

Recorded so a future command recognises the mistake while making it:

- Adding a second method to `DocumentSealer`.
- Returning a pdf-lib type, a `Buffer`, or a storage handle.
- Letting a use case import `@lagda/sealing` directly.
- Hashing anywhere except `internal/digest.ts`.
- Having the sealer fetch or store bytes itself.
- Generating the verification ID or reading the clock inside the sealer.

Each of the first four is currently blocked by a test that has been verified to
fail when violated.
