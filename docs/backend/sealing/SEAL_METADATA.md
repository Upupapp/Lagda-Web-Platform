# Seal Metadata

Every sealed artifact records **how it was sealed**, from the first record
written.

```ts
{ sealScheme: "hash-evidence", sealVersion: 1, digestAlgorithm: "sha-256" }
```

## Why it exists before it is needed

Today there is one scheme, so every value is constant and the fields look
redundant. They are not.

The moment a second scheme exists — certificate-backed signing, a different
digest, an appended certificate — every artifact sealed before that point becomes
ambiguous unless it says which rules produced it. Retrofitting is impossible: the
information is gone. Records written now are the ones that need it most, because
they are the oldest.

This is the opposite of the frontend's `RouteMeta.status` failure, and worth
stating explicitly since that case is cited throughout these documents as the
argument against unused fields. `RouteMeta.status` was declared on 225 routes and
**read by no code ever**, so it drifted until three routes misreported themselves.
Seal metadata is read the first time a second scheme exists, and it is
unrecoverable if omitted. The distinction is not "is it used today" but "can it
be reconstructed later" — for `RouteMeta.status`, yes, trivially; for seal
metadata, never.

## The fields

### `sealScheme: "hash-evidence"`

The discriminant. `SealMetadata` is a discriminated union with one member today,
not an untyped bag, so a record produced under one scheme stays interpretable
after another is added.

`hash-evidence` names what actually provides integrity: LAGDA holds the SHA-256
digest of the exact distributed bytes plus the evidence log. It is not a
cryptographic signature and the name avoids implying one.

A speculative `certificate-signature` variant is **not** defined. Its real fields
depend on decisions not yet made (OD-013) — certificate authority, revocation,
timestamp source — and guessing them produces fields nobody writes and a shape
the real implementation has to migrate away from.

### `sealVersion: 1`

The version of LAGDA's **sealing procedure**.

Not the API version, not the package version, not a document revision. It
increments only when a change alters how *already-sealed* artifacts must be
interpreted — a different serialization, a different hashed range, a change to
what the certificate attests.

It does **not** increment when this code is refactored, when a font changes, or
when the package version bumps. A version that moves for cosmetic reasons stops
carrying information.

### `digestAlgorithm: "sha-256"`

Recorded rather than assumed. Verifying a 2026 artifact after the algorithm
changes requires knowing which one produced it.

## Encoding

Lowercase hex, 64 characters, matching `Sha256DigestSchema`'s `^[a-f0-9]{64}$`.

Stated because it is the classic silent mismatch: one layer stores hex, another
compares base64, and the verification page reports "does not match" for every
document while every test passes. Two known-answer tests pin the algorithm and
the encoding against published SHA-256 vectors.

## What is hashed

The **exact bytes**, with no normalization of any kind — no whitespace handling,
no canonical form, no metadata stripping.

A digest that identifies "semantically equivalent" bytes rather than actual bytes
cannot verify the file someone is holding, which is the only thing the digest is
for.

## Persistence

When artifact metadata is stored, it must carry `seal_scheme`, `seal_version` and
`digest_algorithm` **from the first row written**, and name hashes for their
artifacts: `original_document_hash`, `signed_document_hash` — never one column
called `hash`.

Document bytes do not go in PostgreSQL (INV-050). The database holds metadata,
storage references and digests.
