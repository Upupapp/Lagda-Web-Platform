# Storage Architecture — BACKEND-17

## The split

**PostgreSQL stores what an artifact IS. Object storage stores the bytes.**

| PostgreSQL | Object storage |
|---|---|
| Ownership, workspace, document | The binary content |
| SHA-256 digest, size, media type | Nothing authoritative |
| Provenance (`source_artifact_id`) | |
| Creation time used as evidence | |
| The storage reference | |

Neither is complete alone, and neither is a backup of the other. A digest in
PostgreSQL that no longer describes the bytes in storage is a corrupted
document, which is why every round trip is verified by digest rather than by
size.

## Layers

```
use case
   ↓  ObjectStorage  (port, owned by @lagda/application)
   ↓
S3CompatibleObjectStorage  (@lagda/storage)
   ↓
@aws-sdk/client-s3
   ↓
any S3-compatible provider
```

`@lagda/application` names no bucket, no SDK type, no URL. That is enforced, not
requested: `@aws-sdk/*`, `aws-sdk` and `minio` are ESLint-banned everywhere
except `packages/storage`, in both bare and subpath form, verified by writing
violating files in seven packages and by three negative controls proving the ban
does not catch legitimate wiring (INV-203).

Composition roots wire `createS3ObjectStorage` from `@lagda/storage`. They do
not import the SDK either.

## Zones

Two, separated by **trust**:

| Zone | Holds | Bucket |
|---|---|---|
| `quarantine` | Untrusted uploads, before acceptance | `OBJECT_STORAGE_BUCKET_QUARANTINE` |
| `artifacts` | Accepted and server-generated immutable bytes | `OBJECT_STORAGE_BUCKET_ARTIFACTS` |

Separate buckets rather than prefixes, so a permission policy can distinguish
them: an upload path that may write quarantine need not be able to read accepted
artifacts, and nothing that serves documents needs to read unvalidated bytes
(§46). Proven by test — an object written to `quarantine` is absent from the
artifacts bucket.

`StorageZone` is a closed union. The application says "quarantine"; only the
adapter maps that to a bucket name (INV-208).

**Quarantine is foundation-only today.** Nothing writes to it, because nothing
uploads. BACKEND-18 owns that pipeline.

## Immutability, stated exactly

Accepted artifacts are never silently overwritten (INV-205). Three mechanisms,
in order of how much they actually carry:

1. **Globally unique artifact ids.** Two distinct artifacts never share a key.
   This is what makes a real collision impossible; everything else is a guard
   against mistakes.
2. **A HEAD before the write.** Compares LAGDA's SHA-256 when the writer
   supplied one, falling back to content length. Same content converges — a
   retried job must succeed, not fail. Different content raises
   `ObjectAlreadyExistsError`.
3. **`IfNoneMatch: "*"` on the PUT.** Honoured sequentially by AWS S3 and by
   MinIO.

### What this is NOT

**It is not atomic against concurrent creates.** Measured on MinIO: six
simultaneous writers, all with the conditional header set, and **all six
succeeded**. An earlier version of this document claimed atomicity on the
strength of a sequential measurement — a key that already exists answers 412 —
and that was wrong.

What IS proven under concurrency is that the stored object is exactly one
writer's bytes, byte for byte. Never a mixture, never a torn object. A corrupted
object would be far worse than a lost race, because every digest in PostgreSQL
would still claim it was intact.

For LAGDA this is sufficient: a genuine race for one key means one artifact
being written twice, and converging is the correct outcome. It would stop being
sufficient if artifact ids were ever derived from content or reused, which is
why they must not be.

## Streaming

The binary abstraction is **`AsyncIterable<Uint8Array>`**, chosen once (INV-204).

Not a Node `Readable`, and not an SDK stream wrapper: it is a language-level
protocol, `for await` consumes it, Node streams already satisfy it, and no
provider type appears in an application signature.

Writes accept either a stream or bytes:

- **bytes** — a sealed PDF already in memory. Passed to the SDK **as bytes**.
- **stream** — an upload. Converted to a Node `Readable` inside the adapter.

Bytes deliberately stay bytes. An earlier version wrapped them in a stream for a
single write path, and that silently made every small upload **non-retryable**:
the SDK cannot rewind a stream in order to retry it, and the real service said
so — *"An error was encountered in a non-retryable streaming request."* A tidier
code path is not worth losing transport retries on every sealed PDF.

Downloads are never buffered by the adapter. A caller that abandons a stream
must break out of its loop, which closes the socket.

## Integrity

**LAGDA computes SHA-256. LAGDA is the only authority on it.**

`ETag` is returned as `providerEntityTag` and is **diagnostics only** (INV-206).
It is an MD5 for a single-part upload, a digest-of-digests with a part suffix
for multipart, and something else again on some compatible providers. A test
asserts it is neither equal to the SHA-256 nor even the same length.

The writer may store LAGDA's digest as provider metadata (`lagda-sha256`). That
is an operator convenience and is also what lets a retry recognise its own
earlier write. The PostgreSQL record stays authoritative; nothing reads provider
metadata back as truth.

**The adapter never opens, rewrites, compresses or re-encodes a PDF.** Tested
across a 3 MB streamed round trip by digest, and by asserting no
`Content-Encoding` was applied. Any normalisation would invalidate every
signature LAGDA has ever issued.

## Errors

Nine LAGDA-owned categories, mapped from provider errors by **structure** — SDK
error name, provider code, HTTP status — never by matching message text, which
differs per provider and changes without notice.

| Category | Retryable | Meaning |
|---|---|---|
| `object-not-found` | no | Absence. Returned as `null` by get/head, not thrown. |
| `object-already-exists` | no | Immutability violation. |
| `invalid-storage-reference` | no | Malformed key — a bug, not user input. |
| `integrity-mismatch` | no | Bytes are not what was expected. |
| `access-denied` | **no** | Misconfiguration. Retrying makes a clear failure slow. |
| `unavailable` | yes | Provider or network outage. |
| `timeout` | yes | Bounded and classifiable. |
| `read-failed` / `write-failed` | yes | Unrecognised transport failure. |

**`NoSuchBucket` is deliberately NOT `object-not-found`**, even though it answers
404. Treating it as absence would make every document in the system silently
report as missing instead of raising an infrastructure error — a total outage
presented to users as an empty account. Found by pointing the adapter at a
bucket that does not exist.

Mapped error messages name the **operation**, never the provider's prose:
provider text can carry a bucket name, a key, or a signed query string, and the
message reaches logs. The provider request id IS kept — it is what a support
ticket needs.

## Retries

Two layers, both bounded, both documented:

1. **The SDK** retries transport failures, capped by `OBJECT_STORAGE_MAX_ATTEMPTS`
   (default 3).
2. **The worker** retries whole jobs (BACKEND-16).

No third layer. There is no retry loop inside any storage method — a hidden one
would multiply against a provider that is already struggling.

Request and connection timeouts are bounded by `OBJECT_STORAGE_REQUEST_TIMEOUT_MS`
so a hung connection cannot wedge a worker.

## Storage and PostgreSQL are NOT atomic

There is no such thing as a "DB + S3 transaction", and nothing in this codebase
claims one. Two failure windows exist and both are real:

| Window | Result | Severity |
|---|---|---|
| Object written, DB write fails | Orphan object | Wasted bytes. Recoverable. |
| DB written, object write fails | Metadata pointing at nothing | **A document the product believes it has.** |

The second is much worse, which is why the ordering is **bytes first, metadata
second**, and why an artifact row must not be marked available before its bytes
exist. BACKEND-18 and BACKEND-38 own the full choreography; see
STORAGE_SECURITY.md for what the foundation does and does not guarantee.

A missing object behind existing metadata surfaces as `null` — an explicit,
typed absence a caller cannot mistake for content, which a zero-length buffer
absolutely could be.

## What storage does NOT do

- **Does not query PostgreSQL.** No `@lagda/db` import (INV-213).
- **Does not write evidence.** Evidence is the application's.
- **Does not enqueue jobs.** No pg-boss.
- **Does not authorize.** Object storage decides nothing about who may read a
  document. See STORAGE_SECURITY.md.
- **Does not know domain state.** Draft, sent, completed mean nothing here.
- **Does not log business data.** No filenames, no bodies, no credentials.
