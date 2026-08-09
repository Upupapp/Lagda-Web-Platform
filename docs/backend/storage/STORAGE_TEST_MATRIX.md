# Storage Test Matrix — BACKEND-17

**29 unit tests + 29 integration tests against a real S3-compatible service
(MinIO).** No mocked provider: the properties that matter here — stream
reassembly, header round-tripping, error shapes, conditional writes — are
exactly the ones a mock cannot be wrong about in the way production is.

## Test service

MinIO, standalone binary, `127.0.0.1:9100`, dedicated buckets
`lagda-test-artifacts` and `lagda-test-quarantine`, local-only throwaway
credentials, unique per-run object prefixes, best-effort cleanup after the run.

No Docker and no Testcontainers were available in this environment, so the
standalone binary was used rather than skipping real coverage. Tests skip
cleanly when `OBJECT_STORAGE_TEST_ENDPOINT` is unset.

## Contract suite — run against BOTH implementations

| Case | in-memory | S3-compatible |
|---|---|---|
| Byte-exact round trip | **PASS** | **PASS** |
| Chunked stream round trip | **PASS** | **PASS** |
| Head reports size and media type | **PASS** | **PASS** |
| Missing object returns `null`, does not throw | **PASS** | **PASS** |
| Refuses different bytes under an existing artifact key | **PASS** | **PASS** |
| Delete works; deleting a missing object succeeds | **PASS** | **PASS** |
| Zones do not alias | **PASS** | **PASS** |
| A reader cannot mutate what the next reader sees | **PASS** | **PASS** |
| A writer cannot mutate stored bytes afterwards | **PASS** | **PASS** |

Running one suite against both is the point: a fake that has drifted from the
adapter makes every application test written against it untrustworthy.

## Byte fidelity and integrity

| Case | Result |
|---|---|
| SHA-256 preserved across a 3 MB streamed round trip (64 KiB chunks) | **PASS** |
| No transformation, compression or re-encoding; no `Content-Encoding` | **PASS** |
| **ETag is not the SHA-256** — different value, different length | **PASS** |

## Immutability

| Case | Result |
|---|---|
| Refuses different bytes under an existing artifact key | **PASS** |
| Re-writing the SAME bytes succeeds (a controlled retry converges) | **PASS** |
| Concurrent writers sending identical bytes all converge | **PASS** |
| Concurrent writers sending different bytes produce **no torn object** | **PASS** |
| **MEASURED** — sequential `IfNoneMatch: "*"` honoured by MinIO | **true** |
| **MEASURED** — concurrent same-key writers that succeeded | **6 of 6** |

The second measurement is the important one, and it corrected a wrong claim.
`IfNoneMatch` is honoured *sequentially*, and an earlier version of this work
generalised that into an atomicity guarantee. It is not one: six simultaneous
writers with the header set all succeeded. See STORAGE_ARCHITECTURE.md for what
create-once therefore does and does not promise.

## Tenancy and keys

| Case | Result |
|---|---|
| Tenant-aware, artifact-addressed key | **PASS** |
| Keyed by artifact, so a second artifact cannot overwrite the first | **PASS** |
| Workspaces produce disjoint keys | **PASS** |
| Quarantine uses its own zone and an UPLOAD id | **PASS** |
| No customer filename anywhere in the key | **PASS** |
| Malformed identifier segments rejected | **PASS** |
| Traversal, empty segment, absolute path, overlong key rejected | **PASS** |
| Zones write to DIFFERENT buckets | **PASS** |
| One workspace's identifiers cannot address another's object | **PASS** |
| **Workspace B gets no path to workspace A's storage reference** | **PASS** |

## Artifact metadata ↔ storage

| Case | Result |
|---|---|
| Store bytes, record metadata, reload byte-exactly by digest | **PASS** |
| A missing object surfaces as typed absence, not empty content | **PASS** |
| The row persists a KEY — no URL, no signature, no query string | **PASS** |

## Configuration and secrets

| Case | Result |
|---|---|
| Valid configuration loads | **PASS** |
| Missing settings named, values never printed | **PASS** |
| Plaintext endpoint refused unless explicitly allowed outside production | **PASS** |
| The insecure flag is refused in production even when set | **PASS** |
| Non-numeric timeout rejected rather than defaulted | **PASS** |
| **Loggable projection exposes no secret or access key** | **PASS** |

## Provider errors — induced against the live service

| Case | Result |
|---|---|
| Missing bucket → typed error, **not** "object not found" | **PASS** |
| Invalid credentials → `access-denied`, **not retryable** | **PASS** |
| Unreachable endpoint → retryable failure | **PASS** |
| **No credentials or provider prose in a mapped error** | **PASS** |
| Mapping by name, code and status — not message text | **PASS** |
| Retryability classified deliberately per category | **PASS** |

## Concurrency and statelessness

| Case | Result |
|---|---|
| Two independent adapters see the same objects | **PASS** |
| Eight concurrent writes to distinct keys, no cross-contamination | **PASS** |

## Probes — guarantees verified by breaking them

| Violation | Tests failing |
|---|---|
| Allow overwrite of an accepted artifact | **2** |
| Treat a missing bucket as a missing object | **1** |
| Accept a plaintext endpoint in production | **1** |
| Log the secret key in the config projection | **1** |
| Put a customer filename in the object key | **4** |
| Skip object key validation | **1** |
| Fake hands a reader a live reference to stored bytes | **1** |
| Drop the create-once conditional | **0 — see below** |
| Baseline (all reverted) | **0** |

**The conditional-write probe catches nothing, and that is now understood rather
than unexplained.** On MinIO the HEAD pre-check already covers every case the
conditional would catch sequentially, and the conditional provides no
concurrency guarantee here (measured above). Its value is on providers that
enforce it atomically — which cannot be demonstrated locally. Recorded as a
known limit of local coverage rather than presented as enforcement.

Two probes initially caught nothing because the **assertions** were weak, not
the code:

- The race test asserted `won >= 1`, which passed with the conditional deleted
  and all six writers silently overwriting each other. Tightened, then corrected
  again once the measurement showed what actually happens.
- The reader-isolation test went through `collect`, which allocates a fresh
  array, so it could never observe the stored buffer. Rewritten to mutate the
  chunk as yielded.

## Import boundaries — probed, with negative controls

| Case | Caught | Expected |
|---|---|---|
| `application` imports `@aws-sdk/client-s3` | yes | yes |
| `contracts` imports `@aws-sdk/client-s3` | yes | yes |
| `core` imports `aws-sdk` (v2 name) | yes | yes |
| `api/routes` imports `@aws-sdk/client-s3` | yes | yes |
| `worker/handlers` imports `@aws-sdk/client-s3` | yes | yes |
| `db` imports `minio` | yes | yes |
| `application` imports an **unlisted** `@aws-sdk/*` package | yes | yes |
| NEGATIVE — `storage` imports `@aws-sdk/client-s3` | no | no |
| NEGATIVE — `api` imports `@lagda/storage` | no | no |
| NEGATIVE — `worker` imports `@lagda/storage` | no | no |
| NEGATIVE — `application` imports its own storage port | no | no |

The unlisted-package case matters: the ban is a wildcard, so a new AWS client
added tomorrow is caught without anyone remembering to update a list.

## Audits

| Sweep | Result |
|---|---|
| `@aws-sdk` outside `packages/storage` | only `core-purity.test.ts`, which asserts its absence |
| `S3Client` / command classes outside storage | none |
| `public-read` / `ACL:` | none |
| ETag mapped to a digest type | none |
| Presigned URLs persisted, queued or logged | none — not implemented |
| Storage keys in public DTOs | none |
| Direct `storage.deleteObject` in a feature path | none |
| Unexplained `any` / `as any` in SDK or error mapping | none |

One audit finding, fixed: a stray NUL byte in a test's rejection list made
`grep` classify the whole file as binary — which would have hidden that file
from exactly these sweeps. Replaced with explicit ` ` / `` escapes,
which also test more than the original did.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `npm test` (unit) | **PASS** |
| `npm run test:integration` | **PASS — 191 tests, 10 files** |
| Migration from zero | **NOT APPLICABLE — no migration added** |

## Not covered

- **No presigned URL tests**, because signed URLs are not implemented.
- **No AWS S3 coverage.** Everything provider-specific is measured against
  MinIO. Conditional-write atomicity in particular is expected to differ, and
  the difference is exactly what is unverified (OD-051).
- **No multipart coverage.** The SDK may use multipart internally for large
  objects; the 3 MB test is below the threshold. Incomplete-multipart cleanup is
  a provider lifecycle rule, not application code (OD-052).
- **No upload pipeline** — quarantine is provisioned and tested as a zone, but
  nothing writes to it. BACKEND-18.
- **No server-side encryption test**, because it is a deployment setting.
- **No load or throughput measurement** (BACKEND-61).
