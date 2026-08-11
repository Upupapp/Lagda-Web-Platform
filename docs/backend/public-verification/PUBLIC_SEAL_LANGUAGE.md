# The language of the LAGDA seal

**Command:** BACKEND-42 · **Date:** 2026-08-11
**Related:** `final-sealing/LAGDA_SEAL_SEMANTICS.md`, INV-623

## The problem this document exists to prevent

A verification page is where a reader decides how much to trust a document. It
is therefore the single highest-risk place in the product for an overclaim, and
the risk is asymmetric: an understated description costs a little confidence,
while an overstated one is a false assurance about a legally significant record.

The mock `VerifyPage.tsx` already carried the constraint list, written by
someone who had thought about this before any backend existed:

> - Never claim a real verification lookup occurred.
> - Never claim cryptographic proof exists.
> - Do not equate *found record* with *matching file*.
> - Do not equate *matching file* with *legal validity*.
> - Do not equate *electronic signing* with *notarization*.

The first is now false — the lookup is real. The rest hold exactly as written.

## The one sanctioned wording

Produced from a total `Record` over the closed scheme vocabulary, so a new
sealing scheme without a description is a **compile error** rather than an
unlabelled response:

> LAGDA completed this document using its versioned hash and evidence sealing
> process. The completed document is identified by the SHA-256 digest shown
> above. This record confirms what LAGDA holds; it is not a digital signature
> certificate and does not verify signer identity.

Three sentences doing three jobs: what happened, what identifies it, and — in
the last sentence — what it is *not*. The disclaimer is not a footnote appended
elsewhere; it is inside the same string, so it cannot be dropped by a consumer
rendering only the first field.

## Forbidden vocabulary

LAGDA implements none of these, so the response may not contain any of them:

```
PAdES   X.509   PNPKI   RFC 3161   timestamp authority   HSM
notarized / notarised   legally binding   identity verified
```

Asserted as a substring sweep over the response body, alongside the PII sweep.
The list is the same one `LAGDA_SEAL_SEMANTICS.md` records as absences, so the
two documents cannot drift into disagreement without a test failing.

## What "verified" actually means here

Three separate claims, routinely conflated, kept apart in the wire shape:

1. **A completed record exists** under this reference — the GET route.
2. **This file is byte-identical** to the completed artifact — `matches: true`
   from the file-check route.
3. **This document is legally valid / the signers are who they say** — LAGDA
   asserts neither, anywhere.

The response never merges (1) and (2) into a single "verified" boolean, because
a single boolean is exactly how (3) gets read into it.
