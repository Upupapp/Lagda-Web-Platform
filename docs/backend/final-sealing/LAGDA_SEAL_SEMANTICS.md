# LAGDA seal semantics

**Command:** BACKEND-41 · **Scheme:** `hash-evidence` · **Version:** 1
**Digest:** SHA-256

What LAGDA's seal actually is, stated precisely, and — the longer half — what it
is not.

## What the seal IS

A **hash/evidence seal**. Concretely, LAGDA:

1. composes the accepted merged signed document with the accepted completion
   certificate into one final PDF;
2. computes **SHA-256 over the exact bytes it then stores**;
3. records that digest, the scheme, the version and the digest algorithm in
   `document_seals`, alongside the digest of the **original uploaded file**;
4. records an opaque `verificationId` against that seal;
5. writes an immutable completion row naming the final artifact.

The guarantee this provides is **integrity against a recorded value**: anyone
holding the final PDF can hash it and compare against what LAGDA recorded. If
the bytes changed, the digests differ.

That is a real and useful property. It is also the *only* cryptographic property
LAGDA currently provides.

## What the seal is NOT

None of the following is implemented, and none may be claimed — in code
comments, API fields, product copy, certificates, or documentation.

| Not implemented | What it would require |
|---|---|
| **PAdES** | A PDF signature dictionary, a signing certificate, and a CMS/PKCS#7 structure embedded in the document. LAGDA embeds none |
| **X.509 / PKI** | A certificate chain and a private key with a trust anchor. LAGDA has no signing key at all |
| **PNPKI** | Accreditation under the Philippine national PKI, plus everything above |
| **RFC 3161 / TSA** | A timestamp token from a trusted timestamp authority. LAGDA's `sealedAt` and `completedAt` are its **own server clock**, and prove only what LAGDA believes |
| **HSM** | Key material in tamper-resistant hardware. There is no key |
| **Qualified electronic signature** | A regulatory status LAGDA has not sought |

### The distinction that matters most

**A hash proves the document has not changed. It does not prove who signed it,
and it does not prove when.**

- *Who* rests on LAGDA's authentication records — a signing link, or an email
  one-time passcode. Neither is identity verification. See
  `completion-certificate/CERTIFICATE_AUTHENTICATION_LANGUAGE.md`.
- *When* rests on LAGDA's own clock. A server timestamp is not a timestamp
  token; nothing external attests to it.

A reader who takes "sealed" to mean "cryptographically signed by a trusted
authority" has been misled. The wording exists to prevent that.

## Why the digest is trustworthy at all

It is computed **server-side, over the exact bytes stored**, by
`@lagda/sealing` — the only package permitted to call `createHash`, so two
layers cannot disagree about hex versus base64.

**The provider's ETag is never used** (§16, §48). An ETag is the storage
provider's opinion about its own object, computed by an algorithm that varies by
provider and by upload method. It is not LAGDA's integrity claim.

## The three digests, and which is which

Confusing these is the failure mode this file exists to prevent. BACKEND-40
found one instance of it on the certificate, and the §0 inventory found another
waiting in the seal record.

| Recorded as | Is the digest of | Notes |
|---|---|---|
| `document_seals.original_document_hash` | The **original uploaded file** — the request's frozen `sourceArtifactId` | **NOT** the merged candidate. That substitution was the §0 trap; the seam was renamed so it now reads as obviously wrong at the call site |
| `document_seals.signed_document_hash` | The **final sealed bytes**, exactly as stored | The authoritative integrity value, and what BACKEND-42 compares against |
| `document_artifacts.digest` (final row) | The same final bytes | The artifact record is the source of truth (§128); the seal metadata references it |

The merged candidate's and certificate's digests live on their own artifact rows
and are **not** copied into the seal record. They are verified during
finalization and are provenance, not seal metadata.

## Versioning

`sealScheme` is `hash-evidence` and `sealVersion` is `1`. Both are recorded from
the first row written, never defaulted and never inferred.

The version increments when a change alters **how an existing sealed artifact
must be interpreted** — not when the package version moves and not when this
file is edited. A stored seal must stay interpretable under the version that
produced it.

## If LAGDA later needs real signatures

The extraction triggers are recorded rather than guessed at (§117): a
regulatory or accreditation requirement, a contractual cryptographic
requirement, or a measured limitation of the current approach.

The `DocumentSealer` seam exists so that day costs an implementation and not an
architecture: it is one high-level operation taking LAGDA-owned types, with no
PDF library type crossing it, and exactly one business caller. A Java or .NET
signing service implements the same interface and no caller changes.

**Until that happens, this document is the honest description of the seal, and
nothing in LAGDA may describe it as more.**
