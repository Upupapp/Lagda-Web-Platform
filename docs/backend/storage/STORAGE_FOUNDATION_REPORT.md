# Storage Foundation Report — BACKEND-17

## What was built

An application-owned `ObjectStorage` port and an S3-compatible adapter, so
document bytes live in object storage while PostgreSQL stays the authority on
what an artifact is.

| Layer | Owns |
|---|---|
| `@lagda/application` | `ObjectStorage`, `StorageKeyStrategy`, `StorageZone`, `StorageObjectKey`, `ByteStream`, nine error categories |
| `@lagda/storage` | The S3 adapter, key strategy, config, error mapper, in-memory fake, shared contract suite, test-service helper |

`@lagda/application` names no bucket, no SDK type and no URL — enforced by
ESLint across seven packages and probed in both directions.

## The BACKEND-10 column, finally defined

`document_artifacts.storage_reference` existed since BACKEND-10 as
`varchar(512) NOT NULL` with no defined contents, typed in the port as a bare
`string` with a comment claiming it was opaque. Nothing enforced the claim.

It is now a branded `StorageObjectKey`, constructed only through a validating
function, and the row-to-record mapping goes through that constructor rather
than a cast — a row written by an older deployment is still input. No migration
was needed.

Two fixtures were using a `lagda://foundation/art_1` placeholder that the real
validator correctly rejects; they now carry real keys. A leak assertion that
guarded the old placeholder was guarding a string that no longer exists
anywhere, making it trivially true; it now guards the actual key fragments.

## Three defects found by the real service

**A misconfigured bucket looked like a missing document.** `NoSuchBucket`
answers HTTP 404, and `isNotFound` matched on status — so a wrong bucket name
made `getObject` return `null`. Every document in the system would have reported
as absent: a total outage presented to users as an empty account. Now excluded
explicitly, and probed.

**In-memory bytes were being made non-retryable.** I wrapped `Uint8Array` writes
in a stream for "one write path". The SDK cannot rewind a stream to retry it,
and MinIO said so exactly — *"An error was encountered in a non-retryable
streaming request."* Every sealed PDF would have lost transport retries for a
tidier code path. Bytes now stay bytes.

**Create-once refused legitimate retries.** With `IfNoneMatch: "*"` set, a
worker re-writing the *same* bytes after an ambiguous timeout got a conflict.
Now the adapter compares LAGDA's digest (falling back to size) and converges on
identical content while still refusing different content.

## A wrong claim I had to retract

I measured `IfNoneMatch: "*"` against MinIO, saw it honoured, and wrote that
create-once was atomic.

The measurement was of the **sequential** case — a key that already exists
answers 412. A concurrency test then showed **six simultaneous writers, all with
the header set, all succeeded.** The conditional does not serialise concurrent
creates on this provider.

Corrected in the adapter comment, the architecture document and the tests. The
real guarantee is narrower and is now stated everywhere: create-once holds
against retries and sequential rewrites, and against genuine collisions by
globally unique artifact ids. What IS proven under concurrency is that the
stored object is exactly one writer's bytes — never torn, never mixed.

## Two tests that were passing while asserting nothing

- The race test asserted `won >= 1`. It passed with the conditional deleted and
  all six writers overwriting each other — which is the exact failure it claimed
  to prevent.
- The reader-isolation test read through `collect`, which allocates a fresh
  array, so it could never observe the stored buffer. It passed with the copy
  removed.

Both were found by probing, not by reading.

## Numbers

- **29 unit tests + 29 integration tests** against real MinIO
- **191 integration tests** across 10 files, all passing
- **8 guarantee probes** — 7 catch, 1 explained
- **11 import-boundary probes** — 7 violations caught, 4 negative controls clean
- **1 new dependency**: `@aws-sdk/client-s3`. No presigner, because signed URLs
  are deferred.

## Decisions worth naming

**`AsyncIterable<Uint8Array>`** as the binary abstraction — a language protocol
rather than a Node or SDK type, with a bytes convenience for content already in
memory.

**Two buckets, not prefixes**, so quarantine and accepted artifacts can carry
different permissions.

**No presigned URLs.** Nothing needs one; building the capability now would be a
foundation with no callers, and the port supports both future download
architectures without choosing between them.

**No `ArtifactContentStore`.** The repository already yields a reference and the
port already takes it, proven end to end. BACKEND-18 has the first real caller
and should decide with a concrete case (OD-054).

## What does NOT exist

- **No upload and no download.** Nothing writes quarantine; no route serves a
  document.
- **No signed URLs** (deferred, no dependency installed).
- **No AV scanning, magic-byte validation, MIME validation or size policy** —
  BACKEND-18 owns all of it.
- **No retention, erasure or deletion policy** — BACKEND-55.
- **No orphan reconciliation** (OD-055).
- **No AWS S3 verification.** Everything provider-specific is MinIO-measured
  (OD-051).
- **No multipart coverage** (OD-052).

## eNotary

Untouched. No storage zone, key, bucket or document type references it. LAGDA
eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable
rules.

## Reading order

1. **ADR-012** — why S3-compatible rather than database blobs or the filesystem
2. **STORAGE_ARCHITECTURE.md** — the port, zones, immutability, streaming, errors
3. **STORAGE_KEY_STRATEGY.md** — key shape, and why a prefix is not authorization
4. **STORAGE_SECURITY.md** — private buckets, TLS, credentials, signed-URL rules
5. **STORAGE_TEST_MATRIX.md** — what is proven, what is measured, what is not
