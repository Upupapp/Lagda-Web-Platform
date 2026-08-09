# Storage Security — BACKEND-17

Documents in LAGDA are contracts, affidavits, complaints and identity records.
The object store holding them is a private system, not a CDN.

## Private by design

**No object is public.** No `public-read` ACL is set anywhere; an audit for
`public-read` and `ACL:` across the codebase returns nothing. No permanent
public URL is generated, persisted or exposed.

**Deployment must block public access at the bucket level** — the codebase
cannot enforce that, and stating otherwise would be the kind of claim this
project keeps finding and deleting. It is a BACKEND-65/58 requirement, tracked
in the enforcement matrix as DEPLOYMENT-ENFORCED, not ENFORCED.

## TLS

Production traffic must use HTTPS. `loadStorageConfig` **refuses** a non-`https`
endpoint unless `OBJECT_STORAGE_ALLOW_INSECURE=true`, and refuses that flag
outright when `NODE_ENV=production` — so it cannot be left in a production
environment file and quietly take effect.

Certificate validation is never disabled. There is no `rejectUnauthorized: false`
anywhere, and no configuration that could produce one.

Removing the plaintext check makes tests fail.

## Credentials

Come from validated environment configuration. Never committed, never logged.

`describeStorageConfig` is an **allowlist** projection, not a redaction pass — a
denylist leaks the first field someone adds without thinking, and this object
holds a secret key (INV-212). It exposes region, endpoint, path-style, timeout,
attempts and bucket names. It does not expose the secret key, and does not
expose the access key id either: that has no diagnostic value worth the
exposure.

Adding the secret to that projection makes tests fail.

Configuration errors name **which settings are missing**, never their values.

Mapped storage errors carry the operation and the provider request id — never
provider prose, which can contain a bucket, a key or a signed query string. A
test drives a real authentication failure against the live service with canary
credentials and asserts neither the key nor the secret appears anywhere in the
error.

## Least privilege — a deployment requirement

Runtime credentials should reach only the buckets, prefixes and actions they
need. Documented as a requirement rather than implemented, because IAM lives in
the provider, not in this repository (BACKEND-58/65):

| Role | Needs |
|---|---|
| Upload path | write quarantine, read own quarantine object |
| Document serving | read artifacts |
| Retention / erasure jobs | delete, scoped and privileged |
| API and worker generally | **not** account-level object-storage administration |

The two-bucket split exists specifically so this separation is expressible
(§46). With prefixes inside one bucket it would be much harder to state.

## Deletion

`deleteObject` is a **privileged internal primitive**. It is idempotent —
deleting an absent object succeeds, because cleanup workflows re-run and
"already gone" is the outcome they wanted.

**There is no tenant-facing delete use case, and there must not be one.**
Accepted artifacts are signing evidence. Deletion belongs to quarantine cleanup
(BACKEND-18) and to retention and erasure workflows (BACKEND-55), which own the
policy. An audit confirms no application feature path calls `deleteObject`.

## Signed URLs — DEFERRED

**Not implemented.** No presigner dependency is installed (§112).

The reasoning: nothing needs one. No route serves a document, so a signed-URL
capability today would be a foundation with no callers — the failure mode this
project has already documented. The port supports both future download
architectures (stream through the API, or authorize then issue a short-lived
URL) without choosing between them now (§62).

When one is built, these hold:

- A signed URL is a **bearer credential**. Anyone with the link has the document.
- Never logged, never persisted as durable application state, never placed in a
  queue payload (INV-207).
- Short expiry, single object, read only, HTTPS. Never bucket-wide.
- **Never for quarantine objects** — unvalidated bytes must not become
  browser-reachable (§11).
- Direct browser-to-storage **upload** URLs stay deferred regardless: they
  bypass quarantine, magic-byte validation and AV scanning, which changes the
  threat model entirely (§61).

BACKEND-12's log redactor already scrubs `presignedurl` keys and query-string
signatures, so the protection exists ahead of the feature.

## Encryption at rest

Use provider-supported server-side encryption where available. This is a
**deployment requirement**, not application code, and deliberately not
AWS-KMS-specific: S3-compatible providers differ, and assuming KMS exists would
produce a configuration that fails on the provider LAGDA actually picks.

No application-level PDF encryption is invented. It would break byte-exactness
and therefore every digest.

## Versioning and object lock

- **Bucket versioning: RECOMMENDED FOR PRODUCTION**, as recovery from accidental
  overwrite or deletion. It is **not** a substitute for immutable keys, and
  LAGDA does not depend on it — an artifact's identity is its key, not a version
  id.
- **Object lock / WORM: NOT ENABLED, and not to be enabled without a legal
  retention requirement.** It conflicts directly with erasure obligations, and a
  bucket that cannot delete is a compliance problem rather than a safeguard
  (§49).

## Quarantine

Objects in quarantine are untrusted by definition. They are never publicly
downloadable and never served to a browser. They live in a different bucket from
accepted artifacts so that permissions can say so.

Malware detection is **not** storage's job and cannot be — the adapter moves
bytes. Accepted-artifact storage should only ever receive bytes that either
passed the BACKEND-18 pipeline or were generated by LAGDA itself (a sealed PDF,
a completion certificate), which needs no quarantine because it was never
untrusted.

## Data residency

The production provider and region are **unresolved and deliberately not
guessed** (OD-050). Object storage holds the same regulated documents as the
database, so it carries the same privacy, controller/processor and customer
review already identified for PostgreSQL. Picking a region because another
project uses one would be exactly the wrong way to decide it.
